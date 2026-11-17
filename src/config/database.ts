/**
 * Configuração central do provedor de persistência da aplicação.
 *
 * Valores possíveis:
 * - "local": Utiliza IndexedDB no navegador (obrigatório neste MVP).
 * - "supabase": Reservado para futura integração com PostgreSQL via Supabase.
 */
export type DatabaseProviderType = 'local' | 'supabase';

export const DATABASE_PROVIDER: DatabaseProviderType = 'local';

/**
 * Configurações reservadas para a futura integração com Supabase.
 * Não exigidas nem utilizadas enquanto DATABASE_PROVIDER === "local".
 */
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL ?? '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
} as const;
