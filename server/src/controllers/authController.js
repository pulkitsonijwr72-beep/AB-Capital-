import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const RESET_EXPIRES_MS = 15 * 60 * 1000; // 15 minutes (production spec)
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

function setRefreshCookie(res, token) {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_EXPIRES_MS,
        path: '/'
    });
}

function clearRefreshCookie(res) {
    res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict', path: '/' });
}

// ---------- POST /api/auth/register ----------
export async function register(req, res) {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPw.test(password)) {
        return res.status(400).json({
            error: 'Password must contain uppercase, lowercase, a number, and a special character.'
        });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await prisma.user.create({
            data: { name: name.trim(), email: email.toLowerCase().trim(), password_hash }
        });

        const accessToken = generateAccessToken(user);
        const refreshTokenStr = generateRefreshToken();

        await prisma.refreshToken.create({
            data: {
                token: refreshTokenStr,
                user_id: user.id,
                expires_at: new Date(Date.now() + REFRESH_EXPIRES_MS)
            }
        });

        setRefreshCookie(res, refreshTokenStr);

        return res.status(201).json({
            accessToken,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}

// ---------- POST /api/auth/login ----------
export async function login(req, res) {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const accessToken = generateAccessToken(user);
        const refreshTokenStr = generateRefreshToken();
        const expiresAt = rememberMe
            ? new Date(Date.now() + REFRESH_EXPIRES_MS)
            : new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day if not rememberMe

        await prisma.refreshToken.create({
            data: { token: refreshTokenStr, user_id: user.id, expires_at: expiresAt }
        });

        setRefreshCookie(res, refreshTokenStr);

        return res.json({
            accessToken,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
}

// ---------- POST /api/auth/refresh ----------
export async function refresh(req, res) {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token.' });

    try {
        const stored = await prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!stored || stored.expires_at < new Date()) {
            clearRefreshCookie(res);
            return res.status(401).json({ error: 'Refresh token expired or invalid. Please log in again.' });
        }

        // Rotate: delete old, issue new
        await prisma.refreshToken.delete({ where: { token } });

        const newRefreshToken = generateRefreshToken();
        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                user_id: stored.user_id,
                expires_at: new Date(Date.now() + REFRESH_EXPIRES_MS)
            }
        });

        const accessToken = generateAccessToken(stored.user);
        setRefreshCookie(res, newRefreshToken);

        return res.json({
            accessToken,
            user: { id: stored.user.id, name: stored.user.name, email: stored.user.email }
        });
    } catch (error) {
        console.error('Refresh error:', error);
        return res.status(500).json({ error: 'Token refresh failed.' });
    }
}

// ---------- POST /api/auth/logout ----------
export async function logout(req, res) {
    const token = req.cookies?.refresh_token;

    if (token) {
        try {
            await prisma.refreshToken.deleteMany({ where: { token } });
        } catch {
            // best-effort deletion
        }
    }

    clearRefreshCookie(res);
    return res.json({ success: true });
}

// ---------- POST /api/auth/forgot-password ----------
export async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

        // Always respond with the same message to prevent email enumeration
        if (!user) {
            return res.json({ message: 'If that email exists, a reset link has been sent.' });
        }

        // Generate a cryptographically secure raw token (sent in the email link)
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Hash the token before storing — so a DB leak cannot be used to reset passwords
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiry = new Date(Date.now() + RESET_EXPIRES_MS); // 15 minutes

        // Invalidate any existing reset token for this user before creating a new one
        await prisma.user.update({
            where: { id: user.id },
            data: { password_reset_token: hashedToken, password_reset_expiry: expiry }
        });

        // Send the reset email (raw token goes in the URL, hashed token stored in DB)
        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetToken: rawToken,
                expiresMin: 15
            });
        } catch (emailError) {
            // Email failure is non-fatal; log and fall back to console output
            console.error('[Email] Failed to send reset email:', emailError.message);
            console.log('\n========================================');
            console.log('  PASSWORD RESET TOKEN (email failed — dev fallback)');
            console.log(`  User: ${user.email}`);
            console.log(`  Token: ${rawToken}`);
            console.log(`  Expires: ${expiry.toLocaleString()}`);
            console.log('========================================\n');
        }

        return res.json({ message: 'If that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({ error: 'Request failed. Please try again.' });
    }
}

// ---------- POST /api/auth/reset-password ----------
export async function resetPassword(req, res) {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Token, password, and confirmation are required.' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }
    const strongPw = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPw.test(password)) {
        return res.status(400).json({
            error: 'Password must contain uppercase, lowercase, a number, and a special character.'
        });
    }

    try {
        // Hash the incoming raw token to match the hashed value stored in the DB
        const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

        const user = await prisma.user.findFirst({
            where: {
                password_reset_token: hashedToken,
                password_reset_expiry: { gt: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Reset token is invalid or has expired.' });
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        // Clear the token fields so the link cannot be reused
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password_hash,
                password_reset_token: null,
                password_reset_expiry: null
            }
        });

        // Invalidate all refresh tokens — forces re-login on all devices
        await prisma.refreshToken.deleteMany({ where: { user_id: user.id } });

        return res.json({ message: 'Password reset successful. Please log in with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
}

// ---------- GET /api/auth/me ----------
export async function getMe(req, res) {
    // req.user is set by requireAuth middleware
    return res.json({ user: req.user });
}
