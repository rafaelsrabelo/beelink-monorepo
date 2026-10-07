# BEELINK-311 (O10) — o aviso de primeira compra fecha de vez, e o lembrete do cupom fica no carrinho

> Épico O (primeira compra). Sai de `main`, que já tem a [faixa de ofertas](2026-10-07--vitrine-ofertas-relacionados-busca.md), o [pop-up de primeira compra](2026-10-07--BEELINK-306--popup-de-primeira-compra.md) e o [pop-up para o cliente logado](2026-10-07--BEELINK-310--popup-para-cliente-logado.md). Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`, por isso mora aqui.

## O pedido

O dono olhou a loja em produção (`beelink.biz/mutante-suplementos`, logado, sem pedido) e viu a faixa "Seu primeiro pedido tem 15% de desconto com o cupom SEJAMUTANTE." em toda página. Nas palavras dele: "esse componente tá aparecendo em toda página que entro; ele era pra aparecer só uma vez e o cliente fecha, salva no browser isso; aí depois, se a pessoa tá no carrinho e não botou o cupom, fica aparecendo pra ela adicionar no carrinho, e não nas páginas iniciais e de produto."

O que explica o que ele viu: a decisão 7 do plano da faixa ("fechar não é lembrado": a faixa volta a cada carga de página) e, nas lojas com o pop-up ligado, a chave "manter um lembrete" do BEELINK-310, que nasceu ligada. As duas são o que este ticket desfaz.

## Definição de Pronto

1. Fechar a faixa (o "×") ou usá-la ("Usar no carrinho", "Criar conta") é lembrado no navegador: a faixa não é mais desenhada nas páginas daquela loja enquanto durar o cookie (30 dias). "Copiar" não fecha.
2. Quem decide é o servidor, pelo cookie: depois de fechada, a faixa não está no HTML da página seguinte (sem piscar).
3. Vale em toda loja: pop-up ligado ou desligado, visitante ou cliente identificado.
4. O que é lembrado mora no cookie que já existe, `bl_popup` (um número inteiro, `Path=/<slug>`, 30 dias, nada sobre a pessoa). Os valores já gravados em produção continuam lidos exatamente como antes.
5. As regras do BEELINK-310 continuam: o visitante que fechou o convite e depois entra como cliente sem pedido vê o aviso do cupom uma vez; aviso fechado fica fechado; uma revisão nova do pop-up pode mostrar de novo, uma vez.
6. A chave "manter um lembrete" (`keepReminder`) passa a nascer desligada, as linhas que já existem são desligadas por migração, e a ajuda dela e o texto do painel dizem o que ela faz agora. Desligada (o padrão), depois do diálogo fechado não há faixa; ligada, a faixa fica até ser fechada, e então some de vez.
7. No carrinho, o cliente identificado que tem um cupom mostrado e utilizável ainda não aplicado vê uma chamada destacada no alto da área do cupom, com um botão primário "Aplicar cupom" (um toque, o mesmo caminho de digitar o código). Nunca um cupom oculto, nunca um que a cotação recusaria, nunca um abaixo do mínimo.
8. A chamada some quando há um cupom aplicado, e não tem "×" enquanto não há.
9. O visitante no carrinho lê uma frase verdadeira, sem código, quando a loja tem um cupom de primeira compra; uma promoção automática não ganha chamada (o carrinho já a anuncia).
10. A linha do `bl_popup` na política de privacidade volta a ser verdadeira, com a menor edição possível, em commit próprio; os testes que prendem o texto legal continuam verdes.
11. Bloco novo com story e teste (axe); textos em `locales` (pt-BR e en); docs do produto e mapas de superfície; `pnpm ci-check` verde; e2e completo da API verde em banco próprio; usado no navegador a 1280 e 390 px.

## Decisões do assistente, para o dono confirmar

### A. Fechar é lembrado

1. **O que fecha a faixa:** o "×", "Usar no carrinho" e "Criar conta". **O que não fecha:** "Copiar" (copiar o código não é dispensar o aviso; quem copiou ainda pode querer o botão do carrinho) e ver a página.
2. **Onde é guardado: no `bl_popup`**, sem cookie novo. Ele já quer dizer "o aviso de primeira compra desta loja foi fechado neste navegador".
3. **O número.** O cookie continua sendo um número inteiro só. A faixa e o diálogo são duas formas do mesmo aviso, e cada aviso (o convite do visitante, o cupom do cliente) tem agora dois degraus: fechou o diálogo; fechou a faixa. `r` é a revisão do pop-up; numa loja com o pop-up desligado a web não recebe revisão nenhuma (a loja desligada não manda nada do que configurou), e a revisão vale `0`.

   | Valor do `bl_popup` | O que quer dizer | Quem grava |
   |---|---|---|
   | `r` (1 a 999.999.999) | o convite do visitante, em diálogo, fechado na revisão `r` | o diálogo (como hoje) |
   | `1.000.000.000 + r` (r ≥ 1) | o aviso do cupom, em diálogo, fechado na revisão `r` | o diálogo (como hoje) |
   | `2.000.000.000 + r` (r ≥ 0) | a faixa do visitante fechada na revisão `r`; `2000000000` é "fechada numa loja sem pop-up" | a faixa (novo) |
   | `3.000.000.000 + r` (r ≥ 0) | a faixa do cliente (o cupom) fechada na revisão `r`; `3000000000` é "fechada numa loja sem pop-up" | a faixa (novo) |
   | qualquer outra coisa (`0`, `1000000000`, texto, mais de 10 algarismos, 4.000.000.000 em diante) | nada foi fechado | — |

4. **Uma escada só.** Convite em diálogo < faixa do visitante < cupom em diálogo < faixa do cliente. Um degrau fechado fecha os de baixo, na mesma revisão ou numa anterior. Daí saem as regras do BEELINK-310 sem regra nova: quem fechou o convite (diálogo ou faixa) e entra na conta ainda vê o aviso do cupom uma vez; quem fechou o aviso do cupom não vê mais o convite, nem depois de sair da conta.
5. **Como produção lê os cookies que já gravou:** `1` continua sendo "convite fechado na revisão 1" e `1000000001` "cupom fechado na revisão 1": o diálogo não reabre, e o visitante do `1` ainda recebe o aviso do cupom ao entrar na conta. O que muda para essas pessoas é só o que este ticket pede: a faixa não volta depois (o lembrete passa a nascer desligado).
6. **Loja com o pop-up desligado:** a faixa é o aviso. Fechada, fica fechada pelos 30 dias do cookie; não há revisão que a reabra. Um diálogo fechado antes (a loja tinha o pop-up ligado e desligou) também conta: aviso fechado fica fechado.
7. **Loja com o pop-up ligado:** uma revisão nova (o lojista mudou imagem, textos ou benefício) pode mostrar de novo, uma vez, o diálogo e, se houver lembrete, a faixa. É a mesma regra do diálogo. Ligar o pop-up numa loja em que a pessoa só tinha fechado a faixa (revisão 0) é isso também: o diálogo abre uma vez.
8. **A revisão nunca anda para trás no cookie:** um fechamento é gravado na maior revisão que o navegador conhece (a do pop-up, ou a que o cookie já tinha). Sem isso, uma loja que desliga e religa o pop-up reabriria avisos que a pessoa já fechou.
9. **O limite, o mesmo do BEELINK-310:** o cookie é do navegador, não da conta. Outro aparelho mostra o aviso lá uma vez.

### B. Depois de fechado, nada nas páginas da loja

10. **`keepReminder` nasce desligada e é desligada nas lojas que já salvaram** (migração: `DEFAULT false` + `UPDATE … SET "keepReminder" = false`). A chave saiu há poucas horas, ligada por omissão; a fala do dono é a rejeição direta desse padrão, e nenhum lojista teve tempo de escolher "ligada" de propósito de um jeito que dê para distinguir do padrão. Quem quiser o lembrete religa.
11. **Com a chave ligada**, a faixa fica abaixo do cabeçalho depois do diálogo fechado **até a própria faixa ser fechada**; aí some de vez (decisão A). O botão do diálogo ("Usar no carrinho", "Criar conta") continua gravando o degrau do diálogo, como hoje: com o lembrete ligado, a faixa ainda aparece depois dele, até ser fechada.
12. **Uma resposta de ofertas guardada sem `keepReminder`** passa a ser lida como desligada (era ligada no BEELINK-310).

### C. O carrinho leva o lembrete

13. **A chamada** é um bloco novo no alto da área do cupom, antes do campo: "Você tem 15% de desconto no primeiro pedido com o cupom **SEJAMUTANTE**" + botão primário "Aplicar cupom". Para um cupom que não é de primeira compra: "Você tem 15% de desconto com o cupom **X**".
14. **Qual cupom é o destacado:** da lista que o carrinho já recebe ("Cupons disponíveis", decidida pela mesma leitura que aceita ou recusa um código), só entre os que podem ser aplicados agora (`missingCents = 0`): o primeiro de primeira compra, se houver; senão o primeiro da lista (o mais novo). **Não** "o que mais desconta": a API não diz quanto cada cupom tira deste carrinho, e saber pediria uma cotação por cupom.
15. **O cupom destacado sai da lista "Cupons disponíveis" enquanto a chamada está na tela** (não é dito duas vezes); os outros ficam. Com um cupom aplicado, a chamada some e a lista volta inteira, com o aplicado marcado, como hoje.
16. **Sem "×".** É o único lugar que ainda diz o cupom a quem fechou o aviso, e só existe no carrinho.
17. **Abaixo do mínimo** continua "Faltam R$ X…" na lista, e não é chamada.
18. **Visitante no carrinho:** quando o destaque público da loja é um **cupom** de primeira compra, a frase que já existe ("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.") ganha antes dela "Crie sua conta e ganhe 15% de desconto no primeiro pedido." — a mesma frase da faixa, da mesma leitura pública guardada, sem código. Quando o destaque é uma **promoção**, nada é acrescentado: o carrinho já a anuncia (BEELINK-245).
19. **Promoção automática de primeira compra:** nenhuma chamada.

### D. "Só uma vez"

20. O aviso fica até a pessoa **fechar ou usar**. Não some sozinho depois de uma página vista: quem não reparou nele não perde a oferta em silêncio. É isso que "uma vez" quer dizer aqui; se o dono quis "some depois da primeira página", é uma mudança pequena sobre este mesmo cookie.

### O texto legal

21. A linha publicada diz "(pop-up)", "para que ele não abra de novo" e "guarda só o número da versão do aviso". Com este ticket o aviso pode ser a faixa, e numa loja sem pop-up o número não é uma versão. Edição mínima, em commit próprio: "(pop-up ou faixa)", "não apareça de novo" e "guarda só um número que identifica o aviso fechado". Nenhuma outra frase muda.
22. **A versão legal não muda:** hoje ainda é 07/10/2026, o dia da versão `2026-10-07` (mesmo dia, mesma versão, como os planos do 271 e do 306 descrevem).

## Fora do escopo

- Quem é elegível, as páginas, os gatilhos do pop-up, a espera pelo aviso de cookies: tudo fica.
- Eventos de rastreio; anunciar código a visitante; cupons ocultos.
- Lembrar o fechamento por conta (decisão 9).
- "O cupom que mais desconta" (decisão 14).
- Sumir sozinho depois da primeira página (decisão 20).

## Acréscimo (07/10/2026, noite): como ficou

**O que mudou em relação ao plano.**

- **A chamada do carrinho é desenhada pelo bloco do cupom** (`storefront-coupon`, prop `call`), e não ao lado dele: o toque em "Aplicar cupom" é um toque daquele bloco, e o foco segue como o do campo (vai para "Remover o cupom …" quando entra; volta ao campo se for recusado). Ao lado, o controle apertado sumiria e o foco cairia no `body`.
- **O código quebrava no meio** ("SEJ / AMUTANTE") na coluna estreita do resumo, a 1280 px. Pego na passada do navegador; o código agora desce inteiro para a linha de baixo e só quebra quando é maior que a linha.
- **A revisão gravada pelo diálogo também passa por "nunca anda para trás"** (decisão 8): a mesma conta serve à faixa e ao diálogo.
- **Migração:** `20261007235000_store_popup_reminder_off` (`ALTER COLUMN … SET DEFAULT false` + `UPDATE … SET "keepReminder" = false WHERE "keepReminder"`).
- **Texto legal** (commit `fd302b7b`, só dele). Antes: "bl_popup: numa loja que mostra um aviso de primeira compra (pop-up), que você já fechou esse aviso ou apertou o botão dele, para que ele não abra de novo; guarda só o número da versão do aviso, e nada sobre você; vale só para aquela loja e dura 30 dias;". Depois: "bl_popup: numa loja que mostra um aviso de primeira compra (pop-up ou faixa), que você já fechou esse aviso ou apertou o botão dele, para que ele não apareça de novo; guarda só um número que identifica o aviso fechado, e nada sobre você; vale só para aquela loja e dura 30 dias;". A versão continua `2026-10-07` (o `date` da máquina dizia 07/10/2026 no commit).

**Cobertura da Definição de Pronto** (arquivo → o que prova):

1. `apps/web/src/components/storefront/storefront-offers.test.tsx` › "closing it" › "remembers it in the shop's cookie: the invitation's strip for a visitor, the coupon's for a customer", "counts using it as closing it: the way to the cart, and the way to the sign-up", "does not count copying the code: the strip stays, and nothing is written", "writes nothing by being seen"; `packages/ui/src/blocks/storefront/storefront-offer-strip.test.tsx` › "tells the screen when its link is pressed — and not when the code is copied".
2. `storefront-offers.test.tsx` › "is not in what the server renders once the cookie says it was closed" (`renderToStaticMarkup` vazio, sem o código); `apps/web/src/lib/offers-view.test.ts` › "with the pop-up off" › "draws no strip once it was closed…".
3. `offers-view.test.ts` (as quatro combinações: pop-up desligado; ligado; ligado com lembrete; ligado sem lembrete — para visitante, sessão vencida, cliente com e sem oferta, e oito estados do cookie); `storefront-offers.test.tsx` › "at a shop whose pop-up is off" (4 casos), "once the dialog was closed, with the reminder kept" (6 casos), "with the reminder switched off".
4. `apps/web/src/lib/popup-cookie.test.ts` › "numbers a closed strip apart from a closed dialog, two bases further, and reads it back", "writes a strip's closing on the shop's own path, as a dialog's is", "holds one whole number — which notice was closed — and nothing about the person…", "reads the cookies already out there exactly as before: `1` the invitation closed, `1000000001` the coupon's notice closed", "reads no cookie, or one somebody edited, as never closed", "lasts what the privacy policy says it lasts, and holds what it says it holds"; `apps/web/src/lib/popup.test.ts` › "reads the notice the browser closed here, and at which revision".
5. `popup-cookie.test.ts` › "noticeClosed" (7 casos: "closes each step and every one before it, and none after", "leaves the coupon's notice open to whoever closed the invitation's strip", "opens every step again at a new revision of the pop-up — the strip too", "counts anything ever closed at a shop whose pop-up is off — closed is closed", "opens the dialog once at a shop that switched its pop-up on after the strip was closed there"), "closingRevisionOf"; `storefront-offers.test.tsx` › "still tells a customer who never ordered their coupon once, after they closed the invitation as a visitor", "remembers a closing at the revision the cookie already holds, never one before it", "comes back once, after the dialog, when the shopkeeper changes the pop-up", e os casos do BEELINK-310 ("once per person, in the one cookie"), sem mudança.
6. `apps/api/test/shop-popup.e2e-spec.ts` › "the strip's reminder (BEELINK-310)" › "is off for a shop that never said, and for a pop-up saved without it", "was switched off, by its migration, at every shop that had it on" (roda o SQL da migração sobre uma linha ligada e lê `column_default`); `apps/api/src/modules/promotions/shop-popup.spec.ts` › "reads the defaults, switched off, for a shop that never saved"; `packages/ui/src/blocks/promotions/popup.test.tsx` › "offers the strip's reminder, off by default, with a line saying what on and off mean now"; `apps/web/src/components/promotions/popup-screen.test.tsx` › "says what happens once the notice is closed, and where the coupon's reminder lives", "shows the reminder as saved — off for a shop that never said — and sends it with the form"; `apps/web/src/lib/storefront-data.test.ts` › "reads a pop-up kept from before its reminder could be switched as keeping none"; `storefront-offers.test.tsx` › "is closed for good by its own "×"…".
7. `apps/web/src/components/storefront/storefront-cart-live.test.tsx` › "the cart's call to a coupon not yet applied" (14 casos: "calls a signed-in customer to their first-order coupon, in the HTML the page was served with…", "stands over the coupon's field, and the one it calls to is not said again in the list", "picks the first-order coupon over a newer one for everyone…", "with no first-order coupon, picks the first of the API's list…", "never calls to a coupon the cart is below the minimum of — not even a first-order one", "calls to nothing when every listed coupon is below its minimum, or the shop shows none", "is never shown to a visitor, whatever the page was handed", "applies it in one press, by the field's own way…"); `packages/ui/src/lib/shop-offers.test.ts` › "highlightedCouponOf", "cartCouponCallOf"; `packages/ui/src/blocks/storefront/storefront-cart-coupon-call.test.tsx` (8 casos, com axe); `packages/ui/src/blocks/storefront/storefront-coupon.test.tsx` › "with a coupon to call the customer to" (5 casos, com axe). "Nunca um cupom oculto, nunca um recusado" é da lista da API, que não mudou: `apps/api/test` do PR #233 continua verde.
8. `storefront-cart-live.test.tsx` › "applies it in one press… and then is gone", "comes back when the coupon in force is taken off", "has no control to dismiss it", "says the quote's own refusal if the coupon stopped holding since the list, and stays"; `storefront-cart-coupon-call.test.tsx` › "has one control, and it is not one that dismisses".
9. `storefront-cart-live.test.tsx` › "for a visitor" (3 casos); `apps/web/src/lib/offer-strip.test.ts` › "cartInvitationOf" (2 casos); `storefront-coupon.test.tsx` › "for a visitor at a shop with a first-purchase coupon".
10. `apps/web/src/locales/legal/pt-BR.test.ts` › "names the cookie that remembers a closed first-purchase notice, pop-up or strip: one number, nothing of the person, one shop, 30 days", "say they took effect on the day their version names"; `popup-cookie.test.ts` › "lasts what the privacy policy says it lasts…".
11. Stories: "Blocos/Vitrine/Carrinho · chamada do cupom" (Primeiro pedido, Cupom para todos, Frete grátis, Conferindo, Código comprido, Loja escura); "Blocos/Vitrine/Cupom" → Com chamada, Visitante com benefício; "Blocos/Painel/Pop-up de primeira compra" → Com lembrete. e2e completo da API verde (85 arquivos, 1081 testes) em banco próprio.

**No navegador** (Chromium sem tela, 1280 e 390 px, `next build` + `next start` em :4100 e a API compilada em :4101, toda requisição a `facebook.com`/`connect.facebook.net` abortada — nenhuma foi tentada; uma loja por largura criada pela API, com o cupom SEJAMUTANTE de 15% de primeira compra mostrado e um cupom oculto; contas criadas pela API e confirmadas pelo e-mail do Mailpit próprio; entrada na conta pela tela da loja; o pop-up salvo pela rota do painel, com a sessão do dono). 165 verificações por largura, todas passaram nas duas:

1. **Pop-up desligado, cliente sem pedido.** A faixa com o código vem no HTML do servidor; vê-la não grava cookie; "Copiar" não fecha; "×" tira a faixa e grava `bl_popup=3000000000`, `Path=/<slug>`, 30 dias, `SameSite=Lax`, sem `httpOnly`; pelo cabeçalho que o navegador de fato enviou, o cookie vai no carrinho da loja e **não** vai a `/`, a `/<slug>-2` nem a `/login`. Início, produto e listagem: sem faixa na página, sem faixa e sem o código no HTML do servidor.
2. **O mesmo cliente no carrinho.** A chamada "Você tem 15% de desconto no primeiro pedido com o cupom SEJAMUTANTE" + "Aplicar cupom", já no HTML do servidor, acima do campo, sem repetir o cupom em "Cupons disponíveis", sem "×", sem o cupom oculto em lugar nenhum. Um toque aplica: "Cupom SEJAMUTANTE aplicado.", `?cupom=SEJAMUTANTE` no endereço, total de R$ 85,00, a chamada some, o cupom aparece marcado na lista e o foco vai para "Remover o cupom SEJAMUTANTE". Medidas: a 390 px a chamada tem 316 × 119 px; a 1280, 278 × 138 px. O botão de fechar o pedido já ficava abaixo da dobra nas duas larguras (y = 1211 em 844 a 390 px): a chamada troca o título e a linha de "Cupons disponíveis" que aquele cupom ocupava, um saldo de uns 30 px (estimado, não medido contra a versão anterior).
3. **Pop-up ligado, lembrete desligado (padrão lido de uma loja que nunca salvou).** O HTML não tem faixa; o diálogo do cupom abre uma vez; Escape fecha e grava `1000000001`; nenhuma faixa surge no clique; início, produto e listagem (2,5 s em cada): sem diálogo, sem faixa, sem o código no HTML. O carrinho continua chamando, e não abre diálogo.
4. **Lembrete ligado.** Diálogo → fechado (`1000000001`) → na página seguinte a faixa com o código, no HTML → "×" grava `3000000001` → nada mais em nenhuma das três páginas. Visitante: convite → faixa → "×" grava `2000000001` → nada mais.
5. **Visitante, pop-up desligado.** A faixa do convite, sem código → "×" grava `2000000000` → continua fechada nas três páginas. No carrinho dele: "Crie sua conta e ganhe 15% de desconto no primeiro pedido." acima de "Tem um cupom de desconto? Você aplica depois de entrar na sua conta.", sem código, sem chamada, sem lista. Entrando como cliente sem pedido: a faixa do cupom aparece uma vez (a regra do BEELINK-310); "Usar no carrinho" leva ao carrinho com o cupom e grava `3000000000`; depois, nada nas três páginas.
6. **Cookies já gravados em produção.** `1`: o visitante não é chamado de novo e não há faixa; entrando como cliente sem pedido, o diálogo do cupom abre uma vez e, fechado, grava `1000000001`. `1000000001`: logado ou não, nenhum diálogo e nenhuma faixa, e o cookie fica como estava.
7. **Cliente com pedido** (feito pela API): nada no início, no produto e na listagem, com o pop-up desligado e ligado; nenhum cookie; o carrinho não chama e não lista o cupom de primeira compra.
8. **Teclado e axe na chamada.** Só com Tab chega-se a "Aplicar cupom" (11 Tabs a 390, 12 a 1280), o botão focado está dentro da tela, Enter aplica e o foco cai em "Remover o cupom SEJAMUTANTE". O axe (WCAG 2.1 A/AA, com contraste, na página real) não acha nada na chamada.

**Visto e não mexido.** O axe na página inteira do carrinho acusa contraste em 11 elementos que não são deste ticket, na paleta padrão de uma loja criada pela API: o link "Alterar dados" (4,34:1) e os textos do rodapé com opacidade (3,2:1 e 4,46:1). `storefront-cart-live.tsx` tinha 253 linhas em `main` e ficou com 256.

**Não visto no navegador:** a loja Mutante com o código novo; a promoção automática de primeira compra (em teste); cupom de frete grátis na chamada (em teste e em story); a tela do painel com a ajuda nova (em teste; o pop-up foi salvo pela rota do painel, não pela tela); loja com pixel e aviso de cookies; leitor de tela; Firefox e Safari; um iPhone de verdade; o Storybook aberto; a migração sobre o banco de produção (provada pelo e2e, que roda o mesmo SQL sobre uma linha ligada).

**Banco e e-mail desta passada.** As portas 5432 e 1025 eram de outro projeto (`tradvogados-*`). O e2e e a passada no navegador rodaram num Postgres 18 e num Mailpit próprios (`beelink-311-db` em 5448, `beelink-311-mail` em 1048/8048), por configuração local não commitada; contêineres e configuração removidos ao fim. O `apps/api/.env` deste worktree não foi alterado; a API da passada subiu com `DATABASE_URL` e `SMTP_URL` dados na linha de comando.
