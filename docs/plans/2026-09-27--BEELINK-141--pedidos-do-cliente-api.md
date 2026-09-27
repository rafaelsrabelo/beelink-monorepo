# BEELINK-141 — J2 · API: os pedidos do cliente na porta do cliente

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J2 do Épico J (BEELINK-138). Empilhado sobre o H9 (`feat/BEELINK-121-checkout-registra-pedido`),
> que criou `POST /stores/:slug/customer/orders` e a primeira versão de `CustomerOrder`.

## Definição de Pronto

1. `GET /stores/:slug/customer/orders`, com a sessão do cliente, lista os pedidos do registro de
   cliente daquela conta naquela loja, os mais recentes primeiro. Os filtros são:
   - situação: em andamento (Recebido, Aceito, Em preparo ou Saiu para entrega), entregues ou
     cancelados;
   - período: os últimos 3 meses, ou um ano;
   - busca: o número do pedido ou o nome de um produto.

   A lista é paginada e devolve a contagem de cada situação, para as abas, e os anos com pedidos,
   para o seletor de período.
2. `GET /stores/:slug/customer/orders/:number` devolve:
   - as linhas com o nome, a variação e o preço gravados, e a foto do produto enquanto ele existe;
   - os totais;
   - entrega ou retirada, com o endereço do J1;
   - a forma de pagamento;
   - a linha do tempo: cada status e quando.
3. A lista e o detalhe incluem os pedidos lançados pelo lojista no painel. Nunca devolvem a nota
   interna do lojista, quem mudou cada status nem o estágio de CRM.
4. `POST /stores/:slug/customer/orders/:number/cancel` cancela enquanto o pedido está Recebido. O
   evento fica com ator `CUSTOMER`, o estoque volta como no H8 e o resumo do cliente é refeito.
   Depois de Aceito, só a loja cancela: a resposta é 409 com `ORDER_NOT_CANCELLABLE`.
5. Um pedido de outro cliente ou de outra loja responde 404 (`ORDER_NOT_FOUND`), nunca 403.
6. `docs/product/README.md`: "Orders" passa a dizer que o cliente vê os próprios pedidos e cancela
   enquanto Recebido, e a frase de "What the product does not do" sai.
7. Os contratos `CustomerOrderSummary`, `CustomerOrder` completo e a query da lista estão em
   `packages/contracts`.
8. Há e2e para cada linha acima.

## Decisões

### 1. "Quem mudou o status" fica de fora; "cancelado por quem" entra

O J2 proíbe devolver quem mudou o status. O J4 e o J5, porém, pedem "Cancelado em … pela loja ou por
você". Os dois cabem: a linha do tempo tem só status e data, sem ator e sem usuário. O pedido traz um
fato só, `cancelledBy: "CUSTOMER" | "SHOP" | null`, que as telas precisam. Do mesmo jeito,
`placedBy: "CUSTOMER" | "SHOP"` diz se o pedido foi feito na loja ou lançado pela loja (J5), lido do
primeiro evento.

### 2. As situações são grupos de status, e as contagens seguem período e busca

O filtro `situation` é `ACTIVE`, `DELIVERED` ou `CANCELLED`. Sem ele, lista todos. As contagens
(`ALL`, `ACTIVE`, `DELIVERED`, `CANCELLED`) seguem o período e a busca, mas não a aba: a aba escolhida
não zera as outras. É o mesmo desenho das contagens de estágio do CRM.

### 3. Período: `3m` ou um ano

`period=3m` são os últimos 90 dias. `period=2025` é o ano civil, no fuso de Brasília, onde as lojas
estão. Sem período, lista todos. A resposta traz `years`, os anos em que o cliente tem pedidos nessa
loja, do mais recente ao mais antigo. O seletor do J4 não inventa anos vazios.

### 4. A foto vem do produto, enquanto ele existe

A linha guarda o nome, a variação e o preço da compra, mas não a foto. A foto é a da combinação,
senão a primeira do produto. Um produto apagado deixa a linha sem foto, e a linha continua sendo lida.

### 5. 404, e nunca 403, para o pedido de outro

O pedido é buscado pelo número dentro do registro de cliente da sessão. O de outro cliente não é
encontrado, e a resposta não revela que ele existe.

### 6. Cancelar usa a trava da loja, como a troca de status do painel

A trava da linha da loja faz o cancelamento do cliente e a aceitação do lojista, ao mesmo tempo, não
se cruzarem. Quem chegar depois lê o status novo: o lojista não aceita um pedido cancelado, e o
cliente não cancela um pedido aceito.

## Fora de escopo

- As telas: J4 (BEELINK-143) e J5 (BEELINK-144).
- Rastreio e previsão (J7).
