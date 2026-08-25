import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { NetworkConfigModal } from './NetworkConfigModal';
import { ClinicSettingsModal } from './ClinicSettingsModal';
import { apiRequest } from '../api/client';
import { ClinicSettings } from '../types';
import { 
  Stethoscope, 
  Receipt, 
  LogOut, 
  Wifi, 
  WifiOff, 
  BarChart3, 
  Users, 
  Clock, 
  QrCode,
  Bell,
  Settings,
  Sun,
  Moon,
  History,
  Laptop
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, logout, currentShift } = useAuth();
  const { isConnected, notifications, clearNotifications } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [showNetworkModal, setShowNetworkModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState<boolean>(false);

  const [clinicName, setClinicName] = useState<string>('عيادة التخسيس والتغذية');
  const [clinicSubtitle, setClinicSubtitle] = useState<string>('');

  const loadSettings = async () => {
    try {
      const data = await apiRequest<ClinicSettings>('/settings');
      if (data) {
        setClinicName(data.clinic_name || 'عيادة التخسيس والتغذية');
        setClinicSubtitle(data.clinic_subtitle || '');
      }
    } catch (err) {
      console.error('Failed to load clinic settings in navbar:', err);
    }
  };

  useEffect(() => {
    loadSettings();

    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setClinicName(e.detail.clinic_name || 'عيادة التخسيس والتغذية');
        setClinicSubtitle(e.detail.clinic_subtitle || '');
      } else {
        loadSettings();
      }
    };

    window.addEventListener('clinic-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('clinic-settings-updated', handleSettingsUpdate);
    };
  }, []);

  if (!user) return null;

  return (
    <>
      <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Right Side: Logo & Main Navigation */}
            <div className="flex items-center space-x-reverse space-x-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">{clinicName}</h1>
                  {clinicSubtitle ? (
                    <span className="text-xs text-slate-500 font-medium">{clinicSubtitle}</span>
                  ) : null}
                </div>
              </div>

              {/* Navigation Tabs based on Role */}
              <nav className="hidden md:flex items-center space-x-reverse space-x-1 pr-6 border-r border-slate-200">
                {user.role === 'Assistant' && (
                  <button
                    onClick={() => setCurrentTab('reception')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      currentTab === 'reception'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    شاشة الاستقبال والكاشير
                  </button>
                )}

                {user.role === 'Admin' && (
                  <>
                    <button
                      onClick={() => setCurrentTab('queue')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentTab === 'queue'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4" />
                      قائمة الانتظار والكشف
                    </button>

                    <button
                      onClick={() => setCurrentTab('reports')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentTab === 'reports'
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      التقارير المالية والشيفتات
                    </button>

                    <button
                      onClick={() => setCurrentTab('audit')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentTab === 'audit'
                          ? 'bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
                      }`}
                      title="سجل التتبع والعمليات الحية (Audit Log)"
                    >
                      <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      سجل النشاطات
                    </button>

                    <button
                      onClick={() => setCurrentTab('users')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentTab === 'users'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      حسابات الكاشيرية
                    </button>

                    <button
                      onClick={() => setCurrentTab('settings')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentTab === 'settings'
                          ? 'bg-purple-50 text-purple-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title="صفحة إعدادات العيادة وتفضيلات النظام"
                    >
                      <Settings className="w-4 h-4 text-purple-600" />
                      الإعدادات
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Left Side: Status Pills, QR Code, Profile & Logout */}
            <div className="flex items-center space-x-reverse space-x-3">

              {/* Shift Status Pill (for Assistant) */}
              {user.role === 'Assistant' && (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  currentShift
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {currentShift ? `شيفت مفتوح (#${currentShift.id})` : 'الشيفت مغلق'}
                </div>
              )}

              {/* Cloud Sync Status Indicator & Share Button */}
              <button
                onClick={() => setShowNetworkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/30"
                title="حالة المزامنة السحابية الفورية (Google Firebase)"
              >
                <div className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded-md text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                  <span>متصل</span>
                </div>
                <span className="hidden sm:inline">☁️ المزامنة السحابية</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold"
                title={theme === 'dark' ? 'التحويل للوضع الفاتح (النهاري)' : 'التحويل للوضع الليلي (Dark Mode)'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden lg:inline text-amber-300">الوضع الفاتح</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-purple-600 shrink-0" />
                    <span className="hidden lg:inline text-purple-700">الوضع الليلي</span>
                  </>
                )}
              </button>

              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                  className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
                  title="التنبيهات اللحظية"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {showNotificationsMenu && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-800">التنبيهات اللحظية ({notifications.length})</span>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          مسح الكل
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">لا توجد إشعارات جديدة حالياً</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className="p-2 bg-slate-50 rounded-lg text-xs text-slate-700 space-y-0.5 border border-slate-100">
                            <div className="flex justify-between font-semibold text-slate-900">
                              <span>تنبيه</span>
                              <span className="text-[10px] text-slate-400 font-normal">{n.timestamp}</span>
                            </div>
                            <p>{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Profile Badge */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{user.fullName}</div>
                  <div className="text-[11px] font-medium text-slate-500">
                    {user.role === 'Admin' ? 'الدكتورة / الأدمن' : 'مساعد / كاشير'}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                  user.role === 'Admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'Admin' ? 'Admin' : 'Assistant'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* Network Modal */}
      {showNetworkModal && (
        <NetworkConfigModal onClose={() => setShowNetworkModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <ClinicSettingsModal 
          onClose={() => setShowSettingsModal(false)} 
          onSettingsSaved={(newS) => {
            setClinicName(newS.clinic_name);
            setClinicSubtitle(newS.clinic_subtitle);
          }}
        />
      )}
    </>
  );
};
