import type {
  CreateEditionInput,
  CreateParticipationInput,
  CreatePaymentInput,
  CreateVendorInput,
  DatabaseSnapshot,
  FairEdition,
  Participation,
  Payment,
  StorageStats,
  UpdateEditionInput,
  UpdateParticipationInput,
  UpdateVendorInput,
  Vendor,
} from '../types/domain';

export class DatabaseError extends Error {
  readonly code:
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'INTEGRITY_ERROR'
    | 'STORAGE_ERROR'
    | 'NOT_IMPLEMENTED';

  constructor(
    code: DatabaseError['code'],
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

export type ImportMode = 'replace' | 'merge';

/**
 * Interface comum de persistência entre LocalDatabase (IndexedDB)
 * e SupabaseDatabase (futura integração PostgreSQL/Supabase).
 */
export interface DatabaseProvider {
  readonly providerName: 'local' | 'supabase';

  // Feirantes
  listVendors(): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | null>;
  createVendor(input: CreateVendorInput): Promise<Vendor>;
  updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor>;

  // Edições da Feira
  listEditions(): Promise<FairEdition[]>;
  getEditionById(id: string): Promise<FairEdition | null>;
  createEdition(input: CreateEditionInput): Promise<FairEdition>;
  updateEdition(id: string, input: UpdateEditionInput): Promise<FairEdition>;

  // Participações e Cobranças
  listParticipations(): Promise<Participation[]>;
  listParticipationsByEdition(editionId: string): Promise<Participation[]>;
  listParticipationsByVendor(vendorId: string): Promise<Participation[]>;
  getParticipationById(id: string): Promise<Participation | null>;
  createParticipation(input: CreateParticipationInput): Promise<Participation>;
  createParticipationsBatch(inputs: CreateParticipationInput[]): Promise<Participation[]>;
  updateParticipation(id: string, input: UpdateParticipationInput): Promise<Participation>;

  // Pagamentos
  listPayments(): Promise<Payment[]>;
  listPaymentsByParticipation(participationId: string): Promise<Payment[]>;
  createPayment(input: CreatePaymentInput): Promise<Payment>;

  // Backup, Manutenção e Diagnóstico
  exportSnapshot(): Promise<DatabaseSnapshot>;
  importSnapshot(snapshot: DatabaseSnapshot, mode: ImportMode): Promise<void>;
  clearAllData(): Promise<void>;
  getStorageStats(): Promise<StorageStats>;
}
