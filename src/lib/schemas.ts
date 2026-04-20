import { z, ZodError } from 'zod'

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(err.issues.map(i => i.message).join('; '))
    }
    throw err
  }
}

export const expenseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name cannot be empty').max(100),
  category: z.enum(['fixed', 'other']),
  currency: z.enum(['BRL', 'USD', 'CLP']),
  debit: z.number().min(0, 'Debit value cannot be negative'),
  credit: z.number().min(0, 'Credit value cannot be negative'),
  fixed: z.boolean(),
  // min(1): 1 means the expense is in its last month and won't propagate further (syncFixed skips installments === 1).
  installments: z.number().int('Number of installments must be a whole number').min(1, 'Installments must be at least 1').optional(),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: 'Enter a debit or credit amount greater than zero' },
)

export const incomeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1, 'Source cannot be empty').max(100),
  currency: z.enum(['BRL', 'USD', 'CLP']),
  amount: z.number().positive('Amount must be greater than zero'),
  recurring: z.boolean().optional(),
})

export const monthKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid format — use YYYY-MM')

export const monthDataSchema = z.object({
  key: monthKeySchema,
  expenses: z.array(expenseSchema),
  incomes: z.array(incomeSchema),
  saving: z.number().min(0, 'Saving cannot be negative'),
  adjustment: z.number(),
  budget: z.number().min(0).default(0),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
export type IncomeInput = z.infer<typeof incomeSchema>
export type MonthDataInput = z.infer<typeof monthDataSchema>
