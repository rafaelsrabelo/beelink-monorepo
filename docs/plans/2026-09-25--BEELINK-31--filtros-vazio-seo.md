# BEELINK-31 — Vazio, falha e SEO das combinações de filtro na listagem

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B6 do épico de listagem. Empilhado sobre o D9 (BEELINK-49), a ponta da pilha.

## O pedido

A listagem com filtros: o que ela diz quando não sobra nada, quando a leitura falha, e o que um
buscador deve indexar.

## Definição de Pronto

1. Uma combinação de 3 ou mais filtros responde `noindex, follow`, como uma página 2 já responde.
   Conta como filtro: a faixa de preço (uma vez), o desconto, cada valor de opção e a categoria que
   estreita o catálogo ou a busca. A ordenação não conta: ela reordena, não esconde nada.
2. Os links de faceta (opções, desconto, faixas de preço e os chips) têm `rel="nofollow"`. Os de
   categoria continuam seguíveis: levam a páginas de verdade.
3. Sem resultado com filtros: "Nenhum produto com esses filtros." e "Ver tudo", no mesmo endereço de
   "Limpar tudo" (que mantém a ordenação). Sem resultado sem filtros, numa categoria ou busca: "Ver
   todos os produtos".
4. Uma leitura que falha (a API caiu ou não respondeu) diz isso e oferece "Tentar de novo" no mesmo
   endereço, em vez de "Nada encontrado", e a faixa de resultados não diz "0 produtos". Uma recusa de
   filtro (400) continua sendo "nada encontrado".

## Decisões

### 1. `failed` é do app, não do fio

`catalogueAt` devolve `StorefrontShelf` — o catálogo e, quando a API não pôde responder, `failed`. A
API nunca manda esse campo; ele não entra em `packages/contracts`.

### 2. `exibicao=lista`

O ticket pede `noindex` sempre para `exibicao=lista`, mas a listagem não tem visão em lista hoje: não
há o que marcar. Quando a visão existir, ela entra na mesma condição de `robots`.
