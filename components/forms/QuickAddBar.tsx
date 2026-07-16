'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseSchema } from '@/lib/validations';
import { z } from 'zod';
import { Plus, X, IndianRupee, Loader2, Sparkles } from 'lucide-react';
import { useUIStore } from '@/lib/store';

// Extract subset of fields for quick-add form
const quickAddSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(50),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  category: z.enum([
    'Food',
    'Transport',
    'Rent',
    'Shopping',
    'Data/Recharge',
    'EMI',
    'Family Support',
    'Savings',
    'Other',
  ]),
});

// Infer the form values type from the schema
type QuickAddFormValues = z.infer<typeof quickAddSchema>;

export default function QuickAddBar() {
  const { isQuickLogOpen: isOpen, setQuickLogOpen: setIsOpen } = useUIStore();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      title: '',
      amount: undefined,
      category: 'Other',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: QuickAddFormValues) => {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          date: new Date(), // Set date to current timestamp
          isRecurring: false,
          notes: '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save expense');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to trigger instant cache updates on dashboard & ledger
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      reset();
      setIsOpen(false);
    },
  });

  const onSubmit = (data: QuickAddFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-8 z-40 flex flex-col items-end">
      {/* Collapsed floating button trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-mint-cash hover:bg-emerald-400 text-bg-deep font-semibold h-12 px-5 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer font-sans text-sm outline-none"
        >
          <Plus size={18} className="stroke-[2.5]" />
          <span>Quick Log</span>
        </button>
      )}

      {/* Expanded Quick-Add form card */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 bg-card-fill border border-slate-gray/15 rounded-xl p-5 shadow-2xl space-y-4 animate-fade-in animate-duration-200">
          <div className="flex items-center justify-between border-b border-slate-gray/10 pb-2">
            <span className="text-xs font-bold text-mint-cash tracking-wider uppercase flex items-center gap-1.5 font-numeric">
              <Sparkles size={12} />
              Quick Log Expense
            </span>
            <button
              onClick={() => {
                reset();
                setIsOpen(false);
              }}
              className="text-slate-gray hover:text-ivory-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Title Input */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Expense title (e.g. Tea, Petrol, House Rent)"
                {...register('title')}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-3 py-2 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                disabled={mutation.isPending}
              />
              {errors.title && (
                <p className="text-[10px] text-crimson-alert">{errors.title.message}</p>
              )}
            </div>

            {/* Grid for Amount & Category */}
            <div className="grid grid-cols-2 gap-2">
              {/* Amount Input */}
              <div className="space-y-1">
                <div className="relative">
                  <IndianRupee
                    size={12}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-gray/45"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Amount"
                    {...register('amount', { valueAsNumber: true })}
                    className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-7 pr-3 py-2 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric"
                    disabled={mutation.isPending}
                  />
                </div>
                {errors.amount && (
                  <p className="text-[10px] text-crimson-alert">{errors.amount.message}</p>
                )}
              </div>

              {/* Category Select */}
              <div className="space-y-1">
                <select
                  {...register('category')}
                  className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-2.5 py-2 text-xs text-ivory-white focus-ring cursor-pointer"
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
                  <p className="text-[10px] text-crimson-alert">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* Error Message if Mutation fails */}
            {mutation.isError && (
              <p className="text-[10px] text-crimson-alert">
                {mutation.error.message || 'Error saving transaction.'}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsOpen(false);
                }}
                className="flex-1 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold py-2 rounded-lg transition-colors cursor-pointer"
                disabled={mutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Log Entry'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}