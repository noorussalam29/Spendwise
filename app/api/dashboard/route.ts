import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import Budget from '@/models/Budget';
import User from '@/models/User';
import { checkAndGenerateRecurringExpenses } from '@/lib/recurring';
import { getMonthlyIncome } from '@/lib/income';

// Helper to calculate start and end dates of the current billing cycle based on user's payday
function getBillingCycle(payday: number, today: Date = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const todayDay = today.getDate();

  let startCycle: Date;
  let endCycle: Date;

  // Snap day to the last day of the month if payday is larger than the month length
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

  // Adjust endCycle to end of the day before the next cycle starts
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

    // Trigger recurring expense generation to keep the dashboard live and accurate
    await checkAndGenerateRecurringExpenses(userId);

    // Fetch user details for streaking and payday countdown
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

    // 1. Calculate Billing Cycle Dates
    const { startCycle, endCycle } = getBillingCycle(cyclePayday, today);

    // Calculate elapsed and remaining days
    const totalCycleTime = endCycle.getTime() - startCycle.getTime();
    const totalCycleDays = Math.round(totalCycleTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Normalize today for comparison
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const timeElapsed = todayUTC.getTime() - startCycle.getTime();
    const daysElapsed = Math.min(totalCycleDays, Math.max(0, Math.round(timeElapsed / (1000 * 60 * 60 * 24)) + 1));
    const daysRemaining = Math.max(0, totalCycleDays - daysElapsed);

    // 2. Fetch all expenses in the current billing cycle
    const cycleExpenses = await Expense.find({
      userId,
      date: { $gte: startCycle, $lte: endCycle },
    });

    const totalSpentInCycle = cycleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. Fetch budgets for the current calendar month (needed for capped category calculation)
    const budgets = await Budget.find({
      userId,
      month: currentMonthStr,
    });

    // Calculate spent for capped categories only (for budget percentage calculation)
    const cappedCategories = budgets.filter(b => b.monthlyLimit != null && b.monthlyLimit > 0).map(b => b.category);
    const cappedSpentInCycle = cycleExpenses
      .filter(exp => cappedCategories.includes(exp.category))
      .reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate Money Left = Monthly Income - Current Billing Cycle Spending
    const moneyLeft = Math.max(0, monthlyIncome - totalSpentInCycle);

    // Calculate Sent To Family (Family Support category in current cycle)
    const familySupportExpenses = cycleExpenses.filter(exp => exp.category === 'Family Support');
    const sentToFamily = familySupportExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Calculate Saved This Month (Savings category in current cycle)
    const savingsExpenses = cycleExpenses.filter(exp => exp.category === 'Savings');
    const savedThisMonth = savingsExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Only sum budgets where a limit is explicitly set (capped categories)
    const categoryBudgetTotal = budgets.reduce((sum, b) => {
      // Only include categories with a non-zero, non-null limit
      if (b.monthlyLimit != null && b.monthlyLimit > 0) {
        return sum + b.monthlyLimit;
      }
      return sum;
    }, 0);
    
    // Use user's monthly budget if set, otherwise fall back to category budgets
    const totalBudgetLimit = user.monthlyBudget > 0 ? user.monthlyBudget : categoryBudgetTotal;

    // 4. Today's spending sum (FIXED: Uses system local boundaries instead of forced mismatching UTC)
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todayExpenses = await Expense.find({
      userId,
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const totalSpentToday = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 5. Largest Outflow Category this Month (calendar month)
    const startOfCalendarMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    const endOfCalendarMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

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

    // Format all categories sum for Recharts Pie Chart
    const categoriesBreakdown = categoryAgg.map((item) => ({
      name: item._id,
      value: item.totalAmount,
    }));

    // 6. Six Month Trend Calculations
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(Date.UTC(currentYear, currentMonth - i, 1));
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth();
      const tMonthLabel = targetDate.toLocaleDateString('en-IN', { month: 'short' });
      const tMonthStr = `${tYear}-${String(tMonth + 1).padStart(2, '0')}`;

      const tStart = new Date(Date.UTC(tYear, tMonth, 1, 0, 0, 0, 0));
      const tEnd = new Date(Date.UTC(tYear, tMonth + 1, 0, 23, 59, 59, 999));

      const monthExpenses = await Expense.find({
        userId,
        date: { $gte: tStart, $lte: tEnd },
      });
      const monthSpent = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Sum budget for that month (only capped categories)
      const monthBudgets = await Budget.find({ userId, month: tMonthStr });
      const monthBudgetTotal = monthBudgets.reduce((sum, b) => {
        if (b.monthlyLimit != null && b.monthlyLimit > 0) {
          return sum + b.monthlyLimit;
        }
        return sum;
      }, 0);

      trendData.push({
        month: tMonthLabel,
        spent: monthSpent,
        budget: monthBudgetTotal,
      });
    }

    // 6.5 Month-over-Month (MoM) Recap Calculations
    const startOfLastMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    const endOfLastMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
    
    // Fetch last month's ledger items to aggregate spent sum
    const lastMonthExpenses = await Expense.find({
      userId,
      date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });
    const lastMonthSpent = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Fetch this month's calendar ledger items
    const thisMonthExpenses = await Expense.find({
      userId,
      date: { $gte: startOfCalendarMonth, $lte: endOfCalendarMonth },
    });
    const thisMonthSpent = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    let spentDiffPercent = 0;
    if (lastMonthSpent > 0) {
      spentDiffPercent = Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100);
    }

    // Generate dynamic category MoM insights
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

    // 7. Recent transactions (Limit to 5)
    const recentLedger = await Expense.find({ userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    // 8. Pacing Indicator Calculations
    const daysElapsedPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalCycleDays) * 100)));
    const budgetSpentPercent = totalBudgetLimit > 0
      ? Math.min(100, Math.round((cappedSpentInCycle / totalBudgetLimit) * 100))
      : 0;

    const dailySpendingRate = daysElapsed > 0 ? totalSpentInCycle / daysElapsed : totalSpentInCycle;
    const projectedSpend = dailySpendingRate * totalCycleDays;
    
    const remainingBudget = Math.max(0, totalBudgetLimit - cappedSpentInCycle);
    // Safe To Spend Today = Money Left ÷ Remaining Days Until Payday
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
        sentToFamily,
        savedThisMonth,
      },
      recap,
      charts: {
        categoriesBreakdown,
        trend: trendData,
      },
      recentLedger,
    });
  } catch (error) {
    console.error('Dashboard Stats GET API error:', error);
    return NextResponse.json({ message: 'Internal server error occurred' }, { status: 500 });
  }
}