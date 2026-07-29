'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, LogOut, Loader2, CheckCircle, Lock, Shield, X, ArrowLeft, Key, Mail as MailIcon, AlertTriangle } from 'lucide-react';

type PasswordModalStep = 'change-password' | 'forgot-password-email' | 'forgot-password-otp' | 'forgot-password-new';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalStep, setPasswordModalStep] = useState<PasswordModalStep>('change-password');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

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
      setPasswordModalStep('change-password');
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send OTP');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setMaskedEmail(data.maskedEmail);
      setOtpSent(true);
      setPasswordModalStep('forgot-password-otp');
      // Start resend timer
      setOtpResendTimer(60);
      const timer = setInterval(() => {
        setOtpResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setMessage({ type: 'success', text: `Verification code sent to ${data.maskedEmail}` });
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid OTP');
      }
      return response.json();
    },
    onSuccess: () => {
      setPasswordModalStep('forgot-password-new');
      setMessage({ type: 'success', text: 'OTP verified successfully' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message });
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email, otp, newPassword }: { email: string; otp: string; newPassword: string }) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Password reset successfully. Please sign in with your new password.' });
      setShowPasswordModal(false);
      setPasswordModalStep('change-password');
      // Clear all forgot password states
      setForgotEmail('');
      setOtp('');
      setResetPassword('');
      setConfirmResetPassword('');
      setMaskedEmail('');
      setOtpSent(false);
      setOtpResendTimer(0);
      // Sign out user
      setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, 2000);
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
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    settingsMutation.mutate({ currentPassword, newPassword });
  };

  const handleForgotPassword = () => {
    setPasswordModalStep('forgot-password-email');
    setMessage(null);
  };

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!forgotEmail) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    sendOTPMutation.mutate(forgotEmail);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!otp || otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    verifyOTPMutation.mutate({ email: forgotEmail, otp });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!resetPassword || !confirmResetPassword) {
      setMessage({ type: 'error', text: 'Please fill in both password fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (resetPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    resetPasswordMutation.mutate({ email: forgotEmail, otp, newPassword: resetPassword });
  };

  const handleBackToChangePassword = () => {
    setPasswordModalStep('change-password');
    setMessage(null);
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPasswordModalStep('change-password');
    setCurrentPassword('');
    setNewPassword('');
    setForgotEmail('');
    setOtp('');
    setResetPassword('');
    setConfirmResetPassword('');
    setMaskedEmail('');
    setOtpSent(false);
    setOtpResendTimer(0);
    setMessage(null);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-crimson-alert" />
                <h3 className="text-sm font-semibold text-ivory-white">Sign Out</h3>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-gray leading-relaxed">
              Are you sure you want to sign out? You will need to sign in again to access your account.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 h-11 bg-crimson-alert/10 hover:bg-crimson-alert/20 text-crimson-alert border border-crimson-alert/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in animate-duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-gray/10 pb-3">
              <div className="flex items-center gap-2">
                {passwordModalStep === 'change-password' && (
                  <>
                    <Shield size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Change Password</span>
                  </>
                )}
                {passwordModalStep === 'forgot-password-email' && (
                  <>
                    <Key size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Forgot Password</span>
                  </>
                )}
                {passwordModalStep === 'forgot-password-otp' && (
                  <>
                    <MailIcon size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Verify Code</span>
                  </>
                )}
                {passwordModalStep === 'forgot-password-new' && (
                  <>
                    <Lock size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">New Password</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-deep"
              >
                <X size={16} />
              </button>
            </div>

            {/* Change Password Step */}
            {passwordModalStep === 'change-password' && (
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

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
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

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-[11px] text-slate-gray hover:text-mint-cash transition-colors text-center"
                >
                  Forgot password?
                </button>
              </form>
            )}

            {/* Forgot Password - Email Step */}
            {passwordModalStep === 'forgot-password-email' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleBackToChangePassword}
                    className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[11px] text-slate-gray">Back to change password</span>
                </div>

                <p className="text-xs text-slate-gray leading-relaxed">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                    Email Address
                  </label>
                  <div className="relative">
                    <MailIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/45" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg pl-9 pr-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBackToChangePassword}
                    className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    disabled={sendOTPMutation.isPending}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    disabled={sendOTPMutation.isPending}
                  >
                    {sendOTPMutation.isPending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Code</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password - OTP Step */}
            {passwordModalStep === 'forgot-password-otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalStep('forgot-password-email')}
                    className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[11px] text-slate-gray">Back to email</span>
                </div>

                <p className="text-xs text-slate-gray leading-relaxed">
                  Enter the 6-digit verification code sent to <span className="text-ivory-white font-semibold">{maskedEmail}</span>
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring text-center tracking-widest text-lg"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => sendOTPMutation.mutate(forgotEmail)}
                  disabled={otpResendTimer > 0 || sendOTPMutation.isPending}
                  className="w-full text-[11px] text-slate-gray hover:text-mint-cash transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpResendTimer > 0 
                    ? `Resend code in ${otpResendTimer}s` 
                    : sendOTPMutation.isPending 
                      ? 'Sending...' 
                      : "Didn't receive code? Resend"}
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalStep('forgot-password-email')}
                    className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    disabled={verifyOTPMutation.isPending}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    disabled={verifyOTPMutation.isPending}
                  >
                    {verifyOTPMutation.isPending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Forgot Password - New Password Step */}
            {passwordModalStep === 'forgot-password-new' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalStep('forgot-password-otp')}
                    className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[11px] text-slate-gray">Back to verification</span>
                </div>

                <p className="text-xs text-slate-gray leading-relaxed">
                  Enter your new password below. Make sure it's at least 6 characters long.
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalStep('forgot-password-otp')}
                    className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    disabled={resetPasswordMutation.isPending}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
