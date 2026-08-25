import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { DietPlan } from '../types';
import { PrintDietPlanModal } from './PrintDietPlanModal';
import { Utensils, Plus, Edit2, Trash2, Save, X, CheckCircle2, FileText, Sparkles, Printer, Download } from 'lucide-react';

interface DietPlansModalProps {
  onClose: () => void;
  onSelectPlan?: (planContent: string) => void;
}

export const DietPlansModal: React.FC<DietPlansModalProps> = ({ onClose, onSelectPlan }) => {
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [printingPlan, setPrintingPlan] = useState<DietPlan | null>(null);

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<DietPlan[]>('/diet-plans');
      setDietPlans(data);
    } catch (err: any) {
      console.error('Failed to load diet plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleStartCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsEditing(true);
  };

  const handleStartEdit = (plan: DietPlan) => {
    setEditingId(plan.id);
    setTitle(plan.title);
    setContent(plan.content);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest(`/diet-plans/${id}`, { method: 'DELETE' });
      fetchPlans();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل في حذف النظام');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('عنوان ومحتوى النظام الغذائي مطلوبان');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        await apiRequest(`/diet-plans/${editingId}`, {
          method: 'PUT',
          body: { title, content }
        });
      } else {
        await apiRequest('/diet-plans', {
          method: 'POST',
          body: { title, content }
        });
      }

      setIsEditing(false);
      setEditingId(null);
      setTitle('');
      setContent('');
      fetchPlans();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ النظام الغذائي');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6 dir-rtl text-right max-h-[85vh] flex flex-col relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إدارة الأنظمة الغذائية الجاهزة</h3>
              <p className="text-xs text-slate-500 font-medium">إنشاء وتعديل واستخدام النماذج الغذائية الجاهزة للكشف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form View (Create / Edit) */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-purple-800">
                {editingId ? 'تعديل النظام الغذائي' : 'إضافة نظام غذائي جديد'}
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-500 hover:underline"
              >
                رجوع للقائمة
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">اسم/عنوان النظام الغذائي:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: نظام الصيام المتقطع (16/8)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">محتوى وتفاصيل النظام الغذائي:</label>
              <textarea
                required
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتبي تفاصيل الوجبات والسعرات والنصائح الخاصة بالنظام..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden transition-colors leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ النظام</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* List View */
          <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">الأنظمة المتاحة ({dietPlans.length}):</span>
              <button
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نظام جديد</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الأنظمة...</div>
            ) : dietPlans.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                لا توجد أنظمة غذائية مضافة حتى الآن. اضغطي على "إضافة نظام جديد" للبدء.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                {dietPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <h4 className="text-sm font-extrabold text-slate-900">{plan.title}</h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onSelectPlan && (
                          <button
                            onClick={() => {
                              onSelectPlan(plan.content);
                              onClose();
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                            title="إدراج في الكشف الحالي"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>استخدام بالكشف</span>
                          </button>
                        )}

                        <button
                          onClick={() => setPrintingPlan(plan)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="طباعة نموذج النظام الغذائي"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleStartEdit(plan)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed line-clamp-3 bg-white p-3 rounded-xl border border-slate-100">
                      {plan.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Print Diet Plan Modal */}
      {printingPlan && (
        <PrintDietPlanModal
          dietTitle={printingPlan.title}
          dietContent={printingPlan.content}
          onClose={() => setPrintingPlan(null)}
        />
      )}
    </div>
  );
};
