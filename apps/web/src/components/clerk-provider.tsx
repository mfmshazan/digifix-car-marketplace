'use client';

import { ClerkProvider } from '@clerk/nextjs';

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        >
            {children}
        </ClerkProvider>
    );
}
