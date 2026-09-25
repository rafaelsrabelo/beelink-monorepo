# BEELINK-74 — A janela da loja pronta para as duas composições do design

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E2 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E3 (BEELINK-75).

## O pedido

Preparar `StorefrontWindow` para o que 5a e 5b desenham. 5a tem, logo abaixo do menu, uma faixa
branca de largura total com borda inferior (trilha, título, ordenação) e, embaixo, um fundo cinza
com o conteúdo. 5b tem a trilha com padding 14px 32px e as colunas logo abaixo. Hoje todo conteúdo
cai num `<main>` contido, com 32px acima e abaixo e 32px entre blocos, e a margem lateral é 40px
contra 32px no design. A janela tinha 468 linhas, acima do limite de 250.

## Definição de Pronto

1. `storefront-window.tsx` abaixo de 250 linhas.
2. Rodapé idêntico ao de hoje, em arquivo próprio, com story e teste.
3. A margem lateral é 32px a 1440 no cabeçalho, no conteúdo e no rodapé, e os três ficam
   alinhados.
4. Home e carrinho continuam iguais, fora a margem. `pnpm ci-check` verde.

## Decisões

### 1. Três coisas saem da janela

O rodapé vira `StorefrontFooter`, sem mudança visual: 5a e 5b não desenham rodapé, então ele
continua o de hoje. A apresentação (nome, linha e WhatsApp) vira `StorefrontPitch`. A paleta já
tinha saído no E3. A janela fica com 214 linhas.

### 2. A medida é uma só, e tem 32px

`BAND` deixa de ter uma cópia privada na janela e passa a vir de `storefront-band.tsx`, com
`shop-lg:px-8`. Cabeçalho, menu, bandas da home e rodapé andam juntos, e o teste da banda fixa o
valor.

### 3. Dois modos de página, e um chão

- `pageHeader`: um nó desenhado em largura total entre o cabeçalho e o `<main>`. A faixa de
  resultados de 5a (B3) e a trilha de 5b (D11) entram por aqui.
- `layout: "padded" | "flush"`: o de hoje, ou sem espaçamento fixo, para a página decidir o
  próprio ritmo. A medida continua nos dois.
- `surface: "background" | "canvas"`: o fundo da loja, ou o `--shop-canvas` do E3, para a
  listagem cujos painéis são pintados no fundo e precisam de um chão.

Nenhuma página muda neste ticket: os três têm o valor de hoje por padrão.

## Fora de escopo

- O conteúdo da faixa da listagem (B3, BEELINK-28) e da página do produto (D11, BEELINK-90).
