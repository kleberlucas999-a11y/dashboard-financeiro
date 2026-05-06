'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  formatBRL, formatUSDT, calcUSDTNet, calcMinUSDTToConvert, calcFreeBalance,
  calcTithe, calcUSDTInBRL,
} from '@/lib/utils'
import { BillStatus } from '@/types'
import {
  AlertTriangle, CheckCircle2, Circle, TrendingUp, Banknote, ArrowRight,
  Info, Lightbulb, Target,
} from 'lucide-react'

function Step({ num, label, detail, done, accent = '#00d4a0' }: {
  num: number; label: string; detail: string; done?: boolean; accent?: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border"
          style={done
            ? { background: `${accent}22`, borderColor: `${accent}55`, color: accent }
            : { background: '#1a2030', borderColor: '#243048', color: '#8898aa' }
          }
        >
          {done ? <CheckCircle2 size={14} style={{ color: accent }} /> : num}
        </div>
        <div className="w-px flex-1 mt-1" style={{ background: done ? `${accent}40` : '#1a2030' }} />
      </div>
      <div className="pb-5 pt-0.5 min-w-0">
        <p className="text-sm font-semibold text-[#e8ecf4]">{label}</p>
        <p className="text-xs text-[#4a5568] mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  )
}

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

  const isMay2025 = month.id === '2025-05'
  const rate = month.exchangeRate || 5.02
  const usdtNet = calcUSDTNet(month)
  const overdueBills = month.overdueBills || []
  const overduePending = overdueBills.filter(b => b.status !== 'pago' && b.status !== 'quitado')
  const overdueTotal = overduePending.reduce((s, b) => s + b.amount, 0)
  const allBillsBRL = month.bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0)
  const minToConvert = calcMinUSDTToConvert(month)
  const usdtTithe = calcTithe(usdtNet)
  const usdtForBills = (allBillsBRL + overdueTotal) / rate
  const usdtRemaining = usdtNet - usdtTithe - usdtForBills
  const freeBalance = calcFreeBalance(month)
  const paidBills = month.bills.filter(b => b.status === 'pago').length
  const totalBills = month.bills.length

  if (!isMay2025) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Lightbulb size={40} className="text-[#f5a020]/40" />
        <p className="text-[#4a5568] text-sm text-center max-w-sm">
          O planejamento estratégico fica disponível quando há insights específicos para o mês. Ajuste os dados do mês atual para habilitar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#f06060]/10 border border-[#f06060]/30">
          <AlertTriangle size={16} className="text-[#f06060] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#f06060]">Plano de Saúde e Odontológico de abril em atraso</p>
            <p className="text-xs text-[#8898aa] mt-0.5">{formatBRL(846.46 + 48.48)} pendentes — pagar em maio antes do dia 15</p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#f5a020]/10 border border-[#f5a020]/30">
          <AlertTriangle size={16} className="text-[#f5a020] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#f5a020]">Mês especial — todo o fixo vai para CDB</p>
            <p className="text-xs text-[#8898aa] mt-0.5">R$10.000 → dízimo R$1.000 → CDB R$9.000 · todas as contas pagas via USDT</p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/30">
          <Info size={16} className="text-[#6366f1] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#6366f1]">Desconto $967,63 de viagem já aplicado no USDT</p>
            <p className="text-xs text-[#8898aa] mt-0.5">Bruto ${(4975).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} − $967,63 = líquido {formatUSDT(usdtNet)}</p>
          </div>
        </div>
      </div>

      {/* ── USDT Breakdown ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target size={16} className="text-[#26a17b]" />
            Cálculo USDT — quanto converter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'USDT líquido', value: formatUSDT(usdtNet), color: '#26a17b' },
              { label: '− Dízimo (10%)', value: formatUSDT(usdtTithe), color: '#f5a020' },
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

      {/* ── CDB Flow ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Banknote size={16} className="text-[#6366f1]" />
            Fluxo CDB — Renda Fixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Salário R$10.000', color: '#e8ecf4', bg: '#1a2030' },
              { label: '→', color: '#4a5568', bg: 'transparent', noBorder: true },
              { label: 'Dízimo R$1.000', color: '#f5a020', bg: '#f5a020/10' },
              { label: '→', color: '#4a5568', bg: 'transparent', noBorder: true },
              { label: 'CDB R$9.000', color: '#6366f1', bg: '#6366f1/10' },
            ].map(({ label, color, bg, noBorder }, i) => (
              <div
                key={i}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${noBorder ? '' : 'border'}`}
                style={noBorder ? { color } : { color, background: bg.includes('/') ? undefined : bg, borderColor: `${color}40` }}
              >
                {noBorder ? label : label}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#4a5568] mt-3">Renda fixa 100% alocada em CDB. Todas as contas de maio pagas com USDT convertido.</p>
        </CardContent>
      </Card>

      {/* ── Payment Priority Timeline ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ArrowRight size={16} className="text-[#00d4a0]" />
            Ordem de pagamento — maio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            <Step num={1} label="Converter mínimo de USDT" detail={`Converter pelo menos ${formatUSDT(minToConvert)} (≈ ${formatBRL(minToConvert * rate)}) para cobrir todas as contas`} done={false} />
            <Step num={2} label="Pagar atrasados de abril" detail={`Plano de Saúde R$846,46 + Odontológico R$48,48 = ${formatBRL(894.94)} — prioridade máxima`} done={overduePending.length === 0} accent="#f06060" />
            <Step num={3} label="Pagar contas da 1ª quinzena (dias 1–14)" detail="Água, Cartão Principal R$2.000, Condomínio, Odontológico, Cartão 2, Empréstimo" done={month.bills.filter(b => b.dueDay <= 14 && b.status !== 'pendente').length === month.bills.filter(b => b.dueDay <= 14).length} />
            <Step num={4} label="Separar dízimo do USDT" detail={`${formatUSDT(usdtTithe)} (10% de ${formatUSDT(usdtNet)}) — conta dízimo`} done={false} accent="#f5a020" />
            <Step num={5} label="Pagar contas da 2ª quinzena (dias 15–31)" detail="Aluguel, Energia, Plano de Saúde, Parcela Carro, Parcela Casa, Internet, Academia e variáveis" done={month.bills.filter(b => b.dueDay > 14 && b.status !== 'pendente').length === month.bills.filter(b => b.dueDay > 14).length} />
            <Step num={6} label="Alocar saldo livre 50-30-20" detail={`${formatBRL(freeBalance)} disponível · Necessidades ${formatBRL(freeBalance * 0.5)} · Desejos ${formatBRL(freeBalance * 0.3)} · Investimento ${formatBRL(freeBalance * 0.2)}`} done={false} />
          </div>
        </CardContent>
      </Card>

      {/* ── Overdue checklist ────────────────────────────────────────────── */}
      {overdueBills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#f06060]" />
                Atrasados de abril
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
            <CardTitle>Progresso de maio</CardTitle>
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
