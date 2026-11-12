# A cobrança do visitante: no CPF e no nome que ele digitou

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: bug de produção achado em 11/11/2026 na Mutante Suplementos.

## O que estava errado

Desde o P0 ([2026-11-06--P0-checkout-sem-codigo](../../../../docs/plans/2026-11-06--P0-checkout-sem-codigo.md)), o
visitante digita o CPF no checkout, e a API conferia que ele veio e o jogava fora: não ia para o cadastro (de
propósito) nem para o pedido. A cobrança lê o CPF do cadastro. Então:

- **Cadastro novo** (um WhatsApp que a loja não conhecia): sem CPF, a cobrança recusava com
  `PAYMENT_DOCUMENT_MISSING`, engolido em silêncio na hora de fechar o pedido. O pedido nascia sem Pix e sem
  cartão, e pagar pela página do pedido recusava pelo mesmo motivo. Na Mutante, de 06/11 a 11/11, foram 12 pedidos
  de 12: a loja cancelava ou recebia por fora, e quem conseguiu pagar abriu uma conta e comprou de novo.
- **Cadastro que já tinha CPF:** a cobrança saía no CPF e no nome do cadastro, não no de quem digitou. É o que o
  produto proíbe: nada do cadastro chega ao visitante, e a página de pagamento do Asaas mostra o nome.

O teste e2e da compra online do visitante usava o telefone de um cadastro com CPF, e conferia só o `200` da leitura
do pagamento, que responde `{ payment: null }` quando não há cobrança.

## Definição de pronto

1. O pedido guarda o CPF que o pagamento online leva (`orders.payerDocument`): o digitado, para um visitante; o do
   cadastro ou o digitado, para uma conta, como já era.
2. A cobrança usa esse CPF. Um pedido de visitante sem ele (os de antes desta correção) não é cobrado no CPF do
   cadastro: recusa com `PAYMENT_DOCUMENT_MISSING`. Um pedido de conta de antes da coluna segue no CPF do cadastro.
3. A cobrança de um pedido de visitante sai no nome que ele digitou (o da sessão de compra), nunca no do cadastro.
4. e2e: visitante com WhatsApp novo, Pix e cartão: o pedido nasce com a cobrança, no CPF e no nome digitados.
5. e2e: visitante no WhatsApp de um cadastro com CPF: a cobrança sai no CPF e no nome digitados, e o CPF do
   cadastro não muda.

## O que fica de fora

- Os pedidos de visitante já fechados sem cobrança: o CPF digitado não foi guardado, então não há o que refazer.
  Na Mutante eles já foram cancelados ou recebidos por fora.
- Avisar a loja ou o cliente quando um pedido nasce sem cobrança. Continua só no log.
