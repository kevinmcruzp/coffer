export type Currency = 'BRL' | 'USD' | 'CLP'

export const CURRENCIES: Currency[] = ['BRL', 'USD', 'CLP']

export type Category = 'fixed' | 'other'

export type PaymentMethod = 'debit' | 'credit'

export type Expense = {
  id: string
  name: string
  category: Category
  currency: Currency
  // Both can be > 0 on the same expense (e.g., partially paid by card, rest in cash).
  // Schema enforces at least one > 0.
  debit: number   // paid via debit/cash
  credit: number  // paid via credit card
  // Drives automatic propagation to the next month via syncFixed.
  // True = recurring every month; false = one-time (but installments can still propagate).
  fixed: boolean
  // Remaining installments to pay. Absent on non-installment expenses.
  // syncFixed propagates when installments > 1 and decrements by 1 each month.
  // When installments reaches 1, the expense is in its last month and won't propagate further.
  installments?: number
}

export type Income = {
  id: string
  source: string
  currency: Currency
  amount: number
  // When true, the income is cloned into the next month on goForward (matched by source + currency).
  recurring?: boolean
}

export type MonthData = {
  key: string       // YYYY-MM — used as the IndexedDB store key
  expenses: Expense[]
  incomes: Income[]
  saving: number    // amount set aside; subtracted from BRL balance
  adjustment: number // manual correction applied to BRL balance (can be negative)
  budget: number    // spending threshold; UI warns when BRL expenses exceed this
}
