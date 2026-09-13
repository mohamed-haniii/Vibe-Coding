import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Receipt,
  FileText,
  Tag,
  Coins
} from 'lucide-react';

interface DrawerTransactionModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const COMMON_EXPENSE_CATEGORIES = [
  'منظفات ومستلزمات نظافة',
  'شاي وضيافة وبوفيه',
  'أدوات مكتبية ومطبوعات',
  'صيانة وكهرباء',
  'إكراميات ونثريات',
  'مصاريف إدارية',
  'أخرى'
];

const COMMON_CASH_IN_CATEGORIES = [
  'إيداع عهدة بداية اليوم',
  'إيداع فكة ونقدية إضافية',
  'توريد حسابات خارجية',
  'أخرى'
];

export const DrawerTransactionModal: React.FC<DrawerTransactionModalProps> = ({ onClose, onSuccess }) => {
  const { currentShift, refreshCurrentShift } = useAuth();

  const [type, setType] = useState<'Expense' | 'CashIn'>('Expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(COMMON_EXPENSE_CATEGORIES[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    if (!notes.trim()) {
      setErrorMsg('يرجى كتابة بيان / تعليق سبب الحركة (الكومينت)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/shifts/drawer-transaction', {
        method: 'POST',
        body: {
          type,
          amount: numAmount,
          category,
          notes: notes.trim()
        }
      });

      setSuccessMsg(type === 'Expense' ? 'تم تسجيل سحب المصروف من الدرج وتحديث الحسابات بنجاح!' : 'تم تسجيل إيداع النقدية في الدرج بنجاح!');
      setAmount('');
      setNotes('');
      await refreshCurrentShift();
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل في حفظ حركة الدرج');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الحركة من الدرج؟')) return;
    try {
      await apiRequest(`/shifts/drawer-transaction/${id}`, { method: 'DELETE' });
      await refreshCurrentShift();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل في إلغاء الحركة');
    }
  };

  const transactions = currentShift?.drawerTransactions || [];
  const totalRevenue = currentShift?.totalAmount || 0;
  const totalCashIn = currentShift?.totalCashIn || 0;
  const totalExpenses = currentShift?.totalExpenses || 0;
  const netDrawerCash = currentShift?.netDrawerCash !== undefined ? currentShift.netDrawerCash : (totalRevenue + totalCashIn - totalExpenses);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-black text-base">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3>مصاريف وسحب / إيداع نقدية من الدرج</h3>
              <p className="text-xs text-slate-400 font-normal">تسجيل أي حركة خروج أو دخول للمال من الدرج مع التوثيق بالكومينت</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Balance Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">إيراد الكشوفات (كاش)</span>
            <span className="text-sm font-black text-slate-800">{totalRevenue} ج.م</span>
          </div>

          <div>
            <span className="text-[11px] text-emerald-600 font-semibold block flex items-center gap-0.5">
              <ArrowDownLeft className="w-3 h-3" />
              إجمالي الإيداعات
            </span>
            <span className="text-sm font-black text-emerald-600">+{totalCashIn} ج.م</span>
          </div>

          <div>
            <span className="text-[11px] text-rose-600 font-semibold block flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              إجمالي المصاريف
            </span>
            <span className="text-sm font-black text-rose-600">-{totalExpenses} ج.م</span>
          </div>

          <div className="bg-purple-50/80 p-2 rounded-xl border border-purple-200/60">
            <span className="text-[11px] text-purple-900 font-bold block">صافي النقدية بالدرج</span>
            <span className="text-base font-black text-purple-700">{netDrawerCash} ج.م</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Transaction Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
          
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('Expense');
                setCategory(COMMON_EXPENSE_CATEGORIES[0]);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'Expense'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>🔴 سحب / مصروف من الدرج (شراء منظفات، ضيافة، إلخ)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('CashIn');
                setCategory(COMMON_CASH_IN_CATEGORIES[0]);
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'CashIn'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>🟢 إيداع / إضافة نقدية للدرج (عهدة، فكة)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                المبلغ (جنيه مصري): *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="مثال: 50"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-purple-500"
                  required
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ج.م</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                التصنيف / البند:
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-500"
              >
                {(type === 'Expense' ? COMMON_EXPENSE_CATEGORIES : COMMON_CASH_IN_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              بيان السبب / تعليق تفصيلي (الكومينت): *
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={type === 'Expense' ? 'مثال: شراء ديتول وكلور ومناديل للعيادة' : 'مثال: وضع فكة 100 جنيه في الدرج'}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                type === 'Expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{type === 'Expense' ? 'حفظ خصم المصروف من الدرج' : 'حفظ إيداع النقدية بالدرج'}</span>
            </button>
          </div>
        </form>

        {/* Recent Transactions in Current Shift */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>حركات الدرج المسجلة في الشيفت الحالي ({transactions.length})</span>
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">
              لم يتم تسجيل أي مصاريف أو إيداعات في الشيفت الحالي حتى الآن.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {transactions.map(t => (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                    t.type === 'Expense'
                      ? 'bg-rose-50/50 border-rose-200/80 text-rose-950'
                      : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      t.type === 'Expense' ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                    }`}>
                      {t.type === 'Expense' ? 'مصروف' : 'إيداع'}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{t.notes}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>التصنيف: {t.category || '--'}</span>
                        <span>•</span>
                        <span>الوقت: {new Date(t.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`font-black text-sm ${t.type === 'Expense' ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {t.type === 'Expense' ? '-' : '+'}{t.amount} ج.م
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                      title="مسح الحركة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
