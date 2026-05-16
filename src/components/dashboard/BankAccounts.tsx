'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { formatBRL, formatUSDT } from '@/lib/utils'
import { BankAccount } from '@/types'
import { Plus, Trash2, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Pencil, Check, X, Banknote, RotateCcw, CreditCard } from 'lucide-react'

/** Raw balance in the account's native currency (USD for usdt, BRL for others) */
function calcAccountBalance(acc: BankAccount): number {
  const txBal = acc.transactions.reduce((s, t) => t.type === 'entrada' ? s + t.amount : s - t.amount, 0)
  return (acc.initialBalance ?? 0) + txBal
}

/** Balance converted to BRL for totals (usdt accounts multiplied by rate) */
function calcAccountBalanceBRL(acc: BankAccount, rate: number): number {
  const bal = calcAccountBalance(acc)
  return acc.type === 'usdt' ? bal * rate : bal
}

/** Format balance in the account's display currency */
function fmtAccBalance(acc: BankAccount, amount: number): string {
  return acc.type === 'usdt' ? formatUSDT(amount) : formatBRL(amount)
}

/** Format transaction amount in the account's display currency */
function fmtTxAmount(acc: BankAccount, amount: number): string {
  return acc.type === 'usdt' ? formatUSDT(amount) : formatBRL(amount)
}

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  operacional: Wallet,
  usdt: TrendingUp,
  investimento: ArrowUpRight,
  dizimo: ArrowDownLeft,
}

const ACCOUNT_LABELS: Record<string, string> = {
  operacional: 'Conta corrente',
  usdt: 'USDT / APY',
  investimento: 'Investimento BR',
  dizimo: 'Dízimo',
}

// ─── Inline editable initial balance ────────────────────────────────────────
function InitialBalanceField({ acc, onSave }: { acc: BankAccount; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(acc.initialBalance ?? 0))
  const isUSDT = acc.type === 'usdt'
  const prefix = isUSDT ? '$' : 'R$'

  const commit = () => {
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n)) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[#4a5568]">{prefix}</span>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 min-w-0 bg-[#0a0e16] border border-[#00d4a0] rounded-lg px-2 py-1.5 text-sm font-mono text-[#e8ecf4] focus:outline-none"
        />
        <button onClick={commit} className="p-1.5 rounded-lg bg-[#00d4a0]/20 text-[#00d4a0] hover:bg-[#00d4a0]/30 cursor-pointer shrink-0">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-[#4a5568] hover:bg-[#1a2030] cursor-pointer shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mt-1">
      <span className="text-sm font-mono font-semibold text-[#e8ecf4]">{isUSDT ? formatUSDT(acc.initialBalance ?? 0) : formatBRL(acc.initialBalance ?? 0)}</span>
      <button
        onClick={() => { setVal(String(acc.initialBalance ?? 0)); setEditing(true) }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[#4a5568] hover:text-[#00d4a0] hover:bg-[#00d4a0]/10 cursor-pointer transition-all text-xs border border-[#1a2030] hover:border-[#00d4a0]/30"
      >
        <Pencil size={11} /> Editar
      </button>
    </div>
  )
}

// ─── Salary Account Picker ───────────────────────────────────────────────────
function SalaryAccountPicker({
  accounts,
  fixedIncome,
  onConfirm,
  onClose,
}: {
  accounts: BankAccount[]
  fixedIncome: number
  onConfirm: (accountId: string) => void
  onClose: () => void
}) {
  // Exclude dizimo (it receives tithe automatically) and usdt (not BRL)
  const eligible = accounts.filter((a) => a.type !== 'dizimo' && a.type !== 'usdt')
  const [selectedId, setSelectedId] = useState(eligible[0]?.id ?? '')

  return (
    <Dialog open onClose={onClose} title="Para qual conta vai o salário?" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
          <span className="text-sm text-[#e8ecf4] font-medium">Salário — 5º dia útil</span>
          <span className="text-sm font-mono font-bold text-[#00d4a0] shrink-0 ml-3">{formatBRL(fixedIncome)}</span>
        </div>
        <p className="text-xs text-[#4a5568]">Dízimo (10%) será separado automaticamente para a conta Dízimo.</p>

        <div className="space-y-2">
          {eligible.map((acc) => {
            const bal = calcAccountBalance(acc)
            return (
              <button
                key={acc.id}
                onClick={() => setSelectedId(acc.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer text-left ${
                  selectedId === acc.id
                    ? 'border-[#00d4a0]/50 bg-[#00d4a0]/08'
                    : 'border-[#1a2030] hover:border-[#243048] bg-[#07090d]'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${acc.color}22`, border: `1px solid ${acc.color}44` }}
                >
                  <Wallet size={14} style={{ color: acc.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8ecf4]">{acc.name}</p>
                  <p className="text-xs font-mono text-[#4a5568]">Saldo: {formatBRL(bal)}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedId === acc.id ? 'bg-[#00d4a0] border-[#00d4a0]' : 'border-[#4a5568]'}`} />
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => onConfirm(selectedId)} disabled={!selectedId}>
            Confirmar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function BankAccounts() {
  const { currentMonthId, getCurrentMonth, exchangeRate, addBankTransaction, deleteBankTransaction, updateAccountInitialBalance, registerSalary, unregisterSalary, isSalaryRegistered } = useFinanceStore()
  const month = getCurrentMonth()
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [showTxForm, setShowTxForm] = useState(false)
  const [showSalaryPicker, setShowSalaryPicker] = useState(false)
  const [txForm, setTxForm] = useState({ description: '', amount: '', type: 'saida' as 'entrada' | 'saida', date: '' })

  if (!month) return null

  const rate = month.exchangeRate || exchangeRate.rate
  const salaryRegistered = isSalaryRegistered(currentMonthId)

  // Find which account received the salary (has entrada linked to __salary__)
  const salaryAccount = salaryRegistered
    ? month.bankAccounts.find((acc) =>
        acc.transactions.some((tx) => tx.linkedBillId === '__salary__' && tx.type === 'entrada')
      )
    : null
  const tithe = Math.round(month.fixedIncome * 0.1 * 100) / 100
  const salaryNet = month.fixedIncome - tithe // valor que fica na conta para alocar
  // Patrimônio em BRL: usdt accounts are multiplied by exchange rate
  const totalPatrimonio = month.bankAccounts.reduce((s, acc) => s + calcAccountBalanceBRL(acc, rate), 0)
  const toGlobalBRL = (acc: BankAccount, amount: number) => acc.type === 'usdt' ? amount * rate : amount

  // For the global totals, exclude __salary__ transactions from non-operacional accounts
  // because those are internal transfers (Operacional → Dízimo / Investimento) and would
  // otherwise be double-counted (e.g. a R$10k salary becomes R$20k entrada).
  const isRealTx = (acc: BankAccount, tx: { linkedBillId?: string }) =>
    acc.type === 'operacional' || tx.linkedBillId !== '__salary__'

  const totalEntradas = month.bankAccounts.reduce((s, acc) =>
    s + acc.transactions
      .filter(t => t.type === 'entrada' && isRealTx(acc, t))
      .reduce((a, t) => a + toGlobalBRL(acc, t.amount), 0), 0)

  const totalSaidas = month.bankAccounts.reduce((s, acc) =>
    s + acc.transactions
      .filter(t => t.type === 'saida' && isRealTx(acc, t))
      .reduce((a, t) => a + toGlobalBRL(acc, t.amount), 0), 0)

  const openTxForm = (accId: string) => {
    setSelectedAccount(accId)
    setTxForm({ description: '', amount: '', type: 'saida', date: new Date().toISOString().slice(0, 10) })
    setShowTxForm(true)
  }

  const handleAddTx = () => {
    if (!selectedAccount || !txForm.amount || !txForm.description) return
    addBankTransaction(currentMonthId, selectedAccount, {
      date: txForm.date || new Date().toISOString(),
      description: txForm.description,
      amount: parseFloat(txForm.amount),
      type: txForm.type,
    })
    setShowTxForm(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Patrimônio Total ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-[#8898aa] mb-1">Patrimônio Total</p>
              <p className="text-3xl font-mono font-bold text-[#e8ecf4]">{formatBRL(totalPatrimonio)}</p>
              <p className="text-xs text-[#4a5568] mt-1">saldo inicial + movimentações do mês</p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-[#00d4a0]">Entradas</p>
                <p className="text-lg font-mono font-semibold text-[#00d4a0]">+{formatBRL(totalEntradas)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#f06060]">Saídas</p>
                <p className="text-lg font-mono font-semibold text-[#f06060]">−{formatBRL(totalSaidas)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#f5a020]">Resultado</p>
                <p className={`text-lg font-mono font-semibold ${totalEntradas - totalSaidas >= 0 ? 'text-[#00d4a0]' : 'text-[#f06060]'}`}>
                  {totalEntradas - totalSaidas >= 0 ? '+' : ''}{formatBRL(totalEntradas - totalSaidas)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Salary registration ─────────────────────────────────────────── */}
      <Card className={salaryRegistered ? 'border-[#00d4a0]/30' : 'border-[#f5a020]/30'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${salaryRegistered ? 'bg-[#00d4a0]/15 border border-[#00d4a0]/30' : 'bg-[#f5a020]/15 border border-[#f5a020]/30'}`}>
                  <Banknote size={18} className={salaryRegistered ? 'text-[#00d4a0]' : 'text-[#f5a020]'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#e8ecf4]">
                    Salário — {formatBRL(month.fixedIncome)} <span className="text-xs text-[#4a5568] font-normal">(5º dia útil)</span>
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-[#4a5568]">
                    <span className="text-[#f5a020]">Dízimo {formatBRL(tithe)}</span>
                    <span>·</span>
                    <span className="text-[#00d4a0]">Disponível {formatBRL(salaryNet)} para alocar</span>
                  </div>
                </div>
              </div>

              {salaryRegistered ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-sm text-[#00d4a0] font-medium">
                    <Check size={14} /> Lançado
                    {salaryAccount && (
                      <span className="flex items-center gap-1 ml-1 text-xs text-[#4a5568] font-normal">
                        <CreditCard size={11} /> {salaryAccount.name}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => unregisterSalary(currentMonthId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 border border-[#1a2030] cursor-pointer transition-all"
                  >
                    <RotateCcw size={12} /> Desfazer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSalaryPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5a020]/15 border border-[#f5a020]/30 text-[#f5a020] text-sm font-semibold hover:bg-[#f5a020]/25 cursor-pointer transition-all"
                >
                  <Banknote size={15} /> Lançar Salário
                </button>
              )}
            </div>

            {salaryRegistered && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="px-3 py-2 rounded-lg bg-[#00d4a0]/08 border border-[#00d4a0]/20 text-center">
                  <p className="text-[#4a5568]">{salaryAccount?.name ?? 'Conta'} recebeu</p>
                  <p className="font-mono font-bold text-[#00d4a0]">+{formatBRL(month.fixedIncome)}</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#f5a020]/08 border border-[#f5a020]/20 text-center">
                  <p className="text-[#4a5568]">Dízimo separado</p>
                  <p className="font-mono font-bold text-[#f5a020]">{formatBRL(tithe)}</p>
                </div>
              </div>
            )}
            {salaryRegistered && (
              <p className="text-xs text-[#4a5568] mt-2">
                💡 Para alocar no CDB, adicione uma transação de saída na conta <span className="text-[#e8ecf4]">{salaryAccount?.name ?? 'Operacional'}</span> e entrada em <span className="text-[#e8ecf4]">Investimento BR</span>.
              </p>
            )}
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {month.bankAccounts.map((acc) => {
          const balance = calcAccountBalance(acc)          // native currency (USD for usdt)
          const balanceBRL = calcAccountBalanceBRL(acc, rate) // always BRL for totals
          const Icon = ACCOUNT_ICONS[acc.type] || Wallet
          const entradas = acc.transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0)
          const saidas = acc.transactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0)
          const isUSDT = acc.type === 'usdt'

          return (
            <Card key={acc.id} className="hover:border-[#243048] transition-colors">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${acc.color}20`, border: `1px solid ${acc.color}40` }}>
                      <Icon size={18} style={{ color: acc.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#e8ecf4]">{acc.name}</p>
                      <p className="text-xs text-[#4a5568]">{ACCOUNT_LABELS[acc.type]}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openTxForm(acc.id)}><Plus size={14} /></Button>
                </div>

                {/* Balance cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[#07090d] rounded-xl border border-[#1a2030]">
                    <p className="text-xs text-[#8898aa] mb-1">Saldo atual</p>
                    <p className="text-lg font-mono font-bold" style={{ color: acc.color }}>{fmtAccBalance(acc, balance)}</p>
                    {isUSDT && <p className="text-xs text-[#4a5568] mt-0.5 font-mono">≈ {formatBRL(balanceBRL)}</p>}
                  </div>
                  <div className="p-3 bg-[#07090d] rounded-xl border border-[#1a2030]">
                    <p className="text-xs text-[#8898aa]">Saldo inicial {isUSDT ? '(USD)' : ''}</p>
                    <InitialBalanceField
                      acc={acc}
                      onSave={(v) => updateAccountInitialBalance(currentMonthId, acc.id, v)}
                    />
                  </div>
                </div>

                {/* Entradas / Saídas */}
                <div className="flex items-center justify-between text-xs mb-3 px-1">
                  <span className="text-[#00d4a0] font-mono">↑ {fmtAccBalance(acc, entradas)}</span>
                  <span className={`font-mono font-semibold ${entradas - saidas >= 0 ? 'text-[#00d4a0]' : 'text-[#f06060]'}`}>
                    {entradas - saidas >= 0 ? '+' : ''}{fmtAccBalance(acc, entradas - saidas)} no mês
                  </span>
                  <span className="text-[#f06060] font-mono">↓ {fmtAccBalance(acc, saidas)}</span>
                </div>

                {/* Transaction list */}
                {acc.transactions.length > 0 ? (
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {acc.transactions.slice().reverse().map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#1a2030] group transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={tx.type === 'entrada' ? 'text-[#00d4a0]' : 'text-[#f06060]'}>
                            {tx.type === 'entrada' ? '↑' : '↓'}
                          </span>
                          <span className="text-xs text-[#8898aa] truncate">{tx.description}</span>
                          {tx.linkedBillId && (
                            <span className="text-[10px] text-[#4a5568] shrink-0 border border-[#1a2030] rounded px-1">auto</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-mono ${tx.type === 'entrada' ? 'text-[#00d4a0]' : 'text-[#f06060]'}`}>
                            {tx.type === 'entrada' ? '+' : '-'}{fmtTxAmount(acc, tx.amount)}
                          </span>
                          {!tx.linkedBillId && (
                            <button
                              onClick={() => deleteBankTransaction(currentMonthId, acc.id, tx.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#4a5568] hover:text-[#f06060] cursor-pointer transition-all"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#4a5568] text-center py-4">Nenhuma transação ainda</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Salary account picker */}
      {showSalaryPicker && (
        <SalaryAccountPicker
          accounts={month.bankAccounts}
          fixedIncome={month.fixedIncome}
          onConfirm={(accountId) => {
            registerSalary(currentMonthId, accountId)
            setShowSalaryPicker(false)
          }}
          onClose={() => setShowSalaryPicker(false)}
        />
      )}

      {/* Add transaction dialog */}
      <Dialog open={showTxForm} onClose={() => setShowTxForm(false)} title="Nova Transação" size="sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['entrada', 'saida'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTxForm({ ...txForm, type })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  txForm.type === type
                    ? type === 'entrada' ? 'bg-[#00d4a0]/20 text-[#00d4a0] border border-[#00d4a0]/30' : 'bg-[#f06060]/20 text-[#f06060] border border-[#f06060]/30'
                    : 'bg-[#0a0e16] text-[#8898aa] border border-[#1a2030]'
                }`}
              >
                {type === 'entrada' ? '↑ Entrada' : '↓ Saída'}
              </button>
            ))}
          </div>
          <Input label="Descrição" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} placeholder="Ex: Salário, conta..." />
          <Input label="Valor (R$)" type="number" prefix="R$" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0,00" />
          <Input label="Data" type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowTxForm(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleAddTx} disabled={!txForm.amount || !txForm.description}>Adicionar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
