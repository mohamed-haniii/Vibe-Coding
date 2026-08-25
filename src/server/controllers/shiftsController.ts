import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { emitRealtimeEvent } from '../socket';

const router = Router();

// GET current active shift for cashier
router.get('/current', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const activeShift = await db.get(
      `SELECT s.*, u.full_name as cashier_name 
       FROM shifts s 
       JOIN users u ON s.cashier_id = u.id 
       WHERE s.cashier_id = ? AND s.is_open = 1 
       ORDER BY s.id DESC LIMIT 1`,
      [req.user!.id]
    );

    if (!activeShift) {
      return res.json({ currentShift: null });
    }

    // Get breakdown count by visit type
    const newVisits = await db.get(
      'SELECT COUNT(*) as count FROM visits WHERE shift_id = ? AND visit_type_id = 1 AND status != "Cancelled"',
      [activeShift.id]
    );
    const followupVisits = await db.get(
      'SELECT COUNT(*) as count FROM visits WHERE shift_id = ? AND visit_type_id = 2 AND status != "Cancelled"',
      [activeShift.id]
    );
    const maintenanceVisits = await db.get(
      'SELECT COUNT(*) as count FROM visits WHERE shift_id = ? AND visit_type_id = 3 AND status != "Cancelled"',
      [activeShift.id]
    );

    return res.json({
      currentShift: {
        id: activeShift.id,
        cashierId: activeShift.cashier_id,
        cashierName: activeShift.cashier_name,
        startTime: activeShift.start_time,
        endTime: activeShift.end_time,
        isOpen: Boolean(activeShift.is_open),
        totalAmount: activeShift.total_amount,
        totalVisits: activeShift.total_visits,
        newVisitsCount: newVisits ? newVisits.count : 0,
        followupVisitsCount: followupVisits ? followupVisits.count : 0,
        maintenanceVisitsCount: maintenanceVisits ? maintenanceVisits.count : 0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع بيات الشيفت الحالي' });
  }
});

// POST open a new shift
router.post('/open', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();

    // Check if cashier already has an open shift
    const existing = await db.get(
      'SELECT id FROM shifts WHERE cashier_id = ? AND is_open = 1',
      [req.user!.id]
    );

    if (existing) {
      return res.status(400).json({ message: 'لديك شيفت مفتوح بالفعل حالياً' });
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO shifts (cashier_id, start_time, is_open, total_amount, total_visits)
       VALUES (?, ?, 1, 0, 0)`,
      [req.user!.id, now]
    );

    const shiftId = result.lastID;

    await logAudit(req.user!.id, 'OPEN_SHIFT', 'Shift', shiftId);

    emitRealtimeEvent('shift-opened', {
      shiftId,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      startTime: now
    });

    return res.status(201).json({
      id: shiftId,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      startTime: now,
      isOpen: true,
      totalAmount: 0,
      totalVisits: 0,
      newVisitsCount: 0,
      followupVisitsCount: 0,
      maintenanceVisitsCount: 0
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في فتح شيفت عمل جديد' });
  }
});

// PUT close current active shift
router.put('/close', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();

    const activeShift = await db.get(
      'SELECT * FROM shifts WHERE cashier_id = ? AND is_open = 1 ORDER BY id DESC LIMIT 1',
      [req.user!.id]
    );

    if (!activeShift) {
      return res.status(400).json({ message: 'لا يوجد شيفت مفتوح لإغلاقه' });
    }

    const now = new Date().toISOString();

    await db.run(
      'UPDATE shifts SET is_open = 0, end_time = ? WHERE id = ?',
      [now, activeShift.id]
    );

    await logAudit(req.user!.id, 'CLOSE_SHIFT', 'Shift', activeShift.id, {
      totalAmount: activeShift.total_amount,
      totalVisits: activeShift.total_visits
    });

    emitRealtimeEvent('shift-closed', {
      shiftId: activeShift.id,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      endTime: now,
      totalAmount: activeShift.total_amount,
      totalVisits: activeShift.total_visits
    });

    return res.json({
      message: 'تم إغلاق الشيفت بنجاح',
      shiftId: activeShift.id,
      endTime: now,
      summary: {
        totalAmount: activeShift.total_amount,
        totalVisits: activeShift.total_visits
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في إغلاق الشيفت' });
  }
});

// GET all shifts detailed report (ADMIN ONLY)
router.get('/all', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();

    const shifts = await db.all(
      `SELECT s.*, u.full_name as cashier_name 
       FROM shifts s
       JOIN users u ON s.cashier_id = u.id
       ORDER BY s.id DESC`
    );

    const detailedShifts = await Promise.all(shifts.map(async (s) => {
      const visitsRaw = await db.all(
        `SELECT v.id as visit_id, p.full_name as patient_name, vt.name as visit_type_name, v.price as amount, v.created_at
         FROM visits v
         JOIN patients p ON v.patient_id = p.id
         JOIN visit_types vt ON v.visit_type_id = vt.id
         WHERE v.shift_id = ? AND v.status != 'Cancelled'
         ORDER BY v.id DESC`,
        [s.id]
      );

      const visits = visitsRaw.map((v: any) => ({
        visitId: v.visit_id,
        patientName: v.patient_name || 'مريض غير معروف',
        visitTypeName: v.visit_type_name || 'كشف',
        amount: v.amount,
        createdAt: v.created_at
      }));

      const newCount = visits.filter((v: any) => v.visitTypeName === 'كشف جديد').length;
      const followupCount = visits.filter((v: any) => v.visitTypeName === 'إعادة').length;
      const maintenanceCount = visits.filter((v: any) => v.visitTypeName === 'نظام تثبيت' || v.visitTypeName?.includes('تثبيت')).length;

      return {
        shiftId: s.id,
        cashierId: s.cashier_id,
        cashierName: s.cashier_name,
        startTime: s.start_time,
        endTime: s.end_time,
        isOpen: Boolean(s.is_open),
        totalVisits: s.total_visits,
        totalRevenue: s.total_amount,
        newVisitsCount: newCount,
        followupVisitsCount: followupCount,
        maintenanceVisitsCount: maintenanceCount,
        visits
      };
    }));

    return res.json(detailedShifts);
  } catch (err: any) {
    console.error('Shifts all error:', err);
    return res.status(500).json({ message: 'فشل في تحميل تقارير الشيفتات' });
  }
});

export default router;
