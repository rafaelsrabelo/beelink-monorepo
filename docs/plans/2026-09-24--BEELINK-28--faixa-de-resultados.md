# BEELINK-28 — A faixa de resultados de 5a e a ordenação

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B3 do épico BEELINK-25 (listagem), no escopo reduzido pela revisão de 24/09/2026. Empilhado sobre o
> B14 (BEELINK-95).

## O pedido

A listagem de 5a abre com uma faixa em largura total: a trilha, o título com "1–16 de 86 resultados
para "pré-treino"" ao lado, e "Ordenar por" à direita. A vitrine tinha trilha, título e uma contagem
solta, e nenhuma ordenação na tela, embora a API e a URL já entendessem `ordenar` desde o B7.

## Definição de Pronto

1. A faixa em largura total, fundo da página e fio embaixo: trilha, `h1` de 26px/800 e a contagem.
2. A contagem usa o total, a página e o tamanho que a API devolve, nunca o tamanho de uma página.
3. Na busca, o termo em negrito, entre aspas retas, na cor de promoção. Na busca com categoria, o
   `h1` é o nome da categoria.
4. "Ordenar por" com Mais relevantes, Menor preço, Maior preço, Maior desconto e Lançamentos.
   Trocar a ordem reescreve `ordenar`, mantém os outros filtros e volta à página 1.
5. A ordenação funciona sem JavaScript.

## Decisões

### 1. A faixa abre o `<main>`

O E2 criou o espaço `pageHeader` da janela entre o cabeçalho e o `<main>`. Agora a faixa carrega o
`h1` da página, e um `h1` fora do `<main>` é o que "pular para o conteúdo" pula. O espaço passa a ser
o primeiro filho do `<main>`, ainda em largura total, e o teste que fixava o contrário muda de
propósito.

### 2. O título não espera; só a contagem

A trilha e o título saem do endereço, então a faixa desenha na hora. A contagem aguarda o mesmo
pedido do catálogo que a grade aguarda, cada um sob o seu `Suspense`: um pedido, duas esperas.

### 3. A ordenação é um formulário GET

Um `<select>` nativo num formulário cuja ação é o endereço da prateleira. Os outros filtros vão como
campos ocultos, `opcao` repetido incluído, e a página fica de fora. Com JavaScript, mudar a opção
envia o formulário. Sem ele, um botão "Ordenar" aparece dentro de `<noscript>`. Não há estado de
cliente nem roteador: o endereço é o estado. O bloco é `"use client"` só pelo `onChange`.

### 4. As subcategorias descem para o corpo

Os chips de subcategoria estavam sob o título. A faixa de 5a não os tem, então eles abrem o corpo da
listagem, acima da grade. Devem ir para a coluna de filtros no B4.

### 5. Categorias e carrinho usam a mesma faixa

Sem contagem e sem ordenação, só a trilha e o título: toda página de seção abre igual.

### 6. "Lançamentos"

`sortNewest` passa de "Mais recentes" para "Lançamentos", como 5a escreve. "Mais vendidos" e "Melhor
avaliados" ficam fora até existir dado.

## Fora de escopo

- O botão Grade/Lista: o modo lista não tem desenho, e nenhum bloco desenha o card horizontal.
- O fundo cinza do corpo, a coluna e a grade que segue a largura da coluna (B4).
- A paginação no visual de 5a (B15).
- Tirar o campo de busca repetido do corpo de /busca, que o escopo reduzido deixou de fora.
