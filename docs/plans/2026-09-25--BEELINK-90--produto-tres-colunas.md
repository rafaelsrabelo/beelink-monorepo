# BEELINK-90 — A página do produto em três colunas, com a casca de 5b

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D11 do épico BEELINK-40 (página do produto). Empilhado sobre o G4 (BEELINK-108). Primeiro ticket da
> rodada da página do produto, comparada sempre com `docs/plans/design-handoff/design/5b-loja-pagina-produto.html`.

## O pedido

Hoje a página do produto é uma coluna só: a 1440px a foto ocupa a primeira tela inteira e o preço
aparece perto de y=1620. 5b desenha a trilha, uma linha de três colunas — fotos | informações e
escolha | caixa de compra fixa — e as seções de baixo. Este ticket monta a casca; o conteúdo de cada
coluna vem nos próximos (D5 galeria, D12 seletor, D6 coluna de informações, D7 caixa de compra, D8
seções de baixo).

## Definição de Pronto

1. Trilha numa faixa de 44px (14px em cima e embaixo), como 5b.
2. A 1440px, três colunas de 540 | 452 | 320 (±15px com barra de rolagem clássica), 32px entre elas.
3. A caixa de compra fica 16px abaixo do cabeçalho ao rolar, só numa tela larga e alta o bastante.
4. De 1024 a 1279px, duas colunas: fotos de um lado, informações e compra do outro. No celular, uma.
5. "Visite a loja {nome}" sobre o título; o título em 26px/700, único `h1`.
6. A descrição vira a primeira seção de baixo, `#descricao`, no HTML do servidor.
7. Produto inexistente continua 404.

## Decisões

### 1. Grade com frações, não larguras fixas

`minmax(0,540fr) minmax(0,452fr) 320px` dá exatamente 540 | 452 | 320 a 1440px, e divide o que
sobra numa tela menor. Com 540 e 320 fixos, a 1280px a coluna do meio teria 292px.

### 2. A altura do cabeçalho medida, na raiz da janela

O cabeçalho já é `sticky` e escrevia `--shop-masthead-height` em si mesmo, mas uma variável posta no
`<header>` só vale dentro dele, e a caixa de compra está no `<main>`. `MastheadHeight` mede o
cabeçalho (com a linha de fotos de categoria, que varia) e escreve a variável na raiz da janela. Antes
de medir, quem lê usa 117px, o cabeçalho com a barra de categorias.

### 3. Sticky só em tela larga e alta

`shop-xl` e altura mínima de 760px: uma caixa que gruda com o fundo fora da tela esconde o próprio
botão.

### 4. Sem `loading.tsx`

Mesma razão do B14: um `loading.tsx` começaria a resposta antes do `notFound()`, e um produto que não
existe responderia 200.

### 5. A descrição sai da coluna do meio

Ela vai inteira para `#descricao`, renderizada no servidor. O D6 põe na coluna do meio só a primeira
lista dela ("Sobre este item"), com o link para `#descricao`.

### 6. O que ainda não muda

A galeria (D5), o seletor (D12) e a caixa de compra (D7) estão só realocados, sem redesenho. A linha
de "Adicionar ao carrinho" quebra em duas na coluna de 320px até o D7.

## Fora de escopo

- Conteúdo das colunas (D5, D12, D6, D7), relacionados e ficha técnica (D8).
- Compre junto e avaliações: sem dado, e avaliações adiadas.
