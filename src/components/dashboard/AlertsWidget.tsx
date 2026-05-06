'use client'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL, calcTotalIncome, calcTotalTithe, calcUSDTInBRL, calcFreeBalance } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, TrendingUp, AlertCircle, Info, Bell } from 'lucide-react'

type AlertLevel = 'info' | 'warning' | 'critical' | 'success'

interface Alert {
  id: string
  title: string
  description: string
  level: AlertLevel
  action?: string
}

const levelConfig: Record<AlertLevel, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  info: { color: '#3b82f6', bg: '#3b82f6/10', border: '#3b82f6/20', icon: Info },
  warning: { color: '#f5a020', bg: '#f5a020/10', border: '#f5a020/20', icon: AlertTriangle },
  critical: { color: '#f06060', bg: '#f06060/10', border: '#f06060/20', icon: AlertCircle },
  success: { color: '#00d4a0', bg: '#00d4a0/10', border: '#00d4a0/20', icon: CheckCircle2 },
}

export function AlertsWidget() {
  const { getCurrentMonth, months, exchangeRate } = useFinanceStore()
  const month = getCurrentMonth()

  if (!month) return null

  const totalIncome = calcTotalIncome(month)
  const tithe = calcTotalTithe(month)
  const totalBills = month.bills.filter(b => b.status !== 'quitado').reduce((s, b) => s + b.amount, 0)
  const freeBalance = calcFreeBalance(month)
  const rate = month.exchangeRate || exchangeRate.rate

  const allMonths = Object.values(months)
  const avgCartao = allMonths.length > 1
    ? allMonths.reduce((s, m) => {
        const cartao = m.bills.filter(b => b.category === 'cartao').reduce((ss, b) => ss + b.amount, 0)
        return s + cartao
      }, 0) / allMonths.length
    : 0

  const currentCartao = month.bills.filter(b => b.category === 'cartao').reduce((s, b) => s + b.amount, 0)

  const alerts: Alert[] = []

  // Free balance alert
  if (freeBalance < 5000) {
    alerts.push({
      id: 'low-balance',
      level: 'critical',
      title: 'Saldo livre abaixo de R$ 5.000',
      description: `Saldo livre atual: ${formatBRL(freeBalance)}. Revise seus gastos ou alocações.`,
      action: 'Revisar alocação',
    })
  } else if (freeBalance < 8000) {
    alerts.push({
      id: 'medium-balance',
      level: 'warning',
      title: 'Saldo livre abaixo de R$ 8.000',
      description: `Saldo livre atual: ${formatBRL(freeBalance)}. Fique atento.`,
    })
  } else {
    alerts.push({
      id: 'good-balance',
      level: 'success',
      title: 'Saldo livre saudável',
      description: `Saldo livre de ${formatBRL(freeBalance)} está acima do recomendado.`,
    })
  }

  // Cartão acima da média
  if (avgCartao > 0 && currentCartao > avgCartao * 1.2) {
    alerts.push({
      id: 'card-above-avg',
      level: 'warning',
      title: 'Fatura do cartão acima da média',
      description: `Fatura atual ${formatBRL(currentCartao)} vs média histórica ${formatBRL(avgCartao)} (+${(((currentCartao - avgCartao) / avgCartao) * 100).toFixed(0)}%).`,
    })
  }

  // Taxa de câmbio favorável (> 5.90)
  if (rate > 5.9) {
    const extra = calcUSDTInBRL(month.usdtSettings.monthlyAmount * 0.1, rate - 5.7)
    alerts.push({
      id: 'favorable-rate',
      level: 'info',
      title: 'Câmbio favorável para conversão',
      description: `USD/BRL em ${rate.toFixed(4)} — converter 10% a mais rende ~${formatBRL(extra)} extra este mês.`,
      action: 'Ver USDT',
    })
  } else if (rate < 5.5) {
    alerts.push({
      id: 'unfavorable-rate',
      level: 'warning',
      title: 'Câmbio desfavorável',
      description: `USD/BRL em ${rate.toFixed(4)} — considere manter mais USDT em APY e converter menos.`,
    })
  }

  // Energia vencimento 20 - mover recomendação
  const energiaBill = month.bills.find(b => b.name.toLowerCase().includes('energia'))
  if (energiaBill && energiaBill.dueDay >= 16 && energiaBill.dueDay <= 22) {
    alerts.push({
      id: 'energia-vencimento',
      level: 'warning',
      title: 'Recomendação: mover vencimento da Energia',
      description: `Conta de energia vence dia ${energiaBill.dueDay}. Mover para dia 5–10 melhora previsibilidade da 1ª quinzena.`,
    })
  }

  // Bills pendentes próximas do vencimento
  const today = new Date()
  const isCurrentMonth = month.year === today.getFullYear() && month.month === (today.getMonth() + 1)
  if (isCurrentMonth) {
    const soonBills = month.bills.filter(b => {
      if (b.status !== 'pendente') return false
      const daysUntil = b.dueDay - today.getDate()
      return daysUntil >= 0 && daysUntil <= 3
    })
    if (soonBills.length > 0) {
      alerts.push({
        id: 'bills-soon',
        level: 'warning',
        title: `${soonBills.length} conta(s) vencem nos próximos 3 dias`,
        description: soonBills.map(b => `${b.name} (dia ${b.dueDay} — ${formatBRL(b.amount)})`).join(', '),
      })
    }
  }

  // Dízimo não alocado
  const dizimoAccount = month.bankAccounts.find(a => a.type === 'dizimo')
  const dizimoBalance = dizimoAccount?.transactions.reduce((s, t) => t.type === 'entrada' ? s + t.amount : s - t.amount, 0) || 0
  if (dizimoBalance < tithe * 0.5) {
    alerts.push({
      id: 'dizimo-low',
      level: 'info',
      title: 'Dízimo pendente de alocação',
      description: `${formatBRL(tithe - dizimoBalance)} ainda não foi transferido para a conta de dízimo.`,
    })
  }

  // All bills paid
  const pendentes = month.bills.filter(b => b.status === 'pendente').length
  if (pendentes === 0 && month.bills.length > 0) {
    alerts.push({
      id: 'all-paid',
      level: 'success',
      title: 'Todas as contas estão pagas!',
      description: 'Excelente! Nenhuma conta pendente neste mês.',
    })
  }

  const critical = alerts.filter(a => a.level === 'critical')
  const warnings = alerts.filter(a => a.level === 'warning')
  const infos = alerts.filter(a => a.level === 'info')
  const successes = alerts.filter(a => a.level === 'success')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Críticos', count: critical.length, color: '#f06060' },
          { label: 'Avisos', count: warnings.length, color: '#f5a020' },
          { label: 'Info', count: infos.length, color: '#3b82f6' },
          { label: 'OK', count: successes.length, color: '#00d4a0' },
        ].map((item) => (
          <Card key={item.label} className={`${item.count > 0 && item.label !== 'OK' ? 'border-opacity-50' : ''}`} style={{ borderColor: item.count > 0 ? item.color + '30' : undefined }}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-mono font-bold" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs text-[#8898aa] mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {alerts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell size={32} className="text-[#4a5568] mx-auto mb-3" />
              <p className="text-[#4a5568] text-sm">Nenhum alerta no momento</p>
            </CardContent>
          </Card>
        )}

        {[...critical, ...warnings, ...infos, ...successes].map((alert) => {
          const cfg = levelConfig[alert.level]
          const Icon = cfg.icon

          return (
            <div
              key={alert.id}
              className="flex items-start gap-4 p-4 rounded-xl border transition-colors hover:border-opacity-50"
              style={{ borderColor: cfg.color + '30', background: cfg.color + '08' }}
            >
              <div className="p-2 rounded-xl shrink-0 mt-0.5" style={{ background: cfg.color + '20' }}>
                <Icon size={16} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#e8ecf4]">{alert.title}</p>
                  <Badge variant={alert.level === 'critical' ? 'red' : alert.level === 'warning' ? 'amber' : alert.level === 'success' ? 'green' : 'blue'}>
                    {alert.level}
                  </Badge>
                </div>
                <p className="text-xs text-[#8898aa] mt-1 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
