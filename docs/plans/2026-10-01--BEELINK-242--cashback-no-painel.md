# BEELINK-242 — U5: a tela Cashback no painel e o saldo na ficha do cliente

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). A API veio do U1 (regras, extrato, ajuste) e do U2 (o pedido gera crédito).

## Definição de Pronto

1. Tela Cashback no painel: ligar, percentual, validade, pedido mínimo e teto de uso, com um exemplo
   calculado ("num pedido de R$ 100,00 o cliente ganha R$ 5,00").
2. A tela mostra o que a loja deve em crédito: disponível, pendente e o que vence nos próximos 30 dias.
3. Ficha do cliente: saldo, pendente, próximo vencimento, extrato paginado e o ajuste manual com motivo.
4. O pedido no painel mostra quanto gerou de cashback e em que pé está, e a diferença que o cliente já
   tinha gastado quando o crédito foi desfeito.
5. Bloco com história e teste com axe; textos em pt-BR e en; `pnpm ci-check` verde.

## O que entra

- **packages/ui:** blocos em `blocks/cashback/` (formulário das regras, o que a loja deve, o crédito do
  cliente, o ajuste, o cashback do pedido, falha e esqueleto); tipos em `lib/cashback.ts`, porque o
  pacote só exporta `.tsx` em `blocks/`; seção `cashback` dos dicionários. `orders/order-detail` desenha
  o cartão de cashback quando o pedido gera algum.
- **apps/web:** rota `/admin/[slug]/cashback`, item "Cashback" no menu (depois de Cupons), três rotas BFF,
  serviços com TanStack Query, `lib/cashback-form.ts` (o que foi digitado ↔ o que a API recebe), e a
  seção de cashback na ficha do cliente, na coluna lateral, abaixo dos dados.

## Decisões deste ticket

1. **O exemplo é calculado na tela, como a API calcula** (arredonda para baixo), sobre R$ 100,00, e
   acompanha cada tecla. Com regras que ainda não fecham, mostra a frase de cashback desligado, nunca uma
   conta errada.
2. **O ajuste é "dar" ou "tirar" mais um valor positivo**, em vez de um campo com sinal: ninguém digita
   um menos num campo de dinheiro. Depois de lançar, o extrato volta à primeira página, onde está a linha
   nova.
3. **Salvar as regras não derruba o cache da vitrine.** A vitrine ainda não mostra cashback; o U6, que
   mostra, decide isso.

## Fora de escopo

- O que a vitrine e o checkout mostram ao cliente (U6, U7).
- Coluna de saldo na lista de clientes.
