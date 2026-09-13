import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Strictly guard ALL report endpoints for Admin only!
router.use(authenticateToken, requireRole('Admin'));

// Monthly detailed financial report
router.get('/monthly', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const targetYear = parseInt(req.query.year as string || new Date().getFullYear().toString(), 10);
    const targetMonth = parseInt(req.query.month as string || (new Date().getMonth() + 1).toString(), 10);

    const monthStr = targetMonth.toString().padStart(2, '0');
    const yearMonth = `${targetYear}-${monthStr}`;

    // Total monthly visits & revenue
    const totalQuery = await db.get(
      `SELECT COUNT(*) as totalVisits, COALESCE(SUM(price), 0) as totalRevenue, COUNT(DISTINCT patient_id) as totalPatients
       FROM visits
       WHERE strftime('%Y-%m', created_at) = ? AND payment_status = 'Paid' AND status != 'Cancelled'
         AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0`,
      [yearMonth]
    );

    // Breakdown by Visit Type
    const visitTypesBreakdown = await db.all(
      `SELECT vt.id, vt.name, COUNT(v.id) as count, COALESCE(SUM(v.price), 0) as revenue
       FROM visit_types vt
       LEFT JOIN visits v ON vt.id = v.visit_type_id 
       AND strftime('%Y-%m', v.created_at) = ? AND v.payment_status = 'Paid' AND v.status != 'Cancelled'
       AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
       GROUP BY vt.id, vt.name`,
      [yearMonth]
    );

    const newVisits = visitTypesBreakdown.find(b => b.name === 'كشف جديد') || { count: 0, revenue: 0 };
    const followupVisits = visitTypesBreakdown.find(b => b.name === 'إعادة') || { count: 0, revenue: 0 };
    const maintenanceVisits = visitTypesBreakdown.find(b => b.name === 'نظام تثبيت') || { count: 0, revenue: 0 };

    // Daily breakdown for monthly chart
    const dailyData = await db.all(
      `SELECT date(created_at) as visit_date, COUNT(*) as dailyVisits, COALESCE(SUM(price), 0) as dailyRevenue
       FROM visits
       WHERE strftime('%Y-%m', created_at) = ? AND payment_status = 'Paid' AND status != 'Cancelled'
         AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0
       GROUP BY date(created_at)
       ORDER BY visit_date ASC`,
      [yearMonth]
    );

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const dailyBreakdown = dailyData.map(d => {
      const dateObj = new Date(d.visit_date);
      return {
        date: d.visit_date,
        dayName: dayNames[dateObj.getDay()],
        totalVisits: d.dailyVisits,
        revenue: d.dailyRevenue
      };
    });

    return res.json({
      year: targetYear,
      month: targetMonth,
      totalRevenue: totalQuery.totalRevenue,
      totalVisitsCount: totalQuery.totalVisits,
      totalPatientsCount: totalQuery.totalPatients,
      newVisitsRevenue: newVisits.revenue,
      newVisitsCount: newVisits.count,
      followupVisitsRevenue: followupVisits.revenue,
      followupVisitsCount: followupVisits.count,
      maintenanceVisitsRevenue: maintenanceVisits.revenue,
      maintenanceVisitsCount: maintenanceVisits.count,
      dailyBreakdown,
      visitTypeDistribution: visitTypesBreakdown.map(b => ({
        name: b.name,
        count: b.count,
        revenue: b.revenue
      }))
    });
  } catch (err: any) {
    console.error('Monthly report error:', err);
    return res.status(500).json({ message: 'حدث خطأ أثناء إعداد التقرير الشهري' });
  }
});

// Clinic Overview Statistics (Today, This Week, This Month)
router.get('/statistics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const todayStr = new Date().toISOString().split('T')[0];

    // Today
    const todayStats = await db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
       FROM visits WHERE date(created_at) = date(?) AND payment_status = 'Paid' AND status != 'Cancelled'`,
      [todayStr]
    );

    // This Month
    const monthStr = todayStr.substring(0, 7); // YYYY-MM
    const monthStats = await db.get(
      `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue
       FROM visits WHERE strftime('%Y-%m', created_at) = ? AND payment_status = 'Paid' AND status != 'Cancelled'`,
      [monthStr]
    );

    // Total Patients Count
    const totalPatients = await db.get('SELECT COUNT(*) as count FROM patients');

    return res.json({
      today: {
        visitsCount: todayStats ? todayStats.count : 0,
        revenue: todayStats ? todayStats.revenue : 0
      },
      thisMonth: {
        visitsCount: monthStats ? monthStats.count : 0,
        revenue: monthStats ? monthStats.revenue : 0
      },
      totalPatientsCount: totalPatients ? totalPatients.count : 0
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع الإحصائيات' });
  }
});

// Daily detailed financial & operational report
router.get('/daily', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const dateStr = (req.query.date as string || new Date().toISOString().split('T')[0]).trim();

    // Summary query
    const summary = await db.get(
      `SELECT 
         COUNT(*) as totalVisitsCount,
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedVisitsCount,
         SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelledVisitsCount,
         SUM(CASE WHEN status IN ('Waiting', 'InConsultation') THEN 1 ELSE 0 END) as waitingVisitsCount,
         COALESCE(SUM(CASE WHEN payment_status = 'Paid' AND status != 'Cancelled' THEN price ELSE 0 END), 0) as totalRevenue,
         COALESCE(SUM(CASE WHEN payment_status = 'Paid' AND status != 'Cancelled' AND (payment_method = 'Cash' OR payment_method IS NULL OR payment_method = 'كاش') THEN price ELSE 0 END), 0) as cashRevenue,
         COALESCE(SUM(CASE WHEN payment_status = 'Paid' AND status != 'Cancelled' AND (payment_method = 'InstaPay' OR payment_method = 'انستا باي') THEN price ELSE 0 END), 0) as instapayRevenue
       FROM visits
       WHERE date(created_at) = date(?)
         AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0`,
      [dateStr]
    );

    // Breakdown by visit type
    const visitTypesBreakdown = await db.all(
      `SELECT vt.name, 
              COUNT(v.id) as count, 
              COALESCE(SUM(CASE WHEN v.payment_status = 'Paid' AND v.status != 'Cancelled' THEN v.price ELSE 0 END), 0) as revenue
       FROM visit_types vt
       LEFT JOIN visits v ON vt.id = v.visit_type_id AND date(v.created_at) = date(?)
         AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
       GROUP BY vt.id, vt.name`,
      [dateStr]
    );

    const newVisits = visitTypesBreakdown.find(b => b.name === 'كشف جديد') || { count: 0, revenue: 0 };
    const followupVisits = visitTypesBreakdown.find(b => b.name === 'إعادة') || { count: 0, revenue: 0 };
    const maintenanceVisits = visitTypesBreakdown.find(b => b.name === 'نظام تثبيت') || { count: 0, revenue: 0 };

    // Detailed visits list for that day (strictly excludes historical archives)
    const visits = await db.all(
      `SELECT v.id, p.full_name as patientName, p.code as patientCode, p.phone as patientPhone,
              vt.name as visitTypeName, v.price, v.payment_status as paymentStatus,
              v.payment_method as paymentMethod, v.status, u.full_name as cashierName, v.created_at as createdAt
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN visit_types vt ON v.visit_type_id = vt.id
       JOIN users u ON v.cashier_id = u.id
       WHERE date(v.created_at) = date(?)
         AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
       ORDER BY v.queue_number ASC`,
      [dateStr]
    );

    // Drawer transactions for that day
    const drawerTransactionsRaw = await db.all(
      `SELECT dt.*, u.full_name as cashier_name
       FROM drawer_transactions dt
       JOIN users u ON dt.cashier_id = u.id
       WHERE date(dt.created_at) = date(?)
       ORDER BY dt.id DESC`,
      [dateStr]
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

    const cashRevenue = summary ? summary.cashRevenue : 0;
    const netDrawerCash = cashRevenue + totalCashIn - totalExpenses;

    // Shifts active on this day with their specific visits, revenues and expenses
    const dayShiftsRaw = await db.all(
      `SELECT s.*, u.full_name as cashier_name
       FROM shifts s
       JOIN users u ON s.cashier_id = u.id
       WHERE date(s.start_time) = date(?) 
          OR (s.end_time IS NOT NULL AND date(s.end_time) = date(?))
          OR s.id IN (SELECT DISTINCT shift_id FROM visits WHERE date(created_at) = date(?))
          OR s.id IN (SELECT DISTINCT shift_id FROM drawer_transactions WHERE date(created_at) = date(?))
       ORDER BY s.id ASC`,
      [dateStr, dateStr, dateStr, dateStr]
    );

    const dayShifts = await Promise.all(dayShiftsRaw.map(async (s) => {
      const shiftVisitsRaw = await db.all(
        `SELECT v.id, p.full_name as patient_name, vt.name as visit_type_name, v.price as amount, v.payment_method, v.created_at
         FROM visits v
         JOIN patients p ON v.patient_id = p.id
         JOIN visit_types vt ON v.visit_type_id = vt.id
         WHERE v.shift_id = ? AND v.status != 'Cancelled'
           AND (v.is_archive = 0 OR v.is_archive IS NULL) AND v.idempotency_key NOT LIKE 'HIST-%' AND v.queue_number > 0
         ORDER BY v.id DESC`,
        [s.id]
      );

      const shiftTxRaw = await db.all(
        `SELECT dt.*, u.full_name as cashier_name
         FROM drawer_transactions dt
         JOIN users u ON dt.cashier_id = u.id
         WHERE dt.shift_id = ?
         ORDER BY dt.id DESC`,
        [s.id]
      );

      const shiftDrawerTransactions = shiftTxRaw.map((dt: any) => ({
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

      const shiftTotalCashIn = shiftDrawerTransactions
        .filter((t: any) => t.type === 'CashIn')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const shiftTotalExpenses = shiftDrawerTransactions
        .filter((t: any) => t.type === 'Expense')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const shiftVisits = shiftVisitsRaw.map((v: any) => ({
        visitId: v.id,
        patientName: v.patient_name || 'مريض غير معروف',
        visitTypeName: v.visit_type_name || 'كشف',
        amount: v.amount,
        paymentMethod: v.payment_method || 'Cash',
        createdAt: v.created_at
      }));

      const shiftRevenue = shiftVisits.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const shiftCashRevenue = shiftVisits
        .filter((v: any) => v.paymentMethod === 'Cash' || !v.paymentMethod || v.paymentMethod === 'كاش')
        .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);
      const shiftInstapayRevenue = shiftVisits
        .filter((v: any) => v.paymentMethod === 'InstaPay' || v.paymentMethod === 'انستا باي')
        .reduce((sum: number, v: any) => sum + (v.amount || 0), 0);

      const shiftNetDrawer = shiftCashRevenue + shiftTotalCashIn - shiftTotalExpenses;

      const newCount = shiftVisits.filter((v: any) => v.visitTypeName === 'كشف جديد').length;
      const followupCount = shiftVisits.filter((v: any) => v.visitTypeName === 'إعادة').length;
      const maintenanceCount = shiftVisits.filter((v: any) => v.visitTypeName === 'نظام تثبيت' || v.visitTypeName?.includes('تثبيت')).length;

      return {
        shiftId: s.id,
        cashierId: s.cashier_id,
        cashierName: s.cashier_name,
        startTime: s.start_time,
        endTime: s.end_time,
        isOpen: Boolean(s.is_open),
        totalVisits: shiftVisits.length,
        totalRevenue: shiftRevenue,
        cashRevenue: shiftCashRevenue,
        instapayRevenue: shiftInstapayRevenue,
        totalCashIn: shiftTotalCashIn,
        totalExpenses: shiftTotalExpenses,
        netDrawerCash: shiftNetDrawer,
        newVisitsCount: newCount,
        followupVisitsCount: followupCount,
        maintenanceVisitsCount: maintenanceCount,
        drawerTransactions: shiftDrawerTransactions,
        visits: shiftVisits
      };
    }));

    return res.json({
      date: dateStr,
      totalVisitsCount: summary ? summary.totalVisitsCount : 0,
      completedVisitsCount: summary ? summary.completedVisitsCount : 0,
      cancelledVisitsCount: summary ? summary.cancelledVisitsCount : 0,
      waitingVisitsCount: summary ? summary.waitingVisitsCount : 0,
      totalRevenue: summary ? summary.totalRevenue : 0,
      cashRevenue,
      instapayRevenue: summary ? summary.instapayRevenue : 0,
      totalExpenses,
      totalCashIn,
      netDrawerCash,
      newVisitsCount: newVisits.count,
      newVisitsRevenue: newVisits.revenue,
      followupVisitsCount: followupVisits.count,
      followupVisitsRevenue: followupVisits.revenue,
      maintenanceVisitsCount: maintenanceVisits.count,
      maintenanceVisitsRevenue: maintenanceVisits.revenue,
      shifts: dayShifts,
      drawerTransactions,
      visits: visits.map(v => ({
        id: v.id,
        patientName: v.patientName,
        patientCode: v.patientCode,
        patientPhone: v.patientPhone,
        visitTypeName: v.visitTypeName,
        price: v.price,
        paymentStatus: v.paymentStatus,
        paymentMethod: v.paymentMethod || 'Cash',
        status: v.status,
        cashierName: v.cashierName,
        createdAt: v.createdAt
      }))
    });
  } catch (err: any) {
    console.error('Daily report error:', err);
    return res.status(500).json({ message: 'حدث خطأ أثناء تحميل التقرير اليومي' });
  }
});

export default router;
