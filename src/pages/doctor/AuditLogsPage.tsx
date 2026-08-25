import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { 
  History, 
  Search, 
  RefreshCw, 
  User, 
  Clock, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  ShieldCheck, 
  Receipt, 
  Users, 
  Settings, 
  Calendar,
  FileSpreadsheet,
  Activity,
  X,
  FilterX
} from 'lucide-react';

interface AuditLogItem {
  id: number;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: any;
  timestamp: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'visits' | 'shifts' | 'settings'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Restoring state
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const fetchLogs = async (showRefreshSpin = false) => {
    if (showRefreshSpin) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest<AuditLogItem[]>('/admin/audit-logs');
      setLogs(data || []);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'فشل في تحميل سجل النشاطات');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRestore = async (logId: number) => {
    setRestoringId(logId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest<{ message: string }>(`/admin/audit-logs/${logId}/restore`, {
        method: 'POST'
      });
      setSuccessMsg(res.message || 'تم التراجع عن العملية بنجاح');
      fetchLogs(true);
    } catch (err: any) {
      setError(err.message || 'فشل في التراجع عن العملية');
    } finally {
      setRestoringId(null);
    }
  };

  // Helper to format action titles nicely in Arabic
  const getActionInfo = (action: string, entityType: string) => {
    switch (action) {
      case 'CREATE_PATIENT':
        return { label: 'تسجيل مريض جديد', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', icon: Users, category: 'visits' };
      case 'CREATE_VISIT':
      case 'CREATE_VISIT_AND_PAYMENT':
        return { label: 'إضافة كشف / حجز جديد', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: Receipt, category: 'visits' };
      case 'START_CONSULTATION':
        return { label: 'بدء كشف لمريض', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', icon: Activity, category: 'visits' };
      case 'CANCEL_VISIT_FROM_QUEUE':
        return { label: 'إلغاء كشف من قائمة الانتظار', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', icon: RotateCcw, category: 'visits' };
      case 'COMPLETE_CONSULTATION':
        return { label: 'إتمام الكشف والإنهاء', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300', icon: CheckCircle2, category: 'visits' };
      case 'OPEN_SHIFT':
        return { label: 'فتح شيفت عمل جديد', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: Clock, category: 'shifts' };
      case 'CLOSE_SHIFT':
        return { label: 'إغلاق ومراجعة الشيفت', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300', icon: ShieldCheck, category: 'shifts' };
      case 'CREATE_DIET_PLAN':
        return { label: 'إضافة نموذج دايت جديد', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', icon: FileSpreadsheet, category: 'settings' };
      case 'UPDATE_DIET_PLAN':
        return { label: 'تعديل نموذج دايت', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: FileSpreadsheet, category: 'settings' };
      case 'DELETE_DIET_PLAN':
        return { label: 'حذف نموذج دايت', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300', icon: FileSpreadsheet, category: 'settings' };
      case 'UPDATE_PRICING':
      case 'CREATE_VISIT_TYPE':
      case 'UPDATE_VISIT_TYPE':
      case 'UPDATE_VISIT_TYPE_PRICE':
      case 'DELETE_VISIT_TYPE':
        return { label: 'تعديل قائمة أسعار الكشوفات', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', icon: Settings, category: 'settings' };
      case 'UPDATE_CLINIC_SETTINGS':
        return { label: 'تحديث إعدادات وتفضيلات العيادة', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: Settings, category: 'settings' };
      case 'UPDATE_USER_ROLE':
      case 'CREATE_USER':
      case 'CREATE_CASHIER_USER':
      case 'TOGGLE_USER_ACTIVE':
      case 'UPDATE_USER_CREDENTIALS':
        return { label: 'إدارة وتحديث حسابات المستخدمين', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300', icon: Users, category: 'settings' };
      case 'RESTORE_AUDIT_ACTION':
        return { label: 'التراجع عن عملية سابقة', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: RotateCcw, category: 'visits' };
      case 'EXPORT_DATABASE_BACKUP':
        return { label: 'تصدير نسخة احتياطية', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', icon: FileSpreadsheet, category: 'settings' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', icon: Activity, category: 'visits' };
    }
  };

  // Helper to format details into readable text summary
  const renderDetailsSummary = (details: any) => {
    if (!details) return null;

    if (typeof details === 'string') {
      return <span className="text-slate-600 dark:text-slate-300 font-medium">{details}</span>;
    }

    const items: React.ReactNode[] = [];

    if (details.patientName) {
      items.push(
        <span key="pname" className="font-bold text-slate-900 dark:text-slate-100">
          المريض: {details.patientName}
        </span>
      );
    }

    if (details.visitType || details.price) {
      items.push(
        <span key="vtype" className="text-slate-700 dark:text-slate-300">
          نوع الكشف: {details.visitType || ''} ({details.price || 0} ج.م)
        </span>
      );
    }

    if (details.shiftId) {
      items.push(
        <span key="shift" className="text-purple-700 dark:text-purple-300 font-semibold">
          شيفت رقم #{details.shiftId}
        </span>
      );
    }

    if (details.restoredAt) {
      items.push(
        <span key="restored" className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
          (تم التراجع عن العملية في {new Date(details.restoredAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
        </span>
      );
    }

    if (items.length > 0) {
      return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">{items}</div>;
    }

    return (
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 max-w-xl truncate block">
        {JSON.stringify(details)}
      </span>
    );
  };

  // Extract unique users
  const uniqueUsers = Array.from(new Set(logs.map(l => l.userName).filter(Boolean)));

  // Extract unique actions with friendly labels
  const actionMap = new Map<string, string>();
  logs.forEach(l => {
    if (l.action && !actionMap.has(l.action)) {
      const info = getActionInfo(l.action, l.entityType);
      actionMap.set(l.action, info.label);
    }
  });
  const uniqueActions = Array.from(actionMap.entries()).map(([code, label]) => ({ code, label }));

  // Check if any filter is active
  const hasActiveFilters = searchQuery !== '' || selectedUser !== 'all' || selectedAction !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedAction('all');
    setCategoryFilter('all');
    setDateFilter('all');
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const info = getActionInfo(log.action, log.entityType);

    // 1. Category Filter
    if (categoryFilter !== 'all' && info.category !== categoryFilter) {
      return false;
    }

    // 2. User Filter
    if (selectedUser !== 'all' && log.userName !== selectedUser) {
      return false;
    }

    // 3. Action Type Filter
    if (selectedAction !== 'all' && log.action !== selectedAction) {
      return false;
    }

    // 4. Date Filter
    if (dateFilter !== 'all') {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (!log.timestamp?.startsWith(todayStr)) return false;
      } else if (dateFilter === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      } else if (dateFilter === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (logDate < thirtyDaysAgo) return false;
      }
    }

    // 5. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const userNameMatch = log.userName?.toLowerCase().includes(query);
      const actionMatch = log.action?.toLowerCase().includes(query) || info.label.toLowerCase().includes(query);
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
      const detailsMatch = detailsStr.toLowerCase().includes(query);

      if (!userNameMatch && !actionMatch && !detailsMatch) {
        return false;
      }
    }

    return true;
  });

  // Calculate stats
  const totalCount = logs.length;
  const todayCount = logs.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.timestamp?.startsWith(today);
  }).length;
  const activeUsersCount = uniqueUsers.length;
  const cancellationsCount = logs.filter(l => l.action.includes('CANCEL') || l.action.includes('DELETE')).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">سجل نشاطات وعمليات العيادة (Audit Log)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                تتبع لحظي ودقيق لجميع التحركات، إضافة المرضى، الدفع، إغلاق الشيفتات، وتعديل الإعدادات
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={isRefreshing}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-600"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
          <span>تحديث السجل اللحظي</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>إجمالي النشاطات المسجلة</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>نشاطات اليوم</span>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{todayCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>المستخدمين النشطين</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeUsersCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>عمليات التعديل والإلغاء</span>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{cancellationsCount}</div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        
        {/* Top Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، نوع العملية، اسم المريض..."
              className="w-full pr-10 pl-9 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter by User */}
          <div className="md:col-span-3 relative">
            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600 appearance-none cursor-pointer"
            >
              <option value="all">جميع المستخدمين ({uniqueUsers.length})</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Filter by Action Type */}
          <div className="md:col-span-4 relative">
            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600 appearance-none cursor-pointer"
            >
              <option value="all">جميع أنواع العمليات ({uniqueActions.length})</option>
              {uniqueActions.map(a => (
                <option key={a.code} value={a.code}>{a.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Second Row: Date Filter + Category Tabs + Reset Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الكل ({logs.length})
            </button>

            <button
              onClick={() => setCategoryFilter('visits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                categoryFilter === 'visits'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              المرضى والكشوفات
            </button>

            <button
              onClick={() => setCategoryFilter('shifts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                categoryFilter === 'shifts'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الشيفتات
            </button>

            <button
              onClick={() => setCategoryFilter('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer shrink-0 ${
                categoryFilter === 'settings'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              الإعدادات والتسعير
            </button>
          </div>

          {/* Date Filter & Reset Options */}
          <div className="flex items-center gap-2 justify-between md:justify-end">
            
            {/* Date Dropdown */}
            <div className="relative">
              <div className="absolute right-2.5 top-2.5 pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-purple-600 appearance-none cursor-pointer"
              >
                <option value="all">كل الأوقات</option>
                <option value="today">نشاطات اليوم فقط</option>
                <option value="week">آخر 7 أيام</option>
                <option value="month">آخر 30 يوماً</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}

            {/* Counter Badge */}
            <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl shrink-0">
              عرض <span className="text-purple-600 dark:text-purple-400">{filteredLogs.length}</span> من <span className="text-slate-700 dark:text-slate-300">{logs.length}</span>
            </div>

          </div>

        </div>

      </div>

      {/* Logs Table / List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">جاري تحميل سجل العمليات والنشاطات...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد عمليات مسجلة مطابقة للبحث أو الفلتر المحدد</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-purple-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>مسح جميع الفلاتر المطبقة</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredLogs.map((log) => {
              const info = getActionInfo(log.action, log.entityType);
              const IconComp = info.icon;
              const formattedDate = new Date(log.timestamp).toLocaleDateString('ar-EG', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              const formattedTime = new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              const isRestored = log.details?.isRestored;
              const canRestore = log.action === 'CANCEL_VISIT_FROM_QUEUE' || log.action === 'COMPLETE_CONSULTATION';

              return (
                <div 
                  key={log.id} 
                  className={`p-4 sm:p-5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isRestored ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
                  }`}
                >
                  {/* Right Side: Icon & Details */}
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl shrink-0 mt-0.5 ${info.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {info.label}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${info.color}`}>
                          #{log.id}
                        </span>

                        <span className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{log.userName}</span>
                        </span>
                      </div>

                      {/* Details Content */}
                      <div className="pt-0.5">
                        {renderDetailsSummary(log.details)}
                      </div>
                    </div>
                  </div>

                  {/* Left Side: Timestamp & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-700">
                    <div className="text-left md:text-left space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedTime}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {formattedDate}
                      </div>
                    </div>

                    {/* Restore Action Button */}
                    {canRestore && (
                      <div>
                        {isRestored ? (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-xl">
                            تم التراجع
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRestore(log.id)}
                            disabled={restoringId === log.id}
                            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="التراجع عن هذه العملية وإعادة الحالة"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${restoringId === log.id ? 'animate-spin' : ''}`} />
                            <span>تراجع عن العملية</span>
                          </button>
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

    </div>
  );
};

