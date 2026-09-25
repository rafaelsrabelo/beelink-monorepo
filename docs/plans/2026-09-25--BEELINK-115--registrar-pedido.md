# BEELINK-115 — Painel: registrar um pedido

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H3 do Épico H (pedidos e CRM). Empilhado sobre o H2 (BEELINK-114); usa a API do H1.

## Definição de Pronto

1. Página Novo pedido em `/admin/<loja>/orders/new`, aceitando `?customer=<id>` para vir da ficha do
   cliente (H7).
2. Cliente: busca por nome, celular ou e-mail; cadastrar ali mesmo com nome, celular e, se quiser,
   endereço — `POST /stores/:slug/customers`, um cliente sem conta. Um celular que a loja já tem não
   cria outro cliente: a tela oferece o que existe.
3. Produtos: busca no catálogo, escolha da variação (com preço e estoque) e quantidade; linhas
   editáveis e removíveis.
4. Entrega ou retirada e a taxa; a forma de pagamento entre as que a loja aceita; desconto;
   observação; a data do pedido (hoje por padrão, nunca no futuro).
5. Resumo com subtotal, taxa, desconto e total. Salvar abre o pedido criado (H4).
6. Aceite: o total mostrado antes de salvar é o que a API grava, ao centavo; um celular já
   cadastrado não cria um segundo cliente; uma variação sem estoque aparece marcada.

## Decisões

### 1. O resumo usa as mesmas regras da API, testadas nos mesmos casos

`orderTotalsOf` (em `packages/ui`) aplica o que o `totalsOf` da API aplica: a retirada não cobra
taxa, o desconto não passa do pedido, e nada passa de R$ 1.000.000,00. Os preços vêm das variações
que a própria tela leu do catálogo. A API recalcula e é quem grava; o resumo e ela concordam porque
fazem a mesma conta sobre os mesmos números.

### 2. Cadastrar cliente é uma rota própria, e o pedido leva só o id

`POST /stores/:slug/customers` cria o cliente (nome, celular canônico, endereço opcional). Um celular
que a loja já tem responde 409 `CUSTOMER_PHONE_TAKEN`; a tela então busca aquele celular e oferece o
cliente encontrado. O pedido manda `customer: { id }` — a regra de casar pelo celular do H1 continua
lá para quem chamar a API direto.

### 3. Produto e variação em dois passos

A busca lista os produtos; escolher um lê o detalhe dele (as variações, com preço e estoque) e a
variação escolhida vira uma linha. Um produto sem opções entra direto pela variação padrão. O rótulo
da variação é montado como a API monta ("Sabor: Uva · Peso: 300 g").

### 4. A data como dia, sem fuso que a empurre

Um campo de data, hoje por padrão e com o máximo em hoje. Hoje é mandado como nada (a API usa
agora); um dia no passado vai como meio-dia daquele dia no horário local, para o fuso não o jogar
para o dia anterior.

### 5. Sem estoque é marcado, não bloqueado

A regra de estoque é do H8. Aqui a variação sem estoque aparece marcada no seletor e na linha, e o
lojista decide.

## Fora de escopo

- A baixa de estoque (H8), o pedido vindo do checkout (H9) e editar um pedido já registrado.
- A tela do pedido aberto (H4): salvar leva a `/orders/<número>`, que o H4 cria.

## Adendo — decisões da implementação (2026-09-25)

### 6. Ler um cliente é uma rota nova, que o H7 amplia

`?customer=<id>` precisa do nome do cliente para mostrar. `GET /stores/:slug/customers/:id` responde
o mesmo `StoreCustomer` da lista; a ficha do H7 cresce essa rota com o que só ela mostra. Um id de
outra loja, ou que nem é um id, é o mesmo `CUSTOMER_NOT_FOUND` (404).

### 7. As contas e os tipos do formulário moram em `packages/ui/src/lib/order-form.ts`

O pacote só exporta blocos `.tsx`, e a tela da web precisa de `orderTotalsOf` e dos tipos que os
blocos recebem. Seguem o precedente de `lib/variations`: o que blocos e tela compartilham fica em
`lib`. Os tipos de valor de pagamento e de entrega foram para lá, e `order-types.ts` os reexporta.

### 8. Pagamento e entrega são botões, não um select

São no máximo quatro formas e duas entregas: um toque no celular, e o escolhido fica à vista. O
estado ligado é preenchido com a cor primária, como no filtro da lista (H2).

### 9. O cadastro de cliente não é um `<form>`

Ele fica dentro do formulário do pedido, onde um segundo `<form>` não é válido. O Enter é tratado ali
mesmo: cadastra o cliente e nunca envia o pedido. O que foi digitado na busca preenche o nome ou o
celular.

### 10. Verificado ao vivo

Pedido #4 da loja-do-design, registrado pela tela: o resumo mostrou R$ 293,30 e a API gravou 29330
centavos. A data de 24/09 foi gravada como meio-dia local. O celular repetido ofereceu o cliente
existente, e um cliente novo foi cadastrado e escolhido. Não há rolagem lateral a 390 px.
