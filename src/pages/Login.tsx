import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiRequest } from '../api/client';
import { Stethoscope, User, Lock, LogIn, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      login(data.token, data.user, data.currentShift);
    } catch (err: any) {
      setError(err.message || 'فشل في تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4 relative transition-colors duration-200 gap-5">
      {/* Theme Toggle Top Right */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 left-4 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
        title="تبديل مظهر النظام"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>الوضع الفاتح</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-purple-600" />
            <span>الوضع الليلي</span>
          </>
        )}
      </button>

      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700 p-8 text-right relative overflow-hidden">
        
        {/* Background Decorative Gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gradient-to-br from-blue-500/10 to-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-teal-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-blue-500/25">
            <Stethoscope className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">عيادة التخسيس والتغذية</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">نظام المتابعة السحابي وإدارة الشيفتات</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">اسم المستخدم (Username):</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="off"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">كلمة المرور (Password):</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          نظام العيادة السحابي الآمن • بيانات الدخول مخصصة لكل مستخدم
        </p>

      </div>
    </div>
  );
};

