# BEELINK-243 — U6: o cliente vê quanto ganha de cashback

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). Usa o cálculo do ganho do U2 (`cashback-earning.ts`).

## Definição de Pronto

1. A página do produto, o carrinho e o checkout dizem quanto o cliente ganha de cashback, com a regra da
   loja calculada pela API.
2. Com o cashback desligado, nada aparece. Abaixo do pedido mínimo, a loja diz quanto falta.
3. O comprovante, Meus pedidos e a página do pedido mostram o crédito pendente e, depois, o disponível.
4. A faixa do modo design para anunciar o cashback.
5. Testes e `pnpm ci-check` verde.

## O que entra

- **API:** a vitrine (`PublicStore.cashback`) recebe o percentual e o mínimo enquanto o cashback está
  ligado; todo orçamento do carrinho (`OrderQuote.cashback`) diz quanto o pedido ganharia, calculado
  como o pedido é gravado, ou quanto falta para o mínimo.
- **Web:** a caixa de compra do produto, o resumo do carrinho (que também é o checkout), o comprovante,
  o cartão de Meus pedidos e a página do pedido. Salvar as regras no painel derruba o cache da vitrine.

## Decisões deste ticket

1. **Na página do produto, a conta é feita na tela com a regra que a API manda**, com o mesmo
   arredondamento para baixo: o preço muda com a variação escolhida, e perguntar à API a cada troca não
   acrescenta nada. Abaixo do mínimo, a caixa diz a partir de qual valor o pedido ganha. No carrinho e
   no checkout, o valor é o da API, exato.
2. **A faixa do modo design é a barra de aviso que já existe.** Foi o que o Rafael escolheu para as
   promoções (O4): o lojista escreve "Ganhe 5% de cashback" na barra de aviso. Uma faixa ligada ao
   cashback, que muda sozinha com a regra, fica para o BEELINK-255, a faixa ligada às promoções.
3. **O pedido abaixo do mínimo não mostra linha de cashback** nos pedidos do cliente: ele não gerou
   crédito.
4. **Crédito vencido aparece como vencido** mesmo antes da varredura do U4.

## Fora de escopo

- Usar o saldo no checkout e o extrato em Minha conta (U7).
