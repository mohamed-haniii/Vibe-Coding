import { getDb } from '../db';

export interface SmartPricingResult {
  recommendedVisitTypeId: number;
  recommendedVisitTypeName: string;
  finalPrice: number;
  daysSinceLastVisit: number | null;
  lastVisitDate: string | null;
  statusBadge: string;
  reasonCode: string;
  isDelayed: boolean;
}

export async function getSmartVisitPricing(patientId: number, requestedVisitTypeId?: number): Promise<SmartPricingResult> {
  const db = await getDb();

  // Get official visit types from DB
  const visitTypes = await db.all('SELECT id, name, price FROM visit_types WHERE is_active = 1');
  const rawNewConsult = visitTypes.find(vt => vt.id === 1 || vt.name === 'كشف جديد');
  const rawFollowup = visitTypes.find(vt => vt.id === 2 || vt.name === 'إعادة');
  const rawMaintenance = visitTypes.find(vt => vt.id === 3 || vt.name === 'نظام تثبيت' || vt.name.includes('تثبيت'));

  const newConsultType = { id: 1, name: 'كشف جديد', price: (rawNewConsult && Number(rawNewConsult.price) > 0) ? Number(rawNewConsult.price) : 200 };
  const followupType = { id: 2, name: 'إعادة', price: (rawFollowup && Number(rawFollowup.price) > 0) ? Number(rawFollowup.price) : 50 };
  const maintenanceType = { id: 3, name: 'نظام تثبيت', price: (rawMaintenance && Number(rawMaintenance.price) > 0) ? Number(rawMaintenance.price) : 60 };

  // Check if patient is on maintenance / stabilization program
  const patient = await db.get('SELECT id, is_maintenance_mode, maintenance_target_weight FROM patients WHERE id = ?', [patientId]);

  // Get last non-cancelled visit date for patient (prioritizing real visits)
  const lastRealVisit = await db.get(
    `SELECT created_at FROM visits 
     WHERE patient_id = ? AND status != 'Cancelled' AND (is_archive = 0 OR is_archive IS NULL) AND idempotency_key NOT LIKE 'HIST-%' AND queue_number > 0
     ORDER BY id DESC LIMIT 1`,
    [patientId]
  );

  let lastDate: Date | null = lastRealVisit?.created_at ? new Date(lastRealVisit.created_at) : null;
  let lastDateString: string | null = lastRealVisit?.created_at || null;

  // If no real visit yet, check if there's any historical measurement
  if (!lastDate) {
    const lastMeasurement = await db.get(
      `SELECT recorded_at FROM patient_measurements WHERE patient_id = ? ORDER BY id DESC LIMIT 1`,
      [patientId]
    );
    if (lastMeasurement?.recorded_at) {
      lastDate = new Date(lastMeasurement.recorded_at);
      lastDateString = lastMeasurement.recorded_at;
    }
  }

  const now = new Date();
  const diffTime = lastDate ? now.getTime() - lastDate.getTime() : 0;
  const daysSinceLastVisit = lastDate ? Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))) : null;

  // If patient is enrolled in stabilization mode, bill on maintenance mode price
  if (patient && Boolean(patient.is_maintenance_mode)) {
    return {
      recommendedVisitTypeId: maintenanceType.id,
      recommendedVisitTypeName: maintenanceType.name,
      finalPrice: maintenanceType.price,
      daysSinceLastVisit,
      lastVisitDate: lastDateString,
      statusBadge: `نظام تثبيت الوزن نشط 🛡️ ${patient.maintenance_target_weight ? `(الوزن المثبت: ${patient.maintenance_target_weight} كجم)` : ''} - سعر جلسة التثبيت: ${maintenanceType.price} ج`,
      reasonCode: 'MAINTENANCE_PROGRAM',
      isDelayed: false
    };
  }

  // If no previous visit or measurement exists
  if (!lastDate) {
    return {
      recommendedVisitTypeId: newConsultType.id,
      recommendedVisitTypeName: newConsultType.name,
      finalPrice: newConsultType.price,
      daysSinceLastVisit: null,
      lastVisitDate: null,
      statusBadge: 'أول كشف للمريض بالنظام (كشف جديد)',
      reasonCode: 'FIRST_VISIT',
      isDelayed: false
    };
  }

  // If requestedVisitTypeId is provided and is NOT follow-up or new (e.g. stabilization = id 3)
  if (requestedVisitTypeId && requestedVisitTypeId !== 1 && requestedVisitTypeId !== 2) {
    const customType = visitTypes.find(vt => vt.id === requestedVisitTypeId);
    if (customType) {
      return {
        recommendedVisitTypeId: customType.id,
        recommendedVisitTypeName: customType.name,
        finalPrice: Number(customType.price),
        daysSinceLastVisit,
        lastVisitDate: lastDateString,
        statusBadge: `نوع زيارة مخصص (${customType.name})`,
        reasonCode: 'CUSTOM_TYPE',
        isDelayed: false
      };
    }
  }

  // Get clinic settings for delay thresholds and pricing
  const settingsRows = await db.all('SELECT key, value FROM clinic_settings');
  const settings: Record<string, string> = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  const delayGraceDays = settings.delay_grace_days ? parseInt(settings.delay_grace_days, 10) : 33;
  const delayTier1Days = settings.delay_tier1_days ? parseInt(settings.delay_tier1_days, 10) : 60;
  const delayTier1Price = settings.delay_tier1_price ? parseFloat(settings.delay_tier1_price) : 70;
  const delayTier2Days = settings.delay_tier2_days ? parseInt(settings.delay_tier2_days, 10) : 90;
  const delayTier2Price = settings.delay_tier2_price ? parseFloat(settings.delay_tier2_price) : 100;
  const delayRevertNewDays = settings.delay_revert_new_days ? parseInt(settings.delay_revert_new_days, 10) : 90;

  // Business Rules for Follow-up vs New Consultation:
  // 1. More than configured limit (default > 90 days) -> EXPIRED -> Reverts to "كشف جديد"
  if (daysSinceLastVisit > delayRevertNewDays) {
    return {
      recommendedVisitTypeId: newConsultType.id,
      recommendedVisitTypeName: newConsultType.name,
      finalPrice: Math.max(1, Number(newConsultType.price)),
      daysSinceLastVisit,
      lastVisitDate: lastDateString,
      statusBadge: `انقطع المريض أكثر من ${delayRevertNewDays} يوم (${daysSinceLastVisit} يوم) - تحول تلقائياً إلى كشف جديد`,
      reasonCode: 'EXPIRED_OVER_LIMIT',
      isDelayed: true
    };
  }

  // 2. More than tier 1 days (e.g. > 60 days) up to revert limit -> Tier 2 Delayed Follow-up
  if (daysSinceLastVisit > delayTier1Days) {
    return {
      recommendedVisitTypeId: followupType.id,
      recommendedVisitTypeName: followupType.name,
      finalPrice: Math.max(1, delayTier2Price),
      daysSinceLastVisit,
      lastVisitDate: lastDateString,
      statusBadge: `إعادة متأخرة (تأخير أكثر من ${delayTier1Days} يوم: ${daysSinceLastVisit} يوم) - السعر المحدد من الدكتورة: ${delayTier2Price} ج`,
      reasonCode: 'DELAYED_TIER_2',
      isDelayed: true
    };
  }

  // 3. More than grace period (e.g. > 33 days) up to tier 1 days -> Tier 1 Delayed Follow-up
  if (daysSinceLastVisit > delayGraceDays) {
    return {
      recommendedVisitTypeId: followupType.id,
      recommendedVisitTypeName: followupType.name,
      finalPrice: Math.max(1, delayTier1Price),
      daysSinceLastVisit,
      lastVisitDate: lastDateString,
      statusBadge: `إعادة متأخرة (تأخير أكثر من ${delayGraceDays} يوم: ${daysSinceLastVisit} يوم) - السعر المحدد من الدكتورة: ${delayTier1Price} ج`,
      reasonCode: 'DELAYED_TIER_1',
      isDelayed: true
    };
  }

  // 4. Within grace period -> Regular Follow-up @ standard follow-up price
  return {
    recommendedVisitTypeId: followupType.id,
    recommendedVisitTypeName: followupType.name,
    finalPrice: Math.max(1, Number(followupType.price)),
    daysSinceLastVisit,
    lastVisitDate: lastDateString,
    statusBadge: `إعادة دورية منتظمة (خلال المهلة المحددة: ${daysSinceLastVisit} يوم) - السعر: ${followupType.price} ج`,
    reasonCode: 'REGULAR_FOLLOWUP',
    isDelayed: false
  };
}

export async function getOfficialVisitPrice(visitTypeId: number, patientId?: number): Promise<number> {
  if (patientId) {
    const smart = await getSmartVisitPricing(patientId, visitTypeId);
    return smart.finalPrice;
  }

  const db = await getDb();
  const visitType = await db.get('SELECT price, is_active FROM visit_types WHERE id = ?', visitTypeId);

  if (!visitType || !visitType.is_active) {
    throw new Error('نوع الزيارة غير معرف أو غير مفعل في النظام');
  }

  return Number(visitType.price);
}

