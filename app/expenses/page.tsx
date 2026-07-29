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

  // Swipe Action State for Mobile (stores ID of item with open swipe actions)
  const [swipedExpenseId, setSwipedExpenseId] = useState<string | null>(null);

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
      setSwipedExpenseId(null);
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
    const swipeThreshold = 60;
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

  // Calculate summary stats dynamically from filtered expenses
  const summaryStats = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return {
        totalSpent: 0,
        transactions: 0,
        average: 0,
        topCategory: 'N/A'
      };
    }

    const totalSpent = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const transactions = filteredExpenses.length;
    const average = totalSpent / transactions;

    // Calculate top category
    const categoryTotals = filteredExpenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
      totalSpent,
      transactions,
      average,
      topCategory
    };
  }, [filteredExpenses]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-28 relative">
      
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

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-gray/10 pb-4">
        <div className="min-w-0 flex items-center justify-between sm:block">
          <div>
            <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight truncate">
              Expenses Ledger
            </h1>
          </div>
          {/* Mobile Add Expense Button in Top Right */}
          <Link
            href="/expenses/new"
            className="flex sm:hidden h-9 items-center justify-center rounded-xl bg-mint-cash px-3 text-xs font-bold text-bg-deep transition-all duration-200 hover:bg-pine-light focus-visible:outline-none shadow-sm shrink-0"
          >
            <Plus size={14} className="mr-1 stroke-[2.5]" />
            <span>Add Expenses</span>
          </Link>
        </div>
        {/* Desktop Add Expense Button */}
        <Link
          href="/expenses/new"
          className="hidden sm:inline-flex h-10 items-center justify-center rounded-xl bg-mint-cash px-4 text-xs font-bold text-bg-deep transition-all duration-200 hover:bg-pine-light focus-visible:outline-none shadow-sm shrink-0"
        >
          <Plus size={14} className="mr-1.5 stroke-[2.5]" />
          <span>Add Expenses</span>
        </Link>
      </div>

      {/* CONTROL DOCK */}
      <div className="sticky top-3 z-30 rounded-2xl border border-slate-gray/10 bg-card-fill/95 p-3.5 shadow-lg backdrop-blur-md transition-all">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Left Side: Navigation and Month/Day selector */}
          <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
            <div className="flex items-center gap-0.5 bg-bg-deep p-0.5 rounded-xl border border-slate-gray/10 shrink-0">
              <button
                type="button"
                onClick={() => selectedDay ? navigateDay('prev') : navigateMonth('prev')}
                aria-label="Previous"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white focus-visible:outline-none"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => selectedDay ? navigateDay('next') : navigateMonth('next')}
                disabled={!selectedDay && isCurrentMonth}
                aria-label="Next"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-gray transition-all duration-200 hover:bg-card-fill hover:text-ivory-white disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="min-w-0 relative group flex-1 md:flex-initial">
              {selectedDay ? (
                <div className="flex items-center justify-between md:justify-start gap-2">
                  <h2 className="text-sm font-bold text-ivory-white flex items-center gap-2 truncate">
                    <span className="truncate">{formatDate(selectedDay)}</span>
                  </h2>
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-bg-deep border border-slate-gray/10 font-medium text-slate-gray whitespace-nowrap">
                    Day View
                  </span>
                </div>
              ) : (
                <div className="relative flex items-center justify-between md:justify-start gap-2 cursor-pointer w-full">
                  <label className="text-sm font-bold text-ivory-white group-hover:text-mint-cash transition-colors flex items-center gap-1.5 cursor-pointer truncate">
                    <span className="truncate">{currentMonthLabel}</span>
                    <Calendar size={13} className="text-slate-gray/50 group-hover:text-mint-cash transition-colors shrink-0" />
                  </label>
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-bg-deep border border-slate-gray/10 font-medium text-slate-gray whitespace-nowrap">
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

          {/* Right Side: Segmented Filters (Today / This Month / Last Month) */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-bg-deep p-0.5 border border-slate-gray/10 rounded-xl h-9 items-center w-full md:w-auto">
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
                className={`h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 md:flex-initial text-center ${
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
                className={`h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 md:flex-initial text-center ${
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
                className={`h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-150 flex-1 md:flex-initial text-center ${
                  activeSegment === 'last-month' 
                    ? 'bg-mint-cash text-bg-deep shadow-sm font-extrabold' 
                    : 'text-slate-gray hover:text-ivory-white'
                }`}
              >
                Last Month
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-2xl p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-deep border border-slate-gray/10 rounded-xl pl-9 pr-4 py-3 text-xs text-ivory-white placeholder:text-slate-gray/40 focus:outline-none focus:ring-0 focus:ring-mint-cash/10 transition-all"
          />
        </div>

        <div className="relative">
          <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-bg-deep border border-slate-gray/10 rounded-xl pl-9 pr-4 py-3 text-xs text-ivory-white focus:outline-none focus:ring-0 focus:ring-mint-cash/10 cursor-pointer appearance-none transition-all"
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

      {/* SUMMARY STATS GRID */}
      {!isLoading && filteredExpenses.length > 0 && (
        <section className="bg-card-fill border border-slate-gray/10 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
            <div className="space-y-1 p-3 rounded-xl bg-bg-deep/40 border border-slate-gray/5 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Total Spent
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center justify-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-1 text-mint-cash" />
                {summaryStats.totalSpent.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-bg-deep/40 border border-slate-gray/5 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Transactions
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white">
                {summaryStats.transactions}
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-bg-deep/40 border border-slate-gray/5 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Average
              </span>
              <div className="font-numeric font-bold text-lg md:text-xl text-ivory-white flex items-center justify-center">
                <IndianRupee size={16} className="stroke-[2.5] mr-1 text-mint-cash" />
                {Math.round(summaryStats.average).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="space-y-1 p-3 rounded-xl bg-bg-deep/40 border border-slate-gray/5 text-center flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-gray font-semibold tracking-wide uppercase">
                Top Category
              </span>
              <div className="text-sm md:text-base font-semibold text-ivory-white truncate flex items-center justify-center gap-1.5 pt-0.5">
                <span className="truncate">{summaryStats.topCategory}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LEDGER CONTENTS */}
      <section 
        className="space-y-4 transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading ? (
          <div className="bg-card-fill border border-slate-gray/10 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Loader2 size={32} className="animate-spin text-mint-cash" />
            <span className="text-xs text-slate-gray">Loading transaction history...</span>
          </div>
        ) : isError ? (
          <div className="bg-card-fill border border-slate-gray/10 rounded-2xl p-12 text-center text-xs text-crimson-alert shadow-sm">
            Failed to load expenses. Please check your network and try refreshing.
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="rounded-2xl border border-slate-gray/10 bg-card-fill p-12 text-center shadow-sm transition-all duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-gray/20 bg-bg-deep/50 text-mint-cash shadow-inner">
              <IndianRupee size={22} />
            </div>
            <div className="mx-auto mt-4 max-w-sm space-y-2">
              <h3 className="font-display text-sm font-semibold text-ivory-white">
                Nothing logged in {currentMonthLabel} yet.
              </h3>
              <p className="text-xs leading-relaxed text-slate-gray">
                Start tracking your spending by adding your first expense.
              </p>
            </div>
            <Link
              href="/expenses/new"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-mint-cash px-5 text-xs font-bold text-bg-deep transition-all duration-200 hover:bg-pine-light focus-visible:outline-none shadow-sm"
            >
              <Plus size={14} className="mr-2 stroke-[2.5]" />
              <span>Add Expenses</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedExpenses.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border border-slate-gray/10 bg-card-fill p-4 md:p-5 shadow-sm transition-all duration-200 hover:border-slate-gray/20"
              >
                <div className="mb-3 flex items-center justify-between border-b border-slate-gray/5 pb-3">
                  <div className="flex items-center gap-2.5">
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
                        className="rounded-lg bg-bg-deep px-2.5 py-1 text-[9px] font-bold text-mint-cash border border-slate-gray/10 hover:border-mint-cash/30 transition-all duration-150"
                      >
                        View Day
                      </button>
                    )}
                  </div>
                  <div className="font-numeric text-sm font-semibold text-ivory-white">
                    <span className="mr-1.5 text-[10px] text-slate-gray font-sans font-normal uppercase tracking-wider">Total</span>
                    <span className="inline-flex items-center gap-0.5">
                      <IndianRupee size={12} className="stroke-[2.5] text-mint-cash" />
                      {group.subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 divide-y divide-slate-gray/5">
                  {group.items.map((expense, idx) => {
                    return (
                      <div
                        key={expense._id}
                        className={`relative rounded-xl transition-all duration-200 ${idx !== 0 ? 'pt-2.5' : ''}`}
                      >
                        {/* Main Entry Item Card */}
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-gray/5 bg-bg-deep/50 px-3.5 py-3 transition-all hover:border-slate-gray/15 hover:bg-bg-deep/80"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full bg-card-fill px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-ivory-white border border-slate-gray/10">
                                  {expense.category}
                                </span>
                                {expense.isRecurring && (
                                  <span className="rounded-full bg-rupee-gold/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-rupee-gold border border-rupee-gold/20">
                                    Recurring
                                  </span>
                                )}
                              </div>
                              <h4 className="mt-1 text-xs sm:text-sm font-semibold text-ivory-white truncate">
                                {expense.title}
                              </h4>
                              <div className="mt-0.5 text-[10px] text-slate-gray flex items-center gap-2">
                                <span>{formatTime(expense.date)}</span>
                                {expense.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{expense.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Amount Badge */}
                            <div className="font-numeric text-xs sm:text-sm font-bold text-ivory-white flex items-center bg-card-fill/80 border border-slate-gray/15 px-3 py-1.5 rounded-xl shadow-sm">
                              <IndianRupee size={13} className="stroke-[2.5] mr-0.5 text-mint-cash shrink-0" />
                              <span>{expense.amount.toLocaleString('en-IN')}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 border-l border-slate-gray/10 pl-3">
                              <Link
                                href={`/expenses/${expense._id}/edit`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-fill border border-slate-gray/10 text-slate-gray hover:text-mint-cash hover:border-mint-cash/30 transition-all shadow-sm"
                                aria-label="Edit expense"
                              >
                                <Edit2 size={14} />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ id: expense._id, title: expense.title })}
                                className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-fill border border-slate-gray/10 text-slate-gray hover:text-crimson-alert hover:border-crimson-alert/30 transition-all shadow-sm"
                                aria-label="Delete expense"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}