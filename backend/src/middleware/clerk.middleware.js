import { ClerkExpressWithAuth, requireAuth } from '@clerk/clerk-sdk-node';

const clerkMiddleware = ClerkExpressWithAuth();

const verifyClerkToken = requireAuth();

export { clerkMiddleware, verifyClerkToken };
