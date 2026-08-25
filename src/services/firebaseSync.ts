import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Patient, Visit, Shift, ClinicSettings, DietPlan, User } from '../types';

// Collection references
export const COLLECTIONS = {
  USERS: 'users',
  PATIENTS: 'patients',
  VISITS: 'visits',
  SHIFTS: 'shifts',
  SETTINGS: 'settings',
  DIET_PLANS: 'dietPlans',
  AUDIT_LOGS: 'auditLogs'
};

/**
 * Initialize default data in Firestore if empty
 */
export async function seedFirestoreIfEmpty() {
  try {
    // 1. Check Settings
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'clinic_info');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        clinic_name: 'عيادة التخسيس والتغذية',
        clinic_subtitle: 'نظام إدارة العيادات والمتابعة الذكية',
        doctor_name: 'د. أمل مصطفى',
        phone: '01012345678',
        updatedAt: serverTimestamp()
      });
    }

    // 2. Check Diet Plans
    const dietPlansRef = collection(db, COLLECTIONS.DIET_PLANS);
    const dietSnap = await getDocs(query(dietPlansRef, limit(1)));
    if (dietSnap.empty) {
      await addDoc(dietPlansRef, {
        title: 'نظام الصيام المتقطع (16/8)',
        content: `• وجبة الإفطار (12 ظهراً): 2 بيضة مسلوقة + نصف رغيف بلدي + سلطة خضراء بملعقة زيت زيتون.\n• وجبة خفيفة (3 عصراً): ثمرة فاكهة + قبضة مكسرات نيئة.\n• وجبة العشاء (8 مساءً): علبة زبادي لايت + عصير ليمون أو قطعة جبن قريش.\n• المشروبات: ماء (3 لتر يومياً)، شاي أخضر وقرفة بدون سكر.`,
        createdAt: new Date().toISOString()
      });
      await addDoc(dietPlansRef, {
        title: 'نظام السعرات المنخفضة (1200 سعر حراري)',
        content: `• الإفطار: قطعة جبن قريش + خيار + ربع رغيف أسمر.\n• الغداء: 200 جرام صدر دجاج مشوي أو سمك مشوي + طبق سلطة كبير + 3 معالق أرز مسلوق.\n• العشاء: علبة زبادي لايت مع رشة بذور الشيا.\n• ملاحظة: الامتناع عن السكريات والمشروبات الغازية.`,
        createdAt: new Date().toISOString()
      });
    }

    console.log('[Firebase] Firestore initialized and verified successfully');
  } catch (err) {
    console.warn('[Firebase] Firestore seed check note:', err);
  }
}

/**
 * Subscribe to live visit queue from Firestore
 */
export function subscribeToQueue(onUpdate: (visits: any[]) => void) {
  try {
    const q = query(
      collection(db, COLLECTIONS.VISITS),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const visits = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      onUpdate(visits);
    }, (error) => {
      console.warn('[Firebase Queue Listener Error]', error);
    });
  } catch (err) {
    console.warn('[Firebase Queue Subscribe Error]', err);
    return () => {};
  }
}

/**
 * Subscribe to live shift changes from Firestore
 */
export function subscribeToCurrentShift(onUpdate: (shift: any | null) => void) {
  try {
    const q = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('status', '==', 'Open'),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        onUpdate(null);
      } else {
        const docSnap = snapshot.docs[0];
        onUpdate({
          id: docSnap.id,
          ...docSnap.data()
        });
      }
    }, (error) => {
      console.warn('[Firebase Shift Listener Error]', error);
    });
  } catch (err) {
    console.warn('[Firebase Shift Subscribe Error]', err);
    return () => {};
  }
}
