'use client'
import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { DailyExpense, DailyExpenseCategory, DailyExpenseConta } from '@/types'
import {
  Plus, Trash2, Utensils, Car, Smile, Heart, Wrench,
  ShoppingBag, MoreHorizontal, Wallet, CreditCard, Bitcoin,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  lazer: '#00d4a0',
  saude: '#f06060',
  servico: '#8898aa',
  compras: '#a78bfa',
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

function formatCurrency(amount: number, isUsdt = false) {
  if (isUsdt) return `${amount.toFixed(2)} USDT`
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ─── Quick-add form ──────────────────────────────────────────────────────────

function AddExpenseForm({ monthId, onDone }: { monthId: string; onDone: () => void }) {
  const { addDailyExpense, exchangeRate } = useFinanceStore()

  const [date, setDate] = useState(todayStr())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<DailyExpenseCategory>('alimentacao')
  const [conta, setConta] = useState<DailyExpenseConta>('operacional')
  const [notes, setNotes] = useState('')

  const isUsdt = conta === 'usdt'
  const rate = exchangeRate.rate

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(num) || num <= 0) return

    addDailyExpense(monthId, {
      date,
      description: description.trim(),
      amount: num,
      category,
      conta,
      notes: notes.trim() || undefined,
    })
    setDescription('')
    setAmount('')
    setNotes('')
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#e8ecf4]">Novo gasto</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">
            Valor {isUsdt ? '(USDT)' : '(R$)'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder={isUsdt ? '0.00 USDT' : '0,00'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
          />
          {isUsdt && amount && !isNaN(parseFloat(amount)) && (
            <p className="text-[10px] text-[#26a17b] mt-0.5">
              ≈ {(parseFloat(amount) * rate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Descrição</label>
        <input
          type="text"
          placeholder="Ex.: Almoço no restaurante"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Category */}
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DailyExpenseCategory)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
          >
            {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Conta */}
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Conta</label>
          <select
            value={conta}
            onChange={(e) => setConta(e.target.value as DailyExpenseConta)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
          >
            {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map((c) => (
              <option key={c} value={c}>{CONTA_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes (optional) */}
      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Observações <span className="text-[#1a2030]">(opcional)</span></label>
        <input
          type="text"
          placeholder="Nota rápida"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 bg-[#00d4a0]/10 hover:bg-[#00d4a0]/20 border border-[#00d4a0]/30 text-[#00d4a0] text-sm font-semibold rounded-lg py-2 transition-all cursor-pointer"
        >
          Lançar gasto
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 border border-[#1a2030] text-[#4a5568] text-sm rounded-lg py-2 hover:text-[#e8ecf4] transition-all cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Expense row ─────────────────────────────────────────────────────────────

function ExpenseRow({ expense, monthId }: { expense: DailyExpense; monthId: string }) {
  const { deleteDailyExpense, exchangeRate } = useFinanceStore()
  const [confirming, setConfirming] = useState(false)

  const Icon = CATEGORY_ICONS[expense.category]
  const ContaIcon = CONTA_ICONS[expense.conta]
  const color = CATEGORY_COLORS[expense.category]
  const isUsdt = expense.conta === 'usdt'
  const rate = exchangeRate.rate

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#0d1117] last:border-0 group">
      {/* Category icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}
      >
        <Icon size={14} style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e8ecf4] truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#4a5568]">{formatDateBR(expense.date)}</span>
          <span className="text-[10px] text-[#1a2030]">·</span>
          <span className="text-[10px] text-[#4a5568] flex items-center gap-1">
            <ContaIcon size={10} />
            {CONTA_LABELS[expense.conta]}
          </span>
          {expense.notes && (
            <>
              <span className="text-[10px] text-[#1a2030]">·</span>
              <span className="text-[10px] text-[#4a5568] truncate max-w-[100px]">{expense.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${isUsdt ? 'text-[#26a17b]' : 'text-[#f06060]'}`}>
          {isUsdt ? `${expense.amount.toFixed(2)} USDT` : formatCurrency(expense.amount)}
        </p>
        {isUsdt && (
          <p className="text-[10px] text-[#4a5568]">
            ≈ {formatCurrency(expense.amount * rate)}
          </p>
        )}
      </div>

      {/* Delete */}
      <div className="shrink-0">
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => deleteDailyExpense(monthId, expense.id)}
              className="text-[10px] text-[#f06060] border border-[#f06060]/30 rounded px-2 py-0.5 hover:bg-[#f06060]/10 cursor-pointer"
            >
              Confirmar
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[10px] text-[#4a5568] cursor-pointer hover:text-[#e8ecf4]"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Summary cards ───────────────────────────────────────────────────────────

function SummaryCards({ expenses, rate }: { expenses: DailyExpense[]; rate: number }) {
  const total = useMemo(() => {
    return expenses.reduce((sum, e) => {
      const brl = e.conta === 'usdt' ? e.amount * rate : e.amount
      return sum + brl
    }, 0)
  }, [expenses, rate])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      const brl = e.conta === 'usdt' ? e.amount * rate : e.amount
      map[e.category] = (map[e.category] ?? 0) + brl
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [expenses, rate])

  if (expenses.length === 0) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {/* Total */}
      <div className="col-span-2 md:col-span-1 bg-[#0d1117] border border-[#1a2030] rounded-xl p-3">
        <p className="text-xs text-[#4a5568]">Total do mês</p>
        <p className="text-lg font-bold text-[#f06060] mt-0.5">
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p className="text-[10px] text-[#4a5568] mt-0.5">{expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Top categories */}
      {byCategory.slice(0, 3).map(([cat, val]) => {
        const color = CATEGORY_COLORS[cat as DailyExpenseCategory]
        const Icon = CATEGORY_ICONS[cat as DailyExpenseCategory]
        return (
          <div key={cat} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={12} style={{ color }} />
              <p className="text-xs text-[#4a5568]">{CATEGORY_LABELS[cat as DailyExpenseCategory]}</p>
            </div>
            <p className="text-sm font-semibold" style={{ color }}>
              {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function DailyExpensesWidget() {
  const { currentMonthId, months, exchangeRate } = useFinanceStore()
  const month = months[currentMonthId]
  const expenses = useMemo(() => month?.dailyExpenses ?? [], [month])

  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState<DailyExpenseCategory | 'todas'>('todas')
  const [filterConta, setFilterConta] = useState<DailyExpenseConta | 'todas'>('todas')
  const [showFilters, setShowFilters] = useState(false)
  const [sortDesc, setSortDesc] = useState(true)

  const filtered = useMemo(() => {
    let list = [...expenses]
    if (filterCat !== 'todas') list = list.filter((e) => e.category === filterCat)
    if (filterConta !== 'todas') list = list.filter((e) => e.conta === filterConta)
    list.sort((a, b) => sortDesc
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
    )
    return list
  }, [expenses, filterCat, filterConta, sortDesc])

  const rate = exchangeRate.rate

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-[#00d4a0]/10 hover:bg-[#00d4a0]/20 border border-[#00d4a0]/30 text-[#00d4a0] text-sm font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
        >
          <Plus size={15} />
          Novo gasto
        </button>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all cursor-pointer ${
            showFilters || filterCat !== 'todas' || filterConta !== 'todas'
              ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]'
              : 'border-[#1a2030] text-[#4a5568] hover:text-[#e8ecf4] hover:border-[#4a5568]'
          }`}
        >
          <Filter size={14} />
          Filtros
          {(filterCat !== 'todas' || filterConta !== 'todas') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
          )}
        </button>

        <button
          onClick={() => setSortDesc((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#e8ecf4] border border-[#1a2030] px-3 py-2 rounded-lg cursor-pointer transition-all"
        >
          {sortDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          {sortDesc ? 'Mais recente' : 'Mais antigo'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#4a5568] block mb-1">Categoria</label>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as DailyExpenseCategory | 'todas')}
              className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none"
            >
              <option value="todas">Todas</option>
              {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#4a5568] block mb-1">Conta</label>
            <select
              value={filterConta}
              onChange={(e) => setFilterConta(e.target.value as DailyExpenseConta | 'todas')}
              className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none"
            >
              <option value="todas">Todas</option>
              {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map((c) => (
                <option key={c} value={c}>{CONTA_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Quick-add form */}
      {showForm && (
        <AddExpenseForm monthId={currentMonthId} onDone={() => setShowForm(false)} />
      )}

      {/* Summary cards */}
      <SummaryCards expenses={filtered} rate={rate} />

      {/* Expense list */}
      <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl">
        {/* List header */}
        <div className="px-4 py-3 border-b border-[#1a2030] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#e8ecf4]">
            Lançamentos
            {(filterCat !== 'todas' || filterConta !== 'todas') && (
              <span className="ml-2 text-xs font-normal text-[#4a5568]">filtrado</span>
            )}
          </h3>
          <span className="text-xs text-[#4a5568]">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet size={32} className="text-[#1a2030] mx-auto mb-3" />
            <p className="text-sm text-[#4a5568]">
              {expenses.length === 0
                ? 'Nenhum gasto registrado ainda'
                : 'Nenhum gasto com esses filtros'}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs text-[#00d4a0] hover:underline cursor-pointer"
              >
                Lançar primeiro gasto
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 divide-y divide-[#0d1117]">
            {filtered.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} monthId={currentMonthId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
