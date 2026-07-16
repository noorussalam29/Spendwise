import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import { expenseSchema } from '@/lib/validations';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    await dbConnect();

    const expense = await Expense.findOne({ _id: id, userId });
    if (!expense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Expense GET detail error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;
    const body = await req.json();

    // Validate the incoming updates against Zod schema
    const validation = expenseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Enforce data isolation on update
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, userId },
      validation.data,
      { new: true }
    );

    if (!updatedExpense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Expense PUT detail error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    await dbConnect();

    // Enforce data isolation on delete
    const deletedExpense = await Expense.findOneAndDelete({ _id: id, userId });

    if (!deletedExpense) {
      return NextResponse.json({ message: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Expense DELETE detail error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
