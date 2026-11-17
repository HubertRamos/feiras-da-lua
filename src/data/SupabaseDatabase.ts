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
import { DatabaseError, type DatabaseProvider, type ImportMode } from './DatabaseProvider';

/**
 * Adaptador preparado para futura integração com Supabase (PostgreSQL).
 *
 * Neste MVP, o sistema utiliza exclusivamente o provedor local (IndexedDB).
 * Nenhuma conexão fictícia ou simulada é realizada aqui.
 * Para habilitar futuramente:
 * 1. Instale `@supabase/supabase-js` e crie as tabelas usando `supabase/schema.sql`.
 * 2. Implemente os métodos abaixo delegando para `supabase.from(...)`.
 * 3. Altere `DATABASE_PROVIDER` para `'supabase'` em `src/config/database.ts`.
 */
export class SupabaseDatabase implements DatabaseProvider {
  readonly providerName = 'supabase' as const;

  private notConfigured(): never {
    throw new DatabaseError(
      'NOT_IMPLEMENTED',
      'O provedor Supabase ainda não foi implementado neste MVP. Mantenha DATABASE_PROVIDER = "local".'
    );
  }

  async listVendors(): Promise<Vendor[]> {
    return this.notConfigured();
  }
  async getVendorById(_id: string): Promise<Vendor | null> {
    return this.notConfigured();
  }
  async createVendor(_input: CreateVendorInput): Promise<Vendor> {
    return this.notConfigured();
  }
  async updateVendor(_id: string, _input: UpdateVendorInput): Promise<Vendor> {
    return this.notConfigured();
  }

  async listEditions(): Promise<FairEdition[]> {
    return this.notConfigured();
  }
  async getEditionById(_id: string): Promise<FairEdition | null> {
    return this.notConfigured();
  }
  async createEdition(_input: CreateEditionInput): Promise<FairEdition> {
    return this.notConfigured();
  }
  async updateEdition(_id: string, _input: UpdateEditionInput): Promise<FairEdition> {
    return this.notConfigured();
  }

  async listParticipations(): Promise<Participation[]> {
    return this.notConfigured();
  }
  async listParticipationsByEdition(_editionId: string): Promise<Participation[]> {
    return this.notConfigured();
  }
  async listParticipationsByVendor(_vendorId: string): Promise<Participation[]> {
    return this.notConfigured();
  }
  async getParticipationById(_id: string): Promise<Participation | null> {
    return this.notConfigured();
  }
  async createParticipation(_input: CreateParticipationInput): Promise<Participation> {
    return this.notConfigured();
  }
  async createParticipationsBatch(_inputs: CreateParticipationInput[]): Promise<Participation[]> {
    return this.notConfigured();
  }
  async updateParticipation(_id: string, _input: UpdateParticipationInput): Promise<Participation> {
    return this.notConfigured();
  }

  async listPayments(): Promise<Payment[]> {
    return this.notConfigured();
  }
  async listPaymentsByParticipation(_participationId: string): Promise<Payment[]> {
    return this.notConfigured();
  }
  async createPayment(_input: CreatePaymentInput): Promise<Payment> {
    return this.notConfigured();
  }

  async exportSnapshot(): Promise<DatabaseSnapshot> {
    return this.notConfigured();
  }
  async importSnapshot(_snapshot: DatabaseSnapshot, _mode: ImportMode): Promise<void> {
    return this.notConfigured();
  }
  async clearAllData(): Promise<void> {
    return this.notConfigured();
  }
  async getStorageStats(): Promise<StorageStats> {
    return this.notConfigured();
  }
}
