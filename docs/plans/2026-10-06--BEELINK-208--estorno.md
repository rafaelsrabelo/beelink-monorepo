# BEELINK-208 — Q7: o lojista estorna o pagamento e cancela o pedido pago pelo painel

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), sétimo e último ticket. Depende do Q5 (BEELINK-206: `PaymentSync`,
> `applyCharge`, `order_stray_payments`) e do Q6 (BEELINK-207: `OrderPaymentCard`, o filtro, o aviso
> de pago). Onde o Plane diz Mercado Pago, é **Asaas**, na conta do próprio lojista.
> Área: full-stack (contrato, banco, API, design system, web) · Tipo: novo · Tamanho: M no Plane, G
> na prática.

## Objetivo

O lojista devolve o dinheiro sem sair do bee-link: estorna o pagamento de um pedido, inteiro ou em
parte, com o motivo; cancela um pedido pago com o estorno junto; e estorna o dinheiro que chegou sem
o pedido pedir. O cliente vê o estorno no pedido, lê a linha na conversa e recebe um e-mail. Um
clique nunca vira dois estornos.

## Definição de Pronto

1. **Estornar pelo pedido** (`POST /stores/:slug/orders/:number/refunds`, só o dono da loja): valor
   explícito em centavos, motivo obrigatório. Nunca mais do que o pago menos o já estornado e o que
   está em estorno. O Asaas é chamado com `value` sempre, convertido por `asaas-money.ts`.
2. **Um clique, um estorno.** Duplo clique, duas abas e nova tentativa depois de um timeout não
   estornam em dobro: uma chamada por vez por cobrança (linha `REQUESTED` com posse, sob a trava da
   loja), a tela diz quanto viu por estornar (`refundableCents`) e é recusada se isso mudou, e uma
   resposta ambígua do Asaas é seguida de uma **leitura** da cobrança antes de qualquer outra chamada.
3. **O estorno entra pela mesma porta.** `applyCharge` passa a ler `refunds` da cobrança: o valor
   estornado, `PARTIALLY_REFUNDED` e `REFUNDED` saem dali, por qualquer caminho (resposta do estorno,
   webhook, reconciliação, consulta). Um estorno feito por fora, no painel do Asaas, aparece aqui.
4. **Cada recusa em palavras para a loja:** saldo insuficiente na conta Asaas, cobrança que ainda
   não pode ser estornada (em análise, já em estorno, em contestação), valor acima do que resta,
   tela desatualizada, estorno em andamento, Asaas sem responder, e as palavras do próprio Asaas
   quando ele recusa por outro motivo.
5. **"Em processamento"** enquanto o Asaas não conclui (cartão), "concluído" depois.
6. **Cancelar um pedido pago pede o estorno junto.** A loja cancela dizendo o motivo; o estorno do
   que ainda não foi devolvido é pedido **antes**, e o pedido só é cancelado se o Asaas aceitou. Se o
   estorno falha, o pedido fica como está e a loja lê por quê. O cliente continua sem poder cancelar
   um pedido pago, e a tela dele diz para falar com a loja.
7. **Dinheiro indevido (`strays`)** é estornado pela mesma rota, e o registro ganha `resolvedAt`: o
   aviso do pedido, a marca da lista e o filtro `STRAY` somem quando o estorno é aceito (ou quando o
   Asaas diz que a cobrança foi estornada por fora).
8. **O cliente vê o estorno:** no pedido (valor, quando, total ou parcial, em processamento ou
   concluído), na etapa do pagamento, numa linha da conversa e num e-mail, uma vez por estorno, só
   para conta com e-mail confirmado e `notifyOrders` ligado, por um outbox próprio.
9. **`cancelledBy` ganha `SYSTEM`:** a página do cliente diz "cancelado por falta de pagamento".
10. **Painel:** no cartão do pagamento, o botão de estornar, os estornos feitos (valor, motivo,
    situação, a recusa) e o que resta; o formulário em rota própria
    (`/admin/<slug>/pedidos/<n>/estorno`); a lista ganha a situação e o filtro "estornado".
11. **Testes:** o Asaas falso ganha estorno (aceito, recusado por saldo, ambíguo, parcelado, feito
    por fora). e2e `test/order-refunds.e2e-spec.ts` com os casos do ticket. Unitários das regras
    novas e do cliente HTTP. Blocos com story e teste, telas, handlers do BFF.
12. **Documentos:** mapas de superfície da API e do web, regra 10 de `apps/api/AGENTS.md`,
    `docs/product` onde o texto do produto muda, este plano.
13. **`pnpm ci-check` verde**, suíte e2e da API inteira, build de `api` e `web`, `delivery-check`.

## O que a documentação do Asaas confirmou (lido em 06/10/2026)

| O quê | Página | O que usamos |
|---|---|---|
| Estornar uma cobrança | `reference/estornar-cobranca` | `POST /v3/payments/{id}/refund`, com `value` (número, opcional: sem ele é total) e `description` (o motivo). Responde `200` com a cobrança inteira, com `refunds`. `400` (inclui falta de saldo num Pix recém-recebido: as taxas não voltam e diminuem o saldo), `401`, `404`. Cartão: com a cobrança `CONFIRMED` ou `RECEIVED`, até 10 dias úteis para aparecer na fatura. Pix: total ou vários parciais, até o valor da cobrança |
| Estornar um parcelamento | `reference/estornar-parcelamento` | `POST /v3/installments/{id}/refund`, com `value` opcional (**sem** `description`). Responde o parcelamento, com `refunds`. A página manda, depois de um timeout ou resposta inconclusiva, **consultar o parcelamento antes de tentar de novo** |
| O formato de `refunds` | `reference/recuperar-uma-unica-cobranca`, `docs/estornos` | Cada item: `dateCreated`, `status`, `value`, `description`, `effectiveDate` (Pix), `endToEndIdentifier` (Pix), `transactionReceiptUrl`, `refundedSplits`. **Não tem id.** `status`: `PENDING`, `AWAITING_CRITICAL_ACTION_AUTHORIZATION`, `AWAITING_CUSTOMER_EXTERNAL_AUTHORIZATION`, `CANCELLED`, `DONE`. A página diz: "a existência do array `refunds` não significa que o valor já foi devolvido. Considere o estorno concluído somente quando o campo `status` retornar `DONE`" |
| Ler um parcelamento | `reference/recuperar-um-unico-parcelamento` | `GET /v3/installments/{id}` responde `refunds`, e cada item traz também `paymentId` |
| Status da cobrança | `reference/recuperar-uma-unica-cobranca` | `REFUNDED`, `REFUND_REQUESTED`, `REFUND_IN_PROGRESS` e os de chargeback, como no briefing |
| Eventos | `docs/webhook-para-cobrancas` | `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_REFUND_DENIED` ("disponível somente para boletos"). O exemplo do corpo traz `"refunds": null` |

O que a documentação **não** diz, e só o sandbox dirá: o `code` de cada recusa de estorno (a de
saldo é reconhecida pela palavra "saldo" na descrição); se a listagem `GET /v3/payments` traz
`refunds` preenchido; como um estorno parcial de parcelamento aparece em cada parcela. O desenho
abaixo não depende de nenhuma das três.

## Desenho

### `order_refunds`: uma linha por estorno

O `refunds` do Asaas não tem id, então o bee-link guarda os seus: `order_refunds`, uma linha por
estorno pedido aqui (origem `PANEL` ou `CANCELLATION`) ou descoberto no Asaas (`ASAAS`), com a
cobrança (`providerId`), o valor, o motivo, quem pediu e a situação:

- `REQUESTED`: a chamada está em curso, ou ficou sem resposta. Tem posse (`claimedUntil`). Só existe
  **uma por cobrança** (índice único parcial): é o que faz de dois cliques um estorno.
- `PROCESSING`: o Asaas aceitou e ainda não concluiu. `DONE`: concluído.
- `REFUSED`: o Asaas recusou, ou não respondeu e a leitura mostrou que nada foi feito. Guarda as
  palavras do Asaas para a loja. `DENIED`: aceito e depois cancelado pelo Asaas.

O que `order_payments` diz de estorno (`refundedCents`, `refundingCents`, `PARTIALLY_REFUNDED`,
`REFUNDED`) e o `resolvedAt` de um `stray` são **derivados** dessas linhas, num lugar só
(`settleRefundMoney`).

### Do Asaas para as linhas: totais, não itens

`chargeOf` passa a ler `refunds`; `plansOf` soma, por plano, o concluído (`DONE`, ou a cobrança
inteira quando o status é `REFUNDED`), o pendente e o cancelado. `reconcileRefunds` (em
`payment-refunds.ts`, chamado por `applyCharge`) casa esses **totais** com as linhas, da mais velha
para a mais nova: coberta pelo concluído vira `DONE`; coberta pelo concluído mais o pendente vira
`PROCESSING`; o que sobra do Asaas sem linha vira uma linha `ASAAS` (o estorno feito por fora). Uma
linha só é dada como `DENIED` com um estorno `CANCELLED` à vista, e uma `REQUESTED` só é dada como
não feita depois de a posse vencer. Com `refunds` ausente na resposta, nada é concluído nem negado:
só o status `REFUNDED` fala.

A primeira vez que uma linha é aceita (`PROCESSING` ou `DONE`), dentro da mesma transação: a linha
da conversa (`PAYMENT_REFUNDED`, com o valor) e a linha de `order_refund_notices` (o outbox do
e-mail, única por estorno; nasce paga quando o e-mail não é devido).

### Pedir um estorno (`OrderRefunds.refund`)

1. Sob a trava da loja: acha a cobrança (a paga do pedido, ou a do `stray`), recusa o que não pode
   (nada a estornar, palavra do Asaas que não deixa, `REQUESTED` com posse viva, tela desatualizada,
   valor acima do que resta) e grava a linha `REQUESTED`. Commit.
2. Sem trava: `POST …/refund` (ou o do parcelamento), sempre com `value`.
3. Aceito: sob a trava, os totais da resposta passam por `reconcileRefunds`; a linha vira
   `PROCESSING` ou `DONE`. Depois do commit, `PaymentNews.tell` e uma leitura (`PaymentSync`) que
   traz a palavra nova do Asaas.
4. Recusado: a linha vira `REFUSED` com as palavras do Asaas; a loja lê o código e a frase.
5. Sem resposta: **lê** a cobrança (`GET /payments/{id}` ou `/installments/{id}`). O estorno está
   lá: aceito. Não está: a linha fica `REQUESTED` por 45 s (pode aparecer) e a loja lê "não deu
   para confirmar". A tentativa seguinte começa lendo de novo.
6. `429`, chave recusada ou loja desconectada: nada foi feito, a linha é apagada.

### Cancelar um pedido pago

`PATCH …/orders/:number/status` com `CANCELLED` aceita `refund: { reason, refundableCents }`. Antes
da transação do pedido: se o pedido guarda dinheiro ainda não devolvido, o estorno do que resta é
pedido (sem `refund` no corpo: `409 ORDER_PAID`, como antes, e a tela pede o motivo). Só com o
estorno aceito a transação roda; dentro dela, a guarda passa a ser "nenhum dinheiro sem estorno
aceito". Se o estorno foi aceito e o cancelamento falhou por outro motivo, o pedido fica pago e
estornado, e a loja cancela de novo sem novo estorno.

Um pedido cancelado com o estorno em processamento não vira `stray`: `noteStray` não anota um
pagamento cujo estorno já cobre tudo.

### Banco (uma migration, só acrescenta)

- `order_refunds` e `order_refund_notices`.
- `order_payments.refundingCents`; `order_stray_payments.resolvedAt`.
- `order_messages.refundCents` e o valor `PAYMENT_REFUNDED` em `OrderMessageNotice`.

### Contrato

- `OrderRefund`, `ShopOrderRefund`, `OrderRefundStatus`, `OrderRefundOrigin`.
- `OrderPayment.refundingCents` e `.refunds`; `ShopOrderPayment.refundableCents`.
- `StrayPayment.id`, `.resolvedAt`, `.refundableCents`.
- `RefundOrderRequest`, `OrderRefundErrorCode` e os `details`.
- `UpdateOrderStatusRequest.refund`; `OrderPaymentFilter` ganha `REFUNDED`.
- `OrderCancelledBy = OrderPlacedBy | "SYSTEM"`.
- `ConversationRefundNotice` (`kind: "REFUND"`).

## Decisões deste ticket

1. **Totais, não itens.** Sem id nos `refunds` do Asaas, casar item a item seria adivinhar. Os
   totais dizem o que importa (quanto voltou, quanto está voltando) e não erram a soma.
2. **Conservador ao negar.** Uma linha `PROCESSING` só vira `DENIED` com um `CANCELLED` à vista no
   Asaas; a falta de `refunds` numa listagem nunca desfaz um estorno aceito.
3. **A tela diz o que viu** (`refundableCents`). É o que separa "duas abas" de "dois estornos
   parciais de propósito": a segunda aba é recusada com `REFUND_STALE` e relê.
4. **Estorno total não cancela o pedido.** São dois atos: a loja pode devolver o dinheiro e manter
   o pedido (acerto por fora). Cancelar é que pede o estorno.
5. **Cancelar estorna primeiro.** Dinheiro devolvido com pedido de pé é reparável (a loja cancela);
   pedido cancelado com dinheiro preso seria um `stray` criado por nós.
6. **A recusa de saldo é reconhecida pela palavra "saldo"** na descrição do Asaas: a documentação
   não dá o código. O que não for reconhecido é mostrado com as palavras do Asaas.
7. **`REFUND_NOT_READY` é decidido aqui,** pela palavra do Asaas que a linha guarda
   (`providerStatus`): só `CONFIRMED`, `RECEIVED` e `DUNNING_RECEIVED` deixam estornar.
8. **O e-mail sai quando o estorno é aceito,** não quando conclui: no cartão a conclusão leva dias,
   e o cliente quer saber que o dinheiro está voltando. O texto diz o prazo.
9. **Um estorno feito por fora também avisa o cliente** (linha `ASAAS`): o dinheiro voltou.
10. **A etapa do cliente** diz "Pagamento estornado" quando tudo voltou, e continua "Pagamento
    aprovado" num estorno parcial; a caixa do pagamento diz o valor.
11. **`cancelledBy: "SYSTEM"`** e não "UNPAID": o campo diz quem, e o sistema só cancela por um
    motivo. A frase é da tela.
12. **Só o dono estorna:** todas as rotas do painel já passam por `ownedStoreId`.

## Fora de escopo

Marcar um `stray` como resolvido à mão, sem estorno. Um toast de "estorno negado" ou "concluído" no
painel (o cartão do pagamento mostra). Avisar a loja de um chargeback. Estornar um pedido `OFFLINE`.
Desfazer um estorno.
