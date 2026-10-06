# BEELINK-206 — Q5: o webhook do Asaas e a reconciliação confirmam o pagamento do pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), quinto ticket. Depende do Q3 (BEELINK-204: `order_payments`, `applyCharge`,
> `OrderPayments`) e encaixa no que o Q4 (BEELINK-205) deixou no web. Onde o Plane diz Mercado Pago,
> é **Asaas**, na conta do próprio lojista.
> Área: API (com contrato e banco), mais um handler e o tempo real no web · Tipo: novo · Tamanho: M no
> Plane, G na prática.

## Objetivo

Nenhuma confirmação de pagamento se perde, nem conta duas vezes. O Asaas avisa pelo webhook da loja;
o bee-link grava o aviso, responde, e só então vai ler na conta da loja o que aconteceu. O que o
webhook perder, uma rotina acha. Um pedido online que ninguém pagou em 3 dias é cancelado, depois de
conferido no Asaas. Com este ticket a pilha do épico pode ir para a produção (decisão 17).

## Definição de Pronto

1. **Receptor no web.** `POST /api/integrations/asaas/webhook` (`apps/web`) repassa os bytes como
   chegaram e o cabeçalho `asaas-access-token`, sem sessão; responde o que a API responde, e `502`
   quando a API não responde. Com teste.
2. **Receptor na API.** `POST /api/integrations/asaas/webhook`, público. A loja é achada pelo
   SHA-256 do token e o token é comparado em tempo constante com o que está selado; sem loja, `401`.
   O evento é gravado (único por loja e id) antes do `200`; repetido responde `200` sem fazer nada.
   Corpo com campos novos, sem `payment` ou sem `id` não quebra. O cabeçalho está no `redact`.
3. **Processamento depois de gravar**, com nova tentativa em espera crescente, sem derrubar a
   resposta. Evento de cobrança que não é do bee-link fica gravado só com o id e o nome, já
   concluído. Eventos concluídos são apagados depois de 30 dias.
4. **Um fato, uma porta.** Webhook, reconciliação, consulta sob demanda e `hearOf` passam por
   `PaymentSync.sync`, que lê a conta da loja e grava por `applyCharge`. Uma parcela casa pelo
   parcelamento.
5. **Eventos assinados.** `ASAAS_WEBHOOK_EVENTS` com a lista final; `ACCESS_TOKEN_*` ou um `401`
   levam a conexão a `NEEDS_RECONNECT`.
6. **Tempo real.** `order.payment` no contrato, publicado para a loja e o cliente quando o pagamento
   de um pedido muda; o web relê a tela de pagamento, a página do pedido e o pedido do painel.
7. **Reconciliação.** Rotina periódica: cobranças pendentes, a mais velha primeiro, em lotes, com
   espera crescente por cobrança, respeitando `429`; a falha de uma loja não para as outras. Conclui
   a remoção que ficou devendo num pedido cancelado ou de total mudado.
8. **Consulta sob demanda.** O `GET …/orders/:number/payment` de uma cobrança pendente pergunta ao
   Asaas no máximo uma vez por minuto por cobrança.
9. **Cancelamento automático.** Pedido `ONLINE` sem pagamento 3 dias depois de o total fechar:
   conferido no Asaas, cancelado sob a trava da loja com o ator `SYSTEM`, com estoque, cupom e
   cashback devolvidos, cobrança apagada, aviso na conversa e por e-mail.
10. **Dinheiro que o pedido não pedia.** Pagamento de pedido cancelado e segundo pagamento ficam em
    `order_stray_payments`, aparecem em `ShopOrderPayment.strays` e a loja recebe um toast.
11. **Fila pausada e chave parada.** Checagem diária por loja conectada: lê o webhook, grava
    `PAUSED`, reativa, registra de novo o que nunca foi registrado; serve de uso da chave.
12. **Trocar de conta ou desconectar.** As cobranças pendentes são apagadas na conta antiga antes de
    a chave sair, dentro de um prazo, sem travar.
13. **Testes.** Unitários das regras novas e do cliente HTTP; e2e `test/asaas-webhook.e2e-spec.ts` e
    `test/payment-reconciliation.e2e-spec.ts` com os casos do ticket; teste da rota do web.
14. **Documentos.** Mapas de superfície da API e do web, `docs/repo/deploy.md`, regra 10 de
    `apps/api/AGENTS.md`, este plano.
15. **`pnpm ci-check` verde**, suíte e2e da API inteira, build de `api` e `web`, `delivery-check`.

## O que a documentação do Asaas confirmou (lido em 06/10/2026)

| O quê | Página | O que usamos |
|---|---|---|
| Eventos que um webhook assina | `reference/criar-novo-webhook` | Um `enum` só para `events`, com os `PAYMENT_*` e também `ACCESS_TOKEN_CREATED`, `_DELETED`, `_DISABLED`, `_ENABLED`, `_EXPIRED`, `_EXPIRING_SOON`: o mesmo webhook das cobranças pode assiná-los. Existem `PAYMENT_AUTHORIZED`, `PAYMENT_AWAITING_RISK_ANALYSIS`, `PAYMENT_APPROVED_BY_RISK_ANALYSIS`, `PAYMENT_UPDATED`, `PAYMENT_RECEIVED_IN_CASH_UNDONE`, `PAYMENT_PARTIALLY_REFUNDED` |
| Eventos de chave | `docs/eventos-para-chaves-de-api` | O corpo traz `accessToken: { id, name, enabled, disableReason, … }` e nenhum `payment`. O evento diz **qual** chave pelo id dela, que o bee-link não conhece: uma conta pode ter várias |
| Corpo do evento de cobrança | `docs/webhook-para-cobrancas` | `{ id, event, dateCreated, account, payment }`; `payment.id`, `payment.installment` (só em parcelamento), `payment.externalReference`, `payment.status`, `payment.deleted`. A página pede que campos novos não gerem exceção |
| Ler um webhook | `reference/recuperar-um-unico-webhook` | `GET /v3/webhooks/{id}` responde `enabled`, `interrupted` ("fila de sincronização interrompida"), `penalizedRequestsCount`; `404` quando não é da conta; `401` com chave inválida |
| Reativar a fila | `docs/como-reativar-fila-interrompida`, `reference/atualizar-webhook-existente` | `PUT /v3/webhooks/{id}` com `{ "interrupted": false }`; os eventos guardados voltam a ser enviados |
| Fila pausada | `docs/fila-pausada` | 15 falhas seguidas interrompem a fila; os eventos ficam guardados por até 14 dias |
| Limites | `reference/rate-e-quota-limit` | 25.000 requisições por 12 horas, 50 `GET` simultâneos, `429`, e `RateLimit-Reset` em **segundos** até liberar |

Nada disso foi tentado com uma conta de verdade: não há chave de sandbox neste ambiente.

## Desenho

### Fronteiras

```
StoresModule ← IntegrationsModule ← PaymentsModule ← OrdersModule ← PaymentEventsModule
```

- **`integrations/asaas/`** (abre a chave e o token):
  - porta `AsaasClient`: `webhook` (ler) e `resumeWebhook` (reativar); `AsaasThrottled` (um `429`,
    com quando tentar de novo).
  - `AsaasWebhookDoor.shopOf(token)`: de quem é o token.
  - `AsaasWebhookKeeper`: a checagem diária do webhook e da chave, e `probe(storeId)`.
  - `AsaasCharges`: lembra, por loja, até quando o Asaas mandou esperar, e não chama antes disso.
  - `AsaasConnectionService.beforeKeyLeaves(listener)`: o gancho de antes de a chave sair.
- **`payments/`** (as regras, sem chave): `PaymentSync` (a leitura que vira fato), `applyCharge` e
  `noteStray` (quem escreve), `payment-checks.ts` (a espera crescente), a consulta sob demanda em
  `CustomerPayments.read`, e `OrderPayments.releasePendingOf` (o que o gancho chama).
- **`payment-events/`** (módulo novo, o único que conhece pagamentos **e** pedidos, como o
  `carrier-tracking`): o controller do webhook, `AsaasEvents` (gravar e processar),
  `PaymentReconciliation`, `UnpaidOrders` (o cancelamento automático) e `PaymentRoutine` (o relógio).

### O webhook é um aviso; o estado vem de uma leitura autenticada

O corpo do evento não é aplicado. Dele só se tira **de qual pedido** ele fala (`payment.id`,
`payment.installment`, `payment.externalReference`); o estado é lido da conta da loja com a chave
dela (`GET /v3/payments?externalReference=<id do pedido>`, a mesma listagem do Q3).

- **Segurança.** O token do webhook é um segredo só, que viaja a cada evento. Com o corpo aplicado,
  quem o tivesse marcaria qualquer pedido da loja como pago. Com a leitura, o pior que um token
  vazado consegue é fazer o bee-link perguntar ao Asaas.
- **Ordem.** O evento que chega atrasado não importa: toda leitura traz o estado de agora, e
  `statusAfter` continua sem deixar descer.
- **Parcelamento.** A listagem traz as parcelas juntas, e `plansOf` já as lê como um pagamento só.
- **Custo.** Uma requisição por evento de cobrança do bee-link (os de cobranças de fora não custam
  nada). Um pedido pago gera de um a três eventos: para chegar perto de 25.000 em 12 horas a loja
  precisaria de milhares de pedidos pagos nesse intervalo, e antes disso o `429` é respeitado.

### Receber

1. `asaas-access-token` → SHA-256 → `store_integrations.webhookTokenHash` (índice único). Achada a
   linha, o token selado é aberto e comparado com `timingSafeEqual`. Sem linha, sem cofre ou
   diferente: `401 INTEGRATION_SIGNATURE_INVALID`.
2. Do corpo, lido com tolerância: `id` (sem ele, o SHA-256 dos bytes faz as vezes), `event`, e de
   `payment` os três identificadores.
3. O evento é do bee-link se a loja tem uma linha de `order_payments` com aquele id ou parcelamento,
   ou um pedido cujo id é o `externalReference`; ou se é um `ACCESS_TOKEN_*`. Senão é gravado já
   concluído (`IGNORED`), só com id e nome.
4. `INSERT` em `asaas_events` (único por loja e id). Violação do único: `200 DUPLICATE`.
5. `200`, e o processamento é disparado sem ninguém esperar.

### Processar

Como o outbox de e-mail: as linhas são tomadas com `FOR UPDATE SKIP LOCKED` e um prazo de posse; a
que falha espera 1, 2, 4… minutos, até 8 tentativas. Desistir de um evento não perde o pagamento: a
reconciliação é a rede.

- `PAYMENT_*`: `PaymentSync.sync(loja, pedido)`; se sobrou cobrança aberta ao lado de uma paga, ou o
  pedido está cancelado, `OrderPayments.release`.
- `ACCESS_TOKEN_DISABLED`, `_DELETED`, `_EXPIRED`: `AsaasWebhookKeeper.probe`, uma chamada com a
  chave da loja. Se a chave do evento era a nossa, o `401` marca `NEEDS_RECONNECT`; se era outra
  chave da conta, nada muda. Os outros `ACCESS_TOKEN_*` não são assinados.

### `PaymentSync.sync`

1. Lê o pedido e as linhas com `providerId` (antes de ouvir o Asaas).
2. Lista as cobranças do pedido. Uma linha viva e não paga que não veio na listagem é lida pelo id
   antes de ser dada como sumida (a listagem pode atrasar).
3. Sob a trava da loja: as sumidas viram `CANCELLED`; cada plano com linha viva passa por
   `applyCharge`; um plano pago sem linha viva vira o pagamento do pedido (a pendente que estava no
   lugar é cancelada) ou, se o pedido já tem um pago, um `stray`. Pedido cancelado com pagamento que
   acabou de chegar: `stray`.
4. Depois do commit: `order.payment` no tempo real, se o que o pedido mostra mudou.

`applyCharge` passa a: casar pelo parcelamento; anotar `checkedAt` e a próxima conferência; seguir o
valor e o vencimento que o Asaas diz (um `PAYMENT_UPDATED`); e aceitar **uma** descida, a de
`RECEIVED_IN_CASH` desfeito: a loja declarou no Asaas que recebeu por fora e voltou atrás.

### Reconciliação

A cada minuto, as linhas `PENDING` ou `OVERDUE` com `nextCheckAt` vencido, de lojas com conexão boa,
a mais velha primeiro, 40 por passada. A espera por cobrança cresce: 10, 20, 40 minutos… até 12
horas. `AsaasThrottled` ou loja indisponível: as outras cobranças dessa loja ficam para depois, e as
das outras lojas seguem. Uma linha cujo pedido foi cancelado, ou cujo valor não é mais o do pedido,
vai para `OrderPayments.release` (a remoção que ficou devendo).

### Cancelamento automático

`orders.paymentDueAt`: 3 dias depois de o total fechar (ao colocar o pedido com frete fechado; ao a
loja fechar ou mudar o frete). A rotina pega os pedidos `ONLINE` vencidos, `sync` (que **tem** de
conseguir ouvir o Asaas), e se não há pagamento chama `OrdersService.cancelUnpaid`: o mesmo `move`
de qualquer mudança de status, com o ator `SYSTEM`, que relê tudo sob a trava.

### Banco (uma migration, só acrescenta)

- `asaas_events`: `storeId`, `eventId`, `event`, `orderId`, `outcome`, `attempts`, `nextAttemptAt`,
  `processedAt`, `lastError`. Nada do corpo.
- `order_stray_payments`: `orderId`, `storeId`, `providerId` (único), `reason`, `method`,
  `amountCents`, `paidAt`.
- `order_payments`: `checkedAt`, `checks`, `nextCheckAt`.
- `orders.paymentDueAt`; `store_integrations.webhookCheckedAt`.

## Decisões deste ticket

1. **O estado vem da leitura, não do corpo** (acima).
2. **Um pedido aceito também é cancelado** sem pagamento: a decisão 12 diz que aceitar "não
   bloqueia", e o prazo vale. Entram `RECEIVED`, `ACCEPTED` e `PREPARING`. **`OUT_FOR_DELIVERY` e
   `DELIVERED` ficam fora:** a mercadoria já saiu, e cancelar devolveria ao estoque o que não está
   mais na loja. Esses seguem "aguardando pagamento" para a loja resolver.
3. **Sem conseguir conferir, não cancela.** Asaas fora do ar, `429`, loja desconectada ou em
   `NEEDS_RECONNECT`: o pedido fica, e a rotina tenta na passada seguinte.
4. **Um `ACCESS_TOKEN_*` não marca nada sozinho:** dispara a conferência da chave. O evento não diz
   se a chave é a que o bee-link guarda.
5. **Trocar de chave na mesma conta não apaga cobranças.** "Mesma conta" é o mesmo documento
   mascarado e o mesmo nome. Conta diferente, ou desconectar: apaga, em até 20 segundos.
6. **O `429` é lembrado na memória do processo,** por loja, até o `RateLimit-Reset`. Outro processo
   aprende com o próprio `429`.
7. **Dinheiro que o pedido não pedia tem tabela própria.** O índice de "uma cobrança viva por
   pedido" fica como está, e o Q7 acha ali o que estornar.
8. **O evento de tempo real é um só,** `order.payment`, com o status e `stray` (o motivo, ou nulo).
9. **Evento sem `id`** é gravado pelo SHA-256 dos bytes: repetido continua sendo repetido.
10. **A consulta sob demanda conta a partir da última vez que o Asaas foi ouvido** sobre a cobrança,
    por qualquer caminho: logo depois de criar, não pergunta.

## Fora de escopo

A etapa "Pagamento aprovado", o e-mail de pagamento aprovado, o filtro e o sino do painel, a tela do
pagamento no pedido do painel (Q6). Estorno, `refundedCents`, `PARTIALLY_REFUNDED` e cancelar pedido
pago (Q7). O motivo "não foi pago" no aviso e no e-mail de cancelamento: saem como qualquer
cancelamento.

## Para os próximos tickets

### Q6 (BEELINK-207): etapa e e-mail de pagamento aprovado, painel, sino

- **Onde o pagamento aprovado é sabido:** `PaymentNews.tell` (`apps/api/src/modules/payments/payment-news.ts`)
  é chamado depois do commit sempre que o que o pedido mostra muda, por qualquer caminho (webhook,
  reconciliação, consulta do cliente, `ensure`, `release`). O e-mail deve ser **devido dentro da
  transação** que grava o pago, como `oweStatusEmail` faz com o status: o lugar é `PaymentSync.sync`
  (o bloco sob a trava, onde `before` e `status` são conhecidos) e os dois pontos de `OrderPayments`
  que gravam um plano pago (`settle` e `release`). Um helper único de "virou pago" chamado dos três
  evita esquecer um.
- **O evento de tempo real já existe:** `{ type: "order.payment", orderNumber, status, stray }`. O
  painel já relê a lista e o pedido aberto (`panelKeysOf`), e a vitrine relê a cobrança daquele
  pedido e a página (`shopperReadOf`). O sino e o toast de "pedido pago" entram em
  `apps/web/src/lib/panel-notifications.ts` (`toastOf` já trata `stray`; `status` pago com `stray`
  nulo hoje não diz nada).
- **`ShopOrderPayment.strays`** já vem no pedido do painel e não é desenhado em lugar nenhum: a tela
  do pagamento no pedido do painel é sua. Hoje a loja só fica sabendo pelo toast, que some. Um aviso
  fixo no pedido (e um filtro "com pagamento a resolver") fecha isso. `reason` é `ORDER_CANCELLED`
  ou `ORDER_ALREADY_PAID`.
- **`webhookState: PAUSED`** passa a acontecer de verdade (a checagem diária grava). O painel do Q2
  já mostra o estado; confira a frase com a tela na frente.
- **O cancelamento automático não diz o motivo.** A linha da conversa e o e-mail são os de qualquer
  cancelamento. O evento do pedido tem `actor: SYSTEM`: dá para o Q6 dizer "cancelado por falta de
  pagamento" quando o ator for `SYSTEM` e o canal `ONLINE`.
- **`PAYMENT_POLL_MS` do web** (5 s na tela de pagamento, 10 s na página do pedido) pode ficar mais
  lento agora que o evento chega: cada leitura de uma cobrança pendente continua barata (o Asaas só
  é perguntado uma vez por minuto), então não é urgente.

### Q7 (BEELINK-208): estorno e cancelar pedido pago

O que cada evento de estorno e de chargeback faz **hoje** (todos são gravados em `asaas_events` e
levam a uma leitura da conta, nada mais):

| Evento | O que o Asaas passa a dizer | O que o bee-link grava hoje | O que falta (seu) |
|---|---|---|---|
| `PAYMENT_REFUNDED` | `status: REFUNDED` | a linha vira `REFUNDED`; `refundedCents` continua 0; o pedido não muda | gravar `refundedCents` a partir de `refunds`; decidir o que o pedido faz |
| `PAYMENT_PARTIALLY_REFUNDED` | o status continua `RECEIVED` ou `CONFIRMED`, com `refunds` | nada muda (só `checkedAt`) | `PARTIALLY_REFUNDED` e `refundedCents`: `AsaasCharge` ainda não lê `refunds` |
| `PAYMENT_REFUND_IN_PROGRESS` | `status: REFUND_IN_PROGRESS` | a linha fica como está; `providerStatus` diz | idem |
| `PAYMENT_REFUND_DENIED` | volta a `RECEIVED` ou `CONFIRMED` | a linha fica como está; `providerStatus` diz | avisar a loja de que o estorno foi negado |
| `PAYMENT_CHARGEBACK_REQUESTED`, `_DISPUTE`, `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` | o status correspondente | a linha fica como está (paga); `providerStatus` diz; a loja **não** é avisada | avisar a loja; se ela perde, chega `REFUNDED` |

- **O estorno de um `stray`** é pelo `providerId` de `order_stray_payments` (a cobrança paga a mais).
  A tabela não tem coluna de "resolvido": acrescente (`refundedAt`, ou `settledAt`) quando o estorno
  existir, para o painel parar de avisar.
- **`applyCharge` segue o valor que o Asaas diz** numa linha viva (`changedOf`). Um estorno parcial
  não muda `value` no Asaas, então não há conflito; se o Q7 passar a ler `refunds`, o lugar é o
  mesmo `chargeOf` do cliente HTTP e um campo novo em `ChargePlan`.
- **A única descida de status** é a de `RECEIVED_IN_CASH` desfeito, dentro de `applyCharge`.
  `REFUNDED → ` qualquer coisa continua impossível por `statusAfter`.
- **Cancelar um pedido pago** continua recusado por `refusePaidOrder`; `OrdersService.cancelUnpaid`
  também passa por ela.
- **O gate `api/order-payments-in-payments`** recusa escrita em `order_payments` e
  `order_stray_payments` fora de `modules/payments`: o estorno escreve por uma função de
  `payment-facts.ts`.

## Acréscimos de 06/10/2026: o que mudou enquanto foi feito

- **O prazo do pedido tem coluna própria,** `orders.paymentDueAt`, em vez de uma conta sobre
  `createdAt`: um frete fechado dias depois do pedido dá 3 dias a partir dali, e mudar o frete de
  novo dá mais 3. Um pedido `ONLINE` de antes desta migration, com `paymentDueAt` nulo, nunca é
  cancelado pela rotina (não há nenhum em produção).
- **Quando a conferência falha, o prazo do pedido anda uma hora** (`UNPAID_RETRY_MS`): sem isso, os
  pedidos de uma loja desconectada ficariam para sempre na frente da fila e os outros não seriam
  alcançados.
- **A reconciliação só olha lojas com conexão `CONNECTED`.** As cobranças pendentes de uma loja
  desconectada ou em `NEEDS_RECONNECT` esperam a reconexão.
- **Uma cobrança pendente que não vem na listagem é lida pelo id antes de ser cancelada aqui:** é
  o que o plano do Q3 deixou como "não aparecer na listagem é tratado como sumiu". Custa uma
  requisição a mais só nesse caso.
- **`hearOf` virou uma chamada a `PaymentSync.sync`.** Antes só gravava quando achava pago; agora
  grava o que o Asaas disser (vencida, apagada). Cancelar e mudar o frete continuam não falhando
  quando o Asaas não responde.
- **`applyCharge` segue o valor e o vencimento do Asaas numa linha viva,** e apaga o QR guardado
  quando mudam (a documentação do Pix manda ler o QR de novo). A reconciliação então vê uma cobrança
  de valor diferente do pedido e a apaga, como o `ensure` faria.
- **Um `429` na criação de uma cobrança deixou de ser "resultado desconhecido":** o Asaas recusa
  antes de fazer qualquer coisa. A posse do pedido é solta na hora, em vez de segurar 45 segundos.
- **O gate `api/order-payments-in-payments`** (sugerido no plano do Q3) entrou: a reconciliação
  empurra a próxima conferência por `pushCheck` e `restChecks`, em `payment-facts.ts`.
- **A checagem diária também registra de novo um webhook que sumiu** (apagado à mão no painel do
  Asaas) ou que nunca foi registrado (`webhookState: ERROR` da conexão), com o token que a loja já
  tem. Só existe onde o web é https público.
- **O módulo novo não tem `dto/`:** o corpo do webhook é lido como `unknown`, de propósito (a
  validação global recusaria um campo novo do Asaas), e a resposta é `{ result }`. É o molde do
  receptor do Melhor Envio.
- **Os lotes:** 10 eventos por varredura (com posse de 10 minutos), 40 cobranças e 20 pedidos por
  passada, 20 lojas por passada da checagem diária.

## Acréscimos de 06/10/2026: ver funcionando

API na 3501 e web na 3500, banco `harness_asaas`. Na loja `loja-q4` (do Q4) foi gravada à mão uma
conexão selada de verdade pelo cofre, com uma chave de mentira e um token conhecido, e a cobrança
`pay_mentira_1` voltou a `PENDING`.

| O quê | Rota | Resultado |
|---|---|---|
| Token errado | API e web | `401 INTEGRATION_SIGNATURE_INVALID` |
| Sem o cabeçalho | API | `401` |
| Evento de cobrança de fora | API | `200 {"result":"IGNORED"}`; linha em `asaas_events` já concluída, sem pedido |
| Evento da cobrança do pedido | API e web | `200 {"result":"RECORDED"}`; linha com o pedido, uma tentativa |
| O mesmo evento de novo | API e web | `200 {"result":"DUPLICATE"}`; nenhuma linha nova |
| Corpo `[]`, e evento sem `id` duas vezes | API e web | `200 IGNORED`; o segundo sem `id` é `DUPLICATE` (pelo SHA-256 dos bytes) |
| O que o processamento fez | banco e log | perguntou ao sandbox do Asaas com a chave de mentira, recebeu `401 invalid_access_token_format`, a conexão virou `NEEDS_RECONNECT`, o evento ficou para nova tentativa com o motivo em `lastError`, a cobrança continuou `PENDING` |
| O token nos logs | `api.log`, `web.log` | zero ocorrências; o log da API mostra `"asaas-access-token":"[Redacted]"` |

**O que não deu para exercitar:**

- **O pedido virar pago por um evento mandado à mão.** É consequência direta da decisão 1: o corpo
  do evento não é aplicado, e o estado vem de uma leitura na conta da loja, que sem chave de sandbox
  responde `401`. O que o `curl` mostrou é justamente isso: um evento que diz "pago" não paga nada
  sozinho. O caminho inteiro (evento, leitura, pago, aviso) está no e2e, com o Asaas falso.
- **O tempo real no navegador:** o evento `order.payment` só é publicado quando uma leitura muda o
  pagamento. Está nos testes de `realtime-invalidation` e no e2e (o publicador é espiado).
- **Nada com o Asaas de verdade:** a entrega de um webhook real, a fila pausada e a reativação
  (`PUT /v3/webhooks/{id}`), o `429` com `RateLimit-Reset`, os eventos `ACCESS_TOKEN_*`, a ordem em
  que o Asaas manda os eventos de um parcelamento.
- **A rotina rodando sozinha por dias:** os passos foram chamados nos testes com o relógio que cada
  um nomeia; o `setInterval` de um minuto rodou só enquanto a API esteve de pé na verificação.

## Acréscimos de 06/10/2026: a revisão antes da entrega

Uma leitura independente do diff, feita contra as garantias e sem conhecer o desenho, não achou
defeito grave e apontou dez pontos. O que mudou por causa dela:

1. **Depois de trocar de conta, "conferido no Asaas" queria dizer a conta nova.** Uma cobrança
   pendente que sobrou na conta antiga (o prazo de 20 s acabou, o Asaas falhou) não era achada com a
   chave nova, a linha virava `CANCELLED` e o pedido era cancelado por falta de pagamento, mesmo que
   o cliente tivesse pago o Pix antigo. Agora uma linha criada **antes** da conexão atual cuja
   cobrança a chave não acha não é dada como sumida: `PaymentSync` responde `unsettled`, e o pedido
   não é cancelado sozinho. A loja cancela à mão se quiser.
2. **Cartão em análise manual do Asaas** (`AWAITING_RISK_ANALYSIS`) também é `unsettled`: o pedido
   não é cancelado enquanto o Asaas analisa.
3. **Uma cobrança ouvida pela primeira vez já em estorno ou chargeback** ficava `PENDING` (a linha
   existia e a palavra "não dizia nada"), e o pedido podia ser cancelado com dinheiro pago. Agora
   essas palavras fazem de uma linha ainda não paga uma paga (`CONFIRMED`); numa já paga, nada muda.
4. **Evento de loja com a chave recusada** gastava as 8 tentativas em duas horas. Agora espera a
   reconexão, de hora em hora, sem gastar tentativa, por até 14 dias (o tempo que o próprio Asaas
   guardaria o evento).
5. **A rotina e o disparo do receptor** varriam os eventos ao mesmo tempo no mesmo processo. A
   rotina passa pelo mesmo `dispatch`. O lote caiu para 10 e a posse subiu para 10 minutos.
6. **Duas réplicas da API** perguntavam ao Asaas em dobro na reconciliação. `pushCheck` agora só
   deixa perguntar quem conseguiu empurrar a vez.
7. **`release` com duas cobranças pagas** tentava gravar a segunda como a do pedido e batia no índice
   único (o erro ia para `lastError`). Agora a que o pedido já conta fica, e a outra vira `stray`.
8. **Conta renomeada no Asaas** contava como outra conta, e as pendentes eram apagadas. "Mesma
   conta" passou a ser o documento; o nome só decide quando nenhum dos dois lados tem documento.

O que a revisão apontou e fica como está, com dono:

- **Caudas sem fim.** Uma cobrança pendente num pedido já saído para entrega, ou de uma conta que a
  loja deixou, é conferida a cada 12 horas para sempre; um pedido não pago de loja desconectada tem
  o prazo empurrado de hora em hora para sempre. Custam pouco. O Q6, que dá ao painel a tela do
  pagamento, é onde a loja resolve esses casos.
- **Dois processos e o `429`.** A memória do `429` é por processo, e o cancelamento automático não
  disputa a vez: duas réplicas conferem o mesmo pedido duas vezes (o resultado é o mesmo).
- **A checagem diária pode registrar um webhook a mais** se a resposta de um registro se perder (o
  id não fica guardado). Os eventos chegariam duas vezes; se o Asaas der ids diferentes a cada
  webhook, cada um custa uma leitura. Só o sandbox diz.
- **Um corpo que não é JSON** responde `400` do Fastify antes do receptor. O Asaas só manda JSON.
- **Uma remoção em curso no instante em que a chave troca** pode reler a cobrança com a chave nova.
