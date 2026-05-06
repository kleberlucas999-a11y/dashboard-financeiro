'use client'
import { useState, useRef, useEffect } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatBRL, calcFreeBalance } from '@/lib/utils'
import { Bot, Send, Trash2, Loader2, Sparkles, TrendingDown, Target, AlertTriangle } from 'lucide-react'
import { AdvisorMessage } from '@/types'

const QUICK_ACTIONS = [
  { label: 'Analise meu mês', icon: Sparkles, prompt: 'Faça uma análise completa da minha situação financeira neste mês: receitas, gastos, saldo livre e progresso das metas.' },
  { label: 'Estou gastando demais?', icon: TrendingDown, prompt: 'Analise meus gastos e me diga se estou dentro do orçamento. Onde posso cortar?' },
  { label: 'Como melhorar minhas metas?', icon: Target, prompt: 'Avalie o progresso das minhas metas financeiras e sugira como acelerá-las com o saldo disponível.' },
  { label: 'Alertas importantes', icon: AlertTriangle, prompt: 'Quais são os pontos de atenção mais urgentes na minha situação financeira agora?' },
]

function buildContext(store: ReturnType<typeof useFinanceStore.getState>) {
  const month = store.getCurrentMonth()
  return {
    profile: store.userProfile,
    month: month ? {
      fixedIncome: month.fixedIncome,
      usdtSettings: month.usdtSettings,
      exchangeRate: month.exchangeRate,
      bills: month.bills,
      overdueBills: month.overdueBills,
    } : {},
    freeBalance: month ? Math.max(0, calcFreeBalance(month)).toFixed(0) : '0',
  }
}

export function AdvisorWidget() {
  const store = useFinanceStore()
  const { userProfile, addAdvisorMessage, clearAdvisorHistory } = store
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const history: AdvisorMessage[] = userProfile?.advisorHistory ?? []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, streamText])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')

    addAdvisorMessage({ role: 'user', content: trimmed })

    const messagesForApi = [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ]

    setLoading(true)
    setStreamText('')

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesForApi,
          context: buildContext(useFinanceStore.getState()),
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const errorType = errBody?.error as string
        let errMsg = '⚠️ Serviço temporariamente indisponível. Tente novamente em alguns instantes.'
        if (errorType === 'all_rate_limited')
          errMsg = '⚠️ Todos os modelos gratuitos estão com limite de uso atingido agora. Aguarde 1–5 minutos e tente novamente.'
        else if (errorType === 'all_models_failed')
          errMsg = '⚠️ Nenhum modelo de IA está disponível no momento. Isso é temporário — tente em instantes.'
        else if (errorType === 'invalid_api_key')
          errMsg = '⚠️ Chave de API inválida ou expirada. Verifique o arquivo .env.local e reinicie o servidor.'
        else if (res.status === 500)
          errMsg = '⚠️ Chave de API não configurada. Verifique o arquivo .env.local e reinicie o servidor.'
        addAdvisorMessage({ role: 'assistant', content: errMsg })
        setStreamText('')
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const parsed = JSON.parse(data)
                if (parsed.model) {
                  console.log('[AdvisorWidget] modelo usado:', parsed.model)
                  continue
                }
                if (parsed.text) {
                  fullText += parsed.text
                  setStreamText(fullText)
                }
              } catch {}
            }
          }
        }
      }

      addAdvisorMessage({ role: 'assistant', content: fullText })
      setStreamText('')
    } catch (err) {
      addAdvisorMessage({ role: 'assistant', content: '⚠️ Erro de conexão. Verifique sua internet e tente novamente.' })
      setStreamText('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!userProfile) return null

  const name = userProfile.name || 'usuário'

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px] space-y-4 animate-fade-in">

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e8ecf4]">FinAdvisor</p>
            <p className="text-xs text-[#4a5568]">Consultor financeiro pessoal · Gemini AI</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearAdvisorHistory}
            className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#f06060] transition-colors cursor-pointer"
          >
            <Trash2 size={12} /> Limpar histórico
          </button>
        )}
      </div>

      {/* Chat area */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Welcome message */}
          {history.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                <Bot size={28} className="text-indigo-400" />
              </div>
              <p className="text-[#e8ecf4] font-semibold mb-1">Olá, {name}!</p>
              <p className="text-sm text-[#4a5568] max-w-xs">
                Sou seu advisor financeiro pessoal. Analiso sua situação real e ofereço orientações concretas. Como posso ajudar?
              </p>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-sm">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => sendMessage(a.prompt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#1a2030] text-xs text-[#8898aa] hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer text-left"
                  >
                    <a.icon size={13} className="shrink-0" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {history.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-indigo-500/20 border border-indigo-500/30 text-[#e8ecf4] rounded-tr-sm'
                    : 'bg-[#0d1117] border border-[#1a2030] text-[#c4cfe0] rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {(loading || streamText) && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                {loading && !streamText ? (
                  <Loader2 size={14} className="text-indigo-400 animate-spin" />
                ) : (
                  <Bot size={14} className="text-indigo-400" />
                )}
              </div>
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed bg-[#0d1117] border border-[#1a2030] text-[#c4cfe0] whitespace-pre-wrap">
                {streamText || <span className="flex gap-1 items-center"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></span>}
              </div>
            </div>
          )}

          {/* Quick action chips (after conversation started) */}
          {history.length > 0 && !loading && (
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_ACTIONS.slice(0, 2).map(a => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1a2030] text-xs text-[#4a5568] hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer"
                >
                  <a.icon size={11} />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1a2030]">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre suas finanças... (Enter para enviar)"
              disabled={loading}
              rows={1}
              className="flex-1 bg-[#0a0e16] border border-[#1a2030] rounded-xl px-4 py-3 text-sm text-[#e8ecf4] placeholder-[#4a5568] outline-none focus:border-indigo-500/50 transition-colors resize-none disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="shrink-0 h-11 w-11 p-0 flex items-center justify-center"
              style={{ background: input.trim() && !loading ? '#6366f1' : undefined }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
          <p className="text-xs text-[#1a2030] mt-2 text-center">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      </Card>
    </div>
  )
}
