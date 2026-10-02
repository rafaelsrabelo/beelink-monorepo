# BEELINK-239 — U2: o pedido gera cashback

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). Desenho comum em `2026-10-01--BEELINK-237--cashback.md`; o modelo e o extrato
> vieram do U1 (`2026-10-01--BEELINK-238--cashback-regras-e-extrato.md`).

## Definição de Pronto

1. O pedido feito com o cashback ligado guarda quanto vai gerar e o percentual da hora, e cria o lote
   pendente. Vale para o checkout e para o pedido registrado no painel.
2. Entregue: o lote fica disponível, a validade conta dali, e o extrato ganha a linha de ganho.
3. Voltar de entregue ou cancelar desfaz o crédito: o pendente some; o disponível sai do saldo até zero,
   e a diferença que o cliente já tinha gasto fica registrada no lote para o painel mostrar.
4. Mover o status duas vezes, ou duas pessoas ao mesmo tempo, nunca credita duas vezes. Entregar de novo
   reabre o mesmo lote.
5. Juntar clientes soma os extratos (feito no U1). Excluir a conta faz o saldo se perder, com uma linha
   no extrato, e a cópia dos dados do cliente inclui o crédito e o extrato.
6. A conversa do pedido e o e-mail de "entregue" dizem quanto o cliente ganhou.
7. Testes unitários do cálculo e e2e do ciclo do pedido. `pnpm ci-check` verde.

## O que entra

- **Pedido:** `cashbackEarnedCents` (o que o pedido gera, 0 sem cashback) e `cashbackRateBps` (o
  percentual da hora; nulo quando o cashback estava desligado ou o pedido não chegou ao mínimo).
- **Lote:** `validityDays`, a validade da regra na hora do pedido, porque a validade só começa a contar na
  entrega e mudar a regra vale para os pedidos novos; e `unrecoveredCents`, o que o cliente já tinha
  gastado quando o crédito foi desfeito.
- **Extrato:** um tipo novo, `FORFEIT`, o saldo perdido quando o cliente exclui a conta.
- **Mensagem da conversa:** `cashbackCents` no aviso de "entregue", o crédito que aquela entrega liberou.

### A base do ganho

`base = subtotal − promoção − cupom de produto − desconto do lojista`, nunca abaixo de zero. Frete fica
fora, e um cupom de frete grátis não reduz a base: ele desconta o frete. `ganho = floor(base × rateBps /
10000)`. Abaixo do pedido mínimo, ou com o cashback desligado, não há lote.

O cashback usado entra na base no U3, que é quem cria o uso.

## Decisões deste ticket

1. **Entregar de novo devolve o crédito descontada a diferença já perdoada.** Se o cliente gastou parte
   do crédito, o pedido voltou de entregue (o saldo parou em zero) e depois foi entregue de novo, o lote
   volta com o valor menos o que ele já tinha gastado. Sem isso, cada ida e volta daria crédito de novo.
2. **Excluir a conta perde o crédito**, com a linha `FORFEIT` no extrato, mesmo quando o cadastro fica
   para os livros da loja. O aviso na tela de excluir a conta, com o valor, entra no U7, junto com o
   saldo em Minha conta.
3. **A conversa guarda o valor da hora; o e-mail lê o lote na hora de sair.** O aviso da conversa é
   histórico, como o próprio status: "entregue, você ganhou R$ 5,00" foi verdade naquele momento. O
   e-mail sai depois, pela fila, e um pedido desfeito nesse meio não manda um e-mail prometendo um
   crédito que já não existe.
4. **O pedido do cliente não mostra o `unrecoveredCents`.** É o que a loja não recuperou, assunto do
   painel.

## Fora de escopo

- Usar crédito no pedido (U3), vencer (U4), telas do painel e da loja (U5, U6, U7).
