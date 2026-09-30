# BEELINK-153 — J14 · API: favoritos do cliente, com o preço de quando curtiu

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J14 do Épico J (BEELINK-138), o primeiro da fila de favoritos e avaliações (30/09). Sai do `main`.
> A tela que ele alimenta é a 6g · Favoritos (J15). O aviso de preço e de estoque é do J16, e a
> exportação e a exclusão dos dados são do J13.

## Definição de Pronto

1. Um favorito é cliente × produto, com a variação quando houver, o preço na hora de curtir e a data.
   É um por produto: curtir de novo não cria outro.
2. As rotas do cliente são curtir, descurtir e listar, e todas passam pela porta do cliente
   (`CustomerAuthGuard`).
3. Cada item da lista traz:
   - o preço de hoje;
   - se está em promoção e se está esgotado;
   - quanto baixou desde a curtida.
4. A lista traz a contagem de cada filtro (Todos, Baixou de preço, Em promoção, Esgotados) e aceita
   três ordens: curtidos recentemente, menor preço e maior desconto.
5. Outra rota devolve só os ids dos produtos curtidos, para pintar os corações.
6. Um produto em rascunho some da lista e dos ids. Um esgotado fica, marcado.
7. Os formatos estão em `packages/contracts`.
8. Há testes e2e da API para as rotas, os filtros, as ordens, o rascunho, a outra loja e o limite.
   `pnpm ci-check` está verde.

## Decisões

### 1. O registro: `CustomerFavorite` (`customer_favorites`)

- **Um arquivo novo, `prisma/schema/favorite.prisma`.** Cliente, produto e variação só ganham o campo
  de volta da relação.
- **Uma linha por cliente × produto** (`@@unique([customerId, productId])`). O coração do card não
  sabe a variação, e o da página sabe. Com duas linhas para o mesmo produto, o card não teria como
  dizer qual está curtida.
- **A variação é opcional** (`variantId`). Ela vem da página do produto quando o cliente escolheu uma.
  Pelo card, o favorito é o produto como um todo.
- **`likedPriceCents` e `likedAt` são o preço e a data da curtida.** O preço é:
  - o da variação, quando há uma;
  - senão, o "a partir de" do produto (`priceCents`, a mais barata à venda).

  Há um `CHECK` para que o preço nunca seja negativo.
- **O que acontece quando algo some:**
  - Apagar o cliente ou o produto apaga o favorito (cascade).
  - Apagar a variação deixa o favorito com o produto (`SetNull`).
  - Uma variação só arquivada ou desligada continua gravada, mas a leitura a ignora (decisão 4).
- **Índices:**
  - `(customerId, likedAt desc)`, para a lista;
  - `(productId)`, para o J16 achar quem curtiu um produto que baixou de preço ou voltou ao estoque.
- **No máximo 200 favoritos por cliente.** A 201ª curtida recebe 409 `CUSTOMER_FAVORITE_LIMIT`. O
  número é generoso para uma pessoa e é um teto para o que um script poderia empilhar, como os
  endereços (`ADDRESSES_MAX`). Com o teto, a lista inteira cabe numa leitura: os filtros, as
  contagens e as ordens são calculados em memória, sem SQL por filtro.

### 2. Curtir: `PUT /stores/:slug/customer/favorites/:productId`

- **O corpo é `{ variantId?: string | null }` e a resposta é 204.** Curtir é idempotente, e o PUT
  diz isso.
- **Só se curte um produto publicado desta loja.** Rascunho, produto de outra loja ou um id que não
  existe recebem o mesmo 404 `PRODUCT_NOT_FOUND`, então a resposta não conta o que existe onde.
- **A variação, quando vem, precisa ser deste produto, vendida e não arquivada.** Se não for, a
  resposta é 404 `PRODUCT_VARIANT_NOT_FOUND`.
- **Um esgotado pode ser curtido.** É o caso do "Esgotado · avise-me".
- **Curtir de novo a mesma coisa não mexe em nada:** o preço e a data ficam os da primeira curtida,
  e é isso que sustenta o "baixou R$ X".
- **Trocar a variação é uma curtida nova,** com o preço e a data de agora. O preço da variação antiga
  não serve de régua para a nova.
- **A escrita corre sob a trava do registro do cliente** (`lockCustomer`, a mesma dos endereços).
  Assim, duas curtidas ao mesmo tempo não passam juntas do limite.

### 3. Descurtir e os ids

- **`DELETE /stores/:slug/customer/favorites/:productId` responde sempre 204,** mesmo para um produto
  que não estava curtido. É idempotente, e o botão nunca erra por clique duplo.
- **`GET /stores/:slug/customer/favorites/ids` responde `{ productIds }`,** só com os produtos
  publicados.

### 4. A lista: `GET /stores/:slug/customer/favorites`

- **Os parâmetros** são `filter` (`PRICE_DROPPED` | `ON_SALE` | `SOLD_OUT`, e sem ele, todos),
  `sort` (`RECENT` por padrão | `PRICE_ASC` | `DISCOUNT`), `page` e `pageSize` (24 por padrão, no
  máximo 48).
- **O preço de hoje** é o da variação curtida enquanto a loja a vende (ativa e não arquivada). Sem
  variação, ou quando ela deixou de existir, vale o "a partir de" do produto, e `variant` vem `null`.
- **`priceDropCents`** é o preço da curtida menos o preço de hoje, quando isso dá mais que zero. Só
  se compara a mesma coisa: quando a variação curtida sumiu, o valor é 0. Comparar o preço de uma
  variação com o "a partir de" do produto inventaria uma queda.
- **`onSale`** é a loja mostrando um "de" acima do preço (`compareAtPriceCents`).
- **`soldOut`** segue a regra da vitrine (`catalog.visibility.ts`): na variação curtida, quando ela
  vale, e senão no produto.
- **Um rascunho some:** a linha fica guardada e volta quando o produto volta a ser publicado.
- **As contagens** (`ALL`, `PRICE_DROPPED`, `ON_SALE`, `SOLD_OUT`) são sobre todos os favoritos
  visíveis, e não sobre o filtro. Assim cada botão continua dizendo quantos tem.
- **"Maior desconto"** é a maior economia, em porcentagem, contra o maior "antes" que o cliente viu:
  o preço da curtida ou o "de" da loja. O card da 6g mostra esse mesmo número riscado. Empates saem
  pela curtida mais recente.
- **Cada item traz também:**
  - o nome, o slug e a foto (a da variação, quando ela tem, e senão a primeira do produto);
  - o rótulo da variação ("Sabor: Uva", o mesmo `variantLabelOf` dos pedidos);
  - `hasOptions`, para o card decidir entre pôr no carrinho direto e levar à página.

### 5. Onde

- **Contrato:** `packages/contracts/src/favorite.ts`, com `CustomerFavorite`, `CustomerFavoritePage`,
  `CustomerFavoriteListQuery`, `CustomerFavoriteFilter`, `CustomerFavoriteSort`,
  `LikeFavoritePayload` e `CustomerFavoriteIds`.
- **API:** o módulo `src/modules/favorites/`. Ele importa `CustomersModule`, que tem o registro do
  cliente e a porta, e `AuthModule`, de que a porta depende.
- **Produto:** o `docs/product/README.md` ganha, em "Customers", o que é um favorito.

## Fora de escopo

- A tela e o coração (J15).
- O aviso por e-mail (J16).
- Compartilhar a lista.
- Favoritos sem conta: sem sessão, o J15 leva a Entrar e volta.

## Adendo da revisão (30/09)

Dois revisores, um de correção e um das regras da casa. O que mudou:

- **Os favoritos respondem códigos próprios,** em vez dos do catálogo:
  `CUSTOMER_FAVORITE_PRODUCT_NOT_FOUND`, `CUSTOMER_FAVORITE_VARIANT_NOT_FOUND` e
  `CUSTOMER_FAVORITE_LIMIT`, todos em `FavoriteErrorCode`. O web guarda uma frase por código, e
  `PRODUCT_VARIANT_NOT_FOUND` já tem a frase do editor do painel. A loja mostraria ao cliente o texto
  do lojista. É o mesmo caminho do Avise-me, que tem o `RESTOCK_VARIANT_INVALID`. Isso corrige a
  decisão 2.
- **O produto curtido como um todo tem o preço da combinação mais barata à venda, com ou sem
  estoque.** Não é mais o `priceCents` do produto. Aquele cache segue o que se pode pedir agora, então
  o estoque voltando numa combinação mais barata parecia uma queda de preço. Um produto que não vende
  nenhuma combinação fica com o cache. Isso corrige as decisões 1 e 4.
- **A variação liga ao favorito com `NoAction`, não com `SetNull`.** Um `null` ali passaria por uma
  curtida do produto inteiro e compararia o preço da variação com o mais barato do produto. Nada no
  código apaga uma variação: ela é arquivada. E apagar o produto leva o favorito pela cascata dele
  antes de a chave ser conferida, no fim do comando. Isso corrige a decisão 1.
- **Favoritos de produtos em rascunho contam no limite de 200.** Eles ficam guardados e voltam com o
  produto. O J15 deve dizer isso quando o limite recusar.
- **Arrumação:**
  - `lockCustomer` foi para `customers/customer-lock.ts`, e `variantLabelOf` para
    `catalog/variant-label.ts`, porque endereços, junção, pedidos e favoritos os usam.
  - Os limites e as listas foram para `favorites.constants.ts`.
  - Um empate na curtida vai para o produto mais novo.
