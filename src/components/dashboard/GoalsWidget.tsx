'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { FinancialGoal, GoalType } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { formatBRL, generateId } from '@/lib/utils'
import { Target, Plus, Trash2, Pencil, Check, TrendingUp, AlertTriangle, Trophy } from 'lucide-react'

const GOAL_META: Record<GoalType, { label: string; icon: string; color: string }> = {
  emergencia: { label: 'Reserva', icon: '🛡️', color: '#00d4a0' },
  divida: { label: 'Dívida', icon: '💳', color: '#f06060' },
  compra: { label: 'Compra', icon: '🎯', color: '#3b82f6' },
  independencia: { label: 'Independência', icon: '🏆', color: '#f5a020' },
  alavancagem: { label: 'Alavancagem', icon: '📈', color: '#26a17b' },
  negocio: { label: 'Negócio', icon: '🏪', color: '#8b5cf6' },
}

const GOAL_TYPES: GoalType[] = ['emergencia', 'divida', 'compra', 'independencia', 'alavancagem', 'negocio']

function goalStatus(goal: FinancialGoal): 'concluida' | 'prazo' | 'atencao' | 'atrasado' {
  if (goal.currentAmount >= goal.targetAmount) return 'concluida'
  if (!goal.targetDate) return 'prazo'
  const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
  if (daysLeft < 0) return 'atrasado'
  if (daysLeft < 60) return 'atencao'
  return 'prazo'
}

function GoalCard({ goal, onEdit, onDelete, onDeposit }: {
  goal: FinancialGoal
  onEdit: (g: FinancialGoal) => void
  onDelete: (id: string) => void
  onDeposit: (g: FinancialGoal) => void
}) {
  const meta = GOAL_META[goal.type]
  const pct = Math.min((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100, 100)
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
  const status = goalStatus(goal)
  const done = status === 'concluida'

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Card className={`transition-all ${done ? 'border-[#00d4a0]/40' : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className="text-sm font-semibold text-[#e8ecf4]">{goal.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={done ? 'green' : status === 'atrasado' ? 'red' : status === 'atencao' ? 'amber' : 'muted'}>
                  {done ? '✓ Concluída' : status === 'atrasado' ? 'Atrasada' : status === 'atencao' ? 'Atenção' : meta.label}
                </Badge>
                {daysLeft !== null && !done && (
                  <span className="text-xs text-[#4a5568]">
                    {daysLeft > 0 ? `${daysLeft} dias restantes` : `${Math.abs(daysLeft)} dias atrasado`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] cursor-pointer transition-colors"><Pencil size={13} /></button>
            <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 cursor-pointer transition-colors"><Trash2 size={13} /></button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs">
            <span className="font-mono text-[#e8ecf4]">{formatBRL(goal.currentAmount)}</span>
            <span className="font-mono text-[#4a5568]">{formatBRL(goal.targetAmount)}</span>
          </div>
          <Progress value={pct} max={100} color={done ? '#00d4a0' : meta.color} size="md" />
          <div className="flex justify-between text-xs">
            <span style={{ color: meta.color }}>{pct.toFixed(0)}% concluído</span>
            {!done && <span className="text-[#4a5568]">faltam {formatBRL(remaining)}</span>}
          </div>
        </div>

        {!done && (
          <Button size="sm" className="w-full" onClick={() => onDeposit(goal)}
            style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}>
            <TrendingUp size={13} /> Registrar aporte
          </Button>
        )}
        {done && (
          <div className="flex items-center justify-center gap-2 py-2 text-[#00d4a0] text-sm font-medium">
            <Trophy size={14} /> Meta atingida!
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GoalsWidget() {
  const { userProfile, addGoal, updateGoal, deleteGoal, updateGoalAmount } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [depositGoal, setDepositGoal] = useState<FinancialGoal | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  const [form, setForm] = useState({
    type: 'emergencia' as GoalType,
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    priority: 1,
    notes: '',
  })

  if (!userProfile) return null

  const goals = [...userProfile.goals].sort((a, b) => a.priority - b.priority)
  const active = goals.filter(g => !g.completedAt)
  const completed = goals.filter(g => g.completedAt)
  const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0)
  const totalCurrent = active.reduce((s, g) => s + g.currentAmount, 0)

  const openAdd = () => {
    setEditingGoal(null)
    setForm({ type: 'emergencia', name: '', targetAmount: '', currentAmount: '', targetDate: '', priority: active.length + 1, notes: '' })
    setShowForm(true)
  }

  const openEdit = (g: FinancialGoal) => {
    setEditingGoal(g)
    setForm({ type: g.type, name: g.name, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), targetDate: g.targetDate || '', priority: g.priority, notes: g.notes || '' })
    setShowForm(true)
  }

  const handleSave = () => {
    const data = {
      type: form.type,
      name: form.name,
      targetAmount: parseFloat(form.targetAmount) || 0,
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: form.targetDate || undefined,
      priority: form.priority,
      notes: form.notes,
    }
    if (editingGoal) {
      updateGoal(editingGoal.id, data)
    } else {
      addGoal(data)
    }
    setShowForm(false)
  }

  const handleDeposit = () => {
    if (!depositGoal) return
    const add = parseFloat(depositAmount) || 0
    updateGoalAmount(depositGoal.id, depositGoal.currentAmount + add)
    setDepositGoal(null)
    setDepositAmount('')
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-[#8898aa]">Metas ativas</p>
                <p className="text-2xl font-mono font-bold text-[#e8ecf4]">{active.length}</p>
              </div>
              <div>
                <p className="text-xs text-[#8898aa]">Total acumulado</p>
                <p className="text-2xl font-mono font-bold text-[#00d4a0]">{formatBRL(totalCurrent)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8898aa]">Total alvo</p>
                <p className="text-2xl font-mono font-bold text-[#4a5568]">{formatBRL(totalTarget)}</p>
              </div>
              {completed.length > 0 && (
                <div>
                  <p className="text-xs text-[#8898aa]">Concluídas</p>
                  <p className="text-2xl font-mono font-bold text-[#f5a020]">{completed.length} 🏆</p>
                </div>
              )}
            </div>
            <Button onClick={openAdd} size="sm"><Plus size={14} /> Nova Meta</Button>
          </div>
          {totalTarget > 0 && (
            <div className="mt-3">
              <Progress value={totalCurrent} max={totalTarget} color="#00d4a0" size="md" />
              <p className="text-xs text-[#4a5568] mt-1 text-right">{((totalCurrent / totalTarget) * 100).toFixed(0)}% do total das metas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active goals */}
      {active.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target size={40} className="mx-auto text-[#1a2030] mb-3" />
            <p className="text-[#4a5568] text-sm">Nenhuma meta ativa.</p>
            <button onClick={openAdd} className="mt-3 text-sm text-[#00d4a0] hover:underline cursor-pointer">Criar primeira meta →</button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map(g => (
            <GoalCard key={g.id} goal={g}
              onEdit={openEdit}
              onDelete={(id) => deleteGoal(id)}
              onDeposit={(g) => { setDepositGoal(g); setDepositAmount('') }}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trophy size={16} className="text-[#f5a020]" /> Metas Concluídas ({completed.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {completed.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[#1a2030] opacity-60">
                <span>{GOAL_META[g.type].icon}</span>
                <span className="text-sm text-[#e8ecf4] flex-1">{g.name}</span>
                <span className="text-sm font-mono text-[#00d4a0]">{formatBRL(g.targetAmount)}</span>
                <Check size={14} className="text-[#00d4a0]" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit form */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editingGoal ? 'Editar Meta' : 'Nova Meta'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#8898aa] mb-2">Tipo de objetivo</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPES.map(t => {
                const m = GOAL_META[t]
                return (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${form.type === t ? 'border-[#00d4a0] bg-[#00d4a0]/10 text-[#00d4a0]' : 'border-[#1a2030] text-[#8898aa]'}`}>
                    {m.icon} {m.label}
                  </button>
                )
              })}
            </div>
          </div>
          <Input label="Nome / descrição" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Reserva 6 meses" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor alvo (R$)" type="number" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="0,00" />
            <Input label="Já acumulado (R$)" type="number" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} placeholder="0,00" />
          </div>
          <Input label="Data alvo (opcional)" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
          <Input label="Prioridade (1 = mais importante)" type="number" min={1} value={String(form.priority)} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.name || !form.targetAmount}>Salvar</Button>
          </div>
        </div>
      </Dialog>

      {/* Deposit dialog */}
      <Dialog open={!!depositGoal} onClose={() => setDepositGoal(null)} title={`Aporte — ${depositGoal?.name}`} size="sm">
        <div className="space-y-4">
          {depositGoal && (
            <div className="px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030] text-sm">
              <div className="flex justify-between">
                <span className="text-[#8898aa]">Acumulado</span>
                <span className="font-mono text-[#e8ecf4]">{formatBRL(depositGoal.currentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8898aa]">Faltam</span>
                <span className="font-mono text-[#f5a020]">{formatBRL(Math.max(depositGoal.targetAmount - depositGoal.currentAmount, 0))}</span>
              </div>
            </div>
          )}
          <Input label="Valor do aporte (R$)" type="number" autoFocus value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0,00" />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDepositGoal(null)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleDeposit} disabled={!depositAmount}>Confirmar aporte</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
