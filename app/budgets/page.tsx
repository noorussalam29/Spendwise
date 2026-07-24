'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSession } from 'next-auth/react';
import {
  IndianRupee,
  Calendar,
  X,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Plus,
} from 'lucide-react';

// Form input type for editing budget limit
const budgetEditSchema = z.object({
  monthlyLimit: z.number().min(0, 'Limit must be positive'),
});
type BudgetEditFormValues = z.infer<typeof budgetEditSchema>;

// Form input type for financial preferences
const financialPrefsSchema = z.object({
  monthlyIncome: z.number().min(0, 'Monthly income must be positive'),
  payday: z.number().min(1, 'Payday must be between 1 and 31').max(31, 'Payday must be between 1 and 31'),
});
type FinancialPrefsFormValues = z.infer<typeof financialPrefsSchema>;

interface IBudgetSummary {
  category: string;
  limit: number;
  spent: number;
  budgeId: string | null;
  month: string;
}

interface IMonthlyIncomeResponse {
  month: string;
  monthlyIncome: number;
  payday: number | null;
}

const formatMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Selected Month filter, default to current month
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal editor states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showFinancialPrefs, setShowFinancialPrefs] = useState(false);

  // TanStack Query to fetch budgets
  const { data: budgets = [], isLoading, isError } = useQuery<IBudgetSummary[]>({
    queryKey: ['budgets', month],
    queryFn: async () => {
      const response = await fetch(`/api/budgets?month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget list');
      }
      return response.json();
    },
  });

  // TanStack Query to fetch income for the selected month
  const {
    data: incomeData,
    isLoading: isIncomeLoading,
    isError: isIncomeError,
  } = useQuery<IMonthlyIncomeResponse>({
    queryKey: ['income', month],
    queryFn: async () => {
      const response = await fetch(`/api/income?month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch income');
      }
      return response.json();
    },
  });

  // React Hook Form for budget editor
  const {
    register: registerBudget,
    handleSubmit: handleSubmitBudget,
    setValue: setBudgetValue,
    formState: { errors: budgetErrors },
  } = useForm<BudgetEditFormValues>({
    resolver: zodResolver(budgetEditSchema),
  });

  // React Hook Form for financial preferences
  const {
    register: registerFinancial,
    handleSubmit: handleSubmitFinancial,
    setValue: setFinancialValue,
    formState: { errors: financialErrors },
  } = useForm<FinancialPrefsFormValues>({
    resolver: zodResolver(financialPrefsSchema),
    defaultValues: {
      monthlyIncome: 0,
      payday: 1,
    },
  });

  // Populate the income modal with data for the selected month when opened
  useEffect(() => {
    if (showFinancialPrefs && incomeData !== undefined) {
      setFinancialValue('monthlyIncome', incomeData.monthlyIncome);
      setFinancialValue(
        'payday',
        incomeData.payday ?? (session?.user as any)?.payday ?? 1
      );
    }
  }, [showFinancialPrefs, incomeData, session, setFinancialValue]);

  // TanStack Mutation to upsert a budget limit
  const mutation = useMutation({
    mutationFn: async (limit: number) => {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editingCategory,
          monthlyLimit: limit,
          month,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to save budget limit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', month] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingCategory(null);
    },
  });

  const handleOpenEditModal = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setBudgetValue('monthlyLimit', currentLimit);
  };

  const onSubmitBudget = (data: BudgetEditFormValues) => {
    mutation.mutate(data.monthlyLimit);
  };

  const incomeMutation = useMutation({
    mutationFn: async (data: FinancialPrefsFormValues) => {
      const response = await fetch('/api/income', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          monthlyIncome: data.monthlyIncome,
          payday: data.payday,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update income');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', month] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowFinancialPrefs(false);
    },
  });

  const onSubmitFinancial = (data: FinancialPrefsFormValues) => {
    incomeMutation.mutate(data);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, monthNumber] = month.split('-').map(Number);
    const current = new Date(year, monthNumber - 1, 1);
    if (direction === 'prev') {
      current.setMonth(current.getMonth() - 1);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
    const nextYear = current.getFullYear();
    const nextMonth = String(current.getMonth() + 1).padStart(2, '0');
    setMonth(`${nextYear}-${nextMonth}`);
  };

  // Sort logic applied dynamically on the client: Capped limits float to the top
  const sortedBudgets = [...budgets].sort((a, b) => {
    const aHasLimit = a.limit > 0 ? 1 : 0;
    const bHasLimit = b.limit > 0 ? 1 : 0;
    return bHasLimit - aHasLimit; // 1 comes before 0
  });

  const currentMonthLabel = formatMonthLabel(month);
  const statsLoading = isLoading || isIncomeLoading;
  const monthlyIncome = incomeData?.monthlyIncome ?? 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-24 relative">
      {/* Responsive Balanced Header Panel */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-gray/5 pb-4">
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight truncate">
            Monthly Budgets
          </h1>
          <p className="hidden sm:block text-sm text-slate-gray mt-1">
            Set monthly spending limits and track your consumption.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFinancialPrefs(true)}
          className="inline-flex h-9 px-4 bg-mint-cash hover:bg-pine-light text-bg-deep rounded-lg items-center justify-center gap-1.5 text-xs font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-sm whitespace-nowrap"
        >
          <Plus size={14} className="stroke-[2.5]" />
          <span>Set Income</span>
        </button>
      </div>
      <p className="block sm:hidden text-xs text-slate-gray -mt-2">
        Set monthly spending limits and track your consumption.
      </p>

      {/* RE-ARCHITECTED STICKY NAVIGATION DOCK */}
      <div className="sticky top-3 z-30 rounded-xl border border-slate-gray/10 bg-card-fill/95 p-3 shadow-md backdrop-blur-md">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Left Side: Pagination Arrows & Custom Date Picker Combo */}
          <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-0.5 bg-bg-deep p-0.5 rounded-lg border border-slate-gray/10 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  aria-label="Previous Month"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  aria-label="Next Month"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* DYNAMIC CLICKABLE TITLE MONTH SELECTOR */}
              <div className="min-w-0 relative group">
                <div className="relative flex items-center gap-2 cursor-pointer max-w-full">
                  <label className="text-sm font-bold text-ivory-white group-hover:text-mint-cash transition-colors flex items-center gap-1.5 cursor-pointer truncate">
                    <span className="truncate">{currentMonthLabel}</span>
                    <Calendar size={13} className="text-slate-gray/50 group-hover:text-mint-cash transition-colors shrink-0" />
                  </label>
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray whitespace-nowrap hidden sm:inline-block">
                    Month View
                  </span>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray sm:hidden shrink-0">
              Month View
            </span>
          </div>

        {/* Right Side: Month Toggle */}
<div
  className="relative flex bg-bg-deep p-1 border border-slate-gray/10 rounded-lg h-9 items-center w-full lg:w-auto"
  role="tablist"
>
  {[
    {
      label: 'This Month',
      value: 'this',
    },
    {
      label: 'Last Month',
      value: 'last',
    },
  ].map((item) => (
    <button
      key={item.value}
      type="button"
      onClick={() => {
        const now = new Date();

        if (item.value === 'this') {
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          setMonth(`${yyyy}-${mm}`);
        } else {
          const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const yyyy = prevMonth.getFullYear();
          const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
          setMonth(`${yyyy}-${mm}`);
        }
      }}
      role="tab"
      aria-selected={
        item.value === 'this'
          ? month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
          : month === `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`
      }
      className={`relative z-10 h-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 flex-1 lg:flex-initial lg:px-5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 ${
        (item.value === 'this' &&
          month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`) ||
        (item.value === 'last' &&
          month === `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`)
          ? 'text-bg-deep font-bold'
          : 'text-slate-gray hover:text-ivory-white'  
      }`}
    >
      {item.label}
    </button>
  ))}

  <div
    className="absolute top-1 bottom-1 rounded-md bg-emerald-900 shadow-sm transition-all duration-300 ease-out"
    style={{
      width: 'calc(50% - 4px)',
      left:
        month === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
          ? '4px'
          : 'calc(50% + 0px)',
    }}
  />
</div>
        </div>
      </div>

      {/* Budget Summary Stats */}
      {statsLoading ? (
        <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-slate-gray/20 rounded w-16" />
                <div className="h-6 bg-slate-gray/15 rounded w-24" />
              </div>
            ))}
          </div>
        </section>
      ) : !isError && !isIncomeError && budgets.length > 0 ? (
        <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Total Budget
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5 text-slate-gray" />
                {budgets.reduce((sum, b) => sum + (b.limit > 0 ? b.limit : 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Total Spent
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5 text-slate-gray" />
                {budgets.reduce((sum, b) => sum + (b.limit > 0 ? b.spent : 0), 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Remaining Budget
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-mint-cash flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5 opacity-80" />
                {Math.max(0, budgets.reduce((sum, b) => sum + (b.limit > 0 ? (b.limit - b.spent) : 0), 0)).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Uncapped Spending
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5 text-slate-gray" />
                {budgets.reduce((sum, b) => sum + (b.limit > 0 ? 0 : b.spent), 0).toLocaleString('en-IN')}
              </div>
            
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase block">
                Monthly Income
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-0.5 text-slate-gray" />
                {monthlyIncome.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Main Budget Grid */}
      {isLoading ? (
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-mint-cash" />
          <span className="text-xs text-slate-gray">Aggregating budget ledger statistics...</span>
        </div>
      ) : isError ? (
        <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center text-xs text-crimson-alert">
          Failed to fetch budget metrics. Please check connection and try again.
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedBudgets.map((item) => {
            const hasLimit = item.limit > 0;
            const percent = hasLimit ? Math.round((item.spent / item.limit) * 100) : 0;
            
            const isExceeded = hasLimit && item.spent > item.limit;
            const isNearLimit = hasLimit && !isExceeded && percent >= 80;

            const remaining = item.limit - item.spent;

            return (
              <div
                key={item.category}
                onClick={() => handleOpenEditModal(item.category, item.limit)}
                className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 hover:border-slate-gray/25 transition-all duration-200 cursor-pointer flex flex-col justify-between h-[210px]"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display font-semibold text-sm text-ivory-white truncate max-w-[60%]">
                    {item.category}
                  </span>
                  
                  {/* Status Badge */}
                  <div className="shrink-0 text-right">
                    {!hasLimit ? (
                      <span className="text-[10px] text-slate-gray/70">Uncapped</span>
                    ) : isExceeded ? (
                      <span className="text-[10px] font-medium text-crimson-alert">🔴 Over Budget</span>
                    ) : isNearLimit ? (
                      <span className="text-[10px] font-medium text-rupee-gold">🟡 Near Limit</span>
                    ) : (
                      <span className="text-[10px] font-medium text-mint-cash">🟢 Under Budget</span>
                    )}
                  </div>
                </div>

                {/* Table Layout Values */}
                <div className="text-xs space-y-2.5 mt-2">
                  <div className="flex justify-between items-center text-slate-gray">
                    <span>Spent</span>
                    <span className="font-numeric font-semibold text-ivory-white flex items-center">
                      <IndianRupee size={12} className="mr-0.5 text-slate-gray/70" />
                      {item.spent.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-gray">
                    <span>Limit</span>
                    <span className="font-numeric font-semibold text-ivory-white flex items-center">
                      {hasLimit ? (
                        <>
                          <IndianRupee size={12} className="mr-0.5 text-slate-gray/70" />
                          {item.limit.toLocaleString('en-IN')}
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-gray border-t border-slate-gray/5 pt-2">
                    <span>{isExceeded ? 'Over by' : 'Remaining'}</span>
                    <span className={`font-numeric font-bold flex items-center ${isExceeded ? 'text-crimson-alert' : 'text-mint-cash'}`}>
                      <IndianRupee size={12} className="mr-0.5" />
                      {Math.abs(remaining).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Unified Progress Indicators */}
                <div className="space-y-2 pt-2 mt-auto">
                  {hasLimit ? (
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 bg-bg-deep rounded-full relative overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isExceeded ? 'bg-crimson-alert' : isNearLimit ? 'bg-rupee-gold' : 'bg-mint-cash'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-gray font-mono shrink-0 whitespace-nowrap min-w-[42px] text-right">
                        {percent}% Used
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-gray/50 italic py-0.5">
                      No budget limit set
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Financial Preferences Modal */}
      {showFinancialPrefs && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in animate-duration-150">
            <div className="flex items-center justify-between border-b border-slate-gray/10 pb-2">
              <span className="text-xs font-bold text-mint-cash tracking-wider uppercase flex items-center gap-1.5 font-numeric">
                <Wallet size={12} />
                Financial Preferences
              </span>
              <button
                type="button"
                onClick={() => setShowFinancialPrefs(false)}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-deep"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-medium text-sm text-ivory-white">
                Set Monthly Income & Payday
              </h3>
              <p className="text-[11px] text-slate-gray">
                Setting income for <span className="text-mint-cash font-semibold">{currentMonthLabel}</span>
              </p>
            </div>

            <form onSubmit={handleSubmitFinancial(onSubmitFinancial)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  Monthly Income (INR)
                </label>
                <div className="relative h-11">
                  <IndianRupee
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 50000"
                    {...registerFinancial('monthlyIncome', { valueAsNumber: true })}
                    className={`w-full h-full bg-bg-deep border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      financialErrors.monthlyIncome ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                  />
                </div>
                {financialErrors.monthlyIncome && (
                  <p className="text-[11px] text-crimson-alert">{financialErrors.monthlyIncome.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  Payday (Day of Month)
                </label>
                <div className="relative h-11">
                  <Calendar
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50"
                  />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 1"
                    {...registerFinancial('payday', { valueAsNumber: true })}
                    className={`w-full h-full bg-bg-deep border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      financialErrors.payday ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                  />
                </div>
                {financialErrors.payday && (
                  <p className="text-[11px] text-crimson-alert">{financialErrors.payday.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFinancialPrefs(false)}
                  className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  disabled={incomeMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={incomeMutation.isPending || isIncomeLoading}
                >
                  {incomeMutation.isPending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
              {incomeMutation.isError && (
                <p className="text-[11px] text-crimson-alert">
                  {incomeMutation.error.message || 'Failed to save income.'}
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Editor Modal Overlay */}
      {editingCategory && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in animate-duration-150">
            <div className="flex items-center justify-between border-b border-slate-gray/10 pb-2">
              <span className="text-xs font-bold text-mint-cash tracking-wider uppercase flex items-center gap-1.5 font-numeric">
                <Sparkles size={12} />
                Set Category Limit
              </span>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-deep"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-medium text-sm text-ivory-white">
                Category: {editingCategory}
              </h3>
              <p className="text-[11px] text-slate-gray">
                Update the monthly spent cap for this category in the month of {month}.
              </p>
            </div>

            <form onSubmit={handleSubmitBudget(onSubmitBudget)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  Monthly Limit (INR)
                </label>
                <div className="relative h-11">
                  <IndianRupee
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000"
                    {...registerBudget('monthlyLimit', { valueAsNumber: true })}
                    className={`w-full h-full bg-bg-deep border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      budgetErrors.monthlyLimit ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                    disabled={mutation.isPending}
                  />
                </div>
                {budgetErrors.monthlyLimit && (
                  <p className="text-[11px] text-crimson-alert">{budgetErrors.monthlyLimit.message}</p>
                )}
              </div>

              {mutation.isError && (
                <p className="text-[11px] text-crimson-alert">
                  {mutation.error.message || 'Error updating budget limit.'}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmitBudget(onSubmitBudget)}
                  className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Limit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}