import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isTokenBlacklisted } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Access token is missing or invalid.' } });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (isTokenBlacklisted(token)) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token has been revoked.' } });
      return;
    }

    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token.' } });
    return;
  }
};
