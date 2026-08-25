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
  const newConsultType = visitTypes.find(vt => vt.id === 1) || { id: 1, name: 'كشف جديد', price: 200 };
  const followupType = visitTypes.find(vt => vt.id === 2) || { id: 2, name: 'إعادة', price: 50 };

  // Get last non-cancelled visit date for patient
  const lastVisit = await db.get(
    `SELECT created_at FROM visits 
     WHERE patient_id = ? AND status != 'Cancelled' 
     ORDER BY id DESC LIMIT 1`,
    [patientId]
  );

  // If no previous visit exists
  if (!lastVisit || !lastVisit.created_at) {
    return {
      recommendedVisitTypeId: newConsultType.id,
      recommendedVisitTypeName: newConsultType.name,
      finalPrice: Number(newConsultType.price),
      daysSinceLastVisit: null,
      lastVisitDate: null,
      statusBadge: 'أول كشف للمريض بالنظام (كشف جديد)',
      reasonCode: 'FIRST_VISIT',
      isDelayed: false
    };
  }

  const lastDate = new Date(lastVisit.created_at);
  const now = new Date();
  const diffTime = now.getTime() - lastDate.getTime();
  const daysSinceLastVisit = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  // If requestedVisitTypeId is provided and is NOT follow-up or new (e.g. stabilization = id 3)
  if (requestedVisitTypeId && requestedVisitTypeId !== 1 && requestedVisitTypeId !== 2) {
    const customType = visitTypes.find(vt => vt.id === requestedVisitTypeId);
    if (customType) {
      return {
        recommendedVisitTypeId: customType.id,
        recommendedVisitTypeName: customType.name,
        finalPrice: Number(customType.price),
        daysSinceLastVisit,
        lastVisitDate: lastVisit.created_at,
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
      finalPrice: Number(newConsultType.price),
      daysSinceLastVisit,
      lastVisitDate: lastVisit.created_at,
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
      finalPrice: delayTier2Price,
      daysSinceLastVisit,
      lastVisitDate: lastVisit.created_at,
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
      finalPrice: delayTier1Price,
      daysSinceLastVisit,
      lastVisitDate: lastVisit.created_at,
      statusBadge: `إعادة متأخرة (تأخير أكثر من ${delayGraceDays} يوم: ${daysSinceLastVisit} يوم) - السعر المحدد من الدكتورة: ${delayTier1Price} ج`,
      reasonCode: 'DELAYED_TIER_1',
      isDelayed: true
    };
  }

  // 4. Within grace period -> Regular Follow-up @ standard follow-up price
  return {
    recommendedVisitTypeId: followupType.id,
    recommendedVisitTypeName: followupType.name,
    finalPrice: Number(followupType.price),
    daysSinceLastVisit,
    lastVisitDate: lastVisit.created_at,
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

