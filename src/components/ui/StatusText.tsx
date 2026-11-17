import { CheckCircle2, Clock, MinusCircle, XCircle } from 'lucide-react';
import type {
  AttendanceStatus,
  FairEditionStatus,
  PaymentStatus,
  VendorStatus,
} from '../../types/domain';
import {
  ATTENDANCE_STATUS_LABELS,
  EDITION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  VENDOR_STATUS_LABELS,
} from '../../utils/labels';

export function VendorStatusText({ status }: { status: VendorStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {VENDOR_STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 whitespace-nowrap">
      <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {VENDOR_STATUS_LABELS[status]}
    </span>
  );
}

export function EditionStatusText({ status }: { status: FairEditionStatus }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {EDITION_STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {EDITION_STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-800 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {EDITION_STATUS_LABELS[status]}
    </span>
  );
}

export function PaymentStatusText({ status }: { status: PaymentStatus }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {PAYMENT_STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {PAYMENT_STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

export function AttendanceStatusText({ status }: { status: AttendanceStatus }) {
  if (status === 'present') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {ATTENDANCE_STATUS_LABELS[status]}
      </span>
    );
  }
  if (status === 'absent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {ATTENDANCE_STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap">
      <MinusCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}
