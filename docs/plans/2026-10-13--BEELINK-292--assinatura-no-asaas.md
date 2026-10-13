# BEELINK-292 (S10) — API: o lojista escolhe o ciclo e a assinatura da página nasce no Asaas

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Terceiro ticket de código. A branch nasce da do
> S9 (`feat/BEELINK-291-cliente-asaas-da-plataforma`, `0dbcf380`), que ainda está no PR #269; o PR
> deste ticket tem `main` como base e só fica legível depois que o #269 entrar. Toca
> `packages/contracts` e `apps/api`. **Nenhuma tela, nenhum webhook, e a página não é marcada como
> paga aqui** (isso é do S3). As decisões do épico não são reabertas; as que estão abaixo são do
> desenvolvedor. Leituras de base: `2026-10-13--BEELINK-219--assinatura-por-pagina.md` (o modelo),
> `2026-10-13--BEELINK-291--cliente-asaas-da-plataforma.md` (o cliente e a ordem da conversa com o
> Asaas) e `2026-10-13--BEELINK-289--como-o-lojista-paga.md` (o que o sandbox respondeu; o teste 19 é
> o caminho deste ticket). Escrito em 13/10/2026, antes do código.

## O problema

O S1 deixou a linha da assinatura de cada página e o S9 deixou o lojista como cliente da conta Asaas
da bee-link. Falta o passo em que alguma coisa passa a ser devida: o lojista escolhe mensal, 6 meses
ou 1 ano para **uma página**, e a API cria a assinatura dessa página no Asaas, sem cartão, e responde
o endereço da fatura onde ele paga.

O que não pode acontecer, em ordem de gravidade:

1. **Duas assinaturas vivas no Asaas para uma página.** O Asaas aceita duplicatas sob a mesma
   referência (visto, abaixo), então quem impede é a bee-link.
2. **Um valor que não é o do plano.** O que se cobra é o preço do plano naquele ciclo como o banco o
   guarda na hora, gravado na linha da página junto com o ciclo.
3. **Uma compra onde não se cobra**: cobrança desligada, sem chave, página já paga ou isenta.
4. **A situação da página mudar aqui.** Quem a move é o S3, quando o Asaas disser que a cobrança foi
   paga.

## Definição de Pronto

1. No sandbox, uma assinatura de cada ciclo nasce com a cobrança do dia, o valor do épico
   (5990, 32340, 57480 centavos), `billingType: UNDEFINED`, a nossa referência e o endereço da
   fatura; a linha da página guarda id, plano, ciclo, preço, primeiro dia e fatura; a situação não
   mudou.
2. A mesma chamada de novo devolve a mesma assinatura e a mesma fatura, sem outra no Asaas; trocar de
   ciclo deixa exatamente uma viva.
3. Duas chamadas ao mesmo tempo resultam em uma assinatura.
4. Depois de um resultado desconhecido, a tentativa seguinte procura pela referência antes de criar.
5. Sem dados de cobrança, sem chave, com a cobrança desligada, com a página ativa ou isenta: recusa
   com `errorCode` estável e **nenhuma** chamada ao Asaas.
6. Nenhum dado de cartão gravado; a chave em nenhum log, resposta ou erro.
7. Unidade da API, tipos, lint, os e2e que a branch toca, `arch-gates` e `docs-gate` verdes.

## O que eu perguntei ao sandbox antes de desenhar

Com a chave de sandbox da plataforma só no ambiente do comando, num cliente "Teste S10
Reconhecimento" (`cus_000009459220`, criado e removido). Tudo abaixo foi **visto** em 13/10/2026.

| Pergunta | Resposta |
|---|---|
| `POST /subscriptions` com `billingType: UNDEFINED` e `nextDueDate` de hoje | `200`, `status: ACTIVE`, `billingType: UNDEFINED`. **O `nextDueDate` que volta já é o da cobrança seguinte** (13/11 para o mensal, 13/04/2027 para o semestral, 13/10/2027 para o anual): o primeiro dia não se lê da assinatura. |
| A cobrança do dia existe logo? | Sim, na chamada seguinte: uma só, `PENDING`, `billingType: UNDEFINED`, `dueDate` de hoje, o `value` da assinatura, `invoiceUrl` em `https`, e o `externalReference` da assinatura copiado. |
| `GET /subscriptions?externalReference=X` | Acha na hora. Exata no comprimento (um prefixo não acha) e **sem diferenciar maiúsculas**, como a dos clientes. Não lista assinatura removida (só com `includeDeleted=true`). |
| O Asaas aceita duas assinaturas com a mesma referência? | **Aceita.** Criei uma semestral e uma anual sob a mesma referência: as duas `ACTIVE`, as duas na busca. |
| `DELETE /subscriptions/{id}` | `200 { deleted: true, id }`. De novo na mesma: o mesmo `200`. Num id que nunca existiu: `404`, corpo vazio. |
| Depois de remover | `GET /subscriptions/{id}` ainda responde, com `deleted: true` e `status: INACTIVE`. As cobranças dela: lista vazia. A cobrança pendente, lida pelo id: `deleted: true`. |
| Remover o cliente com assinaturas de pé | As assinaturas dele somem junto (`deleted: true`, `INACTIVE`) e a busca pela referência fica vazia. |
| Criar assinatura para um cliente removido | `400`, código **`invalid_object`** (o genérico), "Não é possível criar uma cobrança para um cliente removido." |
| Criar assinatura para um id de cliente que não existe | `400 invalid_customer`, "Cliente inválido ou não informado." |

## Decisões

### A rota e o fio

1. **`PUT /api/stores/:storeSlug/subscription`**, com `{ cycle }`, só para o dono. `PUT` e não
   `POST` porque a chamada é "que a assinatura desta página seja deste ciclo": repetir chega ao mesmo
   lugar. É a mesma escolha do `PUT /billing/account` do S9. Responde `200` com
   `SubscriptionChoice`: `invoiceUrl` (sempre preenchido numa resposta `200`) e `subscription`, a
   mesma forma que o `GET` do mesmo endereço responde, para a tela atualizar o que já tem.
2. **Limitada por endereço** com o par das escritas de loja (`STORE_WRITE_RATE_LIMIT_*`), como o
   `PUT` do S9, e pelo mesmo motivo: cada chamada fala com um terceiro cuja cota é de todos.
3. **A leitura não muda de forma.** `StoreSubscription.invoiceUrl` existe desde o S1 e a rota já é
   só do dono; este ticket é quem passa a preenchê-la. Os ids do Asaas continuam fora do fio.
4. **Códigos novos** em `BillingErrorCode`:

   | Código | Status | Quando |
   |---|---|---|
   | `BILLING_CYCLE_INVALID` | 400 | o corpo não traz um dos três ciclos |
   | `BILLING_NOT_ENFORCED` | 409 | `BILLING_ENFORCED` desligada: onde nada é cobrado, nada se compra |
   | `BILLING_ACCOUNT_REQUIRED` | 409 | a conta nunca deu nome e CPF/CNPJ; a tela usa para pedi-los |
   | `BILLING_SUBSCRIPTION_MISSING` | 409 | página de antes das assinaturas, ainda sem linha (S15) |
   | `BILLING_PAGE_EXEMPT` | 409 | página isenta |
   | `BILLING_PAGE_ACTIVE` | 409 | página `ACTIVE` com período pago em curso |
   | `BILLING_PLAN_UNAVAILABLE` | 409 | o plano Beelink não está no banco, está desligado ou não é vendido nesse ciclo |
   | `BILLING_SUBSCRIPTION_BUSY` | 409 | outra chamada desta página está falando com o Asaas, ou uma criação ficou sem resposta há menos de 45 s |
   | `BILLING_SUBSCRIPTION_PAID` | 409 | o Asaas diz que a assinatura que a página já tem foi paga; aplicar o pagamento é do S3 |
   | `BILLING_SUBSCRIPTION_REFUSED` | 502 | o Asaas recusou a criação da assinatura |

   Os do S9 seguem valendo aqui: `BILLING_UNAVAILABLE` (503, sem chave ou chave recusada),
   `BILLING_UNREACHABLE` (503), `BILLING_ACCOUNT_BUSY` (409) e `BILLING_CUSTOMER_REFUSED` (502), os
   dois últimos quando o cliente da conta precisa ser levado ao Asaas antes.
5. **A ordem das recusas, todas antes de qualquer chamada ao Asaas:** página existe e é do dono
   (`404`/`403`, como as outras rotas do painel); cobrança ligada; chave configurada; conta com dados
   de cobrança; página com linha de assinatura, não isenta e não ativa com período em curso; plano à
   venda no ciclo; ninguém falando com o Asaas sobre esta página.
6. **Só `EXEMPT` e `ACTIVE` com período em curso são recusadas pelo que a linha diz.** As outras
   situações seguem para o Asaas, e é o Asaas que diz se já existe algo pago (decisão 15). Assim uma
   linha que o S3 ainda não atualizou não deixa nascer uma segunda assinatura.

### O que vai ao Asaas

7. **O plano é o de slug `beelink`, ativo.** O preço é `priceOf(plano, ciclo)`, lido do banco na
   transação que pega a conversa. Nenhum número de preço aparece no código.
8. **A referência é `beelink-subscription-<id da linha de store_subscriptions>`**: minúscula, com
   prefixo, e do id próprio da linha (o S1 deu um id a ela para isto). A comparação é exata, feita
   no cliente, porque a busca do Asaas não diferencia maiúsculas.
9. **O ciclo nas palavras do Asaas** (`MONTHLY`, `SEMIANNUALLY`, `YEARLY`) é traduzido num lugar só,
   `billing.constants.ts`, preso ao tipo do fio.
10. **`nextDueDate` é o dia de hoje em Brasília** (`brasiliaDayOf`), `billingType` é `UNDEFINED`
    sempre (escrito no cliente HTTP, não escolhido por quem chama), e o valor cruza por
    `asaas-money.ts`.
11. **A descrição que o lojista lê na fatura:** `Plano Beelink mensal — página "<nome da loja>"`
    (ou `semestral`, `anual`). O nome da loja é cortado em 120 caracteres.
12. **Sem `callback`** (o Asaas recusa a criação inteira sem o site cadastrado na conta). Pendência
    do Rafael, em "Riscos".

### A ordem da conversa (regra 10 e regra 11 do `AGENTS.md` da API)

13. **Uma coluna nova: `store_subscriptions.asaasSubscriptionClaimedUntil`.** É a marca de que uma
    chamada está falando com o Asaas sobre a assinatura desta página, com prazo: o mesmo desenho de
    `billing_accounts.asaasCustomerClaimedUntil` e de `orders.paymentClaimedUntil`. **A intenção é a
    marca.** O ciclo pedido não é gravado antes da hora: `planId`, `cycle`, `priceCents`,
    `firstDueDate`, `invoiceUrl` e `asaasSubscriptionId` descrevem sempre **a assinatura que está no
    Asaas**, e só são escritos juntos, depois de o Asaas responder. Gravar o ciclo desejado antes
    deixaria, numa chamada que morre no meio, uma linha que diz "anual" ao lado da fatura do mensal.
14. **Os passos:**
    1. Numa transação curta, com a linha da assinatura travada (`FOR UPDATE`): as recusas da decisão
       5 e, passando por todas, a marca escrita com prazo de 90 s. **A transação fecha.**
    2. Sem trava nenhuma: o cliente da conta é garantido (decisão 18).
    3. **Procura o que está de pé** sob a referência da página (decisão 16), e lê as cobranças de
       cada assinatura achada.
    4. Alguma tem cobrança que já não está só esperando pagamento: para, `BILLING_SUBSCRIPTION_PAID`,
       nada é removido.
    5. Uma delas serve (decisão 17): fica com ela; as outras são removidas. A linha é escrita com o
       que o Asaas tem, a marca é solta, e a resposta é a fatura dela.
    6. Nenhuma serve: todas são removidas; a linha deixa de nomear a que foi removida; a marca é
       renovada; a assinatura é criada; o id é gravado; as cobranças são lidas; a linha é escrita com
       a fatura e a marca é solta.
    Toda escrita depois do passo 1 só acontece **se a marca ainda for desta chamada**
    (`WHERE … "asaasSubscriptionClaimedUntil" = <a que eu escrevi>`). Quem a perdeu não escreve nada
    e não cria nada.
15. **"Paga" é qualquer cobrança que não esteja `PENDING` nem `OVERDUE`.** `CONFIRMED`, `RECEIVED`,
    `RECEIVED_IN_CASH`, `REFUNDED`, as de estorno e contestação, `AWAITING_RISK_ANALYSIS` e uma
    palavra que o Asaas inventar depois contam como "dinheiro andou ou pode ter andado": nada é
    removido e nada é criado ao lado. É a leitura conservadora; o que cada uma significa para a
    página é do S3.
16. **O que está de pé** é toda assinatura não removida com exatamente a nossa referência, mais a que
    a linha nomeia quando a busca não a trouxe e o Asaas diz que ela existe, não foi removida e tem a
    nossa referência (uma busca atrasada não vira licença para criar outra). Mais de uma de pé vai
    para o log como aviso, com os ids.
17. **Uma assinatura de pé serve** quando está `ACTIVE`, é do cliente atual da conta, tem o ciclo
    pedido e o valor que o plano tem **agora**. Se o preço do plano mudou entre a primeira tentativa
    e a repetição, a tentativa antiga não serve mais e é trocada: o que se cobra é o preço de hoje.
18. **Garantir o cliente antes** (`BillingAccounts.customerOf`): o S9 deixou `claim` e `converge`
    privados. O método novo devolve o id do cliente e, se a linha da conta não está em dia com o
    Asaas (`asaasCustomerSyncedAt` nula), faz a mesma conversa do `PUT /billing/account` com os dados
    que a linha já tem. Conta em dia: nenhuma chamada.
19. **Cliente removido no Asaas.** A recusa do Asaas para esse caso tem o código genérico
    (`invalid_object`) e só a frase diz o motivo (visto). Para não depender da frase: **toda recusa
    `400` da criação** faz o cliente ser conferido de novo (`customerOf` com o id recusado: o id e a
    data são zerados na linha e a conversa do cliente roda, procurando pela referência da conta). Se
    o id que voltar for **outro**, o cliente tinha sido removido e a criação é tentada mais uma vez,
    uma só. Se for o mesmo, a recusa não era do cliente e sai como `BILLING_SUBSCRIPTION_REFUSED`.
20. **Resultado desconhecido na criação** (silêncio ou 5xx no `POST`): a marca é empurrada 45 s e a
    resposta é `503 BILLING_UNREACHABLE`. Nesse intervalo as chamadas recebem
    `409 BILLING_SUBSCRIPTION_BUSY`; depois dele, a seguinte procura pela referência antes de criar
    (passo 3, que vem sempre antes de qualquer criação, e não só depois de um susto).
21. **Depois de remover, olhar de novo.** Entre ler as cobranças (todas pendentes) e o `DELETE`, o
    lojista pode ter pago com cartão na fatura aberta em outra aba. O Asaas guarda a cobrança paga
    de uma assinatura removida. Por isso, depois de cada `DELETE`, as cobranças daquela assinatura
    são lidas outra vez: se sobrou alguma que não está esperando pagamento, a conversa para em
    `BILLING_SUBSCRIPTION_PAID`, **nada é criado** e a linha continua nomeando a assinatura removida,
    com um erro no log. **Isto é uma inferência**: não vi uma cobrança paga numa assinatura removida
    (o briefing proíbe pagar), só li no S8 que "a paga fica". Se o Asaas não a listar, o passo não
    acha nada e a conversa segue como seguiria sem ele.
22. **O primeiro dia gravado é o `dueDate` da cobrança mais antiga da assinatura**, que para uma
    recém-criada é o dia enviado. O `nextDueDate` da assinatura não serve: já é o da cobrança
    seguinte (visto).
23. **A fatura devolvida é a da cobrança mais antiga, e só enquanto ela espera pagamento.** Se a
    assinatura existe e a cobrança ainda não (não vi acontecer: no sandbox ela existe na chamada
    seguinte), a linha fica com o id, o plano, o ciclo e o preço, sem fatura, e a resposta é
    `503 BILLING_UNREACHABLE`: a chamada seguinte acha a assinatura e lê a cobrança.
24. **Mesmo ciclo, tentativa de dias atrás:** devolve a mesma fatura, como o briefing manda, mesmo
    vencida. Não troco por uma nova de propósito: um boleto pago e ainda não compensado continua
    `PENDING` por até três dias, e remover a assinatura nesse intervalo apagaria a cobrança que o
    lojista já pagou. O custo fica em "Riscos" (o primeiro período de quem paga atrasado é mais
    curto).

### Onde mora

25. **`StoreSubscriptions`** (`modules/billing/store-subscriptions.service.ts`) é a única conversa com
    o Asaas sobre a assinatura de uma página, como `BillingAccounts` é a do cliente. As contas puras
    (o que serve, o que espera pagamento, a primeira cobrança, a descrição) ficam em
    `subscription-attempt.ts`, com teste de unidade.
26. **`PlatformAsaas` ganha três métodos:** `subscriptions(referência)` (as de pé, com a referência
    exata), `createSubscription` (silêncio é `AsaasOutcomeUnknown`) e `removeSubscription` (um `404`
    é "já não existe" e não é erro).
27. **Regra de arquitetura nova, `api/page-subscription-in-billing`:** nada fora de `modules/billing`
    escreve em `store_subscriptions`. É o que garante que a marca e os ids do Asaas têm um dono só. A
    regra 11 do `AGENTS.md` da API ganha a frase correspondente.
28. **Nada de dado pessoal no log:** as palavras do Asaas passam por `reasonWithout` com o nome, o
    documento e o e-mail da conta antes de irem para o log, como no S9.

## Fora do escopo

- Marcar a página como paga, ler o pagamento, o webhook (S3).
- Tela (S11), trava (S5), cupom (S6), cancelar (S12), trocar cartão (S13), páginas antigas (S15).
- `callback` de retorno ao painel.
- Trocar de plano: só existe um à venda.

## Riscos

1. **O `callback` de retorno não é enviado.** Depois de pagar, o lojista fica na tela do Asaas. O
   site (`beelink.biz`) precisa ser cadastrado na conta do Asaas pelo Rafael (Minha Conta →
   Informações); depois disso o campo entra numa linha, e o S11 decide para onde volta.
2. **Boleto pago e ainda não compensado + troca de ciclo.** O Asaas mostra a cobrança como `PENDING`
   até o banco confirmar. Se nesse intervalo o lojista pedir outro ciclo, a assinatura antiga é
   removida com a cobrança que ele pagou. Não sei o que o Asaas faz com esse dinheiro: **a
   perguntar ao Asaas** (Rafael). A tela do S11 pode reduzir a chance não oferecendo a troca logo
   depois de abrir um boleto.
3. **Quem paga dias depois de escolher tem o primeiro período mais curto.** O Asaas conta a
   renovação do dia da primeira cobrança, não do dia do pagamento. O S3 decide se o período da
   bee-link segue o Asaas ou o pagamento; a âncora gravada (`firstDueDate`) é a do Asaas.
4. **Quem assina durante o teste perde os dias que faltavam**, porque a primeira cobrança é do dia
   (decisão 5 do épico). A tela do S11 deveria dizer isso.
5. **A unicidade no Asaas depende de nós.** O que impede a segunda assinatura é a marca na linha e a
   busca antes da criação. Uma assinatura criada à mão no painel do Asaas com a nossa referência é
   tratada como nossa: se não servir e não estiver paga, é removida.
6. **A decisão 21 é uma inferência**, e a decisão 19 troca uma frase do Asaas por uma chamada a mais
   a cada recusa `400` da criação.
7. **Tudo foi visto só no sandbox**, e duas instâncias da API ao mesmo tempo não foram exercitadas
   (a marca na linha é o que as coordena).

## Como desfazer a migration

```sql
ALTER TABLE "store_subscriptions" DROP COLUMN "asaasSubscriptionClaimedUntil";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013230000_store_subscription_claim';
```

Não apaga nada do que foi contratado. As assinaturas criadas no Asaas continuam lá.
