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
