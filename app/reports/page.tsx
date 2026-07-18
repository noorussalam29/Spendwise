'use client';

import { useState, useRef } from 'react';
import { FileSpreadsheet, FileDown, Calendar, Download } from 'lucide-react';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'day' | 'month'>('month');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`; // Default "YYYY-MM"
  });

  // Touch handling for swipe gestures
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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
        navigateDate('next');
      } else {
        navigateDate('prev');
      }
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (period === 'month') {
      const [year, month] = date.split('-').map(Number);
      const current = new Date(year, month - 1, 1);
      if (direction === 'prev') {
        current.setMonth(current.getMonth() - 1);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
      const nextYear = current.getFullYear();
      const nextMonth = String(current.getMonth() + 1).padStart(2, '0');
      setDate(`${nextYear}-${nextMonth}`);
    } else {
      const current = new Date(date);
      if (direction === 'prev') {
        current.setDate(current.getDate() - 1);
      } else {
        current.setDate(current.getDate() + 1);
      }
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Helper to safely switch the period and transform date values
  const handlePeriodChange = (newPeriod: 'day' | 'month') => {
    setPeriod(newPeriod);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    if (newPeriod === 'month') {
      setDate(`${yyyy}-${mm}`);
    } else {
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Safe background file download handler using Fetch
  const triggerBackgroundDownload = async (type: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      if (period === 'month') {
        params.append('month', date);
      } else {
        params.append('date', date);
      }

      // Fetch file with existing browser credentials (cookies) intact
      const response = await fetch(`/api/reports/${type}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        alert(`Export failed: ${errorText || response.statusText}`);
        return;
      }

      // Turn response stream into local browser file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spendwise-report-${date}.${type}`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup DOM
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting ${type.toUpperCase()}:`, error);
      alert(`Something went wrong while exporting the ${type.toUpperCase()}.`);
    }
  };

  const handleExportCSV = () => {
    triggerBackgroundDownload('csv');
  };

  const handleExportPDF = () => {
    triggerBackgroundDownload('pdf');
  };

  const formatMonthLabel = (monthValue: string) => {
    if (!monthValue || monthValue.split('-').length < 2) return 'Invalid Month';
    const [year, month] = monthValue.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDayLabel = (dayValue: string) => {
    const d = new Date(dayValue);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header section */}
      <div>
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
          Reports & Export
        </h1>
        <p className="text-sm text-slate-gray mt-1">
          Generate and download your financial reports.
        </p>
      </div>

      {/* Report Configuration */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-gray/5 pb-4">
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Report Configuration
          </h2>
        </div>

        {/* Period Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
            Period
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handlePeriodChange('day')}
              className={`flex-1 h-10 px-4 rounded-lg text-xs font-semibold transition-all ${
                period === 'day'
                  ? 'bg-mint-cash text-bg-deep'
                  : 'bg-bg-deep border border-slate-gray/10 text-slate-gray hover:text-ivory-white'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('month')}
              className={`flex-1 h-10 px-4 rounded-lg text-xs font-semibold transition-all ${
                period === 'month'
                  ? 'bg-mint-cash text-bg-deep'
                  : 'bg-bg-deep border border-slate-gray/10 text-slate-gray hover:text-ivory-white'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Date/Month Picker */}
        {period === 'month' ? (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Select Month
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                type="month"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white focus-ring cursor-pointer"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Select Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white focus-ring cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Quick Date Filters */}
        <div className="flex flex-wrap gap-2">
          {period === 'month' ? (
            <>
              <button
                onClick={() => {
                  const now = new Date();
                  const yyyy = now.getFullYear();
                  const mm = String(now.getMonth() + 1).padStart(2, '0');
                  setDate(`${yyyy}-${mm}`);
                }}
                className="h-8 px-3 rounded-lg border border-slate-gray/10 bg-bg-deep text-[10px] font-semibold text-slate-gray transition-all duration-200 hover:border-mint-cash/30 hover:text-ivory-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-cash/40"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const yyyy = prevMonth.getFullYear();
                  const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
                  setDate(`${yyyy}-${mm}`);
                }}
                className="h-8 px-3 rounded-lg border border-slate-gray/10 bg-bg-deep text-[10px] font-semibold text-slate-gray transition-all duration-200 hover:border-mint-cash/30 hover:text-ivory-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-cash/40"
              >
                Last Month
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const now = new Date();
                  const yyyy = now.getFullYear();
                  const mm = String(now.getMonth() + 1).padStart(2, '0');
                  const dd = String(now.getDate()).padStart(2, '0');
                  setDate(`${yyyy}-${mm}-${dd}`);
                }}
                className="h-8 px-3 rounded-lg border border-slate-gray/10 bg-bg-deep text-[10px] font-semibold text-slate-gray transition-all duration-200 hover:border-mint-cash/30 hover:text-ivory-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-cash/40"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  now.setDate(now.getDate() - 1);
                  const yyyy = now.getFullYear();
                  const mm = String(now.getMonth() + 1).padStart(2, '0');
                  const dd = String(now.getDate()).padStart(2, '0');
                  setDate(`${yyyy}-${mm}-${dd}`);
                }}
                className="h-8 px-3 rounded-lg border border-slate-gray/10 bg-bg-deep text-[10px] font-semibold text-slate-gray transition-all duration-200 hover:border-mint-cash/30 hover:text-ivory-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-cash/40"
              >
                Yesterday
              </button>
            </>
          )}
        </div>
      </section>

      {/* Preview Section */}
      <section 
        className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Report Preview
          </h3>
          <span className="text-[10px] text-slate-gray font-medium">
            {period === 'month' ? formatMonthLabel(date) : formatDayLabel(date)}
          </span>
        </div>

        <div className="bg-bg-deep/45 border border-slate-gray/5 rounded-lg p-4 space-y-3">
          <div className="text-xs text-slate-gray">
            <p className="font-semibold text-ivory-white mb-2">Report Summary</p>
            <p>Period: {period === 'month' ? 'Monthly' : 'Daily'}</p>
            <p>Date: {period === 'month' ? formatMonthLabel(date) : formatDayLabel(date)}</p>
            <p className="mt-2 text-slate-gray/70">
              This report will include all transactions for the selected period, 
              categorized by spending category with totals and percentages.
            </p>
          </div>
        </div>
      </section>

      {/* Export Actions */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-2">
          <h3 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Export Options
          </h3>
          <Download size={16} className="text-mint-cash" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportCSV}
            className="h-12 px-4 bg-card-fill border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="h-12 px-4 bg-card-fill border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
          >
            <FileDown size={16} />
            <span>Export PDF</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-gray text-center">
          CSV files can be opened in Excel or Google Sheets. PDF files are formatted for printing.
        </p>
      </section>
    </div>
  );
}