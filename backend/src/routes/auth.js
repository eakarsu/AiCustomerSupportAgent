import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { loginValidation, registerValidation, passwordStrengthRules, handleValidation } from '../middleware/validate.js';
import { body } from 'express-validator';

const router = express.Router();

// Password strength check utility
function checkPasswordStrength(password) {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|]/.test(password),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  if (passed >= 4) strength = 'strong';
  else if (passed >= 3) strength = 'medium';
  return { strength, checks, score: passed };
}

// Login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'agent'
      }
    });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await req.prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      verificationToken, // In production, send via email
      message: 'Account created. Please verify your email.'
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    // Check blacklist
    const blacklisted = await req.prisma.blacklistedToken.findUnique({
      where: { token }
    });
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const decoded = jwt.decode(req.token);
    await req.prisma.blacklistedToken.create({
      data: {
        token: req.token,
        expiresAt: new Date(decoded.exp * 1000),
      }
    });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/password-reset/request', passwordResetLimiter, [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  handleValidation,
], async (req, res) => {
  try {
    const { email } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await req.prisma.passwordReset.create({
      data: {
        email,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      }
    });

    // In production, send email with reset link
    res.json({
      message: 'If an account exists with this email, a reset link has been sent.',
      resetToken, // Only for demo - remove in production
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password with token
router.post('/password-reset/confirm', [
  body('token').notEmpty().withMessage('Reset token is required'),
  ...passwordStrengthRules,
  handleValidation,
], async (req, res) => {
  try {
    const { token, password } = req.body;

    const resetRecord = await req.prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await req.prisma.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword }
    });

    await req.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password (authenticated)
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  ...passwordStrengthRules,
  handleValidation,
], async (req, res) => {
  try {
    const { currentPassword, password } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === password) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check password strength
router.post('/check-password-strength', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  res.json(checkPasswordStrength(password));
});

// Verify email
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required'),
  handleValidation,
], async (req, res) => {
  try {
    const { token } = req.body;

    const verification = await req.prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification || verification.verified || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await req.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true }
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resend verification email
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await req.prisma.emailVerification.create({
      data: {
        userId: req.user.id,
        email: req.user.email,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    });

    res.json({
      message: 'Verification email sent',
      verificationToken, // Only for demo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
