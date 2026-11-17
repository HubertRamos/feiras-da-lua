/**
 * Retorna a data local atual no formato ISO curto YYYY-MM-DD.
 */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida se a string está no formato YYYY-MM-DD e representa uma data de calendário válida.
 */
export function isValidISODate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/**
 * Formata YYYY-MM-DD para DD/MM/AAAA.
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Formata um timestamp ISO para DD/MM/AAAA HH:mm no fuso local.
 */
export function formatDateTimeBR(isoTimestamp: string): string {
  if (!isoTimestamp) return '—';
  const dt = new Date(isoTimestamp);
  if (Number.isNaN(dt.getTime())) return isoTimestamp;
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  const hours = String(dt.getHours()).padStart(2, '0');
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
