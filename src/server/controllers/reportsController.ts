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
       WHERE strftime('%Y-%m', created_at) = ? AND payment_status = 'Paid' AND status != 'Cancelled'`,
      [yearMonth]
    );

    // Breakdown by Visit Type
    const visitTypesBreakdown = await db.all(
      `SELECT vt.id, vt.name, COUNT(v.id) as count, COALESCE(SUM(v.price), 0) as revenue
       FROM visit_types vt
       LEFT JOIN visits v ON vt.id = v.visit_type_id 
       AND strftime('%Y-%m', v.created_at) = ? AND v.payment_status = 'Paid' AND v.status != 'Cancelled'
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
       WHERE date(created_at) = date(?)`,
      [dateStr]
    );

    // Breakdown by visit type
    const visitTypesBreakdown = await db.all(
      `SELECT vt.name, 
              COUNT(v.id) as count, 
              COALESCE(SUM(CASE WHEN v.payment_status = 'Paid' AND v.status != 'Cancelled' THEN v.price ELSE 0 END), 0) as revenue
       FROM visit_types vt
       LEFT JOIN visits v ON vt.id = v.visit_type_id AND date(v.created_at) = date(?)
       GROUP BY vt.id, vt.name`,
      [dateStr]
    );

    const newVisits = visitTypesBreakdown.find(b => b.name === 'كشف جديد') || { count: 0, revenue: 0 };
    const followupVisits = visitTypesBreakdown.find(b => b.name === 'إعادة') || { count: 0, revenue: 0 };
    const maintenanceVisits = visitTypesBreakdown.find(b => b.name === 'نظام تثبيت') || { count: 0, revenue: 0 };

    // Detailed visits list for that day
    const visits = await db.all(
      `SELECT v.id, p.full_name as patientName, p.code as patientCode, p.phone as patientPhone,
              vt.name as visitTypeName, v.price, v.payment_status as paymentStatus,
              v.payment_method as paymentMethod, v.status, u.full_name as cashierName, v.created_at as createdAt
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN visit_types vt ON v.visit_type_id = vt.id
       JOIN users u ON v.cashier_id = u.id
       WHERE date(v.created_at) = date(?)
       ORDER BY v.queue_number ASC`,
      [dateStr]
    );

    return res.json({
      date: dateStr,
      totalVisitsCount: summary ? summary.totalVisitsCount : 0,
      completedVisitsCount: summary ? summary.completedVisitsCount : 0,
      cancelledVisitsCount: summary ? summary.cancelledVisitsCount : 0,
      waitingVisitsCount: summary ? summary.waitingVisitsCount : 0,
      totalRevenue: summary ? summary.totalRevenue : 0,
      cashRevenue: summary ? summary.cashRevenue : 0,
      instapayRevenue: summary ? summary.instapayRevenue : 0,
      newVisitsCount: newVisits.count,
      newVisitsRevenue: newVisits.revenue,
      followupVisitsCount: followupVisits.count,
      followupVisitsRevenue: followupVisits.revenue,
      maintenanceVisitsCount: maintenanceVisits.count,
      maintenanceVisitsRevenue: maintenanceVisits.revenue,
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
