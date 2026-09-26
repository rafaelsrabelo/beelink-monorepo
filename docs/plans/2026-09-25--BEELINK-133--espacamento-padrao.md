# BEELINK-133 — Um espaçamento só entre as seções, e ponta a ponta sem canto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I9 do Épico I. Rafael, 25/09: "criei um banner que é pra estender de ponta a ponta no topo e ele
> fica arredondado nas pontas e dá pra ver a cor de fundo, os espaçamentos têm que ser padrão!"

## Definição de Pronto

1. Um banner numa faixa de ponta a ponta encosta nas bordas e, se for a primeira faixa, no
   cabeçalho, sem canto arredondado, em 390 e em 1440 px.
2. Entre uma faixa e a seguinte há uma regra só, escrita num lugar só, e a prévia do modo design
   segue a mesma.
3. Uma faixa colorida tem a própria cor em volta do texto dela.
4. Uma faixa que não desenha nada não ocupa espaço na loja (no modo design, continua o espaço para
   preencher).

## O que estava errado (medido em 1440 e 390 px, na loja e na prévia)

- Banner de uma foto: sempre `rounded-2xl` (18 px), mesmo de ponta a ponta. A cor do cabeçalho
  aparecia nos cantos.
- Carrossel: o contrário. O único chamador dizia sempre `width="FULL"`, então um carrossel dentro
  da margem ficava quadrado, ao lado de fotos arredondadas.
- Espaço entre faixas: `gap-8` do `<main>` somado ao `py-2` de cada faixa com margem. Dava 48 px entre duas
  faixas com margem, 40 px entre uma com margem e uma de ponta a ponta, 32 px entre duas de ponta a ponta, 8 px sob o
  cabeçalho para uma com margem e 0 para uma de ponta a ponta.
- A cor de uma faixa só cobria 8 px (ou 0) em volta do texto, e os 32 px de fora eram da página.
- Numa faixa de ponta a ponta, o texto encostava na borda da tela, e blocos empilhados se tocavam.
- Faixas vazias (banner sem foto) deixavam 48 px de branco cada.

## A regra

1. **32 px entre duas faixas**, e nada mais soma: a faixa perde o `py-2` e o `<main>` perde o `gap-8`.
2. **Superfícies se encostam.** Superfície é a faixa que pinta de ponta a ponta: tem cor própria, ou é
   de ponta a ponta e só tem fotos (banner) ou a faixa de vantagens. Entre duas superfícies, 0. O
   cabeçalho conta como superfície: uma capa fica colada nele, e o resto começa 32 px abaixo.
3. **Faixa colorida com texto** ganha 32 px da própria cor em cima e embaixo. Uma de fotos deixa a
   foto preencher a cor.
4. **Ponta a ponta:** fotos sem canto e sem margem; textos com a margem lateral da página; 16 px entre
   blocos nos dois sentidos.
5. **Dentro da margem:** como antes, e toda foto com o canto da página, carrossel incluído.
6. **Faixa vazia** não é desenhada na loja. No modo design continua o espaço para preencher.

Escrita uma vez, em `apps/web/src/components/storefront/band-rhythm.ts`, e aplicada por
`StorefrontSections`, que a loja e a prévia usam. É um sinal por faixa (`mt-8`), não margens que
colapsam: o modo design embrulha cada faixa, e um embrulho que abre um novo contexto de layout
desliga o colapso sem avisar.

## Fora de escopo

- A altura de um banner de uma foto (proporção 4/3 → 21/9) e a de um carrossel (altura fixa) ainda
  diferem.
- A faixa de vantagens dentro de uma faixa com margem (margem dentro de margem) e o `py-6` do
  formulário de contato.
