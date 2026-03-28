import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useSSO, useAuth } from '@clerk/expo';
import { useCallback } from 'react';
import { API_URL } from '../config/api.config';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleSignIn = () => {
    const { startSSOFlow } = useSSO();
    const { isSignedIn } = useAuth();

    const signInWithGoogle = useCallback(async () => {
        try {
            if (isSignedIn) {
                return { success: true };
            }

            const redirectUrl = Linking.createURL('/sso-callback');

            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl,
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                return { success: true, sessionId: createdSessionId };
            }

            return { success: false, message: 'Google sign-in incomplete' };
        } catch (err: any) {
            if (
                err?.errors?.[0]?.code === 'session_exists' ||
                err?.message?.includes('already signed in')
            ) {
                return { success: true };
            }

            console.error('Google sign-in error:', err);
            return {
                success: false,
                message: err?.message || 'Failed to sign in with Google',
            };
        }
    }, [startSSOFlow, isSignedIn]);

    return { signInWithGoogle };
};

/**
 * Normalizes the Clerk auth flow with the backend
 * This should be called after a successful Clerk sign-in
 */
export const syncClerkWithBackend = async (
    clerkToken: string,
    role: string = 'CUSTOMER',
    sessionId?: string
) => {
    try {
        console.log('Syncing with backend, token present:', !!clerkToken, 'sessionId:', sessionId);

        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clerkToken,
                role,
                sessionId,
            }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Backend sync error:', error);
        return { success: false, message: 'Failed to sync with backend' };
    }
};