# BEELINK-75 — Tokens da vitrine para o design

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E3 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o D10 (BEELINK-89).

## O pedido

Dar nome aos tons que os desenhos 5a e 5b usam e a vitrine não tem. Sem eles, cada tarefa da rodada
inventa o próprio `color-mix`. Dois acentos já somem hoje: o sublinhado da categoria ativa e o selo
do carrinho pintam `--shop-primary` sobre `--shop-header`, e na Mutante as duas cores são a mesma.

## Definição de Pronto

1. Na Mutante (primária = cabeçalho), o tom da marca no cabeçalho tem contraste visível contra o
   cabeçalho, com teste de unidade do cálculo.
2. Os neutros do design têm nome, derivados da tinta da página, e as quatro cores semânticas
   (promoção, positivo, estrela, compra verificada) existem com uma forma legível em loja escura.
3. A paleta nasce numa função só, usada pela raiz da janela e reaplicada por uma sobreposição em
   portal.
4. Nenhum hex em `.ts`/`.tsx`; `pnpm ci-check` verde, com story de loja clara e escura.

## Decisões

### 1. A paleta é uma função pura, `shopPaletteStyle(colors)`

Saiu de `StorefrontWindow` para `lib/shop-palette.ts`. `shopPaletteVariables` dá só as variáveis;
`shopPaletteStyle` acrescenta a pintura da raiz. É o que permite testar a Mutante sem montar a
janela. A tabela design → token, com os valores da loja de exemplo dos desenhos (o gate de cores
não deixa um hex nem em comentário de `.ts`):

| Cor do design | Onde | Token |
|---|---|---|
| `#6d28d9` | botões, checks, pílula escolhida | `--shop-primary` |
| `#4338ca`, `#3b0764` | links, texto do chip | `--shop-primary-ink` |
| `#25227a` | cabeçalho | `--shop-header` / `--shop-on-header` |
| `#a78bfa`, `#8b5cf6` | sublinhado ativo, selo do carrinho, botão da busca | `--shop-primary-on-header` |
| `#ddd6fe` | "Ofertas do dia" | `--shop-primary-on-header-soft` |
| `#16144a` | página atual, "Comprar agora", faixa | `--shop-text` / `--shop-on-text` |
| `#16152b` | texto | `--shop-on-background` |
| `#5b5a70` | texto apagado | `--shop-muted` |
| `#e4e4ec` | divisórias e linhas de tabela | `--shop-line` |
| `#c9c9d6` | bordas de controle | `--shop-line-strong` |
| `#d9d9e3` | molduras | `--shop-frame` |
| `#f7f7fa`, `#ececf3` | preenchimentos, o select da busca | `--shop-fill` |
| `#efeff5` | lugar da foto | `--shop-placeholder` |
| `#f4f4f7` | o fundo cinza da listagem | `--shop-canvas` |
| `#ffffff` | painéis | `--shop-background` |
| `#b42318`, `#067647`, `#f59e0b`, `#9a3412` | promoção, positivo, estrela, compra verificada | `--shop-sale`, `--shop-positive`, `--shop-rating`, `--shop-verified` |

### 2. A marca no cabeçalho é a marca tonalizada contra o cabeçalho

`--shop-primary-on-header = toneOn(primary, header)`, e `--shop-on-primary-on-header` é a tinta
legível sobre esse tom. Numa loja cujas duas cores diferem, é a própria marca. Uma variante mais
clara (`-soft`) serve a "Ofertas do dia".

### 3. Neutros são a tinta da página misturada na página

`--shop-muted` (65%), `--shop-line` (10%), `--shop-line-strong` (22%), `--shop-frame` (15%),
`--shop-fill` (3%), `--shop-placeholder` (6%) e `--shop-canvas` (4%) são `color-mix` de
`--shop-on-background` em `--shop-background`. Numa loja escura eles clareiam sozinhos.

### 4. As cores semânticas ficam no CSS, em três formas

Promoção, positivo, estrela e compra verificada não são de nenhuma loja, então ficam em
`globals.css`, o único lugar onde uma cor pode ser escrita. Cada uma tem a superfície, o que lê
sobre ela (`--shop-on-sale`) e uma tinta para página escura (`--shop-sale-on-dark`). Como o CSS não
mede contraste, a função escolhe a tinta da loja em `--shop-sale-ink`.

### 5. O que sai da janela leva a paleta junto

Dialog, Sheet, Popover e a lista do Select são portais: fora da raiz, `var(--shop-primary)` é
nada. `ShopPaletteProvider` oferece as variáveis, e um bloco que portala põe `useShopPalette()` no
conteúdo. O diálogo do Avise-me é o primeiro a fazer isso.

### 6. As variáveis viram utilitários do Tailwind

`@theme inline` mapeia cada `--shop-*` para `--color-shop-*`, então um bloco pode escrever
`text-shop-muted` ou `border-shop-line` em vez de um `var()` inline.

## Fora de escopo

- Aplicar os tokens nos blocos. Cada tarefa da rodada usa os seus.
