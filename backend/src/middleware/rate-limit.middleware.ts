import rateLimit from 'express-rate-limit';
import config from '../utils/config';

const skipRateLimiting = process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT_BYPASS !== 'true';

const rl = (cfg: { windowMs: number; max: number; message: string }) =>
  rateLimit({
    windowMs: cfg.windowMs,
    max: cfg.max,
    message: { error: { code: 'RATE_LIMITED', message: cfg.message } },
    standardHeaders: true,
    legacyHeaders: false,
  });

const skip = (req: any, res: any, next: any) => next();

const { rateLimit: rlc } = config;

export const loginRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.login, message: 'Too many login attempts. Please try again after 15 minutes.' });
export const registerRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.register, message: 'Too many registration attempts. Please try again after an hour.' });
export const verifyEmailRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.verifyEmail, message: 'Too many verification attempts. Please try again after 15 minutes.' });
export const resendVerificationRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.resendVerification, message: 'Too many verification emails requested. Please try again later.' });
export const passwordResetRequestRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.passwordResetRequest, message: 'Too many password reset requests. Please try again after 15 minutes.' });
export const passwordResetConfirmRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.passwordResetConfirm, message: 'Too many reset attempts. Please try again after 15 minutes.' });
export const oauthRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.oauth, message: 'Too many OAuth attempts. Please try again after 15 minutes.' });
export const twoFactorVerifyRateLimiter = skipRateLimiting ? skip : rl({ ...rlc.twoFactorVerify, message: 'Too many 2FA attempts. Please try again after 15 minutes.' });
