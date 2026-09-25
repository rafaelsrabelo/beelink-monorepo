# BEELINK-91 — O seletor de variação no visual de 5b

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D12 do épico BEELINK-40 (página do produto). Empilhado sobre o D11 (BEELINK-90). Comparado com
> `docs/plans/design-handoff/design/5b-loja-pagina-produto.html` a 1440px e a 390px.

## O pedido

5b desenha o Sabor como cartões numa grade de quatro colunas — a foto do sabor, o nome, o preço — e
o Tamanho como pílulas largas com o preço embaixo. Hoje todo valor é uma pílula do ToggleGroup, na
cor do painel, e o preço só aparece quando os valores custam diferente.

## Definição de Pronto

1. Legenda "Sabor: **Frutas vermelhas**" em 15px, 8px acima da linha; 14px entre uma opção e outra.
2. Cartões para a opção cujos valores têm foto marcada ou cor: 4 colunas de 8px de vão, 129px de
   altura na linha toda (5b: 107 × 129), raio 12px, espaço de 52px para a foto com raio 8px.
3. Pílulas para as demais: 110px no mínimo, 10px × 12px de respiro, raio 12px, rótulo de 14px e o
   preço de 13px embaixo (56px de altura; 5b: 58).
4. O preço em todo valor, mesmo quando é igual (substitui a decisão do A7, como o ticket manda).
5. Escolhido: borda de 2px e o fundo lavado da loja, nome em negrito; o respiro perde 1px para nada
   mexer quando a borda cresce.
6. Esgotado: borda tracejada, nome riscado, texto apagado, "Esgotado · avise-me" no lugar do preço, e
   continua escolhível. O valor que nenhuma combinação tem continua desabilitado.
7. Teclado: uma parada de Tab por opção, setas andando entre os valores e pulando o desabilitado.
8. Axe sem violações, em cartões e em pílulas.

## Decisões

### 1. Dois tons novos da paleta da loja

`--shop-primary-tint` (8% da cor da loja sobre o fundo) e `--shop-primary-tint-strong` (16%), feitos
com `color-mix` como os demais. São o fundo do escolhido e o espaço da foto do escolhido sem foto.

### 2. A borda do escolhido é a tinta, não a cor da loja

5b usa o roxo da loja, que já é escuro. Uma cor de loja clara — o verde-esmeralda da loja de teste —
fica abaixo de 3:1 sobre o branco (WCAG 1.4.11). `--shop-primary-ink` é a cor da loja escurecida até
4,5:1: numa loja de cor escura é a mesma cor, então 5b continua igual.

### 3. A foto do valor vem das fotos marcadas

`valuePhotoOf` pega a primeira foto do produto marcada com aquele valor (a marcação do A8). Sem foto,
o cartão mostra a cor do valor, e sem cor, um espaço reservado.

### 4. No celular, quantas colunas couberem com o preço numa linha

`repeat(auto-fill, minmax(76px, 1fr))` abaixo de `shop-sm`: quatro colunas a 360px, três a 320px.
Com três fixas, o quarto sabor ficava sozinho numa segunda linha. A grade precisa de `w-full`: o
primitivo põe `w-fit`, e uma grade de largura intrínseca resolve `auto-fill` para uma coluna só.

### 5. Altura de linha 1,2 dentro dos cartões

O primitivo põe `text-sm`, que traz 20px de altura de linha, e os textos de 13px herdavam a razão
1,43. 5b usa `normal`, cerca de 1,2 na Figtree: os tamanhos dentro do cartão são em pixels para
herdar o 1,2 do botão.

## Fora de escopo

- "econ. 12%" da pílula de 600 g: o nome do valor é texto livre, sem quantidade modelada.
- O cartão esgotado de 5b tem cursor `not-allowed`; aqui ele continua escolhível, porque é por ele
  que se chega ao "Avise-me" (decisão 1 do BEELINK-23).
