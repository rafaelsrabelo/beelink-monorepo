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
