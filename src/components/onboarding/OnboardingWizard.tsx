'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { UserProfile, RiskProfile, BudgetMethod, ExperienceLevel, AdvisorTone, GoalType, FinancialGoal } from '@/types'
import { generateId } from '@/lib/utils'
import { TrendingUp, ChevronRight, ChevronLeft, Check, Target, Banknote, ShieldCheck, Rocket, Store, Home } from 'lucide-react'

const TOTAL_STEPS = 7

const GOAL_OPTIONS: { type: GoalType; label: string; icon: string; desc: string }[] = [
  { type: 'emergencia', label: 'Reserva de emergência', icon: '🛡️', desc: 'Guardar X meses de despesas' },
  { type: 'divida', label: 'Quitar dívidas', icon: '💳', desc: 'Zerar cartão, empréstimo, parcelas' },
  { type: 'compra', label: 'Objetivo de compra', icon: '🎯', desc: 'Viagem, reforma, veículo, eletrônico' },
  { type: 'independencia', label: 'Independência financeira', icon: '🏆', desc: 'Renda passiva que cobre despesas' },
  { type: 'alavancagem', label: 'Alavancagem financeira', icon: '📈', desc: 'Investimentos para multiplicar patrimônio' },
  { type: 'negocio', label: 'Novo negócio', icon: '🏪', desc: 'Capital para empreender' },
]

const BUDGET_METHODS: { value: BudgetMethod; label: string; desc: string; needs: number; wants: number; invest: number }[] = [
  { value: '50-30-20', label: '50-30-20 (Padrão)', desc: 'Necessidades / Desejos / Investimento', needs: 50, wants: 30, invest: 20 },
  { value: '70-20-10', label: '70-20-10 (Conservador)', desc: 'Indicado para quem tem dívidas altas', needs: 70, wants: 20, invest: 10 },
  { value: '60-20-20', label: '60-20-20 (Equilibrado)', desc: 'Balanceia custo de vida e investimento', needs: 60, wants: 20, invest: 20 },
  { value: 'personalizado', label: 'Personalizado', desc: 'Defino meus próprios percentuais', needs: 50, wants: 30, invest: 20 },
]

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
          style={{ background: i < step ? '#00d4a0' : i === step ? '#00d4a040' : '#1a2030' }} />
      ))}
    </div>
  )
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
        selected ? 'border-[#00d4a0] bg-[#00d4a0]/10' : 'border-[#1a2030] bg-[#0d1117] hover:border-[#243048]'
      }`}
    >
      {children}
    </button>
  )
}

export function OnboardingWizard() {
  const { completeOnboarding } = useFinanceStore()
  const [step, setStep] = useState(0)

  // Step 1
  const [name, setName] = useState('')
  // Step 2
  const [experience, setExperience] = useState<ExperienceLevel>('intermediario')
  // Step 3
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('moderado')
  // Step 4
  const [hasTithe, setHasTithe] = useState(false)
  const [hasEmergencyFund, setHasEmergencyFund] = useState(false)
  const [emergencyFundMonths, setEmergencyFundMonths] = useState(0)
  const [estimatedTotalDebt, setEstimatedTotalDebt] = useState(0)
  // Step 5 — goals
  const [selectedGoalTypes, setSelectedGoalTypes] = useState<GoalType[]>([])
  const [goalDetails, setGoalDetails] = useState<Record<GoalType, { name: string; targetAmount: string; targetDate: string }>>({
    emergencia: { name: 'Reserva de emergência', targetAmount: '', targetDate: '' },
    divida: { name: 'Quitar dívidas', targetAmount: '', targetDate: '' },
    compra: { name: 'Objetivo de compra', targetAmount: '', targetDate: '' },
    independencia: { name: 'Independência financeira', targetAmount: '', targetDate: '' },
    alavancagem: { name: 'Alavancagem financeira', targetAmount: '', targetDate: '' },
    negocio: { name: 'Novo negócio', targetAmount: '', targetDate: '' },
  })
  // Step 6
  const [budgetMethod, setBudgetMethod] = useState<BudgetMethod>('50-30-20')
  const [customNeeds, setCustomNeeds] = useState(50)
  const [customWants, setCustomWants] = useState(30)
  const [customInvest, setCustomInvest] = useState(20)
  // Step 7
  const [advisorTone, setAdvisorTone] = useState<AdvisorTone>('balanceado')

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2
    return true
  }

  const handleFinish = () => {
    const goals: FinancialGoal[] = selectedGoalTypes.map((type, i) => ({
      id: generateId(),
      type,
      name: goalDetails[type].name || GOAL_OPTIONS.find(g => g.type === type)?.label || type,
      targetAmount: parseFloat(goalDetails[type].targetAmount) || 0,
      currentAmount: 0,
      targetDate: goalDetails[type].targetDate || undefined,
      priority: i + 1,
      createdAt: new Date().toISOString(),
    }))

    const profile: UserProfile = {
      name: name.trim(),
      riskProfile,
      budgetMethod,
      customNeeds: budgetMethod === 'personalizado' ? customNeeds : undefined,
      customWants: budgetMethod === 'personalizado' ? customWants : undefined,
      customInvest: budgetMethod === 'personalizado' ? customInvest : undefined,
      experience,
      advisorTone,
      hasTithe,
      hasEmergencyFund,
      emergencyFundMonths,
      estimatedTotalDebt,
      goals,
      advisorHistory: [],
      onboardingComplete: true,
      onboardingCompletedAt: new Date().toISOString(),
    }
    completeOnboarding(profile)
  }

  const steps = [
    // ── Step 0: Welcome + Name ───────────────────────────────────────────────
    <div key={0} className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-[#00d4a0]/20 border border-[#00d4a0]/40 flex items-center justify-center mx-auto">
          <TrendingUp size={28} className="text-[#00d4a0]" />
        </div>
        <h1 className="text-2xl font-bold text-[#e8ecf4]">Olá! Sou seu FinAdvisor 👋</h1>
        <p className="text-[#8898aa] text-sm leading-relaxed max-w-sm mx-auto">
          Vou personalizar seu dashboard financeiro com base no seu perfil, objetivos e situação atual. Leva menos de 3 minutos.
        </p>
      </div>
      <div>
        <label className="block text-xs text-[#8898aa] mb-2">Como você se chama?</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canNext() && setStep(1)}
          className="w-full bg-[#0d1117] border border-[#1a2030] rounded-xl px-4 py-3 text-[#e8ecf4] text-lg font-medium focus:outline-none focus:border-[#00d4a0] transition-colors"
          placeholder="Seu nome..."
        />
      </div>
    </div>,

    // ── Step 1: Experience ───────────────────────────────────────────────────
    <div key={1} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Qual seu nível de experiência financeira?</h2>
        <p className="text-sm text-[#4a5568]">Isso adapta a linguagem dos conselhos do advisor.</p>
      </div>
      {([
        { value: 'iniciante', label: 'Iniciante', desc: 'Ainda estou aprendendo sobre finanças pessoais', emoji: '🌱' },
        { value: 'intermediario', label: 'Intermediário', desc: 'Já acompanho meu orçamento e tenho alguns investimentos', emoji: '📊' },
        { value: 'avancado', label: 'Avançado', desc: 'Invisto ativamente, entendo ativos e estratégias', emoji: '🚀' },
      ] as const).map(opt => (
        <OptionCard key={opt.value} selected={experience === opt.value} onClick={() => setExperience(opt.value)}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{opt.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-[#e8ecf4]">{opt.label}</p>
              <p className="text-xs text-[#4a5568]">{opt.desc}</p>
            </div>
            {experience === opt.value && <Check size={16} className="text-[#00d4a0] ml-auto" />}
          </div>
        </OptionCard>
      ))}
    </div>,

    // ── Step 2: Risk Profile ─────────────────────────────────────────────────
    <div key={2} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Qual seu perfil de risco?</h2>
        <p className="text-sm text-[#4a5568]">Influencia as recomendações de investimento.</p>
      </div>
      {([
        { value: 'conservador', label: 'Conservador', desc: 'Prefiro segurança — aceito rendimentos menores para evitar perdas', emoji: '🛡️', color: '#00d4a0' },
        { value: 'moderado', label: 'Moderado', desc: 'Equilíbrio entre segurança e crescimento — aceito alguma volatilidade', emoji: '⚖️', color: '#f5a020' },
        { value: 'arrojado', label: 'Arrojado', desc: 'Aceito volatilidade e riscos maiores para buscar retornos elevados', emoji: '🚀', color: '#f06060' },
      ] as const).map(opt => (
        <OptionCard key={opt.value} selected={riskProfile === opt.value} onClick={() => setRiskProfile(opt.value)}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{opt.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-[#e8ecf4]">{opt.label}</p>
              <p className="text-xs text-[#4a5568]">{opt.desc}</p>
            </div>
            {riskProfile === opt.value && <Check size={16} className="ml-auto" style={{ color: opt.color }} />}
          </div>
        </OptionCard>
      ))}
    </div>,

    // ── Step 3: Current Situation ────────────────────────────────────────────
    <div key={3} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Sua situação atual</h2>
        <p className="text-sm text-[#4a5568]">Usado para calcular metas e prioridades.</p>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#e8ecf4]">Você pratica dízimo?</label>
        <p className="text-xs text-[#4a5568]">Se sim, 10% do salário será automaticamente separado para a conta Dízimo.</p>
        <div className="flex gap-3">
          {([true, false] as const).map((v) => (
            <button key={String(v)} onClick={() => setHasTithe(v)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${hasTithe === v ? 'border-[#f5a020] bg-[#f5a020]/10 text-[#f5a020]' : 'border-[#1a2030] text-[#8898aa]'}`}>
              {v ? '🙏 Sim' : '❌ Não'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-[#e8ecf4]">Você tem reserva de emergência?</label>
        <div className="flex gap-3">
          {([true, false] as const).map((v) => (
            <button key={String(v)} onClick={() => setHasEmergencyFund(v)}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all ${hasEmergencyFund === v ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
              {v ? 'Sim' : 'Não'}
            </button>
          ))}
        </div>
        {hasEmergencyFund && (
          <div>
            <label className="block text-xs text-[#8898aa] mb-1">Quantos meses de reserva?</label>
            <input type="number" min={0} max={24} value={emergencyFundMonths || ''}
              onChange={(e) => setEmergencyFundMonths(parseInt(e.target.value) || 0)}
              className="w-full bg-[#0d1117] border border-[#1a2030] rounded-xl px-3 py-2.5 text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]"
              placeholder="Ex: 3" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-[#e8ecf4] mb-1">Total estimado de dívidas (R$)</label>
        <p className="text-xs text-[#4a5568] mb-2">Inclui cartão, empréstimos, financiamentos</p>
        <input type="number" min={0} value={estimatedTotalDebt || ''}
          onChange={(e) => setEstimatedTotalDebt(parseFloat(e.target.value) || 0)}
          className="w-full bg-[#0d1117] border border-[#1a2030] rounded-xl px-3 py-2.5 text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]"
          placeholder="0,00" />
      </div>
    </div>,

    // ── Step 4: Goals ────────────────────────────────────────────────────────
    <div key={4} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Seus objetivos financeiros</h2>
        <p className="text-sm text-[#4a5568]">Selecione um ou mais — detalhe valor e prazo.</p>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {GOAL_OPTIONS.map(opt => {
          const sel = selectedGoalTypes.includes(opt.type)
          return (
            <div key={opt.type} className={`rounded-xl border-2 transition-all ${sel ? 'border-[#00d4a0]' : 'border-[#1a2030]'}`}>
              <button onClick={() => setSelectedGoalTypes(prev => sel ? prev.filter(t => t !== opt.type) : [...prev, opt.type])}
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left">
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#e8ecf4]">{opt.label}</p>
                  <p className="text-xs text-[#4a5568]">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? 'bg-[#00d4a0] border-[#00d4a0]' : 'border-[#4a5568]'}`}>
                  {sel && <Check size={11} className="text-[#07090d]" />}
                </div>
              </button>
              {sel && (
                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#4a5568]">Nome / descrição</label>
                    <input value={goalDetails[opt.type].name}
                      onChange={(e) => setGoalDetails(prev => ({ ...prev, [opt.type]: { ...prev[opt.type], name: e.target.value } }))}
                      className="w-full mt-1 bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-1.5 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]"
                      placeholder="Ex: Reserva 6 meses" />
                  </div>
                  <div>
                    <label className="text-xs text-[#4a5568]">Valor alvo (R$)</label>
                    <input type="number" value={goalDetails[opt.type].targetAmount}
                      onChange={(e) => setGoalDetails(prev => ({ ...prev, [opt.type]: { ...prev[opt.type], targetAmount: e.target.value } }))}
                      className="w-full mt-1 bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-1.5 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]"
                      placeholder="0,00" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>,

    // ── Step 5: Budget Method ────────────────────────────────────────────────
    <div key={5} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Método de orçamento</h2>
        <p className="text-sm text-[#4a5568]">Define como distribuir seu saldo livre.</p>
      </div>
      <div className="space-y-2">
        {BUDGET_METHODS.map(opt => (
          <OptionCard key={opt.value} selected={budgetMethod === opt.value} onClick={() => setBudgetMethod(opt.value)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#e8ecf4]">{opt.label}</p>
                <p className="text-xs text-[#4a5568]">{opt.desc}</p>
              </div>
              <div className="text-right shrink-0 text-xs font-mono">
                <span className="text-[#3b82f6]">{opt.needs}%</span>
                <span className="text-[#4a5568]"> / </span>
                <span className="text-[#8b5cf6]">{opt.wants}%</span>
                <span className="text-[#4a5568]"> / </span>
                <span className="text-[#00d4a0]">{opt.invest}%</span>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
      {budgetMethod === 'personalizado' && (
        <div className="space-y-3 p-4 rounded-xl bg-[#0d1117] border border-[#1a2030]">
          {[
            { label: 'Necessidades', value: customNeeds, set: setCustomNeeds, color: '#3b82f6' },
            { label: 'Desejos', value: customWants, set: setCustomWants, color: '#8b5cf6' },
            { label: 'Investimento', value: customInvest, set: setCustomInvest, color: '#00d4a0' },
          ].map(({ label, value, set, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[#8898aa]">{label}</span>
                <span className="text-xs font-mono" style={{ color }}>{value}%</span>
              </div>
              <input type="range" min={5} max={85} value={value}
                onChange={(e) => set(parseInt(e.target.value))}
                className="w-full accent-[#00d4a0]" />
            </div>
          ))}
          <p className="text-xs text-center text-[#4a5568]">Total: {customNeeds + customWants + customInvest}% {customNeeds + customWants + customInvest !== 100 && <span className="text-[#f06060]">(deve ser 100%)</span>}</p>
        </div>
      )}
    </div>,

    // ── Step 6: Advisor Tone ─────────────────────────────────────────────────
    <div key={6} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#e8ecf4] mb-1">Tom do seu advisor</h2>
        <p className="text-sm text-[#4a5568]">Como prefere receber orientações?</p>
      </div>
      {([
        { value: 'tecnico', label: 'Técnico', desc: 'Dados, percentuais, terminologia financeira precisa', emoji: '📐' },
        { value: 'motivacional', label: 'Motivacional', desc: 'Foco em progresso, celebra conquistas, encoraja', emoji: '🔥' },
        { value: 'balanceado', label: 'Balanceado', desc: 'Combina clareza técnica com linguagem acessível', emoji: '⚡' },
      ] as const).map(opt => (
        <OptionCard key={opt.value} selected={advisorTone === opt.value} onClick={() => setAdvisorTone(opt.value)}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{opt.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-[#e8ecf4]">{opt.label}</p>
              <p className="text-xs text-[#4a5568]">{opt.desc}</p>
            </div>
            {advisorTone === opt.value && <Check size={16} className="text-[#00d4a0] ml-auto" />}
          </div>
        </OptionCard>
      ))}

      {/* Confirmation summary */}
      <div className="p-4 rounded-xl bg-[#00d4a0]/08 border border-[#00d4a0]/25 space-y-2 text-xs">
        <p className="font-semibold text-[#00d4a0]">✓ Tudo pronto, {name}!</p>
        <p className="text-[#8898aa]">Seus dados de contas já foram importados. O dashboard será personalizado com seu perfil.</p>
        <div className="flex gap-4 flex-wrap pt-1 text-[#4a5568]">
          <span>Risco: <span className="text-[#e8ecf4]">{riskProfile}</span></span>
          <span>Método: <span className="text-[#e8ecf4]">{budgetMethod}</span></span>
          <span>Metas: <span className="text-[#e8ecf4]">{selectedGoalTypes.length}</span></span>
        </div>
      </div>
    </div>,
  ]

  const isLastStep = step === TOTAL_STEPS - 1
  const canFinish = !isLastStep || (budgetMethod !== 'personalizado' || customNeeds + customWants + customInvest === 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090d]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, #00d4a0 0%, transparent 50%), radial-gradient(circle at 75% 75%, #6366f1 0%, transparent 50%)'
      }} />

      <div className="relative w-full max-w-lg mx-4">
        {/* Card */}
        <div className="bg-[#0d1117] border border-[#1a2030] rounded-2xl p-8 shadow-2xl">
          <ProgressBar step={step} />

          <div className="min-h-80">
            {steps[step]}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1a2030] text-[#8898aa] hover:border-[#243048] hover:text-[#e8ecf4] cursor-pointer transition-all text-sm">
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            <button
              onClick={() => isLastStep ? handleFinish() : setStep(s => s + 1)}
              disabled={!canNext() && step === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00d4a0] text-[#07090d] font-semibold text-sm hover:bg-[#00bfa0] cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLastStep ? (
                <><Check size={16} /> Começar</>
              ) : (
                <>Continuar <ChevronRight size={16} /></>
              )}
            </button>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-[#4a5568] mt-4">{step + 1} de {TOTAL_STEPS}</p>
        </div>
      </div>
    </div>
  )
}
