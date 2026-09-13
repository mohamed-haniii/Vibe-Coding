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
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { exportToCsv, printCleanDocument } from '../../utils/printUtils';

export const ReportsDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'shifts' | 'financial' | 'pricing'>('daily');
  
  // Date & Time formatting helpers with timezone resilience
  const formatDateTime = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '-';
    try {
      const cleanStr = typeof dateVal === 'string' && !dateVal.includes('T') ? dateVal.replace(' ', 'T') : dateVal;
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(dateVal);
    }
  };

  const calculateShiftDuration = (start: string | null | undefined, end: string | null | undefined): string => {
    if (!start) return '-';
    try {
      const cleanStart = typeof start === 'string' && !start.includes('T') ? start.replace(' ', 'T') : start;
      const startDate = new Date(cleanStart);
      const cleanEnd = end ? (typeof end === 'string' && !end.includes('T') ? end.replace(' ', 'T') : end) : null;
      const endDate = cleanEnd ? new Date(cleanEnd) : new Date();
      const diffMs = endDate.getTime() - startDate.getTime();
      if (isNaN(diffMs) || diffMs < 0) return '-';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours === 0) return `${minutes} دقيقة`;
      return `${hours} ساعة و ${minutes} دقيقة`;
    } catch {
      return '-';
    }
  };

  const formatTimeOnly = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '-';
    try {
      const cleanStr = typeof dateVal === 'string' && !dateVal.includes('T') ? dateVal.replace(' ', 'T') : dateVal;
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return String(dateVal);
    }
  };
  
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
  const [shiftCashierFilter, setShiftCashierFilter] = useState<string>('all');
  const [shiftStatusFilter, setShiftStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [shiftDateFilter, setShiftDateFilter] = useState<string>('');
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

  const filteredShifts = shiftsData.filter(s => {
    if (shiftCashierFilter !== 'all' && s.cashierName !== shiftCashierFilter) return false;
    if (shiftStatusFilter === 'open' && !s.isOpen) return false;
    if (shiftStatusFilter === 'closed' && s.isOpen) return false;
    if (shiftDateFilter) {
      const startDay = s.startTime ? s.startTime.split('T')[0].split(' ')[0] : '';
      const endDay = s.endTime ? s.endTime.split('T')[0].split(' ')[0] : '';
      if (startDay !== shiftDateFilter && endDay !== shiftDateFilter) {
        return false;
      }
    }
    return true;
  });

  const uniqueCashiers = Array.from(new Set(shiftsData.map(s => s.cashierName))).filter(Boolean);

  // Export Daily Report to Excel (CSV)
  const handleExportDailyExcel = () => {
    if (!dailyData) return;
    const dateStr = selectedDate;

    const headers = [
      'رقم الكشف',
      'اسم المريض',
      'كود المريض',
      'الهاتف',
      'نوع الكشف',
      'طريقة الدفع',
      'المبلغ (ج.م)',
      'حالة الكشف',
      'اسم الكاشير',
      'تاريخ وتوقيت التسجيل'
    ];

    const rows = (dailyData.visits || []).map(v => [
      v.id,
      v.patientName,
      v.patientCode,
      v.patientPhone || '-',
      v.visitTypeName,
      v.paymentMethod === 'Cash' || v.paymentMethod === 'كاش' ? 'كاش' : 'انستا باي',
      v.price,
      v.status === 'Completed' ? 'مكتمل' : v.status === 'Waiting' ? 'منتظر' : v.status,
      v.cashierName || '-',
      formatDateTime(v.createdAt)
    ]);

    rows.push([]);
    rows.push(['--- ملخص الحسابات اليومية ---', '', '', '', '', '', '', '', '', '']);
    rows.push(['إجمالي الإيراد المحصل', `${dailyData.totalRevenue} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['إيراد كاش (نقدي)', `${dailyData.cashRevenue} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['إيراد انستا باي', `${dailyData.instapayRevenue} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['إجمالي مصروفات ومسحوبات الدرج', `-${dailyData.totalExpenses || 0} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['إجمالي إيداعات الدرج الإضافية', `+${dailyData.totalCashIn || 0} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['صافي النقدية المتواجدة بالدرج', `${dailyData.netDrawerCash !== undefined ? dailyData.netDrawerCash : ((dailyData.cashRevenue || 0) + (dailyData.totalCashIn || 0) - (dailyData.totalExpenses || 0))} ج.م`, '', '', '', '', '', '', '', '']);
    rows.push(['إجمالي عدد الزيارات', `${dailyData.totalVisitsCount} زيارة`, '', '', '', '', '', '', '', '']);

    exportToCsv(`التقرير_المالي_اليومي_${dateStr}`, headers, rows);
    setSuccessMessage('تم تصدير التقرير المالي اليومي إلى ملف Excel بنجاح');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Clean Print Daily Report
  const handlePrintDailyReport = () => {
    if (!dailyData) return;
    const netCash = dailyData.netDrawerCash !== undefined ? dailyData.netDrawerCash : ((dailyData.cashRevenue || 0) + (dailyData.totalCashIn || 0) - (dailyData.totalExpenses || 0));

    const shiftsRows = (dailyData.shifts || []).map(s => `
      <tr>
        <td style="font-weight:bold;font-family:monospace;">#${s.shiftId}</td>
        <td style="font-weight:bold;">${s.cashierName}</td>
        <td>${s.isOpen ? '<span style="color:#16a34a;font-weight:bold;">مفتوح</span>' : 'مغلق'}</td>
        <td style="font-size:9pt;">${formatDateTime(s.startTime)}</td>
        <td style="font-size:9pt;">${s.isOpen ? 'مستمر' : formatDateTime(s.endTime)}</td>
        <td style="font-weight:bold;">${calculateShiftDuration(s.startTime, s.endTime)}</td>
        <td style="font-weight:bold;">${s.totalVisits}</td>
        <td>${s.cashRevenue || 0} ج</td>
        <td>${s.instapayRevenue || 0} ج</td>
        <td style="font-weight:bold;color:#16a34a;">${s.totalRevenue} ج</td>
        <td style="font-weight:bold;color:#dc2626;">-${s.totalExpenses || 0} ج</td>
        <td style="font-weight:bold;color:#7e22ce;">${s.netDrawerCash !== undefined ? s.netDrawerCash : ((s.totalRevenue || 0) + (s.totalCashIn || 0) - (s.totalExpenses || 0))} ج</td>
      </tr>
    `).join('');

    const visitsRows = (dailyData.visits || []).map(v => `
      <tr>
        <td style="font-family:monospace;">#${v.id}</td>
        <td style="font-weight:bold;">${v.patientName} (${v.patientCode})</td>
        <td>${v.visitTypeName}</td>
        <td>${v.paymentMethod === 'InstaPay' || v.paymentMethod === 'انستا باي' ? 'انستا باي' : 'كاش'}</td>
        <td style="font-weight:bold;">${v.price} ج.م</td>
        <td>${v.cashierName || '-'}</td>
        <td style="font-size:8.5pt;">${formatDateTime(v.createdAt)}</td>
      </tr>
    `).join('');

    const expensesRows = (dailyData.drawerTransactions || []).map(t => `
      <tr>
        <td style="font-weight:bold;color:${t.type === 'Expense' ? '#dc2626' : '#16a34a'};">${t.type === 'Expense' ? 'مصروف' : 'إيداع'}</td>
        <td>${t.category || '-'}</td>
        <td style="font-weight:bold;">${t.amount} ج.م</td>
        <td>${t.cashierName || '-'}</td>
        <td>${t.notes || '-'}</td>
        <td style="font-size:8.5pt;">${formatDateTime(t.createdAt)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="header-box">
        <div>
          <div class="clinic-title">عيادة التغذية العلاجية والتخسيس</div>
          <div class="clinic-sub">التقرير المالي وحركات الدرج اليومية</div>
        </div>
        <div style="font-size:10pt;color:#64748b;">
          تاريخ التقرير: <strong>${selectedDate}</strong><br/>
          تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إجمالي الإيراد</div>
          <div style="font-size:14pt;font-weight:bold;color:#16a34a;">${dailyData.totalRevenue} ج.م</div>
          <div style="font-size:8pt;color:#64748b;">كاش: ${dailyData.cashRevenue} | انستا: ${dailyData.instapayRevenue}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إجمالي المصروفات</div>
          <div style="font-size:14pt;font-weight:bold;color:#dc2626;">-${dailyData.totalExpenses || 0} ج.م</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">صافي نقدية الدرج</div>
          <div style="font-size:14pt;font-weight:bold;color:#7e22ce;">${netCash} ج.م</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إجمالي الكشوفات</div>
          <div style="font-size:14pt;font-weight:bold;color:#2563eb;">${dailyData.totalVisitsCount} زيارة</div>
          <div style="font-size:8pt;color:#64748b;">جديد: ${dailyData.newVisitsCount} | متابعة: ${dailyData.followupVisitsCount + dailyData.maintenanceVisitsCount}</div>
        </div>
      </div>

      <div style="font-size:11pt;font-weight:bold;margin-bottom:8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">
        1. ملخص شيفتات اليوم (${dailyData.shifts?.length || 0} شيفت)
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الشيفت</th>
            <th>اسم الكاشير</th>
            <th>الحالة</th>
            <th>بدء الشيفت</th>
            <th>إغلاق الشيفت</th>
            <th>المدة</th>
            <th>الكشوفات</th>
            <th>كاش</th>
            <th>انستا باي</th>
            <th>الإجمالي</th>
            <th>المصروفات</th>
            <th>صافي الدرج</th>
          </tr>
        </thead>
        <tbody>
          ${shiftsRows || '<tr><td colspan="12" style="text-align:center;">لا توجد شيفتات مسجلة</td></tr>'}
        </tbody>
      </table>

      ${expensesRows ? `
        <div style="font-size:11pt;font-weight:bold;margin-top:20px;margin-bottom:8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">
          2. حركات ومصروفات الدرج لليوم (${dailyData.drawerTransactions?.length || 0})
        </div>
        <table>
          <thead>
            <tr>
              <th>نوع الحركة</th>
              <th>التصنيف</th>
              <th>المبلغ</th>
              <th>الكاشير</th>
              <th>ملاحظات</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            ${expensesRows}
          </tbody>
        </table>
      ` : ''}

      ${visitsRows ? `
        <div style="font-size:11pt;font-weight:bold;margin-top:20px;margin-bottom:8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">
          3. بيان كشوفات وزيارات المرضى (${dailyData.visits?.length || 0})
        </div>
        <table>
          <thead>
            <tr>
              <th>رقم</th>
              <th>المريض</th>
              <th>نوع الكشف</th>
              <th>طريقة الدفع</th>
              <th>المبلغ</th>
              <th>الكاشير</th>
              <th>التوقيت</th>
            </tr>
          </thead>
          <tbody>
            ${visitsRows}
          </tbody>
        </table>
      ` : ''}
    `;

    printCleanDocument(`التقرير_المالي_اليومي_${selectedDate}`, html);
  };

  // Export All Shifts to Excel
  const handleExportShiftsExcel = () => {
    const headers = [
      'رقم الشيفت',
      'اسم الكاشير',
      'الحالة',
      'تاريخ وتوقيت البدء',
      'تاريخ وتوقيت الإغلاق',
      'مدة الشيفت',
      'عدد الزيارات',
      'إيراد كاش (ج.م)',
      'إيراد انستا باي (ج.م)',
      'إجمالي الإيراد (ج.م)',
      'إيداعات الدرج (ج.م)',
      'مصروفات الشيفت (ج.م)',
      'صافي نقدية الدرج (ج.م)',
      'كشوفات جديدة',
      'متابعات'
    ];

    const rows = filteredShifts.map(s => [
      s.shiftId,
      s.cashierName,
      s.isOpen ? 'مفتوح حالياً' : 'مغلق',
      formatDateTime(s.startTime),
      s.isOpen ? 'مستمر' : formatDateTime(s.endTime),
      calculateShiftDuration(s.startTime, s.endTime),
      s.totalVisits,
      s.cashRevenue || 0,
      s.instapayRevenue || 0,
      s.totalRevenue,
      s.totalCashIn || 0,
      s.totalExpenses || 0,
      s.netDrawerCash !== undefined ? s.netDrawerCash : ((s.totalRevenue || 0) + (s.totalCashIn || 0) - (s.totalExpenses || 0)),
      s.newVisitsCount || 0,
      (s.followupVisitsCount || 0) + (s.maintenanceVisitsCount || 0)
    ]);

    exportToCsv(`سجل_الشيفتات_الكامل_${new Date().toISOString().split('T')[0]}`, headers, rows);
    setSuccessMessage('تم تصدير سجل الشيفتات إلى ملف Excel بنجاح');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Clean Print All Shifts
  const handlePrintShiftsReport = () => {
    const rowsHtml = filteredShifts.map(s => `
      <tr>
        <td style="font-weight:bold;font-family:monospace;">#${s.shiftId}</td>
        <td style="font-weight:bold;">${s.cashierName}</td>
        <td>${s.isOpen ? '<span style="color:#16a34a;font-weight:bold;">مفتوح</span>' : 'مغلق'}</td>
        <td style="font-size:8.5pt;">${formatDateTime(s.startTime)}</td>
        <td style="font-size:8.5pt;">${s.isOpen ? 'مستمر' : formatDateTime(s.endTime)}</td>
        <td style="font-weight:bold;">${calculateShiftDuration(s.startTime, s.endTime)}</td>
        <td style="font-weight:bold;">${s.totalVisits}</td>
        <td>${s.cashRevenue || 0} ج</td>
        <td>${s.instapayRevenue || 0} ج</td>
        <td style="font-weight:bold;color:#16a34a;">${s.totalRevenue} ج</td>
        <td style="font-weight:bold;color:#dc2626;">-${s.totalExpenses || 0} ج</td>
        <td style="font-weight:bold;color:#7e22ce;">${s.netDrawerCash !== undefined ? s.netDrawerCash : ((s.totalRevenue || 0) + (s.totalCashIn || 0) - (s.totalExpenses || 0))} ج</td>
      </tr>
    `).join('');

    const html = `
      <div class="header-box">
        <div>
          <div class="clinic-title">عيادة التغذية العلاجية والتخسيس</div>
          <div class="clinic-sub">تقرير وسجل شيفتات الكاشيرية الكامل</div>
        </div>
        <div style="font-size:10pt;color:#64748b;">
          عدد الشيفتات: ${filteredShifts.length} | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الشيفت</th>
            <th>اسم الكاشير</th>
            <th>الحالة</th>
            <th>بدء الشيفت</th>
            <th>إغلاق الشيفت</th>
            <th>المدة</th>
            <th>الزيارات</th>
            <th>كاش</th>
            <th>انستا</th>
            <th>الإيراد</th>
            <th>المصروفات</th>
            <th>صافي الدرج</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="12" style="text-align:center;">لا توجد شيفتات مطابقة</td></tr>'}
        </tbody>
      </table>
    `;

    printCleanDocument('سجل_شيفتات_العيادة', html);
  };

  // Clean Print Single Shift
  const handlePrintSingleShift = (shift: ShiftDetailReport) => {
    const visitsHtml = (shift.visits || []).map(v => `
      <tr>
        <td style="font-family:monospace;">#${v.visitId}</td>
        <td style="font-weight:bold;">${v.patientName}</td>
        <td>${v.visitTypeName}</td>
        <td style="font-weight:bold;">${v.amount} ج.م</td>
        <td style="font-size:8.5pt;">${formatDateTime(v.createdAt)}</td>
      </tr>
    `).join('');

    const expensesHtml = (shift.drawerTransactions || []).filter(t => t.type === 'Expense').map(t => `
      <tr>
        <td>${t.category || '-'}</td>
        <td style="font-weight:bold;color:#dc2626;">-${t.amount} ج.م</td>
        <td>${t.notes || '-'}</td>
        <td style="font-size:8.5pt;">${formatDateTime(t.createdAt)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="header-box">
        <div>
          <div class="clinic-title">عيادة التغذية العلاجية والتخسيس</div>
          <div class="clinic-sub">بيان تفصيلي لشيفت كاشير رقم #${shift.shiftId}</div>
        </div>
        <div style="font-size:10pt;color:#64748b;">
          الكاشير: <strong>${shift.cashierName}</strong><br/>
          الحالة: <strong>${shift.isOpen ? 'مفتوح' : 'مغلق'}</strong>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:15px;background:#f8fafc;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <div>توقيت البدء: <strong>${formatDateTime(shift.startTime)}</strong></div>
        <div>توقيت الإغلاق: <strong>${shift.isOpen ? 'مستمر حتى الآن' : formatDateTime(shift.endTime)}</strong></div>
        <div>المدة المستغرقة: <strong>${calculateShiftDuration(shift.startTime, shift.endTime)}</strong></div>
        <div>إيراد الكشوفات: <strong style="color:#16a34a;">${shift.totalRevenue} ج.م</strong> (كاش: ${shift.cashRevenue || 0} | انستا: ${shift.instapayRevenue || 0})</div>
        <div>المصروفات: <strong style="color:#dc2626;">-${shift.totalExpenses || 0} ج.م</strong></div>
        <div>صافي النقدية بالدرج: <strong style="color:#7e22ce;">${shift.netDrawerCash !== undefined ? shift.netDrawerCash : ((shift.totalRevenue || 0) + (shift.totalCashIn || 0) - (shift.totalExpenses || 0))} ج.م</strong></div>
      </div>

      ${expensesHtml ? `
        <div style="font-size:10.5pt;font-weight:bold;margin-bottom:6px;">المصروفات المسجلة بالشيفت:</div>
        <table>
          <thead>
            <tr><th>البند</th><th>المبلغ</th><th>البيان</th><th>الوقت</th></tr>
          </thead>
          <tbody>${expensesHtml}</tbody>
        </table>
      ` : ''}

      <div style="font-size:10.5pt;font-weight:bold;margin-top:15px;margin-bottom:6px;">كشوفات وزيارات المرضى (${shift.visits?.length || 0}):</div>
      <table>
        <thead>
          <tr><th>رقم الكشف</th><th>اسم المريض</th><th>نوع الكشف</th><th>المبلغ</th><th>التوقيت</th></tr>
        </thead>
        <tbody>
          ${visitsHtml || '<tr><td colspan="5" style="text-align:center;">لا توجد كشوفات مسجلة</td></tr>'}
        </tbody>
      </table>
    `;

    printCleanDocument(`بيان_شيفت_${shift.shiftId}_${shift.cashierName}`, html);
  };

  // Export Single Shift to Excel
  const handleExportSingleShiftExcel = (shift: ShiftDetailReport) => {
    const headers = [
      'رقم الكشف',
      'اسم المريض',
      'نوع الكشف',
      'المبلغ (ج.م)',
      'طريقة الدفع',
      'توقيت الكشف'
    ];

    const rows = (shift.visits || []).map(v => [
      v.visitId,
      v.patientName,
      v.visitTypeName,
      v.amount,
      v.paymentMethod === 'Cash' ? 'كاش' : (v.paymentMethod === 'InstaPay' ? 'انستا باي' : v.paymentMethod),
      formatDateTime(v.createdAt)
    ]);

    rows.push([]);
    rows.push(['--- ملخص الشيفت ---', '', '', '', '', '']);
    rows.push(['رقم الشيفت', `#${shift.shiftId}`, '', '', '', '']);
    rows.push(['اسم الكاشير', shift.cashierName, '', '', '', '']);
    rows.push(['الحالة', shift.isOpen ? 'مفتوح حالياً' : 'مغلق', '', '', '', '']);
    rows.push(['توقيت البدء', formatDateTime(shift.startTime), '', '', '', '']);
    rows.push(['توقيت الإغلاق', shift.isOpen ? 'مستمر' : formatDateTime(shift.endTime), '', '', '', '']);
    rows.push(['المدة', calculateShiftDuration(shift.startTime, shift.endTime), '', '', '', '']);
    rows.push(['إجمالي الإيراد', `${shift.totalRevenue} ج.م`, '', '', '', '']);
    rows.push(['إيراد كاش', `${shift.cashRevenue || 0} ج.م`, '', '', '', '']);
    rows.push(['إيراد انستا باي', `${shift.instapayRevenue || 0} ج.م`, '', '', '', '']);
    rows.push(['المصروفات', `-${shift.totalExpenses || 0} ج.م`, '', '', '', '']);
    rows.push(['صافي نقدية الدرج', `${shift.netDrawerCash !== undefined ? shift.netDrawerCash : ((shift.totalRevenue || 0) + (shift.totalCashIn || 0) - (shift.totalExpenses || 0))} ج.م`, '', '', '', '']);

    if (shift.drawerTransactions && shift.drawerTransactions.length > 0) {
      rows.push([]);
      rows.push(['--- حركات الدرج والمصروفات ---', '', '', '', '', '']);
      rows.push(['النوع', 'البند / الفئة', 'المبلغ (ج.م)', 'البيان والملاحظات', 'التوقيت', '']);
      shift.drawerTransactions.forEach(t => {
        rows.push([
          t.type === 'Expense' ? 'مصروف' : 'إيداع',
          t.category || '-',
          t.amount,
          t.notes || '-',
          formatDateTime(t.createdAt),
          ''
        ]);
      });
    }

    exportToCsv(`بيان_شيفت_${shift.shiftId}_${shift.cashierName.replace(/\s+/g, '_')}`, headers, rows);
    setSuccessMessage(`تم تصدير بيان الشيفت #${shift.shiftId} إلى ملف Excel بنجاح`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Export Monthly Report to Excel
  const handleExportMonthlyExcel = () => {
    if (!monthlyData) return;
    const headers = [
      'التاريخ',
      'اليوم',
      'عدد الزيارات',
      'الإيراد اليومي (ج.م)'
    ];

    const rows = (monthlyData.dailyBreakdown || []).map(row => [
      row.date,
      row.dayName,
      row.totalVisits,
      row.revenue
    ]);

    rows.push([]);
    rows.push(['--- ملخص الشهر ---', '', '', '']);
    rows.push(['إجمالي إيراد الشهر', '', '', `${monthlyData.totalRevenue} ج.م`]);
    rows.push(['إجمالي زيارات الشهر', '', `${monthlyData.totalVisitsCount} زيارة`, '']);
    rows.push(['كشف جديد', '', `${monthlyData.newVisitsCount} كشف`, `${monthlyData.newVisitsRevenue} ج.م`]);
    rows.push(['متابعات وإعادة', '', `${monthlyData.followupVisitsCount + monthlyData.maintenanceVisitsCount} كشف`, `${monthlyData.followupVisitsRevenue + monthlyData.maintenanceVisitsRevenue} ج.م`]);

    exportToCsv(`التقرير_الشهري_${selectedYear}_شهر_${selectedMonth}`, headers, rows);
    setSuccessMessage('تم تصدير التقرير الشهري إلى ملف Excel بنجاح');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Clean Print Monthly Report
  const handlePrintMonthlyReport = () => {
    if (!monthlyData) return;
    const rowsHtml = (monthlyData.dailyBreakdown || []).map(r => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;">${r.date}</td>
        <td>${r.dayName}</td>
        <td style="font-weight:bold;color:#2563eb;">${r.totalVisits} زيارة</td>
        <td style="font-weight:bold;color:#16a34a;">${r.revenue} ج.م</td>
      </tr>
    `).join('');

    const html = `
      <div class="header-box">
        <div>
          <div class="clinic-title">عيادة التغذية العلاجية والتخسيس</div>
          <div class="clinic-sub">التقرير المالي الشهري - شهر ${selectedMonth} / ${selectedYear}</div>
        </div>
        <div style="font-size:10pt;color:#64748b;">
          إجمالي الإيراد: <strong>${monthlyData.totalRevenue} ج.م</strong> | إجمالي الزيارات: <strong>${monthlyData.totalVisitsCount}</strong>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px;">
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إجمالي الإيراد الشهري</div>
          <div style="font-size:14pt;font-weight:bold;color:#16a34a;">${monthlyData.totalRevenue} ج.م</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إيراد الكشف الجديد</div>
          <div style="font-size:14pt;font-weight:bold;color:#7e22ce;">${monthlyData.newVisitsRevenue} ج.م (${monthlyData.newVisitsCount} كشف)</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;text-align:center;background:#f8fafc;">
          <div style="font-size:9pt;color:#64748b;">إيراد المتابعات والإعادة</div>
          <div style="font-size:14pt;font-weight:bold;color:#d97706;">${monthlyData.followupVisitsRevenue + monthlyData.maintenanceVisitsRevenue} ج.م</div>
        </div>
      </div>

      <div style="font-size:11pt;font-weight:bold;margin-bottom:8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">
        البيان اليومي لحركة العيادة في الشهر
      </div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>اليوم</th>
            <th>عدد الزيارات</th>
            <th>الإيراد اليومي</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="4" style="text-align:center;">لا توجد بيانات لهذا الشهر</td></tr>'}
        </tbody>
      </table>
    `;

    printCleanDocument(`التقرير_الشهري_${selectedYear}_${selectedMonth}`, html);
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
            📊 التقرير اليومي ومصروفات الدرج
          </button>

          <button
            onClick={() => {
              setActiveSubTab('shifts');
              loadShiftsReport();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'shifts'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⏱️ سجل وتاريخ جميع الشيفتات ({shiftsData.length})
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
            🏷️ أسعار الكشوفات وقواعد التأخير
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
          {/* Date Selector & Action Controls */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
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

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportDailyExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير Excel (CSV)</span>
              </button>

              <button
                type="button"
                onClick={handlePrintDailyReport}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة تقرير اليوم</span>
              </button>
            </div>
          </div>

          {/* Daily Stat Cards */}
          {dailyData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-3xl p-4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-emerald-800 block">إجمالي إيراد اليوم المحصّل</span>
                <div className="text-2xl font-black text-emerald-600">
                  {dailyData.totalRevenue} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-emerald-700 pt-1 font-semibold flex items-center justify-between">
                  <span>كاش: {dailyData.cashRevenue} ج</span>
                  <span>انستا: {dailyData.instapayRevenue} ج</span>
                </div>
              </div>

              <div className="bg-rose-50/80 border border-rose-200 rounded-3xl p-4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-rose-800 block">مصاريف ومسحوبات الدرج</span>
                <div className="text-2xl font-black text-rose-600">
                  -{dailyData.totalExpenses || 0} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-rose-700 pt-1 font-semibold">
                  عدد حركات الصرف: {dailyData.drawerTransactions?.filter(t => t.type === 'Expense').length || 0}
                </div>
              </div>

              <div className="bg-purple-100/70 border border-purple-300 rounded-3xl p-4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-purple-900 block">صافي النقدية المتواجدة بالدرج</span>
                <div className="text-2xl font-black text-purple-700">
                  {dailyData.netDrawerCash !== undefined ? dailyData.netDrawerCash : ((dailyData.cashRevenue || 0) + (dailyData.totalCashIn || 0) - (dailyData.totalExpenses || 0))} <span className="text-xs font-normal">ج.م</span>
                </div>
                <div className="text-[11px] text-purple-800 pt-1 font-semibold flex items-center justify-between">
                  <span>إيداعات إضافية: +{dailyData.totalCashIn || 0} ج</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">عدد الزيارات الإجمالي</span>
                <div className="text-2xl font-black text-blue-600">
                  {dailyData.totalVisitsCount} <span className="text-xs font-normal">زيارة</span>
                </div>
                <div className="text-[11px] text-slate-500 pt-1 font-semibold flex items-center justify-between">
                  <span className="text-emerald-600">مكتمل: {dailyData.completedVisitsCount}</span>
                  <span className="text-amber-600">منتظر: {dailyData.waitingVisitsCount}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500 block">كشوفات جديدة vs متابعات</span>
                <div className="text-sm font-black text-slate-800 pt-1">
                  جديد: <span className="text-purple-600">{dailyData.newVisitsCount} ({dailyData.newVisitsRevenue} ج)</span>
                </div>
                <div className="text-xs font-bold text-slate-600 pt-1">
                  متابعة: <span className="text-amber-600">{dailyData.followupVisitsCount + dailyData.maintenanceVisitsCount} ({dailyData.followupVisitsRevenue + dailyData.maintenanceVisitsRevenue} ج)</span>
                </div>
              </div>
            </div>
          )}

          {/* Drawer Expenses & Cash-In Transactions Log for the Day */}
          {dailyData && dailyData.drawerTransactions && dailyData.drawerTransactions.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  <span>سجل مصاريف وحركات الدرج لليوم ({dailyData.drawerTransactions.length} حركة)</span>
                </h4>
                <div className="text-xs font-bold text-slate-600">
                  إجمالي المصاريف: <span className="text-rose-600 font-black">-{dailyData.totalExpenses || 0} ج.م</span> | إجمالي الإيداعات: <span className="text-emerald-600 font-black">+{dailyData.totalCashIn || 0} ج.م</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">النوع</th>
                      <th className="p-3">المبلغ</th>
                      <th className="p-3">بيان السبب / الكومينت</th>
                      <th className="p-3">التصنيف</th>
                      <th className="p-3">الكاشير</th>
                      <th className="p-3">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    {dailyData.drawerTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            tx.type === 'Expense' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tx.type === 'Expense' ? '🔴 مصروف خارج' : '🟢 إيداع داخل'}
                          </span>
                        </td>
                        <td className={`p-3 font-black text-sm ${tx.type === 'Expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type === 'Expense' ? '-' : '+'}{tx.amount} ج.م
                        </td>
                        <td className="p-3 font-bold text-slate-900">{tx.notes}</td>
                        <td className="p-3 text-slate-600">{tx.category || '--'}</td>
                        <td className="p-3 text-slate-700">{tx.cashierName || 'كاشير'}</td>
                        <td className="p-3 text-slate-500 font-mono dir-ltr text-right">
                          {new Date(tx.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Cashier Shifts and Shift Expenses for the Day */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span>شيفتات ومصروفات الكاشيرية لليوم ({dailyData?.shifts?.length || 0})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  تاريخ وتوقيت بدء وإغلاق كل شيفت بدقة، وإجمالي الإيرادات والمصروفات المسجلة من كل كاشير
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                تاريخ العرض: {selectedDate}
              </span>
            </div>

            {isLoadingDaily ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400">جاري تحميل بيانات الشيفتات...</div>
            ) : !dailyData?.shifts || dailyData.shifts.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد شيفتات كاشير مسجلة في هذا اليوم ({selectedDate})
              </div>
            ) : (
              <div className="space-y-4">
                {dailyData.shifts.map((shift) => {
                  const isExpanded = expandedShiftIds.includes(shift.shiftId);
                  const shiftExpenses = (shift.drawerTransactions || []).filter((tx: any) => tx.type === 'Expense');

                  return (
                    <div
                      key={shift.shiftId}
                      className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
                    >
                      {/* Shift Header Bar */}
                      <div className="p-4 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm shrink-0">
                            #{shift.shiftId}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-slate-900">{shift.cashierName}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                shift.isOpen
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {shift.isOpen ? '🟢 مفتوح حالياً' : '🔴 مغلق'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                              <span className="flex items-center gap-1">
                                <span className="font-bold text-slate-700">بدء الشيفت:</span>
                                <span className="font-mono text-slate-800">{formatDateTime(shift.startTime)}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <span className="font-bold text-slate-700">إغلاق الشيفت:</span>
                                <span className="font-mono text-slate-800">
                                  {shift.isOpen ? 'مستمر حتى الآن' : formatDateTime(shift.endTime)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Shift Financial Metrics */}
                        <div className="flex items-center gap-3 flex-wrap bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-bold">إيراد الكشوفات</span>
                            <span className="text-xs font-black text-slate-900">{shift.totalRevenue} ج.م</span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-rose-500 block font-bold">المصروفات</span>
                            <span className="text-xs font-black text-rose-600">-{shift.totalExpenses || 0} ج.م</span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-purple-600 block font-bold">صافي الدرج</span>
                            <span className="text-sm font-black text-purple-700">
                              {shift.netDrawerCash !== undefined ? shift.netDrawerCash : ((shift.totalRevenue || 0) + (shift.totalCashIn || 0) - (shift.totalExpenses || 0))} ج.م
                            </span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-blue-500 block font-bold">عدد الزيارات</span>
                            <span className="text-xs font-black text-blue-700">{shift.totalVisits}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shift Expenses Section - كل شيفت عمل مصروفات ايه */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-rose-600" />
                            <span>المصروفات المسجلة بواسطة هذا الكاشير في الشيفت ({shiftExpenses.length}):</span>
                          </span>
                          <span className="text-xs font-black text-rose-600">
                            إجمالي المصروفات: {shift.totalExpenses || 0} ج.م
                          </span>
                        </div>

                        {shiftExpenses.length === 0 ? (
                          <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 text-center">
                            لا توجد أي مصروفات مسجلة في هذا الشيفت
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {shiftExpenses.map((tx: any) => (
                              <div
                                key={tx.id}
                                className="p-3 bg-rose-50/50 border border-rose-200/80 rounded-xl flex items-center justify-between text-xs"
                              >
                                <div className="truncate pr-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                                      {tx.category || 'مصروف عام'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {formatTimeOnly(tx.createdAt)}
                                    </span>
                                  </div>
                                  <p className="font-extrabold text-slate-900 truncate" title={tx.notes}>
                                    {tx.notes}
                                  </p>
                                </div>
                                <span className="font-black text-rose-700 text-sm whitespace-nowrap mr-2">
                                  -{tx.amount} ج.م
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quick visit types counts & button to expand visits */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span>كشف جديد: <strong className="text-purple-700">{shift.newVisitsCount}</strong></span>
                            <span>•</span>
                            <span>إعادة: <strong className="text-purple-700">{shift.followupVisitsCount}</strong></span>
                            <span>•</span>
                            <span>تثبيت: <strong className="text-purple-700">{shift.maintenanceVisitsCount}</strong></span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpandShift(shift.shiftId)}
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? 'إخفاء جدول زيارات الشيفت' : 'عرض كشوفات هذا الشيفت بالتفصيل'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Collapsible Visits List for the Shift */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-100 animate-in fade-in">
                            {shift.visits.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-2">لا توجد زيارات مسجلة في هذا الشيفت</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                      <th className="p-2">اسم المريض</th>
                                      <th className="p-2">نوع الزيارة</th>
                                      <th className="p-2">المبلغ</th>
                                      <th className="p-2">الوقت</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                                    {shift.visits.map((v: any, idx: number) => (
                                      <tr key={v.visitId || v.visit_id || idx}>
                                        <td className="p-2 font-bold text-slate-900">{v.patientName || v.patient_name}</td>
                                        <td className="p-2 text-purple-700 font-bold">{v.visitTypeName || v.visit_type_name}</td>
                                        <td className="p-2 font-bold text-emerald-600">{v.amount} ج.م</td>
                                        <td className="p-2 text-slate-500 font-mono dir-ltr text-right">{formatTimeOnly(v.createdAt)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
          1. ALL SHIFTS HISTORY & AUDIT TAB
      ======================================================== */}
      {activeSubTab === 'shifts' && (
        <div className="space-y-6">
          {/* Shifts Filters & Action Toolbar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>سجل وتاريخ جميع شيفتات الكاشيرية وحسابات الإغلاق</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  مراجعة تواريخ وأوقات بدء وانتهاء الشيفتات بالدقيقة، مدة كل شيفت، وإجمالي الإيرادات والمصروفات المسجلة
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportShiftsExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير الشيفتات Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintShiftsReport}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة سجل الشيفتات</span>
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                <span>تصفية حسب:</span>
              </div>

              {/* Cashier Filter */}
              <select
                value={shiftCashierFilter}
                onChange={(e) => setShiftCashierFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="all">كل الكاشيرية ({shiftsData.length})</option>
                {uniqueCashiers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={shiftStatusFilter}
                onChange={(e) => setShiftStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="all">جميع الحالات</option>
                <option value="open">🟢 مفتوح حالياً</option>
                <option value="closed">🔴 مغلق</option>
              </select>

              {/* Date Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-bold">التاريخ:</span>
                <input
                  type="date"
                  value={shiftDateFilter}
                  onChange={(e) => setShiftDateFilter(e.target.value)}
                  className="text-xs font-bold bg-transparent text-slate-800 focus:outline-hidden"
                />
              </div>

              {(shiftCashierFilter !== 'all' || shiftStatusFilter !== 'all' || shiftDateFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setShiftCashierFilter('all');
                    setShiftStatusFilter('all');
                    setShiftDateFilter('');
                  }}
                  className="text-xs text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Shifts Overall KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 block">إجمالي عدد الشيفتات</span>
              <div className="text-2xl font-black text-slate-900">
                {filteredShifts.length} <span className="text-xs font-normal">شيفت</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold">
                مفتوح حالياً: {filteredShifts.filter(s => s.isOpen).length}
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-bold text-emerald-800 block">إجمالي إيراد الشيفتات</span>
              <div className="text-2xl font-black text-emerald-600">
                {filteredShifts.reduce((sum, s) => sum + (s.totalRevenue || 0), 0)} <span className="text-xs font-normal">ج.م</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                كاش: {filteredShifts.reduce((sum, s) => sum + (s.cashRevenue || 0), 0)} | انستا: {filteredShifts.reduce((sum, s) => sum + (s.instapayRevenue || 0), 0)}
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-bold text-rose-800 block">إجمالي المصروفات بالشيفتات</span>
              <div className="text-2xl font-black text-rose-600">
                -{filteredShifts.reduce((sum, s) => sum + (s.totalExpenses || 0), 0)} <span className="text-xs font-normal">ج.م</span>
              </div>
              <div className="text-[11px] text-rose-600 font-medium">مسحوبات العيادة</div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-3xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-bold text-purple-800 block">صافي نقدية الأدراج</span>
              <div className="text-2xl font-black text-purple-700">
                {filteredShifts.reduce((sum, s) => sum + (s.netDrawerCash !== undefined ? s.netDrawerCash : ((s.totalRevenue || 0) + (s.totalCashIn || 0) - (s.totalExpenses || 0))), 0)} <span className="text-xs font-normal">ج.م</span>
              </div>
              <div className="text-[11px] text-purple-600 font-medium">نقدية الكاش الفعلية</div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-4 shadow-xs space-y-1">
              <span className="text-xs font-bold text-blue-800 block">إجمالي الكشوفات المسجلة</span>
              <div className="text-2xl font-black text-blue-700">
                {filteredShifts.reduce((sum, s) => sum + (s.totalVisits || 0), 0)} <span className="text-xs font-normal">زيارة</span>
              </div>
              <div className="text-[11px] text-blue-600 font-medium">عبر كل الشيفتات</div>
            </div>
          </div>

          {/* Shifts Cards List */}
          {filteredShifts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 text-slate-400 font-bold text-xs space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <div>لا توجد شيفتات مسجلة مطابقة لمعايير البحث والتصفية المحددة</div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShifts.map((shift) => {
                const isExpanded = expandedShiftIds.includes(shift.shiftId);
                const shiftExpenses = (shift.drawerTransactions || []).filter((tx: any) => tx.type === 'Expense');

                return (
                  <div
                    key={shift.shiftId}
                    className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
                  >
                    {/* Shift Header Bar */}
                    <div className="p-4 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                          #{shift.shiftId}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900">{shift.cashierName}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                              shift.isOpen
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {shift.isOpen ? '🟢 مفتوح حالياً' : '🔴 مغلق'}
                            </span>
                            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-200">
                              المدة: {calculateShiftDuration(shift.startTime, shift.endTime)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1.5">
                            <span className="flex items-center gap-1">
                              <span className="font-bold text-slate-700">تاريخ وبدء الشيفت:</span>
                              <span className="font-mono font-semibold text-slate-900">{formatDateTime(shift.startTime)}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="font-bold text-slate-700">إغلاق الشيفت:</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {shift.isOpen ? 'مستمر حتى الآن' : formatDateTime(shift.endTime)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shift Financial Metrics & Controls */}
                      <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
                        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-bold">إيراد الكشوفات</span>
                            <span className="text-xs font-black text-slate-900">{shift.totalRevenue} ج.م</span>
                            <span className="text-[10px] text-slate-500 block">كاش: {shift.cashRevenue || 0} | انستا: {shift.instapayRevenue || 0}</span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-rose-500 block font-bold">المصروفات</span>
                            <span className="text-xs font-black text-rose-600">-{shift.totalExpenses || 0} ج.م</span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-purple-600 block font-bold">صافي الدرج</span>
                            <span className="text-sm font-black text-purple-700">
                              {shift.netDrawerCash !== undefined ? shift.netDrawerCash : ((shift.totalRevenue || 0) + (shift.totalCashIn || 0) - (shift.totalExpenses || 0))} ج.م
                            </span>
                          </div>
                          <div className="text-right border-r border-slate-200 pr-3">
                            <span className="text-[10px] text-blue-500 block font-bold">عدد الزيارات</span>
                            <span className="text-xs font-black text-blue-700">{shift.totalVisits}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExportSingleShiftExcel(shift)}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="تصدير بيان الشيفت إلى ملف Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>إكسيل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSingleShift(shift)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="طباعة بيان الشيفت"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpandShift(shift.shiftId)}
                            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-200"
                          >
                            <span>{isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Shift Expandable Details */}
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-slate-100 bg-slate-50/40">
                        {/* Expenses List */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-rose-600" />
                              <span>المصروفات المسجلة بالشيفت ({shiftExpenses.length}):</span>
                            </span>
                            <span className="text-xs font-black text-rose-600">
                              الإجمالي: {shift.totalExpenses || 0} ج.م
                            </span>
                          </div>

                          {shiftExpenses.length === 0 ? (
                            <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                              لا توجد أي مصروفات مسجلة في هذا الشيفت
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {shiftExpenses.map((tx: any) => (
                                <div
                                  key={tx.id}
                                  className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black text-[10px]">
                                      {tx.category || 'مصروف عام'}
                                    </span>
                                    <div className="text-slate-600 text-[11px] mt-1 font-medium">{tx.notes || 'بدون ملاحظات'}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDateTime(tx.createdAt)}</div>
                                  </div>
                                  <div className="font-black text-rose-600 text-sm">-{tx.amount} ج.م</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Visits List */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/80">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              <span>الكشوفات المحصلة بالشيفت ({shift.visits?.length || 0}):</span>
                            </span>
                            <span className="text-xs font-black text-emerald-600">
                              إيراد الكشوفات: {shift.totalRevenue} ج.م
                            </span>
                          </div>

                          {(!shift.visits || shift.visits.length === 0) ? (
                            <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                              لا توجد كشوفات مسجلة في هذا الشيفت
                            </div>
                          ) : (
                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <th className="p-2.5">رقم الكشف</th>
                                    <th className="p-2.5">اسم المريض</th>
                                    <th className="p-2.5">نوع الكشف</th>
                                    <th className="p-2.5">طريقة الدفع</th>
                                    <th className="p-2.5">المبلغ</th>
                                    <th className="p-2.5">التوقيت</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {shift.visits.map((v) => (
                                    <tr key={v.visitId} className="hover:bg-slate-50">
                                      <td className="p-2.5 font-mono text-slate-500">#{v.visitId}</td>
                                      <td className="p-2.5 font-bold text-slate-900">{v.patientName}</td>
                                      <td className="p-2.5">
                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[10px]">
                                          {v.visitTypeName}
                                        </span>
                                      </td>
                                      <td className="p-2.5">
                                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                          v.paymentMethod === 'InstaPay' || v.paymentMethod === 'انستا باي'
                                            ? 'bg-purple-100 text-purple-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                          {v.paymentMethod === 'InstaPay' || v.paymentMethod === 'انستا باي' ? 'انستا باي' : 'كاش'}
                                        </span>
                                      </td>
                                      <td className="p-2.5 font-bold text-emerald-600">{v.amount} ج.م</td>
                                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">{formatDateTime(v.createdAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
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
          2. FINANCIAL REPORT TAB (MONTHLY)
      ======================================================== */}
      {activeSubTab === 'financial' && (
        <div className="space-y-6">
          
          {/* Month Selector & Export Controls */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Calendar className="w-5 h-5 text-purple-600 shrink-0" />
              <div className="text-xs font-bold text-slate-800">اختر الشهر والسنة:</div>
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

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleExportMonthlyExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>تصدير الشهر Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrintMonthlyReport}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير الشهري</span>
              </button>
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
          2. EDIT PRICES & VISIT TYPES CONFIG TAB
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
