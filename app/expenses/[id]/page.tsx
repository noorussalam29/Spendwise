'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { expenseSchema } from '@/lib/validations';
import { z } from 'zod';
import { ArrowLeft, Loader2, IndianRupee, Save, AlertTriangle } from 'lucide-react';
import { IExpense } from '@/types';

type ExpenseFormValues = z.input<typeof expenseSchema>;

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  // Query to fetch the specific expense details
  const { data: expense, isLoading, isError } = useQuery<IExpense>({
    queryKey: ['expense', id],
    queryFn: async () => {
      const response = await fetch(`/api/expenses/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction details');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  // Populate form with fetched expense details
  useEffect(() => {
    if (expense) {
      reset({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        notes: expense.notes || '',
        isRecurring: expense.isRecurring,
        recurringFrequency: expense.recurringFrequency || '',
      });
    }
  }, [expense, reset]);

  const isRecurringWatched = watch('isRecurring');

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      router.push('/expenses');
    },
  });

  const onSubmit = (data: ExpenseFormValues) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 size={32} className="animate-spin text-mint-cash" />
        <span className="text-xs text-slate-gray">Fetching transaction ledger data...</span>
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="max-w-xl mx-auto bg-card-fill border border-slate-gray/10 rounded-xl p-8 text-center space-y-4">
        <AlertTriangle size={32} className="text-crimson-alert mx-auto" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-ivory-white">Transaction not found</h2>
          <p className="text-xs text-slate-gray">
            The transaction you are attempting to edit does not exist or you do not have permission to view it.
          </p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex h-9 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg items-center justify-center text-ivory-white transition-colors"
        >
          Return to Ledger
        </Link>
      </div>
    );
  }

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
            Modify Transaction
          </h1>
          <p className="text-xs text-slate-gray mt-1">
            Update ledger entry values and re-save.
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
              <label className="text-xs font-semibold text-ivory-white">
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
            {mutation.error.message || 'An error occurred while saving this transaction.'}
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
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
