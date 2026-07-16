import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Budget from '@/models/Budget';
import Expense from '@/models/Expense';
import { budgetSchema } from '@/lib/validations';

const CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Shopping',
  'Data/Recharge',
  'EMI',
  'Family Support',
  'Savings',
  'Other',
];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    
    // Default to the current calendar month
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || defaultMonth;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ message: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    await dbConnect();

    // 1. Fetch all budgets set for this month
    const budgets = await Budget.find({ userId, month });

    // 2. Fetch expenditures in this month grouped by category
    const [year, monthStr] = month.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));

    const expenseAgg = await Expense.aggregate([
      {
        $match: {
          userId: budgets[0]?.userId || budgets[0]?.userId ? budgets[0].userId : (await import('mongoose')).Types.ObjectId.createFromHexString(userId),
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' },
        },
      },
    ]);

    const spentMap: Record<string, number> = {};
    expenseAgg.forEach((item) => {
      spentMap[item._id] = item.totalSpent;
    });

    const budgetMap: Record<string, { limit: number; id: string }> = {};
    budgets.forEach((b) => {
      budgetMap[b.category] = { limit: b.monthlyLimit, id: b._id.toString() };
    });

    // 3. Compile the comprehensive list for all 9 categories
    const budgetList = CATEGORIES.map((category) => {
      const budgetData = budgetMap[category] || { limit: 0, id: null };
      const spent = spentMap[category] || 0;
      return {
        category,
        limit: budgetData.limit,
        spent,
        budgetId: budgetData.id,
        month,
      };
    });

    return NextResponse.json(budgetList);
  } catch (error) {
    console.error('Budgets GET API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Validate request schema
    const validation = budgetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { category, monthlyLimit, month } = validation.data;

    await dbConnect();

    // Perform an upsert (find and update, or insert if not exists)
    const budget = await Budget.findOneAndUpdate(
      { userId, category, month },
      { monthlyLimit },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Budgets POST API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}
