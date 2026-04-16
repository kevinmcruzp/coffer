import { z, ZodError } from 'zod'

export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new Error(err.errors.map(e => e.message).join('; '))
    }
    throw err
  }
}

export const expenseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Name is required').max(100),
  category: z.enum(['fixed', 'other']),
  currency: z.enum(['BRL', 'USD', 'CLP']),
  debit: z.number().min(0, 'Debit cannot be negative'),
  credit: z.number().min(0, 'Credit cannot be negative'),
  fixed: z.boolean(),
}).refine(
  (data) => data.debit > 0 || data.credit > 0,
  { message: 'At least one value (debit or credit) must be greater than zero' },
)

export const incomeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1, 'Source is required').max(100),
  currency: z.enum(['BRL', 'USD', 'CLP']),
  amount: z.number().positive('Amount must be greater than zero'),
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
