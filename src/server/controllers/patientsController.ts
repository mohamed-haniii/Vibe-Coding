import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { generateNextPatientCode } from '../services/codeGenerator';
import { logAudit } from '../services/auditService';
import { getSmartVisitPricing } from '../services/pricingService';

const router = Router();

// Helper to auto-save operation to catalog
async function autoSaveOperation(db: any, opName: string) {
  if (!opName || !opName.trim()) return;
  const trimmed = opName.trim();
  try {
    const existing = await db.get('SELECT id FROM saved_operations WHERE name = ?', [trimmed]);
    if (!existing) {
      await db.run('INSERT INTO saved_operations (name, created_at) VALUES (?, ?)', [trimmed, new Date().toISOString()]);
    }
  } catch (_) {}
}

// Helper to auto-save medication to catalog
async function autoSaveMedication(db: any, medName: string) {
  if (!medName || !medName.trim()) return;
  const trimmed = medName.trim();
  try {
    const existing = await db.get('SELECT id FROM saved_medications WHERE name = ?', [trimmed]);
    if (!existing) {
      await db.run('INSERT INTO saved_medications (name, created_at) VALUES (?, ?)', [trimmed, new Date().toISOString()]);
    }
  } catch (_) {}
}

// GET Catalogs for Operations and Medications
router.get('/catalogs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const operations = await db.all('SELECT name FROM saved_operations ORDER BY id ASC');
    const medications = await db.all('SELECT name FROM saved_medications ORDER BY id ASC');

    return res.json({
      operations: operations.map(o => o.name),
      medications: medications.map(m => m.name)
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع كتالوج العمليات والأدوية' });
  }
});

// GET Operations Catalog
router.get('/catalogs/operations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const operations = await db.all('SELECT name FROM saved_operations ORDER BY id ASC');
    return res.json(operations.map(o => o.name));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع كتالوج العمليات' });
  }
});

// GET Medications Catalog
router.get('/catalogs/medications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const medications = await db.all('SELECT name FROM saved_medications ORDER BY id ASC');
    return res.json(medications.map(m => m.name));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع كتالوج الأدوية' });
  }
});

// POST Add new operation to catalog
router.post('/catalogs/operations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'يرجى إدخال اسم العملية' });
    }
    const db = await getDb();
    await autoSaveOperation(db, name.trim());
    return res.status(201).json({ message: 'تم حفظ العملية في الكتالوج بنجاح', name: name.trim() });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حفظ العملية' });
  }
});

// POST Add new medication to catalog
router.post('/catalogs/medications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'يرجى إدخال اسم الدواء' });
    }
    const db = await getDb();
    await autoSaveMedication(db, name.trim());
    return res.status(201).json({ message: 'تم حفظ الدواء في الكتالوج بنجاح', name: name.trim() });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حفظ الدواء' });
  }
});

// GET Complete Patients Directory with advanced search, sorting, stats and filters
router.get('/directory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const searchField = (req.query.searchField as string || 'all');
    const gender = req.query.gender as string;
    const filter = req.query.filter as string;
    const sortBy = (req.query.sortBy as string || 'newest');
    const db = await getDb();

    let sql = `SELECT * FROM patients WHERE 1=1`;
    const params: any[] = [];

    if (q) {
      const term = `%${q}%`;
      if (searchField === 'name') {
        sql += ` AND full_name LIKE ?`;
        params.push(term);
      } else if (searchField === 'phone') {
        sql += ` AND phone LIKE ?`;
        params.push(term);
      } else if (searchField === 'code') {
        sql += ` AND code LIKE ?`;
        params.push(term);
      } else if (searchField === 'medical') {
        sql += ` AND (chief_complaints LIKE ? OR operations_history LIKE ? OR medications_history LIKE ?)`;
        params.push(term, term, term);
      } else if (searchField === 'notes') {
        sql += ` AND notes LIKE ?`;
        params.push(term);
      } else {
        // all
        sql += ` AND (code LIKE ? OR full_name LIKE ? OR phone LIKE ? OR chief_complaints LIKE ? OR operations_history LIKE ? OR medications_history LIKE ? OR notes LIKE ?)`;
        params.push(term, term, term, term, term, term, term);
      }
    }

    if (gender && gender !== 'all' && gender !== 'الكل') {
      const g = (gender === 'female' || gender === 'أنثى') ? 'أنثى' : 'ذكر';
      sql += ` AND gender = ?`;
      params.push(g);
    }

    if (filter === 'operations') {
      sql += ` AND has_operations = 1`;
    } else if (filter === 'medications') {
      sql += ` AND takes_medications = 1`;
    } else if (filter === 'pregnant_lactating') {
      sql += ` AND (is_pregnant = 1 OR is_lactating = 1)`;
    }

    // Base sort for patient query
    if (sortBy === 'oldest') {
      sql += ` ORDER BY id ASC`;
    } else if (sortBy === 'name_asc') {
      sql += ` ORDER BY full_name ASC`;
    } else if (sortBy === 'name_desc') {
      sql += ` ORDER BY full_name DESC`;
    } else if (sortBy === 'code_asc') {
      sql += ` ORDER BY code ASC`;
    } else {
      sql += ` ORDER BY id DESC`;
    }

    const rawPatients = await db.all(sql, params);

    // If no patients found, compute summary stats and return early
    const totalPatientsCount = await db.get(`SELECT COUNT(*) as count FROM patients`);
    const femaleCount = await db.get(`SELECT COUNT(*) as count FROM patients WHERE gender = 'أنثى'`);
    const maleCount = await db.get(`SELECT COUNT(*) as count FROM patients WHERE gender = 'ذكر'`);
    const totalVisitsCount = await db.get(`SELECT COUNT(*) as count FROM visits WHERE status != 'Cancelled'`);
    const queuedTodayCount = await db.get(`SELECT COUNT(*) as count FROM visits WHERE status IN ('Waiting', 'InConsultation')`);

    if (rawPatients.length === 0) {
      return res.json({
        patients: [],
        stats: {
          totalPatients: totalPatientsCount?.count || 0,
          femalePatients: femaleCount?.count || 0,
          malePatients: maleCount?.count || 0,
          totalVisits: totalVisitsCount?.count || 0,
          queuedToday: queuedTodayCount?.count || 0
        }
      });
    }

    // High performance batched lookups (O(1) queries instead of O(N * 5))
    const activeVisitsList = await db.all(
      `SELECT v.id, v.patient_id, v.queue_number, v.status, v.created_at, vt.name as visit_type_name
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.status IN ('Waiting', 'InConsultation')`
    );
    const activeVisitMap = new Map<number, any>();
    for (const av of activeVisitsList) {
      activeVisitMap.set(av.patient_id, av);
    }

    const visitCountsList = await db.all(
      `SELECT patient_id, COUNT(*) as count FROM visits WHERE status != 'Cancelled' GROUP BY patient_id`
    );
    const visitCountMap = new Map<number, number>();
    for (const vc of visitCountsList) {
      visitCountMap.set(vc.patient_id, vc.count);
    }

    const lastCompletedVisits = await db.all(
      `SELECT v.id, v.patient_id, v.created_at, v.doctor_notes, vt.name as visit_type_name
       FROM visits v
       JOIN visit_types vt ON v.visit_type_id = vt.id
       WHERE v.status = 'Completed' AND v.id IN (
         SELECT MAX(id) FROM visits WHERE status = 'Completed' GROUP BY patient_id
       )`
    );
    const lastVisitMap = new Map<number, any>();
    for (const lv of lastCompletedVisits) {
      lastVisitMap.set(lv.patient_id, lv);
    }

    const firstMeasurements = await db.all(
      `SELECT pm.id, pm.patient_id, pm.weight_kg, pm.height_cm, pm.bmi, v.created_at as visit_date
       FROM patient_measurements pm
       JOIN visits v ON pm.visit_id = v.id
       WHERE pm.id IN (
         SELECT MIN(id) FROM patient_measurements GROUP BY patient_id
       )`
    );
    const firstMeasurementMap = new Map<number, any>();
    for (const fm of firstMeasurements) {
      firstMeasurementMap.set(fm.patient_id, fm);
    }

    const latestMeasurements = await db.all(
      `SELECT pm.*, v.created_at as visit_date
       FROM patient_measurements pm
       JOIN visits v ON pm.visit_id = v.id
       WHERE pm.id IN (
         SELECT MAX(id) FROM patient_measurements GROUP BY patient_id
       )`
    );
    const latestMeasurementMap = new Map<number, any>();
    for (const lm of latestMeasurements) {
      latestMeasurementMap.set(lm.patient_id, lm);
    }

    // Compute metrics and attached data for each patient in memory
    let patients = rawPatients.map((p) => {
      const firstMeasurement = firstMeasurementMap.get(p.id) || null;
      const lastMeasurement = latestMeasurementMap.get(p.id) || null;
      const totalVisits = visitCountMap.get(p.id) || 0;
      const lastVisit = lastVisitMap.get(p.id) || null;
      const activeVisit = activeVisitMap.get(p.id) || null;

      let parsedBadHabits = undefined;
      if (p.bad_habits) {
        try {
          parsedBadHabits = JSON.parse(p.bad_habits);
        } catch (_) {}
      }

      const startWeight = firstMeasurement ? firstMeasurement.weight_kg : null;
      const currentWeight = lastMeasurement ? lastMeasurement.weight_kg : null;
      let totalWeightDiff: number | null = null;
      if (startWeight !== null && currentWeight !== null) {
        totalWeightDiff = parseFloat((currentWeight - startWeight).toFixed(1));
      }

      return {
        id: p.id,
        code: p.code,
        fullName: p.full_name,
        phone: p.phone,
        gender: p.gender,
        dateOfBirth: p.date_of_birth,
        age: p.age,
        heightCm: p.height_cm,
        targetWeightKg: p.target_weight_kg,
        maritalStatus: p.marital_status,
        hasChildren: Boolean(p.has_children),
        childrenCount: p.children_count || 0,
        isLactating: Boolean(p.is_lactating),
        isPregnant: Boolean(p.is_pregnant),
        isPeriodRegular: p.is_period_regular !== null && p.is_period_regular !== undefined ? Boolean(p.is_period_regular) : true,
        hasContraception: Boolean(p.has_contraception),
        contraceptionType: p.contraception_type || '',
        chronicDiseasesNotes: p.chronic_diseases_notes || '',
        hasOperations: Boolean(p.has_operations),
        operationsHistory: p.operations_history,
        takesMedications: Boolean(p.takes_medications),
        medicationsHistory: p.medications_history,
        femaleReproductiveNotes: p.female_reproductive_notes,
        badHabits: parsedBadHabits,
        chiefComplaints: p.chief_complaints,
        pastAcupunctureRegimes: p.past_acupuncture_regimes,
        occupation: p.occupation,
        notes: p.notes,
        isMaintenanceMode: Boolean(p.is_maintenance_mode),
        maintenanceStartDate: p.maintenance_start_date,
        maintenanceTargetWeight: p.maintenance_target_weight,
        createdAt: p.created_at,
        totalVisits,
        lastVisitDate: lastVisit ? lastVisit.created_at : null,
        lastVisitTypeName: lastVisit ? lastVisit.visit_type_name : null,
        lastVisitDoctorNotes: lastVisit ? lastVisit.doctor_notes : null,
        startWeightKg: startWeight,
        currentWeightKg: currentWeight,
        totalWeightDiffKg: totalWeightDiff,
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
          bloodPressure: lastMeasurement.blood_pressure,
          recordedAt: lastMeasurement.visit_date
        } : null
      };
    });

    // In-memory sorting for visits_desc, last_visit_desc, weight_loss_desc if selected
    if (sortBy === 'visits_desc') {
      patients.sort((a, b) => b.totalVisits - a.totalVisits);
    } else if (sortBy === 'last_visit_desc') {
      patients.sort((a, b) => {
        const dateA = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const dateB = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'weight_loss_desc') {
      patients.sort((a, b) => {
        const diffA = a.totalWeightDiffKg ?? 0;
        const diffB = b.totalWeightDiffKg ?? 0;
        return diffA - diffB; // Negative diff is loss, so most lost comes first
      });
    }

    if (filter === 'today_queued') {
      patients = patients.filter(p => p.activeVisit !== null);
    }

    return res.json({
      patients,
      stats: {
        totalPatients: totalPatientsCount?.count || 0,
        femalePatients: femaleCount?.count || 0,
        femaleCount: femaleCount?.count || 0,
        malePatients: maleCount?.count || 0,
        maleCount: maleCount?.count || 0,
        totalVisits: totalVisitsCount?.count || 0,
        queuedToday: queuedTodayCount?.count || 0
      }
    });
  } catch (err: any) {
    console.error('Directory patients error:', err);
    return res.status(500).json({ message: 'خطأ أثناء استرجاع سجل وقاعدة بيانات المرضى' });
  }
});

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

    if (patients.length === 0) {
      return res.json([]);
    }

    const patientIds = patients.map(p => p.id);
    const placeholders = patientIds.map(() => '?').join(',');

    // Batched queries for search results
    const [latestMeasurements, visitCounts, activeVisits] = await Promise.all([
      db.all(
        `SELECT pm.*, v.created_at as visit_date 
         FROM patient_measurements pm 
         JOIN visits v ON pm.visit_id = v.id 
         WHERE pm.patient_id IN (${placeholders})
           AND pm.id IN (SELECT MAX(id) FROM patient_measurements WHERE patient_id IN (${placeholders}) GROUP BY patient_id)`,
        [...patientIds, ...patientIds]
      ),
      db.all(
        `SELECT patient_id, COUNT(*) as count 
         FROM visits 
         WHERE status != 'Cancelled' AND patient_id IN (${placeholders}) 
         GROUP BY patient_id`,
        patientIds
      ),
      db.all(
        `SELECT v.id, v.patient_id, v.queue_number, v.status, v.created_at, vt.name as visit_type_name
         FROM visits v
         JOIN visit_types vt ON v.visit_type_id = vt.id
         WHERE v.status IN ('Waiting', 'InConsultation') AND v.patient_id IN (${placeholders})`,
        patientIds
      )
    ]);

    const measMap = new Map<number, any>();
    for (const m of latestMeasurements) measMap.set(m.patient_id, m);

    const countMap = new Map<number, number>();
    for (const c of visitCounts) countMap.set(c.patient_id, c.count);

    const activeMap = new Map<number, any>();
    for (const a of activeVisits) activeMap.set(a.patient_id, a);

    const results = patients.map((p) => {
      const lastMeasurement = measMap.get(p.id) || null;
      const visitCount = countMap.get(p.id) || 0;
      const activeVisit = activeMap.get(p.id) || null;

      let parsedBadHabits = undefined;
      if (p.bad_habits) {
        try {
          parsedBadHabits = JSON.parse(p.bad_habits);
        } catch (_) {}
      }

      return {
        id: p.id,
        code: p.code,
        fullName: p.full_name,
        phone: p.phone,
        gender: p.gender,
        dateOfBirth: p.date_of_birth,
        age: p.age,
        heightCm: p.height_cm,
        targetWeightKg: p.target_weight_kg,
        maritalStatus: p.marital_status,
        hasChildren: Boolean(p.has_children),
        childrenCount: p.children_count || 0,
        isLactating: Boolean(p.is_lactating),
        isPregnant: Boolean(p.is_pregnant),
        isPeriodRegular: p.is_period_regular !== null && p.is_period_regular !== undefined ? Boolean(p.is_period_regular) : true,
        hasContraception: Boolean(p.has_contraception),
        contraceptionType: p.contraception_type || '',
        chronicDiseasesNotes: p.chronic_diseases_notes || '',
        hasOperations: Boolean(p.has_operations),
        operationsHistory: p.operations_history,
        takesMedications: Boolean(p.takes_medications),
        medicationsHistory: p.medications_history,
        femaleReproductiveNotes: p.female_reproductive_notes,
        badHabits: parsedBadHabits,
        chiefComplaints: p.chief_complaints,
        pastAcupunctureRegimes: p.past_acupuncture_regimes,
        occupation: p.occupation,
        notes: p.notes,
        isMaintenanceMode: Boolean(p.is_maintenance_mode),
        maintenanceStartDate: p.maintenance_start_date,
        maintenanceTargetWeight: p.maintenance_target_weight,
        createdAt: p.created_at,
        totalVisits: visitCount,
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
    });

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

    let parsedBadHabits = undefined;
    if (patient.bad_habits) {
      try {
        parsedBadHabits = JSON.parse(patient.bad_habits);
      } catch (_) {}
    }

    return res.json({
      id: patient.id,
      code: patient.code,
      fullName: patient.full_name,
      phone: patient.phone,
      gender: patient.gender,
      dateOfBirth: patient.date_of_birth,
      age: patient.age,
      heightCm: patient.height_cm,
      targetWeightKg: patient.target_weight_kg,
      maritalStatus: patient.marital_status,
      hasChildren: Boolean(patient.has_children),
      childrenCount: patient.children_count || 0,
      isLactating: Boolean(patient.is_lactating),
      isPregnant: Boolean(patient.is_pregnant),
      isPeriodRegular: patient.is_period_regular !== null && patient.is_period_regular !== undefined ? Boolean(patient.is_period_regular) : true,
      hasContraception: Boolean(patient.has_contraception),
      contraceptionType: patient.contraception_type || '',
      chronicDiseasesNotes: patient.chronic_diseases_notes || '',
      hasOperations: Boolean(patient.has_operations),
      operationsHistory: patient.operations_history,
      takesMedications: Boolean(patient.takes_medications),
      medicationsHistory: patient.medications_history,
      femaleReproductiveNotes: patient.female_reproductive_notes,
      badHabits: parsedBadHabits,
      chiefComplaints: patient.chief_complaints,
      pastAcupunctureRegimes: patient.past_acupuncture_regimes,
      occupation: patient.occupation,
      notes: patient.notes,
      isMaintenanceMode: Boolean(patient.is_maintenance_mode),
      maintenanceStartDate: patient.maintenance_start_date,
      maintenanceTargetWeight: patient.maintenance_target_weight,
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

// Update patient info / medical history
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { 
      fullName, 
      phone, 
      gender, 
      dateOfBirth, 
      age,
      heightCm, 
      targetWeightKg,
      weightKg,
      maritalStatus,
      hasChildren,
      childrenCount,
      isLactating,
      isPregnant,
      isPeriodRegular,
      hasContraception,
      contraceptionType,
      chronicDiseasesNotes,
      hasOperations,
      operationsHistory,
      takesMedications,
      medicationsHistory,
      femaleReproductiveNotes,
      badHabits,
      chiefComplaints,
      pastAcupunctureRegimes,
      occupation,
      notes 
    } = req.body;

    const db = await getDb();

    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود' });
    }

    const badHabitsJson = badHabits !== undefined ? (typeof badHabits === 'string' ? badHabits : JSON.stringify(badHabits)) : patient.bad_habits;

    await db.run(
      `UPDATE patients 
       SET full_name = ?, phone = ?, gender = ?, date_of_birth = ?, age = ?, height_cm = ?, target_weight_kg = ?,
           marital_status = ?, has_children = ?, children_count = ?, is_lactating = ?, is_pregnant = ?,
           is_period_regular = ?, has_contraception = ?, contraception_type = ?, chronic_diseases_notes = ?,
           has_operations = ?, operations_history = ?, takes_medications = ?, medications_history = ?,
           female_reproductive_notes = ?, bad_habits = ?, chief_complaints = ?, past_acupuncture_regimes = ?, occupation = ?, notes = ?
       WHERE id = ?`,
      [
        fullName ? fullName.trim() : patient.full_name,
        phone ? phone.trim() : patient.phone,
        gender || patient.gender,
        dateOfBirth !== undefined ? dateOfBirth : patient.date_of_birth,
        age !== undefined && age !== null ? parseInt(age, 10) : patient.age,
        heightCm !== undefined && heightCm !== null ? parseFloat(heightCm) : patient.height_cm,
        targetWeightKg !== undefined && targetWeightKg !== null ? parseFloat(targetWeightKg) : patient.target_weight_kg,
        maritalStatus !== undefined ? maritalStatus : patient.marital_status,
        hasChildren !== undefined ? (hasChildren ? 1 : 0) : patient.has_children,
        childrenCount !== undefined ? parseInt(childrenCount, 10) : patient.children_count,
        isLactating !== undefined ? (isLactating ? 1 : 0) : patient.is_lactating,
        isPregnant !== undefined ? (isPregnant ? 1 : 0) : patient.is_pregnant,
        isPeriodRegular !== undefined ? (isPeriodRegular ? 1 : 0) : (patient.is_period_regular !== null ? patient.is_period_regular : 1),
        hasContraception !== undefined ? (hasContraception ? 1 : 0) : (patient.has_contraception || 0),
        contraceptionType !== undefined ? contraceptionType : patient.contraception_type,
        chronicDiseasesNotes !== undefined ? chronicDiseasesNotes : patient.chronic_diseases_notes,
        hasOperations !== undefined ? (hasOperations ? 1 : 0) : patient.has_operations,
        operationsHistory !== undefined ? operationsHistory : patient.operations_history,
        takesMedications !== undefined ? (takesMedications ? 1 : 0) : patient.takes_medications,
        medicationsHistory !== undefined ? medicationsHistory : patient.medications_history,
        femaleReproductiveNotes !== undefined ? femaleReproductiveNotes : patient.female_reproductive_notes,
        badHabitsJson,
        chiefComplaints !== undefined ? chiefComplaints : patient.chief_complaints,
        pastAcupunctureRegimes !== undefined ? pastAcupunctureRegimes : patient.past_acupuncture_regimes,
        occupation !== undefined ? occupation : patient.occupation,
        notes !== undefined ? notes : patient.notes,
        patientId
      ]
    );

    // Update or insert weight measurement if weightKg is provided
    if (weightKg !== undefined && weightKg !== null && weightKg !== '' && !isNaN(parseFloat(weightKg)) && parseFloat(weightKg) > 0) {
      const parsedWeight = parseFloat(weightKg);
      const effectiveHeight = heightCm ? parseFloat(heightCm) : patient.height_cm;
      let calculatedBmi: number | null = null;
      if (effectiveHeight && effectiveHeight > 0) {
        const hm = effectiveHeight / 100;
        calculatedBmi = parseFloat((parsedWeight / (hm * hm)).toFixed(1));
      }

      const latestMeas = await db.get(
        'SELECT id FROM patient_measurements WHERE patient_id = ? ORDER BY id DESC LIMIT 1',
        [patientId]
      );

      if (latestMeas) {
        await db.run(
          `UPDATE patient_measurements 
           SET weight_kg = ?, height_cm = COALESCE(?, height_cm), bmi = COALESCE(?, bmi)
           WHERE id = ?`,
          [parsedWeight, effectiveHeight || null, calculatedBmi || null, latestMeas.id]
        );
      } else {
        const now = new Date().toISOString();
        let fallbackVisit = await db.get('SELECT id FROM visits WHERE patient_id = ? ORDER BY id DESC LIMIT 1', [patientId]);
        let visitId = fallbackVisit?.id;
        if (!visitId) {
          let fallbackShift = await db.get('SELECT id FROM shifts ORDER BY id DESC LIMIT 1');
          if (!fallbackShift) {
            const shiftRes = await db.run(
              `INSERT INTO shifts (cashier_id, start_time, end_time, is_open, total_amount, total_visits)
               VALUES (?, ?, ?, 0, 0, 0)`,
              [req.user!.id, now, now]
            );
            fallbackShift = { id: shiftRes.lastID };
          }
          const vRes = await db.run(
            `INSERT INTO visits (patient_id, visit_type_id, cashier_id, shift_id, price, status, payment_status, is_archive, idempotency_key, queue_number, created_at)
             VALUES (?, 1, ?, ?, 0, 'Completed', 'Paid', 1, ?, 0, ?)`,
            [patientId, req.user!.id, fallbackShift.id, `INIT-${patientId}-${Date.now()}`, now]
          );
          visitId = vRes.lastID;
        }

        await db.run(
          `INSERT INTO patient_measurements (patient_id, visit_id, weight_kg, height_cm, bmi, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [patientId, visitId, parsedWeight, effectiveHeight || null, calculatedBmi || null, now]
        );
      }
    }

    // Auto-save operations and medications to catalog if present
    if (operationsHistory && typeof operationsHistory === 'string') {
      operationsHistory.split(/[,،\n]/).forEach(op => autoSaveOperation(db, op));
    }
    if (medicationsHistory && typeof medicationsHistory === 'string') {
      medicationsHistory.split(/[,،\n]/).forEach(med => autoSaveMedication(db, med));
    }

    return res.json({ message: 'تم تحديث بيانات والسجل الطبي للمريض بنجاح' });
  } catch (err: any) {
    console.error('Update patient error:', err);
    return res.status(500).json({ message: 'فشل في تحديث بيانات المريض' });
  }
});

// Register new patient
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      fullName, 
      phone, 
      gender, 
      dateOfBirth, 
      age,
      heightCm, 
      targetWeightKg,
      weightKg,
      maritalStatus,
      hasChildren,
      childrenCount,
      isLactating,
      isPregnant,
      isPeriodRegular,
      hasContraception,
      contraceptionType,
      chronicDiseasesNotes,
      hasOperations,
      operationsHistory,
      takesMedications,
      medicationsHistory,
      femaleReproductiveNotes,
      badHabits,
      chiefComplaints,
      pastAcupunctureRegimes,
      occupation,
      notes 
    } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: 'يرجى إدخال اسم المريض ورقم الهاتف' });
    }

    const code = await generateNextPatientCode();
    const db = await getDb();
    const now = new Date().toISOString();

    const badHabitsJson = badHabits ? (typeof badHabits === 'string' ? badHabits : JSON.stringify(badHabits)) : null;

    const result = await db.run(
      `INSERT INTO patients (
        code, full_name, phone, gender, date_of_birth, age, height_cm, target_weight_kg,
        marital_status, has_children, children_count, is_lactating, is_pregnant,
        is_period_regular, has_contraception, contraception_type, chronic_diseases_notes,
        has_operations, operations_history, takes_medications, medications_history,
        female_reproductive_notes, bad_habits, chief_complaints, past_acupuncture_regimes, occupation, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        fullName.trim(),
        phone.trim(),
        gender || 'أنثى',
        dateOfBirth || null,
        age ? parseInt(age, 10) : null,
        heightCm ? parseFloat(heightCm) : null,
        targetWeightKg ? parseFloat(targetWeightKg) : null,
        maritalStatus || null,
        hasChildren ? 1 : 0,
        childrenCount ? parseInt(childrenCount, 10) : 0,
        isLactating ? 1 : 0,
        isPregnant ? 1 : 0,
        isPeriodRegular !== undefined ? (isPeriodRegular ? 1 : 0) : 1,
        hasContraception ? 1 : 0,
        contraceptionType || null,
        chronicDiseasesNotes || null,
        hasOperations ? 1 : 0,
        operationsHistory || null,
        takesMedications ? 1 : 0,
        medicationsHistory || null,
        femaleReproductiveNotes || null,
        badHabitsJson,
        chiefComplaints || null,
        pastAcupunctureRegimes || null,
        occupation || null,
        notes || null,
        now
      ]
    );

    const newPatientId = result.lastID;

    // Auto-save operations and medications to catalog if present
    if (operationsHistory && typeof operationsHistory === 'string') {
      operationsHistory.split(/[,،\n]/).forEach(op => autoSaveOperation(db, op));
    }
    if (medicationsHistory && typeof medicationsHistory === 'string') {
      medicationsHistory.split(/[,،\n]/).forEach(med => autoSaveMedication(db, med));
    }

    // Insert historical past measurements if provided
    const historicalMeasurements = req.body.historicalMeasurements;
    if (Array.isArray(historicalMeasurements) && historicalMeasurements.length > 0) {
      let fallbackShift = await db.get('SELECT id FROM shifts ORDER BY id ASC LIMIT 1');
      if (!fallbackShift) {
        const shiftRes = await db.run(
          `INSERT INTO shifts (cashier_id, start_time, end_time, is_open, total_amount, total_visits)
           VALUES (?, ?, ?, 0, 0, 0)`,
          [req.user!.id, now, now]
        );
        fallbackShift = { id: shiftRes.lastID };
      }

      for (let i = 0; i < historicalMeasurements.length; i++) {
        const item = historicalMeasurements[i];
        if (!item.weightKg) continue;

        const recordDate = item.recordedAt || now;
        const weight = parseFloat(item.weightKg);
        const height = item.heightCm ? parseFloat(item.heightCm) : (heightCm ? parseFloat(heightCm) : null);
        let bmi = null;
        if (weight > 0 && height && height > 0) {
          const hm = height / 100;
          bmi = parseFloat((weight / (hm * hm)).toFixed(1));
        }

        const histKey = `HIST-${newPatientId}-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`;

        const visitResult = await db.run(
          `INSERT INTO visits (
            idempotency_key, patient_id, visit_type_id, price, status, payment_status,
            queue_number, cashier_id, shift_id, completed_by_doctor_id, doctor_notes, is_archive, created_at, completed_at
          ) VALUES (?, ?, ?, ?, 'Completed', 'Paid', 0, ?, ?, ?, ?, 1, ?, ?)`,
          [
            histKey,
            newPatientId,
            i === 0 ? 1 : 2, // 1 for first visit (كشف جديد), 2 for followups (إعادة)
            0,
            req.user!.id,
            fallbackShift.id,
            req.user!.id,
            item.doctorNotes || item.notes || 'تسجيل سابق من الأرشيف والدفاتر',
            recordDate,
            recordDate
          ]
        );

        const histVisitId = visitResult.lastID;

        await db.run(
          `INSERT INTO patient_measurements (
            visit_id, patient_id, weight_kg, height_cm, bmi, fat_percentage,
            muscle_percentage, water_percentage, bone_mass, notes, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            histVisitId,
            newPatientId,
            weight,
            height,
            bmi,
            item.fatPercentage ? parseFloat(item.fatPercentage) : null,
            item.musclePercentage ? parseFloat(item.musclePercentage) : null,
            item.waterPercentage ? parseFloat(item.waterPercentage) : null,
            item.boneMass ? parseFloat(item.boneMass) : null,
            item.notes || 'وزن سابق من الأرشيف',
            recordDate
          ]
        );
      }
    } else if (weightKg && !isNaN(parseFloat(weightKg)) && parseFloat(weightKg) > 0) {
      // Direct initial measurement entry
      const parsedWeight = parseFloat(weightKg);
      const parsedHeight = heightCm ? parseFloat(heightCm) : null;
      let calculatedBmi: number | null = null;
      if (parsedWeight > 0 && parsedHeight && parsedHeight > 0) {
        const hm = parsedHeight / 100;
        calculatedBmi = parseFloat((parsedWeight / (hm * hm)).toFixed(1));
      }

      let fallbackShift = await db.get('SELECT id FROM shifts ORDER BY id ASC LIMIT 1');
      if (!fallbackShift) {
        const shiftRes = await db.run(
          `INSERT INTO shifts (cashier_id, start_time, end_time, is_open, total_amount, total_visits)
           VALUES (?, ?, ?, 0, 0, 0)`,
          [req.user!.id, now, now]
        );
        fallbackShift = { id: shiftRes.lastID };
      }

      const vRes = await db.run(
        `INSERT INTO visits (
          idempotency_key, patient_id, visit_type_id, price, status, payment_status,
          queue_number, cashier_id, shift_id, completed_by_doctor_id, doctor_notes, is_archive, created_at, completed_at
        ) VALUES (?, ?, 1, 0, 'Completed', 'Paid', 0, ?, ?, ?, 'الوزن الأولي عند التسجيل', 1, ?, ?)`,
        [`INIT-${newPatientId}-${Date.now()}`, newPatientId, req.user!.id, fallbackShift.id, req.user!.id, now, now]
      );

      await db.run(
        `INSERT INTO patient_measurements (
          visit_id, patient_id, weight_kg, height_cm, bmi, notes, recorded_at
        ) VALUES (?, ?, ?, ?, ?, 'الوزن الأولي عند فتح الملف', ?)`,
        [vRes.lastID, newPatientId, parsedWeight, parsedHeight, calculatedBmi, now]
      );
    }

    await logAudit(req.user!.id, 'CREATE_PATIENT', 'Patient', newPatientId, {
      code,
      fullName,
      phone,
      historicalRecordsCount: Array.isArray(historicalMeasurements) ? historicalMeasurements.length : 0
    });

    return res.status(201).json({
      id: newPatientId,
      code,
      fullName: fullName.trim(),
      phone: phone.trim(),
      gender: gender || 'أنثى',
      dateOfBirth,
      age: age ? parseInt(age, 10) : null,
      heightCm: heightCm ? parseFloat(heightCm) : null,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : null,
      maritalStatus,
      hasChildren: Boolean(hasChildren),
      childrenCount: childrenCount ? parseInt(childrenCount, 10) : 0,
      isLactating: Boolean(isLactating),
      isPregnant: Boolean(isPregnant),
      hasOperations: Boolean(hasOperations),
      operationsHistory,
      takesMedications: Boolean(takesMedications),
      medicationsHistory,
      femaleReproductiveNotes,
      badHabits,
      chiefComplaints,
      pastAcupunctureRegimes,
      occupation,
      notes,
      createdAt: now
    });
  } catch (err: any) {
    console.error('Create patient error:', err);
    return res.status(500).json({ message: 'فشل في إضافة المريض الجديد' });
  }
});

// POST Add historical measurement/visit to existing patient
router.post('/:id/historical-measurements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { recordedAt, weightKg, heightCm, fatPercentage, musclePercentage, waterPercentage, boneMass, notes, doctorNotes } = req.body;

    if (!weightKg) {
      return res.status(400).json({ message: 'يرجى إدخال قيمة الوزن المسجل' });
    }

    const db = await getDb();
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود' });
    }

    const now = new Date().toISOString();
    const recordDate = recordedAt || now;
    const weight = parseFloat(weightKg);
    const height = heightCm ? parseFloat(heightCm) : (patient.height_cm ? parseFloat(patient.height_cm) : null);
    let bmi = null;
    if (weight > 0 && height && height > 0) {
      const hm = height / 100;
      bmi = parseFloat((weight / (hm * hm)).toFixed(1));
    }

    let fallbackShift = await db.get('SELECT id FROM shifts ORDER BY id ASC LIMIT 1');
    if (!fallbackShift) {
      const shiftRes = await db.run(
        `INSERT INTO shifts (cashier_id, start_time, end_time, is_open, total_amount, total_visits)
         VALUES (?, ?, ?, 0, 0, 0)`,
        [req.user!.id, now, now]
      );
      fallbackShift = { id: shiftRes.lastID };
    }

    const histKey = `HIST-${patientId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const visitResult = await db.run(
      `INSERT INTO visits (
        idempotency_key, patient_id, visit_type_id, price, status, payment_status,
        queue_number, cashier_id, shift_id, completed_by_doctor_id, doctor_notes, created_at, completed_at
      ) VALUES (?, ?, 2, 0, 'Completed', 'Paid', 0, ?, ?, ?, ?, ?, ?)`,
      [
        histKey,
        patientId,
        req.user!.id,
        fallbackShift.id,
        req.user!.id,
        doctorNotes || notes || 'تسجيل وزن سابق من الأرشيف',
        recordDate,
        recordDate
      ]
    );

    const histVisitId = visitResult.lastID;

    await db.run(
      `INSERT INTO patient_measurements (
        visit_id, patient_id, weight_kg, height_cm, bmi, fat_percentage,
        muscle_percentage, water_percentage, bone_mass, notes, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        histVisitId,
        patientId,
        weight,
        height,
        bmi,
        fatPercentage ? parseFloat(fatPercentage) : null,
        musclePercentage ? parseFloat(musclePercentage) : null,
        waterPercentage ? parseFloat(waterPercentage) : null,
        boneMass ? parseFloat(boneMass) : null,
        notes || 'وزن سابق من الأرشيف',
        recordDate
      ]
    );

    await logAudit(req.user!.id, 'ADD_HISTORICAL_MEASUREMENT', 'Patient', patientId, {
      recordedAt: recordDate,
      weightKg: weight
    });

    return res.status(201).json({ message: 'تم حفظ الوزن السابق في سجل المريض بنجاح', visitId: histVisitId });
  } catch (err: any) {
    console.error('Add historical measurement error:', err);
    return res.status(500).json({ message: 'فشل في حفظ القياس السابق' });
  }
});

// DELETE /patients/:id - Delete patient and all associated records
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ message: 'رقم المريض غير صالح' });
    }

    const db = await getDb();
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود بالسجل' });
    }

    await db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      // 1. Delete all measurements for patient
      await db.run('DELETE FROM patient_measurements WHERE patient_id = ?', [patientId]);

      // 2. Delete all payments for patient visits
      await db.run('DELETE FROM payments WHERE visit_id IN (SELECT id FROM visits WHERE patient_id = ?)', [patientId]);

      // 3. Delete all visits for patient
      await db.run('DELETE FROM visits WHERE patient_id = ?', [patientId]);

      // 4. Delete patient record
      await db.run('DELETE FROM patients WHERE id = ?', [patientId]);

      await db.exec('COMMIT;');

      await logAudit(req.user!.id, 'DELETE_PATIENT', 'Patient', patientId, {
        code: patient.code,
        fullName: patient.full_name,
        phone: patient.phone
      });

      return res.json({ message: `تم حذف ملف المريض (${patient.full_name} - ${patient.code}) وكافة زياراته وبياناته نهائياً بنجاح` });
    } catch (txErr) {
      try { await db.exec('ROLLBACK;'); } catch (_) {}
      throw txErr;
    }
  } catch (err: any) {
    console.error('Delete patient error:', err);
    return res.status(500).json({ message: 'فشل في حذف ملف المريض' });
  }
});

// PUT /patients/:id/maintenance - Toggle and set stabilization mode
router.put('/:id/maintenance', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const patientId = parseInt(req.params.id, 10);
    const { isMaintenanceMode, targetWeight } = req.body;

    const db = await getDb();
    const patient = await db.get('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ message: 'المريض غير موجود بالسجل' });
    }

    const isMode = isMaintenanceMode ? 1 : 0;
    const target = targetWeight !== undefined && targetWeight !== null ? parseFloat(targetWeight) : null;
    const now = new Date().toISOString();

    await db.run(
      `UPDATE patients 
       SET is_maintenance_mode = ?, 
           maintenance_start_date = ?, 
           maintenance_target_weight = ?
       WHERE id = ?`,
      [isMode, isMode ? now : null, target, patientId]
    );

    await logAudit(req.user!.id, isMode ? 'ACTIVATE_MAINTENANCE_MODE' : 'DEACTIVATE_MAINTENANCE_MODE', 'Patient', patientId, {
      patientName: patient.full_name,
      targetWeight: target
    });

    return res.json({
      message: isMode ? 'تم تفعيل نظام تثبيت الوزن للمريض بنجاح - سيتم محاسبته من الزيارة القادمة على نظام التثبيت' : 'تم إلغاء تفعيل نظام التثبيت للمريض',
      isMaintenanceMode: Boolean(isMode),
      maintenanceTargetWeight: target
    });
  } catch (err: any) {
    console.error('Update maintenance mode error:', err);
    return res.status(500).json({ message: 'فشل في تحديث حالة نظام التثبيت للمريض' });
  }
});

export default router;
