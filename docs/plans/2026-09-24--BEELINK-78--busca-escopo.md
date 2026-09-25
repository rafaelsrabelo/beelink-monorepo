# BEELINK-78 — A busca do cabeçalho com "Buscar em" e botão visível

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E6 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E7 (BEELINK-79).

## O pedido

5a e 5b desenham a busca como uma barra de 44px: um select de escopo ("Todos" e as categorias)
à esquerda, o campo e um botão de 56px com a lupa. Hoje é uma pílula de 40px, sem escopo e com o
botão escondido.

## Definição de Pronto

1. Buscar "whey" com "Whey" no escopo devolve só produtos dessa categoria, com e sem JavaScript.
2. As sugestões ao vivo respeitam o escopo.
3. Na página de uma categoria, o select já vem com ela marcada.
4. Na prévia do modo design, a busca continua inerte. `pnpm ci-check` verde.

## Decisões

### 1. Uma barra, dois blocos

`StorefrontSearch` (sem JavaScript, na prévia) e `StorefrontSearchCombobox` (ao vivo) desenham
a mesma barra: as classes e a pintura do botão são exportadas pelo primeiro e usadas pelo
segundo. O botão fica em `--shop-primary-on-header` com o ícone em `--shop-on-primary-on-header`
(E3), nunca branco: na Mutante o tom é clareado.

### 2. O escopo é um `<select name="categoria">` de verdade

Ele viaja com o formulário, então a busca limitada funciona sem script. O B7 já lê `categoria` em
/busca; aqui só se escreve. Ao vivo, o escopo entra na chave do TanStack Query e no BFF, que o
repassa ao catálogo, e no "ver todos os N resultados".

### 3. O quadro sabe o escopo

As opções são as categorias de topo. Numa página de categoria o select abre nela (o pai, numa
subcategoria); numa busca ou catálogo limitados por `?categoria=`, na categoria do endereço; nas
outras páginas, em "Todos".

## Fora de escopo

- Resultados com filtros avançados (B4).
- O nome acessível do campo continua "Buscar nesta loja".
