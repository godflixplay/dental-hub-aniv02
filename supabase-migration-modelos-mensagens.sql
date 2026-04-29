-- =============================================================
-- MIGRATION: Galeria de modelos de mensagens prontos
--   - Tabela public.modelos_mensagens
--   - Bucket público "modelos-mensagens"
--   - RLS: leitura para qualquer authenticated, escrita só admin
-- Rode no SQL Editor do Supabase externo.
-- =============================================================

-- 1. Tabela
CREATE TABLE IF NOT EXISTS public.modelos_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL DEFAULT 'aniversario',
  titulo text NOT NULL,
  descricao text,
  mensagem text NOT NULL,
  imagem_url text NOT NULL,
  imagem_path text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS modelos_mensagens_categoria_ativo_idx
  ON public.modelos_mensagens (categoria, ativo, ordem);

ALTER TABLE public.modelos_mensagens ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário atual é admin (lê profiles.role)
-- Caso já exista uma função public.is_admin(), reutilize; aqui usamos
-- inline para não depender de outra migration.
DROP POLICY IF EXISTS "modelos_select_authenticated" ON public.modelos_mensagens;
CREATE POLICY "modelos_select_authenticated" ON public.modelos_mensagens
  FOR SELECT TO authenticated
  USING (ativo = true OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "modelos_insert_admin" ON public.modelos_mensagens;
CREATE POLICY "modelos_insert_admin" ON public.modelos_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "modelos_update_admin" ON public.modelos_mensagens;
CREATE POLICY "modelos_update_admin" ON public.modelos_mensagens
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "modelos_delete_admin" ON public.modelos_mensagens;
CREATE POLICY "modelos_delete_admin" ON public.modelos_mensagens
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- 2. Bucket público
INSERT INTO storage.buckets (id, name, public)
VALUES ('modelos-mensagens', 'modelos-mensagens', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Policies do bucket
DROP POLICY IF EXISTS "modelos_storage_public_read" ON storage.objects;
CREATE POLICY "modelos_storage_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'modelos-mensagens');

DROP POLICY IF EXISTS "modelos_storage_admin_insert" ON storage.objects;
CREATE POLICY "modelos_storage_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'modelos-mensagens'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "modelos_storage_admin_update" ON storage.objects;
CREATE POLICY "modelos_storage_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'modelos-mensagens'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "modelos_storage_admin_delete" ON storage.objects;
CREATE POLICY "modelos_storage_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'modelos-mensagens'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
