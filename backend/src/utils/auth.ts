import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import config from './config';
import logger from './logger';
import { cache } from './cache';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets must be set in environment variables (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)');
}

// Hashing Utilities
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Token Interfaces
export interface TokenPayload {
  userId: string;
  jti?: string;
}

// Token Generation
export const generateAccessToken = (userId: string): string => {
  const opts: SignOptions = { expiresIn: config.jwt.accessTokenTTL as any, jwtid: crypto.randomUUID() };
  return jwt.sign({ userId }, ACCESS_SECRET, opts);
};

export const generateRefreshToken = (userId: string): string => {
  const opts: SignOptions = { expiresIn: config.jwt.refreshTokenTTL as any, jwtid: crypto.randomUUID() };
  return jwt.sign({ userId }, REFRESH_SECRET, opts);
};

// Token Verification
export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};

// 2FA Login Ticket
export const generateLoginTicket = (userId: string): string => {
  return jwt.sign({ userId, isTwoFactorPending: true }, ACCESS_SECRET, { expiresIn: config.jwt.loginTicketTTL as any });
};

export const verifyLoginTicket = (token: string): { userId: string; isTwoFactorPending: boolean } => {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string; isTwoFactorPending: boolean };
};

// Token revocation. Redis makes revocation visible to every server instance.
const blacklistedTokens = new Set<string>();
const revokedTokenCacheKey = (jti: string) => `auth:revoked:${jti}`;

export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as TokenPayload & { exp?: number };
    if (decoded?.jti) {
      blacklistedTokens.add(decoded.jti);
      // Remove from set after token would have expired
      if (decoded.exp) {
        const ttl = decoded.exp * 1000 - Date.now();
        if (ttl > 0) {
          setTimeout(() => blacklistedTokens.delete(decoded.jti!), ttl);
        }
        await cache.set(revokedTokenCacheKey(decoded.jti), true, Math.max(1, Math.ceil(ttl / 1000)));
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to revoke token');
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    if (!decoded?.jti) return false;
    if (blacklistedTokens.has(decoded.jti)) return true;
    return Boolean(await cache.get<boolean>(revokedTokenCacheKey(decoded.jti)));
  } catch (err) {
    logger.warn({ err }, 'Failed to check token revocation');
    return false;
  }
};
