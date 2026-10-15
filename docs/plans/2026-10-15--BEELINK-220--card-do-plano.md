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
