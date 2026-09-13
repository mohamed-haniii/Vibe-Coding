import { Router, Response } from 'express';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/auditService';
import { emitRealtimeEvent } from '../socket';

const router = Router();

// GET clinic settings (Public / Auth)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM clinic_settings');
    const settings: Record<string, string> = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    return res.json({
      clinic_name: settings.clinic_name || 'عيادة التخسيس والتغذية',
      clinic_subtitle: settings.clinic_subtitle !== undefined ? settings.clinic_subtitle : '',
      clinic_phone: settings.clinic_phone || '',
      clinic_address: settings.clinic_address || '',
      enable_sound_alerts: settings.enable_sound_alerts !== undefined ? settings.enable_sound_alerts === 'true' : true,
      enable_receipt_auto_print: settings.enable_receipt_auto_print !== undefined ? settings.enable_receipt_auto_print === 'true' : true,
      allow_cashier_cancel_visit: settings.allow_cashier_cancel_visit !== undefined ? settings.allow_cashier_cancel_visit === 'true' : false,
      enable_weight_loss_target_badge: settings.enable_weight_loss_target_badge !== undefined ? settings.enable_weight_loss_target_badge === 'true' : true,
      enable_whatsapp_reminders: settings.enable_whatsapp_reminders !== undefined ? settings.enable_whatsapp_reminders === 'true' : true,
      // Delay & Follow-up Pricing Rules
      delay_grace_days: settings.delay_grace_days ? parseInt(settings.delay_grace_days, 10) : 33,
      delay_tier1_days: settings.delay_tier1_days ? parseInt(settings.delay_tier1_days, 10) : 60,
      delay_tier1_price: settings.delay_tier1_price ? parseFloat(settings.delay_tier1_price) : 70,
      delay_tier2_days: settings.delay_tier2_days ? parseInt(settings.delay_tier2_days, 10) : 90,
      delay_tier2_price: settings.delay_tier2_price ? parseFloat(settings.delay_tier2_price) : 100,
      delay_revert_new_days: settings.delay_revert_new_days ? parseInt(settings.delay_revert_new_days, 10) : 90,
      // PDF customization
      pdf_header_title: settings.pdf_header_title || settings.clinic_name || 'مركز التخسيس والتغذية العلاجية',
      pdf_header_subtitle: settings.pdf_header_subtitle || settings.clinic_subtitle || 'د. أمل مصطفى - استشاري التغذية وتنسيق القوام',
      pdf_footer_text: settings.pdf_footer_text || 'نتمنى لكم دوام الصحة والعافية • يرجى الالتزام بالتعليمات والمواعيد',
      pdf_phone: settings.pdf_phone || settings.clinic_phone || '01000000000',
      pdf_address: settings.pdf_address || settings.clinic_address || '',
      pdf_primary_color: settings.pdf_primary_color || '#0f766e',
      pdf_logo_url: settings.pdf_logo_url || '',
      pdf_show_vitals: settings.pdf_show_vitals !== undefined ? settings.pdf_show_vitals === 'true' : true,
      pdf_show_notes: settings.pdf_show_notes !== undefined ? settings.pdf_show_notes === 'true' : true,
      pdf_show_prescriptions: settings.pdf_show_prescriptions !== undefined ? settings.pdf_show_prescriptions === 'true' : true,
      pdf_show_next_date: settings.pdf_show_next_date !== undefined ? settings.pdf_show_next_date === 'true' : true,
      pdf_font_size: settings.pdf_font_size || 'medium',
      pdf_paper_size: settings.pdf_paper_size || 'A4',
      patient_clinical_data_entry_role: (settings.patient_clinical_data_entry_role as 'both' | 'doctor' | 'assistant') || 'both'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع إعدادات العيادة' });
  }
});

// PUT update clinic settings (Admin strictly)
router.put('/', authenticateToken, requireRole('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      clinic_name, 
      clinic_subtitle,
      clinic_phone,
      clinic_address,
      enable_sound_alerts,
      enable_receipt_auto_print,
      allow_cashier_cancel_visit,
      enable_weight_loss_target_badge,
      enable_whatsapp_reminders,
      delay_grace_days,
      delay_tier1_days,
      delay_tier1_price,
      delay_tier2_days,
      delay_tier2_price,
      delay_revert_new_days,
      pdf_header_title,
      pdf_header_subtitle,
      pdf_footer_text,
      pdf_phone,
      pdf_address,
      pdf_primary_color,
      pdf_logo_url,
      pdf_show_vitals,
      pdf_show_notes,
      pdf_show_prescriptions,
      pdf_show_next_date,
      pdf_font_size,
      pdf_paper_size,
      patient_clinical_data_entry_role
    } = req.body;

    const db = await getDb();

    // Fetch existing settings to store in audit log for restore functionality
    const existingRows = await db.all('SELECT * FROM clinic_settings');
    const previousSettings: Record<string, string> = {};
    existingRows.forEach(r => {
      previousSettings[r.key] = r.value;
    });

    const updateSetting = async (key: string, val: string) => {
      await db.run(
        `INSERT INTO clinic_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, val]
      );
    };

    if (clinic_name !== undefined) await updateSetting('clinic_name', clinic_name.trim());
    if (clinic_subtitle !== undefined) await updateSetting('clinic_subtitle', clinic_subtitle.trim());
    if (clinic_phone !== undefined) await updateSetting('clinic_phone', clinic_phone.trim());
    if (clinic_address !== undefined) await updateSetting('clinic_address', clinic_address.trim());
    if (enable_sound_alerts !== undefined) await updateSetting('enable_sound_alerts', String(Boolean(enable_sound_alerts)));
    if (enable_receipt_auto_print !== undefined) await updateSetting('enable_receipt_auto_print', String(Boolean(enable_receipt_auto_print)));
    if (allow_cashier_cancel_visit !== undefined) await updateSetting('allow_cashier_cancel_visit', String(Boolean(allow_cashier_cancel_visit)));
    if (enable_weight_loss_target_badge !== undefined) await updateSetting('enable_weight_loss_target_badge', String(Boolean(enable_weight_loss_target_badge)));
    if (enable_whatsapp_reminders !== undefined) await updateSetting('enable_whatsapp_reminders', String(Boolean(enable_whatsapp_reminders)));

    if (delay_grace_days !== undefined) await updateSetting('delay_grace_days', String(parseInt(delay_grace_days, 10)));
    if (delay_tier1_days !== undefined) await updateSetting('delay_tier1_days', String(parseInt(delay_tier1_days, 10)));
    if (delay_tier1_price !== undefined) await updateSetting('delay_tier1_price', String(parseFloat(delay_tier1_price)));
    if (delay_tier2_days !== undefined) await updateSetting('delay_tier2_days', String(parseInt(delay_tier2_days, 10)));
    if (delay_tier2_price !== undefined) await updateSetting('delay_tier2_price', String(parseFloat(delay_tier2_price)));
    if (delay_revert_new_days !== undefined) await updateSetting('delay_revert_new_days', String(parseInt(delay_revert_new_days, 10)));

    if (pdf_header_title !== undefined) await updateSetting('pdf_header_title', pdf_header_title.trim());
    if (pdf_header_subtitle !== undefined) await updateSetting('pdf_header_subtitle', pdf_header_subtitle.trim());
    if (pdf_footer_text !== undefined) await updateSetting('pdf_footer_text', pdf_footer_text.trim());
    if (pdf_phone !== undefined) await updateSetting('pdf_phone', pdf_phone.trim());
    if (pdf_address !== undefined) await updateSetting('pdf_address', pdf_address.trim());
    if (pdf_primary_color !== undefined) await updateSetting('pdf_primary_color', pdf_primary_color.trim());
    if (pdf_logo_url !== undefined) await updateSetting('pdf_logo_url', pdf_logo_url.trim());
    if (pdf_show_vitals !== undefined) await updateSetting('pdf_show_vitals', String(Boolean(pdf_show_vitals)));
    if (pdf_show_notes !== undefined) await updateSetting('pdf_show_notes', String(Boolean(pdf_show_notes)));
    if (pdf_show_prescriptions !== undefined) await updateSetting('pdf_show_prescriptions', String(Boolean(pdf_show_prescriptions)));
    if (pdf_show_next_date !== undefined) await updateSetting('pdf_show_next_date', String(Boolean(pdf_show_next_date)));
    if (pdf_font_size !== undefined) await updateSetting('pdf_font_size', pdf_font_size.trim());
    if (pdf_paper_size !== undefined) await updateSetting('pdf_paper_size', pdf_paper_size.trim());
    if (patient_clinical_data_entry_role !== undefined) await updateSetting('patient_clinical_data_entry_role', patient_clinical_data_entry_role);

    await logAudit(req.user!.id, 'UPDATE_CLINIC_SETTINGS', 'Setting', 0, { ...req.body, previousSettings });
    emitRealtimeEvent('settings-updated');

    return res.json({
      message: 'تم حفظ إعدادات العيادة وتفضيلات طباعة PDF بنجاح',
      clinic_name: clinic_name !== undefined ? clinic_name.trim() : 'عيادة التخسيس والتغذية',
      clinic_subtitle: clinic_subtitle !== undefined ? clinic_subtitle.trim() : '',
      enable_sound_alerts: Boolean(enable_sound_alerts),
      enable_receipt_auto_print: Boolean(enable_receipt_auto_print),
      allow_cashier_cancel_visit: Boolean(allow_cashier_cancel_visit),
      enable_weight_loss_target_badge: Boolean(enable_weight_loss_target_badge),
      enable_whatsapp_reminders: Boolean(enable_whatsapp_reminders)
    });
  } catch (err: any) {
    console.error('Update settings error:', err);
    return res.status(500).json({ message: 'فشل في حفظ إعدادات العيادة' });
  }
});

export default router;
