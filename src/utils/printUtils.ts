/**
 * Print & Export Utilities for Clinic System
 * Supports clean isolated document printing, PDF downloading, and UTF-8 Arabic Excel/CSV exporting
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Common Print & PDF Stylesheet
 * Fully self-contained with standard RGB/HEX colors to prevent any html2canvas oklch/oklab crashes.
 */
export function getPrintCss(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, system-ui, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      direction: rtl;
      text-align: right;
      background-color: #ffffff !important;
      color: #0f172a !important;
      font-size: 10.5pt;
      line-height: 1.45;
      padding: 10px;
    }

    /* Grid & Layout System */
    .grid { display: grid !important; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
    .grid-cols-2, .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3, .sm\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .grid-cols-4, .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    
    .gap-1 { gap: 4px !important; }
    .gap-2 { gap: 8px !important; }
    .gap-3 { gap: 12px !important; }
    .gap-4 { gap: 16px !important; }
    .gap-6 { gap: 24px !important; }

    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-row { flex-direction: row !important; }
    .flex-wrap { flex-wrap: wrap !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .justify-start { justify-content: flex-start !important; }
    .justify-end { justify-content: flex-end !important; }
    .shrink-0 { flex-shrink: 0 !important; }

    .space-y-1 > * + * { margin-top: 4px !important; }
    .space-y-2 > * + * { margin-top: 8px !important; }
    .space-y-3 > * + * { margin-top: 12px !important; }
    .space-y-4 > * + * { margin-top: 16px !important; }
    .space-y-6 > * + * { margin-top: 24px !important; }

    /* Typography */
    .text-xs { font-size: 8.5pt !important; }
    .text-sm { font-size: 9.5pt !important; }
    .text-base { font-size: 11pt !important; }
    .text-lg { font-size: 13pt !important; }
    .text-xl { font-size: 15pt !important; }
    .text-2xl { font-size: 18pt !important; }

    .font-normal { font-weight: 400 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-bold { font-weight: 700 !important; }
    .font-extrabold { font-weight: 800 !important; }
    .font-black { font-weight: 900 !important; }
    .font-mono { font-family: monospace, Courier, monospace !important; }

    .text-right { text-align: right !important; }
    .text-left { text-align: left !important; }
    .text-center { text-align: center !important; }
    .dir-ltr { direction: ltr !important; }
    .block { display: block !important; }
    .inline-block { display: inline-block !important; }

    /* Colors */
    .text-slate-400 { color: #94a3b8 !important; }
    .text-slate-500 { color: #64748b !important; }
    .text-slate-600 { color: #475569 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-900 { color: #0f172a !important; }

    .text-purple-600 { color: #9333ea !important; }
    .text-purple-700 { color: #7e22ce !important; }
    .text-purple-800 { color: #6b21a8 !important; }
    .text-purple-900 { color: #581c87 !important; }
    .text-purple-950 { color: #3b0764 !important; }

    .text-emerald-600 { color: #059669 !important; }
    .text-emerald-700 { color: #047857 !important; }
    .text-rose-600 { color: #e11d48 !important; }
    .text-rose-700 { color: #be123c !important; }
    .text-blue-600 { color: #2563eb !important; }
    .text-blue-700 { color: #1d4ed8 !important; }
    .text-amber-600 { color: #d97706 !important; }
    .text-amber-700 { color: #b45309 !important; }

    /* Backgrounds */
    .bg-white { background-color: #ffffff !important; }
    .bg-slate-50 { background-color: #f8fafc !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }
    .bg-purple-50 { background-color: #faf5ff !important; }
    .bg-purple-100 { background-color: #f3e8ff !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; }
    .bg-rose-50 { background-color: #fff1f2 !important; }
    .bg-amber-50 { background-color: #fffbeb !important; }
    .bg-blue-50 { background-color: #eff6ff !important; }

    /* Borders & Spacing */
    .border { border: 1px solid #e2e8f0 !important; }
    .border-2 { border: 2px solid #e2e8f0 !important; }
    .border-b { border-bottom: 1px solid #e2e8f0 !important; }
    .border-b-2 { border-bottom: 2px solid #9333ea !important; }
    .border-t { border-top: 1px solid #e2e8f0 !important; }
    .border-slate-200 { border-color: #e2e8f0 !important; }
    .border-slate-300 { border-color: #cbd5e1 !important; }
    .border-purple-200 { border-color: #e9d5ff !important; }
    .border-purple-600 { border-color: #9333ea !important; }

    .rounded-lg { border-radius: 8px !important; }
    .rounded-xl { border-radius: 12px !important; }
    .rounded-2xl { border-radius: 16px !important; }
    .rounded-full { border-radius: 9999px !important; }

    .p-1 { padding: 4px !important; }
    .p-2 { padding: 8px !important; }
    .p-3 { padding: 12px !important; }
    .p-4 { padding: 16px !important; }
    .p-6 { padding: 24px !important; }
    .p-8 { padding: 32px !important; }
    .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
    .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
    .px-4 { padding-left: 16px !important; padding-right: 16px !important; }
    .px-6 { padding-left: 24px !important; padding-right: 24px !important; }
    .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
    .py-1\\.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
    .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
    .py-3 { padding-top: 12px !important; padding-bottom: 12px !important; }
    .py-4 { padding-top: 16px !important; padding-bottom: 16px !important; }
    .pb-1\\.5 { padding-bottom: 6px !important; }
    .pb-2 { padding-bottom: 8px !important; }
    .pb-4 { padding-bottom: 16px !important; }
    .mb-2 { margin-bottom: 8px !important; }
    .mb-3 { margin-bottom: 12px !important; }
    .mb-4 { margin-bottom: 16px !important; }
    .mb-6 { margin-bottom: 24px !important; }

    /* Tables */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-top: 8px !important;
      margin-bottom: 12px !important;
      font-size: 9.5pt !important;
    }
    th, td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px !important;
      text-align: right !important;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #1e293b !important;
      font-weight: 700 !important;
    }
    tr:nth-child(even) td {
      background-color: #fafafa !important;
    }

    /* Custom Component Styles */
    .header-box {
      border-bottom: 2px solid #7c3aed !important;
      padding-bottom: 12px !important;
      margin-bottom: 14px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
    .clinic-title {
      font-size: 16pt !important;
      font-weight: 800 !important;
      color: #5b21b6 !important;
    }
    .clinic-sub {
      font-size: 9pt !important;
      color: #64748b !important;
      margin-top: 2px !important;
    }
    .card {
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      padding: 10px !important;
      margin-bottom: 12px !important;
      background-color: #f8fafc !important;
    }
    .card-title {
      font-size: 11pt !important;
      font-weight: 700 !important;
      color: #334155 !important;
      margin-bottom: 6px !important;
      border-bottom: 1px dashed #cbd5e1 !important;
      padding-bottom: 4px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .badge {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 4px !important;
      font-size: 8.5pt !important;
      font-weight: 700 !important;
    }
    .badge-purple { background-color: #f3e8ff !important; color: #6b21a8 !important; }
    .badge-green { background-color: #dcfce7 !important; color: #166534 !important; }
    .badge-red { background-color: #fee2e2 !important; color: #991b1b !important; }

    @media print {
      body {
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-after: always !important;
      }
    }
  `;
}

/**
 * Exports any HTML element directly to a formatted A4 PDF file using html2canvas & jsPDF.
 * Sanitizes all styles to avoid oklch crashes and ensures multi-page layout.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: (clonedDoc, clonedEl) => {
      // 1. Remove all stylesheets containing unsupported oklch / oklab colors
      const styleEls = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
      styleEls.forEach((s) => s.remove());

      // 2. Inject our comprehensive clean print stylesheet
      const printStyle = clonedDoc.createElement('style');
      printStyle.textContent = getPrintCss();
      clonedDoc.head.appendChild(printStyle);

      // 3. Ensure cloned element is styled properly for A4 page width
      if (clonedEl) {
        clonedEl.style.width = '780px';
        clonedEl.style.maxWidth = '780px';
        clonedEl.style.backgroundColor = '#ffffff';
        clonedEl.style.margin = '0 auto';
        clonedEl.style.padding = '24px';
      }
    }
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

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

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

/**
 * Exports structured table data to CSV with UTF-8 BOM so Arabic text displays correctly in Excel.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [
    headers.map(sanitize).join(','),
    ...rows.map(r => r.map(sanitize).join(','))
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Prints a clean HTML document via an isolated iframe or popup window.
 * Injects a complete RTL CSS stylesheet so all cards, tables, and grids render accurately.
 */
export function printCleanDocument(title: string, bodyHtml: string): void {
  const fullHtml = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        ${getPrintCss()}
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;

  // 1. Try popup window first if available
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (printWindow && !printWindow.closed) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (_) {}
      }, 500);
      return;
    }
  } catch (_) {
    // Popup blocked, continue to isolated iframe
  }

  // 2. Iframe Fallback with full layout dimensions
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '1024px';
  iframe.style.height = '768px';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(fullHtml);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (_) {
      window.print();
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}
