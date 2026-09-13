import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider, useSocket } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { NotificationToastContainer } from './components/NotificationToast';
import { Login } from './pages/Login';
import { ReceptionDashboard } from './pages/reception/ReceptionDashboard';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { ReportsDashboard } from './pages/doctor/ReportsDashboard';
import { UsersManagement } from './pages/doctor/UsersManagement';
import { AdminSettings } from './pages/doctor/AdminSettings';
import { AuditLogsPage } from './pages/doctor/AuditLogsPage';
import { PatientsDirectoryPage } from './pages/doctor/PatientsDirectoryPage';
import { WifiOff, RefreshCw } from 'lucide-react';

function MainAppContent() {
  const { user, isLoading, refreshCurrentShift } = useAuth();
  const { isConnected } = useSocket();
  const [currentTab, setCurrentTab] = useState<string>('');

  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') {
        setCurrentTab('queue');
      } else {
        setCurrentTab('reception');
      }
    }
  }, [user]);

  // When connection restores after being offline, refresh current shift data
  useEffect(() => {
    if (isConnected && user) {
      refreshCurrentShift();
    }
  }, [isConnected]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">جاري تحميل نظام العيادة...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased dir-rtl text-right transition-colors duration-200">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {!isConnected && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md border-b border-amber-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-100 shrink-0 animate-pulse" />
            <span>
              جاري الاتصال بسيرفر العيادة الرئيسي... جميع بيانات العيادة وشيفت العمل محفوظة بأمان في قاعدة البيانات المحلية.
            </span>
          </div>
          <button
            onClick={() => refreshCurrentShift()}
            className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      <main className="pb-12">
        {user.role === 'Assistant' && (
          <>
            {currentTab === 'patients' ? (
              <PatientsDirectoryPage />
            ) : (
              <ReceptionDashboard />
            )}
          </>
        )}

        {user.role === 'Admin' && (
          <>
            {currentTab === 'queue' && <DoctorDashboard />}
            {currentTab === 'patients' && <PatientsDirectoryPage />}
            {currentTab === 'reports' && <ReportsDashboard />}
            {currentTab === 'audit' && <AuditLogsPage />}
            {currentTab === 'users' && <UsersManagement />}
            {currentTab === 'settings' && <AdminSettings />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <MainAppContent />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

