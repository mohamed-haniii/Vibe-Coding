import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { emitRealtimeEvent } from '../socket';

const router = Router();

// GET all diet plans
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const plans = await db.all('SELECT * FROM diet_plans ORDER BY id DESC');
    return res.json(plans.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    })));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تحميل الأنظمة الغذائية' });
  }
});

// POST create new diet plan
router.post('/', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'عنوان ومحتوى النظام الغذائي مطلوبان' });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.run(
      'INSERT INTO diet_plans (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [title.trim(), content.trim(), now, now]
    );

    await logAudit(req.user!.id, 'CREATE_DIET_PLAN', 'DietPlan', result.lastID, { title });
    emitRealtimeEvent('diet-plans-updated');

    return res.status(201).json({
      id: result.lastID,
      title: title.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حفظ النظام الغذائي' });
  }
});

// PUT update diet plan
router.put('/:id', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'عنوان ومحتوى النظام الغذائي مطلوبان' });
    }

    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      'UPDATE diet_plans SET title = ?, content = ?, updated_at = ? WHERE id = ?',
      [title.trim(), content.trim(), now, id]
    );

    await logAudit(req.user!.id, 'UPDATE_DIET_PLAN', 'DietPlan', id, { title });
    emitRealtimeEvent('diet-plans-updated');

    return res.json({ id, title: title.trim(), content: content.trim(), updatedAt: now });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تعديل النظام الغذائي' });
  }
});

// DELETE diet plan
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = await getDb();

    await db.run('DELETE FROM diet_plans WHERE id = ?', [id]);
    await logAudit(req.user!.id, 'DELETE_DIET_PLAN', 'DietPlan', id);
    emitRealtimeEvent('diet-plans-updated');

    return res.json({ message: 'تم حذف النظام الغذائي بنجاح', id });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حذف النظام الغذائي' });
  }
});

export default router;
