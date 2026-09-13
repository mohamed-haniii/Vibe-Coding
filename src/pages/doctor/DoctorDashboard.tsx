import React, { useState, useEffect } from 'react';
import { apiRequest, getSocket } from '../../api/client';
import { Visit, DietPlan } from '../../types';
import { WeightChart } from '../../components/WeightChart';
import { DietPlansModal } from '../../components/DietPlansModal';
import { PrintDietPlanModal } from '../../components/PrintDietPlanModal';
import { EditPatientMedicalModal } from '../../components/EditPatientMedicalModal';
import { AddPatientArchiveModal } from '../../components/AddPatientArchiveModal';
import { AddPastWeightModal } from '../../components/AddPastWeightModal';
import { useSocket } from '../../contexts/SocketContext';
import { 
  Stethoscope, 
  Users, 
  Clock, 
  CheckCircle2, 
  Play, 
  FileText, 
  Activity, 
  Trash2,
  Utensils,
  Plus,
  BookmarkPlus,
  Sparkles,
  Printer,
  Download,
  Scale,
  MessageSquare,
  X,
  Heart,
  Baby,
  Pill,
  Scissors,
  Coffee,
  Info,
  UserCheck,
  Target,
  Edit3,
  History,
  UserPlus,
  ShieldCheck
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const [queue, setQueue] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const selectedVisitRef = React.useRef<Visit | null>(null);

  useEffect(() => {
    selectedVisitRef.current = selectedVisit;
  }, [selectedVisit]);

  const [patientHistory, setPatientHistory] = useState<any | null>(null);
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Modals State
  const [isEditPatientOpen, setIsEditPatientOpen] = useState<boolean>(false);
  const [isAddPastWeightOpen, setIsAddPastWeightOpen] = useState<boolean>(false);
  const [isAddPatientArchiveOpen, setIsAddPatientArchiveOpen] = useState<boolean>(false);

  const [cancelConfirmTarget, setCancelConfirmTarget] = useState<{ visitId: number; patientName: string } | null>(null);
  const [savePlanPromptOpen, setSavePlanPromptOpen] = useState<boolean>(false);
  const [newPlanTitleInput, setNewPlanTitleInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-save draft notes per visit to prevent accidental loss
  useEffect(() => {
    if (selectedVisit?.id) {
      localStorage.setItem(`doctor_notes_draft_${selectedVisit.id}`, doctorNotes);
    }
  }, [doctorNotes, selectedVisit?.id]);

  // Measurement Edit State (Doctor can enter or edit weight, fat %, muscle %, water %, bone mass)
  const [showMeasurementModal, setShowMeasurementModal] = useState<boolean>(false);
  const [editWeightKg, setEditWeightKg] = useState<string>('');
  const [editHeightCm, setEditHeightCm] = useState<string>('');
  const [editFatPct, setEditFatPct] = useState<string>('');
  const [editMusclePct, setEditMusclePct] = useState<string>('');
  const [editWaterPct, setEditWaterPct] = useState<string>('');
  const [editBoneMass, setEditBoneMass] = useState<string>('');

  const handleOpenMeasurementModal = () => {
    if (!selectedVisit) return;
    const m = selectedVisit.currentMeasurement;
    setEditWeightKg(m?.weightKg ? m.weightKg.toString() : '');
    setEditHeightCm(m?.heightCm ? m.heightCm.toString() : '');
    setEditFatPct(m?.fatPercentage ? m.fatPercentage.toString() : '');
    setEditMusclePct(m?.musclePercentage ? m.musclePercentage.toString() : '');
    setEditWaterPct(m?.waterPercentage ? m.waterPercentage.toString() : '');
    setEditBoneMass(m?.boneMass ? m.boneMass.toString() : '');
    setShowMeasurementModal(true);
  };

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    if (!editWeightKg || parseFloat(editWeightKg) <= 0) {
      setErrorMessage('يرجى كتابة قياس الوزن (كجم)');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/visits/${selectedVisit.id}/measurement`, {
        method: 'PUT',
        body: {
          weightKg: parseFloat(editWeightKg),
          heightCm: editHeightCm ? parseFloat(editHeightCm) : undefined,
          fatPercentage: editFatPct ? parseFloat(editFatPct) : undefined,
          musclePercentage: editMusclePct ? parseFloat(editMusclePct) : undefined,
          waterPercentage: editWaterPct ? parseFloat(editWaterPct) : undefined,
          boneMass: editBoneMass ? parseFloat(editBoneMass) : undefined,
        }
      });

      setSuccessMessage('تم تحديث القياسات الحيوية ونسبة الدهون والجسم بنجاح!');
      setTimeout(() => setSuccessMessage(null), 4000);
      setShowMeasurementModal(false);
      fetchQueue();
      if (selectedVisit) {
        handleRefreshPatientHistory(selectedVisit.patientId);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حفظ القياسات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Maintenance (Stabilization) Mode Toggle
  const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState<boolean>(false);

  const handleToggleMaintenanceMode = async () => {
    if (!selectedVisit) return;
    setIsUpdatingMaintenance(true);
    try {
      const isCurrentlyMaintenance = Boolean(patientHistory?.isMaintenanceMode);
      const nextState = !isCurrentlyMaintenance;
      const targetWeight = selectedVisit.currentMeasurement?.weightKg || patientHistory?.latestMeasurement?.weightKg || null;

      await apiRequest(`/patients/${selectedVisit.patientId}/maintenance`, {
        method: 'PUT',
        body: {
          isMaintenanceMode: nextState,
          targetWeight: targetWeight
        }
      });

      setPatientHistory((prev: any) => prev ? {
        ...prev,
        isMaintenanceMode: nextState,
        maintenanceTargetWeight: targetWeight,
        maintenanceStartDate: nextState ? new Date().toISOString() : null
      } : prev);

      setSuccessMessage(nextState ? 'تم تفعيل نظام التثبيت لهذا المريض بنجاح! 🛡️' : 'تم إيقاف نظام التثبيت للمريض بنجاح.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في تحديث حالة التثبيت');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsUpdatingMaintenance(false);
    }
  };

  // BMI Category Calculator Helper
  const getBmiDetails = (bmi: number) => {
    if (bmi < 18.5) return { category: 'نحافة', color: 'text-sky-700 bg-sky-50 border-sky-200', textClass: 'text-sky-700' };
    if (bmi < 25) return { category: 'وزن طبيعي ومثالي', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', textClass: 'text-emerald-700' };
    if (bmi < 30) return { category: 'زيادة في الوزن', color: 'text-amber-700 bg-amber-50 border-amber-200', textClass: 'text-amber-700' };
    if (bmi < 35) return { category: 'سمنة درجة أولى', color: 'text-orange-700 bg-orange-50 border-orange-200', textClass: 'text-orange-700' };
    return { category: 'سمنة مفرطة', color: 'text-rose-700 bg-rose-50 border-rose-200', textClass: 'text-rose-700' };
  };

  // Diet Plans State
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [showDietPlansModal, setShowDietPlansModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printAutoMode, setPrintAutoMode] = useState<'print' | 'pdf' | 'whatsapp' | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const { isConnected } = useSocket();

  // Load Queue & Diet Plans
  const fetchQueue = async () => {
    try {
      const data = await apiRequest<Visit[]>('/visits/queue');
      const safeQueue = Array.isArray(data) ? data : [];
      setQueue(safeQueue);

      if (safeQueue.length > 0) {
        const currentSelectedId = selectedVisitRef.current?.id;
        const matchingVisit = currentSelectedId ? safeQueue.find(v => v.id === currentSelectedId) : null;

        if (matchingVisit) {
          // Keep current selection with updated data
          setSelectedVisit(matchingVisit);
          selectedVisitRef.current = matchingVisit;
        } else {
          // Currently selected visit was cancelled or no visit selected yet -> select first in queue
          handleSelectVisit(safeQueue[0]);
        }
      } else {
        setSelectedVisit(null);
        selectedVisitRef.current = null;
        setPatientHistory(null);
        setDoctorNotes('');
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
      setQueue([]);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const fetchDietPlans = async () => {
    try {
      const plans = await apiRequest<DietPlan[]>('/diet-plans');
      setDietPlans(Array.isArray(plans) ? plans : []);
    } catch (err) {
      console.error('Failed to load diet plans:', err);
      setDietPlans([]);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchDietPlans();

    // Listen for real-time events to auto-refresh queue instantly
    const socket = getSocket();
    const handleRefresh = () => {
      fetchQueue();
    };

    socket.on('new-visit-in-queue', handleRefresh);
    socket.on('visit-status-changed', handleRefresh);
    socket.on('consultation-completed', handleRefresh);
    socket.on('shift-opened', handleRefresh);
    socket.on('shift-closed', handleRefresh);
    socket.on('diet-plans-updated', fetchDietPlans);

    // Fast polling fallback every 3 seconds for rock-solid sync
    const interval = setInterval(fetchQueue, 3000);

    return () => {
      clearInterval(interval);
      socket.off('new-visit-in-queue', handleRefresh);
      socket.off('visit-status-changed', handleRefresh);
      socket.off('consultation-completed', handleRefresh);
      socket.off('shift-opened', handleRefresh);
      socket.off('shift-closed', handleRefresh);
      socket.off('diet-plans-updated', fetchDietPlans);
    };
  }, []);

  // When Doctor selects a patient from queue
  const handleSelectVisit = async (visit: Visit) => {
    setSelectedVisit(visit);
    selectedVisitRef.current = visit;
    const savedDraft = localStorage.getItem(`doctor_notes_draft_${visit.id}`);
    setDoctorNotes(savedDraft !== null ? savedDraft : (visit.doctorNotes || ''));
    setIsLoadingHistory(true);

    try {
      const historyData: any = await apiRequest(`/patients/${visit.patientId}`);
      setPatientHistory(historyData);

      // If no current draft or visit notes exist, prefill from patient's persistent notes or previous visit notes
      if (!savedDraft && !visit.doctorNotes && historyData) {
        const lastVisitWithNotes = historyData.visits?.find((v: any) => v.doctorNotes && v.doctorNotes.trim());
        const persistentNotes = historyData.notes || (lastVisitWithNotes ? lastVisitWithNotes.doctorNotes : '');
        if (persistentNotes) {
          setDoctorNotes(persistentNotes);
        }
      }
    } catch (err) {
      console.error('Failed to load patient history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Trigger Cancel Visit Modal
  const handleCancelVisit = (visitId: number, patientName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCancelConfirmTarget({ visitId, patientName });
  };

  // Execute Cancel Visit
  const executeCancelVisit = async () => {
    if (!cancelConfirmTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const { visitId, patientName } = cancelConfirmTarget;

    try {
      await apiRequest(`/visits/${visitId}/cancel`, {
        method: 'PUT'
      });

      setSuccessMessage(`تم مسح وإلغاء الزيارة للمريض ${patientName} من قائمة الانتظار بنجاح.`);
      setTimeout(() => setSuccessMessage(null), 4000);

      if (selectedVisit?.id === visitId) {
        setSelectedVisit(null);
        selectedVisitRef.current = null;
        setPatientHistory(null);
        setDoctorNotes('');
      }

      setCancelConfirmTarget(null);
      fetchQueue();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في إلغاء الزيارة من قائمة الانتظار');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reload patient history after editing or adding measurements
  const handleRefreshPatientHistory = async (patientId?: number) => {
    const pId = patientId || selectedVisit?.patientId;
    if (!pId) return;
    try {
      const data: any = await apiRequest(`/patients/${pId}`);
      setPatientHistory(data);
    } catch (err) {
      console.error('Failed to reload patient history:', err);
    }
  };

  // Start Consultation
  const handleStartConsultation = async (targetVisit?: Visit, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const visit = targetVisit || selectedVisit;
    if (!visit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const visitId = visit.id;
    const patientName = visit.patientName;

    // Optimistic UI update immediately
    if (selectedVisit?.id === visitId || !selectedVisit) {
      setSelectedVisit(prev => prev ? { ...prev, status: 'InConsultation' } : { ...visit, status: 'InConsultation' });
    }
    setQueue(prev => prev.map(v => v.id === visitId ? { ...v, status: 'InConsultation' } : v));

    if (!selectedVisit || selectedVisit.id !== visitId) {
      await handleSelectVisit(visit);
    }

    try {
      await apiRequest(`/visits/${visitId}/start-consultation`, {
        method: 'PUT'
      });
      setSuccessMessage(`تم بدء الكشف واستدعاء المريض (${patientName})، جاري الفحص وتدوين الملاحظات.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      fetchQueue();
    } catch (err: any) {
      console.error('Start consultation error:', err);
      setErrorMessage(err.message || 'فشل في بدء الكشف، يرجى إعادة المحاولة');
      setTimeout(() => setErrorMessage(null), 4000);
      fetchQueue();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Callback when patient is registered via archive modal
  const handlePatientCreatedFromArchive = (newPatient: any, queueForToday?: boolean) => {
    setSuccessMessage(`تم تسجيل المريض "${newPatient.fullName}" وتفريغ أرشيف الأوزان السابقة بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchQueue();
  };

  // Complete Consultation
  const handleCompleteConsultation = async () => {
    if (!selectedVisit) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const visitId = selectedVisit.id;
    const patientName = selectedVisit.patientName;

    try {
      await apiRequest(`/visits/${visitId}/complete`, {
        method: 'PUT',
        body: { doctorNotes }
      });

      setSuccessMessage(`تم إغلاق وحفظ كشف المريض (${patientName}) بنجاح!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      localStorage.removeItem(`doctor_notes_draft_${visitId}`);
      setSelectedVisit(null);
      selectedVisitRef.current = null;
      setPatientHistory(null);
      setDoctorNotes('');
      fetchQueue();

    } catch (err: any) {
      console.error('Complete consultation error:', err);
      setErrorMessage(err.message || 'فشل في حفظ وإغلاق الكشف');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Insert Diet Plan into Notes
  const handleApplyDietPlan = (planIdStr: string) => {
    setSelectedPlanId(planIdStr);
    if (!planIdStr) return;

    const plan = dietPlans.find(p => p.id === parseInt(planIdStr, 10));
    if (plan) {
      const formatted = `=== ${plan.title} ===\n${plan.content}`;
      if (doctorNotes.trim()) {
        setDoctorNotes(prev => `${prev}\n\n${formatted}`);
      } else {
        setDoctorNotes(formatted);
      }
    }
  };

  // Trigger New Diet Plan Modal
  const handleSaveNotesAsNewDietPlan = () => {
    if (!doctorNotes.trim()) {
      setErrorMessage('يرجى كتابة نص النظام الغذائي في الملاحظات أولاً قبل الحفظ نموذج جديد');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    setNewPlanTitleInput('نظام غذائي مخصص');
    setSavePlanPromptOpen(true);
  };

  // Execute Save Diet Plan
  const executeSaveDietPlan = async () => {
    if (!newPlanTitleInput.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/diet-plans', {
        method: 'POST',
        body: {
          title: newPlanTitleInput.trim(),
          content: doctorNotes.trim()
        }
      });

      setSuccessMessage(`تم حفظ النظام الغذائي "${newPlanTitleInput.trim()}" بنجاح في القوائم الجاهزة!`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setSavePlanPromptOpen(false);
      setNewPlanTitleInput('');
      fetchDietPlans();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حفظ النظام الجديد');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const queueList = Array.isArray(queue) ? queue : [];
  const waitingCount = queueList.filter(q => q && q.status === 'Waiting').length;
  const inConsultationCount = queueList.filter(q => q && q.status === 'InConsultation').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-right space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">شاشة الدكتورة — قائمة الانتظار والكشف الطبي</h2>
            <p className="text-xs text-slate-500 font-medium">متابعة الوزن لحظياً، السجل الطبي الكامل، وكتابة الملاحظات العلاجية</p>
          </div>
        </div>

        {/* Counter Pills & Add Patient Button */}
        <div className="flex flex-wrap items-center gap-3 dir-rtl">
          <button
            type="button"
            onClick={() => setIsAddPatientArchiveOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة مريض جديد / تفريغ الأرشيف 📋</span>
          </button>

          <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold">في الانتظار: <span className="text-sm font-black text-blue-700">{waitingCount}</span></span>
          </div>

          <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-xs font-bold">في الكشف: <span className="text-sm font-black text-amber-700">{inConsultationCount}</span></span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid Layout: Queue (4 Cols) + Consultation Workspace (8 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Waiting Queue Cards Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>قائمة المرضى المنتظرين اليوم</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono font-bold">
                {queueList.length} مرضى
              </span>
            </div>

            {isLoadingQueue ? (
              <div className="py-12 text-center text-slate-400 text-xs">جاري تحميل قائمة الانتظار...</div>
            ) : queueList.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400">
                لا يوجد مرضى في قائمة الانتظار حالياً.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {queueList.map((visit) => {
                  const isSelected = selectedVisit?.id === visit.id;
                  const isInConsultation = visit.status === 'InConsultation';

                  return (
                    <div
                      key={visit.id}
                      onClick={() => handleSelectVisit(visit)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-right space-y-2 relative overflow-hidden ${
                        isSelected
                          ? 'bg-purple-50/80 border-purple-500 shadow-md'
                          : isInConsultation
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isSelected && (
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-purple-600" />
                      )}

                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-base font-extrabold text-slate-900 leading-tight">
                            {visit.patientName}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            كود: <span className="font-mono font-bold">{visit.patientCode}</span> • {visit.visitTypeName}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="w-7 h-7 bg-slate-900 text-white font-black text-xs rounded-xl flex items-center justify-center">
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

                      {/* Weight comparison pill */}
                      {visit.currentMeasurement && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-xs">
                          <span className="text-slate-600 font-semibold">
                            الوزن اليوم: <strong className="text-purple-900 font-bold">{visit.currentMeasurement.weightKg} كجم</strong>
                          </span>

                          {visit.weightChangeDelta !== undefined && (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                              visit.weightChangeDelta <= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {visit.weightChangeDelta <= 0 ? '↓ ' : '↑ '}
                              {visit.weightChangeDelta > 0 ? `+${visit.weightChangeDelta}` : visit.weightChangeDelta} كجم
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Action Controls: Start Consultation + Details */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                        {visit.status === 'Waiting' ? (
                          <button
                            type="button"
                            onClick={(e) => handleStartConsultation(visit, e)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                            title="بدء الكشف واستدعاء المريض إلى غرفة الكشف الآن"
                          >
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>بدء الكشف 🩺</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-xl flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span>في الكشف الآن</span>
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-700 font-bold">{visit.price} ج.م</span>
                          <button
                            type="button"
                            onClick={(e) => handleCancelVisit(visit.id, visit.patientName, e)}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-0.5 cursor-pointer"
                            title="مسح المريض من قائمة الانتظار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">إلغاء</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

        {/* Active Consultation Workspace Column */}
        <div className="lg:col-span-8 space-y-6">
          {selectedVisit ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
              
              {/* Patient Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-purple-950 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-500/30 text-purple-200 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border border-purple-400/30">
                      {selectedVisit.patientCode}
                    </span>
                    <h3 className="text-xl font-black">{selectedVisit.patientName}</h3>
                  </div>
                  <p className="text-xs text-slate-300 font-medium flex items-center gap-2">
                    <span>الهاتف: {selectedVisit.patientPhone}</span>
                    <span>•</span>
                    <span>نوع الكشف: {selectedVisit.visitTypeName}</span>
                  </p>
                </div>

                {/* Consultation Status Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Maintenance Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleMaintenanceMode}
                    disabled={isUpdatingMaintenance}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                      patientHistory?.isMaintenanceMode
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
                    }`}
                    title={patientHistory?.isMaintenanceMode ? 'المريض مسجل بنظام التثبيت - اضغط للإيقاف' : 'تفعيل نظام التثبيت لهذا المريض'}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{patientHistory?.isMaintenanceMode ? '🛡️ نظام التثبيت (مُفعّل)' : '🛡️ تفعيل التثبيت'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCancelVisit(selectedVisit.id, selectedVisit.patientName, e)}
                    className="px-3 py-2 bg-rose-500/20 text-rose-200 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-rose-400/30 cursor-pointer"
                    title="مسح من قائمة الانتظار"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>إلغاء الزيارة</span>
                  </button>

                  {selectedVisit.status === 'Waiting' ? (
                    <button
                      onClick={() => handleStartConsultation()}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>بدء الكشف ودخول المريض 🩺</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-xl border border-amber-400/30 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span>جاري الكشف حالياً</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Maintenance Mode Info Banner */}
              {patientHistory?.isMaintenanceMode && (
                <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>المريض في مرحلة التثبيت والحفاظ على الوزن • يتم احتساب سعر كشف التثبيت تلقائياً عند التسجيل بالاستقبال</span>
                  </div>
                  {patientHistory.maintenanceTargetWeight && (
                    <span className="bg-emerald-500/40 border border-emerald-400/50 px-2.5 py-0.5 rounded-lg font-mono text-[11px] text-white">
                      الوزن المثبت: {patientHistory.maintenanceTargetWeight} كجم
                    </span>
                  )}
                </div>
              )}

              {/* Patient Clinical, Social, Surgical & Lifestyle History Profile */}
              {patientHistory && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-right">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span>الملف الطبي والاجتماعي والعادات اليومية للمريض</span>
                    </span>

                    {/* Quick Edit & Add Past Weight Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditPatientOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="تعديل العادات والعمليات والأدوية والبيانات الطبية"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل السجل والعادات ✏️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsAddPastWeightOpen(true)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title="إضافة وزن وتاريخ قديم للمريض"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>+ إضافة وزن سابق للأرشيف 📜</span>
                      </button>
                    </div>
                  </div>

                  {/* Badges row: Age, Gender, Target Weight, Social, Children, Pregnant/Lactating */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">العمر / السن</span>
                      <span className="text-xs font-black text-slate-800">
                        {patientHistory.age ? `${patientHistory.age} سنة` : (patientHistory.dateOfBirth ? `${new Date().getFullYear() - new Date(patientHistory.dateOfBirth).getFullYear()} سنة` : 'غير مسجل')}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">الوزن المستهدف</span>
                      <span className="text-xs font-black text-emerald-700">
                        {patientHistory.targetWeightKg ? `${patientHistory.targetWeightKg} كجم` : 'لم يحدد'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">الحالة الاجتماعية والأطفال</span>
                      <span className="text-xs font-bold text-purple-900">
                        {patientHistory.maritalStatus || 'متزوج'}
                        {patientHistory.hasChildren ? ` • (${patientHistory.childrenCount || 1} أطفال)` : ' • لا يوجد أطفال'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">الحمل والرضاعة</span>
                      <span className="text-xs font-bold text-slate-800">
                        {patientHistory.gender === 'ذكر' ? 'غير متطابق' : (
                          <>
                            {patientHistory.isPregnant ? <span className="text-rose-600 font-black">حامل 🤰</span> : 'لا يوجد حمل'}
                            {' • '}
                            {patientHistory.isLactating ? <span className="text-blue-600 font-bold">ترضع طبيعياً 🍼</span> : 'لا ترضع'}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Surgical & Medical History */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                        <Scissors className="w-3.5 h-3.5 text-amber-700" />
                        <span>العمليات الجراحية السابقة:</span>
                      </div>
                      <p className="text-xs font-bold text-amber-950">
                        {patientHistory.hasOperations && patientHistory.operationsHistory?.trim()
                          ? patientHistory.operationsHistory
                          : (patientHistory.hasOperations ? 'أجرى عمليات سابقة' : 'لا توجد عمليات جراحية سابقة')}
                      </p>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-black text-blue-900">
                        <Pill className="w-3.5 h-3.5 text-blue-700" />
                        <span>الأدوية والعلاجات المنتظمة:</span>
                      </div>
                      <p className="text-xs font-bold text-blue-950">
                        {patientHistory.takesMedications && patientHistory.medicationsHistory?.trim()
                          ? patientHistory.medicationsHistory
                          : (patientHistory.takesMedications ? 'يتناول أدوية بانتظام' : 'لا يتناول أدوية منتظمة')}
                      </p>
                    </div>
                  </div>

                  {/* Bad Lifestyle Habits (Last Box from form) */}
                  {(() => {
                    let habits: any = null;
                    if (patientHistory.badHabits) {
                      try {
                        habits = typeof patientHistory.badHabits === 'string'
                          ? JSON.parse(patientHistory.badHabits)
                          : patientHistory.badHabits;
                      } catch (e) {
                        habits = null;
                      }
                    }

                    const activeHabits = [];
                    if (habits?.chipsy) activeHabits.push({ label: '🥔 شيبسي ومقرمشات', color: 'bg-rose-100 text-rose-800 border-rose-200' });
                    if (habits?.cola) activeHabits.push({ label: '🥤 كولا ومياه غازية', color: 'bg-rose-100 text-rose-800 border-rose-200' });
                    if (habits?.sweets) activeHabits.push({ label: '🍫 حلويات وسكريات', color: 'bg-amber-100 text-amber-800 border-amber-200' });
                    if (habits?.nuts) activeHabits.push({ label: '🥜 تسالي ومكسرات ولب', color: 'bg-orange-100 text-orange-800 border-orange-200' });
                    if (habits?.delivery) activeHabits.push({ label: '🍔 أكل دليفري وجاهز', color: 'bg-red-100 text-red-800 border-red-200' });
                    if (habits?.coffeeTea) activeHabits.push({ label: '☕ نسكافيه ومشروبات بسكر', color: 'bg-amber-100 text-amber-800 border-amber-200' });
                    if (habits?.lowWater) activeHabits.push({ label: '💧 قلة شرب الماء', color: 'bg-sky-100 text-sky-800 border-sky-200' });
                    if (habits?.lateEating) activeHabits.push({ label: '🌙 أكل متأخر بالليل', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' });
                    if (habits?.bakery) activeHabits.push({ label: '🥐 معجنات وفينو ومخبوزات', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' });
                    if (habits?.friedFood) activeHabits.push({ label: '🍟 مقليات وأطعمة دسمة', color: 'bg-orange-100 text-orange-800 border-orange-200' });
                    if (habits?.smoking) activeHabits.push({ label: '🚬 تدخين أو شيشة', color: 'bg-slate-200 text-slate-800 border-slate-300' });

                    return (
                      <div className="bg-rose-50/50 border border-rose-200/70 p-2.5 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                          <Coffee className="w-3.5 h-3.5 text-rose-700" />
                          <span>العادات الغذائية واليومية غير الصحية:</span>
                        </div>
                        {activeHabits.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activeHabits.map((h, i) => (
                              <span key={i} className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${h.color}`}>
                                {h.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-slate-500">لا توجد عادات غير صحية مسجلة</p>
                        )}
                        {habits?.otherHabits && typeof habits.otherHabits === 'string' && habits.otherHabits.trim() && (
                          <p className="text-xs font-bold text-slate-700 bg-white/80 p-1.5 rounded-lg border border-slate-200 mt-1">
                            <span className="text-rose-700 font-extrabold">ملاحظات إضافية: </span>
                            {habits.otherHabits}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Patient Weight & Measurement Overview Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <span>قياسات الجسم والوزن الحالية (InBody)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleOpenMeasurementModal}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs rounded-xl border border-purple-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إدخال / تعديل قياسات InBody</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">الوزن الحالي اليوم</span>
                    <span className="text-xl font-black text-purple-700">
                      {selectedVisit.currentMeasurement?.weightKg || '--'} <span className="text-xs font-normal">كجم</span>
                    </span>
                  </div>

                  {/* BMI Indicator Card */}
                  {(() => {
                    const curW = selectedVisit.currentMeasurement?.weightKg || 0;
                    const curH = selectedVisit.currentMeasurement?.heightCm || patientHistory?.heightCm || 0;
                    const curBmi = (curW > 0 && curH > 0) ? parseFloat((curW / Math.pow(curH / 100, 2)).toFixed(1)) : (selectedVisit.currentMeasurement?.bmi || null);
                    const bmiInfo = curBmi ? getBmiDetails(curBmi) : null;
                    return (
                      <div className={`p-3.5 rounded-2xl border ${bmiInfo ? bmiInfo.color : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[11px] font-bold block mb-1">مؤشر كتلة الجسم (BMI)</span>
                        {curBmi ? (
                          <div>
                            <span className="text-xl font-black">{curBmi} <span className="text-[10px] font-normal">كجم/م²</span></span>
                            <span className="block text-[11px] font-black mt-0.5">{bmiInfo?.category}</span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-400">--</span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">نسبة الدهون</span>
                    <span className="text-xl font-black text-rose-700">
                      {selectedVisit.currentMeasurement?.fatPercentage ? `${selectedVisit.currentMeasurement.fatPercentage}%` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">نسبة العضلات</span>
                    <span className="text-xl font-black text-emerald-700">
                      {selectedVisit.currentMeasurement?.musclePercentage ? `${selectedVisit.currentMeasurement.musclePercentage}%` : '--'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-1">نسبة المياه والعظام</span>
                    <span className="text-xs font-bold text-slate-800 block mt-1">
                      💧 {selectedVisit.currentMeasurement?.waterPercentage ? `${selectedVisit.currentMeasurement.waterPercentage}%` : '--'} • 🦴 {selectedVisit.currentMeasurement?.boneMass ? `${selectedVisit.currentMeasurement.boneMass} كجم` : '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight Progression Chart */}
              {patientHistory && patientHistory.measurementsHistory && (
                <WeightChart data={patientHistory.measurementsHistory} />
              )}

              {/* Past Visits and InBody Measurement History Table */}
              {patientHistory && patientHistory.measurementsHistory && patientHistory.measurementsHistory.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 dir-rtl text-right">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>سجل القياسات الحيوية والزيارات السابقة للمريض ({patientHistory.measurementsHistory.length} قياس مسجل)</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-200/60 text-slate-700 font-extrabold text-[11px]">
                          <th className="p-2.5 rounded-r-xl">تاريخ الزيارة</th>
                          <th className="p-2.5">نوع الكشف</th>
                          <th className="p-2.5">الوزن (كجم)</th>
                          <th className="p-2.5">الدهون (%)</th>
                          <th className="p-2.5">العضلات (%)</th>
                          <th className="p-2.5">المياه (%)</th>
                          <th className="p-2.5 rounded-l-xl">العظام (كجم)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-800">
                        {patientHistory.measurementsHistory.slice().reverse().map((m: any, idx: number) => (
                          <tr key={m.id || idx} className="hover:bg-purple-50/50 transition-colors">
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">
                              {m.recordedAt ? new Date(m.recordedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'سابق'}
                            </td>
                            <td className="p-2.5 font-bold text-purple-900">{m.visitTypeName || 'كشف'}</td>
                            <td className="p-2.5 font-black text-purple-700">{m.weightKg} كجم</td>
                            <td className="p-2.5 font-bold text-rose-700">{m.fatPercentage ? `${m.fatPercentage}%` : '--'}</td>
                            <td className="p-2.5 font-bold text-emerald-700">{m.musclePercentage ? `${m.musclePercentage}%` : '--'}</td>
                            <td className="p-2.5 text-blue-700">{m.waterPercentage ? `${m.waterPercentage}%` : '--'}</td>
                            <td className="p-2.5 text-slate-700">{m.boneMass ? `${m.boneMass} كجم` : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Doctor Notes & Diet Plan */}
              <div className="space-y-3 pt-2">
                
                {/* Diet Plan Selection Toolbar */}
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <Utensils className="w-4 h-4 text-purple-700" />
                      <span>اختيار نظام غذائي جاهز:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowDietPlansModal(true)}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إدارة وعرض الأنظمة الجاهزة ({dietPlans.length})</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handleApplyDietPlan(e.target.value)}
                      className="flex-1 w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
                    >
                      <option value="">-- اختاري نظام غذائي لإدراج نصّه تلقائياً --</option>
                      {dietPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleSaveNotesAsNewDietPlan}
                      className="w-full sm:w-auto px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
                      title="حفظ النص المكتوب بالملاحظات أسفله كنموذج جديد"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      <span>حفظ الملاحظات كنظام جديد</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>الملاحظات الطبية والنظام الغذائي للكشف الحالي:</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintAutoMode('whatsapp');
                          setShowPrintModal(true);
                        }}
                        disabled={!doctorNotes.trim()}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          doctorNotes.trim()
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="تنسيق وإرسال النظام والقياسات عبر الواتساب للمريض"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال واتساب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintAutoMode('pdf');
                          setShowPrintModal(true);
                        }}
                        disabled={!doctorNotes.trim()}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          doctorNotes.trim()
                            ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs shadow-teal-600/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="توليد وتنزيل ملف PDF للنظام الغذائي المختار"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintAutoMode('print');
                          setShowPrintModal(true);
                        }}
                        disabled={!doctorNotes.trim()}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          doctorNotes.trim()
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs shadow-purple-600/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        title="طباعة مباشرة للروشتة والنظام الغذائي"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة مباشرة</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={doctorNotes}
                    onChange={e => setDoctorNotes(e.target.value)}
                    placeholder="اكتبي النظام الغذائي، النصائح، وموعد الإعادة المفضل هنا..."
                    rows={6}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-colors leading-relaxed"
                  />
                </div>

              </div>

              {/* Complete Consultation Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleCompleteConsultation}
                  disabled={isSubmitting}
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition-all active:scale-98 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>حفظ الملاحظات وإغلاق الكشف للزيارة</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 shadow-xs">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">اختر مريضاً من قائمة الانتظار لعرض السجل الطبي ومتابعة الوزن</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                يمكنك الضغط على أي بطاقة مريض في القائمة الجانبية لبدء الكشف أو عرض التغيرات الوزنية السابقة.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Diet Plans Modal */}
      {showDietPlansModal && (
        <DietPlansModal
          onClose={() => setShowDietPlansModal(false)}
          onSelectPlan={(planContent) => {
            if (doctorNotes.trim()) {
              setDoctorNotes(prev => `${prev}\n\n${planContent}`);
            } else {
              setDoctorNotes(planContent);
            }
          }}
        />
      )}

      {/* Print Diet Plan Modal */}
      {showPrintModal && selectedVisit && (
        <PrintDietPlanModal
          patientName={selectedVisit.patientName}
          patientCode={selectedVisit.patientCode}
          patientPhone={selectedVisit.patientPhone}
          currentWeight={selectedVisit.currentMeasurement?.weightKg}
          currentHeight={selectedVisit.currentMeasurement?.heightCm}
          fatPercentage={selectedVisit.currentMeasurement?.fatPercentage}
          musclePercentage={selectedVisit.currentMeasurement?.musclePercentage}
          waterPercentage={selectedVisit.currentMeasurement?.waterPercentage}
          boneMass={selectedVisit.currentMeasurement?.boneMass}
          doctorNotes={doctorNotes}
          dietTitle={selectedPlanId ? dietPlans.find(p => p.id === parseInt(selectedPlanId))?.title || 'النظام الغذائي المخصص' : 'النظام الغذائي والتعليمات الصحية'}
          dietContent={doctorNotes}
          autoPrint={printAutoMode === 'print'}
          autoPdf={printAutoMode === 'pdf'}
          initialTab={printAutoMode === 'whatsapp' ? 'whatsapp' : 'print'}
          onClose={() => {
            setShowPrintModal(false);
            setPrintAutoMode(null);
          }}
        />
      )}

      {/* Cancel Visit Confirmation Modal */}
      {cancelConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">إلغاء ومسح الكشف من الانتظار</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">تأكيد الإزالة الفورية من القائمة</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              هل أنتِ متأكدة من مسح وإلغاء كشف المريض <span className="text-purple-600 dark:text-purple-400 font-black">({cancelConfirmTarget.patientName})</span> من قائمة الانتظار؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirmTarget(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إلغاء والتراجع
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
                <span>تأكيد المسح الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Custom Diet Plan Prompt Modal */}
      {savePlanPromptOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-2xl">
                <BookmarkPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">حفظ نظام غذائي جديد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">إضافة الملاحظات لقائمة الأنظمة الجاهزة</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">اسم النظام الغذائي الجديد:</label>
              <input
                type="text"
                value={newPlanTitleInput}
                onChange={(e) => setNewPlanTitleInput(e.target.value)}
                placeholder="مثلاً: نظام الدايت القاسي - الأسبوع الأول"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSavePlanPromptOpen(false);
                  setNewPlanTitleInput('');
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeSaveDietPlan}
                disabled={!newPlanTitleInput.trim() || isSubmitting}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>حفظ النموذج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor InBody Measurement Modal */}
      {showMeasurementModal && selectedVisit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form onSubmit={handleSaveMeasurement} className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 dir-rtl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">إدخال / تعديل قياسات المريض (InBody)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">تسجيل الوزن ونسب الدهون والعضلات والماء</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMeasurementModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700">
              <div className="space-y-1">
                <label className="block text-slate-900">الوزن الحالي (كجم) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editWeightKg}
                  onChange={(e) => setEditWeightKg(e.target.value)}
                  placeholder="مثال: 78.5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-900">الطول (سم)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editHeightCm}
                  onChange={(e) => setEditHeightCm(e.target.value)}
                  placeholder="مثال: 168"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-900">نسبة الدهون (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editFatPct}
                  onChange={(e) => setEditFatPct(e.target.value)}
                  placeholder="مثال: 28.4"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-900">نسبة العضلات (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editMusclePct}
                  onChange={(e) => setEditMusclePct(e.target.value)}
                  placeholder="مثال: 32.1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-900">نسبة المياه (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editWaterPct}
                  onChange={(e) => setEditWaterPct(e.target.value)}
                  placeholder="مثال: 52.0"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-900">كتلة العظام (كجم)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editBoneMass}
                  onChange={(e) => setEditBoneMass(e.target.value)}
                  placeholder="مثال: 2.8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Live Interactive BMI Scale Card */}
            {(() => {
              const wNum = parseFloat(editWeightKg);
              const hNum = parseFloat(editHeightCm) || (patientHistory?.heightCm ? parseFloat(patientHistory.heightCm) : 0);
              const liveBmi = (wNum > 0 && hNum > 0) ? parseFloat((wNum / Math.pow(hNum / 100, 2)).toFixed(1)) : null;
              const bmiInfo = liveBmi ? getBmiDetails(liveBmi) : null;

              return (
                <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  bmiInfo ? bmiInfo.color : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/80 shadow-xs flex items-center justify-center font-bold text-slate-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold block">مؤشر كتلة الجسم التفاعلي (BMI)</span>
                      <span className="text-xs font-black">
                        {liveBmi ? `التصنيف: ${bmiInfo?.category}` : 'اكتب الوزن والطول ليتم حساب المؤشر لحظياً'}
                      </span>
                    </div>
                  </div>
                  {liveBmi ? (
                    <div className="text-right font-mono">
                      <span className="text-2xl font-black">{liveBmi}</span>
                      <span className="text-[10px] block font-bold text-slate-600">كجم/م²</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">--</span>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMeasurementModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>حفظ القياسات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Patient Medical, Lifestyle, Surgical & Bad Habits Modal */}
      {selectedVisit && (
        <EditPatientMedicalModal
          isOpen={isEditPatientOpen}
          onClose={() => setIsEditPatientOpen(false)}
          patientId={selectedVisit.patientId}
          initialData={patientHistory}
          onUpdated={() => {
            handleRefreshPatientHistory(selectedVisit.patientId);
            setSuccessMessage('تم تحديث السجل الطبي والعادات والأدوية بنجاح!');
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Add Single Past Historical Weight Record Modal */}
      {selectedVisit && (
        <AddPastWeightModal
          isOpen={isAddPastWeightOpen}
          onClose={() => setIsAddPastWeightOpen(false)}
          patientId={selectedVisit.patientId}
          patientName={selectedVisit.patientName}
          onAdded={() => {
            handleRefreshPatientHistory(selectedVisit.patientId);
            fetchQueue();
            setSuccessMessage('تمت إضافة الوزن السابق إلى سجل وأرشيف المريض بنجاح!');
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* Register New Patient with Full Archive & Past Weights History Modal */}
      <AddPatientArchiveModal
        isOpen={isAddPatientArchiveOpen}
        onClose={() => setIsAddPatientArchiveOpen(false)}
        onPatientCreated={handlePatientCreatedFromArchive}
      />

    </div>
  );
};
