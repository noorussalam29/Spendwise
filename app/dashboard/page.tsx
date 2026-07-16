'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [isMounted, setIsMounted] = useState(false);

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

  const { cycle, pacing, budget, stats: summary, charts, recentLedger, streak } = stats;

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
          Dashboard
        </h1>
        <p className="text-sm text-slate-gray mt-1">
          Daily overview and spending habits summary.
        </p>
      </div>

      {/* Top Section Grid: Adjusted to perfect 50/50 balance (lg:grid-cols-2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Today Hero Card */}
        <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 shadow-xl flex flex-col gap-6 h-full justify-between">
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-xs text-slate-gray uppercase tracking-wider">
              Today
            </h2>
            {hasTransactionsToday ? (
              <div className="font-numeric font-bold text-3xl md:text-4xl text-ivory-white flex items-center tracking-tight">
                <IndianRupee size={28} className="stroke-[2.5] text-mint-cash mr-0.5" />
                {summary.todaySpent.toLocaleString('en-IN')}
              </div>
            ) : null}
          </div>

          {/* Transactions List or Empty State */}
          {hasTransactionsToday ? (
            <div className="space-y-3">
              <span className="text-[10px] text-slate-gray font-bold tracking-wider uppercase block">
                Today's Ledger Entries
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {todayLedger.map((tx: any) => (
                  <div
                    key={tx._id}
                    className="flex flex-col gap-2 p-3.5 rounded-lg bg-bg-deep/45 border border-slate-gray/5 hover:border-slate-gray/10 transition-all"
                  >
                    {/* Top Row: Category, Time Badge (Left) and Price (Right) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-medium text-[9px] shrink-0">
                          {tx.category}
                        </span>
                        
                        {/* Timing indicator */}
                        <span className="text-[9px] text-slate-500 font-medium font-numeric">
                          {new Date(tx.date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>

                        {tx.isRecurring && (
                          <span className="text-[7.5px] bg-rupee-gold/15 text-rupee-gold font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                            Recurring
                          </span>
                        )}
                      </div>
                      <div className="font-numeric font-bold text-xs text-ivory-white flex items-center shrink-0">
                        <IndianRupee size={11} className="stroke-[2.5]" />
                        {tx.amount.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {/* Bottom Row: Transaction Title */}
                    <p className="text-xs font-semibold text-slate-300 truncate" title={tx.title}>
                      {tx.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 border border-dashed border-slate-gray/10 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-xs text-slate-gray">Nothing logged yet today — add your first expense</span>
              <button
                onClick={() => setQuickLogOpen(true)}
                className="h-8 px-3.5 bg-slate-850 hover:bg-slate-800 text-mint-cash border border-mint-cash/20 hover:border-mint-cash/40 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer outline-none"
              >
                <Plus size={12} className="stroke-[2.5]" />
                <span>Quick Log First Expense</span>
              </button>
            </div>
          )}
        </section>

        {/* Monthly MoM Recap Card */}
        <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 shadow-xl flex flex-col justify-between h-full">
          <div className="space-y-5 flex-1">
            <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
              <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
                <Sparkles size={16} className="text-mint-cash" />
                Monthly Recap
              </h3>
              <span className="text-[10px] text-slate-gray font-medium">Calendar Month</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Total Spent This Month
              </span>
              <div className="flex items-baseline justify-between">
                <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white flex items-center tracking-tight">
                  <IndianRupee size={22} className="stroke-[2.5] text-mint-cash mr-0.5" />
                  {stats.recap.thisMonthSpent.toLocaleString('en-IN')}
                </div>
                {stats.recap.lastMonthSpent > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      stats.recap.spentDiffPercent <= 0
                        ? 'bg-mint-cash/10 text-mint-cash'
                        : 'bg-crimson-alert/10 text-crimson-alert'
                    }`}
                  >
                    {stats.recap.spentDiffPercent <= 0 ? '' : '+'}
                    {stats.recap.spentDiffPercent}% MoM
                  </span>
                )}
              </div>
            </div>

            {/* Cleaned layout replacing empty gaps with clear history details */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="text-[11px] bg-bg-deep/45 p-3.5 rounded-lg border border-slate-gray/5 space-y-1">
                <span className="text-[9px] font-semibold text-slate-gray tracking-wider uppercase block">
                  Last Month's Total
                </span>
                <div className="font-numeric font-bold text-ivory-white flex items-center text-sm">
                  <IndianRupee size={12} className="mr-0.5 text-slate-400" />
                  {stats.recap.lastMonthSpent.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="text-[11px] bg-bg-deep/45 p-3.5 rounded-lg border border-slate-gray/5 space-y-1">
                <span className="text-[9px] font-semibold text-slate-gray tracking-wider uppercase block">
                  Budget Allocations
                </span>
                <div className="font-numeric font-bold text-ivory-white flex items-center text-sm">
                  <IndianRupee size={12} className="mr-0.5 text-slate-400" />
                  {budget.totalLimit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-gray/5 pt-4 mt-6 flex items-center justify-between">
            <span className="text-[10px] text-slate-gray font-medium">
              Overall Budget Status
            </span>
            <span className={`text-xs font-bold font-numeric ${budget.usedPercent >= 100 ? 'text-crimson-alert' : 'text-mint-cash'}`}>
              {budget.usedPercent}% Capacity Used
            </span>
          </div>
        </section>
      </div>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* KPI Card: Total Cycle Spent */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Spent (Current Cycle)</span>
            <IndianRupee size={16} />
          </div>
          <div className="space-y-1">
            <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white flex items-center">
              <IndianRupee size={22} className="stroke-[2.5]" />
              {cycle.totalSpent.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-gray block">
              Budget total: ₹{budget.totalLimit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* KPI Card: Total Budget Used */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Monthly Budget Used</span>
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

        {/* KPI Card: Largest Category outflow */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Largest Outflow</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full truncate max-w-[80px]">
              {summary.largestCategory.category}
            </span>
          </div>
          <div className="space-y-1">
            <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white flex items-center">
              <IndianRupee size={22} className="stroke-[2.5]" />
              {summary.largestCategory.amount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-gray block">
              Top category for current calendar month
            </span>
          </div>
        </div>

        {/* KPI Card: User Streak */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Daily Streak</span>
            <Flame size={16} className="text-rupee-gold" />
          </div>
          <div className="space-y-1">
            <div className="font-numeric font-bold text-2xl md:text-3xl text-rupee-gold flex items-center gap-1.5">
              {streak}{' '}
              <span className="text-xs font-sans text-slate-gray font-normal">
                {streak === 1 ? 'day active' : 'days active'}
              </span>
            </div>
            <span className="text-[10px] text-slate-gray block">
              Keep logging daily expenses!
            </span>
          </div>
        </div>
      </section>

      {/* Recharts Grid */}
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
                      backgroundColor: '#131924',
                      border: '1px solid rgba(100, 116, 139, 0.15)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                      color: '#F1F5F9',
                    }}
                    itemStyle={{ color: '#F1F5F9' }}
                    formatter={(value) => [value ? `₹${Number(value).toLocaleString('en-IN')}` : '₹0', 'Spent']}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] text-slate-300 font-medium px-1.5">{value}</span>
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
                      <stop offset="5%" stopColor="#05D393" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#05D393" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.05)" />
                  <XAxis
                    dataKey="month"
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748B"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#131924',
                      border: '1px solid rgba(100, 116, 139, 0.15)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#F1F5F9' }}
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                    formatter={(value) => [value ? `₹${Number(value).toLocaleString('en-IN')}` : '₹0']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[10px] text-slate-300 font-medium px-1">{value === 'spent' ? 'Spent' : 'Budget Limit'}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#05D393"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="budget"
                    stroke="#64748B"
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

      {/* Bottom section: Recent Transactions list */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Recent Ledger Entries
          </h3>
          <Link
            href="/expenses"
            className="text-xs text-mint-cash hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View All Ledger</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recentLedger.length === 0 ? (
            <div className="col-span-2 text-center py-6 text-xs text-slate-gray">
              No transactions logged yet. Use the Quick Log button below to record your first outflow!
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