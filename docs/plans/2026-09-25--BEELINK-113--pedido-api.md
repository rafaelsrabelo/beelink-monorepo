# BEELINK-113 — API: o pedido existe (modelo, número por loja e as rotas do lojista)

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H1 do Épico H (pedidos e CRM). Empilhado sobre o I1 (BEELINK-125); só toca a API e o contrato.

## Definição de Pronto

1. Prisma: `Order` (loja, cliente, `number` sequencial por loja alocado de `Store.orderSequence` na
   mesma transação do insert, status, entrega ou retirada, forma de pagamento, `subtotalCents`,
   `deliveryFeeCents`, `discountCents`, `totalCents`, observação, `placedAt`) e `OrderItem` (produto e
   variação opcionais com `onDelete: SetNull`, fotografia de nome do produto, rótulo da variação e SKU,
   `unitPriceCents`, quantidade, `lineTotalCents`). Migração no mesmo PR.
2. Status `RECEIVED ACCEPTED PREPARING OUT_FOR_DELIVERY DELIVERED CANCELLED`; a forma de pagamento é o
   `PaymentMethod` da loja.
3. O cliente ganha `ordersCount`, `totalSpentCents`, `firstOrderAt` e `lastOrderAt`, atualizados na
   mesma transação que cria e que cancela.
4. Contrato em `packages/contracts/src/order.ts`: o pedido, a linha, o evento de status, o resumo da
   lista, a página, a consulta, a entrada de criação, a troca de status e os códigos de erro.
5. Rotas do dono: `POST /stores/:slug/orders`, `GET /stores/:slug/orders` (paginado, filtro por
   status, busca por número, nome ou celular), `GET /stores/:slug/orders/:number` e
   `PATCH /stores/:slug/orders/:number/status`.
6. A API calcula os totais a partir das variações e recusa variação de outra loja, quantidade menor
   que 1, pagamento que a loja não aceita e `placedAt` no futuro.
7. Aceite, em e2e: dois pedidos ao mesmo tempo na mesma loja recebem números seguidos e distintos, e
   outra loja começa no 1; mudar o preço ou excluir o produto não muda um pedido existente; cancelar
   tira o pedido do resumo do cliente, e um cancelado não muda mais de status; outra loja do mesmo dono
   não lê o pedido, quem não é dono recebe 403 e token de cliente é recusado.

## Decisões

### 1. O número vem de um contador na loja, dentro da transação

`UPDATE stores SET "orderSequence" = "orderSequence" + 1 … RETURNING` trava a linha da loja até o
commit: dois pedidos ao mesmo tempo esperam um pelo outro e saem com números seguidos. `@@unique([storeId,
number])` é a rede, não o mecanismo. Um `MAX(number) + 1` daria o mesmo número aos dois.

### 2. O cliente é escolhido ou cadastrado no próprio pedido

A entrada leva `customer: { id }` (um cliente da loja) ou `customer: { name, phone }`. O celular
identifica o cliente dentro da loja (docs/product, "Customers"), então um celular que a loja já tem
vai para o cliente dele — o nome digitado não sobrescreve o que está lá. É o que deixa o H3 cadastrar
"ali mesmo" sem uma segunda chamada.

### 3. O painel nunca manda preço

A linha é `{ variantId, quantity }`. A API lê a variação (da loja, não arquivada, ativa), fotografa
o nome do produto, o rótulo da variação ("Sabor: Uva · 300 g") e o SKU, e calcula
`lineTotalCents`, `subtotalCents` e `totalCents = subtotal + taxa − desconto`. Um desconto maior que
subtotal mais taxa é recusado; na retirada a taxa é zero. A mesma variação em duas linhas é recusada.

### 4. O histórico de status é guardado, com quem mudou

Cada status que o pedido teve vira um `OrderEvent` (status, quem — lojista, cliente ou sistema —,
o usuário quando houver, e quando). Hoje só o lojista muda; o app de entregador que vem depois vai
alimentar o "saiu para entrega" e o "entregue", e o histórico já tem onde guardar de quem veio.

### 5. Cancelado é final; os outros status andam livres

O lojista pode corrigir um status (voltar de "Em preparo" para "Aceito"), mas nada sai de
`CANCELLED`, e cancelar recalcula o resumo do cliente a partir dos pedidos válidos que sobram.
Mudar para o mesmo status é recusado (`ORDER_STATUS_UNCHANGED`), para o histórico não ganhar
entradas vazias.

### 6. A data do pedido pode ir ao passado, nunca ao futuro

`placedAt` ausente é agora; no futuro (com um minuto de folga para relógios) é recusado. É a data
que o resumo do cliente e, depois, o estágio do CRM usam.

### 7. A busca: "#" é o número; sem "#", nome e celular também

"#12" acha só o pedido 12. "12" acha o pedido 12 e um cliente com "12" no nome; os dígitos procuram
nos celulares a partir de quatro — com menos, um "1" acharia todo celular da loja.

## Fora de escopo

- As telas (H2 a H4), a baixa de estoque (H8), o pedido vindo do checkout (H9).
- O registro de entrega (quem entrega, rastreio, endereço): chega com o módulo de entrega. Hoje o
  pedido guarda só o modo (entrega ou retirada) e a taxa como parte dos totais.

## Adendo — 25/09, revisão

A revisão em três lentes confirmou doze pontos (alguns repetidos entre as lentes), todos corrigidos:

- **Celular canônico.** O celular do pedido e o do perfil do cliente passam pelo `normaliseWhatsapp`
  (tira o 0 de longa distância e o código de operadora, e põe o 55 em 10 ou 11 dígitos), e uma
  migração reescreve os que já existiam. "(11) 98888-7777", "+55 11 98888-7777" e "(011) 98888-7777"
  são o mesmo cliente.
- **Dinheiro dentro do inteiro.** Uma linha, o subtotal ou o total acima de R$ 1.000.000,00 é recusado
  (`ORDER_TOTAL_TOO_LARGE`), o que mantém toda coluna do pedido no `INT4`; o total gasto do cliente
  é `BIGINT`, porque a vida de um cliente não tem teto.
- **Entradas que viravam 500:** UUID em maiúsculas (agora normalizado), `placedAt` com cara de ISO e
  sem data ("30 de fevereiro", agora 400), número de pedido acima do `INT4` ou que nem é número
  (agora 404) e página sem limite (agora até 10.000).
- **O lock não é edição da loja:** o contador e a trava da linha da loja são SQL direto, então o
  `updatedAt` da loja continua sendo do lojista.
- **Rótulo da variação:** a coluna tem 320 caracteres, o pior caso do catálogo (três opções de 40
  com valores de 60, juntas), e o exemplo do contrato diz o que a API escreve.
- **O endereço do cliente no pedido aberto** (`OrderCustomerDetail`), que o H4 mostra.

Dois achados foram refutados na verificação: guardar o celular sem o 55 (o mesmo ponto, visto por
outro lado, e agora resolvido pela forma canônica) e a observação ser do lojista — o lojista
digita o que o cliente pediu, e o produto chama de observação do pedido.
