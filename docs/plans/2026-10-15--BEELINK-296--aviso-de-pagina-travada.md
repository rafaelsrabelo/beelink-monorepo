# BEELINK-296 (S14) — Painel: a página travada e as faixas de aviso

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". A branch nasce da do S15
> (`feat/BEELINK-297-paginas-que-ja-existiam`, `dfbf4646`), que ainda está no PR #276 (e S10, S3, S11, S5,
> S16 e S6 nos #270 a #275); o PR deste ticket tem `main` como base e só fica legível depois que eles
> entrarem. Toca `apps/web` e `packages/ui`. **Nenhuma rota da API muda, nenhum tipo de fio muda.** As
> decisões do épico não são reabertas; as que estão abaixo são do desenvolvedor. Leituras de base: os
> planos do S5 (`2026-10-15--BEELINK-223--pagina-travada.md`, "O que o S14 precisa saber"), do S11
> (`…BEELINK-293--tela-assinar.md`), do S16 (`…BEELINK-290--textos-da-assinatura.md`), do S6
> (`…BEELINK-224--cupom-um-mes.md`) e do S15 (`…BEELINK-297--paginas-que-ja-existiam.md`). Escrito em
> 15/10/2026, antes do código.

## O problema

A API já trava uma página que não está em dia (S5): toda rota do painel dela responde `403 PAGE_LOCKED`,
menos a assinatura. O web ainda não sabe o que fazer com isso: o início do painel de uma página travada
fica no esqueleto e cai num estado degradado, as outras telas mostram a frase do erro onde a lista
estaria, o modo design dá erro, e o canal em tempo real para no `403` e não volta depois do pagamento.
Nada avisa o lojista **antes** de travar, e as páginas da conta de uma loja fora do ar ainda oferecem o
carrinho, a busca e "Fazer pedido no WhatsApp".

O que não pode acontecer, em ordem de gravidade:

1. **Com `BILLING_ENFORCED` desligada (produção hoje), o painel mudar**: uma faixa, uma tela nova, um
   esqueleto a mais, um atraso, uma consulta que mude o que se vê.
2. **Dizer a uma página que ela trava quando não trava**: isenta, no mês grátis, numa implantação sem a
   chave do Asaas (onde nada trava, S5 decisão 7), ou contar o teste de quem usou cupom.
3. **Uma tela do painel em branco ou com erro técnico** numa página travada, ou o lojista sem saída.
4. **A página paga continuar travada no painel** depois de a API saber do pagamento, ou pedir que ele
   saia e entre.
5. **Travar a outra página do mesmo lojista**, ou o shell (menu, troca de página, conta).

## Definição de Pronto

1. Cada motivo de trava (teste vencido, renovação não paga, cancelada, mês grátis acabou) mostra o seu
   aviso, com os valores de cada ciclo lidos do catálogo, e leva à tela Assinar.
2. As faixas aparecem nos dias certos: nos 2 últimos dias do teste (e do tempo grátis) e durante a
   carência de uma renovação não paga, com as datas da assinatura no fuso de Brasília, e levam à tela
   Assinar.
3. Uma página com o teste vencido paga pela tela Assinar e volta a `ACTIVE` sem ajuda: o painel dela
   volta ao normal sem sair e entrar, o canal em tempo real inclusive.
4. Nenhuma tela do painel fica em branco ou em erro técnico numa página travada (o modo design
   inclusive); a outra página do mesmo lojista segue aberta; o shell segue funcionando.
5. Com `BILLING_ENFORCED` desligada, o painel fica exatamente como hoje — provado.
6. As páginas da conta de uma loja fora do ar não mostram o que vende.
7. e2e do web (só o spec novo) do bloqueio e da volta; tipos, lint e testes do web e da UI, `arch-gates`
   e `docs-gate` verdes.

## Decisões

### Quem decide que a página está travada, e onde

1. **Um portão no shell do painel, no navegador** (`PageLockGate`, `components/billing/`), montado em
   volta das telas em `SignedInShell`, dentro do `AppShell`: o menu, a troca de página e a conta ficam
   fora dele e continuam de pé. Ele vale para toda rota `/admin/<slug>/…` do grupo `(admin)`, porque é
   o layout delas, e persiste entre as navegações da mesma página. No navegador e não no servidor do
   Next pelos motivos do S11 (decisão 2): o e2e do web só alcança as rotas do BFF pelo navegador, e a
   API do Playwright roda com a cobrança desligada; e um layout que espera uma leitura atrasa toda
   navegação do painel, que é o que o `(admin)/layout.tsx` evita de propósito.
2. **Duas fontes, a mesma regra da API:**
   - **a leitura da assinatura** (`GET /api/stores/:slug/subscription`, a mesma chave
     `billingKeys.subscription(slug)` da tela Assinar e do card do S2): `subscription.lock` diz o
     motivo, e é a regra do S5 calculada na hora (`lockOf`), nunca refeita no navegador;
   - **a recusa de qualquer leitura do painel com `PAGE_LOCKED`** (o briefing: "quando a API responder
     a trava"): uma consulta ativa recusada depois da última leitura da assinatura põe o esqueleto da
     trava no lugar da tela e lê a assinatura de novo, uma vez por recusa. É o que pega a página que
     trava com o painel aberto (o teste que vence à meia-noite) e o que evita, no primeiro carregamento,
     a tela mostrar a frase do erro antes de a assinatura responder. Uma escrita recusada com
     `PAGE_LOCKED` (um "Salvar") faz o mesmo, pelo `MutationCache` do `QueryClient`.
3. **A tela Assinar (`/admin/<slug>/subscribe`) nunca é trocada**: é a saída. O portão também não a
   espera nem lhe põe faixa (ela diz a situação da página no topo).
4. **O modo design** (`/admin/<slug>/design`, grupo `(editor)`, sem o shell) **leva ao início do painel
   da página** (`redirect`), onde está o aviso, quando a leitura pública diz que a loja está fora do ar
   (`unavailable`) ou a prévia do dono responde `PAGE_LOCKED`. As duas porque a leitura pública fica
   até um minuto guardada (S5, decisão 23). Desenhar o aviso dentro do editor perderia o menu e a troca
   de página.

### Com a cobrança desligada, exatamente como hoje

5. **Nada espera a leitura da assinatura.** Enquanto ela não chega, o portão desenha a tela como hoje.
   Com `billingEnforced: false`, ele desenha `{canal}{nada}{tela}` — os mesmos elementos, sem
   embrulho: o DOM do painel é o de hoje, byte por byte (um teste confere).
6. **A única consulta a mais é essa leitura, uma vez por página aberta** no shell (não a cada
   navegação, porque o shell persiste), e nunca de novo ao voltar para a aba quando ela disse que a
   cobrança está desligada. É a mesma leitura que o card do S2 fará em toda tela. O catálogo e a conta
   de cobrança nunca são pedidos com a cobrança desligada. Fora de uma página (`/dashboard`,
   `/create-store`) nada é pedido.

### A tela de página travada

7. **No lugar da tela, dentro do shell**: o nome e o logo da página (de `/stores/mine`, que o shell já
   lê: `GET /stores/:slug` está travada, S5 decisão 15), o título e o texto pelo motivo, o botão para a
   tela Assinar, os preços de cada ciclo e a renovação, e o que estar travada quer dizer. As frases são
   as do S16 (`subscription.locked`), sem algarismo escrito.
8. **O motivo e a data**, lidos da assinatura:

   | `lock` | Motivo na tela | `{date}` |
   |---|---|---|
   | `TRIAL_EXPIRED` sem `freePeriodLastDay` | "Seu teste grátis acabou" | `trialLastDay` |
   | `TRIAL_EXPIRED` com `freePeriodLastDay` | "Seu mês grátis acabou" (`FREE_PERIOD_OVER`, S6) | `freePeriodLastDay` |
   | `SUSPENDED` | "A renovação não foi paga" | o dia de Brasília antes de `graceEndsAt` |
   | `CANCELED` | "Sua assinatura foi cancelada" | o dia antes de `currentPeriodEndsAt` |

   Sem a data, a frase sem data (`textsUndated`). O botão é "Pagar a renovação" numa suspensa e
   "Escolher um plano" nas outras, e leva a `subscribePageOf(slug)`.
9. **Os preços** são os do plano à venda no catálogo (`GET /api/billing/plans`, `offersOf`, a mesma
   conta da tela Assinar): "Mensal: R$ 59,90 por mês", "Semestral: R$ 323,40 a cada 6 meses, R$ 53,90
   por mês"… Esqueleto enquanto chegam; sem catálogo, a lista some e o resto fica.
10. **"Quem já comprou continua vendo os próprios pedidos"** só numa loja (não num site); **"Suas outras
    páginas continuam funcionando"** só para quem tem outras.
11. **Esqueleto** enquanto o motivo não chega (recusa ouvida antes da leitura); **falha com "Tentar de
    novo"** quando a leitura da assinatura falha depois de uma recusa (`subscription.failed`).
12. **Enquanto a tela de página travada está à mostra, a assinatura é relida a cada minuto e ao voltar
    para a aba** (só a leitura do bee-link, sem perguntar ao Asaas): uma página paga por outro caminho
    (o webhook, a rotina) abre sozinha. Na tela Assinar isso não acontece, por causa da corrida que o
    S11 evitou (decisão 5 do "Como ficou" dele).

### A volta, depois do pagamento

13. **Quando a leitura da assinatura passa de travada a aberta** (a conferência da tela Assinar, um
    cupom, a releitura), o portão:
    - **reinicia as leituras que tinham sido recusadas com `PAGE_LOCKED`** (`resetQueries`): voltam ao
      esqueleto e são pedidas de novo, sem mostrar o erro velho; as outras ficam como estão;
    - **monta o canal em tempo real de novo**: enquanto a página está travada ele nem é montado (o
      ticket seria recusado), e montado de novo ele pede um ticket novo.
14. **Uma página travada só pela recusa** (a leitura da assinatura disse aberta) não reinicia nada: é
    uma discordância de instante que se resolve na leitura seguinte, e assim não há laço de pedidos.

### As faixas

15. **Quando:**
    - **teste**: página em `TRIALING`, sem tempo grátis em curso, com `trialDaysLeft` 2, 1 ou 0 ("os 2
      últimos dias", com o "termina em 2 dias" do briefing) — `trialMany`, `trialOne`, `trialToday`;
    - **tempo grátis** (S6: olhar `freePeriodDaysLeft` antes de `trialDaysLeft`): página que nunca pagou,
      com `freePeriodDaysLeft` 2, 1 ou 0. Frases novas, no tom do S16: `banners.freeMany`, `freeOne`,
      `freeToday`. Fora desses dias, uma página no tempo grátis não tem faixa, e a do teste nunca
      aparece para ela (o fim do teste não a trava);
    - **carência**: página `PAST_DUE` ainda aberta (`lock` nulo): "Pague até {data} para a página não
      travar", com `{data}` o dia de Brasília antes de `graceEndsAt` (a API sempre o manda numa página
      em atraso), e o aviso do boleto.
16. **Só onde a página pode travar:** a faixa espera a leitura da conta de cobrança e não aparece quando
    ela responde `BILLING_UNAVAILABLE` (sem a chave do Asaas, nada trava, S5 decisão 7: a faixa seria uma
    ameaça falsa levando a uma tela que diz "indisponível"). É o mesmo sinal que a tela Assinar usa, e a
    mesma chave de cache.
17. **Onde:** no topo de toda tela do painel da página, menos a tela Assinar (para onde ela leva) e o
    modo design (sem shell). Cores só por token: um par novo, `--warning` e `--warning-foreground`, no
    `globals.css` (claro e escuro), que o card do S2 também vai usar.

### A vitrine fora do ar

18. **As páginas da conta de uma loja fora do ar não mostram o que vende**: o cabeçalho fica com o logo,
    a conta e as conversas, sem a busca, o "Entregar em", o carrinho e o menu de categorias; o rodapé
    fica com os textos legais, as redes e o endereço, sem a coluna da loja (produtos, categorias,
    carrinho) e sem "Fazer pedido no WhatsApp". Decidido por `store.unavailable`, que só existe numa loja
    travada. O cabeçalho da loja sai de `storefront-frame.tsx` (257 linhas, acima do limite) para um
    arquivo próprio, onde a regra mora.

## Fora do escopo

- O card do plano no menu (S2), os e-mails (S7), trocar cartão (S13), cancelar (S12), a tela Plano e
  cobrança (S4).
- O prazo da carência dentro da tela Assinar (o S16 deixou para o S14 decidir: a faixa não aparece lá,
  decisão 3).
- "Tem um cupom?" na tela de página travada (o S6 disse opcional): o botão leva à tela Assinar, onde o
  campo está.
- Uma faixa para a cancelada que ainda funciona: o briefing pede duas faixas; o card do S2 diz
  "Cancelado: acesso até …".
- O seletor de loja mostrar "Nenhuma loja" no primeiro quadro: acontece em toda tela do painel desde
  antes do épico, e mudá-lo mudaria o painel com a cobrança desligada.
- O que as abas da conta do cliente mostram dentro da área (favoritos, "comprar de novo"): a API já os
  recusa (S5); aqui, só o cabeçalho e o rodapé.

## Riscos

1. **Uma consulta a mais em toda página aberta no painel**, também com a cobrança desligada (decisão 6):
   a leitura da assinatura, uma por página por visita ao shell. É a do card do S2.
2. **Um formulário aberto quando a página trava** perde o que foi digitado: a tela vira o aviso na
   primeira recusa (decisão 2). A faixa avisa nos 2 dias antes.
3. **A faixa aparece um instante depois da tela** (espera a assinatura e a conta), e empurra o conteúdo
   para baixo uma vez por visita ao shell.
4. **Uma discordância de instante entre a leitura e a trava** (decisão 14) deixa a tela com a frase da
   trava até a leitura seguinte.

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **A tela só é fechada pela recusa antes da primeira resposta da assinatura** (decisão 2). O plano dizia
   "uma consulta recusada depois da última leitura da assinatura põe o esqueleto da trava no lugar da
   tela". O primeiro teste disso entrou em laço e derrubou o processo de teste: o esqueleto tira a tela, a
   leitura dela deixa de estar em uso, a recusa "some", a tela volta, monta, pede de novo, é recusada… Ficou
   assim: antes de a assinatura responder pela primeira vez, qualquer leitura guardada recusada com
   `PAGE_LOCKED` fecha a tela (a da tela posta de lado inclusive); depois, uma recusa mais nova que a última
   leitura só faz ler a assinatura de novo, uma vez por recusa, e não fecha nada — quem decide é a
   resposta. Um teste prova que o laço não volta (erro plantado 9, abaixo).
2. **O recomeço das leituras recusadas acontece no ouvinte do próprio cache do TanStack**, quando a
   assinatura passa de travada a aberta (`useStartOverOnceOpen`, `page-lock-hooks.ts`), e não num efeito do
   React: o lint do React proíbe `setState` direto num efeito, e no ouvinte ele acontece antes de a tela ser
   desenhada de novo. Só para uma página que a leitura disse travada (decisão 14).
3. **A faixa ocupa a largura toda da coluna do painel**, e não a medida da maioria das telas
   (`max-w-6xl`): vista a 1920, ela ficava desalinhada do início do painel, que usa a largura toda. A faixa
   é da página, não da tela de baixo.
4. **O cabeçalho da loja saiu de `storefront-frame.tsx` para `shop-header.tsx`** (`shopHeaderOf`), onde
   mora a regra da loja fora do ar; a moldura caiu de 257 para 227 linhas. O menu de categorias e o
   rodapé (`shopFooterColumnsOf`) ganharam a mesma regra.
5. **`pagePreviewAt` passou a distinguir a trava** (`PREVIEW_LOCKED`) de uma página que não existe.
6. **`billingKeys.subscriptions()`**, o prefixo de todas as assinaturas, para a escrita recusada com
   `PAGE_LOCKED` pedir a leitura de novo pela fábrica de chaves.
7. Nada mais: as decisões 1 a 18 viraram código como estão escritas.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027). Disco: 4,8 Gi livres no começo e no
fim (caiu a 3,9 Gi durante o laço do teste da decisão 1, e voltou).

1. **`packages/ui`:** `tsc --noEmit` saiu com 0; `oxlint src/` com 0 erros (os dois avisos antigos, em
   `single-block-card.tsx` e `store-settings-form.tsx`); **a suíte inteira, 383 arquivos e 2.959 testes,
   verdes** (eram 381 e 2.945 no S6). Os novos: o aviso (9, com axe), o esqueleto (1), a faixa (4, com
   axe), e o teste das palavras cobrindo as três frases novas.
2. **`apps/web`:** `next typegen` e `tsc --noEmit` saíram com 0 (inclui `e2e/`); `eslint` do workspace
   inteiro, 0 erros (os 8 avisos antigos, em arquivos que este ticket não toca); **a suíte inteira, 339
   arquivos e 3.046 testes, verdes** (eram 334 e 3.008 no S6). Os novos: o portão (15), as contas da trava
   e da faixa (14), o modo design (3), a leitura da prévia (2), o cabeçalho da loja fora do ar (3) e o
   rodapé (1).
3. **O e2e novo, `e2e/page-locked.spec.ts` (3 testes), e o do S11, `e2e/subscribe.spec.ts` (3)**, contra o
   `next dev` na 3200 e a API compilada na 3201 com a cobrança desligada (como a do Playwright), com uma
   configuração temporária do Playwright (apagada, fora do commit): **6 de 6 verdes no código final**. A
   primeira rodada achou um problema de contraste — da própria tela de Pedidos, de antes deste ticket (o
   cinza `muted-foreground` sobre o fundo do painel, 4,42:1, o mesmo que o S11 viu na tela Assinar) —, e o
   axe do teste das faixas passou a olhar só a faixa.
4. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits (`pre-commit`).
5. **Os testes postos à prova com 27 erros plantados**, um por vez, cada um desfeito por `git checkout`
   (árvore limpa conferida no fim): **26 pegos**. O que passou é equivalente: tirar "uma página travada não
   tem faixa" de `pageStripOf` não muda nada, porque nenhuma página travada cai num ramo de faixa (a trava
   por teste implica a situação lida `TRIAL_EXPIRED`; por suspensão, `SUSPENDED`). **Um passou na primeira
   rodada e ganhou o teste que faltava:** sem o recomeço das leituras recusadas, a tela da página paga ainda
   aparecia certa (o TanStack desenha do esqueleto uma leitura sem dados que monta de novo); o que faltava
   ver era uma leitura **do shell**, que fica montada — o teste agora tem uma, e ela tem de ser pedida de
   novo pelo próprio destravamento. Entre os 27: a faixa três dias antes; o tempo grátis olhado depois do
   teste; o mês grátis acabado dito como teste; o último dia da carência como o próprio dia de
   `graceEndsAt`; a trava dita com a cobrança desligada; a suspensa datada pelo período; as leituras não
   recomeçadas; a recusa contada só enquanto a tela está em uso (o laço, pego pelo limite de tempo); nenhuma
   releitura depois de uma recusa; nenhuma releitura a cada minuto; o canal montado com a página travada;
   o aviso por cima da tela Assinar; **um embrulho em volta da tela com a cobrança desligada**; a faixa sem
   a chave do Asaas; a escrita recusada que ninguém ouve; o cabeçalho e o rodapé da loja fora do ar
   vendendo; o modo design surdo à prévia recusada; a recusa da prévia tomada por página inexistente; a
   frase dos pedidos dos clientes num site; a linha do mensal com as palavras de um período pago de uma
   vez; "amanhã" dito como "daqui a 1 dias"; o tempo grátis dito como teste; a carência sem o aviso do
   boleto; um algarismo escrito à mão na faixa; o título do aviso fora do `h1`.

### Com a cobrança desligada, como hoje (provado)

- **No teste:** com `billingEnforced: false` — mesmo com uma linha de teste vencido e `lock` preenchido, e
  com o último dia do teste —, o `innerHTML` do painel em volta da tela é exatamente o da tela sozinha,
  antes e depois de a assinatura responder; o canal fica montado o tempo todo; a única requisição é a da
  assinatura; fora de uma página (`/dashboard`) não há nenhuma. Plantar um `<div>` em volta da tela faz o
  teste falhar.
- **Na tela, de verdade** (API com `BILLING_ENFORCED=false`): a página com o teste vencido no banco abriu
  os Pedidos como hoje, e a com o último dia do teste abriu o início como hoje — sem faixa, sem aviso, o
  modo design abrindo; a leitura da assinatura respondeu `billingEnforced: false` e `lock: null`; nenhuma
  leitura de `/api/billing/*` (nem catálogo, nem conta); o canal em tempo real conectado. Capturas 01 e 02.

### Na tela, de verdade (15/10/2026, das 06:25 às 06:35 de Brasília)

A API compilada na 3201 (`node dist/main.js`, banco `harness_landing`) — primeiro com a cobrança
desligada, depois com `BILLING_ENFORCED=true` e a **chave de sandbox** só no ambiente do processo, depois
ligada **sem a chave** —; o web na 3200 (`next dev`). Uma conta "Teste S14 Dona" (cadastro pela API,
e-mail confirmado pelo Mailpit) com três páginas: "Teste S14 Loja" e "Teste S14 Outra" (lojas) e "Teste S14
Site" (site). As situações postas pelo banco. Tudo abaixo foi **visto**; as capturas estão em
`.claude/worktrees/subscription-pr/screens-296/`.

| O quê | O que aconteceu |
|---|---|
| Teste vencido (último dia 13/10), nos Pedidos, a 1920, 1280 e 390 | "Seu teste grátis acabou", "terminou em 13/10/2026, e nada foi cobrado", os três preços do catálogo de verdade (R$ 59,90; R$ 323,40 a cada 6 meses, R$ 53,90 por mês; R$ 574,80 a cada 12 meses, R$ 47,90 por mês), a renovação, "Escolher um plano" e as quatro frases do que é estar travada. O shell de pé. As leituras do painel e o ticket do canal responderam `403` **uma vez cada**, sem repetição; a 390, sem rolagem horizontal |
| A outra página, pela troca de página do shell | Abriu como sempre (tudo `200`, canal conectado), com a faixa "O teste grátis desta página termina amanhã, 16/10/2026." no início e nos Pedidos, a 1920, 1280 e 390 |
| Renovação não paga e carência acabada, num **site** | "A renovação não foi paga", "o prazo para pagar terminou em 10/10/2026", "Pagar a renovação" — que levou à tela Assinar na renovação devida, sem faixa e sem aviso por cima —, e sem a frase dos pedidos dos clientes |
| Em atraso dentro da carência | A faixa "A renovação desta página não foi paga", "Pague até 19/10/2026 para a página não travar.", o aviso do boleto e "Pagar a renovação", a 1920 e 390 |
| Cancelada com o período acabado (site) | "Sua assinatura foi cancelada", "o período pago terminou em 11/10/2026" |
| Mês grátis acabado (último dia 14/10) | "Seu mês grátis acabou", "terminou em 14/10/2026" |
| Modo design da página travada | Levou ao início do painel, com o aviso |
| A vitrine fora do ar, na entrada do cliente, a 1920 e 390 | O nome da loja e "Minha conta" no cabeçalho, só a coluna legal no rodapé; a mesma página de uma loja no ar mostra a busca, "Entregar em", o carrinho, "A loja" e "Fazer pedido no WhatsApp" |
| **Só o teclado** | Do título do aviso, um Tab foi ao "Escolher um plano" (anel de foco visível) e Enter abriu a tela Assinar |
| **O pagamento, no sandbox** | Na tela Assinar: nome e um CPF inventado e válido, Mensal, "Assinar e pagar R$ 59,90" — o cliente e a assinatura nasceram no sandbox e a fatura abriu em outra aba ("Plano Beelink mensal — página "Teste S14 Loja"", R$ 59,90, vencimento hoje). Paga pela ação de teste `confirm` (`RECEIVED`, boleto, 200 na primeira). A conferência do relógio da tela achou o pagamento: "Pagamento confirmado", "em dia até 15/11/2026", e 4 s depois o início do painel, **já aberto**: as leituras do shell recusadas antes foram pedidas de novo logo em seguida (`panel-counts`, as duas do sino e as conversas, `200`), **o canal pediu um ticket novo (`200`) e conectou com outra sessão**, e o início leu tudo com `200`. No banco: `ACTIVE`, mensal, 5990, período até o fim de 15/11 de Brasília, boleto |
| Ligada **sem a chave** | A página cancelada com o período acabado abriu normal (`lock: null`); a página em carência abriu **sem faixa** — a leitura da conta respondeu `503 BILLING_UNAVAILABLE`, uma vez, sem repetição |

**Os logs:** a chave (inteira e um pedaço do meio), o CPF (com e sem pontuação), a senha e o e-mail da
conta 0 vezes nos logs das três APIs e do web. A única linha de erro é a do `503 BILLING_UNAVAILABLE` da
leitura da conta sem a chave, que o filtro de exceções da API escreve como erro (risco 8 do S10).

**Limpeza:** no sandbox, a assinatura ficou `INACTIVE` e `deleted: true`, o cliente foi removido, e a busca
por "Teste S14" responde 0; a assinatura `teste-s8-sub-amanha-ok` não foi tocada. No banco, a conta de
teste e as dezesseis contas que os e2e criaram nas duas rodadas (com as páginas e as assinaturas delas) apagadas: 0 contas, 0
páginas, nada órfão. Os e-mails delas apagados do Mailpit. A API e o web encerrados (`pgrep -fl
"worktrees/landing"` vazio); o `apps/web/.next` (833 MB) e o `apps/web/test-results` apagados; os arquivos
que o navegador do Playwright escreveu nesta sessão removidos (só os desta sessão, por um marcador de
tempo).

**Vistos, e não deste ticket:**

- **Ao primeiro quadro de uma página do painel, o seletor diz "Nenhuma loja" e o menu de uma loja aparece
  num site**, até `/stores/mine` responder. Acontece em toda tela, com a cobrança desligada também.
- **A primeira visita anônima à vitrine depois do pagamento ainda viu "Loja indisponível"**; a seguinte, 2
  s depois, a loja. A conferência derruba o cache da vitrine (S5, decisão 24), e a primeira resposta
  depois disso ainda veio da cópia antiga. Fica para o S5 ou o S17 olharem.
- **O cinza das frases secundárias da tela de Pedidos** (e de outras telas antigas) mede 4,42:1 sobre o
  fundo do painel.
- O Playwright, ao capturar durante a hidratação, às vezes devolveu um quadro antigo (como o S11 e o S6
  viram), e uma vez injetou `caret-color` num campo antes da hidratação, que o React acusou como diferença
  de hidratação (o "1 Issue" do Next). As capturas entregues foram refeitas e conferidas uma a uma.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook (as stories novas só foram
  compiladas pelo `tsc` da UI) e a suíte Playwright inteira: o briefing proíbe nesta máquina. **O e2e novo
  rodou contra o `next dev`, não contra o app construído**, que é como o CI o roda.
- Nada da API mudou, e nenhum spec da API foi rodado.
- **A releitura a cada minuto com a tela de página travada aberta** e a releitura ao voltar para a aba: só
  nos testes de unidade (com relógio simulado), não na tela.
- **Uma página que trava com o painel aberto** (o teste vencendo à meia-noite): só nos testes do portão.
- Um pagamento com cartão; a carência e a suspensão chegando pelo relógio (as situações foram postas no
  banco); homologação e produção; outros navegadores; um leitor de tela de verdade; o aviso e as faixas em
  inglês fora dos testes.

### O que o S2 (BEELINK-220, o card do plano no menu) precisa saber

- **A leitura é a mesma, e já está viva em todo o painel.** O portão (`PageLockGate`, montado por
  `SignedInShell` dentro do `AppShell`) observa `billingKeys.subscription(slug)` em toda página
  `/admin/<slug>/…` (`usePageStanding`, `services/billing/page-lock-hooks.ts`): lida uma vez por página
  aberta no shell, de novo ao voltar para a aba quando a cobrança está ligada, e a cada minuto enquanto a
  página está travada; nunca na tela Assinar. O card lê a mesma chave (`useStoreSubscription(slug)` do S11,
  ou um `useQuery` com as mesmas chave e função) e não custa uma requisição a mais: muda junto com a tela
  Assinar, o cupom, a conferência e o destravamento.
- **O card fica no `AppShell`, fora do portão**, então ele aparece também numa página travada (onde pode
  dizer "Página travada" e levar à tela Assinar). Nada do card deve depender das leituras recusadas do
  shell: só a da assinatura fica aberta numa página travada.
- **As contas já existem** (`lib/page-lock-view.ts`): `pageLockOf` dá o motivo da trava como o lojista o lê
  (com `FREE_PERIOD_OVER`) e o dia; `pageStripOf` diz se a página está nos últimos dias do teste ou do tempo
  grátis (`STRIP_DAYS = 2`: 2, 1 e 0 dias) ou na carência, com o dia — é o "aviso mais forte nos 2 últimos
  dias" do card, sem refazer a regra. `pageSlugOf(pathname)` também está lá (o `AppShell` tem a sua própria
  expressão; vale trocar quando mexer nele).
- **"Só onde a página pode travar":** a faixa espera a leitura da conta (`useBillingAccount`) e some com
  `503 BILLING_UNAVAILABLE` (sem a chave do Asaas nada trava). Se o card for dizer "termina hoje" ou "Pague
  até", vale a mesma condição; e sem a chave a API escreve cada `503` como erro no log.
- **As cores de aviso são token:** `bg-warning`, `text-warning-foreground` (e `border-warning-foreground/20`,
  como a faixa usa), no claro e no escuro.
- **Com a cobrança desligada, nada:** o portão desenha o painel de hoje; o card some com `billingEnforced:
  false` e com `EXEMPT`.
- Visto: no primeiro quadro, o seletor de loja diz "Nenhuma loja" e o menu de uma loja aparece num site,
  até `/stores/mine` responder — o card vai morar ao lado disso.

### O que o S17 (o roteiro para ligar) precisa saber

- No roteiro da homologação: cada motivo de trava mostra o seu aviso em toda tela do painel (e o modo
  design leva ao início); as faixas nos 2 últimos dias do teste e do tempo grátis e na carência; pagar pela
  tela Assinar devolve o painel sem sair e entrar, com o canal em tempo real de volta; sem a chave, nada
  trava e nenhuma faixa aparece. A primeira visita anônima à vitrine logo depois do pagamento pode ainda
  ver o aviso (acima).

### O que o S7 (os e-mails) precisa saber

- As datas que o lojista lê no painel: o último dia do teste (`trialLastDay`), do tempo grátis
  (`freePeriodLastDay`), da carência (o dia de Brasília antes de `graceEndsAt`) e do período pago (antes de
  `currentPeriodEndsAt`). Um e-mail que diga outro dia contradiz a faixa.

### Riscos, além dos de cima

5. **O e2e novo responde as rotas de cobrança no navegador**, como o do S11: o caminho de verdade (BFF →
   API → Asaas) está coberto pelos testes de unidade, pelos e2e da API dos tickets anteriores e pela
   execução no sandbox acima.
6. **Numa página travada, a primeira carga ainda pede as leituras da tela e o ticket do canal** (uma vez
   cada, todas `403`), porque com a cobrança desligada nada pode esperar a assinatura. A tela delas não
   aparece: a recusa fecha a tela antes.
