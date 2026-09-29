# BEELINK-170 · L4 — Sem regra de frete, o pedido diz "frete a combinar" em vez de R$ 0

> **Tier:** plans — verdade de um momento, para um ticket. Append-only.

## O problema

O checkout já avisa que "a loja informa a taxa de entrega ao confirmar o pedido", mas o pedido do carrinho grava `deliveryFeeCents = 0` (`customer-orders.service.ts`). Depois de fechado, tudo trata esse zero como um valor:

- a página do pedido da cliente diz **"Entrega: Grátis"** (`order-page-view.ts`);
- o total parece final, em Meus pedidos, no comprovante e no painel;
- a mensagem de WhatsApp do painel diz "Entrega: R$ 0,00".

## Definition of Done

1. Um pedido de **entrega** fechado pelo carrinho grava o frete como **a combinar**, não como zero. O total dele é o dos produtos.
2. Os pedidos de entrega do carrinho que já existem com frete zero passam a ser "a combinar".
3. Na loja, a página do pedido e o comprovante dizem **"Entrega: A combinar"**, e o total diz **"+ frete"**. O card de Meus pedidos também diz "+ frete". Um frete zero lançado de verdade continua dizendo "Grátis".
4. No painel, o pedido aberto mostra "A combinar" e um campo para lançar o frete. A lista de pedidos diz "+ frete", e a mensagem de WhatsApp diz "Entrega: a combinar".
5. Lançar o frete recalcula o total e a conta do cliente no CRM. A cliente passa a ver o valor e o total certo. Uma retirada e um pedido cancelado recusam o frete.
6. A retirada continua sem frete.

## Decisões

- **`deliveryFeeCents: number | null`** no contrato (`Order`, `OrderSummary`, `CustomerOrder`, `CustomerOrderSummary`) e no banco. `null` quer dizer que não foi combinado: um fato diferente de "grátis", que é `0`. Um CHECK garante que só uma entrega pode ter o frete nulo.
- **O total de um pedido a combinar é o dos produtos** (subtotal menos desconto). É o que a loja sabe cobrar hoje, e cada tela diz "+ frete" ao lado.
- **Migração dos pedidos antigos:** vira nulo o frete zero de uma entrega cujo primeiro evento foi da cliente (`RECEIVED` com autor `CUSTOMER`, que é o pedido do carrinho). Um pedido lançado pelo lojista com frete zero continua zero, porque ali o zero foi digitado.
- **O pedido lançado pelo lojista não muda:** ele digita o frete no formulário (H3), e o valor vazio segue sendo zero.
- **Rota `PUT /stores/:slug/orders/:number/delivery-fee` com `{ deliveryFeeCents }`**, no estilo do `PUT :number/delivery` (J7):
  - usa a mesma trava da loja que a mudança de status;
  - recusa retirada com `ORDER_DELIVERY_FOR_PICKUP` e pedido cancelado com `ORDER_CANCELLED`;
  - recusa um total acima do teto com `ORDER_TOTAL_TOO_LARGE`;
  - recalcula a conta do cliente no CRM (`refreshBooks`).
- **Sem evento de tempo real novo:** o J7 também não publica, e a página da cliente é desenhada no servidor, então mostra o valor na próxima vez que abrir.

## Fora de escopo

- Calcular o frete, que é o Épico M. Quando o M4 existir, o pedido de uma loja com regras nasce com o frete cotado.
- Voltar um frete lançado para "a combinar".
- Avisar a cliente no chat quando o frete é lançado. O K7 avisa só mudança de status.

## Depois da implementação (29/09)

- **"+ frete" em mais lugares do que a DoD listava.** Na loja: o card de Meus pedidos, a Visão geral da conta e a mensagem de WhatsApp que sai do carrinho. No painel: a lista (tabela e cards), os pedidos da ficha do cliente, o aviso de pedido novo no sino e a mensagem de WhatsApp. Uma regra só escreve todos: `orderTotalText`, em `packages/ui/src/lib/order-total.ts`.
- **Um pedido cancelado não diz "+ frete".** Não há mais nada a combinar, e o total dele é o que foi. Isso apareceu no teste no navegador, nos cancelados do carrinho.
- **A migração foi conferida numa cópia do `harness_wt`.** As 5 entregas do carrinho viraram "a combinar". As entregas lançadas pelo lojista mantiveram o valor digitado, inclusive as de frete 0. As retiradas continuaram em 0.
