# BEELINK-82 — Fonte Figtree na vitrine

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E10 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E2 (BEELINK-74).

## O pedido

Todos os artboards de 5a e 5b usam Figtree, de 400 a 800, e as medidas só batem com ela. Hoje o
layout raiz carrega Geist para o app inteiro, painel e vitrine.

## Definição de Pronto

1. A vitrine fica em Figtree; o painel continua em Geist e não pré-carrega a fonte.
2. A prévia do modo design e as stories da vitrine mostram Figtree.
3. Sem salto de layout na troca. `pnpm ci-check` verde, com um site INSTITUTIONAL conferido.

## Decisões

### 1. A fonte carrega no segmento da vitrine, não na raiz

`apps/web/src/app/[slug]/layout.tsx` carrega Figtree com `next/font/google` e envolve as páginas
da loja num elemento com a variável da fonte. Uma fonte no layout raiz é pré-carregada em toda
página do painel também.

### 2. A janela lê `--font-shop` e cai no que herdar

`StorefrontWindow` põe `fontFamily: var(--font-shop, inherit)` na raiz. `packages/ui` não importa
`next/*`, então quem nomeia a fonte é o app: o layout da vitrine e a prévia do modo design definem
`--font-shop: var(--font-figtree)` no mesmo elemento que leva a classe da fonte. Onde ninguém
define, a janela fica na fonte da página.

### 3. As stories carregam a fonte pelo Google Fonts

`.storybook/preview-head.html` liga o CSS do Google Fonts e define `--font-shop` na raiz. Só a
janela lê a variável, então as stories do painel continuam na fonte de sempre.

## Fora de escopo

- Fonte escolhida por loja. Não existe essa configuração.
