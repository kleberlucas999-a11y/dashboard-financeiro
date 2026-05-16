'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  Bill, BillStatus, MonthlyData, ExchangeRate, USDTSettings,
  Allocation, AllocationKey, AllocationMovement, USDTConversion, BankTransaction,
  UserProfile, FinancialGoal, AdvisorMessage, BankAccount, DailyExpense,
} from '@/types'
import { generateId, getMonthId, parseMonthId } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

// ─── New users start with empty bills — they add their own ──────────────────

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

function createDefaultBankAccounts(hasTithe = false): BankAccount[] {
  const accounts: BankAccount[] = [
    { id: generateId(), name: 'Operacional', type: 'operacional', color: '#00d4a0', initialBalance: 0, transactions: [] },
    { id: generateId(), name: 'USDT / APY', type: 'usdt', color: '#26a17b', initialBalance: 0, transactions: [] },
    { id: generateId(), name: 'Investimento BR', type: 'investimento', color: '#6366f1', initialBalance: 0, transactions: [] },
  ]
  if (hasTithe) {
    accounts.push({ id: generateId(), name: 'Dízimo', type: 'dizimo', color: '#f5a020', initialBalance: 0, transactions: [] })
  }
  return accounts
}

function createDefaultMonth(year: number, month: number, exchangeRate: number): MonthlyData {
  const id = getMonthId(year, month)
  return {
    id, year, month,
    fixedIncome: 0,
    fixedIncomeToCDB: false,
    usdtSettings: { ...DEFAULT_USDT_SETTINGS },
    exchangeRate,
    bills: [],
    allocation: { ...DEFAULT_ALLOCATION, movements: [] },
    conversions: [],
    bankAccounts: createDefaultBankAccounts(),
    notes: '',
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

  // Auth / sync
  userId: string | null
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'
  loadFromSupabase: (userId: string, data: Partial<FinanceStore>) => void
  syncToSupabase: () => Promise<void>
  logout: () => void

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

  importExpenses: (monthId: string, rows: ImportRow[]) => void

  // Daily expenses
  addDailyExpense: (monthId: string, expense: Omit<DailyExpense, 'id'>) => void
  updateDailyExpense: (monthId: string, expenseId: string, updates: Partial<DailyExpense>) => void
  deleteDailyExpense: (monthId: string, expenseId: string) => void

  setSidebarOpen: (open: boolean) => void
  setActiveSection: (section: string) => void
  updateNotes: (monthId: string, notes: string) => void
}

export interface ImportRow {
  date: string        // YYYY-MM-DD
  description: string
  amount: number
  category: import('@/types').BillCategory
  tipo: 'custo' | 'lazer' | 'investimento'
  conta: 'operacional' | 'usdt' | 'cartao_credito'
  status: 'pago' | 'pendente'
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => {
      const now = new Date()
      const initialMonthId = getMonthId(now.getFullYear(), now.getMonth() + 1)
      const initialMonth = createDefaultMonth(now.getFullYear(), now.getMonth() + 1, 5.0)

      return {
        months: { [initialMonthId]: initialMonth },
        currentMonthId: initialMonthId,
        exchangeRate: { rate: 5.0, lastUpdated: new Date().toISOString(), isManual: false },
        sidebarOpen: true,
        activeSection: 'overview',
        userProfile: null,
        userId: null,
        syncStatus: 'idle' as const,

        // ── Auth / Supabase sync ────────────────────────────────────────────

        loadFromSupabase: (userId, data) =>
          set({
            userId,
            ...(data.months && { months: data.months }),
            ...(data.userProfile !== undefined && { userProfile: data.userProfile }),
            ...(data.currentMonthId && { currentMonthId: data.currentMonthId }),
            ...(data.exchangeRate && { exchangeRate: data.exchangeRate }),
            syncStatus: 'idle',
          }),

        syncToSupabase: async () => {
          const state = get()
          if (!state.userId) return
          set({ syncStatus: 'saving' })
          try {
            const payload = {
              months: state.months,
              userProfile: state.userProfile,
              currentMonthId: state.currentMonthId,
              exchangeRate: state.exchangeRate,
            }
            const { error } = await supabase
              .from('user_data')
              .upsert({ user_id: state.userId, store_data: payload, updated_at: new Date().toISOString() })
            set({ syncStatus: error ? 'error' : 'saved' })
            // Reset to idle after 3s
            setTimeout(() => set({ syncStatus: 'idle' }), 3000)
          } catch {
            set({ syncStatus: 'error' })
          }
        },

        logout: () => {
          set({
            userId: null,
            userProfile: null,
            syncStatus: 'idle',
          })
          // Clear persisted localStorage
          localStorage.removeItem('finance-dashboard-v2')
        },

        // ── Onboarding ──────────────────────────────────────────────────────

        completeOnboarding: (profile) => set((s) => {
          // If user wants dízimo and no dízimo account exists yet, add one to all months
          const months = { ...s.months }
          if (profile.hasTithe) {
            Object.keys(months).forEach((mid) => {
              const month = months[mid]
              const hasDizimo = month.bankAccounts.some((a) => a.type === 'dizimo')
              if (!hasDizimo) {
                months[mid] = {
                  ...month,
                  bankAccounts: [
                    ...month.bankAccounts,
                    { id: generateId(), name: 'Dízimo', type: 'dizimo' as const, color: '#f5a020', initialBalance: 0, transactions: [] },
                  ],
                }
              }
            })
          }
          return {
            months,
            userProfile: { ...profile, onboardingComplete: true, onboardingCompletedAt: new Date().toISOString() },
          }
        }),

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
            const fixedIncome = month.fixedIncome || 0
            const hasTithe = s.userProfile?.hasTithe ?? false
            const tithe = hasTithe ? Math.round(fixedIncome * 0.1 * 100) / 100 : 0
            const date = new Date().toISOString().slice(0, 10)

            const incomeAcc = month.bankAccounts.find((a) => a.id === incomeAccountId)
            if (!incomeAcc) return s

            const dizimoAcc = hasTithe ? month.bankAccounts.find((a) => a.type === 'dizimo') : null
            if (hasTithe && !dizimoAcc) return s

            // Register: salary in on chosen account; if hasTithe, debit tithe and credit Dízimo account.
            const newAccounts = month.bankAccounts.map((acc) => {
              if (acc.id === incomeAcc.id) {
                const txs: BankTransaction[] = [
                  { id: generateId(), date, description: `Salário — 5º dia útil`, amount: fixedIncome, type: 'entrada', linkedBillId: '__salary__' },
                ]
                if (hasTithe) {
                  txs.push({ id: generateId(), date, description: `Dízimo 10% — R$${tithe.toFixed(0)}`, amount: tithe, type: 'saida', linkedBillId: '__salary__' })
                }
                return { ...acc, transactions: [...acc.transactions, ...txs] }
              }
              if (hasTithe && dizimoAcc && acc.id === dizimoAcc.id) {
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

        importExpenses: (monthId, rows) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s

            let updatedMonth = { ...month, bankAccounts: month.bankAccounts.map(a => ({ ...a, transactions: [...a.transactions] })) }

            const newBills: Bill[] = []

            const exchangeRate = s.months[monthId]?.exchangeRate ?? s.exchangeRate.rate

            for (const row of rows) {
              const billId = generateId()
              const dueDay = parseInt(row.date.split('-')[2]) || 1
              const isUsdt = row.conta === 'usdt'

              // For USDT rows: convert to BRL for the bill amount; store USDT amount in the transaction
              const brlAmount = isUsdt ? Math.round(row.amount * exchangeRate * 100) / 100 : row.amount
              const txAmount = row.amount // always in the account's native currency

              // Determine effective category: credit card bills always use 'cartao'
              const category = (row.conta === 'cartao_credito' ? 'cartao' : row.category) as Bill['category']

              // Append USDT annotation to description
              const description = isUsdt
                ? `${row.description} (${row.amount.toFixed(2)} USDT)`
                : row.description

              const bill: Bill = {
                id: billId,
                name: description,
                amount: brlAmount,
                dueDay,
                category,
                status: row.status as BillStatus,
                notes: `Importado em ${new Date().toLocaleDateString('pt-BR')}${isUsdt ? ` · Cotação R$${exchangeRate.toFixed(2)}` : ''}`,
                isVariable: true,
              }
              newBills.push(bill)

              // Create bank transaction for operacional or usdt (not credit card)
              if (row.status === 'pago' && row.conta !== 'cartao_credito') {
                const accType = isUsdt ? 'usdt' : 'operacional'
                const targetAcc = updatedMonth.bankAccounts.find(a => a.type === accType)
                if (targetAcc) {
                  targetAcc.transactions.push({
                    id: generateId(),
                    date: row.date,
                    description,
                    amount: txAmount, // USDT account stores USDT; operacional stores BRL
                    type: 'saida',
                    linkedBillId: billId,
                  })
                }
              }
            }

            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...updatedMonth,
                  bills: [...updatedMonth.bills, ...newBills],
                },
              },
            }
          }),

        // ── Daily expenses ──────────────────────────────────────────────────
        addDailyExpense: (monthId, expense) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s
            const id = generateId()
            const newExpense: DailyExpense = { ...expense, id }

            // Create bank transaction for non-credit-card accounts
            let updatedAccounts = month.bankAccounts
            if (expense.conta !== 'cartao_credito') {
              const accType = expense.conta === 'usdt' ? 'usdt' : 'operacional'
              updatedAccounts = month.bankAccounts.map((acc) => {
                if (acc.type === accType) {
                  const tx: BankTransaction = {
                    id: generateId(),
                    date: expense.date,
                    description: expense.description,
                    amount: expense.amount,
                    type: 'saida',
                    linkedBillId: `__daily__${id}`,
                  }
                  return { ...acc, transactions: [...acc.transactions, tx] }
                }
                return acc
              })
            }

            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  dailyExpenses: [...(month.dailyExpenses ?? []), newExpense],
                  bankAccounts: updatedAccounts,
                },
              },
            }
          }),

        updateDailyExpense: (monthId, expenseId, updates) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  dailyExpenses: (month.dailyExpenses ?? []).map((e) =>
                    e.id === expenseId ? { ...e, ...updates } : e
                  ),
                },
              },
            }
          }),

        deleteDailyExpense: (monthId, expenseId) =>
          set((s) => {
            const month = s.months[monthId]
            if (!month) return s
            return {
              months: {
                ...s.months,
                [monthId]: {
                  ...month,
                  dailyExpenses: (month.dailyExpenses ?? []).filter((e) => e.id !== expenseId),
                  // Remove linked bank transaction
                  bankAccounts: month.bankAccounts.map((acc) => ({
                    ...acc,
                    transactions: acc.transactions.filter((tx) => tx.linkedBillId !== `__daily__${expenseId}`),
                  })),
                },
              },
            }
          }),

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
