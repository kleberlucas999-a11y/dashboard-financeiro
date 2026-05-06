'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL, formatUSDT, calcTotalIncome, calcTithe, getMonthLabel } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-[#243048] rounded-xl p-3 text-xs shadow-xl space-y-1">
      <p className="text-[#8898aa] font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}:</span>
          <span>{p.value > 1000 ? formatBRL(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function MonthlyHistory() {
  const { months } = useFinanceStore()

  const sortedMonths = Object.values(months)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

  if (sortedMonths.length <= 1) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <p className="text-[#4a5568] text-sm">Histórico disponível após 2+ meses de dados</p>
          <p className="text-xs text-[#4a5568] mt-1">Navegue pelos meses anteriores para criar dados</p>
        </div>
      </div>
    )
  }

  const chartData = sortedMonths.map((m) => {
    const totalIncome = calcTotalIncome(m)
    const tithe = calcTithe(totalIncome)
    const totalBills = m.bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0)
    const freeBalance = Math.max(0, totalIncome - tithe - totalBills)
    const usdtInAPY = m.usdtSettings.monthlyAmount * (m.usdtSettings.keepInApyPercent / 100)

    return {
      mes: getMonthLabel(m.year, m.month).split(' ')[0],
      'Renda Total': Math.round(totalIncome),
      'Saldo Livre': Math.round(freeBalance),
      'Dízimo': Math.round(tithe),
      'Total Contas': Math.round(totalBills),
      'USDT APY': Math.round(usdtInAPY),
    }
  })

  const totals = sortedMonths.map((m, i) => ({
    month: getMonthLabel(m.year, m.month),
    income: calcTotalIncome(m),
    bills: m.bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0),
    tithe: calcTithe(calcTotalIncome(m)),
    usdtInAPY: m.usdtSettings.monthlyAmount * (m.usdtSettings.keepInApyPercent / 100),
    conversions: m.conversions.length,
  }))

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Area chart - free balance evolution */}
      <Card>
        <CardHeader><CardTitle>Evolução do Saldo Livre</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4a0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00d4a0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Renda Total" stroke="#3b82f6" fill="url(#incomeGrad)" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                <Area type="monotone" dataKey="Saldo Livre" stroke="#00d4a0" fill="url(#balanceGrad)" strokeWidth={2} dot={{ fill: '#00d4a0', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bar chart - bills and tithe */}
      <Card>
        <CardHeader><CardTitle>Contas × Dízimo × Saldo Livre</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2030" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#8898aa' }} />
                <Bar dataKey="Total Contas" fill="#f06060" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="Dízimo" fill="#f5a020" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="Saldo Livre" fill="#00d4a0" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Month comparison table */}
      <Card>
        <CardHeader><CardTitle>Comparativo Mensal</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a2030]">
                  {['Mês', 'Renda Total', 'Contas', 'Dízimo', 'USDT APY', 'Conversões'].map((h) => (
                    <th key={h} className="text-left text-xs text-[#4a5568] uppercase tracking-wider py-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totals.map((row, i) => (
                  <tr key={i} className="border-b border-[#0d1117] hover:bg-[#1a2030]/30 transition-colors">
                    <td className="py-3 pr-4 text-[#8898aa] capitalize whitespace-nowrap">{row.month}</td>
                    <td className="py-3 pr-4 font-mono text-[#00d4a0]">{formatBRL(row.income)}</td>
                    <td className="py-3 pr-4 font-mono text-[#f06060]">{formatBRL(row.bills)}</td>
                    <td className="py-3 pr-4 font-mono text-[#f5a020]">{formatBRL(row.tithe)}</td>
                    <td className="py-3 pr-4 font-mono text-[#6366f1]">{formatUSDT(row.usdtInAPY)}</td>
                    <td className="py-3 pr-4 font-mono text-[#8898aa]">{row.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
