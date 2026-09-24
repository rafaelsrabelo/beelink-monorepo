# BEELINK-20 — Contrato e endpoints do painel para editar opções e variantes

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A2 do épico BEELINK-17 (variações de produto). Área: API · novo · G · ordem 3/29. Empilhado
> sobre o A1 (BEELINK-19).

## O pedido

> `packages/contracts` ganha ProductOption, ProductOptionValue, ProductVariant e os payloads de
> escrita. `products.controller.ts` ganha `PUT .../products/:id/options` e `PUT .../variants`
> (bulk). Regras: SKU único por loja (recusado no serviço, não só no índice), preço ≥ 0, no máximo
> 100 variantes. Editar opções não apaga preço e estoque das variantes que continuam existindo. Uma
> variante que já teve pedido é arquivada, e não apagada. Como não existe Orders, toda variante é
> tratada como arquivável.

## Definição de Pronto

1. `PUT .../options` com um valor a menos preserva as variantes e os dados das combinações que
   sobrevivem, e arquiva a que deixou de existir.
2. `PUT .../options` recusa com 400 mais de 3 opções e mais de 100 combinações
   (`PRODUCT_VARIANTS_LIMIT`).
3. `PUT .../variants` recusa com código estável um SKU repetido na loja (409 `PRODUCT_SKU_TAKEN`).
   Também recusa preço negativo e mais de 100 variantes (400).
4. Os tipos novos em `packages/contracts` são só `type`/`interface`, e o gate `contracts-types-only`
   continua verde.
5. O Swagger documenta os dois endpoints nos moldes dos existentes.
6. `pnpm ci-check` verde, com e2e.

## Decisões

### 1. Rotas no controller de produtos, serviço próprio

As rotas ficam em `ProductsController`, como o ticket pede. A lógica fica em
`ProductVariantsService`, e não no serviço de produtos, que já passou do limite de tamanho. O
serviço de variantes cuida da orquestração; as recusas vão para `variant-rules.ts` e as escritas
para `variant-writes.ts`. As regras de preço e caixa, comuns ao produto e à variante, saem do
serviço de produtos para `product-rules.ts`.

### 2. As opções vão inteiras e na ordem; o id diz o que já existia

`PUT .../options` recebe a lista inteira. Opção ou valor com `id` é o existente, renomeado se o nome
mudou; sem `id` é novo; o que não vem é removido. Um `id` de outro produto, ou um valor filed sob
outra opção, responde 404 `PRODUCT_OPTION_NOT_FOUND`. Nomes repetidos, sem distinguir maiúsculas e
espaços, respondem 400 `PRODUCT_OPTION_DUPLICATE`, tanto entre opções quanto entre valores de uma
opção.

### 3. Que variante sobrevive: projeção das combinações antigas nas novas

É uma função pura, `planVariants` (`variant-combinations.ts`), testada sem banco. Cada variante
atual é projetada nas opções novas:

- **opção que ela já tinha:** mantém o valor, se o valor ainda existe;
- **opção nova:** recebe o primeiro valor dela. Acrescentar "Cor" a um produto vendido em P e M
  transforma P em "P · primeira cor", com preço e estoque intactos. É o que o Shopify faz;
- **opção removida:** é ignorada. Combinações que só diferiam nela colapsam, e fica a primeira na
  ordem do lojista.

A variante padrão, sem valores, vira a primeira combinação quando a primeira opção chega. Quando a
última opção sai, a primeira variante volta a ser a padrão.

### 4. Combinação nova copia o preço da vizinha, não o código nem o estoque

Uma combinação que ninguém reivindicou nasce com preço, preço "de", custo, peso, caixa e a chave
de contagem da variante que mais compartilha valores com ela. Não herda SKU, código de barras e
foto, porque esses descrevem outra coisa física. O estoque nasce 0 quando contado, para não
duplicar o estoque da vizinha.

### 5. Arquivar em vez de apagar

`product_variants.archivedAt` (migration `20260924070000_variant_archive`). Uma variante arquivada:

- fica `isActive = false`;
- **libera o SKU**, para que a combinação que a substituir possa usá-lo;
- sai de toda leitura, do resumo do produto e da busca.

Quando existir Orders, a linha de pedido guarda o próprio retrato (rótulo, SKU e preço do momento).
A regra final entre arquivar e apagar deve ser revista nesse ticket.

### 6. Limites

- **3 opções:** no DTO (`ArrayMaxSize`, 400) e no banco (o trigger do A1).
- **100 combinações:** no serviço, antes de escrever (400 `PRODUCT_VARIANTS_LIMIT`), porque é um
  produto de tamanhos que o DTO não calcula.
- **100 variantes por `PUT .../variants`:** no DTO.
- **Pelo menos 1 valor por opção:** no DTO. Uma opção vazia faria zero combinações, e o produto
  ficaria sem nada vendável.

As constantes ficam em `catalog.constants.ts`, como o ticket pede.

### 7. SKU recusado no serviço, com o índice de garantia

O serviço recusa com 409 `PRODUCT_SKU_TAKEN`:

- dois SKUs iguais entre as variantes do produto, depois do patch;
- um SKU já usado por variante de outro produto da loja.

Os SKUs que mudam são limpos antes de ser gravados, para que duas variantes possam trocar de código
num mesmo salvamento. Uma corrida com outro produto cai no índice único, e o P2002 vira o mesmo 409.

### 8. `PUT .../variants` é um patch por variante

Só muda o que foi enviado. As variantes não listadas ficam como estão, e um `id` repetido no corpo é
400 (`ArrayUnique`). Cada variante é validada com os valores que terá depois do patch: preço "de"
acima do preço e caixa completa. Tudo roda numa transação, sob a trava do produto, e termina
recalculando o resumo.

### 9. `ProductDetail`: o produto com opções e variantes

`GET`, `POST` e `PUT` de um produto passam a responder `ProductDetail`, que é o `Product` mais
`options` e `variants`. Os dois endpoints novos respondem o mesmo. A lista de produtos continua
respondendo `Product`, sem variantes, porque lê até 96 produtos de uma vez. O web continua
compilando, já que `ProductDetail` estende `Product`.

### 10. O editor atual continua salvando um produto com opções

O editor de produto manda todos os campos por unidade em todo salvamento. Com a decisão 5 do A1, um
produto com opções não poderia mais ser renomeado. `perUnitPatchOf` agora descarta os valores
iguais aos atuais, que num produto com opções são o resumo. Um valor diferente continua 409
`PRODUCT_HAS_OPTIONS`. Isso refina a decisão 5 do A1 até o A4 trocar o editor.

### 11. class-validator, não zod

O brief fala em zod, mas os corpos da API validam com class-validator (regra 6 de
`apps/api/AGENTS.md`). O zod fica para env e colunas JSON.

## Fora de escopo

- A leitura pública (A3) e as telas (A4, A5).
- As frases do painel para os códigos novos. Elas entram no A4, com o editor que os encontra.
- Impedir, no banco, que uma variante aponte para uma opção de outro produto. Hoje o serviço
  impede.
