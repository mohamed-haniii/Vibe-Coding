import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../api/client';
import { Clock, CheckCircle2, AlertCircle, X, DollarSign, Users, Layers } from 'lucide-react';

interface ShiftModalProps {
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ onClose }) => {
  const { currentShift, refreshCurrentShift, user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenShift = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/shifts/open', { method: 'POST' });
      await refreshCurrentShift();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في فتح الشيفت');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/shifts/close', { method: 'PUT' });
      await refreshCurrentShift();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل في إغلاق الشيفت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>إدارة شيفت العمل الكاشير</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {currentShift ? (
          /* Active Shift Details & Close Option */
          <div className="space-y-4 my-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>لديك شيفت عمل مفتوح حالياً (#${currentShift.id})</span>
              </div>
              <p className="text-xs text-emerald-700">
                تاريخ البداية: {new Date(currentShift.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            </div>

            {/* Shift Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-500 font-semibold mb-0.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-blue-600" />
                  إيراد الكشوفات
                </div>
                <div className="text-sm font-black text-slate-800">
                  {currentShift.totalAmount} <span className="text-[10px] font-normal">ج.م</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-semibold mb-0.5">
                  + الإيداعات
                </div>
                <div className="text-sm font-black text-emerald-600">
                  +{currentShift.totalCashIn || 0} <span className="text-[10px] font-normal">ج.م</span>
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-700 font-semibold mb-0.5">
                  - المصاريف
                </div>
                <div className="text-sm font-black text-rose-600">
                  -{currentShift.totalExpenses || 0} <span className="text-[10px] font-normal">ج.م</span>
                </div>
              </div>

              <div className="bg-purple-100/70 border border-purple-300 p-2.5 rounded-xl">
                <div className="text-[10px] text-purple-900 font-bold mb-0.5">
                  صافي الدرج
                </div>
                <div className="text-sm font-black text-purple-700">
                  {currentShift.netDrawerCash !== undefined ? currentShift.netDrawerCash : ((currentShift.totalAmount || 0) + (currentShift.totalCashIn || 0) - (currentShift.totalExpenses || 0))} <span className="text-[10px] font-normal">ج.م</span>
                </div>
              </div>
            </div>

            {/* Visit Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>تفاصيل الزيارات:</span>
                </span>
                <span className="text-blue-600 font-extrabold text-xs">{currentShift.totalVisits} زيارة</span>
              </div>

              <div className="flex justify-between items-center text-xs py-0.5 border-b border-slate-200/60">
                <span className="text-slate-600 font-medium">كشف جديد (200 ج.م):</span>
                <span className="font-bold text-slate-900">{currentShift.newVisitsCount}</span>
              </div>

              <div className="flex justify-between items-center text-xs py-0.5 border-b border-slate-200/60">
                <span className="text-slate-600 font-medium">إعادة (50 ج.م):</span>
                <span className="font-bold text-slate-900">{currentShift.followupVisitsCount}</span>
              </div>

              <div className="flex justify-between items-center text-xs py-0.5">
                <span className="text-slate-600 font-medium">نظام تثبيت (60 ج.م):</span>
                <span className="font-bold text-slate-900">{currentShift.maintenanceVisitsCount}</span>
              </div>
            </div>

            {/* Drawer Transactions in Shift */}
            {currentShift.drawerTransactions && currentShift.drawerTransactions.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 max-h-32 overflow-y-auto">
                <div className="text-xs font-bold text-slate-700 mb-1">
                  حركات ومصاريف الدرج المسجلة بالشيفت ({currentShift.drawerTransactions.length}):
                </div>
                {currentShift.drawerTransactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-200/50 last:border-none">
                    <span className="text-slate-700 truncate max-w-[200px]" title={tx.notes}>
                      {tx.type === 'Expense' ? '🔴' : '🟢'} {tx.notes}
                    </span>
                    <span className={`font-black ${tx.type === 'Expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {tx.type === 'Expense' ? '-' : '+'}{tx.amount} ج.م
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleCloseShift}
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'جاري الإغلاق...' : 'إغلاق الشيفت وتسليم الحساب'}
            </button>
          </div>
        ) : (
          /* No Open Shift - Open Shift Action */
          <div className="space-y-4 my-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>لا يوجد شيفت عمل مفتوح باسمك</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                لكي تفرز وتستقبل أي مريض جديد في النظام، يجب عليك فتح شيفت جديد لربط العمليات المالية بحسابك تلقائياً.
              </p>
            </div>

            <button
              onClick={handleOpenShift}
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {loading ? 'جاري الفتح...' : 'بدء شيفت جديد الآن'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
