export type Currency = 'USD' | 'BRL'

export type Category = 'fixed' | 'other'

export type PaymentMethod = 'debit' | 'credit'

export type Expense = {
  id: string
  name: string
  category: Category
  currency: Currency
  debit: number
  credit: number
  fixed: boolean
}

export type Income = {
  id: string
  source: string
  currency: Currency
  amount: number
}

export type MonthData = {
  key: string // format "YYYY-MM"
  expenses: Expense[]
  incomes: Income[]
  saving: number
  adjustment: number
}
