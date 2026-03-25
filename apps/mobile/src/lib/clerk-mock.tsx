import * as React from 'react';

// Mock implementations for Clerk that work in Expo Go
// These provide no-op implementations so the app doesn't crash

// Mock ClerkProvider
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

export const ClerkLoaded = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};

// Mock useAuth hook
export const useAuth = () => ({
    isSignedIn: false,
    isLoaded: true,
    userId: null,
    sessionId: null,
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: () => false,
    getToken: async () => null,
    signOut: async () => {},
});

// Mock useUser hook
export const useUser = () => ({
    isSignedIn: false,
    isLoaded: true,
    user: null,
});

// Mock useSession hook
export const useSession = () => ({
    isSignedIn: false,
    isLoaded: true,
    session: null,
});

// Mock useSSO hook
export const useSSO = () => ({
    startSSOFlow: async () => ({
        createdSessionId: null,
        setActive: null,
        signIn: null,
        signUp: null,
    }),
});

// Mock useSignIn hook
export const useSignIn = () => ({
    isLoaded: true,
    signIn: null,
    setActive: async () => {},
});

// Mock useSignUp hook
export const useSignUp = () => ({
    isLoaded: true,
    signUp: null,
    setActive: async () => {},
});

// Mock useClerk hook
export const useClerk = () => ({
    signOut: async () => {},
    openSignIn: () => {},
    openSignUp: () => {},
    openUserProfile: () => {},
});

// For backwards compatibility with our existing code
export const MockClerkProvider = ClerkProvider;
export const useAuthMock = useAuth;
export const useSSOmock = useSSO;

export const useGoogleSignInMock = () => ({
    signInWithGoogle: async () => ({
        success: false,
        message: 'Google Sign-In is not available in Expo Go. Please use email/password login.',
    }),
});

// Default export to match module structure
export default {
    ClerkProvider,
    ClerkLoaded,
    useAuth,
    useUser,
    useSession,
    useSSO,
    useSignIn,
    useSignUp,
    useClerk,
};
