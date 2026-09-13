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

    // Re-verify actual visits directly from the database with payment method breakdown
    const visitStats = await db.get(
      `SELECT 
         COUNT(*) as total_visits,
         COALESCE(SUM(price), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN payment_method = 'Cash' OR payment_method IS NULL OR payment_method = 'كاش' THEN price ELSE 0 END), 0) as cash_revenue,
         COALESCE(SUM(CASE WHEN payment_method = 'InstaPay' OR payment_method = 'انستا باي' THEN price ELSE 0 END), 0) as instapay_revenue
       FROM visits 
       WHERE shift_id = ? AND payment_status = 'Paid' AND status != 'Cancelled'
         AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0`,
      [activeShift.id]
    );

    const totalRevenue = visitStats ? (visitStats.total_revenue || 0) : 0;
    const cashRevenue = visitStats ? (visitStats.cash_revenue || 0) : 0;
    const instapayRevenue = visitStats ? (visitStats.instapay_revenue || 0) : 0;
    const totalVisits = visitStats ? (visitStats.total_visits || 0) : 0;

    // Get breakdown count by visit type dynamically
    const visitTypesCounts = await db.all(
      `SELECT vt.name, COUNT(v.id) as count
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.shift_id = ? AND v.status != 'Cancelled'
         AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
       GROUP BY vt.name`,
      [activeShift.id]
    );

    const newVisitsCount = visitTypesCounts.find((vt: any) => vt.name === 'كشف جديد')?.count || 0;
    const followupVisitsCount = visitTypesCounts.find((vt: any) => vt.name === 'إعادة')?.count || 0;
    const maintenanceVisitsCount = visitTypesCounts.find((vt: any) => vt.name === 'نظام تثبيت' || vt.name?.includes('تثبيت'))?.count || 0;

    // Get drawer transactions (Expenses & Cash In)
    const drawerTransactionsRaw = await db.all(
      `SELECT dt.*, u.full_name as cashier_name 
       FROM drawer_transactions dt
       JOIN users u ON dt.cashier_id = u.id
       WHERE dt.shift_id = ?
       ORDER BY dt.id DESC`,
      [activeShift.id]
    );

    const drawerTransactions = drawerTransactionsRaw.map((dt: any) => ({
      id: dt.id,
      shiftId: dt.shift_id,
      cashierId: dt.cashier_id,
      cashierName: dt.cashier_name,
      type: dt.type,
      amount: dt.amount,
      category: dt.category || '',
      notes: dt.notes,
      createdAt: dt.created_at
    }));

    const totalCashIn = drawerTransactions
      .filter((t: any) => t.type === 'CashIn')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const totalExpenses = drawerTransactions
      .filter((t: any) => t.type === 'Expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    // Cash drawer balance: Actual Cash from Visits + Cash In - Expenses
    const netDrawerCash = cashRevenue + totalCashIn - totalExpenses;

    return res.json({
      currentShift: {
        id: activeShift.id,
        cashierId: activeShift.cashier_id,
        cashierName: activeShift.cashier_name,
        startTime: activeShift.start_time,
        endTime: activeShift.end_time,
        isOpen: Boolean(activeShift.is_open),
        totalAmount: totalRevenue,
        cashRevenue,
        instapayRevenue,
        totalVisits,
        newVisitsCount,
        followupVisitsCount,
        maintenanceVisitsCount,
        totalCashIn,
        totalExpenses,
        netDrawerCash,
        drawerTransactions
      }
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع بيانات الشيفت الحالي' });
  }
});

// POST add a drawer transaction (Expense / Cash Out or Cash In)
router.post('/drawer-transaction', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, amount, category, notes } = req.body;
    const numAmount = parseFloat(amount);

    if (!type || !['Expense', 'CashIn'].includes(type)) {
      return res.status(400).json({ message: 'نوع الحركة غير صحيح (يجب أن يكون مصروف أو إيداع)' });
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'يرجى كتابة مبلغ صحيح أكبر من الصفر' });
    }

    if (!notes || !notes.trim()) {
      return res.status(400).json({ message: 'التعليق / بيان سبب الحركة إجباري لكل حركة خروج أو دخول نقدية' });
    }

    const db = await getDb();

    // Check if cashier has an open shift
    const activeShift = await db.get(
      'SELECT * FROM shifts WHERE cashier_id = ? AND is_open = 1 ORDER BY id DESC LIMIT 1',
      [req.user!.id]
    );

    if (!activeShift) {
      return res.status(400).json({ message: 'يجب فتح شيفت كاشير أولاً لتسجيل حركات الدرج والمصاريف' });
    }

    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO drawer_transactions (shift_id, cashier_id, type, amount, category, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [activeShift.id, req.user!.id, type, numAmount, category ? category.trim() : '', notes.trim(), now]
    );

    const transactionId = result.lastID;

    await logAudit(req.user!.id, type === 'Expense' ? 'DRAWER_EXPENSE' : 'DRAWER_CASH_IN', 'DrawerTransaction', transactionId, {
      shiftId: activeShift.id,
      amount: numAmount,
      category,
      notes: notes.trim()
    });

    const transactionData = {
      id: transactionId,
      shiftId: activeShift.id,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      type,
      amount: numAmount,
      category: category ? category.trim() : '',
      notes: notes.trim(),
      createdAt: now
    };

    emitRealtimeEvent('drawer-transaction-updated', transactionData);

    return res.status(201).json({
      message: type === 'Expense' ? 'تم تسجيل سحب المصروف من الدرج بنجاح' : 'تم تسجيل إيداع النقدية في الدرج بنجاح',
      transaction: transactionData
    });
  } catch (err: any) {
    console.error('Drawer transaction error:', err);
    return res.status(500).json({ message: 'فشل في تسجيل حركة الدرج' });
  }
});

// DELETE a drawer transaction
router.delete('/drawer-transaction/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactionId = parseInt(req.params.id, 10);
    const db = await getDb();

    const transaction = await db.get('SELECT * FROM drawer_transactions WHERE id = ?', [transactionId]);
    if (!transaction) {
      return res.status(404).json({ message: 'حركة الدرج غير موجودة' });
    }

    // Only allow if cashier is the creator in an open shift, or user is Admin
    if (req.user!.role !== 'Admin' && transaction.cashier_id !== req.user!.id) {
      return res.status(403).json({ message: 'غير مصرح لك بإلغاء هذه الحركة' });
    }

    await db.run('DELETE FROM drawer_transactions WHERE id = ?', [transactionId]);

    await logAudit(req.user!.id, 'DELETE_DRAWER_TRANSACTION', 'DrawerTransaction', transactionId, {
      amount: transaction.amount,
      type: transaction.type,
      notes: transaction.notes
    });

    emitRealtimeEvent('drawer-transaction-updated', { deletedId: transactionId, shiftId: transaction.shift_id });

    return res.json({ message: 'تم مسح الحركة بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في إلغاء حركة الدرج' });
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

    // Mathematically re-verify accurate totals from actual paid non-cancelled visits
    const visitStats = await db.get(
      `SELECT COUNT(*) as visit_count, COALESCE(SUM(price), 0) as total_price
       FROM visits
       WHERE shift_id = ? AND payment_status = 'Paid' AND status != 'Cancelled'
         AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0`,
      [activeShift.id]
    );
    const finalAmount = visitStats ? (visitStats.total_price || 0) : 0;
    const finalVisits = visitStats ? (visitStats.visit_count || 0) : 0;

    await db.run(
      'UPDATE shifts SET is_open = 0, end_time = ?, total_amount = ?, total_visits = ? WHERE id = ?',
      [now, finalAmount, finalVisits, activeShift.id]
    );

    await logAudit(req.user!.id, 'CLOSE_SHIFT', 'Shift', activeShift.id, {
      totalAmount: finalAmount,
      totalVisits: finalVisits
    });

    emitRealtimeEvent('shift-closed', {
      shiftId: activeShift.id,
      cashierId: req.user!.id,
      cashierName: req.user!.fullName,
      endTime: now,
      totalAmount: finalAmount,
      totalVisits: finalVisits
    });

    return res.json({
      message: 'تم إغلاق الشيفت بنجاح',
      shiftId: activeShift.id,
      endTime: now,
      summary: {
        totalAmount: finalAmount,
        totalVisits: finalVisits
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
        `SELECT v.id as visit_id, p.full_name as patient_name, vt.name as visit_type_name, v.price as amount, v.payment_method, v.created_at
         FROM visits v
         JOIN patients p ON v.patient_id = p.id
         JOIN visit_types vt ON v.visit_type_id = vt.id
         WHERE v.shift_id = ? AND v.status != 'Cancelled'
           AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
         ORDER BY v.id DESC`,
        [s.id]
      );

      const drawerTxRaw = await db.all(
        `SELECT dt.*, u.full_name as cashier_name
         FROM drawer_transactions dt
         JOIN users u ON dt.cashier_id = u.id
         WHERE dt.shift_id = ?
         ORDER BY dt.id DESC`,
        [s.id]
      );

      const drawerTransactions = drawerTxRaw.map((dt: any) => ({
        id: dt.id,
        shiftId: dt.shift_id,
        cashierId: dt.cashier_id,
        cashierName: dt.cashier_name,
        type: dt.type,
        amount: dt.amount,
        category: dt.category || '',
        notes: dt.notes,
        createdAt: dt.created_at
      }));

      const totalCashIn = drawerTransactions
        .filter((t: any) => t.type === 'CashIn')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const totalExpenses = drawerTransactions
        .filter((t: any) => t.type === 'Expense')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const visits = visitsRaw.map((v: any) => ({
        visitId: v.visit_id,
        patientName: v.patient_name || 'مريض غير معروف',
        visitTypeName: v.visit_type_name || 'كشف',
        amount: v.amount,
        paymentMethod: v.payment_method || 'Cash',
        createdAt: v.created_at
      }));

      const totalRevenue = visits.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const cashRevenue = visits
        .filter((v: any) => v.paymentMethod === 'Cash' || !v.paymentMethod || v.paymentMethod === 'كاش')
        .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const instapayRevenue = visits
        .filter((v: any) => v.paymentMethod === 'InstaPay' || v.paymentMethod === 'انستا باي')
        .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);

      const netDrawerCash = cashRevenue + totalCashIn - totalExpenses;

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
        totalVisits: visits.length,
        totalRevenue,
        cashRevenue,
        instapayRevenue,
        totalCashIn,
        totalExpenses,
        netDrawerCash,
        newVisitsCount: newCount,
        followupVisitsCount: followupCount,
        maintenanceVisitsCount: maintenanceCount,
        drawerTransactions,
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
