import { getDatabase } from '../data/databaseFactory';
import { DatabaseError, type ImportMode } from '../data/DatabaseProvider';
import type {
  AttendanceStatus,
  Cents,
  CreateEditionInput,
  CreatePaymentInput,
  CreateVendorInput,
  DatabaseSnapshot,
  FairEdition,
  Participation,
  Payment,
  StorageStats,
  UpdateEditionInput,
  UpdateVendorInput,
  Vendor,
} from '../types/domain';
import { getTodayISODate, isValidISODate } from '../utils/date';
import { validateBackupSnapshot } from './backupValidator';

export interface EnrichedParticipation {
  participation: Participation;
  vendor: Vendor;
  edition: FairEdition;
  payments: Payment[];
  paidAmount: Cents;
  remainingAmount: Cents;
}

export interface EditionSummary {
  edition: FairEdition;
  participantsCount: number;
  expectedAmount: Cents;
  receivedAmount: Cents;
  pendingAmount: Cents;
  paidCount: number;
  pendingCount: number;
  canceledCount: number;
  presentCount: number;
  absentCount: number;
  uninformedCount: number;
}

export interface RecentPaymentMovement {
  payment: Payment;
  vendorName: string;
  businessName: string;
  editionName: string;
}

export interface DashboardSummary {
  activeVendorsCount: number;
  totalVendorsCount: number;
  totalExpected: Cents;
  totalReceived: Cents;
  totalPending: Cents;
  nextEditionSummary: EditionSummary | null;
  recentPayments: RecentPaymentMovement[];
  recentEditions: FairEdition[];
}

export const fairService = {
  // ---------------------------------------------------------------------------
  // Feirantes
  // ---------------------------------------------------------------------------
  async listVendors(): Promise<Vendor[]> {
    return getDatabase().listVendors();
  },

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    if (!input.name.trim() || !input.business_name.trim()) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Informe o nome do feirante e o nome da barraca.'
      );
    }
    return getDatabase().createVendor(input);
  },

  async updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
    return getDatabase().updateVendor(id, input);
  },

  async toggleVendorStatus(vendor: Vendor): Promise<Vendor> {
    const nextStatus = vendor.status === 'active' ? 'inactive' : 'active';
    return getDatabase().updateVendor(vendor.id, { status: nextStatus });
  },

  // ---------------------------------------------------------------------------
  // Edições da Feira
  // ---------------------------------------------------------------------------
  async listEditions(): Promise<FairEdition[]> {
    return getDatabase().listEditions();
  },

  async createEdition(input: CreateEditionInput): Promise<FairEdition> {
    if (!input.name.trim()) {
      throw new DatabaseError('VALIDATION_ERROR', 'Informe o nome ou identificação da edição.');
    }
    if (!isValidISODate(input.event_date)) {
      throw new DatabaseError('VALIDATION_ERROR', 'Informe uma data válida para a edição.');
    }
    if (!Number.isInteger(input.participation_fee) || input.participation_fee < 0) {
      throw new DatabaseError('VALIDATION_ERROR', 'Informe um valor de taxa válido.');
    }
    return getDatabase().createEdition(input);
  },

  async updateEdition(id: string, input: UpdateEditionInput): Promise<FairEdition> {
    if (input.event_date !== undefined && !isValidISODate(input.event_date)) {
      throw new DatabaseError('VALIDATION_ERROR', 'Informe uma data válida para a edição.');
    }
    return getDatabase().updateEdition(id, input);
  },

  async cancelEdition(editionId: string): Promise<FairEdition> {
    return getDatabase().updateEdition(editionId, { status: 'canceled' });
  },

  // ---------------------------------------------------------------------------
  // Participações & Cobranças
  // ---------------------------------------------------------------------------
  async addVendorsToEdition(
    editionId: string,
    vendorIds: string[],
    notes = ''
  ): Promise<Participation[]> {
    if (vendorIds.length === 0) {
      throw new DatabaseError('VALIDATION_ERROR', 'Selecione pelo menos um feirante ativo.');
    }

    const db = getDatabase();
    const edition = await db.getEditionById(editionId);
    if (!edition) {
      throw new DatabaseError('NOT_FOUND', 'Edição da feira não encontrada.');
    }
    if (edition.status === 'canceled') {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Não é possível adicionar feirantes ou gerar cobranças em uma edição cancelada.'
      );
    }

    const inputs = vendorIds.map((vendorId) => ({
      vendor_id: vendorId,
      edition_id: editionId,
      charged_amount: edition.participation_fee,
      attendance_status: 'uninformed' as const,
      notes,
    }));

    return db.createParticipationsBatch(inputs);
  },

  /**
   * Registra a presença do feirante apenas para controle administrativo e estatístico.
   * REGRA FUNDAMENTAL: A presença NÃO altera o valor cobrado nem o status de pagamento.
   */
  async updateAttendance(
    participationId: string,
    attendanceStatus: AttendanceStatus
  ): Promise<Participation> {
    return getDatabase().updateParticipation(participationId, {
      attendance_status: attendanceStatus,
    });
  },

  async updateParticipationNotes(
    participationId: string,
    notes: string
  ): Promise<Participation> {
    return getDatabase().updateParticipation(participationId, { notes });
  },

  async cancelCharge(participationId: string, reason?: string): Promise<Participation> {
    const db = getDatabase();
    const participation = await db.getParticipationById(participationId);
    if (!participation) {
      throw new DatabaseError('NOT_FOUND', 'Cobrança/participação não encontrada.');
    }
    if (participation.payment_status === 'paid') {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Não é possível cancelar uma cobrança que já foi quitada.'
      );
    }

    const existingPayments = await db.listPaymentsByParticipation(participationId);
    if (existingPayments.length > 0) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Esta cobrança já possui pagamentos registrados no histórico e não pode ser cancelada.'
      );
    }

    const trimmedReason = (reason ?? '').trim();
    const nextNotes = trimmedReason
      ? participation.notes
        ? `${participation.notes} | Cancelamento: ${trimmedReason}`
        : `Cancelamento: ${trimmedReason}`
      : participation.notes;

    return db.updateParticipation(participationId, {
      payment_status: 'canceled',
      notes: nextNotes,
    });
  },

  // ---------------------------------------------------------------------------
  // Pagamentos
  // ---------------------------------------------------------------------------
  async registerPayment(input: CreatePaymentInput): Promise<Payment> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new DatabaseError('VALIDATION_ERROR', 'O valor recebido deve ser maior que zero.');
    }
    if (!isValidISODate(input.payment_date)) {
      throw new DatabaseError('VALIDATION_ERROR', 'Informe uma data de pagamento válida.');
    }

    const db = getDatabase();
    const participation = await db.getParticipationById(input.participation_id);
    if (!participation) {
      throw new DatabaseError('NOT_FOUND', 'Participação vinculada não encontrada.');
    }
    if (participation.payment_status === 'canceled') {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Não é possível registrar pagamento para uma cobrança cancelada.'
      );
    }

    const existingPayments = await db.listPaymentsByParticipation(input.participation_id);
    const alreadyPaid = existingPayments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, participation.charged_amount - alreadyPaid);

    if (input.amount > remaining && !(input.notes ?? '').trim()) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'O valor recebido ultrapassa o saldo devido. Informe uma justificativa explícita nas observações.'
      );
    }

    return db.createPayment(input);
  },

  async listPayments(): Promise<Payment[]> {
    return getDatabase().listPayments();
  },

  // ---------------------------------------------------------------------------
  // Consultas Enriquecidas, Dashboard e Relatórios
  // ---------------------------------------------------------------------------
  async listEnrichedParticipations(): Promise<EnrichedParticipation[]> {
    const db = getDatabase();
    const [vendors, editions, participations, payments] = await Promise.all([
      db.listVendors(),
      db.listEditions(),
      db.listParticipations(),
      db.listPayments(),
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const editionMap = new Map(editions.map((e) => [e.id, e]));
    const paymentsByParticipation = new Map<string, Payment[]>();

    for (const pay of payments) {
      const list = paymentsByParticipation.get(pay.participation_id) ?? [];
      list.push(pay);
      paymentsByParticipation.set(pay.participation_id, list);
    }

    const result: EnrichedParticipation[] = [];
    for (const part of participations) {
      const vendor = vendorMap.get(part.vendor_id);
      const edition = editionMap.get(part.edition_id);
      if (!vendor || !edition) continue;

      const partPayments = paymentsByParticipation.get(part.id) ?? [];
      const paidAmount = partPayments.reduce((acc, p) => acc + p.amount, 0);
      const remainingAmount =
        part.payment_status === 'canceled' ? 0 : Math.max(0, part.charged_amount - paidAmount);

      result.push({
        participation: part,
        vendor,
        edition,
        payments: partPayments,
        paidAmount,
        remainingAmount,
      });
    }

    return result.sort((a, b) => {
      const dateCmp = b.edition.event_date.localeCompare(a.edition.event_date);
      if (dateCmp !== 0) return dateCmp;
      return a.vendor.name.localeCompare(b.vendor.name, 'pt-BR');
    });
  },

  async listEditionSummaries(): Promise<EditionSummary[]> {
    const db = getDatabase();
    const [editions, participations, payments] = await Promise.all([
      db.listEditions(),
      db.listParticipations(),
      db.listPayments(),
    ]);

    const paidByParticipation = new Map<string, Cents>();
    for (const pay of payments) {
      paidByParticipation.set(
        pay.participation_id,
        (paidByParticipation.get(pay.participation_id) ?? 0) + pay.amount
      );
    }

    const partsByEdition = new Map<string, Participation[]>();
    for (const p of participations) {
      const list = partsByEdition.get(p.edition_id) ?? [];
      list.push(p);
      partsByEdition.set(p.edition_id, list);
    }

    return editions.map((edition) => {
      const parts = partsByEdition.get(edition.id) ?? [];
      let expectedAmount = 0;
      let receivedAmount = 0;
      let pendingAmount = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let canceledCount = 0;
      let presentCount = 0;
      let absentCount = 0;
      let uninformedCount = 0;

      for (const p of parts) {
        if (p.attendance_status === 'present') presentCount++;
        else if (p.attendance_status === 'absent') absentCount++;
        else uninformedCount++;

        if (p.payment_status === 'canceled') {
          canceledCount++;
          continue;
        }

        const paid = paidByParticipation.get(p.id) ?? 0;
        expectedAmount += p.charged_amount;
        receivedAmount += paid;

        if (p.payment_status === 'paid') {
          paidCount++;
        } else {
          pendingCount++;
          pendingAmount += Math.max(0, p.charged_amount - paid);
        }
      }

      return {
        edition,
        participantsCount: parts.length,
        expectedAmount,
        receivedAmount,
        pendingAmount,
        paidCount,
        pendingCount,
        canceledCount,
        presentCount,
        absentCount,
        uninformedCount,
      };
    });
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const db = getDatabase();
    const [vendors, editions, participations, payments] = await Promise.all([
      db.listVendors(),
      db.listEditions(),
      db.listParticipations(),
      db.listPayments(),
    ]);

    const activeVendorsCount = vendors.filter((v) => v.status === 'active').length;
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const editionMap = new Map(editions.map((e) => [e.id, e]));
    const participationMap = new Map(participations.map((p) => [p.id, p]));

    const paidByParticipation = new Map<string, Cents>();
    for (const pay of payments) {
      paidByParticipation.set(
        pay.participation_id,
        (paidByParticipation.get(pay.participation_id) ?? 0) + pay.amount
      );
    }

    let totalExpected = 0;
    let totalReceived = 0;
    let totalPending = 0;

    for (const p of participations) {
      if (p.payment_status === 'canceled') continue;
      const paid = paidByParticipation.get(p.id) ?? 0;
      totalExpected += p.charged_amount;
      totalReceived += paid;
      if (p.payment_status === 'pending') {
        totalPending += Math.max(0, p.charged_amount - paid);
      }
    }

    // Próxima edição: edição planejada mais próxima a partir de hoje (ou planejada mais recente)
    const today = getTodayISODate();
    const plannedEditions = editions.filter((e) => e.status === 'planned');
    const upcomingPlanned = plannedEditions
      .filter((e) => e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    const nextEdition =
      upcomingPlanned[0] ??
      plannedEditions.sort((a, b) => b.event_date.localeCompare(a.event_date))[0] ??
      null;

    let nextEditionSummary: EditionSummary | null = null;
    if (nextEdition) {
      const summaries = await this.listEditionSummaries();
      nextEditionSummary = summaries.find((s) => s.edition.id === nextEdition.id) ?? null;
    }

    const recentPayments: RecentPaymentMovement[] = [];
    for (const pay of payments.slice(0, 6)) {
      const part = participationMap.get(pay.participation_id);
      if (!part) continue;
      const vendor = vendorMap.get(part.vendor_id);
      const edition = editionMap.get(part.edition_id);
      if (!vendor || !edition) continue;
      recentPayments.push({
        payment: pay,
        vendorName: vendor.name,
        businessName: vendor.business_name,
        editionName: edition.name,
      });
    }

    const recentEditions = [...editions]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);

    return {
      activeVendorsCount,
      totalVendorsCount: vendors.length,
      totalExpected,
      totalReceived,
      totalPending,
      nextEditionSummary,
      recentPayments,
      recentEditions,
    };
  },

  // ---------------------------------------------------------------------------
  // Backup, Importação e Estatísticas
  // ---------------------------------------------------------------------------
  async exportBackup(): Promise<DatabaseSnapshot> {
    return getDatabase().exportSnapshot();
  },

  async importBackup(rawJson: string, mode: ImportMode): Promise<DatabaseSnapshot> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new DatabaseError('VALIDATION_ERROR', 'O arquivo selecionado não é um JSON válido.');
    }

    const snapshot = validateBackupSnapshot(parsed);
    await getDatabase().importSnapshot(snapshot, mode);
    return snapshot;
  },

  async clearAllData(): Promise<void> {
    return getDatabase().clearAllData();
  },

  async getStorageStats(): Promise<StorageStats> {
    return getDatabase().getStorageStats();
  },
};
