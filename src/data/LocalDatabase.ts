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
import { generateUUID } from '../utils/uuid';
import { DatabaseError, type DatabaseProvider, type ImportMode } from './DatabaseProvider';

const DB_NAME = 'feira_da_lua_db';
const DB_VERSION = 1;

const STORES = {
  VENDORS: 'vendors',
  EDITIONS: 'fair_editions',
  PARTICIPATIONS: 'participations',
  PAYMENTS: 'payments',
} as const;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new DatabaseError(
          'STORAGE_ERROR',
          'Erro ao acessar o banco de dados local (IndexedDB).',
          request.error
        )
      );
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        new DatabaseError(
          'STORAGE_ERROR',
          tx.error?.message || 'Falha ao concluir operação no banco local.',
          tx.error
        )
      );
    tx.onabort = () =>
      reject(
        new DatabaseError(
          'STORAGE_ERROR',
          tx.error?.message || 'Operação no banco local foi cancelada.',
          tx.error
        )
      );
  });
}

export class LocalDatabase implements DatabaseProvider {
  readonly providerName = 'local' as const;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof indexedDB === 'undefined') {
      return Promise.reject(
        new DatabaseError(
          'STORAGE_ERROR',
          'Este navegador não oferece suporte a IndexedDB para armazenamento local.'
        )
      );
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORES.VENDORS)) {
          const vendorStore = db.createObjectStore(STORES.VENDORS, { keyPath: 'id' });
          vendorStore.createIndex('by_status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.EDITIONS)) {
          const editionStore = db.createObjectStore(STORES.EDITIONS, { keyPath: 'id' });
          editionStore.createIndex('by_event_date', 'event_date', { unique: false });
          editionStore.createIndex('by_status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PARTICIPATIONS)) {
          const partStore = db.createObjectStore(STORES.PARTICIPATIONS, { keyPath: 'id' });
          partStore.createIndex('by_edition_id', 'edition_id', { unique: false });
          partStore.createIndex('by_vendor_id', 'vendor_id', { unique: false });
          partStore.createIndex('by_payment_status', 'payment_status', { unique: false });
          partStore.createIndex('by_vendor_edition', ['vendor_id', 'edition_id'], {
            unique: true,
          });
        }

        if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
          const paymentStore = db.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
          paymentStore.createIndex('by_participation_id', 'participation_id', { unique: false });
          paymentStore.createIndex('by_payment_date', 'payment_date', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(
          new DatabaseError(
            'STORAGE_ERROR',
            'Não foi possível abrir o banco de dados local (IndexedDB).',
            request.error
          )
        );
      };
    });

    return this.dbPromise;
  }

  // ---------------------------------------------------------------------------
  // Feirantes
  // ---------------------------------------------------------------------------
  async listVendors(): Promise<Vendor[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.VENDORS, 'readonly');
    const store = tx.objectStore(STORES.VENDORS);
    const items = await requestToPromise(store.getAll() as IDBRequest<Vendor[]>);
    return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async getVendorById(id: string): Promise<Vendor | null> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.VENDORS, 'readonly');
    const item = await requestToPromise(
      tx.objectStore(STORES.VENDORS).get(id) as IDBRequest<Vendor | undefined>
    );
    return item ?? null;
  }

  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    const name = input.name.trim();
    const businessName = input.business_name.trim();
    if (!name || !businessName) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Nome do feirante e nome da barraca são obrigatórios.'
      );
    }

    const now = new Date().toISOString();
    const vendor: Vendor = {
      id: generateUUID(),
      name,
      business_name: businessName,
      phone: (input.phone ?? '').trim(),
      product_category: (input.product_category ?? '').trim(),
      notes: (input.notes ?? '').trim(),
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const db = await this.openDatabase();
    const tx = db.transaction(STORES.VENDORS, 'readwrite');
    tx.objectStore(STORES.VENDORS).add(vendor);
    await transactionDone(tx);
    return vendor;
  }

  async updateVendor(id: string, input: UpdateVendorInput): Promise<Vendor> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.VENDORS, 'readwrite');
    const store = tx.objectStore(STORES.VENDORS);
    const existing = await requestToPromise(store.get(id) as IDBRequest<Vendor | undefined>);

    if (!existing) {
      throw new DatabaseError('NOT_FOUND', 'Feirante não encontrado.');
    }

    const nextName = input.name !== undefined ? input.name.trim() : existing.name;
    const nextBusinessName =
      input.business_name !== undefined ? input.business_name.trim() : existing.business_name;

    if (!nextName || !nextBusinessName) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Nome do feirante e nome da barraca são obrigatórios.'
      );
    }

    const updated: Vendor = {
      ...existing,
      name: nextName,
      business_name: nextBusinessName,
      phone: input.phone !== undefined ? input.phone.trim() : existing.phone,
      product_category:
        input.product_category !== undefined
          ? input.product_category.trim()
          : existing.product_category,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      status: input.status ?? existing.status,
      updated_at: new Date().toISOString(),
    };

    store.put(updated);
    await transactionDone(tx);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Edições da Feira
  // ---------------------------------------------------------------------------
  async listEditions(): Promise<FairEdition[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.EDITIONS, 'readonly');
    const items = await requestToPromise(
      tx.objectStore(STORES.EDITIONS).getAll() as IDBRequest<FairEdition[]>
    );
    return items.sort((a, b) => b.event_date.localeCompare(a.event_date));
  }

  async getEditionById(id: string): Promise<FairEdition | null> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.EDITIONS, 'readonly');
    const item = await requestToPromise(
      tx.objectStore(STORES.EDITIONS).get(id) as IDBRequest<FairEdition | undefined>
    );
    return item ?? null;
  }

  async createEdition(input: CreateEditionInput): Promise<FairEdition> {
    const name = input.name.trim();
    if (!name) {
      throw new DatabaseError('VALIDATION_ERROR', 'Nome ou identificação da edição é obrigatório.');
    }
    if (!input.event_date) {
      throw new DatabaseError('VALIDATION_ERROR', 'Data da edição é obrigatória.');
    }
    if (!Number.isInteger(input.participation_fee) || input.participation_fee < 0) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Taxa de participação deve ser um valor válido.'
      );
    }

    const now = new Date().toISOString();
    const edition: FairEdition = {
      id: generateUUID(),
      name,
      event_date: input.event_date,
      participation_fee: input.participation_fee,
      status: input.status ?? 'planned',
      notes: (input.notes ?? '').trim(),
      created_at: now,
      updated_at: now,
    };

    const db = await this.openDatabase();
    const tx = db.transaction(STORES.EDITIONS, 'readwrite');
    tx.objectStore(STORES.EDITIONS).add(edition);
    await transactionDone(tx);
    return edition;
  }

  async updateEdition(id: string, input: UpdateEditionInput): Promise<FairEdition> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.EDITIONS, 'readwrite');
    const store = tx.objectStore(STORES.EDITIONS);
    const existing = await requestToPromise(store.get(id) as IDBRequest<FairEdition | undefined>);

    if (!existing) {
      throw new DatabaseError('NOT_FOUND', 'Edição da feira não encontrada.');
    }

    const nextName = input.name !== undefined ? input.name.trim() : existing.name;
    if (!nextName) {
      throw new DatabaseError('VALIDATION_ERROR', 'Nome ou identificação da edição é obrigatório.');
    }

    const nextFee =
      input.participation_fee !== undefined ? input.participation_fee : existing.participation_fee;
    if (!Number.isInteger(nextFee) || nextFee < 0) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Taxa de participação deve ser um valor válido.'
      );
    }

    const updated: FairEdition = {
      ...existing,
      name: nextName,
      event_date: input.event_date ?? existing.event_date,
      participation_fee: nextFee,
      status: input.status ?? existing.status,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      updated_at: new Date().toISOString(),
    };

    store.put(updated);
    await transactionDone(tx);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Participações
  // ---------------------------------------------------------------------------
  async listParticipations(): Promise<Participation[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PARTICIPATIONS, 'readonly');
    const items = await requestToPromise(
      tx.objectStore(STORES.PARTICIPATIONS).getAll() as IDBRequest<Participation[]>
    );
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listParticipationsByEdition(editionId: string): Promise<Participation[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PARTICIPATIONS, 'readonly');
    const index = tx.objectStore(STORES.PARTICIPATIONS).index('by_edition_id');
    return requestToPromise(index.getAll(editionId) as IDBRequest<Participation[]>);
  }

  async listParticipationsByVendor(vendorId: string): Promise<Participation[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PARTICIPATIONS, 'readonly');
    const index = tx.objectStore(STORES.PARTICIPATIONS).index('by_vendor_id');
    return requestToPromise(index.getAll(vendorId) as IDBRequest<Participation[]>);
  }

  async getParticipationById(id: string): Promise<Participation | null> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PARTICIPATIONS, 'readonly');
    const item = await requestToPromise(
      tx.objectStore(STORES.PARTICIPATIONS).get(id) as IDBRequest<Participation | undefined>
    );
    return item ?? null;
  }

  async createParticipation(input: CreateParticipationInput): Promise<Participation> {
    const results = await this.createParticipationsBatch([input]);
    return results[0];
  }

  async createParticipationsBatch(inputs: CreateParticipationInput[]): Promise<Participation[]> {
    if (inputs.length === 0) return [];

    const db = await this.openDatabase();
    const tx = db.transaction(
      [STORES.VENDORS, STORES.EDITIONS, STORES.PARTICIPATIONS],
      'readwrite'
    );
    const vendorStore = tx.objectStore(STORES.VENDORS);
    const editionStore = tx.objectStore(STORES.EDITIONS);
    const partStore = tx.objectStore(STORES.PARTICIPATIONS);
    const uniqueIndex = partStore.index('by_vendor_edition');

    const created: Participation[] = [];
    const seenPairs = new Set<string>();

    for (const input of inputs) {
      const pairKey = `${input.vendor_id}::${input.edition_id}`;
      if (seenPairs.has(pairKey)) {
        throw new DatabaseError(
          'CONFLICT',
          'Não é permitido cadastrar o mesmo feirante duas vezes na mesma edição.'
        );
      }
      seenPairs.add(pairKey);

      if (!Number.isInteger(input.charged_amount) || input.charged_amount < 0) {
        throw new DatabaseError('VALIDATION_ERROR', 'Valor cobrado inválido.');
      }

      const [vendor, edition, duplicate] = await Promise.all([
        requestToPromise(vendorStore.get(input.vendor_id) as IDBRequest<Vendor | undefined>),
        requestToPromise(editionStore.get(input.edition_id) as IDBRequest<FairEdition | undefined>),
        requestToPromise(
          uniqueIndex.get([input.vendor_id, input.edition_id]) as IDBRequest<
            Participation | undefined
          >
        ),
      ]);

      if (!vendor) {
        throw new DatabaseError('INTEGRITY_ERROR', 'Feirante informado não existe.');
      }
      if (!edition) {
        throw new DatabaseError('INTEGRITY_ERROR', 'Edição da feira informada não existe.');
      }
      if (edition.status === 'canceled') {
        throw new DatabaseError(
          'VALIDATION_ERROR',
          'Não é permitido gerar cobranças ou participações em uma edição cancelada.'
        );
      }
      if (duplicate) {
        throw new DatabaseError(
          'CONFLICT',
          `O feirante "${vendor.name}" já está vinculado a esta edição.`
        );
      }

      const now = new Date().toISOString();
      const participation: Participation = {
        id: generateUUID(),
        vendor_id: input.vendor_id,
        edition_id: input.edition_id,
        charged_amount: input.charged_amount,
        attendance_status: input.attendance_status ?? 'uninformed',
        payment_status: 'pending',
        notes: (input.notes ?? '').trim(),
        created_at: now,
        updated_at: now,
      };

      partStore.add(participation);
      created.push(participation);
    }

    await transactionDone(tx);
    return created;
  }

  async updateParticipation(id: string, input: UpdateParticipationInput): Promise<Participation> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PARTICIPATIONS, 'readwrite');
    const store = tx.objectStore(STORES.PARTICIPATIONS);
    const existing = await requestToPromise(store.get(id) as IDBRequest<Participation | undefined>);

    if (!existing) {
      throw new DatabaseError('NOT_FOUND', 'Participação não encontrada.');
    }

    const updated: Participation = {
      ...existing,
      attendance_status: input.attendance_status ?? existing.attendance_status,
      payment_status: input.payment_status ?? existing.payment_status,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      updated_at: new Date().toISOString(),
    };

    store.put(updated);
    await transactionDone(tx);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Pagamentos
  // ---------------------------------------------------------------------------
  async listPayments(): Promise<Payment[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PAYMENTS, 'readonly');
    const items = await requestToPromise(
      tx.objectStore(STORES.PAYMENTS).getAll() as IDBRequest<Payment[]>
    );
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async listPaymentsByParticipation(participationId: string): Promise<Payment[]> {
    const db = await this.openDatabase();
    const tx = db.transaction(STORES.PAYMENTS, 'readonly');
    const index = tx.objectStore(STORES.PAYMENTS).index('by_participation_id');
    const items = await requestToPromise(index.getAll(participationId) as IDBRequest<Payment[]>);
    return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new DatabaseError('VALIDATION_ERROR', 'O valor do pagamento deve ser maior que zero.');
    }
    if (!input.payment_date) {
      throw new DatabaseError('VALIDATION_ERROR', 'A data do pagamento é obrigatória.');
    }

    const db = await this.openDatabase();
    const tx = db.transaction([STORES.PARTICIPATIONS, STORES.PAYMENTS], 'readwrite');
    const partStore = tx.objectStore(STORES.PARTICIPATIONS);
    const paymentStore = tx.objectStore(STORES.PAYMENTS);

    const participation = await requestToPromise(
      partStore.get(input.participation_id) as IDBRequest<Participation | undefined>
    );
    if (!participation) {
      throw new DatabaseError(
        'INTEGRITY_ERROR',
        'Não é permitido registrar pagamento sem uma participação vinculada.'
      );
    }

    if (participation.payment_status === 'canceled') {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        'Não é possível registrar pagamento para uma cobrança cancelada.'
      );
    }

    const existingPayments = await requestToPromise(
      paymentStore
        .index('by_participation_id')
        .getAll(input.participation_id) as IDBRequest<Payment[]>
    );

    const totalPaidBefore = existingPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalAfter = totalPaidBefore + input.amount;

    const payment: Payment = {
      id: generateUUID(),
      participation_id: input.participation_id,
      amount: input.amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      notes: (input.notes ?? '').trim(),
      created_at: new Date().toISOString(),
    };

    paymentStore.add(payment);

    if (totalAfter >= participation.charged_amount) {
      partStore.put({
        ...participation,
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      });
    }

    await transactionDone(tx);
    return payment;
  }

  // ---------------------------------------------------------------------------
  // Backup, Restauração e Estatísticas
  // ---------------------------------------------------------------------------
  async exportSnapshot(): Promise<DatabaseSnapshot> {
    const [vendors, fair_editions, participations, payments] = await Promise.all([
      this.listVendors(),
      this.listEditions(),
      this.listParticipations(),
      this.listPayments(),
    ]);

    return {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      vendors,
      fair_editions,
      participations,
      payments,
    };
  }

  async importSnapshot(snapshot: DatabaseSnapshot, mode: ImportMode): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction(
      [STORES.VENDORS, STORES.EDITIONS, STORES.PARTICIPATIONS, STORES.PAYMENTS],
      'readwrite'
    );

    const vendorStore = tx.objectStore(STORES.VENDORS);
    const editionStore = tx.objectStore(STORES.EDITIONS);
    const partStore = tx.objectStore(STORES.PARTICIPATIONS);
    const paymentStore = tx.objectStore(STORES.PAYMENTS);

    if (mode === 'replace') {
      vendorStore.clear();
      editionStore.clear();
      partStore.clear();
      paymentStore.clear();

      for (const v of snapshot.vendors) vendorStore.put(v);
      for (const e of snapshot.fair_editions) editionStore.put(e);
      for (const p of snapshot.participations) partStore.put(p);
      for (const pay of snapshot.payments) paymentStore.put(pay);
    } else {
      const [existingVendors, existingEditions, existingParts, existingPayments] = await Promise.all([
        requestToPromise(vendorStore.getAll() as IDBRequest<Vendor[]>),
        requestToPromise(editionStore.getAll() as IDBRequest<FairEdition[]>),
        requestToPromise(partStore.getAll() as IDBRequest<Participation[]>),
        requestToPromise(paymentStore.getAll() as IDBRequest<Payment[]>),
      ]);

      const vendorIds = new Set(existingVendors.map((v) => v.id));
      const editionIds = new Set(existingEditions.map((e) => e.id));
      const partIds = new Set(existingParts.map((p) => p.id));
      const partPairs = new Set(existingParts.map((p) => `${p.vendor_id}::${p.edition_id}`));
      const paymentIds = new Set(existingPayments.map((p) => p.id));

      for (const v of snapshot.vendors) {
        if (!vendorIds.has(v.id)) {
          vendorStore.put(v);
          vendorIds.add(v.id);
        }
      }
      for (const e of snapshot.fair_editions) {
        if (!editionIds.has(e.id)) {
          editionStore.put(e);
          editionIds.add(e.id);
        }
      }
      for (const p of snapshot.participations) {
        const pairKey = `${p.vendor_id}::${p.edition_id}`;
        if (!partIds.has(p.id) && !partPairs.has(pairKey)) {
          if (vendorIds.has(p.vendor_id) && editionIds.has(p.edition_id)) {
            partStore.put(p);
            partIds.add(p.id);
            partPairs.add(pairKey);
          }
        }
      }
      for (const pay of snapshot.payments) {
        if (!paymentIds.has(pay.id) && partIds.has(pay.participation_id)) {
          paymentStore.put(pay);
          paymentIds.add(pay.id);
        }
      }
    }

    await transactionDone(tx);
  }

  async clearAllData(): Promise<void> {
    const db = await this.openDatabase();
    const tx = db.transaction(
      [STORES.VENDORS, STORES.EDITIONS, STORES.PARTICIPATIONS, STORES.PAYMENTS],
      'readwrite'
    );
    tx.objectStore(STORES.PAYMENTS).clear();
    tx.objectStore(STORES.PARTICIPATIONS).clear();
    tx.objectStore(STORES.EDITIONS).clear();
    tx.objectStore(STORES.VENDORS).clear();
    await transactionDone(tx);
  }

  async getStorageStats(): Promise<StorageStats> {
    const [vendors, editions, participations, payments] = await Promise.all([
      this.listVendors(),
      this.listEditions(),
      this.listParticipations(),
      this.listPayments(),
    ]);

    return {
      provider: this.providerName,
      vendorsCount: vendors.length,
      activeVendorsCount: vendors.filter((v) => v.status === 'active').length,
      editionsCount: editions.length,
      participationsCount: participations.length,
      paymentsCount: payments.length,
    };
  }
}
