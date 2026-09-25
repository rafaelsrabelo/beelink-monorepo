# BEELINK-94 — Ordenar por maior desconto e filtrar por desconto mínimo

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B13 do épico BEELINK-25 (listagem). Empilhado sobre o B7 (BEELINK-83).

## O pedido

5a oferece "Maior desconto" na ordenação e "10% ou mais / 20% ou mais / 30% ou mais" na coluna de
filtros. O dado já existe (`compareAtPriceCents` e `priceCents`); a API só aceita `desconto=1` e
não ordena por desconto. Prisma não ordena por uma razão entre duas colunas.

## Definição de Pronto

1. `?ordenar=maior-desconto` devolve do maior para o menor desconto; produtos sem desconto por
   último, na ordem do lojista.
2. `?desconto=20` devolve só produtos com 20% ou mais, e as contagens por faixa consideram os
   outros filtros.
3. O p95 da listagem continua abaixo de 300 ms com 5 mil produtos.
4. Testes de unidade e e2e. `pnpm ci-check` verde.

## Decisões

### 1. Uma coluna que o banco mantém, como o `searchText`

`discountPercent` é o desconto em percentual inteiro, arredondado para baixo, o mesmo número que a
vitrine imprime no selo. Um trigger o escreve a partir das duas colunas de preço em todo insert e
em toda mudança delas, então nenhum escritor o deixa para trás e ele nunca discorda dos dois
números. É o mesmo desenho do `searchText` do B1. O comentário do schema que dizia "nunca guardar
o percentual" continua verdadeiro no espírito: ninguém escreve essa coluna; o banco a deriva.

### 2. `desconto=1` continua "qualquer desconto"; um inteiro maior é a faixa

`desconto=20` é "20% ou mais", com `where discountPercent >= 20`. `desconto=1` mantém o filtro
antigo (`compareAt > price`). O `applied` devolve o número. O web lê os dois do mesmo jeito.

### 3. Cada faixa é contada sem o próprio filtro de desconto

Como já era a contagem de "em promoção": escolher "20% ou mais" não pode fazer "10% ou mais"
mostrar o mesmo número. Três `count` a mais por página, sob os outros filtros.

### 4. Um índice para o shelf

`(storeId, status, discountPercent)`: ordenar e filtrar por desconto dentro de uma loja.

## Fora de escopo

- A interface: B3 mostra a opção de ordenação, B16 as faixas.
