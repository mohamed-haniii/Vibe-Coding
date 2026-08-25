import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, getSocket } from '../../api/client';
import { VisitType, Patient, SmartPricingResult } from '../../types';
import { ShiftModal } from './ShiftModal';
import { 
  Search, 
  UserPlus, 
  Receipt, 
  DollarSign, 
  Lock, 
  Clock, 
  Scale, 
  Ruler, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Sparkles,
  Phone,
  UserCheck,
  Trash2,
  Users,
  ShieldCheck,
  Calendar,
  Info
} from 'lucide-react';

export const ReceptionDashboard: React.FC = () => {
  const { currentShift, refreshCurrentShift, user } = useAuth();
  
  // States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [smartPricing, setSmartPricing] = useState<SmartPricingResult | null>(null);
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  const [selectedVisitTypeId, setSelectedVisitTypeId] = useState<number>(1);
  const [liveQueue, setLiveQueue] = useState<any[]>([]);
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<{ visitId: number; patientName: string } | null>(null);
  
  // Visit Measurements Input
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [fatPercentage, setFatPercentage] = useState<string>('');
  const [musclePercentage, setMusclePercentage] = useState<string>('');
  const [waterPercentage, setWaterPercentage] = useState<string>('');
  const [boneMass, setBoneMass] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay'>('cash');

  // UI Modals & Alerts
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Patient Form State
  const [newPatientData, setNewPatientData] = useState({
    fullName: '',
    phone: '',
    gender: 'أنثى',
    dateOfBirth: '',
    heightCm: '',
    notes: ''
  });

  const fetchLiveQueue = async () => {
    try {
      const q = await apiRequest<any[]>('/visits/queue');
      setLiveQueue(Array.isArray(q) ? q : []);
    } catch (err) {
      console.error('Failed to load reception live queue:', err);
    }
  };

  const executeCancelVisit = async () => {
    if (!cancelConfirmTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/visits/${cancelConfirmTarget.visitId}/cancel`, {
        method: 'PUT'
      });

      setSuccessMessage(`تم إلغاء واسترجاع رسوم الكشف للمريض (${cancelConfirmTarget.patientName}) ومسحه من قائمة الانتظار.`);
      setTimeout(() => setSuccessMessage(null), 4000);

      setCancelConfirmTarget(null);
      fetchLiveQueue();
      refreshCurrentShift();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في إلغاء الزيارة من قائمة الانتظار');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Visit Types and set up Real-Time listeners for Shift and Queue sync
  useEffect(() => {
    async function loadVisitTypes() {
      try {
        const types = await apiRequest<VisitType[]>('/visits/types');
        setVisitTypes(types);
        if (types.length > 0) {
          setSelectedVisitTypeId(types[0].id);
        }
      } catch (err) {
        console.error('Failed to load visit types:', err);
      }
    }
    loadVisitTypes();
    refreshCurrentShift();
    fetchLiveQueue();

    const socket = getSocket();
    const handleSync = () => {
      refreshCurrentShift();
      fetchLiveQueue();
    };

    socket.on('new-visit-in-queue', handleSync);
    socket.on('visit-status-changed', handleSync);
    socket.on('consultation-completed', handleSync);
    socket.on('shift-opened', handleSync);
    socket.on('shift-closed', handleSync);
    socket.on('settings-updated', loadVisitTypes);

    const interval = setInterval(() => {
      refreshCurrentShift();
      fetchLiveQueue();
    }, 3000);

    return () => {
      clearInterval(interval);
      socket.off('new-visit-in-queue', handleSync);
      socket.off('visit-status-changed', handleSync);
      socket.off('consultation-completed', handleSync);
      socket.off('shift-opened', handleSync);
      socket.off('shift-closed', handleSync);
      socket.off('settings-updated', loadVisitTypes);
    };
  }, []);

  // Search Patients
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const results = await apiRequest(`/patients/search?q=${encodeURIComponent(searchQuery.trim())}`);
          setSearchResults(results);
        } catch (err) {
          console.error('Search failed:', err);
        }
      } else {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // When selecting a patient
  const handleSelectPatient = async (p: any) => {
    setSelectedPatient(p);
    setSearchResults([]);
    setSearchQuery('');
    if (p.heightCm) {
      setHeightCm(p.heightCm.toString());
    } else if (p.latestMeasurement && p.latestMeasurement.heightCm) {
      setHeightCm(p.latestMeasurement.heightCm.toString());
    } else {
      setHeightCm('');
    }
    setWeightKg('');

    // Auto detect smart pricing and pre-select recommended visit type
    try {
      const res = await apiRequest<SmartPricingResult>(`/visits/smart-pricing/${p.id}`);
      setSmartPricing(res);
      if (res && res.recommendedVisitTypeId) {
        setSelectedVisitTypeId(res.recommendedVisitTypeId);
      }
    } catch (err) {
      console.error('Failed to fetch smart pricing for patient:', err);
    }
  };

  // Re-evaluate smart pricing when changing visit type selection
  useEffect(() => {
    if (selectedPatient) {
      async function refreshPricing() {
        try {
          const res = await apiRequest<SmartPricingResult>(`/visits/smart-pricing/${selectedPatient.id}?visitTypeId=${selectedVisitTypeId}`);
          setSmartPricing(res);
        } catch (err) {
          console.error('Failed to refresh smart pricing:', err);
        }
      }
      refreshPricing();
    } else {
      setSmartPricing(null);
    }
  }, [selectedVisitTypeId]);

  // Register New Patient
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientData.fullName || !newPatientData.phone) {
      setErrorMessage('اسم المريض ورقم الهاتف مطلوبان');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdPatient = await apiRequest('/patients', {
        method: 'POST',
        body: newPatientData
      });

      setSelectedPatient(createdPatient);
      setShowNewPatientModal(false);
      setSuccessMessage(`تم إضافة المريض الجديد بنجاح (كود: ${createdPatient.code})`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Prefill height if exists
      if (createdPatient.heightCm) {
        setHeightCm(createdPatient.heightCm.toString());
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في تسجيل المريض');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register Visit & Payment
  const handleRegisterVisit = async () => {
    if (!currentShift) {
      setShowShiftModal(true);
      return;
    }

    if (!selectedPatient) {
      setErrorMessage('برجاء اختيار المريض أولاً');
      return;
    }

    if (!weightKg || parseFloat(weightKg) <= 0) {
      setErrorMessage('يرجى إدخال وزن المريض الحالي (كجم)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Generate unique idempotency key for financial safety
    const idempotencyKey = `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await apiRequest('/visits', {
        method: 'POST',
        body: {
          patientId: selectedPatient.id,
          visitTypeId: selectedVisitTypeId,
          weightKg: parseFloat(weightKg),
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          fatPercentage: fatPercentage ? parseFloat(fatPercentage) : undefined,
          musclePercentage: musclePercentage ? parseFloat(musclePercentage) : undefined,
          waterPercentage: waterPercentage ? parseFloat(waterPercentage) : undefined,
          boneMass: boneMass ? parseFloat(boneMass) : undefined,
          paymentMethod,
          idempotencyKey
        }
      });

      setSuccessMessage(`تم تسجيل زيارة المريض ${result.patientName} والدفع بنجاح! رقم الدور: #${result.queueNumber}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Reset selection
      setSelectedPatient(null);
      setWeightKg('');
      setHeightCm('');
      setFatPercentage('');
      setMusclePercentage('');
      setWaterPercentage('');
      setBoneMass('');
      setPaymentMethod('cash');
      refreshCurrentShift();

    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في تسجيل الزيارة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current selected visit type official price
  const selectedTypeObj = visitTypes.find(t => t.id === selectedVisitTypeId);
  const currentOfficialPrice = smartPricing ? smartPricing.finalPrice : (selectedTypeObj ? selectedTypeObj.price : 0);

  // Auto calculate BMI for UI preview
  const weightNum = parseFloat(weightKg);
  const heightNum = parseFloat(heightCm);
  let bmiPreview: number | null = null;
  if (weightNum > 0 && heightNum > 0) {
    const hM = heightNum / 100;
    bmiPreview = parseFloat((weightNum / (hM * hM)).toFixed(1));
  }

  // Weight Change Delta Calculation against previous visit
  let weightDelta: number | null = null;
  if (selectedPatient && selectedPatient.latestMeasurement && selectedPatient.latestMeasurement.weightKg && weightNum > 0) {
    weightDelta = parseFloat((weightNum - selectedPatient.latestMeasurement.weightKg).toFixed(1));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-right space-y-6">
      
      {/* Top Banner: Shift Status & Quick Action */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">مكتب الاستقبال والكاشير</h2>
            <p className="text-xs text-slate-500 font-medium">تسجيل الزيارات، حساب السعر التلقائي من السيرفر، وتحديث قائمة الانتظار</p>
          </div>
        </div>

        {/* Shift Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="text-left md:text-right">
            <span className="text-[11px] text-slate-400 block font-semibold">إجمالي الشيفت الحالي</span>
            <span className="text-base font-black text-emerald-600">
              {currentShift ? `${currentShift.totalAmount} ج.م (${currentShift.totalVisits} زيارة)` : 'الشيفت مغلق'}
            </span>
          </div>

          <button
            onClick={() => setShowShiftModal(true)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 ${
              currentShift
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{currentShift ? 'إدارة الشيفت الحالي' : 'فتح شيفت جديد'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Patient Selection & Visit Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Right Column: Search & Patient Profile (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Patient Search & Add Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span>البحث عن مريض</span>
              </h3>

              <button
                type="button"
                onClick={() => setShowNewPatientModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>تسجيل مريض جديد</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الكود (P-0001)، أو رقم الهاتف..."
                className="w-full pl-3 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            {/* Search Results Dropdown List */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="w-full p-3 text-right hover:bg-blue-50/60 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">{p.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{p.phone}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {p.code}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Patient Card */}
            {selectedPatient ? (
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-blue-950 space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-sm text-blue-950">{selectedPatient.fullName}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-blue-800 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                    {selectedPatient.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-blue-900 pt-1">
                  <div>
                    <span className="text-blue-600 font-semibold block">رقم الهاتف:</span>
                    <span className="font-bold">{selectedPatient.phone}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-semibold block">الجنس:</span>
                    <span className="font-bold">{selectedPatient.gender}</span>
                  </div>
                </div>

                {/* Active Visit Duplicate Payment Warning */}
                {selectedPatient.activeVisit ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-rose-900 space-y-1 mt-2">
                    <div className="flex items-center gap-2 font-black text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>تنبيه: المريض مسجل بالفعل في قائمة الانتظار الحالية!</span>
                    </div>
                    <p className="text-[11px] font-bold text-rose-800 leading-relaxed">
                      دور رقم: <strong className="text-rose-950">#{selectedPatient.activeVisit.queueNumber}</strong> ({selectedPatient.activeVisit.visitTypeName}) - الحالة: <span className="underline">{selectedPatient.activeVisit.status === 'Waiting' ? 'منتظر دور الدكتورة' : 'في غرفة الكشف'}</span>
                    </p>
                    <p className="text-[10px] font-medium text-rose-600">
                      تم منع تكرار الدفع لحماية الكاشير والمريض من تحصيل الرسوم مرتين لنفس الزيارة.
                    </p>
                  </div>
                ) : selectedPatient.latestMeasurement ? (
                  <div className="bg-white rounded-xl p-3 border border-blue-200/80 mt-2 space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>آخر وزن مسجل:</span>
                      <span className="text-blue-700 font-black">{selectedPatient.latestMeasurement.weightKg} كجم</span>
                    </div>
                    {selectedPatient.latestMeasurement.bmi && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        مؤشر BMI السابق: {selectedPatient.latestMeasurement.bmi}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-blue-800/80 italic pt-1">هذه أول زيارة للمريض (لا يوجد وزن سابق)</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                ابحث أو اختر مريضاً لبدء حجز الكشف وتسجيل الزيارة
              </div>
            )}

          </div>

        </div>

        {/* Left Column: Visit Type, Price, Measurements & Billing (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>تفاصيل الزيارة والتسعير والحساب</span>
              </div>
              {selectedPatient && smartPricing && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                  <span>محرّك احتساب السعر الآلي نشط</span>
                </span>
              )}
            </h3>

            {/* Smart Pricing Auto-Detection Banner */}
            {selectedPatient && smartPricing && (
              <div className={`rounded-2xl p-4 border text-xs space-y-2.5 transition-all shadow-2xs ${
                smartPricing.isDelayed
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-950'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              }`}>
                <div className="flex items-center justify-between font-extrabold gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${smartPricing.isDelayed ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span>الكشف التلقائي لحالة السعر والإعادة:</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                    smartPricing.isDelayed
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {smartPricing.statusBadge}
                  </span>
                </div>

                <div className="text-[11px] font-semibold leading-relaxed space-y-1">
                  {smartPricing.daysSinceLastVisit !== null ? (
                    <p className="flex items-center gap-1.5 text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>المدة المنقضية منذ آخر زيارة: <strong className="font-mono text-xs text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">{smartPricing.daysSinceLastVisit} يوماً</strong> ({smartPricing.lastVisitDate ? new Date(smartPricing.lastVisitDate).toLocaleDateString('ar-EG') : ''})</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-slate-800">
                      <Info className="w-3.5 h-3.5 text-blue-500" />
                      <span>هذا المريض لا يملك أي كشوفات سابقة (يتم احتسابه كـ كشف جديد تلقائياً).</span>
                    </p>
                  )}

                  <div className="pt-2 text-[10px] font-medium text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-t border-slate-200/80 mt-1">
                    <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="block text-[9px] text-slate-400">إعادة شهري (≤ 33 يوم)</span>
                      <strong className="text-emerald-700 font-black">50 ج.م</strong>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="block text-[9px] text-slate-400">تأخير شهر (&gt; 33 يوم)</span>
                      <strong className="text-amber-700 font-black">70 ج.م</strong>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="block text-[9px] text-slate-400">تأخير شهرين (&gt; 60 يوم)</span>
                      <strong className="text-amber-800 font-black">100 ج.م</strong>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg border border-slate-200 text-center">
                      <span className="block text-[9px] text-slate-400">تأخير 3 شهور (&gt; 90 يوم)</span>
                      <strong className="text-purple-700 font-black">كشف جديد (200ج)</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. Choose Visit Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">اختر نوع الزيارة المطلوبة:</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {visitTypes.map((type) => {
                  const isSelected = selectedVisitTypeId === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedVisitTypeId(type.id)}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between h-24 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{type.name}</span>
                      <div className="flex items-center justify-between font-black text-sm dir-ltr">
                        <span>ج.م</span>
                        <span>{type.price}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Official Server Price Display (Strictly Enforced) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-950 block">سعر الزيارة المحدد رسمياً:</span>
                <span className="text-[11px] text-amber-800 font-medium">مستخرج من السيرفر تلقائياً ولا يمكن تعديله يدوياً</span>
              </div>
              <div className="flex items-center gap-2 text-2xl font-black text-amber-900 bg-white px-4 py-2 rounded-xl border border-amber-200 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>{currentOfficialPrice} ج.م</span>
              </div>
            </div>

            {/* 3. Patient Visit Measurements */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>تسجيل قياسات المريض لهذه الزيارة:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Weight Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الوزن الحالي (كجم): *</label>
                  <div className="relative">
                    <Scale className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      placeholder="مثال: 75.5"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Height Input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الطول (سم):</label>
                  <div className="relative">
                    <Ruler className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="number"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      placeholder="مثال: 165"
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

              </div>

              {/* InBody Body Composition Optional Inputs */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">قياسات مكونات الجسم (InBody) - اختياري:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">الدهون (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fatPercentage}
                      onChange={e => setFatPercentage(e.target.value)}
                      placeholder="28.5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">العضلات (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={musclePercentage}
                      onChange={e => setMusclePercentage(e.target.value)}
                      placeholder="32.0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">المياه (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={waterPercentage}
                      onChange={e => setWaterPercentage(e.target.value)}
                      placeholder="51.5"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">العظام (كجم)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={boneMass}
                      onChange={e => setBoneMass(e.target.value)}
                      placeholder="2.7"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">طريقة التحصيل / الدفع:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>💵 كاش (نقداً)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('instapay')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'instapay'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>📱 انستا باي (InstaPay)</span>
                  </button>
                </div>
              </div>

              {/* BMI Preview & Weight Delta Badge */}
              {(bmiPreview || weightDelta !== null) && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {bmiPreview && (
                    <div className="bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">
                      مؤشر الكتلة BMI: <span className="text-blue-700">{bmiPreview}</span>
                    </div>
                  )}

                  {weightDelta !== null && (
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                      weightDelta <= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {weightDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                      <span>تغير الوزن مقارنة بآخر كشف: {weightDelta > 0 ? `+${weightDelta}` : weightDelta} كجم</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. Pay & Register Button */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRegisterVisit}
                disabled={isSubmitting || !selectedPatient || Boolean(selectedPatient.activeVisit)}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                  selectedPatient && !selectedPatient.activeVisit
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20 active:scale-99'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : selectedPatient?.activeVisit ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span>المريض موجود بالفعل بقائمة الانتظار (تم حظر الدفع المكرر)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تسجيل الزيارة ودفع المبلغ ({currentOfficialPrice} ج.م) وارسال لدور الدكتورة</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Live Reception Queue Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 text-right">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">قائمة الانتظار المباشرة اليوم</h3>
              <p className="text-xs text-slate-500">متابعة المرضى المنتظرين في العيادة وإمكانية إلغاء الزيارة عند الحاجة</p>
            </div>
          </div>
          <span className="bg-purple-100 text-purple-800 text-xs font-black px-3 py-1 rounded-full border border-purple-200 font-mono">
            {liveQueue.length} مرضى
          </span>
        </div>

        {liveQueue.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 font-medium">
            لا يوجد مرضى متواجدين بقائمة الانتظار حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveQueue.map((visit) => {
              const isInConsultation = visit.status === 'InConsultation';
              return (
                <div
                  key={visit.id}
                  className={`p-4 rounded-2xl border text-right space-y-2 relative transition-all ${
                    isInConsultation
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 leading-tight">
                        {visit.patientName}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        كود: <span className="font-mono font-bold text-slate-800">{visit.patientCode}</span> • {visit.visitTypeName}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="w-7 h-7 bg-slate-900 text-white font-black text-xs rounded-xl flex items-center justify-center shadow-xs">
                        #{visit.queueNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isInConsultation
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isInConsultation ? 'جاري الكشف' : 'منتظر'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-emerald-700">دفع: {visit.price} ج.م</span>
                    <button
                      type="button"
                      onClick={() => setCancelConfirmTarget({ visitId: visit.id, patientName: visit.patientName })}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="إلغاء الزيارة واسترجاع المبلغ للعميل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إلغاء واسترجاع</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Patient Registration Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>إضافة ملف مريض جديد</span>
              </h3>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الاسم الكامل للمريض: *</label>
                <input
                  type="text"
                  value={newPatientData.fullName}
                  onChange={e => setNewPatientData({ ...newPatientData, fullName: e.target.value })}
                  placeholder="مثال: رانيا علي المحمود"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف: *</label>
                  <input
                    type="text"
                    value={newPatientData.phone}
                    onChange={e => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    placeholder="010xxxxxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الجنس:</label>
                  <select
                    value={newPatientData.gender}
                    onChange={e => setNewPatientData({ ...newPatientData, gender: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="أنثى">أنثى</option>
                    <option value="ذكر">ذكر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ الميلاد:</label>
                  <input
                    type="date"
                    value={newPatientData.dateOfBirth}
                    onChange={e => setNewPatientData({ ...newPatientData, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الطول الابتدائي (سم):</label>
                  <input
                    type="number"
                    value={newPatientData.heightCm}
                    onChange={e => setNewPatientData({ ...newPatientData, heightCm: e.target.value })}
                    placeholder="165"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات أولية:</label>
                <textarea
                  value={newPatientData.notes}
                  onChange={e => setNewPatientData({ ...newPatientData, notes: e.target.value })}
                  placeholder="هدف الوزن أو أي ملاحظات صحية..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المريض'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Cancel Visit Confirmation Modal */}
      {cancelConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">إلغاء واسترجاع الكشف</h3>
                <p className="text-xs text-slate-500">مسح المريض واسترجاع المبلغ للشيفت الحصري</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              هل أنت متأكد من إلغاء كشف المريض <span className="text-purple-600 font-black">({cancelConfirmTarget.patientName})</span> من قائمة الانتظار واسترجاع المبلغ؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirmTarget(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={executeCancelVisit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>تأكيد الإلغاء والاسترجاع</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {showShiftModal && (
        <ShiftModal onClose={() => setShowShiftModal(false)} />
      )}

    </div>
  );
};
