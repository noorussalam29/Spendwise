import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import Budget from '@/models/Budget';
import User from '@/models/User';
import { checkAndGenerateRecurringExpenses } from '@/lib/recurring';
import { getMonthlyIncome } from '@/lib/income';

function getBillingCycle(payday: number, today: Date = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  let startCycle: Date;
  let endCycle: Date;

  const snapToLastDay = (y: number, m: number, targetDay: number) => {
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getDate();
    return new Date(Date.UTC(y, m, Math.min(targetDay, lastDay), 0, 0, 0, 0));
  };

  if (todayDay >= payday) {
    startCycle = snapToLastDay(year, month, payday);
    endCycle = snapToLastDay(year, month + 1, payday);
  } else {
    startCycle = snapToLastDay(year, month - 1, payday);
    endCycle = snapToLastDay(year, month, payday);
  }

  const endCycleAdjusted = new Date(endCycle);
  endCycleAdjusted.setUTCDate(endCycleAdjusted.getUTCDate() - 1);
  endCycleAdjusted.setUTCHours(23, 59, 59, 999);

  return { startCycle, endCycle: endCycleAdjusted };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized access' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    await checkAndGenerateRecurringExpenses(userId);

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User profile not found' }, { status: 404 });
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const incomeRecord = await getMonthlyIncome(userId, currentMonthStr);
    const monthlyIncome = incomeRecord.monthlyIncome;
    const cyclePayday = incomeRecord.payday ?? user.payday;

    const { startCycle, endCycle } = getBillingCycle(cyclePayday, today);

    const totalCycleTime = endCycle.getTime() - startCycle.getTime();
    const totalCycleDays = Math.round(totalCycleTime / (1000 * 60 * 60 * 24)) + 1;
    
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const timeElapsed = todayUTC.getTime() - startCycle.getTime();
    const daysElapsed = Math.min(totalCycleDays, Math.max(0, Math.round(timeElapsed / (1000 * 60 * 60 * 24)) + 1));
    const daysRemaining = Math.max(0, totalCycleDays - daysElapsed);

    const cycleExpenses = await Expense.find({
      userId,
      date: { $gte: startCycle, $lte: endCycle },
    });

    const totalSpentInCycle = cycleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const budgets = await Budget.find({
      userId,
      month: currentMonthStr,
    });

    const cappedCategories = budgets.filter(b => b.monthlyLimit != null && b.monthlyLimit > 0).map(b => b.category);
    const cappedSpentInCycle = cycleExpenses
      .filter(exp => cappedCategories.includes(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const moneyLeft = Math.max(0, monthlyIncome - totalSpentInCycle);

    const startOfCalendarMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endOfCalendarMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    const calendarMonthExpenses = await Expense.find({
      userId,
      date: { $gte: startOfCalendarMonth, $lte: endOfCalendarMonth },
    });
    const totalCalendarSpent = calendarMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const savedThisMonth = Math.max(0, monthlyIncome - totalCalendarSpent);

    const categoryBudgetTotal = budgets.reduce((sum, b) => {
      if (b.monthlyLimit != null && b.monthlyLimit > 0) {
        return sum + b.monthlyLimit;
      }
      return sum;
    }, 0);
    
    const totalBudgetLimit = user.monthlyBudget > 0 ? user.monthlyBudget : categoryBudgetTotal;

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayExpenses = await Expense.find({
      userId,
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const totalSpentToday = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const categoryAgg = await Expense.aggregate([
      {
        $match: {
          userId: user._id,
          date: { $gte: startOfCalendarMonth, $lte: endOfCalendarMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const largestCategory = categoryAgg[0]
      ? { category: categoryAgg[0]._id, amount: categoryAgg[0].totalAmount }
      : { category: 'None', amount: 0 };

    const categoriesBreakdown = categoryAgg.map((item) => ({
      name: item._id,
      value: item.totalAmount,
    }));

    const startOfLastMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    const endOfLastMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
    
    const lastMonthExpenses = await Expense.find({
      userId,
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const lastMonthSpent = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const thisMonthSpent = totalCalendarSpent;

    let spentDiffPercent = 0;
    if (lastMonthSpent > 0) {
      spentDiffPercent = Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100);
    }

    let insight = `You logged ₹${largestCategory.amount.toLocaleString('en-IN')} in ${largestCategory.category} this month.`;
    if (largestCategory.category !== 'None') {
      const lastMonthCatExpenses = lastMonthExpenses.filter(e => e.category === largestCategory.category);
      const lastMonthCatSpent = lastMonthCatExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      if (lastMonthCatSpent > 0) {
        const catDiffPercent = Math.round(((largestCategory.amount - lastMonthCatSpent) / lastMonthCatSpent) * 100);
        if (catDiffPercent < 0) {
          insight = `You spent ${Math.abs(catDiffPercent)}% less on ${largestCategory.category} this month. Nice job!`;
        } else if (catDiffPercent > 0) {
          insight = `You spent ${catDiffPercent}% more on ${largestCategory.category} compared to last month.`;
        } else {
          insight = `You spent the exact same on ${largestCategory.category} as last month.`;
        }
      }
    }

    const recap = {
      thisMonthSpent,
      lastMonthSpent,
      spentDiffPercent,
      insight,
    };

    const recentLedger = await Expense.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    const daysElapsedPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalCycleDays) * 100)));
    const budgetSpentPercent = totalBudgetLimit > 0
      ? Math.min(100, Math.round((cappedSpentInCycle / totalBudgetLimit) * 100))
      : 0;

    const dailySpendingRate = daysElapsed > 0 ? totalSpentInCycle / daysElapsed : totalSpentInCycle;
    const projectedSpend = dailySpendingRate * totalCycleDays;
    const safeToSpendDaily = daysRemaining > 0 ? moneyLeft / daysRemaining : moneyLeft;
    const isOverPacing = totalBudgetLimit > 0 && budgetSpentPercent > daysElapsedPercent;

    return NextResponse.json({
      streak: user.currentStreak,
      payday: cyclePayday,
      monthlyIncome,
      cycle: {
        start: startCycle,
        end: endCycle,
        daysElapsed,
        daysRemaining,
        totalDays: totalCycleDays,
        daysElapsedPercent,
        totalSpent: totalSpentInCycle,
      },
      budget: {
        totalLimit: totalBudgetLimit,
        usedPercent: totalBudgetLimit > 0 ? Math.round((cappedSpentInCycle / totalBudgetLimit) * 100) : 0,
      },
      stats: {
        todaySpent: totalSpentToday,
        largestCategory,
        todayLedger: [...todayExpenses]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
          .slice(0, 3),
      },
      pacing: {
        budgetSpentPercent,
        dailyRate: Math.round(dailySpendingRate),
        projectedSpend: Math.round(projectedSpend),
        safeToSpendDaily: Math.round(safeToSpendDaily),
        isOverPacing,
        projectedSavings: Math.round(Math.max(0, totalBudgetLimit - projectedSpend)),
      },
      financials: {
        moneyLeft,
        savedThisMonth,
      },
      recap,
      charts: {
        categoriesBreakdown,
      },
      recentLedger,
    });
  } catch (error) {
    console.error('Dashboard Stats GET API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}