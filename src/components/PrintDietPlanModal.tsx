import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api/client';
import { ClinicSettings } from '../types';
import { 
  Printer, Download, X, FileText, User, Scale, Calendar, CheckCircle2, 
  Loader2, Sparkles, MessageSquare, Activity, Copy, Check, RefreshCw, Send, Phone
} from 'lucide-react';
import { printCleanDocument, exportElementToPdf } from '../utils/printUtils';

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
  initialTab?: 'print' | 'whatsapp';
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
  initialTab = 'print',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'print' | 'whatsapp'>(initialTab);
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

  // WhatsApp State
  const [targetPhone, setTargetPhone] = useState<string>(patientPhone || '');
  const [whatsappText, setWhatsappText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Compute BMI if weight and height exist
  const bmiValue = useMemo(() => {
    if (currentWeight && currentHeight && currentHeight > 50) {
      const heightInMeters = currentHeight / 100;
      const val = currentWeight / (heightInMeters * heightInMeters);
      return val.toFixed(1);
    }
    return null;
  }, [currentWeight, currentHeight]);

  // Function to build standard beautiful WhatsApp message
  const buildDefaultWhatsAppMessage = () => {
    let msg = `🌟 *${clinicName}* 🌟\n`;
    if (clinicSubtitle) msg += `_${clinicSubtitle}_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `أهلاً بكِ أ/ *${patientName}* 🌸\n`;
    if (patientCode) msg += `🔖 كود المريض: \`${patientCode}\`\n`;
    msg += `📅 تاريخ الزيارة: ${todayDate}\n\n`;

    const hasInBody = currentWeight || currentHeight || fatPercentage || musclePercentage || waterPercentage || boneMass;
    if (hasInBody) {
      msg += `📊 *نتائج قياسات الجسم والـ InBody:*\n`;
      if (currentWeight) msg += `⚖️ الوزن الحالي: *${currentWeight} كجم*\n`;
      if (currentHeight) msg += `📏 الطول: *${currentHeight} سم*\n`;
      if (bmiValue) msg += `📈 مؤشر كتلة الجسم (BMI): *${bmiValue}*\n`;
      if (fatPercentage) msg += `🔥 نسبة الدهون: *${fatPercentage}%*\n`;
      if (musclePercentage) msg += `💪 نسبة العضلات: *${musclePercentage}%*\n`;
      if (waterPercentage) msg += `💧 نسبة المياه: *${waterPercentage}%*\n`;
      if (boneMass) msg += `🦴 كتلة العظام: *${boneMass} كجم*\n`;
      msg += `\n`;
    }

    if (contentToPrint && contentToPrint.trim()) {
      msg += `🥗 *${customTitle || 'النظام الغذائي المخصص'}:*\n`;
      msg += `${contentToPrint.trim()}\n\n`;
    }

    if (doctorNotes && doctorNotes.trim() && doctorNotes.trim() !== contentToPrint.trim()) {
      msg += `📝 *ملاحظات وتوجيهات الطبيبة:*\n`;
      msg += `${doctorNotes.trim()}\n\n`;
    }

    msg += `💡 *تعليمات هامة:*\n`;
    msg += `• شرب 2.5 إلى 3 لتر ماء يومياً.\n`;
    msg += `• الالتزام بمواعيد الوجبات المقررة وساعات النوم.\n`;
    msg += `• إحضار تقرير القياسات الحالي في المتابعة القادمة.\n\n`;

    if (clinicPhone) {
      msg += `📞 للتواصل مع العيادة: ${clinicPhone}\n`;
    }
    msg += `نتمنى لكِ دوام الصحة والعافية والوصول للوزن المثالي دائماً! 💚`;

    return msg;
  };

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

  // Initialize WhatsApp text
  useEffect(() => {
    setWhatsappText(buildDefaultWhatsAppMessage());
  }, [clinicName, clinicSubtitle, clinicPhone, patientName, patientCode, currentWeight, currentHeight, fatPercentage, musclePercentage, waterPercentage, boneMass, contentToPrint, doctorNotes, customTitle]);

  const handlePrint = () => {
    const element = document.getElementById('diet-prescription-sheet');
    if (element) {
      printCleanDocument(`نظام_غذائي_${patientName || 'مريض'}_${patientCode || ''}`, element.innerHTML);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('diet-prescription-sheet');
    if (!element) return;

    try {
      setIsGeneratingPdf(true);
      const cleanPatientName = (patientName || 'مريض').replace(/\s+/g, '_');
      const filename = `Diet_Plan_${cleanPatientName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      await exportElementToPdf(element, filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = (targetPhone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '20' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
      cleanPhone = '20' + cleanPhone;
    }

    const encodedMsg = encodeURIComponent(whatsappText);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleResetMessage = () => {
    setWhatsappText(buildDefaultWhatsAppMessage());
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

      <div className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 dir-rtl text-right max-h-[94vh] flex flex-col relative overflow-hidden">
        
        {/* Modal Controls Header (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              {activeTab === 'print' ? <Printer className="w-5 h-5" /> : <MessageSquare className="w-5 h-5 text-emerald-600" />}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {activeTab === 'print' ? 'طباعة وتصدير النظام الغذائي والروشتة' : 'إرسال النظام والقياسات عبر الواتساب للمريض'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeTab === 'print' ? 'توليد ملف PDF أو طباعة ورقية فورية' : 'تنسيق رسالة واتساب أنيقة ومخصصة وإرسالها بنقرة واحدة'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'print'
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>الروشتة الورقية / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>رسالة الواتساب</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'whatsapp' ? (
          /* WHATSAPP TAB VIEW */
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Phone & Controls Header */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-bold text-emerald-950 block mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    <span>رقم هاتف المريض (الواتساب):</span>
                  </label>
                  <input
                    type="tel"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="01xxxxxxxxx أو 201xxxxxxxxx"
                    className="w-full px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-left dir-ltr"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 sm:pt-4">
                  <button
                    type="button"
                    onClick={handleResetMessage}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
                    title="استرجاع النص النموذجي التلقائي"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>إعادة ضبط النص</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-98"
                  >
                    <Send className="w-4 h-4" />
                    <span>فتح الواتساب وإرسال</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Editable Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>محتوى رسالة الواتساب (يمكنك تعديل أي جزء من النص قبل الإرسال):</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">{whatsappText.length} حرف</span>
              </div>

              <textarea
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                rows={12}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all leading-relaxed whitespace-pre-wrap font-sans"
                placeholder="اكتب رسالة الواتساب هنا..."
              />
            </div>

            {/* Quick Preview Tips */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>ملاحظة ذكية:</strong> عند الضغط على "فتح الواتساب وإرسال"، سيتم فتح محادثة المريض مباشرة مع النص الجاهز بالكامل، ويمكنك إرساله على الفور عبر واتساب الويب أو التطبيق.
              </span>
            </div>
          </div>
        ) : (
          /* PRINT / PDF TAB VIEW */
          <>
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
                {showVitals && (fatPercentage || musclePercentage || waterPercentage || boneMass || bmiValue) && (
                  <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold text-teal-950">
                    {bmiValue && (
                      <div className="flex items-center gap-1 bg-white/80 p-1.5 rounded-lg border border-teal-100">
                        <Activity className="w-3.5 h-3.5 text-teal-600" />
                        <span>BMI: <strong className="text-teal-900">{bmiValue}</strong></span>
                      </div>
                    )}
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
          </>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between shrink-0 no-print">
          <span className="text-[11px] text-slate-400 font-medium">
            {activeTab === 'print' 
              ? 'تنبيه: يمكنك استخدام زر "تحميل PDF" أو "طباعة ورقية" للنسخة الرسمية.'
              : 'تنبيه: سيتم فتح تطبيق أو موقع الواتساب وإرسال الرسالة إلى رقم المريض المحدد.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              إغلاق
            </button>
            
            {activeTab === 'print' ? (
              <>
                <button
                  onClick={() => setActiveTab('whatsapp')}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>تجهيز رسالة واتساب</span>
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>تحميل PDF</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة ورقية</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSendWhatsApp}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>إرسال عبر الواتساب الآن</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
