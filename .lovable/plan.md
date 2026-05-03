## Objetivo

Parar de adivinhar. Executar o fluxo de ponta a ponta com instrumentação real para identificar onde ele quebra (server function, env vars, n8n) e corrigir o save da imagem do `MensagemTab` que está revertendo ao trocar de aba.

## Etapa 1 — Verificação de ambiente (sem mexer em código)

1. Listar secrets do projeto (`secrets--fetch_secrets`) e confirmar que `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` existem no runtime do servidor.
2. Buscar logs publicados da server function (`stack_modern--server-function-logs` com filtro `n8n-webhook`) para ver se ela foi chamada nas últimas tentativas e o que retornou.
3. Invocar a server function diretamente (`stack_modern--invoke-server-function` em `/_serverFn/...`) com um payload conhecido para validar:
   - se a função executa
   - se as env vars estão presentes
   - se o fetch para o n8n retorna 200 ou erro (e qual)
   - o `debugPayload` final que está saindo

Resultado esperado: vamos saber exatamente em que etapa o pipeline quebra (auth, env, fetch, ou nada — n8n offline).

## Etapa 2 — Instrumentação adicional (se a Etapa 1 não bastar)

Adicionar 3 logs específicos:
- No `EnvioTab.handleSend`, logar o `result` completo retornado pela server function (já tem log básico, vai virar `console.error` se `success: false`).
- Na server function, logar o tamanho do body do fetch e timing.
- Mostrar no toast de erro o `debugPayload.imagem_fonte` e `webhookUrl`, para o usuário ver na UI exatamente para onde foi e o que foi enviado.

## Etapa 3 — Corrigir persistência da imagem no MensagemTab

Investigar em ordem:
1. Logar o retorno do `upsert` em `config_mensagem` (`data` + `error`) e o retorno do `update` em `whatsapp_instances`. Se aparecer erro, é RLS ou constraint.
2. Conferir se `withRequestTimeout` não está engolindo erro do upsert.
3. Confirmar com query direta no Supabase (via `psql`) que a linha em `config_mensagem` realmente mudou após o save — comparar `imagem_url` antes e depois.
4. Se o banco mudou mas a UI não reflete: o problema está no `useEffect` de sync (linhas 96-114) ou no cache-buster da URL fazendo o React Query achar que é a mesma row. Ajustar para invalidar incondicionalmente após save (já invalida; verificar se há `staleTime` matando o refetch).
5. Se o banco NÃO mudou: corrigir RLS / payload.

## Etapa 4 — Validação final

1. Aplicar correções identificadas nas etapas anteriores.
2. Rodar `stack_modern--invoke-server-function` novamente — confirmar 200 do n8n.
3. Pedir ao usuário para:
   - Abrir o workflow do n8n em modo teste e clicar em "Listen for test event"
   - Garantir que o workflow de produção está **Active**
   - Clicar Enviar Teste no app
4. Confirmar com `server-function-logs` que houve POST 200 e que o n8n recebeu.
5. Trocar imagem no MensagemTab → salvar → mudar de aba → voltar → confirmar que a nova imagem persiste.

## Hipótese principal sobre o webhook

A causa mais provável de "n8n não recebe nada nem em teste nem em produção" sendo o código do servidor claramente correto é:
- **Workflow de teste do n8n só aceita 1 chamada após clicar "Listen for test event"** (comportamento padrão do n8n). Se você não clica antes de cada teste, o webhook-test responde 404.
- **Workflow de produção precisa estar `Active`** no n8n. Inativo = 404.

A Etapa 1 vai confirmar ou descartar isso vendo o status HTTP que o servidor recebe.

## Detalhes técnicos

- Arquivos que podem ser alterados: `src/utils/n8n-webhook.functions.ts` (mais logs), `src/components/aniversarios/MensagemTab.tsx` (mais logs no save + ajustar sync).
- Sem alterações de schema previstas. Migrations já foram aplicadas.
- Sem alteração de contrato com n8n.
