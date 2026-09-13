import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api/client';
import { 
  X, 
  Printer, 
  Download, 
  User, 
  Scale, 
  Activity, 
  Calendar, 
  Phone, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  Stethoscope
} from 'lucide-react';
import QRCode from 'qrcode';
import { printCleanDocument, exportElementToPdf } from '../utils/printUtils';

interface PrintPatientReportModalProps {
  patientId: number;
  onClose: () => void;
}

export const PrintPatientReportModal: React.FC<PrintPatientReportModalProps> = ({
  patientId,
  onClose
}) => {
  const [patientData, setPatientData] = useState<any | null>(null);
  const [clinicSettings, setClinicSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [includeClinical, setIncludeClinical] = useState<boolean>(true);
  const [includeMeasurements, setIncludeMeasurements] = useState<boolean>(true);
  const [includeVisits, setIncludeVisits] = useState<boolean>(true);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [pData, settings] = await Promise.all([
          apiRequest<any>(`/patients/${patientId}`),
          apiRequest<any>('/settings').catch(() => ({}))
        ]);
        setPatientData(pData);
        setClinicSettings(settings);

        if (pData?.code) {
          try {
            const qr = await QRCode.toDataURL(pData.code, { width: 90, margin: 1 });
            setQrCodeUrl(qr);
          } catch (_) {}
        }
      } catch (err) {
        console.error('Failed to load patient report data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  if (isLoading || !patientData) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">جاري إعداد التقرير الطبي وملف المريض...</p>
        </div>
      </div>
    );
  }

  // Weight and BMI calculations
  const measurements = patientData.measurementsHistory || [];
  const firstMeasurement = measurements[0];
  const latestMeasurement = measurements[measurements.length - 1];

  const firstWeight = firstMeasurement?.weightKg || null;
  const latestWeight = latestMeasurement?.weightKg || null;
  const weightDiff = (firstWeight && latestWeight) ? parseFloat((latestWeight - firstWeight).toFixed(1)) : null;

  const currentHeight = latestMeasurement?.heightCm || patientData.heightCm;
  const currentBmi = latestMeasurement?.bmi || (latestWeight && currentHeight ? parseFloat((latestWeight / ((currentHeight/100)*(currentHeight/100))).toFixed(1)) : null);

  const getBmiCategory = (bmi: number | null) => {
    if (!bmi) return { label: '-', color: 'text-slate-600' };
    if (bmi < 18.5) return { label: 'نحافة', color: 'text-blue-600' };
    if (bmi < 25) return { label: 'وزن مثالي', color: 'text-emerald-600' };
    if (bmi < 30) return { label: 'زيادة وزن', color: 'text-amber-600' };
    if (bmi < 35) return { label: 'سمنة درجة أولى', color: 'text-orange-600' };
    return { label: 'سمنة مفرطة', color: 'text-rose-600' };
  };

  const bmiCat = getBmiCategory(currentBmi);

  const clinicName = clinicSettings?.clinic_name || 'عيادة التغذية العلاجية والتخسيس';
  const clinicPhone = clinicSettings?.clinic_phone || '';
  const clinicSubtitle = clinicSettings?.clinic_subtitle || 'طب التغذية ونحت القوام وتثبيت الوزن';

  const handlePrint = () => {
    const element = reportRef.current;
    if (!element) return;
    printCleanDocument(`الملف_الطبي_${patientData.fullName}_${patientData.code}`, element.innerHTML);
  };

  const handleDownloadPdf = async () => {
    const element = reportRef.current;
    if (!element) return;

    try {
      setIsGeneratingPdf(true);
      const cleanName = (patientData.fullName || 'مريض').replace(/\s+/g, '_');
      await exportElementToPdf(element, `الملف_الطبي_${cleanName}_${patientData.code}`);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-right">
        
        {/* Modal Controls Header */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 font-black text-sm sm:text-base">
            <FileText className="w-5 h-5 text-purple-400" />
            <span>معاينة وتصدير الملف الطبي للمريض: {patientData.fullName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة نظيفة</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isGeneratingPdf ? 'جاري التحميل...' : 'تصدير PDF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 shrink-0">
          <span className="text-slate-500">تضمين بالتقرير:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeClinical}
              onChange={e => setIncludeClinical(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>السجل المرضي والسريري</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMeasurements}
              onChange={e => setIncludeMeasurements(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>سجل القياسات وتطور الوزن</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVisits}
              onChange={e => setIncludeVisits(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>سجل الكشوفات والاستشارات</span>
          </label>
        </div>

        {/* Scrollable Printable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60">
          <div 
            ref={reportRef}
            className="max-w-[780px] mx-auto bg-white p-8 rounded-2xl shadow-md border border-slate-200 text-slate-900 space-y-6"
            style={{ minHeight: '1050px' }}
          >
            
            {/* 1. OFFICIAL CLINIC HEADER */}
            <div className="header-box flex items-center justify-between border-b-2 border-purple-600 pb-4 mb-4">
              <div className="space-y-1">
                <h1 className="text-xl font-extrabold text-purple-900 clinic-title">{clinicName}</h1>
                <p className="text-xs text-slate-500 clinic-sub">{clinicSubtitle}</p>
                {clinicPhone && <p className="text-xs text-slate-600 font-mono">هاتف العيادة: {clinicPhone}</p>}
              </div>

              <div className="flex items-center gap-3 text-left">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR" className="w-16 h-16 border border-slate-200 rounded-lg p-1 bg-white" />
                )}
                <div className="text-left text-xs font-mono">
                  <div className="font-extrabold text-purple-800 text-sm">#{patientData.code}</div>
                  <div className="text-slate-400 text-[10px]">تاريخ التقرير:</div>
                  <div className="text-slate-700 font-bold">{new Date().toISOString().split('T')[0]}</div>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center py-2 bg-purple-50 border border-purple-200 rounded-xl">
              <h2 className="text-sm font-black text-purple-950">الملف الطبي الشامل وسجل المتابعة والتخسيس</h2>
            </div>

            {/* 2. PATIENT PERSONAL INFORMATION */}
            <div className="card bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="card-title font-bold text-xs text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                <span>البيانات الشخصية والأساسية للمريض</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">الاسم بالكامل:</span>
                  <span className="font-extrabold text-slate-900">{patientData.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">رقم الهاتف:</span>
                  <span className="font-bold text-slate-900 font-mono dir-ltr text-right">{patientData.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">السن / تاريخ الميلاد:</span>
                  <span className="font-bold text-slate-900">{patientData.age ? `${patientData.age} سنة` : (patientData.dateOfBirth || '-')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الطول المسجل:</span>
                  <span className="font-bold text-slate-900">{patientData.heightCm ? `${patientData.heightCm} سم` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الوظيفة:</span>
                  <span className="font-bold text-slate-900">{patientData.occupation || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">الحالة الاجتماعية:</span>
                  <span className="font-bold text-slate-900">{patientData.maritalStatus || '-'} {patientData.hasChildren ? `(${patientData.childrenCount} أطفال)` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">تاريخ التسجيل:</span>
                  <span className="font-bold text-slate-900 font-mono">{patientData.createdAt ? patientData.createdAt.split('T')[0] : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">نظام التثبيت:</span>
                  <span className="font-extrabold text-purple-700">
                    {patientData.isMaintenanceMode ? `نعم (هدف: ${patientData.maintenanceTargetWeight || '-'} كجم)` : 'مرحلة نزول الوزن'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. CLINICAL BACKGROUND (IF INCLUDED) */}
            {includeClinical && (
              <div className="card bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="card-title font-bold text-xs text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-purple-600" />
                  <span>السجل الصحي والسريري والفحص الطبي</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block font-semibold">التاريخ المرضي والأمراض المزمنة:</span>
                    <span className="font-bold text-slate-800">{patientData.notes || 'لا يوجد أمراض مزمنة مسجلة'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">الشكوى الرئيسية (Chief Complaint):</span>
                    <span className="font-bold text-slate-800">{patientData.chiefComplaints || 'لا توجد شكوى خاصة'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">العمليات الجراحية السابقة:</span>
                    <span className="font-bold text-slate-800">{patientData.operationsHistory || 'لا يوجد عمليات مسجلة'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">الأدوية والعلاجات الحالية:</span>
                    <span className="font-bold text-slate-800">{patientData.medicationsHistory || 'لا يتناول أدوية مسجلة'}</span>
                  </div>
                  {patientData.badHabits && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 block font-semibold">العادات ونمط الحياة:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {patientData.badHabits.smoking && <span className="badge badge-red">مدخن</span>}
                        {patientData.badHabits.stimulants && <span className="badge badge-purple">منبهات</span>}
                        {patientData.badHabits.waterIntake && <span className="badge badge-purple">ماء: {patientData.badHabits.waterIntake} لتر</span>}
                        {patientData.badHabits.sleepHours && <span className="badge badge-purple">نوم: {patientData.badHabits.sleepHours} ساعات</span>}
                        {patientData.badHabits.activityLevel && <span className="badge badge-green">نشاط: {patientData.badHabits.activityLevel}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. WEIGHT & BMI SUMMARY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-purple-600" />
                  <span>ملخص تطور الوزن ومؤشر كتلة الجسم (BMI)</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="stat-card border border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                  <span className="stat-lbl text-[11px] text-slate-500 block font-bold">الوزن الأولي</span>
                  <span className="stat-val text-base font-black text-slate-800">
                    {firstWeight ? `${firstWeight} كجم` : '-'}
                  </span>
                </div>

                <div className="stat-card border border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                  <span className="stat-lbl text-[11px] text-slate-500 block font-bold">الوزن الحالي</span>
                  <span className="stat-val text-base font-black text-purple-700">
                    {latestWeight ? `${latestWeight} كجم` : '-'}
                  </span>
                </div>

                <div className="stat-card border border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                  <span className="stat-lbl text-[11px] text-slate-500 block font-bold">إجمالي التغير</span>
                  <span className={`stat-val text-base font-black ${weightDiff !== null && weightDiff < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {weightDiff !== null ? `${weightDiff > 0 ? `+${weightDiff}` : weightDiff} كجم` : '-'}
                  </span>
                </div>

                <div className="stat-card border border-slate-200 rounded-xl p-3 text-center bg-slate-50">
                  <span className="stat-lbl text-[11px] text-slate-500 block font-bold">مؤشر الكتلة (BMI)</span>
                  <span className={`stat-val text-base font-black ${bmiCat.color}`}>
                    {currentBmi ? `${currentBmi} (${bmiCat.label})` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. MEASUREMENTS LOG (IF INCLUDED) */}
            {includeMeasurements && measurements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span>سجل القياسات الدورية ونسب الجسم الكاملة</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold">
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">نوع الزيارة</th>
                        <th className="p-2">الوزن</th>
                        <th className="p-2">BMI</th>
                        <th className="p-2">الدهون %</th>
                        <th className="p-2">العضلات %</th>
                        <th className="p-2">الماء %</th>
                        <th className="p-2">العظام</th>
                        <th className="p-2">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {measurements.map((m: any, idx: number) => (
                        <tr key={m.id || idx}>
                          <td className="p-2 font-mono">{m.recordedAt ? m.recordedAt.split('T')[0] : '-'}</td>
                          <td className="p-2 font-bold text-purple-800">{m.visitTypeName || 'متابعة'}</td>
                          <td className="p-2 font-extrabold text-slate-900">{m.weightKg} كجم</td>
                          <td className="p-2 font-bold">{m.bmi || '-'}</td>
                          <td className="p-2">{m.fatPercentage ? `${m.fatPercentage}%` : '-'}</td>
                          <td className="p-2">{m.musclePercentage ? `${m.musclePercentage}%` : '-'}</td>
                          <td className="p-2">{m.waterPercentage ? `${m.waterPercentage}%` : '-'}</td>
                          <td className="p-2">{m.boneMass ? `${m.boneMass} كجم` : '-'}</td>
                          <td className="p-2 text-slate-500 truncate max-w-[120px]">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. VISITS LOG (IF INCLUDED) */}
            {includeVisits && patientData.visits && patientData.visits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>سجل كشوفات ومراجعات العيادة</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold">
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">نوع الكشف</th>
                        <th className="p-2">الحالة</th>
                        <th className="p-2">توجيهات وملاحظات الطبيبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {patientData.visits.map((v: any, idx: number) => (
                        <tr key={v.id || idx}>
                          <td className="p-2 font-mono">{v.createdAt ? v.createdAt.split('T')[0] : '-'}</td>
                          <td className="p-2 font-bold text-purple-800">{v.visitTypeName}</td>
                          <td className="p-2">
                            <span className="badge badge-green">مكتمل</span>
                          </td>
                          <td className="p-2 text-slate-800">{v.doctorNotes || 'تم الكشف وصرف النظام'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. OFFICIAL FOOTER SIGNATURES */}
            <div className="footer-note pt-6 border-t border-slate-300 mt-8 flex justify-between items-end text-xs text-slate-600">
              <div className="space-y-1 text-right">
                <p className="font-bold text-slate-800">توقيع الطبيبة المعالجة:</p>
                <p className="font-serif text-slate-400 italic pt-3">............................................</p>
              </div>

              <div className="space-y-1 text-center">
                <p className="font-bold text-slate-800">خاتم العيادة الرسمي:</p>
                <div className="w-24 h-12 border border-dashed border-slate-300 rounded-lg mx-auto"></div>
              </div>

              <div className="text-left text-[10px] text-slate-400 font-mono">
                Generated securely on {new Date().toLocaleString('en-US')}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
