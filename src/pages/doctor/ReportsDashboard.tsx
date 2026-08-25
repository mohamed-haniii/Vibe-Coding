import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { MonthlyReport, ShiftDetailReport, VisitType, DailyReport } from '../../types';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  Calendar, 
  Clock, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Save, 
  CheckCircle2, 
  ShieldAlert,
  TrendingUp,
  Receipt,
  Plus,
  Trash2,
  X,
  AlertCircle,
  PlusCircle,
  Tag,
  Printer,
  FileSpreadsheet,
  Check,
  Search,
  Filter
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'shifts' | 'financial' | 'pricing'>('daily');
  
  // Daily Report States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<DailyReport | null>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState<boolean>(false);

  // Monthly Report States
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null);
  
  // Shifts Data
  const [shiftsData, setShiftsData] = useState<ShiftDetailReport[]>([]);
  const [visitTypes, setVisitTypes] = useState<VisitType[]>([]);
  
  // Delay & Follow-up Pricing Rules State
  const [delayGraceDays, setDelayGraceDays] = useState<number>(33);
  const [delayTier1Days, setDelayTier1Days] = useState<number>(60);
  const [delayTier1Price, setDelayTier1Price] = useState<number>(70);
  const [delayTier2Days, setDelayTier2Days] = useState<number>(90);
  const [delayTier2Price, setDelayTier2Price] = useState<number>(100);
  const [delayRevertNewDays, setDelayRevertNewDays] = useState<number>(90);
  const [isSavingDelayRules, setIsSavingDelayRules] = useState<boolean>(false);
  const [delaySaveSuccess, setDelaySaveSuccess] = useState<string | null>(null);
  const [delaySaveError, setDelaySaveError] = useState<string | null>(null);

  // Visit Types Editing & Creation States
  const [editingVisitTypeId, setEditingVisitTypeId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Expanded Shifts Set
  const [expandedShiftIds, setExpandedShiftIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load Daily Report
  const loadDailyReport = async (dateToLoad: string) => {
    setIsLoadingDaily(true);
    try {
      const data = await apiRequest<DailyReport>(`/reports/daily?date=${dateToLoad}`);
      setDailyData(data);
    } catch (err: any) {
      console.error('Failed to load daily report:', err);
    } finally {
      setIsLoadingDaily(false);
    }
  };

  // Load Monthly Report
  const loadMonthlyReport = async () => {
    try {
      const data = await apiRequest<MonthlyReport>(`/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      setMonthlyData(data);
    } catch (err: any) {
      console.error('Failed to load monthly report:', err);
    }
  };

  // Load All Shifts
  const loadShiftsReport = async () => {
    try {
      const data = await apiRequest<ShiftDetailReport[]>('/shifts/all');
      setShiftsData(data);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
    }
  };

  // Load Visit Types Pricing
  const loadPricing = async () => {
    try {
      const types = await apiRequest<VisitType[]>('/visits/types');
      setVisitTypes(types);
    } catch (err: any) {
      console.error('Failed to load visit types:', err);
    }
  };

  // Load Delay Rules Settings
  const loadDelaySettings = async () => {
    try {
      const settings = await apiRequest<any>('/settings');
      if (settings) {
        setDelayGraceDays(settings.delay_grace_days ?? 33);
        setDelayTier1Days(settings.delay_tier1_days ?? 60);
        setDelayTier1Price(settings.delay_tier1_price ?? 70);
        setDelayTier2Days(settings.delay_tier2_days ?? 90);
        setDelayTier2Price(settings.delay_tier2_price ?? 100);
        setDelayRevertNewDays(settings.delay_revert_new_days ?? 90);
      }
    } catch (err) {
      console.error('Failed to load delay settings:', err);
    }
  };

  const handleSaveDelayRules = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingDelayRules(true);
    setDelaySaveSuccess(null);
    setDelaySaveError(null);

    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: {
          delay_grace_days: delayGraceDays,
          delay_tier1_days: delayTier1Days,
          delay_tier1_price: delayTier1Price,
          delay_tier2_days: delayTier2Days,
          delay_tier2_price: delayTier2Price,
          delay_revert_new_days: delayRevertNewDays
        }
      });
      setDelaySaveSuccess('تم حفظ وتطبيق قواعد تسعير التأخير في الإعادة بنجاح على كامل النظام!');
      setTimeout(() => setDelaySaveSuccess(null), 4000);
    } catch (err: any) {
      setDelaySaveError(err.message || 'حدث خطأ أثناء حفظ قواعد التأخير');
    } finally {
      setIsSavingDelayRules(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadDailyReport(selectedDate),
      loadMonthlyReport(),
      loadShiftsReport(),
      loadPricing(),
      loadDelaySettings()
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [selectedYear, selectedMonth]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadDailyReport(newDate);
  };

  const toggleExpandShift = (shiftId: number) => {
    if (expandedShiftIds.includes(shiftId)) {
      setExpandedShiftIds(expandedShiftIds.filter(id => id !== shiftId));
    } else {
      setExpandedShiftIds([...expandedShiftIds, shiftId]);
    }
  };

  // Start Editing Visit Type
  const handleStartEdit = (vt: VisitType) => {
    setEditingVisitTypeId(vt.id);
    setEditName(vt.name);
    setEditPrice(vt.price.toString());
    setEditDescription(vt.description || '');
    setActionError(null);
  };

  // Save Edit Visit Type
  const handleSaveEdit = async (visitTypeId: number) => {
    if (!editName.trim()) {
      setActionError('يرجى إدخال اسم نوع الكشف / الخانة');
      return;
    }
    if (!editPrice || isNaN(parseFloat(editPrice)) || parseFloat(editPrice) < 0) {
      setActionError('يرجى إدخال سعر صحيح أكبر من أو يساوي الصفر');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await apiRequest(`/admin/visit-types/${visitTypeId}`, {
        method: 'PUT',
        body: {
          name: editName.trim(),
          price: parseFloat(editPrice),
          description: editDescription.trim()
        }
      });

      setSuccessMessage('تم تحديث اسم وسعر نوع الكشف بنجاح!');
      setTimeout(() => setSuccessMessage(null), 3000);

      setEditingVisitTypeId(null);
      loadPricing();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create New Visit Type
  const handleAddNew = async () => {
    if (!newName.trim()) {
      setActionError('يرجى إدخال اسم الخانة / نوع الكشف الجديد');
      return;
    }
    if (!newPrice || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) < 0) {
      setActionError('يرجى إدخال سعر صحيح أكبر من أو يساوي الصفر');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      await apiRequest('/admin/visit-types', {
        method: 'POST',
        body: {
          name: newName.trim(),
          price: parseFloat(newPrice),
          description: newDescription.trim()
        }
      });

      setSuccessMessage('تم إضافة نوع الكشف الجديد بنجاح إلى قائمة العيادة!');
      setTimeout(() => setSuccessMessage(null), 3000);

      setIsAddingNew(false);
      setNewName('');
      setNewPrice('');
      setNewDescription('');
      loadPricing();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء إضافة الخانة الجديدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Deactivate Visit Type
  const handleDeleteVisitType = async (visitTypeId: number, name: string) => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await apiRequest<{ message: string }>(`/admin/visit-types/${visitTypeId}`, {
        method: 'DELETE'
      });
      setSuccessMessage(res.message || 'تم حذف / إخفاء نوع الكشف بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);
      loadPricing();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء محاولة الحذف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintDailyReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-right space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">التقارير اليومية والشهرية وتفاصيل الشيفتات (الأدمن)</h2>
            <p className="text-xs text-slate-500 font-medium">متابعة إيرادات اليوم، كل شيفت كاشير بالتفصيل، والتحكم بالأسعار الرسمية</p>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'daily'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 التقرير اليومي
          </button>

          <button
            onClick={() => setActiveSubTab('shifts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'shifts'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏱️ شيفتات الكاشيرية
          </button>

          <button
            onClick={() => setActiveSubTab('financial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'financial'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 التقرير الشهري
          </button>

          <button
            onClick={() => setActiveSubTab('pricing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'pricing'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏷️ أسعار الكشوفات
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ========================================================
          0. DAILY DETAILED REPORT TAB
      ======================================================== */}
      {activeSubTab === 'daily' && (
        <div className="space-y-6">
          {/* Date Selector & Print Control */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-purple-600 shrink-0" />
              <div className="text-xs font-bold text-slate-800">اختر تاريخ التقرير اليومي:</div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-purple-600"
              />
              <button
                type="button"
                onClick={() => handleDateChange(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                اليوم
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintDailyReport}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير اليوم</span>
            </button>
          </div>

          {/* Daily Stat Cards */}
          {dailyData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-emerald-800 block">إجمالي إيراد اليوم المحصّل</span>
                <div className="text-2xl font-black text-emerald-600">
                  {dailyData.totalRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-emerald-700 pt-1 font-semibold flex items-center justify-between">
                  <span>كاش: {dailyData.cashRevenue} ج</span>
                  <span>انستا باي: {dailyData.instapayRevenue} ج</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">عدد الزيارات الإجمالي</span>
                <div className="text-2xl font-black text-blue-600">
                  {dailyData.totalVisitsCount} <span className="text-xs font-normal">زيارة</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 font-semibold flex items-center justify-between">
                  <span className="text-emerald-600">مكتمل: {dailyData.completedVisitsCount}</span>
                  <span className="text-amber-600">منتظر: {dailyData.waitingVisitsCount}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">إيراد كشف جديد (200 ج)</span>
                <div className="text-2xl font-black text-purple-600">
                  {dailyData.newVisitsRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-purple-700 pt-1 font-semibold">
                  عدد الكشوفات الجديدة: {dailyData.newVisitsCount}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">إيراد الإعادة والمتابعات والتثبيت</span>
                <div className="text-2xl font-black text-amber-600">
                  {dailyData.followupVisitsRevenue + dailyData.maintenanceVisitsRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-amber-700 pt-1 font-semibold flex items-center justify-between">
                  <span>إعادة: {dailyData.followupVisitsCount}</span>
                  <span>تثبيت: {dailyData.maintenanceVisitsCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Visits Table for the Day */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                <span>جدول كشوفات وزيارات اليوم ({selectedDate})</span>
              </h4>
              <span className="text-xs font-bold text-slate-500">
                {dailyData?.visits.length || 0} مريض مسجل
              </span>
            </div>

            {isLoadingDaily ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">جاري تحميل بيانات اليوم...</div>
            ) : !dailyData || dailyData.visits.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد كشوفات أو زيارات مسجلة في هذا التاريخ ({selectedDate})
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3">#</th>
                      <th className="p-3">كود المريض</th>
                      <th className="p-3">اسم المريض</th>
                      <th className="p-3">نوع الكشف</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">حالة الكشف</th>
                      <th className="p-3">الكاشير المسجل</th>
                      <th className="p-3">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {dailyData.visits.map((v, idx) => {
                      const rawDate = v.createdAt;
                      let formattedTime = '-';
                      if (rawDate) {
                        const parsedDate = new Date(typeof rawDate === 'string' && !rawDate.includes('T') ? rawDate.replace(' ', 'T') : rawDate);
                        if (!isNaN(parsedDate.getTime())) {
                          formattedTime = parsedDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                        }
                      }

                      return (
                        <tr key={v.id || idx} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-blue-700 bg-blue-50/50 rounded-lg">{v.patientCode}</td>
                          <td className="p-3 font-extrabold text-slate-900">{v.patientName}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              {v.visitTypeName}
                            </span>
                          </td>
                          <td className="p-3 font-black text-emerald-600 text-sm">{v.price} ج.م</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              v.paymentMethod?.includes('انستا') || v.paymentMethod?.toLowerCase().includes('insta')
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {v.paymentMethod || 'كاش'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : v.status === 'Cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {v.status === 'Completed' ? 'تم الكشف' : v.status === 'Cancelled' ? 'ملغي' : 'في الانتظار'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">{v.cashierName}</td>
                          <td className="p-3 text-slate-500 font-mono dir-ltr text-right">{formattedTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          1. FINANCIAL REPORT TAB (MONTHLY)
      ======================================================== */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6">
          
          {/* Month Selector */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>اختر الشهر والسنة للتقرير:</span>
            </h3>

            <div className="flex items-center gap-3">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>شهر {m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>سنة {y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stat Summary Cards */}
          {monthlyData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">إجمالي الإيرادات الشهري</span>
                <div className="text-2xl font-black text-emerald-600">
                  {monthlyData.totalRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">عدد الزيارات الإجمالي</span>
                <div className="text-2xl font-black text-blue-600">
                  {monthlyData.totalVisitsCount} <span className="text-xs font-normal">زيارة</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">إيراد الكشف الجديد (200 ج.م)</span>
                <div className="text-2xl font-black text-purple-600">
                  {monthlyData.newVisitsRevenue} <span className="text-xs font-normal">ج.م ({monthlyData.newVisitsCount} كشف)</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">إيراد المتابعات والإعادة</span>
                <div className="text-2xl font-black text-amber-600">
                  {monthlyData.followupVisitsRevenue + monthlyData.maintenanceVisitsRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
              </div>
            </div>
          )}

          {/* Daily Breakdown Table */}
          {monthlyData && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>البيان اليومي لحركة العيادة في الشهر</span>
              </h4>

              {monthlyData.dailyBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">لا توجد عمليات مجمعة لهذا الشهر</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">اليوم</th>
                        <th className="p-3">عدد الزيارات المسجلة</th>
                        <th className="p-3">الإيراد اليومي المحصّل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {monthlyData.dailyBreakdown.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono">{row.date}</td>
                          <td className="p-3">{row.dayName}</td>
                          <td className="p-3 font-bold text-blue-700">{row.totalVisits} زيارة</td>
                          <td className="p-3 font-black text-emerald-600">{row.revenue} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          2. CASHIER SHIFTS DETAILED TAB
      ======================================================== */}
      {activeSubTab === 'shifts' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span>سجل الشيفتات التفصيلي للكاشيرية</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              عرض كل شيفت بدخل فيه الكاشير، وقت تسجيل الدخول والخروج، عدد الجلسات، ونوع الزيارات بالتفصيل الدقيق
            </p>
          </div>

          {shiftsData.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">لا توجد شيفتات مسجلة حتى الآن</div>
          ) : (
            <div className="space-y-4">
              {shiftsData.map((shift) => {
                const isExpanded = expandedShiftIds.includes(shift.shiftId);

                return (
                  <div
                    key={shift.shiftId}
                    className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
                  >
                    {/* Shift Summary Header Row */}
                    <div
                      onClick={() => toggleExpandShift(shift.shiftId)}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                          #{shift.shiftId}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900">{shift.cashierName}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            بدء الدخول: {new Date(shift.startTime).toLocaleString('ar-EG')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-semibold">إجمالي حصيلة الشيفت</span>
                          <span className="text-base font-black text-emerald-600">{shift.totalRevenue} ج.م</span>
                        </div>

                        <div className="text-right border-r border-slate-200 pr-4">
                          <span className="text-[11px] text-slate-400 block font-semibold">عدد الزيارات</span>
                          <span className="text-sm font-bold text-blue-700">{shift.totalVisits} زيارة</span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          shift.isOpen
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {shift.isOpen ? 'مفتوح حالياً' : 'مغلق'}
                        </span>

                        <button className="p-1 text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Shift Detailed Items Table */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-3 gap-3 text-xs font-bold text-slate-700 bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                          <div>كشف جديد (200): <span className="text-purple-900 font-black">{shift.newVisitsCount}</span></div>
                          <div>إعادة (50): <span className="text-purple-900 font-black">{shift.followupVisitsCount}</span></div>
                          <div>تثبيت (60): <span className="text-purple-900 font-black">{shift.maintenanceVisitsCount}</span></div>
                        </div>

                        {shift.visits.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center">لم يتم تسجيل أي زيارات في هذا الشيفت</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600 font-bold">
                                  <th className="p-2.5">اسم المريض</th>
                                  <th className="p-2.5">نوع الزيارة</th>
                                  <th className="p-2.5">المبلغ</th>
                                  <th className="p-2.5">الوقت</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                {shift.visits.map((v: any, idx) => {
                                  const pName = v.patientName || v.patient_name || '-';
                                  const vtName = v.visitTypeName || v.visit_type_name || 'كشف';
                                  const rawDate = v.createdAt || v.created_at;
                                  
                                  let formattedTime = '';
                                  if (rawDate) {
                                    const parsedDate = new Date(typeof rawDate === 'string' && !rawDate.includes('T') ? rawDate.replace(' ', 'T') : rawDate);
                                    if (!isNaN(parsedDate.getTime())) {
                                      formattedTime = parsedDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                                    }
                                  }

                                  return (
                                    <tr key={v.visitId || v.visit_id || idx}>
                                      <td className="p-2.5 font-bold text-slate-900">{pName}</td>
                                      <td className="p-2.5 text-purple-700 font-bold">{vtName}</td>
                                      <td className="p-2.5 font-bold text-emerald-600">{v.amount} ج.م</td>
                                      <td className="p-2.5 text-slate-500 dir-ltr text-right font-medium">{formattedTime || 'أثناء الشيفت'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. EDIT PRICES & VISIT TYPES CONFIG TAB
      ======================================================== */}
      {activeSubTab === 'pricing' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                <span>إدارة قائمة التسعير وأنواع الكشوفات (الخانات الرسمية)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                تعديل أسعار ومسميات الكشوفات الحالية، أو إضافة خانات وأنواع خدمات جديدة للعيادة
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setActionError(null);
                setEditingVisitTypeId(null);
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة نوع كشف / خانة جديدة</span>
            </button>
          </div>

          {/* Smart Pricing Logic Configuration Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
              <div className="space-y-0.5">
                <div className="font-extrabold text-amber-950 flex items-center gap-2 text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <span>تحديد قواعد وأسعار زيادة الإعادة عند تأخر المريض:</span>
                </div>
                <p className="text-xs text-amber-900/80 font-medium">
                  بإمكانكِ هنا تعديل مهل التأخير وأسعار الإعادة المتأخرة، ويقوم النظام باحتسابها تلقائياً عند وصول المريض
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveDelayRules()}
                disabled={isSavingDelayRules}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isSavingDelayRules ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ قواعد التأخير</span>
                  </>
                )}
              </button>
            </div>

            {delaySaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{delaySaveSuccess}</span>
              </div>
            )}

            {delaySaveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{delaySaveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Rule 1: Normal Follow-up Grace Period */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 space-y-2 shadow-2xs">
                <div className="font-bold text-emerald-800 text-xs">1. في الموعد (خلال المهلة):</div>
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">مدة السماح بالأيام:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={delayGraceDays}
                      onChange={(e) => setDelayGraceDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-amber-600 focus:outline-hidden"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">يوم</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  يحاسب بسعر الإعادة الأساسي: <strong className="text-emerald-700">{visitTypes.find(v => v.id === 2)?.price || 50} ج.م</strong>
                </p>
              </div>

              {/* Rule 2: Tier 1 Delay */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 space-y-2 shadow-2xs">
                <div className="font-bold text-amber-800 text-xs">2. تأخير الشريحة الأولى:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">المدة حتى (يوم):</label>
                    <input
                      type="number"
                      min="1"
                      value={delayTier1Days}
                      onChange={(e) => setDelayTier1Days(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">السعر (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={delayTier1Price}
                      onChange={(e) => setDelayTier1Price(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-amber-700 focus:bg-white focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  من بعد {delayGraceDays} يوم وحتى {delayTier1Days} يوم
                </p>
              </div>

              {/* Rule 3: Tier 2 Delay */}
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 space-y-2 shadow-2xs">
                <div className="font-bold text-orange-800 text-xs">3. تأخير الشريحة الثانية:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">المدة حتى (يوم):</label>
                    <input
                      type="number"
                      min="1"
                      value={delayTier2Days}
                      onChange={(e) => setDelayTier2Days(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">السعر (ج.م):</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={delayTier2Price}
                      onChange={(e) => setDelayTier2Price(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-orange-700 focus:bg-white focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  من {delayTier1Days} يوم وحتى {delayTier2Days} يوم
                </p>
              </div>

              {/* Rule 4: Revert to New Consultation */}
              <div className="bg-white p-3.5 rounded-2xl border border-purple-200 space-y-2 shadow-2xs">
                <div className="font-bold text-purple-900 text-xs">4. انقطاع تام (كشف جديد):</div>
                <div>
                  <label className="text-[11px] text-slate-500 font-bold block mb-1">انقطاع أكثر من (يوم):</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={delayRevertNewDays}
                      onChange={(e) => setDelayRevertNewDays(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-purple-900 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">يوم</span>
                  </div>
                </div>
                <p className="text-[11px] text-purple-700 font-semibold">
                  يتحول تلقائياً إلى كشف جديد ({visitTypes.find(v => v.id === 1)?.price || 200} ج.م)
                </p>
              </div>
            </div>
          </div>

          {/* Action Error or Success Banner */}
          {actionError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Add New Visit Type Card / Form */}
          {isAddingNew && (
            <div className="p-5 bg-purple-50/70 border-2 border-purple-200 rounded-2xl space-y-4 animate-fade-in shadow-xs">
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-3">
                <h4 className="text-xs font-extrabold text-purple-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-700" />
                  <span>إضافة نوع كشف / خدمة جديدة للعيادة</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="p-1 hover:bg-purple-200/60 text-purple-700 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Field Name */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                    <span>اسم الخانة / نوع الكشف (مثال: كشف مستعجل، استشارة أونلاين، جلسة تفتيت):</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="أدخل اسم نوع الكشف الجديد..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>السعر الرسمي (جنيه مصري):</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="مثال: 150"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 md:col-span-3">
                  <label className="text-xs font-bold text-slate-700">
                    وصف مختصر أو تفاصيل الخانة (اختياري):
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="ملاحظات توضيحية لسبب الخانة أو ما تشمله..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-200/60">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ وإضافة الخانة الان</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {visitTypes.map((vt) => {
              const isEditingThis = editingVisitTypeId === vt.id;

              if (isEditingThis) {
                return (
                  <div key={vt.id} className="bg-purple-50/50 border-2 border-purple-400 rounded-2xl p-4 space-y-3 shadow-md animate-fade-in">
                    <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                      <span className="text-xs font-extrabold text-purple-900">تعديل الخانة رقم #{vt.id}</span>
                      <button
                        type="button"
                        onClick={() => setEditingVisitTypeId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">اسم الخانة / نوع الكشف:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700">السعر الرسمي (ج.م):</label>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-900 focus:border-purple-600 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700">الوصف والتفاصيل:</label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:border-purple-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-purple-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteVisitType(vt.id, vt.name)}
                        disabled={isSubmitting}
                        className="p-2 text-rose-600 hover:bg-rose-100/80 rounded-xl transition-colors cursor-pointer"
                        title="حذف الخانة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingVisitTypeId(null)}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(vt.id)}
                          disabled={isSubmitting}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>حفظ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={vt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:shadow-xs transition-shadow">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-900">{vt.name}</span>
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                        ID: {vt.id}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                      {vt.description || 'لا يوجد وصف مخصص لهذه الخانة.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xl font-black text-emerald-600">
                      {vt.price} <span className="text-xs font-bold text-slate-500">ج.م</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(vt)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-purple-50 text-purple-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>تعديل الخانة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteVisitType(vt.id, vt.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="حذف / إخفاء"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
