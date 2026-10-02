# BEELINK-240 — U3: usar o cashback no pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). O extrato e a trava vieram do U1; o ganho do pedido, do U2; o que a loja mostra,
> do U6.

## Definição de Pronto

1. O cálculo único de preço ganha a linha de cashback, depois da promoção e do cupom. Ela respeita o
   teto da loja e nunca paga o frete. O total nunca fica negativo.
2. O cliente vê, no orçamento do carrinho, quanto pode usar e por que não pode, quando não pode.
3. O débito é gravado na transação do pedido, sob a trava do cliente, do crédito que vence primeiro.
   Saldo que mudou no meio do caminho recusa o pedido com o motivo, e nunca fecha com outro valor.
4. O pedido guarda quanto usou. Cancelar devolve o crédito, com a validade antiga e no mínimo 7 dias
   (decisão do Rafael, 01/10).
5. O registrar pedido do painel aceita o uso do saldo (a API; a tela é do U7).
6. Testes unitários e e2e; `pnpm ci-check` verde.

## O que entra

- **Pedido:** `cashbackUsedCents`. O total passa a ser `subtotal − descontos − cashback usado + frete`.
  O desconto (`discountCents`) continua sendo só promoção, cupom e o desconto do lojista: cashback usado
  é uma dívida antiga da loja sendo paga, e os relatórios precisam separar os dois.
- **`CashbackRedemption`:** de quais lotes um uso tirou, e quanto de cada. É o que permite devolver ao
  lote certo quando o pedido é cancelado.
- **Orçamento:** `OrderQuote.cashbackUse`: o saldo do cliente, o máximo que este carrinho aceita, quanto
  foi aplicado, e o motivo quando não dá para usar.
- **Corpo do pedido** (checkout e painel): `cashbackCents`, o valor que o cliente viu e aceitou.

## A regra

- **Máximo** = `min(saldo usável, floor(produtos depois dos descontos × teto / 10000))`. Nunca o frete.
- **Usável** é o lote disponível, com resto e dentro da validade (`spendableAt`).
- **Na gravação:** com a trava da loja e do cliente, o máximo é calculado de novo. Se o valor pedido for
  maior que ele, o pedido é recusado (`ORDER_CASHBACK_REFUSED`, com o motivo e o máximo de agora). Se
  couber, é debitado exatamente o valor pedido, dos lotes que vencem primeiro.
- **O ganho** do pedido desconta o cashback usado (U2), mas o pedido mínimo olha o valor antes dele:
  usar crédito não tira o pedido do mínimo.

## Decisões deste ticket

1. **O crédito continua usável com o cashback desligado.** Desligar para de dar crédito novo; o que a
   loja já deve continua sendo do cliente (mesma lógica do ajuste manual no U1). O teto de uso da regra
   salva continua valendo.
2. **Não há pedido mínimo para usar.** As regras têm mínimo para ganhar, não para usar; o único limite
   de uso é o teto da loja.
3. **Devolver crédito a um lote que já foi desfeito não recria crédito.** Se o pedido que gerou o lote
   foi cancelado depois de o cliente gastar parte dele, o que volta do uso cancelado abate a diferença
   que a loja não tinha recuperado, em vez de virar saldo de novo.
4. **Validade na devolução:** a antiga, com no mínimo 7 dias a partir do cancelamento; um lote já
   vencido volta a valer por 7 dias.

## Fora de escopo

- As telas (U7): o checkout com "Usar meu cashback", Minha conta, comprovante, WhatsApp e o registrar
  pedido do painel.
- O vencimento automático (U4).
