import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api/client';
import { User } from '../../types';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, Key, Lock, UserCheck } from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: ''
  });

  const loadUsers = async () => {
    try {
      const data = await apiRequest<User[]>('/admin/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.fullName) {
      setErrorMessage('جميع البيانات مطلوبة');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: newUser
      });

      setSuccessMessage(`تم إنشاء حساب الكاشير (${newUser.fullName}) بنجاح!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      setShowAddModal(false);
      setNewUser({ username: '', password: '', fullName: '' });
      loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في إنشاء حساب الكاشير');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: number, currentActive: boolean) => {
    try {
      await apiRequest(`/admin/users/${userId}/toggle-active`, {
        method: 'PUT'
      });

      setSuccessMessage(currentActive ? 'تم تعطيل الحساب بنجاح' : 'تم تفعيل الحساب بنجاح');
      setTimeout(() => setSuccessMessage(null), 3000);

      loadUsers();
    } catch (err: any) {
      console.error('Failed to toggle active status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-right space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">إدارة حسابات الكاشيرية والمساعدين</h2>
            <p className="text-xs text-slate-500 font-medium">إضافة حساب كاشير جديد، تفعيل أو تعطيل الحسابات، وصلاحيات الشيفتات</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة كاشير جديد</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">جاري تحميل قائمة المستخدمين...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">الاسم الكامل</th>
                  <th className="p-3">اسم المستخدم (Username)</th>
                  <th className="p-3">الدور (Role)</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">آخر تسجيل دخول</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-3 font-mono text-purple-700">{u.username}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role === 'Admin' ? 'الدكتورة / الأدمن' : 'كاشير / استقبال'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ar-EG') : 'لم يدخل بعد'}
                    </td>
                    <td className="p-3">
                      {u.role !== 'Admin' && (
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            u.isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {u.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-600" />
                <span>إضافة حساب كاشير جديد</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الاسم الكامل للكاشير: *</label>
                <input
                  type="text"
                  value={newUser.fullName}
                  onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="مثال: ياسمين أحمد"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">اسم المستخدم للدخول (Username): *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="مثال: cashier3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">كلمة المرور: *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'حفظ الكاشير'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
