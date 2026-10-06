# BEELINK-204 — Q3: a cobrança do pedido, criada na conta Asaas da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), terceiro ticket. Depende do Q1 (BEELINK-202: conexão, cofre, porta
> `AsaasClient`) e do Q2 (BEELINK-203: formas aceitas, `AsaasSettings`). Onde o Plane diz Mercado
> Pago, é **Asaas**, na conta do próprio lojista.
> Área: API (com contrato e banco) · Tipo: novo · Tamanho: G.

## Objetivo

Um pedido passa a dizer por onde é pago. `OFFLINE` é o de hoje: um rótulo, e o acerto é entre loja e
cliente. `ONLINE` é cobrado na conta Asaas da loja, por Pix ou cartão de crédito, e cada tentativa
de cobrança é uma linha de `order_payments`. O cliente gera, lê e renova a cobrança pelo pedido.

Este ticket é só API. Nada aqui marca um pagamento como pago além do que o próprio Asaas responde
quando é consultado: o webhook, a reconciliação e o cancelamento automático são do Q5; o BFF e as
telas, do Q4.

## Definição de Pronto

1. **Contrato.** `packages/contracts/src/payment.ts` tem o canal (`OrderPaymentChannel`), o status
   (`OrderPaymentStatus`, os oito da decisão 7), o pagamento como os dois lados o leem
   (`OrderPayment`), o que a loja lê a mais (`ShopOrderPayment`: o status nas palavras do Asaas e o
   último erro) e o que o cliente precisa para pagar (`CustomerOrderPayment`: `pix` com copia e
   cola, imagem e validade; `invoiceUrl` no cartão). `PlaceCustomerOrderPayload` ganha
   `paymentChannel` e `installments`. `Order`, `OrderSummary`, `CustomerOrder` e
   `CustomerOrderSummary` dizem o canal e o pagamento. O texto de `recipientDocument` diz que ele
   serve à transportadora e ao pagamento online.
2. **Banco.** `orders` ganha `paymentChannel` (padrão `OFFLINE`), `paymentInstallments` (padrão 1) e
   `paymentClaimedUntil`. Tabela `order_payments` com o que a decisão 7 lista, mais o id do
   parcelamento, o status como o Asaas o disse e o último erro. Um índice único parcial garante uma
   cobrança viva por pedido. Tabela `asaas_customers` guarda o id do cliente no Asaas. A migration
   só acrescenta.
3. **Colocar o pedido.** `ONLINE` só com `PIX` ou `CREDIT_CARD`, com a conta conectada e a forma
   ligada; parcelas de 1 ao máximo da loja, só no cartão. `OFFLINE` segue conferido contra
   `Store.paymentMethods`, e é recusado quando a loja conectada desligou "pagar na entrega". Sem
   conta conectada, `OFFLINE` vale sempre. Abaixo de R$ 5,00, ou com parcela abaixo de R$ 5,00, o
   pedido `ONLINE` é recusado; os dois números moram num arquivo só. `ONLINE` exige CPF: o do
   cadastro ou o digitado, que fica no cadastro.
4. **A cobrança vem depois do commit.** Com o pedido gravado, a API tenta gerar a cobrança e devolve
   o pedido com ela. Se o Asaas falhar, o pedido volta sem cobrança. Um pedido com frete a combinar
   não tem cobrança até a loja fechar o frete.
5. **Rotas do cliente.** `GET` e `POST /api/stores/:slug/customer/orders/:number/payment`, atrás do
   `CustomerAuthGuard`, com limite por IP no `POST`. O `GET` lê o QR do Pix uma vez e guarda. O
   `POST` garante uma cobrança viva: cria, devolve a mesma, ou apaga a que não serve e cria outra.
   Recusas com código próprio: paga, cancelado, `OFFLINE`, frete a combinar.
6. **Garantias de "garantir a cobrança"**, cada uma com teste:
   a. idempotente: `externalReference` é o id do pedido, e a busca vem antes de criar;
   b. duas chamadas ao mesmo tempo criam uma cobrança só, sem segurar a trava da loja durante HTTP;
   c. um processo que morre entre criar no Asaas e gravar não deixa órfã: a chamada seguinte a adota;
   d. o valor é o `totalCents` do pedido; à vista vai `value`, parcelado vai `installmentCount` e
      `totalValue`;
   e. o Pix vence no dia seguinte e o cartão em 3 dias, no calendário de Brasília;
   f. o cliente no Asaas é procurado por CPF, criado com `notificationDisabled: true` e
      `externalReference`, e o id é guardado; um id que a conta atual recusa não trava a cobrança;
   g. um `401` marca a conexão `NEEDS_RECONNECT` e o cliente recebe um código sem motivo técnico;
   h. uma recusa 4xx fica gravada como último erro, nas palavras do Asaas, e o cliente recebe um
      código estável.
7. **Quem abre a chave.** Só `integrations/asaas/`. As chamadas novas são métodos da porta
   `AsaasClient`; `AsaasCharges` abre a chave e oferece operações por `storeId`. As regras ficam em
   `modules/payments/`.
8. **O resto do pedido.** Cancelar (cliente ou loja) um pedido com cobrança pendente apaga a
   cobrança no Asaas depois do commit; a falha fica registrada e o cancelamento vale. Pedido pago
   não é cancelado (`ORDER_PAID`). Fechar ou mudar o frete com cobrança pendente a apaga; com
   pagamento confirmado, é recusado (`ORDER_PAID`). O painel lê o pagamento no pedido e o canal na
   lista.
9. **Testes.** Unitários: dinheiro, mapa de status, prazos, o serviço com o Asaas falso e o cliente
   HTTP com `fetch` simulado (URL, método, corpo, chave fora dos erros). e2e
   `test/order-payments.e2e-spec.ts` com os casos do prompt. A suíte e2e inteira verde.
10. **Documentação.** Mapa de superfície da API, este plano e a regra nova em `apps/api/AGENTS.md`.
11. **`pnpm ci-check` verde** e `delivery-check` sem bloqueador.

## O que a documentação do Asaas confirmou (relido em 05 e 06/10/2026)

| O quê | Página | O que usamos |
|---|---|---|
| Criar cobrança | `reference/criar-nova-cobranca` | `POST /v3/payments` com `customer`, `billingType` (`PIX`, `CREDIT_CARD`), `value`, `dueDate`, `description`, `externalReference`; parcelado com `installmentCount` e `totalValue`. Resposta: `id`, `status`, `deleted`, `invoiceUrl`, `installment`, `installmentNumber`, `value`, `dueDate`, `billingType`, `externalReference`. Exemplo de 400: `invalid_customer`; de 401: `invalid_access_token` |
| Listar cobranças | `reference/listar-cobrancas` | `GET /v3/payments?externalReference=&limit=100`; envelope `{ hasMore, totalCount, limit, offset, data }`; cada item tem `deleted` |
| Ler uma cobrança | `reference/recuperar-uma-unica-cobranca` | `GET /v3/payments/{id}`; `404` quando não existe |
| Apagar cobrança | `reference/excluir-cobranca` | `DELETE /v3/payments/{id}` responde `{ deleted, id }`; `400` e `404`. Apagar uma parcela não encerra o parcelamento |
| Apagar parcelamento | `reference/remover-parcelamento-1` | `DELETE /v3/installments/{id}` responde `{ deleted, id }`; só com as parcelas aguardando pagamento ou vencidas; não pode ser restaurado |
| QR do Pix | `reference/obter-qr-code-para-pagamentos-via-pix` | `GET /v3/payments/{id}/pixQrCode` responde `encodedImage`, `payload`, `expirationDate` (`"2022-06-24 23:59:59"`, sem fuso: lido como horário de Brasília) |
| Criar cliente | `reference/criar-novo-cliente` | `POST /v3/customers` com `name`, `cpfCnpj`, `email`, `mobilePhone`, `externalReference`, `notificationDisabled`. A página diz que a API aceita clientes duplicados e manda consultar antes |
| Listar clientes | `reference/listar-clientes` | `GET /v3/customers?cpfCnpj=`; itens com `id`, `deleted`, `externalReference` |

Nada disso foi tentado com uma conta de verdade: não há chave de sandbox neste ambiente.

## Desenho

### Fronteiras

```
StoresModule ← IntegrationsModule ← PaymentsModule ← OrdersModule
```

- **`integrations/asaas/`** (abre a chave):
  - `asaas.client.ts`: métodos novos na porta, que fala centavos e dias (`YYYY-MM-DD`):
    `findCustomer`, `createCustomer`, `charges` (por `externalReference`), `charge`, `createCharge`,
    `deleteCharge`, `deleteInstallment`, `pixQrCode`.
  - `asaas-money.ts`: `reaisOf` e `centsOf`, a única conversão.
  - `asaas-limits.ts`: `ASAAS_MINIMUM_CHARGE_CENTS` e `ASAAS_MINIMUM_INSTALLMENT_CENTS`.
  - `asaas-acceptance.ts` (`AsaasAcceptance`): junta a conexão com as formas aceitas, por `storeId`.
    É o que o checkout do Q4 vai ler.
  - `asaas-charges.service.ts` (`AsaasCharges`): abre a chave e oferece `find`, `read`, `create`,
    `remove` e `pixQrCode` por `storeId`. Cuida de `asaas_customers`. Um `401` marca
    `NEEDS_RECONNECT` e vira `AsaasStoreUnavailable`.
- **`modules/payments/`** (as regras, sem chave):
  - `OrderPayments` (`order-payments.service.ts`): `ensure`, `ensureWithin`, `release`, e as duas
    leituras do cliente.
  - `payment-facts.ts`: quem escreve em `order_payments`. `applyCharge` é a porta por onde um fato
    do Asaas entra (hoje, o que a listagem responde; no Q5, o webhook e a reconciliação).
  - `payment-status.ts` (mapa de status), `payment-terms.ts` (prazos, mínimos, "serve"),
    `payment-guards.ts` (`refusePaidOrder(tx, orderId)`, chamada dentro das transações do pedido).
  - `CustomerPaymentsController`.
- `OrdersModule` importa `PaymentsModule`, nunca o contrário: `payments` lê `orders` pelo Prisma.

### Banco

- `orders.paymentChannel` (`OFFLINE` por padrão), `orders.paymentInstallments` (o que o cliente
  escolheu: um pedido com frete a combinar ainda não tem cobrança onde guardar isso) e
  `orders.paymentClaimedUntil` (a posse da conversa com o Asaas, abaixo).
- `order_payments`: `orderId`, `storeId`, `provider`, `providerId` (único), `providerInstallmentId`,
  `method`, `installments`, `amountCents`, `refundedCents`, `status`, `providerStatus`, `lastError`,
  `invoiceUrl`, `pixPayload`, `pixImage`, `dueDate`, `expiresAt`, `paidAt`, `cancelledAt`.
- **Viva** é a linha com `status NOT IN ('CANCELLED', 'FAILED')`. O índice único parcial
  `order_payments_one_live_key` garante uma por pedido.
- `FAILED` tem um sentido só: o Asaas recusou criar a cobrança. A linha existe para a loja ler
  `lastError`, nunca é viva e é a única sem `providerId`.
- `asaas_customers`: `customerId` (chave), `providerId`, `cpf`.

### O pagamento que o pedido mostra

A linha viva, quando há; senão a tentativa mais recente (uma cancelada ou recusada diz à tela "gere
outra"). Nulo num pedido `OFFLINE` e num `ONLINE` sem nenhuma tentativa.

### Mapa de status (Asaas → bee-link)

| Asaas | Vira | Por quê |
|---|---|---|
| `PENDING` | `PENDING` | |
| `AWAITING_RISK_ANALYSIS` | `PENDING` | O cartão está em análise manual: não está pago. A cobrança não é trocada enquanto isso (`providerStatus` diz), para não apagar um pagamento em curso |
| `OVERDUE`, `DUNNING_REQUESTED` | `OVERDUE` | Continua pagável no Asaas até ser apagada: continua viva |
| `CONFIRMED` | `CONFIRMED` | Pago; no cartão, o saldo ainda está preso |
| `RECEIVED`, `DUNNING_RECEIVED` | `RECEIVED` | |
| `RECEIVED_IN_CASH` | `RECEIVED` | A loja declarou no Asaas que recebeu por fora. A cobrança deixa de ser pagável, e o pedido tem de contar como pago para ninguém gerar outra nem o Q5 cancelá-lo |
| `REFUNDED` | `REFUNDED` | |
| `REFUND_REQUESTED`, `REFUND_IN_PROGRESS` | fica como está (numa linha que nasce: `CONFIRMED`) | O dinheiro foi pago e ainda não voltou. Quanto voltou é do Q7, que lê `refunds`; até lá a leitura conservadora é "segura dinheiro" |
| `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE`, `AWAITING_CHARGEBACK_REVERSAL` | fica como está (numa linha que nasce: `CONFIRMED`) | O dinheiro foi pago e a disputa é entre a loja e a bandeira. Se a loja perde, chega `REFUNDED` |
| desconhecido | fica como está (numa linha que nasce: `PENDING`) | A documentação pede que o código não quebre com valor novo |
| `deleted: true` | `CANCELLED`, se não estava paga | |

`PARTIALLY_REFUNDED` não é um status de cobrança do Asaas: quem o grava é o Q7, pelos eventos e por
`refunds`. Uma linha nunca desce: `PENDING < OVERDUE < CONFIRMED < RECEIVED < PARTIALLY_REFUNDED <
REFUNDED`. "Segura dinheiro" (não cancela, não muda de valor) é `CONFIRMED`, `RECEIVED` ou
`PARTIALLY_REFUNDED`. "Já foi paga" (não gera outra) inclui `REFUNDED`.

### Garantir a cobrança (`OrderPayments.ensure`)

1. **Tomar a posse**, numa transação curta sob a trava da linha da loja (a mesma de colocar, mover e
   cancelar um pedido). Relê o pedido e a linha viva e recusa o que não pode: `PAYMENT_NOT_ONLINE`,
   `ORDER_CANCELLED`, `PAYMENT_AWAITING_TOTAL`, `PAYMENT_ALREADY_PAID`, `PAYMENT_BELOW_MINIMUM`,
   `PAYMENT_DOCUMENT_MISSING`, `PAYMENT_UNAVAILABLE` (loja sem conexão boa). Se a linha viva
   **serve** (pendente, dentro da validade, do valor, do método e das parcelas do pedido, criada
   depois da conexão atual) ou está em análise de risco, devolve a mesma, sem HTTP. Se
   `paymentClaimedUntil` está no futuro, responde `PAYMENT_IN_PROGRESS`. Senão grava
   `agora + 120 s` e faz commit. Daqui em diante não há trava nem transação aberta.
2. **Listar** as cobranças do Asaas com `externalReference = <id do pedido>`, agrupando as parcelas
   de um parcelamento. Uma paga vence: é gravada e a resposta é `PAYMENT_ALREADY_PAID`. Uma pendente
   que serve é adotada (a de uma linha local só se a linha ainda vale). As outras abertas são
   apagadas; se o Asaas recusar apagar, a cobrança é relida: paga, vence; ainda aberta, a operação
   para com `PAYMENT_UNAVAILABLE` e nenhuma segunda é criada.
3. **Criar**, se nenhuma serviu: o cliente no Asaas (guardado, senão por CPF, senão criado), a posse
   renovada por comparação (`UPDATE … WHERE "paymentClaimedUntil" = <a minha>`; zero linhas, para
   sem criar) e então `POST /v3/payments`.
4. **Gravar**, numa transação sob a trava da loja, relendo o pedido. Se ele foi cancelado ou mudou
   de total no meio, a cobrança recém-criada é apagada e nada é gravado. Senão as linhas vivas que
   sumiram do Asaas viram `CANCELLED`, a linha da cobrança é inserida ou atualizada e a posse solta.

Fim da conversa:

| Resultado | O que acontece |
|---|---|
| Sucesso | Posse solta |
| `401` | `AsaasCharges` marca `NEEDS_RECONNECT`; posse solta; `503 PAYMENT_UNAVAILABLE` |
| Recusa 4xx ao criar | Linha `FAILED` com `lastError`; posse solta; `502 PAYMENT_REFUSED` |
| Sem resposta antes do `POST` de criação | Posse solta; `503 PAYMENT_UNAVAILABLE` |
| Sem resposta **no** `POST` de criação, ou processo morto | A posse **não** é solta: ninguém cria outra até ela vencer, e a próxima chamada lista antes de criar e adota |

O `place` chama `ensureWithin(…, 8 s)` depois do commit: se o Asaas demorar mais que isso, o pedido
volta sem cobrança e a conversa termina sozinha, sob a posse.

### Intercalamentos

- **Duas chamadas ao mesmo tempo.** As duas tomadas de posse se enfileiram na trava da loja. A
  segunda vê a posse e recebe `409 PAYMENT_IN_PROGRESS`. Um `POST /v3/payments` só.
- **Queda entre criar no Asaas e gravar.** Não há linha local e a posse vence sem ter sido solta. A
  chamada seguinte lista por `externalReference`, acha a cobrança e a adota.
- **Pedido cancelado ou frete mudado durante o HTTP.** O passo 4 relê sob a trava e apaga a cobrança
  que acabou de criar.
- **Apagar a antiga enquanto ela é paga.** O Asaas decide: ou apaga, ou recusa o `DELETE`. Na
  recusa, a cobrança é relida, a linha vira paga e nada novo é criado.
- **Loja trocou de conta Asaas.** A linha viva antiga foi criada antes do `connectedAt` novo, então
  não serve. A listagem na conta nova não a acha: a linha vira `CANCELLED`. O `cus_…` guardado é
  recusado ao criar: em qualquer 400 ou 404 com um id vindo do cache, `AsaasCharges` esquece o id,
  procura por CPF de novo e tenta mais uma vez.

### O que foi aproveitado das três propostas

- **Da proposta 3:** a posse com prazo no pedido, tomada sob a trava da loja (lá
  `paymentBusyUntil`); `FAILED` com um sentido só; o índice único parcial de "viva"; a regra
  monotônica; "esquecer o `cus_…` em qualquer 400 com id do cache", sem depender do código do erro;
  `asaas_customers` fora de `customers`; `paymentInstallments` no pedido; o QR lido no `GET`, fora
  do caminho do checkout.
- **Da proposta 1:** renovar a posse por comparação logo antes do `POST` (lá `claimToken`); não
  soltar a posse quando o `POST` fica sem resposta; reduzir as parcelas quando o total cai; o prazo
  curto no `place`; a análise que descarta segurar `pg_advisory_xact_lock` durante o HTTP.
- **Da proposta 2:** "serve" exige a conta atual (aqui pelo `connectedAt`, sem coluna nova); a
  revalidação do pedido na gravação; listar sempre antes de criar como o único reparo.
- **Deixado de fora, por ser de Q5 a Q7:** a linha de intenção com `claimToken`, `accountKey` e
  `nextCheckAt`; `deletePending` e a fila de apagar; o gancho de soltar a chave antiga
  (`AsaasRelease`/`onRelease`); `AsaasThrottled`; `paymentDueAt`; a caixa de entrada do webhook; os
  alertas; o gate `api/order-payments-in-payments`.

## Decisões deste ticket

1. **Códigos de erro.** Ao colocar: `ORDER_PAYMENT_NOT_ACCEPTED` (canal, forma ou parcelas que a
   loja não aceita agora), `ORDER_PAYMENT_BELOW_MINIMUM` (com `details`: o mínimo e quantas parcelas
   cabem) e `ORDER_PAYER_DOCUMENT_MISSING`. Na rota de pagamento: os `PAYMENT_*` acima. Em cancelar
   e no frete: `ORDER_PAID`.
2. **Frete a combinar e o mínimo.** Um pedido `ONLINE` com frete a combinar não é recusado pelo
   mínimo ao ser colocado: o total ainda vai crescer. A recusa vem ao gerar a cobrança
   (`PAYMENT_BELOW_MINIMUM`).
3. **Parcelas quando o total cai.** Se o frete mudou e a parcela ficou abaixo de R$ 5,00, a cobrança
   sai com menos parcelas (`min(escolhidas, total ÷ R$ 5,00)`), em vez de travar o pedido.
4. **`NEEDS_RECONNECT` conta como não conectada** para o `OFFLINE`: uma loja com a chave revogada
   que desligou "pagar na entrega" continua vendendo como antes do Asaas.
5. **A porta fala centavos.** A conversão para reais acontece dentro de `AsaasHttpClient`, com o
   helper único; o Asaas falso dos testes nunca vê um decimal.
6. **O `POST` devolve o mesmo formato do `GET`**, já com o QR lido: a tela precisa de uma chamada só.
7. **`invoiceUrl` só é guardado se for `https`.** Ele abre no navegador do cliente.
8. **Cancelar lista antes de apagar.** `release` apaga todas as cobranças abertas que o Asaas tem
   para o pedido, não só a da linha local: é o que pega uma órfã de um processo que morreu.
9. **Os três Asaas falsos que já existiam** passam a estender um esqueleto de teste
   (`test/support/asaas-stub.ts`) que implementa os métodos novos da porta: é a única mudança nos
   testes antigos além dos campos novos do contrato.

## Fora de escopo

BFF, checkout, tela de pagamento, leitura pública das formas aceitas e `docs/product` (Q4). Webhook,
reconciliação, cancelamento automático e evento de tempo real (Q5). E-mail e a etapa "pagamento
aprovado" (Q6). Estorno (Q7). Pedido registrado pela loja no painel continua `OFFLINE`.

## Para os próximos tickets

### Q4 (BEELINK-205): checkout e tela de pagamento

- **O que a loja aceita agora:** `AsaasAcceptance.of(storeId)` (`integrations/asaas/asaas-acceptance.ts`,
  exportado pelo `IntegrationsModule`) devolve `connected`, `pix`, `card`, `maxInstallments` e
  `offline`. É a mesma leitura que `CustomerOrdersService.place` usa para recusar: a leitura pública
  da vitrine deve sair dela, para o checkout nunca oferecer o que o `place` recusa. Ela ainda não tem
  rota.
- **Os mínimos:** `installmentsRoomOf(totalCents)` e `belowMinimumOf` (`payments/payment-terms.ts`)
  dizem quantas parcelas um total comporta. Os dois números estão em
  `integrations/asaas/asaas-limits.ts`. O contrato só leva tipos: o web precisa repetir o R$ 5,00
  ou recebê-lo da leitura pública (melhor).
- **Colocar o pedido:** `paymentChannel: "ONLINE"`, `paymentMethod` `PIX` ou `CREDIT_CARD`,
  `installments` e, sem CPF no cadastro, `recipientDocument`. As recusas novas:
  `ORDER_PAYMENT_NOT_ACCEPTED`, `ORDER_PAYMENT_BELOW_MINIMUM` (com `details`) e
  `ORDER_PAYER_DOCUMENT_MISSING`. As frases dos três códigos novos de pedido já estão em
  `apps/web/src/locales/` (o tipo do dicionário exige); revise-as com a tela na frente.
- **A resposta do `place`** traz `payment` sem o QR. A tela chama `GET …/orders/:number/payment`
  para o copia e cola e a imagem. `payment: null` num pedido `ONLINE` quer dizer "ainda não tem
  cobrança": a tela oferece gerar, com `POST …/payment`.
- **O `POST …/payment`** responde `409 PAYMENT_IN_PROGRESS` quando outra chamada está criando a
  cobrança (inclusive a do próprio `place`, se o Asaas demorou mais de 8 s): a tela relê em alguns
  segundos. Depois de um `POST` ao Asaas que ficou sem resposta, isso dura até 45 s.
- **`pix: null` com `status: "PENDING"`** quer dizer que o Asaas não entregou o QR: releia. Com a
  validade vencida (`expiresAt` no passado), ofereça "gerar novo Pix".
- **`OrderPayment.expiresAt`** é até quando a cobrança é oferecida aqui. No Pix de uma conta sem
  chave Pix cadastrada, o QR vale só até 23h59 do mesmo dia, e `expiresAt` encolhe para isso quando
  o QR é lido.
- **Os códigos `PAYMENT_*`** estão em `OrderPaymentErrorCode` e ainda não têm frase no web.
- **`docs/product`** não mudou neste ticket (decisão 16 do briefing): muda no Q4.

### Q5 (BEELINK-206): webhook, reconciliação e cancelamento automático

- **A porta de um fato do Asaas é `applyCharge(tx, order, plan, now)`** (`payments/payment-facts.ts`).
  Ela recebe a cobrança como o Asaas a descreve (`ChargePlan`; `plansOf` junta as parcelas de um
  parcelamento) e grava na linha que tem aquele `providerId`, ou cria a linha se o bee-link nunca
  ouviu falar da cobrança. O status só anda para a frente (`statusAfter`, em `payment-status.ts`).
  Ela roda numa transação que segura a linha da loja e não fala com o Asaas. O webhook e a
  reconciliação devem entrar por ela; hoje quem a chama é `OrderPayments` (ao listar o Asaas).
- **Um evento de parcela** traz `payment.installment`: a linha guarda o id do parcelamento em
  `providerInstallmentId` e o da primeira parcela em `providerId`. O Q5 precisa casar pelo
  parcelamento quando o evento for de outra parcela (hoje `applyCharge` casa só por `providerId`).
- **`PARTIALLY_REFUNDED` e `refundedCents`** não são escritos por ninguém ainda: são do Q7, pelos
  eventos e por `refunds`.
- **Uma conversa com o Asaas sobre um pedido é `OrderPayments.ensure`** (criar) e
  **`OrderPayments.release`** (apagar o que o pedido não quer mais). O cancelamento automático deve
  conferir no Asaas e chamar `release` depois de cancelar, como `CustomerOrdersService.cancel` faz.
  Uma rotina de recuperação pode procurar pedidos `ONLINE` com `paymentClaimedUntil` vencido e não
  nulo: é a marca de uma conversa que terminou sem resultado conhecido.
- **O que o Q3 deixa sem dono até o Q5:**
  - `release` que falha (Asaas fora do ar no cancelamento) deixa a cobrança pagável, com o motivo em
    `lastError` e a linha ainda `PENDING` num pedido cancelado. Ninguém tenta de novo.
  - Uma cobrança paga achada num pedido cancelado é gravada como paga e logada como erro
    (`A paid charge stands on an order that was cancelled or changed`). Avisar a loja é do Q5.
  - Trocar de conta Asaas ou desconectar não apaga as cobranças pendentes da conta antiga: com a
    chave nova elas não são alcançadas (a linha vira `CANCELLED` na próxima conversa, mas o QR antigo
    continua pagável lá). O gancho "antes de a chave sair", das propostas 1 e 2, resolve.
  - `OVERDUE` só é gravado quando o pedido volta a conversar com o Asaas.
- **Chave sem uso:** a documentação (`docs/chaves-de-api`, achado do Q2) diz que o Asaas desabilita
  uma chave sem uso por 3 meses e a expira em 6, e avisa pelos eventos `ACCESS_TOKEN_DISABLED`,
  `ACCESS_TOKEN_DELETED` e `ACCESS_TOKEN_EXPIRED`. O Q5 decide se o webhook passa a assiná-los; hoje
  quem descobre uma chave morta é o primeiro `401` (`AsaasCharges` marca `NEEDS_RECONNECT`).
- **Limite de requisições:** um `429` hoje é um `AsaasUnreachable` como outro qualquer. A
  reconciliação vai precisar ler `RateLimit-Reset`.
- **Um gate** `api/order-payments-in-payments` (ninguém escreve `orderPayment.*` fora de
  `modules/payments`) vale a pena quando o Q5 trouxer mais escritores; hoje a regra 10 de
  `apps/api/AGENTS.md` é só prosa.

### Q6 e Q7

- **Q6:** o painel já recebe `Order.payment` (`ShopOrderPayment`, com `providerStatus` e `lastError`)
  e `OrderSummary.payment` (`status` e `expiresAt`). O filtro de pagos e pendentes tem o índice
  `order_payments(storeId, status)`.
- **Q7:** `refusePaidOrder(tx, orderId)` (`payments/payment-guards.ts`) é o que hoje recusa cancelar
  e mudar o frete de um pedido pago (`ORDER_PAID`). O cancelamento com estorno passa por ela. Apagar
  um parcelamento é `DELETE /v3/installments/{id}`, que não pode ser restaurado.

## Acréscimos de 06/10/2026: o que mudou enquanto foi feito

- **O `FAILED` também é gravado quando o Asaas recusa a listagem ou a leitura** (um 4xx que não é
  401), não só a criação: a regra é "o Asaas disse não a esta tentativa". Recusar **apagar** uma
  cobrança que continua de pé não vira `FAILED`: o motivo vai para o `lastError` da linha viva.
- **`release` não apaga uma cobrança pendente do valor certo.** A loja que repete o mesmo frete não
  derruba o Pix que o cliente está pagando.
- **`release` não chama o Asaas para um pedido que nunca conversou com ele** (sem linha em
  `order_payments` e sem `paymentClaimedUntil`): fechar o frete de um pedido `ONLINE` pela primeira
  vez não custa requisição.
- **O cliente vai para o Asaas só com nome, CPF e `externalReference`.** E-mail e telefone não são
  enviados: o Asaas não precisa deles com as notificações desligadas.
- **Os testes unitários do serviço.** `AsaasCharges` tem os seus, com o Asaas falso e um Prisma em
  memória (a chave, o cliente, o `401`). As garantias de `OrderPayments.ensure` (idempotência, duas
  chamadas ao mesmo tempo, o processo que morre, o pedido que muda no meio) são provadas no e2e,
  contra o Postgres de verdade: elas dependem da trava de linha e do índice único, e um banco falso
  provaria só o falso. As regras puras de que ela depende (`payment-status`, `payment-terms`,
  `charge-plan`) têm testes unitários.
- **Os três Asaas falsos antigos** estendem `AsaasWithoutCharges` (`test/support/asaas-stub.ts`). O
  Asaas falso das cobranças é `test/support/fake-asaas.ts`, usado pelo e2e e pelo spec de
  `AsaasCharges`.
- **`apps/web` mudou em seis arquivos**, sem tela: quatro fixtures de teste ganharam os campos novos
  do contrato, e os dois dicionários ganharam a frase dos três códigos novos de `OrderErrorCode`,
  que o tipo `Record<…ErrorCode, string>` exige.
- **As rotas existem no sandbox.** Sem chave válida, `GET /v3/payments?externalReference=`,
  `GET /v3/customers?cpfCnpj=`, `GET /v3/payments/{id}/pixQrCode` e `/v3/installments/{id}`
  respondem `401`, e um caminho inventado responde `404` (conferido com `curl` em 06/10). É tudo o
  que dá para conferir sem chave: nenhum corpo de resposta foi visto de verdade.
