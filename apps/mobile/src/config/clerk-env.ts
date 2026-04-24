/** Shared Clerk publishable key — validated once at module load. */
function readClerkPublishableKey(): string {
  const k = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!k) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env"
    );
  }
  return k;
}

export const CLERK_PUBLISHABLE_KEY: string = readClerkPublishableKey();
