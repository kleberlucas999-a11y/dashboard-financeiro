'use client'
import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBRL, getDaysInMonth, getCategoryColor } from '@/lib/utils'
import { Bill, BillStatus } from '@/types'
import { ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react'

interface DayEvent {
  id: string
  title: string
  amount?: number
  type: 'entrada' | 'vencimento' | 'pagamento' | 'cdb' | 'info'
  status?: BillStatus
  billId?: string
  isOverdue?: boolean
  color: string
  emoji?: string
}

export function MonthlyCalendar() {
  const { currentMonthId, getCurrentMonth, setBillStatus, setOverdueBillStatus } = useFinanceStore()
  const month = getCurrentMonth()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  if (!month) return null

  const daysInMonth = getDaysInMonth(month.year, month.month)
  const firstDayOfWeek = new Date(month.year, month.month - 1, 1).getDay()

  // Build events map
  const eventsByDay: Record<number, DayEvent[]> = {}

  const addEvent = (day: number, event: DayEvent) => {
    if (!eventsByDay[day]) eventsByDay[day] = []
    eventsByDay[day].push(event)
  }

  // Fixed income day 3, USDT day 15
  if (month.fixedIncome > 0) {
    addEvent(3, { id: 'fixed-income', title: 'Renda Fixa', amount: month.fixedIncome, type: 'entrada', color: '#00d4a0' })
  }
  if (month.usdtSettings.monthlyAmount > 0) {
    addEvent(15, { id: 'usdt-income', title: 'USDT Recebido', amount: month.usdtSettings.monthlyAmount * (month.usdtSettings.convertPercent / 100) * (month.exchangeRate || 5.02), type: 'entrada', color: '#26a17b' })
  }
  // Overdue bills shown on day 15
  ;(month.overdueBills || []).forEach((bill) => {
    if (bill.status === 'quitado') return
    addEvent(15, {
      id: `overdue-${bill.id}`,
      title: `⚠ ${bill.name}`,
      amount: bill.amount,
      type: bill.status === 'pago' ? 'pagamento' : 'vencimento',
      status: bill.status,
      billId: bill.id,
      isOverdue: true,
      color: '#f06060',
      emoji: '⚠',
    })
  })

  // Bills
  month.bills.forEach((bill) => {
    if (bill.status === 'quitado') return
    addEvent(bill.dueDay, {
      id: bill.id,
      title: bill.name,
      amount: bill.amount,
      type: bill.status === 'pago' ? 'pagamento' : 'vencimento',
      status: bill.status,
      billId: bill.id,
      color: getCategoryColor(bill.category),
    })
  })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const today = new Date()
  const isCurrentMonth = month.year === today.getFullYear() && month.month === (today.getMonth() + 1)

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : []

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Entrada', color: '#00d4a0', icon: ArrowDownCircle },
          { label: 'Vencimento', color: '#f5a020', icon: Clock },
          { label: 'Pago', color: '#26a17b', icon: ArrowUpCircle },
        ].map(({ label, color, icon: Icon }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={14} style={{ color }} />
            <span className="text-xs text-[#8898aa]">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="grid grid-cols-7 mb-3">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs text-[#4a5568] py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const events = eventsByDay[day] || []
                const isToday = isCurrentMonth && day === today.getDate()
                const hasEntrada = events.some((e) => e.type === 'entrada')
                const hasVencimento = events.some((e) => e.type === 'vencimento')
                const hasPago = events.some((e) => e.type === 'pagamento')
                const hasCDB = events.some((e) => e.type === 'cdb')
                const hasOverdue = events.some((e) => e.isOverdue)
                const isSelected = selectedDay === day

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`
                      relative flex flex-col items-center py-2 px-1 rounded-xl transition-all cursor-pointer min-h-[60px]
                      ${isSelected ? 'bg-[#00d4a0]/10 border border-[#00d4a0]/30' : 'hover:bg-[#1a2030] border border-transparent'}
                      ${isToday ? 'ring-1 ring-[#00d4a0]/50' : ''}
                    `}
                  >
                    <span className={`text-xs font-medium mb-1 ${isToday ? 'text-[#00d4a0]' : 'text-[#8898aa]'}`}>{day}</span>
                    {events.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {hasEntrada && <div className="w-1.5 h-1.5 rounded-full bg-[#00d4a0]" />}
                        {hasPago && <div className="w-1.5 h-1.5 rounded-full bg-[#26a17b]" />}
                        {hasVencimento && <div className="w-1.5 h-1.5 rounded-full bg-[#f5a020]" />}
                        {hasCDB && <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />}
                        {hasOverdue && <div className="w-1.5 h-1.5 rounded-full bg-[#f06060]" />}
                      </div>
                    )}
                    {events.length > 0 && (
                      <span className="text-[9px] text-[#4a5568] mt-0.5 font-mono">
                        {events.length === 1 && events[0].amount ? `${events[0].amount.toFixed(0)}` : `${events.length}x`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedDay ? `Dia ${selectedDay} de ${month.month < 10 ? '0' : ''}${month.month}` : 'Selecione um dia'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 max-h-[420px] overflow-y-auto">
            {!selectedDay && (
              <p className="text-sm text-[#4a5568] py-8 text-center">Clique em um dia para ver eventos</p>
            )}
            {selectedDay && selectedEvents.length === 0 && (
              <p className="text-sm text-[#4a5568] py-8 text-center">Nenhum evento neste dia</p>
            )}
            {selectedEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl border border-[#1a2030] hover:border-[#243048] transition-colors"
                style={{ borderLeftColor: evt.color, borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#e8ecf4] truncate">{evt.title}</p>
                    <p className="text-xs font-mono text-[#4a5568] mt-0.5">
                      {evt.type === 'entrada' ? '↑ Entrada'
                        : evt.type === 'cdb' ? '🔒 Congelado no CDB'
                        : evt.type === 'info' ? 'ℹ Info'
                        : evt.status === 'pago' ? '✓ Pago'
                        : evt.isOverdue ? '⚠ Atrasado'
                        : '⏱ Pendente'}
                    </p>
                  </div>
                  {evt.amount && (
                    <span className="text-sm font-mono shrink-0" style={{ color: evt.color }}>
                      {formatBRL(evt.amount)}
                    </span>
                  )}
                </div>
                {/* Mark as paid */}
                {evt.billId && evt.status === 'pendente' && !evt.isOverdue && (
                  <button
                    onClick={() => setBillStatus(currentMonthId, evt.billId!, 'pago')}
                    className="mt-2 w-full py-1.5 rounded-lg bg-[#00d4a0]/10 text-[#00d4a0] text-xs font-medium hover:bg-[#00d4a0]/20 transition-colors cursor-pointer"
                  >
                    Marcar como pago
                  </button>
                )}
                {evt.isOverdue && evt.status === 'pendente' && (
                  <button
                    onClick={() => setOverdueBillStatus(currentMonthId, evt.billId!.replace('overdue-', '').replace('overdue-', ''), 'pago')}
                    className="mt-2 w-full py-1.5 rounded-lg bg-[#f06060]/10 text-[#f06060] text-xs font-medium hover:bg-[#f06060]/20 transition-colors cursor-pointer"
                  >
                    Pagar atrasado
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
