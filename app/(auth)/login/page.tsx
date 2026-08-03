'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { loginSchema } from '@/lib/validations';
import { z } from 'zod';
import { KeyRound, Mail, AlertCircle, Loader2, CheckCircle, X, ArrowLeft, Lock, Mail as MailIcon } from 'lucide-react';

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordStep = 'email' | 'otp' | 'new-password';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams?.get('error') === 'CredentialsSignin'
      ? 'Invalid credentials. Please try again.'
      : null
  );
  const [loading, setLoading] = useState(false);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotPasswordStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // Forgot password mutations
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
      setForgotStep('otp');
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
      setForgotMessage({ type: 'success', text: `Verification code sent to ${data.maskedEmail}` });
      setTimeout(() => setForgotMessage(null), 5000);
    },
    onError: (error: Error) => {
      setForgotMessage({ type: 'error', text: error.message });
      setTimeout(() => setForgotMessage(null), 3000);
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
      setForgotStep('new-password');
      setForgotMessage({ type: 'success', text: 'OTP verified successfully' });
      setTimeout(() => setForgotMessage(null), 3000);
    },
    onError: (error: Error) => {
      setForgotMessage({ type: 'error', text: error.message });
      setTimeout(() => setForgotMessage(null), 3000);
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
      setForgotMessage({ type: 'success', text: 'Password reset successfully. Please sign in with your new password.' });
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep('email');
        setForgotEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setMaskedEmail('');
        setOtpResendTimer(0);
        setForgotMessage(null);
      }, 3000);
    },
    onError: (error: Error) => {
      setForgotMessage({ type: 'error', text: error.message });
      setTimeout(() => setForgotMessage(null), 3000);
    },
  });

  // Forgot password handlers
  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    if (!forgotEmail) {
      setForgotMessage({ type: 'error', text: 'Please enter your email' });
      setTimeout(() => setForgotMessage(null), 3000);
      return;
    }
    sendOTPMutation.mutate(forgotEmail);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    if (!otp || otp.length !== 6) {
      setForgotMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP' });
      setTimeout(() => setForgotMessage(null), 3000);
      return;
    }
    verifyOTPMutation.mutate({ email: forgotEmail, otp });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    if (!newPassword || !confirmPassword) {
      setForgotMessage({ type: 'error', text: 'Please fill in both password fields' });
      setTimeout(() => setForgotMessage(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setForgotMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setTimeout(() => setForgotMessage(null), 3000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotMessage({ type: 'error', text: 'Passwords do not match' });
      setTimeout(() => setForgotMessage(null), 3000);
      return;
    }
    resetPasswordMutation.mutate({ email: forgotEmail, otp, newPassword });
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep('email');
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setMaskedEmail('');
    setOtpResendTimer(0);
    setForgotMessage(null);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
        callbackUrl,
      });

      if (!result) {
        setError('Authentication request failed. Please try again.');
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(
          result.error === 'CredentialsSignin'
            ? 'Invalid credentials. Please try again.'
            : result.error
        );
        setLoading(false);
        return;
      }

      if (!result.url) {
        setError('Sign in succeeded, but no redirect URL was returned.');
        setLoading(false);
        return;
      }

      try {
        await router.replace(result.url);
      } catch (navError) {
        console.error('Navigation error during sign in:', navError);
        setError('Failed to redirect after sign in. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card-fill border border-slate-gray/10 rounded-xl p-8 shadow-xl space-y-6">
      {/* Brand logo & header */}
      <div className="text-center space-y-2">
        <span className="font-display font-bold text-2xl tracking-widest bg-gradient-to-r from-mint-cash to-emerald-400 bg-clip-text text-transparent">
          SPENDWISE
        </span>
        <h1 className="font-display font-medium text-lg text-ivory-white">
          Sign in to your account
        </h1>
        <p className="text-xs text-slate-gray">
          Track salary, EMIs, support, and savings pacing.
        </p>
      </div>

      {searchParams?.get('registered') === 'true' && !error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-mint-cash/5 border border-mint-cash/15 text-xs text-mint-cash animate-fade-in">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>Account created successfully! Please sign in below.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-crimson-alert/5 border border-crimson-alert/15 text-xs text-crimson-alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Email Address
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50" />
            <input
              type="email"
              placeholder="e.g. mohamed@gmail.com"
              {...register('email')}
              className={`w-full bg-bg-deep border rounded-lg pl-10 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
                errors.email ? 'border-crimson-alert/40' : 'border-slate-gray/10'
              }`}
              disabled={loading}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-crimson-alert">{errors.email.message}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Password
          </label>
          <div className="relative">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className={`w-full bg-bg-deep border rounded-lg pl-10 pr-12 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
                errors.password ? 'border-crimson-alert/40' : 'border-slate-gray/10'
              }`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50 hover:text-slate-gray transition-colors cursor-pointer"
              disabled={loading}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61a13.526 13.526 0 0 0-2 2.68C4.05 10.18 4.5 10.9 5 12c0 0 3 7 10 7a10.43 10.43 0 0 0 1.27-.08"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-crimson-alert">{errors.password.message}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-xs text-slate-gray hover:text-mint-cash transition-colors"
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-mint-cash hover:bg-emerald-400 text-bg-deep font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Register redirect */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-gray">
          New to Spendwise?{' '}
          <Link href="/register" className="text-mint-cash hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-bg-deep/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card-fill border border-slate-gray/15 rounded-xl p-6 shadow-2xl space-y-4 animate-fade-in animate-duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-gray/10 pb-3">
              <div className="flex items-center gap-2">
                {forgotStep === 'email' && (
                  <>
                    <Lock size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Forgot Password</span>
                  </>
                )}
                {forgotStep === 'otp' && (
                  <>
                    <MailIcon size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">Verify Code</span>
                  </>
                )}
                {forgotStep === 'new-password' && (
                  <>
                    <KeyRound size={16} className="text-mint-cash" />
                    <span className="text-xs font-bold text-mint-cash tracking-wider uppercase">New Password</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseForgotPassword}
                className="text-slate-gray hover:text-ivory-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-deep"
              >
                <X size={16} />
              </button>
            </div>

            {/* Forgot Password Message */}
            {forgotMessage && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs ${
                forgotMessage.type === 'success' 
                  ? 'bg-mint-cash/10 text-mint-cash border border-mint-cash/20' 
                  : 'bg-crimson-alert/10 text-crimson-alert border border-crimson-alert/20'
              }`}>
                {forgotMessage.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{forgotMessage.text}</span>
              </div>
            )}

            {/* Email Step */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
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
                    onClick={handleCloseForgotPassword}
                    className="flex-1 h-11 border border-slate-gray/10 hover:border-slate-gray/25 text-slate-gray hover:text-ivory-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    disabled={sendOTPMutation.isPending}
                  >
                    Cancel
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

            {/* OTP Step */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
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
                    onClick={() => setForgotStep('email')}
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

            {/* New Password Step */}
            {forgotStep === 'new-password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('otp')}
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
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 pr-12 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50 hover:text-slate-gray transition-colors cursor-pointer"
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61a13.526 13.526 0 0 0-2 2.68C4.05 10.18 4.5 10.9 5 12c0 0 3 7 10 7a10.43 10.43 0 0 0 1.27-.08"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-bg-deep border border-slate-gray/10 rounded-lg px-4 pr-12 py-2.5 text-xs text-ivory-white placeholder:text-slate-gray/30 focus-ring"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50 hover:text-slate-gray transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61a13.526 13.526 0 0 0-2 2.68C4.05 10.18 4.5 10.9 5 12c0 0 3 7 10 7a10.43 10.43 0 0 0 1.27-.08"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('otp')}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-card-fill border border-slate-gray/10 rounded-xl p-8 shadow-xl flex items-center justify-center h-[350px]">
          <Loader2 size={32} className="animate-spin text-mint-cash" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
