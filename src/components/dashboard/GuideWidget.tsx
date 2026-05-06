'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFinanceStore } from '@/store/useFinanceStore'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Banknote, Bitcoin, Receipt, Target, Bot, PieChart, Landmark, Info,
} from 'lucide-react'

interface Step {
  id: string
  icon: React.ElementType
  color: string
  title: string
  section?: string
  description: string
  substeps: string[]
  tip?: string
}

const STEPS: Step[] = [
  {
    id: 'profile',
    icon: Bot,
    color: '#6366f1',
    title: 'Complete seu perfil (Onboarding)',
    section: 'profile',
    description: 'Se ainda não completou o onboarding, ele abre automaticamente na primeira visita e configura tudo: nome, perfil de risco, método de orçamento e tom do advisor.',
    substeps: [
      'Informe seu nome e nível de experiência financeira',
      'Escolha seu perfil de risco (conservador, moderado, arrojado)',
      'Defina se tem reserva de emergência e estimativa de dívidas',
      'Selecione seu método de orçamento (50-30-20 é o padrão)',
      'Escolha o tom do Advisor (técnico, motivacional, balanceado)',
    ],
    tip: 'Já fez o onboarding? Edite seu perfil a qualquer hora em → Perfil.',
  },
  {
    id: 'income',
    icon: Banknote,
    color: '#00d4a0',
    title: 'Registre sua renda fixa',
    section: 'overview',
    description: 'Em Visão Geral → Recebíveis do Mês, clique no ✏ ao lado de "Renda Fixa" e informe seu salário.',
    substeps: [
      'Acesse Visão Geral no menu lateral',
      'No card "Renda Fixa", clique no ícone de lápis ✏',
      'Digite o valor do salário (ex: 10000)',
      'Pressione Enter para salvar',
    ],
    tip: 'Depois de registrar a renda, vá em Contas Bancárias → "Lançar Salário" para criar as movimentações automáticas (entrada + dízimo). O CDB você aloca manualmente quando quiser.',
  },
  {
    id: 'usdt',
    icon: Bitcoin,
    color: '#26a17b',
    title: 'Configure sua comissão USDT',
    section: 'overview',
    description: 'Em Visão Geral → Recebíveis do Mês, configure o valor da sua comissão em USDT (dólares). Confirme apenas quando receber.',
    substeps: [
      'No card "Comissão USDT (pendente)", clique no ✏ para editar',
      'Digite o valor em dólares (ex: 2988 para $2.988)',
      'O sistema converte automaticamente para BRL usando o câmbio do dia',
      'Quando o valor cair na sua conta, clique em "✓ Recebi!" para contabilizar',
      'Enquanto não clicar em "Recebi", o USDT NÃO entra nos cálculos',
    ],
    tip: 'O câmbio é atualizado automaticamente. Passe o mouse sobre o card de câmbio e clique em 🔄 para buscar o valor ao vivo.',
  },
  {
    id: 'bills',
    icon: Receipt,
    color: '#f06060',
    title: 'Gerencie suas contas',
    section: 'bills',
    description: 'Em Contas, veja todas as suas contas do mês. Marque como pagas conforme for quitando — o sistema debita automaticamente da conta bancária escolhida.',
    substeps: [
      'Acesse Contas no menu lateral',
      'Clique no círculo à esquerda de cada conta para marcar como paga',
      'Escolha de qual conta bancária o dinheiro saiu',
      'Para contas atrasadas de meses anteriores, veja a aba "Atrasadas"',
      'Adicione novas contas clicando em "+ Nova Conta"',
    ],
    tip: 'Contas marcadas como "Quitado" são dívidas encerradas permanentemente. Use "Pago" para pagamentos mensais normais.',
  },
  {
    id: 'accounts',
    icon: Landmark,
    color: '#6366f1',
    title: 'Configure saldos iniciais',
    section: 'accounts',
    description: 'Em Contas Bancárias, defina o saldo atual de cada conta. Isso é a base do seu patrimônio real.',
    substeps: [
      'Acesse Contas Bancárias no menu lateral',
      'Para cada conta (Operacional, USDT, Investimento, Dízimo), clique em "✏ Editar" ao lado do Saldo Inicial',
      'Digite o saldo atual que você tem nessa conta hoje',
      'Clique ✓ para confirmar',
      'Use "+ Nova transação" para registrar movimentações manuais',
    ],
    tip: 'O Patrimônio Total no topo soma todos os saldos automaticamente. A conta Investimento BR é onde você alocará manualmente o CDB.',
  },
  {
    id: 'allocation',
    icon: PieChart,
    color: '#8b5cf6',
    title: 'Acompanhe a alocação 50-30-20',
    section: 'allocation',
    description: 'Em Alocação, veja como seu saldo livre está distribuído entre necessidades, desejos e investimentos.',
    substeps: [
      'Acesse Alocação no menu lateral',
      'Os percentuais são definidos pelo seu método de orçamento (configurado no perfil)',
      'Ajuste os sliders se quiser redistribuir para este mês',
      'Use "Registrar Gasto" para marcar valores gastos em cada categoria',
      'Use "Mover Valor" para transferir entre categorias quando necessário',
    ],
    tip: 'O saldo livre é calculado como: USDT recebido − dízimo − total de contas. Só aparece após configurar USDT e marcar como recebido.',
  },
  {
    id: 'goals',
    icon: Target,
    color: '#f5a020',
    title: 'Crie metas financeiras',
    section: 'goals',
    description: 'Em Metas, defina objetivos concretos com valor-alvo e prazo. Acompanhe o progresso e registre aportes.',
    substeps: [
      'Acesse Metas no menu lateral',
      'Clique em "+ Nova Meta"',
      'Escolha o tipo: Reserva, Dívida, Compra, Independência, etc.',
      'Defina o valor-alvo, quanto já acumulou e a data-limite',
      'Use "Registrar aporte" para registrar depósitos nas metas',
    ],
    tip: 'As 2 metas prioritárias aparecem automaticamente na Visão Geral para você acompanhar no dia a dia.',
  },
  {
    id: 'advisor',
    icon: Bot,
    color: '#6366f1',
    title: 'Use o Advisor para orientação',
    section: 'advisor',
    description: 'Em Advisor, converse com a IA sobre sua situação financeira. Ela conhece todos os seus dados e dá conselhos baseados na sua realidade.',
    substeps: [
      'Configure a chave API em .env.local: ANTHROPIC_API_KEY=sua-chave',
      'Acesse Advisor no menu lateral',
      'Clique em "Analise meu mês" para receber um diagnóstico completo',
      'Faça perguntas específicas: "Consigo pagar minhas metas em X meses?"',
      'O histórico da conversa fica salvo até você limpar',
    ],
    tip: 'Opções gratuitas de API: Groq (llama), Google Gemini, OpenRouter. Peça ajuda para adaptar a rota se precisar.',
  },
]

function StepCard({ step, index, done, onToggle, sectionNav }: {
  step: Step
  index: number
  done: boolean
  onToggle: () => void
  sectionNav: (s: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-xl border transition-all ${done ? 'border-[#1a2030] opacity-60' : 'border-[#243048]'}`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className="shrink-0 cursor-pointer transition-colors"
        >
          {done
            ? <CheckCircle2 size={20} className="text-[#00d4a0]" />
            : <Circle size={20} className="text-[#4a5568] hover:text-[#e8ecf4]" />
          }
        </button>

        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${step.color}20`, border: `1px solid ${step.color}40` }}>
          <step.icon size={14} style={{ color: step.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${done ? 'line-through text-[#4a5568]' : 'text-[#e8ecf4]'}`}>
            <span className="text-[#4a5568] font-normal mr-1">{index + 1}.</span>
            {step.title}
          </p>
        </div>

        {step.section && !done && (
          <button
            onClick={(e) => { e.stopPropagation(); sectionNav(step.section!) }}
            className="shrink-0 text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition-all hover:opacity-80"
            style={{ color: step.color, borderColor: `${step.color}40`, background: `${step.color}10` }}
          >
            Ir →
          </button>
        )}

        {open ? <ChevronUp size={15} className="text-[#4a5568] shrink-0" /> : <ChevronDown size={15} className="text-[#4a5568] shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#1a2030] pt-3">
          <p className="text-sm text-[#8898aa]">{step.description}</p>
          <ol className="space-y-1.5">
            {step.substeps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#8898aa]">
                <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: `${step.color}20`, color: step.color }}>
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          {step.tip && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#f5a020]/08 border border-[#f5a020]/20">
              <Info size={13} className="text-[#f5a020] shrink-0 mt-0.5" />
              <p className="text-xs text-[#f5a020]">{step.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function GuideWidget() {
  const { setActiveSection } = useFinanceStore()
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('guide-done') || '{}')
    } catch { return {} }
  })

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] }
    setDone(next)
    localStorage.setItem('guide-done', JSON.stringify(next))
  }

  const doneCount = Object.values(done).filter(Boolean).length
  const pct = Math.round((doneCount / STEPS.length) * 100)

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">

      {/* Progress header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-[#e8ecf4]">Primeiros Passos 🚀</h3>
              <p className="text-sm text-[#4a5568] mt-0.5">Siga os passos abaixo para configurar o dashboard hoje</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-mono font-bold text-[#00d4a0]">{pct}%</p>
              <p className="text-xs text-[#4a5568]">{doneCount}/{STEPS.length} passos</p>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1a2030] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#00d4a0] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-center text-sm text-[#00d4a0] mt-3 font-medium">
              🎉 Parabéns! Dashboard configurado. Use o Advisor para orientações personalizadas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            done={!!done[step.id]}
            onToggle={() => toggle(step.id)}
            sectionNav={(s) => setActiveSection(s)}
          />
        ))}
      </div>

      {/* Glossary */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Info size={15} className="text-[#4a5568]" /> Glossário Rápido</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {[
            { term: 'Renda Fixa', def: 'Seu salário mensal em BRL. Lançado até o 5º dia útil.' },
            { term: 'USDT', def: 'Sua comissão em dólares. Só conta quando você clicar em "Recebi".' },
            { term: 'Dízimo', def: '10% da renda total destinado automaticamente à conta Dízimo.' },
            { term: 'Saldo Livre', def: 'O que sobra após dízimo e contas — base para a alocação 50-30-20.' },
            { term: 'CDB', def: 'Investimento de renda fixa BR. Você aloca manualmente quando quiser.' },
            { term: 'APY', def: 'Juros anuais que seus USDT rendem na plataforma (ex: 12% a.a.).' },
            { term: 'Alocação', def: 'Como dividir o saldo livre: 50% necessidades, 30% desejos, 20% investimentos.' },
          ].map(({ term, def }) => (
            <div key={term} className="flex gap-3 text-xs py-1.5 border-b border-[#0d1117] last:border-0">
              <span className="font-semibold text-[#e8ecf4] w-32 shrink-0">{term}</span>
              <span className="text-[#4a5568]">{def}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
