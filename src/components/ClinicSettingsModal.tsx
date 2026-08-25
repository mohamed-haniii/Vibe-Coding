import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { ClinicSettings } from '../types';
import { Settings, Save, X, Building, Tag, CheckCircle2, Laptop, Download } from 'lucide-react';

interface ClinicSettingsModalProps {
  onClose: () => void;
  onSettingsSaved?: (newSettings: ClinicSettings) => void;
}

export const ClinicSettingsModal: React.FC<ClinicSettingsModalProps> = ({ onClose, onSettingsSaved }) => {
  const [clinicName, setClinicName] = useState<string>('عيادة التخسيس والتغذية');
  const [clinicSubtitle, setClinicSubtitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiRequest<ClinicSettings>('/settings');
        setClinicName(data.clinic_name || 'عيادة التخسيس والتغذية');
        setClinicSubtitle(data.clinic_subtitle || '');
      } catch (err) {
        console.error('Failed to load clinic settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiRequest<ClinicSettings>('/settings', {
        method: 'PUT',
        body: {
          clinic_name: clinicName,
          clinic_subtitle: clinicSubtitle
        }
      });

      setSuccessMsg('تم حفظ إعدادات العيادة بنجاح!');
      if (onSettingsSaved) {
        onSettingsSaved(res);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-6 dir-rtl text-right relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إعدادات العيادة والنظام</h3>
              <p className="text-xs text-slate-500 font-medium">التحكم في اسم العيادة والوصف النصي بالشريط العلوي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">جاري تحميل الإعدادات...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Clinic Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-600" />
                <span>اسم العيادة الرئيسي:</span>
              </label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="مثال: عيادة التخسيس والتغذية العلاجية"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden transition-colors"
              />
            </div>

            {/* Clinic Subtitle Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>الوصف الفرعي أسفل اسم العيادة (يمكن تركه فارغاً):</span>
              </label>
              <input
                type="text"
                value={clinicSubtitle}
                onChange={(e) => setClinicSubtitle(e.target.value)}
                placeholder="مثال: د. أمل مصطفى - استشاري السمنة والنحافة (أو اتركه فارغاً)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-hidden transition-colors"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                ملاحظة: يمكنك تعديل الاسم والوصف الفرعي في أي وقت وسيتحدث تلقائياً في كامل النظام.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التغيرات</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
