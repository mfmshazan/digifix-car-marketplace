import * as WebBrowser from 'expo-web-browser';
import { useSSO } from '@clerk/clerk-expo';
import { useCallback } from 'react';
import { API_URL } from '../config/api.config';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleSignIn = () => {
    const { startSSOFlow } = useSSO();

    const signInWithGoogle = useCallback(async () => {
        try {
            const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
                strategy: 'oauth_google',
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });

                // This is where we bridge Clerk with our backend
                // We need to get the session token to send to our backend
                // Note: In Expo, the session is now active, so hooks like useAuth will work
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
 * Normalizes the Clerk auth flow with the backend
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
