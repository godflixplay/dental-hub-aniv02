A solução direta é parar de depender do salvamento feito pelo frontend e centralizar o fluxo crítico no servidor. Hoje existem dois pontos frágeis: a imagem selecionada/modelo fica só no estado visual até o save completar, e o envio de teste ainda pode ser bloqueado antes de chegar na server function. Vou corrigir isso tornando o servidor a fonte de verdade tanto para salvar a imagem quanto para montar/disparar o webhook.

Plano de correção

1. Criar uma server function para salvar a configuração da mensagem
- Criar `saveMensagemConfig` em arquivo de server function.
- Ela receberá apenas dados mínimos do frontend: texto da mensagem e, quando for modelo, a URL/id do modelo; quando for upload próprio, manteremos o upload via Storage no cliente, mas a confirmação no banco será feita no servidor.
- O servidor validará o usuário pelo `accessToken`.
- O servidor buscará a instância atual em `whatsapp_instances`.
- O servidor salvará/confirmará a imagem_url em dois lugares, de forma atômica na prática do fluxo:
  - `config_mensagem.imagem_url`
  - `whatsapp_instances.imagem_url`
- Depois do save, a função retornará a URL realmente gravada no banco. A UI só mostrará “Mensagem salva” se essa confirmação voltar correta.

2. Corrigir especificamente o caso dos modelos da galeria
- Ao escolher uma imagem pronta, ela não pode ficar apenas como preview.
- No salvar, a imagem do modelo será copiada/persistida para o bucket `imagens-whatsapp` no caminho do usuário/instância.
- A URL pública nova, com cache-buster, será gravada no banco.
- Isso evita o comportamento atual: “parece salvar, mas ao voltar aparece a imagem anterior”.

3. Tornar o botão “Salvar Configuração” realmente bloqueante e verificável
- Após salvar, invalidar/refazer as queries.
- Recarregar imediatamente `config_mensagem` e `whatsapp_instances` do Supabase.
- Comparar se as duas tabelas possuem a mesma `imagem_url` salva.
- Se não bater, mostrar erro claro e não limpar a alteração local.
- Se bater, limpar `pendingFile/selectedModelo` e manter a imagem salva como preview definitivo.

4. Corrigir o envio de teste para nunca montar payload no frontend
- O botão “Enviar Teste” continuará enviando apenas:
  - `nome`
  - `telefone`
  - `mensagem` como fallback mínimo, se necessário
  - `accessToken`
  - `modo`
- A server function `triggerN8nTestWebhook` buscará no banco, no momento do clique:
  - `whatsapp_instances.instance_name`
  - `whatsapp_instances.instance_id`
  - `whatsapp_instances.imagem_url`
  - `config_mensagem.mensagem`
  - `config_webhook.modo`
- Se `imagem_url` não existir ou estiver inacessível, o servidor retornará erro explícito antes do webhook.

5. Remover bloqueios frágeis do frontend que impedem o webhook de ser chamado sem diagnóstico
- Manter validações básicas de sessão/telefone.
- Tirar do frontend a validação pesada de imagem por `HEAD`, porque isso pode falhar por CORS/rede e impedir o disparo antes de chegar ao servidor.
- A validação da imagem será feita dentro da server function, com logs centralizados.
- Assim, quando falhar, teremos resposta/log real da server function dizendo exatamente o motivo.

6. Adicionar logs de auditoria no servidor
Na server function do webhook, logar obrigatoriamente:
- `webhookUrl`
- payload completo sanitizado, com `token` mascarado
- `imagem_url` usada
- fonte da imagem: `whatsapp_instances`
- `response.status` do n8n
- corpo parcial da resposta do n8n

Na server function de salvar mensagem, logar:
- usuário
- instância encontrada
- URL recebida/gerada
- confirmação de gravação em `config_mensagem`
- confirmação de gravação em `whatsapp_instances`

7. Verificar/ajustar RLS e bucket se necessário
- Conferir se o bucket `imagens-whatsapp` é público.
- Conferir policies de insert/update/delete para o usuário gravar dentro da pasta `{user_id}/...`.
- Se as policies atuais estiverem impedindo upload/update, criar uma migração SQL idempotente para corrigir.
- Isso é importante porque um clique em “Salvar” pode parecer funcionar na UI, mas o Supabase pode estar negando a escrita por RLS.

Resultado esperado após a correção

- Ao escolher a segunda imagem e clicar em “Salvar Configuração”, ela fica gravada de verdade.
- Ao sair da aba e voltar, a imagem continua sendo a segunda imagem, não volta para a anterior.
- `config_mensagem.imagem_url` e `whatsapp_instances.imagem_url` ficam sincronizadas.
- O botão “Enviar Teste” chama a server function sempre que telefone/sessão forem válidos.
- O payload enviado ao n8n sempre conterá `imagem_url` preenchido.
- Se algo bloquear o fluxo, a tela e os logs dirão exatamente onde: upload, gravação no banco, imagem inacessível, ou resposta do n8n.

Arquivos que serão alterados

- `src/components/aniversarios/MensagemTab.tsx`
- `src/components/aniversarios/EnvioTab.tsx`
- `src/utils/n8n-webhook.functions.ts`
- Novo server function para salvar configuração, ou expansão controlada de uma server function existente
- Possível nova migração SQL se for confirmado problema de RLS/bucket

Observação direta

Pelas telas e pelo código, o problema mais provável é que o preview está mudando localmente, mas a URL persistida no Supabase não está sendo confirmada de forma confiável antes de limpar o estado e dizer “salvo”. O envio de teste depende dessa URL em `whatsapp_instances.imagem_url`; se ela não muda ou está vazia/inacessível, o fluxo do webhook quebra. A correção é fazer o save ser confirmado pelo servidor e só permitir o envio quando o banco tiver a imagem correta.