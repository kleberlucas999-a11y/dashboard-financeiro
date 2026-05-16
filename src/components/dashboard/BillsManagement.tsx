'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Bill, BillCategory, BillStatus, BankAccount } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  formatBRL, getCategoryLabel, getCategoryColor, getBillDiagnosis,
  getBillsFirstHalf, getBillsSecondHalf,
} from '@/lib/utils'
import { Plus, Trash2, Pencil, CheckCircle2, Circle, XCircle, Info, AlertTriangle, Wallet, CreditCard } from 'lucide-react'

const categoryOptions = [
  { value: 'moradia', label: 'Moradia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'servico', label: 'Serviço' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'divida', label: 'Dívida' },
  { value: 'variavel', label: 'Variável' },
]

function calcAccountBalance(acc: BankAccount): number {
  const txBal = acc.transactions.reduce((s, t) => t.type === 'entrada' ? s + t.amount : s - t.amount, 0)
  return (acc.initialBalance ?? 0) + txBal
}

/** Find which account debited a bill (has saida transaction linked to billId) */
function getPaidFromAccount(billId: string, accounts: BankAccount[]): BankAccount | null {
  for (const acc of accounts) {
    if (acc.transactions.some((tx) => tx.linkedBillId === billId && tx.type === 'saida')) {
      return acc
    }
  }
  return null
}

function StatusIcon({ status }: { status: BillStatus }) {
  if (status === 'pago') return <CheckCircle2 size={16} className="text-[#00d4a0]" />
  if (status === 'quitado') return <XCircle size={16} className="text-[#4a5568]" />
  return <Circle size={16} className="text-[#f5a020]" />
}

function StatusBadge({ status }: { status: BillStatus }) {
  const map = { pendente: 'amber', pago: 'green', quitado: 'muted' } as const
  return <Badge variant={map[status]}>{status}</Badge>
}

function DiagnosisBadge({ diagnosis }: { diagnosis: 'otimo' | 'atencao' | 'mover' }) {
  if (diagnosis === 'otimo') return <Badge variant="green">ótimo</Badge>
  if (diagnosis === 'mover') return <Badge variant="red">mover vencimento</Badge>
  return <Badge variant="amber">atenção</Badge>
}

// ─── Pay Bill Dialog ─────────────────────────────────────────────────────────
function PayBillDialog({
  bill, accounts, onConfirm, onClose,
}: {
  bill: Bill
  accounts: BankAccount[]
  onConfirm: (accountId: string) => void
  onClose: () => void
}) {
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? '')

  return (
    <Dialog open onClose={onClose} title="De qual conta saiu?" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#07090d] border border-[#1a2030]">
          <span className="text-sm text-[#e8ecf4] font-medium truncate">{bill.name}</span>
          <span className="text-sm font-mono font-bold text-[#f06060] shrink-0 ml-3">{formatBRL(bill.amount)}</span>
        </div>

        <div className="space-y-2">
          {accounts.map((acc) => {
            const bal = calcAccountBalance(acc)
            const enough = bal >= bill.amount
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
                  <p className={`text-xs font-mono ${enough ? 'text-[#00d4a0]' : 'text-[#f06060]'}`}>
                    {formatBRL(bal)}{!enough && ' — saldo insuficiente'}
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${selectedId === acc.id ? 'bg-[#00d4a0] border-[#00d4a0]' : 'border-[#4a5568]'}`} />
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => onConfirm(selectedId)} disabled={!selectedId}>
            Confirmar pagamento
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Bill Form ───────────────────────────────────────────────────────────────
interface BillFormData {
  name: string; amount: string; dueDay: string; category: BillCategory; notes: string; isVariable: boolean
  installments: string; installmentCurrent: string
}
const emptyForm: BillFormData = { name: '', amount: '', dueDay: '', category: 'servico', notes: '', isVariable: false, installments: '', installmentCurrent: '' }

// ─── Bill Row ────────────────────────────────────────────────────────────────
function BillRow({ bill, accounts, onEdit, onDelete, onToggle }: {
  bill: Bill
  accounts: BankAccount[]
  onEdit: (b: Bill) => void
  onDelete: (id: string) => void
  onToggle: (b: Bill) => void
}) {
  const diagnosis = getBillDiagnosis(bill)
  const catColor = getCategoryColor(bill.category)
  const paidFrom = bill.status === 'pago' ? getPaidFromAccount(bill.id, accounts) : null
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:border-[#243048] ${
      bill.status === 'quitado' ? 'opacity-40 border-[#1a2030]' : 'border-[#1a2030]'
    }`}>
      <button onClick={() => onToggle(bill)} className="cursor-pointer shrink-0">
        <StatusIcon status={bill.status} />
      </button>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#e8ecf4] truncate">{bill.name}</span>
          {bill.notes && <span title={bill.notes}><Info size={12} className="text-[#f5a020]" /></span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[#4a5568]">dia {bill.dueDay}</span>
          <span className="text-xs text-[#4a5568]">·</span>
          <span className="text-xs text-[#4a5568]">{getCategoryLabel(bill.category)}</span>
          {paidFrom && (
            <>
              <span className="text-xs text-[#4a5568]">·</span>
              <span className="flex items-center gap-1 text-xs text-[#4a5568]">
                <CreditCard size={10} style={{ color: paidFrom.color }} />
                <span style={{ color: paidFrom.color }}>{paidFrom.name}</span>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {bill.installments && bill.installments > 0 && (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/25">
            {bill.installmentCurrent}/{bill.installments}x
          </span>
        )}
        <DiagnosisBadge diagnosis={diagnosis} />
        <StatusBadge status={bill.status} />
        <span className="text-sm font-mono font-semibold text-[#e8ecf4] min-w-[90px] text-right">{formatBRL(bill.amount)}</span>
        <button onClick={() => onEdit(bill)} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#e8ecf4] hover:bg-[#1a2030] cursor-pointer transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(bill.id)} className="p-1.5 rounded-lg text-[#4a5568] hover:text-[#f06060] hover:bg-[#f06060]/10 cursor-pointer transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function BillsManagement() {
  const {
    currentMonthId, getCurrentMonth,
    addBill, updateBill, deleteBill, setBillStatus,
    payBillFromAccount, unPayBill,
    payOverdueBillFromAccount, unPayOverdueBill,
  } = useFinanceStore()
  const month = getCurrentMonth()

  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [form, setForm] = useState<BillFormData>(emptyForm)
  const [showQuitados, setShowQuitados] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  // Payment source dialog state
  const [payingBill, setPayingBill] = useState<Bill | null>(null)
  const [payingOverdue, setPayingOverdue] = useState<Bill | null>(null)

  if (!month) return null

  const isMay2025 = month.id === '2025-05'
  const overdueBills = month.overdueBills || []
  const overduePending = overdueBills.filter(b => b.status !== 'pago' && b.status !== 'quitado')
  const overdueTotal = overduePending.reduce((s, b) => s + b.amount, 0)

  const activeBills = month.bills.filter((b) => b.status !== 'quitado')
  const quitados = month.bills.filter((b) => b.status === 'quitado')
  const firstHalf = getBillsFirstHalf(activeBills).filter((b) => filterCat === 'all' || b.category === filterCat)
  const secondHalf = getBillsSecondHalf(activeBills).filter((b) => filterCat === 'all' || b.category === filterCat)

  const totalActive = activeBills.reduce((s, b) => s + b.amount, 0)
  const totalPaid = activeBills.filter((b) => b.status === 'pago').reduce((s, b) => s + b.amount, 0)
  const grandTotal = totalActive + overdueTotal

  // Toggle handler — opens dialog when marking as paid, directly reverts when un-paying
  const handleToggle = (bill: Bill) => {
    if (bill.status === 'pendente') {
      setPayingBill(bill)
    } else {
      unPayBill(currentMonthId, bill.id)
    }
  }

  const handleOverdueToggle = (bill: Bill) => {
    if (bill.status === 'pendente') {
      setPayingOverdue(bill)
    } else {
      unPayOverdueBill(currentMonthId, bill.id)
    }
  }

  const openAdd = () => { setEditingBill(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (b: Bill) => {
    setEditingBill(b)
    setForm({
      name: b.name, amount: String(b.amount), dueDay: String(b.dueDay),
      category: b.category, notes: b.notes || '', isVariable: !!b.isVariable,
      installments: b.installments ? String(b.installments) : '',
      installmentCurrent: b.installmentCurrent ? String(b.installmentCurrent) : '',
    })
    setShowForm(true)
  }
  const handleSave = () => {
    const installments = form.installments ? parseInt(form.installments) : undefined
    const installmentCurrent = form.installmentCurrent ? parseInt(form.installmentCurrent) : undefined
    const data = {
      name: form.name, amount: parseFloat(form.amount), dueDay: parseInt(form.dueDay),
      category: form.category, status: editingBill?.status || 'pendente' as BillStatus,
      notes: form.notes, isVariable: form.isVariable,
      installments, installmentCurrent,
    }
    if (editingBill) { updateBill(currentMonthId, editingBill.id, data) } else { addBill(currentMonthId, data) }
    setShowForm(false)
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Summary bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-[#8898aa]">Total do mês</p>
                <p className="text-xl font-mono font-bold text-[#e8ecf4]">{formatBRL(totalActive)}</p>
              </div>
              {overdueTotal > 0 && (
                <div>
                  <p className="text-xs text-[#f06060]">+ Atrasados</p>
                  <p className="text-xl font-mono font-bold text-[#f06060]">{formatBRL(overdueTotal)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#8898aa]">Pago</p>
                <p className="text-xl font-mono font-bold text-[#00d4a0]">{formatBRL(totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-[#8898aa]">Pendente</p>
                <p className="text-xl font-mono font-bold text-[#f5a020]">{formatBRL(grandTotal - totalPaid)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={openAdd} size="sm"><Plus size={14} /> Nova Conta</Button>
            </div>
          </div>
          <Progress value={totalPaid} max={grandTotal} color="#00d4a0" size="md" />
        </CardContent>
      </Card>

      {/* ⚠ Overdue bills */}
      {overdueBills.length > 0 && (
        <div className="rounded-xl border-2 border-[#f06060]/50 bg-[#f06060]/05 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#f06060]/10 border-b border-[#f06060]/30">
            <AlertTriangle size={16} className="text-[#f06060]" />
            <span className="text-sm font-bold text-[#f06060]">Atrasados — pagar em {month.month === 5 ? 'maio' : 'breve'}</span>
            <span className="ml-auto text-sm font-mono text-[#f06060]">{formatBRL(overdueTotal)}</span>
          </div>
          <div className="p-3 space-y-2">
            {overdueBills.map((bill) => {
              const paidFrom = bill.status === 'pago' ? getPaidFromAccount(bill.id, month.bankAccounts) : null
              return (
              <div key={bill.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#f06060]/20 bg-[#0d1117]">
                <button onClick={() => handleOverdueToggle(bill)} className="cursor-pointer shrink-0">
                  <StatusIcon status={bill.status} />
                </button>
                <div className="w-2 h-2 rounded-full shrink-0 bg-[#f06060]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#e8ecf4]">{bill.name}</span>
                    {bill.notes && <span className="text-xs text-[#4a5568]">({bill.notes})</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#4a5568]">{getCategoryLabel(bill.category)}</span>
                    {paidFrom && (
                      <>
                        <span className="text-xs text-[#4a5568]">·</span>
                        <span className="flex items-center gap-1 text-xs">
                          <CreditCard size={10} style={{ color: paidFrom.color }} />
                          <span style={{ color: paidFrom.color }}>{paidFrom.name}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={bill.status} />
                  <span className="text-sm font-mono font-semibold text-[#f06060]">{formatBRL(bill.amount)}</span>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', ...categoryOptions.map(c => c.value)].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterCat === cat ? 'bg-[#00d4a0]/20 text-[#00d4a0] border border-[#00d4a0]/30' : 'bg-[#0d1117] border border-[#1a2030] text-[#8898aa] hover:border-[#243048]'
            }`}
          >
            {cat === 'all' ? 'Todas' : getCategoryLabel(cat as BillCategory)}
          </button>
        ))}
      </div>

      {/* 1st half */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              {isMay2025 ? 'Dias 1–14 (pagar via USDT)' : '1ª Quinzena — Dias 1–14'}
            </CardTitle>
            <span className="text-sm font-mono text-[#3b82f6]">{formatBRL(getBillsFirstHalf(activeBills).reduce((s,b)=>s+b.amount,0))}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {firstHalf.length === 0 && <p className="text-sm text-[#4a5568] py-4 text-center">Nenhuma conta neste período</p>}
          {firstHalf.map((b) => (
            <BillRow key={b.id} bill={b} accounts={month.bankAccounts}
              onEdit={openEdit}
              onDelete={(id) => deleteBill(currentMonthId, id)}
              onToggle={handleToggle}
            />
          ))}
        </CardContent>
      </Card>

      {/* 2nd half */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>
              {isMay2025 ? 'Dias 15–31 (pagar via USDT)' : '2ª Quinzena — Dias 15–31'}
            </CardTitle>
            <span className="text-sm font-mono text-[#26a17b]">{formatBRL(getBillsSecondHalf(activeBills).reduce((s,b)=>s+b.amount,0))}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {secondHalf.length === 0 && <p className="text-sm text-[#4a5568] py-4 text-center">Nenhuma conta neste período</p>}
          {secondHalf.map((b) => (
            <BillRow key={b.id} bill={b} accounts={month.bankAccounts}
              onEdit={openEdit}
              onDelete={(id) => deleteBill(currentMonthId, id)}
              onToggle={handleToggle}
            />
          ))}
        </CardContent>
      </Card>

      {/* Quitados */}
      {quitados.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <button onClick={() => setShowQuitados(!showQuitados)} className="flex items-center justify-between w-full cursor-pointer">
              <CardTitle>Quitados ({quitados.length})</CardTitle>
              <span className="text-xs text-[#4a5568]">{showQuitados ? 'ocultar' : 'mostrar'}</span>
            </button>
          </CardHeader>
          {showQuitados && (
            <CardContent className="space-y-2 pt-2">
              {quitados.map((b) => (
                <BillRow key={b.id} bill={b} accounts={month.bankAccounts}
                  onEdit={openEdit}
                  onDelete={(id) => deleteBill(currentMonthId, id)}
                  onToggle={handleToggle}
                />
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Pay bill dialog */}
      {payingBill && (
        <PayBillDialog
          bill={payingBill}
          accounts={month.bankAccounts}
          onConfirm={(accountId) => {
            payBillFromAccount(currentMonthId, payingBill.id, accountId)
            setPayingBill(null)
          }}
          onClose={() => setPayingBill(null)}
        />
      )}

      {/* Pay overdue bill dialog */}
      {payingOverdue && (
        <PayBillDialog
          bill={payingOverdue}
          accounts={month.bankAccounts}
          onConfirm={(accountId) => {
            payOverdueBillFromAccount(currentMonthId, payingOverdue.id, accountId)
            setPayingOverdue(null)
          }}
          onClose={() => setPayingOverdue(null)}
        />
      )}

      {/* Add/Edit form */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editingBill ? 'Editar Conta' : 'Nova Conta'} size="sm">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Internet" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" prefix="R$" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0,00" />
            <Input label="Dia vencimento" type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="1–31" />
          </div>
          <Select label="Categoria" value={form.category} options={categoryOptions} onChange={(e) => setForm({ ...form, category: e.target.value as BillCategory })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total de parcelas" type="number" min={0} value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} placeholder="Ex: 12 (ou vazio)" />
            <Input label="Parcela atual" type="number" min={1} value={form.installmentCurrent} onChange={(e) => setForm({ ...form, installmentCurrent: e.target.value })} placeholder="Ex: 3" />
          </div>
          <Input label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opcional" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isVar" checked={form.isVariable} onChange={(e) => setForm({ ...form, isVariable: e.target.checked })} className="accent-[#00d4a0]" />
            <label htmlFor="isVar" className="text-sm text-[#8898aa]">Conta variável</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.name || !form.amount || !form.dueDay}>Salvar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
