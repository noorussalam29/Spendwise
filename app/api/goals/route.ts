import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Goal from '@/models/Goal';
import Expense from '@/models/Expense';
import { goalSchema } from '@/lib/validations';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId);
    await dbConnect();

    // 1. Fetch all savings goals
    const goals = await Goal.find({ userId: userObjectId }).sort({ createdAt: -1 });

    // 2. Fetch lifetime total logged in "Savings" category
    const totalSavingsAgg = await Expense.aggregate([
      {
        $match: {
          userId: userObjectId,
          category: 'Savings',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    const totalSavingsLogged = totalSavingsAgg[0]?.total || 0;

    // 3. Automatically update the currentAmount of each goal based on "Savings" logged after the goal was created
    const updatedGoals = [];
    for (const goal of goals) {
      const goalSavingsAgg = await Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            category: 'Savings',
            date: { $gte: goal.createdAt },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]);
      const currentAmount = goalSavingsAgg[0]?.total || 0;

      // Update in database if it changed
      if (goal.currentAmount !== currentAmount) {
        goal.currentAmount = currentAmount;
        await goal.save();
      }

      updatedGoals.push(goal);
    }

    return NextResponse.json({
      goals: updatedGoals,
      totalSavingsLogged,
    });
  } catch (error) {
    console.error('Goals GET API error:', error);
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

    // Validate using Zod schema
    const validation = goalSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create the savings goal
    const newGoal = await Goal.create({
      ...validation.data,
      userId,
      currentAmount: 0, // Starts at 0, updated dynamically on GET
    });

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error('Goals POST API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Goal ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Enforce data isolation on delete
    const deletedGoal = await Goal.findOneAndDelete({ _id: id, userId });

    if (!deletedGoal) {
      return NextResponse.json({ message: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Goals DELETE API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}
