import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useSSO, useSignIn, useAuth } from '@clerk/clerk-expo';
import { useCallback } from 'react';
import { Platform } from 'react-native';
import { API_URL } from '../config/api.config';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleSignIn = () => {
    const { startSSOFlow } = useSSO();
    const { signIn, isLoaded: isSignInLoaded } = useSignIn();
    const { isSignedIn } = useAuth();

    const signInWithGoogle = useCallback(async () => {
        try {
            // If already signed in with Clerk, we can just return success
            // to let the UI try to sync with the backend
            if (isSignedIn) {
                return { success: true };
            }

            // Mobile scheme from app.json is 'mobile'
            const redirectUrl = Linking.createURL('/sso-callback');

            // Force redirect flow on web for true responsiveness (avoiding popups)
            if (Platform.OS === 'web' && isSignInLoaded && signIn) {
                await signIn.authenticateWithRedirect({
                    strategy: 'oauth_google',
                    redirectUrl: redirectUrl,
                    redirectUrlComplete: redirectUrl,
                });
                return { success: true };
            }

            // Standard flow for native (uses in-app browser popup)
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: 'oauth_google',
                redirectUrl: Platform.OS === 'web' ? redirectUrl : undefined,
            });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });

                // Note: On web with redirect, this part will not be reached
                return { success: true, sessionId: createdSessionId };
            }

            return { success: false, message: 'Google sign-in incomplete' };
        } catch (err: any) {
            // If the error is that a session already exists, we consider it a success
            // because Clerk is already authenticated
            if (err.errors?.[0]?.code === 'session_exists' || err.message?.includes('already signed in')) {
                return { success: true };
            }
            
            console.error('Google sign-in error:', err);
            return { success: false, message: err.message || 'Failed to sign in with Google' };
        }
    }, [startSSOFlow, signIn, isSignInLoaded, isSignedIn]);

    return { signInWithGoogle };
};



/**
 * Normalizes the Clerk auth flow with the backend
 * This should be called after a successful Clerk sign-in
 */
export const syncClerkWithBackend = async (clerkToken: string, role: string = 'CUSTOMER', sessionId?: string) => {
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
