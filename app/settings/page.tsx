'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, LogOut, Loader2, CheckCircle, IndianRupee, Calendar, Wallet, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [monthlyIncome, setMonthlyIncome] = useState((session?.user as any)?.monthlyIncome || 0);
  const [payday, setPayday] = useState((session?.user as any)?.payday || 1);
  const [monthlyBudget, setMonthlyBudget] = useState((session?.user as any)?.monthlyBudget || 0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setMessage({ type: 'success', text: 'Settings updated successfully' });
      // Update session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: data.user.name,
          monthlyIncome: data.user.monthlyIncome,
          payday: data.user.payday,
          monthlyBudget: data.user.monthlyBudget,
        },
      });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const data: any = {};
    if (name !== session?.user?.name) data.name = name;
    if (monthlyIncome !== (session?.user as any)?.monthlyIncome) data.monthlyIncome = monthlyIncome;
    if (payday !== (session?.user as any)?.payday) data.payday = payday;
    if (monthlyBudget !== (session?.user as any)?.monthlyBudget) data.monthlyBudget = monthlyBudget;
    if (newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }

    if (Object.keys(data).length === 0) {
      setMessage({ type: 'error', text: 'No changes to save' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    settingsMutation.mutate(data);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Header section */}
      <div>
        <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-slate-gray mt-1">
          Manage your account and financial preferences.
        </p>
      </div>

      {/* Profile Card */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-4">
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Profile Information
          </h2>
          <User size={16} className="text-mint-cash" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
              placeholder="Your name"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                id="email"
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="w-full bg-bg-deep/50 border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-gray cursor-not-allowed"
                placeholder="your@email.com"
              />
            </div>
            <p className="text-[10px] text-slate-gray">
              Email cannot be changed
            </p>
          </div>
        </form>
      </section>

      {/* Financial Settings Card */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-4">
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Financial Settings
          </h2>
          <Wallet size={16} className="text-mint-cash" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monthly Income */}
          <div className="space-y-2">
            <label htmlFor="monthlyIncome" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Monthly Income
            </label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                id="monthlyIncome"
                type="number"
                value={monthlyIncome || ''}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric"
                placeholder="50000"
              />
            </div>
            <p className="text-[10px] text-slate-gray">
              Your monthly take-home income. Used to calculate Money Left and Safe To Spend.
            </p>
          </div>

          {/* Payday */}
          <div className="space-y-2">
            <label htmlFor="payday" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Payday
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                id="payday"
                type="number"
                min="1"
                max="31"
                value={payday}
                onChange={(e) => setPayday(Number(e.target.value))}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric"
                placeholder="1"
              />
            </div>
            <p className="text-[10px] text-slate-gray">
              Day of month you receive salary (1-31). Used to calculate billing cycle.
            </p>
          </div>

          {/* Monthly Budget */}
          <div className="space-y-2">
            <label htmlFor="monthlyBudget" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Monthly Budget
            </label>
            <div className="relative">
              <Wallet size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
              <input
                id="monthlyBudget"
                type="number"
                value={monthlyBudget || ''}
                onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring font-numeric"
                placeholder="40000"
              />
            </div>
            <p className="text-[10px] text-slate-gray">
              Optional spending limit for budget tracking.
            </p>
          </div>
        </form>
      </section>

      {/* Security Card */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-gray/5 pb-4">
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Security
          </h2>
          <Lock size={16} className="text-mint-cash" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
              placeholder="Enter current password"
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-xs font-semibold text-slate-gray tracking-wider uppercase block">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
        </form>
      </section>

      {/* Message Display */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs ${
          message.type === 'success' 
            ? 'bg-mint-cash/10 text-mint-cash border border-mint-cash/20' 
            : 'bg-crimson-alert/10 text-crimson-alert border border-crimson-alert/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={14} /> : null}
          <span>{message.text}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={settingsMutation.isPending}
        className="w-full h-10 px-4 bg-mint-cash hover:bg-emerald-400 text-bg-deep rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {settingsMutation.isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Saving Changes...</span>
          </>
        ) : (
          <span>Save All Changes</span>
        )}
      </button>

      {/* Logout Section */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-sm text-ivory-white">
              Sign Out
            </h3>
            <p className="text-xs text-slate-gray mt-1">
              You will need to sign in again to access your account.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="h-10 px-4 bg-crimson-alert/10 hover:bg-crimson-alert/20 text-crimson-alert border border-crimson-alert/20 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
