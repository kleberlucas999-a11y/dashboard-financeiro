'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { formatBRL } from '@/lib/utils'
import {
  UserCircle, Pencil, RefreshCw, ShieldCheck, Zap, BarChart3,
  Target, Trophy, Calendar, Cpu,
} from 'lucide-react'
import { RiskProfile, BudgetMethod, ExperienceLevel, AdvisorTone } from '@/types'

const RISK_LABELS: Record<RiskProfile, { label: string; color: string; desc: string }> = {
  conservador: { label: 'Conservador', color: '#00d4a0', desc: 'Prioriza segurança e liquidez' },
  moderado: { label: 'Moderado', color: '#3b82f6', desc: 'Equilíbrio entre segurança e crescimento' },
  arrojado: { label: 'Arrojado', color: '#f5a020', desc: 'Aceita volatilidade por maiores retornos' },
}

const BUDGET_LABELS: Record<BudgetMethod, string> = {
  '50-30-20': '50-30-20 (padrão)',
  '70-20-10': '70-20-10 (conservador)',
  '60-20-20': '60-20-20 (equilibrado)',
  'personalizado': 'Personalizado',
}

const EXP_LABELS: Record<ExperienceLevel, string> = {
  iniciante: '🌱 Iniciante',
  intermediario: '📈 Intermediário',
  avancado: '🎓 Avançado',
}

const TONE_LABELS: Record<AdvisorTone, string> = {
  tecnico: '🔬 Técnico',
  motivacional: '🚀 Motivacional',
  balanceado: '⚖️ Balanceado',
}

export function ProfileWidget() {
  const { userProfile, updateUserProfile, resetOnboarding } = useFinanceStore()
  const [showEdit, setShowEdit] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const [form, setForm] = useState({
    name: '',
    riskProfile: 'moderado' as RiskProfile,
    budgetMethod: '50-30-20' as BudgetMethod,
    experience: 'intermediario' as ExperienceLevel,
    advisorTone: 'balanceado' as AdvisorTone,
    hasEmergencyFund: false,
    emergencyFundMonths: 0,
    estimatedTotalDebt: 0,
  })

  if (!userProfile) return null

  const openEdit = () => {
    setForm({
      name: userProfile.name,
      riskProfile: userProfile.riskProfile,
      budgetMethod: userProfile.budgetMethod,
      experience: userProfile.experience,
      advisorTone: userProfile.advisorTone,
      hasEmergencyFund: userProfile.hasEmergencyFund,
      emergencyFundMonths: userProfile.emergencyFundMonths,
      estimatedTotalDebt: userProfile.estimatedTotalDebt,
    })
    setShowEdit(true)
  }

  const handleSave = () => {
    updateUserProfile(form)
    setShowEdit(false)
  }

  const handleReset = () => {
    resetOnboarding()
    setShowReset(false)
    window.location.reload()
  }

  const activeGoals = userProfile.goals.filter(g => !g.completedAt)
  const completedGoals = userProfile.goals.filter(g => g.completedAt)
  const risk = RISK_LABELS[userProfile.riskProfile]

  const onboardingDate = userProfile.onboardingCompletedAt
    ? new Date(userProfile.onboardingCompletedAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl mx-auto">

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <UserCircle size={28} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#e8ecf4]">{userProfile.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="muted">{EXP_LABELS[userProfile.experience]}</Badge>
                  {onboardingDate && (
                    <span className="text-xs text-[#4a5568] flex items-center gap-1">
                      <Calendar size={10} /> desde {onboardingDate}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil size={13} /> Editar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Risk profile */}
            <div className="px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
              <p className="text-xs text-[#8898aa] mb-1 flex items-center gap-1"><ShieldCheck size={11} /> Perfil de risco</p>
              <p className="font-semibold text-sm" style={{ color: risk.color }}>{risk.label}</p>
              <p className="text-xs text-[#4a5568] mt-0.5">{risk.desc}</p>
            </div>

            {/* Budget method */}
            <div className="px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
              <p className="text-xs text-[#8898aa] mb-1 flex items-center gap-1"><BarChart3 size={11} /> Método de orçamento</p>
              <p className="font-semibold text-sm text-[#e8ecf4]">{BUDGET_LABELS[userProfile.budgetMethod]}</p>
            </div>

            {/* Advisor tone */}
            <div className="px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
              <p className="text-xs text-[#8898aa] mb-1 flex items-center gap-1"><Cpu size={11} /> Tom do advisor</p>
              <p className="font-semibold text-sm text-[#e8ecf4]">{TONE_LABELS[userProfile.advisorTone]}</p>
            </div>

            {/* Emergency fund */}
            <div className="px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
              <p className="text-xs text-[#8898aa] mb-1 flex items-center gap-1"><Zap size={11} /> Reserva de emergência</p>
              {userProfile.hasEmergencyFund ? (
                <p className="font-semibold text-sm text-[#00d4a0]">{userProfile.emergencyFundMonths} meses ✓</p>
              ) : (
                <p className="font-semibold text-sm text-[#f06060]">Não possui</p>
              )}
            </div>
          </div>

          {/* Debt */}
          {userProfile.estimatedTotalDebt > 0 && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-[#f06060]/5 border border-[#f06060]/20">
              <p className="text-xs text-[#8898aa] mb-0.5">Dívidas estimadas</p>
              <p className="font-semibold text-sm text-[#f06060]">{formatBRL(userProfile.estimatedTotalDebt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={16} className="text-[#00d4a0]" />
            Metas Financeiras
            <span className="text-xs font-normal text-[#4a5568]">({activeGoals.length} ativas, {completedGoals.length} concluídas)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {activeGoals.length === 0 ? (
            <p className="text-sm text-[#4a5568] py-2">Nenhuma meta ativa. Acesse a seção Metas para criar.</p>
          ) : (
            activeGoals.slice(0, 5).map(g => {
              const pct = Math.min((g.currentAmount / Math.max(g.targetAmount, 1)) * 100, 100)
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#e8ecf4]">{g.name}</span>
                    <span className="text-[#4a5568] font-mono">{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} max={100} color="#00d4a0" size="sm" />
                </div>
              )
            })
          )}
          {activeGoals.length > 5 && (
            <p className="text-xs text-[#4a5568]">+{activeGoals.length - 5} outras metas — veja em Metas</p>
          )}
          {completedGoals.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-[#f5a020] text-xs">
              <Trophy size={12} /> {completedGoals.length} meta{completedGoals.length > 1 ? 's' : ''} concluída{completedGoals.length > 1 ? 's' : ''} 🏆
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#e8ecf4]">Refazer onboarding</p>
              <p className="text-xs text-[#4a5568] mt-0.5">Reconfigura seu perfil do zero — dados mensais são preservados</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowReset(true)} className="text-[#f06060] border-[#f06060]/30 hover:bg-[#f06060]/10">
              <RefreshCw size={13} /> Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={showEdit} onClose={() => setShowEdit(false)} title="Editar Perfil" size="sm">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          <div>
            <label className="block text-xs text-[#8898aa] mb-2">Perfil de risco</label>
            <div className="grid grid-cols-3 gap-2">
              {(['conservador', 'moderado', 'arrojado'] as RiskProfile[]).map(r => (
                <button key={r} onClick={() => setForm({ ...form, riskProfile: r })}
                  className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all capitalize ${form.riskProfile === r ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8898aa] mb-2">Método de orçamento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['50-30-20', '70-20-10', '60-20-20', 'personalizado'] as BudgetMethod[]).map(m => (
                <button key={m} onClick={() => setForm({ ...form, budgetMethod: m })}
                  className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.budgetMethod === m ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
                  {BUDGET_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8898aa] mb-2">Experiência financeira</label>
            <div className="grid grid-cols-3 gap-2">
              {(['iniciante', 'intermediario', 'avancado'] as ExperienceLevel[]).map(e => (
                <button key={e} onClick={() => setForm({ ...form, experience: e })}
                  className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.experience === e ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
                  {EXP_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8898aa] mb-2">Tom do advisor</label>
            <div className="grid grid-cols-3 gap-2">
              {(['tecnico', 'motivacional', 'balanceado'] as AdvisorTone[]).map(t => (
                <button key={t} onClick={() => setForm({ ...form, advisorTone: t })}
                  className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.advisorTone === t ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
                  {TONE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Reserva de emergência (meses)" type="number" min={0}
              value={String(form.emergencyFundMonths)}
              onChange={e => setForm({ ...form, emergencyFundMonths: parseInt(e.target.value) || 0, hasEmergencyFund: parseInt(e.target.value) > 0 })} />
            <Input label="Dívidas estimadas (R$)" type="number" min={0}
              value={String(form.estimatedTotalDebt)}
              onChange={e => setForm({ ...form, estimatedTotalDebt: parseFloat(e.target.value) || 0 })} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.name}>Salvar</Button>
          </div>
        </div>
      </Dialog>

      {/* Reset confirm dialog */}
      <Dialog open={showReset} onClose={() => setShowReset(false)} title="Refazer onboarding?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#8898aa]">
            Seu perfil, metas e histórico do advisor serão apagados. Os dados mensais (contas, USDT, etc.) são preservados.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowReset(false)}>Cancelar</Button>
            <Button className="flex-1 bg-[#f06060] hover:bg-[#f06060]/90" onClick={handleReset}>
              Sim, reiniciar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
