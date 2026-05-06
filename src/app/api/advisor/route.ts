import { NextRequest } from 'next/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Models tried in order. First success wins; the rest are skipped.
// Verified working as of 2025-05 — update slugs if 404s appear again.
const MODELS = [
  'openai/gpt-oss-120b:free',              // primário — 120B, excelente PT-BR
  'google/gemma-4-31b-it:free',            // fallback 1 — Google Gemma 4 31B
  'openai/gpt-oss-20b:free',               // fallback 2 — menor mas estável
  'meta-llama/llama-3.3-70b-instruct:free', // fallback 3
]

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: Record<string, unknown>): string {
  const profile = ctx.profile as Record<string, unknown>
  const month = ctx.month as Record<string, unknown>

  const toneMap: Record<string, string> = {
    tecnico: 'Use linguagem técnica, dados precisos e terminologia financeira.',
    motivacional: 'Seja encorajador, celebre conquistas e motive o usuário a continuar.',
    balanceado: 'Equilibre dados técnicos com linguagem acessível e motivadora.',
  }

  const riskMap: Record<string, string> = {
    conservador: 'perfil conservador (prioriza segurança e liquidez)',
    moderado: 'perfil moderado (equilíbrio entre segurança e crescimento)',
    arrojado: 'perfil arrojado (aceita volatilidade por maiores retornos)',
  }

  const goals = ((profile?.goals as Array<Record<string, unknown>>) || [])
    .map((g) => `${g.name}: R$${Number(g.currentAmount).toFixed(0)}/${Number(g.targetAmount).toFixed(0)} (${Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)}%)`)
    .join(', ') || 'Nenhuma meta cadastrada'

  const pendingBills = ((month?.bills as Array<Record<string, unknown>>) || [])
    .filter((b) => b.status === 'pendente')
    .slice(0, 5)
    .map((b) => `${b.name} R$${Number(b.amount).toFixed(0)} dia ${b.dueDay}`)
    .join(', ')

  return `Você é o FinAdvisor, um consultor financeiro pessoal brasileiro especialista e de confiança do usuário.

PERFIL DO USUÁRIO:
- Nome: ${profile?.name || 'Usuário'}
- Experiência: ${profile?.experience || 'intermediario'}
- ${riskMap[String(profile?.riskProfile)] || 'perfil moderado'}
- Método de orçamento: ${profile?.budgetMethod || '50-30-20'}
- Tom de comunicação: ${toneMap[String(profile?.advisorTone)] || toneMap.balanceado}

SITUAÇÃO FINANCEIRA ATUAL:
- Renda fixa: R$${month?.fixedIncome || 0}/mês
- USDT mensal: $${(month?.usdtSettings as Record<string, unknown>)?.monthlyAmount || 0}
- Dívidas estimadas: R$${profile?.estimatedTotalDebt || 0}
- Reserva de emergência: ${profile?.hasEmergencyFund ? `${profile.emergencyFundMonths} meses` : 'Não possui'}
- Saldo livre este mês: R$${ctx.freeBalance || 0}
- Câmbio USD/BRL: R$${month?.exchangeRate || 5.02}

METAS ATIVAS: ${goals}

CONTAS PENDENTES: ${pendingBills || 'Nenhuma'}

INSTRUÇÕES:
- Responda SEMPRE em português brasileiro
- Baseie conselhos nos números reais acima — nunca invente valores
- Quando sugerir ações, dê valores e prazos concretos
- Seja direto: o usuário quer orientação prática, não teoria
- Máximo 3 parágrafos por resposta (exceto análises completas solicitadas)
- Use emojis com moderação para destacar pontos importantes`
}

// ─── Per-model attempt ────────────────────────────────────────────────────────

interface ModelSuccess {
  ok: true
  model: string
  response: Response
}

interface ModelFailure {
  ok: false
  model: string
  status: number
  reason: string
}

type ModelResult = ModelSuccess | ModelFailure

async function tryModel(
  model: string,
  messages: unknown[],
  apiKey: string,
): Promise<ModelResult> {
  let response: Response
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FinDash Advisor',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        stream: true,
      }),
    })
  } catch (networkErr) {
    console.error(`[advisor] network error for model ${model}:`, networkErr)
    return { ok: false, model, status: 0, reason: 'network error' }
  }

  if (response.ok) {
    return { ok: true, model, response }
  }

  // Parse error body to produce a human-readable reason
  const errText = await response.text()
  console.error(`[advisor] model ${model} failed (${response.status}):`, errText)

  let reason = 'service unavailable'
  try {
    const errJson = JSON.parse(errText)
    const raw: string =
      errJson?.error?.metadata?.raw ||
      errJson?.error?.message ||
      ''
    const lower = raw.toLowerCase()
    if (response.status === 429 || lower.includes('rate') || lower.includes('quota')) {
      reason = 'rate limit'
    } else if (response.status === 503 || lower.includes('unavailable') || lower.includes('overloaded')) {
      reason = 'service unavailable'
    } else if (response.status === 404 || lower.includes('not found') || lower.includes('deprecated')) {
      reason = 'model not found or deprecated'
    } else if (raw) {
      reason = raw.slice(0, 120)
    }
  } catch {
    // errText was not valid JSON — keep default reason
  }

  return { ok: false, model, status: response.status, reason }
}

// ─── SSE pipe ─────────────────────────────────────────────────────────────────

function buildSSEStream(upstream: Response, modelUsed: string): ReadableStream {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async start(controller) {
      // First event: which model served this response (for client-side debug logging)
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ model: modelUsed })}\n\n`)
      )

      const reader = upstream.body?.getReader()
      if (!reader) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            return
          }

          try {
            const parsed = JSON.parse(data)
            const text = parsed.choices?.[0]?.delta?.content
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, context } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
        { status: 500 }
      )
    }

    const systemPrompt = buildSystemPrompt(context || {})
    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    // Try each model in order; stop at first success
    const failures: ModelFailure[] = []

    for (const model of MODELS) {
      console.log(`[advisor] trying model: ${model}`)
      const result = await tryModel(model, openRouterMessages, apiKey)

      if (result.ok) {
        console.log(`[advisor] success with model: ${model}`)
        const stream = buildSSEStream(result.response, model)
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      }

      // If the API key itself is rejected, stop immediately — no point trying more models
      if (result.status === 401 || result.status === 403) {
        console.error('[advisor] API key rejected — aborting fallback chain')
        return new Response(
          JSON.stringify({ error: 'invalid_api_key', details: result.reason }),
          { status: 502 }
        )
      }

      failures.push(result)
    }

    // All models failed — build a structured error for the frontend
    const allRateLimited = failures.every((f) => f.reason === 'rate limit')
    const errorType = allRateLimited ? 'all_rate_limited' : 'all_models_failed'
    const details = failures.map((f) => `${f.model}: ${f.reason} (HTTP ${f.status})`).join(' | ')

    console.error(`[advisor] all models failed — ${details}`)
    return new Response(
      JSON.stringify({ error: errorType, details }),
      { status: 502 }
    )

  } catch (err) {
    console.error('[advisor] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'advisor_unavailable' }), { status: 500 })
  }
}
