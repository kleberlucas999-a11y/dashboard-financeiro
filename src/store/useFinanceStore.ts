'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  Bill, BillStatus, MonthlyData, ExchangeRate, USDTSettings,
  Allocation, AllocationKey, AllocationMovement, USDTConversion, BankTransaction,
  UserProfile, FinancialGoal, AdvisorMessage,
} from '@/types'
import { generateId, getMonthId, parseMonthId } from '@/lib/utils'

// ─── Default bills (normal months) ──────────────────────────────────────────
const DEFAULT_BILLS: Omit<Bill, 'id' | 'status'>[] = [
  { name: 'Água', amount: 200, dueDay: 3, category: 'servico' },
  { name: 'Cartão Principal', amount: 2500, dueDay: 9, category: 'cartao' },
  { name: 'Condomínio', amount: 665, dueDay: 10, category: 'moradia' },
  { name: 'Odontológico', amount: 48.48, dueDay: 15, category: 'saude' },
  { name: 'Aluguel', amount: 1400, dueDay: 20, category: 'moradia' },
  { name: 'Energia', amount: 315, dueDay: 20, category: 'servico', notes: 'Mover vencimento recomendado' },
  { name: 'Plano de Saúde', amount: 846.46, dueDay: 25, category: 'saude' },
  { name: 'Parcela Carro', amount: 1403, dueDay: 25, category: 'transporte' },
  { name: 'Parcela Casa', amount: 2122.76, dueDay: 25, category: 'moradia' },
  { name: 'Internet', amount: 84.99, dueDay: 25, category: 'servico' },
  { name: 'Academia (2x)', amount: 139.98, dueDay: 27, category: 'saude' },
  { name: 'Cartão 2', amount: 580, dueDay: 10, category: 'divida' },
  { name: 'Empréstimo Pessoal', amount: 500, dueDay: 10, category: 'divida' },
  { name: 'Mercado', amount: 1000, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Feiras', amount: 600, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Combustível', amount: 700, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Bebê', amount: 300, dueDay: 15, category: 'variavel', isVariable: true },
]

// ─── May 2025 bills ──────────────────────────────────────────────────────────
const MAY_2025_BILLS: Omit<Bill, 'id' | 'status'>[] = [
  { name: 'Água', amount: 200, dueDay: 3, category: 'servico' },
  { name: 'Cartão Principal', amount: 2000, dueDay: 9, category: 'cartao', notes: 'Teto reduzido em maio para liberar mais USDT para APY' },
  { name: 'Condomínio', amount: 665, dueDay: 10, category: 'moradia' },
  { name: 'Odontológico', amount: 48.48, dueDay: 15, category: 'saude' },
  { name: 'Aluguel', amount: 1400, dueDay: 20, category: 'moradia' },
  { name: 'Energia', amount: 315, dueDay: 20, category: 'servico', notes: 'Mover vencimento recomendado' },
  { name: 'Plano de Saúde', amount: 846.46, dueDay: 25, category: 'saude' },
  { name: 'Parcela Carro', amount: 1403, dueDay: 25, category: 'transporte' },
  { name: 'Parcela Casa', amount: 2122.76, dueDay: 25, category: 'moradia' },
  { name: 'Internet', amount: 84.99, dueDay: 25, category: 'servico' },
  { name: 'Academia (2x)', amount: 139.98, dueDay: 27, category: 'saude' },
  { name: 'Cartão 2', amount: 580, dueDay: 10, category: 'divida' },
  { name: 'Empréstimo Pessoal', amount: 500, dueDay: 10, category: 'divida' },
  { name: 'Mercado', amount: 1000, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Feiras', amount: 600, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Combustível', amount: 700, dueDay: 15, category: 'variavel', isVariable: true },
  { name: 'Bebê', amount: 300, dueDay: 15, category: 'variavel', isVariable: true },
]

// ─── April overdue bills shown in May ───────────────────────────────────────
const APRIL_OVERDUE: Omit<Bill, 'id'>[] = [
  { name: 'Plano de Saúde (abril — atrasado)', amount: 846.46, dueDay: 25, category: 'saude', status: 'pendente', notes: 'Venceu 25/04' },
  { name: 'Odontológico (abril — atrasado)', amount: 48.48, dueDay: 15, category: 'saude', status: 'pendente', notes: 'Venceu 15/04' },
]

const DEFAULT_USDT_SETTINGS: USDTSettings = {
  monthlyAmount: 2988,
  apyPercent: 12,
  convertPercent: 70,
  keepInApyPercent: 30,
  received: false, // começa como não-recebido; usuário confirma quando cair na conta
}

const MAY_2025_USDT: USDTSettings = {
  grossAmount: 4975,
  discount: 967.63,
  discountLabel: 'Viagem (descontado na plataforma)',
  monthlyAmount: 4975 - 967.63,
  apyPercent: 8,
  convertPercent: 70,
  keepInApyPercent: 30,
}

const DEFAULT_ALLOCATION: Allocation = {
  needsPercent: 50, wantsPercent: 30, investPercent: 20,
  needsSpent: 0, wantsSpent: 0, investSpent: 0, movements: [],
}

function createDefaultBankAccounts() {
  return [
    { id: generateId(), name: 'Operacional', type: 'operacional' as const, color: '#00d4a0', initialBalance: 0, transactions: [] },
    { id: generateId(), name: 'USDT / APY', type: 'usdt' as const, color: '#26a17b', initialBalance: 0, transactions: [] },
    { id: generateId(), name: 'Investimento BR', type: 'investimento' as const, color: '#6366f1', initialBalance: 0, transactions: [] },
    { id: generateId(), name: 'Dízimo', type: 'dizimo' as const, color: '#f5a020', initialBalance: 0, transactions: [] },
  ]
}

function createDefaultMonth(year: number, month: number, exchangeRate: number): MonthlyData {
  const id = getMonthId(year, month)
  return {
    id, year, month,
    fixedIncome: 10000,
    fixedIncomeToCDB: false,  // salary stays as available cash; user allocates to CDB manually
    usdtSettings: { ...DEFAULT_USDT_SETTINGS },
    exchangeRate,
    bills: DEFAULT_BILLS.map((b) => ({ ...b, id: generateId(), status: 'pendente' as BillStatus })),
    allocation: { ...DEFAULT_ALLOCATION, movements: [] },
    conversions: [],
    bankAccounts: createDefaultBankAccounts(),
    notes: '',
  }
}

function createMay2025(): MonthlyData {
  return {
    id: '2025-05',
    year: 2025, month: 5,
    fixedIncome: 10000,
    usdtSettings: { ...MAY_2025_USDT },
    exchangeRate: 5.02,
    fixedIncomeToCDB: false,
    bills: MAY_2025_BILLS.map((b) => ({ ...b, id: generateId(), status: 'pendente' as BillStatus })),
    overdueBills: APRIL_OVERDUE.map((b) => ({ ...b, id: generateId() })),
    allocation: { ...DEFAULT_ALLOCATION, movements: [] },
    conversions: [],
    bankAccounts: createDefaultBankAccounts(),
    notes: 'Maio 2025: salário disponível como caixa. Contas pagas via USDT. Desconto $967,63 viagem já aplicado.',
  }
}

// ─── Store interface ─────────────────────────────────────────────────────────
interface FinanceStore {
  months: Record<string, MonthlyData>
  currentMonthId: string
  exchangeRate: ExchangeRate
  sidebarOpen: boolean
  activeSection: string
  userProfile: UserProfile | null

  // Profile & onboarding
  completeOnboarding: (profile: UserProfile) => void
  updateUserProfile: (updates: Partial<UserProfile>) => void
  resetOnboarding: () => void

  // Goals
  addGoal: (goal: Omit<FinancialGoal, 'id' | 'createdAt'>) => void
  updateGoal: (goalId: string, updates: Partial<FinancialGoal>) => void
  deleteGoal: (goalId: string) => void
  updateGoalAmount: (goalId: string, amount: number) => void

  // Advisor chat
  addAdvisorMessage: (message: Omit<AdvisorMessage, 'id' | 'timestamp'>) => void
  clearAdvisorHistory: () => void

  getCurrentMonth: () => MonthlyData | undefined
  setExchangeRate: (rate: number, isManual?: boolean) => void
  setCurrentMonth: (monthId: string) => void
  ensureMonth: (year: number, month: number) => void

  addBill: (monthId: string, bill: Omit<Bill, 'id'>) => void
  updateBill: (monthId: string, billId: string, updates: Partial<Bill>) => void
  deleteBill: (monthId: string, billId: string) => void
  setBillStatus: (monthId: string, billId: string, status: BillStatus) => void
  setOverdueBillStatus: (monthId: string, billId: string, status: BillStatus) => void

  /** Mark a regular bill as paid and create a linked saida transaction on the chosen account */
  payBillFromAccount: (monthId: string, billId: string, accountId: string) => void
  /** Revert a paid bill to pendente and remove its linked transaction from any account */
  unPayBill: (monthId: string, billId: string) => void
  /** Same as payBillFromAccount but for overdue bills */
  payOverdueBillFromAccount: (monthId: string, billId: string, accountId: string) => void
  /** Revert a paid overdue bill to pendente and remove its linked transaction */
  unPayOverdueBill: (monthId: string, billId: string) => void

  updateAccountInitialBalance: (monthId: string, accountId: string, balance: number) => void

  /** Create salary transactions: chosen account +salário, -dízimo; Dízimo +dízimo. CDB é alocado manualmente. */
  registerSalary: (monthId: string, incomeAccountId: string) => void
  /** Remove all salary-linked transactions (undo registerSalary) */
  unregisterSalary: (monthId: string) => void
  /** Returns true if salary transactions are already registered for this month */
  isSalaryRegistered: (monthId: string) => boolean

  updateFixedIncome: (monthId: string, amount: number) => void
  updateMonthExchangeRate: (monthId: string, rate: number) => void

  updateUSDTSettings: (monthId: string, settings: Partial<USDTSettings>) => void
  addConversion: (monthId: string, conversion: Omit<USDTConversion, 'id'>) => void
  deleteConversion: (monthId: string, conversionId: string) => void

  updateAllocationPercents: (monthId: string, needs: number, wants: number, invest: number) => void
  updateAllocationSpent: (monthId: string, key: AllocationKey, amount: number) => void
  moveAllocation: (monthId: string, from: AllocationKey, to: AllocationKey, amount: number, reason: string) => void

  addBankTransaction: (monthId: string, accountId: string, tx: Omit<BankTransaction, 'id'>) => void
  deleteBankTransaction: (monthId: string, accountId: string, txId: string) => void

  setSidebarOpen: (open: boolean) => void
  setActiveSection: (section: string) => void
  updateNotes: (monthId: string, notes: string) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => {
      const may2025 = createMay2025()

      return {
        months: { '2025-05': may2025 },
        currentMonthId: '2025-05',
        exchangeRate: { rate: 5.02, lastUpdated: new Date().toISOString(), isManual: false },
        sidebarOpen: true,
        activeSection: 'overview',
        userProfile: null,

        completeOnboarding: (profile) => set({ userProfile: { ...profile, onboardingComplete: true, onboardingCompletedAt: new Date().toISOString() } }),

        updateUserProfile: (updates) =>
          set((s) => ({ userProfile: s.userProfile ? { ...s.userProfile, ...updates } : null })),

        resetOnboarding: () =>
          set((s) => ({ userProfile: s.userProfile ? { ...s.userProfile, onboardingComplete: false } : null })),

        addGoal: (goal) =>
          set((s) => ({
            userProfile: s.userProfile
              ? { ...s.userProfile, goals: [...s.userProfile.goals, { ...goal, id: generateId(), createdAt: new Date().toISOString() }] }
              : null,
          })),

        updateGoal: (goalId, updates) =>
          set((s) => ({
            userProfile: s.userProfile
              ? { ...s.userProfile, goals: s.userProfile.goals.map((g) => g.id === goalId ? { ...g, ...updates } : g) }
              : null,
          })),

        deleteGoal: (goalId) =>
          set((s) => ({
            userProfile: s.userProfile
              ? { ...s.userProfile, goals: s.userProfile.goals.filter((g) => g.id !== goalId) }
              : null,
          })),

        updateGoalAmount: (goalId, amount) =>
          set((s) => ({
            userProfile: s.userProfile
              ? {
                  ...s.userProfile,
                  goals: s.userProfile.goals.map((g) =>
                    g.id === goalId
                      ? { ...g, currentAmount: amount, completedAt: amount >= g.targetAmount ? new Date().toISOString() : undefined }
                      : g
                  ),
                }
              : null,
          })),

        addAdvisorMessage: (message) =>
          set((s) => ({
            userProfile: s.userProfile
              ? { ...s.userProfile, advisorHistory: [...s.userProfile.advisorHistory, { ...message, id: generateId(), timestamp: new Date().toISOString() }] }
              : null,
          })),

        clearAdvisorHistory: () =>
          set((s) => ({ userProfile: s.userProfile ? { ...s.userProfile, advisorHistory: [] } : null })),

        getCurrentMonth: () => get().months[get().currentMonthId],

        setExchangeRate: (rate, isManual = false) =>
          set({ exchangeRate: { rate, lastUpdated: new Date().toISOString(), isManual } }),

        setCurrentMonth: (monthId) => {
          const { months } = get()
          if (!months[monthId]) {
            const { year, month } = parseMonthId(monthId)
            const newMonth = createDefaultMonth(year, month, get().exchangeRate.rate)
            set((s) => ({ months: { ...s.months, [monthId]: newMonth }, currentMonthId: monthId }))
          } else {
            set({ currentMonthId: monthId })
          }
        },

        ensureMonth: (year, month) => {
          const id = getMonthId(year, month)
          if (!get().months[id]) {
            const newMonth = createDefaultMonth(year, month, get().exchangeRate.rate)
            set((s) => ({ months: { ...s.months, [id]: newMonth } }))
          }
        },

        addBill: (monthId, bill) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], bills: [...s.months[monthId].bills, { ...bill, id: generateId() }] } },
          })),

        updateBill: (monthId, billId, updates) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], bills: s.months[monthId].bills.map((b) => b.id === billId ? { ...b, ...updates } : b) } },
          })),

        deleteBill: (monthId, billId) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], bills: s.months[monthId].bills.filter((b) => b.id !== billId) } },
          })),

        setBillStatus: (monthId, billId, status) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], bills: s.months[monthId].bills.map((b) => b.id === billId ? { ...b, status } : b) } },
          })),

        setOverdueBillStatus: (monthId, billId, status) =>
          set((s) => ({
            months: {
              ...s.months,
              [monthId]: {
                ...s.months[monthId],
                overdueBills: (s.months[monthId].overdueBills || []).map((b) => b.id === billId ? { ...b, status } : b),
              },
            },
          })),

        payBillFromAccount: (monthId, billId, accountId) =>
          set((s) => {
            const month = s.months[monthId]
            const bill = month.bills.find((b) => b.id === billId)
            if (!bill) return s
            const tx: BankTransaction = {
              id: generateId(),
              date: new Date().toISOString().slice(0, 10),
              description: `Pagamento: ${bill.name}`,
              amount: bill.amount,
              type: 'saida',
              linkedBillId: billId,
            }
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  bills: month.bills.map((b) => b.id === billId ? { ...b, status: 'pago' as BillStatus } : b),
                  bankAccounts: month.bankAccounts.map((acc) =>
                    acc.id === accountId ? { ...acc, transactions: [...acc.transactions, tx] } : acc
                  ),
                },
              },
            }
          }),

        unPayBill: (monthId, billId) =>
          set((s) => {
            const month = s.months[monthId]
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  bills: month.bills.map((b) => b.id === billId ? { ...b, status: 'pendente' as BillStatus } : b),
                  // Remove the linked transaction from whichever account holds it
                  bankAccounts: month.bankAccounts.map((acc) => ({
                    ...acc,
                    transactions: acc.transactions.filter((tx) => tx.linkedBillId !== billId),
                  })),
                },
              },
            }
          }),

        payOverdueBillFromAccount: (monthId, billId, accountId) =>
          set((s) => {
            const month = s.months[monthId]
            const bill = (month.overdueBills || []).find((b) => b.id === billId)
            if (!bill) return s
            const tx: BankTransaction = {
              id: generateId(),
              date: new Date().toISOString().slice(0, 10),
              description: `Pagamento: ${bill.name}`,
              amount: bill.amount,
              type: 'saida',
              linkedBillId: billId,
            }
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  overdueBills: (month.overdueBills || []).map((b) => b.id === billId ? { ...b, status: 'pago' as BillStatus } : b),
                  bankAccounts: month.bankAccounts.map((acc) =>
                    acc.id === accountId ? { ...acc, transactions: [...acc.transactions, tx] } : acc
                  ),
                },
              },
            }
          }),

        unPayOverdueBill: (monthId, billId) =>
          set((s) => {
            const month = s.months[monthId]
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  overdueBills: (month.overdueBills || []).map((b) => b.id === billId ? { ...b, status: 'pendente' as BillStatus } : b),
                  bankAccounts: month.bankAccounts.map((acc) => ({
                    ...acc,
                    transactions: acc.transactions.filter((tx) => tx.linkedBillId !== billId),
                  })),
                },
              },
            }
          }),

        isSalaryRegistered: (monthId) => {
          const month = get().months[monthId]
          if (!month) return false
          return month.bankAccounts.some((acc) =>
            acc.transactions.some((tx) => tx.linkedBillId === '__salary__')
          )
        },

        registerSalary: (monthId, incomeAccountId) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s
            const fixedIncome = month.fixedIncome || 10000
            const tithe = Math.round(fixedIncome * 0.1 * 100) / 100
            const date = new Date().toISOString().slice(0, 10)

            const incomeAcc = month.bankAccounts.find((a) => a.id === incomeAccountId)
            const dizimoAcc = month.bankAccounts.find((a) => a.type === 'dizimo')
            if (!incomeAcc || !dizimoAcc) return s

            // Register: salary in + tithe out on chosen account; tithe in on Dízimo.
            // CDB allocation is done manually by the user when they choose.
            const newAccounts = month.bankAccounts.map((acc) => {
              if (acc.id === incomeAcc.id) {
                return {
                  ...acc,
                  transactions: [
                    ...acc.transactions,
                    { id: generateId(), date, description: `Salário — 5º dia útil`, amount: fixedIncome, type: 'entrada' as const, linkedBillId: '__salary__' },
                    { id: generateId(), date, description: `Dízimo 10% — R$${tithe.toFixed(0)}`, amount: tithe, type: 'saida' as const, linkedBillId: '__salary__' },
                  ],
                }
              }
              if (acc.id === dizimoAcc.id) {
                return {
                  ...acc,
                  transactions: [
                    ...acc.transactions,
                    { id: generateId(), date, description: `Dízimo do salário`, amount: tithe, type: 'entrada' as const, linkedBillId: '__salary__' },
                  ],
                }
              }
              return acc
            })

            return {
              months: {
                ...s.months,
                [monthId]: { ...month, bankAccounts: newAccounts },
              },
            }
          }),

        unregisterSalary: (monthId) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  bankAccounts: month.bankAccounts.map((acc) => ({
                    ...acc,
                    transactions: acc.transactions.filter((tx) => tx.linkedBillId !== '__salary__'),
                  })),
                },
              },
            }
          }),

        updateAccountInitialBalance: (monthId, accountId, balance) =>
          set((s) => ({
            months: {
              ...s.months,
              [monthId]: {
                ...s.months[monthId],
                bankAccounts: s.months[monthId].bankAccounts.map((acc) =>
                  acc.id === accountId ? { ...acc, initialBalance: balance } : acc
                ),
              },
            },
          })),

        updateFixedIncome: (monthId, amount) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], fixedIncome: amount } },
          })),

        updateMonthExchangeRate: (monthId, rate) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], exchangeRate: rate } },
          })),

        updateUSDTSettings: (monthId, settings) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], usdtSettings: { ...s.months[monthId].usdtSettings, ...settings } } },
          })),

        addConversion: (monthId, conversion) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], conversions: [...s.months[monthId].conversions, { ...conversion, id: generateId() }] } },
          })),

        deleteConversion: (monthId, conversionId) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], conversions: s.months[monthId].conversions.filter((c) => c.id !== conversionId) } },
          })),

        updateAllocationPercents: (monthId, needs, wants, invest) =>
          set((s) => ({
            months: { ...s.months, [monthId]: { ...s.months[monthId], allocation: { ...s.months[monthId].allocation, needsPercent: needs, wantsPercent: wants, investPercent: invest } } },
          })),

        updateAllocationSpent: (monthId, key, amount) =>
          set((s) => {
            const alloc = s.months[monthId].allocation
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...s.months[monthId],
                  allocation: {
                    ...alloc,
                    needsSpent: key === 'needs' ? amount : alloc.needsSpent,
                    wantsSpent: key === 'wants' ? amount : alloc.wantsSpent,
                    investSpent: key === 'invest' ? amount : alloc.investSpent,
                  },
                },
              },
            }
          }),

        moveAllocation: (monthId, from, to, amount, reason) =>
          set((s) => {
            const alloc = s.months[monthId].allocation
            const movement: AllocationMovement = { id: generateId(), date: new Date().toISOString(), from, to, amount, reason }
            return {
              months: { ...s.months, [monthId]: { ...s.months[monthId], allocation: { ...alloc, movements: [...alloc.movements, movement] } } },
            }
          }),

        addBankTransaction: (monthId, accountId, tx) =>
          set((s) => ({
            months: {
              ...s.months,
              [monthId]: {
                ...s.months[monthId],
                bankAccounts: s.months[monthId].bankAccounts.map((acc) =>
                  acc.id === accountId ? { ...acc, transactions: [...acc.transactions, { ...tx, id: generateId() }] } : acc
                ),
              },
            },
          })),

        deleteBankTransaction: (monthId, accountId, txId) =>
          set((s) => ({
            months: {
              ...s.months,
              [monthId]: {
                ...s.months[monthId],
                bankAccounts: s.months[monthId].bankAccounts.map((acc) =>
                  acc.id === accountId ? { ...acc, transactions: acc.transactions.filter((t) => t.id !== txId) } : acc
                ),
              },
            },
          })),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setActiveSection: (section) => set({ activeSection: section }),

        updateNotes: (monthId, notes) =>
          set((s) => ({ months: { ...s.months, [monthId]: { ...s.months[monthId], notes } } })),
      }
    },
    {
      name: 'finance-dashboard-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
