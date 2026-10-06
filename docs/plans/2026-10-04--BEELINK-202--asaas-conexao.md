# BEELINK-202 — Q1: API para conectar a conta Asaas da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), primeiro ticket. O texto do Plane ainda fala de Mercado Pago; vale o épico:
> é o **Asaas**, com a conta do próprio lojista (decidido em 02/10, briefing de 04/10, decisões 1 a 17).
> Depende do N1 (BEELINK-182), que trouxe o cofre (`secret-vault.ts`) e a `StoreIntegration`.
> Área: API · Tipo: novo · Tamanho: G.

## Objetivo

A loja autoriza o bee-link a criar cobranças na conta Asaas dela colando a chave de API. O bee-link
confere a chave, guarda-a cifrada e cadastra, na conta da loja, o webhook que vai avisar dos
pagamentos. A tela é o Q2; o receptor do webhook é o Q5.

## Definição de Pronto

1. **Formatos em `packages/contracts`.** `AsaasConnection` diz se o Asaas está disponível nesta
   instalação, o ambiente, se a loja está conectada, a conta (nome e documento **mascarado**), o
   estado do webhook (`REGISTERED`, `SKIPPED` em dev, `PAUSED` ou `ERROR`) e a data da conexão.
   `AsaasConnectPayload` é `{ apiKey }`. `IntegrationProvider` já tinha `ASAAS`; os códigos de erro
   ganham `INTEGRATION_KEY_INVALID` e `INTEGRATION_KEY_WRONG_ENVIRONMENT`.
2. **Cliente Asaas** em `apps/api/src/modules/integrations/asaas/`: uma porta (`AsaasClient`, classe
   abstrata, que é o token de injeção) e a implementação HTTP. A URL base vem de `ASAAS_ENV`. Os
   cabeçalhos são `access_token`, `User-Agent: bee-link (<ASAAS_CONTACT_EMAIL>)` e
   `Content-Type: application/json`. Uma recusa (4xx, com o `code` do Asaas) é separada de "não
   respondeu" (5xx, rede ou tempo esgotado). **A chave nunca aparece num erro nem num log.**
3. **Variáveis.** `ASAAS_ENV` (`sandbox|production`, padrão `sandbox`) e `ASAAS_CONTACT_EMAIL` ficam
   no schema zod, no `.env.example` e no `docs/repo/deploy.md`.
4. **Conectar** (`POST /stores/:slug/integrations/asaas`, só o dono):
   - uma chave com o prefixo do outro ambiente é recusada **sem chamar o Asaas**
     (`INTEGRATION_KEY_WRONG_ENVIRONMENT`);
   - a chave é validada lendo a conta (`GET /myAccount/commercialInfo/`): o Asaas recusou →
     `INTEGRATION_KEY_INVALID` (ou o código de ambiente, quando o Asaas diz `invalid_environment`);
     o Asaas não respondeu → `INTEGRATION_UNREACHABLE`;
   - gera um `authToken` aleatório e cadastra o webhook (`POST /webhooks`) em
     `<WEB_URL>/api/integrations/asaas/webhook`. Com um `WEB_URL` que não é https público, o cadastro
     é pulado (`SKIPPED`). Se o cadastro falhar, a conexão fica de pé com o webhook em `ERROR`;
   - guarda `{ apiKey, webhookToken }` selados no cofre, o id do webhook e o nome e o documento
     mascarado da conta.
5. **Reconectar** substitui tudo: o webhook antigo é removido com a chave antiga, se der, e a nova
   chave ganha um token e um webhook novos.
6. **Ler o estado** (`GET`, só o dono) **nunca devolve a chave nem o token**.
7. **Desconectar** (`DELETE`, só o dono) remove o webhook da conta (`DELETE /webhooks/{id}`, sem
   falhar se ele já não existir) e apaga o segredo.
8. **Arch-gate.** Só `src/modules/integrations/asaas/` abre o segredo do Asaas.
9. **Web.** O BFF repassa o `GET`, o `POST` e o `DELETE` em
   `apps/web/src/app/api/stores/[slug]/integrations/asaas/route.ts`. A rota pública do webhook é do Q5.
10. **Testes.** Unitários do serviço com o cliente falso (chave errada, ambiente errado, webhook
    pulado em dev, reconectar, desconectar), do cliente HTTP com `fetch` simulado (cabeçalhos e
    URL) e da máscara; e2e da API com o Asaas falso; teste da rota do web. Nenhum teste chama o Asaas.
11. `pnpm ci-check` verde e `delivery-check` sem bloqueador.

## O que confirmei na documentação do Asaas (04/10/2026)

- **Autenticação** (`docs/autenticação-1`): o cabeçalho é `access_token`. As URLs base são
  `https://api-sandbox.asaas.com/v3` e `https://api.asaas.com/v3`. As chaves começam com
  `$aact_hmlg_` (sandbox) e `$aact_prod_` (produção), e o `$` faz parte da chave. O `User-Agent` é
  obrigatório para contas criadas desde 13/06/2024. Uma chave recusada responde `401` com
  `errors[].code`: `invalid_environment` (chave de outro ambiente), `access_token_not_found`,
  `invalid_access_token_format` e `invalid_access_token`.
- **Erros:** o corpo é `{ errors: [{ code, description }] }`.
- **Dados da conta** (`reference/recuperar-dados-comerciais`): `GET /v3/myAccount/commercialInfo/`,
  com a barra no fim. Responde `personType` (`FISICA|JURIDICA`), `cpfCnpj`, `name`, `companyName`,
  `tradingName`, `email` e outros campos. Usamos `tradingName`, `companyName` ou `name` (o primeiro
  que vier preenchido) e o `cpfCnpj`, que é mascarado antes de ser gravado.
- **Criar webhook** (`docs/criar-novo-webhook-pela-api`, `reference/criar-novo-webhook`):
  `POST /v3/webhooks`. Todos os campos são obrigatórios: `name`, `url`, `email`, `enabled`,
  `interrupted`, `apiVersion` (inteiro), `authToken`, `sendType` (`SEQUENTIALLY|NON_SEQUENTIALLY`) e
  `events`. O `authToken` tem de 32 a 255 caracteres, sem espaço e sem sequência simples. A resposta
  traz o `id`.
- **Remover webhook** (`reference/remover-webhook`): `DELETE /v3/webhooks/{id}` responde
  `{ deleted, id }`. Um `404` quer dizer que o id não existe ou não é desta conta.
- **Receber** (`docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook`, para o Q5): o token chega
  no cabeçalho `asaas-access-token`. A entrega é "pelo menos uma vez", e o `id` do evento é a chave de
  idempotência. Só se responde 200 depois de gravar. Depois de 15 falhas seguidas, a fila pode ser
  interrompida. O Asaas guarda os eventos por 14 dias, e cada conta tem **até 10 webhooks**.
- **Eventos de cobrança** existentes, entre outros: `PAYMENT_CREATED`, `PAYMENT_UPDATED`,
  `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_RESTORED`,
  `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`,
  `PAYMENT_REFUND_DENIED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`,
  `PAYMENT_AWAITING_RISK_ANALYSIS`, `PAYMENT_APPROVED_BY_RISK_ANALYSIS`,
  `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e
  `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`.

Não há chave de sandbox neste ambiente: nada disso foi tentado contra o Asaas de verdade.

## Decisões deste ticket

1. **A porta é uma classe abstrata.** O Nest não injeta uma `interface`. `AsaasClient` declara o que
   o bee-link pede ao Asaas, e o módulo o liga a `AsaasHttpClient`. Os testes trocam o provedor por
   um Asaas falso, como no Melhor Envio.
2. **Os eventos assinados** são os que mudam o estado de uma cobrança ou o seu dinheiro:
   `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_RESTORED`,
   `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`,
   `PAYMENT_REFUND_DENIED`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`,
   `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` e
   `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`. Ficaram de fora o `PAYMENT_CREATED` (a cobrança é criada
   pelo próprio bee-link) e o `PAYMENT_UPDATED` (a reconciliação lê o estado de qualquer jeito).
   Assinar a mais agora é mais barato: um evento novo depois exige reconectar cada loja ou
   atualizar cada webhook.
3. **Chave sem prefixo conhecido vai ao Asaas.** O prefixo do **outro** ambiente é recusado sem
   chamada. Uma chave sem nenhum dos dois prefixos (formato antigo) é validada pelo próprio Asaas, e
   o `invalid_environment` dele vira o mesmo erro de ambiente. Assim, uma loja com chave antiga não
   fica de fora.
4. **Webhook que falha não derruba a conexão.** Com a chave válida, a conexão é gravada mesmo que o
   cadastro do webhook seja recusado (por exemplo, a conta já tem 10) ou fique sem resposta. O estado
   do webhook fica `ERROR` e o motivo, nas palavras do Asaas, vai para `lastError` (log e banco, nunca
   a resposta). Os pagamentos ainda são achados pela reconciliação (Q5), e reconectar tenta de novo.
   O token é gravado mesmo assim: se o Asaas criou o webhook e a resposta se perdeu, o receptor ainda
   reconhece os eventos.
5. **O webhook fica pulado fora de https público.** Com `WEB_URL` que não é `https:`, ou que aponta
   para `localhost`, `127.0.0.1`, `::1` ou `*.localhost`, nada é cadastrado: o estado é `SKIPPED`.
6. **O documento é gravado já mascarado** (`***.456.789-**`, `**.345.678/0001-**`). O painel só
   precisa conferir qual conta foi ligada. O documento inteiro não serve a nenhum ticket do épico.
7. **O token do webhook também tem um SHA-256 numa coluna única** (`webhookTokenHash`). O Q5 acha a
   loja pelo cabeçalho `asaas-access-token` sem abrir o segredo de cada loja. Depois de achar, compara
   em tempo constante. O hash de 256 bits aleatórios não revela nada, e o token continua selado no
   cofre, como pede a decisão 2 do briefing.
8. **Reconectar remove o webhook antigo antes de cadastrar o novo.** A documentação fala em "URLs
   diferentes" para os 10 webhooks de uma conta. Se a mesma conta for reconectada, cadastrar antes de
   remover poderia bater nesse limite. A nova chave é validada antes de qualquer coisa ser removida.
9. **Desconectar nunca falha por causa do Asaas.** Um `404` é o webhook que já não existe. Uma recusa
   (chave revogada) ou a falta de resposta são registradas no log, com o id do webhook e da loja e
   nunca a chave, e o segredo é apagado mesmo assim: o lojista pediu que o bee-link deixasse de ter a
   chave. Um webhook que sobrar manda eventos com um token que ninguém mais reconhece. A fila dele
   pausa sozinha, e o lojista pode removê-lo no painel do Asaas.
10. **O `email` do webhook é o `ASAAS_CONTACT_EMAIL`**, o mesmo do `User-Agent`. Quem recebe o aviso
    de fila pausada é quem cuida do receptor, o bee-link, e não o lojista, que não tem o que
    consertar. O nome é `bee-link (<slug>)`, para o lojista reconhecê-lo no painel do Asaas.
11. **Disponível = há onde selar.** O Asaas não tem aplicativo da plataforma: basta o
    `INTEGRATIONS_SECRET_KEY`. Sem ele, conectar responde `INTEGRATION_UNAVAILABLE`.
12. **Conectar tem limite por IP**, o mesmo das rotas de autenticação (`AUTH_RATE_LIMIT_*`).
    Conectar é apresentar uma credencial, e sem limite a rota viraria um oráculo para testar chaves
    vazadas, saindo pelo IP do bee-link.
13. **Os códigos de erro são genéricos** (`INTEGRATION_KEY_INVALID`,
    `INTEGRATION_KEY_WRONG_ENVIRONMENT`), no padrão dos `INTEGRATION_*`: descrevem uma integração por
    chave, e não só o Asaas. Um corpo malformado (sem `apiKey`, com espaço) responde
    `INTEGRATION_KEY_INVALID`.
14. **O estado do webhook é um enum novo, `IntegrationWebhookState`**, numa coluna da
    `StoreIntegration`, com o mesmo nome em contracts. A tabela é de todas as integrações, mas só o
    Asaas a preenche; no Melhor Envio fica nulo, porque o webhook dele é um só, do aplicativo.

## O que entra

- **contracts:** `asaas.ts` (`AsaasEnvironment`, `IntegrationWebhookState`, `AsaasAccount`,
  `AsaasConnection` e `AsaasConnectPayload`), mais os dois códigos em `integration.ts`.
- **API, `modules/integrations/asaas/`:**
  - `asaas.config.ts`: o ambiente, a URL base, o User-Agent e a URL do webhook (ou nula);
  - `asaas.client.ts`: a porta, os tipos e os erros (`AsaasRefused`, `AsaasUnreachable`);
  - `asaas-http.client.ts`: a implementação com `fetch`;
  - `asaas-connection.service.ts`, `asaas.controller.ts`, os DTOs e `masked-document.ts`.
- **Prisma:** o enum `IntegrationWebhookState` e as colunas `accountDocument`, `webhookId`,
  `webhookState` e `webhookTokenHash` em `store_integrations`.
- **web:** `api/stores/[slug]/integrations/asaas/route.ts` (GET, POST e DELETE).
- **scripts:** o gate `api/asaas-secret-in-asaas`.
- **docs:** `docs/repo/deploy.md` (seção Asaas) e a regra 9 de `apps/api/AGENTS.md`.

## Fora de escopo

- A tela (Q2), as formas de pagamento da loja (Q3), as cobranças (Q4), o receptor do webhook e a
  reconciliação (Q5), o pago (Q6) e o estorno (Q7).
- **A rota pública `apps/web/src/app/api/integrations/asaas/webhook/route.ts` é do Q5.** O Q1 **não
  pode ir para produção sem o Q5**: um webhook cadastrado sem receptor acumula falhas, e o Asaas
  pausa a fila depois de 15.
- A frase do produto sobre pagamento (decisão 16 do briefing) muda quando houver cobrança (Q4).
- Descobrir e limpar webhooks órfãos do bee-link na conta (listar `GET /webhooks` e casar pela URL):
  só se o sandbox mostrar que eles acontecem.
- Marcar a conexão como `NEEDS_RECONNECT` quando a chave for revogada depois: quem primeiro vai
  ouvir o `401` é a cobrança (Q4) ou a reconciliação (Q5).

## Para os próximos tickets

- **Q5:** acrescentar `req.headers["asaas-access-token"]` ao `redact` do pino em `app.module.ts`.
  Achar a loja por `webhookTokenHash` (SHA-256 em hex do cabeçalho) e comparar em tempo constante.
  O webhook recebe os eventos de **todas** as cobranças da conta, inclusive as que o lojista cria
  fora do bee-link: um evento sem `OrderPayment` correspondente é gravado e ignorado. Duas lojas
  do bee-link na mesma conta Asaas recebem cada evento duas vezes, uma com o token de cada loja.
- **Q4/Q5:** `AsaasConnectionService` deve expor a chave aberta só dentro da pasta `asaas/` (gate
  `api/asaas-secret-in-asaas`).

## Acréscimos de 05/10/2026: a revisão antes do PR

A leitura do diff inteiro, antes de abrir o PR, mudou quatro coisas. Nenhuma altera a Definição de
Pronto.

1. **A chave é só ASCII visível.** O DTO aceitava qualquer coisa sem espaço. Uma chave colada com
   um caractere invisível (um espaço de largura zero, por exemplo) passava, o `fetch` falhava ao
   montar o cabeçalho e o lojista lia "o Asaas não respondeu" (502), quando o certo é "essa chave
   não vale, cole de novo". Agora a chave tem de casar com `[\x21-\x7e]+`; o resto responde
   `INTEGRATION_KEY_INVALID` sem chamar o Asaas. Nenhuma chave de verdade fica de fora: um
   cabeçalho HTTP não leva outra coisa.
2. **O cliente HTTP não repete as palavras do `fetch`.** Quando um cabeçalho não pode ser enviado,
   o `fetch` do Node diz qual, com o valor (`Headers.append: "<a chave>" is an invalid header
   value`), e essa frase ia para a mensagem do `AsaasUnreachable`. Nenhum caminho de hoje chegava
   lá (o único caractere que provoca isso é o NUL, que o `ApiValidationPipe` já recusa), mas a
   porta promete que um erro nunca leva a chave. A falha agora é descrita só pelo nome e pelo
   código (`TypeError, ECONNREFUSED`, `TimeoutError`), o que também diz mais do que o "fetch
   failed" de antes quando vai parar no `lastError`.
3. **Os mapas de superfície** não tinham o Asaas. `apps/api/docs/README.md` ganhou as duas
   variáveis e a linha da rota; `apps/web/docs/README.md`, a linha do handler do BFF.
4. **O limite por IP (decisão 12) ganhou teste.** O e2e confere que o `POST` responde sob o limite
   das rotas de autenticação e que o `GET` não tem limite.

**A base do PR é a `main`.** O briefing previa a pilha N8 → M5 → D3 → Q1. O N8 já entrou na `main`
(PR #196), o M5 e o D3 não começaram, e o Q1 só depende do N1 (BEELINK-182), que está na `main`. A
branch recebeu a `main` por merge.

**Limite conhecido:** uma conta com CNPJ alfanumérico (o formato novo da Receita) fica sem documento
no estado da conexão. O cliente tira tudo que não é dígito, sobram menos de 14, e a máscara não
mostra nada; o nome da conta continua aparecendo. Quem mostra o documento é o Q2.
