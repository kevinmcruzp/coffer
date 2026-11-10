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
  // Negative only on a carried-over entry, when the source month closed below zero.
  amount: number
  // Set on the entry created by closing the previous month (YYYY-MM of that month).
  // Such entries are managed by closing/reopening and cannot be edited by hand.
  carryFrom?: string
}

export type MonthClosing = {
  balance: number   // BRL balance at the moment of closing — the amount carried forward
  closedAt: string  // ISO timestamp
}

export type MonthData = {
  key: string       // YYYY-MM — used as the vault store key
  expenses: Expense[]
  incomes: Income[]
  saving: number    // amount set aside; subtracted from BRL balance
  adjustment: number // manual correction applied to BRL balance (can be negative)
  budget: number    // spending threshold; UI warns when BRL expenses exceed this
  // Present while the month is closed; a closed month is read-only.
  closing?: MonthClosing
}
