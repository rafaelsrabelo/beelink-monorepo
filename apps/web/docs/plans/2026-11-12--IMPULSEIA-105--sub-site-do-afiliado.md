# IMPULSEIA-105 — o sub-site do afiliado

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Substitui, na vitrine, o modelo de "indicação pelo cookie" do AF5 e as correções de 12/11 que
> vieram depois dele (faixa só pelo link; indicação só na sessão; casa que redireciona).

## O pedido

Rafael, 12/11/2026, testando a Mutante: o afiliado tem um **sub-site** — todo endereço daquela
visita leva o nome: `mutantesuplementos.com.br/margarida`, `/margarida/carrinho`,
`/margarida/produtos/<p>`, `/margarida/checkout`… "É pra ser assim no afiliado."

## Decisões

- **O endereço decide, não um cookie.** Debaixo de `/<nome>/…` (afiliado ativo, programa ligado,
  links ligados) a faixa aparece, todo link que a página desenha guarda o prefixo e o pedido feito
  ali é do afiliado. Fora do prefixo a loja é só da loja — sem faixa, sem linha, sem crédito —, o que
  quer que o navegador guarde.
- **O proxy reescreve, a árvore de rotas não duplica.** `/<loja>/<nome>/<resto>` (e `/<nome>/<resto>`
  no domínio próprio) é servido como `/<loja>/<resto>` com o carimbo `x-bl-affiliate`, depois de a API
  dizer que o nome é de um afiliado que credita (`affiliate-segments.ts`, uma cópia de um minuto). O
  segmento nunca empata com palavra de rota nem categoria: o AF3 já recusa esse slug.
- **O endereço da página leva o nome; o caminho do cookie, não.** `storefrontRoutes` põe o prefixo
  em todo endereço; `shopHomeOf` continua sendo o caminho dos cookies da loja, então o carrinho é um
  só, dentro e fora do sub-site.
- **O pedido sai pelo handler debaixo do nome** (`/<loja>/<nome>/api/orders`), que o proxy carimba;
  o handler lê o afiliado de novo e manda a atribuição que a API confere.
- **Nome que não credita** (pausado, encerrado, programa ou links desligados) leva à mesma página sem
  o prefixo; **`?afiliado=`** de quem credita leva para dentro do sub-site.
- **A visita conta uma vez por sessão do navegador**, com o `bl_affiliate` de sessão, que não credita
  nada. A política `2026-11-14`, ainda não publicada, diz isso.

## Fora de escopo

- Um pedido pelo navegador no e2e: o crédito é coberto pelo teste do handler, pelo do proxy e pelo e2e
  da API.
