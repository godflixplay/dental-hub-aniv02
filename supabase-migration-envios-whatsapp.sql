-- =============================================================
-- MIGRATION: Tabela envios_whatsapp
-- Cria a tabela usada pelo painel admin (logs) e pelo EnvioTab.
-- Idempotente — pode rodar várias vezes sem efeito colateral.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.envios_whatsapp (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contato_id    uuid REFERENCES public.contatos(id) ON DELETE SET NULL,
  instancia_id  text,
  telefone      text NOT NULL,
  nome          text,
  status        text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'enviado', 'falha_envio', 'erro')),
  erro          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Garante colunas para projetos que já tinham a tabela parcial
ALTER TABLE public.envios_whatsapp
  ADD COLUMN IF NOT EXISTS instancia_id text,
  ADD COLUMN IF NOT EXISTS nome         text,
  ADD COLUMN IF NOT EXISTS erro         text,
  ADD COLUMN IF NOT EXISTS contato_id   uuid REFERENCES public.contatos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS envios_whatsapp_user_id_idx
  ON public.envios_whatsapp (user_id);
CREATE INDEX IF NOT EXISTS envios_whatsapp_created_at_idx
  ON public.envios_whatsapp (created_at DESC);
CREATE INDEX IF NOT EXISTS envios_whatsapp_status_idx
  ON public.envios_whatsapp (status);

ALTER TABLE public.envios_whatsapp ENABLE ROW LEVEL SECURITY;

-- Usuário vê os próprios envios; admin vê tudo
DROP POLICY IF EXISTS "envios_whatsapp_select_own" ON public.envios_whatsapp;
CREATE POLICY "envios_whatsapp_select_own" ON public.envios_whatsapp
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "envios_whatsapp_insert_own" ON public.envios_whatsapp;
CREATE POLICY "envios_whatsapp_insert_own" ON public.envios_whatsapp
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "envios_whatsapp_update_own" ON public.envios_whatsapp;
CREATE POLICY "envios_whatsapp_update_own" ON public.envios_whatsapp
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime para a aba "Envio" do cliente
ALTER PUBLICATION supabase_realtime ADD TABLE public.envios_whatsapp;
