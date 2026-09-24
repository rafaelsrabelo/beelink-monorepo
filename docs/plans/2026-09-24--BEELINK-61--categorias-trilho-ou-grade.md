# BEELINK-61 — As categorias ganham o mesmo formato: grade ou trilho horizontal

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B4 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do B3 ([plano](2026-09-24--BEELINK-60--vitrine-trilho-ou-grade.md)).
> Área: UI (e a API que aceita o formato) · ajuste · P · ordem 10/17.

## O pedido

> Mesmo campo display do B3 aplicado ao bloco de categorias, reaproveitando o mesmo trilho.
>
> - As categorias rolam horizontalmente no celular.
> - A grade continua disponível para quem prefere.
> - Categoria sem produto continua fora da vitrine — e o editor explica isso (ver C6).

## Definição de Pronto

1. `CATEGORIES` aceita `display` `RAIL` ou `GRID`, na criação e na edição, e recusa `CAROUSEL` com
   `COMPONENT_DISPLAY_INVALID`. A leitura pública devolve o formato.
2. Com `RAIL`, as categorias rolam na horizontal com snap, sobre o mesmo `scroll-rail` da vitrine de
   produtos, no celular e no computador.
3. Com `GRID`, a grade continua, e respeita a contagem de colunas que o editor oferece.
4. O editor do bloco de categorias deixa escolher trilho ou grade. As colunas só aparecem na grade.
5. Os blocos de categorias que já existem continuam em grade; um bloco novo abre em trilho.
6. Categoria sem produto continua fora do bloco. A explicação no editor é o C6.
7. Stories para o trilho e para a grade.
8. `pnpm ci-check` verde.

## O que já existe e pesa na decisão

- **As colunas do bloco de categorias nunca chegaram à loja.** O editor oferece de 2 a 6 colunas e
  a API grava, mas o web passa `columns` para `StorefrontCategoryGrid`, que só conhece
  `categoriesPerRow`. Um spread de JSX não passa pela checagem de propriedade a mais, então o
  valor some calado, e toda grade de categorias tem três colunas.
- `DisplayField` só conhece carrossel e grade, e `component-form.tsx` está com 246 linhas.

## Decisões

### 1. O formato das categorias é o mesmo campo, com as mesmas duas opções da vitrine

`DISPLAYS_OF_KIND` ganha `CATEGORIES: ['RAIL', 'GRID']`. Sem enum novo nem coluna nova.

### 2. Os blocos existentes ficam em grade; um novo abre em trilho

Uma migração grava `GRID` nos blocos de categorias existentes, que é o que eles desenham hoje.
Ninguém abre a loja e acha a página mudada. Um bloco novo abre em trilho, que é o que o lojista
pediu quando disse que o bloco "devia scrollar horizontalmente".

### 3. O cartão de categoria sai da grade, e o trilho o reaproveita

`StorefrontCategoryCard` passa a ser o cartão, e `StorefrontCategoryGrid` e o novo
`StorefrontCategoryRail` o desenham. O trilho usa `ScrollRail`, com cartões de largura fixa, como o
trilho de produtos. O estado vazio (a frase e a porta para o catálogo) também vira um componente,
usado pelos dois.

### 4. A grade passa a honrar as colunas, por container query

`columns` de 2 a 6, lido da largura da célula, como a grade de produtos do B3. Nulo continua sendo
"automático", que é o que a grade desenha hoje.

### 5. O editor ganha um arquivo para os campos das categorias

`CategoriesFields` junta o formato e as colunas, e sai de `component-form.tsx`, que já está no
limite. `DisplayField` recebe as opções do tipo, então serve ao banner (carrossel, grade), às
categorias (trilho, grade) e à vitrine do B5.

## Fora de escopo

- A explicação no editor para categoria sem produto: C6.
- O formato da vitrine de produtos no editor: B5.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou dois pontos, ambos corrigidos:

- **A story do trilho no celular não mostrava um celular.** Ela usava `viewport.defaultViewport`,
  que o Storybook 10 removeu, e desenhava na largura inteira. Agora usa o global de viewport da
  story, com o tamanho de celular de 414px.
- **O comentário do schema Prisma sobre `display`** ainda dizia "banner e vitrine". Agora inclui as
  categorias, como o contrato e o Swagger.

Um ponto foi refutado como defeito, mas atendido por ser regra do `packages/ui`: `CategoriesFields`
ganhou story e teste próprios.
