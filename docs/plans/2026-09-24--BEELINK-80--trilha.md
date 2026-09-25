# BEELINK-80 — A trilha "Você está em" no estilo do design

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E8 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E10 (BEELINK-82).

## O pedido

5a e 5b usam a mesma trilha: 13px, separador "›" e links na cor de link da marca. Hoje
`StorefrontBreadcrumb` tem 12px, um chevron com opacidade 40, links com opacidade 70 na cor da
tinta e o último item em negrito.

## Definição de Pronto

1. O nome acessível é "Você está em", e os separadores não são lidos.
2. 13px, gap de 6px, "›" em texto, links em `--shop-primary-ink` sem sublinhado com hover mais
   escuro, separadores e último item em `--shop-muted` com peso 400.
3. Na listagem, o crumb do catálogo diz "Produtos", como em 5a.
4. Teste e story atualizados, axe sem violações, `pnpm ci-check` verde.

## Decisões

### 1. O bloco não tem espaçamento próprio

5a põe a trilha dentro da faixa de resultados; 5b a põe com padding 14px 32px acima das colunas.
Quem usa a trilha decide onde ela fica: a faixa em B3 (BEELINK-28), o produto em D11
(BEELINK-90). Aqui só o texto muda.

### 2. Os tokens do E3 fazem o trabalho

`text-shop-muted` para a linha, `text-shop-primary-ink` para os links, e o hover é a cor do link
misturada com a tinta da página, sem hex.

### 3. "Produtos" e não "Todos os produtos"

O título da estante continua "Todos os produtos"; o crumb que leva a ela diz "Produtos", que é o
que 5a escreve e o que cabe numa trilha.

## Fora de escopo

- A faixa de resultados (B3).
