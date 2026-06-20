export type BillCategory = 'moradia' | 'saude' | 'servico' | 'transporte' | 'cartao' | 'divida' | 'variavel'
export type BillStatus = 'pendente' | 'pago' | 'quitado'
export type AccountType = 'operacional' | 'usdt' | 'investimento'
export type AllocationKey = 'needs' | 'wants' | 'invest'

// ─── User profile types ──────────────────────────────────────────────────────
export type RiskProfile = 'conservador' | 'moderado' | 'arrojado'
export type BudgetMethod = '50-30-20' | '70-20-10' | '60-20-20' | 'personalizado'
export type ExperienceLevel = 'iniciante' | 'intermediario' | 'avancado'
export type AdvisorTone = 'tecnico' | 'motivacional' | 'balanceado'
export type GoalType = 'emergencia' | 'divida' | 'compra' | 'independencia' | 'alavancagem' | 'negocio'

export interface FinancialGoal {
  id: string
  type: GoalType
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  priority: number           // 1 = highest priority
  notes?: string
  createdAt: string
  completedAt?: string
}

export interface AdvisorMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface UserProfile {
  name: string
  riskProfile: RiskProfile
  budgetMethod: BudgetMethod
  customNeeds?: number
  customWants?: number
  customInvest?: number
  experience: ExperienceLevel
  advisorTone: AdvisorTone
  hasEmergencyFund: boolean
  emergencyFundMonths: number
  estimatedTotalDebt: number
  goals: FinancialGoal[]
  advisorHistory: AdvisorMessage[]
  onboardingComplete: boolean
  onboardingCompletedAt?: string
}

// ─── Bill types ──────────────────────────────────────────────────────────────
export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  category: BillCategory
  status: BillStatus
  notes?: string
  isVariable?: boolean
  installments?: number
  installmentCurrent?: number
  isCreditCardFatura?: boolean  // auto-generated invoice from previous month's CC expenses
  faturaSourceMonth?: string    // monthId (YYYY-MM) whose CC expenses compose this bill
}

export interface USDTConversion {
  id: string
  date: string
  usdtAmount: number
  brlAmount: number
  rate: number
  description: string
}

export interface AllocationMovement {
  id: string
  date: string
  from: AllocationKey
  to: AllocationKey
  amount: number
  reason: string
}

export interface Allocation {
  needsPercent: number
  wantsPercent: number
  investPercent: number
  needsSpent: number
  wantsSpent: number
  investSpent: number
  movements: AllocationMovement[]
}

export interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'entrada' | 'saida'
  linkedBillId?: string
}

export interface BankAccount {
  id: string
  name: string
  type: AccountType
  color: string
  initialBalance: number
  transactions: BankTransaction[]
}

export interface USDTSettings {
  monthlyAmount: number
  grossAmount?: number
  discount?: number
  discountLabel?: string
  apyPercent: number
  convertPercent: number
  keepInApyPercent: number
  /** false = ainda não recebi; cálculos ignoram USDT. Default: true */
  received?: boolean
}

export type DailyExpenseCategory = 'alimentacao' | 'transporte' | 'lazer' | 'saude' | 'servico' | 'compras' | 'outro'
export type DailyExpenseConta = 'operacional' | 'usdt' | 'cartao_credito'
export type DailyExpenseTipo = 'custo' | 'lazer' | 'investimento'

export interface DailyExpense {
  id: string
  date: string           // YYYY-MM-DD
  description: string
  amount: number         // always in native currency (USDT for usdt, BRL otherwise)
  category: DailyExpenseCategory
  conta: DailyExpenseConta
  tipo?: DailyExpenseTipo  // custo = Despesas, lazer = Lazer, investimento = Investimentos
  notes?: string
}

export interface MonthlyData {
  id: string
  year: number
  month: number
  fixedIncome: number
  usdtSettings: USDTSettings
  exchangeRate: number
  bills: Bill[]
  overdueBills?: Bill[]
  dailyExpenses?: DailyExpense[]
  fixedIncomeToCDB?: boolean
  allocation: Allocation
  allocationActive?: boolean   // user manually activates when ready to allocate
  conversions: USDTConversion[]
  bankAccounts: BankAccount[]
  notes: string
}

export interface ExchangeRate {
  rate: number
  lastUpdated: string
  isManual: boolean
}

export interface CalendarEvent {
  id: string
  date: string
  title: string
  amount: number
  type: 'entrada' | 'vencimento' | 'pagamento'
  billId?: string
  status?: BillStatus
}
