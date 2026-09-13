import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  UserCheck, 
  Heart, 
  Scissors, 
  Pill, 
  Coffee, 
  Scale, 
  AlertCircle,
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { CatalogDropdownInput } from './CatalogDropdownInput';

interface EditPatientMedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  initialData?: any;
  onUpdated: () => void;
}

export function EditPatientMedicalModal({
  isOpen,
  onClose,
  patientId,
  initialData,
  onUpdated
}: EditPatientMedicalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'أنثى',
    age: '',
    heightCm: '',
    weightKg: '',
    targetWeightKg: '',
    maritalStatus: 'متزوج',
    hasChildren: false,
    childrenCount: 0,
    isLactating: false,
    isPregnant: false,
    isPeriodRegular: true,
    hasContraception: false,
    contraceptionType: 'أقراص',
    hasOperations: 'لا',
    operationsHistory: '',
    takesMedications: 'لا',
    medicationsHistory: '',
    femaleReproductiveNotes: '',
    badHabits: {
      chipsy: false,
      cola: false,
      sweets: false,
      nuts: false,
      delivery: false,
      coffeeTea: false,
      lowWater: false,
      lateEating: false,
      bakery: false,
      friedFood: false,
      smoking: false,
      otherHabits: ''
    },
    chiefComplaints: '',
    chronicDiseasesNotes: '',
    notes: ''
  });

  // Saved catalogs
  const [savedOperationsList, setSavedOperationsList] = useState<string[]>([]);
  const [savedMedicationsList, setSavedMedicationsList] = useState<string[]>([]);

  const fetchCatalogs = async () => {
    try {
      const [ops, meds] = await Promise.all([
        apiRequest<string[]>('/patients/catalogs/operations'),
        apiRequest<string[]>('/patients/catalogs/medications')
      ]);
      setSavedOperationsList(Array.isArray(ops) ? ops : []);
      setSavedMedicationsList(Array.isArray(meds) ? meds : []);
    } catch (err) {
      console.error('Failed to load catalogs:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCatalogs();
      if (initialData) {
        populateForm(initialData);
      } else if (patientId) {
        loadPatientData();
      }
    }
  }, [isOpen, patientId, initialData]);

  const loadPatientData = async () => {
    try {
      const data: any = await apiRequest(`/patients/${patientId}`);
      populateForm(data);
    } catch (err) {
      console.error('Failed to fetch patient data:', err);
    }
  };

  const populateForm = (data: any) => {
    let badHabitsObj = {
      chipsy: false,
      cola: false,
      sweets: false,
      nuts: false,
      delivery: false,
      coffeeTea: false,
      lowWater: false,
      lateEating: false,
      bakery: false,
      friedFood: false,
      smoking: false,
      otherHabits: ''
    };

    if (data.badHabits) {
      if (typeof data.badHabits === 'object') {
        badHabitsObj = { ...badHabitsObj, ...data.badHabits };
      } else if (typeof data.badHabits === 'string') {
        try {
          const parsed = JSON.parse(data.badHabits);
          badHabitsObj = { ...badHabitsObj, ...parsed };
        } catch (_) {}
      }
    }

    // Detect current weight
    let detectedWeight = '';
    if (data.latestMeasurement?.weightKg) {
      detectedWeight = data.latestMeasurement.weightKg.toString();
    } else if (data.latestMeasurement?.weight_kg) {
      detectedWeight = data.latestMeasurement.weight_kg.toString();
    } else if (data.weightKg) {
      detectedWeight = data.weightKg.toString();
    }

    setFormData({
      fullName: data.fullName || '',
      phone: data.phone || '',
      gender: data.gender || 'أنثى',
      age: data.age ? data.age.toString() : '',
      heightCm: data.heightCm ? data.heightCm.toString() : '',
      weightKg: detectedWeight,
      targetWeightKg: data.targetWeightKg ? data.targetWeightKg.toString() : '',
      maritalStatus: data.maritalStatus || 'متزوج',
      hasChildren: Boolean(data.hasChildren),
      childrenCount: data.childrenCount || 0,
      isLactating: Boolean(data.isLactating),
      isPregnant: Boolean(data.isPregnant),
      isPeriodRegular: data.isPeriodRegular !== undefined && data.isPeriodRegular !== null ? Boolean(data.isPeriodRegular) : true,
      hasContraception: Boolean(data.hasContraception),
      contraceptionType: data.contraceptionType || 'أقراص',
      hasOperations: data.hasOperations ? 'نعم' : (data.operationsHistory ? 'نعم' : 'لا'),
      operationsHistory: data.operationsHistory || '',
      takesMedications: data.takesMedications ? 'نعم' : (data.medicationsHistory ? 'نعم' : 'لا'),
      medicationsHistory: data.medicationsHistory || '',
      femaleReproductiveNotes: data.femaleReproductiveNotes || '',
      badHabits: badHabitsObj,
      chiefComplaints: data.chiefComplaints || '',
      chronicDiseasesNotes: data.chronicDiseasesNotes || '',
      notes: data.notes || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/patients/${patientId}`, {
        method: 'PUT',
        body: {
          fullName: formData.fullName,
          phone: formData.phone,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age, 10) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          weightKg: formData.weightKg && !isNaN(parseFloat(formData.weightKg)) ? parseFloat(formData.weightKg) : null,
          targetWeightKg: formData.targetWeightKg ? parseFloat(formData.targetWeightKg) : null,
          maritalStatus: formData.maritalStatus,
          hasChildren: formData.hasChildren,
          childrenCount: formData.hasChildren ? formData.childrenCount : 0,
          isLactating: formData.gender === 'أنثى' ? formData.isLactating : false,
          isPregnant: formData.gender === 'أنثى' ? formData.isPregnant : false,
          isPeriodRegular: formData.gender === 'أنثى' ? formData.isPeriodRegular : null,
          hasContraception: formData.gender === 'أنثى' ? formData.hasContraception : false,
          contraceptionType: formData.gender === 'أنثى' && formData.hasContraception ? formData.contraceptionType : null,
          hasOperations: formData.hasOperations === 'نعم',
          operationsHistory: formData.hasOperations === 'نعم' ? formData.operationsHistory : '',
          takesMedications: formData.takesMedications === 'نعم',
          medicationsHistory: formData.takesMedications === 'نعم' ? formData.medicationsHistory : '',
          femaleReproductiveNotes: formData.femaleReproductiveNotes,
          badHabits: formData.badHabits,
          chiefComplaints: formData.chiefComplaints,
          chronicDiseasesNotes: formData.chronicDiseasesNotes,
          notes: formData.notes
        }
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حفظ التعديلات');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">تعديل السجل الطبي والبيانات للمريض</h3>
              <p className="text-xs text-blue-100 font-medium">{formData.fullName || 'تحديث البيانات الحيوية والسريرية'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          
          {/* Section 1: Basic & Target Metrics */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200/70 pb-1.5">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>البيانات الأساسية والوزن المسجل والمستهدف</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">السن / العمر</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    placeholder="مثال: 34"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-blue-600"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">سنة</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-1">الوزن الحالي المسجل</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                    placeholder="مثال: 85.5"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-black text-blue-900 focus:outline-hidden focus:border-blue-600"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] font-bold text-blue-600">كجم</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">الوزن المستهدف</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.targetWeightKg}
                    onChange={e => setFormData({ ...formData, targetWeightKg: e.target.value })}
                    placeholder="مثال: 65"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 focus:outline-hidden focus:border-emerald-600"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] font-bold text-emerald-600">كجم</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">الطول</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.heightCm}
                    onChange={e => setFormData({ ...formData, heightCm: e.target.value })}
                    placeholder="مثال: 168"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-blue-600"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">سم</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Social Status & Female Reproductive */}
          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/70 space-y-3">
            <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5 border-b border-purple-200/60 pb-1.5">
              <Heart className="w-4 h-4 text-purple-600" />
              <span>الحالة الاجتماعية وصحة المرأة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">الحالة الاجتماعية</label>
                <div className="flex gap-2">
                  {['متزوج', 'أعزب', 'مطلق', 'أرمل'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormData({ ...formData, maritalStatus: st })}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        formData.maritalStatus === st
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-purple-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">الأطفال</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, hasChildren: false, childrenCount: 0 })}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !formData.hasChildren
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    لا يوجد
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, hasChildren: true, childrenCount: formData.childrenCount || 1 })}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.hasChildren
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    يوجد أطفال
                  </button>
                  {formData.hasChildren && (
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.childrenCount}
                      onChange={e => setFormData({ ...formData, childrenCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-16 px-2 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-center text-purple-950 focus:outline-hidden"
                      placeholder="العدد"
                    />
                  )}
                </div>
              </div>
            </div>

            {formData.gender === 'أنثى' && (
              <div className="pt-2 border-t border-purple-200/60 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-bold text-purple-950 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.isPregnant}
                      onChange={e => setFormData({ ...formData, isPregnant: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>حامل 🤰</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-bold text-purple-950 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={formData.isLactating}
                      onChange={e => setFormData({ ...formData, isLactating: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                    />
                    <span>ترضع طبيعياً 🍼</span>
                  </label>

                  {/* Menstrual Regularity */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-bold text-purple-950 shadow-2xs">
                    <span className="text-purple-900">الدورة الشهرية:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPeriodRegular: true })}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          formData.isPeriodRegular
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        منتظمة ✅
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPeriodRegular: false })}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          !formData.isPeriodRegular
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        غير منتظمة ⚠️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contraception Method */}
                <div className="bg-white/80 p-2.5 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-purple-950">
                      <input
                        type="checkbox"
                        checked={formData.hasContraception}
                        onChange={e => setFormData({
                          ...formData,
                          hasContraception: e.target.checked,
                          contraceptionType: e.target.checked ? (formData.contraceptionType || 'أقراص') : ''
                        })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>هل توجد وسيلة منع حمل؟ 🛡️</span>
                    </label>
                    {formData.hasContraception && (
                      <span className="text-[10px] font-bold text-purple-700">اختر نوع الوسيلة أدناه:</span>
                    )}
                  </div>

                  {formData.hasContraception && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-purple-100 animate-in fade-in">
                      {[
                        { label: 'أقراص 💊', val: 'أقراص' },
                        { label: 'لولب ⚓', val: 'لولب' },
                        { label: 'ربط أنابيب 🎗️', val: 'ربط أنابيب' }
                      ].map(t => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, contraceptionType: t.val })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            formData.contraceptionType === t.val
                              ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                              : 'bg-purple-50/60 text-purple-900 border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Surgical & Medication History with Dropdown Arrows */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-3.5">
            <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-1.5">
              <Scissors className="w-4 h-4 text-amber-600" />
              <span>العمليات الجراحية السابقة والأدوية المنتظمة</span>
            </h4>

            {/* Operations */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950">هل أجرى المريض عمليات جراحية سابقة؟</label>
                <div className="flex gap-1.5">
                  {['لا', 'نعم'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, hasOperations: val })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formData.hasOperations === val
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {formData.hasOperations === 'نعم' && (
                <div className="pt-1">
                  <CatalogDropdownInput
                    value={formData.operationsHistory}
                    onChange={val => setFormData({ ...formData, operationsHistory: val })}
                    options={savedOperationsList}
                    placeholder="اكتب اسم العملية أو اضغط على السهم للاختيار من القائمة..."
                    catalogType="operations"
                    onCatalogUpdated={fetchCatalogs}
                    colorScheme="amber"
                  />
                </div>
              )}
            </div>

            {/* Medications */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950">هل يتناول المريض أدوية أو علاجات منتظمة؟</label>
                <div className="flex gap-1.5">
                  {['لا', 'نعم'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormData({ ...formData, takesMedications: val })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formData.takesMedications === val
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {formData.takesMedications === 'نعم' && (
                <div className="pt-1">
                  <CatalogDropdownInput
                    value={formData.medicationsHistory}
                    onChange={val => setFormData({ ...formData, medicationsHistory: val })}
                    options={savedMedicationsList}
                    placeholder="اكتب اسم الدواء أو اضغط على السهم للاختيار من القائمة..."
                    catalogType="medications"
                    onCatalogUpdated={fetchCatalogs}
                    colorScheme="amber"
                  />
                </div>
              )}
            </div>

            {/* Chronic Diseases & Clinical Notes */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200/50">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>ملاحظات تحت الأمراض والشكاوى الصحية والتشخيص:</span>
              </label>
              <textarea
                rows={2}
                value={formData.chronicDiseasesNotes || ''}
                onChange={e => setFormData({ ...formData, chronicDiseasesNotes: e.target.value })}
                placeholder="سجل أي ملاحظات خاصة بالأمراض المزمنة (ضغط، سكر، غدة...)، شكاوى المريض الصحية، أو ملاحظات الفحص..."
                className="w-full px-3 py-2 bg-white border border-amber-300/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 4: Bad Habits */}
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/70 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-200/60 pb-1.5">
              <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-rose-600" />
                <span>العادات الغذائية واليومية غير الصحية</span>
              </h4>
              <span className="text-[10px] text-rose-700 font-bold">حدد ما ينطبق على المريض</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.chipsy ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.chipsy}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, chipsy: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🥔 شيبسي ومقرمشات</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.cola ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.cola}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, cola: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🥤 كولا ومياه غازية</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.sweets ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.sweets}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, sweets: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🍫 حلويات وسكريات</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.nuts ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.nuts}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, nuts: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🥜 مكسرات وتسالي ولب</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.delivery ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.delivery}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, delivery: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🍔 وجبات سريعة ودليفري</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.coffeeTea ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.coffeeTea}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, coffeeTea: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>☕ نسكافيه ومشروبات بسكر</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.lowWater ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.lowWater}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, lowWater: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>💧 قلة شرب الماء</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.lateEating ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.lateEating}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, lateEating: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🌙 أكل متأخر بالليل</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.bakery ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.bakery}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, bakery: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🥐 معجنات ومخبوزات</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.friedFood ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.friedFood}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, friedFood: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🍟 مقليات وأطعمة دسمة</span>
              </label>

              <label className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                formData.badHabits.smoking ? 'bg-rose-100 border-rose-400 text-rose-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={formData.badHabits.smoking}
                  onChange={e => setFormData({
                    ...formData,
                    badHabits: { ...formData.badHabits, smoking: e.target.checked }
                  })}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span>🚬 تدخين أو شيشة</span>
              </label>
            </div>

            <div className="pt-2 border-t border-rose-200/50">
              <input
                type="text"
                value={formData.badHabits.otherHabits || ''}
                onChange={e => setFormData({
                  ...formData,
                  badHabits: { ...formData.badHabits, otherHabits: e.target.value }
                })}
                placeholder="ملاحظات إضافية حول العادات اليومية للمريض..."
                className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          {/* Section 5: Doctor Notes / Chief Complaints */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">ملاحظات سريرية أو شكوى رئيسية</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات أخرى دائمة في ملف المريض..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وتحديث الملف الطبي</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
