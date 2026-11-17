-- =============================================================================
-- Feira da Lua — Esquema Inicial PostgreSQL / Supabase
-- Correspondente ao modelo relacional local (IndexedDB) do MVP.
-- Os valores financeiros são armazenados em centavos inteiros (INTEGER >= 0)
-- ou podem ser convertidos na camada de adaptador para manter precisão exata.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. Tabela de Feirantes (vendors)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  business_name TEXT NOT NULL CHECK (char_length(trim(business_name)) > 0),
  phone TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors (status);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.vendors (name);

-- -----------------------------------------------------------------------------
-- 2. Tabela de Edições da Feira (fair_editions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fair_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  event_date DATE NOT NULL,
  participation_fee INTEGER NOT NULL CHECK (participation_fee >= 0), -- em centavos (ex: 3000 = R$ 30,00)
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'canceled')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fair_editions_event_date ON public.fair_editions (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_fair_editions_status ON public.fair_editions (status);

-- -----------------------------------------------------------------------------
-- 3. Tabela de Participações / Cobranças (participations)
-- Regra de negócio: cobrança por edição, independente de presença.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  edition_id UUID NOT NULL REFERENCES public.fair_editions (id) ON DELETE RESTRICT,
  charged_amount INTEGER NOT NULL CHECK (charged_amount >= 0), -- valor congelado no momento da inclusão
  attendance_status TEXT NOT NULL DEFAULT 'uninformed' CHECK (attendance_status IN ('uninformed', 'present', 'absent')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'canceled')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_participations_vendor_edition UNIQUE (vendor_id, edition_id)
);

CREATE INDEX IF NOT EXISTS idx_participations_edition_id ON public.participations (edition_id);
CREATE INDEX IF NOT EXISTS idx_participations_vendor_id ON public.participations (vendor_id);
CREATE INDEX IF NOT EXISTS idx_participations_payment_status ON public.participations (payment_status);

-- -----------------------------------------------------------------------------
-- 4. Tabela de Pagamentos (payments)
-- Preserva histórico completo; não permite pagamentos sem participação vinculada.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id UUID NOT NULL REFERENCES public.participations (id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0), -- em centavos
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pix', 'other')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_participation_id ON public.payments (participation_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments (payment_date DESC);

-- -----------------------------------------------------------------------------
-- Trigger para atualização automática de updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON public.vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fair_editions_updated_at ON public.fair_editions;
CREATE TRIGGER trg_fair_editions_updated_at
  BEFORE UPDATE ON public.fair_editions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_participations_updated_at ON public.participations;
CREATE TRIGGER trg_participations_updated_at
  BEFORE UPDATE ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
