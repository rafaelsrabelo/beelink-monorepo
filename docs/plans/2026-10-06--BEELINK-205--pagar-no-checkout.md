# BEELINK-205 — Q4: o cliente paga com Pix ou cartão no checkout

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), quarto ticket. Depende do Q3 (BEELINK-204: o canal do pedido, a cobrança e as
> rotas `…/orders/:number/payment`). Onde o Plane diz Mercado Pago, é **Asaas**, na conta do lojista.
> Área: full-stack (contrato, API, web, design system, produto) · Tipo: novo · Tamanho: G.

## Objetivo

O cliente paga sem sair do fluxo da loja. O checkout oferece Pix e cartão de crédito quando a loja os
aceita; fechado o pedido, o cliente cai na tela de pagamento (o QR e o copia e cola do Pix, ou o
botão que abre a fatura do Asaas); o pedido e o Meus pedidos dizem onde o pagamento está e levam de
volta à tela enquanto houver o que pagar.

Nada aqui marca um pedido como pago: a tela lê o que o bee-link sabe, e quem escreve "pago" é o
webhook e a reconciliação do Q5.

## Definição de Pronto

1. **Contrato.** `packages/contracts/src/payment.ts` tem `StorefrontPaymentOptions`: o que a loja
   aceita online agora (Pix, cartão, máximo de parcelas, os dois mínimos do Asaas) e se "pagar na
   entrega ou na retirada" continua. Nada da conta Asaas vai nele.
2. **API: leitura pública.** `GET /api/stores/:slug/payment-options`, anônima, sai de
   `AsaasAcceptance` (a mesma leitura que o `place` usa para recusar). Sem conta `CONNECTED`
   (desconectada ou `NEEDS_RECONNECT`), responde `online: null` e `offline: true`. Unitário e e2e.
3. **API: pedido de total zero.** Um pedido `OFFLINE` de total zero e fechado é aceito mesmo na loja
   que desligou "pagar na entrega". Com teste.
4. **Cache.** Os handlers do BFF de conectar, desconectar e salvar formas do Asaas chamam
   `revalidateStore` num 2xx. Com teste.
5. **Checkout.** Oferece Pix e cartão online ao lado das formas de hoje, ou no lugar delas. No
   cartão, as parcelas de 1 ao máximo da loja, limitadas pelo total (R$ 5,00 por parcela), com o
   valor de cada uma, sem juros. Pede o CPF quando o cadastro não tem. Total fechado abaixo de
   R$ 5,00: online desligado, com a frase. Frete a combinar: online pode ser escolhido, com o aviso
   de que se paga depois de a loja fechar o frete. Total zero: nada é perguntado.
6. **Tela de pagamento**, em `/<loja>/conta/pedidos/<n>?pagamento=1`: Pix (QR, copia e cola com
   copiar, valor, validade, "gerar novo Pix" vencido); cartão (valor, parcelas, botão para o
   `invoiceUrl` em nova aba com `rel="noopener noreferrer"`, e a frase de que a confirmação aparece
   ali); sem cobrança (o porquê e "gerar pagamento" quando cabe); cada recusa do `POST` com a sua
   frase; aprovado ("pagamento aprovado" e leva ao pedido). Carregando é skeleton.
7. **A tela consulta o bee-link.** Relê em intervalo enquanto pendente e visível, para quando a aba
   some e quando sai de pendente, e relê ao voltar o foco. O ponto de encaixe do evento do Q5 existe.
8. **Pedido e Meus pedidos** dizem aguardando, aprovado, vencido ou cancelado, e levam à tela
   enquanto houver o que pagar. Pedido pago não mostra "cancelar", e `ORDER_PAID` tem frase.
9. **BFF.** `GET` e `POST` em `apps/web/src/app/[slug]/api/orders/[number]/payment/`, com a sessão
   do cliente, a checagem de origem e o IP repassado. Com teste.
10. **Produto.** `docs/product/README.md` diz que o bee-link não recebe nem guarda dinheiro, e que o
    pagamento online acontece na conta Asaas do lojista.
11. **Testes e documentação.** Blocos novos com story e teste em cada estado; testes das telas, dos
    helpers e dos handlers; mapas de superfície da API, do web e do `ui`; este plano.
12. **`pnpm ci-check` verde**, a suíte e2e da API inteira verde, `delivery-check` sem bloqueador.

## Desenho

### A leitura pública

`StorefrontPaymentOptions` é uma rota própria, e não um campo de `PublicStore`: `StoresModule` não
pode importar `IntegrationsModule` (que já o importa), e a leitura tem de sair de `AsaasAcceptance`
para o checkout nunca oferecer o que o `place` recusa. Fica em `modules/payments/`
(`PublicPaymentsController`), ao lado das regras, e leva os dois mínimos do Asaas
(`asaas-limits.ts`): o web não repete o R$ 5,00.

```ts
interface StorefrontPaymentOptions {
  online: { pix: boolean; card: boolean; maxInstallments: number; minimumChargeCents: number; minimumInstallmentCents: number } | null
  offline: boolean
}
```

`online` é nulo quando a conta não está `CONNECTED`, quando o deploy não abre a chave, e quando a
loja conectada desligou o Pix e o cartão. `offline` é sempre verdadeiro com `online` nulo: é a
vitrine de hoje.

No web, `paymentOptionsAt(slug)` (`lib/storefront-data.ts`) lê pela via pública, sob `store:<slug>`,
só na página do carrinho. Se a leitura falhar, vale a vitrine de hoje. Uma conta que virou
`NEEDS_RECONNECT` por um `401` (sem escrita do painel) fica oferecida até a janela de um minuto
fechar: o `place` recusa com `ORDER_PAYMENT_NOT_ACCEPTED`, que já relê a página.

### O checkout

- `StorefrontCheckoutChoice` ganha `paymentChannel` (`OFFLINE` | `ONLINE`) e `installments`.
- Bloco novo `StorefrontCheckoutPayment` (o `storefront-checkout-choices.tsx` já estava no limite de
  250 linhas): "Pagar agora" com Pix e cartão, as parcelas num `select` nativo, o CPF, os avisos; e
  "Pagar na entrega ou na retirada" com as formas de hoje.
- `lib/checkout-payment.ts` é a regra pura: de `StorefrontPaymentOptions`, do total e de "o frete
  está fechado?" sai o que o bloco desenha (formas, parcelas com o valor, por que está desligado).
- `useCartCheckout` junta: o CPF é pedido para transportadora **ou** para pagar online, num campo só.
- Fechado um pedido `ONLINE`, o carrinho esvazia e o navegador vai para a tela de pagamento. O
  WhatsApp não abre: o cliente tem o que fazer aqui, e a loja recebe o pedido no painel como sempre.

### A tela de pagamento

O mesmo endereço do pedido com `?pagamento=1`, como o comprovante (`?comprovante=1`): nenhuma
palavra de rota nova, nenhum arquivo de rota novo. A página (servidor) lê o pedido; um pedido
`OFFLINE` volta para o pedido. O miolo é `OrderPaymentLive` (cliente), que lê
`GET /<loja>/api/orders/<n>/payment` com TanStack Query.

- `lib/order-payment-view.ts`: do pagamento lido e do pedido sai um estado só (`paymentScreenOf`):
  `pix`, `pixWaiting` (o Asaas ainda não entregou o código), `pixExpired`, `card`, `cardExpired`,
  `none` (sem cobrança, ou a última cancelada ou recusada), `awaitingTotal` (frete a combinar),
  `paid`, `refunded`, `orderCancelled`.
- Blocos em `packages/ui`: `StorefrontPaymentPix`, `StorefrontPaymentCard`, `StorefrontPaymentNotice`
  (os estados sem cobrança a pagar) e `StorefrontPaymentSkeleton`, dentro de `StorefrontPaymentPanel`.
- Releitura: `refetchInterval` de 5 s enquanto o estado espera dinheiro (`pix`, `card`), 15 s em
  `pixWaiting` (cada leitura sem código pergunta ao Asaas de novo), nada nos outros;
  `refetchIntervalInBackground: false` para com a aba escondida; `refetchOnWindowFocus` relê na
  volta. `PAYMENT_IN_PROGRESS` relê em 4 s.
- **Ponto de encaixe do Q5:** `shopperReadOf` (`services/realtime/realtime-invalidation.ts`) já
  devolve a chave do pagamento do pedido em `order.status`. O evento novo do Q5 é mais um `case` ali
  que devolve `orderPaymentKeys.order(slug, number)` e `page: true`; o intervalo fica como rede.

### O pedido e o Meus pedidos

- `lib/order-payment-label.ts`: do canal, do pagamento e do status do pedido sai o rótulo e se ainda
  há o que pagar. Usado pelo cartão da lista (`OrderPaymentBrief`) e pela página do pedido.
- A página do pedido é desenhada no servidor. Enquanto houver o que pagar, `OrderPaymentWatch`
  (cliente, sem desenho) relê o pagamento no mesmo intervalo e chama `router.refresh()` quando o
  status muda: é o "atualiza quando aprova" até o evento do Q5.
- "Cancelar pedido" some quando o pagamento segura dinheiro (`CONFIRMED`, `RECEIVED`,
  `PARTIALLY_REFUNDED`).

## Decisões deste ticket

1. **Pedido de total zero** (coberto por cupom ou cashback): não há o que cobrar. O checkout não
   pergunta a forma de pagamento, diz "nada a pagar" e manda `OFFLINE` com a primeira forma da loja.
   A API aceita `OFFLINE` de total zero e fechado mesmo com "pagar na entrega" desligado; qualquer
   outro `OFFLINE` nessa loja segue recusado. É a sugestão do plano do Q3, e a menor: sem status
   novo, sem pedido `ONLINE` sem cobrança.
2. **Total fechado entre R$ 0,01 e R$ 4,99 numa loja que só recebe online:** o pedido não pode ser
   fechado, e o checkout diz por quê. Não há forma honesta de cobrar isso.
3. **Frete a combinar:** com o total aberto o checkout não mostra o valor da parcela (só "3x sem
   juros"), e o mínimo não desliga o online: a API também não recusa (decisão 2 do Q3).
4. **O valor da parcela mostrado é o total dividido, arredondado para baixo.** O Asaas põe a
   diferença do arredondamento na última.
5. **O WhatsApp não abre num pedido `ONLINE`.**
6. **A tela de pagamento é o pedido com `?pagamento=1`,** sem indexação, atrás do login do cliente.
7. **As frases** dos blocos e das recusas ficam em `packages/ui/src/locales/` (`storefront`), como
   as do checkout de hoje.
8. **`PAYMENT_DOCUMENT_MISSING` na tela de pagamento** manda o cliente ao cadastro: o `POST` de
   pagamento não recebe CPF. Só acontece se o CPF sair do cadastro depois do pedido.

## Fora de escopo

Webhook, reconciliação, cancelamento automático e o evento de tempo real (Q5). A etapa "Pagamento
aprovado" nas etapas do pedido, o painel, o sino e o e-mail (Q6). Estorno (Q7). Pedido registrado
pela loja no painel.
