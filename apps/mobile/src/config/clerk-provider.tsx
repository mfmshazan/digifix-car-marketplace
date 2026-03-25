import * as React from 'react';
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const tokenCache = {
    async getToken(key: string) {
        try {
            const item = await SecureStore.getItemAsync(key);
            return item;
        } catch (error) {
            console.error('SecureStore get error:', error);
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            return SecureStore.setItemAsync(key, value);
        } catch (err) {
            return;
        }
    },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
    if (isExpoGo) {
        console.log('📱 Running in Expo Go - Google Sign-In is disabled');
        console.log('   Use email/password login, or create a dev build for Google Sign-In');
    }

    // Get a valid key (or dummy for mock mode)
    const keyToUse = publishableKey && publishableKey !== 'pk_test_placeholder_key_configured_from_clerk_dashboard'
        ? publishableKey
        : 'pk_test_' + 'dummy'.repeat(20);

    return (
        <ClerkProvider tokenCache={tokenCache} publishableKey={keyToUse}>
            {children}
        </ClerkProvider>
    );
}

// Re-export useAuth for convenience
export { useClerkAuth as useAuth };
