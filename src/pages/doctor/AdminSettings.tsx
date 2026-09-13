import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { ClinicSettings } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Settings, 
  Building, 
  Tag, 
  Save, 
  CheckCircle2, 
  Volume2, 
  Printer, 
  UserX, 
  Scale, 
  MessageSquare,
  ShieldCheck,
  Sliders,
  Sparkles,
  Database,
  Download,
  FileSpreadsheet,
  FileJson,
  AlertCircle,
  Network,
  Monitor,
  Wifi,
  PlaySquare,
  HelpCircle,
  Users,
  UserCheck,
  UserPlus,
  KeyRound,
  Edit,
  History,
  RotateCcw,
  Clock,
  Activity,
  Lock,
  Moon,
  Sun,
  Upload,
  Coins,
  CalendarClock
} from 'lucide-react';

interface UserItem {
  id: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuditLogItem {
  id: number;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: any;
  timestamp: string;
}

export const AdminSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<ClinicSettings>({
    clinic_name: 'عيادة التخسيس والتغذية',
    clinic_subtitle: '',
    enable_sound_alerts: true,
    enable_receipt_auto_print: true,
    allow_cashier_cancel_visit: false,
    enable_weight_loss_target_badge: true,
    enable_whatsapp_reminders: true,
    patient_clinical_data_entry_role: 'both'
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Backup & Restore State
  const [isDownloadingBackup, setIsDownloadingBackup] = useState<boolean>(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const [pendingFileName, setPendingFileName] = useState<string>('');
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupError(null);
    setBackupSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('تنسيق ملف JSON غير صالح');
        }

        const patientCount = parsed.patients?.length || 0;
        const visitCount = parsed.visits?.length || 0;

        if (patientCount === 0 && visitCount === 0) {
          throw new Error('الملف لا يحتوي على قائمة مرضى أو زيارات');
        }

        setPendingRestoreData(parsed);
        setPendingFileName(file.name);
        setShowRestoreModal(true);
      } catch (err: any) {
        setBackupError(`خطأ في قراءة ملف النسخة الاحتياطية: ${err.message || 'الملف ليس بتنسيق JSON صحيح'}`);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmFullRestore = async () => {
    if (!pendingRestoreData) return;

    try {
      setIsRestoringBackup(true);
      setBackupError(null);

      const res = await apiRequest<{ message: string; stats?: any }>('/admin/restore', {
        method: 'POST',
        body: pendingRestoreData
      });

      setShowRestoreModal(false);
      setPendingRestoreData(null);
      setPendingFileName('');

      setBackupSuccess(res.message || 'تم استرجاع كافة بيانات العيادة بنجاح!');
      fetchSettings();
      fetchUsers();
      fetchAuditLogs();

      setTimeout(() => setBackupSuccess(null), 8000);
    } catch (err: any) {
      console.error('Restore error:', err);
      setBackupError(err.message || 'حدث خطأ أثناء محاولة استرجاع البيانات');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Users State
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState<boolean>(false);
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<{
    id?: number;
    username: string;
    fullName: string;
    role: string;
    password?: string;
  } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(false);
  const [restoringLogId, setRestoringLogId] = useState<number | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const [logToRestoreConfirm, setLogToRestoreConfirm] = useState<AuditLogItem | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<ClinicSettings>('/settings');
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setErrorMsg('فشل في تحميل إعدادات العيادة');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsUsersLoading(true);
      const data = await apiRequest<UserItem[]>('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setIsLogsLoading(true);
      const data = await apiRequest<AuditLogItem[]>('/admin/audit-logs');
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const handleToggleUserActive = async (userId: number) => {
    try {
      await apiRequest(`/admin/users/${userId}/toggle-active`, { method: 'PUT' });
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      alert(err.message || 'فشل في تغيير حالة تفعيل الحساب');
    }
  };

  const handleOpenEditUser = (user: UserItem) => {
    setEditingUser({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      password: ''
    });
    setUserModalOpen(true);
  };

  const handleOpenCreateUser = () => {
    setEditingUser({
      username: '',
      fullName: '',
      role: 'Assistant',
      password: ''
    });
    setUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      if (editingUser.id) {
        // Edit existing user
        await apiRequest(`/admin/users/${editingUser.id}`, {
          method: 'PUT',
          body: {
            username: editingUser.username,
            fullName: editingUser.fullName,
            role: editingUser.role,
            password: editingUser.password || undefined
          }
        });
      } else {
        // Create new cashier
        await apiRequest('/admin/users', {
          method: 'POST',
          body: {
            username: editingUser.username,
            fullName: editingUser.fullName,
            password: editingUser.password
          }
        });
      }

      setUserModalOpen(false);
      setEditingUser(null);
      fetchUsers();
      fetchAuditLogs();
      setSuccessMsg('تم حفظ وتحديث بيانات حساب المستخدم بنجاح!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'فشل في حفظ بيانات الحساب');
    }
  };

  const executeRestoreAuditLog = async (log: AuditLogItem) => {
    try {
      setRestoringLogId(log.id);
      const res = await apiRequest<{ message: string }>(`/admin/audit-logs/${log.id}/restore`, {
        method: 'POST'
      });

      setRestoreNotice(res.message);
      setLogToRestoreConfirm(null);
      fetchAuditLogs();
      fetchUsers();
      fetchSettings();
      setTimeout(() => setRestoreNotice(null), 6000);
    } catch (err: any) {
      setRestoreNotice(`خطأ: ${err.message || 'حدث خطأ أثناء محاولة التراجع عن العملية'}`);
    } finally {
      setRestoringLogId(null);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE_VISIT_AND_PAYMENT':
        return { label: 'تسجيل كشف وتحصيل مبلغ', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'CANCEL_VISIT_FROM_QUEUE':
        return { label: 'إلغاء كشف من الانتظار', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'COMPLETE_CONSULTATION':
        return { label: 'إغلاق كشف واكتمال المعاينة', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'START_CONSULTATION':
        return { label: 'بدء المعاينة في غرفة الكشف', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'CREATE_PATIENT':
        return { label: 'تسجيل مريض جديد', color: 'bg-teal-100 text-teal-800 border-teal-300' };
      case 'UPDATE_VISIT_TYPE_PRICE':
        return { label: 'تغيير السعر الرسمي للكشف', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'UPDATE_USER_CREDENTIALS':
        return { label: 'تعديل اسم مستخدم / كلمة مرور', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'UPDATE_CLINIC_SETTINGS':
        return { label: 'تعديل إعدادات العيادة والتفضيلات', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'CREATE_CASHIER_USER':
        return { label: 'إنشاء حساب كاشير جديد', color: 'bg-sky-100 text-sky-800 border-sky-300' };
      case 'TOGGLE_USER_ACTIVE':
        return { label: 'تفعيل / تعطيل حساب', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'EXPORT_DATABASE_BACKUP':
        return { label: 'تصدير نسخة احتياطية', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      case 'RESTORE_AUDIT_ACTION':
        return { label: 'تراجع عن عملية سابقة (استرجاع)', color: 'bg-violet-100 text-violet-800 border-violet-300' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const handleDownloadBackup = async (format: 'json' | 'csv') => {
    try {
      setIsDownloadingBackup(true);
      setBackupSuccess(null);
      setBackupError(null);

      const token = sessionStorage.getItem('clinic_jwt_token');
      const response = await fetch(`/api/admin/backup?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل في استخراج ملف النسخة الاحتياطية من السيرفر');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `clinic_database_backup_${dateStr}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBackupSuccess(`تم تصدير وتحميل النسخة الاحتياطية بنجاح بصيغة (${format.toUpperCase()})!`);
      setTimeout(() => setBackupSuccess(null), 5000);
    } catch (err: any) {
      console.error('Backup download error:', err);
      setBackupError(err.message || 'حدث خطأ أثناء استخراج وتنزيل البيانات');
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleDownloadLauncherScript = () => {
    const batContent = `@echo off
chcp 65001 > nul
title تشغيل برنامج عيادة التغذية والتخسيس
echo =========================================================
echo       جاري تشغيل سيرفر العيادة والربط المحلي...
echo =========================================================
echo.

REM Get local IPv4 address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"عنوان IPv4"') do (
    set LOCAL_IP=%%a
)
if defined LOCAL_IP set LOCAL_IP=%LOCAL_IP: =%

echo [1] رابط الجهاز الرئيسي: http://localhost:3000
echo [2] رابط جهاز الاستقبال / الطبيبة (عبر الشبكة): http://%LOCAL_IP%:3000
echo.
echo جاري فتح برنامج العيادة في المتصفح...
start http://localhost:3000

npm start
pause
`;

    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_برنامج_العيادة.bat';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadShortcutScript = () => {
    const batContent = `@echo off
chcp 65001 > nul
title إنشاء اختصار سطح المكتب لبرنامج العيادة
echo =========================================================
echo         تثبيت اختصار البرنامج على سطح المكتب
echo =========================================================
echo.

set /p IP_ADDR="أدخل IP جهاز السيرفر الرئيسي (أو اضغط Enter للاستخدام المحالي localhost): "
if "%IP_ADDR%"=="" set IP_ADDR=localhost

set SCRIPT_PATH="%TEMP%\\CreateClinicShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT_PATH%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\برنامج عيادة التخسيس.lnk" >> %SCRIPT_PATH%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT_PATH%
echo oLink.TargetPath = "http://" ^& "%IP_ADDR%" ^& ":3000" >> %SCRIPT_PATH%
echo oLink.Description = "برنامج عيادة التخسيس والتغذية" >> %SCRIPT_PATH%
echo oLink.Save >> %SCRIPT_PATH%
cscript //nologo %SCRIPT_PATH%
del %SCRIPT_PATH%

echo.
echo =========================================================
echo تم إنشاء اختصار 'برنامج عيادة التخسيس' بنجاح على سطح المكتب!
echo =========================================================
pause
`;

    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'إنشاء_اختصار_سطح_المكتب.bat';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await apiRequest<ClinicSettings>('/settings', {
        method: 'PUT',
        body: settings
      });

      setSettings(updated);
      setSuccessMsg('تم حفظ جميع الإعدادات والتفضيلات في قاعدة البيانات بنجاح!');

      // Dispatch event or refresh header if needed
      window.dispatchEvent(new CustomEvent('clinic-settings-updated', { detail: updated }));

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = (key: keyof ClinicSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500 text-xs">
        جاري تحميل صفحة الإعدادات...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 dir-rtl text-right">
      
      {/* Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">إعدادات العيادة وتفضيلات النظام</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              صفحة حصرية للأدمن للتحكم في هويات العيادة وتفعيل/تعطيل الميزات المختلفة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>لوحة تحكم الدكتورة</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Main Clinic Identity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900">1. اسم وهوية العيادة (الشريط العلوي)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>اسم العيادة الرئيسي:</span>
              </label>
              <input
                type="text"
                required
                value={settings.clinic_name}
                onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })}
                placeholder="مثال: عيادة التخسيس والتغذية"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>الوصف الفرعي (اختياري - اتركه فارغاً للإلغاء):</span>
              </label>
              <input
                type="text"
                value={settings.clinic_subtitle}
                onChange={(e) => setSettings({ ...settings, clinic_subtitle: e.target.value })}
                placeholder="مثال: د. أمل - استشاري السمنة والنحافة"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 1.5: PDF & Print Design Customization */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Printer className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-extrabold text-slate-900">1.5. تخصيص شكل وتصميم تقرير الـ PDF المطبوع للروشتة</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">عنوان الهيدر العلوى بالروشتة:</label>
              <input
                type="text"
                value={settings.pdf_header_title || ''}
                onChange={(e) => setSettings({ ...settings, pdf_header_title: e.target.value })}
                placeholder="مركز التخسيس والتغذية العلاجية"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">العنوان الفرعي بالطبع:</label>
              <input
                type="text"
                value={settings.pdf_header_subtitle || ''}
                onChange={(e) => setSettings({ ...settings, pdf_header_subtitle: e.target.value })}
                placeholder="د. أمل مصطفى - استشاري التغذية العلاجية وتنسيق القوام"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">نص التذييل السفلي (Footer):</label>
              <input
                type="text"
                value={settings.pdf_footer_text || ''}
                onChange={(e) => setSettings({ ...settings, pdf_footer_text: e.target.value })}
                placeholder="نتمنى لكم دوام الصحة والعافية • يرجى الالتزام بالتعليمات والمواعيد"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">رقم هاتف العيادة على الروشتة:</label>
              <input
                type="text"
                value={settings.pdf_phone || ''}
                onChange={(e) => setSettings({ ...settings, pdf_phone: e.target.value })}
                placeholder="01000000000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">اللون الرئيسي للـ PDF:</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.pdf_primary_color || '#0f766e'}
                  onChange={(e) => setSettings({ ...settings, pdf_primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  value={settings.pdf_primary_color || '#0f766e'}
                  onChange={(e) => setSettings({ ...settings, pdf_primary_color: e.target.value })}
                  className="w-28 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">حجم الورقة والتنسيق:</label>
              <select
                value={settings.pdf_paper_size || 'A4'}
                onChange={(e) => setSettings({ ...settings, pdf_paper_size: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="A4">A4 - ورقة طباعة قياسية</option>
                <option value="A5">A5 - نصف ورقة قياسية</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.pdf_show_vitals !== false}
                onChange={(e) => setSettings({ ...settings, pdf_show_vitals: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>إظهار قياسات الجسم (الوزن ونسب الدهون والمياه)</span>
            </label>

            <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.pdf_show_notes !== false}
                onChange={(e) => setSettings({ ...settings, pdf_show_notes: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>إظهار الملاحظات الطبية والتوصيات</span>
            </label>

            <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.pdf_show_prescriptions !== false}
                onChange={(e) => setSettings({ ...settings, pdf_show_prescriptions: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>إظهار جدول الأنظمة الغذائية والتعليمات</span>
            </label>

            <label className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={settings.pdf_show_next_date !== false}
                onChange={(e) => setSettings({ ...settings, pdf_show_next_date: e.target.checked })}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>إظهار تاريخ الاستشارة أو المتابعة القادمة</span>
            </label>
          </div>
        </div>

        {/* Section 1.8: Smart Follow-up Delay Pricing Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">1.8. تخصيص قواعد وزيادة سعر الإعادة عند تأخر المريض</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  حددي مدة السماح والزيادة التلقائية في سعر الإعادة بناءً على عدد أيام التأخير منذ آخر كشف للمريض
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
              حساب ديناميكي ذكي
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grace Period */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-emerald-600" />
                <span>مهلة الإعادة بالسعر العادي (أيام):</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.delay_grace_days ?? 33}
                  onChange={(e) => setSettings({ ...settings, delay_grace_days: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-hidden"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">يوم</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                إذا حضر المريض خلال هذه المدة (افتراضي: 33 يوم)، يحاسب بسعر الإعادة العادي (50 ج).
              </p>
            </div>

            {/* Delay Tier 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>تأخير الشريحة الأولى:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">المدة حتى (أيام):</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.delay_tier1_days ?? 60}
                    onChange={(e) => setSettings({ ...settings, delay_tier1_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">السعر الجديد (ج.م):</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.delay_tier1_price ?? 70}
                    onChange={(e) => setSettings({ ...settings, delay_tier1_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-amber-700 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                التأخير من بعد المهلة وحتى {settings.delay_tier1_days ?? 60} يوم (افتراضي: 70 ج).
              </p>
            </div>

            {/* Delay Tier 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-orange-600" />
                <span>تأخير الشريحة الثانية:</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">المدة حتى (أيام):</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.delay_tier2_days ?? 90}
                    onChange={(e) => setSettings({ ...settings, delay_tier2_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">السعر الجديد (ج.م):</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={settings.delay_tier2_price ?? 100}
                    onChange={(e) => setSettings({ ...settings, delay_tier2_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-orange-700 focus:border-purple-600 focus:outline-hidden"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                التأخير من {settings.delay_tier1_days ?? 60} وحتى {settings.delay_tier2_days ?? 90} يوم (افتراضي: 100 ج).
              </p>
            </div>

            {/* Revert to New Consultation */}
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2 md:col-span-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-700" />
                    <span>حد الانقطاع التام (التحول التلقائي لكشف جديد):</span>
                  </label>
                  <p className="text-[11px] text-purple-800/80 font-medium mt-0.5">
                    إذا انقطع المريض أكثر من هذا العدد من الأيام، يلغى سعر الإعادة تلقائياً ويتحول الكشف إلى "كشف جديد" بالسعر الكامل (200 ج).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-700">انقطاع أكثر من:</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.delay_revert_new_days ?? 90}
                    onChange={(e) => setSettings({ ...settings, delay_revert_new_days: parseInt(e.target.value, 10) || 0 })}
                    className="w-24 px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-black text-purple-950 focus:border-purple-600 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-purple-900">يوم</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Feature Flags & System Toggles */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900">2. التحكم في ميزات النظام والإشعارات</h2>
          </div>

          <div className="space-y-3">

            {/* Toggle 0: Dark / Light Mode */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  theme === 'dark' ? 'bg-purple-900/60 text-purple-300' : 'bg-purple-100 text-purple-700'
                }`}>
                  {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-300" /> : <Sun className="w-5 h-5 text-amber-500" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">مظهر النظام (الوضع الليلي / Dark Mode)</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {theme === 'dark' ? 'الوضع الليلي مفعّل حالياً لحماية العين أثناء الاستخدام المسائي' : 'الوضع الفاتح مفعّل حالياً'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 1: Sound Alerts */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">التنبيهات الصوتية الحية</h3>
                  <p className="text-[11px] text-slate-500 font-medium">إصدار صوت تنبيه فور إضافة مريض جديد لقائمة الانتظار</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('enable_sound_alerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enable_sound_alerts ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enable_sound_alerts ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Receipt Auto Print */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">الطباعة التلقائية للإيصالات</h3>
                  <p className="text-[11px] text-slate-500 font-medium">فتح نافذة طباعة الإيصال للكاشير فور إتمام عملية الدفع</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('enable_receipt_auto_print')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enable_receipt_auto_print ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enable_receipt_auto_print ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3: Cashier Queue Cancellation Permission */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">سماحية إلغاء الزيارة للكاشير</h3>
                  <p className="text-[11px] text-slate-500 font-medium">السماح لمساعد الكاشير بحذف أو إلغاء كشف المريض من قائمة الانتظار</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('allow_cashier_cancel_visit')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allow_cashier_cancel_visit ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allow_cashier_cancel_visit ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 4: Weight Badges */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">شارات نسبة وتغير الوزن</h3>
                  <p className="text-[11px] text-slate-500 font-medium">عرض شارة الانخفاض/الزيادة بالكيلو والمؤشر الملون بالكشف</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('enable_weight_loss_target_badge')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enable_weight_loss_target_badge ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enable_weight_loss_target_badge ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 5: WhatsApp Integration Button */}
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">زر تذكير الواتساب المباشر</h3>
                  <p className="text-[11px] text-slate-500 font-medium">إتاحة خيار فتح الواتساب المباشر لإرسال النظام الغذائي والمواعيد للمريض</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle('enable_whatsapp_reminders')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enable_whatsapp_reminders ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enable_whatsapp_reminders ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Clinical & Habits Data Entry Permission */}
            <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    مكان إدخال التاريخ الطبي والبيانات السريرية والعادات للمريض
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    حدد من يُسمح له بملء التاريخ الجراحي، الأدوية، والعادات الحياتية للمريض
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, patient_clinical_data_entry_role: 'both' }))}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right cursor-pointer flex flex-col gap-1 ${
                    (settings.patient_clinical_data_entry_role || 'both') === 'both'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>الدكتور والمساعد معاً</span>
                    {(settings.patient_clinical_data_entry_role || 'both') === 'both' && <span>✓</span>}
                  </div>
                  <span className={`text-[10px] ${
                    (settings.patient_clinical_data_entry_role || 'both') === 'both' ? 'text-purple-100' : 'text-slate-400'
                  }`}>
                    تظهر عند الاسيستنت بالاستقبال وعند الدكتور بالعيادة
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, patient_clinical_data_entry_role: 'doctor' }))}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right cursor-pointer flex flex-col gap-1 ${
                    settings.patient_clinical_data_entry_role === 'doctor'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>الدكتور فقط</span>
                    {settings.patient_clinical_data_entry_role === 'doctor' && <span>✓</span>}
                  </div>
                  <span className={`text-[10px] ${
                    settings.patient_clinical_data_entry_role === 'doctor' ? 'text-purple-100' : 'text-slate-400'
                  }`}>
                    تختفي تماماً من عند الاسيستنت ويدخلها الدكتور فقط
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, patient_clinical_data_entry_role: 'assistant' }))}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right cursor-pointer flex flex-col gap-1 ${
                    settings.patient_clinical_data_entry_role === 'assistant'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>الاسيستنت فقط</span>
                    {settings.patient_clinical_data_entry_role === 'assistant' && <span>✓</span>}
                  </div>
                  <span className={`text-[10px] ${
                    settings.patient_clinical_data_entry_role === 'assistant' ? 'text-purple-100' : 'text-slate-400'
                  }`}>
                    يدخلها الاسيستنت بالاستقبال ويطلع عليها الدكتور
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Section 3: Database Backup & Export */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-5 h-5 text-purple-600" />
            <h2 className="text-sm font-extrabold text-slate-900">3. النسخ الاحتياطي وتصدير بيانات العيادة</h2>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            يمكنك تحميل نسخة احتياطية شاملة لكافة بيانات المرضى، الكشوفات، قياسات الوزن، الشفتات، والنماذج الغذائية. يحفظ الملف على جهازك للرجوع إليه أو أرشفته في أي وقت.
          </p>

          {backupSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupSuccess}</span>
            </div>
          )}

          {backupError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{backupError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Download JSON Button */}
            <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">تنزيل نسخة برمجية (JSON)</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">صيغة JSON الشاملة لجميع الجداول والعلاقات لاستعادتها مستقبلاً</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadBackup('json')}
                disabled={isDownloadingBackup || isRestoringBackup}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isDownloadingBackup ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل النسخة (JSON)</span>
                  </>
                )}
              </button>
            </div>

            {/* Download CSV Button */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">جدول إكسيل منظم (CSV)</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">صيغة CSV متوافقة مع Excel مع دعم كامل للغة العربية UTF-8 BOM</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadBackup('csv')}
                disabled={isDownloadingBackup || isRestoringBackup}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {isDownloadingBackup ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل جدول البيانات (CSV)</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload & Restore JSON Button */}
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">رفع واسترجاع الداتا (JSON)</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">استعادة كافة البيانات، المرضى، والزيارات من ملف نسخة احتياطية سابق</p>
                </div>
              </div>

              <input
                type="file"
                id="restore-json-file-input"
                accept=".json,application/json"
                onChange={handleBackupFileUpload}
                className="hidden"
              />

              <label
                htmlFor="restore-json-file-input"
                className={`w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isRestoringBackup ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>رفع و استرجاع النسخة (JSON)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 4: Local Network Setup & Launcher Batch Downloads */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Network className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900">4. تشغيل البرنامج محلياً والربط بين جهاز الطبيبة وجهاز الاستقبال</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                <span>ربط الجهازين بـ Wi-Fi أو راوتر واحد</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                تأكد من أن جهاز الطبيبة وجهاز الرسبشن متصلان بنفس شبكة الراوتر في العيادة (سواء كابل أو واي فاي).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                <span>معرفة IP الجهاز الرئيسي</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                افتح موجه الأوامر (CMD) واكتب <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-bold text-slate-800">ipconfig</code> لمعرفة IP جهاز السيرفر (مثل 192.168.1.100).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
                <span>فتح البرنامج من الجهاز الثاني</span>
              </div>
              <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
                في متصفح الجهاز الثاني، اكتب IP السيرفر مع البورت 3000 (مثال: <code className="bg-indigo-50 text-indigo-700 font-bold px-1 py-0.5 rounded">http://192.168.1.100:3000</code>).
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Batch Launcher Download */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2.5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <PlaySquare className="w-4 h-4 text-indigo-600" />
                  <span>ملف التشغيل التلقائي بنقرة واحدة (.bat)</span>
                </h3>
                <p className="text-[11px] text-slate-600 font-medium mt-1">
                  قم بتحميل ملف التشغيل ووضعه في مجلد البرنامج على جهاز السيرفر، بالنقر عليه سيتم تشغيل النظام وفتح المتصفح تلقائياً.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadLauncherScript}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف (تشغيل_برنامج_العيادة.bat)</span>
              </button>
            </div>

            {/* Shortcut Creator Batch Download */}
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2.5 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <span>ملف إنشاء اختصار سطح المكتب (.bat)</span>
                </h3>
                <p className="text-[11px] text-slate-600 font-medium mt-1">
                  قم بتحميل وتشغيل هذا الملف على أجهزة العيادة لإنشاء أيقونة باسم "برنامج عيادة التخسيس" مباشرة على سطح المكتب.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadShortcutScript}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف (إنشاء_اختصار_سطح_المكتب.bat)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: User Accounts & Passwords Management */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-extrabold text-slate-900">5. إدارة حسابات مستخدمي النظام وكلمات المرور</h2>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateUser}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs rounded-xl border border-purple-200 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب مساعد / كاشير جديد</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            يمكن للأدمن التحكم الكامل في أسماء المستخدمين، الأدوار، وكلمات المرور لجميع الحسابات (بما فيها حساب الأدمن نفسه).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {users.map(u => (
              <div 
                key={u.id}
                className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    u.role === 'Admin' ? 'bg-purple-600' : 'bg-slate-700'
                  }`}>
                    {u.role === 'Admin' ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-extrabold text-slate-900">{u.fullName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role === 'Admin' ? 'أدمن / طبيبة' : 'مساعد / كاشير'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                      <span>اسم المستخدم: <strong className="text-slate-800 font-bold">{u.username}</strong></span>
                      <span>•</span>
                      <span className={u.isActive ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {u.isActive ? 'حساب نشط' : 'حساب معطل'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditUser(u)}
                    title="تعديل اسم المستخدم أو كلمة المرور"
                    className="p-2 bg-white hover:bg-purple-50 text-purple-700 border border-slate-200 hover:border-purple-300 rounded-xl transition-all font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل</span>
                  </button>

                  {u.role !== 'Admin' && (
                    <button
                      type="button"
                      onClick={() => handleToggleUserActive(u.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                        u.isActive 
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {u.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Audit Log & One-Click Undo/Restoration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-extrabold text-slate-900">6. سجل العمليات الإدارية وخيار الاسترجاع المباشر (Undo Log)</h2>
            </div>

            <button
              type="button"
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              تحديث السجل
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium">
            يتم تسجيل كافة الأنشطة والتغييرات في العيادة. يمكنك الضغط على زر <strong>(استرجاع)</strong> لإلغاء أي عملية أو إرجاع مريض محذوف لقائمة الانتظار بنقرة واحدة.
          </p>

          {restoreNotice && (
            <div className="p-3.5 bg-violet-50 border border-violet-200 text-violet-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
              <span>{restoreNotice}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3">نوع العملية</th>
                  <th className="p-3">التفاصيل</th>
                  <th className="p-3">الوقت والتاريخ</th>
                  <th className="p-3 text-center">إجراء الاسترجاع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 font-bold text-xs">
                      لا توجد عمليات مسجلة في السجل حالياً
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const actionInfo = getActionLabel(log.action);
                    const isRestored = log.details && log.details.isRestored;
                    const canRestore = [
                      'CANCEL_VISIT_FROM_QUEUE', 
                      'COMPLETE_CONSULTATION', 
                      'UPDATE_VISIT_TYPE_PRICE', 
                      'TOGGLE_USER_ACTIVE',
                      'UPDATE_USER_CREDENTIALS',
                      'UPDATE_CLINIC_SETTINGS',
                      'CREATE_VISIT_AND_PAYMENT',
                      'CREATE_PATIENT',
                      'CREATE_CASHIER_USER'
                    ].includes(log.action);

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-500">#{log.id}</td>
                        <td className="p-3 font-bold text-slate-900">{log.userName}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border inline-block ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate text-[11px]">
                          {typeof log.details === 'object' 
                            ? JSON.stringify(log.details) 
                            : (log.details || '-')}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px] dir-ltr text-right font-mono">
                          {new Date(log.timestamp).toLocaleString('ar-EG')}
                        </td>
                        <td className="p-3 text-center">
                          {isRestored ? (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-slate-400" />
                              <span>تم الاسترجاع</span>
                            </span>
                          ) : canRestore ? (
                            <button
                              type="button"
                              onClick={() => setLogToRestoreConfirm(log)}
                              disabled={restoringLogId === log.id}
                              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              {restoringLogId === log.id ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>استرجاع</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button Bar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التغيرات والتفضيلات</span>
              </>
            )}
          </button>
        </div>

      </form>

      {/* User Credentials Edit Modal */}
      {userModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 dir-rtl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingUser.id ? 'تعديل اسم المستخدم وكلمة المرور' : 'إضافة حساب جديد للنظام'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">الاسم الكامل (يظهر في الإيصالات والتقارير):</label>
                <input
                  type="text"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  placeholder="مثال: د. أمل / أ. أحمد"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اسم المستخدم (Username للدخول):</label>
                <input
                  type="text"
                  required
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  placeholder="اسم المستخدم بالإنجليزية بدون مسافات"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              {editingUser.id && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">دور المستخدم بالحساب:</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="Admin">أدمن / طبيبة (صلاحيات كاملة)</option>
                    <option value="Assistant">مساعد / كاشير الاستقبال</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {editingUser.id ? 'كلمة المرور الجديدة (اتركها فارغة إذا لا تريد تغييرها):' : 'كلمة المرور للدخول:'}
                </label>
                <input
                  type="password"
                  required={!editingUser.id}
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                >
                  حفظ البيانات والحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Restore Confirmation Modal */}
      {logToRestoreConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-2xl border border-amber-200/80">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm text-amber-900">تأكيد التراجع والاسترجاع</h3>
                <p className="text-xs text-amber-700 font-medium mt-0.5">سجل رقم #{logToRestoreConfirm.id}</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700 leading-relaxed">
              هل أنت متأكد من التراجع عن هذه العملية: <span className="text-purple-700 font-extrabold font-mono">({getActionLabel(logToRestoreConfirm.action).label})</span> وإعادة البيانات لحالتها السابقة؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLogToRestoreConfirm(null)}
                disabled={restoringLogId === logToRestoreConfirm.id}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => executeRestoreAuditLog(logToRestoreConfirm)}
                disabled={restoringLogId === logToRestoreConfirm.id}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-violet-600/20 transition-all flex items-center gap-2"
              >
                {restoringLogId === logToRestoreConfirm.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد الاسترجاع الان</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Full Database JSON Restore Confirmation Modal */}
      {showRestoreModal && pendingRestoreData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3.5 rounded-2xl border border-amber-200/80">
              <AlertCircle className="w-7 h-7 shrink-0 text-amber-600" />
              <div>
                <h3 className="font-extrabold text-sm text-amber-950">تحذير مهم: استرجاع واستبدال قاعدة البيانات</h3>
                <p className="text-xs text-amber-800 font-medium mt-0.5">الملف المختار: <span className="font-bold underline">{pendingFileName}</span></p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <p className="font-bold text-rose-600">
                ⚠️ هذه العملية ستستبدل وتلغي كافة البيانات الحالية في العيادة بالبيانات الموجودة في هذا الملف!
              </p>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <p className="font-bold text-slate-900">محتويات النسخة الاحتياطية للرفع:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 font-semibold pr-2">
                  <li>عدد المرضى: <span className="text-purple-700 font-bold">{pendingRestoreData.patients?.length || 0}</span> مريض</li>
                  <li>عدد الكشوفات/الزيارات: <span className="text-purple-700 font-bold">{pendingRestoreData.visits?.length || 0}</span> زيارة</li>
                  <li>قياسات InBody والوزن: <span className="text-purple-700 font-bold">{(pendingRestoreData.measurements || pendingRestoreData.patient_measurements)?.length || 0}</span> قياس</li>
                  <li>خطط التغذية: <span className="text-purple-700 font-bold">{(pendingRestoreData.dietPlans || pendingRestoreData.diet_plans)?.length || 0}</span> نظام غذائي</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setPendingRestoreData(null);
                  setPendingFileName('');
                }}
                disabled={isRestoringBackup}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                إلغاء الأمر
              </button>
              <button
                type="button"
                onClick={handleConfirmFullRestore}
                disabled={isRestoringBackup}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
              >
                {isRestoringBackup ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>نعم، استرجع واستبدل كل البيانات الآن</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
