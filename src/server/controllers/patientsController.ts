import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { generateNextPatientCode } from '../services/codeGenerator';
import { logAudit } from '../services/auditService';
import { getSmartVisitPricing } from '../services/pricingService';

const router = Router();

// Search patients by code, name, or phone
router.get('/search', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    const db = await getDb();

    let sql = `SELECT * FROM patients`;
    let params: any[] = [];

    if (query) {
      sql += ` WHERE code LIKE ? OR full_name LIKE ? OR phone LIKE ?`;
      const term = `%${query}%`;
      params = [term, term, term];
    }

    sql += ` ORDER BY id DESC LIMIT 20`;

    const patients = await db.all(sql, params);

    // Fetch latest measurement and visit count for each patient
    const results = await Promise.all(patients.map(async (p) => {
      const lastMeasurement = await db.get(
        `SELECT pm.*, v.created_at as visit_date 
         FROM patient_measurements pm 
         JOIN visits v ON pm.visit_id = v.id 
         WHERE pm.patient_id = ? 
         ORDER BY pm.id DESC LIMIT 1`,
        [p.id]
      );

      const visitCount = await db.get(
        `SELECT COUNT(*) as count FROM visits WHERE patient_id = ? AND status != 'Cancelled'`,
        [p.id]
      );

      const activeVisit = await db.get(
        `SELECT v.id, v.queue_number, v.status, v.created_at, vt.name as visit_type_name
         FROM visits v
         JOIN visit_types vt ON v.visit_type_id = vt.id
         WHERE v.patient_id = ? AND v.status IN ('Waiting', 'InConsultation')
         LIMIT 1`,
        [p.id]
      );

      const smartPricing = await getSmartVisitPricing(p.id);

      return {
        id: p.id,
        code: p.code,
        fullName: p.full_name,
        phone: p.phone,
        gender: p.gender,
        dateOfBirth: p.date_of_birth,
        heightCm: p.height_cm,
        notes: p.notes,
        createdAt: p.created_at,
        totalVisits: visitCount ? visitCount.count : 0,
        smartPricing,
        activeVisit: activeVisit ? {
          id: activeVisit.id,
          queueNumber: activeVisit.queue_number,
          status: activeVisit.status,
          visitTypeName: activeVisit.visit_type_name,
          createdAt: activeVisit.created_at
        } : null,
        latestMeasurement: lastMeasurement ? {
          weightKg: lastMeasurement.weight_kg,
          heightCm: lastMeasurement.height_cm,
          bmi: lastMeasurement.bmi,
          fatPercentage: lastMeasurement.fat_percentage,
          musclePercentage: lastMeasurement.muscle_percentage,
          waterPercentage: lastMeasurement.water_percentage,
          boneMass: lastMeasurement.bone_mass,
          recordedAt: lastMeasurement.visit_date
        } : null
      };
    }));

    return res.json(results);
  } catch (err: any) {
    console.error('Search patients error:', err);
    return res.status(500).json({ message: 'خطأ أثناء البحث عن المرضى' });
  }
});

// Get patient details and full history
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const db = await getDb();

    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود' });
    }

    // Measurements history for weight and body composition progress chart
    const measurements = await db.all(
      `SELECT pm.*, v.created_at as visit_date, vt.name as visit_type_name
       FROM patient_measurements pm
       JOIN visits v ON pm.visit_id = v.id
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE pm.patient_id = ?
       ORDER BY pm.id ASC`,
      [patientId]
    );

    // Past visits list
    const visits = await db.all(
      `SELECT v.*, vt.name as visit_type_name, u.full_name as cashier_name
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       JOIN users u ON v.cashier_id = u.id
       WHERE v.patient_id = ?
       ORDER BY v.id DESC`,
      [patientId]
    );

    const smartPricing = await getSmartVisitPricing(patientId);

    return res.json({
      id: patient.id,
      code: patient.code,
      fullName: patient.full_name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.date_of_birth,
      heightCm: patient.height_cm,
      notes: patient.notes,
      createdAt: patient.created_at,
      smartPricing,
      measurementsHistory: measurements.map(m => ({
        id: m.id,
        visitId: m.visit_id,
        visitTypeName: m.visit_type_name,
        weightKg: m.weight_kg,
        heightCm: m.height_cm,
        bmi: m.bmi,
        fatPercentage: m.fat_percentage,
        musclePercentage: m.muscle_percentage,
        waterPercentage: m.water_percentage,
        boneMass: m.bone_mass,
        bloodPressure: m.blood_pressure,
        notes: m.notes,
        recordedAt: m.recorded_at
      })),
      visits: visits.map(v => ({
        id: v.id,
        visitTypeName: v.visit_type_name,
        price: v.price,
        status: v.status,
        paymentStatus: v.payment_status,
        paymentMethod: v.payment_method || 'Cash',
        doctorNotes: v.doctor_notes,
        cashierName: v.cashier_name,
        createdAt: v.created_at,
        completedAt: v.completed_at
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'حدث خطأ أثناء تحميل بيانات المريض' });
  }
});

// Update patient info / notes
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { fullName, phone, gender, dateOfBirth, heightCm, notes } = req.body;
    const db = await getDb();

    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود' });
    }

    await db.run(
      `UPDATE patients 
       SET full_name = ?, phone = ?, gender = ?, date_of_birth = ?, height_cm = ?, notes = ?
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : patient.full_name,
        phone ? phone.trim() : patient.phone,
        gender || patient.gender,
        dateOfBirth !== undefined ? dateOfBirth : patient.date_of_birth,
        heightCm !== undefined && heightCm !== null ? parseFloat(heightCm) : patient.height_cm,
        notes !== undefined ? notes : patient.notes,
        patientId
      ]
    );

    return res.json({ message: 'تم تحديث بيانات المريض بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تحديث بيانات المريض' });
  }
});

// Register new patient
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, gender, dateOfBirth, heightCm, notes } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'يرجى إدخال اسم المريض ورقم الهاتف' });
    }

    const code = await generateNextPatientCode();
    const db = await getDb();
    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO patients (code, full_name, phone, gender, date_of_birth, height_cm, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        fullName.trim(),
        phone.trim(),
        gender || 'أنثى',
        dateOfBirth || null,
        heightCm ? parseFloat(heightCm) : null,
        notes || null,
        now
      ]
    );

    const newPatientId = result.lastID;

    await logAudit(req.user!.id, 'CREATE_PATIENT', 'Patient', newPatientId, {
      code,
      fullName,
      phone
    });

    return res.status(201).json({
      id: newPatientId,
      code,
      fullName: fullName.trim(),
      phone: phone.trim(),
      gender: gender || 'أنثى',
      dateOfBirth,
      heightCm: heightCm ? parseFloat(heightCm) : null,
      notes,
      createdAt: now
    });
  } catch (err: any) {
    console.error('Create patient error:', err);
    return res.status(500).json({ message: 'فشل في إضافة المريض الجديد' });
  }
});

export default router;
