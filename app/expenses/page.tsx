'use client';

import { useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IndianRupee, Plus, Search, Filter, Edit2, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Calendar } from 'lucide-react';
import { IExpense } from '@/types';

// Helper to format date in a premium human-readable way
const formatDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatGroupLabel = (dateString: string | Date) => {
  const d = new Date(dateString);
  const today = new Date();
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(today.getDate() - 2);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  if (isSameDay(d, dayBeforeYesterday)) return 'Day before yesterday';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (dateString: string | Date) => {
  const d = new Date(dateString);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getLocalDateKey = (dateString: string | Date) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  
  // State for search and filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  // Track segment active state styling toggle ('today' | 'this-month' | 'last-month' | null)
  const [activeSegment, setActiveSegment] = useState<'today' | 'this-month' | 'last-month' | null>('this-month');

  // Custom Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Default month filter to current year-month
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  // Day filter for day-level navigation
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Touch handling for swipe gestures
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Query to fetch expenses based on active filters
  const { data: expenses = [], isLoading, isError } = useQuery<IExpense[]>({
    queryKey: ['expenses', { search, category, month }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);
      if (month) params.append('month', month);

      const response = await fetch(`/api/expenses?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      return response.json();
    },
  });

  // Mutation to delete an expense
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteTarget(null);
    },
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setActiveSegment(null);
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
    setSelectedDay(null);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    if (!selectedDay) return;
    setActiveSegment(null);
    
    const [year, monthVal, day] = selectedDay.split('-').map(Number);
    const current = new Date(year, monthVal - 1, day);
    
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }

    const nextYear = current.getFullYear();
    const nextMonth = String(current.getMonth() + 1).padStart(2, '0');
    const nextDay = String(current.getDate()).padStart(2, '0');
    
    const newMonthStr = `${nextYear}-${nextMonth}`;
    if (newMonthStr !== month) {
      setMonth(newMonthStr);
    }
    setSelectedDay(`${nextYear}-${nextMonth}-${nextDay}`);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        if (selectedDay) {
          navigateDay('next');
        } else {
          navigateMonth('next');
        }
      } else {
        if (selectedDay) {
          navigateDay('prev');
        } else {
          navigateMonth('prev');
        }
      }
    }
  };

  const selectedMonthExpenses = useMemo(() => {
    return (expenses || []).filter((expense) => {
      const expenseDate = new Date(expense.date);
      const [year, monthNumber] = month.split('-').map(Number);
      return expenseDate.getFullYear() === year && expenseDate.getMonth() === monthNumber - 1;
    });
  }, [expenses, month]);

  const filteredExpenses = useMemo(() => {
    if (!selectedDay) return selectedMonthExpenses;
    return selectedMonthExpenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      const [year, monthVal, day] = selectedDay.split('-').map(Number);
      return expenseDate.getFullYear() === year && 
             expenseDate.getMonth() === monthVal - 1 && 
             expenseDate.getDate() === day;
    });
  }, [selectedMonthExpenses, selectedDay]);

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, IExpense[]>();

    filteredExpenses.forEach((expense) => {
      const key = getLocalDateKey(expense.date);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(expense);
    });

    return Array.from(groups.entries())
      .map(([key, items]) => {
        const sortedItems = [...items].sort((a, b) => {
          const aTime = new Date(a.date).getTime();
          const bTime = new Date(b.date).getTime();
          return bTime - aTime;
        });

        const subtotal = sortedItems.reduce((sum, item) => sum + item.amount, 0);

        return {
          key,
          label: formatGroupLabel(key),
          date: key,
          subtotal,
          items: sortedItems,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredExpenses]);

  const today = new Date();
  const currentMonthLabel = formatMonthLabel(month);
  const isCurrentMonth = month === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16 relative">
      
      {/* PROFESSIONAL CUSTOM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-bg-deep/60 backdrop-blur-sm"
            onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-gray/10 bg-card-fill p-6 shadow-2xl transition-all animate-fade-in space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson-alert/15 text-crimson-alert">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-ivory-white">Delete Transaction</h3>
                <p className="text-xs text-slate-gray leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-ivory-white">"{deleteTarget.title}"</span>? This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
                className="h-9 px-4 rounded-lg bg-bg-deep border border-slate-gray/10 text-xs font-semibold text-slate-gray hover:text-ivory-white transition-all disabled:opacity-45"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
                className="h-9 px-4 rounded-lg bg-crimson-alert hover:bg-crimson-alert/90 text-bg-deep text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-[80px]"
              >
                {deleteMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE OPTIMIZED HEADER GRID SECTION */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-gray/5 pb-4">
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight truncate">
            Expenses Ledger
          </h1>
          <p className="hidden sm:block text-sm text-slate-gray mt-1">
            Track and filter your transactions month-over-month.
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <Link
            href="/expenses/new"
            className="inline-flex h-9 px-4 bg-mint-cash hover:bg-pine-light text-bg-deep rounded-lg items-center justify-center gap-1.5 text-xs font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-sm whitespace-nowrap"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Expense</span>
          </Link>
        </div>
      </div>
      <p className="block sm:hidden text-xs text-slate-gray -mt-2">
        Track and filter your transactions month-over-month.
      </p>

       {/* FULLY MOBILE RE-ARCHITECTED STICKY CONTROL DOCK */}
            <div className="sticky top-3 z-30 rounded-xl border border-slate-gray/10 bg-card-fill/95 p-3 shadow-md backdrop-blur-md">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                
                {/* Upper Deck on Mobile: Date selectors and view bounds */}
                <div className="flex items-center justify-between gap-2 w-full lg:w-auto">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-0.5 bg-bg-deep p-0.5 rounded-lg border border-slate-gray/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => selectedDay ? navigateDay('prev') : navigateMonth('prev')}
                        aria-label="Previous"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedDay ? navigateDay('next') : navigateMonth('next')}
                        disabled={!selectedDay && isCurrentMonth}
                        aria-label="Next"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    {/* DYNAMIC CLICKABLE TITLE CALENDAR SELECTOR */}
                    <div className="min-w-0 relative group">
                      {selectedDay ? (
                        <h2 className="text-sm font-bold text-ivory-white flex items-center gap-2 truncate">
                          <span>{formatDate(selectedDay)}</span>
                          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray whitespace-nowrap hidden sm:inline-block">
                            Day View
                          </span>
                        </h2>
                      ) : (
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
                            onChange={(e) => {
                              setMonth(e.target.value);
                              setSelectedDay(null);
                              setActiveSegment(null);
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Context Badge shown specifically on Mobile right alignment */}
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-deep border border-slate-gray/5 font-medium text-slate-gray sm:hidden shrink-0">
                    {selectedDay ? 'Day' : 'Month'}
                  </span>
                </div>

                {/* Lower Deck on Mobile: Fluid segment control strip */}
                <div className="flex items-center gap-2 w-full lg:w-auto">
                  <div className="flex bg-bg-deep p-0.5 border border-slate-gray/10 rounded-lg h-9 items-center w-full lg:w-auto flex-1 lg:flex-initial">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        setMonth(`${yyyy}-${mm}`);
                        setSelectedDay(`${yyyy}-${mm}-${dd}`);
                        setActiveSegment('today');
                      }}
                      className={`h-7 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 lg:flex-initial lg:px-4 text-center ${
                        activeSegment === 'today' 
                          ? 'bg-mint-cash text-bg-deep shadow-sm font-extrabold' 
                          : 'text-slate-gray hover:text-ivory-white'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        setMonth(`${yyyy}-${mm}`);
                        setSelectedDay(null);
                        setActiveSegment('this-month');
                      }}
                      className={`h-7 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 lg:flex-initial lg:px-4 text-center ${
                        activeSegment === 'this-month' 
                          ? 'bg-mint-cash text-bg-deep shadow-sm font-extrabold' 
                          : 'text-slate-gray hover:text-ivory-white'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const yyyy = prevMonth.getFullYear();
                        const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
                        setMonth(`${yyyy}-${mm}`);
                        setSelectedDay(null);
                        setActiveSegment('last-month');
                      }}
                      className={`h-7 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 lg:flex-initial lg:px-4 text-center ${
                        activeSegment === 'last-month' 
                          ? 'bg-mint-cash text-bg-deep shadow-sm font-extrabold' 
                          : 'text-slate-gray hover:text-ivory-white'
                      }`}
                    >
                      Last Month
                    </button>
                  </div>

                  {/* Exit day level button */}
                  {selectedDay && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDay(null);
                        setActiveSegment(null);
                      }}
                      className="h-9 rounded-lg border border-slate-gray/10 bg-bg-deep px-3 text-[10px] sm:text-[11px] font-bold text-mint-cash transition-all duration-200 hover:border-mint-cash/30 hover:bg-mint-cash/5 shrink-0"
                    >
                      Exit Day
                    </button>
                  )}
                </div>
              </div>
            </div>

      {/* Top Dock (Search & Category filters) */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm items-center">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/40 focus-ring"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white focus-ring cursor-pointer appearance-none"
          >
            <option value="All">All Categories</option>
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
        </div>
      </section>

      

      {/* Summary Stats */}
      {!isLoading && filteredExpenses.length > 0 && (
        <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Total Spent
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-1" />
                {filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Transactions
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white">
                {filteredExpenses.length}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Average
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-1" />
                {filteredExpenses.length > 0 
                  ? Math.round(filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0) / filteredExpenses.length).toLocaleString('en-IN')
                  : '0'}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Top Category
              </span>
              <div className="text-sm md:text-base font-semibold text-ivory-white truncate">
                {(() => {
                  const categoryTotals = filteredExpenses.reduce((acc, exp) => {
                    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
                    return acc;
                  }, {} as Record<string, number>);
                  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
                  return topCategory ? topCategory[0] : 'N/A';
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ledger contents - TOUCH SWIPE CAPABLE CONTAINER */}
      <section 
        className="space-y-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
          <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Loader2 size={32} className="animate-spin text-mint-cash" />
            <span className="text-xs text-slate-gray">Loading transaction history...</span>
          </div>
        ) : isError ? (
          <div className="bg-card-fill border border-slate-gray/10 rounded-xl p-12 text-center text-xs text-crimson-alert shadow-sm">
            Failed to load expenses. Please check your network and try refreshing.
          </div>
        ) : (
          <div className="space-y-4">
            
           

            {filteredExpenses.length === 0 ? (
              <div className="rounded-xl border border-slate-gray/10 bg-card-fill p-10 text-center shadow-sm transition-all duration-200">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-gray/20 bg-bg-deep/40">
                  <IndianRupee size={20} className="text-slate-gray" />
                </div>
                <div className="mx-auto mt-4 max-w-sm space-y-2">
                  <h3 className="font-display text-sm font-medium text-ivory-white">
                    Nothing logged in {currentMonthLabel} yet.
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-gray">
                    Start tracking your spending by adding your first expense.
                  </p>
                </div>
                <Link
                  href="/expenses/new"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-mint-cash px-4 text-[11px] font-bold text-bg-deep transition-all duration-200 hover:bg-pine-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mint-cash"
                >
                  <Plus size={14} className="mr-2 stroke-[2.5]" />
                  <span>Quick Log Expense</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedExpenses.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-xl border border-slate-gray/10 bg-card-fill p-3 shadow-sm transition-all duration-200 hover:border-slate-gray/30 sm:p-4"
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-slate-gray/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-gray">
                          {group.label}
                        </h3>
                        {!selectedDay && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDay(group.key);
                              setActiveSegment(null);
                            }}
                            className="rounded bg-bg-deep px-2 py-0.5 text-[9px] font-bold text-mint-cash border border-slate-gray/5 hover:border-mint-cash/20 transition-all duration-150"
                          >
                            View Day
                          </button>
                        )}
                      </div>
                      <div className="font-numeric text-sm font-semibold text-ivory-white">
                        <span className="mr-1.5 text-[10px] text-slate-gray font-sans font-normal uppercase tracking-wider">Total</span>
                        <span className="inline-flex items-center gap-0.5">
                          <IndianRupee size={12} className="stroke-[2.5]" />
                          {group.subtotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {group.items.map((expense) => (
                        <div
                          key={expense._id}
                          className="flex items-start justify-between gap-3 rounded-lg border border-slate-gray/5 bg-bg-deep/45 px-3 py-3 transition-all duration-200 hover:border-slate-gray/10 hover:bg-bg-deep/75"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-bg-deep px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ivory-white border border-slate-gray/10">
                                {expense.category}
                              </span>
                              {expense.isRecurring && (
                                <span className="rounded-full bg-rupee-gold/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-rupee-gold">
                                  Recurring
                                </span>
                              )}
                            </div>
                            <h4 className="mt-2 text-sm font-semibold text-ivory-white">
                              {expense.title}
                            </h4>
                            <p className="mt-1 text-[10px] text-slate-gray">
                              {formatTime(expense.date)}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <div className="font-numeric text-sm font-semibold text-ivory-white">
                              <div className="flex items-center">
                                <IndianRupee size={12} className="mr-0.5 stroke-[2.5]" />
                                {expense.amount.toLocaleString('en-IN')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/expenses/${expense._id}/edit`}
                                aria-label={`Edit ${expense.title}`}
                                className="rounded-md p-1.5 text-slate-gray transition-all duration-200 hover:bg-bg-deep hover:text-ivory-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mint-cash"
                              >
                                <Edit2 size={12} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget({ id: expense._id, title: expense.title });
                                }}
                                aria-label={`Delete ${expense.title}`}
                                className="rounded-md p-1.5 text-slate-gray transition-all duration-200 hover:bg-crimson-alert/10 hover:text-crimson-alert focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-crimson-alert"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}