import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Bill, BillCategory, MonthlyData } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatUSDT(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getCurrentMonthId(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseMonthId(id: string): { year: number; month: number } {
  const [year, month] = id.split('-').map(Number)
  return { year, month }
}

export function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function getCategoryLabel(category: BillCategory): string {
  const labels: Record<BillCategory, string> = {
    moradia: 'Moradia', saude: 'Saúde', servico: 'Serviço',
    transporte: 'Transporte', cartao: 'Cartão', divida: 'Dívida', variavel: 'Variável',
  }
  return labels[category]
}

export function getCategoryColor(category: BillCategory): string {
  const colors: Record<BillCategory, string> = {
    moradia: '#6366f1', saude: '#ec4899', servico: '#f5a020',
    transporte: '#3b82f6', cartao: '#f06060', divida: '#ef4444', variavel: '#8b5cf6',
  }
  return colors[category]
}

export function getBillsFirstHalf(bills: Bill[]): Bill[] {
  return bills.filter((b) => b.dueDay <= 14)
}

export function getBillsSecondHalf(bills: Bill[]): Bill[] {
  return bills.filter((b) => b.dueDay > 14)
}

export function calcUSDTInBRL(usdtAmount: number, rate: number): number {
  return usdtAmount * rate
}

/** Net USDT for the month. Returns 0 if not yet received. */
export function calcUSDTNet(data: MonthlyData): number {
  const s = data.usdtSettings
  // received === false means user hasn't received it yet → exclude from calculations
  if (s.received === false) return 0
  return s.monthlyAmount
}

/** Total income received in BRL (fixed + full USDT — not filtered by convertPercent) */
export function calcTotalIncome(data: MonthlyData): number {
  const rate = data.exchangeRate || 5.02
  const usdtNet = calcUSDTNet(data)
  const usdtBRL = calcUSDTInBRL(usdtNet, rate)
  return data.fixedIncome + usdtBRL
}

/**
 * Returns the amount of fixed income available for bills.
 * 0 when fixedIncomeToCDB is true (salary goes directly to CDB).
 */
export function calcFixedIncomeForBills(data: MonthlyData): number {
  return data.fixedIncomeToCDB ? 0 : data.fixedIncome
}

/**
 * Minimum USDT to convert = (all bills + overdue) in BRL / rate + $60 margin
 */
export function calcMinUSDTToConvert(data: MonthlyData): number {
  const rate = data.exchangeRate || 5.02
  const allBillsBRL = data.bills
    .filter((b) => b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const overdueBRL = (data.overdueBills || [])
    .filter((b) => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const totalBRL = allBillsBRL + (data.fixedIncomeToCDB ? overdueBRL : overdueBRL)
  return (totalBRL / rate) + 60
}

/**
 * Free balance available for 50-30-20 allocation.
 * = total income − all active bills − overdue pending
 */
export function calcFreeBalance(data: MonthlyData): number {
  const totalIncome = calcTotalIncome(data)
  const totalBills = data.bills
    .filter((b) => b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  const overdueUnpaid = (data.overdueBills || [])
    .filter((b) => b.status !== 'pago' && b.status !== 'quitado')
    .reduce((s, b) => s + b.amount, 0)
  return totalIncome - totalBills - overdueUnpaid
}

export function calcMonthlyAPYReturn(usdtAmount: number, apyPercent: number): number {
  return usdtAmount * (apyPercent / 100) / 12
}

export function calcAPYProjection(usdtAmount: number, apyPercent: number, months: number): number {
  const monthlyRate = apyPercent / 100 / 12
  return usdtAmount * Math.pow(1 + monthlyRate, months) - usdtAmount
}

export function getBillDiagnosis(bill: Bill): 'otimo' | 'atencao' | 'mover' {
  if (bill.category === 'servico' && bill.dueDay >= 15 && bill.dueDay <= 22) return 'mover'
  if (bill.dueDay <= 5 || (bill.dueDay >= 15 && bill.dueDay <= 25)) return 'otimo'
  return 'atencao'
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
