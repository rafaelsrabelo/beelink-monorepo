# BEELINK-26 — A listagem pública com filtros facetados, ordenação e paginação

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B1 do épico BEELINK-25 (listagem de produtos). Área: API · ajuste · G · ordem 8/29. Empilhado
> sobre o A5 (BEELINK-23), porque as facetas de opção leem as variantes do épico A.

## O pedido

> Estender `StorefrontController#catalog` e `ProductsService#listPublic` com facetas (categoria,
> preço, desconto, valores de opção), ordenação e `applied`. Os parâmetros seguem a convenção em
> português já em uso. A busca ignora acento e maiúsculas. Critérios:
> - `facets` com a contagem por valor, considerando os outros filtros aplicados, e `applied` com o
>   que está ativo;
> - um valor com contagem zero vem marcado como indisponível;
> - "blusa" acha "Blusa", e "crochê" acha "croche";
> - p95 abaixo de 300 ms com 5 mil produtos de teste.
>
> Fora de escopo: marca (D4), mais vendidos (sem Orders), frete grátis e retirada (sem
> configuração de entrega).

## Definição de Pronto

1. `GET .../catalog` aceita `ordenar`, `precoMin`, `precoMax`, `desconto` e `opcao` (repetível),
   além de `categoria`, `busca`, `pagina` e `porPagina`.
2. A resposta traz `facets`, com as contagens e os valores de contagem zero marcados como
   indisponíveis, mais `applied` e `sort`. Cada faceta conta com todos os filtros menos o dela.
3. A busca ignora acento e maiúsculas nos dois sentidos.
4. O p95 fica abaixo de 300 ms com 5 mil produtos, numa medição reproduzível.
5. O web continua compilando e servindo a listagem de hoje.
6. `pnpm ci-check` verde, com e2e.

## Decisões

### 1. Parâmetros

A convenção atual é em português e segue igual:

| Parâmetro | Valores |
|---|---|
| `ordenar` | `relevancia` (o padrão, a ordem do lojista), `menor-preco`, `maior-preco`, `novidades` |
| `precoMin`, `precoMax` | reais inteiros |
| `desconto` | `1` |
| `opcao` | `Tamanho:P`, repetível |

Valores da mesma opção somam (P **ou** M). Opções diferentes se exigem (P **e** Areia, **na mesma
combinação**): um produto em P azul e M areia não aparece para "P e Areia".

O preço filtra o `priceCents` do resumo, que desde o A3 é o da combinação mais barata que pode ser
pedida. Um valor de opção só conta se há uma combinação à venda e em estoque com ele. O que o
visitante filtra é o que ele pode comprar.

### 2. A forma das facetas

`facets` tem:

- `categories`: valor = slug, rótulo = nome. A contagem do pai inclui os filhos, como o filtro;
- `discount`: quantos estão em oferta;
- `options`: uma faceta por nome de opção, com os valores e a bolinha de cor quando houver;
- `price`: o menor e o maior preço.

Os rótulos que são texto de interface ("Desconto", "Preço") ficam no web. A API só manda dados:
nomes de categoria, de opção e de valor.

Opções de produtos diferentes se agrupam pelo nome sem diferença de maiúsculas e espaços, porque
"Tamanho" num produto e "tamanho" em outro são a mesma faceta para o visitante.

### 3. Cada faceta conta sem o próprio filtro

É o comportamento de facetas de uma loja: com "P" marcado, a faceta Tamanho ainda mostra quantos
há em M, e as outras facetas contam dentro de P.

- **Categorias, desconto e preço:** cada um é uma consulta Prisma com o `where` sem o seu filtro.
- **Opções:** as contagens distintas por produto vêm de SQL (`COUNT(DISTINCT productId)`) sobre os
  ids que casam com os outros filtros. É uma consulta para as opções não filtradas e uma para cada
  opção filtrada, no máximo quatro.
- **Valores zerados:** o universo de valores (o que existe na vitrine inteira) vem de uma consulta
  à parte. Um valor sem produto sob os filtros atuais aparece com `available: false`.

### 4. Busca sem acento: coluna normalizada, trigger e índice trigram

- **A coluna:** o produto ganha `searchText`, com `lower(unaccent(nome + descrição))`.
- **O trigger:** mantém a coluna em qualquer escrita (API, seed, migration), para que ela não
  dependa de quem escreve.
- **O índice:** GIN trigram (`pg_trgm`), para o `contains` usar índice.
- **O termo buscado:** é normalizado em JS (NFD sem diacríticos, minúsculas). Para o português,
  `unaccent` e NFD concordam.
- **As extensões:** `unaccent` e `pg_trgm` são criadas na migration.

### 5. Um serviço da listagem

A listagem pública sai de `ProductsService`, que já passa do limite de tamanho, para
`StorefrontListingService`. Os `where` são construídos em funções puras (`catalog-filters.ts`),
testáveis sem banco.

### 6. Medição de desempenho

`pnpm --filter api perf:catalog` cria 5 mil produtos com variantes num banco `_perf` próprio, mede
200 chamadas com filtros variados e imprime o p95. É fora do `ci-check`, porque seria lento demais
para todo push, e o PR registra o número medido.

## Fora de escopo

- Marca, mais vendidos, avaliação, frete grátis e retirada, como o ticket diz.
- A interface das facetas (B3, B4) e os campos derivados de preço e estoque (B2).

## Adendo — revisão independente (24/09/2026)

Uma revisão com um verificador que tentou refutar cada achado. Dois confirmados, os dois corrigidos:

1. **A busca não achava o próprio nome** (grave, introduzido por este ticket). A decisão 4 estava
   errada: `unaccent` e NFD **não** concordam no português do varejo. O `unaccent` troca ª e º por
   a e o, as aspas curvas (’) pelas retas, travessões por hífen e reticências por três pontos. O
   NFD em JS deixa todos como estão. Por isso "1ª linha", "nº 18" e "d’água" voltavam vazias,
   embora o `ILIKE` antigo as achasse. O teclado do iPhone digita ’ por padrão.

   Agora o termo passa pela mesma função do trigger, no próprio Postgres
   (`SELECT trim(lower(unaccent($1)))`), antes de montar o `where`. Custa uma ida ao banco a mais,
   só quando há busca. Um termo que fica vazio depois disso não filtra a vitrine e não aparece nos
   filtros aplicados.
2. **`%` e `_` funcionavam como curingas** (menor, herdado do `ILIKE` antigo). "100%" achava
   "1000ml", e "_" devolvia a vitrine inteira. O termo agora é escapado para o `LIKE` (`likeLiteral`).

O teste e2e da listagem cobre "1ª linha", "d’água", "d'agua", "nº 18", "100%" e "_".
