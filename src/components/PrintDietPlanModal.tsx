import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { ClinicSettings } from '../types';
import { Printer, Download, X, FileText, User, Scale, Calendar, CheckCircle2, Loader2, Sparkles, MessageSquare, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintDietPlanModalProps {
  patientName?: string;
  patientCode?: string;
  patientPhone?: string;
  currentWeight?: number | null;
  currentHeight?: number | null;
  fatPercentage?: number | null;
  musclePercentage?: number | null;
  waterPercentage?: number | null;
  boneMass?: number | null;
  doctorNotes?: string | null;
  dietTitle?: string;
  dietContent: string;
  autoPrint?: boolean;
  autoPdf?: boolean;
  onClose: () => void;
}

export const PrintDietPlanModal: React.FC<PrintDietPlanModalProps> = ({
  patientName = 'مريض العيادة',
  patientCode = '',
  patientPhone = '',
  currentWeight,
  currentHeight,
  fatPercentage,
  musclePercentage,
  waterPercentage,
  boneMass,
  doctorNotes,
  dietTitle = 'النظام الغذائي والتعليمات الصحية',
  dietContent,
  autoPrint = false,
  autoPdf = false,
  onClose
}) => {
  const [clinicName, setClinicName] = useState<string>('عيادة التخسيس والتغذية العلاجية');
  const [clinicSubtitle, setClinicSubtitle] = useState<string>('دكتور التغذية العلاجية ومتابعة السمنة والنحافة');
  const [clinicPhone, setClinicPhone] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('نتمنى لكم دوام الصحة والعافية • يرجى الالتزام بالتعليمات والمواعيد');
  const [showVitals, setShowVitals] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(true);

  const [customTitle, setCustomTitle] = useState<string>(dietTitle);
  const [contentToPrint, setContentToPrint] = useState<string>(dietContent);
  const [doctorName, setDoctorName] = useState<string>('دكتورة العيادة المختصة');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await apiRequest<ClinicSettings>('/settings');
        if (settings.pdf_header_title) setClinicName(settings.pdf_header_title);
        else if (settings.clinic_name) setClinicName(settings.clinic_name);

        if (settings.pdf_header_subtitle) setClinicSubtitle(settings.pdf_header_subtitle);
        else if (settings.clinic_subtitle) setClinicSubtitle(settings.clinic_subtitle);

        if (settings.pdf_phone) setClinicPhone(settings.pdf_phone);
        else if (settings.clinic_phone) setClinicPhone(settings.clinic_phone);

        if (settings.pdf_footer_text) setFooterText(settings.pdf_footer_text);
        if (settings.pdf_show_vitals !== undefined) setShowVitals(settings.pdf_show_vitals);
        if (settings.pdf_show_notes !== undefined) setShowNotes(settings.pdf_show_notes);
      } catch (err) {
        console.error('Failed to load clinic settings for print:', err);
      }
    };
    fetchSettings();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('diet-prescription-sheet');
    if (!element) return;

    try {
      setIsGeneratingPdf(true);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // 1. Sanitize all style elements in clonedDoc to remove/replace oklab and oklch functions
          const styleEls = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styleEls.forEach((sEl) => {
            if (sEl.textContent && (sEl.textContent.includes('oklab') || sEl.textContent.includes('oklch'))) {
              sEl.textContent = sEl.textContent
                .replace(/oklab\([^)]+\)/gi, 'rgb(15, 23, 42)')
                .replace(/oklch\([^)]+\)/gi, 'rgb(15, 23, 42)');
            }
          });

          const sheet = clonedDoc.getElementById('diet-prescription-sheet');
          if (sheet) {
            const canvasHelper = clonedDoc.createElement('canvas');
            const ctx = canvasHelper.getContext('2d');

            const parseColor = (colorStr: string) => {
              if (!colorStr) return '';
              if (!colorStr.includes('oklab') && !colorStr.includes('oklch') && !colorStr.includes('color-mix')) {
                return colorStr;
              }
              if (ctx) {
                try {
                  ctx.fillStyle = '#000000';
                  ctx.fillStyle = colorStr;
                  return ctx.fillStyle;
                } catch (e) {
                  return 'rgb(15, 23, 42)';
                }
              }
              return 'rgb(15, 23, 42)';
            };

            const colorProps = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
            const allElements = [sheet, ...Array.from(sheet.querySelectorAll('*'))] as HTMLElement[];

            allElements.forEach((el) => {
              const computed = clonedDoc.defaultView?.getComputedStyle(el);
              if (computed) {
                colorProps.forEach((prop) => {
                  const val = computed.getPropertyValue(prop);
                  if (val && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
                    const converted = parseColor(val);
                    (el.style as any)[prop] = converted;
                  }
                });
                (el.style as any).webkitBackdropFilter = 'none';
                el.style.backdropFilter = 'none';
                el.style.boxShadow = 'none';
              }
            });

            sheet.style.backgroundColor = '#ffffff';
            sheet.style.color = '#0f172a';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const cleanPatientName = patientName.replace(/\s+/g, '_');
      const filename = `Diet_Plan_${cleanPatientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = (patientPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    }

    let msg = `أهلاً بك أ/ ${patientName} 🌸\nإليك بيانات وتحاليل وزيارتك في ${clinicName}:\n\n`;
    if (currentWeight) msg += `⚖️ الوزن: ${currentWeight} كجم\n`;
    if (fatPercentage) msg += `🔥 نسبة الدهون: ${fatPercentage}%\n`;
    if (musclePercentage) msg += `💪 نسبة العضلات: ${musclePercentage}%\n`;
    if (waterPercentage) msg += `💧 نسبة المياه: ${waterPercentage}%\n`;
    if (boneMass) msg += `🦴 كتلة العظام: ${boneMass} كجم\n`;

    if (customTitle) msg += `\n📋 ${customTitle}:\n${contentToPrint}\n`;
    if (doctorNotes) msg += `\n📝 ملاحظات الطبيبة:\n${doctorNotes}\n`;

    msg += `\nنتمنى لك دوام الصحة والعافية! ❤️`;

    const encodedMsg = encodeURIComponent(msg);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => handlePrint(), 300);
      return () => clearTimeout(timer);
    }
    if (autoPdf) {
      const timer = setTimeout(() => handleDownloadPdf(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, autoPdf]);

  const todayDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #diet-prescription-sheet, #diet-prescription-sheet * {
            visibility: visible;
          }
          #diet-prescription-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 dir-rtl text-right max-h-[92vh] flex flex-col relative overflow-hidden">
        
        {/* Modal Controls Header (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">معاينة وتنسيق طباعة النظام الغذائي والروشتة</h3>
              <p className="text-[11px] text-slate-500 font-medium">توليد ملف PDF احترافي أو طباعة مباشرة أو إرسال عبر الواتساب</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5"
              title="إرسال النظام للواتساب"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>إرسال واتساب</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>تجهيز الـ PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقية</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Edit controls prior to print */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">عنوان التقرير / النظام:</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم الطبيبة / التوقيع السفلي:</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Printable Prescription Sheet */}
        <div className="overflow-y-auto flex-1 pr-1 bg-slate-100/60 p-2 sm:p-4 rounded-2xl">
          <div 
            id="diet-prescription-sheet"
            className="bg-white border-2 border-purple-900/20 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm max-w-2xl mx-auto font-sans"
          >
            {/* Header / Letterhead */}
            <div className="border-b-2 border-purple-900 pb-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-900 text-white flex items-center justify-center font-black text-sm">
                    ⚕
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-purple-950 tracking-tight">{clinicName}</h1>
                </div>
                {clinicSubtitle && (
                  <p className="text-xs font-bold text-purple-800">{clinicSubtitle}</p>
                )}
                {clinicPhone && (
                  <p className="text-[11px] font-semibold text-slate-600">هاتف العيادة: {clinicPhone}</p>
                )}
              </div>

              <div className="text-left space-y-1 border-r-2 border-purple-200 pr-4">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
                  <span>التاريخ:</span>
                  <span className="text-purple-900 font-extrabold">{todayDate}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  الروشتة والنظام الغذائي المعتمد
                </div>
              </div>
            </div>

            {/* Patient Header Card */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-700 shrink-0" />
                <span>المريض: <strong className="text-purple-950">{patientName}</strong></span>
              </div>

              {patientCode && (
                <div>
                  الكود: <span className="font-mono text-purple-900">{patientCode}</span>
                </div>
              )}

              {currentWeight && (
                <div className="flex items-center gap-1">
                  <Scale className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>الوزن: <strong>{currentWeight} كجم</strong></span>
                </div>
              )}

              {currentHeight && (
                <div>
                  الطول: <strong>{currentHeight} سم</strong>
                </div>
              )}
            </div>

            {/* Body Composition Details Grid */}
            {showVitals && (fatPercentage || musclePercentage || waterPercentage || boneMass) && (
              <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-teal-950">
                {fatPercentage && (
                  <div className="flex items-center gap-1 bg-white/80 p-1.5 rounded-lg border border-teal-100">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>دهون: <strong className="text-teal-900">{fatPercentage}%</strong></span>
                  </div>
                )}
                {musclePercentage && (
                  <div className="flex items-center gap-1 bg-white/80 p-1.5 rounded-lg border border-teal-100">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>عضلات: <strong className="text-teal-900">{musclePercentage}%</strong></span>
                  </div>
                )}
                {waterPercentage && (
                  <div className="flex items-center gap-1 bg-white/80 p-1.5 rounded-lg border border-teal-100">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>مياه: <strong className="text-teal-900">{waterPercentage}%</strong></span>
                  </div>
                )}
                {boneMass && (
                  <div className="flex items-center gap-1 bg-white/80 p-1.5 rounded-lg border border-teal-100">
                    <Activity className="w-3.5 h-3.5 text-teal-600" />
                    <span>عظام: <strong className="text-teal-900">{boneMass} كجم</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Doctor Notes if present */}
            {showNotes && doctorNotes && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-extrabold text-amber-950 block">📝 ملاحظات وتوصيات الطبيبة:</span>
                <p className="text-amber-900 font-semibold whitespace-pre-wrap">{doctorNotes}</p>
              </div>
            )}

            {/* Diet Title Banner */}
            <div className="text-center border-b border-purple-100 pb-2">
              <h2 className="text-base font-black text-purple-900 inline-block px-6 py-1.5 bg-purple-100/90 rounded-full border border-purple-200">
                {customTitle}
              </h2>
            </div>

            {/* Diet Instruction Content */}
            <div className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed space-y-2 whitespace-pre-wrap min-h-[220px] p-3 bg-slate-50/50 rounded-xl border border-slate-100">
              {contentToPrint || 'لا يوجد نص نظام غذائي مكتوب حتى الآن.'}
            </div>

            {/* Health Tips & Disclaimer */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-1 font-semibold">
              <div className="flex items-center gap-1 font-bold text-amber-950">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>تعليمات صحية عامة:</span>
              </div>
              <p>• الشرب المنتظم للماء (لا يقل عن 2.5 إلى 3 ليتر يومياً).</p>
              <p>• الالتزام بالنوم السليم والابتعاد عن السكريات والمشروبات الغازية.</p>
              <p>• يرجى إحضار هذه الورقة معك في زيارة المتابعة القادمة.</p>
            </div>

            {/* Footer / Doctor Signature */}
            <div className="border-t-2 border-purple-900/20 pt-4 flex items-end justify-between text-xs font-bold text-slate-700">
              <div className="space-y-1 text-slate-500 text-[10px]">
                <p>• {footerText}</p>
                <p>• جميع البيانات والمقاييس العلاجية سرية وشخصية.</p>
              </div>

              <div className="text-center space-y-4">
                <span className="block font-bold text-slate-900">{doctorName}</span>
                <div className="w-32 border-b border-dashed border-slate-400 mx-auto"></div>
                <span className="text-[10px] text-slate-400 font-normal block">توقيع وختم الطبيب</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between shrink-0 no-print">
          <span className="text-[11px] text-slate-400 font-medium">
            تنبيه: يمكنك استخدام زر "تحميل PDF" لحفظ النسخة الرقمية أو "طباعة" للطباعة الورقية.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              إغلاق
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>واتساب</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>تحميل PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقية</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

