# BEELINK-297 (S15) — As páginas que já existiam: um mês grátis a partir de 13/10/2026

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". A branch nasce da do S6
> (`feat/BEELINK-224-cupom-um-mes`, `45bcc335`), que ainda está no PR #275 (e S10, S3, S11, S5 e S16 nos
> #270 a #274); o PR deste ticket tem `main` como base e entra depois do #275. Toca `apps/api` (uma
> migration de dados, uma tabela, três comandos e um e-mail) e a documentação (`docs/repo/deploy.md`,
> `docs/product/README.md`, `apps/api/docs/README.md`). **Nenhuma rota, nenhum tipo de fio, nenhuma
> variável de ambiente e nenhuma tela mudam.** As decisões do épico e do ticket (o Rafael, 13/10) não são
> reabertas; as que estão abaixo são do desenvolvedor. Leituras de base: os planos do S1
> (`2026-10-13--BEELINK-219--assinatura-por-pagina.md`, risco 2), do S5
> (`2026-10-15--BEELINK-223--pagina-travada.md`), do S6 (`2026-10-15--BEELINK-224--cupom-um-mes.md`) e do
> S16 (`2026-10-15--BEELINK-290--textos-da-assinatura.md`), as partes "O que o S15 precisa saber".
> Escrito em 15/10/2026, antes do código.

## O problema

Toda página que existia em 13/10/2026 ganha um mês grátis contado desse dia, até 13/11/2026, qualquer
que seja o dia em que a cobrança for ligada; depois segue a regra de todas. Hoje nada escreve esse mês,
e as páginas criadas antes do S1 nem têm linha de assinatura (e por isso nunca travam, S5). Antes de
ligar a cobrança, o Rafael também precisa saber como as páginas estão, isentar as que escolher e avisar
cada lojista, por e-mail, 7 dias antes.

O que não pode acontecer, em ordem de gravidade:

1. **O deploy estragar dado de produção**: encolher um mês grátis, mexer numa página paga ou isenta,
   duplicar uma assinatura, ou mudar alguma coisa na segunda vez que rodar.
2. **Um e-mail sair sem o Rafael pedir**, ou sair duas vezes para o mesmo lojista.
3. **Uma página ficar de graça para sempre** por não ter linha de assinatura.
4. **O aviso dizer uma data errada** de trava, ou um preço que não é o do plano.
5. **Com `BILLING_ENFORCED` desligada, alguma rota mudar de resposta.**

## Definição de Pronto

1. Num banco com páginas de antes e de depois de 13/10 (e de antes e de depois do S1), a migration grava
   o que deve, roda duas vezes sem duplicar nem mudar nada na segunda, nunca encolhe um
   `freePeriodEndsAt` e não toca página paga nem isenta.
2. O relatório bate com a contagem feita à mão no mesmo banco.
3. O aviso sai uma vez por lojista (Mailpit), com a data em que cada página dele trava e os preços lidos do
   plano; uma segunda execução não reenvia.
4. Isentar e desfazer a isenção por slug funcionam, e recusam o que não devem.
5. Com a cobrança desligada, nenhuma rota muda.
6. A ordem para ligar está em `docs/repo/deploy.md` (relatório → isentas → aviso → 7 dias → ligar), sem
   nada ligado.
7. Unidade da API, tipos, lint, os e2e que a branch toca, `arch-gates` e `docs-gate` verdes.

## Decisões

### O que é "existia em 13/10/2026"

1. **Criada antes de 14/10/2026 00:00 de Brasília**: `stores.createdAt < 2026-10-14T03:00:00Z`, que é
   `closeOfBrasiliaDay('2026-10-13')`. O dia mora numa constante, `PAGES_EXISTED_ON` em
   `billing.constants.ts`; a migration escreve os dois instantes como literais (SQL não importa
   TypeScript), e o e2e confere que eles são os da constante.
2. **O fim do mês é `freeMonthEndOf('2026-10-13')`** (S6): o fim de 13/11/2026 em Brasília,
   `2026-11-14T03:00:00Z`.

### Uma migration de dados, e não um passo de todo deploy nem um comando

3. **É uma migration do Prisma** (`20261015170000_pages_that_existed`), que o container `migrate` aplica
   no deploy, uma vez por banco (o Prisma a registra em `_prisma_migrations`), antes de a API nova subir.
   Por que não um passo do seed, que roda a cada deploy: a decisão é de um dia só, e um passo eterno
   devolveria o mês a uma página que o Rafael tivesse mudado à mão; e o seed é dado da plataforma, não das
   páginas. Por que não um comando: o mês tem de existir quando o código que o lê (o relatório, o aviso)
   entra no ar, sem depender de alguém lembrar. **O SQL também é idempotente por si**, para que rodá-lo de
   novo à mão não mude nada: cria só a linha que falta e escreve só o mês que ainda é mais cedo.
4. **Passo 1: toda página sem linha de assinatura ganha a sua**, e não só as de 13/10. Uma página sem
   linha nunca trava (S5) e ficaria de graça para sempre. As de antes do S1 são as de 13/10; mas, se a
   produção rodou código de antes do S1 depois de 14/10 (o S1 entrou na `main` em 13/10 às 14:23, e não sei
   quando foi o deploy), haverá páginas de depois de 13/10 sem linha, e essas seguem a regra de todas. A
   linha é a que `openTrial` escreve: `TRIALING`, o teste contado de `stores.createdAt` até a meia-noite de
   Brasília que fecha o sétimo dia depois do dia da criação (a mesma conta de `trialEndOf`, em SQL; o e2e
   compara as duas). As de 13/10 já nascem com o mês.
5. **Passo 2: as páginas de 13/10 que têm linha e nunca pagaram** (`TRIALING` ou `TRIAL_EXPIRED`
   gravada) recebem `freePeriodEndsAt = GREATEST(freePeriodEndsAt, fim de 13/11)`, e só onde o gravado é
   nulo ou mais cedo: nunca encolhe (uma página que usou um cupom pode ter um fim mais tarde), e a segunda
   execução não toca nenhuma linha, nem o `updatedAt`.
6. **Ficam de fora: `EXEMPT` e toda página que pagou um dia** (`ACTIVE`, `PAST_DUE`, `SUSPENDED`,
   `CANCELED`). O briefing diz "página `ACTIVE` paga"; estendo a toda página que pagou pela regra do cupom
   (S6, decisão 8): ela tem assinatura no Asaas, que segue cobrando (no cartão, sozinha), então o mês não
   seria grátis, e seria uma saída de uma renovação devida. **Em produção o conjunto é o mesmo**: com a
   cobrança desligada nenhuma página pôde pagar (a escolha do ciclo recusa `BILLING_NOT_ENFORCED`). Na
   homologação, que pode ter tido a cobrança ligada, faz diferença.
7. **A situação gravada é `TRIALING`**, como a de toda página nova; a leitura já a diz `TRIAL_EXPIRED`, e o
   relógio a grava assim na primeira volta com a trava ligada, sem travar nada durante o mês (S5). Nada
   mais da linha é escrito.
8. **Nenhuma linha em `platform_coupon_redemptions`** (S6): o mês destas páginas não é um cupom, e elas
   ainda podem usar um, cujo mês começa quando o de 13/11 acaba.
9. **Uma página com uma assinatura escolhida e não paga no Asaas** (só possível onde a cobrança já esteve
   ligada) também ganha o mês. A migration não fala com o Asaas: a tentativa fica como estava. Ela não
   cobra ninguém sozinha (sem pagamento, não há cartão guardado), e a próxima escolha de ciclo ou um cupom
   a removem.
10. **Os instantes são gravados como a API os grava**: hora de UTC sem fuso (`timezone('UTC', now())`), e
    não `CURRENT_TIMESTAMP`, que depende do fuso da sessão.

### O relatório

11. **`node dist/scripts/billing-report.js [--on AAAA-MM-DD]`**, no terminal do serviço `api`, como o
    comando do cupom. Sem `--on`, o instante é agora; com `--on`, o primeiro instante daquele dia em
    Brasília (hoje ou depois): "se a cobrança fosse ligada ao começar aquele dia, sem nada mudar até lá".
12. **Cada página cai num grupo só, nesta ordem:** isenta; sem linha de assinatura (deve ser zero depois da
    migration, e aparece para que não passe despercebida); **travaria se a cobrança ligasse naquele
    instante**, por motivo; aberta por um plano pago (ativa, na carência, ou cancelada com o período em
    curso); aberta por um período grátis, **agrupada pelo último dia** ("até 13/11/2026: 30"); aberta no
    teste. E o total. **Quem decide é `lockOf` e `statusAt`**, chamadas com o instante: o relatório nunca
    refaz a regra (S5).
13. **À parte, as páginas criadas depois de 13/10 cuja trava naquele instante é o teste vencido**
    (`TRIAL_EXPIRED`): slug, dia da criação e último dia do teste. São as que travam no dia de ligar.
14. **Diz se a cobrança está ligada neste ambiente** (`BILLING_ENFORCED` e a chave da plataforma, o mesmo par
    de `PageLocks.engaged`), para o Rafael conferir que nada trava antes da hora.

### Isentar

15. **`node dist/scripts/page-exemption.js exempt --slug <slug>`, `unexempt --slug <slug>` e `list`.**
16. **Isenta só uma página que nunca pagou** (`TRIALING` ou `TRIAL_EXPIRED` gravada) e cuja assinatura não
    está sendo conversada com o Asaas agora (a marca do S10). Um `UPDATE … WHERE` só, com essas condições:
    uma escolha de ciclo que começou no meio tira a linha do passo, e o comando diz por quê. Escreve só
    `status = EXEMPT`; o teste e o mês grátis ficam na linha, e voltam a valer se a isenção for desfeita.
17. **Recusa a página que pagou um dia**: o plano dela vive no Asaas, e isentar aqui não para a cobrança
    de lá (no cartão, sozinha). Isentar uma página paga pede cancelar a assinatura no Asaas, que é do S12.
    Uma página com uma assinatura escolhida e **não paga** é isentada, e o comando avisa que a assinatura
    continua no Asaas (sem pagamento, não cobra ninguém) e que dá para removê-la no painel do Asaas.
18. **Desfazer volta a `TRIALING`**, que a leitura diz `TRIAL_EXPIRED` se o teste acabou, porque só uma
    página que nunca pagou é isentada pelo comando. Uma isenta que tenha período pago na linha (isentada à
    mão) é recusada, com o motivo.
19. Isentar de novo uma isenta, ou desfazer numa que não é, não é erro: o comando diz e sai com 0. Uma
    página sem linha (impossível depois da migration) é recusada.

### O aviso por e-mail

20. **`node dist/scripts/charging-notice.js send --on AAAA-MM-DD`** e **`status`**. `--on` é o dia em que a
    cobrança vai ser ligada, **pelo menos 7 dias depois de hoje** em Brasília (decisão do ticket: aviso 7
    dias antes); um dia mais cedo é recusado e nada é escrito.
21. **Uma linha por lojista, para sempre**: tabela nova, `charging_notices`, única pelo `userId`, com o dia
    anunciado e as colunas de toda caixa de saída (`OutboxMailer`). O comando só escreve as linhas, num
    `INSERT … SELECT … ON CONFLICT DO NOTHING`; **quem envia é a API que está no ar**, cuja caixa de saída
    varre a tabela a cada minuto, com a trava e as tentativas de sempre. Uma segunda execução com o mesmo
    dia escreve só para quem ainda não foi avisado (ninguém, em geral) e não reenvia nada; **com outro dia,
    recusa** e não escreve nada: anunciar dois dias diferentes confundiria o lojista. Ligar depois do dia
    anunciado não pede nada; ligar antes não é permitido.
22. **Quem recebe:** o dono de ao menos uma página que nunca pagou e não é isenta (ela trava um dia, sem
    plano). Quem só tem páginas isentas ou pagas não recebe nada.
23. **O que diz, lido quando sai** (como as outras caixas de saída): o dia em que a cobrança começa; o preço
    de cada período, por página, lido do plano à venda (`PLAN_ON_SALE`) no banco; e cada página dele que
    nunca pagou e não é isenta, pelo nome e endereço, com **o dia em que ela trava sem um plano**: o
    primeiro instante, a partir do começo do dia de ligar, em que `lockOf` a trava, andando pelos
    `lockChangesAt` (uma função nova, `lockStartOf`, em `page-lock.ts`, que só chama as duas). Quando esse dia
    é depois do dia de ligar, diz também até quando ela é grátis. Uma linha cujas páginas sumiram ou foram
    isentadas depois do comando é dada como feita, sem e-mail.
24. **O texto segue o S16** (decisão 1 e a tabela da decisão 3): por página, nada cobrado sem escolher,
    cartão de crédito renova sozinho e Pix ou boleto é uma fatura nova a cada renovação, a página travada
    volta como estava ao pagar. **Não fala de cancelar nem de um canal de atendimento** (S16, decisão 8). É
    proposta, como as frases do S16, e vai inteira em "Como ficou" para o Rafael ler.
25. **Sai com a cobrança desligada**: é o que vem antes de ligá-la.

### Onde mora o código

26. Os três comandos seguem o do cupom (S6): `src/scripts/<nome>.ts` só abre o banco, e a lógica fica em
    `modules/billing/<nome>.command.ts`, com `run…Command(argv, db, io, now)` que os testes chamam,
    escrevendo no terminal (o gate proíbe `console.*`), em inglês, saída 0, 1 ou 2. **O que os quatro
    comandos têm em comum** (as opções, as recusas, os códigos de saída, abrir e fechar o banco) sai do
    comando do cupom para um arquivo só, sem cópia; o comando do cupom não muda de comportamento, e o e2e
    dele roda sem uma linha alterada.
27. Marcar `EXEMPT` escreve em `store_subscriptions`, então o comando mora em `modules/billing` (regra
    `api/page-subscription-in-billing`). A caixa de saída do aviso também (`ChargingNoticeMailer`), porque
    lê páginas, assinaturas e o plano; o texto do e-mail mora em `shared/mail/`, com os outros.
28. Nada cruza a rede: nenhum tipo novo em `packages/contracts`.

### Documentos

29. `docs/repo/deploy.md`: o que a migration fez no deploy, os três comandos, e **a ordem para ligar**
    (relatório → isentas → relatório de novo → aviso com o dia → 7 dias → ligar `BILLING_ENFORCED`), sem
    ligar nada. `docs/product/README.md`: o mês das páginas de 13/10, a isenção e o aviso.
    `apps/api/docs/README.md`: os arquivos, a tabela e os comandos.

## Fora do escopo

- Ligar a cobrança, mudar variável em homologação ou produção (S17 é o roteiro).
- Os e-mails da cobrança em si (S7): o teste acabando, a renovação, a carência.
- Remover uma assinatura no Asaas por comando, isentar uma página paga, cancelar (S12).
- Um segundo aviso, com outro dia.
- A tela de página travada (S14) e o card do plano (S2).

## Riscos

1. **Ligar a cobrança depois de 13/11/2026 trava na hora as páginas de 13/10** que não assinaram: o mês é
   contado de 13/10, qualquer que seja o dia de ligar (decisão do Rafael). O aviso diz o dia certo de cada
   página.
2. **A conta do teste em SQL é mais uma cópia** do "−03:00" (S1, "Como ficou" 4). O e2e a compara com
   `trialEndOf`.
3. **Nada impede ligar `BILLING_ENFORCED` antes do dia anunciado**: o comando só recusa anunciar um dia a
   menos de 7 dias. Está na ordem do `deploy.md`.
4. **O e-mail vai para o endereço da conta**, confirmado ou não: é o único que a Beelink tem do lojista.
5. **O aviso depende da API no ar** para sair (a caixa de saída é dela); o `status` mostra o que saiu.
6. **Na homologação, o aviso sai pelo SMTP dela**: antes de rodar o `send` lá, conferir que é uma caixa de
   teste.

## Como desfazer as migrations

A tabela dos avisos:

```sql
DROP TABLE "charging_notices";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261015160000_charging_notices';
```

O mês das páginas de 13/10 não tem desfazer exato: depois de aplicado, um `freePeriodEndsAt` de
`2026-11-14 03:00:00` não diz se veio da migration ou de outro lugar, e as linhas criadas pelo passo 1 são
iguais às de `openTrial`. O que dá para desfazer sem tocar em outra coisa:

```sql
UPDATE "store_subscriptions" SET "freePeriodEndsAt" = NULL
WHERE "freePeriodEndsAt" = TIMESTAMP '2026-11-14 03:00:00'
  AND NOT EXISTS (SELECT 1 FROM "platform_coupon_redemptions" r WHERE r."subscriptionId" = "store_subscriptions"."id");
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261015170000_pages_that_existed';
```

As linhas criadas ficam: uma página com linha é o estado de toda página nova desde o S1.

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **A tabela dos avisos é `20261015180000_charging_notices`, e não `…160000…`.** Quando ela nasceu, a
   migration de dados (`…170000…`) já estava aplicada nos bancos de teste, de desenvolvimento e de
   rascunho; uma migration com nome anterior a uma já aplicada entraria fora de ordem. O roteiro de
   desfazer acima vale com o nome novo.
2. **O que os comandos têm em comum leva também a vida do script** (`runInTerminal` em
   `billing-command.ts`: abrir o banco, rodar, fechar, o código de saída), e o script do cupom passou a
   usá-lo; cada um dos quatro scripts tem uma linha de código. O e2e do comando do cupom (24) passou sem
   uma linha alterada.
3. **`firstNameOf`** (cumprimentar pelo primeiro nome só quando a palavra é um nome) saiu do e-mail do
   entregador para `mail.templates.ts`, e o aviso o usa; os testes do e-mail do entregador (unidade, e o
   e2e com 35) passaram sem mudança.
4. **Peças pequenas que o plano não nomeava:** em `billing-dates.ts`, `openOfBrasiliaDay` (o primeiro
   instante de um dia), `daysAfter`, `dateColumnOf` e `dayOfDateColumn` (um dia como uma coluna `DATE`
   o guarda); em `billing.constants.ts`, `NEVER_PAID_STATUSES` e `isNeverPaid` (as duas situações de quem
   nunca pagou, que a isenção e o aviso leem) e `CHARGING_NOTICE_DAYS` (7).
5. **O dia anunciado vai ao SQL como texto (`'2026-11-20'::date`)**, e não como um `Date`: convertido em
   `date`, um instante depende do fuso da sessão do banco.
6. **O aviso recusa sem o plano à venda no banco** (os preços vêm dele). Visto no banco de rascunho, onde
   o seed não tinha rodado; em produção o `migrate` roda o seed a cada deploy.
7. Nada mais: as decisões 1 a 29 viraram código como estão escritas.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027). Disco: 4,8 Gi livres do começo
ao fim.

1. **A migration de dados num banco de rascunho em fases** (`harness_landing_s15_proof`, criado e
   apagado), com um config temporário do Prisma apontando para cópias da pasta de migrations: (a) até a
   migration anterior ao S1 (110 migrations), e 4 páginas plantadas **sem linha de assinatura** — de
   20/09, do último milissegundo de 13/10 em Brasília, do primeiro instante de 14/10 e de 14/10 à tarde
   (as duas últimas, como uma API de antes do S1 rodando depois do corte); (b) até o S6 (116), e 12 páginas
   **com a linha que `openTrial` escreve**, postas em cada situação: em teste, isenta, ativa paga, em
   atraso, cancelada, `TRIAL_EXPIRED` gravada, com o mês de um cupom até 21/11, com um mês grátis até
   31/10, com fatura em aberto no Asaas, e de 14/10; (c) `prisma migrate deploy` de verdade aplicou a
   migration. A tabela, por slug, antes e depois: as 4 sem linha ganharam a sua, com o teste contado da
   criação (20/09 → até 28/09 03:00; 13/10 → 21/10; 14/10 → 22/10) e o mês só nas duas de 13/10; as de
   13/10 que nunca pagaram ganharam o fim de 13/11 (a de 31/10 subiu para ele); a isenta, a paga, a em
   atraso, a cancelada, a do cupom até 21/11 e as de 14/10 ficaram exatamente como estavam, `updatedAt`
   inclusive. **Rodada de novo à mão** (`psql -1`): `INSERT 0 0`, `UPDATE 0`, e a tabela inteira com o
   mesmo md5 (`7f362c25…`). Nenhuma assinatura duplicada; o uso do cupom continuou um só.
   `prisma migrate diff` saiu com 0 nos dois sentidos nesse banco, no de desenvolvimento e no de teste
   (118 migrations em cada).
2. **Unidade, no último commit:** API, 140 arquivos e 1.847 testes (eram 138 e 1.824 no S6). Verde.
3. **Tipos e lint:** `tsc --noEmit` na API (que cobre `src/` e `test/`), saída 0; `oxlint` na API, 0
   erros e os dois avisos antigos, em arquivos que este ticket não toca. `packages/contracts`, o web e a
   UI não mudaram.
4. **e2e da API, um arquivo por vez.** Os novos: `pages-that-existed` (8), `page-exemption-command`
   (20), `billing-report-command` (10) e `charging-notice` (13). Os que a mudança alcança: 
   `platform-coupon-command` (24), `courier-applications` (35), `billing` (18), `billing-enforced` (2),
   `store-subscription-not-enforced` (9), `store-subscription-without-key` (10), `store-subscription-key`
   (9), `page-lock` (45), `platform-coupon` (26), `platform-coupon-rate-limit` (2), `stores` (19),
   `subscription-payment` (33), `store-subscription` (79), `billing-webhook` (14) e `billing-account`
   (34). **410 testes em 19 arquivos, verdes.**
5. **Os comandos compilados** (`nest build`, `node dist/scripts/…`) contra o banco de rascunho:
   - **o relatório**, agora e com `--on 2026-11-01`, bateu com a contagem feita à mão linha a linha e com
     uma contagem independente em SQL: agora, 16 páginas, 1 isenta, 0 sem linha, 0 travadas, 3 num plano
     pago (a ativa, a em atraso dentro da carência, a cancelada com período), 7 grátis até 13/11, 1 até
     21/11, 4 em teste; em 01/11, 6 travadas (teste vencido 4, suspensa 1, cancelada 1), 1 paga, as mesmas
     8 grátis, 0 em teste, e à parte as 4 de 14/10 com o último dia do teste (21/10);
   - **a isenção**: `list`; a página ativa recusada (saída 1); a com fatura em aberto isentada, com o
     aviso de que a assinatura continua no Asaas; isentar de novo, "already"; `unexempt` de volta a
     `TRIALING` com "free until 2026-11-13"; desfazer de novo, "not exempt"; um endereço que não existe,
     recusado; sem nada, o uso (saída 2);
   - **o aviso, com a API compilada de pé** (`node dist/main.js` na 3201, o banco de rascunho, a cobrança
     desligada, SMTP no Mailpit 1027): `status` "No shopkeeper was told yet", Mailpit vazio; `--on
     2026-10-21` recusado (o mais cedo era 22/10); sem os planos no banco, recusado; depois do seed (o
     comando que o `migrate` roda), `send --on 2026-11-20` escreveu 4 avisos — os 4 donos de página que
     nunca pagou; o dono só de páginas pagas não. **A varredura da API os enviou às 05:27:11**, um
     minuto depois de ela subir: 4 e-mails no Mailpit, cada um com as páginas certas e o dia certo (a do
     cupom até 21/11, "grátis até 21/11/2026… trava em 22/11/2026"; a isenta de fora). `send` de novo:
     "Queued 0… 4 shopkeepers were told already"; com `--on 2026-11-27`, recusado. **Depois da varredura
     seguinte, o Mailpit continuava com 4**, e as 4 linhas com `sentAt` e uma tentativa cada. O log da
     API: 320 linhas, nenhum aviso nem erro, e nenhum e-mail, nome ou endereço de página.
6. **Os testes postos à prova com 35 erros plantados**, um por vez, cada um desfeito por `git checkout`
   (árvore limpa conferida no fim): 7 na migration (sem o filtro de quem nunca pagou; o corte com `<=`;
   o teste de 7 dias contado como 6; o dia da criação contado em UTC; o mês a toda página sem linha;
   escrever o fim sem `GREATEST`; tocar linhas que não mudariam) e 28 no código (o relatório: listar as
   de 13/10 como "depois", só `ACTIVE` como paga, nunca contar um período grátis, toda trava como teste
   vencido, aceitar um dia passado, ler o dia pelo fim; a isenção: isentar uma página paga, isentar
   durante a escolha de um ciclo, desfazer a de uma página paga, tirar o mês grátis ao isentar; o aviso:
   aceitar um dia a menos de 7, contar 6 dias, anunciar um segundo dia, escrever dois para o mesmo dono,
   avisar quem não deve nada, falar de página isenta ou paga, dizer "grátis até" no dia em que trava,
   andar a partir do fim do dia; a caixa de saída: deixar por fazer um aviso sem página, mandar e-mail
   sem página; `lockStartOf` responder o começo, não andar; o e-mail sem o preço por mês; opção repetida;
   uma semana de 8 dias; o dia abrindo à meia-noite de UTC; uma coluna `DATE` lida em Brasília; o teste
   vencido como pago). **Os 35 foram pegos.** Um deles (o aviso falando de página paga) só pelo teste de
   unidade na primeira rodada, porque no e2e nenhum destinatário tinha página paga; o e2e ganhou uma, e
   pegou.
7. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits (`pre-commit`).

**Um tropeço meu, registrado:** na primeira rodada dos erros plantados, três não foram aplicados — a
lista usava `|` como separador e as expressões delas tinham `\|`. O roteiro disse "NOT APPLIED" e não os
contou; refeitos com tabulação como separador, os três foram pegos.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook, a suíte e2e inteira da API
  (rodaram 19 dos 108 arquivos) e o Playwright: o briefing proíbe nesta máquina. Ficam para o push.
- **A imagem de produção e o container `migrate`.** A migration rodou pelo mesmo `prisma migrate deploy`,
  na mesma pasta; os comandos rodaram do `dist/` compilado aqui. Que `dist/scripts/*.js` chega à imagem é
  **inferido**, como no S6: o `.dockerignore` deixa o `dist/` de fora, a imagem recompila todo o `src`
  (`tsconfig.build.json` inclui `src/scripts`) e o `pnpm deploy` leva o `dist/` inteiro.
- O e-mail num programa de e-mail de verdade (Gmail, Outlook): visto só o texto, no Mailpit; o HTML só
  pelos testes de unidade.
- Homologação e produção; duas instâncias da API. Nada aqui fala com o Asaas.

### O aviso, para ler de uma vez (pt-BR, proposta no tom do S16)

**Assunto:** "A cobrança das páginas na Beelink começa em {dia}"

> Olá, {primeiro nome}.
>
> A cobrança das páginas na Beelink começa em {dia}. A partir daí, cada página precisa de um plano para
> continuar no ar, depois do tempo grátis que ela ainda tiver. O valor é por página:
>
> - Mensal: R$ 59,90
> - 6 meses: R$ 323,40 (R$ 53,90 por mês)
> - 1 ano: R$ 574,80 (R$ 47,90 por mês)
>
> Suas páginas: (ou "Sua página:")
>
> - {Nome} (beelink.biz/{endereço}): grátis até 13/11/2026. Sem um plano, ela trava e sai do ar em 14/11/2026.
> - {Nome} (beelink.biz/{endereço}): sem um plano, ela trava e sai do ar em {dia}.
>
> A partir de {dia}, você escolhe o plano no painel de cada página e paga a fatura com cartão, Pix ou
> boleto. Nada é cobrado sem você escolher. Com cartão de crédito, o plano renova sozinho; com Pix ou
> boleto, cada renovação é uma fatura nova, que aparece no painel.
>
> Uma página travada não perde nada do que tem: assim que o plano é pago, ela volta ao ar como estava.
>
> Equipe Beelink

Os preços vêm do plano no banco, e cada data da linha da página. Sem botão, sem link, sem falar de
cancelar nem de um canal de atendimento (S16, decisão 8). O texto mora em
`apps/api/src/shared/mail/charging-notice.template.ts`.

### Os comandos que o Rafael roda, em produção, e a ordem

Depois que esta branch (e a pilha de baixo, #270 a #275) estiver na `main` e no ar — a migration roda no
`migrate` do deploy e dá o mês sozinha —, no Dokploy, o serviço `api` da stack, **Terminal** (em `/app`):

1. `node dist/scripts/billing-report.js --on <AAAA-MM-DD>` — como as páginas estarão no dia de ligar.
2. `node dist/scripts/page-exemption.js exempt --slug <endereço>`, uma vez por página que não paga (as do
   Rafael, as de teste, a loja-piloto); depois `node dist/scripts/page-exemption.js list` e o relatório de
   novo.
3. `node dist/scripts/charging-notice.js send --on <AAAA-MM-DD>` — o dia de ligar, 7 dias depois ou mais;
   depois `node dist/scripts/charging-notice.js status` até todos estarem "done".
4. Esperar os 7 dias.
5. Ligar: `BILLING_ENFORCED=true` ao lado de `ASAAS_PLATFORM_API_KEY` no Environment, e redeploy. O
   relatório mais uma vez.

`docs/repo/deploy.md`, "Switching charging on", tem o mesmo.

### O que o S17 (o roteiro para ligar) precisa saber

- **A ordem e os comandos estão em `docs/repo/deploy.md`, "Switching charging on"**: aponte para lá.
- **O aviso sai uma vez por lojista, para sempre, e com um dia só.** Em produção ele é tiro único: o texto
  (proposta, como os do S16) precisa da aprovação do Rafael antes do `send`. Ligar depois do dia anunciado
  não pede nada; ligar antes quebra o que o e-mail prometeu, e nada no sistema impede.
- **O aviso diz "a partir de {dia}, você escolhe o plano no painel de cada página"**: o caminho até a tela
  Assinar (o card do S2, o aviso do S14) precisa estar no ar nesse dia.
- **Ligar depois de 13/11/2026 trava na hora as páginas de 13/10** que não assinaram nem foram isentadas;
  as criadas depois de 13/10 com o teste vencido também travam no dia de ligar (o relatório as lista, e o
  aviso diz o dia a cada dono).
- **Na homologação**, a migration roda no deploy dela (as páginas de lá criadas antes de 14/10 ganham o
  mês). O roteiro pode exercitar: o relatório com `--on`; isentar e desfazer uma página; o `send` — **só
  com o `SMTP_URL` da homologação numa caixa de teste** —, um minuto, e o `status`; e o fim do mês,
  adiantando `freePeriodEndsAt` no banco (`UPDATE store_subscriptions SET "freePeriodEndsAt" = timezone('UTC', now()) WHERE …`, hora de UTC como as colunas guardam),
  para ver a página travar.
- **Isentar uma página que já pagou não é possível por comando**: o plano dela vive no Asaas. Fica para o
  S12 (cancelar) ou para o Rafael no painel do Asaas.
- **O e-mail diz o endereço da página com o host de `WEB_URL`** (`beelink.biz/<endereço>` em produção).

### O que o S14 e o S2 precisam saber

- **Depois do deploy, toda página tem linha de assinatura**: `subscription: null` na leitura vira caso de
  banco mexido à mão. As páginas de 13/10 leem `freePeriodDaysLeft` até 13/11 e `freePeriodLastDay`
  `2026-11-13`, com `couponRedeemedAt` nulo; a partir de 14/11, as que não assinaram leem `lock:
  TRIAL_EXPIRED` com `freePeriodLastDay` presente — o "Seu mês grátis acabou" (`FREE_PERIOD_OVER`).
- **Uma página isenta lê `status: EXEMPT` e `lock` nulo**: o card some (S2), a tela Assinar leva ao painel
  (S11).

### O que o S7 (os e-mails da cobrança) precisa saber

- `charging_notices` é a caixa de saída de um aviso só, um por conta para sempre; os e-mails do S7 (o
  teste acabando, a renovação, a carência) são outros e precisam da sua. O texto do aviso está no tom do
  S16 e pode servir de base.

### Riscos, além dos de cima

7. **O texto do aviso é proposta** e espera a aprovação do Rafael, com os do S16 e do S6.
8. **Um aviso dado como desistido** (5 tentativas sem sair) não é reenviado sozinho: o `status` mostra o
   endereço, para o Rafael avisar de outro jeito.
