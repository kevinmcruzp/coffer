import { z } from 'zod'

export const expenseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  category: z.enum(['fixed', 'other']),
  debit: z.number().min(0, 'Débito não pode ser negativo'),
  credit: z.number().min(0, 'Cartão não pode ser negativo'),
  fixed: z.boolean(),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: 'Informe ao menos um valor (débito ou cartão)' },
)

export const incomeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1, 'Fonte é obrigatória').max(100),
  amount: z.number().positive('Valor deve ser maior que zero'),
})

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato inválido — use YYYY-MM')

export const monthDataSchema = z.object({
  key: monthKeySchema,
  expenses: z.array(expenseSchema),
  incomes: z.array(incomeSchema),
  saving: z.number().min(0, 'Poupança não pode ser negativa'),
  adjustment: z.number(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
export type IncomeInput = z.infer<typeof incomeSchema>
export type MonthDataInput = z.infer<typeof monthDataSchema>
