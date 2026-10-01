# BEELINK-190 — O1 · API: promoções e cupons — o modelo, as regras e as rotas do lojista

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O1 do Épico O (BEELINK-189), o primeiro da fila. Sai do `main`.
> Quem calcula o desconto é o O2 (BEELINK-191). As telas do painel são do O3 (BEELINK-192), a vitrine
> é do O4 (BEELINK-193) e o checkout é do O5 (BEELINK-194). A condição "só na primeira compra" é do
> O6 (BEELINK-245).

## Definição de Pronto

1. A loja guarda promoções com nome, alcance (carrinho, produtos ou categorias), tipo e valor do
   desconto, início e fim, e ativa ou pausada.
2. A loja guarda cupons com código único na loja (sem diferença de maiúsculas), tipo (percentual,
   valor fixo ou frete grátis), valor, subtotal mínimo, validade, limite total e limite por cliente.
3. O tipo do desconto é dito, nunca adivinhado: percentual em basis points (1000 = 10,00%) ou valor
   fixo em centavos. O banco recusa a combinação que não fecha.
4. O lojista lista, cria, edita e pausa promoções, e cada uma vem com a situação (agendada, ativa,
   pausada, encerrada).
5. O lojista lista, cria, edita e pausa cupons, e cada um vem com a situação (as da promoção, mais
   esgotado) e com quantas vezes foi usado.
6. O lojista vê os usos de um cupom: o pedido, o cliente, quanto o cupom tirou e quando.
7. As rotas são só do dono da loja: sem sessão respondem 401, e a loja de outra pessoa responde 403.
   Promoção, cupom, produto ou categoria de outra loja respondem como se não existissem.
8. Os formatos estão em `packages/contracts`.
9. Há testes de unidade para as regras e testes e2e da API para as rotas. `pnpm ci-check` está verde.

## Decisões

### 1. O registro: `prisma/schema/promotion.prisma`

Um arquivo novo. Loja, produto, categoria e pedido só ganham o campo de volta da relação.

- **`Promotion` (`promotions`):** `name`, `scope` (`CART` | `PRODUCTS` | `CATEGORIES`),
  `discountKind` (`PERCENT` | `FIXED`), `percentBps`, `amountCents`, `startsAt`, `endsAt`, `isActive`.
- **`PromotionProduct` e `PromotionCategory`:** as duas tabelas de ligação do alcance, com chave
  composta, no molde de `product_image_values`. Apagar o produto ou a categoria tira a linha. Uma
  promoção de produtos que ficou sem nenhum não vale para nada, e o painel mostra a lista vazia.
- **`Coupon` (`coupons`):** `code`, `kind` (`PERCENT` | `FIXED` | `FREE_SHIPPING`), `percentBps`,
  `amountCents`, `minSubtotalCents`, `startsAt`, `endsAt`, `maxUses`, `maxUsesPerCustomer`,
  `usedCount`, `isActive`.
- **`CouponRedemption` (`coupon_redemptions`):** o uso. Um por pedido (`orderId` único), com
  `discountCents`, que é quanto o cupom tirou daquele pedido. Não repete o cliente: quem usou é o
  cliente do pedido. Assim, juntar dois cadastros leva os usos junto com os pedidos, sem código novo.

**Duas colunas para o valor, e não uma.** `percentBps` e `amountCents` são anuláveis, e um `CHECK`
amarra cada uma ao tipo:

| Tipo | `percentBps` | `amountCents` |
|---|---|---|
| `PERCENT` | 1 a 10000 | nulo |
| `FIXED` | nulo | 1 ou mais |
| `FREE_SHIPPING` (só cupom) | nulo | nulo |

Uma coluna só, `value`, guardaria centavos ou basis points conforme o tipo. É o número que quer dizer
duas coisas, e o catálogo já pagou por isso no legado (`priceCents` existe por essa razão).

**O período.** `startsAt` é obrigatório. `endsAt` é opcional: nulo é "sem data para acabar", que é o
caso da promoção de primeira compra do O6. Um `CHECK` exige o fim depois do início.

**O código do cupom** é guardado já normalizado: sem espaços nas pontas e em maiúsculas. O índice
único `(storeId, code)` passa a valer sem collation, como o slug da loja. Aceita de 3 a 30
caracteres entre letras sem acento, números, `-` e `_`, e começa por letra ou número. Um código com
espaço ou acento é recusado, e não corrigido: o cliente digita o que o lojista divulgou.

**`usedCount`** é um cache de quantos usos contam para o limite. Quem o move é o O2, na transação do
pedido e sob trava. Um `CHECK` impede que fique negativo.

**`minSubtotalCents`** é zero quando não há mínimo. Zero e "sem mínimo" são o mesmo fato.

**Sem teto de quantidade e sem apagar.** O ticket pede listar, criar, editar, pausar e ver os usos.
Uma promoção ou um cupom que saiu de uso fica pausado ou encerrado, e a lista é paginada.

### 2. A situação é calculada na leitura, nunca guardada

Ela depende da hora, então guardar seria guardar algo que envelhece sozinho. A regra é uma função
pura (`promotion-status.ts`), e a mesma regra vira o filtro em SQL da lista.

A ordem de precedência, da primeira que valer:

1. `ENDED` — o fim já passou.
2. `EXHAUSTED` — só cupom: tem limite total e `usedCount` chegou nele.
3. `PAUSED` — o lojista desligou.
4. `SCHEDULED` — o início ainda não chegou.
5. `ACTIVE`.

Encerrado e esgotado vêm antes de pausado porque religar não os faria valer.

### 3. As rotas, todas do dono da loja

Passam pela porta global (`JwtAuthGuard`) e por `StoresService.ownedStoreId`.

| Verbo | Caminho | O que faz |
|---|---|---|
| `GET` | `/stores/:slug/promotions` | a lista, da mais nova para a mais antiga, com `status`, `page` e `pageSize` |
| `POST` | `/stores/:slug/promotions` | cria (201) |
| `GET` | `/stores/:slug/promotions/:id` | uma, para o formulário |
| `PUT` | `/stores/:slug/promotions/:id` | substitui tudo o que o formulário edita, inclusive o alcance |
| `PATCH` | `/stores/:slug/promotions/:id` | `{ active }`: pausa ou religa |
| `GET` | `/stores/:slug/coupons` | a lista, com `status`, `page` e `pageSize` |
| `POST` | `/stores/:slug/coupons` | cria (201) |
| `GET` | `/stores/:slug/coupons/:id` | um |
| `PUT` | `/stores/:slug/coupons/:id` | substitui |
| `PATCH` | `/stores/:slug/coupons/:id` | `{ active }` |
| `GET` | `/stores/:slug/coupons/:id/redemptions` | os usos, do mais novo para o mais antigo, paginados |

- **A lista traz a contagem de cada situação** (`counts`), sobre todas as linhas da loja e não sobre
  o filtro, para as abas do O3.
- **O `PUT` é uma substituição,** como o da loja: o campo opcional que o corpo não manda é limpo. O
  `PATCH` existe para pausar com um clique na lista, sem reenviar o formulário.
- **Editar não reescreve o passado.** O pedido fotografa o desconto, o código e a promoção (O2).
  Por isso tudo pode ser editado, até o código de um cupom já usado.
- **Baixar `maxUses` para menos do que já foi usado é aceito.** O cupom passa a ler esgotado.

### 4. As recusas

Todas em `PromotionErrorCode`, com códigos próprios. O web guarda uma frase por código.

| Código | Status | Quando |
|---|---|---|
| `PROMOTION_NOT_FOUND` | 404 | não é uma promoção desta loja |
| `PROMOTION_DISCOUNT_INVALID` | 400 | o valor não fecha com o tipo |
| `PROMOTION_PERIOD_INVALID` | 400 | o fim não vem depois do início |
| `PROMOTION_TARGETS_INVALID` | 400 | o alcance e as listas não fecham: produtos sem nenhum produto, carrinho com lista |
| `PROMOTION_TARGET_NOT_FOUND` | 404 | um produto ou categoria que não é desta loja |
| `COUPON_NOT_FOUND` | 404 | não é um cupom desta loja |
| `COUPON_CODE_INVALID` | 400 | o código tem caractere fora do aceito, ou o tamanho errado |
| `COUPON_CODE_TAKEN` | 409 | outro cupom da loja já tem o código |
| `COUPON_DISCOUNT_INVALID` | 400 | o valor não fecha com o tipo |
| `COUPON_PERIOD_INVALID` | 400 | o fim não vem depois do início |

O alcance aceita até 200 produtos ou 200 categorias por promoção. Um produto em rascunho pode ser
escolhido: a promoção passa a valer para ele quando ele for publicado.

### 5. Onde

- **Contrato:** `packages/contracts/src/promotion.ts`.
- **API:** o módulo `src/modules/promotions/`, com as duas portas (`promotions.controller.ts` e
  `coupons.controller.ts`). Importa `StoresModule`, que diz de quem é a loja.
- **Produto:** `docs/product/README.md`, em "Promotions and coupons", ganha o que este ticket fixou:
  pausar, frete grátis, pedido mínimo e o código sem diferença de maiúsculas.

## O que fica para o O2

Estas perguntas são do cálculo, e este ticket não as responde. O modelo serve a qualquer resposta.

- **Duas promoções valendo ao mesmo tempo.** Nada aqui impede criar duas que se sobrepõem. O O2 diz
  qual vale. Sugestão: por linha do carrinho, a melhor para o cliente, sem somar.
- **O valor fixo num alcance de produtos ou categorias:** por unidade ou sobre a soma das linhas.
- **A categoria e as suas subcategorias:** se a promoção de "Proteínas" cobre "Whey".
- **O pedido cancelado devolve o uso do cupom?** Está "a decidir" no épico (sugestão: devolve). O
  uso fica gravado com o pedido nos dois casos. A resposta só muda se o O2 baixa `usedCount` no
  cancelamento e se o limite por cliente conta o pedido cancelado.

## Fora de escopo

- O cálculo do desconto, a validação do cupom pelo cliente e a gravação do uso (O2).
- As telas (O3), a vitrine (O4) e o checkout (O5).
- A condição "só na primeira compra" (O6).
- Apagar promoção ou cupom, e buscar cupom por código na lista.
- Cupons da plataforma (Épicos S e T).

## Adendo da revisão (01/10)

Um revisor de correção leu o diff. Situação, isolamento entre lojas, corridas e chaves estrangeiras
saíram limpos. O que mudou:

- **O nome da promoção é contado como a coluna conta,** em code points (`MaxCodePoints`). Um nome de
  79 letras e um coração passava no limite de 80 e estourava o `VARCHAR(80)` com um 500.
- **Os `CHECK` do desconto pedem o valor pelo nome** (`IS NOT NULL`). Um `NULL` comparado dá `NULL`, e
  o `CHECK` deixava passar um percentual ou um valor fixo sem número nenhum. A API já recusava; o
  banco agora recusa de qualquer um. A migração foi editada antes do primeiro push.
- **`startsAt` e `endsAt` só aceitam ISO-8601 com o deslocamento** (`2026-10-05T13:00:00.000Z`).
  Antes, tudo o que `new Date()` lê passava: "10/05/2026" virava 5 de outubro, 31 de fevereiro
  virava 3 de março, e uma hora sem deslocamento dependia do fuso do servidor. Os limites do
  calendário (2000 a 2100) foram para a regra `periodOf`.
- **O código do cupom é conferido como foi digitado, e só depois vai para maiúsculas.** Subir a caixa
  antes transformava "straße" em `STRASSE` e aceitava um código que o lojista não escreveu. Isso
  cumpre a decisão 1: acento é recusado, e não corrigido.
- **`active` não aceita `null`, e o `PUT` sem `active` mantém o interruptor como está.** Antes, um
  formulário que salvasse um cupom pausado sem mandar o campo o religava, sem aviso. Isso corrige a
  decisão 3: a substituição limpa todo campo opcional ausente, menos esse. No `POST`, ausente
  continua sendo ligado.
