## Objetivo

Criar uma biblioteca de **modelos de posts prontos** (imagem + texto sugerido) que:
- O **admin** cadastra/sobe pelo painel admin (nova aba "Modelos").
- O **cliente** vê na aba "Mensagem" (Aniversários) e pode escolher um modelo OU continuar subindo imagem própria. Ao escolher, a imagem do modelo vira a imagem da instância dele e o texto sugerido preenche o campo de mensagem.

## Estrutura no Supabase

### 1. Bucket de storage
Bucket público `modelos-mensagens` (separado de `imagens-whatsapp` que é por usuário). Apenas admins podem escrever; leitura pública.

### 2. Nova tabela `modelos_mensagens`
| coluna | tipo | obs |
|---|---|---|
| id | uuid PK | |
| categoria | text | ex: "aniversario", "datas-comemorativas", "promocional" |
| titulo | text | rótulo curto do modelo |
| descricao | text null | opcional |
| mensagem | text | texto sugerido (suporta `{nome}`) |
| imagem_url | text | URL pública no bucket |
| imagem_path | text | path interno (para deletar do storage) |
| ativo | boolean default true | admin pode ocultar sem deletar |
| ordem | int default 0 | ordenação na galeria |
| created_at, updated_at | timestamptz | |

**RLS:**
- SELECT público para `authenticated` quando `ativo = true`.
- INSERT/UPDATE/DELETE só para `has_role(auth.uid(), 'admin')`.

**Storage policies em `modelos-mensagens`:**
- SELECT público.
- INSERT/UPDATE/DELETE só para admins (via `has_role`).

Tudo entregue em um único arquivo `supabase-migration-modelos-mensagens.sql` pronto para colar.

## Painel Admin — nova aba "Modelos"

- Item de menu novo na `AdminSidebar`: **Modelos** (ícone `Image`), rota `/admin/modelos`.
- Nova rota `src/routes/_authenticated.admin.modelos.tsx`:
  - Listagem em grid (cards): thumbnail + título + categoria + switch ativo + botões editar/excluir.
  - Botão **"Novo modelo"** abre dialog com:
    - Upload de imagem (preview, máx 5MB, jpg/png/webp).
    - Categoria (select: Aniversário, Datas comemorativas, Promocional, Outros).
    - Título, descrição, mensagem sugerida (com hint do `{nome}`), ordem.
  - Editar reabre o mesmo dialog populado.
  - Excluir confirma e remove do storage + tabela.

## Cliente — aba "Mensagem" (Aniversários)

Ajustar `src/components/aniversarios/MensagemTab.tsx`:

- Adicionar uma seção **"Modelos prontos"** acima ou ao lado do upload, mostrando os modelos da categoria `aniversario` (`ativo = true`, ordenados por `ordem`).
- Layout: carrossel/grade horizontal scrollável de cards (thumb + título).
- Ao clicar em um modelo:
  - Preenche `mensagem` no textarea com `modelo.mensagem` (cliente pode editar antes de salvar).
  - Marca o modelo escolhido visualmente (anel destacado).
  - Define `pendingModeloUrl = modelo.imagem_url` (a imagem do modelo).
- Botão **"Usar imagem própria"** já existe (o atual upload). Continua funcionando — se o usuário sobe arquivo, o modelo selecionado é desmarcado.
- No `handleSave`, se houver modelo selecionado e nenhum `pendingFile`:
  - Em vez de upload, baixa a imagem do modelo (`fetch` → `Blob`) e faz upload no bucket próprio do usuário (`imagens-whatsapp/{userId}/{instance}/imagem.{ext}`) usando o helper `uploadInstanceImage` já existente. Isso mantém a invariante atual: `whatsapp_instances.imagem_url` aponta sempre para o bucket do usuário (n8n não muda).
- Preview no card direito segue idêntico (continua mostrando `previewImage`).

## Arquivos novos / alterados

**Novos**
- `supabase-migration-modelos-mensagens.sql` — tabela + bucket + policies.
- `src/routes/_authenticated.admin.modelos.tsx` — CRUD admin.
- `src/components/admin/ModeloDialog.tsx` — dialog reutilizado para criar/editar.
- `src/components/aniversarios/ModelosGaleria.tsx` — galeria dos modelos exibida no cliente.

**Alterados**
- `src/components/admin/AdminSidebar.tsx` — adicionar item "Modelos".
- `src/components/aniversarios/MensagemTab.tsx` — integrar galeria + lógica de "copiar imagem do modelo para o bucket do usuário".

## Performance / segurança

- Galeria do cliente: query simples, `select` com `limit 50`, cache via React Query.
- Admin: somente acessível dentro de `_authenticated/admin` (já tem guard de role).
- RLS impede cliente de inserir/alterar modelos.

## Confirmações antes de implementar

1. Categorias iniciais: **Aniversário, Datas comemorativas, Promocional, Outros** — ok ou prefere outras?
2. Por enquanto, modelos aparecem **só na aba Mensagem de Aniversários** (campanhas/lembretes ficam para depois) — ok?
