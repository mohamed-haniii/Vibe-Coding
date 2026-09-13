import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  UserPlus, 
  Heart, 
  Scissors, 
  Pill, 
  Coffee, 
  Scale, 
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  History,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { CatalogDropdownInput } from './CatalogDropdownInput';

interface HistoricalEntry {
  id: string;
  recordedAt: string;
  weightKg: string;
  heightCm: string;
  fatPercentage: string;
  musclePercentage: string;
  notes: string;
}

interface AddPatientArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (newPatient: any, queueForToday?: boolean) => void;
}

export function AddPatientArchiveModal({
  isOpen,
  onClose,
  onPatientCreated
}: AddPatientArchiveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');

  // Basic & Clinical Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'أنثى',
    age: '',
    heightCm: '',
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

  // Past Historical Measurements Archive list
  const [historicalList, setHistoricalList] = useState<HistoricalEntry[]>([]);

  // Queue for today checkbox
  const [queueForToday, setQueueForToday] = useState(false);

  // Catalogs
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
      setErrorMessage(null);
      // Reset form
      setFormData({
        fullName: '',
        phone: '',
        gender: 'أنثى',
        age: '',
        heightCm: '',
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
      setHistoricalList([]);
      setQueueForToday(false);
      setActiveTab('profile');
    }
  }, [isOpen]);

  const handleAddHistoricalRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setHistoricalList([
      ...historicalList,
      {
        id: Math.random().toString(),
        recordedAt: today,
        weightKg: '',
        heightCm: formData.heightCm || '',
        fatPercentage: '',
        musclePercentage: '',
        notes: ''
      }
    ]);
  };

  const handleRemoveHistoricalRow = (id: string) => {
    setHistoricalList(historicalList.filter(item => item.id !== id));
  };

  const handleHistoricalFieldChange = (id: string, field: keyof HistoricalEntry, val: string) => {
    setHistoricalList(historicalList.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) {
      setErrorMessage('يرجى إدخال اسم المريض ورقم الهاتف');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Filter out empty historical entries
      const validHistorical = historicalList
        .filter(h => h.weightKg && parseFloat(h.weightKg) > 0)
        .map(h => {
          let isoDate = new Date().toISOString();
          if (h.recordedAt) {
            const parsed = new Date(h.recordedAt);
            if (!isNaN(parsed.getTime())) {
              isoDate = parsed.toISOString();
            }
          }
          return {
            recordedAt: isoDate,
            weightKg: parseFloat(h.weightKg),
            heightCm: h.heightCm ? parseFloat(h.heightCm) : (formData.heightCm ? parseFloat(formData.heightCm) : undefined),
            fatPercentage: h.fatPercentage ? parseFloat(h.fatPercentage) : undefined,
            musclePercentage: h.musclePercentage ? parseFloat(h.musclePercentage) : undefined,
            notes: h.notes || undefined
          };
        });

      const newPatient: any = await apiRequest('/patients', {
        method: 'POST',
        body: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age, 10) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
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
          notes: formData.notes,
          historicalMeasurements: validHistorical
        }
      });

      onPatientCreated(newPatient, queueForToday);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في إضافة المريض');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إضافة مريض جديد وتفريغ الأرشيف السابق</h3>
              <p className="text-xs text-teal-100 font-medium">تسجيل البيانات الشخصية والطبية وإدخال سجل الأوزان القديمة من الدفاتر</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>البيانات الشخصية والملف الطبي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل الأوزان والزيارات السابقة (الأرشيف)</span>
            {historicalList.length > 0 && (
              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                {historicalList.length}
              </span>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          
          {activeTab === 'profile' ? (
            <>
              {/* Basic Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200/70 pb-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>البيانات الأساسية للمريض</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم المريض بالكامل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="مثال: ياسمين محمد عبد العزيز"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الهاتف (واتساب) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="مثال: 01012345678"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">النوع / الجنس</label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="أنثى">أنثى</option>
                      <option value="ذكر">ذكر</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">السن / العمر</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={formData.age}
                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                        placeholder="مثال: 29"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-emerald-600"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">سنة</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الطول</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.heightCm}
                        onChange={e => setFormData({ ...formData, heightCm: e.target.value })}
                        placeholder="مثال: 165"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-emerald-600"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">سم</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الوزن المستهدف</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={formData.targetWeightKg}
                        onChange={e => setFormData({ ...formData, targetWeightKg: e.target.value })}
                        placeholder="مثال: 60"
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-800 focus:outline-hidden focus:border-emerald-600"
                      />
                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-emerald-600">كجم</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social & Pregnancy */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/70 space-y-3">
                <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5 border-b border-purple-200/60 pb-1.5">
                  <Heart className="w-4 h-4 text-purple-600" />
                  <span>الحالة الاجتماعية والإنجاب</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-950 mb-1">الحالة الاجتماعية</label>
                    <div className="flex gap-1.5">
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

              {/* Surgical & Medications with Dropdown Arrows */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-3.5">
                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-1.5">
                  <Scissors className="w-4 h-4 text-amber-600" />
                  <span>العمليات الجراحية السابقة والأدوية المنتظمة</span>
                </h4>

                {/* Operations */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950">هل أجرى عمليات سابقة؟</label>
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
                    <label className="text-xs font-bold text-amber-950">هل يتناول أدوية بانتظام؟</label>
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

              {/* Bad Habits */}
              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/70 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-200/60 pb-1.5">
                  <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-rose-600" />
                    <span>العادات الغذائية واليومية غير الصحية</span>
                  </h4>
                  <span className="text-[10px] text-rose-700 font-bold">حدد ما ينطبق</span>
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
                    <span>🥜 مكسرات وتسالي</span>
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
                    <span>🍔 وجبات سريعة</span>
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
                    <span>🥐 معجنات وفينو</span>
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
                    <span>🍟 مقليات ودسم</span>
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
                    placeholder="ملاحظات أو عادات غذائية أخرى..."
                    className="w-full px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Historical Measurements Tab */
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-700" />
                    <span>تفريغ سجل الأوزان والزيارات السابقة من الدفاتر القديمة</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium mt-1 leading-relaxed">
                    أدخل قياسات وأوزان المريض في التواريخ السابقة لبناء منحنى الوزن وتاريخ المريض بالكامل في العيادة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddHistoricalRow}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة وزن وتاريخ سابق</span>
                </button>
              </div>

              {historicalList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-3">
                  <Scale className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">لا توجد قياسات سابقة مضافة بعد</p>
                  <p className="text-[11px] text-slate-400">
                    إذا كان المريض مسجلاً لديك في دفاتر سابقة، اضغط على زر "إضافة وزن وتاريخ سابق" لإدخال تواريخ وزنه السابقة.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddHistoricalRow}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة أول وزن سابق</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {historicalList.map((item, idx) => (
                    <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3 relative group">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-black">
                            {idx + 1}
                          </span>
                          <span>قياس وزيارة سابقة</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveHistoricalRow(item.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer p-1 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف السطر</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">تاريخ القياس السابق</label>
                          <input
                            type="date"
                            value={item.recordedAt}
                            onChange={e => handleHistoricalFieldChange(item.id, 'recordedAt', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-600">الوزن (كجم) *</label>
                            {(() => {
                              if (idx > 0 && historicalList[idx - 1]?.weightKg && item.weightKg) {
                                const prevW = parseFloat(historicalList[idx - 1].weightKg);
                                const currW = parseFloat(item.weightKg);
                                if (!isNaN(prevW) && !isNaN(currW) && prevW > 0 && currW > 0) {
                                  const diff = parseFloat((currW - prevW).toFixed(1));
                                  if (diff < 0) {
                                    return (
                                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                        📉 نزول {Math.abs(diff)} كجم
                                      </span>
                                    );
                                  } else if (diff > 0) {
                                    return (
                                      <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                                        📈 زيادة +{diff} كجم
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300">
                                        ⚖️ ثبات
                                      </span>
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                          </div>
                          <input
                            type="number"
                            step="0.1"
                            required
                            value={item.weightKg}
                            onChange={e => handleHistoricalFieldChange(item.id, 'weightKg', e.target.value)}
                            placeholder="مثال: 94.5"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-900 focus:outline-hidden focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">نسبة الدهون % InBody</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.fatPercentage}
                            onChange={e => handleHistoricalFieldChange(item.id, 'fatPercentage', e.target.value)}
                            placeholder="اختياري"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">نسبة العضل %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.musclePercentage}
                            onChange={e => handleHistoricalFieldChange(item.id, 'musclePercentage', e.target.value)}
                            placeholder="اختياري"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={e => handleHistoricalFieldChange(item.id, 'notes', e.target.value)}
                          placeholder="ملاحظات الزيارة السابقة أو النظام الغذائي الذي تم تطبيقه حينها..."
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Today's Queue Option */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-blue-950 block">حجز كشف اليوم في قائمة الانتظار الحالية</span>
                <span className="text-[10px] text-blue-700 font-medium">إذا كان المريض حاضراً الآن بالعيادة ويرغب في الدخول للطبيبة اليوم بعد حفظ بياناته</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={queueForToday}
                onChange={e => setQueueForToday(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              {activeTab === 'profile' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>الانتقال لإدخال الأوزان السابقة ({historicalList.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-800 bg-slate-100 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>العودة للبيانات الشخصية</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ المريض والأرشيف بالكامل</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
