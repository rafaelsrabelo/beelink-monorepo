# BEELINK-83 — A listagem lê da URL e repassa à API ordenação, preço, desconto e opções

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B7 do épico BEELINK-25 (listagem). Empilhado sobre o E5 (BEELINK-77). Fundação sem tela: B3, B4,
> B12 e E7 constroem sobre ela.

## O pedido

O B1 (BEELINK-26) já serve `ordenar`, `precoMin`, `precoMax`, `desconto` e `opcao`, com facetas e
filtros aplicados, mas o web não repassa nada disso: `catalogueAt` só manda categoria, busca,
página e tamanho. E `withQuery` usa `set`, que derruba um `opcao` repetido.

## Definição de Pronto

1. `/mutante-performance/produtos?ordenar=menor-preco&opcao=Sabor:Chocolate&opcao=Peso:900` chega
   à API com os dois `opcao`.
2. Um preço inválido na URL não esvazia a listagem.
3. `/produtos` e `/busca` respeitam `categoria`.
4. A listagem pede 16 por página, a grade 4 × 4 do design.
5. Testes de `storefront-routes` e de `storefront-data` cobrem cada parâmetro. `pnpm ci-check`
   verde.

## Decisões

### 1. Os filtros são um tipo só, lido num lugar só

`ListingFilters` em `storefront-routes.ts`, com as chaves em português da API. `listingFiltersOf`
lê os `searchParams` como a API leria: uma ordenação desconhecida vira a ordem da loja, um preço
vira inteiro (piso no mínimo, teto no máximo, os dois trocados quando alguém os cruzou), uma
opção sem dois-pontos é descartada. Nada chega à API que ela recuse.

### 2. Os construtores de endereço carregam os filtros

`routes.catalog`, `routes.category` e `routes.search` aceitam os filtros e os escrevem; `opcao`
repetido vai por `append`. A página é sempre de quem chama: um filtro novo começa na primeira.
`toggledOption` liga e desliga um valor mantendo o resto, para a coluna de filtros de B4.

### 3. A página só lê e repassa

`load()` chama `listingFiltersOf` uma vez, passa o resultado a `catalogueAt` e ao paginador. A
categoria vem do segmento numa página de categoria, e de `?categoria=` em `/produtos` e em
`/busca`. O E6 só escreve esse parâmetro no cabeçalho.

## Fora de escopo

- Qualquer controle visual (B3, B4, B12).
- O `noindex` para combinações de filtros (B6).
