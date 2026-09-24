# BEELINK-21 — A leitura pública do produto com opções, variantes e faixa de preço

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A3 do épico BEELINK-17 (variações de produto). Área: API · ajuste · M · ordem 4/29. Empilhado
> sobre o A2 (BEELINK-20).

## O pedido

> `GET stores/:slug/catalog/:productSlug` devolve `options[]` e `variants[]`, cada variante com
> `available` pela mesma regra de estoque que tira um produto esgotado do grid. Um produto sem
> opções devolve 1 variante padrão sem quebrar nenhum consumidor atual. `priceRange` alimenta o card
> sem uma segunda viagem e bate com o menor e o maior preço entre as variantes ativas e
> disponíveis.

## Definição de Pronto

1. A página do produto devolve `options` e `variants`. Cada variante tem `available`, derivado de
   `isSoldOut`, a mesma regra do grid. Variantes desligadas ("não vendo esta") não aparecem.
2. Um produto sem opções devolve `options: []` e uma variante com `optionValueIds: []`. Nenhum
   consumidor de `PublicProduct` quebra.
3. `priceRange` está no card do grid, no card das vitrines e na página. Vai do menor ao maior preço
   entre as variantes à venda e disponíveis.
4. A variante pública não traz SKU, custo nem quantidade.
5. `pnpm ci-check` verde, com e2e.

## Decisões

### 1. `PublicProductDetail`, e não `PublicProduct` alargado

`Product` (o do painel) estende `PublicProduct`. Pôr `options` e `variants` em `PublicProduct`
obrigaria a lista do painel e o grid a carregar as variantes de até 96 produtos. A página do
produto passa a responder `PublicProductDetail`, que é `PublicProduct` com `options` e `variants`.
Como é um superconjunto, nenhum consumidor quebra.

### 2. A faixa de preço vem do resumo, sem ler variantes

O card (grid, categoria, busca e vitrines) não lê variantes. Para a faixa sair na mesma leitura:

- o produto ganha `maxPriceCents`, mais uma coluna do resumo, gravada junto com as outras;
- `priceRange` é `{ minCents: priceCents, maxCents: maxPriceCents }`.

A migration `20260924080000_product_max_price` preenche a coluna pela mesma regra. Para um produto
com uma variante só, que é todo produto real hoje, a faixa é o próprio preço.

### 3. O preço do resumo passa a ser o de quem pode ser pedido

Até o A2, o preço do produto era o da variante mais barata **à venda**, mesmo esgotada. O ticket
pede a faixa entre as **disponíveis**. Com `priceCents` sendo o mínimo da faixa, o card diria "a
partir de R$ 69,90" por uma combinação que não pode ser comprada. A regra agora é:

1. o menor e o maior preço entre as variantes à venda e não esgotadas;
2. sem nenhuma, entre as à venda;
3. sem nenhuma à venda, entre todas. Um produto sempre tem preço.

O preço "de" continua sendo o da variante mais barata dessa faixa. As demais colunas do resumo não
mudam.

### 4. `available` é `isActive && !isSoldOut`

`isVariantAvailable` fica em `catalog.visibility.ts`, ao lado de `isSoldOut`, e usa a mesma regra:
a variante contada com zero, ou sem quantidade, está esgotada. O público recebe esse booleano,
nunca a quantidade. A regra do contrato ("Derived, never the count") vale para a variante como
valeu para o produto. O "Restam N" dos designs fica de fora.

### 5. As opções vão inteiras, as variantes só as vendidas

Todas as opções e todos os valores vão para o público. Uma combinação sem variante na lista é uma
que a loja não vende, e o seletor do A5 a desabilita. Uma variante esgotada vem com
`available: false`, porque o A5 oferece "Avise-me" nela.

## Fora de escopo

- Facetas por valor de opção (B1).
- O SKU na tabela de especificações (design 5b). O SKU é do lojista, como o do produto sempre foi.
- As telas (A4, A5).
