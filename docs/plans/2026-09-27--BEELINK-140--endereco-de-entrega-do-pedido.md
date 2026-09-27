# BEELINK-140 — J1 · API: o pedido guarda o endereço de entrega como era no momento da compra

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Primeiro ticket do Épico J (BEELINK-138, Minha conta do cliente). Vem antes do H9 (BEELINK-121),
> que precisa dele: o pedido do carrinho vai gravar para onde vai. Branch a partir de `origin/main`.

## Definição de Pronto

1. `orders` ganha colunas para quem recebe e o endereço: nome de quem recebe, CEP, rua, número,
   complemento, bairro, cidade e UF. Todas anuláveis. A migração vem no mesmo PR.
2. Um pedido de **entrega** grava essas colunas quando nasce, a partir do cadastro do cliente naquele
   momento. Uma **retirada** as deixa nulas, mesmo que o cliente tenha endereço.
3. A API recusa um pedido de entrega de um cliente sem endereço com `ORDER_DELIVERY_ADDRESS_MISSING`
   (400) e não grava nada: nem pedido, nem número consumido, nem estoque, nem cliente novo.
4. Mudar o endereço do cliente depois não muda o endereço de um pedido que já existe.
5. Pedidos que já existem ficam sem endereço e são lidos como "endereço não registrado". O endereço
   de hoje do cliente não é copiado para o passado.
6. Contrato `OrderDeliveryAddress` em `packages/contracts`, e `Order.deliveryAddress`.
7. O pedido aberto no painel (H4) mostra o endereço **do pedido**, com quem recebe, e diz
   "Endereço não registrado" numa entrega antiga.
8. O registro no painel (H3) mostra, antes de salvar, para onde vai uma entrega, e avisa quando o
   cliente escolhido não tem endereço. A recusa da API também aparece em palavras.
9. e2e da API cobrindo 2 a 5, e testes de unidade e de componente para o que o painel mostra.

## Decisões

### 1. Colunas no pedido, não uma tabela de endereços

O ticket pede colunas. Uma tabela `order_addresses` 1:1 só acrescentaria um join a toda leitura de
pedido. O prefixo `delivery` segue o `deliveryFeeCents` que já existe: `deliveryName`,
`deliveryZipCode`, `deliveryStreet`, `deliveryNumber`, `deliveryComplement`,
`deliveryNeighborhood`, `deliveryCity` e `deliveryState`.

Quem recebe (`deliveryName`) é o nome do cliente no momento da compra, fotografado como o nome do
produto na linha. Se o cliente troca de nome depois, o pedido continua dizendo para quem foi
entregue. Quando o J9 trouxer vários endereços com apelido, quem recebe pode passar a vir do
endereço escolhido sem mudar a coluna.

### 2. "Tem endereço" é ter rua e cidade

É a regra que a vitrine já usa para dizer se a loja alcança o cliente (`isReachable` em
`apps/web/src/lib/customer-address.ts`: celular, rua e cidade). Exigir CEP, número e bairro recusaria
clientes que a loja hoje já atende: um sítio sem número, uma cidade pequena sem bairro no cadastro.
O que houver dos outros campos vai junto.

### 3. A recusa acontece dentro da transação

A leitura do cliente acontece dentro da mesma transação que numera o pedido e baixa o estoque, depois
do `customerOf`. O cliente cadastrado ali mesmo (`{ name, phone }`) nasce na mesma transação. Recusar
ali desfaz tudo junto: o número não é consumido, o estoque não sai e o cliente novo não fica. A
recusa é 400, como as outras recusas de criação (`ORDER_CUSTOMER_NOT_FOUND`,
`ORDER_PAYMENT_NOT_ACCEPTED`).

### 4. `Order.customer` deixa de trazer o endereço de hoje

Até aqui o pedido aberto mostrava `customer.address`, que é o cadastro **como está agora**. Num
pedido antigo, isso é exatamente o fato inventado que o ticket proíbe. `OrderCustomerDetail` sai do
contrato. O pedido traz `customer: OrderCustomer` (id, nome e celular), e o endereço é o dele,
`deliveryAddress`, nulo numa retirada e numa entrega anterior a este ticket. A ficha do cliente
(H7) continua mostrando o endereço de hoje, que é o lugar dele.

### 5. O painel diz para onde vai antes de salvar

Sem isso, o lojista descobriria a falta de endereço só na recusa, e teria de sair do formulário
para corrigir a ficha. Com uma entrega marcada e um cliente escolhido, a seção do cliente lê a ficha
(`useStoreCustomer`, a mesma consulta da tela do cliente) e mostra "Entregar em: …" ou o aviso de
que falta endereço, com o caminho: cadastrar na ficha ou marcar retirada. Um cliente cadastrado ali
mesmo já pode receber o endereço no próprio formulário de cadastro (H3).

## Fora de escopo

- Vários endereços por cliente e escolher um no carrinho (J9, BEELINK-148).
- Cálculo de frete.
- O checkout gravar o pedido (H9, BEELINK-121, o próximo ticket). Ele usa a mesma regra.
- A frase "no order history a customer signs in to see" em `docs/product/README.md` sai quando o
  cliente puder ver os pedidos (J4). Aqui, a seção Orders ganha a linha sobre o endereço.
