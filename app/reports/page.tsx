'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  FileSpreadsheet, 
  FileDown, 
  ChevronLeft, 
  ChevronRight,
  Inbox,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Loader2
} from 'lucide-react';
import { IExpense } from '@/types';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  totalTransactions: number;
  avgDailySpend: number;
}

interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

interface FinancialInsights {
  highestCategory: string;
  highestCategoryAmount: number;
  largestExpense: IExpense | null;
  avgTransactionAmount: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'day' | 'month'>('month');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState<{ csv: boolean; pdf: boolean }>({ csv: false, pdf: false });

  useEffect(() => {
    const now = new Date();
    if (period === 'month') {
      setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    } else {
      setDate(now.toISOString().split('T')[0]);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [date, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthKey = period === 'month' ? date : date.substring(0, 7);
      
      const [expensesRes, budgetsRes, incomeRes] = await Promise.all([
        fetch(`/api/expenses?month=${monthKey}`),
        fetch(`/api/budgets?month=${monthKey}`),
        fetch(`/api/income?month=${monthKey}`)
      ]);

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        const filteredData = period === 'day' 
          ? expensesData.filter((e: IExpense) => String(e.date).startsWith(date))
          : expensesData;
        setExpenses(filteredData);
      }

      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        setBudgets(budgetsData);
      }

      if (incomeRes.ok) {
        const incomeData = await incomeRes.json();
        setMonthlyIncome(incomeData.monthlyIncome ?? 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (period === 'month') {
      const [year, month] = date.split('-').map(Number);
      const current = new Date(year, month - 1, 1);
      current.setMonth(current.getMonth() + (direction === 'next' ? 1 : -1));
      setDate(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    } else {
      const current = new Date(date);
      current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
      setDate(current.toISOString().split('T')[0]);
    }
  };

  const triggerBackgroundDownload = async (type: 'csv' | 'pdf') => {
    setExportLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      const params = new URLSearchParams();
      if (period === 'month') {
        params.append('month', date);
      } else {
        params.append('date', date);
      }

      const response = await fetch(`/api/reports/${type}?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export Server Error:', errorText);
        throw new Error(errorText || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `spendwise-${period}-${date}.${type}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${type.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setExportLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const formatLabel = () => {
    const d = new Date(date);
    return period === 'month' 
      ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const hasData = expenses.length > 0;

  const calculateFinancialSummary = (): FinancialSummary => {
    const totalIncome = monthlyIncome;
    
    const totalExpenses = expenses
      .filter(e => e.category !== 'Savings')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const netSavings = totalIncome - totalExpenses;
    const totalTransactions = expenses.length;
    
    const daysInPeriod = period === 'month' 
      ? new Date(parseInt(date.split('-')[0]), parseInt(date.split('-')[1]), 0).getDate()
      : 1;
    
    const avgDailySpend = daysInPeriod > 0 ? totalExpenses / daysInPeriod : 0;

    return { totalIncome, totalExpenses, netSavings, totalTransactions, avgDailySpend };
  };

  const getCategorySpending = (): CategorySpending[] => {
    const categoryTotals: Record<string, number> = {};
    const totalExpenses = expenses
      .filter(e => e.category !== 'Savings')
      .reduce((sum, e) => sum + e.amount, 0);

    expenses.forEach(e => {
      if (e.category !== 'Savings') {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
      }
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const getFinancialInsights = (): FinancialInsights => {
    const categorySpending = getCategorySpending();
    const highestCategory = categorySpending[0]?.category || 'None';
    const highestCategoryAmount = categorySpending[0]?.amount || 0;
    
    const largestExpense = expenses.length > 0 
      ? expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0])
      : null;
    
    const avgTransactionAmount = expenses.length > 0
      ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length
      : 0;

    return { highestCategory, highestCategoryAmount, largestExpense, avgTransactionAmount };
  };

  const getBudgetPerformance = () => {
    const categorySpending = getCategorySpending();
    return budgets
      .filter(b => b.limit > 0)
      .map(budget => {
        const spent = categorySpending.find(c => c.category === budget.category)?.amount || 0;
        const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
        return { ...budget, spent, percentage };
      });
  };

  const summary = calculateFinancialSummary();
  const categorySpending = getCategorySpending();
  const insights = getFinancialInsights();
  const budgetPerformance = getBudgetPerformance();

  const EmptyState = () => (
    <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-8 flex flex-col items-center justify-center text-center">
      <div className="p-3 bg-slate-gray/10 rounded-full mb-3">
        <Inbox size={28} className="text-slate-gray" />
      </div>
      <h3 className="font-semibold text-ivory-white mb-1">No transactions found</h3>
      <p className="text-sm text-slate-gray mb-4">No transactions found for this period.</p>
      <a 
        href="/expenses/new" 
        className="h-9 px-5 bg-mint-cash hover:bg-pine-light text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow"
      >
        <Plus size={14} /> Add Expense
      </a>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className={`grid gap-3 ${period === 'month' ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {period === 'month' 
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card-fill border border-slate-gray/10 rounded-xl p-4">
                <div className="h-3 bg-slate-gray/20 rounded mb-2 w-16" />
                <div className="h-5 bg-slate-gray/20 rounded w-20" />
              </div>
            ))
          : [1, 2, 3].map((i) => (
              <div key={i} className="bg-card-fill border border-slate-gray/10 rounded-xl p-4">
                <div className="h-3 bg-slate-gray/20 rounded mb-2 w-16" />
                <div className="h-5 bg-slate-gray/20 rounded w-20" />
              </div>
            ))
        }
      </div>
      <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 h-32">
        <div className="h-3 bg-slate-gray/20 rounded mb-3 w-24" />
        <div className="h-20 bg-slate-gray/10 rounded" />
      </div>
    </div>
  );

  const FinancialSummaryCard = ({ 
    icon, 
    label, 
    value, 
    trend, 
    color, 
    bgColor 
  }: { 
    icon: React.ReactNode, 
    label: string, 
    value: string, 
    trend?: 'up' | 'down' | null,
    color: string, 
    bgColor: string 
  }) => (
    <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-4 h-full hover:border-mint-cash/30 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${bgColor} ${color}`} aria-hidden="true">{icon}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-mint-cash' : 'text-crimson-alert'}`} aria-hidden="true">
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          </div>
        )}
      </div>
      <div className={`font-display font-semibold text-lg ${color}`}>{value}</div>
      <div className="text-xs text-slate-gray mt-1">{label}</div>
    </div>
  );

  const ExportCard = ({ 
    type, 
    icon, 
    title, 
    description 
  }: { 
    type: 'csv' | 'pdf', 
    icon: React.ReactNode, 
    title: string, 
    description: string 
  }) => {
    const isLoading = exportLoading[type];
    
    return (
      <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 hover:border-mint-cash/30 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={`p-2.5 rounded-lg ${isLoading ? 'bg-slate-gray/10' : 'bg-mint-cash/10'} ${isLoading ? 'text-slate-gray' : 'text-mint-cash'} flex-shrink-0`} aria-hidden="true">
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : icon}
          </div>
          <div className="flex-1 w-full">
            <h4 className="font-semibold text-sm text-ivory-white mb-1">{title}</h4>
            <p className="text-xs text-slate-gray mb-4">{description}</p>
            <button 
              type="button"
              onClick={() => triggerBackgroundDownload(type)}
              disabled={!hasData || isLoading}
              aria-label={`Download ${type.toUpperCase()} report`}
              className={`w-full sm:w-auto h-10 px-5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-mint-cash focus:ring-offset-2 focus:ring-offset-card-fill ${
                !hasData || isLoading 
                  ? 'bg-slate-gray/20 text-slate-gray cursor-not-allowed' 
                  : 'bg-mint-cash hover:bg-pine-light text-white shadow-sm hover:shadow-md'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  Download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 md:space-y-6 animate-fade-in pb-24">
      <div className="border-b border-slate-gray/5 pb-4">
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
          Reports & Analytics
        </h1>
        <p className="text-sm text-slate-gray mt-1">Generate statements and analyze your financial performance.</p>
      </div>

      <div className="sticky top-3 z-30 rounded-xl border border-slate-gray/10 bg-card-fill/95 p-3 shadow-md backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Left Side: Pagination Arrows & Custom Date Picker Combo */}
          <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-0.5 bg-bg-deep p-0.5 rounded-lg border border-slate-gray/10 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateDate('prev')}
                  aria-label="Previous period"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateDate('next')}
                  aria-label="Next period"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* DYNAMIC CLICKABLE TITLE DATE/MONTH SELECTOR */}
              <div className="min-w-0 relative group">
                <div className="relative flex items-center gap-2 cursor-pointer max-w-full">
                  <label className="text-sm font-bold text-ivory-white group-hover:text-mint-cash transition-colors flex items-center gap-1.5 cursor-pointer truncate">
                    <span className="truncate">{formatLabel()}</span>
                    <Calendar size={13} className="text-slate-gray/50 group-hover:text-mint-cash transition-colors shrink-0" />
                  </label>
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray whitespace-nowrap hidden sm:inline-block">
                    {period} View
                  </span>
                  <input
                    type={period === 'month' ? 'month' : 'date'}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray sm:hidden shrink-0">
              {period} View
            </span>
          </div>

          {/* Right Side: Period Toggle */}
          <div
            className="relative flex bg-bg-deep p-1 border border-slate-gray/10 rounded-lg h-9 items-center w-full lg:w-auto"
            role="tablist"
          >
            {(['day', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                role="tab"
                aria-selected={period === p}
                aria-controls={`reports-${p}`}
                className={`relative z-10 h-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 flex-1 lg:flex-initial lg:px-5 text-center focus-visible:outline-none ${
                  period === p
                    ? 'text-bg-deep font-bold'
                    : 'text-slate-gray hover:text-ivory-white'
                }`}
              >
                {p}
              </button>
            ))}

            <div
              className="absolute top-1 bottom-1 rounded-md bg-emerald-900 shadow-sm transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                left: period === 'day' ? '4px' : 'calc(50% + 0px)',
              }}
            />
          </div>

        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          <section>
            <h3 className="font-semibold text-sm text-ivory-white mb-3">Financial Summary</h3>
            <div className={`grid gap-3 ${period === 'month' ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {period === 'month' && (
                <>
                  <FinancialSummaryCard
                    icon={<TrendingUp size={18} />}
                    label="Total Income"
                    value={`₹${summary.totalIncome.toLocaleString('en-IN')}`}
                    color="text-mint-cash"
                    bgColor="bg-mint-cash/10"
                  />
                  <FinancialSummaryCard
                    icon={<Wallet size={18} />}
                    label="Net Savings"
                    value={`₹${summary.netSavings.toLocaleString('en-IN')}`}
                    trend={summary.netSavings >= 0 ? 'up' : 'down'}
                    color={summary.netSavings >= 0 ? 'text-mint-cash' : 'text-crimson-alert'}
                    bgColor={summary.netSavings >= 0 ? 'bg-mint-cash/10' : 'bg-crimson-alert/10'}
                  />
                </>
              )}
              <FinancialSummaryCard
                icon={<TrendingDown size={18} />}
                label="Total Expenses"
                value={`₹${summary.totalExpenses.toLocaleString('en-IN')}`}
                color="text-crimson-alert"
                bgColor="bg-crimson-alert/10"
              />
              <FinancialSummaryCard
                icon={<PieChart size={18} />}
                label="Transactions"
                value={summary.totalTransactions.toString()}
                color="text-rupee-gold"
                bgColor="bg-rupee-gold/10"
              />
              <FinancialSummaryCard
                icon={<Calendar size={18} />}
                label={period === 'day' ? "Today's Spend" : "Avg. Daily Spend"}
                value={`₹${summary.avgDailySpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                color="text-slate-gray"
                bgColor="bg-slate-gray/10"
              />
            </div>
          </section>

          {budgetPerformance.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm text-ivory-white mb-3">Budget Performance</h3>
              <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 space-y-4 hover:border-mint-cash/30 transition-all">
                {budgetPerformance.map(budget => {
                  const isOverBudget = budget.percentage > 100;
                  const isNearLimit = budget.percentage >= 80 && budget.percentage <= 100;
                  const remaining = budget.limit - budget.spent;
                  const progressColor = isOverBudget ? 'bg-crimson-alert' : isNearLimit ? 'bg-rupee-gold' : 'bg-mint-cash';
                  const textColor = isOverBudget ? 'text-crimson-alert' : isNearLimit ? 'text-rupee-gold' : 'text-slate-gray';
                  
                  return (
                    <div key={budget.budgetId || budget.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ivory-white">{budget.category}</span>
                        <span className={`text-xs font-semibold ${textColor}`}>
                          ₹{budget.spent.toLocaleString('en-IN')} / ₹{budget.limit.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-slate-gray/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${progressColor} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                            role="progressbar"
                            aria-valuenow={budget.percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${budget.category} budget usage`}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-12 text-right ${textColor}`}>
                          {budget.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-gray">Remaining: ₹{remaining.toLocaleString('en-IN')}</span>
                        <span className={textColor}>{isOverBudget ? 'Over budget' : isNearLimit ? 'Near limit' : 'On track'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {categorySpending.length > 0 && (
            <section>
              <h3 className="font-semibold text-sm text-ivory-white mb-3">Top Spending Categories</h3>
              <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 hover:border-mint-cash/30 transition-all">
                <div className="space-y-4">
                  {categorySpending.map((item, index) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-mint-cash/10 flex items-center justify-center text-xs font-semibold text-mint-cash" aria-hidden="true">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-ivory-white">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-ivory-white">₹{item.amount.toLocaleString('en-IN')}</div>
                          <div className="text-xs text-slate-gray">{item.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-gray/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-mint-cash rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                          role="progressbar"
                          aria-valuenow={item.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${item.category} spending percentage`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section>
            <h3 className="font-semibold text-sm text-ivory-white mb-3">Financial Insights</h3>
            <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 hover:border-mint-cash/30 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-gray/5 rounded-lg h-full flex flex-col justify-center">
                  <div className="text-xs text-slate-gray mb-2 font-medium">Highest Category</div>
                  <div className="text-sm font-semibold text-ivory-white">{insights.highestCategory}</div>
                  <div className="text-xs text-mint-cash mt-1 font-medium">₹{insights.highestCategoryAmount.toLocaleString('en-IN')}</div>
                </div>
                <div className="p-4 bg-slate-gray/5 rounded-lg h-full flex flex-col justify-center">
                  <div className="text-xs text-slate-gray mb-2 font-medium">Largest Expense</div>
                  <div className="text-sm font-semibold text-ivory-white truncate" title={insights.largestExpense?.title || 'None'}>{insights.largestExpense?.title || 'None'}</div>
                  <div className="text-xs text-crimson-alert mt-1 font-medium">₹{insights.largestExpense?.amount.toLocaleString('en-IN') || '0'}</div>
                </div>
                <div className="p-4 bg-slate-gray/5 rounded-lg h-full flex flex-col justify-center">
                  <div className="text-xs text-slate-gray mb-2 font-medium">Avg. Transaction</div>
                  <div className="text-sm font-semibold text-ivory-white">₹{insights.avgTransactionAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-slate-gray mt-1">Per transaction</div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm text-ivory-white mb-3">Export Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ExportCard
                type="csv"
                icon={<FileSpreadsheet size={20} />}
                title="Export as CSV"
                description="Download spreadsheet-compatible data for the selected period."
              />
              <ExportCard
                type="pdf"
                icon={<FileDown size={20} />}
                title="Export as PDF"
                description="Download a formatted PDF statement for the selected period."
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}