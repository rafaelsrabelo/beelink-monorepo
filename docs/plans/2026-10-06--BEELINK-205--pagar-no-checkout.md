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

## Acréscimos de 06/10/2026: o que mudou enquanto foi feito

- **Nenhuma chamada nova ao Asaas.** Este ticket não acrescenta método à porta `AsaasClient`: a
  leitura pública sai do banco (`AsaasAcceptance`), e a tela usa as duas rotas do Q3. Não houve
  página da documentação do Asaas a conferir de novo além das do briefing.
- **A regra do checkout ficou em três funções puras** (`lib/checkout-payment.ts`):
  `checkoutPaymentOf` (o que se oferece), `heldPaymentOf` (a escolha presa ao que se oferece agora)
  e `paymentPayloadOf` (como vai no pedido). `useCheckoutChoice` deixou de validar o pagamento: o
  que a loja aceita depende do total, e o total é precificado a partir da escolha.
- **Um pedido `OFFLINE` segue no fio como sempre**, sem `paymentChannel`: ausente é `OFFLINE`. Só o
  `ONLINE` manda o canal, e as parcelas só quando são mais de uma.
- **O envio do pedido saiu de `storefront-cart-live.tsx`** para `use-cart-order.ts` (a tela passaria
  de 250 linhas): a aba do WhatsApp, o pedido e o caminho para a tela de pagamento.
- **`StorefrontOrderSent` ganhou `payHref`:** entre o pedido existir e a navegação chegar, a tela diz
  "Falta pagar" com a porta "Pagar agora". É a rede se a navegação não acontecer.
- **A recusa de `OFFLINE` na loja que só recebe online passou para dentro da transação do pedido**
  (`order-placement.ts`, `onlyIfNothingToPay`): só depois de precificar se sabe que o total é zero.
  O código é o mesmo (`ORDER_PAYMENT_NOT_ACCEPTED`); muda a ordem em relação às recusas de estoque
  e de cupom, que agora vêm antes.
- **O CPF é um campo só para os dois motivos.** Com transportadora, ele aparece na entrega (como
  no N6) e serve também ao pagamento; sem ela, aparece no pagamento quando a forma é online.
- **A tela só desenha o que leu depois de abrir** (`isFetchedAfterMount`): a resposta guardada de
  uma visita anterior pode ser a de um QR já pago. Até a primeira leitura, skeleton.
- **Uma recusa do `POST` some quando a tela passa a ter uma cobrança a pagar** (ou um estado sem
  cobrança a gerar): achado no navegador, com a frase de uma tentativa antiga sobre um Pix novo.
- **`orderActionOf(status, payment)`** recebe o pagamento: "cancelar" some quando ele segura
  dinheiro. `orderCancelRefusalOf` tem a frase de `ORDER_PAID`, para o pedido pago entre a página
  ser desenhada e o clique.
- **A página do pedido relê na metade da frequência da tela de pagamento** (10 s), e só enquanto o
  rótulo é de espera.
- **Os testes que seguram o relógio usam `shouldAdvanceTime`:** com o relógio totalmente parado, o
  TanStack Query busca de novo e não avisa o observador. Vale para os próximos testes de intervalo.

## Acréscimos de 06/10/2026: o que o navegador mostrou

API na 3501 e web na 3500, loja `loja-q4` e cliente criados pelo fluxo normal (pela API, com a
confirmação lida no Mailpit). A conexão `CONNECTED`, as formas (até 6x) e as cobranças foram gravadas
à mão no banco `harness_asaas`. Capturas em `.claude/worktrees/pagamentos-pr/shots-205/`.

| O quê | Resultado |
|---|---|
| Checkout com "Pagar agora" (Pix e cartão) ao lado das formas da loja, 1280 e 390 px | como desenhado, sem rolagem lateral |
| Cartão: 1x a 6x de R$ 120,00, cada parcela com o valor | `1x de R$ 120,00 (à vista)` … `6x de R$ 20,00 sem juros` |
| CPF pedido ao escolher online (cadastro sem CPF); incompleto não envia | "Para pagar online, informe um CPF válido, com 11 dígitos." |
| Fechar pedido `ONLINE` de verdade | pedido 1 criado, nenhuma aba de WhatsApp, navegador em `…/pedidos/1?pagamento=1`, tela "O pagamento ainda não foi gerado" |
| "Gerar pagamento" com a chave gravada à mão | a API responde `500` (o cofre não abre um valor que não selou) e a tela diz "Não foi possível gerar o pagamento agora. Tente de novo." |
| Pix pendente com QR de mentira | QR, copia e cola, "Copiar código" copia (lido da área de transferência), "Vale até", 2 leituras em 11 s; relê ao voltar o foco sem recarregar |
| Status mudado para `RECEIVED` com a tela aberta | "Pagamento aprovado" em até 5 s, e 4 s depois o navegador está no pedido, que diz "Pagamento aprovado" e não tem "Cancelar pedido" |
| Página do pedido aberta e status mudado para `CONFIRMED` | virou "Pagamento aprovado" sozinha em 9 s (intervalo de 10 s) |
| Pix vencido | "Este Pix venceu" com "Gerar novo Pix"; nenhuma leitura em 7 s; Meus pedidos diz "Pagamento vencido" com "Pagar agora" |
| Cartão pendente em 3x | valor, "3x de R$ 40,00 sem juros", link com `target="_blank"` e `rel="noopener noreferrer"`; o pedido diz "Pagamento online: Cartão de crédito em 3x" |
| Frete a combinar | checkout avisa "Você paga depois que a loja informar o frete"; pedido 2 criado; tela "Aguardando a loja informar o frete", sem botão; o pedido diz "Pagamento liberado quando a loja informar o frete" |
| Total fechado de R$ 3,00 | Pix e cartão desligados, "O pagamento online vale para pedidos a partir de R$ 5,00." |
| Cancelar um pedido pago por baixo do diálogo aberto | `409 ORDER_PAID`, "Este pedido já foi pago, e por isso não pode ser cancelado por aqui. Fale com a loja." |
| `?pagamento=1` num pedido `OFFLINE` | volta para o pedido, que diz "Pagamento combinado com a loja" |
| `?pagamento=1` num pedido cancelado | "Este pedido foi cancelado" |

**O que não deu para exercitar:**

- **Nada com o Asaas de verdade:** não há chave de sandbox. Nenhuma cobrança foi criada, nenhum QR
  real foi lido, a fatura hospedada não foi aberta, e "Gerar novo Pix" não chegou a criar um Pix: o
  caminho feliz do `POST` está nos testes (com o handler simulado) e no e2e do Q3 (com o Asaas falso).
- **As recusas `PAYMENT_*` vindas da API de verdade:** com a chave gravada à mão a API responde `500`
  antes de qualquer uma. Cada frase está nos testes de `OrderPaymentLive` e de
  `order-payment-refusal`.
- **A loja que só recebe online e o pedido de total zero, no navegador:** a troca de `offline` pelo
  banco não derruba o cache da vitrine, e a troca pelo painel exige conectar de verdade. Os dois
  estão nos testes da tela do carrinho e no e2e da API.
- **O painel derrubando o cache ao conectar, desconectar e salvar:** o painel não conecta sem chave.
  Está nos testes dos dois handlers.
- **O evento de tempo real:** não existe até o Q5.
- **O `500` da chave gravada à mão não é um caminho de produção:** uma linha de `store_integrations`
  só nasce selada pelo cofre.

## Para os próximos tickets

### Q5 (BEELINK-206)

- **O evento de pagamento encaixa em `shopperReadOf`** (`apps/web/src/services/realtime/realtime-invalidation.ts`):
  um `case` novo que devolve `orderPaymentKeys.shop(slug)` e `page: true`. A tela de pagamento e a
  página do pedido seguem sozinhas: a primeira relê a consulta, a segunda é redesenhada. O intervalo
  (`PAYMENT_POLL_MS`) pode ficar mais lento depois disso, como rede.
- **`NEEDS_RECONNECT` por um `401` não derruba o cache da vitrine:** por até um minuto o checkout
  oferece online e o `place` recusa com `ORDER_PAYMENT_NOT_ACCEPTED`. Se o webhook passar a marcar a
  conexão, o mesmo vale. Um `revalidate` disparado pela API (não existe esse caminho hoje) fecharia.
- **O cancelamento automático em 3 dias** deve aparecer na tela como hoje aparece um pedido
  cancelado: nada a fazer no web.
- **O QR não tem margem branca própria** na tela: o PNG do Asaas, pela documentação, já vem com ela.
  Conferir com um QR de verdade, lendo com o app de um banco, no escuro da paleta de uma loja.

### Q6 (BEELINK-207)

- **A etapa "Pagamento aprovado"** entra em `lib/order-steps.ts`; o rótulo que este ticket põe na
  caixa de pagamento e no cartão vem de `lib/order-payment-label.ts`, e as duas coisas devem dizer
  a mesma palavra.
- **O comprovante** (`?comprovante=1`) de um pedido online diz só "Pagamento online: Pix": não diz se
  foi pago.

### Q7 (BEELINK-208)

- **"Pagamento estornado" e "estornado em parte"** já têm rótulo e tela (`refunded`), sem valores.
- **Cancelar um pedido pago** hoje não é oferecido ao cliente (`orderActionOf`) e a recusa tem frase.
