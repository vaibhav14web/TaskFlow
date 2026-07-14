import { Router } from 'express';
import {
  register,
  resendVerificationEmail,
  verifyEmail,
  login,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  googleLogin,
  googleAuthRedirect,
  googleAuthCallback,
  getCurrentUser,
  getAuthConfig,
  setup2FA,
  verify2FASetup,
  verify2FALogin,
  disable2FA
} from '../controllers/auth.controller';
import {
  loginRateLimiter,
  registerRateLimiter,
  verifyEmailRateLimiter,
  resendVerificationRateLimiter,
  passwordResetRequestRateLimiter,
  passwordResetConfirmRateLimiter,
  oauthRateLimiter,
  twoFactorVerifyRateLimiter
} from '../middleware/rate-limit.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/verify-email', verifyEmailRateLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationRateLimiter, resendVerificationEmail);
router.post('/login', loginRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/password-reset/request', passwordResetRequestRateLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetConfirmRateLimiter, confirmPasswordReset);
router.post('/oauth/google', oauthRateLimiter, googleLogin);
router.get('/oauth/google', oauthRateLimiter, googleAuthRedirect);
router.get('/oauth/google/callback', oauthRateLimiter, googleAuthCallback);
router.get('/me', requireAuth, getCurrentUser);
router.get('/config', getAuthConfig);

// 2FA Routes
router.post('/2fa/setup', requireAuth, setup2FA);
router.post('/2fa/verify-setup', requireAuth, verify2FASetup);
router.post('/2fa/login-verify', twoFactorVerifyRateLimiter, verify2FALogin);
router.post('/2fa/disable', requireAuth, disable2FA);


export default router;
