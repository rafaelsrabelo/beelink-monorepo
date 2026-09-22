# BEELINK-9 — O banner volta a ser uma coisa, agora com destino tipado

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, append-only.
> Fecha também a **BEELINK-11** (o card do Início), porque o card não tem para onde apontar sem isto.

## O pedido

> "aqui eu nao vou criar e editar categorias, aqui vao ser os banners que vou poder criar pra usar
> no layout (…) Os banners podem ser em cima de categorias, de produtos, e de url externa, imagina
> que quero redirecionar pra outro site ou pra o wpp"

E, sobre a BEELINK-10: *"vou poder arrastar esses banners criados"*.

## Isto reverte uma decisão, e a decisão nomeou o preço

O commit `5639c47` apagou a tabela `store_showcases` e transformou destaque em
`ProductCategory.showcaseLayout`. A razão está escrita lá, em primeira pessoa do dono:

> "Os destaques fazem parte de categorias, eu crio uma categoria destaques" — e ele está certo, e
> eu tinha criado uma entidade a mais. `StoreShowcase` carregava um título, uma imagem e uma
> descrição que `ProductCategory` já tinha, e um destino que, para uma categoria, é o endereço dela
> mesma. **Dois nomes para uma coisa são duas telas para manter em dia, e quem mantém é o lojista.**

E o custo, também escrito lá:

> O que se perde, dito na migration e no schema: **banner apontando para um produto específico ou
> para fora da loja.**

Esse custo é o pedido de hoje. Então isto não é uma ideia nova — é aquela decisão revertida com o
que faltava da primeira vez: **um destino tipado**. A tabela antiga guardava o destino como `href`
de texto livre, e é por isso que ela não resolvia o problema: um banner apontando para
`/lessari/blusas` vira link morto no dia em que a categoria é renomeada, e nada avisa.

## Definição de Pronto

1. Existe **banner** por loja: imagem, título, subtítulo opcional, tamanho, posição, ativo, alvo.
2. O alvo é **exatamente um** de: categoria, produto, URL externa. O banco recusa dois ou nenhum.
3. URL externa só aceita `http`/`https`, com teto de tamanho nomeado.
4. O lojista cria, edita, reordena e exclui banners numa tela do painel.
5. Os banners aparecem na vitrine, na ordem e no tamanho escolhidos, **sem depender do modo design**.
6. Banner externo abre em outra aba; interno, não.
7. Banner inativo some da vitrine e continua no painel.
8. **Renomear produto ou categoria não quebra o banner.**
9. As categorias que hoje têm `showcaseLayout` viram banners na migração, sem ação do lojista.
10. O card do Início fala de banner, e o "Feito" é ter banner.
11. `pnpm ci-check` verde.

## Decisões

### 1. `showcaseLayout` vai embora — não coexiste

Manter os dois seria recriar exatamente o que o `5639c47` reclamou: duas telas para manter em dia.
A coluna sai de `catalog.prisma`, do contrato, do formulário de categoria e da home; a migração
converte cada categoria com forma marcada num banner que aponta para ela.

Um destaque continua podendo ser uma categoria. Ele só deixa de ser **só** isso.

### 2. Destino interno é chave estrangeira, nunca URL

`BannerTarget { CATEGORY, PRODUCT, EXTERNAL }`, com `categoryId` e `productId` anuláveis
(`SetNull`, como `Product.categoryId`) e `externalUrl` anulável. O endereço de um banner interno é
montado **na hora de desenhar**, a partir do slug atual, por `storefrontRoutes` — a única parte do
web que pode soletrar um segmento.

É o que a tabela antiga errou, e é a linha 8 da DoD.

### 3. "Exatamente um alvo" é `CHECK` em SQL cru

O Prisma não expressa isso — é o mesmo limite que `catalog.prisma` já registra sobre alvo
polimórfico. Vai na migration, à mão, além da checagem no service (modelada em
`ProductsService.assertParcel`). Só no DTO não basta: o dia em que alguém escreve no banco por
fora nasce um banner sem destino que a vitrine não sabe desenhar.

### 4. O banner viaja em `PublicStore`, não em `StorefrontCatalog`

A home já faz `shopAt(slug)` antes de tudo, e `PublicStoreShowcase[]` andava nessa forma até o
`5639c47` — então custa **zero** viagem nova, nenhuma faixa de busca nova e nenhuma tag de cache
nova.

`StorefrontCatalog` seria o lugar errado: ele é paginado e filtrado, então os banners seriam
re-serializados em toda resposta `?pagina=` e `?categoria=` que o Google indexa, inclusive na
chamada de `pageSize: 1` que a home faz só para pegar a lista de categorias.

**Custo aceito:** os banners passam a viajar também nas páginas de produto, de categoria e do
carrinho. É contra o "as ausências são deliberadas" do `PublicStoreResponse`, e é mais barato que
uma viagem em série.

### 5. Externo abre fora; interno, não

`StorefrontShowcase` hoje emite `<Link href={item.href}>` sem `target` — um banner de wa.me levaria
a loja embora da aba. Ganha um `external?: boolean` por item e, quando verdadeiro,
`target="_blank" rel="noreferrer"`, que é o par que todo link de saída deste repositório já carrega
e que dois testes já afirmam.

### 6. A URL externa é validada como o repositório já valida URL

`@IsUrl({ protocols: ['http','https'], require_protocol: true })` — `require_protocol` é
load-bearing: é ele que recusa `javascript://x/%0aalert(1)` — mais um `@MaxLength` de constante
nomeada. O precedente mais próximo é `bannerImages` no schema de layout, cujo comentário descreve
esta situação exata: "o único valor guardado ecoado literalmente na rota anônima da vitrine".

### 7. A tela de categorias ganha entrada no menu lateral

O card do Início é **o único link** para `/admin/<slug>/categories` em todo o app. Trocá-lo por
banners deixaria a tela órfã. A string `nav.categories` já está traduzida nos dois dicionários e
não é consumida por ninguém — é uma linha em `app-shell.tsx`.

### 8. Reordenar, nesta PR, é subir e descer

Arrastar é a BEELINK-10. Aqui vão dois botões por linha, que funcionam sem ponteiro fino e sem
JavaScript de arrastar, escrevendo no mesmo endpoint `reorder` que a BEELINK-10 vai usar. O
endpoint e a rota BFF de reordenar **já existem para categorias e não têm cliente nenhum** — esta
PR escreve a requisição e o hook que faltavam, e a BEELINK-10 troca os botões pelo arrastar.

## Fora de escopo

- **O documento de seções e o modo design** — BEELINK-10. Os banners desta PR guardam o próprio
  tamanho e posição justamente para não dependerem dele.
- **Arrastar para reordenar** — mesma tarefa. Aqui são botões.
- **Banner apontando para uma busca ou para uma coleção** — não pedido.
- **Render estático da vitrine** — BEELINK-12.
