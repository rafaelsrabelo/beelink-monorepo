# BEELINK-79 — O menu de categorias do design em todas as páginas

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E7 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o B13 (BEELINK-94).

## O pedido

5a e 5b desenham, dentro do cabeçalho, uma barra de 44px com TUDO, as categorias de topo em
maiúsculas e OFERTAS DO DIA à direita. É o "filtros" que o dono listou na casca. Hoje os itens têm
12px com opacidade 70, o sublinhado é em `--shop-primary` (invisível na Mutante), a página do
produto não desenha a barra, e a home, /categorias e /busca marcam "Tudo" como página atual.

## Definição de Pronto

1. Em /produtos, TUDO tem `aria-current`. Em /whey-protein, WHEY. Na página de um produto de whey,
   WHEY aparece sublinhado sem `aria-current`. Na home, nada.
2. "Ofertas do dia" leva à listagem só com produtos em promoção, e some numa loja sem nenhum.
3. O sublinhado é visível na Mutante.
4. Testes e stories atualizados, `pnpm ci-check` verde.

## Decisões

### 1. Marcar não é dizer que é a página

`active` recebe `aria-current` e só vale na página da própria categoria de topo. `marked` só
sublinha: a categoria do produto (5b), a categoria a que uma busca foi limitada, e o pai de uma
subcategoria aberta. O quadro da loja calcula os dois a partir de `activeCategory` e
`markedCategory`.

### 2. A barra usa os tokens do E3

13px, peso 700, espaçamento 0.04em, maiúsculas, 28px entre itens, sem opacidade. O sublinhado de
3px é `--shop-primary-on-header`, e "Ofertas do dia" fica em `--shop-primary-on-header-soft`,
com `margin-left: auto`.

### 3. "Ofertas do dia" custa zero chamadas

`navigationAt` devolve as categorias e se a loja tem algo em promoção, da mesma leitura de uma
página de tamanho 1 que `categoriesAt` já fazia. A listagem usa a própria resposta. O link é
`routes.catalog({ discount: true })`, do B7.

### 4. A página do produto ganha a barra

Ela carrega o menu junto do produto, sob a mesma tag de cache, e passa a categoria do produto
como marcada. O comentário que justificava não ter a barra saiu: o design a tem.

## Fora de escopo

- A variante de fotos (`showCategoryIcons`) fica como está.
- O nome "Ofertas do dia" com a loja decidindo se aparece: hoje aparece sempre que há promoção.
