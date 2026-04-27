-- ============================================================
-- MIGRATION ÚNICA — restauração pós-remix do projeto
-- ============================================================
-- Este script aplica TODAS as migrations que faltavam no Supabase
-- após o remix do Lovable. É idempotente: pode rodar várias vezes
-- sem efeito colateral. Rode no SQL Editor do projeto Supabase
-- (kybkhnshgrlhrjqbulyq) de uma vez só.
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles: novas colunas (cortesia + tutorial visto)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS acesso_cortesia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tutorial_visto  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_acesso_cortesia_idx
  ON public.profiles (acesso_cortesia)
  WHERE acesso_cortesia = true;

-- ------------------------------------------------------------
-- 2) whatsapp_instances: número do dono (para o admin ver)
-- ------------------------------------------------------------
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS owner_number text;

-- ------------------------------------------------------------
-- 3) Tabela `planos` (catálogo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.planos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  nome        text NOT NULL,
  valor       numeric(10,2) NOT NULL,
  ciclo       text NOT NULL,           -- mensal | trimestral | semestral | anual
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_read_all" ON public.planos;
CREATE POLICY "planos_read_all" ON public.planos
  FOR SELECT TO authenticated USING (true);

-- Seed dos 4 planos (PIX recorrente + Cartão).
INSERT INTO public.planos (slug, nome, valor, ciclo, ativo) VALUES
  ('mensal',     'Mensal',     37.00,  'mensal',     true),
  ('trimestral', 'Trimestral', 99.90,  'trimestral', true),
  ('semestral', 'Semestral',  188.70, 'semestral',  true),
  ('anual',     'Anual',      355.20, 'anual',      true)
ON CONFLICT (slug) DO UPDATE
  SET valor = EXCLUDED.valor,
      nome  = EXCLUDED.nome,
      ciclo = EXCLUDED.ciclo,
      ativo = EXCLUDED.ativo;

-- ------------------------------------------------------------
-- 4) Tabela `assinaturas`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinaturas (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano_id                 uuid REFERENCES public.planos(id),
  asaas_customer_id        text,
  asaas_subscription_id    text,
  status                   text NOT NULL DEFAULT 'trial',  -- trial|ativa|atrasada|cancelada|expirada
  proxima_cobranca         date,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assinaturas_user_idx       ON public.assinaturas (user_id);
CREATE INDEX IF NOT EXISTS assinaturas_status_idx     ON public.assinaturas (status);
CREATE INDEX IF NOT EXISTS assinaturas_asaas_sub_idx  ON public.assinaturas (asaas_subscription_id);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assinaturas_read_own" ON public.assinaturas;
CREATE POLICY "assinaturas_read_own" ON public.assinaturas
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- (admin acessa via service role; webhook também via service role)

-- ------------------------------------------------------------
-- 5) Tabela `pagamentos`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assinatura_id      uuid REFERENCES public.assinaturas(id) ON DELETE SET NULL,
  asaas_payment_id   text UNIQUE,
  status             text NOT NULL,                -- PENDING|CONFIRMED|RECEIVED|OVERDUE|REFUNDED ...
  valor              numeric(10,2),
  billing_type       text,                         -- PIX|CREDIT_CARD|BOLETO
  invoice_url        text,
  data_pagamento     date,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagamentos_user_idx          ON public.pagamentos (user_id);
CREATE INDEX IF NOT EXISTS pagamentos_assinatura_idx    ON public.pagamentos (assinatura_id);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamentos_read_own" ON public.pagamentos;
CREATE POLICY "pagamentos_read_own" ON public.pagamentos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- 6) Cortesia para as 3 contas de teste
-- ------------------------------------------------------------
-- Libera o acesso completo às automações (envio de mensagens) sem
-- precisar de assinatura paga. Ajuste a lista de e-mails se quiser.
UPDATE public.profiles
   SET acesso_cortesia = true
 WHERE email IN (
   'contato@stelleodontologia.com.br',
   'williamandradeoficial520@gmail.com',
   'williamnogueiraoficial@gmail.com',
   'dentalhubtalk@gmail.com'
 );

-- Conferência rápida (deve listar 4 linhas com acesso_cortesia = true):
-- SELECT email, role, acesso_cortesia FROM public.profiles WHERE acesso_cortesia = true;
