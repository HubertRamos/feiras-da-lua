import type { Cents } from '../types/domain';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formata um valor inteiro em centavos para moeda brasileira (ex: 3000 -> "R$ 30,00").
 */
export function formatCentsToBRL(cents: Cents): string {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  return brlFormatter.format(safeCents / 100);
}

/**
 * Formata um valor em centavos para input numérico editável sem símbolo (ex: 3000 -> "30,00").
 */
export function formatCentsToInput(cents: Cents): string {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const negative = safeCents < 0;
  const abs = Math.abs(safeCents);
  const integerPart = Math.floor(abs / 100);
  const decimalPart = String(abs % 100).padStart(2, '0');
  return `${negative ? '-' : ''}${integerPart},${decimalPart}`;
}

/**
 * Converte uma string monetária (ex: "30,00", "30.5", "R$ 1.250,75") em centavos inteiros
 * usando manipulação de string, evitando erros de ponto flutuante (ex: 19.99 * 100).
 * Retorna null se o formato for inválido ou negativo.
 */
export function parseCurrencyInputToCents(raw: string): Cents | null {
  const cleaned = raw.replace(/[R$\s]/g, '').trim();
  if (!cleaned) return null;

  // Verifica se há sinal negativo
  if (cleaned.startsWith('-')) return null;

  // Normaliza separador decimal:
  // Se tiver vírgula, assume formato pt-BR (pontos são milhares, vírgula é decimal)
  // Se não tiver vírgula mas tiver ponto, verifica se o último ponto tem 1 ou 2 dígitos após ele
  let normalized = cleaned;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [intStr, decStr = ''] = normalized.split('.');
  if (decStr.length > 2) {
    // Limita a 2 casas decimais exatas sem arredondamento ambíguo
    return null;
  }

  const integerVal = parseInt(intStr, 10);
  const decimalVal = parseInt(decStr.padEnd(2, '0'), 10);

  if (!Number.isSafeInteger(integerVal) || !Number.isSafeInteger(decimalVal)) {
    return null;
  }

  const total = integerVal * 100 + decimalVal;
  return Number.isSafeInteger(total) ? total : null;
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? Math.round(v) : 0), 0);
}
