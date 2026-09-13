import React, { useState } from 'react';
import { 
  X, 
  Save, 
  History, 
  Scale, 
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../api/client';

interface AddPastWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  defaultHeight?: number | null;
  onSaved?: () => void;
  onAdded?: () => void;
}

export function AddPastWeightModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  defaultHeight,
  onSaved,
  onAdded
}: AddPastWeightModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    recordedAt: today,
    weightKg: '',
    heightCm: defaultHeight ? defaultHeight.toString() : '',
    fatPercentage: '',
    musclePercentage: '',
    waterPercentage: '',
    boneMass: '',
    notes: '',
    doctorNotes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.weightKg || parseFloat(formData.weightKg) <= 0) {
      setErrorMessage('يرجى إدخال قيمة الوزن المسجل');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiRequest(`/patients/${patientId}/historical-measurements`, {
        method: 'POST',
        body: {
          recordedAt: formData.recordedAt ? new Date(formData.recordedAt).toISOString() : new Date().toISOString(),
          weightKg: parseFloat(formData.weightKg),
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : undefined,
          fatPercentage: formData.fatPercentage ? parseFloat(formData.fatPercentage) : undefined,
          musclePercentage: formData.musclePercentage ? parseFloat(formData.musclePercentage) : undefined,
          waterPercentage: formData.waterPercentage ? parseFloat(formData.waterPercentage) : undefined,
          boneMass: formData.boneMass ? parseFloat(formData.boneMass) : undefined,
          notes: formData.notes,
          doctorNotes: formData.doctorNotes
        }
      });

      if (onSaved) onSaved();
      if (onAdded) onAdded();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل في حفظ الوزن السابق');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-8 text-right animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">إضافة وزن وقياس سابق للأرشيف</h3>
              <p className="text-xs text-teal-100 font-medium">المريض: {patientName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ القياس أو الزيارة السابقة <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.recordedAt}
              onChange={e => setFormData({ ...formData, recordedAt: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الوزن (كجم) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.weightKg}
                onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                placeholder="مثال: 88.5"
                className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-emerald-900 focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الطول (سم)</label>
              <input
                type="number"
                value={formData.heightCm}
                onChange={e => setFormData({ ...formData, heightCm: e.target.value })}
                placeholder="مثال: 165"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-hidden focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نسبة الدهون % InBody</label>
              <input
                type="number"
                step="0.1"
                value={formData.fatPercentage}
                onChange={e => setFormData({ ...formData, fatPercentage: e.target.value })}
                placeholder="مثال: 32.4"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نسبة العضل % InBody</label>
              <input
                type="number"
                step="0.1"
                value={formData.musclePercentage}
                onChange={e => setFormData({ ...formData, musclePercentage: e.target.value })}
                placeholder="مثال: 28.1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الزيارة السابقة</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="مثال: كان يتبع دايت 1500 سعر ونزل 3 كيلو خلال أسبوعين..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-teal-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ الوزن في الأرشيف</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
