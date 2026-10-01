# BEELINK-93 — D14 · Avaliações de clientes na página do produto, com as avaliações reais

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> D14 sai do Backlog com as avaliações reais do J17 (#153). Empilhado sobre o J19 (#155). O layout
> é o da 5b. A fonte de exemplo do D13 (`storefront-demo.ts`) não chegou a ser ligada em nenhuma
> tela, e sai.

## Definição de Pronto

1. A página do produto termina com a seção "Avaliações de clientes" (`#avaliacoes`), como a 5b:
   - à esquerda, o resumo: as estrelas, "4,7 de 5", "N avaliações" e o histograma de 5 linhas;
   - à direita, a lista paginada das publicadas, cada uma com o autor, as estrelas, "Avaliado em … ·
     a combinação · Compra verificada" e o comentário.
2. Cada linha do histograma filtra a lista por aquela nota, e "Todas as notas" volta.
3. A linha de nota do topo (D6), abaixo do título, mostra a média e leva a `#avaliacoes`.
4. O card de produto mostra a linha de nota quando o produto tem avaliações e a loja não desligou
   `showProductRating`.
5. Sem nenhuma avaliação, nem a seção nem as linhas de nota aparecem.
6. A fonte de exemplo e as variáveis `STOREFRONT_DEMO_*` saem.
7. Há testes dos blocos (com axe) e da leitura do endereço, e stories. `pnpm ci-check` está verde.

## Decisões

### 1. A seção, lida no servidor

- **`productReviewsAt(slug, productId, { rating, page })`** lê a rota pública do J17, com a tag
  `catalog:<slug>` e revalidação de 60 s. Ocultar uma avaliação no painel derruba essa tag (J19).
- **O endereço:** `?nota=N` e `?pagina-avaliacoes=N`. Os links levam `#avaliacoes`, e o filtro não
  tira a variação escolhida (`?variant=`), que continua no endereço.
- **Um componente de servidor** (`ProductReviews`) desenha a seção dentro de um `Suspense`, com
  esqueleto. Uma leitura que falhou não desenha nada: a seção é complemento da página e não a
  derruba.

### 2. Os blocos (packages/ui)

- **`StorefrontProductReviews`:** a `section` de duas colunas da 5b, com o `h2`.
- **`StorefrontReviewSummary`:** o `StorefrontRating` do tamanho da página e o histograma. Cada
  linha é um link, com `aria-label` "5 estrelas: 78% das avaliações", e a linha da nota escolhida fica
  marcada.
- **`StorefrontProductReview`:** o `article`, com a inicial no lugar da foto, o nome, as estrelas e a
  linha de data, combinação e "Compra verificada" (todas são de quem recebeu). Depois vem o
  comentário.
- **O que fica de fora da 5b:** "Escrever avaliação", "Útil", "Denunciar", fotos e títulos. Não há
  nada por trás deles: a avaliação se escreve em Minha conta (J18).

### 3. As linhas de nota

- **No topo:** `StorefrontProductDetail` ganha a vaga `rating`, que a web preenche com o
  `StorefrontRating` (tamanho página, `#avaliacoes`) a partir de `product.rating`.
- **No card:** `StorefrontProduct` ganha `rating`, e o card desenha o `StorefrontRating` abaixo do
  nome quando `showRating`. Grade, trilho e catálogo repassam `showRating`, e a vitrine e a listagem
  mandam `layout.showProductRating ?? true`.

## Fora de escopo

- Escrever a avaliação na página.
- "Útil", denunciar, fotos e títulos.
- Ordenar por relevância.

## Adendo da revisão (30/09)

- **Os links da seção mantêm a variação escolhida agora.** A seção é desenhada no servidor com o
  endereço com que a página abriu, e escolher outra combinação só reescreve o endereço no lugar.
  Então o histograma, "Todas as notas" e as páginas usam `ReviewLink`, que lê o `variant` ao
  desenhar.
- **A seção só é lida quando o produto tem avaliações** (`product.rating`). A maioria das páginas não
  pede nada e não mostra um esqueleto que depois some.
- **A âncora `#avaliacoes` para abaixo do cabeçalho fixo da loja** (`scroll-mt` com a altura dele).
- **A nota do topo é um link de verdade.** Ele está na ordem do teclado e carrega a frase "Nota 4,7
  de 5, 128 avaliações", que deixa de ser lida duas vezes. "1 avaliação" vai no singular.
- **Cada avaliação mostra a nota em número** ao lado das estrelas, para quem não distingue as
  cores.
- **No histograma, uma nota que tem avaliações nunca mostra 0%:** o mínimo é 1%.
- **O vazio depende do caso.** Com um filtro de nota, a frase diz que não há avaliação com aquela
  nota. Sem filtro (uma página além da última), diz "Nenhuma avaliação nesta página."
- **O que a revisão apontou e não procede:**
  - o trilho de relacionados é compacto e não desenha a nota, então não falta a linha ali;
  - a seção aparece mesmo com `showProductRating` desligado, de propósito: a loja esconde a nota
    dos cards, e não o que os clientes escreveram na página do produto.
