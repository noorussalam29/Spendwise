export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  payday: number; // Day of month (e.g. 1 to 31)
  monthlyBudget: number;
  monthlyIncome: number;
  currentStreak: number;
  lastLoggedDate?: Date | string | null;
  createdAt: Date | string;
}

export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Rent'
  | 'Shopping'
  | 'Data/Recharge'
  | 'EMI'
  | 'Family Support'
  | 'Savings'
  | 'Other';

export interface IExpense {
  _id: string;
  userId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  notes?: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly';
  createdAt: Date | string;
}

export interface IBudget {
  _id: string;
  userId: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  month: string; // Format: "YYYY-MM"
}

export interface IMonthlyIncome {
  _id: string;
  userId: string;
  month: string; // Format: "YYYY-MM"
  monthlyIncome: number;
  payday: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IGoal {
  _id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: Date | string;
}
