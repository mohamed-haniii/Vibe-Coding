import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import { AuthenticatedRequest, authenticateToken, requireRole } from '../middleware/auth';
import { logAudit } from '../services/auditService';

const router = Router();

// Guarded for Admin only
router.use(authenticateToken, requireRole('Admin'));

// GET list of all users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const users = await db.all(
      `SELECT id, username, full_name, role, is_active, created_at, last_login_at 
       FROM users 
       ORDER BY role ASC, id DESC`
    );

    return res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      role: u.role,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at
    })));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في استرجاع قائمة المستخدمين' });
  }
});

// POST create new cashier account
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, fullName } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة (اسم المستخدم، كلمة المرور، والاسم الكامل)' });
    }

    const db = await getDb();

    // Check if username already exists
    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) {
      return res.status(400).json({ message: 'اسم المستخدم مستخدم بالفعل. اختار اسماً آخر' });
    }

    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, 'Assistant', 1, ?)`,
      [username.trim(), hash, fullName.trim(), now]
    );

    const newUserId = result.lastID;

    await logAudit(req.user!.id, 'CREATE_CASHIER_USER', 'User', newUserId, { username, fullName });

    return res.status(201).json({
      id: newUserId,
      username: username.trim(),
      fullName: fullName.trim(),
      role: 'Assistant',
      isActive: true,
      createdAt: now
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في إنشاء حساب الكاشير' });
  }
});

// PUT toggle active/inactive status of cashier account
router.put('/users/:id/toggle-active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const db = await getDb();

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    if (user.role === 'Admin') {
      return res.status(400).json({ message: 'لا يمكن تعطيل حساب الأدمن الرئيسي' });
    }

    const newStatus = user.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);

    await logAudit(req.user!.id, 'TOGGLE_USER_ACTIVE', 'User', userId, { newStatus });

    return res.json({
      id: userId,
      isActive: Boolean(newStatus),
      message: newStatus ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تعديل حالة الحساب' });
  }
});

// POST create new visit type / field
router.post('/visit-types', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, price, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'يرجى إدخال اسم نوع الكشف / الخانة' });
    }

    if (price === undefined || price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ message: 'يرجى إدخال سعر صحيح أكبر من أو يساوي الصفر' });
    }

    const db = await getDb();
    const existing = await db.get('SELECT id FROM visit_types WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
      return res.status(400).json({ message: 'يوجد نوع كشف آخر بنفس هذا الاسم بالفعل' });
    }

    const result = await db.run(
      'INSERT INTO visit_types (name, price, description, is_active) VALUES (?, ?, ?, 1)',
      [name.trim(), parseFloat(price), description ? description.trim() : '']
    );

    const newId = result.lastID;

    await logAudit(req.user!.id, 'CREATE_VISIT_TYPE', 'VisitType', newId, {
      name: name.trim(),
      price: parseFloat(price)
    });

    return res.status(201).json({
      id: newId,
      name: name.trim(),
      price: parseFloat(price),
      description: description ? description.trim() : '',
      isActive: true,
      message: 'تم إضافة نوع الكشف الجديد بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في إضافة نوع الكشف الجديد' });
  }
});

// PUT update full visit type details (name, price, description, is_active)
router.put('/visit-types/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitTypeId = parseInt(req.params.id, 10);
    const { name, price, description, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'يرجى إدخال اسم نوع الكشف' });
    }

    if (price === undefined || price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ message: 'يرجى إدخال سعر صحيح' });
    }

    const db = await getDb();
    const visitType = await db.get('SELECT * FROM visit_types WHERE id = ?', [visitTypeId]);

    if (!visitType) {
      return res.status(404).json({ message: 'نوع الزيارة غير موجود' });
    }

    // Check duplicate name
    const duplicate = await db.get('SELECT id FROM visit_types WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), visitTypeId]);
    if (duplicate) {
      return res.status(400).json({ message: 'اسم نوع الكشف مستخدم بالفعل في خانة أخرى' });
    }

    const activeState = is_active !== undefined ? (is_active ? 1 : 0) : (visitType.is_active ?? 1);
    const updatedDesc = description !== undefined ? description.trim() : (visitType.description || '');

    await db.run(
      'UPDATE visit_types SET name = ?, price = ?, description = ?, is_active = ? WHERE id = ?',
      [name.trim(), parseFloat(price), updatedDesc, activeState, visitTypeId]
    );

    await logAudit(req.user!.id, 'UPDATE_VISIT_TYPE', 'VisitType', visitTypeId, {
      oldName: visitType.name,
      newName: name.trim(),
      oldPrice: visitType.price,
      newPrice: parseFloat(price)
    });

    return res.json({
      id: visitTypeId,
      name: name.trim(),
      price: parseFloat(price),
      description: updatedDesc,
      isActive: Boolean(activeState),
      message: 'تم تحديث بيانات نوع الكشف بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تحديث البيانات' });
  }
});

// PUT update price of visit type (legacy route)
router.put('/visit-types/:id/price', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitTypeId = parseInt(req.params.id, 10);
    const { price } = req.body;

    if (price === undefined || price < 0) {
      return res.status(400).json({ message: 'يرجى إدخال سعر صحيح' });
    }

    const db = await getDb();
    const visitType = await db.get('SELECT * FROM visit_types WHERE id = ?', [visitTypeId]);

    if (!visitType) {
      return res.status(404).json({ message: 'نوع الزيارة غير موجود' });
    }

    await db.run('UPDATE visit_types SET price = ? WHERE id = ?', [parseFloat(price), visitTypeId]);

    await logAudit(req.user!.id, 'UPDATE_VISIT_TYPE_PRICE', 'VisitType', visitTypeId, {
      oldPrice: visitType.price,
      newPrice: price
    });

    return res.json({
      id: visitTypeId,
      name: visitType.name,
      price: parseFloat(price),
      message: 'تم تحديث السعر الرسمي بنجاح'
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تحديث السعر' });
  }
});

// DELETE / visit type
router.delete('/visit-types/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visitTypeId = parseInt(req.params.id, 10);
    const db = await getDb();

    const used = await db.get('SELECT COUNT(*) as count FROM visits WHERE visit_type_id = ?', [visitTypeId]);
    if (used && used.count > 0) {
      await db.run('UPDATE visit_types SET is_active = 0 WHERE id = ?', [visitTypeId]);
      return res.json({ message: 'تم تعطيل نوع الكشف بنجاح (لوجود كشوفات سابقة مسجلة به)' });
    }

    await db.run('DELETE FROM visit_types WHERE id = ?', [visitTypeId]);
    return res.json({ message: 'تم حذف نوع الكشف بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في حذف نوع الكشف' });
  }
});

// PUT update user credentials (username, full_name, role, password) - Admin can update anyone including themselves
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { username, fullName, role, password } = req.body;

    if (!username || !fullName) {
      return res.status(400).json({ message: 'اسم المستخدم والاسم الكامل مطلوبان' });
    }

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);

    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // Check username uniqueness if changed
    const trimmedUsername = username.trim();
    if (trimmedUsername !== user.username) {
      const existing = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [trimmedUsername, userId]);
      if (existing) {
        return res.status(400).json({ message: 'اسم المستخدم هذا مستخدم بالفعل لدى حساب آخر' });
      }
    }

    let passwordHash = user.password_hash;
    let passwordChanged = false;

    if (password && password.trim().length > 0) {
      if (password.trim().length < 4) {
        return res.status(400).json({ message: 'كلمة المرور يجب أن لا تقل عن 4 خانات' });
      }
      passwordHash = await bcrypt.hash(password.trim(), 10);
      passwordChanged = true;
    }

    const newRole = role || user.role;

    await db.run(
      `UPDATE users 
       SET username = ?, full_name = ?, role = ?, password_hash = ? 
       WHERE id = ?`,
      [trimmedUsername, fullName.trim(), newRole, passwordHash, userId]
    );

    await logAudit(req.user!.id, 'UPDATE_USER_CREDENTIALS', 'User', userId, {
      oldUsername: user.username,
      newUsername: trimmedUsername,
      oldFullName: user.full_name,
      newFullName: fullName.trim(),
      oldRole: user.role,
      newRole,
      passwordChanged
    });

    return res.json({
      id: userId,
      username: trimmedUsername,
      fullName: fullName.trim(),
      role: newRole,
      message: 'تم تحديث البيانات وكلمة المرور بنجاح'
    });
  } catch (err: any) {
    console.error('Update user credentials error:', err);
    return res.status(500).json({ message: 'فشل في تحديث بيانات حساب المستخدم' });
  }
});

// GET audit logs (with isRestored indicator)
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const logs = await db.all(
      `SELECT a.*, u.full_name as user_name 
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.id DESC LIMIT 100`
    );

    return res.json(logs.map(l => {
      let parsedDetails: any = null;
      try {
        parsedDetails = l.details ? JSON.parse(l.details) : null;
      } catch (e) {
        parsedDetails = l.details;
      }

      return {
        id: l.id,
        userId: l.user_id,
        userName: l.user_name || 'النظام',
        action: l.action,
        entityType: l.entity_type,
        entityId: l.entity_id,
        details: parsedDetails,
        timestamp: l.timestamp
      };
    }));
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في تحميل سجل العمليات' });
  }
});

// POST restore/undo action from audit log
router.post('/audit-logs/:id/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logId = parseInt(req.params.id, 10);
    const db = await getDb();

    const log = await db.get('SELECT * FROM audit_logs WHERE id = ?', [logId]);
    if (!log) {
      return res.status(404).json({ message: 'سجل العملية غير موجود' });
    }

    let details: any = {};
    try {
      details = log.details ? JSON.parse(log.details) : {};
    } catch (e) {}

    if (details.isRestored) {
      return res.status(400).json({ message: 'تم التراجع عن هذه العملية بالفعل سابقاً' });
    }

    const { action, entity_type, entity_id } = log;
    let restoreMessage = 'تم التراجع عن العملية بنجاح';

    // Handle Restoration Logic according to action
    if (action === 'CANCEL_VISIT_FROM_QUEUE' && entity_id) {
      // Re-open visit back to Waiting state
      const visit = await db.get('SELECT * FROM visits WHERE id = ?', [entity_id]);
      if (visit) {
        await db.exec('BEGIN IMMEDIATE TRANSACTION;');
        try {
          await db.run('UPDATE visits SET status = "Waiting", payment_status = "Paid" WHERE id = ?', [entity_id]);

          // Re-add to shift total if it was in shift
          if (visit.shift_id) {
            await db.run(
              `UPDATE shifts 
               SET total_amount = total_amount + ?, total_visits = total_visits + 1 
               WHERE id = ?`,
              [visit.price, visit.shift_id]
            );
          }
          await db.exec('COMMIT;');
        } catch (txnErr) {
          try { await db.exec('ROLLBACK;'); } catch (_) {}
          throw txnErr;
        }

        const { io } = await import('../../../server');
        if (io) {
          io.emit('visit-status-changed', { visitId: entity_id, status: 'Waiting' });
          io.emit('new-visit-in-queue', { refresh: true });
        }

        restoreMessage = `تم استرجاع المريض ${details.patientName || ''} وإعادته لقائمة الانتظار في العيادة بنجاح!`;
      } else {
        return res.status(404).json({ message: 'بيانات الكشف غير موجودة للنظام' });
      }

    } else if (action === 'COMPLETE_CONSULTATION' && entity_id) {
      // Re-open visit back to InConsultation or Waiting
      await db.run('UPDATE visits SET status = "InConsultation" WHERE id = ?', [entity_id]);

      const { io } = await import('../../../server');
      if (io) {
        io.emit('visit-status-changed', { visitId: entity_id, status: 'InConsultation' });
        io.emit('new-visit-in-queue', { refresh: true });
      }

      restoreMessage = 'تم إعادة فتح ملف الكشف وتعيين حالة المريض إلى (في غرفة الكشف)';

    } else if (action === 'UPDATE_VISIT_TYPE_PRICE' && entity_id && details.oldPrice !== undefined) {
      // Restore visit price
      await db.run('UPDATE visit_types SET price = ? WHERE id = ?', [details.oldPrice, entity_id]);
      restoreMessage = `تم استرجاع سعر الكشف السابق (${details.oldPrice} جنيه) بنجاح`;

    } else if (action === 'TOGGLE_USER_ACTIVE' && entity_id) {
      const user = await db.get('SELECT is_active FROM users WHERE id = ?', [entity_id]);
      if (user) {
        const revertedStatus = user.is_active ? 0 : 1;
        await db.run('UPDATE users SET is_active = ? WHERE id = ?', [revertedStatus, entity_id]);
        restoreMessage = revertedStatus ? 'تم إعادة تفعيل الحساب' : 'تم تعطيل الحساب';
      }

    } else if (action === 'UPDATE_USER_CREDENTIALS' && entity_id) {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [entity_id]);
      if (user) {
        await db.run(
          'UPDATE users SET username = ?, full_name = ?, role = ? WHERE id = ?',
          [details.oldUsername || user.username, details.oldFullName || user.full_name, details.oldRole || user.role, entity_id]
        );
        restoreMessage = 'تم استرجاع اسم المستخدم والدور السابق بنجاح';
      } else {
        return res.status(404).json({ message: 'حساب المستخدم غير موجود' });
      }

    } else if (action === 'UPDATE_CLINIC_SETTINGS') {
      if (details.previousSettings && typeof details.previousSettings === 'object') {
        for (const [key, val] of Object.entries(details.previousSettings)) {
          await db.run(
            `INSERT INTO clinic_settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [key, String(val)]
          );
        }
        restoreMessage = 'تم استرجاع إعدادات وتفضيلات العيادة السابقة بنجاح';
      } else {
        restoreMessage = 'تم التراجع عن تغييرات الإعدادات بنجاح';
      }

    } else if (action === 'CREATE_VISIT_AND_PAYMENT' && entity_id) {
      const visit = await db.get('SELECT * FROM visits WHERE id = ?', [entity_id]);
      if (visit) {
        await db.run('UPDATE visits SET status = "Cancelled", payment_status = "Cancelled" WHERE id = ?', [entity_id]);
        if ((visit.payment_status === 'Paid' || visit.payment_status === 'Pending') && visit.shift_id) {
          await db.run(
            `UPDATE shifts SET total_amount = MAX(0, total_amount - ?), total_visits = MAX(0, total_visits - 1) WHERE id = ?`,
            [visit.price, visit.shift_id]
          );
        }
        const { io } = await import('../../../server');
        if (io) {
          io.emit('visit-status-changed', { visitId: entity_id, status: 'Cancelled' });
          io.emit('new-visit-in-queue', { refresh: true });
        }
        restoreMessage = 'تم إلغاء الكشف واسترجاع المبلغ المالي للشيفت بنجاح';
      } else {
        return res.status(404).json({ message: 'بيانات الكشف غير موجودة' });
      }

    } else if (action === 'CREATE_PATIENT' && entity_id) {
      await db.run('DELETE FROM patients WHERE id = ?', [entity_id]);
      restoreMessage = 'تم التراجع عن تسجيل المريض وحذف بياناته بنجاح';

    } else if (action === 'CREATE_CASHIER_USER' && entity_id) {
      await db.run('DELETE FROM users WHERE id = ?', [entity_id]);
      restoreMessage = 'تم إلغاء حساب الكاشير وحذفه بنجاح';

    } else {
      return res.status(400).json({ message: 'لا تدعم هذه العملية خيار الاسترجاع المباشر' });
    }

    // Mark log details as restored
    details.isRestored = true;
    details.restoredAt = new Date().toISOString();
    details.restoredByUserId = req.user!.id;

    await db.run('UPDATE audit_logs SET details = ? WHERE id = ?', [JSON.stringify(details), logId]);

    // Log the undo event
    await logAudit(req.user!.id, 'RESTORE_AUDIT_ACTION', entity_type, entity_id, {
      restoredLogId: logId,
      originalAction: action
    });

    return res.json({ message: restoreMessage });
  } catch (err: any) {
    console.error('Restore audit action error:', err);
    return res.status(500).json({ message: 'حدث خطأ أثناء محاولة استرجاع العملية' });
  }
});

// GET backup database data (JSON or CSV format)
router.get('/backup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const db = await getDb();

    const patients = await db.all('SELECT * FROM patients ORDER BY id ASC');
    const visits = await db.all('SELECT * FROM visits ORDER BY id ASC');
    const measurements = await db.all('SELECT * FROM patient_measurements ORDER BY id ASC');
    const shifts = await db.all('SELECT * FROM shifts ORDER BY id ASC');
    const dietPlans = await db.all('SELECT * FROM diet_plans ORDER BY id ASC');
    const settings = await db.all('SELECT * FROM clinic_settings ORDER BY key ASC');
    const users = await db.all('SELECT id, username, password_hash, full_name, role, is_active, created_at, last_login_at FROM users ORDER BY id ASC');
    const visitTypes = await db.all('SELECT * FROM visit_types ORDER BY id ASC');
    const payments = await db.all('SELECT * FROM payments ORDER BY id ASC');
    const auditLogs = await db.all('SELECT * FROM audit_logs ORDER BY id ASC');

    const dateStr = new Date().toISOString().split('T')[0];

    await logAudit(req.user!.id, 'EXPORT_DATABASE_BACKUP', 'Database', undefined, { format, dateStr });

    if (format === 'csv') {
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      let csv = '\uFEFF'; // UTF-8 BOM for Arabic support in MS Excel

      csv += '=== المرضى (PATIENTS) ===\n';
      csv += ['معرف المريض', 'كود المريض', 'الاسم', 'رقم الهاتف', 'تاريخ الميلاد', 'ملاحظات', 'تاريخ التسجيل'].map(escapeCsv).join(',') + '\n';
      patients.forEach(p => {
        csv += [p.id, p.code, p.full_name, p.phone, p.date_of_birth, p.notes, p.created_at].map(escapeCsv).join(',') + '\n';
      });

      csv += '\n=== سجل الكشوفات والزيارات (VISITS) ===\n';
      csv += ['معرف الزيارة', 'معرف المريض', 'نوع الكشف', 'الحالة', 'المبلغ (جنيه)', 'رقم الدور', 'ملاحظات الطبيب', 'تاريخ الزيارة'].map(escapeCsv).join(',') + '\n';
      visits.forEach(v => {
        csv += [v.id, v.patient_id, v.visit_type_id, v.status, v.price, v.queue_number, v.doctor_notes, v.created_at].map(escapeCsv).join(',') + '\n';
      });

      csv += '\n=== قياسات الوزن والأجسام (MEASUREMENTS) ===\n';
      csv += ['معرف القياس', 'معرف المريض', 'الوزن (كجم)', 'الطول (سم)', 'BMI', 'نسبة الدهون', 'نسبة العضلات', 'نسبة المياه', 'كتلة العظام', 'تاريخ القياس'].map(escapeCsv).join(',') + '\n';
      measurements.forEach(m => {
        csv += [m.id, m.patient_id, m.weight_kg, m.height_cm, m.bmi, m.fat_percentage, m.muscle_percentage, m.water_percentage, m.bone_mass, m.recorded_at].map(escapeCsv).join(',') + '\n';
      });

      csv += '\n=== خطط التغذية (DIET PLANS) ===\n';
      csv += ['المعرف', 'عنوان النظام', 'محتوى النظام', 'تاريخ الإنشاء'].map(escapeCsv).join(',') + '\n';
      dietPlans.forEach(d => {
        csv += [d.id, d.title, d.content, d.created_at].map(escapeCsv).join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=clinic_backup_${dateStr}.csv`);
      return res.status(200).send(csv);
    } else {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        stats: {
          totalPatients: patients.length,
          totalVisits: visits.length,
          totalMeasurements: measurements.length,
          totalShifts: shifts.length,
          totalDietPlans: dietPlans.length
        },
        patients,
        visits,
        measurements,
        shifts,
        dietPlans,
        settings,
        users,
        visitTypes,
        payments,
        auditLogs
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=clinic_backup_${dateStr}.json`);
      return res.status(200).json(backupData);
    }
  } catch (err: any) {
    console.error('Backup error:', err);
    return res.status(500).json({ message: 'فشل في إنشاء واستخراج النسخة الاحتياطية' });
  }
});

// POST restore database from uploaded JSON backup file
router.post('/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backupData = req.body;

    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ message: 'تنسيق الملف أو البيانات غير صحيح (ليس كائن JSON صالح)' });
    }

    const patients = backupData.patients || [];
    const visits = backupData.visits || [];
    const measurements = backupData.measurements || backupData.patient_measurements || [];
    const shifts = backupData.shifts || [];
    const dietPlans = backupData.dietPlans || backupData.diet_plans || [];
    const settings = backupData.settings || backupData.clinic_settings || [];
    const users = backupData.users || [];
    const visitTypes = backupData.visitTypes || backupData.visit_types || [];
    const payments = backupData.payments || [];
    const auditLogs = backupData.auditLogs || backupData.audit_logs || [];

    if (!Array.isArray(patients) && !Array.isArray(visits)) {
      return res.status(400).json({ message: 'ملف النسخة الاحتياطية غير صالح أو لا يحتوي على قائمة المرضى أو الزيارات' });
    }

    const db = await getDb();
    await db.exec('BEGIN IMMEDIATE TRANSACTION;');

    try {
      // Truncate current data tables safely
      await db.exec('DELETE FROM patient_measurements;');
      await db.exec('DELETE FROM payments;');
      await db.exec('DELETE FROM visits;');
      await db.exec('DELETE FROM shifts;');
      await db.exec('DELETE FROM patients;');
      await db.exec('DELETE FROM diet_plans;');
      await db.exec('DELETE FROM clinic_settings;');
      await db.exec('DELETE FROM visit_types;');
      await db.exec('DELETE FROM audit_logs;');
      if (users.length > 0) {
        await db.exec('DELETE FROM users;');
      }

      // Re-insert users
      if (users.length > 0) {
        for (const u of users) {
          await db.run(
            `INSERT INTO users (id, username, password_hash, full_name, role, is_active, created_at, last_login_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              u.id, 
              u.username, 
              u.password_hash || u.passwordHash, 
              u.full_name || u.fullName, 
              u.role, 
              (u.is_active ?? u.isActive) ? 1 : 0, 
              u.created_at || u.createdAt || new Date().toISOString(), 
              u.last_login_at || u.lastLoginAt || null
            ]
          );
        }
      }

      // Re-insert visit_types
      for (const vt of visitTypes) {
        await db.run(
          `INSERT INTO visit_types (id, name, price, description, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          [vt.id, vt.name, vt.price, vt.description || '', (vt.is_active ?? vt.isActive) ? 1 : 0]
        );
      }

      // Re-insert patients
      for (const p of patients) {
        await db.run(
          `INSERT INTO patients (id, code, full_name, phone, gender, date_of_birth, height_cm, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, 
            p.code, 
            p.full_name || p.fullName, 
            p.phone, 
            p.gender || 'أنثى', 
            p.date_of_birth || p.dateOfBirth || null, 
            p.height_cm || p.heightCm || null, 
            p.notes || '', 
            p.created_at || p.createdAt || new Date().toISOString()
          ]
        );
      }

      // Re-insert shifts
      for (const s of shifts) {
        await db.run(
          `INSERT INTO shifts (id, cashier_id, start_time, end_time, is_open, total_amount, total_visits)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id, 
            s.cashier_id || s.cashierId, 
            s.start_time || s.startTime, 
            s.end_time || s.endTime || null, 
            (s.is_open ?? s.isOpen) ? 1 : 0, 
            s.total_amount ?? s.totalAmount ?? 0, 
            s.total_visits ?? s.totalVisits ?? 0
          ]
        );
      }

      // Re-insert visits
      for (const v of visits) {
        await db.run(
          `INSERT INTO visits (id, idempotency_key, patient_id, visit_type_id, price, status, payment_status, payment_method, queue_number, cashier_id, shift_id, completed_by_doctor_id, doctor_notes, created_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id,
            v.idempotency_key || v.idempotencyKey || `restored_${v.id}_${Date.now()}`,
            v.patient_id || v.patientId,
            v.visit_type_id || v.visitTypeId || 1,
            v.price ?? 0,
            v.status || 'Waiting',
            v.payment_status || v.paymentStatus || 'Paid',
            v.payment_method || v.paymentMethod || 'Cash',
            v.queue_number || v.queueNumber || 1,
            v.cashier_id || v.cashierId || 1,
            v.shift_id || v.shiftId || 1,
            v.completed_by_doctor_id || v.completedByDoctorId || null,
            v.doctor_notes || v.doctorNotes || '',
            v.created_at || v.createdAt || new Date().toISOString(),
            v.completed_at || v.completedAt || null
          ]
        );
      }

      // Re-insert measurements
      for (const m of measurements) {
        await db.run(
          `INSERT INTO patient_measurements (id, visit_id, patient_id, weight_kg, height_cm, bmi, fat_percentage, muscle_percentage, water_percentage, bone_mass, blood_pressure, notes, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id,
            m.visit_id || m.visitId,
            m.patient_id || m.patientId,
            m.weight_kg ?? m.weightKg,
            m.height_cm ?? m.heightCm ?? null,
            m.bmi ?? null,
            m.fat_percentage ?? m.fatPercentage ?? null,
            m.muscle_percentage ?? m.musclePercentage ?? null,
            m.water_percentage ?? m.waterPercentage ?? null,
            m.bone_mass ?? m.boneMass ?? null,
            m.blood_pressure || m.bloodPressure || null,
            m.notes || '',
            m.recorded_at || m.recordedAt || new Date().toISOString()
          ]
        );
      }

      // Re-insert payments
      for (const pm of payments) {
        await db.run(
          `INSERT INTO payments (id, visit_id, amount, payment_method, status, cashier_id, shift_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pm.id,
            pm.visit_id || pm.visitId,
            pm.amount ?? 0,
            pm.payment_method || pm.paymentMethod || 'Cash',
            pm.status || 'Successful',
            pm.cashier_id || pm.cashierId || 1,
            pm.shift_id || pm.shiftId || 1,
            pm.created_at || pm.createdAt || new Date().toISOString()
          ]
        );
      }

      // Re-insert diet_plans
      for (const dp of dietPlans) {
        await db.run(
          `INSERT INTO diet_plans (id, title, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [dp.id, dp.title, dp.content, dp.created_at || dp.createdAt || new Date().toISOString(), dp.updated_at || dp.updatedAt || new Date().toISOString()]
        );
      }

      // Re-insert clinic_settings
      if (Array.isArray(settings)) {
        for (const st of settings) {
          if (st.key && st.value !== undefined) {
            await db.run(
              `INSERT INTO clinic_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
              [st.key, String(st.value)]
            );
          }
        }
      } else if (typeof settings === 'object' && settings !== null) {
        for (const [key, value] of Object.entries(settings)) {
          await db.run(
            `INSERT INTO clinic_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            [key, String(value)]
          );
        }
      }

      // Re-insert audit_logs if any
      for (const al of auditLogs) {
        await db.run(
          `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            al.id,
            al.user_id || al.userId || 1,
            al.action,
            al.entity_type || al.entityType || 'System',
            al.entity_id || al.entityId || null,
            typeof al.details === 'object' ? JSON.stringify(al.details) : (al.details || null),
            al.timestamp || new Date().toISOString()
          ]
        );
      }

      await db.exec('COMMIT;');
    } catch (txnErr) {
      try { await db.exec('ROLLBACK;'); } catch (_) {}
      throw txnErr;
    }

    // Emit live socket event
    const { io } = await import('../../../server');
    if (io) {
      io.emit('new-visit-in-queue', { refresh: true });
      io.emit('visit-status-changed', { refresh: true });
    }

    await logAudit(req.user!.id, 'RESTORE_DATABASE_FROM_JSON_FILE', 'Database', undefined, {
      restoredPatients: patients.length,
      restoredVisits: visits.length,
      restoredMeasurements: measurements.length,
      restoredShifts: shifts.length
    });

    return res.json({
      message: 'تم استرجاع كافة بيانات العيادة والنظام بنجاح من ملف النسخة الاحتياطية!',
      stats: {
        patients: patients.length,
        visits: visits.length,
        measurements: measurements.length,
        shifts: shifts.length,
        dietPlans: dietPlans.length
      }
    });

  } catch (err: any) {
    console.error('Database restore error:', err);
    return res.status(500).json({ message: `فشل في استرجاع النسخة الاحتياطية: ${err.message || 'خطأ في معالجة البيانات'}` });
  }
});

export default router;
