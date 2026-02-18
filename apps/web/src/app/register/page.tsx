'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User, ShieldCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// Google Sign-Up Button Component
function GoogleSignUpButton({ onSuccess, onError, isLoading: parentLoading }: {
    onSuccess: (user: any, token: string) => void;
    onError: (message: string) => void;
    isLoading: boolean;
}) {
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                    callback: handleGoogleResponse,
                    auto_select: false,
                });
            }
        };
        document.body.appendChild(script);

        return () => {
            const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (existingScript) {
                document.body.removeChild(existingScript);
            }
        };
    }, []);

    const handleGoogleResponse = async (response: any) => {
        try {
            setIsLoading(true);
            const payload = JSON.parse(atob(response.credential.split('.')[1]));

            const result = await authApi.googleCallback({
                email: payload.email,
                name: payload.name,
                googleId: payload.sub,
                avatar: payload.picture,
            });

            if (result.success) {
                onSuccess(result.data.user, result.data.token);
            } else {
                onError(result.message || 'Google sign-up failed');
            }
        } catch (err: any) {
            onError(err.response?.data?.message || 'Google sign-up failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = () => {
        if (window.google) {
            window.google.accounts.id.prompt();
        } else {
            onError('Google Sign-Up is not available. Please try again later.');
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isLoading || parentLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign up with Google
                </>
            )}
        </button>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'CUSTOMER' | 'SALESMAN'>('CUSTOMER');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const handleGoogleSuccess = (user: any, token: string) => {
        login(user, token);
        if (user.role === 'SALESMAN') {
            router.push('/dashboard/salesman');
        } else {
            router.push('/dashboard/customer');
        }
    };

    const handleGoogleError = (message: string) => {
        setError(message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!acceptTerms) {
            setError('Please accept the terms and conditions');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await authApi.register({ name, email, password, role });

            if (response.success) {
                const { user, token } = response.data;
                login(user, token);

                if (user.role === 'SALESMAN') {
                    router.push('/dashboard/salesman');
                } else {
                    router.push('/dashboard/customer');
                }
            } else {
                setError(response.message || 'Registration failed');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
                        <p className="text-gray-500">Join our community of car enthusiasts</p>
                    </div>

                    {/* Google Sign-Up */}
                    <div className="mb-6">
                        <GoogleSignUpButton
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-400 font-medium">or sign up with email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password (min 6 characters)"
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                                    required
                                    minLength={6}
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00002E]/20 focus:border-[#00002E] transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">I want to</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('CUSTOMER')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 ${role === 'CUSTOMER'
                                            ? 'border-[#00002E] bg-[#00002E]/5 text-[#00002E]'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                        }`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    <span className="text-sm font-semibold">Buy Parts</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('SALESMAN')}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 ${role === 'SALESMAN'
                                            ? 'border-[#00002E] bg-[#00002E]/5 text-[#00002E]'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-500'
                                        }`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-sm font-semibold">Sell Parts</span>
                                </button>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#00002E] focus:ring-[#00002E]"
                            />
                            <span className="text-sm text-gray-600">
                                I agree to the{' '}
                                <Link href="/terms" className="text-[#00002E] hover:underline font-medium">Terms of Service</Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-[#00002E] hover:underline font-medium">Privacy Policy</Link>
                            </span>
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
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="text-[#00002E] hover:underline font-semibold">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Branding (matching login page style) */}
            <div className="hidden lg:flex flex-1 bg-[#00002E] items-center justify-center p-12">
                <div className="max-w-lg text-center">
                    <div className="mb-8">
                        <h2 className="text-4xl font-bold text-white mb-4">
                            Start Your Journey Today
                        </h2>
                        <p className="text-gray-300 text-lg">
                            Join thousands of car enthusiasts. Buy and sell quality car parts with verified sellers across the country.
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

// Type declaration for Google Identity Services
declare global {
    interface Window {
        google: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    prompt: () => void;
                    renderButton: (element: HTMLElement, config: any) => void;
                };
            };
        };
    }
}
