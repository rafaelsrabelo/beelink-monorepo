# BEELINK-8 — A home mostra todos os produtos num trilho horizontal

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.

## O pedido

> "A listagem dos produtos no site público tem que ser scroll horizontal, primeiro ponto! Na página
> principal a listagem dos produtos não é por categoria, são todos sendo scroll horizontal."

## Definição de Pronto

1. Numa loja com `showProductsByCategory = false`, `/<slug>` mostra **um** trilho horizontal com
   produtos de todas as categorias — não um trilho por categoria.
2. Numa loja com `showProductsByCategory = true`, `/<slug>` continua mostrando um trilho por
   categoria, como hoje.
3. O trilho único é titulado e leva ao catálogo completo.
4. No modo lista única a home faz **uma** busca de catálogo, e não `1 + N`.
5. O teto de 96 da API está tratado e documentado, não ignorado.
6. Existe teste automatizado que prova qual dos dois modos está no ar. **Hoje não existe teste
   nenhum para a home** — `apps/web/src/app` só tem testes para as rotas `/api/*`.
7. `pnpm ci-check` verde.

## O que já está construído, e que este ticket não reescreve

**O trilho.** `StorefrontProductRail` é scroll-snap em CSS puro — `overflow-x-auto
overscroll-x-contain scroll-px-4 snap-x snap-mandatory`, `tabIndex={0} role="group"`, cartões de
largura fixa por breakpoint, sem JavaScript e sem estado de carrossel. Ele **não sabe o que é
categoria**: recebe `products`, `title` e `seeAllHref`. Não muda uma linha.

**O interruptor.** `Store.showProductsByCategory` existe como coluna (`store.prisma:88`, default
`false`), está em `PublicStore`, em `UpdateStorePayload`, no service, no mapper, e tem um checkbox
funcionando na aba Aparência que salva e volta. **Nenhuma página da vitrine lê.** A loja responde
`false` e a home desenha três trilhos por categoria assim mesmo.

O texto do checkbox já descreve os dois modos, nas duas línguas: *"Agrupar produtos por categoria —
a loja mostra uma seção para cada categoria em vez de uma lista única."* Não há copy nova a
escrever: a frase já promete o que este ticket vai entregar.

**Consequência do default.** A coluna nasce `false`. Ligar o interruptor faz o comportamento
**padrão** virar o trilho único — que é o que foi pedido — sem migração e sem tocar em loja nenhuma.

## Decisões

### 1. O modo por categoria fica, atrás do interruptor

Não é o pedido, mas é comportamento que lojas existentes já veem, e apagá-lo seria decidir por elas
uma coisa que o painel já oferece como escolha. O interruptor passa a ser lido; as duas constantes
que servem esse modo — `HOME_RAILS_MAX` e `RAIL_PAGE_SIZE` — **continuam vivas**.

> Correção a um levantamento anterior, que disse que `HOME_RAILS_MAX` viraria código morto. Isso só
> seria verdade se o modo por categoria fosse deletado. Ele não é.

### 2. "Todos" é limitado a uma página, e o limite é da API

`storefront.controller.ts:85` fecha o tamanho de página em `PRODUCTS_PAGE_SIZE_MAX = 96`, com
default 24. Medido: `?porPagina=500` responde `pageSize: 96`.

O trilho pede **24** — o default da API, escrito explicitamente e não herdado, porque um default que
muda do outro lado mudaria esta página sem aparecer neste arquivo.

Uma loja com mais de 24 produtos publicados mostra os 24 primeiros **na ordem que o lojista
arrastou** (`position, name`) e o "Ver todos" ao lado leva ao catálogo paginado. É assim que as
lojas de referência que o dono citou funcionam, e é o que impede a página mais visitada da loja de
carregar 96 cartões para mostrar quatro.

### 3. O título do trilho único é "Todos os produtos"

`storefront.catalogTitle`, que já existe nas duas línguas. `featuredHeading` ("Destaques") seria
mentira: não há nada destacado ali, são os produtos da loja na ordem dela.

**Imprecisão assumida:** numa loja com mais de 24 produtos o título diz "todos" sobre uma página.
A alternativa — trocar o título conforme `total <= pageSize` — foi recusada: dois títulos para a
mesma banda é mais confuso que um título genérico com um "Ver todos" do lado, que é justamente onde
o resto está.

### 4. A decisão sai da página e vira função testável

A escolha entre um trilho e N trilhos vive hoje dentro do corpo de um Server Component `async`, que
não tem como ser testado neste repositório — não há arranjo para testar páginas do App Router, e
criar um é outro ticket.

Então a decisão vira `homeBandsAt()` em `apps/web/src/lib/storefront-data.ts`, uma função que
devolve as bandas já resolvidas. A página passa a mapear bandas para JSX. `callPublicApi` usa o
`fetch` global, então a função se testa com `vi.stubGlobal` — o mesmo padrão que
`app/api/stores/route.test.ts` já usa.

## Fora de escopo

- **Destaque que aponta para produto ou personalizado** — BEELINK-9. A banda de pôsteres desta
  página continua montada a partir de categorias com `showcaseLayout`.
- **Render estático da vitrine e o grupo `(storefront)`** — BEELINK-12. Esta mudança remove o `N+1`
  do modo lista única; não toca no `await getMessages()` do layout raiz, que é o que hoje tira toda
  rota do render estático.
- **Paginar o trilho.** O "Ver todos" já leva ao catálogo paginado.
- **Mudar o texto do checkbox.** Ele já está certo.
