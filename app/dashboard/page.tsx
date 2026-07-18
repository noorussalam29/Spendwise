'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flame,
  IndianRupee,
  Wallet,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  PieChart as PieIcon,
  Activity,
  Sparkles,
  Plus,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useUIStore } from '@/lib/store';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

// Custom Category Color Palette matching fintech aesthetics
const CATEGORY_COLORS: Record<string, string> = {
  Food: '#38BDF8', // Sky Blue
  Transport: '#818CF8', // Indigo
  Rent: '#34D399', // Soft Mint
  Shopping: '#FB7185', // Rose
  'Data/Recharge': '#A78BFA', // Purple
  EMI: '#F5A623', // Rupee Gold
  'Family Support': '#F472B6', // Pink
  Savings: '#05D393', // Mint Cash
  Other: '#64748B', // Slate Gray
};

export default function DashboardPage() {
  const { setQuickLogOpen } = useUIStore();
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  // Guard against SSR hydration mismatches when rendering Recharts SVGs
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // TanStack Query to fetch dashboard statistics
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
  });

  // Mutation to update monthly budget
  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: number) => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget }),
      });
      if (!response.ok) {
        throw new Error('Failed to update budget');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditingBudget(false);
    },
  });

  // Initialize monthly budget from stats
  useEffect(() => {
    if (stats && stats.budget && stats.budget.totalLimit > 0) {
      setMonthlyBudget(stats.budget.totalLimit);
    }
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 pb-12">
        {/* Skeleton Header */}
        <div className="h-10 w-48 bg-card-fill border border-slate-gray/5 rounded-lg animate-pulse" />
        {/* Skeleton Signature Gauge */}
        <div className="h-48 w-full bg-card-fill border border-slate-gray/10 rounded-xl animate-pulse" />
        {/* Skeleton KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card-fill border border-slate-gray/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle size={32} className="text-crimson-alert mx-auto animate-bounce" />
        <div>
          <h3 className="text-sm font-semibold text-ivory-white">Failed to load dashboard metrics</h3>
          <p className="text-xs text-slate-gray mt-1 leading-relaxed">
            There was an error communicating with the server. Please check your database connection or try reloading the page.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-9 px-4 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg items-center justify-center transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { cycle, pacing, budget, stats: summary, charts, recentLedger, streak, financials, monthlyIncome = 0 } = stats;

  // Get today's transactions (prioritize stats.todayLedger from the API, fall back to filtering recentLedger on the client)
  const todayLedger = summary.todayLedger || recentLedger.filter((tx: any) => {
    const txDate = new Date(tx.date);
    return txDate.toDateString() === new Date().toDateString();
  }).slice(0, 3);
  const hasTransactionsToday = todayLedger.length > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header Panel */}
      <div>
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
          Financial Command Center
        </h1>
        <p className="text-sm text-slate-gray mt-1">
          Your money at a glance. Stay in control between paydays.
        </p>
      </div>

      {/* HERO SECTION: Money Left + Days Until Payday */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 md:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Money Left - Primary Metric */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-xs text-slate-gray uppercase tracking-wider">
              Money Left This Cycle
            </h2>
            <div className="font-numeric font-bold text-4xl md:text-5xl text-ivory-white flex items-center tracking-tight">
              <IndianRupee size={36} className="stroke-[2.5] text-mint-cash mr-1" />
              {financials.moneyLeft.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-gray">
              Monthly Income (₹{(monthlyIncome || 0).toLocaleString('en-IN')}) − Current Cycle Spending (₹{cycle.totalSpent.toLocaleString('en-IN')})
            </p>
          </div>

          {/* Days Until Payday */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-xs text-slate-gray uppercase tracking-wider">
              Days Until Payday
            </h2>
            <div className="font-numeric font-bold text-4xl md:text-5xl text-rupee-gold flex items-center tracking-tight">
              {cycle.daysRemaining}
            </div>
            <p className="text-xs text-slate-gray">
              {cycle.daysRemaining === 1 ? 'Payday tomorrow' : cycle.daysRemaining === 0 ? 'Payday today!' : `${cycle.daysRemaining} days remaining`}
            </p>
          </div>
        </div>

        {/* Secondary Metrics: Today's Spending + Safe To Spend Today */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-gray/10">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
              Today's Spending
            </span>
            <div className="font-numeric font-bold text-xl md:text-2xl text-ivory-white flex items-center">
              <IndianRupee size={18} className="stroke-[2.5] mr-1" />
              {summary.todaySpent.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
              Safe To Spend Today
            </span>
            <div className="font-numeric font-bold text-xl md:text-2xl text-mint-cash flex items-center">
              <IndianRupee size={18} className="stroke-[2.5] mr-1" />
              {pacing.safeToSpendDaily.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </section>

      {/* Category Spending Section */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Category Spending (This Cycle)
          </h3>
          <span className="text-[10px] text-slate-gray font-medium">Billing Cycle</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Food', color: CATEGORY_COLORS.Food },
            { name: 'Transport', color: CATEGORY_COLORS.Transport },
            { name: 'Shopping', color: CATEGORY_COLORS.Shopping },
            { name: 'Bills', color: CATEGORY_COLORS.Rent, subcategories: ['Rent', 'EMI', 'Data/Recharge', 'Utilities'] },
            { name: 'Family Support', color: CATEGORY_COLORS['Family Support'] },
            { name: 'Savings', color: CATEGORY_COLORS.Savings },
          ].map((cat) => {
            const catAmount = charts.categoriesBreakdown
              .filter((item: any) => cat.subcategories ? cat.subcategories.includes(item.name) : item.name === cat.name)
              .reduce((sum: number, item: any) => sum + item.value, 0);

            return (
              <div key={cat.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-semibold text-ivory-white">{cat.name}</span>
                </div>
                <div className="font-numeric font-bold text-lg text-ivory-white">
                  <IndianRupee size={14} className="stroke-[2.5] inline mr-0.5" />
                  {catAmount.toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financial Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Money Left */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Money Left</span>
            <Wallet size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-mint-cash">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {financials.moneyLeft.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Today's Spending */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Today's Spending</span>
            <Activity size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {summary.todaySpent.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Sent To Family */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Sent To Family</span>
            <TrendingUp size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {financials.sentToFamily.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Saved This Month */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Saved This Month</span>
            <Save size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-mint-cash">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {financials.savedThisMonth.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Budget Used % */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Budget Used</span>
            <Wallet size={16} />
          </div>
          <div className="space-y-1">
            <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white">
              {budget.usedPercent}%
            </div>
            <div className="w-full bg-bg-deep h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  budget.usedPercent > 100
                    ? 'bg-crimson-alert'
                    : budget.usedPercent >= 80
                    ? 'bg-rupee-gold'
                    : 'bg-mint-cash'
                }`}
                style={{ width: `${Math.min(100, budget.usedPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Monthly Income</span>
            <IndianRupee size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {monthlyIncome.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Total Expenses</span>
            <Activity size={16} />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white">
            <IndianRupee size={20} className="stroke-[2.5] inline mr-0.5" />
            {cycle.totalSpent.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Daily Streak */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Daily Streak</span>
            <Flame size={16} className="text-rupee-gold" />
          </div>
          <div className="font-numeric font-bold text-2xl md:text-3xl text-rupee-gold">
            {streak}
          </div>
        </div>
      </section>

      {/* Recharts Grid - Retained */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Category breakdown (Pie Chart) */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
            <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
              <PieIcon size={16} className="text-mint-cash" />
              Category Outflows
            </h3>
            <span className="text-[10px] text-slate-gray font-medium">Calendar Month</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {isMounted && charts.categoriesBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoriesBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {charts.categoriesBreakdown.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[entry.name] || '#94A3B8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(107, 107, 99, 0.15)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      color: '#1C1C1A',
                    }}
                    itemStyle={{ color: '#1C1C1A' }}
                    formatter={(value) => [value ? `₹${Number(value).toLocaleString('en-IN')}` : '₹0', 'Spent']}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] text-ivory-white font-medium px-1.5">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-gray flex flex-col items-center gap-2">
                <Activity size={24} className="text-slate-gray/30" />
                <span>No expense categories logged this month.</span>
              </div>
            )}
          </div>

          {/* Smart Insight */}
          {charts.categoriesBreakdown.length > 0 && (
            <div className="pt-3 border-t border-slate-gray/5">
              <div className="bg-mint-cash/10 border border-mint-cash/20 rounded-lg p-3">
                <p className="text-[11px] text-ivory-white leading-relaxed font-medium">
                  <span className="text-rupee-gold">💡</span>{' '}
                  {summary.largestCategory.category === 'Food' || summary.largestCategory.category === 'Shopping'
                    ? `You spend ${Math.round((summary.largestCategory.amount / stats.recap.thisMonthSpent) * 100)}% on ${summary.largestCategory.category}. Setting a specific budget for this category could help control discretionary spending.`
                    : summary.largestCategory.category === 'EMI' || summary.largestCategory.category === 'Rent'
                    ? `Fixed obligations (${summary.largestCategory.category}) account for ${Math.round((summary.largestCategory.amount / stats.recap.thisMonthSpent) * 100)}% of your spending. This is typical for essential expenses.`
                    : summary.largestCategory.category === 'Transport' || summary.largestCategory.category === 'Data/Recharge'
                    ? `Your ${summary.largestCategory.category} spending is ${Math.round((summary.largestCategory.amount / stats.recap.thisMonthSpent) * 100)}% of your total. Consider if this aligns with your commute and connectivity needs.`
                    : `Your highest spending category is ${summary.largestCategory.category} at ${Math.round((summary.largestCategory.amount / stats.recap.thisMonthSpent) * 100)}% of total spending.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 6-Month Trend (Area Chart) */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
            <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
              <TrendingUp size={16} className="text-mint-cash" />
              6-Month Ledger Trend
            </h3>
            <span className="text-[10px] text-slate-gray font-medium">Outflow vs Limit</span>
          </div>

          <div className="h-64">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={charts.trend}
                  margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4332" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 107, 99, 0.05)" />
                  <XAxis
                    dataKey="month"
                    stroke="#6B6B63"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6B6B63"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(107, 107, 99, 0.15)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#1C1C1A' }}
                    labelStyle={{ color: '#6B6B63', fontWeight: 'bold' }}
                    formatter={(value) => [value ? `₹${Number(value).toLocaleString('en-IN')}` : '₹0']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[10px] text-ivory-white font-medium px-1">{value === 'spent' ? 'Spent' : 'Budget Limit'}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#1B4332"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    stroke="#6B6B63"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Recent Transactions
          </h3>
          <Link
            href="/expenses"
            className="text-xs text-mint-cash hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recentLedger.length === 0 ? (
            <div className="col-span-2 text-center py-6 text-xs text-slate-gray">
              No transactions logged yet. Use the Quick Log button to record your first expense!
            </div>
          ) : (
            recentLedger.map((tx: any) => (
              <div
                key={tx._id}
                className="flex items-center justify-between p-3.5 rounded-lg bg-bg-deep/45 border border-slate-gray/5 hover:border-slate-gray/10 transition-all"
              >
                <div className="min-w-0 pr-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium text-[9px] shrink-0">
                      {tx.category}
                    </span>
                    {tx.isRecurring && (
                      <span className="text-[7.5px] bg-rupee-gold/15 text-rupee-gold font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-ivory-white truncate" title={tx.title}>
                    {tx.title}
                  </p>
                  <p className="text-[9px] text-slate-gray">
                    {new Date(tx.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="font-numeric font-bold text-xs text-ivory-white flex items-center shrink-0">
                  <IndianRupee size={11} className="stroke-[2.5]" />
                  {tx.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}