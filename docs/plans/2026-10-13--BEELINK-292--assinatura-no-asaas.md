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

---

## Como ficou (acréscimo de 13/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **A decisão 19 foi vista funcionando no sandbox** (item 6 de "No sandbox, de verdade"), e ganhou uma
   linha de aviso no log quando o cliente é trocado: `Asaas no longer held an account's customer:
   another was made, and the page's subscription asked for again`, com o id da página e o da conta,
   sem nada de quem ela é. É o único sinal de que alguém removeu um cliente no painel do Asaas, e
   importa porque **o Asaas remove junto todas as assinaturas daquele cliente** (visto): as outras
   páginas da mesma conta ficam com uma linha que nomeia uma assinatura que não existe mais.
2. **A fatura de uma assinatura removida não pode ser paga** (visto, abrindo o endereço sem pagar): a
   página do Asaas responde `200` com "Fatura cancelada" e "Esta fatura foi removida pelo seu
   fornecedor. Não é possivel realizar o pagamento." Isso encolhe o risco da decisão 21 a quem já
   estava com o formulário do cartão carregado no instante da troca; esse caso continua não visto.
3. **`BillingAccounts.save` foi partido em dois** para o método novo não copiar nada: `matched` é a
   conversa (pegar a marca, convergir, soltar ou segurar), e `save` e `customerOf` são as duas
   entradas. `claim` passou a aceitar "sem corpo" (os dados são os da linha) e "id recusado". Os 34
   testes do S9 sobre essa conversa passam sem uma linha alterada.
4. **`unavailable()` saiu de `billing-accounts.service.ts` para `billing-refusals.ts`**, junto com a
   recusa nova `accountRequired()`: as duas são respondidas pelos dois serviços.
5. **A remoção que o Asaas não confirma não ganhou código próprio.** Silêncio, 5xx ou recusa no
   `DELETE` respondem `503 BILLING_UNREACHABLE`, nada é criado, a linha continua nomeando a
   assinatura antiga, e a chamada seguinte termina a troca.
6. **O cliente HTTP só toma por "removida" a resposta que diz `deleted: true`** (ou um `404`). Um
   `200` sem isso é `AsaasUnreachable`: uma segunda assinatura nasceria ao lado de uma que continua
   de pé.
7. **O Asaas de mentira dos testes (`test/support/fake-platform-asaas.ts`) passou a ter assinaturas e
   cobranças**, com o comportamento visto no sandbox: aceita duas sob a mesma referência, cria a
   cobrança do dia junto, responde um `nextDueDate` que já é o seguinte, remove as cobranças
   pendentes e guarda as pagas, recusa criar para cliente removido com `invalid_object`, e remover um
   cliente remove as assinaturas dele. `pay(id, status)` é o lojista pagando na fatura: o S3 vai
   precisar dele.
8. **Dois testes nasceram dos erros plantados** (abaixo): o da linha que deixa de nomear a assinatura
   removida quando a nova não pôde ser criada, e o da troca de ciclo entre dois ciclos de mesmo
   preço.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027). **Em qual commit cada coisa
rodou está dito em cada item**, porque o disco caiu a 1,1 Gi no fim e o orquestrador mandou parar os
comandos pesados antes de eu repetir tudo no último commit.

1. **A migration, do zero**, num banco de rascunho (`harness_landing_s10_proof`, criado e apagado):
   `prisma migrate deploy` aplicou as 113 ("All migrations have been successfully applied.");
   `prisma migrate diff --exit-code` respondeu "No difference detected." e saiu com 0 nos dois
   sentidos. **O roteiro de desfazer** rodou como está escrito; depois dele o `migrate diff` saiu com
   2 pedindo a coluna, e a migration aplicou de novo. A migration não mudou desde `66553757`.
2. **Unidade:** `pnpm --filter api test`, 133 arquivos e 1682 testes, todos passando (eram 131 e
   1616 no S9). Rodado em `02bec393`.
3. **Tipos e lint:** `tsc --noEmit` na API e em `packages/contracts`, saída 0; `oxlint` na API, sem
   erro (os mesmos dois avisos de antes, em `test/catalog.e2e-spec.ts` e `page-rows.ts`, que este
   ticket não toca). Rodados em `02bec393`.
4. **e2e, um arquivo por vez:**
   - no conteúdo do último commit de código (`472a01eb`): `store-subscription` (79) e
     `store-subscription-key` (9), todos passando;
   - antes da última mudança (a linha de log do item 1 acima): `store-subscription-not-enforced`
     (5), `store-subscription-without-key` (6), `billing-account` (34), `billing-account-key` (9),
     `billing-account-without-key` (6), `billing` (18), `billing-enforced` (2) e `stores` (19),
     todos passando.
5. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits, o último inclusive (rodam no
   `pre-commit`). A regra nova ficou vermelha quando pus `storeSubscription.updateMany(` num arquivo
   de `modules/stores/`.
6. **Os testes postos à prova com 41 erros de propósito**, um por vez, cada um desfeito em seguida
   (`git status` vazio conferido entre um e outro). **39 fizeram algum teste falhar de primeira; 2
   não fizeram**, e para cada um escrevi o teste que faltava, que depois falhou com o erro plantado:
   "a linha não é avisada de que a assinatura dela foi removida" e "uma assinatura de pé serve
   qualquer que seja o ciclo" (os três preços são diferentes, e a conferência do valor escondia a do
   ciclo). Entre os 41: **chamar o Asaas dentro da transação, com a trava segurada**; criar sem
   procurar antes; não recusar a segunda chamada com conversa em curso; não renovar a marca antes de
   criar; escrever na linha sem conferir a marca; soltar a marca depois de uma criação sem resposta;
   remover uma assinatura paga; deixar a antiga de pé na troca de ciclo; um preço escrito no código;
   comprar com a cobrança desligada; tentar sem chave; marcar a página como `ACTIVE`; não reler as
   cobranças depois de remover; deixar passar a página isenta, a ativa e a conta sem dados; não
   tentar de novo quando o cliente foi removido, e tentar de novo quando não foi; confiar na busca
   sem ler a assinatura que a linha nomeia; tomar por nossa uma assinatura de outra referência; logar
   as palavras do Asaas como vieram; ler o primeiro dia do lugar errado; vender um plano desligado;
   tomar `OVERDUE` por paga e `REFUNDED` por pendente; a busca sem a referência exata; listar uma
   removida; tomar qualquer `200` por remoção; não distinguir a criação sem resposta; escolher um
   `billingType`; mandar centavos onde o Asaas lê reais; ler "sem lista" como "nenhuma".

### No sandbox, de verdade

A API de pé (`nest start`, porta 3201, banco `harness_landing`, `BILLING_ENFORCED=true`), com a chave
de sandbox só no ambiente do comando. Código de `0eac3edb` (antes da linha de log do item 1). Uma
conta inventada, "Teste S10 Lojista A", com CPF inventado e válido, duas páginas, e uma segunda conta
só para ser a estranha. **Nada foi pago.** Tudo abaixo foi visto.

1. **A linha da subida:** `bee-link's own Asaas account is set up (SANDBOX)`, e as duas rotas
   mapeadas (`GET` e `PUT /api/stores/:storeSlug/subscription`). O Swagger montou com a rota nova.
2. **Antes dos dados de cobrança:** `409 BILLING_ACCOUNT_REQUIRED`; nada no Asaas sob a referência
   da página.
3. **Um ciclo de cada vez, cada um chamado duas vezes** (o valor, o ciclo, o `billingType`, a
   referência, a cobrança e a fatura lidos direto no Asaas depois de cada chamada):

   | Chamada | Resposta | No Asaas, de pé sob a referência da página |
   |---|---|---|
   | `MONTHLY` | `200`, `TRIALING`, 5990 | uma: `ACTIVE`, `59.9`, `MONTHLY`, `UNDEFINED`, descrição `Plano Beelink mensal — página "Teste S10 Página A"`; uma cobrança `PENDING`, `59.9`, vencimento 2026-10-13, com a fatura que a API respondeu |
   | `MONTHLY` de novo | `200`, a mesma fatura | a mesma; nenhuma outra, nem removida (1 ao todo) |
   | `SEMIANNUAL` | `200`, 32340, outra fatura | uma: `323.4`, `SEMIANNUALLY`, `UNDEFINED`; a mensal removida (2 ao todo) |
   | `SEMIANNUAL` de novo | `200`, a mesma fatura | a mesma (2 ao todo) |
   | `ANNUAL` | `200`, 57480, outra fatura | uma: `574.8`, `YEARLY`, `UNDEFINED`; a semestral removida (3 ao todo) |
   | `ANNUAL` de novo | `200`, a mesma fatura | a mesma (3 ao todo) |

   A linha da página, lida no banco depois da última: `TRIALING`, o id da assinatura anual, plano
   `beelink`, `ANNUAL`, 57480, `firstDueDate` 2026-10-13, a fatura, e nulas a marca, o fim do
   período, a forma de pagamento, a bandeira e os 4 dígitos.
4. **Ao mesmo tempo:** três `ANNUAL` juntas: uma `200` e duas `409 BILLING_SUBSCRIPTION_BUSY`, a
   mesma assinatura de pé. Quatro de ciclos diferentes juntas: uma `200` (`MONTHLY`) e três `409`;
   uma de pé (a mensal), 4 ao todo.
5. **Como uma chamada que morreu depois de o Asaas criar:** apaguei à mão o que a linha dizia do
   Asaas. A mesma escolha achou a assinatura pela referência e ficou com ela (continuaram 4 ao todo);
   a linha voltou a ter id, ciclo, preço, primeiro dia e fatura. Repetido com outro ciclo: a antiga
   foi removida e uma nova nasceu (uma de pé).
6. **O cliente removido no Asaas à mão:** as assinaturas dele sumiram junto. A escolha seguinte
   respondeu `200`; no Asaas, um cliente novo sob a referência da conta e uma assinatura de pé, dele.
7. **A segunda página da mesma conta:** assinatura própria (`SEMIANNUALLY`, `323.4`), referência
   própria, o mesmo cliente, descrição com o nome dela. A outra página não foi tocada.
8. **A estranha:** `403 STORE_FORBIDDEN`.
9. **A fatura, aberta sem pagar:** `200`, "Aguardando Pagamento", R$ 323,40, a descrição, e as quatro
   formas (boleto, Pix, crédito, débito). A de uma assinatura removida: item 2 de "O que mudou".
10. **O log da API**, lido no fim (349 linhas): a chave aparece 0 vezes, inteira ou em parte; nenhum
    nome, documento ou e-mail das contas de teste; nada de cartão; nenhuma linha de aviso ou de erro.
11. **Limpeza:** as 10 assinaturas que criei (3 no reconhecimento, 7 pela API) estão `deleted: true`
    e `INACTIVE`; os 3 clientes ("Teste S10 Reconhecimento" e os dois "Teste S10 Lojista A") estão
    `deleted: true`. A busca por "Teste S10" no nome responde 0. **A conta inteira tem uma assinatura
    viva: `teste-s8-sub-amanha-ok`** (`sub_0idkyaerpc1r1tmt`, `ACTIVE`), que só foi lida. As duas
    contas e as duas páginas de teste foram apagadas do banco; a API foi encerrada e
    `pgrep -fl "worktrees/landing"` responde vazio.

### O que não foi rodado

- **No último commit de código (`472a01eb`), por causa da parada do disco:** `tsc --noEmit`, `oxlint`
  e a suíte de unidade (rodaram em `02bec393`; desde então o código de `src/` ganhou uma chamada a
  `logger.warn` e os testes ganharam três casos), e os oito specs e2e do segundo grupo do item 4. Os
  dois specs que exercitam a linha nova rodaram nela e passaram, mas o Vitest não confere tipos.
- **A API de pé com a linha de log nova**: o sandbox foi exercitado um commit antes.
- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, a suíte e2e inteira e o Playwright:
  o briefing proíbe nesta máquina. Fica para o push.
- **Nenhum pagamento.** Tudo o que depende de uma cobrança paga (`BILLING_SUBSCRIPTION_PAID`, a
  decisão 21) só foi exercitado contra o Asaas de mentira.
- **Um 429, um 5xx e um tempo esgotado de verdade** do Asaas: só simulados. O mesmo para a criação
  sem resposta e para a cobrança que ainda não existe (decisão 23).
- **Duas instâncias da API ao mesmo tempo.** A marca foi testada com chamadas simultâneas num
  processo só, no teste e no sandbox.
- Nada em homologação nem em produção, e nada com uma chave de produção.

### O que o S3 precisa saber

- **O que a linha tem depois deste ticket:** `asaasSubscriptionId`, `planId`, `cycle`, `priceCents`,
  `firstDueDate` e `invoiceUrl`. **`status`, `currentPeriodEndsAt`, `paymentMethod`, `cardBrand` e
  `cardLast4` não são tocados aqui**: são do S3. O `invoiceUrl` fica na linha depois de pago até o
  S3 limpá-lo (ou trocá-lo pelo da cobrança seguinte, para quem paga com Pix ou boleto).
- **`firstDueDate` é o `dueDate` da cobrança mais antiga**, não o dia do pagamento. O `nextDueDate`
  da assinatura já é o da cobrança seguinte desde a criação (visto). Quem paga dias depois tem o
  primeiro período mais curto se o período seguir o Asaas: é decisão do S3.
- **"Paga", para este ticket, é qualquer cobrança que não esteja `PENDING` nem `OVERDUE`.** É de
  propósito mais largo do que o S3 vai querer (`REFUNDED`, contestação e análise de risco também
  param a conversa). O que cada uma significa para a página é do S3.
- **`409 BILLING_SUBSCRIPTION_PAID` é o lugar onde este ticket viu um pagamento e não fez nada.** É
  um bom "motivo para ir olhar": o S3 pode chamar a leitura dele ali antes de responder.
- **Escreva na linha sob a trava dela e conferindo o id.** A troca de ciclo pode estar em curso
  enquanto o S3 lê as cobranças. `StoreSubscriptions` trava a linha (`FOR UPDATE`) só na transação
  curta que pega a marca; o S3 deve marcar a página paga numa transação que trave a mesma linha e
  confira que `asaasSubscriptionId` ainda é a assinatura cujas cobranças ele leu. Não precisa da
  marca para ler; **não deve criar nem remover nada no Asaas sem ela**.
- **Nada fora de `modules/billing` escreve em `store_subscriptions`** (regra
  `api/page-subscription-in-billing`).
- **Cada troca de ciclo remove uma cobrança pendente.** O webhook vai trazer eventos de cobrança
  removida de assinaturas que a linha já não nomeia: são para ignorar. Toda cobrança traz o
  `externalReference` da assinatura (`beelink-subscription-<id da linha>`, visto) e o id dela.
- **Uma linha pode nomear uma assinatura removida** em dois casos: o pagamento que entrou durante a
  remoção (decisão 21, com erro no log), e o cliente removido no Asaas à mão (item 1 de "O que
  mudou"), que leva junto as assinaturas de **todas** as páginas da conta, inclusive de uma página
  `ACTIVE`, que deixa de renovar sem aviso. `subscription(id)` responde `deleted: true` nos dois.
- **Página `PAST_DUE`, `SUSPENDED` ou `CANCELED` pode chamar a rota.** Com uma assinatura paga de pé
  recebe `BILLING_SUBSCRIPTION_PAID`; sem nada de pé, nasce uma assinatura nova sob a mesma
  referência. "Pagar a renovação vencida" não é este ticket.
- **`PlatformAsaas` ganhou `subscriptions(referência)`**, que acha uma assinatura que a linha não
  nomeia. O 429 continua lembrado no processo.

### O que o S11 precisa saber

- **A rota:** `PUT /api/stores/:slug/subscription` com `{ cycle }` (`MONTHLY`, `SEMIANNUAL`,
  `ANNUAL`) responde `200` com `SubscriptionChoice`: `invoiceUrl` e `subscription`. Tipos em
  `packages/contracts` (`SubscriptionChoicePayload`, `SubscriptionChoice`, `BillingErrorCode`).
- **Não há volta automática.** Sem `callback`, o lojista fica na página do Asaas depois de pagar.
  Abra a fatura em outra aba e consulte o `GET` do mesmo endereço até a situação mudar (isso só
  acontece com o S3).
- **`409 BILLING_ACCOUNT_REQUIRED`** é o sinal para pedir nome e CPF/CNPJ (`PUT /billing/account`) e
  chamar de novo.
- **Os outros códigos, para a tela mapear:** `BILLING_SUBSCRIPTION_BUSY` e `BILLING_ACCOUNT_BUSY`
  (tente de novo em instantes; depois de uma criação sem resposta são até 45 s);
  `BILLING_UNREACHABLE` (o Asaas não respondeu; a mesma escolha de novo continua de onde parou);
  `BILLING_SUBSCRIPTION_PAID` (o pagamento chegou e ainda não foi aplicado: é "aguardando
  confirmação", não um erro do lojista); `BILLING_PAGE_ACTIVE`, `BILLING_PAGE_EXEMPT`,
  `BILLING_SUBSCRIPTION_MISSING`, `BILLING_PLAN_UNAVAILABLE`, `BILLING_NOT_ENFORCED` (a tela não
  deveria oferecer a compra nesses casos); `BILLING_SUBSCRIPTION_REFUSED` e
  `BILLING_CUSTOMER_REFUSED` (502); `BILLING_UNAVAILABLE` (503); `RATE_LIMITED` (429, o limite das
  escritas de loja).
- **O `GET` já traz `invoiceUrl`, plano, ciclo e preço** de uma tentativa em aberto: dá para mostrar
  "continuar o pagamento" sem chamar o `PUT`. No clique, prefira o `PUT` do mesmo ciclo, que confere
  no Asaas e devolve a mesma fatura.
- **Trocar de ciclo mata a fatura anterior.** Quem ficou com ela aberta lê "Esta fatura foi removida
  pelo seu fornecedor" (visto). Depois de abrir um boleto, é melhor não oferecer a troca logo em
  seguida (risco 2).
- **O valor cobrado é o do plano no instante do clique.** Se o preço mudou entre a tela carregar e o
  clique, o que vale é `subscription.priceCents` da resposta: mostre esse antes de mandar o lojista
  para a fatura.
- **A primeira cobrança é do dia**, mesmo com dias de teste sobrando (risco 4). A tela deveria dizer.
- **A descrição na fatura leva o nome que a loja tinha na hora da escolha.**
- **A política de privacidade** segue sem citar o CPF/CNPJ guardado para cobrança (pendência que o S9
  deixou para a tela).

### Riscos, além dos de cima

8. **Um `503` e um `502` são escritos no log como erro pelo filtro de exceções**, como todo 5xx da
   casa. Com o Asaas fora do ar e uma tela chamando a rota, é uma linha de erro por chamada.
9. **A chave inventada dos specs** (`store-subscription-key.e2e-spec.ts`, a mesma do spec do S9)
   começa com os mesmos caracteres de qualquer chave de sandbox do Asaas, porque esse começo é fixo.
   Conferi sem imprimir: nenhum trecho do resto da chave de verdade está no diff, no repositório ou
   nos arquivos de rascunho.
10. **A checagem de tipos, o lint e a suíte de unidade não rodaram no último commit** (ver "O que não
    foi rodado"). O orquestrador roda os três, e o `ci-check`, quando o disco tiver espaço.

## Acréscimo de 14/10/2026: as conferências do commit final

O que o item 10 dos riscos deixou para depois rodou no commit `453eb176`, neste worktree, com o
Postgres e o Mailpit dele (`TEST_DATABASE_URL` em `:5442`, `MAILPIT_URL` em `:8027`):

- `tsc --noEmit` da API e de `packages/contracts`: sem erro.
- `oxlint` da API: 0 erros; dois avisos antigos, em arquivos que esta branch não toca.
- Unidade da API: 133 arquivos, 1.682 testes, verdes.
- Os dez specs e2e que a branch toca (`store-subscription`, `store-subscription-key`,
  `store-subscription-not-enforced`, `store-subscription-without-key`, `billing`,
  `billing-enforced`, `billing-account`, `billing-account-key`, `billing-account-without-key`,
  `stores`): 187 testes, verdes.

O `ci-check` inteiro roda no push.
