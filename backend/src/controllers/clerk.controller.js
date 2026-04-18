import { createClerkClient, verifyToken } from '@clerk/backend';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize Clerk client lazily to ensure environment variables are loaded
let clerkClient;
const getClerkClient = () => {
    if (!clerkClient) {
        const secretKey = process.env.CLERK_SECRET_KEY;

        if (!secretKey || secretKey.trim() === '') {
            console.error('CRITICAL: CLERK_SECRET_KEY is missing or empty in environment!');
        }

        clerkClient = createClerkClient({ secretKey });
    }
    return clerkClient;
};

// Generate JWT token
const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Google Sign-In via Clerk
 * Strategy 1 (Mobile/Expo Go): Verify the short-lived Clerk JWT token directly
 * Strategy 2 (Web fallback):   Verify via session ID using getSession()
 */
const googleSignIn = async (req, res) => {
    try {
        const { clerkToken, role = 'CUSTOMER', sessionId } = req.body;

        console.log('Incoming Google auth request:', {
            hasClerkToken: !!clerkToken,
            hasSessionId: !!sessionId,
            role,
        });

        if (!clerkToken && !sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Authentication failed: clerkToken or sessionId is required',
            });
        }

        let clerkUser;
        let clerkUserId;
        let verified = false;

        // ── Strategy 1: Verify JWT token directly (works for Expo Go / mobile) ──
        if (clerkToken) {
            try {
                const secretKey = process.env.CLERK_SECRET_KEY;
                const payload = await verifyToken(clerkToken, { secretKey });

                clerkUserId = payload.sub;
                clerkUser = await getClerkClient().users.getUser(clerkUserId);
                verified = true;
                console.log('✅ Verified via Clerk JWT token (mobile/Expo Go)');
            } catch (tokenError) {
                console.warn('JWT token verification failed, trying session fallback:', tokenError.message);
            }
        }

        // ── Strategy 2: Verify via session ID (web fallback) ──
        if (!verified && sessionId) {
            try {
                const session = await getClerkClient().sessions.getSession(sessionId);

                if (!session || session.status !== 'active') {
                    throw new Error(`Session is ${session ? session.status : 'missing'}`);
                }

                clerkUserId = session.userId;
                clerkUser = await getClerkClient().users.getUser(clerkUserId);
                verified = true;
                console.log('✅ Verified via Clerk session ID (web)');
            } catch (sessionError) {
                console.error('Session verification failed:', sessionError.message);
            }
        }

        if (!verified || !clerkUser) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: could not verify Clerk identity',
            });
        }

        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;
        const avatar = clerkUser.imageUrl || null;
        const googleId =
            clerkUser.externalAccounts?.find((acc) => acc.provider === 'google')
                ?.providerUserId || clerkUser.id;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'No email found in Clerk account',
            });
        }

        let user = await prisma.user.findFirst({
            where: { OR: [{ googleId }, { email }] },
            include: { store: true },
        });

        if (user) {
            if (!user.googleId || !user.avatar) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: user.googleId || googleId,
                        avatar: user.avatar || avatar,
                        authProvider: 'GOOGLE',
                        name: user.name || name,
                    },
                    include: { store: true },
                });
            }
        } else {
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    avatar,
                    googleId,
                    role,
                    authProvider: 'GOOGLE',
                    isVerified: true,
                },
                include: { store: true },
            });

            if (role === 'SALESMAN') {
                await prisma.store.create({
                    data: {
                        name: name ? `${name}'s Store` : 'My Store',
                        ownerId: user.id,
                    },
                });

                user = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: { store: true },
                });
            }
        }

        const token = generateToken(user.id, user.role);

        return res.json({
            success: true,
            message: 'Google sign-in successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    store: user.store,
                },
                token,
            },
        });
    } catch (error) {
        console.error('Google sign-in error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to sign in with Google',
        });
    }
};

export { googleSignIn };