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

// SETTINGS SCHEMAS
export const settingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long').optional(),
  payday: z.number().min(1, 'Payday must be between 1 and 31').max(31, 'Payday must be between 1 and 31').optional(),
  monthlyBudget: z.number().min(0, 'Monthly budget must be positive').optional(),
  monthlyIncome: z.number().min(0, 'Monthly income must be positive').optional(),
  currentPassword: z.string().min(1, 'Current password is required').optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
}).refine((data) => {
  // If newPassword is provided, currentPassword must also be provided
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required when changing password',
  path: ['currentPassword'],
});

