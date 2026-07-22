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
  // Remaining installments of a parceled purchase. Absent on single-payment expenses.
  // Shown as a badge; the "Copy from previous month" flow decrements it when copying forward.
  installments?: number
}

export type Income = {
  id: string
  source: string
  currency: Currency
  amount: number
}

export type MonthData = {
  key: string       // YYYY-MM — used as the IndexedDB store key
  expenses: Expense[]
  incomes: Income[]
  saving: number    // amount set aside; subtracted from BRL balance
  adjustment: number // manual correction applied to BRL balance (can be negative)
  budget: number    // spending threshold; UI warns when BRL expenses exceed this
}
