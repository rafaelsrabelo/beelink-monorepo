# BEELINK-85 — Preço dividido e selo de desconto sobre a foto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B9 do épico BEELINK-25 (listagem). Empilhado sobre o E6 (BEELINK-78). O card (B5), a coluna de
> informações (D6), a caixa de compra (D7) e os relacionados (D8) usam este bloco.

## O pedido

5a e 5b desenham o preço com o inteiro grande e os centavos elevados, e o desconto como um selo
vermelho sobre a foto. Hoje `StorefrontPrice` imprime uma string só, o preço antigo numa linha
acima e o percentual como pílula na cor da marca ao lado.

## Definição de Pronto

1. Quatro tamanhos: card (inteiro 28px), produto (36px, "-N%" antes, "De:" embaixo), caixa de
   compra (32px) e compacto (string única 18px).
2. A divisão usa `formatToParts`, nunca fatia a string: "R$ 1.299,90" mantém o separador. As
   partes ficam `aria-hidden`, e um `sr-only` lê o preço inteiro.
3. Selo de desconto no vermelho de promoção, com o texto em `--shop-on-sale`, sobre a foto: canto
   superior direito no card, esquerdo na foto do produto.
4. Story com R$ 8,90, R$ 119,90 e R$ 1.299,90 em todos os tamanhos; testes da divisão e do
   `sr-only`; `web/no-hex-colors` em zero. `pnpm ci-check` verde.

## Decisões

### 1. O bloco desenha o preço; a foto desenha o selo

`StorefrontDiscountBadge` é um bloco à parte, posicionado sobre a foto por quem a desenha. O card
o recebe já neste ticket, no lugar da pílula que ficava ao lado do preço, para a listagem não
perder o desconto até o B5. A página do produto o receberá na galeria (D5).

### 2. `Math.floor` continua

O design arredonda para o mais próximo; a loja nunca exagera a economia. O selo e o "-N%" da
coluna usam o mesmo `discountPercent`, e o `discountPercent` do B13 no banco arredonda igual.

### 3. O preço antigo no card cai para a linha de baixo quando não cabe

Um `flex-wrap` com o preço antigo na base: num card de 176px ou na grade de duas colunas do
celular, ele desce em vez de quebrar no meio, como a nota antiga do bloco já pedia.

## Fora de escopo

- Linha do Pix e parcelas: sem configuração da loja.
- O `aria-live` do preço na coluna de informações (D6).
