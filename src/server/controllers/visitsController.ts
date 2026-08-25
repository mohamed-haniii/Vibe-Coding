import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { getOfficialVisitPrice, getSmartVisitPricing } from '../services/pricingService';
import { logAudit } from '../services/auditService';
import { emitRealtimeEvent } from '../socket';

const router = Router();

// GET smart visit pricing recommendation for a patient
router.get('/smart-pricing/:patientId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    const requestedVisitTypeId = req.query.visitTypeId ? parseInt(req.query.visitTypeId as string, 10) : undefined;
    
    if (isNaN(patientId)) {
      return res.status(400).json({ message: 'معرف المريض غير صحيح' });
    }

    const smartPricing = await getSmartVisitPricing(patientId, requestedVisitTypeId);
    return res.json(smartPricing);
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حساب تسعير الزيارة الذكي' });
  }
});

// GET visit types and official prices
router.get('/types', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const types = await db.all('SELECT * FROM visit_types WHERE is_active = 1 ORDER BY id ASC');
    return res.json(types.map(t => ({
      id: t.id,
      name: t.name,
      price: Number(t.price), // Server official price
      description: t.description,
      isActive: Boolean(t.is_active)
    })));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع أنواع الزيارات' });
  }
});

// POST register new visit (Atomic Transaction + Idempotency Check)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      patientId, 
      visitTypeId, 
      weightKg, 
      heightCm, 
      fatPercentage, 
      musclePercentage, 
      waterPercentage, 
      boneMass, 
      paymentMethod, 
      idempotencyKey 
    } = req.body;

    if (!patientId || !visitTypeId || !weightKg || !idempotencyKey) {
      return res.status(400).json({ message: 'جميع البيانات مطلوبة (المريض، نوع الزيارة، الوزن، ومفتاح العملية)' });
    }

    const db = await getDb();
    const effectivePaymentMethod = paymentMethod || 'Cash';

    // 1. Check if Cashier has an active shift
    const activeShift = await db.get(
      'SELECT id FROM shifts WHERE cashier_id = ? AND is_open = 1 ORDER BY id DESC LIMIT 1',
      [req.user!.id]
    );

    if (!activeShift) {
      return res.status(400).json({ message: 'يجب فتح شيفت عمل جديد أولاً قبل تسجيل أي زيارة' });
    }

    // 1.5 Prevent duplicate payment / active queue entry for the same patient
    const activeVisit = await db.get(
      `SELECT v.id, v.status, v.queue_number, vt.name as visit_type_name 
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.patient_id = ? AND v.status IN ('Waiting', 'InConsultation')`,
      [patientId]
    );

    if (activeVisit) {
      const statusLabel = activeVisit.status === 'Waiting' ? 'في الانتظار' : 'في غرفة الكشف مع الطبيبة';
      return res.status(400).json({
        message: `تم إلغاء عملية الدفع! المريض موجود بالفعل في النظام حالياً (${activeVisit.visit_type_name} - دور رقم #${activeVisit.queue_number} - حالة: ${statusLabel}). لا يمكن تحصيل رسوم لنفس الزيارة مرتين.`
      });
    }

    // 1.6 Check if patient was paid/registered in the last 10 minutes to prevent double-charging accidents
    const recentPaidVisit = await db.get(
      `SELECT v.id, v.queue_number, v.created_at, vt.name as visit_type_name
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.patient_id = ? AND datetime(v.created_at) >= datetime('now', '-10 minutes')`,
      [patientId]
    );

    if (recentPaidVisit) {
      return res.status(400).json({
        message: `تنبيه: تم تسجيل دفع وزيارة للمريض قبل أقل من 10 دقائق (كشف رقم #${recentPaidVisit.queue_number}). يرجى التأكد من عدم تكرار الخصم من المريض.`
      });
    }

    // 2. Idempotency Check: Return existing visit if idempotencyKey was already processed
    const existingVisit = await db.get(
      `SELECT v.*, p.full_name as patient_name, p.code as patient_code, vt.name as visit_type_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.idempotency_key = ?`,
      [idempotencyKey]
    );

    if (existingVisit) {
      return res.json({
        message: 'تم تسجيل هذه الزيارة سابقاً (عملية مكررة)',
        isDuplicate: true,
        visit: existingVisit
      });
    }

    // 3. Strictly calculate official smart price based on patient visit history & rules
    const smartCalculation = await getSmartVisitPricing(parseInt(patientId, 10), parseInt(visitTypeId, 10));
    const officialPrice = smartCalculation.finalPrice;
    const effectiveVisitTypeId = smartCalculation.recommendedVisitTypeId;

    // Get patient info
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود' });
    }

    const effectiveHeightCm = heightCm ? parseFloat(heightCm) : (patient.height_cm || null);
    const weight = parseFloat(weightKg);
    const fat = fatPercentage ? parseFloat(fatPercentage) : null;
    const muscle = musclePercentage ? parseFloat(musclePercentage) : null;
    const water = waterPercentage ? parseFloat(waterPercentage) : null;
    const bone = boneMass ? parseFloat(boneMass) : null;

    // Calculate BMI if height exists
    let bmi: number | null = null;
    if (effectiveHeightCm && effectiveHeightCm > 0) {
      const heightM = effectiveHeightCm / 100;
      bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
    }

    // Preload persistent notes from patient record if available
    const doctorNotes = patient.notes || null;

    // 4. ATOMIC SQLite TRANSACTION
    await db.exec('BEGIN IMMEDIATE TRANSACTION;');

    try {
      // Re-verify inside atomic lock to prevent concurrent double-click race condition
      const concurrentCheck = await db.get(
        `SELECT id, queue_number FROM visits 
         WHERE patient_id = ? AND status IN ('Waiting', 'InConsultation')`,
        [patientId]
      );

      if (concurrentCheck) {
        try { await db.exec('ROLLBACK;'); } catch (_) {}
        return res.status(400).json({
          message: `تم منع محاولة الدفع المزدوجة! المريض مسجل بالفعل بدور رقم (#${concurrentCheck.queue_number}).`
        });
      }

      const now = new Date().toISOString();
      const todayDate = now.split('T')[0];

      // Calculate queue number for today
      const queueCount = await db.get(
        `SELECT COUNT(*) as count FROM visits WHERE date(created_at) = date(?)`,
        [todayDate]
      );
      const queueNumber = (queueCount ? queueCount.count : 0) + 1;

      // Insert Visit
      const visitResult = await db.run(
        `INSERT INTO visits (
          idempotency_key, patient_id, visit_type_id, price, status, 
          payment_status, payment_method, queue_number, cashier_id, shift_id, doctor_notes, created_at
        ) VALUES (?, ?, ?, ?, 'Waiting', 'Paid', ?, ?, ?, ?, ?, ?)`,
        [
          idempotencyKey,
          patientId,
          effectiveVisitTypeId,
          officialPrice,
          effectivePaymentMethod,
          queueNumber,
          req.user!.id,
          activeShift.id,
          doctorNotes,
          now
        ]
      );

      const visitId = visitResult.lastID;

      // Insert Measurement with full body composition metrics
      await db.run(
        `INSERT INTO patient_measurements (
          visit_id, patient_id, weight_kg, height_cm, bmi, 
          fat_percentage, muscle_percentage, water_percentage, bone_mass, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [visitId, patientId, weight, effectiveHeightCm, bmi, fat, muscle, water, bone, now]
      );

      // Insert Payment
      await db.run(
        `INSERT INTO payments (visit_id, amount, payment_method, status, cashier_id, shift_id, created_at)
         VALUES (?, ?, ?, 'Successful', ?, ?, ?)`,
        [visitId, officialPrice, effectivePaymentMethod, req.user!.id, activeShift.id, now]
      );

      // Update Shift total amount and total visits
      await db.run(
        `UPDATE shifts 
         SET total_amount = total_amount + ?, total_visits = total_visits + 1 
         WHERE id = ?`,
        [officialPrice, activeShift.id]
      );

      // Update patient height if provided
      if (effectiveHeightCm && !patient.height_cm) {
        await db.run(`UPDATE patients SET height_cm = ? WHERE id = ?`, [effectiveHeightCm, patientId]);
      }

      // Safe lookup for visit type name before commit
      const vtRow = await db.get('SELECT name FROM visit_types WHERE id = ?', [visitTypeId]);
      const visitTypeName = vtRow?.name || 'كشف';

      await db.exec('COMMIT;');

      // Fetch previous measurement to compute weight delta
      const previousMeasurement = await db.get(
        `SELECT pm.* FROM patient_measurements pm
         JOIN visits v ON pm.visit_id = v.id
         WHERE pm.patient_id = ? AND pm.visit_id < ?
         ORDER BY pm.id DESC LIMIT 1`,
        [patientId, visitId]
      );

      const weightChangeDelta = previousMeasurement 
        ? parseFloat((weight - previousMeasurement.weight_kg).toFixed(1)) 
        : undefined;

      // Audit Log
      try {
        await logAudit(req.user!.id, 'CREATE_VISIT_AND_PAYMENT', 'Visit', visitId, {
          patientId,
          patientName: patient.full_name,
          price: officialPrice,
          paymentMethod: effectivePaymentMethod,
          queueNumber,
          shiftId: activeShift.id
        });
      } catch (auditErr) {
        console.error('Audit log warning:', auditErr);
      }

      const visitDto = {
        id: visitId,
        idempotencyKey,
        patientId: patient.id,
        patientCode: patient.code,
        patientName: patient.full_name,
        patientPhone: patient.phone,
        visitTypeId,
        visitTypeName,
        price: officialPrice,
        status: 'Waiting',
        paymentStatus: 'Paid',
        paymentMethod: effectivePaymentMethod,
        queueNumber,
        cashierId: req.user!.id,
        cashierName: req.user!.fullName,
        shiftId: activeShift.id,
        doctorNotes,
        createdAt: now,
        currentMeasurement: {
          id: visitId,
          visitId,
          patientId,
          weightKg: weight,
          heightCm: effectiveHeightCm,
          bmi,
          fatPercentage: fat,
          musclePercentage: muscle,
          waterPercentage: water,
          boneMass: bone,
          recordedAt: now
        },
        previousMeasurement: previousMeasurement ? {
          id: previousMeasurement.id,
          visitId: previousMeasurement.visit_id,
          patientId: previousMeasurement.patient_id,
          weightKg: previousMeasurement.weight_kg,
          heightCm: previousMeasurement.height_cm,
          bmi: previousMeasurement.bmi,
          fatPercentage: previousMeasurement.fat_percentage,
          musclePercentage: previousMeasurement.muscle_percentage,
          waterPercentage: previousMeasurement.water_percentage,
          boneMass: previousMeasurement.bone_mass,
          recordedAt: previousMeasurement.recorded_at
        } : undefined,
        weightChangeDelta
      };

      // Broadcast Socket.IO event to Doctor & Reception screens
      emitRealtimeEvent('new-visit-in-queue', visitDto);

      return res.status(201).json(visitDto);

    } catch (txnError: any) {
      try {
        await db.exec('ROLLBACK;');
      } catch (_) {
        // Transaction may have auto-rolled back or committed
      }
      throw txnError;
    }
  } catch (err: any) {
    console.error('Register visit error:', err);
    return res.status(500).json({ message: err.message || 'حدث خطأ أثناء تسجيل الزيارة والدفع' });
  }
});

// GET active queue for Doctor's screen
router.get('/queue', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const todayDate = new Date().toISOString().split('T')[0];

    const visits = await db.all(
      `SELECT v.*, p.code as patient_code, p.full_name as patient_name, p.phone as patient_phone,
              vt.name as visit_type_name, u.full_name as cashier_name
       FROM visits v
       JOIN patients p ON v.patient_id = p.id
       JOIN visit_types vt ON v.visit_type_id = vt.id
       JOIN users u ON v.cashier_id = u.id
       WHERE date(v.created_at) = date(?) AND v.status IN ('Waiting', 'InConsultation')
       ORDER BY v.queue_number ASC`,
      [todayDate]
    );

    const fullVisits = await Promise.all(visits.map(async (v) => {
      // Get current visit measurement
      const currentPm = await db.get(
        'SELECT * FROM patient_measurements WHERE visit_id = ?',
        [v.id]
      );

      // Get previous visit measurement
      const prevPm = await db.get(
        `SELECT pm.* FROM patient_measurements pm
         JOIN visits past_v ON pm.visit_id = past_v.id
         WHERE pm.patient_id = ? AND pm.visit_id < ?
         ORDER BY pm.id DESC LIMIT 1`,
        [v.patient_id, v.id]
      );

      const weightChangeDelta = (currentPm && prevPm)
        ? parseFloat((currentPm.weight_kg - prevPm.weight_kg).toFixed(1))
        : undefined;

      return {
        id: v.id,
        idempotencyKey: v.idempotency_key,
        patientId: v.patient_id,
        patientCode: v.patient_code,
        patientName: v.patient_name,
        patientPhone: v.patient_phone,
        visitTypeId: v.visit_type_id,
        visitTypeName: v.visit_type_name,
        price: v.price,
        status: v.status,
        paymentStatus: v.payment_status,
        paymentMethod: v.payment_method || 'Cash',
        queueNumber: v.queue_number,
        cashierId: v.cashier_id,
        cashierName: v.cashier_name,
        shiftId: v.shift_id,
        doctorNotes: v.doctor_notes,
        createdAt: v.created_at,
        currentMeasurement: currentPm ? {
          id: currentPm.id,
          visitId: currentPm.visit_id,
          patientId: currentPm.patient_id,
          weightKg: currentPm.weight_kg,
          heightCm: currentPm.height_cm,
          bmi: currentPm.bmi,
          fatPercentage: currentPm.fat_percentage,
          musclePercentage: currentPm.muscle_percentage,
          waterPercentage: currentPm.water_percentage,
          boneMass: currentPm.bone_mass,
          recordedAt: currentPm.recorded_at
        } : undefined,
        previousMeasurement: prevPm ? {
          id: prevPm.id,
          visitId: prevPm.visit_id,
          patientId: prevPm.patient_id,
          weightKg: prevPm.weight_kg,
          heightCm: prevPm.height_cm,
          bmi: prevPm.bmi,
          fatPercentage: prevPm.fat_percentage,
          musclePercentage: prevPm.muscle_percentage,
          waterPercentage: prevPm.water_percentage,
          boneMass: prevPm.bone_mass,
          recordedAt: prevPm.recorded_at
        } : undefined,
        weightChangeDelta
      };
    }));

    return res.json(fullVisits);
  } catch (err: any) {
    console.error('Queue error:', err);
    return res.status(500).json({ message: 'فشل في تحميل قائمة الانتظار' });
  }
});

// Update measurements for a visit (allowed for both Doctor and Assistant)
router.put('/:id/measurement', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    const { weightKg, heightCm, fatPercentage, musclePercentage, waterPercentage, boneMass, bloodPressure, notes } = req.body;
    const db = await getDb();

    const visit = await db.get('SELECT * FROM visits WHERE id = ?', [visitId]);
    if (!visit) {
      return res.status(404).json({ message: 'الزيارة غير موجودة' });
    }

    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [visit.patient_id]);
    const weight = parseFloat(weightKg);
    const effectiveHeightCm = heightCm ? parseFloat(heightCm) : (patient?.height_cm || null);
    const fat = fatPercentage !== undefined && fatPercentage !== null && fatPercentage !== '' ? parseFloat(fatPercentage) : null;
    const muscle = musclePercentage !== undefined && musclePercentage !== null && musclePercentage !== '' ? parseFloat(musclePercentage) : null;
    const water = waterPercentage !== undefined && waterPercentage !== null && waterPercentage !== '' ? parseFloat(waterPercentage) : null;
    const bone = boneMass !== undefined && boneMass !== null && boneMass !== '' ? parseFloat(boneMass) : null;

    let bmi: number | null = null;
    if (effectiveHeightCm && effectiveHeightCm > 0 && weight > 0) {
      const heightM = effectiveHeightCm / 100;
      bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
    }

    const existingPm = await db.get('SELECT id FROM patient_measurements WHERE visit_id = ?', [visitId]);
    const now = new Date().toISOString();

    if (existingPm) {
      await db.run(
        `UPDATE patient_measurements
         SET weight_kg = ?, height_cm = ?, bmi = ?, fat_percentage = ?, muscle_percentage = ?, water_percentage = ?, bone_mass = ?, blood_pressure = ?, notes = ?
         WHERE id = ?`,
        [weight, effectiveHeightCm, bmi, fat, muscle, water, bone, bloodPressure || null, notes || null, existingPm.id]
      );
    } else {
      await db.run(
        `INSERT INTO patient_measurements (visit_id, patient_id, weight_kg, height_cm, bmi, fat_percentage, muscle_percentage, water_percentage, bone_mass, blood_pressure, notes, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [visitId, visit.patient_id, weight, effectiveHeightCm, bmi, fat, muscle, water, bone, bloodPressure || null, notes || null, now]
      );
    }

    if (effectiveHeightCm && patient && !patient.height_cm) {
      await db.run('UPDATE patients SET height_cm = ? WHERE id = ?', [effectiveHeightCm, visit.patient_id]);
    }

    emitRealtimeEvent('new-visit-in-queue', { refresh: true });

    return res.json({ message: 'تم تحديث قياسات الزيارة ونسب الجسم بنجاح' });
  } catch (err: any) {
    console.error('Update measurement error:', err);
    return res.status(500).json({ message: 'فشل في تحديث قياسات الزيارة' });
  }
});

// Doctor starts consultation
router.put('/:id/start-consultation', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    const db = await getDb();

    await db.run('UPDATE visits SET status = "InConsultation" WHERE id = ?', [visitId]);

    await logAudit(req.user!.id, 'START_CONSULTATION', 'Visit', visitId);

    emitRealtimeEvent('visit-status-changed', { visitId, status: 'InConsultation' });

    return res.json({ message: 'تم بدء الكشف للمريض', visitId, status: 'InConsultation' });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تغيير حالة الكشف' });
  }
});

// Doctor completes consultation
router.put('/:id/complete', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    const { doctorNotes } = req.body;
    const db = await getDb();
    const now = new Date().toISOString();

    const visit = await db.get(
      `SELECT v.*, p.full_name as patient_name, p.id as patient_id FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = ?`,
      [visitId]
    );

    if (!visit) {
      return res.status(404).json({ message: 'الزيارة غير موجودة' });
    }

    await db.run(
      `UPDATE visits 
       SET status = "Completed", completed_by_doctor_id = ?, doctor_notes = ?, completed_at = ? 
       WHERE id = ?`,
      [req.user!.id, doctorNotes || null, now, visitId]
    );

    // Save/Sync persistent notes to patients table so they carry over to subsequent visits
    if (doctorNotes !== undefined && doctorNotes !== null) {
      await db.run(`UPDATE patients SET notes = ? WHERE id = ?`, [doctorNotes, visit.patient_id]);
    }

    await logAudit(req.user!.id, 'COMPLETE_CONSULTATION', 'Visit', visitId, { doctorNotes });

    // Send notification to cashier (WITHOUT medical notes)
    emitRealtimeEvent('consultation-completed', {
      visitId,
      patientName: visit.patient_name,
      completedAt: now
    });

    emitRealtimeEvent('visit-status-changed', { visitId, status: 'Completed' });

    return res.json({
      message: 'تم إغلاق الكشف بنجاح',
      visitId,
      status: 'Completed',
      completedAt: now
    });
  } catch (err: any) {
    console.error('Complete consultation error:', err);
    return res.status(500).json({ message: 'فشل في إغلاق الكشف' });
  }
});

// Doctor or Cashier cancels/removes a visit from the waiting queue
router.put('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitId = parseInt(req.params.id, 10);
    const db = await getDb();

    const visit = await db.get(
      `SELECT v.*, p.full_name as patient_name FROM visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = ?`,
      [visitId]
    );

    if (!visit) {
      return res.status(404).json({ message: 'الزيارة غير موجودة' });
    }

    if (visit.status === 'Cancelled') {
      return res.status(400).json({ message: 'الزيارة ملغاة بالفعل' });
    }

    if (visit.status === 'Completed') {
      return res.status(400).json({ message: 'لا يمكن إغلاق أو إلغاء زيارة مكتملة بالفعل' });
    }

    await db.exec('BEGIN IMMEDIATE TRANSACTION;');

    try {
      // Mark visit as Cancelled and payment_status as Unpaid
      await db.run('UPDATE visits SET status = "Cancelled", payment_status = "Unpaid" WHERE id = ?', [visitId]);

      // Update payment record to NotSuccessful
      await db.run('UPDATE payments SET status = "NotSuccessful" WHERE visit_id = ?', [visitId]);

      // Deduct from shift total if visit was paid and in shift
      if ((visit.payment_status === 'Paid' || visit.payment_status === 'Pending') && visit.shift_id) {
        await db.run(
          `UPDATE shifts 
           SET total_amount = MAX(0, total_amount - ?), total_visits = MAX(0, total_visits - 1) 
           WHERE id = ?`,
          [visit.price, visit.shift_id]
        );
      }

      await db.exec('COMMIT;');

      await logAudit(req.user!.id, 'CANCEL_VISIT_FROM_QUEUE', 'Visit', visitId, {
        patientName: visit.patient_name,
        queueNumber: visit.queue_number,
        price: visit.price
      });

      emitRealtimeEvent('visit-status-changed', { visitId, status: 'Cancelled' });
      emitRealtimeEvent('new-visit-in-queue', { refresh: true });

      return res.json({
        message: `تم إلغاء وحذف المريض ${visit.patient_name} من قائمة الانتظار بنجاح`,
        visitId,
        status: 'Cancelled'
      });
    } catch (txnErr) {
      try { await db.exec('ROLLBACK;'); } catch (_) {}
      throw txnErr;
    }
  } catch (err: any) {
    console.error('Cancel visit error:', err);
    return res.status(500).json({ message: 'فشل في إلغاء الزيارة من قائمة الانتظار' });
  }
});

export default router;
