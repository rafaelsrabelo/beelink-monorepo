# BEELINK-29 — A coluna de filtros de 5a: cabeçalho, chips e Categoria

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B4 do épico BEELINK-25 (listagem), no escopo reduzido pela revisão de 24/09/2026. Empilhado sobre o
> B3 (BEELINK-28). É o primeiro pedaço visível dos "filtros estilo Amazon" que o dono priorizou.

## O pedido

5a desenha a listagem em duas colunas sobre o fundo cinza: à esquerda, 264px de filtros; à direita,
a grade. Este ticket entrega a coluna com o cabeçalho "Filtros" e "Limpar tudo", os chips do que está
aplicado e a seção Categoria. As seções de opção, o desconto por faixa e a navegação sem recarregar
são o B16; o preço, o B12; o celular, o B8.

## Definição de Pronto

1. A partir de `shop-lg`, um `<aside aria-label="Filtros">` de 264px ao lado da grade, 28px de gap,
   o corpo sobre `--shop-canvas` com 20px em cima e 40px embaixo.
2. "Filtros" em 18px/800. "Limpar tudo" só com filtro aplicado.
3. Um chip por filtro aplicado, cada um um link para a mesma prateleira sem ele. O preço é um chip
   só, o desconto diz "Em promoção" ou "N% ou mais", a opção mostra só o valor. A categoria da rota e
   o termo buscado não viram chip.
4. Categoria por página: no catálogo e na busca, o primeiro nível com contagem; numa categoria,
   "‹ Todos os produtos", a atual em negrito e as filhas com contagem; numa subcategoria, "‹ Pai" e
   a atual. Categoria com contagem zero some.
5. Os chips de subcategoria somem no desktop e ficam no celular até o B8.
6. Tudo funciona sem JavaScript: cada controle é um link.

## Decisões

### 1. A grade conta colunas pela própria largura

Com a coluna ao lado, uma janela de 1024px deixa 668px para a grade: cabem três cards, não quatro.
As colunas da grade passam a ser container queries (`@xl` e `@4xl`) em vez de breakpoints da janela,
como a atualização do B3 pedia. O número máximo continua sendo o da loja (`productsPerRow`).

### 2. Os chips leem o endereço, não o `applied` da API

O `applied` traz os rótulos da loja, mas o design quer rótulos da página: faixa de preço num chip só,
"Em promoção", só o valor da opção. O endereço já tem tudo isso, e o link de cada chip é o mesmo
endereço sem aquele filtro, na página 1.

### 3. "Limpar tudo" mantém onde se está

Tira o que os chips mostram e mantém o termo buscado, a categoria de uma busca e a ordenação: é a
prateleira sem filtros, não outra prateleira.

### 4. Categoria no catálogo leva à página da categoria

No catálogo, escolher uma categoria abre a página dela com os mesmos filtros. Na busca, estreita a
busca (`categoria=`). A categoria escolhida fica em negrito, e o link dela tira o estreitamento.

### 5. A coluna mora dentro do `Suspense`

As contagens vêm das facetas do catálogo, então a coluna chega junto com a grade. O esqueleto ganha o
lugar da coluna a partir de `shop-lg`, para nada pular.

## Fora de escopo

- Seções de opção, desconto por faixa e a ilha cliente com `router.push` (B16).
- Preço com faixas, slider e mín./máx. (B12).
- O celular: "Filtrar (N)" e o Sheet (B8).
- "Avaliação dos clientes": linhas que parecem controle e não filtram seriam botões mortos.
