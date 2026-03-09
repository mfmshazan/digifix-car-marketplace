'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Suspense } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function SSOCallbackContent() {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user: clerkUser } = useUser();
    const { signIn } = useClerk();
    const router = useRouter();
    const searchParams = useSearchParams();
    const login = useAuthStore((state) => state.login);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            if (!isLoaded) return;

            try {
                // Handle the OAuth callback
                const isComplete = searchParams.get('complete') === 'true';

                if (!isComplete) {
                    // First redirect - Clerk needs to process the OAuth result
                    // The AuthenticateWithRedirectCallback handles this automatically
                    // Just wait for Clerk to process
                    return;
                }

                if (!isSignedIn || !clerkUser) {
                    // Wait for Clerk to finish loading the user
                    return;
                }

                // Get the Clerk session token
                const clerkToken = await getToken();

                if (!clerkToken) {
                    setError('Failed to get authentication token');
                    setIsProcessing(false);
                    return;
                }

                // Send to our backend to get a JWT
                const response = await fetch(`${API_BASE_URL}/auth/google`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clerkToken,
                        role: 'CUSTOMER',
                    }),
                });

                const data = await response.json();

                if (data.success) {
                    // Login with our JWT (same as email/password login)
                    login(data.data.user, data.data.token);

                    // Redirect based on role
                    if (data.data.user.role === 'SALESMAN') {
                        router.push('/dashboard/salesman');
                    } else {
                        router.push('/dashboard/customer');
                    }
                } else {
                    setError(data.message || 'Google sign-in failed');
                    setIsProcessing(false);
                }
            } catch (err: any) {
                console.error('SSO callback error:', err);
                setError('Failed to complete Google sign-in');
                setIsProcessing(false);
            }
        };

        handleCallback();
    }, [isLoaded, isSignedIn, clerkUser, searchParams]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Sign-in Failed</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="px-6 py-2 bg-[#00002E] text-white rounded-xl hover:bg-[#000050] transition-all"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-[#00002E] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Completing sign-in...</p>
            </div>
        </div>
    );
}

export default function SSOCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-[#00002E] rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Processing...</p>
                    </div>
                </div>
            }
        >
            <SSOCallbackContent />
        </Suspense>
    );
}
