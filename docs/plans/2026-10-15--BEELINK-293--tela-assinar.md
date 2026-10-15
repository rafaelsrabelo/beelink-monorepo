# BEELINK-293 (S11) — Web: a tela Assinar da página

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Quinto ticket de código e o primeiro de tela. A
> branch nasce da do S3 (`feat/BEELINK-221-pagamento-da-assinatura`, `ddde173f`), que ainda está no PR
> #271 (e o S10 no #270); o PR deste ticket tem `main` como base e só fica legível depois que os dois
> entrarem. Toca `apps/web` e `packages/ui`, e, para a decisão sobre os preços da landing,
> `scripts/arch-gates.sh` e dois comentários de `apps/api`. **Nenhuma rota da API muda, nenhum tipo de
> fio muda.** As decisões do épico não são reabertas; as que estão abaixo são do desenvolvedor.
> Leituras de base: `2026-10-13--BEELINK-292--assinatura-no-asaas.md` e
> `2026-10-14--BEELINK-221--pagamento-da-assinatura.md`, as duas partes "O que o S11 precisa saber".
> Escrito em 15/10/2026, antes do código.

## O problema

A API já sabe tudo o que a assinatura de uma página precisa: o catálogo (`GET /billing/plans`), a
leitura da assinatura (`GET /stores/:slug/subscription`), os dados de cobrança da conta
(`GET/PUT /billing/account`), a escolha do ciclo que devolve a fatura do Asaas
(`PUT /stores/:slug/subscription`) e a conferência que lê o Asaas agora
(`POST /stores/:slug/subscription/check`). Nenhuma tela chama nada disso, e o web não tem nem as rotas
(BFF) que o navegador usaria.

O que não pode acontecer, em ordem de gravidade:

1. **Mandar o lojista pagar um valor que a tela não mostrou.** O que a fatura cobra é o preço do plano
   no instante do clique (S10); a tela mostra o valor respondido antes de abrir a fatura.
2. **Oferecer compra onde nada se cobra**: cobrança desligada, página isenta, página sem assinatura.
3. **Dizer que a página está paga antes de a API dizer.** Nada do que o navegador viu no Asaas conta.
4. **Um número escrito à mão** (preço, economia, dia de renovação) que discorde do catálogo.
5. **Chamadas demais à conta da plataforma** enquanto a tela espera o pagamento.

## Definição de Pronto

1. Uma página em teste e uma com o teste vencido assinam pela tela, cada uma num ciclo, e chegam ao
   painel como `ACTIVE` (no sandbox; o que não der para ver lá, com o Asaas falso, dito no relatório).
2. Valores, economia e data da renovação vêm do catálogo e da assinatura, calculados; nenhum número no
   componente.
3. Sem dados de cobrança, a tela os pede e segue; com a cobrança desligada ou página isenta, nada muda
   no painel de hoje.
4. Quem volta da fatura sem pagar vê a mesma fatura de novo; erros do Asaas aparecem como frase clara.
5. Teste de unidade dos componentes e um e2e do web (Playwright, só o spec novo) do caminho de quem
   escolhe, abre a fatura e volta sem pagar, e do caminho em que a página fica ativa.
6. Tipos, lint e testes do web e do `packages/ui`, `arch-gates` e `docs-gate` verdes.

## Decisões

### A rota e quem decide se há o que comprar

1. **`/admin/<slug>/subscribe`.** O briefing deu `/assinar` como exemplo e pediu "o padrão das outras
   telas do painel": todos os segmentos do painel são em inglês (`domain`, `integrations`, `cashback`,
   `reports`). O endereço é montado num lugar só, `subscribePageOf(slug)` (`apps/web/src/lib/`), que o
   S2 e o S14 usam para levar o lojista até aqui. **Nenhum link novo no menu.**
2. **Quem decide que não há o que comprar é a tela, pela leitura da assinatura**, e não o servidor do
   Next: cobrança desligada (`billingEnforced: false`), página `EXEMPT` ou página sem assinatura
   (`subscription: null`, que a API recusaria com `BILLING_SUBSCRIPTION_MISSING`) levam de volta ao
   painel da página (`router.replace`). Enquanto a leitura não chega, só o esqueleto: nada é oferecido
   antes de a API dizer que a cobrança está ligada. Motivos: (a) o e2e do web só alcança as rotas do
   BFF pelo navegador, e uma leitura feita no servidor do Next iria à API de verdade do Playwright, que
   roda com a cobrança desligada — o spec nunca veria a tela; (b) ligar `BILLING_ENFORCED` para a suíte
   inteira do Playwright mudaria o ambiente dos outros specs (e o do S5, que vem a seguir) por causa de
   um só; (c) um lugar só decide, e é o mesmo que já lê a situação para desenhar a tela.
3. **A tela não lê `GET /stores/:slug`** (o nome da página): só as rotas de cobrança. O shell do painel
   já mostra qual página está aberta, e o S5 decide se a leitura da página fica aberta numa página
   travada.

### O que cada situação mostra

4. A tabela, com a situação como a API lê (S3, "O que cada situação pede da tela"):

   | Situação | A tela |
   |---|---|
   | cobrança desligada, `EXEMPT`, sem assinatura | volta ao painel da página |
   | `TRIALING` | até quando vai o teste e quantos dias faltam; escolher o ciclo |
   | `TRIAL_EXPIRED` | que o teste acabou e quando; escolher o ciclo |
   | `CANCELED` | que foi cancelada e, com `currentPeriodEndsAt` no futuro, até quando funciona; escolher de novo cria outra assinatura |
   | `ACTIVE` | até quando está paga, o ciclo, a forma de pagamento e o cartão (só se houver); para Pix ou boleto, a fatura da renovação em `invoiceUrl`, se houver. Nada a comprar |
   | `PAST_DUE`, `SUSPENDED` | que a renovação não foi paga; o botão é **pagar a fatura devida** (`invoiceUrl`), não escolher outro ciclo. Sem fatura: conferir de novo |

5. **"Paga até"** é o último dia que `currentPeriodEndsAt` cobre: o dia de Brasília antes desse
   instante, que é também o vencimento da cobrança seguinte (S3, decisões 8 e 9).
6. **Uma tentativa em aberto** (`TRIALING`, `TRIAL_EXPIRED` ou `CANCELED` com `invoiceUrl` e ciclo):
   a tela abre com o ciclo dela marcado e o botão vira "Continuar o pagamento", que chama o `PUT` do
   mesmo ciclo (o S10 recomenda: confere no Asaas e devolve a mesma fatura). Escolher outro ciclo
   continua possível, com um aviso antes do botão: a fatura anterior deixa de valer, e quem pagou um
   boleto dela espera a compensação antes de trocar (risco 2 do S10).
7. **Ao abrir a tela com uma fatura em aberto** (tentativa, `PAST_DUE` com fatura, renovação de Pix ou
   boleto), a tela confere uma vez (`POST …/check`): um pagamento feito em outro lugar aparece sem o
   lojista apertar nada.

### Os valores

8. **O catálogo é a única fonte.** O plano é o de slug `beelink` (o `PLAN_ON_SALE` da API, que é o que
   o `PUT` cobra), e os ciclos são os dele, na ordem do catálogo. Para cada um: o valor cobrado hoje
   (`priceCents`), quanto sai por mês (arredondado para cima) e quanto economiza em relação a pagar o
   mensal pelo mesmo tempo (o percentual arredondado para baixo) — a mesma regra da landing, que passa
   a ser uma função só em `packages/ui` (`periodFiguresOf`), usada pelas duas. Sem o plano no catálogo,
   a tela diz que a assinatura está indisponível e não oferece o botão.
9. **"Renova em"** é hoje (no calendário de Brasília) mais os meses do ciclo, no mesmo dia do mês,
   recuando para o último dia quando o mês não o tem (decisão 8 do épico). É só para mostrar: a data
   que vale é a do Asaas. **Para o ciclo de uma tentativa em aberto a tela não mostra data**: a
   renovação conta do vencimento da fatura em aberto, que pode ser de dias atrás, e o fio não traz esse
   dia (`firstDueDate` fica na linha). Diz "renova todo mês, contando do vencimento da fatura em
   aberto". Pôr `firstDueDate` no fio é uma linha no mapeador da API, se um ticket futuro quiser.
10. **Quando o valor respondido pelo `PUT` não é o mostrado** (o preço do plano mudou entre a tela
    carregar e o clique), a fatura não é aberta sozinha: a tela mostra o valor novo e o link da fatura.

### A landing e a segunda cópia dos preços

11. **A landing continua com a cópia dela (`apps/web/src/lib/plans.ts`), e uma conferência nova
    garante que as duas dizem o mesmo.** A landing é a página pública mais vista e é renderizada no
    servidor: lendo a API, ela cai (ou some com os preços) quando a API cai, e uma cópia de reserva
    para esse caso seria a segunda cópia de novo. A conferência é um passo novo de
    `scripts/arch-gates.sh` (`web/landing-prices-match-api`), que lê os três preços do `beelink` e o
    mensal do `beelink-beelia` em `apps/api/prisma/seed/plans.sql`, e `TRIAL_DAYS` em
    `apps/api/src/modules/billing/billing.constants.ts`, e recusa se `PLAN_PRICES` disser outra coisa
    — ou se não conseguir ler algum dos três arquivos. Ela e não um teste do web porque roda em todo
    commit (`pre-commit`) e em todo PR (o job `gates` do CI não tem filtro de workspace): um teste do
    web não roda num PR que só muda o seed da API. Os comentários dos três arquivos passam a dizer
    isso.

### Os dados de cobrança

12. **No mesmo formulário, antes do botão.** Quando a leitura da conta diz que falta
    (`account: null`), ou o `PUT` da assinatura responde `409 BILLING_ACCOUNT_REQUIRED`, o formulário
    mostra nome (ou razão social) e CPF ou CNPJ, com máscara e validação. O botão grava a conta
    (`PUT /api/billing/account`) e, gravada, escolhe o ciclo. Uma recusa do nome ou do documento vai
    para o campo dele.
13. **A validação repete a regra da API**, como o formulário do entregador já faz com o CPF: nome de 2
    a 120 caracteres depois de tirar os espaços das pontas; CPF (11 dígitos) ou CNPJ (14 dígitos) com
    os dígitos verificadores certos. O CPF reaproveita `isCpf` do formulário do entregador; o CNPJ é a
    regra de `apps/api/src/shared/http/cnpj.ts` repetida. O CNPJ com letras (de julho de 2026) a API
    ainda recusa, e a tela também.
14. **Conta que já deu os dados:** a tela mostra em nome de quem é a cobrança (nome e documento
    mascarado, como a API devolve) e um "Alterar", que abre os dois campos (o documento precisa ser
    digitado de novo: a leitura nunca o traz inteiro). Sem isso, quem recebesse
    `BILLING_CUSTOMER_REFUSED` não teria como corrigir.
15. **Sem a chave da plataforma** (`503 BILLING_UNAVAILABLE` na leitura da conta): a tela diz que a
    assinatura está indisponível no momento e não oferece o botão.

### O botão, a fatura e a espera

16. **Um clique:** `PUT …/subscription` e, com o mesmo valor mostrado, `window.open(invoiceUrl,
    "_blank", "noopener,noreferrer")`. Um navegador pode bloquear a aba aberta depois de uma chamada à
    rede; por isso a tela passa na hora a "aguardando a confirmação do pagamento", com o link da mesma
    fatura (um `<a target="_blank" rel="noopener noreferrer">`, que nenhum bloqueador recusa).
17. **Esperando:** um esqueleto onde a confirmação vai aparecer (nunca spinner), o link da fatura,
    "Já paguei, verificar agora" e "Escolher outro plano". A tela chama `POST …/check` quando a aba volta
    a ficar visível e, enquanto a aba está visível, em intervalo crescente: 10, 15, 20, 30, 45 e depois
    60 s, por até 10 minutos de espera; depois disso, só ao voltar para a aba ou pelo botão. A API já
    limita a uma pergunta ao Asaas a cada 10 s por página e a 20 chamadas por minuto por endereço. Um
    `429` ou a sessão encerrada param o intervalo.
18. **Quem volta sem pagar** volta para a aba, a conferência responde a mesma fatura em aberto, e a tela
    mostra de novo o link dela. Escolher de novo o mesmo ciclo também devolve a mesma fatura (S10).
19. **Ao ver `ACTIVE` depois de abrir a fatura nesta tela:** "Pagamento confirmado", com até quando a
    página está paga e um link para o painel, e a tela leva ao painel da página em 4 s
    (`router.replace`), como a tela de pagamento de pedido faz. Ao abrir a tela já `ACTIVE`: o resumo,
    sem levar a lugar nenhum.
20. **`PAST_DUE` e `SUSPENDED`:** o botão é o link da fatura devida, sem `PUT`; abrir a fatura põe a
    tela na mesma espera.
21. **A resposta da escolha é escrita direto na leitura da assinatura** (com `billingEnforced: true`:
    uma escolha aceita só existe com a cobrança ligada), e conta como a primeira conferência: a
    primeira pergunta ao Asaas é a do primeiro intervalo ou a da volta para a aba.

### Erros

22. **Cada código vira uma frase em `apps/web/src/locales`** (`errors`, regra 9 do web), inclusive os
    de cobrança, que entram no tipo do dicionário: um código novo no contrato para de compilar até ter a
    frase dele. Os que querem dizer "a situação mudou" (`BILLING_SUBSCRIPTION_PAID`,
    `BILLING_PAGE_ACTIVE`, `BILLING_PAGE_EXEMPT`, `BILLING_NOT_ENFORCED`,
    `BILLING_SUBSCRIPTION_MISSING`) fazem a tela ler a assinatura de novo, e a frase só aparece se a
    tela, relida, ainda oferecer a compra. `BILLING_SUBSCRIPTION_PAID` que não deixou a página ativa
    diz que há um pagamento sendo processado.
23. A sessão encerrada (`AUTH_UNAUTHENTICATED`) pede a página de novo ao servidor, que leva à entrada.

### Textos

24. **Antes do botão, em palavras simples:** você paga hoje o valor do ciclo (a primeira cobrança);
    em teste, os dias que faltam não são somados ao plano; numa página cancelada que ainda funciona, os
    dias que restavam do período pago também não; com cartão a assinatura renova sozinha, com Pix ou
    boleto cada renovação é uma fatura nova para pagar; a fatura abre no Asaas, em outra aba, onde se
    escolhe a forma de pagamento; e, como o cancelamento pelo painel ainda não existe (S12), que para
    cancelar o caminho hoje é falar com o suporte da Beelink — sem prometer um botão.
25. **Todos nos arquivos de locale** (o dicionário da UI para os blocos, o do web para os erros), em
    pt-BR e en, sem valor escrito: os valores entram por `{placeholder}`. O S16 revisa.
26. **A política de privacidade não muda aqui.** Ela ainda não cita o CPF/CNPJ guardado para cobrança
    (risco 8 do S9). Mudar o texto legal pede uma `LegalVersion` nova e o aceite de todos de novo, e
    isso é decisão do Rafael (o S16 trata a cláusula). A tela diz para que os dados servem, no
    formulário. Fica como pendência: **antes de ligar `BILLING_ENFORCED` em produção**.

### Onde mora

27. **`packages/ui/src/blocks/billing/`**: os blocos novos, cada um com story e teste (axe) — os
    ciclos como grupo de rádios (`RadioGroup` com uma legenda), os dados de cobrança, as frases antes do
    botão, o formulário que junta os três, a situação da página, a espera, o resumo da página paga, a
    renovação devida e o esqueleto. Os blocos recebem formas restatadas (`lib/subscription.ts`), como
    os outros blocos do painel: o pacote não depende de `packages/contracts`.
28. **`apps/web`:** as rotas do BFF (`/api/billing/plans`, `/api/billing/account`,
    `/api/stores/[slug]/subscription` e `…/check`), os serviços (`services/billing/`, com a fábrica de
    chaves), as contas puras da tela (`lib/subscribe-view.ts`, `lib/subscription-dates.ts`) e a tela
    (`components/billing/`).

### O e2e do web

29. **O Asaas falso da API não é alcançável pelo Playwright.** Ele é um apoio dos e2e do Vitest
    (`test/support/fake-platform-asaas.ts`), e o processo da API que o Playwright sobe fala com o Asaas
    do `ASAAS_ENV`, sem endereço configurável. O spec novo responde no navegador pelas rotas do BFF da
    cobrança (`page.route`) e pela página da fatura (`context.route`), como `courier-application.spec.ts`
    já faz com o que não se pede à API sob encomenda. O que fica fora do spec é coberto assim: as rotas
    do BFF por testes de unidade; a API pelos e2e dela (S1, S9, S10, S3); e o caminho inteiro, de
    verdade, no sandbox (Pronto 1).

## Fora do escopo

- Cupom (S6), card do plano no painel (S2), aviso de página travada (S14), cancelar (S12), trocar
  cartão (S13), tela "Plano e cobrança" (S4), e-mails (S7).
- Mudar a API ou o fio (nenhuma rota, nenhum tipo novo).
- O texto legal e a `LegalVersion`.
- Um link no menu do painel.

## Riscos

1. **A data de renovação mostrada é calculada no navegador**, com o relógio dele. Um relógio errado
   mostra um dia errado; o que vale é o Asaas.
2. **Um bloqueador de abas** pode segurar a fatura aberta depois do `PUT`; o link fica na tela.
3. **A política de privacidade** (decisão 26).
4. **`firstDueDate` não está no fio** (decisão 9).
5. **Uma página `CANCELED` por devolução, com a assinatura ainda de pé no Asaas**, recebe
   `BILLING_SUBSCRIPTION_PAID` em toda escolha (o S3 não remove nada): a tela diz que há um pagamento
   em processamento e não tem como resolver sozinha. Precisa de alguém removendo a assinatura no Asaas
   (S12 ou à mão).

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **O cinza dos textos secundários.** O axe, no navegador, mediu `muted-foreground` (#737373) a 4,42:1
   sobre o fundo do painel (#f7f7f7) e a 4,27:1 sobre o cartão do ciclo escolhido. Os textos da tela
   que ficam sobre esses fundos usam `shell-muted` (#616161), o cinza que o shell já tinha para isso.
   **O link "voltar" do `IntegrationFrame` também**, e por isso ele fica um pouco mais escuro nas
   páginas de integração e na do domínio, que tinham o mesmo problema.
2. **Onde nada pode ser comprado, o formulário não pede nem diz nada de pagamento** (visto na tela de
   verdade com a cobrança ligada e sem a chave: ela pedia nome e CPF que não iriam a lugar nenhum).
   Ficam os ciclos, só para informar, e a frase. Um catálogo sem o plano à venda, que antes fazia o
   formulário sumir junto com a frase, agora mostra a frase.
3. **O estado da tela guarda só que ela abriu uma fatura** (e se o valor mudou). Qual fatura é sempre
   a da assinatura, como o TanStack Query a guarda: a regra de `docs/ai-rules/state-and-data.md` (nada
   que veio da API em `useState`), achada no `delivery-check`.
4. **Só o cartão de crédito renova sozinho.** O de débito, como Pix e boleto, gera uma fatura a cada
   renovação: o resumo da página paga diz isso, e a fatura da renovação só é oferecida para quem não
   paga com crédito.
5. **A leitura da assinatura não é refeita ao voltar para a aba**; quem olha nessa hora é a
   conferência (`POST …/check`), que pergunta ao Asaas primeiro. As duas juntas, um `GET` começado
   antes de a conferência gravar podia chegar depois e devolver a página paga a "não paga".
6. **Os links com cara de botão juntam as classes com `cn()`**: `buttonVariants({ className })` não
   resolve conflito, e o padding de um deles não valia.
7. `docs/product/README.md` ganhou a regra que a tela diz: quem paga durante o teste perde os dias que
   faltavam.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027).

1. **`packages/ui`:** `tsc --noEmit` sem erro; `oxlint` com 0 erros (os dois avisos antigos, em
   arquivos que este ticket não toca); a suíte de unidade inteira no último commit, **379 arquivos e
   2.921 testes, verdes**. Os blocos novos têm 72 testes (com axe); os da landing (16 arquivos, 274
   testes) passaram depois de a conta dos valores virar `periodFiguresOf`.
2. **`apps/web`:** `type-check` (`next typegen` e `tsc`) sem erro; `eslint` com 0 erros (8 avisos
   antigos em 4 arquivos que este ticket não toca); a suíte de unidade inteira no último commit,
   **332 arquivos e 2.964 testes, verdes**. Os novos: a tela (22), os hooks (15), as contas da tela
   (18), as datas (13) e as rotas do BFF (10).
3. **`apps/api`** (só comentários mudaram): `tsc --noEmit` sem erro, `oxlint` com os mesmos dois avisos
   antigos, e `test/billing.e2e-spec.ts` (o spec que executa o `plans.sql`), 18 testes, verde.
4. **O e2e novo (`e2e/subscribe.spec.ts`), só ele**, contra o `next dev` na 3200 e a API na 3201, com
   uma configuração do Playwright temporária (não entrou no commit): 2 testes, verdes, em três rodadas
   (depois da correção de contraste, da do formulário bloqueado e da última refatoração). A primeira
   rodada achou o problema de contraste do item 1.
5. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits. A conferência nova
   (`web/landing-prices-match-api`) ficou vermelha com cada um de cinco erros plantados — um preço da
   landing, um do seed, `TRIAL_DAYS`, o mensal da Beelia e o arquivo da landing com outro formato — e
   verde de novo com cada um desfeito.
6. **Os testes postos à prova com 26 erros plantados**, um por vez, cada um desfeito em seguida (árvore
   limpa conferida no fim): **25 pegos de primeira**. O que passou — a regra do dígito do CNPJ quando o
   resto é menor que 2 — ganhou o teste que faltava (um CNPJ com dígito zero), que depois falhou com o
   erro plantado. Entre os 26: oferecer compra a uma página isenta; a economia contra o ciclo errado; a
   data de renovação no ciclo de uma fatura em aberto; a fatura de renovação de quem paga com cartão de
   crédito; perguntar a cada 5 s; perguntar para sempre; não recuar ao último dia do mês; o dia em UTC
   e não em Brasília; não guardar a escolha como primeira conferência; perguntar com a aba escondida;
   seguir perguntando depois do `429`; não reler a página que mudou; abrir a fatura com o valor mudado;
   abrir a fatura com `opener`; ignorar `BILLING_ACCOUNT_REQUIRED`; ler o catálogo onde nada se vende;
   ir ao painel sem os 4 s; não voltar ao painel com a cobrança desligada; não conferir o documento;
   recusar campos que não são mais pedidos; pedir dados com a compra bloqueada; não avisar a troca de
   ciclo; não dizer os dias de teste perdidos; dizer que o débito renova sozinho; não repassar o
   endereço do lojista à API.

### Na tela, de verdade (15/10/2026, das 01:12 às 01:22 de Brasília)

A API na 3201 (`nest start`, banco `harness_landing`) com `BILLING_ENFORCED=true` e a chave de sandbox só
no ambiente do processo; o web na 3200 (`next dev`). Uma conta "Teste S11 Lojista" criada pela tela de
cadastro (e-mail de teste, confirmado pelo Mailpit) e quatro páginas "Teste S11 …". Tudo abaixo foi
**visto**.

| Página | O que aconteceu | Como terminou |
|---|---|---|
| Em teste (7 dias) | Aberta a 1920, 1280 e 390 px (a 390, sem rolagem horizontal). **Só com o teclado**, a partir do "Início": Tab até o rádio marcado (Mensal), seta para a direita (Semestral), Tab para o nome, digitado, Tab para o CPF (inventado, válido; a máscara escreveu `111.444.777-35`), Tab até "Assinar e pagar R$ 323,40", Enter. A tela gravou a conta (`PUT /api/billing/account`, 1,4 s; o cliente nasceu no Asaas), escolheu o ciclo (`PUT …/subscription`, 1,5 s) e **a fatura abriu em outra aba**: R$ 323,40, vencimento 15/10/2026, `Plano Beelink semestral — página "Teste S11 Página Em Teste"`. Fechada a aba sem pagar, a tela mostrava o link da mesma fatura; recarregada, abriu com o semestral marcado, o aviso da fatura em aberto, "Renova contando do vencimento da fatura em aberto" e "Continuar o pagamento", que devolveu a mesma fatura (`PUT`, 751 ms). Paga pela ação de sandbox (`RECEIVED`, `BOLETO`): a tela achou o pagamento na conferência seguinte do relógio, disse "Pagamento confirmado" e foi ao painel da página 4 s depois | `ACTIVE`, `SEMIANNUAL`, 32340, `currentPeriodEndsAt` 2027-04-16 03:00 UTC (o fim de 15/04/2027 em Brasília), `BOLETO`, sem fatura. A tela, aberta de novo: "Em dia", "Paga até 15/04/2027", "Boleto", "Cada renovação gera uma fatura nova para pagar" |
| Teste vencido (fim do teste posto em 13/10 no banco) | "Teste encerrado", "O teste grátis terminou em 13/10/2026", sem a frase dos dias perdidos, e a conta já com dados ("Cobrança em nome de Teste S11 Lojista, CPF ***.444.777-**"). Mensal, com o mouse: a fatura de R$ 59,90 abriu em outra aba; paga pela ação de sandbox; "Pagamento confirmado" e o painel | `ACTIVE`, `MONTHLY`, 5990, `currentPeriodEndsAt` 2026-11-16 03:00 UTC |
| Captura | Anual, R$ 574,80, paga pela ação de sandbox: "Pagamento confirmado. Sua página está em dia até 15/10/2027." Depois, posta `EXEMPT` no banco: a rota levou ao painel da página, pedindo só a assinatura (nem o catálogo nem a conta) | `EXEMPT` |
| Sem chave | Com a API reiniciada com `BILLING_ENFORCED=true` e **sem a chave**: "A assinatura está indisponível no momento", os ciclos só para informar, nenhum campo, nenhum botão (depois do item 2 de "O que mudou"). Com a API reiniciada com a cobrança desligada: a rota levou ao painel da página, que continua como hoje | `TRIALING` |

**A fatura abriu em outra aba nas quatro escolhas** (Chromium, pelo navegador do Playwright).

**Os logs**, lidos no fim: a chave 0 vezes (inteira, sem o prefixo, um pedaço do meio, o começo), o CPF
0 vezes (com e sem pontuação), o nome e o e-mail da conta 0 vezes, `creditCardToken` 0 vezes. As
únicas linhas de erro são as duas respostas `503 BILLING_UNAVAILABLE` da execução sem chave, que o filtro
de exceções da API escreve como erro (risco 8 do S10).

**Limpeza:** as três assinaturas criadas estão `INACTIVE` e `deleted: true` no Asaas, e o cliente
`cus_000009487496` removido; a busca por "Teste S11" no nome responde 0. A assinatura do S8
(`teste-s8-sub-amanha-ok`) não foi tocada. No banco: a conta de teste, as quatro páginas e as contas e
páginas que os e2e criaram (`e2e-assinar-…`, `assinar-…`) apagadas; nenhuma linha órfã. A API e o web
foram encerrados, `pgrep -fl "worktrees/landing"` respondeu vazio, e o `apps/web/.next` foi apagado.

**Uma observação sobre as capturas:** a primeira captura depois de uma navegação, no navegador do
Playwright, às vezes devolvia um quadro antigo (o esqueleto, ou o estado anterior), embora o texto
esperado já estivesse na página. O log do web mostra um único pedido da página nesses casos: não houve
recarga. As capturas entregues foram refeitas e conferidas uma a uma.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook (nem `build-storybook`), a
  suíte Playwright inteira e as suítes de unidade e e2e inteiras da API: o briefing proíbe nesta
  máquina. Ficam para o push.
- **O e2e novo contra o app construído** (`next start`), que é como o CI o roda. Rodou só contra o
  `next dev`.
- **Um pagamento de cartão na fatura do Asaas**: os três foram pela ação de sandbox, que simula um
  boleto. O cartão (bandeira e 4 dígitos) no resumo da página paga só foi visto nos testes e na story.
- **A renovação devida (`PAST_DUE`, `SUSPENDED`), a fatura da renovação de Pix e o valor que mudou
  entre a tela e o clique**: só nos testes e nas stories. A cobrança na API não é avançada no tempo
  pelo sandbox.
- **O webhook** levando a página a `ACTIVE`: aqui não há webhook (o sandbox não alcança esta máquina);
  foi a conferência da tela.
- Outros navegadores (Safari, Firefox) e o bloqueio de aba de cada um; um leitor de tela de verdade;
  a tela em inglês fora dos testes.
- Nada em homologação nem em produção.

### O que o S5 (BEELINK-223, a trava) precisa saber

- **A tela chama só as rotas de cobrança:** `GET` e `PUT /stores/:slug/subscription`,
  `POST /stores/:slug/subscription/check`, `GET /billing/plans` e `GET`/`PUT /billing/account`. Nada mais
  da página (nem `GET /stores/:slug`): basta mantê-las abertas numa página travada, como o briefing do
  S5 já diz.
- **A tela mora dentro do shell do painel** (`(admin)`), e o shell pede, em toda página
  `/admin/<slug>/…`: `GET /stores/mine`, `GET /stores/:slug/panel-counts`, as duas leituras do sino
  (`/stores/:slug/orders?…`, `/stores/:slug/conversations?filter=UNREAD`) e
  `POST /stores/:slug/realtime/ticket`. Numa página travada essas vão responder o erro da trava; o
  `QueryClient` só leva à entrada com `AUTH_UNAUTHENTICATED`, então nada redireciona, mas cada leitura
  tenta 3 vezes por padrão. Vale o S5 ou o S14 decidir o que o shell faz com elas.
- **O que a tela já faz por situação:** `TRIAL_EXPIRED` e `CANCELED` oferecem os ciclos; `SUSPENDED` e
  `PAST_DUE` oferecem a fatura devida (e, sem fatura, "Verificar de novo"); `ACTIVE` mostra o resumo.
  Ao ver `ACTIVE` depois de abrir uma fatura, a tela vai ao painel da página em 4 s: **a trava precisa
  sair na mesma leitura**, sem esperar a rotina.
- **A vitrine:** nenhuma rota de cobrança do web derruba o cache da vitrine (`revalidateStore`), porque
  hoje nada que o visitante vê depende da situação da página. Se a vitrine travada for servida do
  cache, o `PUT` e o `check` que mudam a situação precisam passar a derrubá-lo (há um comentário em
  `apps/web/src/app/api/stores/[slug]/subscription/route.ts`).

### O que o S6 (BEELINK-224, o cupom) precisa saber

- **O campo do cupom entra no bloco `SubscriptionCheckout`** (`packages/ui/src/blocks/billing/`), ou num
  bloco irmão com o próprio botão, já que o cupom não escolhe ciclo. As frases vão em
  `subscription.*` dos dois dicionários da UI; os erros, em `errors` do web, como os `BILLING_*`.
- **A situação na tela vem de `subscribeViewOf`** (`apps/web/src/lib/subscribe-view.ts`): uma página no
  mês grátis precisa de um caso lá (e no `SubscriptionStanding`, a frase "Grátis até …"). Hoje
  `freePeriodEndsAt` não é lido pela tela.
- Quando o cupom for aceito, a leitura da assinatura deve ser escrita no cache de
  `billingKeys.subscription(slug)`, como a escolha do ciclo faz.

### O que o S2 e o S14 precisam saber

- **O endereço é `subscribePageOf(slug)`** (`apps/web/src/lib/subscribe-view.ts`):
  `/admin/<slug>/subscribe`. Não há link no menu.
- A rota leva de volta ao painel quando a cobrança está desligada, a página é isenta ou não tem
  assinatura; um card ou aviso que só aparece com a cobrança ligada nunca leva a um lugar vazio.

### O que o S16 (os textos) precisa saber

- As frases da tela estão em `packages/ui/src/locales/{pt-BR,en}.ts` (`subscription.*`) e as dos erros
  em `apps/web/src/locales/{pt-BR,en}.ts` (`errors.BILLING_*`). Nenhuma traz valor, dia ou número: os
  valores entram por `{placeholder}`.
- A frase de cancelar diz o que é verdade hoje ("fale com o suporte da Beelink"); muda quando o S12
  existir.
- **Pendência de antes de ligar a cobrança em produção: a política de privacidade não cita o CPF/CNPJ**
  guardado para a cobrança (decisão 26).

### Riscos, além dos de cima

6. **O e2e do web responde as rotas de cobrança no navegador.** O caminho de verdade (BFF → API →
   Asaas) está coberto pelos testes de unidade das rotas, pelos e2e da API e pela execução no sandbox
   acima, não pelo Playwright do CI.
7. **Um teste antigo do `packages/ui` é instável nesta máquina:** `customer-duplicates.test.tsx`
   ("asks before merging…") espera o foco no "Cancelar" logo depois de abrir o diálogo. Falhou em 5
   rodadas (inclusive com o `packages/ui/src` do commit de partida, `ddde173f`) e passou na última
   suíte inteira. Não é deste ticket e não foi mexido; se falhar no CI, não é por este PR.
8. **O link "voltar" das páginas de integração e de domínio ficou mais escuro** (item 1 de "O que
   mudou").
