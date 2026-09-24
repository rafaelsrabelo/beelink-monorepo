# BEELINK-19 — Opções e variantes de produto, com cada produto atual numa variante padrão

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A1 do épico BEELINK-17 (variações de produto). Área: API · novo · G · ordem 2/29. Empilhado
> sobre o A0 (BEELINK-18).

## O pedido

> Criar ProductOption, ProductOptionValue e ProductVariant em `catalog.prisma` e migrar cada
> produto existente para uma variante padrão. Os campos por unidade que hoje moram em Product
> passam a existir também em ProductVariant, e ficam em Product como cache derivado. SKU único por
> loja, na variante. No máximo 3 opções por produto, num limite que não seja só do DTO.

## Definição de Pronto

1. As tabelas `product_options`, `product_option_values` e `product_variants` existem, mais a
   tabela de ligação `product_variant_values`. A migration não perde dado: todo produto existente
   tem exatamente uma variante, com os mesmos preço, estoque, SKU e dimensões.
2. O SKU é único por loja, num índice único em `product_variants`. Um SKU repetido na criação ou
   na edição de produto responde 409 `PRODUCT_SKU_TAKEN`, e não mais 409 de slug.
3. Um produto tem no máximo 3 opções, garantido no banco.
4. Criar um produto cria a variante padrão. Editar preço, estoque, códigos ou caixa de um produto
   sem opções escreve na variante padrão, e as colunas de Product são recalculadas a partir das
   variantes.
5. A busca do painel acha um produto pelo SKU ou código de barras de qualquer variante.
6. `prisma validate` e `pnpm ci-check` verdes, com e2e.

## Decisões

### 1. As colunas de Product ficam, como cache das variantes

Recomendação do próprio ticket (decisão em aberto nº 2), adotada. A regra do que está na vitrine
(`ON_THE_SHELF_WHERE`), as vitrines "em oferta" (`compareAtPriceCents > priceCents`, comparação
entre colunas) e os dois mapeadores de card continuam lendo Product sem mudar nada.

O cache é calculado numa função pura, `productCacheOf` (`variant-cache.ts`), a partir das
variantes **à venda** (`isActive`):

- **preço:** o da variante mais barata, com o preço "de" dela mesma. Assim um card nunca junta o
  preço de uma variante com o desconto de outra;
- **estoque:** o produto só é contado se todas as variantes à venda são contadas, porque basta uma
  feita sob encomenda para ele nunca esgotar. A quantidade é a soma;
- **SKU, código de barras, custo, peso e caixa:** os da primeira variante à venda;
- **nada à venda:** o produto conta com zero, e sai da vitrine como um esgotado sai;
- **uma variante só:** os valores dela, tais como são. Um produto sem opções devolve exatamente o
  que foi escrito nele.

As colunas antigas não são apagadas: isso fica fora do escopo, como o ticket pede.

### 2. A ligação variante ↔ valor é uma tabela, com chave (variante, opção)

`product_variant_values (variantId, optionId, valueId)`, com chave primária `(variantId, optionId)`.
Com essa chave, uma variante tem no máximo um valor de cada opção, e a regra fica no banco. As
alternativas eram três colunas `option1/2/3` na variante, que obrigariam a trocar colunas de lugar
ao reordenar as opções, ou um array de ids, que não tem chave estrangeira. A unicidade da
combinação entre variantes fica no serviço do A2, que escreve tudo de uma vez sob trava.

### 3. O limite de 3 opções é um trigger de constraint, adiado para o fim da transação

O Prisma não declara esse tipo de regra e não olha triggers ao comparar o schema, então não há
drift. Por ser `DEFERRABLE INITIALLY DEFERRED`, um salvamento que acrescenta uma opção e remove
outra é julgado pelo resultado, e não pela ordem dos comandos. O A2 soma a isso uma mensagem
própria no serviço.

A alternativa era `CHECK (position BETWEEN 0 AND 2)` com índice único em `(productId, position)`.
Ela impediria o A2 de trocar duas opções de lugar, porque a troca passa por uma posição repetida.

### 4. O SKU é único na variante, e a variante repete o `storeId`

`@@unique([storeId, sku])` em `product_variants`. No Postgres, nulos não colidem num índice único,
então qualquer número de variantes pode ficar sem código. O `storeId` repetido na variante existe
só para esse índice.

Os dados atuais não têm SKU repetido. A migration trata o caso mesmo assim: o produto mais antigo
fica com o código, e os outros ganham `-2`, `-3`… (pulando um sufixo que já exista), no produto e
na variante. Nenhum código some. Testado numa cópia do banco de dev com repetições plantadas.

O 409 diz qual índice recusou pelo `meta.modelName` do P2002. No Prisma 7 com o adapter do pg, ele
vem como `ProductVariant` mesmo numa criação aninhada, conforme testado. Slug repetido continua
`PRODUCT_SLUG_TAKEN`.

### 5. Editar preço de um produto com opções é recusado, não ignorado

`PUT /products/:id` com um campo por unidade num produto que tem opções responde 409
`PRODUCT_HAS_OPTIONS`. Ignorar esconderia um erro, e escrever em todas as variantes afirmaria algo
que nenhuma variante disse. O editor de variações (A4) deixa de mandar esses campos para esses
produtos. Até o A2 não há como criar opções, então hoje o caso só existe no teste.

### 6. A foto da variante é uma URL, não uma chave para `product_images`

A galeria é substituída inteira a cada salvamento (`deleteMany` + `create`), o que troca o id de
todas as imagens. Uma chave estrangeira para uma delas seria cortada pela próxima edição, mesmo sem
relação com a variante.

### 7. `colorHex` no valor e `isActive` na variante

As duas vêm do design 4a:

- **a bolinha de cor:** é dado do lojista aplicado em tempo de execução, como a cor da marca da
  loja;
- **"não vendo esta":** é uma combinação que não existe, diferente de uma esgotada.

### 8. Escrita com trava no produto

A edição passa a ser uma transação interativa que trava a linha do produto (`FOR UPDATE`) antes de
ler as variantes e reescrever o cache, pelo mesmo padrão do `lockShop` do módulo de página. Um
cache lido e escrito em dois passos, com duas edições intercaladas, não descreveria nenhuma delas.

### 9. Frases no web

`PRODUCT_SKU_TAKEN` e `PRODUCT_HAS_OPTIONS` ganham frase em pt-BR e en. `PRODUCT_SLUG_TAKEN`,
que caía no "Algo deu errado", ganha a sua junto.

### 10. O seed de dev cria as variantes padrão

`dev-catalog.sql` escreve em `products` direto. Ele passa a criar a variante padrão que faltar e a
levar o preço do seed para a variante de um produto sem opções.

## Fora de escopo

- Endpoints e contrato de opções e variantes (A2), leitura pública (A3), telas (A4, A5).
- Apagar as colunas por unidade de Product.
- O limite de 100 variantes, que é uma regra de escrita do A2.
