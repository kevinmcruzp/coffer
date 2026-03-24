export type Category = 'fixed' | 'other'

export type PaymentMethod = 'debit' | 'credit'

export type Expense = {
  id: string
  name: string
  category: Category
  debit: number
  credit: number
  fixed: boolean
}

export type Income = {
  id: string
  source: string
  amount: number
}

export type MonthData = {
  key: string // formato "YYYY-MM"
  expenses: Expense[]
  incomes: Income[]
  saving: number
  adjustment: number
}
