# BEELINK-219 (S1) — API: planos, a assinatura de cada página e o teste de 7 dias

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Primeiro ticket de código: sai de `main`
> (`7c90a4b7`) e o PR tem `main` como base. Toca `packages/contracts` e `apps/api`; em `apps/web` muda
> só um comentário. **Nenhuma tela e nenhuma chamada ao Asaas.** As decisões do épico (por página, 7
> dias, preços, situações, fatura do Asaas, `BILLING_ENFORCED`) são do Rafael e não são reabertas
> aqui; as que estão abaixo são do desenvolvedor. A investigação em que o épico se apoia é
> `2026-10-13--BEELINK-289--como-o-lojista-paga.md`. Escrito em 13/10/2026.

## O problema

Hoje nada na plataforma sabe o que uma página deve à Beelink. Os preços existem só na landing
(`apps/web/src/lib/plans.ts`), e uma `Store` não tem teste, plano nem data nenhuma. Os tickets
seguintes (cliente no Asaas, assinatura, leitura das cobranças, cupom, trava) precisam de um lugar
para escrever, e esse lugar precisa estar certo antes do primeiro deles.

Este ticket entrega o modelo, os planos no banco, o teste de 7 dias nascendo junto com a página, as
duas leituras (planos e assinatura) e as funções de data. Depois dele o produto continua igual para
quem usa: nada trava e nenhuma tela mostra plano.

## Definição de Pronto

1. A migration aplica num Postgres de verdade; `prisma migrate diff` entre o banco e o schema não
   acha diferença; o seed cria os planos, e rodá-lo duas vezes não duplica nem muda nada.
2. Uma página nova nasce em `TRIALING`, com o fim do teste gravado, na transação que a cria; se a
   criação da página falha, não sobra assinatura (e, no outro sentido, se a assinatura não grava, não
   sobra página).
3. A leitura da assinatura responde só ao dono da página, com o que as outras rotas do painel
   respondem a quem não é (`403 STORE_FORBIDDEN`, `404 STORE_NOT_FOUND`, `401` sem sessão); uma
   página sem assinatura responde `200`, nunca `500`.
4. A lista de planos é pública e traz só os ativos, com os três preços do Beelink.
5. As funções de data têm teste de unidade: o dia em que o teste termina, os dias restantes, e o fim
   do período de 1, 6 e 12 meses pela regra do Asaas, com dia 31, fevereiro, ano bissexto e virada de
   ano.
6. Os tipos de fio estão em `packages/contracts` e a API os usa (`import type`, `satisfies`,
   `implements`).
7. Com `BILLING_ENFORCED` desligada, nenhuma rota que existia muda de resposta.
8. Suíte de unidade da API, tipos, lint, os e2e que a branch toca, `arch-gates` e `docs-gate` verdes.

## Decisões

### O modelo (`prisma/schema/billing.prisma`)

Três tabelas: `plans`, `billing_accounts` e `store_subscriptions`. A pergunta que guiou cada coluna
foi "quem escreve isto, em qual ticket, e o que ele precisa ter em mãos na hora?".

1. **`plans`**: `slug` (a chave do seed), `name`, `active`, e três colunas de preço em centavos:
   `monthlyPriceCents` (obrigatória), `semiannualPriceCents` e `annualPriceCents` (nulas quando o
   plano não é vendido naquele ciclo, como o Beelink + Beelia). Cada preço é o valor **do ciclo
   inteiro** (R$ 323,40 pelos seis meses), que é o que o Asaas cobra. **Colunas, e não uma tabela de
   preços:** o ciclo já é um conjunto fechado (é enum do banco e é o `cycle` do Asaas), então um
   ciclo novo é uma migration de qualquer jeito, e três colunas leem e semeiam em uma linha.
2. **A assinatura tem `id` próprio** e `storeId` único, com `ON DELETE CASCADE`: uma por página,
   apagada com ela. Não usei `storeId` como chave primária (o costume das linhas de configuração
   daqui) porque esta linha vai ser nomeada fora do banco (o `externalReference` da assinatura no
   Asaas, S10) e por linhas que ainda vão existir (as cobranças que o S3 aprende): com um nome
   próprio, nenhuma delas carrega o id da loja como se fosse o da assinatura.
3. **`status`** é o enum da decisão 4 do épico, com padrão `TRIALING`. **A parte do relógio é
   derivada na leitura:** uma linha `TRIALING` cujo `trialEndsAt` já passou é lida como
   `TRIAL_EXPIRED` (`subscription-status.ts`), tenha ou não alguma rotina gravado isso. Neste ticket
   nenhuma rotina grava; quando uma existir (para consultar por situação, ou para o e-mail do S14),
   gravar `TRIAL_EXPIRED` não contradiz a leitura.
4. **`trialStartedAt` e `trialEndsAt` são obrigatórias.** Toda página tem uma janela de teste, por
   definição (decisão 2: "7 dias a partir da criação da página"). Para as páginas que já existem, o
   S15 escreve os 7 primeiros dias delas (`stores.createdAt`), que é verdade pela regra, mais o mês
   grátis em `freePeriodEndsAt`. Deixar as duas nulas não compraria nada: sempre existe um valor.
5. **`planId`, `cycle` e `priceCents` nascem nulas e andam juntas** (`CHECK`: as três ou nenhuma). No
   teste a página não escolheu nada; quem escolhe é o lojista, no S10. `planId` com `ON DELETE
   RESTRICT`: um plano em uso não se apaga, desativa-se.
6. **`priceCents` não estava na lista do briefing, e eu a incluí.** É o que o ciclo custa **a esta
   página**, como foi combinado na contratação. O preço do plano muda pelo seed a cada deploy; a
   assinatura no Asaas guarda o `value` com que nasceu. Sem esta coluna, no dia em que o preço mudar
   o painel mostraria a quem já paga um valor que não é o que ele paga. O S10 a escreve junto com o
   plano e o ciclo.
7. **Os três "fins" são instantes, e exclusivos:** `trialEndsAt`, `currentPeriodEndsAt` e
   `freePeriodEndsAt` guardam **o primeiro instante em que aquilo já acabou**. Assim a trava (S5)
   compara as três do mesmo jeito (`agora >= fim`), e a política de "até que horas do dia vale" fica
   com quem escreve, uma vez, e não espalhada por quem lê. Preferi instante a `DATE` porque um
   instante representa qualquer política (o fim do dia do vencimento, uma tolerância) sem migration.
8. **`firstDueDate` também não estava na lista, e eu a incluí** (`DATE`, um dia do calendário de
   Brasília, como vai ao Asaas). É o dia da primeira cobrança da assinatura, e é **a âncora da regra
   da decisão 8**: a renovação se conta a partir dele, nunca da renovação anterior. De 31/10 a
   primeira renovação é 30/11; a segunda é 31/12, e não 30/12. Quem só tem "o fim do período atual"
   (30/11) e o ciclo não consegue calcular 31/12. O S10 conhece esse dia (é o `nextDueDate` que ele
   envia) e o grava; se o ciclo muda, a assinatura no Asaas é outra e a âncora também.
9. **`paymentMethod`** é um enum nosso de quatro valores: `CREDIT_CARD`, `DEBIT_CARD`, `PIX`,
   `BOLETO`. O briefing diz "cartão, Pix ou boleto"; **incluí o débito** porque a fatura do Asaas foi
   vista oferecendo as quatro formas (teste 19 da investigação), e um valor que falta num enum do
   banco vira erro de escrita no S10. Nula até o Asaas dizer. Não reusei o `PaymentMethod` das
   lojas: aquele é "o que a loja aceita no balcão" (tem dinheiro, não tem boleto).
10. **`invoiceUrl`** (`VARCHAR(500)`, como em `order_payments`): a fatura em aberto, nula quando não
    há cobrança esperando.
11. **Do cartão, só `cardBrand` e `cardLast4`** (decisão 11). A bandeira é texto, a palavra do Asaas
    (`VISA`, `MASTERCARD`…): é vocabulário de terceiro, e uma bandeira nova não pode ser uma
    migration. Os 4 dígitos têm `CHECK` de quatro dígitos, e as duas colunas andam juntas (`CHECK`).
    Não existe coluna para número, titular, validade nem token.
12. **`asaasSubscriptionId`**: `VARCHAR(64)`, nula, única (como `order_payments.providerId`).
13. **`cancelRequestedAt`**: quando o lojista pediu o cancelamento. A página segue até
    `currentPeriodEndsAt`, que é uma data nossa (o Asaas apaga a assinatura na hora).
14. **O cliente do Asaas mora em `billing_accounts`, uma tabela pequena, e não em `users`.** Motivos:
    (a) `users` guarda também as contas dos clientes das lojas, para quem a coluna não faz sentido;
    (b) é dado de cobrança da plataforma, e `auth.prisma` não deveria saber do Asaas; (c) o S9 vai
    precisar guardar coisas ao redor do cliente (o CPF/CNPJ, se decidir guardá-lo, ou a marca de que
    um pedido de criação está em curso), e uma tabela própria recebe isso sem tocar na tabela de
    contas. A chave é o `userId` (uma por conta, `ON DELETE CASCADE`); `asaasCustomerId` é **nula e
    única**, para o S9 poder criar a linha antes de chamar o Asaas, como `OrderPayments` faz com a
    cobrança. **Nenhuma linha é escrita neste ticket.**
15. **A assinatura não aponta para a conta de cobrança.** O caminho já existe (assinatura → página →
    dono → conta de cobrança); um segundo caminho é um que pode discordar do primeiro.
16. **Sem `CHECK` que dependa da situação** ("`ACTIVE` exige `currentPeriodEndsAt`"). O que cada
    situação exige é regra do S3, do S5 e do S6, e uma `CHECK` que adivinha a regra errada é
    justamente a coluna que custa uma migration depois. As `CHECK` daqui só prendem o que é verdade
    em qualquer situação.
17. **Sem índices além dos únicos e do `planId`.** A tabela tem uma linha por página. A varredura que
    precisar de um (S5, S14) cria o seu, sabendo o que consulta.
18. **O CPF/CNPJ do lojista não é guardado aqui.** O S9 decide se guarda ou se só repassa ao Asaas.

### O teste e as datas (`billing-dates.ts`)

19. **O teste termina à meia-noite de Brasília que fecha o sétimo dia depois do dia da criação.**
    Página criada em 13/10, a qualquer hora: o último dia do teste é 20/10, e ela deixa de estar em
    teste em 21/10 às 00:00 (−03:00). Preferi isso a "168 horas exatas" por três motivos: o lojista
    nunca recebe menos que 7 dias inteiros (recebe 7 dias e o resto do dia em que criou); a trava
    nunca cai no meio do expediente da loja; e "o dia em que o teste termina" é um dia só, igual
    para o aviso, o e-mail e a trava. Custa à Beelink, no máximo, um dia a menos de um instante.
20. **Dias restantes** são dias do calendário de Brasília até o último dia do teste: 7 no dia da
    criação, 1 na véspera, 0 no último dia ("termina hoje") e depois dele. São calculados a partir do
    `trialEndsAt` gravado, não de uma conta refeita: uma linha escrita pelo S15 lê do mesmo jeito.
21. **Brasília é −03:00 fixo**, como no resto da API (`payments/payment-terms.ts`,
    `reports/report-period.ts`): o Brasil não tem horário de verão desde 2019.
22. **A renovação se conta da primeira cobrança** (`renewalDayOf(primeiroDia, ciclo, n)`): o mesmo
    dia do mês, recuando para o último dia quando o mês não o tem, sempre a partir da âncora. É a
    sequência que o sandbox mostrou (31/10, 30/11, 31/12, 31/01, 28/02, 31/03, 30/04, 31/05), e ela
    está no teste como está na investigação. O anual que nasce em 29/02 volta a cair em 29/02 no
    próximo ano bissexto: **isso é a regra aplicada, não algo visto no sandbox.**
23. **As funções de período respondem dias (`AAAA-MM-DD`)**, que é como o Asaas fala. Até que instante
    desse dia a página segue em dia é política do S3; `closeOfBrasiliaDay` transforma um dia no
    instante que o fecha, que é o que o teste usa.

### As leituras

24. **`GET /api/billing/plans`**, pública: `PlanCatalog`, com `trialDays` e os planos ativos, do mais
    barato por mês para o mais caro. Cada plano traz só os ciclos em que é vendido, cada um com
    `cycle`, `months` e `priceCents`. Um objeto, e não um vetor solto: os dias de teste fazem parte
    da oferta tanto quanto os preços, e é exatamente o que `PLAN_PRICES` guarda hoje no web. Assim o
    S11 troca uma cópia pela outra sem mudar de forma.
25. **`GET /api/stores/:storeSlug/subscription`**, do dono: `StoreSubscriptionAnswer`, com
    `billingEnforced` e `subscription`.
26. **Página sem assinatura: `200` com `subscription: null`.** Não é erro: é o estado de toda página
    criada antes deste ticket, até o S15. Um `404` obrigaria o web a tratar um erro como caso normal
    e esconderia o `billingEnforced`.
27. **A situação que a leitura responde é a que vale agora** (decisão 3 acima), com `trialLastDay`
    (o dia, já em Brasília) e `trialDaysLeft` prontos, para nenhum cliente fazer conta de fuso.
28. **Os ids do Asaas não vão no fio.** O painel não tem o que fazer com eles.
29. **Dois controllers**, porque `@ApiBearerAuth()` numa classe com rota pública marcava a rota
    anônima como fechada no Swagger (nota de `apps/api/docs/README.md`).

### O seed

30. **`prisma/seed/plans.sql`** é um `INSERT … ON CONFLICT (slug) DO UPDATE`, como o das categorias.
    **O seed é o dono do nome, do `active` e dos preços:** o que for mudado à mão no banco volta ao
    que o arquivo diz no deploy seguinte. Ativar o plano com a Beelia é trocar `false` por `true`
    nesse arquivo. Nunca apaga.
31. **O comando do seed passa a ser `node prisma/seed/run.mjs`**, que executa cada arquivo, em ordem,
    com o mesmo `prisma db execute --file`. Motivo: o Prisma 7 roda `migrations.seed` **sem shell**
    (li no código do CLI: o comando é partido nos espaços e executado), então `a && b` não funciona,
    e `db execute` aceita um arquivo só. A alternativa era juntar tudo num arquivo; preferi não
    renomear `store-categories.sql`, que um teste (`template-catalog.spec.ts`) e a documentação citam
    pelo nome, nem pôr os planos num arquivo que se chama "categorias".

### A chave

32. **`BILLING_ENFORCED`**, `false` por padrão, em `env.ts`, `.env.example` e
    `docker-compose.dokploy.yml`. Neste ticket ela só aparece na leitura da assinatura.
33. **A assinatura da página nova é gravada com a chave ligada ou desligada.** O briefing diz "toda
    página nova nasce em `TRIALING`", e uma linha gravada só com a chave ligada faria o dia de ligar
    depender de um S15 maior. A consequência está em "Riscos".

## Fora do escopo

- Qualquer chamada ao Asaas, e o cliente da plataforma para ele (S9, S10).
- Quem move a situação (S3) e a trava (S5). Aqui a única mudança de situação é a derivada na leitura.
- O cupom e o mês grátis (S6); as páginas que já existem (S15); telas (S2, S11); e-mails (S14).
- Uma rotina que grave `TRIAL_EXPIRED`.
- Mudar a landing: `apps/web/src/lib/plans.ts` segue sendo a cópia dela.

## Riscos

1. **Os preços existem em dois lugares** até o S11: `apps/web/src/lib/plans.ts` (o que a landing
   mostra) e `apps/api/prisma/seed/plans.sql` (o que a cobrança vai cobrar). **Os dias de teste
   também:** `trialDays` lá e `TRIAL_DAYS` em `billing-dates.ts`. Quem mudar um precisa mudar o
   outro; os dois arquivos dizem isso no comentário, e nada automático confere.
2. **Páginas criadas depois deste deploy e antes de a cobrança ser ligada** têm o teste contado da
   criação. No dia em que `BILLING_ENFORCED` for ligada, as que passaram de 7 dias leem
   `TRIAL_EXPIRED`. O S15 fala das páginas "que existiam em 13/10/2026"; as criadas depois disso
   precisam ser olhadas antes de ligar a chave.
3. **`run.mjs` não foi exercitado dentro do container `migrate`** (não construí a imagem). Rodei o
   mesmo comando que o container roda, na mesma pasta. Se o seed falhar em produção, o deploy para
   antes de a API subir, como já acontece hoje com uma migration que falha.
4. **O seed sobrescreve o que for mudado à mão** em `plans` (decisão 30).
5. **As duas colunas a mais** (`priceCents`, `firstDueDate`) e o quarto valor de `paymentMethod` são
   escolhas minhas além da lista do briefing. Se o S10 não as quiser, são colunas nulas que ninguém
   escreve, e tirá-las é uma migration pequena.

## Como desfazer a migration

```sql
DROP TABLE "store_subscriptions";
DROP TABLE "billing_accounts";
DROP TABLE "plans";
DROP TYPE "SubscriptionPaymentMethod";
DROP TYPE "SubscriptionStatus";
DROP TYPE "BillingCycle";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013162400_billing_plans_and_subscriptions';
```

Apaga os planos e a situação de toda página. Só faz sentido antes de o S9 escrever alguma coisa.

---

## Como ficou (acréscimo de 13/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **O seed só escreve a linha que ele realmente mudaria.** O `ON CONFLICT … DO UPDATE` de
   `plans.sql` ganhou um `WHERE … IS DISTINCT FROM …`. Sem ele, cada deploy empurrava o `updatedAt`
   dos dois planos, e a coluna passava a dizer "quando foi o último deploy". Com ele, rodar o seed de
   novo não toca em nada (conferido pelo `updatedAt` e por um resumo das linhas, antes e depois), e
   `updatedAt` diz quando o plano mudou de verdade. O item 1 da Definição de Pronto ("não duplica nem
   muda nada") vale ao pé da letra.
2. **O teste começa no `createdAt` da própria linha da página**, lido no `select` do `create`, e não
   num `new Date()` do servidor. "7 dias a partir da criação da página" fica exato, e a coluna
   `trialStartedAt` é igual a `stores.createdAt` (conferido no banco).
3. **O precedente da tabela pequena já existia:** `asaas_customers` (BEELINK-204) guarda, numa tabela
   à parte, o id que o cliente de uma loja tem no Asaas **da loja**, com o CPF pelo qual foi achado.
   `billing_accounts` é o mesmo desenho para o lojista no Asaas **da plataforma**. As duas não se
   misturam: uma é da conta de cada loja, a outra é da conta da Beelink.
4. **A conta de dias de Brasília ganhou uma quarta cópia.** `payments/payment-terms.ts`,
   `reports/report-period.ts` e `orders/business-days.ts` já têm cada um o seu "−03:00".
   `billing-dates.ts` não importa de nenhum deles de propósito (a cobrança da plataforma não depende
   do módulo de pagamentos das lojas), mas juntar as quatro num lugar só é uma limpeza que vale um
   ticket próprio.
5. **Os conjuntos fechados são presos aos dois lados** em `billing.constants.ts`: cada objeto
   `satisfies` o tipo do fio e o enum do banco ao mesmo tempo. Uma palavra a mais num dos dois, sozinha,
   não compila (conferi os três sentidos num arquivo à parte, com o `tsc` do repositório).
6. **O texto do seed não promete preço antigo a quem já paga.** A primeira versão do comentário dizia
   que quem paga "mantém o que combinou". Isso é uma regra de produto que ninguém decidiu. O que o
   arquivo diz agora é o fato: mudar o preço ali não alcança a assinatura que já existe no Asaas, e
   aumentar o que uma página paga é uma decisão à parte.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027).

1. **A migration, do zero**, num banco de rascunho (`harness_landing_s1_proof`, criado e apagado):
   `prisma migrate deploy` aplicou as 111 migrations ("All migrations have been successfully
   applied."); `prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code`
   respondeu "No difference detected." e saiu com 0. No sentido inverso (`--from-schema …
   --to-config-datasource`), o mesmo.
2. **O seed, duas vezes**, pelo comando que o container roda (`pnpm exec prisma db seed`, na pasta
   `apps/api`): 2 planos e 14 categorias depois da primeira; os mesmos 2 planos, com os mesmos ids e o
   mesmo `updatedAt`, depois da segunda. Um preço e um `active` mudados à mão voltaram ao que o
   arquivo diz na rodada seguinte.
3. **As `CHECK` e as chaves**, com `INSERT` à mão no banco de rascunho: preço zero, teste que acaba
   antes de começar, ciclo sem plano, bandeira sem dígitos, letras no lugar dos dígitos, segunda
   assinatura da mesma página e apagar um plano em uso foram recusados; um número de cartão inteiro
   não cabe na coluna (`value too long for type character(4)`); apagar a página apagou a assinatura, e
   apagar a conta apagou a conta de cobrança.
4. **O roteiro de desfazer** deste plano rodou como está escrito; depois dele o `migrate diff` voltou
   a pedir a migration inteira, e ela aplicou de novo.
5. **Unidade:** `pnpm --filter api test`, 126 arquivos e 1534 testes, todos passando. Os de data
   (63) foram postos à prova com quatro versões erradas de propósito (teste de 168 horas exatas,
   renovação encadeada, dias contados em UTC, Brasília lida como UTC): todas fizeram testes falhar. Os
   mesmos testes passam com `TZ=Asia/Tokyo`.
6. **e2e, um arquivo por vez:** `billing.e2e-spec.ts` (18), `billing-enforced.e2e-spec.ts` (2) e
   `stores.e2e-spec.ts` (19, o que cobre a criação da página), todos passando. O teste "não cria
   página sem assinatura" falhou, como devia, quando a escrita do teste foi posta depois do commit da
   página.
7. **Tipos e lint:** `tsc --noEmit` na API e em `packages/contracts`, sem erro; `oxlint` na API, sem
   erro (dois avisos, em arquivos que este ticket não toca); `eslint` no único arquivo do web
   alterado. `pnpm arch-gates` e `pnpm docs-gate` verdes.
8. **A API de pé** (`nest start`, porta 3201, banco `harness_landing` com a migration e o seed): o
   documento do Swagger montou com as duas rotas; `GET /api/billing/plans` sem sessão respondeu os
   três preços; duas contas inventadas criaram duas páginas, e a leitura respondeu `TRIALING`,
   `trialEndsAt` em `2026-10-21T03:00:00.000Z`, `trialLastDay` `2026-10-20` e 7 dias; a estranha
   recebeu `403 STORE_FORBIDDEN`, um slug que não existe `404`, e sem sessão `401`; com a linha da
   assinatura apagada à mão, `200` e `subscription: null`. O log não teve nenhuma linha de erro ou
   aviso. As contas foram apagadas e o processo encerrado.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, a suíte e2e inteira e o Playwright:
  o disco não deixava. O `ci-check` fica para o push.
- A imagem Docker e o container `migrate`: o `run.mjs` só rodou nesta máquina.
- Nada em homologação nem em produção.
