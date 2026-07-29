'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Flame,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  PieChart as PieIcon,
  Activity,
  Calendar,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#38BDF8',
  Transport: '#818CF8',
  Rent: '#34D399',
  Shopping: '#FB7185',
  'Data/Recharge': '#A78BFA',
  EMI: '#F5A623',
  'Family Support': '#F472B6',
  Savings: '#05D393',
  Investment: '#05D393',
  Other: '#64748B',
};

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('Failed to fetch data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-56 bg-card-fill rounded-lg" />
          <div className="h-9 w-28 bg-card-fill rounded-lg" />
        </div>
        <div className="h-48 w-full bg-card-fill rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-card-fill rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm">
        <AlertTriangle size={32} className="text-crimson-alert mx-auto animate-bounce" />
        <div>
          <h3 className="text-sm font-semibold text-ivory-white">Failed to load dashboard metrics</h3>
          <p className="text-xs text-slate-gray mt-1 leading-relaxed">
            There was an error communicating with the server. Please check your connection.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-9 px-4 bg-mint-cash hover:opacity-90 text-white text-xs font-bold rounded-lg items-center justify-center transition-colors cursor-pointer focus:outline-none focus:ring-0 focus:ring-offset-0"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { 
    cycle = { totalSpent: 0, daysRemaining: 0 }, 
    pacing = { safeToSpendDaily: 0 }, 
    budget = { usedPercent: 0, totalLimit: 0 }, 
    stats: summary = { todaySpent: 0, largestCategory: { category: 'Other', amount: 0 } }, 
    charts = { categoriesBreakdown: [] }, 
    recentLedger = [], 
    financials = { moneyLeft: 0, savedThisMonth: 0 }, 
    monthlyIncome = 0 
  } = stats;

  const categoriesBreakdown = charts.categoriesBreakdown || [];

  // Calculate circular progress for Money Left This Cycle
  const maxCap = monthlyIncome > 0 ? monthlyIncome : (budget.totalLimit > 0 ? budget.totalLimit : 1);
  const moneyLeftPercentage = Math.max(0, Math.min(100, (financials.moneyLeft / maxCap) * 100));
  const circleCircumference = 2 * Math.PI * 36;
  const strokeDashoffset = circleCircumference - (moneyLeftPercentage / 100) * circleCircumference;

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-ivory-white">
      
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-gray/10 pb-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
            Financial Command Center
          </h1>
        </div>
      </div>

      {/* HERO SECTION CONTAINER */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Today's Outflow + Pacing Dynamics */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display font-medium text-xs text-slate-gray uppercase tracking-wider">
              Today's Outflow
            </h2>
            <div className="font-numeric font-bold text-4xl md:text-5xl text-ivory-white flex items-center tracking-tight">
              <IndianRupee size={36} className="stroke-[2.5] text-ivory-white mr-1" />
              {summary.todaySpent.toLocaleString('en-IN')}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-gray/5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Safe To Spend
              </span>
              <div className="font-numeric font-bold text-base md:text-lg text-mint-cash flex items-center">
                <IndianRupee size={14} className="stroke-[2.5] mr-0.5" />
                {pacing.safeToSpendDaily.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Days to Payday
              </span>
              <div className="font-numeric font-bold text-base md:text-lg text-rupee-gold">
                {cycle.daysRemaining} days
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Cycle Spend
              </span>
              <div className="font-numeric font-bold text-base md:text-lg text-crimson-alert flex items-center">
                <IndianRupee size={14} className="stroke-[2.5] mr-0.5" />
                {cycle.totalSpent.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Money Left This Cycle with Circular Progress */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <h2 className="font-display font-medium text-xs text-slate-gray uppercase tracking-wider">
                Money Left This Cycle
              </h2>
              <div className="font-numeric font-bold text-3xl md:text-4xl text-ivory-white flex items-center tracking-tight">
                <IndianRupee size={28} className="stroke-[2.5] text-mint-cash mr-1" />
                {financials.moneyLeft.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  className="stroke-slate-gray/10"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  className="stroke-mint-cash transition-all duration-700 ease-out"
                  strokeWidth="7"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-numeric font-bold text-xs text-ivory-white">
                {Math.round(moneyLeftPercentage)}%
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-gray/5">
            <div className="flex items-center justify-between text-xs text-slate-gray">
              <span>Monthly Income: <strong className="text-ivory-white font-numeric">₹{monthlyIncome.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Category Burn Rates */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
            <Calendar size={15} className="text-slate-gray" />
            Live Category Burn Rates
          </h3>
          <span className="text-[10px] bg-card-fill border border-slate-gray/5 px-2 py-0.5 rounded text-slate-gray font-medium">Active Budget</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {categoriesBreakdown.slice(0, 6).map((cat: any) => (
            <div key={cat.name} className="bg-card-fill border border-slate-gray/5 rounded-lg p-3 transition-all hover:border-slate-gray/10">
              <div className="flex items-center gap-1.5 mb-1 truncate">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#64748B' }} />
                <span className="text-xs font-medium text-slate-gray truncate">{cat.name}</span>
              </div>
              <div className="font-numeric font-bold text-base text-ivory-white">
                <IndianRupee size={12} className="stroke-[2.5] inline mr-0.5 text-slate-gray" />
                {cat.value.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MAIN VALUE GRID (Budget & Largest Outflow Node) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        
        {/* Budget Metric Card */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 flex flex-col justify-between min-h-[110px] shadow-sm">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Budget Used ({budget.usedPercent}%)</span>
          </div>
          
          <div className="my-1">
            <div className="font-numeric font-bold text-xl md:text-2xl text-ivory-white">
              ₹{budget.totalLimit.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="w-full bg-slate-gray/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(100, budget.usedPercent)}%`,
                backgroundColor: budget.usedPercent > 100 ? '#EF4444' : budget.usedPercent >= 80 ? '#F59E0B' : '#047857'
              }}
            />
          </div>
        </div>

        {/* Largest Outflow Node Card */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Largest Outflow Node</span>
            <Zap size={16} className="text-rupee-gold" />
          </div>
          
          <div className="space-y-3 my-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: CATEGORY_COLORS[summary.largestCategory.category] || '#64748B' }} 
              />
              <span className="font-display font-semibold text-lg text-ivory-white">
                {summary.largestCategory.category}
              </span>
            </div>
            
            <div className="flex items-baseline justify-between">
              <div className="font-numeric font-bold text-2xl md:text-3xl text-ivory-white flex items-center">
                <IndianRupee size={20} className="stroke-[2.5] inline mr-1" />
                {summary.largestCategory.amount.toLocaleString('en-IN')}
              </div>
              {categoriesBreakdown.length > 0 && (
                <span className="text-xs font-semibold text-slate-gray">
                  {Math.round((summary.largestCategory.amount / categoriesBreakdown.reduce((sum: number, c: any) => sum + c.value, 0)) * 100)}% of total
                </span>
              )}
            </div>
          </div>
          
          <div className="w-full bg-slate-gray/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: categoriesBreakdown.length > 0 
                  ? `${Math.min(100, (summary.largestCategory.amount / categoriesBreakdown.reduce((sum: number, c: any) => sum + c.value, 0)) * 100)}%` 
                  : '0%',
                backgroundColor: CATEGORY_COLORS[summary.largestCategory.category] || '#64748B'
              }}
            />
          </div>
          <span className="text-[10px] text-slate-gray mt-2 block">Top spending category this calendar month</span>
        </div>
      </section>

      {/* CHARTS CONTAINER (Single Category Breakdown Card) */}
      <section className="grid grid-cols-1 gap-6">
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 flex flex-col justify-between space-y-4 shadow-sm outline-none focus:outline-none focus:ring-0">
          <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
            <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
              <PieIcon size={16} className="text-mint-cash" />
              Category Outflows
            </h3>
            <span className="text-[10px] text-slate-gray font-medium">Calendar Month</span>
          </div>

          <div className="h-60 flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none">
            {isMounted && categoriesBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer={false} className="outline-none focus:outline-none" style={{ outline: 'none' }}>
                  <Pie
                    data={categoriesBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    className="outline-none focus:outline-none"
                    style={{ outline: 'none' }}
                  >
                    {categoriesBreakdown.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CATEGORY_COLORS[entry.name] || '#64748B'} 
                        className="outline-none focus:outline-none" 
                        style={{ outline: 'none' }} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontFamily: 'sans-serif',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#1E293B' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Spent']}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={6}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] text-slate-gray font-medium px-1">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-gray flex flex-col items-center gap-2">
                <Activity size={24} className="text-slate-gray" />
                <span>No expense categories logged this month.</span>
              </div>
            )}
          </div>

          {/* Dynamic Smart Insight Feature */}
          {summary.largestCategory?.amount > 0 && (
            <div className="flex items-start gap-3 bg-card-fill border border-slate-gray/5 rounded-xl p-3.5 text-xs text-slate-gray mt-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rupee-gold/10 text-rupee-gold shrink-0 mt-0.5">
                <Sparkles size={13} />
              </div>
              <p className="leading-relaxed">
                <strong className="text-ivory-white font-semibold">Smart Insight:</strong> Your highest single outflow node this cycle is <span className="text-ivory-white font-medium">{summary.largestCategory.category}</span>, consuming <span className="text-rupee-gold font-bold">₹{summary.largestCategory.amount.toLocaleString('en-IN')}</span> of your total parsed ledger records.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT LEDGER ENTRIES */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Recent Ledger Rows
          </h3>
          <Link
            href="/expenses"
            className="text-xs text-mint-cash hover:opacity-80 flex items-center gap-1 font-semibold transition-colors"
          >
            <span>View Ledger</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recentLedger.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-xs text-slate-gray bg-card-fill border border-dashed border-slate-gray/10 rounded-lg">
              No transactions logged yet.
            </div>
          ) : (
            recentLedger.map((tx: any) => (
              <div
                key={tx._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-card-fill border border-slate-gray/5 hover:border-slate-gray/10 transition-all duration-200"
              >
                <div className="min-w-0 pr-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[9px] font-semibold"
                      style={{ 
                        backgroundColor: `${CATEGORY_COLORS[tx.category] || '#64748B'}15`, 
                        color: CATEGORY_COLORS[tx.category] || '#64748B' 
                      }}
                    >
                      {tx.category}
                    </span>
                    {tx.isRecurring && (
                      <span className="text-[8px] bg-card-fill text-rupee-gold font-bold px-1.5 py-0.5 rounded tracking-wide uppercase border border-slate-gray/10">
                        Fixed
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

                <div className="font-numeric font-bold text-sm text-ivory-white flex items-center shrink-0">
                  <IndianRupee size={12} className="stroke-[2.5] mr-0.5 text-slate-gray" />
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