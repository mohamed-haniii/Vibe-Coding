import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'clinic_secret_key_2026_super_secure';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    fullName: string;
    role: UserRole;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'رمز الجلسة انتهت صلاحيته أو غير صالح' });
  }
}

export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'غير مصرح: يلزم تسجيل الدخول' });
    }

    if (!rolesArray.includes(req.user.role)) {
      // Strictly enforce 403 for Assistant trying to access Admin endpoints
      return res.status(403).json({ 
        message: 'غير مسموح: ليس لديك الصلاحية المطلوبة للوصول إلى هذه البيانات',
        requiredRole: rolesArray,
        currentRole: req.user.role
      });
    }

    next();
  };
}
