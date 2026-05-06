'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatBRL, calcTotalIncome, calcTotalTithe, calcFreeBalance } from '@/lib/utils'
import { ArrowRight, Plus, History, AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { AllocationKey } from '@/types'

const ALLOC_LABELS: Record<AllocationKey, string> = {
  needs: 'Necessidades',
  wants: 'Desejos',
  invest: 'Investimentos',
}
const ALLOC_COLORS: Record<AllocationKey, string> = {
  needs: '#3b82f6',
  wants: '#8b5cf6',
  invest: '#00d4a0',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-[#243048] rounded-xl p-3 text-xs shadow-xl">
      <p className="font-medium text-[#e8ecf4]">{payload[0].name}</p>
      <p className="font-mono text-[#00d4a0] mt-0.5">{formatBRL(payload[0].value)}</p>
    </div>
  )
}

const BUDGET_METHOD_PERCENTS: Record<string, { needs: number; wants: number; invest: number }> = {
  '50-30-20': { needs: 50, wants: 30, invest: 20 },
  '70-20-10': { needs: 70, wants: 20, invest: 10 },
  '60-20-20': { needs: 60, wants: 20, invest: 20 },
  'personalizado': { needs: 50, wants: 30, invest: 20 },
}

const BUDGET_METHOD_LABELS: Record<string, string> = {
  '50-30-20': '50-30-20',
  '70-20-10': '70-20-10',
  '60-20-20': '60-20-20',
  'personalizado': 'Personalizado',
}

export function AllocationWidget() {
  const { currentMonthId, getCurrentMonth, exchangeRate, updateAllocationPercents, updateAllocationSpent, moveAllocation, userProfile } = useFinanceStore()
  const month = getCurrentMonth()
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveForm, setMoveForm] = useState({ from: 'needs' as AllocationKey, to: 'wants' as AllocationKey, amount: '', reason: '' })

  if (!month) return null

  const freeBalance = Math.max(0, calcFreeBalance(month))
  const budgetMethod = userProfile?.budgetMethod || '50-30-20'

  const alloc = month.allocation
  const needsBudget = freeBalance * (alloc.needsPercent / 100)
  const wantsBudget = freeBalance * (alloc.wantsPercent / 100)
  const investBudget = freeBalance * (alloc.investPercent / 100)

  const budgets: Record<AllocationKey, number> = { needs: needsBudget, wants: wantsBudget, invest: investBudget }
  const spent: Record<AllocationKey, number> = { needs: alloc.needsSpent, wants: alloc.wantsSpent, invest: alloc.investSpent }

  const pieData = [
    { name: 'Necessidades', value: needsBudget, key: 'needs' },
    { name: 'Desejos', value: wantsBudget, key: 'wants' },
    { name: 'Investimentos', value: investBudget, key: 'invest' },
  ]

  const total = alloc.needsPercent + alloc.wantsPercent + alloc.investPercent
  const isValid = total === 100

  const handleSliderChange = (key: AllocationKey, value: number) => {
    const others: AllocationKey[] = (['needs', 'wants', 'invest'] as AllocationKey[]).filter(k => k !== key)
    const remaining = 100 - value
    const currentOthersTotal = others.reduce((s, k) => s + (key === 'needs' ? (k === 'wants' ? alloc.wantsPercent : alloc.investPercent) : k === 'needs' ? alloc.needsPercent : k === 'wants' ? alloc.wantsPercent : alloc.investPercent), 0)

    const newNeeds = key === 'needs' ? value : alloc.needsPercent
    const newWants = key === 'wants' ? value : alloc.wantsPercent
    const newInvest = key === 'invest' ? value : alloc.investPercent

    updateAllocationPercents(currentMonthId, newNeeds, newWants, newInvest)
  }

  const handleMove = () => {
    const amt = parseFloat(moveForm.amount)
    if (!amt || !moveForm.reason) return
    moveAllocation(currentMonthId, moveForm.from, moveForm.to, amt, moveForm.reason)
    setMoveForm({ from: 'needs', to: 'wants', amount: '', reason: '' })
    setShowMoveDialog(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Free balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="sm:col-span-2 lg:col-span-1 hover:border-[#243048] transition-colors">
          <CardContent className="p-5">
            <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">Saldo Livre</p>
            <p className="text-2xl font-mono font-bold text-[#00d4a0]">{formatBRL(freeBalance)}</p>
            <p className="text-xs text-[#4a5568] mt-1">após dízimo + contas</p>
          </CardContent>
        </Card>
        {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
          const over = spent[key] > budgets[key]
          return (
            <Card key={key} className={`hover:border-[#243048] transition-colors ${over ? 'border-[#f06060]/30' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">{ALLOC_LABELS[key]}</p>
                    <p className="text-xl font-mono font-bold" style={{ color: ALLOC_COLORS[key] }}>{alloc[`${key}Percent` as 'needsPercent' | 'wantsPercent' | 'investPercent']}%</p>
                    <p className="text-sm font-mono text-[#e8ecf4] mt-1">{formatBRL(budgets[key])}</p>
                  </div>
                  {over && <AlertTriangle size={16} className="text-[#f06060] mt-1" />}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sliders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CardTitle>Distribuição</CardTitle>
                <Badge variant="muted">{BUDGET_METHOD_LABELS[budgetMethod]}</Badge>
              </div>
              {!isValid && <Badge variant="red">soma: {total}%</Badge>}
              {isValid && <Badge variant="green">100%</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => (
              <Slider
                key={key}
                label={ALLOC_LABELS[key]}
                displayValue={`${alloc[`${key}Percent` as keyof typeof alloc]}% = ${formatBRL(budgets[key])}`}
                min={0} max={100} step={5}
                value={alloc[`${key}Percent` as 'needsPercent' | 'wantsPercent' | 'investPercent'] as number}
                color={ALLOC_COLORS[key]}
                onChange={(e) => handleSliderChange(key, parseInt(e.target.value))}
              />
            ))}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle>Gráfico de Alocação</CardTitle></CardHeader>
          <CardContent className="pt-2">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={ALLOC_COLORS[entry.key as AllocationKey]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ALLOC_COLORS[item.key as AllocationKey] }} />
                  <span className="text-xs text-[#8898aa]">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spent tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gastos Reais por Categoria</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowMoveDialog(true)}>
              <ArrowRight size={14} /> Mover Verba
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
            const budget = budgets[key]
            const spentVal = spent[key]
            const remaining = budget - spentVal
            const over = spentVal > budget
            const pct = budget > 0 ? (spentVal / budget) * 100 : 0

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ALLOC_COLORS[key] }} />
                    <span className="text-sm text-[#e8ecf4]">{ALLOC_LABELS[key]}</span>
                    {over && <Badge variant="red">+{formatBRL(Math.abs(remaining))}</Badge>}
                  </div>
                  <span className="text-xs text-[#4a5568]">{formatBRL(spentVal)} / {formatBRL(budget)}</span>
                </div>
                <Progress value={spentVal} max={budget} color={over ? '#f06060' : ALLOC_COLORS[key]} size="md" />
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    prefix="R$"
                    value={spentVal || ''}
                    placeholder="0,00"
                    className="text-sm"
                    onChange={(e) => updateAllocationSpent(currentMonthId, key, parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs text-[#4a5568] whitespace-nowrap">
                    {over ? `⚠ ${formatBRL(Math.abs(remaining))} acima` : `${formatBRL(remaining)} restante`}
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Movements log */}
      {alloc.movements.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Log de Movimentações</CardTitle></CardHeader>
          <CardContent className="pt-4 space-y-2">
            {alloc.movements.slice().reverse().map((mov) => (
              <div key={mov.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#1a2030]">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span style={{ color: ALLOC_COLORS[mov.from] }}>{ALLOC_LABELS[mov.from]}</span>
                    <ArrowRight size={13} className="text-[#4a5568]" />
                    <span style={{ color: ALLOC_COLORS[mov.to] }}>{ALLOC_LABELS[mov.to]}</span>
                  </div>
                  <p className="text-xs text-[#4a5568] mt-0.5">{mov.reason} · {new Date(mov.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className="text-sm font-mono text-[#f5a020]">{formatBRL(mov.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={showMoveDialog} onClose={() => setShowMoveDialog(false)} title="Mover Verba" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="De" value={moveForm.from}
              options={(['needs', 'wants', 'invest'] as AllocationKey[]).map(k => ({ value: k, label: ALLOC_LABELS[k] }))}
              onChange={(e) => setMoveForm({ ...moveForm, from: e.target.value as AllocationKey })}
            />
            <Select label="Para" value={moveForm.to}
              options={(['needs', 'wants', 'invest'] as AllocationKey[]).map(k => ({ value: k, label: ALLOC_LABELS[k] }))}
              onChange={(e) => setMoveForm({ ...moveForm, to: e.target.value as AllocationKey })}
            />
          </div>
          <Input label="Valor (R$)" type="number" prefix="R$" value={moveForm.amount}
            onChange={(e) => setMoveForm({ ...moveForm, amount: e.target.value })} placeholder="0,00" />
          <Input label="Motivo" value={moveForm.reason}
            onChange={(e) => setMoveForm({ ...moveForm, reason: e.target.value })} placeholder="Ex: emergência, viagem..." />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowMoveDialog(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleMove} disabled={!moveForm.amount || !moveForm.reason || moveForm.from === moveForm.to}>
              Mover
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
