# BEELINK-310 (O9) — pop-up também para o cliente logado (cupom do primeiro pedido), e a faixa vira lembrete

> Épico O (primeira compra). Sai de `main`, que já tem a [faixa de ofertas](2026-10-07--vitrine-ofertas-relacionados-busca.md) e o [pop-up de primeira compra](2026-10-07--BEELINK-306--popup-de-primeira-compra.md). Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`, por isso mora aqui.

## O pedido

O dono olhou a loja em produção (`beelink.biz/mutante-suplementos`) depois das duas entregas e disse: "Em vez de ser um banner pra criar conta, tá como um componente na página e não um modal. O mesmo aconteceu pro cupom: ele não tá como um dialog e sim como um componente."

O que ele viu: como visitante, a faixa "Crie sua conta e ganhe 15% de desconto no primeiro pedido. [Criar conta]"; logado e sem pedido, a faixa "Seu primeiro pedido tem 15% de desconto com o cupom SEJAMUTANTE [Copiar] [Usar no carrinho]". Ele esperava diálogos.

Duas coisas explicam o que ele viu:

- **Na Mutante o pop-up está desligado.** Isso não pede código: é ligar em Cupons → Pop-up de primeira compra.
- **O cliente logado não tem diálogo nenhum** (o pop-up do BEELINK-306 fala só com o visitante), e mesmo com o pop-up ligado a faixa aparece antes dele. Isso é este ticket.

## Definição de Pronto

1. Com o pop-up ligado, o cliente identificado que nunca fez pedido e tem um benefício de primeira compra a ser dito vê o mesmo diálogo numa variante "seu cupom": o benefício, o código grande e selecionável, "Copiar" e "Usar no carrinho" (carrinho com `?cupom=`). Para promoção automática (sem código): o benefício, "aplicado automaticamente" e um botão que só fecha.
2. Quem vê a variante é decidido pela mesma leitura e pela mesma regra da faixa ("minhas ofertas", `firstPurchaseOf`): nunca um cupom que a faixa não mostraria, nunca um código para visitante. Cliente com pedido que vale não vê nada; cliente sem benefício não vê diálogo; os textos que o lojista escreveu para o visitante nunca aparecem para quem já tem conta.
3. A variante tem as garantias da do visitante: diálogo modal acessível (foco, Escape, nome, axe), as mesmas páginas, os mesmos gatilhos e atraso, espera o aviso de cookies, abre uma vez por carga.
4. Uma vez por pessoa, num cookie só: quem fechou o convite e depois entrou vê o cupom uma vez; quem fechou o cupom não vê mais nada. A linha publicada da política de privacidade sobre o `bl_popup` continua verdadeira, sem ser tocada.
5. Com o pop-up ligado, a faixa não é desenhada enquanto o diálogo ainda é devido a quem olha. Decidido no servidor, pelos cookies: sem piscar a faixa antes do diálogo.
6. Chave nova na configuração, "Depois de fechado, manter um lembrete abaixo do cabeçalho", ligada por omissão: contrato, coluna com migração, rota do dono, formulário com uma linha de ajuda. Ligada, a faixa volta depois do diálogo fechado; desligada, a faixa não é desenhada naquela loja enquanto o pop-up estiver ligado.
7. Com o pop-up desligado, a faixa se comporta exatamente como hoje (preso por teste).
8. A faixa não aparece no clique que fecha o diálogo: nada na página se move.
9. O painel diz com quem o pop-up fala (visitante: o convite; cliente que nunca pediu: o cupom), e a prévia mostra a variante do cliente.
10. Docs do produto e mapas de superfície; textos em `locales` (pt-BR e en); story e teste (axe) da variante; `pnpm ci-check` verde; e2e completo da API verde em banco próprio; usado no navegador a 1280 e 390 px.

## Decisões do assistente, para o dono confirmar

### Quem vê qual diálogo

1. **A variante do cliente diz o que a faixa diria a ele**, e não o benefício que o lojista escolheu anunciar no pop-up. A escolha "Benefício anunciado" continua valendo para o convite do visitante. Para o cliente, a fonte é a leitura "minhas ofertas" (`CustomerOffers.firstPurchase`): o cupom de primeira compra mostrado mais novo; sem cupom, a promoção de primeira compra. Uma só regra, extraída para uma função que a faixa e o pop-up chamam (`firstOrderOfferOf`). Consequência: se o lojista nomeou no pop-up um cupom A e a loja tem um cupom B mais novo, o visitante lê o benefício de A e o cliente recebe o código de B, que é o que a faixa já fazia.
2. **Palavras fixas, nos `locales`**; números e código vêm da API. Título: "Seu primeiro pedido tem {benefício}" (ou "… em produtos selecionados"). Cupom: "Use este cupom no carrinho:" + o código + "Copiar" + "Usar no carrinho". Promoção: "Aplicado automaticamente no seu primeiro pedido. Não precisa de código." + "Continuar comprando". A imagem configurada é reaproveitada. Título, texto e botão do lojista **não** aparecem (foram escritos para quem não tem conta).
3. **Cliente sem benefício a dizer não vê diálogo**; cliente com pedido que vale, nunca. Quem segura uma sessão vencida (o caso do BEELINK-306) continua sem diálogo naquela página.
4. **"Usar no carrinho" e "Continuar comprando" contam como fechar**, como o botão do convite: gravam o cookie.
5. **O foco entra no "×"**, pelo motivo do BEELINK-306 (o diálogo abre sozinho).

### O cookie: um número só

6. **O `bl_popup` continua guardando um único número inteiro, e nada mais.** Cada aviso tem a sua numeração de versões: o convite do visitante, na revisão `r` do pop-up, é a versão `r` (como hoje); o aviso do cupom, na mesma revisão, é a versão `1.000.000.000 + r`. O cookie guarda o número da versão do último aviso que a pessoa fechou.
   - Fechou o convite na revisão 3 → `bl_popup=3`. Entra na conta: o aviso do cupom (versão 1000000003) ainda não foi fechado → abre uma vez. Fecha → `bl_popup=1000000003`.
   - Quem fechou o aviso do cupom não vê mais nenhum dos dois naquela revisão, nem depois de sair da conta: o cupom é o aviso que diz mais.
   - Revisão nova (o lojista mudou imagem, textos ou benefício): os dois podem abrir de novo, uma vez.
7. **Por que a frase da política continua verdadeira** ("guarda só o número da versão do aviso, e nada sobre você"): o valor é um número, e é o número da versão de um aviso. Qual dos dois avisos foi fechado é um fato sobre o aviso, não sobre a pessoa: não há identificador, conta, e-mail nem hora. O texto legal e a versão legal não são tocados.
8. **Por que essa numeração e não par/ímpar (`2r-1`, `2r`):** os cookies já gravados em produção (um número simples = convite fechado) continuam lidos exatamente como foram escritos. Com par/ímpar, metade de quem já fechou veria o convite de novo depois do deploy.
9. **O limite, assumido:** o cookie é do navegador, não da conta. Outra pessoa que entre no mesmo navegador depois de alguém ter fechado o aviso do cupom não o vê; a mesma pessoa em outro aparelho o vê lá uma vez. Lembrar por conta pediria guardar isso no servidor, sobre a pessoa, o que a política não descreve.
10. **A chave do lembrete e o gatilho não mexem na revisão** (não são o que a pessoa lê no diálogo).

### A faixa

11. **Pop-up desligado: nada muda.** A decisão passa por uma função pura (`offersViewOf`) cujo primeiro caso é esse.
12. **Pop-up ligado, diálogo devido a quem olha: a faixa não está no HTML.** Vale também enquanto o diálogo espera (o atraso, o aviso de cookies, o gatilho "ao sair"). Consequência assumida: com "ao sair", um visitante que nunca dispara o gatilho não vê nem o diálogo nem a faixa naquela página.
13. **Diálogo fechado + lembrete ligado: a faixa está lá a partir da próxima página**, e não surge no clique. Nada se move sob o ponteiro, e não há estado novo no navegador: o servidor lê o cookie que o fechamento gravou.
14. **Lembrete desligado: a faixa nunca é desenhada naquela loja** enquanto o pop-up estiver ligado, para ninguém.
15. **Quem não tem diálogo a ver** (sessão vencida; cliente cuja leitura falhou) segue a regra do "depois de fechado": faixa conforme a chave.
16. **O "esconder a faixa enquanto o pop-up está aberto" do BEELINK-306 (item 25) sai**: os dois nunca mais estão na mesma página.

### O painel e o fio

17. `StorePopupSettings.keepReminder` (coluna `keepReminder`, `true` por omissão), `StorefrontPopup.keepReminder` na leitura pública. O `PUT` continua sendo o formulário inteiro: a chave que falta é recusada.
18. **`StorePopupOverview.customerOffer`**: o que um cliente que nunca pediu leria agora (com o código, quando é cupom), para a prévia não inventar. Sai da mesma função que monta a oferta do cliente (`firstOrderOfferOf` na API). É a leitura do dono, que já vê os códigos.
19. **Prévia:** um segundo alternador, "Visitante" / "Cliente sem pedido", ao lado de Computador/Celular. Sem benefício, a prévia do cliente diz que ele não vê pop-up.

## Fora do escopo

- Ligar o pop-up por omissão em qualquer loja.
- Textos configuráveis para a variante do cliente.
- "Cupons disponíveis" do carrinho; eventos de rastreio; textos legais e versão legal.
- Lembrar o fechamento por conta (ver decisão 9).
- O banner de categoria cortado em cima e embaixo no print do dono: é o comportamento entregue para um arquivo que não é 4:1 (a moldura é 4:1 e a imagem a preenche); o arquivo recomendado é 1600 × 400 px. É algo a dizer ao lojista, nada a corrigir aqui.

## Acréscimo (07/10/2026, noite): como ficou

**Contrato e rotas.** `StorePopupSettings.keepReminder` e `StorefrontPopup.keepReminder` (coluna `store_popups.keepReminder`, `true` por omissão; migração `20261007230000_store_popup_keep_reminder`); `StorePopupOverview.customerOffer`. Nenhuma rota nova: `GET`/`PUT /stores/:slug/popup` e `GET /stores/:slug/offers` levam os campos novos. A regra "o que o cliente sem pedido lê" virou uma função só na API (`firstOrderOfferOf`, em `shop-offers.ts`), chamada pela leitura do cliente e pelo resumo do dono.

**O que mudou em relação ao plano.**

- **Uma resposta de ofertas guardada de antes do deploy não tem `keepReminder`**: `offersAt` a lê como ligada. Sem isso a faixa sumiria por um minuto das lojas com o pop-up ligado, logo depois do deploy.
- **O código do cupom está no HTML da página do próprio cliente antes de o diálogo abrir**, dentro dos dados que o React manda ao componente (não desenhado). É a página dele, lida com a sessão dele; antes deste ticket o código já estava lá, visível, na faixa. Na página de um visitante não há código em lugar nenhum (conferido no navegador).
- A loja `stores/shop-popup.ts` deixou de servir à faixa; continua guardando "já abriu nesta carga".

**Cobertura da Definição de Pronto** (arquivo → o que prova):

1. `apps/web/src/components/storefront/storefront-offers.test.tsx` › "the pop-up for a signed-in customer who never ordered (BEELINK-310)" › "opens the same dialog with their coupon…", "says a promotion applies by itself, with no code and one button that only closes"; `packages/ui/src/blocks/storefront/storefront-popup.test.tsx` › "for a signed-in customer who never ordered (BEELINK-310)" (7 casos); `packages/ui/src/lib/shop-popup.test.ts` › "customerPopupWordsOf (BEELINK-310)".
2. `storefront-offers.test.tsx` › "tells what the strip would tell them…", "never says the shopkeeper's sentences, nor leads to the sign-up", "is never opened for a customer with an order that stands", "is not opened for a customer with no benefit to be told…", "is not opened, and nothing is said, when the customer's offers could not be read", "is never shown a code, nor asked for a name…" (visitante); `apps/web/src/lib/offer-strip.test.ts` › "firstOrderOfferOf" ("agrees with the strip, always…"); `apps/api/test/shop-popup.e2e-spec.ts` › "what a signed-in customer who never ordered is told (BEELINK-310)" (4 casos, entre eles "never reaches what anyone is served: the public pop-up carries no code"); `apps/api/src/modules/promotions/shop-offers.spec.ts` › "firstOrderOfferOf".
3. `storefront-popup.test.tsx` › "has no accessibility violations, with a code and with none", "still moves the focus to the close control…", "closes on Escape as the invitation does"; `apps/web/src/components/storefront/storefront-popup-live.test.tsx` › "as the coupon of a customer who never ordered (BEELINK-310)" (6 casos: atraso, cookie, Escape, botão, uma vez por carga, espera o aviso de cookies); as páginas são as mesmas porque o componente é o mesmo (`storefront-offers.test.tsx` › "is mounted by this component alone…").
4. `apps/web/src/lib/popup-cookie.test.ts` (16 casos: "holds one whole number — a notice's version…", "reads a cookie written before there were two notices exactly as it was meant…", "lasts what the privacy policy says it lasts, and holds what it says it holds", `popupSeen`); `storefront-offers.test.tsx` › "once per person, in the one cookie" (4 casos); `apps/web/src/lib/popup.test.ts` › "reads the notice the browser closed here…". `git diff main -- apps/web/src/locales/legal` é vazio.
5. `apps/web/src/lib/offers-view.test.ts` (14 casos, entre eles "never has both on one page"); `storefront-offers.test.tsx` › "the strip beside the pop-up (BEELINK-310)" › "while the dialog is still due" (3 casos).
6. `shop-popup.e2e-spec.ts` › "the strip's reminder (BEELINK-310)" (padrão e linha antiga; salvar/ler/servir; só do dono; nada servido com o pop-up desligado), "refuses a field out of its bounds, and a key left out", "its revision"; `packages/ui/src/blocks/promotions/popup.test.tsx` › "offers the strip's reminder, on by default…"; `apps/web/src/components/promotions/popup-screen.test.tsx` › "shows the reminder as saved…and sends it with the form"; `storefront-offers.test.tsx` › "once the dialog was closed, with the reminder kept", "with the reminder switched off"; `apps/web/src/lib/storefront-data.test.ts` › "reads a pop-up kept from before its reminder could be switched as keeping it".
7. `offers-view.test.ts` › "with the pop-up off, mounts no notice and draws the strip — for every viewer, whatever the cookie says"; `storefront-offers.test.tsx` › "at a shop whose pop-up is off" e todos os casos da faixa anteriores a este ticket, que seguem sem mudança.
8. `storefront-offers.test.tsx` › "does not arrive at the click that closes the dialog: nothing moves under the pointer"; medido no navegador.
9. `popup-screen.test.tsx` › "PopupScreen — whom the pop-up speaks to, and the strip as its reminder (BEELINK-310)" (6 casos); `popup.test.tsx` › "PopupPreview" › "for a signed-in customer who never ordered (BEELINK-310)" (6 casos, com axe); `apps/web/src/lib/popup-form.test.ts` › "previewCustomerWordsOf (BEELINK-310)".
10. Stories: "Blocos/Vitrine/Pop-up de primeira compra" → Cliente com cupom, Cliente com cupom e mínimo, Cliente com promoção, Cliente no celular; "…/Cartão" → Com código; "Blocos/Painel/Pop-up de primeira compra" → Cliente com promoção, Sem lembrete. `pnpm ci-check` verde; e2e completo da API verde (85 arquivos, 1080 testes) em banco próprio.

**No navegador** (Chromium sem tela, 1280 e 390 px, `next build` + `next start` em :4100 e a API compilada em :4101, toda requisição a `facebook.com`/`connect.facebook.net` abortada — nenhuma foi tentada; uma loja criada pela API, com o cupom PRIMEIRA15 de 15%, e o pop-up configurado pela tela do painel). 90 verificações, todas passaram, nas duas larguras:

- **Painel.** Pop-up desligado e lembrete ligado numa loja que nunca salvou; a introdução diz as duas pessoas; a prévia começa no visitante, sem código; em "Cliente sem pedido" mostra "Seu primeiro pedido tem 15% de desconto", PRIMEIRA15 e "Usar no carrinho"; em "Celular" a moldura tem 358 px; a 390 px a página não rola de lado.
- **Pop-up desligado.** Visitante: a faixa vem no HTML do servidor ("Crie sua conta e ganhe 15% de desconto no primeiro pedido."), sem código, sem diálogo em 3,5 s, sem `bl_popup`. Cliente sem pedido: a faixa com PRIMEIRA15, "Copiar" e "Usar no carrinho" → `/carrinho?cupom=PRIMEIRA15`; sem diálogo, sem cookie.
- **Ligado, com lembrete.** Visitante: o HTML do servidor não tem faixa; o convite abre depois de 1 s, `aria-modal`, nomeado pelo título; nenhuma faixa por baixo e nenhum código na página; o foco entra no "×", seis Tabs ficam dentro, Escape fecha e o foco volta ao link em que estava; o conteúdo não se move (o `main` fica em y = 72 a 1280 e 108 a 390) e a faixa não surge no clique; `bl_popup=1`, em `/<slug>`, `SameSite=Lax`, sem `httpOnly`. Na página seguinte a faixa está no HTML e o diálogo não volta.
- **O mesmo navegador entra como cliente que nunca pediu.** O HTML não tem faixa; o diálogo do cupom abre apesar do convite fechado: 448 × 374 a 1280 e 358 × 374 a 390, o código em 24 px, `user-select: all`, "Copiar" e "Usar no carrinho", nenhuma frase do visitante, foco no "×". "Usar no carrinho" cai em `/carrinho?cupom=PRIMEIRA15` com "Cupom PRIMEIRA15 − R$ 15,00, Total R$ 85,00"; o carrinho não abre diálogo; `bl_popup=1000000001`. De volta ao início: nenhum diálogo, e a faixa com o código.
- **Só pelo teclado** (outro cliente): Tab passa por "Fechar", "Copiar" e "Usar no carrinho" sem sair; Escape fecha, o foco volta, o cookie é gravado; recarregando, continua fechado e a faixa é o lembrete.
- **Cliente com pedido:** nada no início nem no produto — sem faixa, sem diálogo, sem cookie, sem código no HTML.
- **Carrinho, entrar e criar conta** (visitante): 3 s cada, sem diálogo, sem faixa, sem cookie.
- **Ligado, sem lembrete.** Visitante e cliente: sem faixa no HTML, o diálogo abre uma vez; fechado, a página seguinte não tem nada.

**Não visto no navegador:** a promoção automática (a loja de teste tinha cupom; a variante está em teste e em story); o gatilho "ao sair" com a variante do cliente (o gatilho é o mesmo código, coberto por `use-popup-trigger.test.tsx`); a imagem no diálogo do cliente (sem Cloudinary aqui; em teste e story); o cadastro pela tela (as contas foram criadas pela API e confirmadas pelo e-mail do Mailpit próprio; o caminho do cadastro foi percorrido no BEELINK-306 e não mudou); "Copiar" de fato escrevendo na área de transferência (em teste); loja com pixel e aviso de cookies (em teste); leitor de tela; Storybook aberto.

**Banco e e-mail desta passada.** As portas 5432 e 1025 eram de outro projeto (`tradvogados-*`). O e2e e a passada no navegador rodaram num Postgres 18 e num Mailpit próprios (`beelink-310-db` em 5447, `beelink-310-mail` em 1047/8047), por configuração local não commitada; contêineres e configuração removidos ao fim. O `apps/api/.env` deste worktree (não versionado, deixado por uma sessão anterior) ainda aponta para `localhost:5432` e `:1025`: não foi usado nem alterado.

## Acréscimo (07/10/2026, noite): busca do topo, de novo

Entrou neste PR a pedido do dono, depois de ele olhar a busca em produção de novo (já com o ajuste do PR #233: barra com teto de 30rem, "Buscar em" com 10rem). Nas palavras dele: "o buscar no header tá ridículo e não tá funcional, tá muito grande; o filtro de categoria, se tiver alguma categoria com nome grande, fica gigante horizontalmente. Tá completamente ridículo, quebra o layout da tela."

**O que foi visto em produção** (`beelink.biz/mutante-suplementos`, Chromium sem tela, 07/10/2026):

| Largura | Barra | "Buscar em" (mostrando "Todos") | Campo | Botão |
|---|---|---|---|---|
| 950 px | 480 × 44 | 160 × 44 | 264 | 56 |
| 1280 px | 480 × 44 | 160 × 44 | 264 | 56 |
| 1024 px | 390 × 44 | 160 × 44 | 174 | 56 |
| 768 px | 468 × 44 | 160 × 44 | 252 | 56 |
| 390 px | 358 × 44 | 120 × 44 | 182 | 56 |

- **O tamanho é o defeito, e é real.** O "Buscar em" era um `<select>` nativo: ele tem a largura da opção mais comprida ("Termogênicos e Controles de peso") ou a que lhe mandam ter, nunca a do que está mostrando. Com o teto de 10rem do #233 ele ficou com 160 px fixos escrevendo "Todos"; a 1024 px sobravam 174 px para o campo.
- **"Não tá funcional": não encontrei nada quebrado.** O que foi tentado, a 950, 1280 e 390 px: digitar "creatina" abre 2 sugestões; Enter leva a `/busca?categoria=&q=creatina` e a lista não reabre na página de resultados; seta para baixo + Enter abre o produto sugerido; clicar numa sugestão abre o produto; trocar a categoria não navega (esperado) e a busca seguinte, só pelo teclado, vai com `categoria=energia-e-foco`; o botão busca; Escape fecha a lista; clicar fora fecha. Nenhuma rolagem lateral em nenhuma largura. Minha leitura, **não confirmada pelo dono**: "não funcional" é a barra ocupar o topo e espremer o resto, não um comando que falha.

**Decisões do assistente, para o dono confirmar.**

1. **Barra com teto de 22rem (352 px)** do `shop-md` em diante, centrada como antes; **40 px de altura** no computador (os controles vizinhos têm 36 px; 44 lia como a coisa mais pesada da linha) e botão de 44 px de largura com lupa de 18 px. No celular continua na linha própria, com 44 px de altura (alvo de dedo) e botão de 48 px.
2. **"Buscar em" deixa de ser `<select>` nativo** e passa a ser o select do design system (`components/select`, já instalado; nenhuma dependência nova) desenhado como um botão compacto dentro da barra: ocupa o que o nome escolhido pede, até 7rem (112 px), com reticências; o nome inteiro está no `title` e na lista. Bloco novo: `blocks/storefront/storefront-search-scope`.
3. **O que a busca envia não mudou**: o slug escolhido vai como `categoria` num campo oculto do mesmo formulário GET, vazio para a loja toda. O endereço é o que o select nativo produzia (`/busca?categoria=…&q=…`).
4. **A lista** abre embaixo do botão, alinhada à esquerda dele, com no máximo 20rem ou a largura da tela menos 2rem; um nome comprido quebra em duas linhas em vez de ser cortado. É desenhada num portal, fora do elemento que carrega as cores da loja: o bloco copia do próprio botão as quatro variáveis `--shop-*` que a lista usa, ao abrir.
5. **O custo, assumido:** antes de o script chegar (ou com ele desligado) o botão não abre a lista; o formulário continua buscando, na categoria com que a página foi servida. O select nativo trocava de categoria sem script.
6. Tudo o que o #233 acertou fica: Enter envia; a lista de sugestões só abre ao digitar ou com seta para baixo, fecha ao enviar, ao sair do campo e com Escape; o ponteiro sobre uma sugestão não sequestra o Enter.

**Depois** (a mesma medição, loja de teste com as categorias da Mutante e mais uma de 61 caracteres, `next build` + `next start`):

| Largura | Barra | "Buscar em" com "Todos" | com a categoria de 61 caracteres | Campo | Botão | Folga até a conta |
|---|---|---|---|---|---|---|
| 950 px | 352 × 40 | 76 | 112 | 232 (196 com a longa) | 44 | — |
| 1280 px | 352 × 40 | 76 | 112 | 232 (196) | 44 | 219 px |
| 1024 px | 352 × 40 | 76 | — | 232 | 44 | 91 px |
| 768 px | 352 × 40 | 76 | — | 232 | 44 | 118 px |
| 390 px | 358 × 44 | 76 | 112 | 234 (198) | 48 | (linha própria) |

Nas três larguras exercitadas (950, 1280, 390; 73 verificações, todas passaram): a lista do "Buscar em" abre pelo teclado, inteira dentro da tela, embaixo da barra, nas cores da página da loja, com o nome de 61 caracteres inteiro em duas linhas; escolhida a categoria longa pelo teclado, o botão fica em 112 px com reticências, a seta continua desenhada, nada passa por cima do campo, a barra não muda de largura, o foco volta ao botão e a página não navega; Tab chega ao campo; Enter busca com `?categoria=<slug>&q=creatina` (as mesmas duas chaves, na mesma ordem); na página de resultados a categoria continua escolhida e a lista de sugestões fechada; digitar abre as sugestões; Enter com o ponteiro parado numa sugestão busca; seta + Enter abre a sugestão; clicar numa sugestão abre; Escape fecha, digitar reabre, sair do campo fecha; o botão busca; escolher categoria pelo ponteiro funciona. Sem rolagem lateral em nenhuma das cinco larguras. Com JavaScript desligado, Enter busca na categoria com que a página foi servida.

Um defeito meu pego nessa passada e corrigido antes do commit: o nome longo escolhido vazava por cima do campo (o valor do select do design system é uma caixa flex com `line-clamp`, que não corta nada num botão tão estreito). O valor agora é um bloco que trunca, e a medição no navegador prende isso.

**Cobertura.** `packages/ui/src/blocks/storefront/storefront-search-scope.test.tsx` (11 casos, com axe fechado e aberto: é um botão nomeado "Buscar em"; ocupa só o nome escolhido, com teto; categoria de 60+ caracteres; envia `categoria` com o formulário e vazio para a loja toda; a lista e a escolha; só teclado; avisa a tela; tokens da loja, nenhuma cor literal); `storefront-search.test.tsx` › "the scope" (ordem dos controles, categoria da página, categoria de 60 caracteres sem tirar o lugar do campo, barra de 40 px); `storefront-search-combobox.test.tsx` › "the scope" (avisa a escolha, envia a categoria, teto, abrir a lista do escopo não abre as sugestões) e todos os casos do #233, sem mudança; `storefront-masthead.test.tsx` › "puts the search between the delivery block and the account, capped and centred…" (22rem). O jsdom não mede largura: "sem transbordo a 768–1024" está na medição do navegador acima. Stories: "Blocos/Vitrine/Busca/Buscar em" (Todos, Categoria curta, Categoria longa, Loja escura).

**Não visto:** um iPhone de verdade (o zoom do iOS ao tocar; o campo continua com 16 px no celular); leitor de tela; Firefox e Safari; a loja Mutante com o código novo (a medição "depois" é numa loja de teste local com os mesmos nomes de categoria).
