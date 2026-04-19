import { createClerkClient } from '@clerk/backend';
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
            console.log('Available environment variables:', Object.keys(process.env).join(', '));
        }

        clerkClient = createClerkClient({
            secretKey,
        });
    }

    return clerkClient;
};

// Generate JWT token
const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Google Sign-In via Clerk
 * Flow:
 * 1. Frontend authenticates with Clerk (Google OAuth)
 * 2. Frontend sends Clerk sessionId to this endpoint
 * 3. Backend verifies the session with Clerk
 * 4. Find or create user in database
 * 5. Return app JWT
 */
const googleSignIn = async (req, res) => {
    try {
        const { clerkToken, role = 'CUSTOMER', sessionId } = req.body;

        console.log('Incoming Google auth request:', {
            hasClerkToken: !!clerkToken,
            hasSessionId: !!sessionId,
            role,
        });

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Authentication failed: sessionId is required',
            });
        }

        let clerkUser;
        let clerkUserId;

        try {
            const session = await getClerkClient().sessions.getSession(sessionId);

            if (!session || session.status !== 'active') {
                throw new Error(`Session is ${session ? session.status : 'missing'}`);
            }

            clerkUserId = session.userId;
            clerkUser = await getClerkClient().users.getUser(clerkUserId);

            console.log('Successfully verified via sessionId');
        } catch (sessionError) {
            console.error('Clerk session verification failed:', sessionError.message);

            return res.status(401).json({
                success: false,
                message: `Authentication failed: ${sessionError.message}`,
            });
        }

        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        const name =
            `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;
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
            where: {
                OR: [{ googleId }, { email }],
            },
            include: {
                store: true,
            },
        });

        if (user) {
            // Preserve local uploaded avatar (starts with /uploads/)
            // Only fill from Clerk if there's absolutely no avatar stored
            const keepExistingAvatar = user.avatar && user.avatar.startsWith('/uploads/');
            const avatarToSet = keepExistingAvatar ? user.avatar : (user.avatar || avatar);

            if (!user.googleId || !user.avatar) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: user.googleId || googleId,
                        avatar: avatarToSet,
                        authProvider: 'GOOGLE',
                        name: user.name || name,
                    },
                    include: {
                        store: true,
                    },
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
                include: {
                    store: true,
                },
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
                    phone: user.phone,
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