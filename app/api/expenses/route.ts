import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import { expenseSchema } from '@/lib/validations';
import { checkAndGenerateRecurringExpenses } from '@/lib/recurring';
import { updateUserStreak } from '@/lib/streak';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    // Trigger recurring expense generation check-on-request
    await checkAndGenerateRecurringExpenses(userId);

    // Retrieve search filters from search parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const month = searchParams.get('month'); // Expects "YYYY-MM"

    // Build the query filters
    const query: any = { userId };

    if (category) {
      query.category = category;
    }

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthStr] = month.split('-').map(Number);
      // Start of the calendar month (UTC)
      const startOfMonth = new Date(Date.UTC(year, monthStr - 1, 1, 0, 0, 0));
      // End of the calendar month (UTC)
      const endOfMonth = new Date(Date.UTC(year, monthStr, 0, 23, 59, 59, 999));
      
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Expenses GET API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
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

    // Validate payload against expense validations schema
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create the expense
    const newExpense = await Expense.create({
      ...validation.data,
      userId,
    });

    // Update user daily activity streak
    const updatedStreak = await updateUserStreak(userId, new Date(validation.data.date));

    return NextResponse.json({ expense: newExpense, streak: updatedStreak }, { status: 201 });
  } catch (error) {
    console.error('Expenses POST API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
