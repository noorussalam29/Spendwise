'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { expenseSchema } from '@/lib/validations';
import { z } from 'zod';
import { ArrowLeft, Loader2, IndianRupee, Save } from 'lucide-react';

type ExpenseFormValues = z.input<typeof expenseSchema>;

export default function NewExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: undefined,
      category: 'Other',
      date: new Date().toISOString().split('T')[0], // Defaults to today
      notes: '',
      isRecurring: false,
      recurringFrequency: '',
    },
  });

  const isRecurringWatched = watch('isRecurring');

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create expense');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh lists and dashboard
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      router.push('/expenses');
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Back button and page title */}
      <div className="space-y-3">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-xs text-slate-gray hover:text-ivory-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Ledger</span>
        </Link>
        <div>
          <h1 className="font-display font-semibold text-2xl text-ivory-white tracking-tight">
            Log New Outflow
          </h1>
          <p className="text-xs text-slate-gray mt-1">
            Input transaction details to update your pacing dashboard.
          </p>
        </div>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card-fill border border-slate-gray/10 rounded-xl p-6 md:p-8 space-y-5 shadow-xl"
      >
        {/* Title input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Expense Title
          </label>
          <input
            type="text"
            placeholder="e.g. Broadband Bill or Zepto Groceries"
            {...register('title')}
            className={`w-full bg-bg-deep border rounded-lg px-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
              errors.title ? 'border-crimson-alert/40' : 'border-slate-gray/10'
            }`}
            disabled={mutation.isPending}
          />
          {errors.title && (
            <p className="text-[11px] text-crimson-alert">{errors.title.message}</p>
          )}
        </div>

        {/* Grid for Amount & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
              Amount (INR)
            </label>
            <div className="relative">
              <IndianRupee
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50"
              />
              <input
                type="number"
                step="any"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
                className={`w-full bg-bg-deep border rounded-lg pl-9 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                  errors.amount ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                }`}
                disabled={mutation.isPending}
              />
            </div>
            {errors.amount && (
              <p className="text-[11px] text-crimson-alert">{errors.amount.message}</p>
            )}
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
              Category
            </label>
            <select
              {...register('category')}
              className={`w-full bg-bg-deep border rounded-lg px-3.5 py-2.5 text-sm text-ivory-white focus-ring cursor-pointer ${
                errors.category ? 'border-crimson-alert/40' : 'border-slate-gray/10'
              }`}
              disabled={mutation.isPending}
            >
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Rent">Rent</option>
              <option value="Shopping">Shopping</option>
              <option value="Data/Recharge">Data/Recharge</option>
              <option value="EMI">EMI</option>
              <option value="Family Support">Family Support</option>
              <option value="Savings">Savings</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && (
              <p className="text-[11px] text-crimson-alert">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Date picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Transaction Date
          </label>
          <input
            type="date"
            {...register('date')}
            className={`w-full bg-bg-deep border rounded-lg px-4 py-2.5 text-sm text-ivory-white focus-ring cursor-pointer ${
              errors.date ? 'border-crimson-alert/40' : 'border-slate-gray/10'
            }`}
            disabled={mutation.isPending}
          />
          {errors.date && (
            <p className="text-[11px] text-crimson-alert">{errors.date.message}</p>
          )}
        </div>

        {/* Notes description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Additional Notes
          </label>
          <textarea
            placeholder="Add specific context (e.g. HDFC credit card auto-debit)"
            rows={3}
            {...register('notes')}
            className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring resize-none"
            disabled={mutation.isPending}
          />
          {errors.notes && (
            <p className="text-[11px] text-crimson-alert">{errors.notes.message}</p>
          )}
        </div>

        {/* Recurring Switch Section */}
        <div className="border-t border-slate-gray/10 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="isRecurring" className="text-xs font-semibold text-ivory-white cursor-pointer">
                Recurring Transaction
              </label>
              <p className="text-[11px] text-slate-gray">
                Auto-generate this expense in future periods.
              </p>
            </div>
            <input
              type="checkbox"
              id="isRecurring"
              {...register('isRecurring')}
              className="w-4 h-4 rounded text-mint-cash bg-bg-deep border-slate-gray/10 focus:ring-mint-cash focus:ring-opacity-20 cursor-pointer"
              disabled={mutation.isPending}
            />
          </div>

          {/* Conditional Recurrence Frequency Input */}
          {isRecurringWatched && (
            <div className="space-y-1.5 animate-fade-in animate-duration-150">
              <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                Frequency
              </label>
              <select
                {...register('recurringFrequency')}
                className={`w-full bg-bg-deep border rounded-lg px-3.5 py-2.5 text-sm text-ivory-white focus-ring cursor-pointer ${
                  errors.recurringFrequency ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                }`}
                disabled={mutation.isPending}
              >
                <option value="">Select frequency</option>
                <option value="monthly">Monthly</option>
              </select>
              {errors.recurringFrequency && (
                <p className="text-[11px] text-crimson-alert">
                  {errors.recurringFrequency.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mutation Error Notification */}
        {mutation.isError && (
          <div className="p-3 bg-crimson-alert/5 border border-crimson-alert/15 rounded-lg text-xs text-crimson-alert">
            {mutation.error.message || 'An error occurred while creating this transaction.'}
          </div>
        )}

        {/* Actions panel */}
        <div className="flex gap-4 pt-3 border-t border-slate-gray/10">
          <Link
            href="/expenses"
            className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-sm font-semibold rounded-lg flex items-center justify-center transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-sm font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Logging...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Log Outflow</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}