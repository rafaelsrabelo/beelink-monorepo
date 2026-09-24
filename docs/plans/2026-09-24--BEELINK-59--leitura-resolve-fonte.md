# BEELINK-59 — A leitura pública resolve a fonte de cada vitrine

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B2 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do B1 ([plano](2026-09-24--BEELINK-58--vitrine-com-fonte.md)).
> Área: contrato + API · ajuste · M · ordem 8/17.

## O pedido

> Resolver source na leitura pública, com índice por categoria. Fora de escopo: mais vendidos, que
> depende de soldCount.
>
> - Uma vitrine de categoria devolve só os produtos daquela categoria.
> - O limite é respeitado e a ordenação é estável.
> - A regra de visibilidade de catalog.visibility.ts continua valendo em toda fonte.

## Definição de Pronto

1. `GET /stores/{slug}/public` devolve, em cada vitrine, os produtos da fonte dela, já resolvidos
   como cartões (`PublicProductCard`), nos `items` da vitrine.
2. Uma vitrine de categoria devolve só os produtos daquela categoria e das subcategorias dela.
3. Uma seleção devolve os produtos na ordem em que o lojista os pôs; um produto apagado, em rascunho
   ou esgotado some da lista.
4. Lançamentos vêm do mais novo para o mais antigo; promoção traz só produto com preço "de" maior que
   o preço.
5. O limite é respeitado (nulo é 24), e a ordem é estável: dois produtos empatados saem sempre na
   mesma ordem.
6. A regra de `catalog.visibility.ts` vale em toda fonte: rascunho e esgotado nunca aparecem.
7. A vitrine pública diz qual é a sua fonte e, numa de categoria, o slug e o nome da categoria, para
   o web montar o "ver tudo".
8. `pnpm ci-check` verde, com e2e para cada fonte.

## Decisões

### 1. Os produtos vão nos `items` públicos, como os slides

`toPublicComponent` já resolve os slides de um banner: guarda ids e devolve endereços. A vitrine faz o
mesmo: guarda a fonte e devolve os cartões. Assim a forma pública não ganha um campo que só um tipo
lê, e o web recebe a página inteira numa leitura só, que já é cacheada e revalidada por tag.

### 2. A consulta de cada fonte é uma função, e não um serviço

`StoresService` não pode injetar `ProductsService`: o módulo de catálogo já importa o de lojas. A
consulta de cada fonte vira uma função em `catalog/showcase.query.ts`, que recebe a vitrine e devolve
os argumentos do `findMany`, sempre com `ON_THE_SHELF_WHERE` dentro de um `AND`. A leitura da loja
chama essa função, e o que ela devolve é testável sem banco.

### 3. Uma consulta por vitrine, em paralelo

Uma loja tem poucas vitrines, e cada uma tem limite de 48. Juntar todas numa consulta só trocaria
clareza por uma otimização que a página não precisa. O `include` é o mínimo do cartão: primeira
imagem e slug da categoria.

### 4. Ordem estável em toda fonte

`position`, `name` e `id` para todos, categoria, seleção (antes de reordenar pela lista) e promoção;
`createdAt` e `id` decrescentes para lançamentos. O `id` desempata, porque nem `position` nem `name`
são únicos, e o seed grava muitos produtos com o mesmo `createdAt`.

### 5. Um índice para lançamentos

`@@index([storeId, status, createdAt])`. O índice por categoria que o ticket pede já existe desde
antes do épico (`[categoryId, status, position]`).

## Fora de escopo

- Desenhar a vitrine a partir desses produtos: B3. Até lá o web continua desenhando as prateleiras
  que carrega sozinho, e ignora os `items` da vitrine.
- Mais vendidos.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou um ponto, corrigido:

- **Uma seleção gravada que não parseia mais derrubava a vitrine inteira.** `selectionOf` lia os ids
  com um cast, sem o `parseComponentItems` que a leitura usa justamente para nunca lançar. Um item
  sem `productId`, com um id que não é uuid ou nulo virava 500 no `GET /stores/{slug}/public`, e a
  loja inteira sumia. Nenhuma escrita de hoje grava uma linha assim; o caminho é um deploy que
  estreita o formato, uma linha escrita por outro deploy no meio de um rollout, ou um conserto à mão
  no banco. Agora os ids passam pelo mesmo parser, e uma seleção ilegível é uma vitrine vazia. Há um
  teste de unidade para quatro formas quebradas e um e2e que grava uma e lê a loja.

Dois pontos foram refutados como defeito, mas o segundo foi aproveitado: o e2e de "mesma ordem em
toda leitura" não tinha empate de posição e não exercitava os desempates. Agora ele empata todas as
posições antes de ler.
