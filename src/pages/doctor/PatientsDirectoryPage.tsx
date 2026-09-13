import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../api/client';
import { PatientDetailsDrawerModal } from '../../components/PatientDetailsDrawerModal';
import { AddPatientArchiveModal } from '../../components/AddPatientArchiveModal';
import { EditPatientMedicalModal } from '../../components/EditPatientMedicalModal';
import { AddPastWeightModal } from '../../components/AddPastWeightModal';
import { PrintPatientReportModal } from '../../components/PrintPatientReportModal';
import { exportToCsv, printCleanDocument } from '../../utils/printUtils';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  RefreshCw, 
  Phone, 
  Calendar, 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  Scissors, 
  Pill, 
  Baby, 
  Activity, 
  UserPlus, 
  Download, 
  Printer, 
  LayoutGrid, 
  Table as TableIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronLeft,
  Eye,
  Edit3,
  ExternalLink,
  Receipt,
  Trash2
} from 'lucide-react';

interface PatientsDirectoryPageProps {
  onQueueSuccess?: () => void;
}

export const PatientsDirectoryPage: React.FC<PatientsDirectoryPageProps> = ({ onQueueSuccess }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalPatients: 0,
    femaleCount: 0,
    maleCount: 0,
    totalVisits: 0,
    queuedToday: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'phone' | 'code' | 'medical' | 'notes'>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [medicalFilter, setMedicalFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals state
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState<boolean>(false);
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null);
  const [pastWeightPatient, setPastWeightPatient] = useState<{ id: number; name: string } | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<{ id: number; name: string; code: string } | null>(null);
  const [printPatientReportId, setPrintPatientReportId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchDirectory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
        if (searchField !== 'all') params.append('searchField', searchField);
      }
      if (genderFilter !== 'all') params.append('gender', genderFilter);
      if (medicalFilter !== 'all') params.append('filter', medicalFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await apiRequest(`/patients/directory?${params.toString()}`);
      if (res && res.patients) {
        setPatients(res.patients);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load patients directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, searchField, genderFilter, medicalFilter, sortBy]);

  const handleQueueForToday = async (patientId: number) => {
    try {
      // Create visit for today
      await apiRequest('/visits', {
        method: 'POST',
        body: {
          patientId,
          visitTypeId: 2, // Followup by default or smart
          paymentMethod: 'Cash',
          price: 50,
          paymentStatus: 'Paid',
          idempotencyKey: `DIR-${patientId}-${Date.now()}`
        }
      });
      setToastMessage('تمت إضافة المريض بنجاح إلى دور كشف اليوم!');
      fetchDirectory();
      if (onQueueSuccess) onQueueSuccess();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage(err.message || 'فشل في إضافة المريض لدور اليوم');
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleExportExcel = () => {
    const headers = [
      'كود الملف',
      'الاسم الكامل',
      'رقم الهاتف',
      'النوع',
      'السن',
      'الطول (سم)',
      'الوزن المبدئي (كجم)',
      'الوزن الحالي (كجم)',
      'التغير في الوزن (كجم)',
      'إجمالي الزيارات',
      'تاريخ آخر زيارة',
      'تاريخ التسجيل'
    ];

    const rows = patients.map(p => [
      p.code,
      p.fullName,
      p.phone,
      p.gender,
      p.age || '-',
      p.heightCm || '-',
      p.firstWeightKg || '-',
      p.latestWeightKg || '-',
      p.totalWeightDiffKg !== null ? p.totalWeightDiffKg : '-',
      p.totalVisitsCount,
      p.lastVisitDate ? p.lastVisitDate.split('T')[0] : '-',
      p.createdAt ? p.createdAt.split('T')[0] : '-'
    ]);

    exportToCsv(`سجل_المرضى_${new Date().toISOString().split('T')[0]}`, headers, rows);
    setToastMessage('تم تصدير ملف Excel بنجاح');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePrintSummary = () => {
    const tableRows = patients.map(p => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;">#${p.code}</td>
        <td style="font-weight:bold;">${p.fullName}</td>
        <td style="font-family:monospace;">${p.phone}</td>
        <td>${p.gender}</td>
        <td>${p.age ? `${p.age} سنة` : '-'}</td>
        <td>${p.firstWeightKg ? `${p.firstWeightKg} كجم` : '-'}</td>
        <td style="font-weight:bold;">${p.latestWeightKg ? `${p.latestWeightKg} كجم` : '-'}</td>
        <td style="font-weight:bold;color:${p.totalWeightDiffKg && p.totalWeightDiffKg < 0 ? '#166534' : '#0f172a'};">
          ${p.totalWeightDiffKg !== null ? `${p.totalWeightDiffKg > 0 ? `+${p.totalWeightDiffKg}` : p.totalWeightDiffKg} كجم` : '-'}
        </td>
        <td>${p.totalVisitsCount}</td>
        <td>${p.lastVisitDate ? p.lastVisitDate.split('T')[0] : '-'}</td>
      </tr>
    `).join('');

    const html = `
      <div class="header-box">
        <div>
          <div class="clinic-title">عيادة التغذية العلاجية والتخسيس</div>
          <div class="clinic-sub">سجل وقاعدة بيانات المرضى الكاملة</div>
        </div>
        <div style="font-size:10pt;color:#64748b;">تاريخ الطباعة: ${new Date().toISOString().split('T')[0]} | إجمالي المرضى: ${patients.length}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>كود الملف</th>
            <th>الاسم الكامل</th>
            <th>الهاتف</th>
            <th>النوع</th>
            <th>السن</th>
            <th>وزن البداية</th>
            <th>الوزن الحالي</th>
            <th>إجمالي التغير</th>
            <th>الزيارات</th>
            <th>آخر زيارة</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    printCleanDocument('سجل_قاعدة_بيانات_المرضى', html);
  };

  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/patients/${patientToDelete.id}`, { method: 'DELETE' });
      setToastMessage(`تم حذف ملف المريض (${patientToDelete.name}) وجميع كشوفاته نهائياً بنجاح`);
      setPatientToDelete(null);
      fetchDirectory();
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage(err.message || 'فشل في حذف ملف المريض');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 text-right">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                سجل وقاعدة بيانات المرضى
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ملفات المرضى، التاريخ الطبي، الكشوفات والزيارات، وسجل تطور الأوزان
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddPatientModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة مريض جديد وسجل سابق</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="تصدير قاعدة بيانات المرضى إلى ملف Excel (CSV)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير Excel</span>
          </button>

          <button
            onClick={handlePrintSummary}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="طباعة تقرير سجل المرضى"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">طباعة السجل</span>
          </button>

          <button
            onClick={fetchDirectory}
            className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي المرضى</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.totalPatients}</span>
            <span className="text-xs text-slate-400">مريض</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">التركيبة (إناث / ذكور)</span>
          <div className="flex items-baseline gap-2 mt-1 font-bold text-xs text-slate-700 dark:text-slate-300">
            <span className="text-pink-600 dark:text-pink-400">👩 {stats.femaleCount}</span>
            <span>|</span>
            <span className="text-sky-600 dark:text-sky-400">👨 {stats.maleCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي الزيارات والكشوفات</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{stats.totalVisits}</span>
            <span className="text-xs text-slate-400">كشف</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">حاضرون بالعيادة اليوم</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.queuedToday}</span>
            <span className="text-xs text-slate-400">في الدور</span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Controls Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar with Field Selector */}
          <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            {/* Field selector */}
            <div className="bg-slate-100 dark:bg-slate-800/80 border-l border-slate-200 dark:border-slate-700 px-2 py-2 shrink-0">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 border-none focus:outline-hidden cursor-pointer"
                title="تحديد نطاق البحث"
              >
                <option value="all">🔍 بحث شامل</option>
                <option value="name">👤 بالاسم</option>
                <option value="phone">📞 برقم الهاتف</option>
                <option value="code">🏷️ بكود الملف (P-001)</option>
                <option value="medical">🩺 بالشكوى والتاريخ الطبي</option>
                <option value="notes">📝 بالملاحظات</option>
              </select>
            </div>

            {/* Text Input */}
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder={
                  searchField === 'name' ? 'اكتب اسم المريض للبحث...' :
                  searchField === 'phone' ? 'اكتب رقم الهاتف (مثال: 010...)...' :
                  searchField === 'code' ? 'اكتب كود الملف (مثال: P-0001)...' :
                  searchField === 'medical' ? 'ابحث بالشكوى، العمليات، أو الأدوية...' :
                  searchField === 'notes' ? 'ابحث في ملاحظات الملفات...' :
                  'ابحث بالاسم، رقم الهاتف، كود الملف (P-0001)، أو الشكوى والملاحظات...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pr-3.5 pl-10 py-2.5 text-xs sm:text-sm font-medium focus:outline-hidden text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-600 dark:text-slate-400">الترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer"
              >
                <option value="newest">الأحدث تسجيلاً</option>
                <option value="oldest">الأقدم تسجيلاً</option>
                <option value="name_asc">أبجدياً بالاسم (أ - ي)</option>
                <option value="name_desc">أبجدياً بالاسم (ي - أ)</option>
                <option value="code_asc">حسب كود الملف (P-001)</option>
                <option value="visits_desc">الأكثر كشوفات وزيارات 🏆</option>
                <option value="last_visit_desc">تاريخ آخر كشف (الأحدث)</option>
                <option value="weight_loss_desc">الأكثر نزولاً في الوزن 📉</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="عرض بطاقات"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="عرض جدول"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips & Active Search Indicator */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>فلترة:</span>
            </span>

            {/* Gender */}
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                genderFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                genderFilter === 'female'
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              👩 إناث
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                genderFilter === 'male'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              👨 ذكور
            </button>

            <span className="text-slate-300 dark:text-slate-600">|</span>

            {/* Medical filters */}
            <button
              onClick={() => setMedicalFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                medicalFilter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              كل الحالات
            </button>
            <button
              onClick={() => setMedicalFilter('operations')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                medicalFilter === 'operations'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              🩺 عمليات سابقة
            </button>
            <button
              onClick={() => setMedicalFilter('medications')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                medicalFilter === 'medications'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              💊 أدوية منتظمة
            </button>
            <button
              onClick={() => setMedicalFilter('pregnant_lactating')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                medicalFilter === 'pregnant_lactating'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              🤰 حوامل / مرضعات
            </button>
            <button
              onClick={() => setMedicalFilter('today_queued')}
              className={`px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer ${
                medicalFilter === 'today_queued'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              📋 حاضرون بالعيادة اليوم
            </button>
          </div>

          {/* Search Result Counter & Reset Button */}
          {(searchQuery.trim() || genderFilter !== 'all' || medicalFilter !== 'all') && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black text-[11px] border border-blue-200 dark:border-blue-800">
                نتائج البحث: {patients.length} مريض
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchField('all');
                  setGenderFilter('all');
                  setMedicalFilter('all');
                }}
                className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
              >
                إعادة ضبط الفلاتر ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-bold">جاري ترتيب واسترجاع سجل المرضى...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100">لم يتم العثور على مرضى مطابقين</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            جرب البحث باسم آخر أو تغيير الفلترة، أو قم بتسجيل مريض جديد مباشرة.
          </p>
          <button
            onClick={() => setIsAddPatientModalOpen(true)}
            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مريض جديد الآن</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => {
            const isLoss = p.totalWeightDiffKg !== null && p.totalWeightDiffKg < 0;
            const isGain = p.totalWeightDiffKg !== null && p.totalWeightDiffKg > 0;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg shrink-0">
                        {p.gender === 'ذكر' ? '👨' : '👩'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {p.fullName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                            {p.code}
                          </span>
                          {p.age && <span>• {p.age} سنة</span>}
                          {p.occupation && <span>• {p.occupation}</span>}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.gender === 'ذكر' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                    }`}>
                      {p.gender}
                    </span>
                  </div>

                  {/* Phone & Contact */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.phone}</span>
                    </div>

                    <a
                      href={`https://wa.me/2${p.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>💬 واتساب</span>
                    </a>
                  </div>

                  {/* Weight Progress Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-slate-900/40 dark:to-blue-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">البداية ➔ الحالي:</span>
                      <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                        {p.startWeightKg ? `${p.startWeightKg}` : '-'} ➔{' '}
                        <strong className="text-blue-600 dark:text-blue-400 font-black">{p.currentWeightKg ? `${p.currentWeightKg} كجم` : '-'}</strong>
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">التطور:</span>
                      {p.totalWeightDiffKg !== null ? (
                        <span className={`inline-flex items-center gap-1 font-black text-xs font-mono px-2 py-0.5 rounded-md ${
                          isLoss ? 'bg-emerald-100 text-emerald-800' : isGain ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isLoss ? <TrendingDown className="w-3 h-3" /> : isGain ? <TrendingUp className="w-3 h-3" /> : null}
                          {isLoss ? `-${Math.abs(p.totalWeightDiffKg)} كجم` : `+${p.totalWeightDiffKg} كجم`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">قياس واحد</span>
                      )}
                    </div>
                  </div>

                  {/* Medical Badges Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                    {p.hasOperations && (
                      <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-md">
                        ✂️ عمليات
                      </span>
                    )}
                    {p.takesMedications && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md">
                        💊 أدوية
                      </span>
                    )}
                    {p.isPregnant && (
                      <span className="px-2 py-0.5 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 rounded-md">
                        🤰 حامل
                      </span>
                    )}
                    {p.isLactating && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md">
                        🍼 مرضعة
                      </span>
                    )}
                    {p.activeVisit && (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md animate-pulse font-black">
                        🟢 حاضر اليوم (#{p.activeVisit.queueNumber})
                      </span>
                    )}
                  </div>

                  {/* Last visit & total visits */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <span>عدد الكشوفات: <strong className="text-slate-700 dark:text-slate-200">{p.totalVisits}</strong></span>
                    <span>
                      {p.lastVisitDate ? `آخر زيارة: ${new Date(p.lastVisitDate).toLocaleDateString('ar-EG')}` : 'لم تتم زيارات بعد'}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setSelectedPatientId(p.id)}
                    className="flex-1 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض الملف الكامل</span>
                  </button>

                  <button
                    onClick={() => setPrintPatientReportId(p.id)}
                    className="p-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-400 rounded-xl text-xs transition-colors cursor-pointer"
                    title="تصدير تقرير طبي شامل PDF / طباعة"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setEditingPatientId(p.id)}
                    className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                    title="تعديل السجل الطبي"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {!p.activeVisit && (
                    <button
                      onClick={() => handleQueueForToday(p.id)}
                      className="p-2 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="تسجيل كشف اليوم بدور الانتظار"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setPatientToDelete({ id: p.id, name: p.fullName, code: p.code })}
                    className="p-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs transition-colors cursor-pointer"
                    title="حذف ملف المريض بالكامل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DETAILED TABLE VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">كود الملف</th>
                  <th className="p-3.5">الاسم الكامل</th>
                  <th className="p-3.5">رقم الهاتف</th>
                  <th className="p-3.5">السن والنوع</th>
                  <th className="p-3.5">وزن البداية</th>
                  <th className="p-3.5">الوزن الحالي</th>
                  <th className="p-3.5">إجمالي التغير</th>
                  <th className="p-3.5">الكشوفات</th>
                  <th className="p-3.5">آخر زيارة</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                {patients.map((p) => {
                  const isLoss = p.totalWeightDiffKg !== null && p.totalWeightDiffKg < 0;
                  const isGain = p.totalWeightDiffKg !== null && p.totalWeightDiffKg > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {p.code}
                      </td>
                      <td className="p-3.5 font-black text-slate-800 dark:text-slate-100">
                        <button
                          onClick={() => setSelectedPatientId(p.id)}
                          className="hover:text-blue-600 dark:hover:text-blue-400 text-right cursor-pointer"
                        >
                          {p.fullName}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {p.phone}
                      </td>
                      <td className="p-3.5">
                        {p.age ? `${p.age} سنة` : '-'} ({p.gender})
                      </td>
                      <td className="p-3.5 font-mono">
                        {p.startWeightKg ? `${p.startWeightKg} كجم` : '-'}
                      </td>
                      <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">
                        {p.currentWeightKg ? `${p.currentWeightKg} كجم` : '-'}
                      </td>
                      <td className="p-3.5">
                        {p.totalWeightDiffKg !== null ? (
                          <span className={`font-black font-mono px-2 py-0.5 rounded-md ${
                            isLoss ? 'bg-emerald-100 text-emerald-800' : isGain ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isLoss ? `-${Math.abs(p.totalWeightDiffKg)} كجم` : `+${p.totalWeightDiffKg} كجم`}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3.5 font-bold font-mono">
                        {p.totalVisits}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        {p.lastVisitDate ? new Date(p.lastVisitDate).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPatientId(p.id)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            الملف
                          </button>

                          <button
                            onClick={() => setPrintPatientReportId(p.id)}
                            className="p-1.5 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                            title="تقرير طبي PDF / طباعة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingPatientId(p.id)}
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="تعديل السجل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {!p.activeVisit && (
                            <button
                              onClick={() => handleQueueForToday(p.id)}
                              className="p-1.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                              title="إضافة لدور اليوم"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setPatientToDelete({ id: p.id, name: p.fullName, code: p.code })}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="حذف ملف المريض"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Detailed Drawer / Modal */}
      {selectedPatientId && (
        <PatientDetailsDrawerModal
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
          onPatientUpdated={fetchDirectory}
          onQueueForToday={handleQueueForToday}
        />
      )}

      {/* Add New Patient with Complete Archive Modal */}
      {isAddPatientModalOpen && (
        <AddPatientArchiveModal
          isOpen={true}
          onClose={() => setIsAddPatientModalOpen(false)}
          onPatientCreated={(patient, queueToday) => {
            setIsAddPatientModalOpen(false);
            fetchDirectory();
            setToastMessage('تم تسجيل المريض بنجاح في قاعدة البيانات والأرشيف!');
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}

      {/* Edit Patient Medical Modal */}
      {editingPatientId && (
        <EditPatientMedicalModal
          isOpen={true}
          patientId={editingPatientId}
          onClose={() => setEditingPatientId(null)}
          onUpdated={() => {
            setEditingPatientId(null);
            fetchDirectory();
            setToastMessage('تم حفظ التعديلات بنجاح!');
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}

      {/* Delete Patient Confirmation Modal */}
      {patientToDelete && (
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
                هل أنت متأكد من رغبتك في حذف ملف المريض (<strong>{patientToDelete.name}</strong> - كود: {patientToDelete.code})؟
              </p>
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-[11px] text-rose-700 dark:text-rose-300 font-bold mt-2">
                ⚠️ تحذير: سيتم حذف جميع الكشوفات، الدفعات، والقياسات المسجلة لهذا المريض نهائياً ولا يمكن استرجاعها!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، حذف المريض نهائياً'}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPatientToDelete(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print / Export Full Medical Report Modal */}
      {printPatientReportId && (
        <PrintPatientReportModal
          patientId={printPatientReportId}
          onClose={() => setPrintPatientReportId(null)}
        />
      )}
    </div>
  );
};
