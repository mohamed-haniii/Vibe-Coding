import React, { useState, useEffect } from 'react';
import { X, Copy, Check, CheckCircle2, ShieldCheck, Sparkles, Smartphone, Monitor, Wifi, QrCode } from 'lucide-react';
import { apiRequest } from '../api/client';

interface NetworkConfigModalProps {
  onClose: () => void;
}

export const NetworkConfigModal: React.FC<NetworkConfigModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [networkInfo, setNetworkInfo] = useState<{
    serverIp: string;
    port: number;
    appUrl: string;
    localNetworkUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);

  useEffect(() => {
    apiRequest('/network/info')
      .then((data) => setNetworkInfo(data))
      .catch((err) => console.error('Failed to load network info:', err));
  }, []);

  const targetUrl = networkInfo?.localNetworkUrl || window.location.origin;

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
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-lg">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <span>ربط ومزامنة أجهزة العيادة (الشبكة المحلية)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 max-h-[75vh] overflow-y-auto pl-1">
          {/* Status badge */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-black text-emerald-900 dark:text-emerald-300">السيرفر المحلي وقاعدة البيانات متصلة وجاهزة 🟢</div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  قاعدة البيانات محلية وسريعة جداً (SQLite)، ويتم تحديث كشف الدور والشيفتات لحظياً بين الأجهزة.
                </p>
              </div>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
              🔗 الرابط الذي تفتحه على الجهاز الثاني (جهاز الاستقبال أو التابلت):
            </label>
            <div className="flex items-center gap-2 dir-ltr">
              <input
                type="text"
                readOnly
                value={targetUrl}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 text-sm font-mono font-black rounded-xl px-3.5 py-2.5 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleCopy(targetUrl)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
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
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
              ⚠️ <strong>تنبيه هام:</strong> لا تكتب كلمة <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-rose-600 font-black">localhost</code> على الجهاز الثاني! اكتب عنوان الآي بي الموضح أعلاه (مثل <code className="font-mono">{targetUrl}</code>) لكي يتصل بجهاز اللابتوب الرئيسي.
            </p>
          </div>

          {/* QR Code section if available */}
          {networkInfo?.qrCodeDataUrl && (
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <img 
                src={networkInfo.qrCodeDataUrl} 
                alt="QR Code للربط المباشر" 
                className="w-24 h-24 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
              />
              <div className="text-xs space-y-1">
                <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-teal-600" />
                  <span>فتح السيستم على الموبايل أو التابلت:</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  امسح رمز الـ QR بكاميرا الهاتف أو التابلت المتصل بنفس شبكة الواي فاي ليفتح البرنامج فوراً بدون كتابة الرابط.
                </p>
              </div>
            </div>
          )}

          {/* Device Sync Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 text-xs space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>خطوات تشغيل العيادة على جهازين:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>1. الجهاز الرئيسي (لابتوب الدكتورة):</span>
                </div>
                <p>تشغيل السيرفر وفتح الرابط وتسجيل الدخول بحساب الأدمن.</p>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700 space-y-1">
                <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>2. جهاز الاستقبال / الكاشير:</span>
                </div>
                <p>فتح متصفح كروم وكتابة الرابط الذي يحتوي على الآي بي والدخول بحساب الكاشير.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            حسناً، فهمت
          </button>
        </div>

      </div>
    </div>
  );
};
