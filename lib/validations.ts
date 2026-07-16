import { z } from 'zod';

// AUTH SCHEMAS
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// EXPENSE SCHEMAS
export const expenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100, 'Title is too long'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.enum([
    'Food',
    'Transport',
    'Rent',
    'Shopping',
    'Data/Recharge',
    'EMI',
    'Family Support',
    'Savings',
    'Other',
  ], {
    message: 'Please select a valid category',
  }),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().max(300, 'Notes are too long').optional().or(z.literal('')),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly']).optional().or(z.literal('')),
}).refine((data) => {
  if (data.isRecurring && !data.recurringFrequency) {
    return false;
  }
  return true;
}, {
  message: 'Recurring frequency is required when recurring is active',
  path: ['recurringFrequency'],
});

// BUDGET SCHEMAS
export const budgetSchema = z.object({
  category: z.enum([
    'Food',
    'Transport',
    'Rent',
    'Shopping',
    'Data/Recharge',
    'EMI',
    'Family Support',
    'Savings',
    'Other',
  ]),
  monthlyLimit: z.number().min(0, 'Limit must be positive'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

// GOALS SCHEMAS
export const goalSchema = z.object({
  name: z.string().min(2, 'Goal name must be at least 2 characters').max(50),
  targetAmount: z.number().min(1, 'Target must be at least ₹1'),
  currentAmount: z.number().min(0, 'Current amount cannot be negative').default(0),
});
