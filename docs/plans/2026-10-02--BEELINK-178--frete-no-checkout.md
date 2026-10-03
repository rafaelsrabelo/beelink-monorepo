# BEELINK-178 — M4: o frete calculado entra no pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico M (BEELINK-174). Empilhado sobre o N4 (BEELINK-185, PR #188), que fecha a cotação de entrega
> (M2 + transportadoras). Este ticket leva a **entrega própria e a retirada** ao checkout e ao pedido;
> escolher uma **transportadora** é o N5 (BEELINK-186), por cima deste.

## Definição de Pronto

1. **O checkout mostra o frete e a janela** da entrega própria para o endereço escolhido, assim que o
   cliente escolhe entrega — "R$ 5,00 · chega em 30–50 min" —, e o total do carrinho já soma o frete.
2. **Fora do raio, avisa na hora:** a entrega não pode ser escolhida para aquele endereço, com a
   distância e até onde a loja vai, e a retirada continua oferecida (quando a loja a oferece).
3. **Os modos da loja valem:** retirada desligada não aparece; entrega própria desligada não aparece.
4. **O pedido grava o que a API cotou de novo ao fechar:** o frete e a janela. O frete que a página
   mostrou vai junto; se a API cotar outro, o pedido é recusado e o carrinho é cotado de novo — nunca
   fechado a outro preço.
5. **Os totais batem ao centavo** entre o carrinho, o pedido do cliente e o painel: é a mesma conta
   (`priceOrder`), agora com o frete.
6. **Loja com faixas deixa de ver "frete a combinar":** só quem não tem faixa (ou cujo endereço não
   se localiza) continua combinando o frete depois, como no L4.
7. **O pedido mostra a janela** — no pedido do cliente e no do painel.
8. Testes: API (e2e do fechamento e da cotação), blocos (axe), a tela do carrinho; `pnpm ci-check` verde.

## O que entra

- **contracts:**
  - `order-quote.ts`: a cotação do cliente recebe `addressId`; `OrderQuote.shipping` (as opções para o
    endereço, ou null sem endereço) e `deliveryFeeCents` passa a ser o frete da opção em vigor.
  - `order.ts`: `PlaceCustomerOrderPayload.deliveryFeeCents` (o frete mostrado);
    `Order.deliveryWindow` e `CustomerOrder.deliveryWindow`; `ORDER_SHIPPING_UNAVAILABLE` e
    `ORDER_SHIPPING_CHANGED`.
- **API:**
  - Prisma: `Order.deliveryWindowUnit/From/To`, com a migration.
  - `orders/order-shipping.ts` (`OrderShipping`): o endereço do cliente → a cotação → o frete e a janela
    da opção em vigor, ou a recusa.
  - `OrderQuotes.forCustomer` e `CustomerOrdersService.place` passam por ele; `OrderPlacement` grava.
  - `ShippingQuotes.forCart`: a cotação para um carrinho já precificado.
- **packages/ui:** o bloco das escolhas do checkout diz o frete e a janela, ou por que não entrega;
  os blocos do pedido (cliente e painel) dizem a janela.
- **apps/web:** o preço do carrinho é pedido com o endereço; a recusa do pedido em palavras.

## Decisões deste ticket

1. **As opções vêm na cotação do carrinho**, e não numa segunda chamada: o checkout já pergunta o
   preço a cada mudança, e o frete muda o total e o cupom de frete grátis. Uma chamada, uma conta.
2. **A opção em vigor numa entrega é a entrega própria.** O N5 acrescenta a escolha entre ela e as
   transportadoras. Sem a entrega própria na lista (fora do raio, desligada), a cotação diz que a
   entrega não é possível e o pedido é recusado (`ORDER_SHIPPING_UNAVAILABLE`).
3. **A cotação do frete acontece antes da transação do pedido.** Geocodificar e, no N5, falar com o
   Melhor Envio são chamadas de rede: dentro da transação, segurariam a trava da loja. O preço dos
   produtos é lido sem trava para medir o "grátis acima de", e a transação precifica de novo com o
   frete já decidido.
4. **A janela fica no pedido**, em três colunas (unidade, de, até), e não no registro de entrega
   (J7): aquele é o que o lojista conta depois; esta é a promessa cotada ao fechar. Minutos na entrega
   própria; dias úteis nas transportadoras (N5).
5. **O pedido registrado no painel não muda:** o lojista digita o frete (M5 traz a cotação para lá).
6. **Retirada desligada recusa um pedido de retirada** (`ORDER_SHIPPING_UNAVAILABLE`), para o
   checkout antigo aberto numa aba não furar a regra.

## Fora de escopo

- Escolher transportadora e gravar no registro de entrega (N5).
- A cotação por CEP na página do produto (D3) e no registrar pedido (M5).
