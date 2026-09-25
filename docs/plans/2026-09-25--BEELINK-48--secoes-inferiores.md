# BEELINK-48 — As seções de baixo da página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D8 do épico BEELINK-40 (página do produto). Empilhado sobre o D5 (BEELINK-45). Comparado com
> `docs/plans/design-handoff/design/5b-loja-pagina-produto.html` a 1440px e a 390px.

## O pedido

Abaixo da linha de três colunas, na ordem de 5b: produtos relacionados, e "Descrição do produto" ao
lado de "Informações técnicas".

## Definição de Pronto

1. "Você também pode gostar": até 18 produtos da mesma categoria, sem o próprio produto.
2. A 1440px, seis cards compactos de 216px, 16px entre eles: foto de 180px com raio 12, nome em 14px
   na tinta da loja, preço em 18px/800. "Página 1 de 3" em 13px à direita do título, só com mais de
   uma página e só a partir de `shop-lg`; as setas andam uma página por vez.
3. A 390px, dois cards e uma ponta do terceiro, que passam com o dedo; sem rolagem na página.
4. A descrição ao lado das informações técnicas (2 × 664px a 1440, 48px entre elas), empilhadas no
   celular. Sem uma das duas, a outra ocupa a largura; sem nenhuma, não há seção.
5. Tabela técnica com borda em `--shop-line`, rótulo no fundo `--shop-fill` em 40% da largura:
   Categoria, e cada opção com todos os seus valores.
6. A página chega com o produto antes dos relacionados: eles vêm por streaming, com um esqueleto no
   formato do trilho. Um produto sem categoria não tem trilho, e uma leitura que falha também não.

## Decisões

### 1. "Você também pode gostar", não "Clientes que viram…"

O título de 5b afirma um rastreio que não existe. São produtos da mesma categoria, e o título diz
isso sem prometer mais (ajuste da revisão do ticket).

### 2. A leitura começa antes de tudo e é aguardada só dentro do Suspense

A página dispara `catalogueAt` da categoria logo depois de ler o produto e segue; o componente dos
relacionados aguarda dentro de um `Suspense`. O produto aparece sem esperar os relacionados, e uma
falha vira ausência do trilho, nunca uma página quebrada (a promessa tem `.catch`). Sem
`loading.tsx`, pelo motivo do B14: o 404 precisa ser decidido antes do streaming começar.

### 3. O `ScrollRail` ganha páginas

Com `pageStatus`, as setas andam uma página (a largura menos a sangria de 32px, mais o vão de 16px),
e a linha do título mostra "Página X de Y", lida da rolagem. O estado é uma string ("2/3"), para o
`useSyncExternalStore` não entrar em laço com um objeto novo a cada leitura. No celular o contador
some: contaria nove páginas de dois cards.

### 4. Card compacto sem selo

O card compacto é um link só, sem moldura e sem o selo de desconto que o design não desenha. O preço
é uma string só, e o texto do preço para leitor de tela fica dentro do card (`relative`): posicionado
fora do trilho, ele escapava do recorte e alargava a página.

### 5. A tabela vem do que o produto já sabe

Categoria e as opções com seus valores. Marca, porção, cafeína e tabela nutricional esperam os campos
do D4; SKU nunca é público (BEELINK-21).

## Fora de escopo

- "Compre junto" (sem combos, C6), avaliações (adiadas) e a área de imagens da descrição.
- Nota e Pix nos cards relacionados (sem dados).
