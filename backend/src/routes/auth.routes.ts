import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  googleLogin,
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
  passwordResetRequestRateLimiter,
  passwordResetConfirmRateLimiter,
  oauthRateLimiter,
  twoFactorVerifyRateLimiter
} from '../middleware/rate-limit.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerRateLimiter, register);
router.post('/verify-email', verifyEmailRateLimiter, verifyEmail);
router.post('/login', loginRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/password-reset/request', passwordResetRequestRateLimiter, requestPasswordReset);
router.post('/password-reset/confirm', passwordResetConfirmRateLimiter, confirmPasswordReset);
router.post('/oauth/google', oauthRateLimiter, googleLogin);
router.get('/me', requireAuth, getCurrentUser);
router.get('/config', getAuthConfig);

// 2FA Routes
router.post('/2fa/setup', requireAuth, setup2FA);
router.post('/2fa/verify-setup', requireAuth, verify2FASetup);
router.post('/2fa/login-verify', twoFactorVerifyRateLimiter, verify2FALogin);
router.post('/2fa/disable', requireAuth, disable2FA);


export default router;
