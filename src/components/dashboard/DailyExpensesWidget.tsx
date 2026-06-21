'use client'
import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Bill, DailyExpense, DailyExpenseCategory, DailyExpenseConta, DailyExpenseTipo } from '@/types'
import { generateId } from '@/lib/utils'
import { ImportWidget } from '@/components/dashboard/ImportWidget'
import {
  Plus, Trash2, Utensils, Car, Smile, Heart, Wrench,
  ShoppingBag, MoreHorizontal, Wallet, CreditCard, Bitcoin,
  ChevronDown, ChevronUp, Upload, Search, X, TrendingDown,
  TrendingUp, BarChart3, Filter, CheckSquare, Square, CheckCheck,
  Pencil, Check, Layers,
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

function TipoCards({
  expenses, bills, rate, income, usdtIncomeBRL, salary,
}: {
  expenses: DailyExpense[]
  bills: Bill[]
  rate: number
  income: number
  usdtIncomeBRL: number
  salary: number
}) {
  const dailyTotals = useMemo(() => {
    const map: Record<DailyExpenseTipo, number> = { custo: 0, lazer: 0, investimento: 0 }
    for (const e of expenses) {
      map[e.tipo ?? 'custo'] += toBRL(e, rate)
    }
    return map
  }, [expenses, rate])

  const billsTotal = useMemo(
    () => bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0),
    [bills]
  )

  const despesasTotal = billsTotal + dailyTotals.custo
  const tipoTotals: Record<DailyExpenseTipo, number> = {
    custo:        despesasTotal,
    lazer:        dailyTotals.lazer,
    investimento: dailyTotals.investimento,
  }

  const totalGasto = despesasTotal + dailyTotals.lazer + dailyTotals.investimento
  const pct = (val: number) => income > 0 ? Math.round((val / income) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          Salário {fmtBRL(salary)}{usdtIncomeBRL > 0 ? ` + USDT ${fmtBRL(usdtIncomeBRL)}` : usdtIncomeBRL === 0 ? ' · USDT pendente' : ''}
        </p>
        <p className="text-[10px] text-[#1a2030] mt-1">
          {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} + {bills.filter(b => b.status !== 'quitado').length} conta{bills.filter(b => b.status !== 'quitado').length !== 1 ? 's' : ''}
        </p>
      </div>

      {(['custo', 'lazer', 'investimento'] as DailyExpenseTipo[]).map((tipo) => {
        const { label, color, icon: Icon } = TIPO_CONFIG[tipo]
        const val = tipoTotals[tipo]
        const p = pct(val)
        const isCusto = tipo === 'custo'

        return (
          <div key={tipo} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} />
              <span className="text-xs font-medium" style={{ color }}>{label}</span>
            </div>
            <p className="text-lg font-bold text-[#e8ecf4]">{fmtBRL(val)}</p>
            {isCusto && (
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] text-[#4a5568]">Contas: {fmtBRL(billsTotal)}</span>
                <span className="text-[10px] text-[#1a2030]">·</span>
                <span className="text-[10px] text-[#4a5568]">Diários: {fmtBRL(dailyTotals.custo)}</span>
              </div>
            )}
            {income > 0 ? (
              <div className="mt-2">
                <span className="text-[10px] text-[#4a5568]">{p}% da renda</span>
                <div className="h-1 bg-[#1a2030] rounded-full overflow-hidden mt-1">
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
  const [isParcelado, setIsParcelado] = useState(false)
  const [numParcelas, setNumParcelas] = useState('2')

  const isUsdt    = conta === 'usdt'
  const isCC      = conta === 'cartao_credito'
  const parsedAmount  = parseFloat(amount.replace(',', '.'))
  const parsedParcelas = parseInt(numParcelas, 10)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

    const installments = isParcelado && isCC && parsedParcelas >= 2 ? parsedParcelas : undefined
    addDailyExpense(monthId, {
      date, description: description.trim(), amount: parsedAmount,
      category, conta, tipo, notes: notes.trim() || undefined,
      installments,
      installmentCurrent: installments ? 1 : undefined,
      installmentGroupId: installments ? generateId() : undefined,
    })
    setDescription(''); setAmount(''); setNotes(''); setIsParcelado(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#e8ecf4]">Novo gasto</h3>

      {/* Row 1: Data + Conta — choose account first so currency is known */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#4a5568] block mb-1">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
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

      {/* Row 2: Valor — prefix reflects selected account currency */}
      <div>
        <label className="text-xs text-[#4a5568] block mb-1">
          Valor{' '}
          <span className={`font-semibold ${isUsdt ? 'text-[#26a17b]' : 'text-[#8898aa]'}`}>
            {isUsdt ? '$ (USD — lançar em dólar)' : 'R$'}
          </span>
        </label>
        <div className="relative">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono select-none ${isUsdt ? 'text-[#26a17b]' : 'text-[#4a5568]'}`}>
            {isUsdt ? '$' : 'R$'}
          </span>
          <input
            type="number" step="0.01" min="0" placeholder="0,00"
            value={amount} onChange={e => setAmount(e.target.value)}
            className={`w-full bg-[#07090d] border rounded-lg pl-8 pr-3 py-2 text-sm text-[#e8ecf4] focus:outline-none ${
              isUsdt ? 'border-[#26a17b]/40 focus:border-[#26a17b]/70' : 'border-[#1a2030] focus:border-[#00d4a0]/50'
            }`}
          />
        </div>
        {isUsdt && !isNaN(parsedAmount) && parsedAmount > 0 && (
          <p className="text-[11px] text-[#26a17b] mt-1 flex items-center gap-1">
            <span>≈</span>
            <span className="font-mono font-semibold">{fmtBRL(parsedAmount * rate)}</span>
            <span className="text-[#4a5568]">· câmbio {rate.toFixed(2)}</span>
          </p>
        )}
      </div>

      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Descrição</label>
        <input type="text" placeholder="Ex.: Almoço no restaurante" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div>
        <label className="text-xs text-[#4a5568] block mb-1">Observação <span className="text-[#1a2030]">(opcional)</span></label>
        <input type="text" placeholder="Nota rápida" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-3 py-2 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
      </div>

      {/* Parcelamento — only when Cartão de Crédito is selected */}
      {isCC && (
        <div className="p-3 rounded-xl bg-[#07090d] border border-[#6366f1]/20 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isParcelado} onChange={e => setIsParcelado(e.target.checked)}
              className="w-4 h-4 rounded accent-[#6366f1] cursor-pointer" />
            <span className="text-xs text-[#8898aa]">Parcelado no cartão</span>
          </label>
          {isParcelado && (
            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-[#4a5568] block mb-1">Parcelas</label>
                  <input type="number" min="2" max="48" value={numParcelas}
                    onChange={e => setNumParcelas(e.target.value)}
                    className="w-20 bg-[#0d1117] border border-[#1a2030] rounded-lg px-3 py-1.5 text-sm text-[#e8ecf4] focus:outline-none focus:border-[#6366f1]/50"
                  />
                </div>
                {!isNaN(parsedAmount) && parsedAmount > 0 && parsedParcelas >= 2 && (
                  <div className="pt-4">
                    <p className="text-xs text-[#6366f1] font-semibold">
                      {parsedParcelas}x de {fmtBRL(parsedAmount)}
                    </p>
                    <p className="text-[10px] text-[#4a5568]">
                      Total {fmtBRL(parsedAmount * parsedParcelas)}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[#4a5568]">
                O valor informado é o de cada parcela. As próximas parcelas serão lançadas automaticamente nos meses seguintes.
              </p>
            </div>
          )}
        </div>
      )}

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

function ExpenseRow({
  expense, monthId, rate, selectMode, isSelected, onToggleSelect,
}: {
  expense: DailyExpense
  monthId: string
  rate: number
  selectMode: boolean
  isSelected: boolean
  onToggleSelect: (id: string) => void
}) {
  const { deleteDailyExpense, updateDailyExpense } = useFinanceStore()
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing]       = useState(false)

  // Edit draft state
  const [dDate,    setDDate]    = useState(expense.date)
  const [dDesc,    setDDesc]    = useState(expense.description)
  const [dAmount,  setDAmount]  = useState(String(expense.amount))
  const [dCat,     setDCat]     = useState<DailyExpenseCategory>(expense.category)
  const [dConta,   setDConta]   = useState<DailyExpenseConta>(expense.conta)
  const [dTipo,    setDTipo]    = useState<DailyExpenseTipo>(expense.tipo ?? 'custo')
  const [dNotes,   setDNotes]   = useState(expense.notes ?? '')

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Reset draft to current values
    setDDate(expense.date); setDDesc(expense.description); setDAmount(String(expense.amount))
    setDCat(expense.category); setDConta(expense.conta); setDTipo(expense.tipo ?? 'custo')
    setDNotes(expense.notes ?? '')
    setEditing(true)
  }

  const saveEdit = () => {
    const parsed = parseFloat(dAmount.replace(',', '.'))
    if (!dDesc.trim() || isNaN(parsed) || parsed <= 0) return
    updateDailyExpense(monthId, expense.id, {
      date: dDate, description: dDesc.trim(), amount: parsed,
      category: dCat, conta: dConta, tipo: dTipo,
      notes: dNotes.trim() || undefined,
    })
    setEditing(false)
  }

  const Icon      = CATEGORY_ICONS[expense.category]
  const ContaIcon = CONTA_ICONS[expense.conta]
  const color     = CATEGORY_COLORS[expense.category]
  const isUsdt    = expense.conta === 'usdt'
  const tipo      = expense.tipo ?? 'custo'
  const tipoColor = TIPO_CONFIG[tipo].color

  const editIsUsdt     = dConta === 'usdt'
  const editParsed     = parseFloat(dAmount.replace(',', '.'))

  const inputCls = 'w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50'
  const selectCls = inputCls

  return (
    <div className={`border-b border-[#0a0c11] last:border-0 ${isSelected ? 'bg-[#f06060]/05' : ''}`}>
      {/* ── Main row ── */}
      <div
        onClick={selectMode ? () => onToggleSelect(expense.id) : undefined}
        className={`flex items-center gap-3 py-3 group transition-colors ${
          selectMode ? 'cursor-pointer' : ''
        } ${selectMode ? 'hover:bg-[#1a2030]/40' : ''}`}
      >
        {/* Checkbox (select mode) or Category icon (normal mode) */}
        {selectMode ? (
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            {isSelected
              ? <CheckSquare size={18} className="text-[#f06060]" />
              : <Square size={18} className="text-[#4a5568]" />}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
            <Icon size={14} style={{ color }} />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-[#e8ecf4] truncate">{expense.description}</p>
            {expense.installments && expense.installmentCurrent && (
              <span className="shrink-0 text-[10px] font-bold text-[#6366f1] bg-[#6366f1]/15 border border-[#6366f1]/30 rounded px-1.5 py-0.5">
                {expense.installmentCurrent}/{expense.installments}
              </span>
            )}
          </div>
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

        {/* Actions (hidden in select mode) */}
        {!selectMode && (
          <div className="shrink-0 flex items-center gap-1">
            {/* Edit button */}
            {!editing && !confirming && (
              <button
                onClick={openEdit}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#4a5568] hover:text-[#6366f1] hover:bg-[#6366f1]/10 transition-all cursor-pointer"
                title="Editar"
              >
                <Pencil size={13} />
              </button>
            )}

            {/* Delete */}
            {confirming ? (
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); deleteDailyExpense(monthId, expense.id) }}
                  className="text-[10px] text-[#f06060] border border-[#f06060]/30 rounded px-1.5 py-0.5 hover:bg-[#f06060]/10 cursor-pointer">
                  Sim
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
                  className="text-[10px] text-[#4a5568] cursor-pointer hover:text-[#e8ecf4]">✕</button>
              </div>
            ) : (
              !editing && (
                <button onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 transition-all cursor-pointer">
                  <Trash2 size={13} />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Inline edit panel ── */}
      {editing && (
        <div className="mx-1 mb-3 p-3 rounded-xl bg-[#07090d] border border-[#6366f1]/30 space-y-3">
          <p className="text-xs font-semibold text-[#6366f1]">Editar gasto</p>

          {/* Row 1: Data + Conta */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#4a5568] block mb-1">Data</label>
              <input type="date" value={dDate} onChange={e => setDDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-[#4a5568] block mb-1">Conta</label>
              <select value={dConta} onChange={e => setDConta(e.target.value as DailyExpenseConta)} className={selectCls}>
                {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map(c => (
                  <option key={c} value={c}>{CONTA_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Valor */}
          <div>
            <label className="text-[10px] text-[#4a5568] block mb-1">
              Valor{' '}
              <span className={`font-semibold ${editIsUsdt ? 'text-[#26a17b]' : 'text-[#8898aa]'}`}>
                {editIsUsdt ? '$ (USD)' : 'R$'}
              </span>
            </label>
            <div className="relative">
              <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono select-none ${editIsUsdt ? 'text-[#26a17b]' : 'text-[#4a5568]'}`}>
                {editIsUsdt ? '$' : 'R$'}
              </span>
              <input
                type="number" step="0.01" min="0"
                value={dAmount} onChange={e => setDAmount(e.target.value)}
                className={`w-full bg-[#07090d] border rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-[#e8ecf4] focus:outline-none ${
                  editIsUsdt ? 'border-[#26a17b]/40 focus:border-[#26a17b]/70' : 'border-[#1a2030] focus:border-[#00d4a0]/50'
                }`}
              />
            </div>
            {editIsUsdt && !isNaN(editParsed) && editParsed > 0 && (
              <p className="text-[10px] text-[#26a17b] mt-1">≈ {fmtBRL(editParsed * rate)} · câmbio {rate.toFixed(2)}</p>
            )}
          </div>

          {/* Row 3: Descrição */}
          <div>
            <label className="text-[10px] text-[#4a5568] block mb-1">Descrição</label>
            <input type="text" value={dDesc} onChange={e => setDDesc(e.target.value)} className={inputCls} />
          </div>

          {/* Row 4: Tipo + Categoria */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#4a5568] block mb-1">Tipo</label>
              <select value={dTipo} onChange={e => setDTipo(e.target.value as DailyExpenseTipo)} className={selectCls}>
                <option value="custo">Despesa</option>
                <option value="lazer">Lazer</option>
                <option value="investimento">Investimento</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#4a5568] block mb-1">Categoria</label>
              <select value={dCat} onChange={e => setDCat(e.target.value as DailyExpenseCategory)} className={selectCls}>
                {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Observação */}
          <div>
            <label className="text-[10px] text-[#4a5568] block mb-1">Observação <span className="text-[#1a2030]">(opcional)</span></label>
            <input type="text" value={dNotes} onChange={e => setDNotes(e.target.value)} placeholder="Nota rápida" className={inputCls} />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/30 text-[#6366f1] text-xs font-semibold rounded-lg py-1.5 transition-all cursor-pointer"
            >
              <Check size={13} /> Salvar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 border border-[#1a2030] text-[#4a5568] text-xs rounded-lg py-1.5 hover:text-[#e8ecf4] transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main widget ─────────────────────────────────────────────────────────────

export function DailyExpensesWidget() {
  const { currentMonthId, months, exchangeRate, deleteDailyExpenses, updateDailyExpense } = useFinanceStore()
  const month    = months[currentMonthId]
  const expenses = useMemo(() => month?.dailyExpenses ?? [], [month])

  const rate   = month?.exchangeRate || exchangeRate.rate
  const salary = month?.fixedIncome ?? 0

  const allBills = useMemo(() => [
    ...(month?.bills ?? []),
    ...(month?.overdueBills ?? []),
  ], [month])

  const usdtReceived  = month?.usdtSettings?.received !== false
  const usdtIncomeBRL = usdtReceived
    ? Math.round((month?.usdtSettings?.monthlyAmount ?? 0) * rate * 100) / 100
    : 0
  const totalIncome = salary + usdtIncomeBRL

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

  // ── Multi-select ─────────────────────────────────────────────────────────
  const [selectMode,   setSelectMode]   = useState(false)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [confirmBulk,  setConfirmBulk]  = useState(false)

  // ── Bulk edit ─────────────────────────────────────────────────────────────
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkTipo,     setBulkTipo]     = useState<DailyExpenseTipo | 'nao_alterar'>('nao_alterar')
  const [bulkConta,    setBulkConta]    = useState<DailyExpenseConta | 'nao_alterar'>('nao_alterar')
  const [bulkCat,      setBulkCat]      = useState<DailyExpenseCategory | 'nao_alterar'>('nao_alterar')

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

  const allFilteredSelected = filtered.length > 0 && filtered.every(e => selectedIds.has(e.id))
  const someSelected = selectedIds.size > 0

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)))
    }
  }

  const enterSelectMode = () => {
    setSelectMode(true)
    setSelectedIds(new Set())
    setConfirmBulk(false)
    setShowForm(false)
    setShowImport(false)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
    setConfirmBulk(false)
    setBulkEditOpen(false)
    setBulkTipo('nao_alterar'); setBulkConta('nao_alterar'); setBulkCat('nao_alterar')
  }

  const handleBulkDelete = () => {
    deleteDailyExpenses(currentMonthId, Array.from(selectedIds))
    exitSelectMode()
  }

  const applyBulkEdit = () => {
    const updates: Partial<DailyExpense> = {}
    if (bulkTipo  !== 'nao_alterar') updates.tipo     = bulkTipo
    if (bulkConta !== 'nao_alterar') updates.conta    = bulkConta
    if (bulkCat   !== 'nao_alterar') updates.category = bulkCat
    if (Object.keys(updates).length === 0) return
    for (const id of selectedIds) {
      updateDailyExpense(currentMonthId, id, updates)
    }
    setBulkEditOpen(false)
    setBulkTipo('nao_alterar'); setBulkConta('nao_alterar'); setBulkCat('nao_alterar')
  }

  // Total value of selected items
  const selectedTotal = useMemo(() => {
    return filtered
      .filter(e => selectedIds.has(e.id))
      .reduce((s, e) => s + toBRL(e, rate), 0)
  }, [filtered, selectedIds, rate])

  // Total value of filtered results (shown as summary when filter active)
  const filteredTotal = useMemo(() => {
    return filtered.reduce((s, e) => s + toBRL(e, rate), 0)
  }, [filtered, rate])

  // Breakdown of filtered total by tipo
  const filteredByTipo = useMemo(() => {
    const map: Record<string, number> = { custo: 0, lazer: 0, investimento: 0 }
    for (const e of filtered) map[e.tipo ?? 'custo'] += toBRL(e, rate)
    return map
  }, [filtered, rate])

  return (
    <div className="space-y-4">

      {/* ── Header actions ──────────────────────────────────────────── */}
      {!selectMode ? (
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

          {expenses.length > 0 && (
            <button onClick={enterSelectMode}
              className="flex items-center gap-1.5 text-xs text-[#4a5568] hover:text-[#f06060] border border-[#1a2030] hover:border-[#f06060]/30 px-3 py-2 rounded-lg cursor-pointer transition-all ml-auto">
              <CheckSquare size={13} /> Selecionar
            </button>
          )}

          {hasActiveFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-[#f5a020] hover:text-[#f5a020]/80 transition-all cursor-pointer">
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>
      ) : (
        /* ── Selection mode toolbar ─────────────────────────────────── */
        <div className="flex flex-wrap items-center gap-2 p-3 bg-[#0d1117] border border-[#f06060]/20 rounded-xl">
          {/* Toggle all */}
          <button onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-[#8898aa] hover:text-[#e8ecf4] px-2 py-1.5 rounded-lg border border-[#1a2030] hover:border-[#243048] cursor-pointer transition-all">
            <CheckCheck size={13} />
            {allFilteredSelected ? 'Desmarcar todos' : `Selecionar todos (${filtered.length})`}
          </button>

          {/* Selection info */}
          {someSelected && (
            <span className="text-xs text-[#8898aa] flex items-center gap-1.5">
              <span className="font-semibold text-[#e8ecf4]">{selectedIds.size}</span> selecionado{selectedIds.size !== 1 ? 's' : ''}
              <span className="text-[#4a5568]">·</span>
              <span className="font-mono text-[#f06060]">{fmtBRL(selectedTotal)}</span>
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Bulk edit toggle */}
            {someSelected && !confirmBulk && (
              <button onClick={() => setBulkEditOpen(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                  bulkEditOpen
                    ? 'text-[#6366f1] bg-[#6366f1]/15 border-[#6366f1]/40'
                    : 'text-[#8898aa] bg-transparent border-[#1a2030] hover:text-[#e8ecf4] hover:border-[#243048]'
                }`}>
                <Layers size={13} /> Editar em massa
              </button>
            )}

            {/* Confirm delete */}
            {someSelected && !confirmBulk && (
              <button onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#f06060] bg-[#f06060]/10 hover:bg-[#f06060]/20 border border-[#f06060]/30 px-3 py-1.5 rounded-lg cursor-pointer transition-all">
                <Trash2 size={13} /> Excluir {selectedIds.size}
              </button>
            )}

            {/* Final confirm */}
            {confirmBulk && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f06060]/15 border border-[#f06060]/40 rounded-lg">
                <span className="text-xs text-[#f06060] font-medium">Confirmar exclusão de {selectedIds.size} gasto{selectedIds.size !== 1 ? 's' : ''}?</span>
                <button onClick={handleBulkDelete}
                  className="text-xs font-bold text-[#f06060] hover:text-white bg-[#f06060]/20 hover:bg-[#f06060] px-2 py-0.5 rounded cursor-pointer transition-all">
                  Sim
                </button>
                <button onClick={() => setConfirmBulk(false)}
                  className="text-xs text-[#4a5568] hover:text-[#e8ecf4] cursor-pointer transition-all">
                  ✕
                </button>
              </div>
            )}

            {/* Cancel selection */}
            <button onClick={exitSelectMode}
              className="flex items-center gap-1 text-xs text-[#4a5568] hover:text-[#e8ecf4] px-2 py-1.5 rounded-lg border border-[#1a2030] cursor-pointer transition-all">
              <X size={12} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk edit panel ──────────────────────────────────────── */}
      {selectMode && someSelected && bulkEditOpen && (
        <div className="bg-[#0d1117] border border-[#6366f1]/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#6366f1]">
            Edição em massa · {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Tipo</label>
              <select value={bulkTipo} onChange={e => setBulkTipo(e.target.value as DailyExpenseTipo | 'nao_alterar')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2.5 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#6366f1]/50">
                <option value="nao_alterar">— não alterar —</option>
                <option value="custo">Despesa</option>
                <option value="lazer">Lazer</option>
                <option value="investimento">Investimento</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Conta</label>
              <select value={bulkConta} onChange={e => setBulkConta(e.target.value as DailyExpenseConta | 'nao_alterar')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2.5 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#6366f1]/50">
                <option value="nao_alterar">— não alterar —</option>
                {(Object.keys(CONTA_LABELS) as DailyExpenseConta[]).map(c => (
                  <option key={c} value={c}>{CONTA_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Categoria</label>
              <select value={bulkCat} onChange={e => setBulkCat(e.target.value as DailyExpenseCategory | 'nao_alterar')}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2.5 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#6366f1]/50">
                <option value="nao_alterar">— não alterar —</option>
                {(Object.keys(CATEGORY_LABELS) as DailyExpenseCategory[]).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={applyBulkEdit}
            disabled={bulkTipo === 'nao_alterar' && bulkConta === 'nao_alterar' && bulkCat === 'nao_alterar'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/30 text-[#6366f1] text-xs font-semibold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Check size={13} /> Aplicar em {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* ── Filters panel ─────────────────────────────────────────── */}
      {showFilters && !selectMode && (
        <div className="bg-[#0d1117] border border-[#1a2030] rounded-xl p-4 space-y-3">
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
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">De</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
            </div>
            <div>
              <label className="text-xs text-[#4a5568] block mb-1">Até</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full bg-[#07090d] border border-[#1a2030] rounded-lg px-2 py-2 text-xs text-[#e8ecf4] focus:outline-none focus:border-[#00d4a0]/50" />
            </div>
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

      {/* ── Tipo breakdown cards ── */}
      <TipoCards expenses={expenses} bills={allBills} rate={rate} income={totalIncome} usdtIncomeBRL={usdtIncomeBRL} salary={salary} />

      {/* ── Main content: list + category breakdown ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Expense list */}
        <div className="md:col-span-2 bg-[#0d1117] border border-[#1a2030] rounded-xl">
          <div className="px-4 py-3 border-b border-[#1a2030] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#e8ecf4]">
              Lançamentos
              {hasActiveFilter && <span className="ml-2 text-xs font-normal text-[#6366f1]">filtrado</span>}
              {selectMode && someSelected && (
                <span className="ml-2 text-xs font-normal text-[#f06060]">{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
              )}
            </h3>
            <span className="text-xs text-[#4a5568]">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ── Filter summary strip ── shown only when a filter is active */}
          {hasActiveFilter && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-b border-[#1a2030] bg-[#6366f1]/05 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#6366f1] uppercase tracking-wider font-semibold">Total filtrado</span>
                <span className="text-sm font-mono font-bold text-[#e8ecf4]">{fmtBRL(filteredTotal)}</span>
              </div>
              <div className="flex items-center gap-3 ml-1">
                {filteredByTipo.custo > 0 && (
                  <span className="text-[10px] font-mono text-[#f06060]">
                    Despesas: {fmtBRL(filteredByTipo.custo)}
                  </span>
                )}
                {filteredByTipo.lazer > 0 && (
                  <span className="text-[10px] font-mono text-[#a78bfa]">
                    Lazer: {fmtBRL(filteredByTipo.lazer)}
                  </span>
                )}
                {filteredByTipo.investimento > 0 && (
                  <span className="text-[10px] font-mono text-[#00d4a0]">
                    Invest.: {fmtBRL(filteredByTipo.investimento)}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#4a5568] ml-auto">
                {filtered.length} de {expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}


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
              {filtered.map(e => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  monthId={currentMonthId}
                  rate={rate}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(e.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div>
          <CategoryBreakdown expenses={filtered.length > 0 ? filtered : expenses} rate={rate} />
        </div>
      </div>
    </div>
  )
}
