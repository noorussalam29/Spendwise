'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, LogOut, Loader2, CheckCircle, Lock, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
        },
      });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordModal(false);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleNameSave = () => {
    setMessage(null);
    if (name === session?.user?.name) {
      setMessage({ type: 'error', text: 'No changes to save' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    settingsMutation.mutate({ name });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!currentPassword || !newPassword) {
      setMessage({ type: 'error', text: 'Please fill in both password fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    settingsMutation.mutate({ currentPassword, newPassword });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const userName = session?.user?.name || 'User';
    return userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display font-semibold text-2xl md:text-3xl text-ivory-white tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-gray mt-1">
            Manage your account profile and security preferences.
          </p>
        </div>
      </div>

      {/* Identity Strip */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-mint-cash/10 flex items-center justify-center text-mint-cash font-bold text-lg shrink-0">
          {getUserInitials()}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-ivory-white truncate">{session?.user?.name || 'User'}</h2>
          <p className="text-xs text-slate-gray truncate">{session?.user?.email || ''}</p>
        </div>
      </section>

      {/* Profile Card */}
      <section className="bg-card-fill border border-slate-gray/10 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-gray/5 pb-4">
          <User size={18} className="text-mint-cash shrink-0" />
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Profile Information
          </h2>
        </div>

        <div className="space-y-4">
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
        </div>

        {/* Card Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-gray/5">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="text-xs text-slate-gray hover:text-ivory-white transition-colors flex items-center gap-1.5"
          >
            <Lock size={12} />
            Change password
          </button>
          <button
            type="button"
            onClick={handleNameSave}
            disabled={settingsMutation.isPending}
            className="h-9 px-4 bg-mint-cash hover:bg-emerald-400 text-bg-deep rounded-lg flex items-center gap-2 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settingsMutation.isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
        </div>
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

      {/* Logout Section */}
      <section className="bg-card-fill border border-crimson-alert/20 rounded-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-gray/5 pb-4">
          <LogOut size={18} className="text-crimson-alert shrink-0" />
          <h2 className="font-display font-semibold text-sm md:text-base text-ivory-white">
            Sign Out
          </h2>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-gray leading-relaxed">
            You will need to sign in again to access your account.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-4 bg-crimson-alert/10 hover:bg-crimson-alert/20 text-crimson-alert border border-crimson-alert/20 rounded-lg inline-flex items-center justify-center gap-2 text-xs font-semibold transition-all shrink-0 w-full sm:w-auto"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in animate-duration-150">
            <div className="flex items-center justify-between border-b border-slate-gray/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-mint-cash" />
                <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Change Password</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                }}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-deep"
              >
                <User size={16} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              {settingsMutation.isError && (
                <p className="text-[11px] text-crimson-alert">
                  {settingsMutation.error.message || 'Error updating password.'}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                  }}
                  className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  disabled={settingsMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  disabled={settingsMutation.isPending}
                >
                  {settingsMutation.isPending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
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
