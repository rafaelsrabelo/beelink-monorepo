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
