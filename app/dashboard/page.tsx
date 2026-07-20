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
  Save,
  Check,
  Edit2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
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

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#38BDF8',
  Transport: '#818CF8',
  Rent: '#34D399',
  Shopping: '#FB7185',
  'Data/Recharge': '#A78BFA',
  EMI: '#F5A623',
  'Family Support': '#F472B6',
  Savings: '#05D393',
  Other: '#64748B',
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isMounted, setIsMounted] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isEditingBudget, setIsEditingBudget] = useState(false);

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

  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: number) => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudget: budget }),
      });
      if (!response.ok) throw new Error('Failed to update budget');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIsEditingBudget(false);
    },
  });

  useEffect(() => {
    if (stats?.budget?.totalLimit > 0) {
      setMonthlyBudget(stats.budget.totalLimit);
    }
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-9 w-56 bg-card-fill rounded-lg" />
          <div className="h-9 w-28 bg-card-fill rounded-lg" />
        </div>
        <div className="h-48 w-full bg-card-fill rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-card-fill rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
        <AlertTriangle size={32} className="text-crimson-alert mx-auto animate-bounce" />
        <div>
          <h3 className="text-sm font-semibold text-ivory-white">Failed to load dashboard metrics</h3>
          <p className="text-xs text-slate-gray mt-1 leading-relaxed">
            There was an error communicating with the server. Please check your connection.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-9 px-4 bg-mint-cash hover:opacity-90 text-white text-xs font-bold rounded-lg items-center justify-center transition-colors cursor-pointer"
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
    charts = { categoriesBreakdown: [], trend: [] }, 
    recentLedger = [], 
    financials = { moneyLeft: 0, sentToFamily: 0, savedThisMonth: 0 }, 
    monthlyIncome = 0 
  } = stats;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16 text-ivory-white">
      
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-gray/10 pb-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
            Financial Command Center
          </h1>
          <p className="text-sm text-slate-gray mt-1">
            Your money at a glance. Stay in control between paydays.
          </p>
        </div>
      </div>

      {/* HERO SECTION CONTAINER - Rearranged to match wireframe sketch */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Today's Outflow + Pacing Dynamics */}
        <div className="lg:col-span-2 bg-card-fill border border-slate-gray/10 rounded-xl p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <h2 className="font-display font-medium text-xs text-slate-gray uppercase tracking-wider">
              Today's Outflow
            </h2>
            <div className="font-numeric font-bold text-4xl md:text-5xl text-ivory-white flex items-center tracking-tight">
              <IndianRupee size={36} className="stroke-[2.5] text-ivory-white mr-1" />
              {summary.todaySpent.toLocaleString('en-IN')}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-gray/5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Safe To Spend Today
              </span>
              <div className="font-numeric font-bold text-xl text-mint-cash flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5" />
                {pacing.safeToSpendDaily.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray block uppercase font-medium">
                Days to Payday
              </span>
              <span className="text-xl font-bold text-rupee-gold font-numeric">
                {cycle.daysRemaining} days
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Money Left + Income & Spending Overview */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="font-display font-medium text-xs text-slate-gray uppercase tracking-wider">
              Money Left This Cycle
            </h2>
            <div className="font-numeric font-bold text-3xl md:text-4xl text-ivory-white flex items-center tracking-tight">
              <IndianRupee size={28} className="stroke-[2.5] text-mint-cash mr-1" />
              {financials.moneyLeft.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-gray/5 text-xs text-slate-gray">
            <div>
              <span className="block text-[10px] text-slate-gray uppercase font-medium">Monthly Income</span>
              <span className="font-semibold text-ivory-white text-sm">₹{monthlyIncome.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-gray uppercase font-medium">Cycle Spending</span>
              <span className="font-semibold text-crimson-alert text-sm">₹{cycle.totalSpent.toLocaleString('en-IN')}</span>
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {charts.categoriesBreakdown.slice(0, 6).map((cat: any) => (
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

      {/* MAIN VALUE GRID */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        
        {/* Budget Metric Card */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 flex flex-col justify-between min-h-[110px] shadow-sm">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Budget Used ({budget.usedPercent}%)</span>
            <button 
              onClick={() => setIsEditingBudget(!isEditingBudget)} 
              className="p-1 hover:bg-card-fill border border-transparent hover:border-slate-gray/5 text-slate-gray hover:text-ivory-white rounded transition-colors cursor-pointer"
            >
              {isEditingBudget ? <Check size={14} className="text-mint-cash" /> : <Edit2 size={12} />}
            </button>
          </div>
          
          <div className="my-1">
            {isEditingBudget ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                  className="w-full bg-card-fill text-ivory-white text-sm font-bold p-1 rounded border border-slate-gray/10 focus:outline-none focus:border-mint-cash"
                />
                <button
                  onClick={() => updateBudgetMutation.mutate(monthlyBudget)}
                  className="p-1.5 bg-mint-cash text-white rounded hover:opacity-90 transition-colors cursor-pointer"
                >
                  <Save size={14} />
                </button>
              </div>
            ) : (
              <div className="font-numeric font-bold text-xl md:text-2xl text-ivory-white">
                ₹{budget.totalLimit.toLocaleString('en-IN')}
              </div>
            )}
          </div>

          <div className="w-full bg-slate-gray/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budget.usedPercent > 100 ? 'bg-crimson-alert' : budget.usedPercent >= 80 ? 'bg-rupee-gold' : 'bg-mint-cash'
              }`}
              style={{ width: `${Math.min(100, budget.usedPercent)}%` }}
            />
          </div>
        </div>

        {/* Sent To Family */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Sent To Family</span>
            <TrendingUp size={16} className="text-slate-gray" />
          </div>
          <div className="font-numeric font-bold text-xl md:text-2xl text-ivory-white">
            <IndianRupee size={18} className="stroke-[2.5] inline mr-0.5 text-slate-gray" />
            {financials.sentToFamily.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Saved This Month */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-gray">
            <span className="text-xs font-medium">Saved This Month</span>
            <Flame size={16} className="text-mint-cash" />
          </div>
          <div className="font-numeric font-bold text-xl md:text-2xl text-mint-cash">
            <IndianRupee size={18} className="stroke-[2.5] inline mr-0.5" />
            {financials.savedThisMonth.toLocaleString('en-IN')}
          </div>
        </div>
      </section>

      {/* CHARTS CONTAINER */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        
        {/* Category Breakdown */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 flex flex-col justify-between space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
            <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white flex items-center gap-2">
              <PieIcon size={16} className="text-mint-cash" />
              Category Outflows
            </h3>
            <span className="text-[10px] text-slate-gray font-medium">Calendar Month</span>
          </div>

          <div className="h-60 flex items-center justify-center">
            {isMounted && charts.categoriesBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.categoriesBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {charts.categoriesBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#64748B'} />
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

        {/* Historic Ledger Area Chart */}
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
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
                <AreaChart data={charts.trend} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#05D393" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#05D393" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.05)" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? v / 1000 + 'k' : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#1E293B' }}
                    labelStyle={{ color: '#64748B', fontWeight: 'bold' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={6}
                    formatter={(value) => (
                      <span className="text-[10px] text-slate-gray font-medium px-1">
                        {value === 'spent' ? 'Spent' : 'Limit Target'}
                      </span>
                    )}
                  />
                  <Area type="monotone" dataKey="spent" stroke="#05D393" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpent)" />
                  <Area type="monotone" dataKey="budget" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
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