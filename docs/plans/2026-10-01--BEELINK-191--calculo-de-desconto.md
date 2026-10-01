# BEELINK-191 — O2 · API: um cálculo só de desconto para o carrinho, o checkout e o pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O2 do Épico O (BEELINK-189). Sai da branch do O1 (BEELINK-190, PR #159), que criou as tabelas e as
> rotas do lojista. As telas são do O3, a vitrine é do O4 e o checkout é do O5.

## Definição de Pronto

1. Um cálculo só diz o desconto de um carrinho: as promoções primeiro, o cupom depois, e o total
   nunca fica negativo.
2. O carrinho do visitante, o checkout do cliente e o registrar pedido do painel leem esse cálculo
   por uma rota de prévia cada um, e os dois caminhos que gravam pedido usam o mesmo cálculo.
3. O cliente valida um cupom antes de fechar e recebe o motivo quando ele não vale: não existe, não
   está valendo, venceu, esgotou, o cliente já usou o que podia, está abaixo do mínimo, ou não se
   aplica.
4. O uso do cupom é gravado na transação do pedido, uma vez por pedido. O limite total e o limite
   por cliente são conferidos sob trava: dois pedidos ao mesmo tempo não passam juntos do limite.
5. O pedido guarda o desconto de promoção, o desconto do cupom, o código e, em cada linha, a
   promoção que valeu, como eram na hora. Editar a promoção ou o cupom depois não muda o pedido.
6. Um pedido com um cupom que não vale é recusado com o motivo, e nada é gravado.
7. Cancelar o pedido devolve o uso do cupom.
8. Os formatos estão em `packages/contracts`.
9. Há testes de unidade para o cálculo e testes e2e para as rotas, a gravação, a corrida e o
   cancelamento. `pnpm ci-check` está verde.

## Decisões do Rafael (01/10)

O épico deixava quatro perguntas, e o Rafael respondeu as quatro:

- **O pedido cancelado devolve o uso do cupom.**
- **Duas promoções valendo ao mesmo tempo:** por linha do carrinho, vale a melhor para o cliente.
  Elas não se somam.
- **O valor fixo numa promoção de produtos ou de categorias é por unidade.**
- **A promoção de uma categoria cobre as subcategorias dela.**

## Decisões

### 1. O cálculo (`promotions/discount-pricing.ts`, puro)

**A promoção por linha.** Para cada linha, cada promoção que a alcança diz quanto tira:

- percentual: `floor(preço da unidade × bps / 10000)` por unidade, vezes a quantidade;
- valor fixo em produtos ou categorias: `min(valor, preço da unidade)` por unidade, vezes a quantidade.

Vale a que tira mais. No empate, vale a mais nova. O desconto é arredondado para baixo, em centavos
inteiros, por unidade: o preço promocional da vitrine (O4) vezes a quantidade dá o mesmo número.

**Quem alcança a linha.** A promoção de carrinho alcança todas. A de produtos alcança os produtos
que ela nomeia. A de categorias alcança o produto cuja categoria, ou a categoria mãe dela, está na
lista.

**O valor fixo no carrinho** é a exceção: ele é do carrinho inteiro, uma vez, e não de uma linha.
Como as promoções não se somam, ele disputa com a soma das melhores promoções por linha, e o cliente
leva o maior dos dois. Quando ele ganha, é repartido entre as linhas na proporção de cada uma, para
que toda promoção fique gravada na linha (decisão 4). No empate, valem as promoções por linha.

**O cupom entra depois,** sobre o que sobrou dos produtos (`subtotal − promoções`):

- percentual: `floor(base × bps / 10000)`;
- valor fixo: `min(valor, base)`;
- frete grátis: o valor do frete. Com o frete ainda "a combinar", é zero por enquanto (decisão 5).

**O desconto que o lojista digita no painel** continua existindo e entra por último. A regra dele
não muda: o total do pedido não pode ficar negativo (`ORDER_DISCOUNT_TOO_LARGE`).

**As promoções e a validade do cupom são lidas na data do pedido** (`placedAt`). Uma venda de ontem
registrada hoje leva a promoção de ontem. No carrinho e no checkout, a data é agora.

### 2. O cupom vale ou não vale (`promotions/coupon-verdict.ts`, puro)

O primeiro motivo que valer, nesta ordem:

| Motivo | Quando |
|---|---|
| `NOT_FOUND` | a loja não tem esse código |
| `EXPIRED` | o fim já passou |
| `EXHAUSTED` | o limite total foi atingido |
| `INACTIVE` | está pausado, ou o início ainda não chegou |
| `CUSTOMER_LIMIT` | este cliente já usou as vezes que podia |
| `NOT_APPLICABLE` | frete grátis numa retirada, ou não há nada para descontar |
| `BELOW_MINIMUM` | o que sobra dos produtos depois das promoções é menor que o mínimo |

- **O mínimo é comparado com os produtos depois das promoções,** que é a base sobre a qual o cupom
  age. A recusa leva o mínimo, para a tela dizer quanto falta.
- **Os usos do cliente são os pedidos não cancelados dele com o cupom.** É a consequência da
  decisão "o cancelado devolve".
- **A prévia nunca falha por causa do cupom:** ela responde os totais sem ele e diz o motivo. O
  pedido com um cupom que não vale é recusado com 409 `ORDER_COUPON_REFUSED` e o mesmo motivo. O
  cliente pediu um desconto, e gravar o pedido sem ele seria cobrar outro preço em silêncio.

### 3. As três prévias

| Rota | Quem | O que entra |
|---|---|---|
| `POST /stores/:slug/cart/quote` | qualquer visitante | as linhas e a entrega ou retirada. **Sem cupom** |
| `POST /stores/:slug/customer/orders/quote` | o cliente com sessão | o mesmo, mais o código do cupom |
| `POST /stores/:slug/orders/quote` | o dono da loja | o corpo do registrar pedido: cliente, frete, desconto digitado, cupom e data |

- **O visitante não testa cupom.** Uma rota aberta que respondesse "não existe" ou "existe" seria um
  jeito de adivinhar os códigos da loja. O cupom é conferido com sessão, sob o limite de pedidos por
  IP, e o checkout já exige sessão.
- **A resposta é a mesma nas três** (`OrderQuote`): as linhas com o preço, o desconto e a promoção de
  cada uma, o subtotal, o desconto das promoções, o veredito e o desconto do cupom, o desconto
  digitado, o frete e o total.
- **É `POST` porque leva as linhas no corpo,** e não é guardada em cache: depende da hora.
- **A prévia não confere estoque.** Uma linha que a loja não vende é recusada como no pedido
  (`ORDER_VARIANT_INVALID`).

### 4. O que o pedido guarda

- **`orders`:** `promotionDiscountCents`, `couponDiscountCents`, `couponCode` e `couponKind`.
  `discountCents` continua sendo o desconto inteiro do pedido (promoções, cupom e o que o lojista
  digitou), e `total = subtotal + frete − discountCents` continua valendo para quem já lê.
- **`order_items`:** `discountCents` (o que a promoção tirou da linha), `promotionId` e
  `promotionName`. `unitPriceCents` e `lineTotalCents` continuam sendo o preço do catálogo: o
  desconto é uma linha à parte nos totais, como o O5 pede.
- **`coupon_redemptions`** (do O1) recebe a linha do uso, com quanto o cupom tirou.
- `CHECK`: nada negativo, as partes cabem no desconto inteiro, e código e tipo do cupom andam juntos.

### 5. Frete grátis

O cupom de frete grátis desconta o frete do pedido. O frete continua gravado como é, e o desconto do
cupom é igual a ele: os totais leem "Frete R$ 10,00" e "Cupom −R$ 10,00".

No pedido do carrinho, o frete nasce "a combinar" (BEELINK-170). O cupom entra valendo zero, e
quando a loja informa o frete (`agreeDeliveryFee`) o desconto do cupom passa a ser o frete inteiro.
O total do cliente não muda, e o uso do cupom passa a dizer quanto ele custou à loja.

### 6. A gravação e a trava

- **O cálculo acontece dentro da transação do pedido,** depois da trava da linha da loja. Essa trava
  já põe em fila todo pedido e toda mudança de status da loja. O cupom é lido com `FOR UPDATE`, o
  limite é conferido, o uso é gravado e `usedCount` sobe, tudo antes do commit.
- **`usedCount` sobe e desce por SQL direto,** para o `updatedAt` do cupom continuar sendo a última
  edição do lojista.
- **O cancelamento** (`settleCancellation`, do painel ou do cliente) baixa `usedCount` do cupom do
  pedido. A linha do uso fica, e a lista de usos do O1 a mostra com o pedido cancelado.

### 7. Onde

- **Contrato:** `packages/contracts/src/order-quote.ts` (a prévia e os motivos) e `order.ts` (os
  campos novos do pedido e `couponCode` nos dois corpos de pedido).
- **API:** o cálculo e o veredito ficam em `modules/promotions`, como funções. As rotas de prévia
  ficam em `modules/orders`, que é quem lê as linhas do pedido.
- **Web:** só o que o compilador pedir. Os campos novos do pedido são obrigatórios no contrato, então
  as fixtures de teste que montam um pedido ganham esses campos. Nenhuma tela muda aqui.

## Fora de escopo

- O preço promocional na vitrine e nas leituras do catálogo (O4).
- O campo de cupom, os totais e o comprovante no web (O5), e o formulário do painel chamando a
  prévia do dono.
- A condição "só na primeira compra" (O6).
- O cashback (Épico U), que entra neste mesmo cálculo no U3.
- Recalcular o desconto de um pedido já gravado: o pedido é um fato, e só o frete combinado depois
  mexe no total.

## Adendo da revisão (01/10)

Um revisor de correção leu o diff. A aritmética (300 mil carrinhos sorteados), os limites sob
corrida, o frete grátis e o isolamento entre lojas saíram limpos: nenhum `CHECK` alcançável, nenhum
jeito de passar do limite do cupom. O que mudou:

- **A prévia do cliente tem um limite próprio por IP:** `CUSTOMER_QUOTE_RATE_LIMIT_MAX`, 30 a cada 5
  minutos. A decisão 3 dizia "sob o limite de pedidos por IP", e o código tinha 60 por minuto, o que
  deixava testar 600 códigos em dez minutos. O limite de pedidos (10 a cada 10 minutos) seria curto
  para um checkout que recalcula a cada mudança, e a prévia gastaria os pedidos do cliente. Isso
  corrige a decisão 3.
- **Um cupom que não tiraria nada é recusado (`NOT_APPLICABLE`), e não gasto.** São dois casos: o
  frete grátis numa entrega que a loja já fez grátis (frete zero), e um percentual que não chega a
  um centavo. Antes, o pedido levava o cupom, descontava zero e contava um uso. O frete grátis com o
  frete ainda "a combinar" continua aceito (decisão 5). Isso corrige a decisão 2.

O que fica como está, sabendo:

- **`ORDER_DISCOUNT_TOO_LARGE` e `ORDER_TOTAL_TOO_LARGE` agora saem de dentro da transação,** depois
  do estoque, do cliente e do endereço. Um corpo com dois defeitos responde o outro primeiro. É o
  preço de calcular o desconto sob a trava; nada é gravado nos dois casos.
- **A prévia do cliente pode criar o cadastro dele na loja,** como toda leitura do cliente já faz
  (`shopperAt`). As outras duas prévias não gravam nada.
- **Quem apaga a conta e abre outra volta a ter o limite por cliente inteiro.** É o limite de
  qualquer regra por cliente, o mesmo que o plano do cashback aceita para a primeira compra.
- **As promoções e as listas delas são lidas em comandos separados.** Uma edição do lojista
  exatamente entre os dois poderia precificar um pedido com a regra velha e a lista nova. A janela é
  de milissegundos, e fica aceita.

## Adendo do O4 (01/10)

- **O percentual passou a ser arredondado para cima, ao centavo,** na promoção e no cupom. A decisão 1
  dizia "arredondado para baixo". Com o O4 (BEELINK-193) o preço promocional vai para o card, e o selo
  de desconto é calculado pelos dois preços, arredondando para baixo: 10% de R$ 18,99 dava R$ 1,89 e
  o selo lia "9%". Para cima, a promoção de 10% lê sempre 10% ou mais. A diferença é de no máximo um
  centavo por unidade, a favor do cliente.
- **A regra por unidade ganhou nome:** `unitDiscountOf`. A vitrine e o carrinho chamam a mesma função.
- **Um percentual que sobra de qualquer valor dá pelo menos um centavo.** O motivo `NOT_APPLICABLE`
  por "percentual que não chega a um centavo" (adendo da revisão) deixa de acontecer: só sobra o caso
  em que as promoções não deixaram nada dos produtos.
