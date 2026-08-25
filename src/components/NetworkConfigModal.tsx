import React, { useState } from 'react';
import { X, Copy, Check, Cloud, CheckCircle2, Globe, ShieldCheck, Sparkles, Smartphone, Monitor } from 'lucide-react';

interface NetworkConfigModalProps {
  onClose: () => void;
}

export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const currentAppUrl = window.location.origin;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <span>المزامنة السحابية الذكية (Firebase Cloud)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 my-5">
          {/* Status badge */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-black text-emerald-900 dark:text-emerald-300">السيرفر السحابي متصل بنجاح 🟢</div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  بيانات المرضى، الكشوفات، الشيفتات، والتقارير تتزامن فورياً وتلقائياً.
                </p>
              </div>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              رابط النظام المباشر للعيادة:
            </label>
            <div className="flex items-center gap-2 dir-ltr">
              <input
                type="text"
                readOnly
                value={currentAppUrl}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-mono font-bold rounded-xl px-3.5 py-2.5 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleCopy(currentAppUrl)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Device Sync Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 text-xs space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>كيف يعمل الربط السحابي؟</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>شاشة الدكتورة:</span>
                </div>
                <p>تفتح الرابط وتسجل الدخول بحساب الأدمن لمتابعة كشوفات اليوم وملفات المرضى.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>شاشة الاستقبال:</span>
                </div>
                <p>يفتح نفس الرابط من أي متصفح ويسجل المرضى والشيفتات لتظهر للدكتورة فوراً.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 dark:bg-purple-600 hover:bg-slate-800 dark:hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            حسناً، فهمت
          </button>
        </div>

      </div>
    </div>
  );
};
