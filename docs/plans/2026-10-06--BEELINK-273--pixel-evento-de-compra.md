# BEELINK-273 (X6) — a compra chega à Meta pelo navegador

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X5 ([BEELINK-272](2026-10-06--BEELINK-272--pixel-eventos-de-navegacao.md), PR #226). A pilha fica `main` → X1 → X2 → X3 → X4 → X5 → **X6**, e é mesclada junta. O ponto de despacho, as palavras da Meta e a convenção de ID de produto são os do X5; este ticket acrescenta um evento.

## O problema

A loja já conta à Meta o caminho do visitante até o checkout. A compra, que é o que um anúncio otimiza, não sai. Este ticket envia `Purchase` do navegador de quem comprou, com valor e itens, uma vez por pedido.

## Definição de Pronto

1. Um pedido combinado com a loja (canal `OFFLINE`), feito pelo cliente no carrinho, envia um `Purchase` na tela "pedido enviado", com `value`, `currency`, `content_ids`, `content_type`, `contents` (quantidade e preço do item) e `num_items`.
2. Um pedido cobrado no site (canal `ONLINE`) não envia nada ao ser feito; envia um `Purchase` quando o cliente está olhando o pedido e ele está, ou passa a estar, pago: na tela de pagamento (`?pagamento=1`) no instante em que a API diz "pago", e na página do pedido. Um pedido online nunca pago não envia nada.
3. Um pedido `ONLINE` sem nada a pagar (total fechado em zero) conta como o `OFFLINE`.
4. A regra "o que conta como compra, e quando" está em **uma** função pura, com testes; inverter a decisão é mudar uma linha.
5. O `eventID` é `purchase-<id do pedido>`, com o UUID do pedido — o mesmo que o servidor (X7) conhece.
6. Um pedido é contado uma vez por navegador: recarregar, voltar à página do pedido, abrir em outra aba — nenhum segundo `Purchase`. A marca só é gravada quando o evento saiu de fato.
7. Quem aceita os cookies depois da compra, olhando o pedido, tem a compra contada nesse momento, uma vez — dentro da janela da decisão 7.
8. Nada sai: sem aceite; de loja sem pixel; do painel (pedido registrado pelo lojista, inclusive quando o cliente o abre na conta dele); de pedido cancelado; de pagamento devolvido. Nenhum evento "negativo".
9. Dinheiro sai em reais com decimais, `BRL`; o ID de produto é o do X5 (UUID do produto, `content_type: "product"`).
10. A frase do painel deixa de dizer "As compras ainda não são enviadas" e diz o que conta como compra; `docs/product/README.md` também.
11. O que o X7 precisa para espelhar o evento está escrito aqui.
12. Os eventos do X5 não mudam. `pnpm ci-check` verde.

## Decisões

### O que conta como compra

1. **Loja que combina o pagamento com o cliente (`OFFLINE`): o pedido feito é a compra.** **Loja que cobra no site (`ONLINE`, Asaas): o pagamento confirmado é a compra**, não o pedido. Um pedido `ONLINE` com total fechado em zero não tem o que cobrar e conta como o `OFFLINE`.
   - **Quem decidiu:** o assistente que orquestra o épico, por recomendação própria. O dono foi perguntado e **não respondeu**. Não é uma decisão do dono.
   - **Por quê:** a maioria das lojas não cobra no site; sem isso, o pixel delas nunca veria uma compra para otimizar.
   - **O custo:** um pedido `OFFLINE` cancelado depois já foi contado, e não é descontado.
   - **Como inverter:** `purchaseCountsWhen`, em `apps/web/src/lib/purchase.ts`. Trocar o retorno `"PLACED"` por `"NEVER"` faz o pedido combinado com a loja deixar de contar. É uma linha, e os testes da função dizem quais casos mudam.
2. **Só o pedido que o próprio cliente fez no carrinho** (`placedBy: "CUSTOMER"`). Um pedido que o lojista registrou no painel não é uma compra do site, mesmo quando o cliente o abre na conta dele.
3. **Cancelado não conta; devolvido não conta.** Pedido `CANCELLED` não envia nada, tenha sido pago ou não. "Pago" é a cobrança em `CONFIRMED` ou `RECEIVED`, com `paidAt`; `REFUNDED` e `PARTIALLY_REFUNDED` não enviam. Nada é enviado para desfazer uma compra já contada.
4. **Pedido `ONLINE` com frete a combinar** (`deliveryFeeCents: null`) ainda não tem total fechado nem cobrança: espera o pagamento, como qualquer `ONLINE`.

### Onde e quando sai

5. **A compra é contada quando o comprador está olhando o pedido, com o aceite de pé, e ela ainda não foi contada neste navegador.** Três lugares, todos dentro do layout da loja:
   - a tela "pedido enviado" do carrinho (`StorefrontCartLive`, depois de `useCartOrder`), para o `OFFLINE`;
   - a tela de pagamento (`OrderPaymentLive`), no instante em que a leitura da cobrança diz "pago" — é onde o Pix aprovado aparece;
   - a página do pedido (`OrderPage`), que é para onde a tela de pagamento leva, para onde o cliente volta do cartão, e o que `OrderPaymentWatch` recarrega quando o pagamento chega.
   O comprovante (`?comprovante=1`) é uma folha de impressão e não envia.
6. **Aceite dado depois da compra.** A marca só é gravada quando o evento saiu. Então: quem fez o pedido sem ter respondido ao aviso e aceita na própria tela "pedido enviado", ou na página do pedido, tem a compra contada **no aceite**, uma vez. É a regra 16 do X5: o que descreve onde o visitante está é dito no aceite — e ele está olhando o pedido que fez. Um aceite dado em outra página não envia a compra; ela sai se, e quando, ele abrir o pedido dentro da janela. Depois da janela, o navegador não a conta mais.
7. **Janela de 24 horas.** O navegador só conta uma compra até 24 h depois do momento em que ela passou a valer (`placedAt` no `OFFLINE`, `paidAt` no `ONLINE`). Dois motivos: (a) a Meta só junta o evento do navegador ao do servidor se os dois chegam em até 48 h um do outro; um `Purchase` do navegador três dias depois do do servidor (X7) seria contado em dobro; (b) uma compra antiga contada "agora" entra no dia errado do relatório. 24 h deixa folga dentro das 48. Na página do pedido o relógio é o do servidor; na tela de pagamento, o do navegador (a compra acabou de acontecer).

### O identificador

8. **`eventID: "purchase-<UUID do pedido>"`.** O cliente só recebia o número do pedido (sequencial por loja), e o servidor tem o UUID. Em vez de um segundo esquema (`purchase-<loja>-<número>`), **o contrato ganhou um campo**: `CustomerOrder.id`. O UUID não é segredo nem dá acesso a nada (toda rota do cliente segue pedindo sessão, loja e número). Ele também aparece na exportação dos dados do cliente, que lista `CustomerOrder`.

### A marca "já contado"

9. **Cookie `bl_purchases`, nosso, `Path=/<slug>`, não `httpOnly`, `SameSite=Lax`, `Secure` em HTTPS** — as escolhas do `bl_consent` e do `bl_cart`, pelos mesmos motivos, e porque `localStorage` é proibido (`web/no-web-storage`). Guarda os UUIDs (sem hífens) dos últimos pedidos contados, no máximo **20**, por **7 dias** renovados a cada gravação. É lido na hora de cada envio, e não na montagem: é o que faz uma segunda aba não repetir.
   - **Além dos limites:** só um pedido dentro da janela de 24 h pode ser contado, e o cookie dura 7 dias, então o tempo nunca solta um pedido ainda contável. A quantidade solta: com mais de 20 compras contadas numa loja, num navegador, em 24 h, a mais antiga sai da lista e seria contada de novo se o cliente a abrisse. Aceito.
   - **O que a marca não cobre:** outro navegador ou outro aparelho (o cookie é do navegador); cookies apagados. Nesses casos sai um segundo `Purchase` com o **mesmo** `eventID`, dentro das 24 h. *Inferido, não confirmado:* a Meta descreve a junção por `eventID` para o par navegador+servidor; não encontrei escrito que dois eventos de navegador com o mesmo `eventID` são juntados.
   - **Por que não no banco:** marcar no pedido "já contado à Meta" gravaria no bee-link um fato sobre o consentimento do visitante, que a política diz ficar só no navegador, e pediria rota, migração e uma escrita a cada compra. O X7 terá o registro do envio do servidor; o do navegador fica no navegador.
10. **"Saiu de fato"**: `track()` passa a devolver se o evento foi entregue ao pixel (`true`) ou recusado (`false` — sem aceite, sem pixel, página em silêncio). Quem chamava e ignorava o retorno não muda. A marca é gravada só com `true`. *Limite:* um evento entregue à fila antes de a biblioteca da Meta chegar, seguido de uma recusa do visitante nesse intervalo, é retirado da fila (regra do X5) com a marca já gravada: essa compra não é contada pelo navegador. É quem recusou no mesmo segundo; fica assim.

### Os parâmetros

Lidos em "Reference: standard events" (Pixel) e em "Custom Data Parameters" (API de Conversões), em 06/10:

| Parâmetro | Valor |
|---|---|
| `value` | o **total do pedido** (`totalCents`), em reais: produtos, menos promoções, cupom e cashback usado, mais o frete |
| `currency` | `BRL` |
| `content_ids` | os UUIDs dos produtos, um por produto |
| `content_type` | `product` (decisão 13 do X5) |
| `contents` | `[{ id, quantity, item_price }]`, um por produto |
| `num_items` | as unidades somadas |

Com `{ eventID: "purchase-<UUID>" }` no quarto argumento.

11. **`value` é o total cobrado, com frete e depois dos descontos.** É o que o cliente paga e o que a loja recebe pelo pedido; num pedido `ONLINE` é exatamente o valor da cobrança; e é um número que o servidor tem pronto (`Order.totalCents`), sem conta a refazer no X7. A Meta só diz que `value` é "o valor, para o negócio, de o usuário fazer esse evento". *De memória, não conferido agora:* as integrações de Shopify e WooCommerce também enviam o total com frete. **O custo:** o ROAS que o lojista lê inclui o frete, que em parte é repasse. Trocar por "só produtos" é uma linha em `purchaseOf`. Num pedido `OFFLINE` com frete a combinar, o total ainda não tem o frete, e é esse total que sai.
12. **`item_price` é o que uma unidade custou depois da promoção da linha**: `(lineTotalCents − discountCents) / quantity`. Cupom e cashback são do pedido, não de uma linha, e não entram; por isso a soma dos itens pode não fechar com `value`. Duas variações do mesmo produto viram um item só (regra do X5), com as unidades somadas e o preço médio, arredondado ao centavo. `item_price` está na lista de campos de `contents` da API de Conversões; a referência do Pixel só nomeia `id` e `quantity` como obrigatórios. `num_items` aparece na referência do Pixel entre os parâmetros de `Purchase`; a da API de Conversões o descreve para `InitiateCheckout`. Enviamos os dois.
13. **Uma linha cujo produto foi apagado** (`productId: null`) fica fora de `contents`; o `value` não muda.
14. **Não enviamos** `order_id`, número do pedido, forma de pagamento, cupom, nem nada do cliente (nome, e-mail, telefone, endereço).

## Para o X7 (API de Conversões) — o que espelhar

O servidor tem de enviar **o mesmo evento**, ou a Meta conta em dobro ou não junta:

- **`event_name`**: `Purchase`. **`event_id`**: `purchase-<Order.id>` (o UUID, com hífens, minúsculo como o banco guarda).
- **Qual pedido, e quando:** a regra de `purchaseCountsWhen` — feito pelo cliente (`actor` do primeiro evento = `CUSTOMER`); `OFFLINE`, ou `ONLINE` com total fechado em zero → na criação do pedido (`CustomerOrdersService.place`); `ONLINE` → quando a cobrança passa a paga, que tem uma porta só: `applyCharge` (`payment-facts.ts`), junto do `order_paid_notices`. Nunca para pedido registrado no painel. Nada no cancelamento nem no estorno.
- **`event_time`**: `placedAt` no primeiro caso, `paidAt` no segundo. O servidor deve enviar **na hora**: o navegador só envia até 24 h depois desse instante, e a Meta junta os dois em até 48 h.
- **`value`**: `Order.totalCents / 100`; `currency: "BRL"`. **`contents`**: por produto (`productId`, nunca a variação), `quantity` somada, `item_price` = soma de `(lineTotalCents − discountCents)` das linhas do produto ÷ unidades, arredondado ao centavo; `content_type: "product"`; `num_items` = unidades. Linhas sem `productId` ficam fora. A conta está em `purchaseOf` (`apps/web/src/lib/purchase.ts`) e `metaEventOf`; se o X7 a reescreve na API, um teste com o mesmo pedido dos dois lados prende a igualdade.
- **Consentimento:** o navegador só envia com aceite. O servidor precisa do mesmo fato no pedido (decisão 9 do X4: o handler `app/[slug]/api/orders` lê `bl_consent` e o repassa). Num pedido `ONLINE` pago horas depois, vale o aceite da hora do pedido, a menos que o X7 decida outra coisa.
- **Se a regra da decisão 1 for invertida**, muda dos dois lados no mesmo PR.

## O texto legal

- **O que é enviado:** a política do X4 já lista "o pedido que faz". O `Purchase` leva o total do pedido, os produtos, as quantidades e o preço de cada um. Entendo que cabe em "o pedido que faz"; **fica dito no PR para o dono confirmar**.
- **O cookie novo:** a política enumera os cookies `bl_*` e diz que o bee-link não usa outro meio de guardar dados no navegador. Com `bl_purchases`, a lista ficaria falsa. **Acrescentei uma linha à lista**, na mesma versão `2026-10-06` (a do X4, que ainda não foi publicada: a pilha é mesclada junta), num commit só dela, e **aviso no PR**: a seção diz "só cookies essenciais", e este existe por causa do pixel, só é gravado depois do aceite. Se o dono preferir outra redação ou outra seção, é um commit a reverter.

## Fora do escopo

- Enviar pelo servidor, guardar token (X7); UTM e `fbclid` (X8); gravar eventos do nosso lado (X9).
- Mudar o que os eventos do X5 enviam.
- Um evento que desfaça a compra cancelada ou estornada.
- e2e de Playwright novo no CI: a suíte não cria loja com pixel (como no X3, X4 e X5). A prova no navegador é feita uma vez, à mão, e contada abaixo.

## Fontes

- Meta, "Reference: standard events and object properties": https://developers.facebook.com/docs/meta-pixel/reference
- Meta, "Custom Data Parameters" (`contents`: `id`, `quantity`, `item_price`, `delivery_category`): https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/custom-data
- Meta, "Handling Duplicate Pixel and Conversions API Events" (mesmo `eventID` e mesmo nome; 48 h a contar do primeiro evento recebido): https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events

## 06/10, depois do código — o que mudou ao escrever

- **O evento da vitrine leva linhas próprias** (`SoldItem`: produto, unidades, o que a linha custou), e não o `EventItem` do X5: o preço por unidade depois da promoção pode não ser um número inteiro de centavos, e a média entre duas variações se faz sobre o que as linhas custaram.
- **`usePurchaseTold(slug, purchase)`** (`components/storefront/tracking/`) é o único lugar que conta uma compra: lê `bl_purchases`, chama `track`, grava a marca se `track` respondeu `true`. No carrinho ele mora em `useCartOrder` (o `StorefrontCartLive` está no limite de linhas e não mudou).
- **Na tela de pagamento a regra roda com a cobrança lida ali**, sobre o pedido que a página leu (`sale`): só o que foi lido depois de a tela abrir conta, como o resto daquela tela.
- **Um limite a mais da decisão 10:** um evento entregue à fila antes de a biblioteca chegar e uma saída da página (com recarga) nesse intervalo: a marca fica, o evento não saiu. É a mesma janela de fração de segundo de qualquer evento do X5; aqui custa uma compra não contada pelo navegador.
- **O texto do aviso "pedido enviado" e o resto da tela não mudaram.** O `PageView` de `?pagamento=1` leva a query no endereço que a biblioteca envia, como toda página (X5); não há token nela.
- **A linha do `bl_purchases` na política** ficou: "bl_purchases: numa loja que usa o Pixel da Meta, e só depois que você aceita, os códigos dos seus últimos pedidos já informados à Meta, para que o mesmo pedido não seja informado duas vezes; vale só para aquela loja e dura 7 dias, renovados a cada pedido informado".
- **A frase do painel** ficou: "De quem aceita, a loja envia à Meta as páginas e os produtos vistos, as buscas, os favoritos, o que vai para o carrinho, a chegada ao checkout e a compra. Conta como compra o pedido feito, quando o pagamento é combinado com você, ou o pagamento aprovado, quando é cobrado no site."

## 06/10 — o que foi visto no navegador

A vitrine foi aberta de verdade (`next dev` na 3800, API na 3801, banco `harness_meta_pixel`, loja `loja-do-pixel`, pixel `123456789012345`, que não é um pixel de verdade), percorrida pelo Playwright com **a biblioteca real da Meta servida do disco** (a mesma cópia do X5) e **toda requisição a `facebook.com` gravada e abortada**: nada chegou à Meta. Um cliente novo foi criado e confirmado pelo e-mail (Mailpit). Os servidores foram parados depois.

**Pedido combinado com a loja (rodado de ponta a ponta, sem nada simulado):**

- **Com o aceite já dado**, carrinho com uma Creatina (R$ 89,50), "Retirar na loja", "Dinheiro", "Fechar pedido": saem `PageView`, `InitiateCheckout`, `AddPaymentInfo` e **um** `Purchase`, com `eid=purchase-01a113b2-d1f7-755a-ac09-f7cf98d16659` (o UUID do pedido nº 1), `value: 89.5`, `currency: BRL`, `content_ids: ["<uuid do produto>"]`, `content_type: product`, `contents: [{ id, quantity: 1, item_price: 89.5 }]`, `num_items: 1`, endereçado ao pixel da loja, sem nenhum `ud[…]`. O cookie `bl_purchases` aparece com o UUID sem hífens, `Path=/loja-do-pixel`, 7 dias.
- **Recarregar** a página: só `PageView`. **A página do pedido**, no mesmo navegador: só `PageView`. **Uma segunda aba** na página do pedido, aberta e recarregada: dois `PageView`, nenhum `Purchase`. **Sair e voltar sem recarga**: nenhum `Purchase`.
- **Outro navegador do mesmo cliente** (sem o `bl_purchases`), com aceite, na página do pedido dentro das 24 h: sai um `Purchase` com o **mesmo** `eid`. É o limite escrito na decisão 9.
- **Sem ter respondido ao aviso:** o pedido é feito, nenhuma requisição à Meta, `window.fbq` indefinido, nenhum `bl_purchases`. **"Aceitar" na tela "pedido feito":** saem `PageView` e um `Purchase` daquele pedido, e o cookie é gravado. A página do pedido, depois: só `PageView`.
- **Tendo recusado:** o pedido e a página dele não geram nenhuma requisição, nem cookie.
- Console sem erros nos percursos.

**Pedido cobrado no site — o que rodou e o que não rodou.** Não há chave de sandbox do Asaas: **nenhuma cobrança de verdade foi criada, e nada foi pago**. O que foi feito no lugar: um pedido já existente no banco de teste foi marcado como `ONLINE`/Pix por SQL, com uma linha `order_payments` `PENDING` escrita à mão; e, no meio do percurso, essa linha foi escrita como `RECEIVED` com `paidAt` por SQL, **no lugar do que o `applyCharge` escreve quando o Asaas avisa**. Tudo o mais é o código de verdade — a API lendo a cobrança, o handler da loja, a tela, o intervalo de leitura:

- A página do pedido com a cobrança pendente diz "Aguardando pagamento": só `PageView`.
- A tela de pagamento (`?pagamento=1`) mostra o QR e lê a cobrança três vezes em sete segundos: nenhum `Purchase`.
- Com a linha escrita como paga, a leitura seguinte responde `RECEIVED`, a tela vira "Pagamento aprovado" sem recarregar e sai **um** `Purchase` (`eid=purchase-<UUID do pedido>`, `value: 89.5`), e o cookie é gravado.
- A tela segue para a página do pedido, que diz "Pagamento aprovado": nenhum evento. Recarregar, e abrir a tela de pagamento de novo: só `PageView`.
- Um navegador que nunca viu a tela de pagamento abre a página do pedido já pago: `PageView` e um `Purchase` — é o caminho de quem volta do cartão, ou de quem pagou o Pix com a aba fechada.

**Não rodado:** o Asaas (criar a cobrança, o webhook, `PaymentSync`, `applyCharge`); a volta da página do cartão do Asaas; o evento de tempo real que faz a tela ler de novo (aqui foi o intervalo); o build de produção no navegador; um pixel de verdade e o que o Gerenciador de Eventos mostra; a junção com um evento do servidor (não existe até o X7). Em teste de componente, e não no navegador: pedido registrado pelo lojista, cancelado, estornado, total zero, e a janela de 24 h.
