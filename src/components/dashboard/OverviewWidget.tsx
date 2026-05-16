'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  formatBRL, formatUSDT, calcTotalIncome, calcTotalTithe,
  calcUSDTInBRL, calcFreeBalance, calcUSDTNet, getBillsFirstHalf, getBillsSecondHalf,
} from '@/lib/utils'
import { TrendingUp, Wallet, Church, Coins, Pencil, Check, X, RefreshCw, BarChart3, ArrowUpRight, Target } from 'lucide-react'
import { BankAccount, FinancialGoal } from '@/types'

function calcAccountBalance(acc: BankAccount): number {
  return (acc.initialBalance ?? 0) + acc.transactions.reduce((s, t) => t.type === 'entrada' ? s + t.amount : s - t.amount, 0)
}

const ACCOUNT_COLORS: Record<string, string> = {
  operacional: '#00d4a0',
  usdt: '#26a17b',
  investimento: '#6366f1',
  dizimo: '#f5a020',
}

const ACCOUNT_LABELS: Record<string, string> = {
  operacional: 'Operacional',
  usdt: 'USDT / APY',
  investimento: 'Investimento BR (CDB)',
  dizimo: 'Dízimo',
}

// ─── Inline-editable income card ─────────────────────────────────────────────
function EditableCard({
  label, value, sub, color, onSave,
}: {
  label: string; value: string; sub?: string; color: string;
  onSave?: (raw: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const handleEdit = () => { setDraft(''); setEditing(true) }
  const handleSave = () => { if (onSave && draft) onSave(draft); setEditing(false) }
  const handleCancel = () => setEditing(false)

  return (
    <Card className="hover:border-[#243048] transition-colors group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">{label}</p>
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  className="bg-[#0a0e16] border border-[#00d4a0] rounded-lg text-[#e8ecf4] text-lg font-mono font-bold px-2 py-1 w-full outline-none"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                  placeholder={value}
                />
                <button onClick={handleSave} className="p-1.5 rounded-lg bg-[#00d4a0]/20 text-[#00d4a0] hover:bg-[#00d4a0]/30 cursor-pointer shrink-0">
                  <Check size={14} />
                </button>
                <button onClick={handleCancel} className="p-1.5 rounded-lg text-[#4a5568] hover:bg-[#1a2030] cursor-pointer shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <p className="text-2xl font-mono font-bold" style={{ color }}>{value}</p>
            )}
            {sub && !editing && <p className="text-xs text-[#4a5568] mt-1 font-mono truncate">{sub}</p>}
          </div>
          {onSave && !editing && (
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0 mt-1"
              title="Editar"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Receivables editor ──────────────────────────────────────────────────────
function ReceivablesEditor() {
  const { currentMonthId, getCurrentMonth, exchangeRate, updateFixedIncome, updateUSDTSettings, updateMonthExchangeRate, setExchangeRate, registerUSDTIncome, unregisterUSDTIncome } = useFinanceStore()
  const month = getCurrentMonth()
  if (!month) return null

  const settings = month.usdtSettings
  const rate = month.exchangeRate || exchangeRate.rate
  const netUSDT = calcUSDTNet(month)
  const isMay2025 = month.id === '2025-05'

  const handleRateRefresh = async () => {
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
      const data = await res.json()
      const newRate = parseFloat(data.USDBRL.bid)
      setExchangeRate(newRate, false)
      updateMonthExchangeRate(currentMonthId, newRate)
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recebíveis do Mês</CardTitle>
          <span className="text-xs text-[#4a5568]">clique no ✏ para editar</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Fixed income */}
          <EditableCard
            label="Renda Fixa"
            value={formatBRL(month.fixedIncome)}
            sub="Recebido até dia 5"
            color="#00d4a0"
            onSave={(v) => updateFixedIncome(currentMonthId, parseFloat(v))}
          />

          {/* USDT — com toggle "Recebi este mês" */}
          <div className="relative">
            {isMay2025 && settings.grossAmount !== undefined ? (
              <EditableCard
                label="USDT Bruto"
                value={formatUSDT(settings.grossAmount)}
                sub={settings.received === false ? '⏳ Não recebido ainda' : `Desconto: ${formatUSDT(settings.discount || 0)}`}
                color={settings.received === false ? '#4a5568' : '#26a17b'}
                onSave={(v) => {
                  const g = parseFloat(v)
                  const d = settings.discount || 0
                  updateUSDTSettings(currentMonthId, { grossAmount: g, monthlyAmount: g - d })
                }}
              />
            ) : (
              <EditableCard
                label={`Comissão USDT ${settings.received === false ? '(pendente)' : ''}`}
                value={settings.received === false ? 'Não recebido' : formatUSDT(settings.monthlyAmount)}
                sub={settings.received === false ? 'Clique em "Recebi" quando cair' : `≈ ${formatBRL(calcUSDTInBRL(settings.monthlyAmount, rate))}`}
                color={settings.received === false ? '#4a5568' : '#26a17b'}
                onSave={(v) => updateUSDTSettings(currentMonthId, { monthlyAmount: parseFloat(v) })}
              />
            )}
            {/* Toggle recebido */}
            <button
              onClick={() => settings.received === false ? registerUSDTIncome(currentMonthId) : unregisterUSDTIncome(currentMonthId)}
              className={`absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                settings.received === false
                  ? 'bg-[#26a17b]/15 border-[#26a17b]/40 text-[#26a17b] hover:bg-[#26a17b]/25'
                  : 'bg-[#1a2030] border-[#1a2030] text-[#4a5568] hover:text-[#f06060] hover:border-[#f06060]/30'
              }`}
            >
              {settings.received === false ? '✓ Recebi!' : '⏸ Estornar'}
            </button>
          </div>

          {/* Discount (May only) */}
          {isMay2025 && (
            <EditableCard
              label="Desconto Viagem"
              value={`− ${formatUSDT(settings.discount || 0)}`}
              sub={settings.discountLabel}
              color="#f06060"
              onSave={(v) => {
                const d = parseFloat(v)
                const g = settings.grossAmount || 0
                updateUSDTSettings(currentMonthId, { discount: d, monthlyAmount: g - d })
              }}
            />
          )}

          {/* Exchange rate */}
          <div className="relative group">
            <EditableCard
              label="Câmbio USD/BRL"
              value={`R$ ${rate.toFixed(4)}`}
              sub={`Líquido: ${formatBRL(calcUSDTInBRL(netUSDT, rate))}`}
              color="#f5a020"
              onSave={(v) => {
                const r = parseFloat(v)
                setExchangeRate(r, true)
                updateMonthExchangeRate(currentMonthId, r)
              }}
            />
            <button
              onClick={handleRateRefresh}
              className="absolute top-3 right-10 p-1.5 rounded-lg text-[#4a5568] hover:text-[#f5a020] hover:bg-[#f5a020]/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Buscar câmbio ao vivo"
            >
              <RefreshCw size={12} />
            </button>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

// ─── Top goals mini component ─────────────────────────────────────────────────
function TopGoals({ goals }: { goals: FinancialGoal[] }) {
  const top = goals
    .filter(g => !g.completedAt)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2)

  if (top.length === 0) return null

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[#00d4a0]" />
          <p className="text-xs font-semibold text-[#8898aa] uppercase tracking-wider">Metas em Destaque</p>
        </div>
        <div className="space-y-3">
          {top.map(g => {
            const pct = Math.min((g.currentAmount / Math.max(g.targetAmount, 1)) * 100, 100)
            const remaining = Math.max(g.targetAmount - g.currentAmount, 0)
            return (
              <div key={g.id}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#e8ecf4] font-medium">{g.name}</span>
                  <span className="text-[#4a5568] font-mono">{formatBRL(g.currentAmount)} / {formatBRL(g.targetAmount)}</span>
                </div>
                <Progress value={pct} max={100} color="#00d4a0" size="sm" />
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-[#00d4a0]">{pct.toFixed(0)}%</span>
                  <span className="text-[#4a5568]">faltam {formatBRL(remaining)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main widget ─────────────────────────────────────────────────────────────
export function OverviewWidget() {
  const { getCurrentMonth, exchangeRate, userProfile } = useFinanceStore()
  const month = getCurrentMonth()
  if (!month) return null

  const rate = month.exchangeRate || exchangeRate.rate
  const totalIncome = calcTotalIncome(month)
  const tithe = calcTotalTithe(month)
  const usdtNet = calcUSDTNet(month)
  const usdtConverted = calcUSDTInBRL(usdtNet * (month.usdtSettings.convertPercent / 100), rate)

  const activeBills = month.bills.filter((b) => b.status !== 'quitado')
  const totalBills = activeBills.reduce((s, b) => s + b.amount, 0)
  const paidBills = activeBills.filter((b) => b.status === 'pago').reduce((s, b) => s + b.amount, 0)
  const pendingBills = activeBills.filter((b) => b.status === 'pendente')

  const overduePending = (month.overdueBills || []).filter(b => b.status !== 'pago' && b.status !== 'quitado')
  const overdueTotal = overduePending.reduce((s, b) => s + b.amount, 0)

  const freeBalance = calcFreeBalance(month)
  const alloc = month.allocation
  const needsBudget = freeBalance * (alloc.needsPercent / 100)
  const wantsBudget = freeBalance * (alloc.wantsPercent / 100)
  const investBudget = freeBalance * (alloc.investPercent / 100)

  const firstHalf = getBillsFirstHalf(activeBills)
  const secondHalf = getBillsSecondHalf(activeBills)

  // ── Bank account balances ──
  const bankAccounts = month.bankAccounts || []
  const totalPatrimonio = bankAccounts.reduce((s, acc) => s + calcAccountBalance(acc), 0)
  const investimentoAcc = bankAccounts.find(a => a.type === 'investimento')
  const cdbBalance = investimentoAcc ? calcAccountBalance(investimentoAcc) : 0

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  const activeGoals = userProfile?.goals?.filter(g => !g.completedAt) ?? []

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ─── Personalized greeting ──────────────────────────────────────── */}
      {userProfile && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#e8ecf4]">
              {greeting}, {userProfile.name}! 👋
            </h3>
            <p className="text-xs text-[#4a5568] mt-0.5">
              Aqui está seu resumo financeiro de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* ─── Receivables editor ─────────────────────────────────────────── */}
      <ReceivablesEditor />

      {/* ─── Summary cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-[#243048] transition-colors">
          <CardContent className="p-5">
            <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">Renda Total</p>
            <p className="text-2xl font-mono font-bold text-[#00d4a0]">{formatBRL(totalIncome)}</p>
            <p className="text-xs text-[#4a5568] mt-1 font-mono">
              Fixo {formatBRL(month.fixedIncome)} + USDT {formatBRL(usdtConverted)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-[#243048] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">Dízimo (10%)</p>
                <p className="text-2xl font-mono font-bold text-[#f5a020]">{formatBRL(tithe)}</p>
                <p className="text-xs text-[#4a5568] mt-1">sai primeiro</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f5a020]/10">
                <Church size={18} className="text-[#f5a020]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[#243048] transition-colors">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">Total Contas</p>
                <p className="text-2xl font-mono font-bold text-[#f06060]">
                  {formatBRL(totalBills + overdueTotal)}
                </p>
                <p className="text-xs text-[#4a5568] mt-1 font-mono">
                  {paidBills > 0 ? `${formatBRL(paidBills)} pagos` : `${pendingBills.length} pendentes`}
                  {overdueTotal > 0 && ` · R$${overdueTotal.toFixed(0)} atrasados`}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f06060]/10">
                <Wallet size={18} className="text-[#f06060]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`hover:border-[#243048] transition-colors ${freeBalance < 5000 ? 'border-[#f06060]/30' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#8898aa] uppercase tracking-wider mb-2">Saldo Livre</p>
                <p className="text-2xl font-mono font-bold" style={{ color: freeBalance < 5000 ? '#f06060' : '#00d4a0' }}>
                  {formatBRL(freeBalance)}
                </p>
                <p className="text-xs text-[#4a5568] mt-1">
                  {freeBalance < 5000 ? '⚠ abaixo de R$5k' : 'p/ alocar'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: (freeBalance < 5000 ? '#f06060' : '#00d4a0') + '18' }}>
                <Coins size={18} style={{ color: freeBalance < 5000 ? '#f06060' : '#00d4a0' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Posição financeira real ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[#00d4a0]" />
              <CardTitle>Posição Financeira Real</CardTitle>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#4a5568]">Patrimônio total</p>
              <p className="text-lg font-mono font-bold text-[#e8ecf4]">{formatBRL(totalPatrimonio)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-2">
            {bankAccounts.map((acc) => {
              const bal = calcAccountBalance(acc)
              const pct = totalPatrimonio > 0 ? (bal / totalPatrimonio) * 100 : 0
              const color = ACCOUNT_COLORS[acc.type] || '#8898aa'
              return (
                <div key={acc.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-[#8898aa] w-44 shrink-0">{ACCOUNT_LABELS[acc.type] || acc.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#1a2030] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: color, opacity: 0.7 }} />
                  </div>
                  <span className="text-sm font-mono font-semibold text-[#e8ecf4] w-28 text-right" style={{ color }}>{formatBRL(bal)}</span>
                  <span className="text-xs text-[#4a5568] w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
              )
            })}
          </div>

          {/* CDB highlight when balance > 0 */}
          {cdbBalance > 0 && (
            <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#6366f1]/08 border border-[#6366f1]/25">
              <ArrowUpRight size={16} className="text-[#6366f1] shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-[#4a5568]">CDB investido (renda fixa)</p>
                <p className="text-lg font-mono font-bold text-[#6366f1]">{formatBRL(cdbBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#4a5568]">Saldo livre (USDT)</p>
                <p className="text-lg font-mono font-bold text-[#00d4a0]">{formatBRL(freeBalance)}</p>
              </div>
            </div>
          )}

          {totalPatrimonio === 0 && (
            <p className="text-xs text-[#4a5568] text-center py-3">
              Registre o salário em <span className="text-[#f5a020]">Contas Bancárias</span> para ver a posição real
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── Payment progress ────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Progresso de Pagamentos</CardTitle></CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-[#e8ecf4]">
              {activeBills.filter(b => b.status === 'pago').length}/{activeBills.length} contas pagas
            </span>
            <span className="text-sm font-mono text-[#00d4a0]">
              {formatBRL(paidBills)} / {formatBRL(totalBills)}
            </span>
          </div>
          <Progress value={paidBills} max={Math.max(totalBills, 1)} color="#00d4a0" size="lg" />

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#8898aa]">1ª quinzena (dias 1–14)</span>
                <span className="text-xs font-mono text-[#3b82f6]">
                  {formatBRL(firstHalf.reduce((s, b) => s + b.amount, 0))}
                </span>
              </div>
              <Progress
                value={firstHalf.filter(b => b.status === 'pago').reduce((s, b) => s + b.amount, 0)}
                max={Math.max(firstHalf.reduce((s, b) => s + b.amount, 0), 1)}
                color="#3b82f6" size="sm"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-[#8898aa]">2ª quinzena (dias 15–31)</span>
                <span className="text-xs font-mono text-[#26a17b]">
                  {formatBRL(secondHalf.reduce((s, b) => s + b.amount, 0))}
                </span>
              </div>
              <Progress
                value={secondHalf.filter(b => b.status === 'pago').reduce((s, b) => s + b.amount, 0)}
                max={Math.max(secondHalf.reduce((s, b) => s + b.amount, 0), 1)}
                color="#26a17b" size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Allocation 50-30-20 ─────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Alocação 50-30-20 — Saldo Livre {formatBRL(freeBalance)}</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { label: 'Necessidades', pct: alloc.needsPercent, budget: needsBudget, spent: alloc.needsSpent, color: '#3b82f6' },
              { label: 'Desejos', pct: alloc.wantsPercent, budget: wantsBudget, spent: alloc.wantsSpent, color: '#8b5cf6' },
              { label: 'Investimentos', pct: alloc.investPercent, budget: investBudget, spent: alloc.investSpent, color: '#00d4a0' },
            ].map((item) => {
              const over = item.spent > item.budget
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#8898aa]">{item.label}</span>
                    <span className="text-xs font-mono" style={{ color: item.color }}>{item.pct}%</span>
                  </div>
                  <Progress value={item.spent} max={Math.max(item.budget, 1)} color={over ? '#f06060' : item.color} size="md" />
                  <div className="flex justify-between">
                    <span className="text-xs font-mono text-[#e8ecf4]">{formatBRL(item.spent)}</span>
                    <span className="text-xs text-[#4a5568]">/ {formatBRL(item.budget)}</span>
                  </div>
                  {over && <p className="text-xs text-[#f06060]">⚠ +{formatBRL(item.spent - item.budget)}</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Top goals ───────────────────────────────────────────────────── */}
      {activeGoals.length > 0 && <TopGoals goals={activeGoals} />}

      {/* ─── Quick pending bills ─────────────────────────────────────────── */}
      {pendingBills.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Próximas a Vencer</CardTitle></CardHeader>
          <CardContent className="pt-4 space-y-2">
            {pendingBills
              .sort((a, b) => a.dueDay - b.dueDay)
              .slice(0, 6)
              .map((bill) => (
                <div key={bill.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#1a2030] hover:border-[#243048] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#4a5568] w-10">dia {bill.dueDay}</span>
                    <span className="text-sm text-[#e8ecf4]">{bill.name}</span>
                    {bill.installments && bill.installments > 0 && (
                      <span className="text-xs bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/30 px-1.5 py-0.5 rounded-full">
                        {bill.installmentCurrent}/{bill.installments}x
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-mono text-[#f5a020]">{formatBRL(bill.amount)}</span>
                </div>
              ))}
            {pendingBills.length > 6 && (
              <p className="text-xs text-[#4a5568] text-center pt-2">
                + {pendingBills.length - 6} outras contas pendentes
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
