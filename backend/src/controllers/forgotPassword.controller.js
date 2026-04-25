import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { emailService } from '../services/email/emailServiceFactory.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate a 6-digit OTP
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

export const requestOtp = async (req, res) => {
    try {
        let { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        email = email.trim().toLowerCase();
        console.log(`[ForgotPassword] Normalized Email: [${email}] (Length: ${email.length})`);

        // 1. Check if user exists (but don't reveal to client if they don't)
        const user = await prisma.user.findUnique({ where: { email } });
        console.log(`[ForgotPassword] User found: ${!!user}`);

        // Always return success to hide email existence
        if (!user) {
            console.warn(`[ForgotPassword] User not found in DB for email: ${email}`);
            return res.status(200).json({
                success: true,
                message: 'If the email exists, an OTP will be sent.',
            });
        }

        // 2. Generate and hash OTP
        const otp = generateOTP();
        console.log(`[ForgotPassword] Generated OTP for ${email}: ${otp}`);
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

        // 3. Store OTP in database
        console.log(`[ForgotPassword] Storing OTP in DB...`);
        await prisma.passwordResetOtp.create({
            data: {
                email,
                otpHash,
                expiresAt,
            },
        });

        // 4. Send email
        const htmlContent = `
            <h2>Password Reset Request</h2>
            <p>Your one-time password (OTP) is: <strong>${otp}</strong></p>
            <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `;

        console.log(`[ForgotPassword] Attempting to send email via service...`);
        try {
            await emailService.send({
                to: email,
                subject: 'Password Reset OTP - DIGIFIX',
                html: htmlContent,
                text: `Your OTP is: ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
            });
            console.log(`[ForgotPassword] Email sent successfully to ${email}`);
        } catch (emailError) {
            console.error('[ForgotPassword] Email dispatch failed:', emailError.message);
            return res.status(500).json({ 
                success: false, 
                message: `Failed to send email OTP: ${emailError.message}` 
            });
        }

        // For local development testing, log the OTP to the console
        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n======================================`);
            console.log(`[DEV OTP] Password Reset for ${email}`);
            console.log(`[DEV OTP] Code: ${otp}`);
            console.log(`======================================\n`);
        }

        res.status(200).json({
            success: true,
            message: 'OTP has been sent to your email address.',
        });

    } catch (error) {
        console.error('Request OTP Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        let { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        email = email.trim().toLowerCase();

        // 1. Find the latest unused OTP for this email
        const resetRecord = await prisma.passwordResetOtp.findFirst({
            where: { email, used: false },
            orderBy: { createdAt: 'desc' },
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // 2. Check if expired
        if (new Date() > resetRecord.expiresAt) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        // 3. Verify OTP hash
        const isValid = await bcrypt.compare(otp.toString(), resetRecord.otpHash);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // 4. Mark OTP as used
        await prisma.passwordResetOtp.update({
            where: { id: resetRecord.id },
            data: { used: true },
        });

        // 5. Generate short-lived reset token (valid for 15 mins)
        const resetToken = jwt.sign({ email, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            data: { resetToken },
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
        }

        if (newPassword.length < 6) {
             return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // 1. Verify token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
        }

        if (decoded.purpose !== 'password_reset') {
             return res.status(401).json({ success: false, message: 'Invalid token purpose' });
        }

        const email = decoded.email;

        // 2. Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 3. Update user password
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login.',
        });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
