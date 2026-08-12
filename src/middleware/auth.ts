import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "antoniobellanova1812@gmail.com,belllanovaantonio1@gmail.com")
    .split(",").map(e => e.trim().toLowerCase());
}

function isAdminFromEmail(email: string | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const result = await db.select().from(users).where(eq(users.uid, req.user.uid)).limit(1);
      if (result.length === 0) {
        if (roles.includes("ADMIN") && isAdminFromEmail(req.user.email)) return next();
        return res.status(403).json({ error: 'Forbidden: User profile not found' });
      }

      const userData = result[0];
      if (!userData || !roles.includes(userData.role)) {
        if (roles.includes("ADMIN") && isAdminFromEmail(req.user.email)) return next();
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      if (roles.includes("ADMIN") && isAdminFromEmail(req.user.email)) return next();
      res.status(500).json({ error: 'Internal server error during role validation' });
    }
  };
};
