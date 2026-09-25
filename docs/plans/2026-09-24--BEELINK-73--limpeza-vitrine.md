# BEELINK-73 — Tirar da vitrine o que o design não tem

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E1 do épico BEELINK-72 (a casca da loja igual ao design). Abre a rodada de layout dos desenhos
> 5a e 5b, guardados em [docs/plans/design-handoff/design/](design-handoff/design/README.md).
> Empilhado sobre o A8 (BEELINK-71).

## O pedido

> Na página de detalhes de produto, remover esse componente mockado que tem nele. O layout se
> repete na landing page, todos os produtos, categorias e página do produto.

O dono não nomeou o componente. Três coisas que a vitrine desenha hoje não estão em 5a nem em 5b,
e todas parecem "mock":

1. A faixa de formas de pagamento ("Dinheiro · Na entrega", "PIX · Transferência na hora", "Cartão
   de crédito · Principais bandeiras", "Cartão de débito · Débito na conta"), em /produtos, nas
   categorias, em /categorias e em /busca. Ela nasce de `paymentHighlightsOf`, a partir do que a
   loja aceita, mas o texto de cada linha é fixo e o design não a tem.
2. O link "‹ Whey" abaixo da trilha na página do produto, que repete o que a trilha já diz.
3. O crumb "Todos os produtos" a mais na trilha do produto. Em 5b a trilha é Início › Categoria ›
   Produto.

Este ticket tira as três. A descrição com `**` e `-` aparecendo cru, o quarto candidato, é o D10
(BEELINK-89), que renderiza o markdown.

## Definição de Pronto

1. Nenhuma rota da vitrine desenha a faixa de formas de pagamento.
2. A página do produto tem uma trilha só, Início › Categoria › Produto, sem o link "‹ categoria".
3. Os desenhos 5a e 5b estão no repositório, com as notas do designer.
4. `pnpm ci-check` verde, com os testes e as stories atualizados.

## Decisões

### 1. A faixa sai inteira, e as chaves de texto ficam pela metade

`storefront-highlights.tsx` é apagado, junto com a prop `highlights`, o tipo `StorefrontHighlight`
e a banda 4 de `StorefrontWindow`. Das chaves `messages.storefront.payments`, saem só as
`*Detail`: os rótulos curtos (Dinheiro, PIX, Cartão de crédito, Cartão de débito) ficam, porque a
linha "Pagamento" da caixa de compra de 5b (D7, BEELINK-47) os usa.

### 2. O bloco do produto deixa de conhecer a categoria

`StorefrontProductDetail` perde `backHref` e `categoryName`, e com eles o `linkComponent`, que só
servia ao link removido. A trilha, desenhada pela página, é o único caminho de volta, e é o que
5b desenha.

### 3. Os desenhos entram no repositório

Os tickets B e D já citavam `docs/plans/design-handoff/design/5a-…html` e `5b-…html`, e a pasta
estava vazia. Os dois artboards entram como estão, com os estilos inline, e um README com as notas
do designer. Um revisor não precisa do link privado do Claude Design.

## Fora de escopo

- O bloco BENEFITS da home ("De creatina a drink"…), que o lojista escreveu no modo design.
- O novo visual da trilha (E8, BEELINK-80) e a faixa de aviso em todas as páginas (E4, BEELINK-76).
