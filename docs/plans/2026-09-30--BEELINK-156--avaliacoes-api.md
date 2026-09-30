# BEELINK-156 — J17 · API: avaliações de quem recebeu o produto

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J17 do Épico J (BEELINK-138), empilhado sobre o J16. As telas vêm depois: a aba do cliente e o
> "Avaliar produto" (J18), a aba do lojista (J19) e a seção da página do produto (D14), que troca a
> fonte de exemplo do D13 por esta.

## Definição de Pronto

1. Uma avaliação é cliente × produto, uma por produto por cliente, e guarda:
   - a nota de 1 a 5;
   - um comentário de até 1000 caracteres;
   - a variação comprada;
   - a data.
2. Só avalia quem tem um pedido Entregue com aquele produto, e o cliente pode editar a própria
   avaliação.
3. A avaliação é publicada por padrão. O lojista pode ocultá-la e publicá-la de novo.
4. A leitura pública traz a média e a contagem por produto, e a lista paginada das publicadas.
5. As rotas do cliente são pendentes (produtos entregues sem nota), criar e editar. As do lojista
   são listar, ocultar e publicar.
6. Há testes e2e das rotas, da regra de quem avalia, do ocultar, da média e da página, e o
   `ci-check` está verde.

## Decisões

### 1. O registro: `ProductReview` (`product_reviews`, arquivo novo `review.prisma`)

- **Uma por cliente × produto** (`@@unique`). A loja vem repetida na linha, para a lista do painel.
- **O que ela guarda da compra:**
  - `rating` (um `CHECK` de 1 a 5);
  - `comment`, opcional, com até 1000 caracteres (uma nota sozinha também vale);
  - `variantId` e `variantLabel`, a combinação comprada, copiados do item entregue mais recente
    daquele produto. O rótulo fica guardado porque a combinação pode deixar de existir.
  - `orderId`, o pedido que dá a compra por verificada.
- **`hiddenAt`:** nulo é publicada. Só o lojista mexe nele. Uma edição do cliente não publica de novo
  o que o lojista ocultou.
- **O que se apaga junto:** apagar o produto ou o registro do cliente leva a avaliação (cascade).
  Apagar a variação ou o pedido só solta a referência (`SetNull`). Um pedido é "livro" da loja e nunca
  é apagado, mas o `SetNull` não custa nada.

### 2. A média no produto, como cache

- **`Product.reviewCount` e `Product.reviewRatingSum` contam só as publicadas.** Cada escrita que
  cria, reedita, oculta ou publica ajusta os dois, com incremento atômico, na mesma transação. Um
  `CHECK` impede que fiquem negativos.
- **Por que cache:** a linha de nota do card lê a média de uma prateleira inteira sem ler as
  avaliações. É a mesma razão que já faz o produto guardar o cache das variações.
- **`PublicProductCard.rating`** (`{ average, count }`, a média com uma casa, ou `null` sem nenhuma)
  entra opcional. Ela vem na prateleira, nas vitrines e na página do produto, como `hasOptions`. A
  web continua na fonte de exemplo até o D14.

### 3. Quem avalia

- **Só avalia quem tem, nesta loja, um pedido Entregue com um item daquele produto.** Um pedido
  cancelado ou ainda em andamento não conta.
- **Os pendentes** são os produtos desses pedidos que ainda não têm nota do cliente. Cada um aparece
  uma vez, pela entrega mais recente, com o nome, a foto, a combinação e o número do pedido. Um
  produto que não existe mais ou está em rascunho não aparece.

### 4. As rotas

- **Cliente** (`/stores/:slug/customer/reviews`, atrás da `CustomerAuthGuard`):
  - `GET /pending`;
  - `GET`, as avaliações que ele já enviou, para editar;
  - `POST { productId, rating, comment? }` → 201;
  - `PUT /:reviewId { rating, comment? }` → 200.
- **Recusas do cliente:**
  - produto que ele não recebeu: 403 `CUSTOMER_REVIEW_NOT_ELIGIBLE`;
  - produto que ele já avaliou: 409 `CUSTOMER_REVIEW_EXISTS`;
  - avaliação que não é dele: 404 `CUSTOMER_REVIEW_NOT_FOUND`.
- **Pública** (`GET /stores/:slug/products/:productId/reviews`): o resumo (média, contagem e
  histograma por estrela) e uma página das publicadas, as mais recentes primeiro, com `rating=N`
  opcional. O autor aparece como "Rafael S.", o primeiro nome e a inicial do último: um nome completo
  na vitrine é mais do que a loja precisa mostrar. Um produto em rascunho ou de outra loja responde
  404 `PRODUCT_NOT_FOUND`, como a página dele.
- **Lojista** (`/stores/:slug/reviews`, o guarda do painel e a posse da loja):
  - `GET`, com filtro por nota, produto e estado (publicadas ou ocultas), paginado e com as
    contagens;
  - `PATCH /:reviewId { hidden }` → 200.

  Aqui o cliente aparece com o nome inteiro, porque é o cliente da própria loja.

### 5. Onde

- **Contrato:** `packages/contracts/src/review.ts`.
- **Módulo:** `src/modules/reviews/`, com dois controllers (o do cliente e o do lojista) e a rota
  pública, e um serviço de cache (`review-books.ts`).

## Fora de escopo

- A resposta do lojista à avaliação.
- Fotos na avaliação.
- As telas (J18, J19, D14).
- A contagem das "novas" no menu do painel (J19).
