import type {
  AttendanceStatus,
  FairEditionStatus,
  PaymentMethod,
  PaymentStatus,
  VendorStatus,
} from '../types/domain';

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
};

export const EDITION_STATUS_LABELS: Record<FairEditionStatus, string> = {
  planned: 'Planejada',
  completed: 'Realizada',
  canceled: 'Cancelada',
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  uninformed: 'Não informado',
  present: 'Presente',
  absent: 'Ausente',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  canceled: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  other: 'Outro',
};
