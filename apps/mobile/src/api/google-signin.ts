import * as WebBrowser from 'expo-web-browser';
import { useSSO } from '@clerk/clerk-expo';
import { useCallback } from 'react';
import Constants from 'expo-constants';
import { API_URL } from '../config/api.config';

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Initialize WebBrowser auth session
WebBrowser.maybeCompleteAuthSession();

export const useGoogleSignIn = () => {
    const { startSSOFlow } = useSSO();

    const signInWithGoogle = useCallback(async () => {
        // Show message if in Expo Go
        if (isExpoGo) {
            return {
                success: false,
                message: 'Google Sign-In is not available in Expo Go. Please use email/password login.',
            };
        }

        try {
            // Check if Clerk is configured
            if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) {
                console.warn('Google Sign-In is not available: Clerk is not configured');
                return { success: false, message: 'Google Sign-In is not configured' };
            }

            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                return { success: true, sessionId: createdSessionId };
            }

            return { success: false, message: 'Google sign-in incomplete' };
        } catch (err: any) {
            console.error('Google sign-in error:', err);
            return { success: false, message: err.message || 'Failed to sign in with Google' };
        }
    }, [startSSOFlow]);

    return { signInWithGoogle };
};

/**
 * Syncs the Clerk auth with the backend
 * This should be called after a successful Clerk sign-in
 */
export const syncClerkWithBackend = async (clerkToken: string, role: string = 'CUSTOMER') => {
    try {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clerkToken,
                role,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Backend sync failed');
        }

        return result;
    } catch (error) {
        console.error('Backend sync error:', error);
        throw error;
    }
};
