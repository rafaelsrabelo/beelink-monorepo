# BEELINK-224 (S6) — Cupom da plataforma: um mês grátis para a página

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". A branch nasce da do S16
> (`feat/BEELINK-290-textos-da-assinatura`, `56d5c674`), que ainda está no PR #274 (e S10, S3, S11 e S5
> nos #270 a #273); o PR deste ticket tem `main` como base e entra depois do #274. Toca
> `packages/contracts`, `apps/api` (o modelo, a rota, o comando), `apps/web` (a rota do BFF e a tela
> Assinar) e `packages/ui` (o campo do cupom e as frases). As decisões do épico não são reabertas; as
> que estão abaixo são do desenvolvedor. Leituras de base: os planos do S1
> (`2026-10-13--BEELINK-219--assinatura-por-pagina.md`), do S10 (`…BEELINK-292…`, a conversa com o
> Asaas), do S3 (`2026-10-14--BEELINK-221--pagamento-da-assinatura.md`), do S11
> (`2026-10-15--BEELINK-293--tela-assinar.md`), do S5 (`2026-10-15--BEELINK-223--pagina-travada.md`) e do
> S16 (`2026-10-15--BEELINK-290--textos-da-assinatura.md`), as partes "O que o S6 precisa saber".
> Escrito em 15/10/2026, antes do código.

## O problema

O Rafael quer "um cupom de desconto pra usar um mês". O épico já decidiu o que ele é (decisão 9): **um
mês grátis para a página, e não desconto**; nada é criado no Asaas nesse mês; uma vez por página; com
código, validade e limite de usos opcionais; cadastrado por comando enquanto o backoffice não existe. O
S1 deixou a coluna `store_subscriptions.freePeriodEndsAt` e o S5 já a respeita (a página não trava
enquanto ela está no futuro). Falta tudo o que a escreve: o cupom, o uso, a rota que o aplica, o
comando que o cadastra e o campo na tela Assinar.

O que não pode acontecer, em ordem de gravidade:

1. **Um cupom dado além do limite**, ou duas vezes à mesma página: é dinheiro que a Beelink deixa de
   receber. Tem de valer com duas chamadas ao mesmo tempo, provado por teste.
2. **Um código de verdade no repositório**, que é público.
3. **O cupom deixar uma assinatura viva no Asaas cobrando durante o mês grátis**, ou apagar uma
   cobrança paga.
4. **A tela mentir para uma página no mês grátis**: as frases de situação falam da trava (S16, risco 4).
5. **Uma página travada não conseguir usar o cupom** porque a trava fecha a rota dele.

## Definição de Pronto

1. Testes mostram o cupom válido numa página em teste, numa com o teste vencido e numa travada; e as
   recusas: código inexistente, desativado, vencido, esgotado (inclusive dois usos ao mesmo tempo no
   último), e repetido na mesma página.
2. O comando cria, lista e desativa, e chega à imagem de produção.
3. Nenhuma chamada ao Asaas no caminho do cupom, a não ser a remoção de uma tentativa em aberto
   (decisão 10).
4. A leitura da assinatura diz que a página está no mês grátis e até quando.
5. A tela Assinar tem o campo do cupom, diz o resultado em frase clara e leva a página de volta ao
   painel destravada.
6. Unidade, tipos, lint, os e2e tocados, os testes do web e do `packages/ui`, `arch-gates` e
   `docs-gate` verdes.

## Decisões

### O modelo (`prisma/schema/billing.prisma`)

1. **Duas tabelas: `platform_coupons` (o cupom) e `platform_coupon_redemptions` (o uso).** "platform"
   porque `coupons` e `coupon_redemptions` já são os cupons das lojas (BEELINK-190), e os dois nunca se
   misturam: um é da loja para o cliente dela, o outro é da Beelink para a página.
2. **O cupom:** `code` (`VARCHAR(30)`, único, guardado sem espaços nas pontas e em maiúsculas: A–Z, 0–9,
   `-` e `_`, de 3 a 30 caracteres, por um `CHECK` — a mesma forma do cupom das lojas, para o lojista
   digitar um como digita o outro); `expiresAt` (o primeiro instante em que já não vale: a meia-noite
   de Brasília que fecha o último dia dado no comando; nulo, sem validade); `maxRedemptions` (nulo, sem
   limite; `CHECK` maior que zero); `redemptionCount` (quantas páginas o usaram); `disabledAt` (nulo,
   ativo); `createdAt`, `updatedAt`. **Nenhum valor nem duração:** o cupom dá sempre um mês (decisão do
   épico); uma coluna de "quantos meses" seria uma regra que ninguém decidiu.
3. **O uso:** `couponId` (`RESTRICT`: um cupom usado não se apaga, desativa-se); `subscriptionId`,
   **único**, a assinatura da página (`CASCADE` com ela); `freePeriodStartsAt` e `freePeriodEndsAt`, o
   mês que esse uso deu, para conferir depois; `createdAt`, quando. A assinatura, e não a `Store`, porque
   a linha da assinatura é a página para a cobrança (uma por página, apagada com ela) e a leitura da
   assinatura traz o uso numa junção direta.
4. **O limite sob concorrência.** O contador sobe por um `UPDATE … WHERE` que só passa enquanto o
   cupom vale (ativo, no prazo, abaixo do limite), na mesma transação que grava o uso e o mês. Com duas
   transações no último uso, a segunda espera a trava da linha do cupom e o Postgres confere o `WHERE`
   de novo com o valor já gravado: ela não atualiza nada e recusa `BILLING_COUPON_EXHAUSTED`. O
   `CHECK ("redemptionCount" <= "maxRedemptions")` é a segunda barreira: nem um erro do código passa do
   limite. **Uma vez por página:** a linha da assinatura travada (`FOR UPDATE`) no começo da transação
   serializa as tentativas da mesma página, e o índice único é a segunda barreira. **O contador nunca
   desce:** um uso dado é um uso gasto, mesmo que a página seja apagada depois (o uso some com ela, o
   número não).

### Aplicar (`PlatformCoupons`, `modules/billing/platform-coupons.service.ts`)

5. **`POST /api/stores/:storeSlug/subscription/coupon`** com `{ code }`, só do dono (`ownedStoreId`),
   no `BillingController`, que já tem `@OpenWhileLocked()` na classe: a página travada que quer o cupom
   alcança a rota (S5). Responde `200` com `StoreSubscriptionAnswer`, a mesma leitura do `GET`, que a
   tela escreve em `billingKeys.subscription(slug)`.
6. **O limite de chamadas é o da entrada e do cadastro** (`AUTH_RATE_LIMIT_*`, 5 por minuto por
   endereço, num balde só desta rota), e não o das escritas da loja (20): adivinhar um código é
   adivinhar uma senha.
7. **A ordem das recusas**, todas antes de escrever qualquer coisa:
   1. não é o dono: `404 STORE_NOT_FOUND`, `403 STORE_FORBIDDEN`, `401`, como as outras rotas;
   2. `BILLING_ENFORCED` desligada: `409 BILLING_NOT_ENFORCED` (onde nada se cobra, um mês grátis não dá
      nada);
   3. sem a chave da plataforma: `503 BILLING_UNAVAILABLE` (a tela já diz "indisponível" e não oferece
      nada, a trava não existe, e só a chave deixa remover uma tentativa em aberto);
   4. código fora da forma: `409 BILLING_COUPON_NOT_FOUND`, sem ler o banco;
   5. página sem linha de assinatura (de antes do S1): `409 BILLING_SUBSCRIPTION_MISSING`;
   6. `EXEMPT`: `409 BILLING_PAGE_EXEMPT`; lida `ACTIVE` (um período pago em curso):
      `409 BILLING_PAGE_ACTIVE`;
   7. lida `PAST_DUE`, `SUSPENDED` ou `CANCELED` (pagou um dia): `409 BILLING_COUPON_PAGE_PAID`
      (decisão 8);
   8. a página já usou um cupom: `409 BILLING_COUPON_ALREADY_USED`;
   9. o cupom: não existe, `BILLING_COUPON_NOT_FOUND`; desativado, `BILLING_COUPON_DISABLED`; vencido,
      `BILLING_COUPON_EXPIRED`; esgotado, `BILLING_COUPON_EXHAUSTED` — todos `409`, nesta ordem;
   10. outra conversa com o Asaas sobre a página em curso (a marca do S10):
       `409 BILLING_SUBSCRIPTION_BUSY`.

   Códigos `BILLING_COUPON_*`, e não `COUPON_*`: o dicionário de erros do web é um só, e `COUPON_NOT_FOUND`
   já é o do cupom das lojas ("Esse cupom não está mais aqui."). `409` também para o código inexistente,
   e não `404`: é como o cupom da loja responde (`409 ORDER_COUPON_REFUSED`, com `NOT_FOUND` no motivo),
   e um `404` nesta rota se confundiria com a página que não existe.
8. **O cupom é só para a página que nunca pagou** (`TRIALING` ou `TRIAL_EXPIRED`, travada ou não) —
   decisão minha, além da lista do briefing, que recusa só a página ativa e a isenta. Porque: (a) o fim
   do mês grátis é "a regra de quem nunca pagou" (o objetivo do ticket, a decisão 2 do S5); (b) uma página
   que pagou um dia tem assinatura no Asaas, que segue cobrando — no cartão, cobra sozinha durante o mês,
   que deixaria de ser grátis; (c) um cupom não pode virar a saída de uma renovação devida; (d) a tela
   de uma página em atraso ou suspensa já oferece só "pagar a fatura devida". Se o Rafael quiser o
   cupom também para elas, é uma regra a mais na conversa com o Asaas (o que fazer com a assinatura
   paga), não uma linha.
9. **Desde quando conta o mês: do mais tarde entre agora, o fim do teste e o fim de um período grátis
   que ainda corre.** O briefing diz "do mais tarde entre agora e o fim do teste (o lojista nunca perde
   dias de teste)"; estendo ao período grátis pela mesma razão: o único outro período grátis é o mês das
   páginas que já existiam (S15), e um cupom usado dentro dele soma um mês depois dele, não um mês por
   cima dele. **Até quando:** a meia-noite de Brasília que fecha o mesmo dia do mês seguinte ao primeiro
   dia grátis — ou o último dia do mês que não tem esse dia. É a régua do Asaas (decisão 8 do épico) e a
   do período pago (S3: a cobrança do dia `d` paga até o fim do dia do vencimento seguinte), então um mês
   grátis e um mês pago acabam do mesmo jeito. Exemplos: teste até 20/10 → grátis de 21/10 até o fim de
   21/11; teste vencido e cupom em 15/10 às 14h → até o fim de 15/11; primeiro dia grátis em 31/01 → até o
   fim de 28/02 (29/02 num ano bissexto). **É a mesma função que o S15 chama** com o dia 13/10/2026
   (`freeMonthEndOf('2026-10-13')` é o fim de 13/11/2026 em Brasília, que é o que a decisão dele pede).
10. **A tentativa em aberto no Asaas** (a página escolheu um ciclo e não pagou): **o cupom a remove,
    pela conversa do S10, e só então dá o mês.** Recusar deixaria esse lojista sem saída: não existe
    botão para desistir de uma fatura (S12), e uma assinatura não paga fica de pé no Asaas para sempre.
    Deixá-la de pé seria pior: ela gera uma cobrança a cada mês, e pagar a primeira, já velha, depois do
    mês grátis não dá período nenhum (risco 3 do S3). Remover é o que a troca de ciclo já faz, e o aviso
    é o dela: "Usar o cupom cancela a fatura em aberto. Se você já pagou um boleto dela, espere a
    confirmação antes de usar o cupom." Como:
    - **primeiro, tudo o que o cupom pode recusar é conferido, sem escrever nada**: um cupom recusado
      nunca custa a fatura ao lojista;
    - depois, **só se a linha nomeia uma assinatura no Asaas**, `StoreSubscriptions.withdraw` — um método
      novo da única conversa sobre a assinatura de uma página (regra 11 da API): a marca na linha,
      gravada e confirmada; sem trava, a busca pela referência e a assinatura que a linha nomeia; uma
      cobrança tocada por dinheiro para tudo (`409 BILLING_SUBSCRIPTION_PAID`, nada removido, e o
      pagamento lido pela porta do S3); cada assinatura não paga removida e olhada de novo; a linha
      esquece a assinatura; a marca solta;
    - então a transação do cupom, que confere tudo outra vez sob a trava da linha;
    - o Asaas sem responder: `503 BILLING_UNREACHABLE`, e nada do cupom gravado; tentar de novo continua
      de onde parou.

    **No caminho comum — a linha não nomeia assinatura — o Asaas não é chamado**, nem para buscar.
11. **O cupom só grava `freePeriodEndsAt`** (e o uso). Não muda `status` nem nada do Asaas na linha
    além do que a remoção esquece. A trava (S5) já lê o mês grátis antes de tudo; o relógio da rotina
    continua gravando `TRIAL_EXPIRED` durante o mês, o que não trava nada.
12. **Escolher um ciclo durante o mês grátis continua possível** (o S10 não muda): é assinar antes, e
    a tela diz que os dias grátis que faltam se perdem, como já diz dos dias de teste.

### A leitura

13. **`StoreSubscription` ganha três campos:** `freePeriodLastDay`, o último dia de Brasília que o
    período grátis cobre (como `trialLastDay`; continua lá depois do fim, para a tela de página travada
    dizer quando ele acabou); `freePeriodDaysLeft`, os dias de calendário até esse dia, 0 no último, e
    **nulo quando nenhum período grátis cobre o instante da leitura** — é o "está no mês grátis" do card
    do S2, sem conta de fuso no navegador; e `couponRedeemedAt`, quando a página usou o seu cupom, nulo
    enquanto não usou (a tela só oferece o campo a quem não usou). `freePeriodEndsAt` fica como o S1 o
    deixou.

### O comando

14. **`node dist/scripts/platform-coupon.js create --code <CÓDIGO> [--expires AAAA-MM-DD] [--max-uses N]`,
    `list` e `disable --code <CÓDIGO>`**, no terminal do serviço `api` do Dokploy: a imagem `runtime`
    tem o `dist/` e as variáveis do serviço (o `migrate` não tem `JWT_SECRET`, e o schema do `env` o
    recusaria). O arquivo é `apps/api/src/scripts/platform-coupon.ts`, que o `nest build` compila para
    `dist/scripts/` (o `tsconfig.build.json` inclui todo o `src`); ele só abre o banco e chama
    `runPlatformCouponCommand` (`modules/billing/platform-coupon.command.ts`), que é o que os testes
    chamam. Escreve em `process.stdout` (o gate `api/no-console` proíbe `console.*` no `src`), em inglês,
    como o resto da API.
15. `--expires` é o último dia em que o cupom vale, no calendário de Brasília, hoje ou depois.
    `--max-uses` é um inteiro de 1 a 1.000.000 (o teto do cupom das lojas). Sem `--max-uses`, sem limite:
    o briefing diz opcional, e a documentação recomenda sempre pôr um.
16. **`disable` não desfaz os meses já dados**: só impede usos novos. Desativar de novo não é erro. Não
    há `enable`: um código desativado por engano vira um código novo.
17. `list` mostra cada cupom, o mais novo primeiro: o código, a situação (`active`, `disabled`,
    `expired`, `used up`), o último dia, os usos e o limite, e quando foi criado. O código aparece: é o
    terminal do Rafael, não um log. Nenhum log da API leva um código.
18. **Nenhum código de verdade no repositório**: os testes usam códigos com `TESTE` no nome, e a
    documentação, `<CÓDIGO>`.
19. **Regra de arquitetura nova, `api/platform-coupons-in-billing`:** nada fora de `modules/billing`
    escreve `platform_coupons` nem `platform_coupon_redemptions` — o limite só vale porque há um escritor
    só. Uma frase na regra 11 do `AGENTS.md` da API.

### O web

20. **A rota do BFF `POST /api/stores/[slug]/subscription/coupon`** repassa `{ code }` e, num `200`,
    chama `revalidateStore(slug)`: uma página travada volta ao ar na hora (S5). Numa página que não estava
    travada, derrubar o cache não muda nada e custa uma leitura, uma vez na vida da página.
21. **O mês grátis vem antes da situação** em `subscribeViewOf` e em `SubscriptionStanding` (S16, risco
    4): uma página `TRIALING` ou `TRIAL_EXPIRED` com `freePeriodDaysLeft` não nulo é "Grátis até {data}",
    inclusive no teste de uma página que já usou o cupom (o teste e o mês grátis são, para ela, um só
    tempo grátis). Uma página que já pagou é dita pela vida paga dela: só chega lá com um período grátis
    quem assinou durante ele.
22. **O campo do cupom é um bloco irmão do formulário** (`SubscriptionCoupon`, em
    `packages/ui/src/blocks/billing/`), com o próprio botão, porque o cupom não escolhe ciclo. Vem acima
    do formulário, para quem tem um cupom usá-lo antes de pagar. Só onde a API o aceitaria: página que
    nunca pagou, sem cupom usado, com a cobrança disponível. Com uma fatura em aberto, o aviso de que o
    cupom a cancela.
23. **Aplicado**, a tela diz "Cupom aplicado" com até quando a página está grátis e leva ao painel da
    página em 4 s, como faz com o pagamento confirmado.
24. **As frases**: no dicionário da UI, `subscription.coupon` e `subscription.couponApplied`, a situação
    "Grátis" (três frases, como as do teste) e a perda dos dias grátis antes do botão; no do web, os seis
    `errors.BILLING_COUPON_*`. pt-BR e en, sem algarismo (o teste das palavras do S16 confere).

### Documentos

25. `apps/api/docs/README.md` (os arquivos, a rota, o comando), `docs/product/README.md` (o cupom),
    `docs/repo/deploy.md` (o comando no Dokploy), `apps/web/docs/README.md` (a rota do BFF) e
    `apps/api/AGENTS.md` (regra 11 e o gate).

## Fora do escopo

- Uma tela para cadastrar cupons (o backoffice, Épico T); cupom de desconto ou de mais de um mês.
- O mês das páginas que já existiam (S15): aqui fica só a função que ele chama.
- O card do plano (S2), a tela de página travada e as faixas (S14), e-mails (S7).
- Publicar a cláusula do cupom nos termos: está na proposta do S16; `LegalVersion` não muda.

## Riscos

1. **Remover a tentativa em aberto com um boleto pago e ainda não compensado** (o risco 2 do S10, que
   agora o cupom também alcança). O aviso na tela reduz; a pergunta ao Asaas sobre esse dinheiro continua
   do Rafael.
2. **Uma assinatura "fantasma"** — criada por uma escolha cuja resposta se perdeu e que a linha não
   nomeia — não é procurada pelo cupom, para o caminho comum não chamar o Asaas. Ela não tem fatura que o
   lojista conheça, e a escolha seguinte a acha e remove.
3. **Um código curto e conhecido pode ser adivinhado.** O limite de 5 tentativas por minuto por endereço
   e o "uma vez por página" limitam o dano; a documentação pede códigos longos e um limite de usos.
4. **Distinguir "não existe" de "desativado, vencido ou esgotado"** conta a quem tenta que um código
   existe. O briefing pede as frases distintas.
5. **O comando não roda na imagem de produção nesta máquina** (o briefing não deixa construir imagem):
   roda o `dist/` compilado aqui, que é o que a imagem copia.

## Como desfazer a migration

```sql
DROP TABLE "platform_coupon_redemptions";
DROP TABLE "platform_coupons";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261015150000_platform_coupons';
```

Os meses já dados ficam em `store_subscriptions.freePeriodEndsAt`, e a trava continua a respeitá-los;
perde-se só o registro de qual cupom deu cada um, e com ele o "uma vez por página".

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **O botão "Aplicar cupom" ficava vermelho com o código recusado** (visto na tela): o `Field` do campo
   pinta de vermelho tudo o que está dentro dele, e o botão estava. Ele ganhou a cor do texto normal; o
   rótulo, o campo e a frase continuam em vermelho.
2. **Depois do cupom, o painel relê o que leu enquanto a página estava travada.** `useRedeemCoupon`
   escreve a resposta onde a tela lê a assinatura e invalida todas as outras consultas do painel (as de
   cobrança ficam de fora, porque a resposta já é a delas). Visto: as leituras do shell de uma página
   travada (`panel-counts`, as duas do sino, as conversas) respondiam `403`; logo depois do cupom foram
   pedidas de novo e responderam `200`, e o início do painel carregou. O canal em tempo real não é
   pedido de novo: ele não é uma consulta, e voltar com ele é do S14 (o mesmo vale depois de um
   pagamento).
3. **`StoreSubscriptions` separou o que é comum a qualquer conversa com o Asaas (`Claim`) do que é só
   da escolha do ciclo (`Talk`)**, para o `withdraw` reaproveitar a busca, a remoção com a olhada
   seguinte, a escrita que confere a marca e a forma de dizer um erro, sem copiar nada. Os 79 testes do
   S10 (`store-subscription`) passaram sem uma linha alterada.
4. **O e2e do web ganhou o caminho do cupom** (`e2e/subscribe.spec.ts`, terceiro teste): um código
   recusado dito no campo, o foco de volta nele e o axe da página nesse estado; depois um aceito, e o
   painel. Não estava no plano; os servidores estavam de pé para rodar o spec que a branch tocava.
5. **O teste do S1 que compara a leitura inteira** (`test/billing.e2e-spec.ts`) ganhou os três campos
   novos, de propósito.
6. Nada mais: as decisões 1 a 25 viraram código como estão escritas.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027). Disco: 4,7 Gi livres no começo,
4,8 Gi no fim.

1. **A migration, do zero**, num banco de rascunho (`harness_landing_s6_proof`, criado e apagado):
   `prisma migrate deploy` aplicou as 116; `prisma migrate diff --exit-code` saiu com 0 nos dois
   sentidos. Os `CHECK`s recusaram, um por um: código em minúsculas, código de dois caracteres, limite
   zero, contagem acima do limite, contagem negativa. O roteiro de desfazer rodou como está escrito;
   depois dele o `diff` saiu com 2, e a migration aplicou de novo (diff 0). Aplicada também nos bancos de
   desenvolvimento e de teste. No banco de teste, depois do e2e: apagar um cupom usado é recusado
   (`RESTRICT`), uma segunda redenção da mesma assinatura é recusada pelo índice único, um mês que acaba
   antes de começar é recusado pelo `CHECK`, e apagar a página apaga o uso — com a contagem do cupom
   ficando em 1.
2. **Unidade, no último commit:** API, 138 arquivos e 1.824 testes (eram 137 e 1.790 no S5); web, 334
   arquivos e 3.008 testes (eram 334 e 2.985 no S16); `packages/ui`, 381 arquivos e 2.945 testes (eram
   380 e 2.930). Todos verdes.
3. **Tipos e lint:** `tsc --noEmit` na API, em `packages/contracts` e no `packages/ui`, e `type-check`
   do web (`next typegen` e `tsc`, que inclui `e2e/`): saída 0. `oxlint` na API e na UI: 0 erros (os dois
   avisos antigos de cada, em arquivos que este ticket não toca); `eslint` nos arquivos tocados do web: 0.
4. **e2e da API, um arquivo por vez:** os novos — `platform-coupon` (26), `platform-coupon-command` (24)
   e `platform-coupon-rate-limit` (2), rodados de novo no último commit — e os que a mudança alcança:
   `billing` (18), `billing-enforced` (2), `store-subscription` (79), `store-subscription-key` (9),
   `store-subscription-not-enforced` (9, eram 8), `store-subscription-without-key` (10, eram 9),
   `subscription-payment` (33), `page-lock` (45), `billing-webhook` (14) e `stores` (19): 290 testes nos 13 arquivos,
   verdes. **As três corridas do cupom são forçadas**: o teste segura a trava da linha (do cupom, ou da
   página) até o Postgres mostrar as chamadas esperando por ela (`pg_stat_activity`), e só então solta —
   duas páginas no último uso, cinco páginas para dois usos, e a mesma página com dois cupons.
5. **O e2e do web, só `e2e/subscribe.spec.ts`**, contra o `next dev` na 3200 e a API na 3201, com uma
   configuração do Playwright temporária (apagada, fora do commit): 3 testes, verdes, inclusive o axe da
   página com o campo do cupom.
6. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits (`pre-commit`). A regra nova
   (`api/platform-coupons-in-billing`) ficou vermelha com uma escrita por cliente
   (`db.platformCoupon.update(`) num arquivo de `modules/stores/` e com SQL que nomeia a tabela num de
   `src/scripts/`, e verde de novo sem eles.
7. **O comando compilado**, `node dist/scripts/platform-coupon.js`, rodado de `apps/api` contra o banco
   de desenvolvimento depois do `nest build`: sem argumento, o uso e saída 2; `create` com validade e
   limite, saída 0; o mesmo código de novo, recusado, saída 1; `list`, a tabela. Nenhuma linha de log da
   API misturada à saída.
8. **Os testes postos à prova com 28 erros plantados**, um por vez, cada um desfeito por `git checkout`
   (árvore limpa conferida no fim): **26 pegos de primeira.** Os dois que passaram são equivalentes por
   construção: tirar a trava da linha da página na transação do uso, ou tirar a conferência "a página já
   usou um cupom" antes de gravar — nos dois casos a segunda tentativa da mesma página ainda é recusada
   pelo índice único (`BILLING_COUPON_ALREADY_USED`), e o incremento do cupom dela é desfeito com a
   transação. O índice é o piso debaixo delas; elas ficam porque recusam antes de tocar no cupom e
   porque a trava também serializa contra a escolha do ciclo. Entre os 26: o limite fora do `UPDATE`;
   uma página que pagou um dia aceita; o mês contado de agora numa página em teste; um período grátis em
   curso ignorado; a tentativa em aberto não removida; um pagamento que não para a remoção; a remoção
   antes de conferir o cupom; o limite das escritas de loja no lugar do da entrada; dias grátis ditos
   depois do fim; o uso do cupom nunca dito; um limite de zero páginas e uma validade passada aceitos
   pelo comando; o código guardado como digitado; o cupom ainda válido no instante em que a validade
   acaba; um cupom desligado tratado como qualquer outro; o mês acabando um dia antes; no web, o mês
   grátis dito depois da situação, um segundo cupom oferecido, a vitrine não derrubada, o painel não
   relido, a tela que não vai ao painel, o cupom oferecido sem a chave; na UI, o código com espaços, um
   algarismo numa frase, a página grátis dita como em teste, a perda dita como dias de teste. O teste
   novo do Playwright também falhou com um deles (a tela que não vai ao painel).

**Um tropeço meu, registrado:** a primeira rodada dos erros plantados no zsh passou o comando do teste
como uma palavra só (`$E2E` não se divide no zsh), o `env` não achou o executável, e o script contou
isso como "pego". Todos foram refeitos com o comando dividido (`${=E2E}`) e o resumo do Vitest de cada
um; os números acima são os da segunda rodada.

### Na tela, de verdade (15/10/2026, das 04:24 às 04:30 de Brasília)

A API compilada na 3201 (`node dist/main.js`, banco `harness_landing`) com `BILLING_ENFORCED=true` e a
**chave de sandbox** só no ambiente do processo; o web na 3200 (`next dev`). Uma dona "Teste S6 Dona"
(cadastro pela API, e-mail confirmado pelo Mailpit), três páginas — "Teste S6 Loja" (em teste), "Teste
S6 Travada" (o teste vencido em 13/10, posto no banco) e "Teste S6 Fatura" — e dois cupons feitos pelo
comando compilado, `TESTE-S6-MES` (2 usos, até 31/12/2026) e `TESTE-S6-FATURA` (1 uso). Tudo abaixo foi
**visto**; as capturas estão em `.claude/worktrees/subscription-pr/screens-224/`.

| O quê | O que aconteceu |
|---|---|
| A página em teste, a 1920, 1280 e 390 px | "Tem um cupom da Beelink?" entre a situação e o formulário, com a frase do que ele dá. A 390, o campo e o botão empilhados, sem rolagem horizontal (`scrollWidth` igual à largura) |
| Só com o teclado | Do "Início" do topo da tela, um Tab e o foco está no campo; um código que não existe e Enter: "Cupom não encontrado. Confira o código digitado." no campo, lida em voz alta (`role=alert`), e o foco voltou ao campo sozinho. Selecionar, apagar, `teste-s6-mes` e Enter: "Cupom aplicado", "Sua página está grátis até 23/11/2026" — o teste ia até 22/10, e o mês começou no dia seguinte — e a situação no topo passou a "Grátis", "faltam 39 dias". Quatro segundos depois, o painel da página |
| A página travada | A vitrine dizia "Loja indisponível no momento". Na tela Assinar, "Teste encerrado" e o campo; o mesmo cupom (o segundo e último uso), com o mouse: grátis até 15/11/2026 — o mês contado de hoje. As leituras do shell, que respondiam `403`, foram relidas e responderam `200`; o início do painel carregou; e a vitrine, visitada logo depois, abriu com a loja |
| A tentativa em aberto, no sandbox | Nome e CPF inventado e válido, Mensal, "Assinar e pagar": o cliente "Teste S6 Dona" e a assinatura nasceram no sandbox, e a fatura abriu em outra aba ("Asaas - Teste S6 Dona"). Fechada sem pagar, "Escolher outro plano": o campo do cupom com o aviso de que ele cancela a fatura em aberto. `teste-s6-fatura` e Enter: "Cupom aplicado". **No sandbox, a assinatura ficou `deleted: true` e `INACTIVE`, e nenhuma ficou de pé sob a referência da página**; a linha esqueceu a assinatura, a fatura e o ciclo, a marca está solta, a situação continua `TRIALING`, e o mês vai até o fim de 23/11 |
| Uma página no mês grátis, a 1920 e 390 px | "Grátis", "A página está grátis até 23/11/2026: faltam 39 dias…", nenhum campo de cupom (ela já usou o seu), e os períodos com "Assinando agora, você perde os 39 dias grátis que faltam" |

**Os logs:** a API sem nenhuma linha de aviso ou de erro em 420 linhas; a chave (inteira, sem o
prefixo, um pedaço do meio) 0 vezes; o CPF (com e sem pontuação), o e-mail e o nome da dona 0 vezes; os
códigos dos cupons 0 vezes (o log não leva corpo de requisição). O log do web, nada. As únicas linhas de
erro do console do navegador foram o próprio navegador registrando as respostas `409` e `403`.
**Limpeza:** no sandbox, o cliente `cus_000009488522` removido (a assinatura já tinha sido removida pelo
cupom), e a busca por "Teste S6" responde 0; a assinatura `teste-s8-sub-amanha-ok` não foi tocada. No
banco, a conta, as três páginas e os dois cupons apagados (0 lojas, 0 assinaturas, 0 cupons, 0 usos),
como as contas e páginas que o e2e do web criou; os e-mails dos dois apagados do Mailpit; a API e o web
encerrados (`pgrep -fl "worktrees/landing"` vazio); o `apps/web/.next` apagado; e os arquivos que o
navegador do Playwright escreveu nesta sessão removidos (só os desta sessão).

**Uma observação sobre as capturas:** como o S11 já tinha visto, a primeira captura depois de uma
navegação às vezes devolve um quadro antigo. Uma delas devolveu o painel já aberto no lugar de "Cupom
aplicado" e foi apagada; a confirmação está na captura 05.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook (as stories novas só foram
  compiladas pelo `tsc` da UI), a suíte e2e inteira da API (rodaram 13 dos 104 arquivos) e a suíte
  Playwright inteira: o briefing proíbe nesta máquina. Ficam para o push.
- **O comando dentro da imagem de produção.** A imagem não foi construída; rodou o `dist/` compilado
  aqui. O `.dockerignore` deixa o `dist/` de fora e a imagem o recompila de todo o `src` (o
  `tsconfig.build.json` inclui `src/scripts`), e o `pnpm deploy` leva o `dist/` inteiro, o mesmo que já
  leva o `dist/main.js`: **inferido** que `dist/scripts/platform-coupon.js` chega lá. Que o terminal do
  Dokploy abre em `/app` também é inferido (é o `WORKDIR` da imagem).
- Um pagamento com cartão, um 429 e um silêncio de verdade do Asaas durante a remoção: só com o Asaas
  falso (o silêncio na remoção é um teste do e2e).
- Duas instâncias da API ao mesmo tempo (as corridas foram num processo só, contra um Postgres de
  verdade); homologação e produção; outros navegadores; um leitor de tela de verdade; a tela em inglês
  fora dos testes.

### Os textos, para ler de uma vez (pt-BR, proposta como as do S16)

- **O campo:** "Tem um cupom da Beelink?" / "O cupom dá um mês grátis a esta página, sem cartão. Ele vale
  uma vez por página e só começa quando acaba o tempo grátis que ela já tem: você não perde nenhum dia."
  / "Código do cupom" / "Aplicar cupom" ("Aplicando o cupom…") / vazio: "Digite o código do cupom." / com
  fatura em aberto: "Usar o cupom cancela a fatura em aberto. Se você já pagou um boleto dela, espere a
  confirmação antes de usar o cupom."
- **Aplicado:** "Cupom aplicado" / "Sua página está grátis até {data}. Nada é cobrado nesse tempo." (sem
  data: "Sua página ganhou um mês grátis. Nada é cobrado nesse tempo.") / "Ir para o painel".
- **A situação:** "Grátis" / "A página está grátis até {data}: faltam {dias} dias. Nada é cobrado
  sozinho: quando o tempo grátis acabar, a página trava e sai do ar até você assinar." (falta um dia:
  "…grátis até amanhã, {data}."; no último: "O tempo grátis da página termina hoje, {data}. …").
- **Antes de assinar, no tempo grátis:** "Assinando agora, você perde os {dias} dias grátis que faltam:
  o plano começa a contar hoje." (um: "…o dia grátis que falta…"; no último: "O plano começa a contar
  hoje, último dia grátis.").
- **As recusas:** "Cupom não encontrado. Confira o código digitado." / "Este cupom foi desativado e não
  vale mais." / "Este cupom venceu: o prazo para usá-lo acabou." / "Este cupom esgotou: ele já foi usado
  por todas as páginas que podia." / "Esta página já usou um cupom: cada página usa um só." / "Esta
  página já pagou um plano antes: o cupom vale só para páginas que ainda não assinaram."

### O comando que o Rafael roda, em produção

Depois que esta branch (e a pilha de baixo, #270 a #274) estiver na `main` e no ar — a migration roda no
`migrate` do deploy —, no Dokploy, o serviço `api` da stack, **Terminal**:

```
node dist/scripts/platform-coupon.js create --code <CÓDIGO> --max-uses <N> --expires <AAAA-MM-DD>
node dist/scripts/platform-coupon.js list
```

**O cupom só é aceito com a cobrança ligada** (`BILLING_ENFORCED=true` e a chave): com ela desligada, como
a produção está hoje, a tela Assinar nem aparece, e a rota recusa com `BILLING_NOT_ENFORCED`. Criar o
cupom antes não faz mal: ele espera.

### O que o S15 (BEELINK-297, as páginas que já existiam) precisa saber

- **O fim do mês delas é `freeMonthEndOf('2026-10-13')`** (`billing-dates.ts`): o fim de 13/11/2026 em
  Brasília, `2026-11-14T03:00:00.000Z`. É a mesma função do cupom.
- **Grave `freePeriodEndsAt` com `GREATEST`, nunca encolhendo:** uma página que já usou um cupom pode ter
  um fim mais tarde.
- **O mês delas não é um cupom:** não crie linha em `platform_coupon_redemptions`. Assim elas ainda podem
  usar um cupom, e o mês dele começa quando o de 13/11 acaba (`freeMonthOf` conta um período grátis em
  curso), não por cima dele. A tela oferece o campo a elas (`couponRedeemedAt` nulo). Se o Rafael quiser
  que essas páginas não usem cupom, é uma recusa a mais em `PlatformCoupons.vetted`, não um dado do S15.
- **A leitura já diz o mês delas:** `freePeriodDaysLeft` não nulo até 13/11, `freePeriodLastDay`
  `2026-11-13`; a tela Assinar as mostra "Grátis até 13/11/2026" e não "Teste encerrado".
- **O padrão do comando** serve aos comandos do S15 (isentas, relatório, aviso): um arquivo em
  `src/scripts/` que só abre o banco, e a lógica em `modules/billing/<nome>.command.ts`, com
  `run…Command(argv, db, io)` que os testes chamam, escrevendo em `process.stdout` (o gate proíbe
  `console.*`), e saída 0, 1 ou 2.

### O que o S14 (BEELINK-296, a página travada e as faixas) precisa saber

- **"Seu mês grátis acabou" (`FREE_PERIOD_OVER`)** é `lock === 'TRIAL_EXPIRED'` com `freePeriodLastDay`
  não nulo: a trava só aparece depois do período grátis, então um `freePeriodLastDay` presente é um
  período que acabou. O `{date}` é esse dia, já de Brasília.
- **Durante o tempo grátis, `lock` é nulo, e a faixa dos "2 últimos dias do teste" mentiria** para uma
  página que usou o cupom no teste: ela não trava no fim do teste. Olhe `freePeriodDaysLeft` antes de
  `trialDaysLeft`, como `subscribeViewOf` faz; uma faixa dos últimos dias do tempo grátis precisaria de
  frases novas.
- **Depois do cupom numa página travada**, `useRedeemCoupon` já relê as consultas do painel; o canal em
  tempo real não volta sozinho, como depois de um pagamento: o remonte do `PanelRealtime` quando a trava
  sai vale para os dois.
- A tela de página travada leva à tela Assinar, onde o campo do cupom está; dizer "Tem um cupom?" na
  própria tela travada é opcional.
- **Visto, de antes deste ticket:** no primeiro quadro da tela Assinar de uma página travada, o seletor
  de loja do topo mostrou "Nenhuma loja" até carregar.

### O que o S2 (BEELINK-220, o card do plano) precisa saber

- **"Grátis até 13/11"** é `freePeriodDaysLeft !== null`, com `freePeriodLastDay` em palavras — e vem
  antes da situação para uma página que nunca pagou (`TRIALING`, `TRIAL_EXPIRED`), a mesma regra de
  `subscribeViewOf`. Vale para o mês do cupom e para o das páginas antigas; `couponRedeemedAt` diz qual,
  se o card quiser dizer.
- O cupom escreve a resposta em `billingKeys.subscription(slug)`: lendo a mesma chave, o card muda junto
  com a tela.
- Se o card avisar mais forte nos últimos dias, o tempo grátis também tem últimos dias
  (`freePeriodDaysLeft` 2, 1, 0).

### O que o S17 (o roteiro para ligar) precisa saber

- O cupom entra no roteiro da homologação: criar um pelo comando, usar numa página em teste, numa com o
  teste vencido e numa com uma fatura em aberto (que o sandbox mostra removida), e conferir que a página
  trava de novo quando o mês acaba (adiantando `freePeriodEndsAt` no banco).

### Riscos, além dos de cima

6. **O cupom não serve em produção até a cobrança ser ligada** (ver "O comando que o Rafael roda").
7. **Uma página que usou o cupom e depois pagou durante o mês** perde os dias grátis que faltavam, como
   quem assina no teste; a tela diz isso antes do botão.
8. **Os textos são proposta**, no tom do S16, e esperam a aprovação do Rafael com os dele.
