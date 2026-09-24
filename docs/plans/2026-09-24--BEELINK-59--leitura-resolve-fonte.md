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
