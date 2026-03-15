'use client';

import { useState } from 'react';
import { useSignIn, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function GoogleSignInButton() {
    const { signIn, isLoaded: isSignInLoaded } = useSignIn();
    const { getToken } = useAuth();
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        if (!isSignInLoaded || !signIn) return;

        try {
            setIsLoading(true);
            setError(null);

            // Start Google OAuth flow via Clerk
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/sso-callback',
                redirectUrlComplete: '/sso-callback?complete=true',
            });
        } catch (err: any) {
            console.error('Google sign-in error:', err);
            setError(err.errors?.[0]?.message || 'Failed to sign in with Google');
            setIsLoading(false);
        }
    };

    return (
        <div>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm mb-3">
                    {error}
                </div>
            )}
            <button
                onClick={handleGoogleSignIn}
                disabled={isLoading || !isSignInLoaded}
                className="w-full py-3 px-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-[#00002E] rounded-full animate-spin" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="text-gray-700 font-medium">Sign in with Google</span>
                    </>
                )}
            </button>
        </div>
    );
}
