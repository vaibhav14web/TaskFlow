import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../utils/prisma';
import { generateSecret, verifyTOTP } from '../utils/totp';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { blacklistToken, isTokenBlacklisted } from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import config from '../utils/config';
import logger from '../utils/logger';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateLoginTicket,
  verifyLoginTicket
} from '../utils/auth';

const getGoogleRedirectUri = (): string =>
  process.env.GOOGLE_OAUTH_REDIRECT_URI || 'https://taskflow-j39g.onrender.com/api/v1/auth/oauth/google/callback';

// Helper: Validate email format
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 1. Register User
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required.' } });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email format.' } });
      return;
    }

    if (password.length < config.auth.minPasswordLength) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Password must be at least ${config.auth.minPasswordLength} characters long.` } });
      return;
    }

    // Check conflict
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Email is already registered.' } });
      return;
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(config.auth.verificationTokenBytes).toString('hex');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        verificationToken
      }
    });

    const delivered = await sendVerificationEmail(email, verificationToken);
    if (!delivered) {
      // Do not create an account that cannot be used because verification mail failed.
      await prisma.user.delete({ where: { id: user.id } });
      res.status(503).json({ error: { code: 'EMAIL_DELIVERY_FAILED', message: 'We could not send a verification email. Please try again later.' } });
      return;
    }

    res.status(201).json({
      data: {
        message: 'Registration successful. Please verify your email.',
        ...(process.env.NODE_ENV !== 'production' && { verificationToken }),
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Resend a verification link without disclosing whether an account exists.
export const resendVerificationEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A valid email address is required.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      const verificationToken = crypto.randomBytes(config.auth.verificationTokenBytes).toString('hex');
      await prisma.user.update({ where: { id: user.id }, data: { verificationToken } });

      const delivered = await sendVerificationEmail(user.email, verificationToken);
      if (!delivered) {
        res.status(503).json({ error: { code: 'EMAIL_DELIVERY_FAILED', message: 'We could not send a verification email. Please try again later.' } });
        return;
      }
    }

    res.status(200).json({ data: { message: 'If an unverified account exists for this email, a verification link has been sent.' } });
  } catch (error) {
    next(error);
  }
};

// 2. Verify Email
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verification token is required.' } });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Invalid or expired verification token.' } });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    res.status(200).json({
      data: {
        message: 'Email verified successfully. You can now log in.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Login User
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' } });
      return;
    }

    if (password.length < config.auth.minPasswordLength) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Password must be at least ${config.auth.minPasswordLength} characters long.` } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } });
      return;
    }

    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } });
      return;
    }

    // Check email verification
    if (!user.emailVerified) {
      res.status(403).json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before logging in.', resendAvailable: true } });
      return;
    }

    if (user.twoFactorEnabled) {
      const loginTicket = generateLoginTicket(user.id);
      res.status(200).json({
        data: {
          twoFactorRequired: true,
          loginTicket
        }
      });
      return;
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatarUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Refresh Tokens
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required.' } });
      return;
    }

    // Reject blacklisted refresh tokens (e.g. tokens invalidated via logout)
    if (await isTokenBlacklisted(refresh_token)) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Refresh token has been revoked.' } });
      return;
    }

    try {
      const payload = verifyRefreshToken(refresh_token);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });

      if (!user) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found.' } });
        return;
      }

      // Blacklist the old refresh token (token rotation — each refresh token is single-use)
      await blacklistToken(refresh_token);

      const newAccessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      res.status(200).json({
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken
        }
      });
    } catch (err) {
      logger.warn({ err }, 'Refresh token verification failed');
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token.' } });
    }
  } catch (error) {
    next(error);
  }
};

// 5. Logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Blacklist the access token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await blacklistToken(token);
    }
    // Also blacklist the refresh token so it can't be used to mint new access tokens
    const { refresh_token } = req.body ?? {};
    if (refresh_token && typeof refresh_token === 'string') {
      await blacklistToken(refresh_token);
    }
    res.status(200).json({
      data: {
        message: 'Logged out successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Request Password Reset
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email is required.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Security best practice: don't reveal if user exists
    if (!user) {
      res.status(200).json({
        data: {
          message: 'If the email exists, a password reset link has been sent.'
        }
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + config.auth.resetTokenExpiryMs);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      data: {
        message: 'If the email exists, a password reset link has been sent.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 7. Confirm Password Reset
export const confirmPasswordReset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Token and new password are required.' } });
      return;
    }

    if (new_password.length < config.auth.minPasswordLength) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Password must be at least ${config.auth.minPasswordLength} characters long.` } });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or expired password reset token.' } });
      return;
    }

    const passwordHash = await hashPassword(new_password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.status(200).json({
      data: {
        message: 'Password reset successfully. You can now log in with your new password.'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 8. Google OAuth Login (ID Token verification - popup mode)
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'OAuth id_token is required.' } });
      return;
    }

    if (typeof token !== 'string') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'OAuth id_token must be a string.' } });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      res.status(501).json({
        error: {
          code: 'GOOGLE_AUTH_CONFIG_ERROR',
          message: 'Google OAuth configuration is missing on the server. Please check environment configuration.'
        }
      });
      return;
    }

    // Verify ID token using google-auth-library
    const authClient = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await authClient.verifyIdToken({
        idToken: token
      });
    } catch (err) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid Google OAuth token.' } });
      return;
    }
    const payload = ticket.getPayload();

    if (!payload) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid Google OAuth token.' } });
      return;
    }

    if (payload.aud !== clientId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Google token audience mismatch.' } });
      return;
    }

    const { email, name, picture } = payload;

    if (!email) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email not provided by Google account.' } });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user without local password since they use Google login
      const dummyPasswordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          passwordHash: dummyPasswordHash,
          avatarUrl: picture,
          emailVerified: true // OAuth automatically verifies email
        }
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatarUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 8b. Google OAuth Redirect (Authorization Code Flow)
export const googleAuthRedirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getGoogleRedirectUri();
    const scope = 'openid email profile';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

    res.redirect(authUrl);
  } catch (error) {
    next(error);
  }
};

// 8c. Google OAuth Callback (Authorization Code Flow)
export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, error: oauthError } = req.query;
    const rawFrontendUrl = process.env.FRONTEND_URL || 'https://task-flow-five-pearl.vercel.app';
    const frontendUrl = rawFrontendUrl.replace(/\/$/, '');

    if (oauthError) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(oauthError as string)}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Missing authorization code')}`);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_ClIENT_SECRET;
    const redirectUri = getGoogleRedirectUri();

    if (!clientId || !clientSecret) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Google OAuth not configured')}`);
      return;
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json() as { id_token?: string; access_token?: string; error?: string; error_description?: string };

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Failed to exchange authorization code')}`);
      return;
    }

    const { id_token } = tokenData;

    if (!id_token) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('No ID token received from Google')}`);
      return;
    }

    // Verify ID token
    const authClient = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await authClient.verifyIdToken({ idToken: id_token });
    } catch (err) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Invalid ID token from Google')}`);
      return;
    }

    const payload = ticket.getPayload();
    if (!payload || payload.aud !== clientId) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Token validation failed')}`);
      return;
    }

    const { email, name, picture } = payload;

    if (!email) {
      res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent('Email not provided by Google')}`);
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const dummyPasswordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          passwordHash: dummyPasswordHash,
          avatarUrl: picture,
          emailVerified: true
        }
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Redirect to frontend with tokens in URL fragment (secure)
    const redirectUrl = `${frontendUrl}/auth/callback/google#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&user_id=${encodeURIComponent(user.id)}&user_name=${encodeURIComponent(user.name)}&user_email=${encodeURIComponent(user.email)}&user_avatar=${encodeURIComponent(user.avatarUrl || '')}`;
    res.redirect(redirectUrl);
  } catch (error) {
    next(error);
  }
};

// 9. Get Current User Profile
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        twoFactorEnabled: true
      }
    });
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }
    res.status(200).json({
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// 10. Get Auth Config
export const getAuthConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const googleKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes('GOOGLE'));
    res.status(200).json({
      data: {
        googleClientId: process.env.GOOGLE_CLIENT_ID || null,
        googleClientSecretExists: Boolean(process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_ClIENT_SECRET),
        googleRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || null,
        detectedGoogleKeys: googleKeys
      }
    });
  } catch (error) {
    next(error);
  }
};

// 11. Setup 2FA
export const setup2FA = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    if (user.twoFactorEnabled) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Two-factor authentication is already enabled.' } });
      return;
    }

    const secret = generateSecret();
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorTempSecret: secret }
    });

    const otpauthUrl = `otpauth://totp/TaskFlow:${user.email}?secret=${secret}&issuer=TaskFlow`;

    res.status(200).json({
      data: {
        secret,
        otpauthUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// 12. Verify 2FA Setup
export const verify2FASetup = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    if (!code || code.length !== 6) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'A 6-digit verification code is required.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found.' } });
      return;
    }

    if (!user.twoFactorTempSecret) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Two-factor authentication setup has not been initiated.' } });
      return;
    }

    const isValid = verifyTOTP(code, user.twoFactorTempSecret);
    if (!isValid) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid code. Verification failed.' } });
      return;
    }

    // Generate 5 backup codes
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];
    for (let i = 0; i < config.auth.backupCodeCount; i++) {
      const plainCode = crypto.randomBytes(config.auth.backupCodeBytes).toString('hex');
      backupCodes.push(plainCode);
      const hashed = await hashPassword(plainCode);
      hashedBackupCodes.push(hashed);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorTempSecret,
        twoFactorTempSecret: null,
        twoFactorBackupCodes: hashedBackupCodes.join(',')
      }
    });

    res.status(200).json({
      data: {
        message: 'Two-factor authentication enabled successfully.',
        backupCodes
      }
    });
  } catch (error) {
    next(error);
  }
};

// 13. Verify 2FA Login
export const verify2FALogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, loginTicket } = req.body;

    if (!code || !loginTicket) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verification code and login ticket are required.' } });
      return;
    }

    let payload;
    try {
      payload = verifyLoginTicket(loginTicket);
    } catch (err) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired login ticket.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Two-factor authentication is not active for this account.' } });
      return;
    }

    let isCodeValid = verifyTOTP(code, user.twoFactorSecret);
    let usedBackupCode = false;

    // Check backup codes if TOTP fails
    if (!isCodeValid && user.twoFactorBackupCodes) {
      const hashedCodes = user.twoFactorBackupCodes.split(',');
      for (let i = 0; i < hashedCodes.length; i++) {
        const isMatch = await comparePassword(code, hashedCodes[i]);
        if (isMatch) {
          isCodeValid = true;
          usedBackupCode = true;
          // Remove the used backup code
          hashedCodes.splice(i, 1);
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorBackupCodes: hashedCodes.length > 0 ? hashedCodes.join(',') : null }
          });
          break;
        }
      }
    }

    if (!isCodeValid) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid verification code.' } });
      return;
    }

    // Success, issue real tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(200).json({
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatarUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 14. Disable 2FA
export const disable2FA = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { code } = req.body;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    if (!code) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verification code is required to disable 2FA.' } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Two-factor authentication is not active.' } });
      return;
    }

    const isValid = verifyTOTP(code, user.twoFactorSecret);
    if (!isValid) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid verification code.' } });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorTempSecret: null,
        twoFactorBackupCodes: null
      }
    });

    res.status(200).json({
      data: {
        message: 'Two-factor authentication disabled successfully.'
      }
    });
  } catch (error) {
    next(error);
  }
};
