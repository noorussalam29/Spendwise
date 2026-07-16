'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  IndianRupee,
  Wallet,
  Calendar,
  AlertTriangle,
  X,
  Loader2,
  Sparkles,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { budgetSchema } from '@/lib/validations';

// Form input type for editing budget limit
const budgetEditSchema = z.object({
  monthlyLimit: z.number().min(0, 'Limit must be positive'),
});
type BudgetEditFormValues = z.infer<typeof budgetEditSchema>;

interface IBudgetSummary {
  category: string;
  limit: number;
  spent: number;
  budgetId: string | null;
  month: string;
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();

  // Selected Month filter, default to current month
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal editor states
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [currentLimitVal, setCurrentLimitVal] = useState<number>(0);

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

  // React Hook Form for budget editor
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BudgetEditFormValues>({
    resolver: zodResolver(budgetEditSchema),
  });

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
    setCurrentLimitVal(currentLimit);
    setValue('monthlyLimit', currentLimit);
  };

  const onSubmit = (data: BudgetEditFormValues) => {
    mutation.mutate(data.monthlyLimit);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
            Monthly Budgets
          </h1>
          <p className="text-sm text-slate-gray mt-1">
            Configure category spend ceilings and check consumption limits.
          </p>
        </div>

        {/* Calendar Month selector */}
        <div className="relative shrink-0 w-full sm:w-48">
          <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full bg-card-fill border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2 text-xs text-ivory-white focus-ring cursor-pointer"
          />
        </div>
      </div>

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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {budgets.map((item) => {
            const hasLimit = item.limit > 0;
            const percent = hasLimit ? Math.round((item.spent / item.limit) * 100) : 0;
            
            // Determine gauge colors
            const isExceeded = hasLimit && item.spent > item.limit;
            const isWarning = hasLimit && !isExceeded && percent >= 80;

            return (
              <div
                key={item.category}
                onClick={() => handleOpenEditModal(item.category, item.limit)}
                className={`bg-card-fill border rounded-xl p-5 space-y-4 hover:border-slate-gray/25 hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                  isExceeded
                    ? 'border-crimson-alert/20 bg-crimson-alert/[0.01]'
                    : isWarning
                    ? 'border-rupee-gold/20 bg-rupee-gold/[0.01]'
                    : 'border-slate-gray/10'
                }`}
              >
                {/* Card Title Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-ivory-white group-hover:text-mint-cash transition-colors">
                      {item.category}
                    </span>
                    <p className="text-[10px] text-slate-gray">
                      {hasLimit ? `Limit: ₹${item.limit.toLocaleString('en-IN')}` : 'No limit set'}
                    </p>
                  </div>

                  <div className="font-numeric font-bold text-sm text-ivory-white flex items-center shrink-0">
                    <IndianRupee size={12} className="stroke-[2.5] text-slate-gray" />
                    {item.spent.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Progress bar gauge */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-bg-deep rounded-full relative overflow-hidden border border-slate-gray/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        !hasLimit
                          ? 'bg-slate-700/50'
                          : isExceeded
                          ? 'bg-crimson-alert'
                          : isWarning
                          ? 'bg-rupee-gold'
                          : 'bg-mint-cash'
                      }`}
                      style={{ width: `${hasLimit ? Math.min(100, percent) : 0}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-medium font-mono">
                    <span className="text-slate-gray">
                      {hasLimit ? `${percent}% consumed` : '—'}
                    </span>
                    {hasLimit && (
                      <span
                        className={
                          isExceeded
                            ? 'text-crimson-alert'
                            : isWarning
                            ? 'text-rupee-gold'
                            : 'text-mint-cash'
                        }
                      >
                        {isExceeded
                          ? 'Breached'
                          : isWarning
                          ? 'Warning (80%+)'
                          : 'Under Budget'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning Notification icons */}
                {isExceeded && (
                  <div className="flex items-center gap-1.5 text-[10px] text-crimson-alert bg-crimson-alert/5 border border-crimson-alert/10 p-2 rounded-lg">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Breached ceiling by ₹{(item.spent - item.limit).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {isWarning && (
                  <div className="flex items-center gap-1.5 text-[10px] text-rupee-gold bg-rupee-gold/5 border border-rupee-gold/10 p-2 rounded-lg">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Approaching monthly budget cap</span>
                  </div>
                )}
              </div>
            );
          })}
        </section>
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
                onClick={() => setEditingCategory(null)}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  Monthly Limit (INR)
                </label>
                <div className="relative">
                  <IndianRupee
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5000"
                    {...register('monthlyLimit', { valueAsNumber: true })}
                    className={`w-full bg-bg-deep border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      errors.monthlyLimit ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                    disabled={mutation.isPending}
                  />
                </div>
                {errors.monthlyLimit && (
                  <p className="text-[11px] text-crimson-alert">{errors.monthlyLimit.message}</p>
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
                  className="flex-1 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving...
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
