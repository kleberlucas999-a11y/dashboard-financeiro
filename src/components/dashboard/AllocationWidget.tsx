'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { formatBRL, calcTotalIncome, calcFreeBalance, calcUSDTNet } from '@/lib/utils'
import {
  ArrowRight, AlertTriangle, CheckCircle2, PlayCircle,
  Receipt, PauseCircle, Pencil, Check, X, Landmark,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { AllocationKey, BankAccount } from '@/types'

// helper: balance in native currency (USD for usdt, BRL for others)
function calcAccBalance(acc: BankAccount): number {
  return (acc.initialBalance ?? 0) +
    acc.transactions.reduce((s, t) => t.type === 'entrada' ? s + t.amount : s - t.amount, 0)
}

// ─── Category config ──────────────────────────────────────────────────────────
// 'needs'  → Despesas / Custos  (slider, % of totalIncome — pre-filled from bills)
// 'wants'  → Lazer              (slider, % of totalIncome)
// 'invest' → Investimentos      (slider, % of totalIncome)
// All three sum to 100% of totalIncome.

const ALLOC_LABELS: Record<AllocationKey, string> = {
  needs:  'Despesas / Custos',
  wants:  'Lazer',
  invest: 'Investimentos',
}
const ALLOC_COLORS: Record<AllocationKey, string> = {
  needs:  '#f06060',
  wants:  '#a78bfa',
  invest: '#00d4a0',
}

// ─── Slider com inputs editáveis de % e R$ ───────────────────────────────────
function AllocSlider({
  label, color, pct, budget, totalIncome, onChange,
}: {
  label: string
  color: string
  pct: number
  budget: number
  totalIncome: number
  onChange: (newPct: number) => void
}) {
  const [editMode, setEditMode] = useState<'pct' | 'brl' | null>(null)
  const [draft, setDraft] = useState('')

  const openEdit = (mode: 'pct' | 'brl') => {
    setEditMode(mode)
    setDraft(mode === 'pct' ? String(pct) : budget.toFixed(2))
  }

  const commit = () => {
    const raw = parseFloat(draft.replace(',', '.'))
    if (!isNaN(raw) && raw >= 0) {
      if (editMode === 'pct') {
        onChange(Math.min(100, Math.round(raw)))
      } else {
        // convert R$ to % (rounded to 1 decimal, capped at 100)
        const newPct = totalIncome > 0 ? Math.min(100, Math.round((raw / totalIncome) * 100)) : 0
        onChange(newPct)
      }
    }
    setEditMode(null)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditMode(null)
  }

  return (
    <div className="space-y-2">
      {/* Label row + inline inputs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-sm text-[#e8ecf4]">{label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* % input */}
          {editMode === 'pct' ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="number" min={0} max={100}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKey}
                className="w-14 bg-[#07090d] border border-[#00d4a0]/60 rounded-md px-2 py-0.5 text-xs font-mono text-[#e8ecf4] focus:outline-none text-right"
              />
              <span className="text-xs text-[#4a5568]">%</span>
              <button onClick={commit} className="p-0.5 text-[#00d4a0] hover:text-[#00d4a0]/80 cursor-pointer"><Check size={12} /></button>
              <button onClick={() => setEditMode(null)} className="p-0.5 text-[#4a5568] hover:text-[#e8ecf4] cursor-pointer"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => openEdit('pct')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#1a2030] hover:border-[#243048] text-xs font-mono text-[#e8ecf4] hover:text-[#00d4a0] cursor-pointer transition-all"
              title="Editar %"
            >
              {pct}%
              <Pencil size={9} className="text-[#4a5568]" />
            </button>
          )}

          {/* R$ input */}
          {editMode === 'brl' ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#4a5568]">R$</span>
              <input
                autoFocus
                type="number" min={0}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKey}
                className="w-24 bg-[#07090d] border border-[#00d4a0]/60 rounded-md px-2 py-0.5 text-xs font-mono text-[#e8ecf4] focus:outline-none text-right"
              />
              <button onClick={commit} className="p-0.5 text-[#00d4a0] hover:text-[#00d4a0]/80 cursor-pointer"><Check size={12} /></button>
              <button onClick={() => setEditMode(null)} className="p-0.5 text-[#4a5568] hover:text-[#e8ecf4] cursor-pointer"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => openEdit('brl')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#1a2030] hover:border-[#243048] text-xs font-mono hover:text-[#00d4a0] cursor-pointer transition-all"
              style={{ color }}
              title="Editar valor em R$"
            >
              {budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              <Pencil size={9} className="text-[#4a5568]" />
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <input
        type="range" min={0} max={100} step={1}
        value={pct}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${pct}%, #1a2030 ${pct}%)`,
          accentColor: color,
        }}
      />
    </div>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-[#243048] rounded-xl p-3 text-xs shadow-xl">
      <p className="font-medium text-[#e8ecf4]">{payload[0].name}</p>
      <p className="font-mono mt-0.5" style={{ color: payload[0].payload.color }}>{formatBRL(payload[0].value)}</p>
    </div>
  )
}

// ─── Stacked income bar ───────────────────────────────────────────────────────
function IncomeBar({ totalIncome, needsBudget, wantsBudget, investBudget }: {
  totalIncome: number; needsBudget: number; wantsBudget: number; investBudget: number
}) {
  if (totalIncome <= 0) return null
  const pct = (v: number) => Math.max(0, Math.min(100, (v / totalIncome) * 100))
  const segments = [
    { label: 'Despesas',      value: needsBudget,  color: ALLOC_COLORS.needs },
    { label: 'Lazer',         value: wantsBudget,  color: ALLOC_COLORS.wants },
    { label: 'Investimentos', value: investBudget, color: ALLOC_COLORS.invest },
  ]
  const allocated   = needsBudget + wantsBudget + investBudget
  const unallocated = Math.max(0, totalIncome - allocated)

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div key={s.label} className="h-full transition-all"
            style={{ width: `${pct(s.value)}%`, background: s.color, opacity: 0.85 }}
            title={`${s.label}: ${formatBRL(s.value)} (${pct(s.value).toFixed(1)}%)`} />
        ))}
        {unallocated > 0 && (
          <div className="h-full flex-1 rounded-r-full bg-[#1a2030]"
            title={`Não alocado: ${formatBRL(unallocated)}`} />
        )}
      </div>
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
            <div className="w-2 h-2 rounded-full bg-[#1a2030] shrink-0" />
            <span className="text-[11px] text-[#4a5568]">Não alocado</span>
            <span className="text-[11px] font-mono text-[#4a5568]">{formatBRL(unallocated)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bills status ─────────────────────────────────────────────────────────────
function BillsStatus({ month }: { month: any }) {
  const allBills     = month.bills.filter((b: any) => b.status !== 'quitado')
  const totalBills   = allBills.reduce((s: number, b: any) => s + b.amount, 0)
  const paidBills    = allBills.filter((b: any) => b.status === 'pago').reduce((s: number, b: any) => s + b.amount, 0)
  const pendingBills = totalBills - paidBills
  const overduePending = (month.overdueBills || [])
    .filter((b: any) => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s: number, b: any) => s + b.amount, 0)
  const paidPct = totalBills > 0 ? (paidBills / totalBills) * 100 : 0

  return (
    <div className="space-y-3">
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
    updateAllocationSpent, moveAllocation, setAllocationActive,
  } = useFinanceStore()
  const month = getCurrentMonth()
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveForm, setMoveForm] = useState({
    from: 'needs' as AllocationKey, to: 'wants' as AllocationKey, amount: '', reason: '',
  })

  if (!month) return null

  const totalIncome = calcTotalIncome(month)
  const freeBalance = Math.max(0, calcFreeBalance(month))
  const isActive    = !!month.allocationActive

  const alloc = month.allocation

  // Bills total (reference for Despesas pre-fill)
  const billsTotal = month.bills
    .filter(b => b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const overduePending = (month.overdueBills || [])
    .filter(b => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const totalCosts = billsTotal + overduePending

  // Budgets = % of totalIncome (all 3 sum to 100%)
  const needsBudget  = totalIncome * (alloc.needsPercent  / 100)
  const wantsBudget  = totalIncome * (alloc.wantsPercent  / 100)
  const investBudget = totalIncome * (alloc.investPercent / 100)

  const budgets: Record<AllocationKey, number> = {
    needs: needsBudget, wants: wantsBudget, invest: investBudget,
  }

  // ── Auto-spent: calculated from actual records ─────────────────────────────
  const rate = month.exchangeRate || 5.02
  const dailyExpenses = month.dailyExpenses ?? []

  // Helper: convert daily expense to BRL
  const expToBRL = (e: { amount: number; conta: string }) =>
    e.conta === 'usdt' ? e.amount * rate : e.amount

  // Despesas = ALL bills (paid + pending, excluding quitado) + daily custo
  // Pending bills are "committed" spend — money that will leave the account
  const paidBillsTotal = month.bills
    .filter(b => b.status === 'pago')
    .reduce((s, b) => s + b.amount, 0)
  const pendingBillsTotal = month.bills
    .filter(b => b.status === 'pendente')
    .reduce((s, b) => s + b.amount, 0)
  const allBillsTotal = paidBillsTotal + pendingBillsTotal
  const dailyCusto = dailyExpenses
    .filter(e => (e.tipo ?? 'custo') === 'custo')
    .reduce((s, e) => s + expToBRL(e), 0)
  const needsSpentAuto = allBillsTotal + dailyCusto

  // Lazer = daily lazer
  const wantsSpentAuto = dailyExpenses
    .filter(e => e.tipo === 'lazer')
    .reduce((s, e) => s + expToBRL(e), 0)

  // Investimentos = daily investimento
  const investSpentAuto = dailyExpenses
    .filter(e => e.tipo === 'investimento')
    .reduce((s, e) => s + expToBRL(e), 0)

  const autoSpent: Record<AllocationKey, number> = {
    needs: needsSpentAuto, wants: wantsSpentAuto, invest: investSpentAuto,
  }
  // Detail labels for spent breakdown
  const spentDetail: Record<AllocationKey, string> = {
    needs: [
      allBillsTotal > 0 ? `Contas: ${formatBRL(allBillsTotal)}${pendingBillsTotal > 0 ? ` (${formatBRL(paidBillsTotal)} pago)` : ''}` : '',
      dailyCusto > 0 ? `Diário: ${formatBRL(dailyCusto)}` : '',
    ].filter(Boolean).join(' · ') || 'Nenhum gasto registrado',
    wants:  wantsSpentAuto > 0 ? `${dailyExpenses.filter(e => e.tipo === 'lazer').length} gasto(s) de lazer` : 'Nenhum gasto de lazer',
    invest: investSpentAuto > 0 ? `${dailyExpenses.filter(e => e.tipo === 'investimento').length} gasto(s) de investimento` : 'Nenhum gasto de investimento',
  }

  // ── Bank account balances (shown inside each category card) ─────────────────
  const accountBalancesBRL = month.bankAccounts
    .filter(acc => (acc.type as string) !== 'dizimo')
    .map(acc => {
      const native = calcAccBalance(acc)
      const brl    = acc.type === 'usdt' ? native * rate : native
      return { id: acc.id, name: acc.name, color: acc.color, type: acc.type, native, brl }
    })
    .filter(acc => acc.brl !== 0)   // hide zero-balance accounts

  const sliderTotal = alloc.needsPercent + alloc.wantsPercent + alloc.investPercent
  const isValid = sliderTotal === 100

  // On activation: pre-fill Despesas with bills %, split remainder between Lazer and Invest
  const handleActivate = () => {
    if (totalIncome > 0) {
      const billsPct   = Math.min(100, Math.round((totalCosts / totalIncome) * 100))
      const remaining  = 100 - billsPct
      // Default: remaining goes 40% lazer / 60% invest (of the remaining portion)
      const lazerPct  = Math.round(remaining * 0.4)
      const investPct = remaining - lazerPct
      updateAllocationPercents(currentMonthId, billsPct, lazerPct, investPct)
    }
    setAllocationActive(currentMonthId, true)
  }

  const pieData = [
    { name: 'Despesas / Custos', value: needsBudget,  color: ALLOC_COLORS.needs,  key: 'needs' },
    { name: 'Lazer',             value: wantsBudget,  color: ALLOC_COLORS.wants,  key: 'wants' },
    { name: 'Investimentos',     value: investBudget, color: ALLOC_COLORS.invest, key: 'invest' },
  ]

  const handleMove = () => {
    const amt = parseFloat(moveForm.amount)
    if (!amt || !moveForm.reason) return
    moveAllocation(currentMonthId, moveForm.from, moveForm.to, amt, moveForm.reason)
    setMoveForm({ from: 'needs', to: 'wants', amount: '', reason: '' })
    setShowMoveDialog(false)
  }

  const pctOfTotal = (v: number) => totalIncome > 0 ? ((v / totalIncome) * 100).toFixed(0) : '0'

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── 1. Panorama da Renda ─────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-1">Renda Total do Mês</p>
              <p className="text-3xl font-mono font-bold text-[#e8ecf4]">{formatBRL(totalIncome)}</p>
              <p className="text-xs text-[#4a5568] mt-1">
                {totalIncome > 0
                  ? `Despesas: ${pctOfTotal(totalCosts)}% · Saldo livre: ${pctOfTotal(freeBalance)}%`
                  : 'Configure sua renda em Visão Geral'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#4a5568] mb-1">Saldo livre</p>
              <p className="text-xl font-mono font-bold text-[#00d4a0]">{formatBRL(freeBalance)}</p>
              <p className="text-[10px] text-[#4a5568] mt-0.5">após todas as contas</p>
            </div>
          </div>
          {totalIncome > 0 && isActive && (
            <IncomeBar
              totalIncome={totalIncome}
              needsBudget={needsBudget}
              wantsBudget={wantsBudget}
              investBudget={investBudget}
            />
          )}
        </CardContent>
      </Card>

      {/* ── 2. Status das Contas ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Receipt size={15} className="text-[#f06060]" /> Status das Contas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <BillsStatus month={month} />
        </CardContent>
      </Card>

      {/* ── 3. Gate ou UI completa ───────────────────────────────────── */}
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
                Ao ativar, Despesas/Custos será pré-preenchida com a % atual das suas contas.
                Você pode ajustar manualmente os 3 sliders.
              </p>
            </div>
            <Button onClick={handleActivate} disabled={freeBalance <= 0} className="mx-auto">
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
              const budget    = budgets[key]
              const spentVal  = autoSpent[key]
              const remaining = budget - spentVal
              const over      = spentVal > budget
              const usedPct   = budget > 0 ? Math.min(100, (spentVal / budget) * 100) : 0
              return (
                <Card key={key} className={`hover:border-[#243048] transition-colors ${over ? 'border-[#f06060]/40' : ''}`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-1">{ALLOC_LABELS[key]}</p>
                        <p className="text-xl font-mono font-bold" style={{ color: ALLOC_COLORS[key] }}>
                          {alloc[`${key}Percent` as 'needsPercent' | 'wantsPercent' | 'investPercent']}%
                        </p>
                        <p className="text-sm font-mono text-[#e8ecf4]">{formatBRL(budget)}</p>
                      </div>
                      {over && <AlertTriangle size={16} className="text-[#f06060] mt-1 shrink-0" />}
                    </div>

                    {/* Mini progress */}
                    <div className="space-y-1.5">
                      <div className="h-1.5 bg-[#1a2030] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${usedPct}%`, background: over ? '#f06060' : ALLOC_COLORS[key] }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#4a5568]">
                          {key === 'needs' ? 'Comprometido' : 'Gasto'}:{' '}
                          <span className="font-mono text-[#e8ecf4]">{formatBRL(spentVal)}</span>
                        </span>
                        <span className={over ? 'text-[#f06060] font-semibold' : 'text-[#00d4a0] font-semibold'}>
                          {over ? `−${formatBRL(Math.abs(remaining))} excedido` : `+${formatBRL(remaining)} livre`}
                        </span>
                      </div>
                      {/* Despesas breakdown: bills vs daily */}
                      {key === 'needs' && (allBillsTotal > 0 || dailyCusto > 0) && (
                        <p className="text-[10px] text-[#4a5568]">
                          {allBillsTotal > 0 && (
                            <>
                              Contas: <span className="font-mono text-[#e8ecf4]">{formatBRL(allBillsTotal)}</span>
                              {pendingBillsTotal > 0 && (
                                <span className="text-[#f5a020]"> ({formatBRL(pendingBillsTotal)} pendente)</span>
                              )}
                            </>
                          )}
                          {allBillsTotal > 0 && dailyCusto > 0 && <span className="mx-1">·</span>}
                          {dailyCusto > 0 && (
                            <>Diário: <span className="font-mono text-[#e8ecf4]">{formatBRL(dailyCusto)}</span></>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Account balances */}
                    {accountBalancesBRL.length > 0 && (
                      <div className="pt-2 border-t border-[#1a2030] space-y-1.5">
                        <div className="flex items-center gap-1 mb-1">
                          <Landmark size={10} className="text-[#4a5568]" />
                          <span className="text-[10px] text-[#4a5568] uppercase tracking-wider">Saldo nas contas</span>
                        </div>
                        {accountBalancesBRL.map(acc => (
                          <div key={acc.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: acc.color }} />
                              <span className="text-[10px] text-[#8898aa]">{acc.name}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-mono font-semibold ${acc.brl < 0 ? 'text-[#f06060]' : 'text-[#e8ecf4]'}`}>
                                {formatBRL(acc.brl)}
                              </span>
                              {acc.type === 'usdt' && (
                                <span className="text-[9px] text-[#4a5568] ml-1">({acc.native.toFixed(2)} USDT)</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sliders — all 3, manual */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>Distribuição (% da renda total)</CardTitle>
                  <div className="flex items-center gap-2">
                    {!isValid && <Badge variant="red">soma: {sliderTotal}%</Badge>}
                    {isValid  && <Badge variant="green">100%</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Despesas reference pill */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f06060]/08 border border-[#f06060]/20 text-xs">
                  <Receipt size={11} className="text-[#f06060] shrink-0" />
                  <span className="text-[#8898aa]">Suas contas totalizam</span>
                  <span className="font-mono font-semibold text-[#f06060]">{formatBRL(totalCosts)}</span>
                  <span className="text-[#4a5568]">({pctOfTotal(totalCosts)}% da renda)</span>
                </div>

                {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
                  const pctKey    = `${key}Percent` as 'needsPercent' | 'wantsPercent' | 'investPercent'
                  const currentPct = alloc[pctKey] as number
                  return (
                    <AllocSlider
                      key={key}
                      label={ALLOC_LABELS[key]}
                      color={ALLOC_COLORS[key]}
                      pct={currentPct}
                      budget={budgets[key]}
                      totalIncome={totalIncome}
                      onChange={(val) => {
                        const newNeeds  = key === 'needs'  ? val : alloc.needsPercent
                        const newWants  = key === 'wants'  ? val : alloc.wantsPercent
                        const newInvest = key === 'invest' ? val : alloc.investPercent
                        updateAllocationPercents(currentMonthId, newNeeds, newWants, newInvest)
                      }}
                    />
                  )
                })}
                {!isValid && (
                  <p className="text-xs text-[#f5a020] text-center">
                    Os percentuais somam {sliderTotal}% — ajuste até totalizar 100%.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card>
              <CardHeader><CardTitle>Distribuição da Renda</CardTitle></CardHeader>
              <CardContent className="pt-2">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2 flex-wrap">
                  {pieData.map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-[#8898aa]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Acompanhamento automático ───────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>Acompanhamento do Mês</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowMoveDialog(true)}>
                    <ArrowRight size={14} /> Mover Verba
                  </Button>
                  <button
                    onClick={() => setAllocationActive(currentMonthId, false)}
                    className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#f5a020] border border-[#1a2030] hover:border-[#f5a020]/30 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    <PauseCircle size={13} /> Desativar
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {(['needs', 'wants', 'invest'] as AllocationKey[]).map((key) => {
                const budget    = budgets[key]
                const spentVal  = autoSpent[key]
                const remaining = budget - spentVal
                const over      = spentVal > budget
                const usedPct   = budget > 0 ? Math.min(100, (spentVal / budget) * 100) : 0

                return (
                  <div key={key} className="space-y-2.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ALLOC_COLORS[key] }} />
                        <span className="text-sm font-semibold text-[#e8ecf4]">{ALLOC_LABELS[key]}</span>
                        {over && <Badge variant="red">Excedido</Badge>}
                      </div>
                      <span className="text-xs font-mono text-[#4a5568]">
                        {formatBRL(spentVal)} gastos / {formatBRL(budget)} orçado
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-3 bg-[#1a2030] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${usedPct}%`, background: over ? '#f06060' : ALLOC_COLORS[key] }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: breakdown */}
                      <p className="text-[11px] text-[#4a5568] leading-relaxed">{spentDetail[key]}</p>

                      {/* Right: remaining pill */}
                      <div className={`shrink-0 px-3 py-1.5 rounded-lg text-center min-w-[110px] ${
                        over
                          ? 'bg-[#f06060]/10 border border-[#f06060]/30'
                          : 'bg-[#00d4a0]/08 border border-[#00d4a0]/20'
                      }`}>
                        <p className="text-[10px] text-[#4a5568]">{over ? 'Excedeu em' : 'Ainda pode gastar'}</p>
                        <p className={`text-sm font-mono font-bold ${over ? 'text-[#f06060]' : 'text-[#00d4a0]'}`}>
                          {formatBRL(Math.abs(remaining))}
                        </p>
                        <p className="text-[10px] text-[#4a5568]">{usedPct.toFixed(0)}% usado</p>
                      </div>
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

      {/* Move dialog — between any of the 3 categories */}
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
            <Button className="flex-1" onClick={handleMove}
              disabled={!moveForm.amount || !moveForm.reason || moveForm.from === moveForm.to}>
              Mover
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
