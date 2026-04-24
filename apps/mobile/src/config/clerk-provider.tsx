import * as React from "react";
import { ClerkProvider, ClerkLoaded } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import * as Linking from "expo-linking";
import { CLERK_PUBLISHABLE_KEY } from "./clerk-env";

/**
 * All platforms (including web): @clerk/expo loads Clerk appropriately per platform.
 * Do not bundle `@clerk/clerk-js` for web — it emits `import.meta`, which breaks Metro’s web bundle.
 */
export function ClerkAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const callbackUrl = Linking.createURL("/sso-callback");

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
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
