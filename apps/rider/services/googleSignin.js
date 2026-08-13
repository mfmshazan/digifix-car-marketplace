import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useSSO, useAuth } from '@clerk/expo';
import { useCallback } from 'react';
import { API_BASE_URL } from '../config';

WebBrowser.maybeCompleteAuthSession();

const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url, options) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

/**
 * Hook that triggers the Clerk Google OAuth flow.
 * Works in Expo Go because Clerk uses expo-web-browser (no custom native code needed).
 */
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

            // On web: browser redirect handled by sso-callback
            return { success: true, redirected: true };
        } catch (err) {
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
 * Syncs the Clerk session with our backend.
 * Sends the Clerk JWT → backend creates / retrieves the DeliveryPartner record
 * and returns our own accessToken + refreshToken.
 */
export const syncClerkWithBackend = async (clerkToken, role = 'DELIVERY_PARTNER', sessionId) => {
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clerkToken, role, sessionId }),
        });

        const result = await response.json();
        console.log('Backend sync result:', result);
        return result;
    } catch (error) {
        console.error('Backend sync error:', error);
        if (error?.name === 'AbortError') {
            return {
                success: false,
                message: `Could not connect to backend at ${API_BASE_URL}. Check that the backend is running and reachable from your phone.`,
            };
        }
        return { success: false, message: 'Failed to sync with backend' };
    }
};
