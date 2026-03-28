import { createClerkClient } from '@clerk/backend';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Initialize Clerk client lazily to ensure environment variables are loaded
let clerkClient;
const getClerkClient = () => {
    if (!clerkClient) {
        let secretKey = process.env.CLERK_SECRET_KEY;

        // Handle empty but defined string from Docker environment overrides
        if (!secretKey || secretKey.trim() === "") {
            console.error('CRITICAL: CLERK_SECRET_KEY is missing or empty in environment!');
            // Log all env keys to see what's available (without values for security)
            console.log('Available environment variables:', Object.keys(process.env).join(', '));
        }

        clerkClient = createClerkClient({
            secretKey: secretKey,
        });
    }
    return clerkClient;
};

// Generate JWT token (same as existing auth)
const generateToken = (userId, role) => {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Google Sign-In via Clerk
 * 
 * Flow:
 * 1. Frontend authenticates with Clerk (Google OAuth)
 * 2. Frontend sends the Clerk session token to this endpoint
 * 3. We verify the token with Clerk, extract user info
 * 4. Find or create the user in our database
 * 5. Return a standard JWT token (same format as email/password login)
 */
const googleSignIn = async (req, res) => {
    try {
        const { clerkToken, role = 'CUSTOMER', sessionId } = req.body;

        if (!clerkToken) {
            return res.status(400).json({
                success: false,
                message: 'Clerk token is required',
            });
        }

        // Verify the Clerk session token
        let clerkUser;
        let clerkUserId;

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: sessionId is required',
            });
        }

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

        // Extract user info from Clerk
        const email = clerkUser.emailAddresses?.[0]?.emailAddress;
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null;
        const avatar = clerkUser.imageUrl || null;
        const googleId = clerkUser.externalAccounts?.find(
            (acc) => acc.provider === 'google'
        )?.providerUserId || clerkUser.id;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'No email found in Clerk account',
            });
        }

        // Find or create user in our database
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { googleId },
                    { email },
                ],
            },
            include: {
                store: true,
            },
        });

        if (user) {
            // Update existing user with Google info if needed
            if (!user.googleId || !user.avatar) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: user.googleId || googleId,
                        avatar: user.avatar || avatar,
                        authProvider: 'GOOGLE',
                        name: user.name || name,
                    },
                    include: {
                        store: true,
                    },
                });
            }
        } else {
            // Create new user
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

            // If salesman, create a store
            if (role === 'SALESMAN') {
                await prisma.store.create({
                    data: {
                        name: name ? `${name}'s Store` : 'My Store',
                        ownerId: user.id,
                    },
                });

                // Refetch with store
                user = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: { store: true },
                });
            }
        }

        // Generate our standard JWT token
        const token = generateToken(user.id, user.role);

        res.json({
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
        res.status(500).json({
            success: false,
            message: 'Failed to sign in with Google',
        });
    }
};

export { googleSignIn };
