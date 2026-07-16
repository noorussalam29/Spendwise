'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerSchema } from '@/lib/validations';
import { z } from 'zod';
import { User, Mail, KeyRound, AlertCircle, Loader2 } from 'lucide-react';

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Redirect to login page on success, noting registration was successful
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
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
          Create your account
        </h1>
        <p className="text-xs text-slate-gray">
          Start budgeting and tracking your spending pace today.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-crimson-alert/5 border border-crimson-alert/15 text-xs text-crimson-alert">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-gray tracking-wide uppercase">
            Full Name
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray/50" />
            <input
              type="text"
              placeholder="e.g. Aditya Sharma"
              {...register('name')}
              className={`w-full bg-bg-deep border rounded-lg pl-10 pr-4 py-2.5 text-sm text-ivory-white placeholder:text-slate-gray/30 focus-ring ${
                errors.name ? 'border-crimson-alert/40' : 'border-slate-gray/10'
              }`}
              disabled={loading}
            />
          </div>
          {errors.name && (
            <p className="text-[11px] text-crimson-alert">{errors.name.message}</p>
          )}
        </div>

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
              placeholder="Min. 6 characters"
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
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Login redirect */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-gray">
          Already have an account?{' '}
          <Link href="/login" className="text-mint-cash hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
