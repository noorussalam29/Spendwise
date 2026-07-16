'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginSchema } from '@/lib/validations';
import { z } from 'zod';
import { KeyRound, Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams?.get('error') === 'CredentialsSignin'
      ? 'Invalid credentials. Please try again.'
      : null
  );
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

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

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
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
              placeholder="e.g. aditya@gmail.com"
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
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full bg-bg-deep border rounded-lg pl-10 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
                errors.password ? 'border-crimson-alert/40' : 'border-slate-gray/10'
              }`}
              disabled={loading}
            />
          </div>
          {errors.password && (
            <p className="text-[11px] text-crimson-alert">{errors.password.message}</p>
          )}
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
