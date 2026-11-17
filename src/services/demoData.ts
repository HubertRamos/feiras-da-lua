import { getDatabase } from '../data/databaseFactory';
import type { DatabaseSnapshot } from '../types/domain';
import { getTodayISODate } from '../utils/date';
import { generateUUID } from '../utils/uuid';

function addDaysISO(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Carrega dados de demonstração explícitos para testes manuais do administrador.
 * Só é executado mediante solicitação explícita do usuário.
 */
export async function loadDemoData(): Promise<void> {
  const today = getTodayISODate();
  const now = new Date().toISOString();

  const v1 = generateUUID();
  const v2 = generateUUID();
  const v3 = generateUUID();
  const v4 = generateUUID();
  const v5 = generateUUID();

  const e1 = generateUUID();
  const e2 = generateUUID();

  const p1 = generateUUID();
  const p2 = generateUUID();
  const p3 = generateUUID();
  const p4 = generateUUID();
  const p5 = generateUUID();
  const p6 = generateUUID();
  const p7 = generateUUID();

  const pastDate = addDaysISO(today, -14);
  const nextDate = addDaysISO(today, 6);

  const snapshot: DatabaseSnapshot = {
    schema_version: 1,
    exported_at: now,
    vendors: [
      {
        id: v1,
        name: 'Maria Helena Souza',
        business_name: 'Pastelaria da Lua',
        phone: '(11) 98412-3310',
        product_category: 'Alimentação',
        notes: 'Barraca próxima à entrada principal.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: v2,
        name: 'Carlos Eduardo Lima',
        business_name: 'Ateliê Cerâmica Viva',
        phone: '(11) 99120-4481',
        product_category: 'Artesanato',
        notes: '',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: v3,
        name: 'Ana Paula Ferreira',
        business_name: 'Doces da Serra',
        phone: '(11) 97234-1902',
        product_category: 'Doces e Confeitaria',
        notes: 'Prefere pagamento via PIX.',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: v4,
        name: 'João Batista Alves',
        business_name: 'Horta Orgânica Alves',
        phone: '',
        product_category: 'Hortifrúti',
        notes: '',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: v5,
        name: 'Fernanda Costa',
        business_name: 'Bazar & Brechó Luar',
        phone: '(11) 96300-8812',
        product_category: 'Vestuário',
        notes: 'Afastada temporariamente.',
        status: 'inactive',
        created_at: now,
        updated_at: now,
      },
    ],
    fair_editions: [
      {
        id: e1,
        name: 'Feira da Lua — Edição Anterior',
        event_date: pastDate,
        participation_fee: 3000,
        status: 'completed',
        notes: 'Edição realizada na praça central.',
        created_at: now,
        updated_at: now,
      },
      {
        id: e2,
        name: 'Feira da Lua — Próxima Edição',
        event_date: nextDate,
        participation_fee: 3500,
        status: 'planned',
        notes: 'Reajuste da taxa para R$ 35,00 nesta edição.',
        created_at: now,
        updated_at: now,
      },
    ],
    participations: [
      {
        id: p1,
        vendor_id: v1,
        edition_id: e1,
        charged_amount: 3000,
        attendance_status: 'present',
        payment_status: 'paid',
        notes: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: p2,
        vendor_id: v2,
        edition_id: e1,
        charged_amount: 3000,
        attendance_status: 'absent',
        payment_status: 'pending',
        notes: 'Ausente na edição, cobrança mantida conforme regra.',
        created_at: now,
        updated_at: now,
      },
      {
        id: p3,
        vendor_id: v3,
        edition_id: e1,
        charged_amount: 3000,
        attendance_status: 'present',
        payment_status: 'paid',
        notes: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: p4,
        vendor_id: v1,
        edition_id: e2,
        charged_amount: 3500,
        attendance_status: 'uninformed',
        payment_status: 'paid',
        notes: 'Pagamento antecipado.',
        created_at: now,
        updated_at: now,
      },
      {
        id: p5,
        vendor_id: v2,
        edition_id: e2,
        charged_amount: 3500,
        attendance_status: 'uninformed',
        payment_status: 'pending',
        notes: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: p6,
        vendor_id: v3,
        edition_id: e2,
        charged_amount: 3500,
        attendance_status: 'uninformed',
        payment_status: 'pending',
        notes: '',
        created_at: now,
        updated_at: now,
      },
      {
        id: p7,
        vendor_id: v4,
        edition_id: e2,
        charged_amount: 3500,
        attendance_status: 'uninformed',
        payment_status: 'pending',
        notes: '',
        created_at: now,
        updated_at: now,
      },
    ],
    payments: [
      {
        id: generateUUID(),
        participation_id: p1,
        amount: 3000,
        payment_date: pastDate,
        payment_method: 'pix',
        notes: 'Pago na abertura da feira.',
        created_at: now,
      },
      {
        id: generateUUID(),
        participation_id: p3,
        amount: 3000,
        payment_date: pastDate,
        payment_method: 'cash',
        notes: '',
        created_at: now,
      },
      {
        id: generateUUID(),
        participation_id: p4,
        amount: 3500,
        payment_date: today,
        payment_method: 'pix',
        notes: 'Comprovante recebido.',
        created_at: now,
      },
    ],
  };

  await getDatabase().importSnapshot(snapshot, 'replace');
}
