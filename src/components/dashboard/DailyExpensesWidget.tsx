'use client'
import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { DailyExpense, DailyExpenseCategory, DailyExpenseConta, DailyExpenseTipo } from '@/types'
import { ImportWidget } from '@/components/dashboard/ImportWidget'
import {
  Plus, Trash2, Utensils, Car, Smile, Heart, Wrench,
  ShoppingBag, MoreHorizontal, Wallet, CreditCard, Bitcoin,
  ChevronDown, ChevronUp, Upload, Search, X, TrendingDown,
  TrendingUp, BarChart3, Filter,
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DailyExpenseCategory, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  lazer: 'Lazer',
  saude: 'Saúde',
  servico: 'Serviço',
  compras: 'Compras',
  outro: 'Outro',
}

const CATEGORY_ICONS: Record<DailyExpenseCategory, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  alimentacao: Utensils,
  transporte: Car,
  lazer: Smile,
  saude: Heart,
  servico: Wrench,
  compras: ShoppingBag,
  outro: MoreHorizontal,
}

const CATEGORY_COLORS: Record<DailyExpenseCategory, string> = {
  alimentacao: '#f5a020',
  transporte: '#6366f1',
  lazer: '#a78bfa',
  saude: '#f06060',
  servico: '#8898aa',
  compras: '#00d4a0',
  outro: '#4a5568',
}

const CONTA_LABELS: Record<DailyExpenseConta, string> = {
  operacional: 'Operacional',
  usdt: 'USDT / APY',
  cartao_credito: 'Cartão de Crédito',
}

const CONTA_ICONS: Record<DailyExpenseConta, React.FC<{ size?: number; className?: string }>> = {
  operacional: Wallet,
  usdt: Bitcoin,
  cartao_credito: CreditCard,
}

const TIPO_CONFIG: Record<DailyExpenseTipo, { label: string; color: string; icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> }> = {
  custo:       { label: 'Despesas',      color: '#f06060', icon: TrendingDown },
  lazer:       { label: 'Lazer',         color: '#a78bfa', icon: Smile },
  investimento:{ label: 'Investimentos', color: '#00d4a0', icon: TrendingUp },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toBRL(expense: DailyExpense, rate: number): number {
  return expense.conta === 'usdt' ? expense.amount * rate : expense.amount
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ─── Tipo breakdown cards ────────────────────────────────────────────────────

function TipoCards({ expenses, rate, income, usdtIncomeBRL }: { expenses: DailyExpense[]; rate: number; income: number; usdtIncomeBRL: number }) {
  const tipoTotals = useMemo(() => {
    const map: Record<DailyExpenseTipo, number> = { custo: 0, lazer: 0, investimento: 0 }
    for (const e of expenses) {
      const tipo: DailyExpenseTipo = e.tipo ?? 'custo'
      map[tipo] += toBRL(e, rate)
    }
    return map
  }, [expenses, rate])

  const totalGasto = tipoTotals.custo + tipoTotals.lazer + tipoTotals.investimento
  const pct = (val: number) => income > 0 ? Math.round((val / income) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total gasto */}
      <div className="col-span-2 md:col-span-1 bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={14} className="text-[#4a5568]" />
          <span className="text-xs text-[#4a5568]">Total do mês</span>
        </div>
        <p className="text-xl font-bold text-[#e8ecf4]">{fmtBRL(totalGasto)}</p>
        {income > 0 && (
          <p className="text-xs text-[#4a5568] mt-1">
            {pct(totalGasto)}% da renda · Sobra {fmtBRL(Math.max(0, income - totalGasto))}
          </p>
        )}
        <p className="text-[10px] text-[#4a5568] mt-1">
          Renda: {fmtBRL(income)}{usdtIncomeBRL > 0 ? ` + ${fmtBRL(usdtIncomeBRL)} USDT` : ''}
        </p>
        <p className="text-[10px] text-[#1a2030] mt-1">{expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* By tipo */}
      {(['custo', 'lazer', 'investimento'] as DailyExpenseTipo[]).map((tipo) => {
        const { label, color, icon: Icon } = TIPO_CONFIG[tipo]
        const val = tipoTotals[tipo]
        const p = pct(val)
        return (
          <div key={tipo} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} />
              <span className="text-xs font-medium" style={{ color }}>{label}</span>
            </div>
            <p className="text-lg font-bold text-[#e8ecf4]">{fmtBRL(val)}</p>
            {income > 0 ? (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#4a5568]">{p}% da renda</span>
                </div>
                <div className="h-1 bg-[#1a2030] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, background: color }} />
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-[#4a5568] mt-1">—</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Category breakdown ──────────────────────────────────────────────────────

function CategoryBreakdown({ expenses, rate }: { expenses: DailyExpense[]; rate: number }) {
  const byCategory = useMemo(() => {
    const map: Partial<Record<DailyExpenseCategory, number>> = {}
    for (const e of expenses) {
      map[e.category] = (map[e.category] ?? 0) + toBRL(e, rate)
    }
    return Object.entries(map)
      .sort((a, b) => (b[1] as number) - (a[1] as number)) as [DailyExpenseCategory, number][]
  }, [expenses, rate])

  const total = byCategory.reduce((s, [, v]) => s + v, 0)

  if (byCategory.length === 0) return null

  return (
    <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4">
      <h3 className="text-xs font-semibold text-[#4a5568] uppercase tracking-wider mb-3">Por categoria</h3>
      <div className="space-y-2">
        {byCategory.map(([cat, val]) => {
          const color = CATEGORY_COLORS[cat]
          const Icon = CATEGORY_ICONS[cat]
          const pct = total > 0 ? Math.round((val / total) * 100) : 0
          return (
            <div key={cat} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon size={12} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-[#8898aa]">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-xs font-mono text-[#e8ecf4]">{fmtBRL(val)}</span>
                </div>
                <div className="h-1 bg-[#1a2030] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              <span className="text-[10px] text-[#4a5568] w-8 text-right shrink-0">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quick-add form ──────────────────────────────────────────────────────────

function AddExpenseForm({ monthId, onDone }: { monthId: string; onDone: () => void }) {
  const { addDailyExpense, exchangeRate } = useFinanceStore()
  const rate = exchangeRate.rate

  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate]               = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount]           = useState('')
  const [category, setCategory]       = useState<DailyExpenseCategory>('alimentacao')
  const [conta, setConta]             = useState<DailyExpenseConta>('operacional')
  const [tipo, setTipo]               = useState<DailyExpenseTipo>('custo')
  const [notes, setNotes]             = useState('')

  const isUsdt = conta === 'usdt'
  const parsedAmount = parseFloat(amount.replace(',', '.'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return
    addDailyExpense(monthId, { date, description: description.trim(), amount: parsedAmount, category, conta, tipo, notes: notes.trim() || undefined })
    setDescription(''); setAmount(''); setNotes('')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#e8ecf4]">Novo gasto</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
        </div>
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Valor {isUsdt ? '(USDT)' : '(R$)'}</label>
          <input type="number" step="0.01" min="0" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
          {isUsdt && !isNaN(parsedAmount) && parsedAmount > 0 && (
            <p className="text-[10px] text-[#26a17b] mt-0.5">≈ {fmtBRL(parsedAmount * rate)}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Descrição</label>
        <input type="text" placeholder="Ex.: Almoço no restaurante" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as DailyExpenseTipo)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50">
            <option value="custo">Despesa</option>
            <option value="lazer">Lazer</option>
            <option value="investimento">Investimento</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value as DailyExpenseCategory)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50">
            {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Conta</label>
          <select value={conta} onChange={e => setConta(e.target.value as DailyExpenseConta)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50">
            {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map(c => (
              <option key={c} value={c}>{CONTA_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Observação <span className="text-[#1a2030]">(opcional)</span></label>
        <input type="text" placeholder="Nota rápida" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className="flex-1 bg-[#00d4a0]/10 hover:bg-[#00d4a0]/20 border border-[#00d4a0]/30 text-[#00d4a0] text-sm font-semibold rounded-lg py-2 transition-all cursor-pointer">
          Lançar gasto
        </button>
        <button type="button" onClick={onDone}
          className="px-4 border border-[#1a2030] text-[#4a5568] text-sm rounded-lg py-2 hover:text-[#e8ecf4] transition-all cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Expense row ─────────────────────────────────────────────────────────────

function ExpenseRow({ expense, monthId, rate }: { expense: DailyExpense; monthId: string; rate: number }) {
  const { deleteDailyExpense } = useFinanceStore()
  const [confirming, setConfirming] = useState(false)

  const Icon      = CATEGORY_ICONS[expense.category]
  const ContaIcon = CONTA_ICONS[expense.conta]
  const color     = CATEGORY_COLORS[expense.category]
  const isUsdt    = expense.conta === 'usdt'
  const tipo      = expense.tipo ?? 'custo'
  const tipoColor = TIPO_CONFIG[tipo].color

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#0a0c11] last:border-0 group">
      {/* Category icon */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
        <Icon size={14} style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e8ecf4] truncate">{expense.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] text-[#4a5568] font-mono">{fmtDate(expense.date)}</span>
          <span className="text-[10px] text-[#1a2030]">·</span>
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: tipoColor }}>
            {TIPO_CONFIG[tipo].label}
          </span>
          <span className="text-[10px] text-[#1a2030]">·</span>
          <span className="text-[10px] text-[#4a5568] flex items-center gap-0.5">
            <ContaIcon size={10} />{CONTA_LABELS[expense.conta]}
          </span>
          {expense.notes && (
            <>
              <span className="text-[10px] text-[#1a2030]">·</span>
              <span className="text-[10px] text-[#4a5568] truncate max-w-[120px]">{expense.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        {isUsdt ? (
          <>
            <p className="text-sm font-semibold text-[#26a17b]">{expense.amount.toFixed(2)} USDT</p>
            <p className="text-[10px] text-[#4a5568]">≈ {fmtBRL(expense.amount * rate)}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-[#f06060]">{fmtBRL(expense.amount)}</p>
        )}
      </div>

      {/* Delete */}
      <div className="shrink-0 w-16 flex justify-end">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={() => deleteDailyExpense(monthId, expense.id)}
              className="text-[10px] text-[#f06060] border border-[#f06060]/30 rounded px-1.5 py-0.5 hover:bg-[#f06060]/10 cursor-pointer">
              Sim
            </button>
            <button onClick={() => setConfirming(false)} className="text-[10px] text-[#4a5568] cursor-pointer hover:text-[#e8ecf4]">✕</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 transition-all cursor-pointer">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function DailyExpensesWidget() {
  const { currentMonthId, months, exchangeRate } = useFinanceStore()
  const month    = months[currentMonthId]
  const expenses = useMemo(() => month?.dailyExpenses ?? [], [month])
  const rate     = exchangeRate.rate
  const income   = month?.fixedIncome ?? 0

  // Total income = salary + USDT converted (if received)
  const usdtReceived = month?.usdtSettings?.received !== false
  const usdtIncomeBRL = usdtReceived
    ? Math.round((month?.usdtSettings?.monthlyAmount ?? 0) * rate * 100) / 100
    : 0
  const totalIncome = income + usdtIncomeBRL

  const [showForm,   setShowForm]   = useState(false)
  const [showImport, setShowImport] = useState(false)

  // ── Filters ─────────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('')
  const [filterTipo,  setFilterTipo]  = useState<DailyExpenseTipo | 'todas'>('todas')
  const [filterCat,   setFilterCat]   = useState<DailyExpenseCategory | 'todas'>('todas')
  const [filterConta, setFilterConta] = useState<DailyExpenseConta | 'todas'>('todas')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [sortDesc,    setSortDesc]    = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilter = search || filterTipo !== 'todas' || filterCat !== 'todas' || filterConta !== 'todas' || dateFrom || dateTo

  const clearFilters = () => {
    setSearch(''); setFilterTipo('todas'); setFilterCat('todas')
    setFilterConta('todas'); setDateFrom(''); setDateTo('')
  }

  const filtered = useMemo(() => {
    let list = [...expenses]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.description.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q))
    }
    if (filterTipo  !== 'todas') list = list.filter(e => (e.tipo ?? 'custo') === filterTipo)
    if (filterCat   !== 'todas') list = list.filter(e => e.category === filterCat)
    if (filterConta !== 'todas') list = list.filter(e => e.conta === filterConta)
    if (dateFrom) list = list.filter(e => e.date >= dateFrom)
    if (dateTo)   list = list.filter(e => e.date <= dateTo)
    list.sort((a, b) => sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
    return list
  }, [expenses, search, filterTipo, filterCat, filterConta, dateFrom, dateTo, sortDesc])

  return (
    <div className="space-y-4">

      {/* ── Header actions ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setShowForm(v => !v); setShowImport(false) }}
          className="flex items-center gap-2 bg-[#00d4a0]/10 hover:bg-[#00d4a0]/20 border border-[#00d4a0]/30 text-[#00d4a0] text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer">
          <Plus size={15} /> Novo gasto
        </button>

        <button onClick={() => { setShowImport(v => !v); setShowForm(false) }}
          className="flex items-center gap-2 border border-[#1a2030] text-[#8898aa] hover:text-[#00d4a0] hover:border-[#00d4a0]/40 text-sm px-3 py-2 rounded-lg transition-all cursor-pointer">
          <Upload size={14} /> Importar planilha
        </button>

        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all cursor-pointer ${
            showFilters || hasActiveFilter
              ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]'
              : 'border-[#1a2030] text-[#4a5568] hover:text-[#e8ecf4]'
          }`}>
          <Filter size={14} />
          Filtros
          {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />}
        </button>

        <button onClick={() => setSortDesc(v => !v)}
          className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#e8ecf4] border border-[#1a2030] px-3 py-2 rounded-lg cursor-pointer transition-all">
          {sortDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {sortDesc ? 'Mais recente' : 'Mais antigo'}
        </button>

        {hasActiveFilter && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-[#f5a020] hover:text-[#f5a020]/80 transition-all cursor-pointer">
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>

      {/* ── Filters panel ─────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" />
            <input
              type="text"
              placeholder="Buscar por descrição ou nota..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50 placeholder-[#4a5568]"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Date from */}
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">De</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
            </div>
            {/* Date to */}
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Até</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
            </div>
            {/* Tipo */}
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Tipo</label>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value as DailyExpenseTipo | 'todas')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none">
                <option value="todas">Todos</option>
                <option value="custo">Despesas</option>
                <option value="lazer">Lazer</option>
                <option value="investimento">Investimentos</option>
              </select>
            </div>
            {/* Category */}
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Categoria</label>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value as DailyExpenseCategory | 'todas')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none">
                <option value="todas">Todas</option>
                {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            {/* Conta */}
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Conta</label>
              <select value={filterConta} onChange={e => setFilterConta(e.target.value as DailyExpenseConta | 'todas')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none">
                <option value="todas">Todas</option>
                {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map(c => (
                  <option key={c} value={c}>{CONTA_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick-add form ──────────────────────────────────────────── */}
      {showForm && <AddExpenseForm monthId={currentMonthId} onDone={() => setShowForm(false)} />}

      {/* ── Import modal ──────────────────────────────────────────── */}
      {showImport && <ImportWidget onClose={() => setShowImport(false)} />}

      {/* ── Tipo breakdown cards (based on ALL expenses, not filtered) ── */}
      {expenses.length > 0 && <TipoCards expenses={expenses} rate={rate} income={totalIncome} usdtIncomeBRL={usdtIncomeBRL} />}

      {/* ── Main content: list + category breakdown ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Expense list (2/3 width on desktop) */}
        <div className="md:col-span-2 bg-[#0d1117] border border-[#1a2030] rounded-xl">
          <div className="px-4 py-3 border-b border-[#1a2030] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e8ecf4]">
              Lançamentos
              {hasActiveFilter && <span className="ml-2 text-xs font-normal text-[#6366f1]">filtrado</span>}
            </h3>
            <span className="text-xs text-[#4a5568]">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet size={32} className="text-[#1a2030] mx-auto mb-3" />
              <p className="text-sm text-[#4a5568]">
                {expenses.length === 0 ? 'Nenhum gasto registrado' : 'Nenhum gasto com esses filtros'}
              </p>
              {expenses.length === 0 && (
                <button onClick={() => setShowForm(true)}
                  className="mt-3 text-xs text-[#00d4a0] hover:underline cursor-pointer">
                  Lançar primeiro gasto
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 divide-y divide-[#0a0c11]">
              {filtered.map(e => <ExpenseRow key={e.id} expense={e} monthId={currentMonthId} rate={rate} />)}
            </div>
          )}
        </div>

        {/* Category breakdown (1/3 width on desktop) */}
        <div>
          <CategoryBreakdown expenses={filtered.length > 0 ? filtered : expenses} rate={rate} />
        </div>
      </div>
    </div>
  )
}
