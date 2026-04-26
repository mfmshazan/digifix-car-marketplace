'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import GoogleSignInButton from '@/components/google-signin-button';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.login(email, password);

      if (response.success) {
        const { user, token } = response.data;
        login(user, token);

        // Redirect based on user role
        if (user.role === 'SALESMAN') {
          router.push('/dashboard/salesman');
        } else {
          router.push('/');
        }
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#00002E] rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z" />
                </svg>
              </div>
              <span className="text-2xl font-black">
                <span className="text-gray-400"></span>
                <span className="text-[#00002E]">DIGI</span>
                <span className="text-gray-400">FIX</span>
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="off"
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="off"
                  className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#00002E] focus:ring-[#00002E]" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-[#00002E] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign In */}
          <div className="mt-6">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">or continue with</span>
              </div>
            </div>
            <GoogleSignInButton />
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-[#00002E] hover:underline font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-[#00002E] items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-4">
              Find the Perfect Parts for Your Car
            </h2>
            <p className="text-gray-300 text-lg">
              Access thousands of quality car parts from verified sellers. Search by your car's number plate to find compatible parts instantly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-white">
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-gray-400 text-sm">Parts Listed</div>
            </div>
            <div>
              <div className="text-3xl font-bold">5K+</div>
              <div className="text-gray-400 text-sm">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-gray-400 text-sm">Active Sellers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
