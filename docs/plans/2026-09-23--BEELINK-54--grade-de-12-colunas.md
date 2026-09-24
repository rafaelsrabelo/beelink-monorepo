# BEELINK-54 — A faixa vira grade de 12 colunas e honra o `span` do bloco

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A4 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do A2 ([plano](2026-09-23--BEELINK-52--span-e-display-no-contrato.md)).
> Área: UI + web · ajuste · M · ordem 3/17.

## O pedido

> Trocar a coluna por uma grade de 12, cada bloco ocupando as colunas do seu span, colapsando para
> 1 coluna abaixo de 640px. Stories cobrindo as combinações.
>
> - Dois blocos HALF na mesma faixa ficam lado a lado em 1440px.
> - Um bloco THIRD mede um terço da faixa em 1440px.
> - Abaixo de 640px todo bloco ocupa a largura inteira.
> - Story no Storybook para FULL, HALF, THIRD e TWO_THIRDS.

## Definição de Pronto

1. Os blocos de uma faixa são desenhados numa grade de 12 colunas. Cada bloco ocupa as colunas do
   seu `span`: `FULL` 12, `TWO_THIRDS` 8, `HALF` 6, `THIRD` 4.
2. Dois blocos `HALF` na mesma faixa ficam lado a lado em 1440px, medido no navegador.
3. Um bloco `THIRD` mede um terço da faixa em 1440px, medido no navegador.
4. Abaixo de 640px todo bloco ocupa a largura inteira, medido em 390px.
5. O Storybook tem uma story para cada `span` e uma que mistura os quatro.
6. Um banner de vários slides também respeita o `span`: o carrossel ocupa a célula dele, e não a
   faixa inteira.
7. No modo design, o preview mostra a largura escolhida no painel antes de publicar.
8. `pnpm ci-check` verde.

## O que está construído, e onde a coluna de verdade mora

O ticket aponta `storefront-section.tsx`, mas esse é o bloco de uma faixa **titulada** (título e
"ver tudo") usado nas páginas de catálogo. Quem empilha os blocos da página inicial são dois
lugares:

- `StorefrontSectionBand` desenha a faixa com `flex flex-col gap-8`;
- `StorefrontSections`, no web, agrupa pôsteres vizinhos (`runsOf`) num `StorefrontShowcase`, que
  por sua vez faz fileiras por `layout`. Esse agrupador foi o único jeito de dois pôsteres ficarem
  lado a lado, e só funcionava entre pôsteres de mesmo `layout` e de um slide.

## Decisões

### 1. A grade é um bloco próprio, dentro da faixa

`StorefrontBandGrid` e `StorefrontBandCell` em `packages/ui`. A faixa continua aceitando qualquer
filho; quem monta a página põe a grade dentro dela. Assim a faixa não passa a exigir que todo filho
seja uma célula.

### 2. O agrupador de pôsteres sai

Com a grade, três blocos `THIRD` entregues um a um já formam uma fileira. `runsOf` e `isPoster`
deixam de existir: cada componente é uma célula, e o que está dentro dela é o que ele sempre foi —
um pôster para um banner de um slide, o carrossel para um de vários.

`StorefrontShowcase` perde o `layout` por item e ganha o `span` do bloco, que decide a proporção da
imagem e o tamanho do título. Ele preenche a célula que recebe. A grade de slides de um mesmo banner
(`display: GRID`) é o A5.

### 3. O rascunho do editor guarda `span`, não `layout`

O preview é desenhado a partir do rascunho, e o rascunho guardava `layout`. Para o preview mostrar a
largura escolhida antes de publicar, o rascunho passa a guardar `span`, e o seletor do painel
escreve `span`: as mesmas três opções, com os mesmos rótulos. Publicar manda `span`.

O seletor passa a aparecer também para banners de vários slides: desde que o carrossel ocupa a
célula dele, a largura muda o que se vê. Oferecer o seletor a todo tipo de bloco, `TWO_THIRDS` e a
largura da faixa ao lado são o A6.

### 4. O espaçamento não muda

Faixa contida: 16px entre blocos lado a lado, 32px entre fileiras, que era o espaço entre blocos
empilhados. Faixa ponta a ponta: sem espaço, como antes.

### 5. 640px é onde tudo vira uma coluna

É o `sm` do Tailwind do projeto, como o plano do épico recomendou.

## Fora de escopo

- `display` decidir entre carrossel e grade: A5.
- O controle de largura novo, no cartão, com a largura da faixa ao lado: A6.
- A folha do banner ainda tem o seu "Tamanho", que grava `layout` direto no servidor. São dois
  controles para o mesmo campo, e o rascunho não vê o que a folha salvou até recarregar. Esse
  defeito já existe com `layout`, e o A6 junta os dois controles num só.

## Adendo — 24/09/2026, depois da revisão

Uma revisão independente (três leituras, cada achado verificado por quem tentou refutá-lo) confirmou
sete defeitos deste diff. Todos foram corrigidos:

- **O carrossel numa fatia menor que a faixa** mantinha as alturas fixas e o título grande de quem
  ocupa a faixa inteira. Num terço, ele ficava mais alto que os pôsteres ao lado e cortava o título.
  Agora `StorefrontHero` recebe o `span` e, fora da largura cheia, usa a proporção e o título do
  pôster daquela fatia (`storefront-span-shape.ts`, compartilhado pelos dois). Medido em 1440px: o
  carrossel e o pôster, os dois num terço, têm 332px de altura.
- **A decisão 4 estava errada.** Pôsteres lado a lado numa faixa ponta a ponta tinham 16px entre
  eles, e não zero. A faixa ponta a ponta mantém 16px entre vizinhos, e os blocos empilhados seguem
  encostados.
- **Um terço a partir de 640px** tem 187px e cortava o título de um pôster com link. Entre 640px e
  1024px os terços viram metades, como os pôsteres eram antes da grade. Dois terços também viram
  metade ali, então os dois continuam dividindo a fileira. A partir de 1024px cada fatia é a sua. Os
  critérios do ticket, medidos em 1440px e 390px, continuam valendo.
- **Dois terços em 8:3** fica 6px mais alto que o terço em 4:3 ao lado, por causa do espaço de 16px
  entre as colunas. O comentário que dizia "a mesma altura" foi corrigido. Uma proporção simples não
  chega mais perto que isso.
- **A grade não tinha teste**, e a célula não tinha checagem de acessibilidade (axe). Agora as duas
  têm.
- **Quatro comentários citavam o `runsOf`**, que este diff removeu. Foram reescritos.
