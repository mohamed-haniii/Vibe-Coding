import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

export interface AppDb {
  exec(sql: string): Promise<void>;
  get(sql: string, ...params: any[]): Promise<any>;
  all(sql: string, ...params: any[]): Promise<any[]>;
  run(sql: string, ...params: any[]): Promise<{ lastID: number; changes: number }>;
}

let dbWrapper: AppDb | null = null;
let sqlJsDb: SqlJsDatabase | null = null;
let dbFilePath = '';
let inTransaction = false;

function normalizeParams(params: any[]): any[] {
  if (params.length === 0) return [];
  if (params.length === 1) {
    if (Array.isArray(params[0])) return params[0];
    if (params[0] === undefined) return [];
    return [params[0]];
  }
  return params;
}

let saveTimer: NodeJS.Timeout | null = null;
let isSaving = false;
let needsSaveAgain = false;

export async function flushDb() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!sqlJsDb || !dbFilePath) return;
  if (isSaving) {
    needsSaveAgain = true;
    return;
  }
  isSaving = true;
  try {
    const data = sqlJsDb.export();
    await fs.promises.writeFile(dbFilePath, Buffer.from(data));
  } catch (err) {
    console.error('[DB Save Error]', err);
  } finally {
    isSaving = false;
    if (needsSaveAgain) {
      needsSaveAgain = false;
      saveDb(false);
    }
  }
}

function saveDb(immediate = false) {
  if (inTransaction) {
    return;
  }
  if (immediate) {
    flushDb();
    return;
  }
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null;
      flushDb();
    }, 200);
  }
}

export async function getDb(): Promise<AppDb> {
  if (dbWrapper) return dbWrapper;

  dbFilePath = path.resolve(process.cwd(), 'clinic.sqlite');
  const SQL = await initSqlJs();

  const createWrapper = (): AppDb => ({
    async exec(sql: string): Promise<void> {
      if (!sqlJsDb) throw new Error('DB not initialized');
      const upper = sql.trim().toUpperCase();
      if (upper.startsWith('BEGIN')) {
        inTransaction = true;
        sqlJsDb.exec(sql);
      } else if (upper.startsWith('COMMIT')) {
        sqlJsDb.exec(sql);
        inTransaction = false;
        saveDb();
      } else if (upper.startsWith('ROLLBACK')) {
        try {
          sqlJsDb.exec(sql);
        } finally {
          inTransaction = false;
          saveDb();
        }
      } else {
        sqlJsDb.exec(sql);
        saveDb();
      }
    },

    async get(sql: string, ...params: any[]): Promise<any> {
      if (!sqlJsDb) throw new Error('DB not initialized');
      const p = normalizeParams(params);
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(p);
      let row = null;
      if (stmt.step()) {
        row = stmt.getAsObject();
      }
      stmt.free();
      return row;
    },

    async all(sql: string, ...params: any[]): Promise<any[]> {
      if (!sqlJsDb) throw new Error('DB not initialized');
      const p = normalizeParams(params);
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(p);
      const rows: any[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },

    async run(sql: string, ...params: any[]): Promise<{ lastID: number; changes: number }> {
      if (!sqlJsDb) throw new Error('DB not initialized');
      const p = normalizeParams(params);
      const stmt = sqlJsDb.prepare(sql);
      stmt.run(p);
      stmt.free();

      const lastIDRes = sqlJsDb.exec('SELECT last_insert_rowid() as id');
      const changesRes = sqlJsDb.exec('SELECT changes() as cnt');

      const lastID = Number(lastIDRes[0]?.values[0]?.[0] ?? 0);
      const changes = Number(changesRes[0]?.values[0]?.[0] ?? 0);

      saveDb();
      return { lastID, changes };
    }
  });

  let loadedFromFile = false;
  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      sqlJsDb = new SQL.Database(fileBuffer);
      loadedFromFile = true;
    } catch (err) {
      console.error('[DB Read Error] Corrupted sqlite file, recreating fresh DB:', err);
      sqlJsDb = new SQL.Database();
    }
  } else {
    sqlJsDb = new SQL.Database();
  }

  dbWrapper = createWrapper();

  try {
    await dbWrapper.exec('PRAGMA foreign_keys = ON;');
    await initSchema(dbWrapper);
    await seedInitialData(dbWrapper);
  } catch (err) {
    if (loadedFromFile) {
      console.error('[DB Corruption Error] Existing sqlite file is malformed, resetting DB:', err);
      try {
        const backupPath = `${dbFilePath}.corrupt.${Date.now()}`;
        if (fs.existsSync(dbFilePath)) {
          fs.renameSync(dbFilePath, backupPath);
        }
      } catch (backupErr) {
        console.error('Failed to rename corrupt db file:', backupErr);
      }
      sqlJsDb = new SQL.Database();
      dbWrapper = createWrapper();
      await dbWrapper.exec('PRAGMA foreign_keys = ON;');
      await initSchema(dbWrapper);
      await seedInitialData(dbWrapper);
      saveDb();
    } else {
      throw err;
    }
  }

  return dbWrapper;
}

async function initSchema(db: AppDb) {
  // Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Assistant')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
  `);

  // Patients Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      gender TEXT NOT NULL,
      date_of_birth TEXT,
      height_cm REAL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Visit Types Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS visit_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Shifts Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      is_open INTEGER NOT NULL DEFAULT 1,
      total_amount REAL NOT NULL DEFAULT 0,
      total_visits INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );
  `);

  // Visits Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL,
      visit_type_id INTEGER NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Waiting', 'InConsultation', 'Completed', 'Cancelled')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('Paid', 'Unpaid')),
      queue_number INTEGER NOT NULL,
      cashier_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      completed_by_doctor_id INTEGER,
      doctor_notes TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (visit_type_id) REFERENCES visit_types(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (completed_by_doctor_id) REFERENCES users(id)
    );
  `);

  // Patient Measurements Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS patient_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL,
      patient_id INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL,
      bmi REAL,
      fat_percentage REAL,
      muscle_percentage REAL,
      water_percentage REAL,
      bone_mass REAL,
      blood_pressure TEXT,
      notes TEXT,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
  `);

  // Safe migrations for existing patient_measurements tables
  try { await db.exec(`ALTER TABLE patient_measurements ADD COLUMN fat_percentage REAL;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patient_measurements ADD COLUMN muscle_percentage REAL;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patient_measurements ADD COLUMN water_percentage REAL;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patient_measurements ADD COLUMN bone_mass REAL;`); } catch (_) {}

  // Safe migrations for visits & payments tables for payment_method
  try { await db.exec(`ALTER TABLE visits ADD COLUMN payment_method TEXT DEFAULT 'Cash';`); } catch (_) {}
  try { await db.exec(`ALTER TABLE payments ADD COLUMN payment_method TEXT DEFAULT 'Cash';`); } catch (_) {}

  // Payments Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visit_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      status TEXT NOT NULL CHECK(status IN ('Successful', 'NotSuccessful')),
      cashier_id INTEGER NOT NULL,
      shift_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (visit_id) REFERENCES visits(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );
  `);

  // Cash Drawer Transactions Table (Cash Out / Expenses & Cash In)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS drawer_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_id INTEGER NOT NULL,
      cashier_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Expense', 'CashIn')),
      amount REAL NOT NULL,
      category TEXT,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );
  `);

  // Saved Operations Catalog Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Saved Medications Catalog Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saved_medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Safe migrations for patient medical and personal history fields
  try { await db.exec(`ALTER TABLE patients ADD COLUMN age INTEGER;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN target_weight_kg REAL;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN marital_status TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN has_children INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN children_count INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN is_lactating INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN is_pregnant INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN has_operations INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN operations_history TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN takes_medications INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN medications_history TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN female_reproductive_notes TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN bad_habits TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN chief_complaints TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN past_acupuncture_regimes TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN occupation TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN is_maintenance_mode INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN maintenance_start_date TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN maintenance_target_weight REAL;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN is_period_regular INTEGER DEFAULT 1;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN has_contraception INTEGER DEFAULT 0;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN contraception_type TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE patients ADD COLUMN chronic_diseases_notes TEXT;`); } catch (_) {}
  try { await db.exec(`ALTER TABLE visits ADD COLUMN is_archive INTEGER DEFAULT 0;`); } catch (_) {}

  // Automatically mark legacy historical archive visits so they never appear in daily clinic reports or register as 0 EGP cashier visits
  try {
    await db.exec(`UPDATE visits SET is_archive = 1 WHERE idempotency_key LIKE 'HIST-%' OR idempotency_key LIKE 'INIT-%' OR queue_number = 0 OR price = 0;`);
  } catch (_) {}

  // High performance database indexes for instant query execution under heavy volume
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
      CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at);
      CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
      CREATE INDEX IF NOT EXISTS idx_visits_shift_id ON visits(shift_id);
      CREATE INDEX IF NOT EXISTS idx_visits_archive ON visits(is_archive);
      CREATE INDEX IF NOT EXISTS idx_patient_measurements_patient_id ON patient_measurements(patient_id);
      CREATE INDEX IF NOT EXISTS idx_patient_measurements_visit_id ON patient_measurements(visit_id);
      CREATE INDEX IF NOT EXISTS idx_patient_measurements_recorded_at ON patient_measurements(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(code);
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
      CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients(full_name);
    `);
  } catch (_) {}

  // Audit Logs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Diet Plans Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS diet_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Clinic Settings Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function seedInitialData(db: AppDb) {
  const now = new Date().toISOString();

  // 0. Seed Settings
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM clinic_settings');
  if (!settingsCount || settingsCount.count === 0) {
    await db.run(`INSERT INTO clinic_settings (key, value) VALUES ('clinic_name', 'عيادة التخسيس والتغذية')`);
    await db.run(`INSERT INTO clinic_settings (key, value) VALUES ('clinic_subtitle', '')`);
  }

  // Seed sample Diet Plans if none exist
  const dietPlansCount = await db.get('SELECT COUNT(*) as count FROM diet_plans');
  if (!dietPlansCount || dietPlansCount.count === 0) {
    await db.run(
      `INSERT INTO diet_plans (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [
        'نظام الصيام المتقطع (16/8)',
        `• وجبة الإفطار (12 ظهراً): 2 بيضة مسلوقة + نصف رغيف بلدي + سلطة خضراء بملعقة زيت زيتون.\n• وجبة خفيفة (3 عصراً): ثمرة فاكهة (تفاح أو جوافة) + قبضة مكسرات نيئة.\n• وجبة العشاء (8 مساءً): علبة زبادي لايت + عصير ليمون أو قطعة جبن قريش.\n• المشروبات: ماء (3 لتر يومياً)، شاي أخضر وقرفة بدون سكر خلال ساعات الصيام.`,
        now,
        now
      ]
    );

    await db.run(
      `INSERT INTO diet_plans (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [
        'نظام السعرات المنخفضة (1200 سعر حراري)',
        `• الإفطار: قطعة جبن قريش + خيار + ربع رغيف أسمر.\n• الغداء: 200 جرام صدر دجاج مشوي أو سمك مشوي + طبق سلطة كبير + 3 معالق أرز مسلوق.\n• العشاء: علبة زبادي لايت مع رشة بذور الشيا.\n• ملاحظة: الامتناع عن السكريات والمشروبات الغازية نهائياً.`,
        now,
        now
      ]
    );

    await db.run(
      `INSERT INTO diet_plans (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [
        'نظام تثبيت الوزن الشامل',
        `• يوم مفتوح واحد أسبوعياً للوجبة الرئيسية فقط.\n• حساب السعرات الحرارية اليومية المسموحة (2000-2200 سعر).\n• ممارسة الرياضة أو المشي السريع 30 دقيقة يومياً 4 أيام أسبوعياً.\n• وزن أسبوعي ثابت صباحاً قبل تناول أي طعام.`,
        now,
        now
      ]
    );
  }

  // 1. Seed Users
  const adminCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', 'Admin');
  if (!adminCount || adminCount.count === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    await db.run(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      ['admin', adminHash, 'د. أمل مصطفى (الدكتورة والأدمن)', 'Admin', now]
    );
  }

  const cashierCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', 'Assistant');
  if (!cashierCount || cashierCount.count === 0) {
    const cashierHash = await bcrypt.hash('cashier123', 10);
    await db.run(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      ['cashier1', cashierHash, 'مريم أحمد (مواجهة الاستقبال 1)', 'Assistant', now]
    );

    await db.run(
      `INSERT INTO users (username, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      ['cashier2', cashierHash, 'سارة محمود (مواجهة الاستقبال 2)', 'Assistant', now]
    );
  }

  // 2. Seed Visit Types strictly as per business rules
  const visitTypeCount = await db.get('SELECT COUNT(*) as count FROM visit_types');
  if (!visitTypeCount || visitTypeCount.count === 0) {
    await db.run(
      `INSERT INTO visit_types (id, name, price, description, is_active)
       VALUES 
       (1, 'كشف جديد', 200, 'أول زيارة للمريض وتحديد النظام الغذائي والقياسات الشاملة', 1),
       (2, 'إعادة', 50, 'زيارة متابعة أسبوعية/شهري لمتابعة الوزن ونسب التنزيل', 1),
       (3, 'نظام تثبيت', 60, 'جلسة تثبيت الوزن المخصصة كل أسبوعين', 1)`
    );
  }

  // 3. Seed initial saved operations if none exist
  const opCount = await db.get('SELECT COUNT(*) as count FROM saved_operations');
  if (!opCount || opCount.count === 0) {
    const defaultOps = [
      'ولادة قيصرية (Cesarean section - CS)',
      'استئصال المرارة (Cholecystectomy)',
      'استئصال الزائدة الدودية (Appendectomy)',
      'تكميم المعدة (Sleeve gastrectomy)',
      'تحويل مسار المعدة (Gastric bypass)',
      'بالون المعدة (Gastric balloon)',
      'استئصال اللوزتين (Tonsillectomy)',
      'عملية فتق (Hernia repair)',
      'استئصال الغدة الدرقية (Thyroidectomy)',
      'عملية غضروف / عمود فقري'
    ];
    for (const op of defaultOps) {
      try {
        await db.run(`INSERT INTO saved_operations (name, created_at) VALUES (?, ?)`, [op, now]);
      } catch (_) {}
    }
  }

  // 4. Seed initial saved medications if none exist
  const medCount = await db.get('SELECT COUNT(*) as count FROM saved_medications');
  if (!medCount || medCount.count === 0) {
    const defaultMeds = [
      'علاج الغدة الدرقية (Eltroxin / Euthyrox)',
      'أدوية الضغط (Concor / Capoten / Norvasc)',
      'أدوية السكر (Metformin / Glucophage / Janumet / Insulin)',
      'فيتامين د وكالسيوم (Vit D / Calcium)',
      'أدوية كوليسترول ودهون ثلاثية (Atorvastatin / Lipitor / Crestor)',
      'فيتامينات ومكملات غذائية (Multivitamins / Omega 3)',
      'مسكنات ومضادات التهاب (NSAIDs)',
      'أدوية حساسية وربو'
    ];
    for (const med of defaultMeds) {
      try {
        await db.run(`INSERT INTO saved_medications (name, created_at) VALUES (?, ?)`, [med, now]);
      } catch (_) {}
    }
  }

  // 5. Seed initial sample patients for testing convenience if none exist
  const patientCount = await db.get('SELECT COUNT(*) as count FROM patients');
  if (!patientCount || patientCount.count === 0) {
    await db.run(
      `INSERT INTO patients (code, full_name, phone, gender, date_of_birth, height_cm, notes, created_at)
       VALUES 
       ('P-0001', 'منة الله السيد', '01012345678', 'أنثى', '1995-04-12', 165, 'هدف التنزيل: 15 كجم', ?),
       ('P-0002', 'أحمد محمود القاضي', '01123456789', 'ذكر', '1988-09-20', 178, 'يرغب في نظام تثبيت الوزن بعد التخسيس', ?),
       ('P-0003', 'فاطمة الزهراء علي', '01234567890', 'أنثى', '1992-11-05', 160, 'متابعة أسبوعية منتظمة', ?)`,
      [now, now, now]
    );
  }
}

