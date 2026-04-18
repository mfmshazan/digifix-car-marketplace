import * as React from "react";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as Linking from "expo-linking";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
    throw new Error(
        "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
    );
}

export function ClerkAuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const callbackUrl = Linking.createURL("/sso-callback");

    return (
        <ClerkProvider
            publishableKey={publishableKey}
            tokenCache={tokenCache}
            signInForceRedirectUrl={callbackUrl}
            signUpForceRedirectUrl={callbackUrl}
            signInFallbackRedirectUrl={callbackUrl}
            signUpFallbackRedirectUrl={callbackUrl}
        >
            <ClerkLoaded>{children}</ClerkLoaded>
        </ClerkProvider>
    );
}
