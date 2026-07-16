'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  IndianRupee,
  Target,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Award,
} from 'lucide-react';

// Form validation schema allowing manual input for current saved progress
const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(50, 'Name is too long'),
  targetAmount: z.number({ invalid_type_error: 'Enter a valid target target amount' }).positive('Target must be greater than 0'),
  currentAmount: z.number({ invalid_type_error: 'Enter a starting amount' }).min(0, 'Current progress cannot be negative'),
});

type GoalFormValues = z.input<typeof goalSchema>;

interface IGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  createdAt: string;
}

interface IGoalsResponse {
  goals: IGoal[];
  totalSavingsLogged: number;
}

export default function GoalsPage() {
  const queryClient = useQueryClient();

  // Query to fetch goals metrics
  const { data, isLoading, isError } = useQuery<IGoalsResponse>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error('Failed to fetch savings goals');
      }
      return response.json();
    },
  });

  const goals = data?.goals || [];
  
  // Calculate total saved by accumulating the manual amounts across active goals
  const totalSavedAggregate = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);

  // React Hook Form for goal creation
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: undefined,
      currentAmount: 0,
    },
  });

  // Mutation to create a goal
  const createMutation = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to create goal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      reset();
    },
  });

  // Mutation to delete a goal
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/goals?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const onSubmit = (values: GoalFormValues) => {
    createMutation.mutate(values);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header Panel */}
      <div>
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
          Savings Goals
        </h1>
        <p className="text-sm text-slate-gray mt-1">
          Set targets and track your personal milestone savings progress individually.
        </p>
      </div>

      {/* Grid: Stats & Create Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Savings Metrics & Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Total Saved KPI Card */}
          <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-3">
            <div className="flex items-center justify-between text-slate-gray">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Stashed Savings</span>
              <Award size={18} className="text-mint-cash" />
            </div>
            <div className="space-y-1">
              <div className="font-numeric font-bold text-2xl md:text-3xl text-mint-cash flex items-center">
                <IndianRupee size={22} className="stroke-[2.5]" />
                {totalSavedAggregate.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-gray block">
                Aggregated progress sum of your active financial targets.
              </span>
            </div>
          </div>

          {/* Create Goal Form Card */}
          <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-gray/5 pb-2">
              <Sparkles size={14} className="text-mint-cash" />
              <h3 className="text-xs font-bold text-mint-cash tracking-wider uppercase font-numeric">
                Create Savings Goal
              </h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Goal Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-gray tracking-wide uppercase">
                  Goal Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Emergency Fund or Car Fund"
                  {...register('name')}
                  className={`w-full bg-bg-deep border rounded-lg px-3 py-2 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
                    errors.name ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                  }`}
                  disabled={createMutation.isPending}
                />
                {errors.name && (
                  <p className="text-[10px] text-crimson-alert">{errors.name.message}</p>
                )}
              </div>

              {/* Target Amount */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-gray tracking-wide uppercase">
                  Target Amount (INR)
                </label>
                <div className="relative">
                  <IndianRupee
                    size={12}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray/45"
                  />
                  <input
                    type="number"
                    placeholder="e.g., 50000"
                    {...register('targetAmount', { valueAsNumber: true })}
                    className={`w-full bg-bg-deep border rounded-lg pl-8 pr-3 py-2 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      errors.targetAmount ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                    disabled={createMutation.isPending}
                  />
                </div>
                {errors.targetAmount && (
                  <p className="text-[10px] text-crimson-alert">{errors.targetAmount.message}</p>
                )}
              </div>

              {/* Manual Current Amount Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-gray tracking-wide uppercase">
                  Current Saved Balance (INR)
                </label>
                <div className="relative">
                  <IndianRupee
                    size={12}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray/45"
                  />
                  <input
                    type="number"
                    placeholder="e.g., 5000"
                    {...register('currentAmount', { valueAsNumber: true })}
                    className={`w-full bg-bg-deep border rounded-lg pl-8 pr-3 py-2 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric ${
                      errors.currentAmount ? 'border-crimson-alert/40' : 'border-slate-gray/10'
                    }`}
                    disabled={createMutation.isPending}
                  />
                </div>
                {errors.currentAmount && (
                  <p className="text-[10px] text-crimson-alert">{errors.currentAmount.message}</p>
                )}
              </div>

              {createMutation.isError && (
                <p className="text-[10px] text-crimson-alert">
                  {createMutation.error.message || 'Error creating goal.'}
                </p>
              )}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full h-9 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 outline-none"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={14} className="stroke-[2.5]" />
                    Add Goal
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Savings Target Cards Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-gray/5">
            <Target size={16} className="text-mint-cash" />
            <h3 className="text-sm font-semibold text-ivory-white">Active Savings Targets</h3>
          </div>

          {isLoading ? (
            <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-mint-cash" />
              <span className="text-xs text-slate-gray">Loading active targets...</span>
            </div>
          ) : isError ? (
            <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center text-xs text-crimson-alert">
              Error fetching goals list.
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800/40 rounded-full flex items-center justify-center mx-auto border border-slate-700/20">
                <Target size={20} className="text-slate-gray" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="font-display font-medium text-sm text-ivory-white">No active savings goals</h3>
                <p className="text-xs text-slate-gray leading-relaxed">
                  Establish a target using the form on the left to track milestones cleanly and manually.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const isCompleted = percent >= 100;

                return (
                  <div
                    key={goal._id}
                    className={`bg-card-fill border rounded-xl p-5 flex flex-col justify-between space-y-4 shadow hover:shadow-md transition-all relative overflow-hidden group ${
                      isCompleted ? 'border-mint-cash/20 bg-mint-cash/[0.01]' : 'border-slate-gray/10'
                    }`}
                  >
                    {/* Goal Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-semibold text-xs text-ivory-white truncate group-hover:text-mint-cash transition-colors" title={goal.name}>
                          {goal.name}
                        </h4>
                        <p className="text-[10px] text-slate-gray">
                          Created: {new Date(goal.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(goal._id)}
                        className="p-1 rounded text-slate-gray/60 hover:text-crimson-alert hover:bg-crimson-alert/5 transition-colors cursor-pointer shrink-0"
                        title="Delete Goal"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline text-xs">
                        <div className="font-numeric font-bold text-mint-cash flex items-center">
                          <IndianRupee size={11} className="stroke-[2.5]" />
                          {goal.currentAmount.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-gray font-normal font-sans ml-1">saved</span>
                        </div>
                        <div className="font-numeric text-slate-gray flex items-center text-[10px]">
                          Target: <IndianRupee size={9} className="ml-1" />
                          {goal.targetAmount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-bg-deep rounded-full relative overflow-hidden border border-slate-gray/5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-gradient-to-r from-mint-cash to-emerald-400' : 'bg-mint-cash'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-gray">
                        <span>{percent}% Completed</span>
                        {isCompleted && (
                          <span className="text-mint-cash font-semibold flex items-center gap-0.5">
                            Target Met!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}