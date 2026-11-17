function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[;"\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Gera e baixa um arquivo CSV com BOM UTF-8 (compatível com Excel em português).
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>
): void {
  const separator = ';';
  const headerLine = headers.map(escapeCsvCell).join(separator);
  const bodyLines = rows.map((row) => row.map(escapeCsvCell).join(separator));
  const csvContent = '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
