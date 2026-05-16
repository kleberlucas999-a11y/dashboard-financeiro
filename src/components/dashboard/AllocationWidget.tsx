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
import { formatBRL, calcTotalIncome, calcFreeBalance } from '@/lib/utils'
import {
  ArrowRight, AlertTriangle, CheckCircle2, PlayCircle,
  Receipt, PauseCircle,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
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

const BILLS_COLOR = '#f06060'
const UNALLOC_COLOR = '#1a2030'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-[#243048] rounded-xl p-3 text-xs shadow-xl">
      <p className="font-medium text-[#e8ecf4]">{payload[0].name}</p>
      <p className="font-mono text-[#00d4a0] mt-0.5">{formatBRL(payload[0].value)}</p>
    </div>
  )
}

const BUDGET_METHOD_LABELS: Record<string, string> = {
  '50-30-20': '50-30-20',
  '70-20-10': '70-20-10',
  '60-20-20': '60-20-20',
  'personalizado': 'Personalizado',
}

// ─── Stacked income bar ───────────────────────────────────────────────────────
function IncomeBar({
  totalIncome, billsTotal, needsBudget, wantsBudget, investBudget,
}: {
  totalIncome: number
  billsTotal: number
  needsBudget: number
  wantsBudget: number
  investBudget: number
}) {
  if (totalIncome <= 0) return null
  const pct = (v: number) => Math.max(0, Math.min(100, (v / totalIncome) * 100))

  const segments = [
    { label: 'Contas', value: billsTotal, color: BILLS_COLOR },
    { label: 'Necessidades', value: needsBudget, color: ALLOC_COLORS.needs },
    { label: 'Desejos', value: wantsBudget, color: ALLOC_COLORS.wants },
    { label: 'Investimentos', value: investBudget, color: ALLOC_COLORS.invest },
  ]
  const allocated = billsTotal + needsBudget + wantsBudget + investBudget
  const unallocated = Math.max(0, totalIncome - allocated)

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full transition-all"
            style={{ width: `${pct(s.value)}%`, background: s.color, opacity: 0.85 }}
            title={`${s.label}: ${formatBRL(s.value)} (${pct(s.value).toFixed(1)}%)`}
          />
        ))}
        {unallocated > 0 && (
          <div
            className="h-full rounded-r-full"
            style={{ width: `${pct(unallocated)}%`, background: UNALLOC_COLOR }}
            title={`Não alocado: ${formatBRL(unallocated)}`}
          />
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-[11px] text-[#8898aa]">{s.label}</span>
            <span className="text-[11px] font-mono text-[#e8ecf4]">{formatBRL(s.value)}</span>
            <span className="text-[10px] text-[#4a5568]">({pct(s.value).toFixed(0)}%)</span>
          </div>
        ))}
        {unallocated > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: UNALLOC_COLOR }} />
            <span className="text-[11px] text-[#4a5568]">Não alocado</span>
            <span className="text-[11px] font-mono text-[#4a5568]">{formatBRL(unallocated)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bills status row ─────────────────────────────────────────────────────────
function BillsStatus({ month }: { month: any }) {
  const allBills = month.bills.filter((b: any) => b.status !== 'quitado')
  const totalBills = allBills.reduce((s: number, b: any) => s + b.amount, 0)
  const paidBills  = allBills.filter((b: any) => b.status === 'pago').reduce((s: number, b: any) => s + b.amount, 0)
  const pendingBills = totalBills - paidBills

  const overduePending = (month.overdueBills || [])
    .filter((b: any) => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s: number, b: any) => s + b.amount, 0)

  const paidPct = totalBills > 0 ? (paidBills / totalBills) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Bills row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Receipt size={14} className="text-[#f06060] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
            <span className="text-xs text-[#8898aa]">Contas do mês</span>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#00d4a0]">Pago: {formatBRL(paidBills)}</span>
              <span className="text-[#4a5568]">/</span>
              <span className="text-[#e8ecf4]">{formatBRL(totalBills)} total</span>
            </div>
          </div>
          <Progress value={paidBills} max={totalBills || 1} color="#00d4a0" size="sm" />
        </div>
      </div>

      {/* Pending + overdue pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {pendingBills > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5a020]/10 border border-[#f5a020]/25">
            <span className="text-xs text-[#f5a020]">Pendentes:</span>
            <span className="text-xs font-mono font-semibold text-[#f5a020]">{formatBRL(pendingBills)}</span>
            <span className="text-[10px] text-[#4a5568]">({paidPct.toFixed(0)}% pago)</span>
          </div>
        )}
        {pendingBills === 0 && totalBills > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4a0]/10 border border-[#00d4a0]/25">
            <CheckCircle2 size={13} className="text-[#00d4a0]" />
            <span className="text-xs text-[#00d4a0] font-medium">Todas as contas pagas!</span>
          </div>
        )}
        {overduePending > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f06060]/10 border border-[#f06060]/25">
            <AlertTriangle size={12} className="text-[#f06060]" />
            <span className="text-xs text-[#f06060]">Atrasadas:</span>
            <span className="text-xs font-mono font-semibold text-[#f06060]">{formatBRL(overduePending)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export function AllocationWidget() {
  const {
    currentMonthId, getCurrentMonth, updateAllocationPercents,
    updateAllocationSpent, moveAllocation, setAllocationActive, userProfile,
  } = useFinanceStore()
  const month = getCurrentMonth()
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveForm, setMoveForm] = useState({ from: 'needs' as AllocationKey, to: 'wants' as AllocationKey, amount: '', reason: '' })

  if (!month) return null

  const totalIncome  = calcTotalIncome(month)
  const freeBalance  = Math.max(0, calcFreeBalance(month))
  const isActive     = !!month.allocationActive
  const budgetMethod = userProfile?.budgetMethod || '50-30-20'

  const alloc = month.allocation
  const needsBudget  = freeBalance * (alloc.needsPercent / 100)
  const wantsBudget  = freeBalance * (alloc.wantsPercent / 100)
  const investBudget = freeBalance * (alloc.investPercent / 100)

  const budgets: Record<AllocationKey, number> = { needs: needsBudget, wants: wantsBudget, invest: investBudget }
  const spent:   Record<AllocationKey, number> = { needs: alloc.needsSpent, wants: alloc.wantsSpent, invest: alloc.investSpent }

  // Bills total (active, non-quitado)
  const billsTotal = month.bills
    .filter(b => b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const overduePending = (month.overdueBills || [])
    .filter(b => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const totalCosts = billsTotal + overduePending

  const pieData = [
    { name: 'Necessidades', value: needsBudget, key: 'needs' },
    { name: 'Desejos', value: wantsBudget, key: 'wants' },
    { name: 'Investimentos', value: investBudget, key: 'invest' },
  ]

  const total = alloc.needsPercent + alloc.wantsPercent + alloc.investPercent
  const isValid = total === 100

  const handleSliderChange = (key: AllocationKey, value: number) => {
    const newNeeds  = key === 'needs'  ? value : alloc.needsPercent
    const newWants  = key === 'wants'  ? value : alloc.wantsPercent
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

      {/* ── 1. Panorama da Renda ─────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-1">Renda Total do Mês</p>
              <p className="text-3xl font-mono font-bold text-[#e8ecf4]">{formatBRL(totalIncome)}</p>
              <p className="text-xs text-[#4a5568] mt-1">
                {totalIncome > 0
                  ? `Contas: ${((totalCosts / totalIncome) * 100).toFixed(0)}% · Saldo livre: ${((freeBalance / totalIncome) * 100).toFixed(0)}%`
                  : 'Configure sua renda em Visão Geral'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#4a5568] mb-1">Saldo livre</p>
              <p className="text-xl font-mono font-bold text-[#00d4a0]">{formatBRL(freeBalance)}</p>
              <p className="text-[10px] text-[#4a5568] mt-0.5">após todas as contas</p>
            </div>
          </div>

          {/* Stacked bar */}
          {totalIncome > 0 && (
            <IncomeBar
              totalIncome={totalIncome}
              billsTotal={totalCosts}
              needsBudget={isActive ? needsBudget : 0}
              wantsBudget={isActive ? wantsBudget : 0}
              investBudget={isActive ? investBudget : 0}
            />
          )}
        </CardContent>
      </Card>

      {/* ── 2. Status das Contas ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Receipt size={15} className="text-[#f06060]" />
            Status das Contas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <BillsStatus month={month} />
        </CardContent>
      </Card>

      {/* ── 3. Allocation gate / full UI ─────────────────────────────── */}
      {!isActive ? (
        <Card className="border-dashed border-[#243048]">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00d4a0]/10 border border-[#00d4a0]/20 flex items-center justify-center mx-auto">
              <PlayCircle size={26} className="text-[#00d4a0]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[#e8ecf4]">Alocação não iniciada</p>
              <p className="text-sm text-[#4a5568] mt-1">
                Saldo livre disponível:{' '}
                <span className="font-mono font-semibold text-[#00d4a0]">{formatBRL(freeBalance)}</span>
              </p>
              <p className="text-xs text-[#4a5568] mt-1">
                Ative quando estiver pronto para distribuir o saldo entre as categorias do método {BUDGET_METHOD_LABELS[budgetMethod]}.
              </p>
            </div>
            <Button
              onClick={() => setAllocationActive(currentMonthId, true)}
              disabled={freeBalance <= 0}
              className="mx-auto"
            >
              <PlayCircle size={15} /> Ativar Alocação do Mês
            </Button>
            {freeBalance <= 0 && (
              <p className="text-xs text-[#f5a020]">Configure sua renda e adicione contas primeiro.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Summary cards ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
              const over = spent[key] > budgets[key]
              const pct = totalIncome > 0 ? ((budgets[key] / totalIncome) * 100).toFixed(0) : '0'
              return (
                <Card key={key} className={`hover:border-[#243048] transition-colors ${over ? 'border-[#f06060]/30' : ''}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-1">{ALLOC_LABELS[key]}</p>
                        <p className="text-xl font-mono font-bold" style={{ color: ALLOC_COLORS[key] }}>
                          {alloc[`${key}Percent` as 'needsPercent' | 'wantsPercent' | 'investPercent']}%
                          <span className="text-xs font-normal text-[#4a5568] ml-1">da renda livre</span>
                        </p>
                        <p className="text-sm font-mono text-[#e8ecf4] mt-1">{formatBRL(budgets[key])}</p>
                        {totalIncome > 0 && (
                          <p className="text-[10px] text-[#4a5568] mt-0.5">≈ {pct}% da renda total</p>
                        )}
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
                  <div className="flex items-center gap-2">
                    {!isValid && <Badge variant="red">soma: {total}%</Badge>}
                    {isValid  && <Badge variant="green">100%</Badge>}
                  </div>
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Gastos Reais por Categoria</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowMoveDialog(true)}>
                    <ArrowRight size={14} /> Mover Verba
                  </Button>
                  <button
                    onClick={() => setAllocationActive(currentMonthId, false)}
                    className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#f5a020] border border-[#1a2030] hover:border-[#f5a020]/30 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                    title="Desativar alocação deste mês"
                  >
                    <PauseCircle size={13} /> Desativar
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
                const budget     = budgets[key]
                const spentVal   = spent[key]
                const remaining  = budget - spentVal
                const over       = spentVal > budget
                const pct        = budget > 0 ? (spentVal / budget) * 100 : 0

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
        </>
      )}

      {/* Move dialog */}
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
