# BEELINK-220 (S2) — Painel: o card do plano no menu

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". A branch nasce da do S14
> (`feat/BEELINK-296-aviso-de-pagina-travada`, `abd4bce9`), que ainda está no PR #277 (e S10, S3, S11, S5,
> S16, S6 e S15 nos #270 a #276); o PR deste ticket tem `main` como base e só fica legível depois que eles
> entrarem. Toca `packages/ui` e `apps/web`. **Nenhuma rota da API muda, nenhum tipo de fio muda.** As
> decisões do épico não são reabertas; as que estão abaixo são do desenvolvedor. Leituras de base: os
> planos do S14 (`2026-10-15--BEELINK-296--aviso-de-pagina-travada.md`), do S6 (`…BEELINK-224--cupom-um-mes.md`)
> e do S16 (`…BEELINK-290--textos-da-assinatura.md`), as partes "O que o S2 precisa saber", e os do S11 e do
> S15. Escrito em 15/10/2026, antes do código.

## O problema

O lojista não tem, no painel, um lugar fixo que diga em que pé está a página aberta: em teste e por
quantos dias, grátis até quando, paga até quando, em atraso, cancelada ou travada. A tela Assinar
(`/admin/<slug>/subscribe`, S11) existe, mas nenhum link do menu leva a ela: o S11 deixou de propósito
para este card e para o aviso de página travada (S14) levarem.

O que não pode acontecer, em ordem de gravidade:

1. **Com `BILLING_ENFORCED` desligada (produção hoje), o menu mudar**: um card, um esqueleto que aparece e
   some, um espaço, uma consulta a mais.
2. **Ameaçar com uma trava que não vem**: a cor de aviso numa página isenta, no mês grátis, ou numa
   implantação sem a chave do Asaas da Beelink (onde nada trava, S5 decisão 7).
3. **Dizer outra coisa que a tela Assinar, a faixa e o aviso de página travada dizem**: outros dias
   restantes, outra data, a situação errada para quem está no mês grátis.
4. **Uma requisição a mais da assinatura**: o portão do S14 já a lê em toda página do painel.
5. **Um menu que muda de nome para o leitor de tela** quando a barra recolhe, ou que fala sozinho quando a
   situação muda.

## Definição de Pronto

1. O card aparece no menu lateral, acima de Configurações, em cada situação da página aberta, com o nome
   do plano e a situação em palavras, e leva à tela Assinar (`subscribePageOf(slug)`).
2. Some na página isenta, com a cobrança desligada e numa página sem assinatura; com a cobrança
   desligada o menu fica **exatamente** como hoje — provado num teste e na tela.
3. Aviso mais forte (cor de aviso, por token) nos 2 últimos dias do teste e do tempo grátis, no atraso e
   na trava; nunca onde nada trava. Datas no fuso de Brasília; dias restantes os da API.
4. Funciona com a barra recolhida (só ícone, com o mesmo nome acessível) e na gaveta do celular.
5. A assinatura é a mesma chave do portão e da tela Assinar (`billingKeys.subscription(slug)`), sem
   requisição a mais; esqueleto no carregamento, só onde se sabe que a cobrança está ligada.
6. Stories de cada situação e da barra recolhida; testes de componente.
7. Capturas a 1920 e 390 px (aberta, recolhida, gaveta) em `.claude/worktrees/subscription-pr/screens-220/`.
8. Tipos, lint e testes do web e da UI, `arch-gates` e `docs-gate` verdes.

## Decisões

### Onde o card mora e de quem ele fala

1. **Um bloco novo, `AdminPlanCard`** (`packages/ui/src/blocks/admin/admin-plan-card.tsx`, com o esqueleto
   em `admin-plan-card-skeleton.tsx`), desenhado pelo `AdminSidebar` a partir de uma prop de dados nova,
   `plan` (`{ view, href }`), **entre a lista de itens e os `footerItems`**, junto de Configurações, no pé
   da barra. Prop de dados e não um encaixe (`ReactNode`): a barra decide onde ele fica, se está recolhido,
   se é a página atual (`aria-current`) e que a gaveta fecha ao escolher, como faz com os itens.
2. **Sem a prop, o DOM da barra é o de hoje**, byte por byte: as duas listas, nada em volta. Com ela, o
   card e os `footerItems` ficam juntos num grupo do pé.
3. **A página é a do endereço** (`/admin/<slug>/…`). Em `/dashboard` e `/create-store` não há página
   aberta — o menu ali aponta para a primeira página, mas "o plano da página aberta" não existe — e nada é
   pedido, como no portão (decisão 6 do S14). O `AppShell` passa a usar `pageSlugOf` (`lib/page-lock-view.ts`)
   no lugar da expressão própria, que é a mesma.

### A leitura, sem requisição a mais

4. **O card observa a entrada `billingKeys.subscription(slug)` e nunca a pede** (`enabled: false`): quem
   pede é o portão (`usePageStanding`), uma vez por página aberta, de novo ao voltar para a aba com a
   cobrança ligada e a cada minuto com a página travada. O card muda junto com a tela Assinar (a escolha,
   a conferência), o cupom e o destravamento, porque todos escrevem nessa entrada. O hook é
   `usePlanCard(slug, locale)` (`services/billing/plan-card-hooks.ts`); as contas, `planCardOf`
   (`lib/plan-card-view.ts`).
5. **O nome do plano**: o que a página escolheu (`subscription.plan.name`); para quem nunca escolheu (em
   teste, no tempo grátis, travada sem ter pago), o plano à venda no catálogo (`GET /api/billing/plans`,
   a chave `billingKeys.plans()` da tela Assinar e do aviso, guardada 5 minutos), achado por `offersOf`
   como as outras telas acham; sem catálogo, "Assinatura da página" (`subscription.untitled`). O catálogo
   só é pedido com a cobrança ligada e só para quem nunca escolheu.
6. **Esqueleto só onde se sabe que a cobrança está ligada.** Na primeira leitura, antes de a API
   responder, não se sabe: um esqueleto ali apareceria e sumiria com a cobrança desligada, e o menu de
   hoje mudaria. Então o card não aparece até a resposta. O esqueleto aparece: (a) ao trocar de página,
   enquanto a assinatura da nova é lida, se a da anterior disse que a cobrança está ligada (a chave é da
   implantação, não da página; `placeholderData: keepPreviousData` dá a resposta anterior só para isso,
   nunca o conteúdo dela); (b) enquanto o nome do plano é lido do catálogo.

### O que o card diz

7. **As contas são as das outras telas**, nunca refeitas: a situação vem de `subscribeViewOf` (a da tela
   Assinar: o tempo grátis antes da situação, para quem nunca pagou), a trava de `pageLockOf` e os últimos
   dias e a carência de `pageStripOf` (`STRIP_DAYS = 2`). As frases são novas (`subscription.card.*`, nos
   dicionários da UI, pt-BR e en), no tom do S16, sem algarismo fora de `{placeholder}`:

   | A página | O card diz | Aviso forte |
   |---|---|---|
   | travada (`lock`, qualquer motivo, o mês grátis acabado inclusive) | "Página travada" | sempre |
   | no tempo grátis (cupom ou o mês de 13/10), nunca pagou | "Grátis até {data}", "Grátis até amanhã", "Grátis até hoje" | nos 2 últimos dias |
   | em teste | "Teste grátis: {n} dias restantes", "Teste grátis: termina amanhã", "Teste grátis: termina hoje" | nos 2 últimos dias |
   | teste acabado e não travada (sem a chave) | "Teste grátis encerrado" | não |
   | paga (`ACTIVE`) | "Renova em {data}" (o último dia pago, que é o vencimento da renovação); sem data, "Em dia" | não |
   | em atraso (`PAST_DUE`), ou suspensa sem trava (sem a chave) | "Pagamento em atraso" | na carência |
   | cancelada com acesso | "Cancelado: acesso até {data}" | não |
   | cancelada sem acesso e sem trava (sem a chave) | "Assinatura cancelada" | não |

   "Pagamento em atraso" e "Em dia" são as palavras dos selos da tela Assinar (o S16 sugeriu); "Página
   travada" é a palavra do produto para a trava.
8. **Datas inteiras, dd/mm/aaaa** (`dayInWords`, como a faixa, o aviso e a tela Assinar). Os exemplos do
   briefing sem o ano ("Grátis até 13/11") são ilustração: um plano anual pago em 15/10 diria "Renova em
   15/10" — que se lê como hoje.
9. **Aviso forte**, nas cores `bg-warning` / `text-warning-foreground` / `border-warning-foreground/20`
   (as da faixa): na trava, sempre — a API só diz `lock` onde a página trava; nos últimos dias do teste e
   do tempo grátis e na carência, **só depois de a leitura da conta de cobrança responder** (a condição da
   faixa: sem a chave ela responde `503 BILLING_UNAVAILABLE` e nada trava). Antes disso, e sem a chave, o
   card fica neutro com o mesmo texto: o texto diz o que é verdade, a cor é que ameaça. A conta é a mesma
   chave da faixa (`billingKeys.account()`), pedida só nesses estados. **A cancelada com acesso fica
   neutra**: o briefing lista três avisos fortes, e quem cancelou sabe que cancelou.
10. **Um ícone por situação**, que é o que sobra com a barra recolhida: relógio (teste), presente (tempo
    grátis), selo de conferido (paga), alerta (atraso), calendário riscado (cancelada), cadeado (travada).

### Como o card se comporta

11. **O card inteiro é um link** para a tela Assinar, com uma seta. O nome acessível é o nome do plano e a
    situação ("Plano Beelink, Teste grátis: 4 dias restantes"), igual com a barra aberta ou recolhida
    (`lg:sr-only`, como os itens) e com `title` só quando recolhida. Na tela Assinar, `aria-current="page"`.
    Nenhuma região viva: a situação muda sozinha (o destravamento, o cupom) e o menu não fala, como as
    contagens (BEELINK-309).
12. **Recolhida (a partir de `lg`)**: só o ícone, centrado como o dos itens; neutro, sem caixa (é um item
    a mais); com aviso, o quadrado na cor de aviso. **Na gaveta do celular**: o card inteiro, e escolher
    fecha a gaveta.
13. **Esqueleto** com a forma do card (ícone e duas linhas), e só o ícone com a barra recolhida.

## Fora do escopo

- A tela Plano e cobrança (S4): o card leva à tela Assinar. Cancelar (S12), trocar cartão (S13), e-mails (S7).
- **A fatura da renovação de quem paga com Pix ou boleto**: o card diz "Renova em"; a fatura aparece na tela
  Assinar, para onde ele leva.
- **`cancelRequestedAt`**: ninguém o escreve ainda (é do S12); o card lê a situação.
- O card em `/dashboard` e `/create-store` (decisão 3).
- O seletor de loja dizendo "Nenhuma loja" no primeiro quadro (visto pelo S14 e pelo S6): é de antes do
  épico e mudá-lo mudaria o painel com a cobrança desligada.

## Riscos

1. **Na primeira carga com a cobrança ligada, o card aparece um instante depois do menu**, sem esqueleto
   (decisão 6). Ele entra no pé da barra, acima de Configurações, que fica onde está.
2. **Os textos são proposta**, no tom do S16, e esperam a aprovação do Rafael com os dele.
3. **Com a cobrança ligada, duas leituras a mais, ambas compartilhadas**: o catálogo para quem nunca
   escolheu um plano (o mesmo da tela Assinar e do aviso, 5 minutos guardado) e a conta de cobrança nos
   últimos dias e na carência (a mesma da faixa). Sem a chave, a API escreve cada `503` da conta como erro
   no log (já visto pelo S14).
4. **A barra fica uns 60 px mais alta** com o card: com os 13 itens de uma loja, numa janela com menos de
   uns 600 px de altura útil, ela rola (já rola hoje abaixo de uns 520 px).
5. **Os dias restantes envelhecem como os da faixa**: a assinatura é lida uma vez por página aberta, e de
   novo ao voltar para a aba com a cobrança ligada; um painel aberto da noite para o dia mostra os de ontem
   até a próxima leitura.

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **O nome acessível do card é um `aria-label` montado das duas linhas** ("Plano Beelink, Teste grátis: 4 dias
   restantes"), e não o texto delas com uma vírgula escondida (`sr-only`), como estava no primeiro commit. Visto no
   Chromium: a vírgula escondida é absoluta, vira um bloco, e o nome saía "Plano Beelink , Teste grátis…" — o jsdom dos
   testes não via isso. Um teste fixa o `aria-label`.
2. **A seta mora na linha do nome do plano**, e não numa coluna própria: na coluna, ela tirava 26 px da situação, e
   "Teste grátis: 4 dias restantes" quebrava com "restantes" sozinho na segunda linha. Agora as frases cabem numa linha
   (o card tem 53,5 px de altura), menos "Cancelado: acesso até 12/11/2026", que leva a data para a segunda.
3. **Na tela Assinar, a borda do card escurece** (`border-shell-muted/50`), além do `aria-current`: só a sombra
   (`shadow-xs`) não se distinguia do card de sempre, visto a 2x.
4. **O teste de "nenhum card fora de uma página" ganhou a volta de uma página para o `/dashboard`**: o erro plantado de
   passar ao card a página do menu (e não a aberta) passava, porque no `/dashboard` sozinho não há resposta guardada
   para o card ler. Com a volta, há.
5. Nada mais: as decisões 1 a 13 viraram código como estão escritas.

### O que foi rodado

Postgres 18 (`beelink-domain-db`, 5442) e Mailpit (1027/8027). Disco: 4,8 Gi livres no começo e no fim (o mínimo foi
4,1 Gi, com o `.next` do `next dev`).

1. **`packages/ui`:** `tsc --noEmit` saiu com 0; `oxlint src/` com 0 erros (os dois avisos antigos, em
   `single-block-card.tsx` e `store-settings-form.tsx`); **a suíte inteira, 384 arquivos e 2.992 testes, verdes** (eram
   383 e 2.959 no S14). Os novos: o card (25, com axe aberto, recolhido, neutro e com aviso) e a barra com o card (8).
2. **`apps/web`:** `next typegen` e `tsc --noEmit` saíram com 0; `eslint` com 0 erros (os 8 avisos antigos, em arquivos
   que este ticket não toca); **a suíte inteira, 341 arquivos e 3.075 testes, verdes** (eram 339 e 3.046). Os novos: as
   contas do card (10), o hook (13) e o `AppShell` montado com o portão, como o `SignedInShell` monta (6).
3. **Os e2e `e2e/page-locked.spec.ts` (3) e `e2e/subscribe.spec.ts` (3)**, que este ticket não edita mas que desenham o
   card (as rotas de cobrança respondem "ligada" no navegador) e passam o axe na página inteira com ele: contra o `next
   dev` na 3200 e a API compilada na 3201 com a cobrança desligada, como a do Playwright, com uma configuração temporária
   fora do repositório: **6 de 6 verdes**.
4. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits (`pre-commit`).
5. **40 erros plantados nos testes**, um por vez, cada um desfeito por `git checkout` (árvore limpa conferida no fim):
   **40 pegos** — 39 na primeira rodada e o 40º depois do item 4 acima. Entre eles: o tempo grátis dito como teste; dois
   dias ditos como "amanhã"; amanhã e hoje trocados; o dia do acesso da cancelada e o da renovação sumidos; a trava dita
   como atraso; a cor de aviso nunca usada; `title` com a barra aberta, ou sem ele recolhida; `aria-current` nunca; a
   gaveta sem aviso de escolha; sem o `aria-label`; nada no lugar do esqueleto; as linhas do esqueleto na barra recolhida;
   uma região viva; o card acima do menu; o pé embrulhado mesmo sem card; o card aceso em toda tela ou nunca; o card sem
   saber que a barra recolheu; um card com a cobrança desligada; a trava olhada depois da situação; a trava ou a faixa sem
   aviso; a suspensa sem a chave dita como travada; os dias do teste com um a mais; **o card pedindo a assinatura ele
   mesmo**; **um esqueleto antes da primeira resposta**; a situação da página anterior dita para a nova; o esqueleto na
   troca de página com a cobrança desligada; o catálogo e a conta pedidos sempre; o aviso antes da leitura da conta, ou
   apesar do `BILLING_UNAVAILABLE`; sem esqueleto enquanto o nome do plano é lido; a página do menu no lugar da aberta;
   o card nunca entregue à barra.

### Com a cobrança desligada, como hoje (provado)

- **No teste** (`app-shell.test.tsx`): o `AppShell` com o portão dentro, com a resposta `billingEnforced: false` — com a
  linha no último dia do teste e com a linha travada —, desenha a `aside` com o mesmo `innerHTML` antes e depois de a
  resposta chegar, sem card e sem esqueleto; a única leitura de cobrança é a da assinatura, uma vez (a do portão).
- **Na tela, byte a byte:** a página com o teste vencido no banco, nos Pedidos, a 1920, com a API sem
  `BILLING_ENFORCED`. O `outerHTML` da `aside` com o código desta branch e com o código de antes (`abd4bce9`: só
  `app-shell.tsx` e `admin-sidebar.tsx` voltados por um instante e restaurados) teve o mesmo tamanho (12.320 caracteres)
  e o mesmo SHA-256 (`7920d42b…`), e os dois arquivos salvos são idênticos (`cmp`). Para ter certeza de que o navegador
  carregou mesmo cada versão: nenhum script tinha `usePlanCard` na de antes, um tinha na da branch. A tela abriu os
  Pedidos como sempre, e a única leitura de cobrança foi a da assinatura. Capturas 01 e 02.

### Na tela, de verdade (15/10/2026, das 07:19 às 07:40 de Brasília)

A API compilada na 3201 (`node dist/main.js`, banco `harness_landing`) — com a cobrança desligada, depois ligada com a
**chave de sandbox** só no ambiente do processo, depois ligada **sem a chave**, e por fim desligada para os e2e —; o web
na 3200 (`next dev`). Uma conta "Teste S2 Dona" (cadastro pela API, e-mail confirmado pelo Mailpit) com sete páginas,
cada uma numa situação posta pelo banco. **Nada foi pedido ao Asaas**: nenhuma página tinha assinatura lá. Tudo abaixo
foi **visto**, num Chromium próprio dirigido por um script (as verificações escritas no log); as capturas estão em
`.claude/worktrees/subscription-pr/screens-220/`.

| O quê | O que aconteceu |
|---|---|
| Em teste, 4 dias | "Plano Beelink / Teste grátis: 4 dias restantes", neutro, acima de Configurações; leituras: a assinatura (uma) e o catálogo (captura 03, detalhe 20) |
| Último dia… amanhã | O card âmbar "Teste grátis: termina amanhã" junto com a faixa do S14; a conta lida uma vez (04, 21) |
| Grátis até | "Grátis até 13/11/2026" (uma página de 13/10 no mês grátis, com o teste já vencido), neutro (05, 22) |
| Paga | "Renova em 12/11/2026", sem leitura do catálogo (o plano é o da escolha) (06, 23) |
| Em atraso, na carência | "Pagamento em atraso", âmbar, com a faixa "Pague até 19/10/2026" (07, 24) |
| Cancelada com acesso | "Cancelado: acesso até 12/11/2026", neutro, a data na segunda linha (08, 25) |
| Travada | "Página travada", âmbar, com o cadeado, ao lado do aviso do S14 (09, 26) |
| Troca de página pelo shell | O esqueleto ocupou o lugar do card enquanto a nova página era lida (visto por um `MutationObserver`), e a assinatura foi lida uma vez |
| Barra recolhida | O ícone sozinho, 44 px, o mesmo nome e o `title` igual a ele; neutro como um item; âmbar em quadrado no aviso e na trava (10 a 12, detalhes 29 a 31) |
| Só o teclado | De "Avaliações", um Tab chegou ao card (anel de foco visível) e Enter abriu a tela Assinar, onde o card tem `aria-current="page"` e a borda escura (13, 14, detalhe 28) |
| 390, gaveta | O card inteiro no pé da gaveta, sem rolagem horizontal; escolher o card fechou a gaveta e abriu a tela Assinar (15 a 18) |
| Ligada sem a chave | A página no último dia do teste: o card neutro e nenhuma faixa (a conta respondeu `503 BILLING_UNAVAILABLE`, uma vez); a página com o teste vencido não trava e o card diz "Teste grátis encerrado" (19, 27) |
| Isenta, cobrança ligada | Nenhum card (32) |
| O axe na barra | Nenhuma violação em nenhuma situação, aberta ou recolhida |

**Limpeza:** no banco, as sete contas desta sessão (a de teste e as seis dos e2e) apagadas com as páginas e as
assinaturas, e os três tíquetes do canal em tempo real que os e2e deixaram (vencidos, de lojas apagadas): 0 contas, 0
páginas, nada órfão. Os sete e-mails delas apagados do Mailpit. A API e o web encerrados (`pgrep -fl "worktrees/landing"`
vazio); o `apps/web/.next` (605 MB) apagado; os arquivos que o navegador do MCP escreveu nesta sessão removidos, um a um,
pelo nome.

**Vistos, e não deste ticket:**

- **O navegador do Playwright MCP foi dirigido por outra mão durante esta sessão**: com ele aberto no painel, o web
  registrou idas a `/admin`, `/admin/teste-s2-paga` e `/` que eu não pedi, e a página foi fechada uma vez e outra vez
  apareceu em `about:blank`. Passei a usar um Chromium próprio, sem janela, por um script com o Playwright do repositório;
  do MCP ficaram só a comparação byte a byte e as capturas 01 e 02, conferidas antes de salvar.
- Em desenvolvimento, o selo "N" do Next fica no canto de baixo da barra, por cima do card e de Configurações; nas
  capturas ele foi escondido. Não existe no app construído.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook (as stories novas só foram compiladas pelo
  `tsc` da UI) e a suíte Playwright inteira: o briefing proíbe nesta máquina. **Os e2e rodaram contra o `next dev`**,
  não contra o app construído, que é como o CI os roda.
- Nada da API mudou, e nenhum spec da API foi rodado.
- **O card mudando no instante do pagamento, do cupom ou do destravamento**: coberto pelo teste do hook (a entrada
  escrita como a tela Assinar e o cupom escrevem); na tela, nenhum pagamento foi feito neste ticket (o S14 viu o caminho
  de ponta a ponta no sandbox, e o card lê a mesma entrada).
- Os dias virando à meia-noite com o painel aberto; o card em inglês fora dos testes; um leitor de tela de verdade;
  outros navegadores; homologação e produção.

### O que o S17 (o roteiro para ligar) precisa saber

- **O card é a entrada da tela Assinar no menu**, em toda tela do painel de uma página, com a cobrança ligada. No roteiro
  da homologação, conferir cada situação: em teste (os dias), os 2 últimos dias do teste e do tempo grátis (âmbar, junto
  com a faixa), grátis até (as páginas de 13/10 até 13/11/2026), paga ("Renova em"), em atraso (âmbar), cancelada com
  acesso, travada (âmbar, cadeado); isenta e com a cobrança desligada, nenhum card.
- **Ligar `BILLING_ENFORCED` antes da chave mostra o card a todo lojista**, neutro, levando a uma tela Assinar que diz
  "indisponível". A ordem do deploy (a chave antes, a variável por último) evita isso.
- **"Renova em" é o último dia pago**, o dia em que vence a renovação. Quem paga com Pix ou boleto só vê a fatura da
  renovação na tela Assinar: o card não diz que ela saiu (fora do escopo, acima).
- O nome do plano vem do catálogo para quem nunca escolheu (guardado 5 minutos): mudar o nome no seed chega ao card em
  até 5 minutos depois do deploy.
- Na primeira carga com a cobrança ligada, o card aparece um instante depois do menu (risco 1).

### Riscos, além dos de cima

6. **O nome acessível é um `aria-label`**: se as frases do card mudarem e o rótulo não for montado das mesmas, o nome
   e o texto se separam. Ele é montado das duas linhas no próprio componente, e um teste o fixa.
