import { DatabaseError } from '../data/DatabaseProvider';
import type {
  AttendanceStatus,
  DatabaseSnapshot,
  FairEdition,
  FairEditionStatus,
  Participation,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Vendor,
  VendorStatus,
} from '../types/domain';
import { isValidISODate } from '../utils/date';

const VENDOR_STATUSES = new Set<VendorStatus>(['active', 'inactive']);
const EDITION_STATUSES = new Set<FairEditionStatus>(['planned', 'completed', 'canceled']);
const ATTENDANCE_STATUSES = new Set<AttendanceStatus>(['uninformed', 'present', 'absent']);
const PAYMENT_STATUSES = new Set<PaymentStatus>(['pending', 'paid', 'canceled']);
const PAYMENT_METHODS = new Set<PaymentMethod>(['cash', 'pix', 'other']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Valida rigorosamente a estrutura e integridade referencial de um arquivo JSON de backup.
 */
export function validateBackupSnapshot(raw: unknown): DatabaseSnapshot {
  if (!isRecord(raw)) {
    throw new DatabaseError('VALIDATION_ERROR', 'Arquivo de backup inválido: formato JSON incorreto.');
  }

  if (raw.schema_version !== 1) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'Versão de esquema do backup incompatível ou ausente.'
    );
  }

  if (
    !Array.isArray(raw.vendors) ||
    !Array.isArray(raw.fair_editions) ||
    !Array.isArray(raw.participations) ||
    !Array.isArray(raw.payments)
  ) {
    throw new DatabaseError(
      'VALIDATION_ERROR',
      'O arquivo de backup deve conter as listas: vendors, fair_editions, participations e payments.'
    );
  }

  const vendorIds = new Set<string>();
  const vendors: Vendor[] = raw.vendors.map((item, idx) => {
    if (!isRecord(item)) {
      throw new DatabaseError('VALIDATION_ERROR', `Feirante #${idx + 1} possui formato inválido.`);
    }
    if (!isNonEmptyString(item.id) || vendorIds.has(item.id)) {
      throw new DatabaseError('VALIDATION_ERROR', `Feirante #${idx + 1} possui ID inválido ou duplicado.`);
    }
    if (!isNonEmptyString(item.name) || !isNonEmptyString(item.business_name)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Feirante #${idx + 1} deve possuir nome e nome da barraca.`
      );
    }
    if (!VENDOR_STATUSES.has(item.status as VendorStatus)) {
      throw new DatabaseError('VALIDATION_ERROR', `Status inválido no feirante "${item.name}".`);
    }
    vendorIds.add(item.id);
    return {
      id: item.id,
      name: item.name.trim(),
      business_name: item.business_name.trim(),
      phone: isString(item.phone) ? item.phone : '',
      product_category: isString(item.product_category) ? item.product_category : '',
      notes: isString(item.notes) ? item.notes : '',
      status: item.status as VendorStatus,
      created_at: isNonEmptyString(item.created_at) ? item.created_at : new Date().toISOString(),
      updated_at: isNonEmptyString(item.updated_at) ? item.updated_at : new Date().toISOString(),
    };
  });

  const editionIds = new Set<string>();
  const fair_editions: FairEdition[] = raw.fair_editions.map((item, idx) => {
    if (!isRecord(item)) {
      throw new DatabaseError('VALIDATION_ERROR', `Edição #${idx + 1} possui formato inválido.`);
    }
    if (!isNonEmptyString(item.id) || editionIds.has(item.id)) {
      throw new DatabaseError('VALIDATION_ERROR', `Edição #${idx + 1} possui ID inválido ou duplicado.`);
    }
    if (!isNonEmptyString(item.name)) {
      throw new DatabaseError('VALIDATION_ERROR', `Edição #${idx + 1} precisa de nome.`);
    }
    if (!isString(item.event_date) || !isValidISODate(item.event_date)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Edição "${item.name}" possui data inválida (esperado AAAA-MM-DD).`
      );
    }
    if (!isNonNegativeInt(item.participation_fee)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Edição "${item.name}" possui taxa de participação inválida.`
      );
    }
    if (!EDITION_STATUSES.has(item.status as FairEditionStatus)) {
      throw new DatabaseError('VALIDATION_ERROR', `Status inválido na edição "${item.name}".`);
    }
    editionIds.add(item.id);
    return {
      id: item.id,
      name: item.name.trim(),
      event_date: item.event_date,
      participation_fee: item.participation_fee,
      status: item.status as FairEditionStatus,
      notes: isString(item.notes) ? item.notes : '',
      created_at: isNonEmptyString(item.created_at) ? item.created_at : new Date().toISOString(),
      updated_at: isNonEmptyString(item.updated_at) ? item.updated_at : new Date().toISOString(),
    };
  });

  const participationIds = new Set<string>();
  const vendorEditionPairs = new Set<string>();
  const participations: Participation[] = raw.participations.map((item, idx) => {
    if (!isRecord(item)) {
      throw new DatabaseError('VALIDATION_ERROR', `Participação #${idx + 1} possui formato inválido.`);
    }
    if (!isNonEmptyString(item.id) || participationIds.has(item.id)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Participação #${idx + 1} possui ID inválido ou duplicado.`
      );
    }
    if (!isNonEmptyString(item.vendor_id) || !vendorIds.has(item.vendor_id)) {
      throw new DatabaseError(
        'INTEGRITY_ERROR',
        `Participação #${idx + 1} referencia um feirante inexistente.`
      );
    }
    if (!isNonEmptyString(item.edition_id) || !editionIds.has(item.edition_id)) {
      throw new DatabaseError(
        'INTEGRITY_ERROR',
        `Participação #${idx + 1} referencia uma edição inexistente.`
      );
    }
    const pairKey = `${item.vendor_id}::${item.edition_id}`;
    if (vendorEditionPairs.has(pairKey)) {
      throw new DatabaseError(
        'CONFLICT',
        `Backup contém participação duplicada do mesmo feirante na mesma edição.`
      );
    }
    if (!isNonNegativeInt(item.charged_amount)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Participação #${idx + 1} possui valor cobrado inválido.`
      );
    }
    if (!ATTENDANCE_STATUSES.has(item.attendance_status as AttendanceStatus)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Participação #${idx + 1} possui status de presença inválido.`
      );
    }
    if (!PAYMENT_STATUSES.has(item.payment_status as PaymentStatus)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Participação #${idx + 1} possui status de pagamento inválido.`
      );
    }

    participationIds.add(item.id);
    vendorEditionPairs.add(pairKey);

    return {
      id: item.id,
      vendor_id: item.vendor_id,
      edition_id: item.edition_id,
      charged_amount: item.charged_amount,
      attendance_status: item.attendance_status as AttendanceStatus,
      payment_status: item.payment_status as PaymentStatus,
      notes: isString(item.notes) ? item.notes : '',
      created_at: isNonEmptyString(item.created_at) ? item.created_at : new Date().toISOString(),
      updated_at: isNonEmptyString(item.updated_at) ? item.updated_at : new Date().toISOString(),
    };
  });

  const paymentIds = new Set<string>();
  const payments: Payment[] = raw.payments.map((item, idx) => {
    if (!isRecord(item)) {
      throw new DatabaseError('VALIDATION_ERROR', `Pagamento #${idx + 1} possui formato inválido.`);
    }
    if (!isNonEmptyString(item.id) || paymentIds.has(item.id)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Pagamento #${idx + 1} possui ID inválido ou duplicado.`
      );
    }
    if (!isNonEmptyString(item.participation_id) || !participationIds.has(item.participation_id)) {
      throw new DatabaseError(
        'INTEGRITY_ERROR',
        `Pagamento #${idx + 1} não possui participação vinculada válida.`
      );
    }
    if (!isPositiveInt(item.amount)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Pagamento #${idx + 1} possui valor inválido.`
      );
    }
    if (!isString(item.payment_date) || !isValidISODate(item.payment_date)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Pagamento #${idx + 1} possui data inválida.`
      );
    }
    if (!PAYMENT_METHODS.has(item.payment_method as PaymentMethod)) {
      throw new DatabaseError(
        'VALIDATION_ERROR',
        `Pagamento #${idx + 1} possui forma de pagamento inválida.`
      );
    }

    paymentIds.add(item.id);
    return {
      id: item.id,
      participation_id: item.participation_id,
      amount: item.amount,
      payment_date: item.payment_date,
      payment_method: item.payment_method as PaymentMethod,
      notes: isString(item.notes) ? item.notes : '',
      created_at: isNonEmptyString(item.created_at) ? item.created_at : new Date().toISOString(),
    };
  });

  return {
    schema_version: 1,
    exported_at: isNonEmptyString(raw.exported_at) ? raw.exported_at : new Date().toISOString(),
    vendors,
    fair_editions,
    participations,
    payments,
  };
}
