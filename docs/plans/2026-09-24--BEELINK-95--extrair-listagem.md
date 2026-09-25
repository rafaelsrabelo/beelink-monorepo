# BEELINK-95 — Extrair a listagem e dar um esqueleto às páginas de seção

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B14 do épico BEELINK-25 (listagem). Primeiro ticket do refoco de 24/09/2026: filtros avançados,
> depois carrinho, depois conta do cliente. Empilhado sobre o D13 (BEELINK-92).

## O pedido

`apps/web/src/app/[slug]/[section]/page.tsx` tinha 344 linhas e vai receber a faixa de resultados
(B3), a coluna de filtros (B4, B16, B12) e a paginação nova (B15). Antes disso, a composição da
listagem sai da página, e as seções ganham esqueleto enquanto os produtos chegam.

## Definição de Pronto

1. `page.tsx` e o compositor da listagem abaixo de 250 linhas cada.
2. Enquanto os produtos não chegam, a página mostra um esqueleto, nunca branco nem "Carregando…".
3. Nenhuma mudança visual além do esqueleto; os testes existentes passam.
4. Um endereço que não existe continua respondendo 404.

## Decisões

### 1. Suspense em volta da listagem, não `loading.tsx`

O ticket pedia `[section]/loading.tsx`. A documentação do Next 16 diz que um `loading.tsx` começa a
resposta antes da página rodar, e daí `notFound()` não consegue mais mudar o status: toda categoria
ou loja inexistente passaria a responder 200 com `noindex`. O produto trata "link que responde não
encontrado" como a falha mais visível que existe, e o contrato do web pede HTML legível por crawler.

Então a página resolve primeiro onde está (loja, seção, categoria) pela navegação da loja, que é
cacheada e traz todas as categorias. Só depois começa o pedido do catálogo e entrega a promessa a
`StorefrontListing`, dentro de um `Suspense` com o esqueleto. O cabeçalho, o menu e o rodapé saem na
hora, nas cores da loja; só a listagem espera. A chave do `Suspense` é a query, para um filtro novo
mostrar o esqueleto de novo quando a navegação virar cliente (B16).

O custo, dito: o Next também faz streaming para robôs. Os produtos estão no HTML, num bloco oculto
que um script inline de uma linha move para o lugar. Um crawler que só lê HTML encontra os links e os
textos; uma pessoa com JavaScript desligado vê o esqueleto. Um `loading.tsx` teria o mesmo custo,
mais o 404.

### 2. O que vive onde

- `src/lib/storefront-section.ts`: `placeOf` (a resolução, nula quando é 404) e as funções puras que a
  página e o `generateMetadata` dividem: título, subtítulo, canônico, o pedido ao catálogo e o link
  de cada página do paginador. Com testes.
- `src/components/storefront/storefront-section-heading.tsx`: trilha, `h1`, contagem e subcategorias,
  para as prateleiras, as categorias e o carrinho.
- `src/components/storefront/storefront-listing.tsx`: espera o catálogo e compõe cabeçalho, busca,
  grade e paginação. B3 e B4 crescem aqui.
- `packages/ui`: `StorefrontListingSkeleton` (trilha, título, contagem e 16 cartões nas colunas da
  grade da loja) e `StorefrontCardSkeleton`, agora dividido com o esqueleto de vitrine da home.

### 3. Categorias e carrinho não pedem mais o catálogo

As duas páginas pediam um catálogo de um produto só para ter a lista de categorias. A navegação da
loja já traz essa lista, cacheada, então o pedido sai.

### 4. "Ofertas do dia" olha a loja inteira

O menu recebia "tem desconto?" do catálogo filtrado: numa categoria sem promoção, "Ofertas do dia"
sumia. Agora vem da navegação, como na home e na página do produto, e o link aparece igual em toda
página da loja.

## Fora de escopo

- A coluna de 264px no esqueleto: ela entra com a coluna de verdade (B4), para o esqueleto nunca ter
  uma forma que a página não tem.
- A faixa de resultados e a ordenação (B3), a coluna (B4), a paginação nova (B15).
- A página do produto continua sem esqueleto próprio (D11).
