'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  formatBRL, formatUSDT, calcUSDTNet, calcMinUSDTToConvert, calcFreeBalance,
} from '@/lib/utils'
import { BillStatus } from '@/types'
import {
  AlertTriangle, CheckCircle2, Circle, TrendingUp, Target,
} from 'lucide-react'

function OverdueRow({ bill, onToggle }: { bill: { id: string; name: string; amount: number; status: BillStatus; notes?: string }; onToggle: () => void }) {
  const paid = bill.status === 'pago' || bill.status === 'quitado'
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${paid ? 'opacity-40 border-[#1a2030]' : 'border-[#f06060]/30 bg-[#f06060]/05'}`}>
      <button onClick={onToggle} className="cursor-pointer shrink-0">
        {paid ? <CheckCircle2 size={16} className="text-[#00d4a0]" /> : <Circle size={16} className="text-[#f06060]" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e8ecf4] truncate">{bill.name}</p>
        {bill.notes && <p className="text-xs text-[#4a5568]">{bill.notes}</p>}
      </div>
      <span className={`text-sm font-mono font-semibold ${paid ? 'text-[#4a5568] line-through' : 'text-[#f06060]'}`}>{formatBRL(bill.amount)}</span>
    </div>
  )
}

export function PlanningWidget() {
  const { currentMonthId, getCurrentMonth, setOverdueBillStatus } = useFinanceStore()
  const month = getCurrentMonth()
  if (!month) return null

  const rate = month.exchangeRate || 5.02
  const usdtNet = calcUSDTNet(month)
  const overdueBills = month.overdueBills || []
  const overduePending = overdueBills.filter(b => b.status !== 'pago' && b.status !== 'quitado')
  const overdueTotal = overduePending.reduce((s, b) => s + b.amount, 0)
  const allBillsBRL = month.bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0)
  const minToConvert = calcMinUSDTToConvert(month)
  const usdtForBills = (allBillsBRL + overdueTotal) / rate
  const usdtRemaining = usdtNet - usdtForBills
  const freeBalance = calcFreeBalance(month)
  const paidBills = month.bills.filter(b => b.status === 'pago').length
  const totalBills = month.bills.length

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── USDT Breakdown ──────────────────────────────────────────────── */}
      {usdtNet > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target size={16} className="text-[#26a17b]" />
              Cálculo USDT — quanto converter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'USDT líquido', value: formatUSDT(usdtNet), color: '#26a17b' },
                { label: '− Contas + atrasados', value: formatUSDT(usdtForBills), color: '#f06060' },
                { label: '= Saldo livre', value: formatUSDT(Math.max(0, usdtRemaining)), color: '#00d4a0' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
                  <p className="text-xs text-[#4a5568]">{label}</p>
                  <p className="text-sm font-mono font-bold mt-1" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00d4a0]/08 border border-[#00d4a0]/25">
              <TrendingUp size={16} className="text-[#00d4a0] shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-[#8898aa]">Mínimo a converter para cobrir tudo</p>
                <p className="text-lg font-mono font-bold text-[#00d4a0]">{formatUSDT(minToConvert)}</p>
                <p className="text-xs text-[#4a5568]">({formatBRL(minToConvert * rate)}) · inclui margem de $60</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#4a5568]">Saldo livre em BRL</p>
                <p className="text-base font-mono font-bold text-[#00d4a0]">{formatBRL(freeBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Overdue checklist ────────────────────────────────────────────── */}
      {overdueBills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f06060]" />
                Contas em atraso
              </CardTitle>
              <span className="text-sm font-mono text-[#f06060]">{formatBRL(overdueTotal)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueBills.map((bill) => (
              <OverdueRow
                key={bill.id}
                bill={bill}
                onToggle={() => setOverdueBillStatus(currentMonthId, bill.id, bill.status === 'pendente' ? 'pago' : 'pendente')}
              />
            ))}
            {overduePending.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00d4a0]/10 border border-[#00d4a0]/25">
                <CheckCircle2 size={16} className="text-[#00d4a0]" />
                <span className="text-sm text-[#00d4a0] font-medium">Todos os atrasados quitados!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Progress summary ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Progresso do mês</CardTitle>
            <Badge variant={paidBills === totalBills ? 'green' : 'amber'}>{paidBills}/{totalBills} contas pagas</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={paidBills} max={totalBills} color="#00d4a0" size="md" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <p className="text-xs text-[#4a5568]">Contas pagas</p>
              <p className="text-lg font-mono font-bold text-[#00d4a0]">{paidBills}</p>
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <p className="text-xs text-[#4a5568]">Pendentes</p>
              <p className="text-lg font-mono font-bold text-[#f5a020]">{totalBills - paidBills}</p>
            </div>
            <div className="bg-[#0d1117] rounded-xl border border-[#1a2030] p-3">
              <p className="text-xs text-[#4a5568]">Atrasados</p>
              <p className="text-lg font-mono font-bold text-[#f06060]">{overduePending.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
