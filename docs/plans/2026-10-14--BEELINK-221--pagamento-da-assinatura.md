# BEELINK-221 (S3) — API: saber do pagamento, e as situações da assinatura

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Quarto ticket de código. A branch nasce da do
> S10 (`feat/BEELINK-292-assinatura-no-asaas`, `fb407959`), que ainda está no PR #270; o PR deste
> ticket tem `main` como base e só fica legível depois que o #270 entrar. Toca `packages/contracts`,
> `apps/api` e, em `apps/web`, uma rota que só repassa o webhook. **Nenhuma tela, nenhum e-mail, e
> nada trava aqui** (a trava e a carência são do S5). As decisões do épico não são reabertas; as que
> estão abaixo são do desenvolvedor. Leituras de base: `2026-10-13--BEELINK-219--assinatura-por-pagina.md`
> (o modelo e as datas), `2026-10-13--BEELINK-291--cliente-asaas-da-plataforma.md` (o cliente HTTP),
> `2026-10-13--BEELINK-292--assinatura-no-asaas.md` (a escolha do ciclo, "O que o S3 precisa saber") e
> `2026-10-13--BEELINK-289--como-o-lojista-paga.md` (o que o sandbox respondeu no S8). Escrito em
> 14/10/2026, antes do código.

## O problema

Depois do S10, o lojista escolhe o ciclo de uma página e recebe a fatura da primeira cobrança no
Asaas. Ninguém fica sabendo quando ele paga: a linha da página continua `TRIALING` (ou com o teste
vencido) para sempre, e o Asaas, que não trava ninguém, também não diz nada sozinho. Falta:

1. **Uma porta só para os fatos do Asaas** sobre a assinatura de uma página, que leia o que o Asaas
   tem e escreva a situação, o fim do período pago, a forma de pagamento, o cartão (bandeira e 4
   dígitos) e a fatura em aberto. É este ticket que faz a página virar `ACTIVE`.
2. **Motivos para ir olhar:** o webhook da conta da plataforma (com o cadastro dele feito pela API), uma
   rotina para o evento que se perder, uma rota que a tela chama para saber agora, e a escolha do ciclo
   do S10, que hoje vê um pagamento e não faz nada com ele.

O que não pode acontecer, em ordem de gravidade:

1. **Uma página marcada paga sem que o Asaas tenha o dinheiro.** O corpo de um evento nunca é aplicado.
2. **Uma página que pagou ficar sem o período que pagou** (um evento fora de ordem, uma leitura velha
   escrita depois de uma nova, uma troca de ciclo atropelada).
3. **Um teste encurtado** por algo que não é um pagamento desfeito.
4. **Chamadas demais à conta da plataforma**, cuja cota é uma só para todos os lojistas.

## Definição de Pronto

1. No sandbox, uma página em teste passa a `ACTIVE` quando o Asaas confirma o primeiro pagamento, com
   o fim do período certo; nos três ciclos (dois deles podem ser com o Asaas falso).
2. Um evento repetido não muda nada além da primeira vez; um fora de ordem não leva a situação para
   trás.
3. Requisição ao webhook sem o token certo recebe `401` e nada é gravado; com o token, um evento de
   cobrança que não é de uma página nossa é respondido `200` e ignorado.
4. Período vencido sem pagamento vira `PAST_DUE`, e o pagamento posterior volta para `ACTIVE`.
5. Devolução e remoção viram `CANCELED`, com o acesso até o fim do período pago quando há um.
6. Uma troca de ciclo em curso não é atropelada: um pagamento de uma assinatura que a linha já não
   nomeia não é aplicado.
7. A rotina acha um pagamento cujo evento se perdeu.
8. Com a cobrança desligada ou sem a chave, nada muda e nada é pedido ao Asaas.
9. Nenhum dado de cartão além de bandeira e 4 dígitos; a chave e o token em nenhum log, resposta ou
   erro.
10. Unidade da API, tipos, lint, os e2e que a branch toca, o teste da rota nova do web, `arch-gates` e
    `docs-gate` verdes.

## O que eu perguntei ao sandbox antes de desenhar

Com a chave de sandbox da plataforma só no ambiente do comando, num cliente "Teste S3
Reconhecimento" (`cus_000009486783`, criado e removido) e duas assinaturas dele (removidas). Tudo
abaixo foi **visto** em 14/10/2026, por volta das 23h de Brasília.

| Pergunta | Resposta |
|---|---|
| A ação de teste `POST /sandbox/payment/{id}/confirm` numa cobrança `UNDEFINED` | `200` de primeira. A cobrança fica `RECEIVED`, com `billingType: BOLETO` (a ação simula um boleto), `paymentDate` e `confirmedDate` no dia, como `AAAA-MM-DD`. |
| Depois de paga a primeira cobrança de uma mensal | A assinatura segue `ACTIVE`, `billingType: UNDEFINED`, `nextDueDate` no mês seguinte. **A cobrança seguinte ainda não existe** na listagem. |
| A assinatura do S8 com cartão (`teste-s8-sub-amanha-ok`), só lida | A cobrança com vencimento em 14/10 continuava `PENDING` às 23h do próprio dia, com `CREDIT_CARD`; a de 14/11 **já existia**, `PENDING`; o `nextDueDate` da assinatura era 14/12. Cada cobrança traz `creditCard` com `creditCardBrand`, `creditCardNumber` e `creditCardToken`. |
| Devolver a cobrança paga pela ação de teste | `400 invalid_object`, "Somente é possível estornar cobranças cuja a forma de pagamento seja cartão de crédito ou Pix." |
| Trocar a cobrança pendente para `PIX` (`PUT /payments/{id}`), confirmar e devolver | A troca e a confirmação: `200`, `RECEIVED` com `PIX`. A devolução: `200`, mas o estorno fica `AWAITING_CRITICAL_ACTION_AUTHORIZATION` e **a cobrança continua `RECEIVED`**: esta conta exige autorizar a "ação crítica" no painel do Asaas. |
| Remover uma assinatura com a cobrança paga | `200 { deleted: true }`. A assinatura passa a `deleted: true`, `INACTIVE`, e **a listagem das cobranças dela continua trazendo a paga** (`RECEIVED`, não removida). Confirma a inferência da decisão 21 do S10. |
| `GET /webhooks` | Dois webhooks na conta (o da loja `picole-da-leia` em homologação e o de outro produto). Os campos: `id`, `name`, `url`, `email`, `enabled`, `interrupted`, `apiVersion`, `sendType`, `events`, `penalizedRequestsCount` e **`hasAuthToken`: o token nunca volta numa leitura**. |
| `POST /webhooks` desativado | Com um endereço `.invalid`: `400`, "A url informada é inválida." Com `https://example.com/…`: `200`, e **a resposta da criação repete o `authToken` inteiro**. Os 25 nomes de evento pedidos (abaixo) foram aceitos, inclusive `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED` e `SUBSCRIPTION_DELETED`. |
| `PUT /webhooks/{id}` com `interrupted` e `authToken` | `200`; o que não foi enviado (`enabled: false`) ficou como estava. |
| `DELETE /webhooks/{id}` | `200 { deleted: true }`; depois, `GET` responde `404`. A conta voltou a ter os dois de antes. |

## Decisões

### A porta única (`SubscriptionSync`, `modules/billing/subscription-sync.service.ts`)

1. **Dada uma página, lê no Asaas a assinatura que a linha nomeia e as cobranças dela, e escreve o que
   elas dizem.** É a única coisa que escreve `status`, `currentPeriodEndsAt`, `paymentMethod`,
   `cardBrand`, `cardLast4` e as duas colunas novas (decisão 25); `invoiceUrl` ela divide com a escolha
   do S10, que o escreve ao criar. O webhook, a rotina, a rota de conferir e a escolha do ciclo só
   chamam esta porta: ninguém mais conclui nada de uma cobrança.
2. **Lê só a assinatura que a linha nomeia** (`asaasSubscriptionId`): `subscription(id)` e
   `subscriptionCharges(id)`, os dois, porque a listagem de uma assinatura que não existe é vazia (S9).
   Uma linha sem assinatura no Asaas não tem o que ler, e a porta não pergunta nada. Achar uma
   assinatura pela referência e passar a nomeá-la é da escolha do S10, que é quem escreve os ids.
3. **Nunca com trava segurada:** a linha é lida, o Asaas é perguntado, e só então uma transação curta
   trava a linha (`FOR UPDATE`) e escreve, conferindo três coisas, nesta ordem:
   - `asaasSubscriptionId` ainda é o que foi lido. Se a linha passou a nomear outra (uma troca de ciclo
     terminou no meio), nada é escrito: **o que foi lido é de uma assinatura que a página já não tem**
     (Pronto 6).
   - Nenhuma escolha do S10 segura a marca (`asaasSubscriptionClaimedUntil` no futuro). Se segura,
     nada é escrito e quem chamou tenta depois (o evento volta à fila; a rotina já empurrou a próxima
     olhada). Assim a porta nunca escreve no meio de uma troca, nem entre a remoção da antiga e o
     registro da nova.
   - **Nenhuma leitura mais nova já foi escrita** (`asaasCheckedAt` da linha, decisão 25, menor que o
     instante em que esta leitura começou). Duas leituras ao mesmo tempo (um evento e a rota de
     conferir) terminam com a mais nova na linha, seja qual for a ordem em que fecham.
4. **A porta não pede a marca do S10**: não cria nem remove nada no Asaas. Este ticket não remove nem
   devolve nada lá.
5. **Com `BILLING_ENFORCED` desligada ou sem a chave, a porta volta sem perguntar nada** (Pronto 8).

### Como uma cobrança é lida (`subscription-facts.ts`, funções puras)

6. **Paga** é `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH` e `DUNNING_RECEIVED`: o Asaas tem o dinheiro.
   **Devolvida** é `REFUNDED`, `REFUND_REQUESTED` e `REFUND_IN_PROGRESS`. **Contestada** é
   `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE` e `AWAITING_CHARGEBACK_REVERSAL`. **Esperando** é
   `PENDING` e `OVERDUE` (a mesma de `awaitsPayment`, do S10). O resto, inclusive
   `AWAITING_RISK_ANALYSIS` e uma palavra que o Asaas inventar depois, **não prova nada**: não é paga,
   não abre fatura e não conta como "a página já pagou um dia". É a leitura conservadora nos dois
   sentidos: só dinheiro que o Asaas diz ter dá período, e só dinheiro que andou faz uma página que
   nunca pagou deixar de estar em teste.
7. Uma devolução pedida e ainda não feita (o estorno `AWAITING_CRITICAL_ACTION_AUTHORIZATION`, visto)
   deixa a cobrança `RECEIVED`: a página segue paga até o Asaas dizer `REFUNDED`.

### O período pago

8. **O calendário é o do Asaas**, ancorado em `firstDueDate` com o ciclo da linha
   (`renewalDayOf`, do S1). Uma cobrança com vencimento no dia `d` paga do dia `d` até o primeiro
   vencimento do calendário **depois** de `d`, inclusive. Quem paga atrasado não ganha dias: a
   cobrança de 14/10 paga em 20/10 cobre até 14/11, como o Asaas conta. Uma cobrança cujo vencimento
   foi mudado à mão no Asaas cobre até o vencimento seguinte do calendário.
9. **`currentPeriodEndsAt` é o fim do dia de Brasília do próximo vencimento** (`closeOfBrasiliaDay`): o
   lojista tem o dia inteiro do vencimento para pagar a cobrança seguinte. Cobranças pagas que se
   emendam (a seguinte paga até o fim da anterior) estendem o período; um buraco o interrompe. O
   período que vale é o da sequência paga que começou até hoje, ou a última antes de hoje.
10. **Uma linha sem `firstDueDate` toma o vencimento da cobrança mais antiga**, como o S10 faz ao
    gravar. Uma linha sem ciclo não tem calendário: a porta não escreve e registra um erro (nunca
    deveria acontecer: o S10 grava os dois juntos).
11. **Quando as cobranças não mostram dinheiro nenhum, o fim do período fica como a linha tinha.** É o
    caso de uma assinatura removida cujas cobranças o Asaas deixasse de listar: o que se sabia da
    página não é apagado por uma lista vazia.

### A situação

12. **A tabela**, aplicada sobre a situação da linha no instante da escrita:

    | O que o Asaas diz | Situação escrita |
    |---|---|
    | (qualquer coisa, numa página `EXEMPT`) | `EXEMPT`: isenta é escolha da Beelink, e nada do Asaas a move |
    | assinatura removida, inativada ou inexistente, e a página já pagou | `CANCELED`, com `currentPeriodEndsAt` no fim do período pago: o acesso vai até ele |
    | assinatura removida, inativada ou inexistente, e a página nunca pagou | **não muda** (decisão 13) |
    | uma cobrança paga cobre hoje | `ACTIVE` |
    | a cobrança do período de hoje (a de vencimento mais recente até hoje) foi devolvida | `CANCELED` |
    | a página nunca pagou (todas esperando, ou em análise) | **não muda**: segue em teste, com o teste vencido, ou como estava |
    | já pagou, e o período acabou sem a cobrança seguinte paga | `PAST_DUE`; uma linha `SUSPENDED` (do S5) ou `CANCELED` fica como está |

    "A página já pagou" é: alguma cobrança paga, devolvida ou contestada, ou a linha já estar `ACTIVE`,
    `PAST_DUE` ou `SUSPENDED`. **`SUSPENDED` e a carência não são escritos aqui** (S5). Uma página
    `SUSPENDED` que paga volta a `ACTIVE`, como uma `PAST_DUE`.
13. **Remoção de uma assinatura que nunca foi paga não cancela a página.** O briefing diz "assinatura
    removida: `CANCELED`" e também "a primeira cobrança ainda não paga: a situação não muda"; as duas
    regras se cruzam numa assinatura removida sem pagamento (removida à mão no painel do Asaas, ou o
    cliente removido, que leva todas). Fiquei com a segunda: `CANCELED` é, no contrato e no produto,
    "cancelou, e o período pago acabou"; sem nada pago não há o que cancelar, e cancelar ali cortaria
    os dias de teste que restavam. A fatura some da linha (a de uma assinatura removida não pode ser
    paga, visto no S10), e a página pode escolher um ciclo de novo.
14. **`CANCELED` com período em curso.** Removida ou devolvida, a página é `CANCELED` na hora, e o
    período pago fica em `currentPeriodEndsAt`. O S5 decide a trava por ele: `CANCELED` com
    `currentPeriodEndsAt` no futuro ainda usa a página. Os textos de `SubscriptionStatus` (contrato) e
    do produto passam a dizer isso. Preferi isto a manter `ACTIVE` até o fim do período porque a tela
    precisa saber **agora** que a página não vai renovar.
15. **A leitura deriva o relógio também do período pago**: uma linha `ACTIVE` cujo
    `currentPeriodEndsAt` já passou é lida `PAST_DUE` (`subscription-status.ts`), como uma `TRIALING`
    depois do teste é lida `TRIAL_EXPIRED`. O S1 deixou esse lugar esperando "o ticket que escreve o
    período". A porta também grava `PAST_DUE` quando olha.
16. **Uma devolução que deixa a assinatura de pé no Asaas** (o Asaas não cancela ao devolver) vai para o
    log como aviso, com os ids e sem nada de quem paga, uma vez, na mudança para `CANCELED`: se não for
    removida lá, ela segue cobrando. Uma assinatura achada removida numa página que pagou também vai
    para o log como aviso (é o único sinal de alguém ter removido o cliente no painel do Asaas, que leva
    todas as páginas da conta).

### Forma de pagamento, cartão e fatura

17. **A forma de pagamento** é a da cobrança mais recente (por vencimento) em que o dinheiro andou
    (paga, devolvida ou contestada) e cuja forma é uma das quatro (`CREDIT_CARD`, `DEBIT_CARD`, `PIX`,
    `BOLETO`). Sem nenhuma, fica a que a linha tinha.
18. **Do cartão, só bandeira e 4 dígitos**, e só quando a forma é cartão: os da cobrança, ou, sem eles,
    os da assinatura. O cliente HTTP já não lê o token (S9). Uma bandeira com mais de 20 caracteres (a
    coluna) não é gravada: o cartão fica vazio em vez de a escrita inteira falhar.
19. **A fatura em aberto** é a de uma cobrança esperando (`PENDING`/`OVERDUE`, com endereço `https`)
    **cujo período ainda não acabou**, a de vencimento mais antigo entre elas. Assim: a primeira
    cobrança enquanto não paga; a da renovação assim que o Asaas a cria (para quem paga com Pix ou
    boleto, é a que vence; para quem paga com cartão, a que o Asaas vai cobrar sozinho); e não a de um
    período velho que ficou sem pagar, porque pagá-la não cobre hoje. Assinatura removida: nenhuma.

### O webhook da plataforma

20. **A rota do web `/api/billing/asaas/webhook`** só entrega os bytes à API, com `asaas-access-token` ao
    lado e nada mais, como a das lojas (`/api/integrations/asaas/webhook`). Não confere origem, não lê
    nem loga o token, e responde `502` quando a API não responde (o Asaas entrega de novo).
21. **A rota da API `POST /api/billing/asaas/webhook`**, pública e fora do Swagger. O token é comparado
    com `ASAAS_PLATFORM_WEBHOOK_TOKEN` em tempo constante (os dois resumidos em SHA-256 antes, para nem o
    tamanho vazar). Sem o token configurado, ou com outro: `401 BILLING_WEBHOOK_TOKEN_INVALID`, **antes
    de qualquer escrita** (Pronto 3). O token só é lido em `platform-webhook.config.ts`, com uma regra de
    arquitetura nova (`api/platform-webhook-token-in-billing`), como a chave.
22. **Com a cobrança desligada ou sem a chave**, o token certo recebe `200 { result: 'IGNORED' }` e nada
    é gravado nem perguntado.
23. **Tabela própria, `billing_events`**, única pelo id do evento (`evt_…`; sem id, o SHA-256 dos bytes,
    como nas lojas). Guarda o id, o nome do evento e **a linha de `store_subscriptions` de que ele
    fala**, e nada mais do corpo. Sem chave estrangeira: um evento pode falar de uma página apagada
    depois, e a linha serve só para reconhecer uma segunda entrega.
24. **De quem é o evento:** pela referência `beelink-subscription-<id da linha>` da cobrança
    (`payment.externalReference`, que o Asaas copia da assinatura, visto no S10) ou da assinatura
    (`subscription.externalReference`), exata; sem ela, pelo id da assinatura do Asaas que uma linha
    nomeia. **Um evento que não é de uma página nossa** (a conta é compartilhada) é gravado já
    `IGNORED` e respondido `200`. Um evento de uma assinatura que a linha já não nomeia (cada troca de
    ciclo remove uma cobrança pendente) é gravado e trabalhado como qualquer outro: trabalhar é ler a
    assinatura que a linha nomeia **agora**, e nada do que o evento diz é aplicado.
25. **Grava, responde, e só depois trabalha**, como `AsaasEvents`: as linhas são tomadas com
    `FOR UPDATE SKIP LOCKED` e um prazo; uma que falha espera 1, 2, 4… minutos e é largada na oitava
    tentativa (o que não perde pagamento: a rotina olha de novo); um 429 faz o evento esperar a hora
    que o Asaas disse e **para a varredura**, devolvendo os outros eventos tomados sem gastar
    tentativa; a porta respondendo "uma escolha está falando com o Asaas" conta como falha (volta à
    fila). Vários eventos da mesma página na mesma varredura viram uma leitura só. Os feitos há mais de
    30 dias são apagados.

### O cadastro do webhook (`PlatformWebhookKeeper`)

26. **A API cadastra o webhook na conta da plataforma**, como `asaas-webhook-keeper.ts` faz por loja, e
    só com tudo isto: cobrança ligada, chave, token, e `WEB_URL` em `https` público (a mesma regra das
    lojas, que passa a morar em `shared/asaas/`). **Procura antes de criar**, pelo endereço exato, na
    lista de webhooks da conta. Achado e ligado, não mexe; achado desligado ou com a fila interrompida,
    religa e manda o token de hoje junto (o token nunca volta numa leitura, visto: se ele mudou no
    ambiente, as entregas recebem `401` até a fila parar, e a olhada seguinte o troca). Não achado,
    cria: nome `bee-link (assinaturas)`, `sendType: SEQUENTIALLY`, `apiVersion: 3`, o e-mail de
    `ASAAS_CONTACT_EMAIL`.
27. **Os eventos pedidos** são os 25 aceitos no sandbox: `PAYMENT_CREATED`, `PAYMENT_UPDATED`,
    `PAYMENT_AUTHORIZED`, `PAYMENT_AWAITING_RISK_ANALYSIS`, `PAYMENT_APPROVED_BY_RISK_ANALYSIS`,
    `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `PAYMENT_CONFIRMED`,
    `PAYMENT_RECEIVED`, `PAYMENT_RECEIVED_IN_CASH_UNDONE`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`,
    `PAYMENT_RESTORED`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`,
    `PAYMENT_REFUND_DENIED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`,
    `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_DUNNING_RECEIVED`, `SUBSCRIPTION_CREATED`,
    `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_INACTIVATED` e `SUBSCRIPTION_DELETED`. `PAYMENT_CREATED` está
    porque é ele que traz a fatura da renovação.
28. **Quando:** pela rotina, uma vez por dia por processo (a primeira na primeira volta depois da
    subida); uma olhada que falha tenta de novo em uma hora. O cliente nunca devolve a resposta da
    criação (que repete o token, visto), e o token é cortado de uma recusa do Asaas antes de ela virar
    erro.

### A rotina (`BillingRoutine`) e quando olhar cada página

29. **A cada minuto**, como `PaymentRoutine`: os eventos que falharam, as páginas cuja vez chegou, o
    webhook (uma vez por dia) e a limpeza dos eventos velhos. **Não roda em teste, com a cobrança
    desligada ou sem a chave.** Cada passo falha sozinho.
30. **Uma coluna nova, `store_subscriptions.nextCheckAt`**: quando a rotina deve olhar a página de novo.
    A porta a escreve a cada olhada, pela situação (uma função pura, com teste):
    - isenta, ou assinatura removida: nula (a rotina não olha; um evento ou uma escolha traz de volta);
    - `ACTIVE`: ao meio-dia do último dia coberto (o dia do vencimento seguinte, quando o cartão é
      cobrado) e, se ainda não renovou, um minuto depois do fim do período, que é quando ela vira
      `PAST_DUE`;
    - esperando o primeiro pagamento, ou em atraso: cada vez mais espaçado, pela idade da espera — 10
      minutos na primeira hora, uma hora no primeiro dia, seis horas na primeira semana, um dia depois.
    A escolha do S10 a escreve ao criar ou reaproveitar uma assinatura (a primeira olhada em 10
    minutos). **Antes de perguntar ao Asaas, a rotina empurra a coluna dez minutos**, como `pushCheck`
    faz com os pedidos: uma página que falha não é perguntada a cada minuto. São as três turmas do
    briefing (esperando o primeiro pagamento, ativas perto do fim, em atraso) sem três consultas.
31. **20 páginas por volta**, a de vez mais antiga primeiro; um 429 para a volta (o cliente já se lembra
    dele no processo).

### A rota de conferir e a escolha do ciclo

32. **`POST /api/stores/:storeSlug/subscription/check`**, do dono, responde a mesma
    `StoreSubscriptionAnswer` do `GET`, depois de perguntar ao Asaas agora. É para a tela (em
    desenvolvimento não há webhook). Limitada por endereço com o par das escritas de loja
    (`STORE_WRITE_RATE_LIMIT_*`), e **no máximo uma pergunta ao Asaas a cada 10 segundos por página**
    (`asaasCheckedAt`): dentro disso responde o que a linha tem. Com a cobrança desligada, sem a chave ou
    sem assinatura no Asaas, responde o `GET`, sem perguntar. O Asaas sem responder (ou um 429):
    `503 BILLING_UNREACHABLE`. Uma escolha falando com o Asaas: responde o que a linha tem.
33. **A escolha do ciclo chama a porta onde hoje só responde `BILLING_SUBSCRIPTION_PAID`**, depois de
    soltar a marca (a porta não escreve com a marca segurada). A resposta continua `409
    BILLING_SUBSCRIPTION_PAID`, mas a página já foi lida: um `GET` logo depois mostra o pagamento
    aplicado. Mantive o código porque o S11 ainda não existe e o contrato já o descreve; o que muda é
    que a situação passa a estar certa.
34. **Duas colunas novas em `store_subscriptions`**, além de `nextCheckAt`: `asaasCheckedAt`, o instante
    em que começou a leitura do Asaas que a linha guarda (decisão 3 e 32). Nenhuma das duas vai para o
    fio.

### Contrato

35. `BillingErrorCode` ganha `BILLING_WEBHOOK_TOKEN_INVALID` (`401`). A leitura da assinatura não muda
    de forma; mudam os textos de `SubscriptionStatus` (`PAST_DUE`, `CANCELED`), de
    `currentPeriodEndsAt` e de `invoiceUrl`, que agora dizem quem os escreve e o que querem dizer.

## Fora do escopo

- A trava e a carência, e escrever `SUSPENDED` (S5); e-mails (S7); cancelar pelo painel (S12); tela
  (S11); cupom e mês grátis (S6); trocar cartão (S13).
- Remover ou devolver qualquer coisa no Asaas.
- Aplicar um pagamento de uma assinatura que a linha não nomeia (por exemplo, achada pela referência
  depois de uma chamada que morreu): é a escolha do S10 que passa a nomeá-la.
- Os eventos `ACCESS_TOKEN_*` da chave da plataforma.

## Riscos

1. **A devolução não foi vista acontecer no sandbox.** A conta de teste recusa estornar o boleto que a
   ação de teste simula, e o estorno de um Pix fica esperando a autorização de "ação crítica" no painel
   do Asaas. `REFUNDED` → `CANCELED` é exercitado com o Asaas falso; no sandbox, só que uma devolução
   pedida deixa a página paga.
2. **O horário da cobrança automática do cartão não é conhecido.** No sandbox, a cobrança do dia
   continuava `PENDING` às 23h do vencimento. Se em produção o Asaas cobrar depois da meia-noite, quem
   paga com cartão fica `PAST_DUE` por algumas horas (sem trava: a carência é do S5).
3. **Quem paga a primeira cobrança depois do vencimento seguinte** (mais de um ciclo depois de
   escolher) paga um período que já acabou e continua sem período; a fatura que a linha mostra já é a
   da cobrança seguinte (decisão 19), mas a escolha do S10 ainda devolve a primeira (decisão 24 dele).
4. **O webhook não foi visto chegar.** Nenhuma entrega real foi recebida: o sandbox não alcança esta
   máquina. O cadastro foi exercitado desativado e removido em seguida.
5. **A remoção de uma assinatura nunca paga não cancela** (decisão 13), ao contrário da frase literal
   do briefing.
6. **Duas instâncias da API** coordenam a rotina pela coluna empurrada e os eventos por
   `SKIP LOCKED`; o webhook seria cadastrado por cada uma, e a busca pelo endereço antes de criar é o
   que evita o segundo (duas criando no mesmo segundo fariam dois).

## Como desfazer a migration

```sql
DROP TABLE "billing_events";
DROP INDEX "store_subscriptions_nextCheckAt_idx";
ALTER TABLE "store_subscriptions" DROP COLUMN "nextCheckAt", DROP COLUMN "asaasCheckedAt";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261014120000_billing_events_and_checks';
```

Não apaga nada do que foi contratado nem a situação das páginas: só a fila de eventos e as marcas de
quando olhar.
