import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { JWT_SECRET, AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username.trim()]);

    if (!user) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'هذا الحساب معطل حالياً. يرجى مراجعة إدارة العيادة' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // Update last login
    const now = new Date().toISOString();
    await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [now, user.id]);

    // Generate token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    // Check if user has an active shift
    const activeShift = await db.get(
      'SELECT * FROM shifts WHERE cashier_id = ? AND is_open = 1 ORDER BY id DESC LIMIT 1',
      [user.id]
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
        lastLoginAt: now
      },
      currentShift: activeShift ? {
        id: activeShift.id,
        cashierId: activeShift.cashier_id,
        cashierName: user.full_name,
        startTime: activeShift.start_time,
        endTime: activeShift.end_time,
        isOpen: Boolean(activeShift.is_open),
        totalAmount: activeShift.total_amount,
        totalVisits: activeShift.total_visits
      } : null
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تسجيل الدخول' });
  }
});

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT id, username, full_name, role, is_active, created_at, last_login_at FROM users WHERE id = ?', [req.user!.id]);

    if (!user || !user.is_active) {
      return res.status(403).json({ message: 'الحساب غير متاح' });
    }

    const activeShift = await db.get(
      'SELECT * FROM shifts WHERE cashier_id = ? AND is_open = 1 ORDER BY id DESC LIMIT 1',
      [user.id]
    );

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      },
      currentShift: activeShift ? {
        id: activeShift.id,
        cashierId: activeShift.cashier_id,
        cashierName: user.full_name,
        startTime: activeShift.start_time,
        endTime: activeShift.end_time,
        isOpen: Boolean(activeShift.is_open),
        totalAmount: activeShift.total_amount,
        totalVisits: activeShift.total_visits
      } : null
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع بيانات الحساب' });
  }
});

export default router;
