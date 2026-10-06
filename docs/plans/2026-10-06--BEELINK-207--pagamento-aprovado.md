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

## Acréscimos de 06/10/2026: o que mudou enquanto foi feito

- **`OrderPayments.converge` não chamava `PaymentNews.tell`** quando achava a cobrança paga durante
  um `ensure` (o cliente clica em "Gerar pagamento" e o Asaas já tem o pago). Passou a chamar: sem
  isso o `toldAt` só seria tomado no evento seguinte, e o toast sairia atrasado.
- **`OrderSummary.strays` é um número,** não um booleano: a linha da lista só precisa saber se há, e
  o `_count` do Prisma já entrega quantos.
- **O filtro `PAID` inclui um pedido cancelado que guarda dinheiro** (pago depois de cancelado). É
  o que a definição diz ("guarda dinheiro do cliente") e é o que a loja precisa achar; a linha dele
  diz "Pago" e "Pagamento a resolver".
- **Status e pagamento juntos no filtro:** os dois se somam. Em `PENDING` com um status pedido, vale
  o status pedido (a condição "não cancelado" do pagamento cede).
- **Um pedido novo e pago aparece duas vezes no sino** ("Novo pedido" e "Pedido pago"), e conta
  duas: são duas notícias, e cada uma some pelo seu motivo (aceitar, abrir).
- **A etapa do pagamento com o pedido ainda em "recebido" é a etapa atual** (o anel), mesmo paga: o
  check fica para quando a loja confirmar. Com a loja adiante e o pagamento pendente, a etapa fica
  "a seguir" no meio das feitas.
- **O histórico do pedido do cliente ganhou a linha "Pagamento aprovado"**, na ordem em que caiu.
- **O texto do `emptyFiltered` da lista** passou a "essa busca ou esses filtros".
- **O e2e do e-mail que falha e volta** espera com `vi.waitFor`: a varredura disparada por
  `PaymentNews` pode ainda estar gravando a nova tentativa quando o teste a adianta.

## Acréscimos de 06/10/2026: ver funcionando

API na 3501 e web na 3500, banco `harness_asaas`, loja `loja-q4`. Sem chave de sandbox, os estados
foram gravados à mão (`order_payments`, `order_paid_notices`, `order_stray_payments`, a linha
`PAYMENT_APPROVED` em `order_messages`). Os pedidos 3 a 6 foram feitos pela API, como cliente.
Capturas em `.claude/worktrees/pagamentos-pr/shots-207/`.

| O quê | Resultado |
|---|---|
| Pedido do cliente pendente, 1280 e 390 px | "Pedido feito" feito, "Aguardando pagamento" atual, o resto a seguir; sem rolagem lateral |
| O mesmo pedido pago | "Pagamento aprovado" com a data; o histórico com a linha; a caixa diz "Pagamento aprovado" |
| Pedido de cartão pago e aceito | "Pagamento aprovado" feito, "Loja confirmou" atual |
| Comprovante de pedido online pago | "Pagamento online: Pix · Pagamento aprovado" |
| E-mail | a linha de `order_paid_notices` com `sentAt` nulo foi paga pela varredura de verdade: um e-mail no Mailpit, "Loja Q4 — pagamento do pedido nº 1 aprovado", com o valor, o link do pedido e o de desligar; `attempts = 1` |
| Lista do painel, 1280 e 390 px | "Pago", "Aguardando pagamento", "Pagamento a resolver" na célula; o pedido combinado com a loja não diz nada |
| Filtros | `?payment=PAID` → 4, 3, 1; `PENDING` → 5; `STRAY` → 4; com `status=DELIVERED` → "Nenhum pedido com essa busca ou esses filtros." |
| Sino | 5 (três novos, dois pagos), com "Pedido nº 3 pago" e "Pedido nº 1 pago"; abrir o pedido 1 → 4; abrir o 3 → 3; o título da aba acompanha |
| Pedido do painel pago (Pix e cartão em 3x), com recusa do Asaas, e com dinheiro indevido | o cartão do pagamento como desenhado; o aviso fixo com o motivo, o valor e o que fazer |
| Conversa, dos dois lados | "Pagamento aprovado." para o cliente, "Pagamento aprovado" para a loja |

**O que não deu para exercitar no navegador:**

- **O toast de "pedido pago" e a tela mudando sozinha:** o evento `order.payment` só sai de
  `PaymentNews.tell`, que só roda quando uma leitura do Asaas muda o pagamento. Está no e2e (o
  publicador é espiado: `approved: true` uma vez, `false` depois) e em `panel-notifications.test.ts`.
- **O pedido virar pago de ponta a ponta** (evento, leitura, e-mail, linha, sino): só no e2e, com o
  Asaas falso. No navegador o e-mail saiu da varredura do outbox, não do disparo de `tell`.
- **O cancelamento por falta de pagamento** no navegador e no Mailpit: a rotina só cancela depois
  de conferir no Asaas. A frase da conversa e a do e-mail estão no e2e
  (`payment-reconciliation.e2e-spec.ts`) e nos testes das libs.
- **Nada com o Asaas de verdade.**

## Para os próximos tickets

### Q7 (BEELINK-208): estorno e cancelar pedido pago

- **Marcar um `stray` como resolvido.** `order_stray_payments` continua sem coluna de resolvido: o
  aviso "Pagamento a resolver" no pedido, a marca na lista e o filtro `STRAY` (`payment-filter.ts`)
  nunca somem. Quando o estorno existir, acrescente a coluna e troque `strayPayments: { some: {} }`
  e o `_count` de `ORDER_SUMMARY_INCLUDE` por "não resolvidos". A frase `strayAction` (em
  `packages/ui/src/locales/`) manda estornar pelo painel do Asaas: passa a ser um botão.
- **O cartão do pagamento no pedido do painel** é `OrderPaymentCard`
  (`packages/ui/src/blocks/orders/order-payment-card.tsx`): o botão de estornar, o valor estornado
  (`refundedCents` ainda não é desenhado) e o motivo entram ali. `providerStatuses` já tem as frases
  de `REFUND_REQUESTED`, `REFUND_IN_PROGRESS` e dos chargebacks.
- **`order_paid_notices` é uma linha por pedido, para sempre.** Um pedido estornado e pago de novo
  não avisa de novo. O e-mail de "pagamento estornado" pede o próprio outbox (ou uma coluna de
  tipo); `OrderPaidMailer` desiste de um aviso cujo pagamento já não guarda dinheiro.
- **A etapa do cliente continua "Pagamento aprovado" num pedido estornado** (decisão 7); a caixa de
  pagamento é que diz o estorno. Se o Q7 quiser a etapa dizendo "estornado", o lugar é
  `paymentStepOf` em `apps/web/src/lib/order-steps.ts`.
- **A página do pedido do cliente diz "Cancelado pela loja" num cancelamento automático.**
  `CustomerOrder.cancelledBy` só tem dois lados (`sideOf('SYSTEM')` é `SHOP`). A conversa e o
  e-mail já dizem o motivo; a página pede um terceiro valor no contrato.
- **O filtro `PAID` inclui `PARTIALLY_REFUNDED`** e exclui `REFUNDED`; a linha da lista já diz
  "Estornado" e "Estornado em parte" (`orderPaymentStateOf`).
- **Cancelar um pedido pago com estorno junto** deve decidir o que fazer com o aviso do sino
  (`seenAt`) e com a linha "Pagamento aprovado" da conversa, que fica como história.
