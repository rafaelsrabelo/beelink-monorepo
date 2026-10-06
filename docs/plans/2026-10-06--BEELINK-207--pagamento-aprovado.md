# BEELINK-207 — Q6: o pedido pago avisa o cliente e a loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), sexto ticket. Depende do Q5 (BEELINK-206: `PaymentSync`, `applyCharge`,
> `PaymentNews`, `order_stray_payments`, o evento `order.payment`). Onde o Plane diz Mercado Pago, é
> **Asaas**, na conta do próprio lojista.
> Área: full-stack (contrato, banco, API, design system, web) · Tipo: novo · Tamanho: M.

## Objetivo

Todo mundo sabe que o pedido está pago. O cliente vê a etapa "Pagamento aprovado" no pedido, recebe
um e-mail e lê a linha na conversa. A loja vê o pagamento no pedido do painel, filtra pagos e
pendentes na lista, e o sino avisa "pedido pago" até alguém abrir o pedido. O dinheiro que chegou sem
o pedido pedir deixa de viver só num toast. E o cancelamento por falta de pagamento diz por quê.

## Definição de Pronto

1. **Etapa "Pagamento aprovado"** nas etapas do pedido do cliente, só em pedido `ONLINE`, depois de
   "pedido feito": marcada, com a data, quando o pagamento está `CONFIRMED` ou `RECEIVED`; enquanto
   não, diz "Aguardando pagamento". Pedido `OFFLINE` tem as mesmas etapas de antes. A palavra é a
   mesma da caixa de pagamento (`orderPayApproved`, `orderPayAwaiting`).
2. **O comprovante** de um pedido online diz se foi pago.
3. **O pagamento no pedido do painel:** forma, parcelas, valor, situação em palavras, quando foi
   pago e a última recusa do Asaas. Bloco novo em `packages/ui`, com story e teste por estado.
4. **Dinheiro indevido (`strays`)** desenhado no pedido do painel, fixo, com o motivo, o valor, a
   forma, quando chegou e o que a loja faz (estornar pelo painel do Asaas).
5. **A lista de pedidos filtra** por pagamento: pagos, aguardando pagamento e com dinheiro a
   resolver. No contrato (`OrderListQuery.payment`), na API e na tela (no endereço, como o status).
   A linha de um pedido online diz a situação do pagamento.
6. **O sino avisa "pedido pago"** uma vez por pagamento: um toast no instante (evento
   `order.payment` com `approved`) e um item no sino, contado, até a loja abrir o pedido.
7. **E-mail de pagamento aprovado** ao cliente: pelo outbox, uma vez por pedido (evento repetido,
   reconciliação, `CONFIRMED` e depois `RECEIVED` não repetem), só para conta com e-mail confirmado
   e `notifyOrders` ligado, em texto e HTML, pt-BR, no molde dos e-mails de status.
8. **A conversa do pedido** ganha a linha "Pagamento aprovado", uma vez, não lida para o cliente.
9. **O cancelamento automático diz o motivo** na linha da conversa e no e-mail.
10. **Testes:** unitários das regras novas; e2e da API (`test/payment-approved.e2e-spec.ts`: o
    e-mail sai uma vez; não sai com `notifyOrders` desligado; a linha da conversa; o evento com
    `approved` uma vez; o filtro; o aviso visto; o motivo do cancelamento); blocos com story e teste;
    telas e libs do web.
11. **Documentos:** mapas de superfície da API e do web, `apps/api/AGENTS.md` onde a regra muda,
    este plano.
12. **`pnpm ci-check` verde**, suíte e2e da API inteira, build de `api` e `web`, `delivery-check`.

## Desenho

### "Virou pago" é sabido num lugar só

`applyCharge` (`payment-facts.ts`) é a porta por onde todo fato do Asaas entra, chamado por
`PaymentSync.sync`, `OrderPayments.settle` e `OrderPayments.release`. É ele que sabe que uma linha
que não guardava dinheiro passou a guardar. Nesse instante, dentro da mesma transação, chama
`tellPaid`:

- grava `order_paid_notices` (uma linha por pedido, `orderId` único): é o **fato de que o pedido foi
  avisado como pago**, e é o outbox do e-mail. Já existe: não faz mais nada (é o "uma vez");
- escreve a linha da conversa (`notePaymentApproved`, em `conversations/`, como `noteOrderStatus`);
- decide se o e-mail é devido (conta com e-mail confirmado e `notifyOrders`, lidos ali). Não devido:
  a linha nasce com `sentAt` preenchido, que no `OutboxMailer` já quer dizer "enviado, ou não vale
  mais enviar".

Um pedido **cancelado** que recebe dinheiro não é avisado como pago: isso é um `stray`, e a loja vai
estornar. Uma cobrança ouvida pela primeira vez já `REFUNDED` também não.

Depois do commit, `PaymentNews.tell` toma `order_paid_notices.toldAt` (um `updateMany` com
`toldAt: null`): quem conseguiu publica o `order.payment` com `approved: true` e dispara o
`OrderPaidMailer`. Os outros eventos do mesmo pagamento (`CONFIRMED` → `RECEIVED` 32 dias depois, no
cartão) saem com `approved: false`. `OrderPayments.converge`, quando acha pago durante um `ensure`,
passa a chamar `tell` (hoje não chama).

### O sino

O sino é derivado de leituras que o tempo real refaz (pedidos `RECEIVED`, conversas não lidas). O
pedido pago entra do mesmo jeito: `GET /stores/:slug/orders?payment=PAID_UNSEEN`, e some quando a
loja abre o pedido: a tela do pedido chama `POST /stores/:slug/orders/:number/payment/seen`, que
grava `order_paid_notices.seenAt`. O toast usa o `approved` do evento.

### Banco (uma migration, só acrescenta)

- `order_paid_notices`: `orderId` (único), `storeId`, `toldAt`, `seenAt`, e as colunas de todo
  outbox (`attempts`, `nextAttemptAt`, `sentAt`, `createdAt`).
- `order_messages.notice` (`PAYMENT_APPROVED`, `CANCELLED_UNPAID`), anulável. O CHECK que dizia
  "aviso tem status" passa a dizer "aviso tem status ou `notice`": afrouxa, não aperta.

### Contrato

- `OrderPaymentBrief.paidAt`; `ShopOrderPayment.unseen`; `OrderSummary.strays` (quantos).
- `OrderPaymentFilter = "PAID" | "PENDING" | "PAID_UNSEEN" | "STRAY"` e `OrderListQuery.payment`.
- `RealtimeEvent` `order.payment` ganha `approved: boolean`.
- `ConversationStatusNotice.unpaid`, `ConversationPaymentNotice` (`kind: "PAYMENT"`), e o mesmo em
  `ConversationLastMessage`.

### Telas

- **Cliente:** `orderStepsOf` insere a etapa depois de "Pedido feito". Com o pedido ainda em
  `RECEIVED`, "Pedido feito" fica feito e a etapa do pagamento é a atual; adiante, ela fica feita
  (paga) ou por fazer (ainda não paga, a loja seguiu sem esperar). O histórico ganha a linha do
  pagamento; o comprovante, a situação.
- **Painel:** `OrderPaymentCard` (bloco novo) na coluna lateral do pedido, com `strays` dentro, em
  destaque. Lista: um segundo grupo de filtro e a situação na célula de pagamento.

## Decisões deste ticket

1. **Uma tabela para o aviso de pago** (`order_paid_notices`), em vez de três marcas espalhadas: o
   único por pedido é o "uma vez", as colunas de outbox são o e-mail, `toldAt` é o toast e `seenAt`
   é o sino.
2. **"Visto" é abrir o pedido no painel**, por qualquer pessoa da loja. Não há "visto" por usuário.
3. **`PENDING` no filtro** é pedido `ONLINE`, não cancelado, sem nenhuma cobrança que foi paga.
   **`PAID`** é o que guarda dinheiro (`CONFIRMED`, `RECEIVED`, `PARTIALLY_REFUNDED`). Estornado por
   inteiro não é nenhum dos dois.
4. **O filtro "com dinheiro a resolver" (`STRAY`)** entra junto: sem ele, o aviso fixo só é achado
   por quem abre o pedido certo. Não há como marcar resolvido até o Q7 (a tabela não tem a coluna).
5. **O motivo do cancelamento no e-mail é derivado** na hora do envio (pedido `ONLINE` cujo último
   evento `CANCELLED` tem ator `SYSTEM`); na conversa é gravado na linha (`notice`), porque a linha
   é contada "como foi", igual ao status.
6. **Pedido cancelado que recebe dinheiro não ganha e-mail de pagamento aprovado.**
7. **A etapa de um pagamento estornado** (`REFUNDED`, `PARTIALLY_REFUNDED`) continua dizendo
   "Pagamento aprovado" com a data: foi aprovado; a caixa de pagamento diz o estorno. O Q7 decide.

## Fora de escopo

Estorno e cancelar pedido pago (Q7). Marcar um `stray` como resolvido (Q7). A página do pedido do
cliente dizer "cancelado por falta de pagamento" no lugar de "cancelado pela loja" (o contrato
`cancelledBy` não tem esse lado; fica anotado para o Q7). Mudar `PAYMENT_POLL_MS`.
