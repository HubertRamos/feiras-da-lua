export type VendorStatus = 'active' | 'inactive';

export type FairEditionStatus = 'planned' | 'completed' | 'canceled';

export type AttendanceStatus = 'uninformed' | 'present' | 'absent';

export type PaymentStatus = 'pending' | 'paid' | 'canceled';

export type PaymentMethod = 'cash' | 'pix' | 'other';

/**
 * Representação monetária segura em centavos inteiros (ex: R$ 30,00 = 3000)
 * para evitar erros de precisão de ponto flutuante.
 */
export type Cents = number;

export interface Vendor {
  id: string;
  name: string;
  business_name: string;
  phone: string;
  product_category: string;
  notes: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export interface FairEdition {
  id: string;
  name: string;
  event_date: string; // YYYY-MM-DD
  participation_fee: Cents;
  status: FairEditionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Participation {
  id: string;
  vendor_id: string;
  edition_id: string;
  charged_amount: Cents;
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  participation_id: string;
  amount: Cents;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  notes: string;
  created_at: string;
}

export interface CreateVendorInput {
  name: string;
  business_name: string;
  phone?: string;
  product_category?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  business_name?: string;
  phone?: string;
  product_category?: string;
  notes?: string;
  status?: VendorStatus;
}

export interface CreateEditionInput {
  name: string;
  event_date: string;
  participation_fee: Cents;
  status?: FairEditionStatus;
  notes?: string;
}

export interface UpdateEditionInput {
  name?: string;
  event_date?: string;
  participation_fee?: Cents;
  status?: FairEditionStatus;
  notes?: string;
}

export interface CreateParticipationInput {
  vendor_id: string;
  edition_id: string;
  charged_amount: Cents;
  attendance_status?: AttendanceStatus;
  notes?: string;
}

export interface UpdateParticipationInput {
  attendance_status?: AttendanceStatus;
  payment_status?: PaymentStatus;
  notes?: string;
}

export interface CreatePaymentInput {
  participation_id: string;
  amount: Cents;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface DatabaseSnapshot {
  schema_version: number;
  exported_at: string;
  vendors: Vendor[];
  fair_editions: FairEdition[];
  participations: Participation[];
  payments: Payment[];
}

export interface StorageStats {
  provider: 'local' | 'supabase';
  vendorsCount: number;
  activeVendorsCount: number;
  editionsCount: number;
  participationsCount: number;
  paymentsCount: number;
}
