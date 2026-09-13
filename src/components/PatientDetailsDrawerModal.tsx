import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  Activity, 
  Scale, 
  Stethoscope, 
  Pill, 
  Scissors, 
  Heart, 
  Baby, 
  FileText, 
  MessageSquare, 
  Printer, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Info,
  ExternalLink,
  Receipt,
  UserCheck,
  Coffee,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { EditPatientMedicalModal } from './EditPatientMedicalModal';
import { AddPastWeightModal } from './AddPastWeightModal';
import { PrintPatientReportModal } from './PrintPatientReportModal';

interface PatientDetailsDrawerModalProps {
  patientId: number | null;
  onClose: () => void;
  onPatientUpdated?: () => void;
  onQueueForToday?: (patientId: number) => void;
}

export const PatientDetailsDrawerModal: React.FC<PatientDetailsDrawerModalProps> = ({
  patientId,
  onClose,
  onPatientUpdated,
  onQueueForToday
}) => {
  const [patientData, setPatientData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'medical' | 'measurements' | 'visits'>('personal');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddWeightModalOpen, setIsAddWeightModalOpen] = useState<boolean>(false);
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchPatientDetails = async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await apiRequest(`/patients/${patientId}`);
      setPatientData(data);
    } catch (err) {
      console.error('Failed to load patient full details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [patientId]);

  if (!patientId) return null;

  const handlePrintProfile = () => {
    setIsPrintReportModalOpen(true);
  };

  const calculateWeightDiff = () => {
    if (!patientData || !patientData.measurementsHistory || patientData.measurementsHistory.length < 2) {
      return null;
    }
    const measurements = patientData.measurementsHistory;
    const firstWeight = measurements[0]?.weightKg;
    const latestWeight = measurements[measurements.length - 1]?.weightKg;
    if (firstWeight && latestWeight) {
      const diff = parseFloat((latestWeight - firstWeight).toFixed(1));
      return {
        firstWeight,
        latestWeight,
        diff,
        isLoss: diff < 0
      };
    }
    return null;
  };

  const weightStats = calculateWeightDiff();

  const handleDeletePatient = async () => {
    if (!patientId) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/patients/${patientId}`, { method: 'DELETE' });
      setActionSuccess('تم حذف ملف المريض وكافة بياناته نهائياً بنجاح');
      if (onPatientUpdated) onPatientUpdated();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'فشل في حذف ملف المريض');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white p-5 sm:p-6 shrink-0 relative">
            <button
              onClick={onClose}
              className="absolute left-4 top-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold">جاري تحميل بيانات وسجلات المريض...</span>
              </div>
            ) : patientData ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-inner">
                    {patientData.gender === 'ذكر' ? '👨' : '👩'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black">{patientData.fullName}</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-mono font-bold tracking-wider">
                        {patientData.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        patientData.gender === 'ذكر' ? 'bg-sky-500/30 text-sky-100' : 'bg-pink-500/30 text-pink-100'
                      }`}>
                        {patientData.gender}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-blue-100 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-mono font-bold">
                        <Phone className="w-3.5 h-3.5" />
                        {patientData.phone}
                      </span>
                      {patientData.age && (
                        <span>السن: <strong>{patientData.age} سنة</strong></span>
                      )}
                      {patientData.occupation && (
                        <span>المهنة: <strong>{patientData.occupation}</strong></span>
                      )}
                      <span>تاريخ التسجيل: {new Date(patientData.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>

                {/* Quick actions top bar */}
                <div className="flex items-center gap-2 flex-wrap sm:self-center">
                  <a
                    href={`https://wa.me/2${patientData.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    title="محادثة واتساب"
                  >
                    <span>💬 واتساب</span>
                  </a>
                  
                  <button
                    onClick={() => setIsPrintReportModalOpen(true)}
                    className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    title="تصدير تقرير طبي شامل أو طباعة PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>تقرير طبي PDF</span>
                  </button>

                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل الملف</span>
                  </button>

                  {onQueueForToday && (
                    <button
                      onClick={() => {
                        onQueueForToday(patientData.id);
                        setActionSuccess('تمت إضافة المريض لدور انتظار اليوم بنجاح');
                        setTimeout(() => setActionSuccess(null), 3500);
                      }}
                      className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>كشف اليوم</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-rose-200 text-sm font-bold">تعذر العثور على بيانات المريض</div>
            )}
          </div>

          {actionSuccess && (
            <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-black flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionSuccess}</span>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-4 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'personal'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>البيانات الشخصية</span>
            </button>

            <button
              onClick={() => setActiveTab('medical')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'medical'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>التاريخ الطبي والعادات</span>
              {(patientData?.hasOperations || patientData?.takesMedications) && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('measurements')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'measurements'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>سجل الأوزان و InBody</span>
              {patientData?.measurementsHistory?.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px]">
                  {patientData.measurementsHistory.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('visits')}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'visits'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>سجل الزيارات والكشوفات</span>
              {patientData?.visits?.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]">
                  {patientData.visits.length}
                </span>
              )}
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold">جاري جلب تفاصيل السجل...</p>
              </div>
            ) : patientData ? (
              <>
                {/* TAB 1: Personal Details */}
                {activeTab === 'personal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">كود المريض (الملف)</span>
                        <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">{patientData.code}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">الاسم الرباعي</span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100">{patientData.fullName}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">رقم الهاتف</span>
                        <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-100">{patientData.phone}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">السن وتاريخ الميلاد</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {patientData.age ? `${patientData.age} سنة` : 'غير محدد'}
                          {patientData.dateOfBirth && ` (${patientData.dateOfBirth})`}
                        </span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">النوع / الجنس</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{patientData.gender}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">الطول والوزن المستهدف</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {patientData.heightCm ? `${patientData.heightCm} سم` : 'الطول: -'} | {patientData.targetWeightKg ? `الهدف: ${patientData.targetWeightKg} كجم` : 'الهدف: -'}
                        </span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">الحالة الاجتماعية</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{patientData.maritalStatus || 'غير محدد'}</span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">الأطفال والولادات</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {patientData.hasChildren ? `نعم (${patientData.childrenCount || 0} أطفال)` : 'لا يوجد'}
                        </span>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 text-[11px] block font-bold">الحمل والرضاعة</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {patientData.isPregnant ? '🤰 حامل' : ''}
                          {patientData.isLactating ? ' 🍼 مرضعة' : ''}
                          {!patientData.isPregnant && !patientData.isLactating && 'لا يوجد'}
                        </span>
                      </div>
                    </div>

                    {/* Notes block */}
                    {patientData.notes && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs">
                        <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1">ملاحظات عامة مسجلة بالملف:</span>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{patientData.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Medical History & Lifestyle */}
                {activeTab === 'medical' && (
                  <div className="space-y-4">
                    {/* Operations */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <Scissors className="w-4 h-4 text-purple-600" />
                        <span>العمليات الجراحية السابقة:</span>
                      </div>
                      {patientData.hasOperations ? (
                        <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 font-bold">
                          {patientData.operationsHistory || 'يوجد عمليات سابقة مسجلة'}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">لا يوجد عمليات جراحية سابقة مسجلة.</p>
                      )}
                    </div>

                    {/* Medications */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>الأدوية والأمراض المزمنة:</span>
                      </div>
                      {patientData.takesMedications ? (
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-950 dark:text-blue-200 font-bold">
                          {patientData.medicationsHistory || 'يوجد أدوية منتظمة'}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">لا يتناول أدوية مزمنة منتظمة.</p>
                      )}
                    </div>

                    {/* Bad Habits */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs">
                        <Coffee className="w-4 h-4 text-amber-600" />
                        <span>العادات غير الصحية والغذائية:</span>
                      </div>
                      {patientData.badHabits ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          {Object.entries(patientData.badHabits).map(([key, val]) => {
                            if (!val || val === 'NONE') return null;
                            const habitLabels: Record<string, string> = {
                              cola: 'مشروبات غازية',
                              chepcy: 'شيبسي ومقرمشات',
                              sweets: 'حلويات وسكريات',
                              nuts: 'مكسرات وتسالي',
                              delivery: 'وجبات سريعة / دليفري',
                              smoking: 'تدخين',
                              lateDinner: 'أكل متأخر قبل النوم',
                              lowWater: 'قلة شرب المياه'
                            };
                            return (
                              <div key={key} className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 font-bold">
                                <span>{habitLabels[key] || key}: </span>
                                <span className="text-[11px] text-amber-700 dark:text-amber-300 font-normal">{String(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">لا توجد عادات مسجلة.</p>
                      )}
                    </div>

                    {/* Chief Complaints & Regimes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">الشكوى الرئيسية وأهداف التخسيس:</span>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{patientData.chiefComplaints || 'غير محدد'}</p>
                      </div>

                      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">تجارب وأنظمة تخسيس / إبر صينية سابقة:</span>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">{patientData.pastAcupunctureRegimes || 'لا يوجد'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Measurements & InBody History */}
                {activeTab === 'measurements' && (
                  <div className="space-y-4">
                    {/* Top Weight Progress Summary */}
                    {weightStats && (
                      <div className="bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/40 dark:to-teal-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">وزن البداية:</span>
                            <span className="text-lg font-black text-slate-800 dark:text-slate-200">{weightStats.firstWeight} كجم</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">الوزن الحالي:</span>
                            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{weightStats.latestWeight} كجم</span>
                          </div>
                        </div>

                        <div className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 ${
                          weightStats.isLoss 
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300' 
                            : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300'
                        }`}>
                          {weightStats.isLoss ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          <span>
                            {weightStats.isLoss ? `نزول إجمالي: ${Math.abs(weightStats.diff)} كجم 📉` : `زيادة: +${weightStats.diff} كجم 📈`}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        جدول القياسات وفحوصات InBody المسجلة ({patientData.measurementsHistory?.length || 0}):
                      </span>
                      <button
                        onClick={() => setIsAddWeightModalOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة وزن سابق / InBody</span>
                      </button>
                    </div>

                    {patientData.measurementsHistory && patientData.measurementsHistory.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black">
                            <tr>
                              <th className="p-3">#</th>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">نوع الزيارة</th>
                              <th className="p-3">الوزن (كجم)</th>
                              <th className="p-3">BMI</th>
                              <th className="p-3">الدهون %</th>
                              <th className="p-3">العضلات %</th>
                              <th className="p-3">المياه %</th>
                              <th className="p-3">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {patientData.measurementsHistory.map((m: any, idx: number) => (
                              <tr key={m.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-3 font-mono font-bold">{idx + 1}</td>
                                <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                  {m.recordedAt ? new Date(m.recordedAt).toLocaleDateString('ar-EG') : '-'}
                                </td>
                                <td className="p-3">{m.visitTypeName || 'كشف'}</td>
                                <td className="p-3 font-black text-blue-600 dark:text-blue-400 font-mono text-sm">
                                  {m.weightKg} كجم
                                </td>
                                <td className="p-3 font-mono">{m.bmi || '-'}</td>
                                <td className="p-3 font-mono">{m.fatPercentage ? `${m.fatPercentage}%` : '-'}</td>
                                <td className="p-3 font-mono">{m.musclePercentage ? `${m.musclePercentage}%` : '-'}</td>
                                <td className="p-3 font-mono">{m.waterPercentage ? `${m.waterPercentage}%` : '-'}</td>
                                <td className="p-3 text-slate-500">{m.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
                        لا يوجد قياسات مسجلة لهذا المريض حتى الآن.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Visits History */}
                {activeTab === 'visits' && (
                  <div className="space-y-3">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                      سجل جميع الكشوفات والزيارات السابقة ({patientData.visits?.length || 0}):
                    </span>

                    {patientData.visits && patientData.visits.length > 0 ? (
                      <div className="space-y-2.5">
                        {patientData.visits.map((v: any, idx: number) => (
                          <div
                            key={v.id || idx}
                            className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-xs">
                                  {v.visitTypeName || 'كشف'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(v.createdAt).toLocaleDateString('ar-EG', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  المبلغ: <strong>{v.price} ج.م</strong> ({v.paymentMethod || 'كاش'})
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {v.status === 'Completed' ? 'مكتمل ✅' : v.status}
                                </span>
                              </div>
                            </div>

                            {/* Doctor notes during visit */}
                            {v.doctorNotes && (
                              <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                                <span className="font-bold text-purple-700 dark:text-purple-300 block mb-1">
                                  ملاحظات الدكتورة والنظام الموصوف:
                                </span>
                                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{v.doctorNotes}</p>
                              </div>
                            )}

                            {v.cashierName && (
                              <div className="text-[11px] text-slate-400">
                                استقبل بواسطة: {v.cashierName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
                        لا توجد زيارات مسجلة للمريض.
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintProfile}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الملف</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="حذف ملف المريض وجميع كشوفاته نهائياً"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف ملف المريض</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-right">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                تأكيد حذف ملف المريض نهائياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هل أنت متأكد من رغبتك في حذف ملف المريض (<strong>{patientData?.fullName}</strong> - كود: {patientData?.code})؟
              </p>
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-[11px] text-rose-700 dark:text-rose-300 font-bold mt-2">
                ⚠️ تحذير: سيتم حذف جميع الكشوفات، الدفعات، والقياسات المسجلة لهذا المريض نهائياً ولا يمكن التراجع عن هذه العملية!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePatient}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، حذف المريض نهائياً'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <EditPatientMedicalModal
          isOpen={true}
          patientId={patientId}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={() => {
            setIsEditModalOpen(false);
            fetchPatientDetails();
            if (onPatientUpdated) onPatientUpdated();
          }}
        />
      )}

      {/* Add Past Weight Modal */}
      {isAddWeightModalOpen && (
        <AddPastWeightModal
          isOpen={true}
          patientId={patientId}
          patientName={patientData?.fullName || ''}
          onClose={() => setIsAddWeightModalOpen(false)}
          onSaved={() => {
            setIsAddWeightModalOpen(false);
            fetchPatientDetails();
            if (onPatientUpdated) onPatientUpdated();
          }}
        />
      )}

      {/* Print / Export Full Medical Report Modal */}
      {isPrintReportModalOpen && patientId && (
        <PrintPatientReportModal
          patientId={patientId}
          onClose={() => setIsPrintReportModalOpen(false)}
        />
      )}
    </>
  );
};
