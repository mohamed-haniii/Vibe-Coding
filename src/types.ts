export type UserRole = 'Admin' | 'Assistant';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface SmartPricingResult {
  recommendedVisitTypeId: number;
  recommendedVisitTypeName: string;
  finalPrice: number;
  daysSinceLastVisit: number | null;
  lastVisitDate: string | null;
  statusBadge: string;
  reasonCode: string;
  isDelayed: boolean;
}

export type BadHabitLevel = 'NONE' | 'SIMPLE' | 'MODERATE' | 'SEVERE';

export interface BadHabitsData {
  cola?: BadHabitLevel;
  chepcy?: BadHabitLevel;
  sweets?: BadHabitLevel;
  nuts?: BadHabitLevel;
  delivery?: BadHabitLevel;
  otherNotes?: string;
}

export interface Patient {
  id: number;
  code: string; // e.g. "P-0001"
  fullName: string;
  phone: string;
  gender: 'أنثى' | 'ذكر';
  dateOfBirth?: string;
  age?: number;
  heightCm?: number;
  targetWeightKg?: number;
  maritalStatus?: string;
  hasChildren?: boolean;
  childrenCount?: number;
  isLactating?: boolean;
  isPregnant?: boolean;
  isPeriodRegular?: boolean;
  hasContraception?: boolean;
  contraceptionType?: 'أقراص' | 'لولب' | 'ربط أنابيب' | string;
  hasOperations?: boolean;
  operationsHistory?: string;
  takesMedications?: boolean;
  medicationsHistory?: string;
  femaleReproductiveNotes?: string;
  badHabits?: BadHabitsData;
  chiefComplaints?: string;
  chronicDiseasesNotes?: string;
  pastAcupunctureRegimes?: string;
  occupation?: string;
  notes?: string;
  isMaintenanceMode?: boolean;
  maintenanceStartDate?: string;
  maintenanceTargetWeight?: number;
  createdAt: string;
  smartPricing?: SmartPricingResult;
}

export interface DrawerTransaction {
  id: number;
  shiftId: number;
  cashierId: number;
  cashierName?: string;
  type: 'Expense' | 'CashIn';
  amount: number;
  category?: string;
  notes: string;
  createdAt: string;
}

export interface VisitType {
  id: number;
  name: string; // "كشف جديد" | "إعادة" | "نظام تثبيت"
  price: number; // 200 | 50 | 60
  description: string;
  isActive: boolean;
}

export type VisitStatus = 'Waiting' | 'InConsultation' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid';
export type PaymentMethod = 'Cash' | 'InstaPay' | 'كاش' | 'انستا باي';

export interface PatientMeasurement {
  id: number;
  visitId: number;
  patientId: number;
  weightKg: number;
  heightCm?: number;
  bmi?: number;
  fatPercentage?: number;
  musclePercentage?: number;
  waterPercentage?: number;
  boneMass?: number;
  bloodPressure?: string;
  notes?: string;
  recordedAt: string;
}

export interface Visit {
  id: number;
  idempotencyKey: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  visitTypeId: number;
  visitTypeName: string;
  price: number;
  isArchive?: boolean;
  status: VisitStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  queueNumber: number;
  cashierId: number;
  cashierName: string;
  shiftId: number;
  doctorNotes?: string;
  completedByDoctorId?: number;
  createdAt: string;
  completedAt?: string;
  currentMeasurement?: PatientMeasurement;
  previousMeasurement?: PatientMeasurement;
  weightChangeDelta?: number; // e.g., -1.2 or +0.5
}

export interface Payment {
  id: number;
  visitId: number;
  amount: number;
  paymentMethod?: string;
  status: 'Successful' | 'NotSuccessful';
  cashierId: number;
  shiftId: number;
  createdAt: string;
}

export interface Shift {
  id: number;
  cashierId: number;
  cashierName: string;
  startTime: string;
  endTime?: string;
  isOpen: boolean;
  totalAmount: number;
  totalVisits: number;
  newVisitsCount: number;
  followupVisitsCount: number;
  maintenanceVisitsCount: number;
  totalCashIn?: number;
  totalExpenses?: number;
  netDrawerCash?: number;
  drawerTransactions?: DrawerTransaction[];
}

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  timestamp: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  currentShift: Shift | null;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalRevenue: number;
  totalVisitsCount: number;
  totalPatientsCount: number;
  totalExpenses?: number;
  totalCashIn?: number;
  netDrawerCash?: number;
  newVisitsRevenue: number;
  newVisitsCount: number;
  followupVisitsRevenue: number;
  followupVisitsCount: number;
  maintenanceVisitsRevenue: number;
  maintenanceVisitsCount: number;
  dailyBreakdown: {
    date: string;
    dayName: string;
    totalVisits: number;
    revenue: number;
    expenses?: number;
  }[];
  visitTypeDistribution: {
    name: string;
    count: number;
    revenue: number;
  }[];
}

export interface ShiftDetailReport {
  shiftId: number;
  cashierId: number;
  cashierName: string;
  startTime: string;
  endTime?: string;
  isOpen: boolean;
  totalVisits: number;
  totalRevenue: number;
  cashRevenue?: number;
  instapayRevenue?: number;
  totalCashIn: number;
  totalExpenses: number;
  netDrawerCash: number;
  newVisitsCount: number;
  followupVisitsCount: number;
  maintenanceVisitsCount: number;
  drawerTransactions?: DrawerTransaction[];
  visits: {
    visitId: number;
    patientName: string;
    visitTypeName: string;
    amount: number;
    paymentMethod?: string;
    createdAt: string;
  }[];
}

export interface ServerNetworkInfo {
  serverIp: string;
  port: number;
  appUrl: string;
  qrCodeDataUrl?: string;
}

export interface DietPlan {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicSettings {
  clinic_name: string;
  clinic_subtitle: string;
  clinic_phone?: string;
  clinic_address?: string;
  enable_sound_alerts?: boolean;
  enable_receipt_auto_print?: boolean;
  allow_cashier_cancel_visit?: boolean;
  enable_weight_loss_target_badge?: boolean;
  enable_whatsapp_reminders?: boolean;
  // Delay & Follow-up Pricing Rules
  delay_grace_days?: number;
  delay_tier1_days?: number;
  delay_tier1_price?: number;
  delay_tier2_days?: number;
  delay_tier2_price?: number;
  delay_revert_new_days?: number;
  // PDF Customization Settings
  pdf_header_title?: string;
  pdf_header_subtitle?: string;
  pdf_footer_text?: string;
  pdf_phone?: string;
  pdf_address?: string;
  pdf_primary_color?: string;
  pdf_logo_url?: string;
  pdf_show_vitals?: boolean;
  pdf_show_notes?: boolean;
  pdf_show_prescriptions?: boolean;
  pdf_show_next_date?: boolean;
  pdf_font_size?: 'small' | 'medium' | 'large';
  pdf_paper_size?: 'A4' | 'A5' | 'Thermal';
  patient_clinical_data_entry_role?: 'both' | 'doctor' | 'assistant';
}

export interface DailyReport {
  date: string;
  totalVisitsCount: number;
  completedVisitsCount: number;
  cancelledVisitsCount: number;
  waitingVisitsCount: number;
  totalRevenue: number;
  cashRevenue: number;
  instapayRevenue: number;
  totalExpenses: number;
  totalCashIn: number;
  netDrawerCash: number;
  newVisitsCount: number;
  newVisitsRevenue: number;
  followupVisitsCount: number;
  followupVisitsRevenue: number;
  maintenanceVisitsCount: number;
  maintenanceVisitsRevenue: number;
  shifts?: ShiftDetailReport[];
  drawerTransactions: DrawerTransaction[];
  visits: {
    id: number;
    patientName: string;
    patientCode: string;
    patientPhone: string;
    visitTypeName: string;
    price: number;
    paymentStatus: string;
    paymentMethod: string;
    status: string;
    cashierName: string;
    createdAt: string;
  }[];
}

