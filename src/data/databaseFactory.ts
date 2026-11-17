import { DATABASE_PROVIDER } from '../config/database';
import type { DatabaseProvider } from './DatabaseProvider';
import { LocalDatabase } from './LocalDatabase';
import { SupabaseDatabase } from './SupabaseDatabase';

let instance: DatabaseProvider | null = null;

/**
 * Retorna a instância única do provedor de dados configurado em `src/config/database.ts`.
 */
export function getDatabase(): DatabaseProvider {
  if (instance) return instance;

  if (DATABASE_PROVIDER === 'supabase') {
    instance = new SupabaseDatabase();
  } else {
    instance = new LocalDatabase();
  }

  return instance;
}
