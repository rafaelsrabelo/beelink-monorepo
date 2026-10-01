# BEELINK-237 — Épico U: cashback da loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> O estudo do épico, antes de qualquer tarefa começar. Cada tarefa (U1 a U7) escreve o seu próprio plano
> quando for implementada; este aqui registra o desenho comum a todas e por que ele é assim.

## O pedido

Rafael, 01/10/2026: cashback configurável por loja, para usar dentro da plataforma; promoção de 15% na
primeira compra; cupons de 10%.

| Pedido | Onde está |
|---|---|
| Cupom de 10% | Já cabe no Épico O (BEELINK-189): O1, O2 e O5. É configuração, não código novo |
| 15% na primeira compra | Não cabia no Épico O. Virou o **O6 (BEELINK-245)**, depois do O2 |
| Cashback | **Épico U (BEELINK-237)**, U1 (BEELINK-238) a U7 (BEELINK-244) |

## O que existe hoje

- `Order` guarda `subtotalCents`, `deliveryFeeCents`, `discountCents` e `totalCents`
  (`apps/api/prisma/schema/order.prisma`). O desconto é um número digitado pelo lojista; o pedido do
  carrinho grava zero (`customer-orders.service.ts`).
- `totalsOf` (`apps/api/src/modules/orders/order-totals.ts`) é o único lugar que soma um pedido, e recusa
  total negativo.
- `OrderPlacement.place` (`order-placement.ts`) grava o pedido numa transação só, a do painel e a do
  carrinho. `settleCancellation` (`order-cancellation.ts`) é o que o cancelamento desfaz, de quem quer
  que cancele.
- `Customer` é o cadastro da pessoa **naquela loja**, com `ordersCount` e `totalSpentCents` mantidos pela
  transação do pedido (cancelado não conta). `lockCustomer` (`customer-lock.ts`) é a trava que toda
  mudança sobre o cadastro pega primeiro.
- O status do pedido anda para a frente e para trás (só `CANCELLED` é final), então “entregue” pode ser
  desfeito.
- O bee-link não processa pagamento (docs/product, "Checkout"). A forma de pagamento é um rótulo.
- Não existe promoção, cupom, nem saldo de cliente.

## Decisões

### 1. Cashback é crédito da loja, não dinheiro

O saldo pertence ao `Customer`, que já é por loja. Ganho na loja A só vale na loja A, não se saca e não
se transfere.

Por quê: o crédito é uma dívida da loja com o cliente. Um crédito que valesse em qualquer loja faria a
loja B entregar mercadoria por uma dívida da loja A, e alguém teria que acertar isso entre os dois
lojistas. Esse alguém seria o bee-link, o que contradiz as duas frases em que o produto se apoia: "o
dinheiro nunca passa pelo bee-link" e "nenhuma loja sabe da outra". Também é o que mantém o cashback
fora de qualquer leitura de conta de pagamento ou moeda eletrônica.

**Fica a confirmar com o Rafael**: "usar dentro da plataforma" foi lido como "usar comprando, não
sacando". Se a intenção era crédito entre lojas, o épico muda de natureza.

### 2. As regras são da loja

Um registro por loja, com:

| Campo | Significado |
|---|---|
| `enabled` | ligado ou desligado |
| `rateBps` | quanto devolve, em basis points (500 = 5,00%), a mesma unidade dos descontos do Épico O |
| `expiresAfterDays` | validade do crédito; nulo é sem validade |
| `minSubtotalCents` | pedido mínimo para ganhar |
| `maxRedeemBps` | quanto dos produtos do pedido pode ser pago com crédito (10000 = tudo) |

A primeira versão é um percentual por loja. Percentual por produto ou categoria fica para depois: ele
exige a mesma seleção de alcance que a promoção do O1 já vai ter, e reaproveitá-la é mais barato do que
inventar outra agora.

Mudar a regra vale para os pedidos novos. O pedido fotografa o percentual que valia, como já fotografa
preço e endereço.

### 3. O crédito nasce pendente e fica disponível na entrega

O bee-link não sabe se o pedido foi pago. O que ele sabe é o status, e `DELIVERED` já é a prova que
libera a avaliação do produto. Então:

- pedido feito → crédito **pendente** (o cliente vê "você vai ganhar R$ X");
- `DELIVERED` → **disponível**, e a validade começa a contar dali;
- volta de `DELIVERED`, ou `CANCELLED` → desfeito.

Creditar na hora da compra deixaria o cliente gastar um crédito de um pedido que depois é cancelado.

Quando o Mercado Pago (Épico Q) chegar, "pago" passa a existir, mas a entrega continua sendo o gatilho
certo: é depois dela que a devolução fica improvável.

### 4. A base do ganho é o que o cliente pagou em produtos

`base = subtotal − promoção − cupom − cashback usado`, e `ganho = floor(base × rateBps / 10000)`.
Frete fica fora: muitas vezes vai para o entregador ou a transportadora, e pode nem estar combinado
(`deliveryFeeCents` nulo).

Arredonda sempre para baixo, em centavos inteiros.

### 5. O uso é uma linha própria, depois da promoção e do cupom

`total = subtotal − promoção − cupom − cashback usado + frete`.

O cashback usado vai numa coluna própria do pedido (`cashbackUsedCents`), e não dentro de
`discountCents`. Desconto é margem que a loja abriu mão agora; cashback usado é uma dívida antiga sendo
paga. Os relatórios do Épico P precisam distinguir os dois.

O limite do uso é `min(saldo disponível, floor((subtotal − promoção − cupom) × maxRedeemBps / 10000))`.
Nunca paga frete, e o total nunca fica negativo, que é a regra que `totalRefusalOf` já aplica.

Isto entra no **serviço único de preço do O2 (BEELINK-191)**. Por isso o uso (U3, U7) depende do Épico
O, e o ganho (U1, U2, U5, U6) não.

### 6. Lote é estado; extrato é história

Duas tabelas, porque são duas perguntas:

- **`CashbackCredit`** — o lote, um por pedido que gerou crédito (ou por ajuste manual a favor):
  `amountCents`, `remainingCents`, situação (`PENDING`, `AVAILABLE`, `VOIDED`, `EXPIRED`), `expiresAt`.
  Responde "quanto resta, e até quando".
- **`CashbackEntry`** — o extrato: `EARN`, `REDEEM`, `REVERSAL`, `EXPIRE`, `ADJUST`, com valor com
  sinal, o pedido e quem fez. Só recebe linhas, nunca é editado. Responde "o que aconteceu".

O uso consome os lotes do que vence primeiro para o que vence por último, e grava de quais lotes tirou
(`CashbackRedemption`: lançamento, lote, valor). É isso que permite devolver o crédito ao lote certo
quando o pedido é cancelado.

`Customer` ganha `cashbackBalanceCents` e `cashbackPendingCents`, um cache da soma, para a lista de
clientes e o cabeçalho da loja não somarem o extrato a cada leitura. É o mesmo padrão de `ordersCount`.

`Order` ganha `cashbackUsedCents`, `cashbackEarnedCents` e `cashbackRateBps`.

### 7. Tudo sob a trava do cliente, na transação do pedido

Dois pedidos ao mesmo tempo, do mesmo cliente, não podem gastar o mesmo crédito. `lockCustomer` já
existe para isso: ganho, uso, estorno e vencimento pegam a trava antes de ler o saldo.

Um lote por pedido, com índice único, é o que impede de creditar duas vezes quando o status é movido
duas vezes ou por duas pessoas. Voltar de entregue e entregar de novo reabre o mesmo lote, não cria
outro.

### 8. Cliente sem conta também acumula

O saldo é do cadastro na loja, não da conta. A loja que vende pelo WhatsApp e registra o pedido no
painel dá e usa cashback do mesmo jeito: o registrar pedido mostra o saldo e aceita o uso.

### 9. O vencimento segue o padrão da caixa de e-mails

`OutboxMailer` (`apps/api/src/shared/mail/outbox-mailer.ts`) já varre de minuto em minuto com
`FOR UPDATE SKIP LOCKED`. A rotina de vencimento usa o mesmo mecanismo: dois processos nunca vencem o
mesmo lote. O aviso "vence em N dias" é uma outbox nova, como `favorite_notices`.

## Onde cada tarefa toca

| Tarefa | Toca |
|---|---|
| U1 (BEELINK-238) | schema novo (`cashback.prisma`), `packages/contracts`, módulo `cashback` na API, docs/product |
| U2 (BEELINK-239) | `order-placement.ts`, a troca de status em `orders.service.ts`, `order-cancellation.ts`, `customer-merge.ts`, `customer-privacy.service.ts`, o aviso da conversa e o e-mail de status |
| U3 (BEELINK-240) | o serviço de preço do O2, `order-totals.ts`, `order-delivery-fee.ts` (que recalcula o total), `order-placement.ts` |
| U4 (BEELINK-241) | uma varredura no molde do `OutboxMailer`, e uma outbox de avisos |
| U5 (BEELINK-242) | painel: tela Cashback, ficha do cliente, pedido |
| U6 (BEELINK-243) | loja: página do produto, carrinho, checkout, uma faixa no modo design |
| U7 (BEELINK-244) | checkout, Minha conta, comprovante, mensagem do WhatsApp, registrar pedido, termos |

## Ordem

U1 → U2 → U5 → U6 → U3 → U4 → U7.

As quatro primeiras entregam "o cliente ganha e vê o saldo" sem depender do Épico O. As três últimas
entregam "o cliente usa", e precisam do O2. Se o Épico O andar primeiro, nada muda; se o cashback andar
primeiro, ele para depois do U6 até o O2 existir.

## Primeira compra (O6, BEELINK-245)

Promoção e cupom ganham um público: todos, ou quem nunca comprou na loja. "Nunca comprou" é
`Customer.ordersCount = 0`, que já desconta cancelados, conferido na gravação do pedido sob a trava do
cliente.

O visitante anônimo vê a oferta anunciada; o desconto só é confirmado quando ele se identifica, o que o
checkout já exige antes de gravar o pedido. Quem cria uma segunda conta com outro e-mail e outro
celular leva o desconto de novo: é o limite de qualquer regra de primeira compra, e fica aceito.

## A decidir

1. Crédito só na loja que deu (recomendado) ou em qualquer loja — a decisão 1.
2. Pedido cancelado depois que o cliente já gastou o crédito que ele gerou: o saldo fica negativo ou
   para em zero? Sugestão: para em zero, e o painel mostra a diferença ao lojista.
3. O cashback usado num pedido cancelado volta com a validade antiga ou renovada? Sugestão: a antiga,
   com no mínimo 7 dias.
4. Percentual por produto ou categoria: segunda versão.
5. Prioridade: o épico foi criado em Backlog. O MVP de 29/09 não o incluía.

## Fora de escopo

Saque em dinheiro ou Pix, cashback pago pela plataforma, crédito entre lojas, indique e ganhe, níveis
de fidelidade.

## Adendo — as decisões do Rafael (01/10, ao começar o épico)

As quatro respostas, todas as sugeridas:

1. **O crédito vale só na loja que deu.** A decisão 1 fica como está.
2. **Pedido cancelado depois que o cliente gastou o crédito que ele gerou: o saldo para em zero.**
   Nunca fica negativo. O painel mostra ao lojista a diferença que o cliente já tinha usado.
3. **O cashback usado num pedido cancelado volta com a validade antiga, com no mínimo 7 dias.** Um
   crédito já vencido, ou a menos de 7 dias de vencer, volta com 7 dias.
4. **O crédito fica disponível na entrega** (decisão 3, confirmada).

O Épico O inteiro já está na `main` (#159 a #164), então o uso (U3, U7) não precisa esperar.
