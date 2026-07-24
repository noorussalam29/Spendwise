import User from '@/models/User';
import MonthlyIncome from '@/models/MonthlyIncome';

export interface MonthlyIncomeResult {
  month: string;
  monthlyIncome: number;
  payday: number | null;
}

export async function backfillUserIncomeIfNeeded(userId: string, month: string): Promise<void> {
  const existing = await MonthlyIncome.findOne({ userId, month });
  if (existing) return;

  const user = await User.findById(userId);
  if (!user || user.monthlyIncome <= 0) return;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month !== currentMonth) return;

  await MonthlyIncome.create({
    userId,
    month,
    monthlyIncome: user.monthlyIncome,
    payday: user.payday,
  });
}

export async function getMonthlyIncome(
  userId: string,
  month: string,
  options?: { backfill?: boolean }
): Promise<MonthlyIncomeResult> {
  if (options?.backfill !== false) {
    await backfillUserIncomeIfNeeded(userId, month);
  }

  const record = await MonthlyIncome.findOne({ userId, month });

  return {
    month,
    monthlyIncome: record?.monthlyIncome ?? 0,
    payday: record?.payday ?? null,
  };
}

export async function upsertMonthlyIncome(
  userId: string,
  month: string,
  monthlyIncome: number,
  payday: number
) {
  return MonthlyIncome.findOneAndUpdate(
    { userId, month },
    { monthlyIncome, payday },
    { upsert: true, new: true, runValidators: true }
  );
}
