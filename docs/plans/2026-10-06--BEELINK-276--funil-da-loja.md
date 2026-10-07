# BEELINK-276 (X9) — o funil da loja: visitas, produto, carrinho, checkout, compra

> Épico X (BEELINK-267), "Pixel da Meta". Base `main`, com o épico X1–X8 já mesclado. Este ticket usa o ponto de despacho do X5 ([BEELINK-272](2026-10-06--BEELINK-272--pixel-eventos-de-navegacao.md)), a regra de compra do X6 ([BEELINK-273](2026-10-06--BEELINK-273--pixel-evento-de-compra.md)), o que o X4 promete ao visitante ([BEELINK-271](2026-10-06--BEELINK-271--consentimento-de-cookies.md)) e o módulo `reports` do X8 ([BEELINK-275](2026-10-06--BEELINK-275--vendas-por-origem.md)).

## O problema

O lojista quer ver onde o cliente desiste — "posso não ter campanhas mas ver o fluxo do cliente no meu site?". Hoje o caminho do visitante só sai da loja para a Meta, e só de quem aceitou os cookies de uma loja com pixel. Este ticket conta o mesmo caminho do nosso lado, em toda loja, e mostra o funil no painel.

## A posição de privacidade

O funil vale para toda loja e todo visitante, com ou sem pixel, com ou sem aceite. Por isso ele **não acompanha ninguém**:

- o que se guarda é um **contador anônimo**: por loja, por dia (no relógio da loja), por etapa, um número. Nenhuma linha por visitante, por sessão ou por evento;
- nenhum cookie é criado nem lido para contar; a requisição de contagem sai **sem credenciais** (`credentials: "omit"`), então nem os cookies que o navegador já tem viajam com ela;
- o corpo da requisição é só o nome da etapa. Nenhum identificador, nenhum endereço de página, nenhum produto;
- o IP serve ao limite de requisições, em memória, e não é gravado; o user agent não é lido.

Consequência, dita na tela: **as etapas contam eventos, não pessoas**. Um visitante que abre cinco produtos conta cinco. As taxas são "de cada 100 visitas, N produtos vistos", não conversão de visitantes únicos.

**O texto legal não muda.** A política (versão `2026-10-06`) diz que o site não grava cookies de análise; continua verdade. Uma frase dizendo que a loja conta visitas de forma anônima é decisão do dono — vai sugerida no topo do PR.

## Definição de Pronto

1. O que é gravado é só `(loja, dia, etapa, contagem)`; nada por visitante, nenhum cookie novo, nenhum IP nem user agent guardado.
2. O ponto de despacho do X5 (`createTrack`) ganha um segundo destino, que conta com ou sem pixel e com ou sem aceite; o caminho da Meta não muda e os testes dele passam sem edição.
3. Nada é contado no painel, na prévia do modo design, nas páginas com token no endereço, nem no navegador com sessão do painel aberta.
4. As etapas contadas no navegador são os mesmos momentos que a Meta recebe: página uma vez por caminho, produto uma vez por página de produto, carrinho a cada adição, checkout uma vez por chegada ao carrinho com itens.
5. A etapa Compra não é evento de navegador: são os pedidos da loja pela regra `sale-rule.ts`, só os que o cliente fez na vitrine; as vendas registradas no painel são ditas à parte.
6. A rota de contagem é pública, aceita só as quatro etapas conhecidas, exige a origem do próprio site, tem limite por IP, grava com um único `INSERT … ON CONFLICT … count + 1`, e não conta loja inexistente nem site institucional.
7. Do lado do navegador a contagem nunca bloqueia nem quebra a página: `fetch` com `keepalive`, sem esperar resposta, falha engolida.
8. Os contadores ficam 13 meses e são apagados por uma rotina que já existe.
9. `GET /api/stores/:slug/reports/funnel?from=&to=`, só do dono, com o período e os limites do relatório do X8; a forma está em `packages/contracts/src/report.ts` e no Swagger.
10. O painel tem "Funil da loja" em `/admin/<slug>/reports/funnel`, com `?period=7|30|90`, as cinco etapas em ordem, cada uma com a contagem, a taxa sobre a anterior e a queda, uma barra desenhada com tokens, esqueleto ao carregar, estado vazio e as notas.
11. `/admin/<slug>/reports` deixa de redirecionar e lista os dois relatórios; `/reports/origins` continua valendo.
12. No celular nada estoura; os números são texto numa lista de verdade, a barra é decorativa.
13. Textos em pt-BR e inglês nos locales; blocos em `packages/ui` com story e teste.
14. Mapas de superfície e `docs/product/README.md` atualizados.
15. `pnpm ci-check` verde; a suíte e2e inteira da API verde no banco de teste desta árvore.

## Decisões

### O que é gravado

1. **Tabela `store_funnel_days`**: `storeId` (uuid, cai com a loja), `day` (`date`, o dia no relógio da loja), `step` (enum `FunnelStep`), `count` (inteiro). Chave primária `(storeId, day, step)`. Um índice em `day` para a limpeza. Exemplo de linha: `(<id da loja>, 2026-10-06, PRODUCT_VIEW, 42)`.
2. **O dia é o da loja**: `shopDayOf(now)` do `report-period.ts`, Brasília em `-03:00` fixo, a convenção do relatório do X8. O dia é decidido na API no instante em que a contagem chega; o navegador não informa data.
3. **Sem contagem por produto, por campanha ou por página.** Só a etapa.

### As etapas

4. **Mapa evento → etapa** (`funnelStepOf`, em `apps/web/src/lib/funnel-count.ts`):

   | Etapa | Rótulo | De onde vem | Quando conta |
   |---|---|---|---|
   | `PAGE_VIEW` | Visitas | `PageView` | uma vez por caminho, na carga e a cada troca de caminho (filtro, paginação e variação são a mesma página) |
   | `PRODUCT_VIEW` | Produto visto | `ViewContent` | uma vez por página de produto aberta |
   | `ADD_TO_CART` | Adição ao carrinho | `AddToCart` | a cada clique em adicionar, de qualquer botão (`useAddToCart`) |
   | `CHECKOUT_START` | Checkout iniciado | `InitiateCheckout` | uma vez por chegada ao carrinho com item que pode ser pedido |
   | `PURCHASE` | Compra | os pedidos (decisão 8) | — nunca do navegador |

   `Search`, `AddToWishlist`, `AddPaymentInfo` e `Purchase` não contam nada.
5. **"Visitas" são páginas vistas**, não visitantes nem sessões: sem identificar ninguém não existe sessão. O nome fica "Visitas" porque é a palavra do ticket e a que o lojista usa; a tela diz que são páginas abertas.
6. **Os mesmos momentos da Meta, sem depender do aceite.** O contador guarda, por caminho, as etapas "de ver" já contadas (`PAGE_VIEW`, `PRODUCT_VIEW`, `CHECKOUT_START`) e não as repete enquanto o caminho for o mesmo; trocar de caminho zera. Isso reproduz o "uma vez por página" do X5 e torna a contagem imune ao que no X5 reenviava de propósito: o aceite dado, retirado e dado de novo conta de novo **à Meta** onde o visitante está, e não soma nada ao funil. O estado do contador vive fora do `createTrack`, que é recriado a cada mudança de aceite.
7. **`useTrackView` passa a dizer a vista também sem aceite.** Antes só chamava `track` com aceite; agora chama uma vez por chave de qualquer modo, e o `createTrack` decide por destino. Com aceite o comportamento é o de antes, chamada por chamada.
8. **Compra = pedido que é venda pela `SALE_CONDITION` (`sale-rule.ts`), cujo primeiro evento é do cliente** (`actor = 'CUSTOMER'`, o mesmo corte de "Vendas por origem"), contado no dia de `placedAt`. É exato, e igual à soma das linhas não-painel do outro relatório no mesmo período.
9. **Vendas registradas no painel ficam fora do funil e são ditas à parte** (`panelSales`): não passaram pela vitrine, então não são o fim de um funil da vitrine; mas escondê-las faria o lojista estranhar "Compras" menor que as vendas dele. Uma frase na tela diz quantas foram.
10. **Compras só contam a partir do primeiro dia com contagem** (`countingSince`, o menor `day` da loja). Antes dele não há visitas contadas, e somar as compras desses dias daria "de cada 100 checkouts, 500 compras". O período das compras é cortado em `max(from, countingSince)`; a tela diz a data quando ela cai dentro do período. Loja sem nenhuma contagem: zero compras no funil e estado vazio.
11. **Uma etapa pode ser maior que a anterior.** São eventos: o botão do cartão adiciona ao carrinho sem abrir o produto. A taxa é dita como está ("de cada 100 …, 130 …"), a queda só aparece quando existe, e a barra é proporcional à maior etapa, não à primeira.

### O despacho

12. **`createTrack` ganha `count?`**, o segundo destino: uma função que recebe o evento e o caminho. É chamada antes da decisão da Meta, fora das páginas em silêncio. O valor devolvido por `track` continua dizendo só se o evento foi à Meta (o X6 marca a compra como dita por ele). Sem `count`, a função é a de antes — os testes existentes não o passam.
13. **`StorefrontTracking` ganha `countAt?`**: o slug da loja quando ela conta, `null` quando não. O layout da loja passa o slug só para loja `ECOMMERCE` e só quando o navegador não traz sessão do painel (decisão 15). O painel e a prévia do modo design não passam por esse layout: lá `useTrack` é a função que não faz nada, como no X5.
14. **Uma requisição por evento**, `POST /<slug>/api/funnel` com `{"step":"PRODUCT_VIEW"}`. Um lote economizaria uma requisição na página de produto e custaria uma fila com temporizador no navegador; não vale. `fetch` com `keepalive: true` (sobrevive à navegação), `credentials: "omit"`, sem `await`, com `catch` vazio. `sendBeacon` foi descartado: sempre envia cookies.
15. **O lojista vendo a própria loja não conta**: o layout lê se existe o cookie de sessão do painel (`bl_refresh`, `path=/`) e, havendo, não liga a contagem. É "há um painel aberto neste navegador", não "é o dono desta loja" — conferir o dono custaria uma chamada à API por página. O cookie é lido no servidor para **não** contar; nada dele é guardado. Dito na tela.

### A rota de contagem

16. **Web: `apps/web/src/app/[slug]/api/funnel/route.ts`.** Exige `Origin` presente e igual à origem pública do site (`publicOriginOf`) — uma requisição sem `Origin` não veio de um `fetch` de página, e é descartada; exige JSON; corpo de até 64 bytes; etapa entre as quatro. Repassa à API com o IP do visitante (`clientIpOf`), para o limite. Responde sem corpo o status da API.
17. **API: `POST /api/stores/:slug/funnel-events`**, `@Public()`, 204, num controller próprio (`storefront-funnel.controller.ts`) fora do caminho `reports` do dono — pelo motivo que `ContactController` dá. Limite por IP: `FUNNEL_RATE_LIMIT_MAX=300` por `1 minute`. É alto de propósito: muita gente divide um IP (operadora de celular), e uma contagem recusada é uma visita a menos, não um erro.
18. **Um comando SQL**: `INSERT INTO store_funnel_days … SELECT id … FROM stores WHERE slug = $1 AND type = 'ECOMMERCE' ON CONFLICT (storeId, day, step) DO UPDATE SET count = count + 1`. Atômico, sem ler antes, certo com requisições simultâneas e com mais de uma réplica. Loja que não existe ou site institucional: nenhuma linha, e a resposta é 204 do mesmo jeito (não há o que dizer a quem conta).
19. **Robôs**: os que não rodam JavaScript não chegam à rota; os que chamam a rota sem `Origin` são descartados. Não há detector de robô. Quem forjar `Origin` com um script infla o contador de uma loja até o limite por IP — custo aceito e escrito.

### A guarda

20. **13 meses.** Dá para comparar um mês com o mesmo mês do ano anterior, e não há motivo para guardar mais. Corte: o mesmo dia, 13 meses antes de hoje no relógio da loja (`funnelCutoffDay`); linhas com `day` anterior são apagadas.
21. **Onde roda**: um passo a mais na `PaymentRoutine` (a rotina de um minuto que já apaga os eventos antigos do Asaas), chamando `FunnelRetention.pruneDue(now)`, que só executa o `DELETE` uma vez por dia da loja por processo. Não nasce agendador novo.

### A leitura e a tela

22. **`GET /stores/:slug/reports/funnel`** no `ReportsController`, dono apenas (`ownedStoreId`), período por `reportPeriodOf`. Resposta `StoreFunnelReport`: `from`, `to`, `steps` (as cinco, em ordem, com `count`), `panelSales`, `countingSince` (`YYYY-MM-DD` ou `null`), `retentionMonths`.
23. **As taxas são calculadas na tela** (`funnelRowsOf`, em `packages/ui`), como o "% das vendas" do X8: a API devolve contagens.
24. **A tela**: título, descrição, seletor de período (`ReportPeriodPicker`), os dias respondidos, e uma lista ordenada (`<ol>`) de cinco itens — nome, contagem, "de cada 100 {anterior}, {n}", queda quando há, e a barra (`aria-hidden`, `bg-primary` sobre `bg-muted`). Esqueleto no lugar da lista; vazio quando as quatro etapas contadas são zero; erro com "Tentar de novo".
25. **`/admin/<slug>/reports` vira índice** (`ReportsIndex`): dois cartões-link, "Vendas por origem" e "Funil da loja", cada um com uma frase.

## O que o Épico P deve fazer com isto

- **P4 (página Relatórios):** `/admin/<slug>/reports` já é a página; hoje é um índice de dois links (`ReportsIndex`, `reportPagesOf`). O P4 acrescenta os relatórios dele à mesma lista, ou troca o índice por abas — os endereços `/reports/origins` e `/reports/funnel` continuam valendo (a página do Pixel aponta para o primeiro).
- **P3 (seletor de período):** as duas telas leem `?period=7|30|90` por `reportPeriodOf` e montam os endereços por `reportHref(slug, página, dias)`. O seletor que nascer no P3 troca o `ReportPeriodPicker` nas duas de uma vez; a API já recebe `from`/`to`.
- **P1 (números de venda):** se a regra de venda mudar, muda em `sale-rule.ts` e a etapa Compra a segue. Um gráfico por dia do funil lê a mesma tabela, que já é por dia.

## Fora do escopo

- Funil por produto, por campanha ou por origem; visitantes únicos; sessões.
- Gráfico no tempo, comparação com o período anterior, CSV (P1/P3/P4).
- Qualquer coisa nova para a Meta; mudar o que o pixel envia.
- O texto legal.
- Contar buscas, favoritos ou a escolha do pagamento.
- e2e de Playwright novo no CI, como no resto do épico: a prova no navegador é feita uma vez e contada abaixo.

## 06/10, depois do código — o que mudou ao escrever

- **A taxa é dita "N a cada 100 {etapa anterior}"**, e não "de cada 100 …, N …": a frase não precisa concordar o plural com o número ("1 produtos vistos"). A decisão 24 dizia a outra ordem.
- **Cada etapa tem uma linha dizendo o que ela conta** ("Páginas da loja abertas", "Cliques em adicionar ao carrinho"…): é onde "Visitas" deixa de parecer visitantes (decisão 5).
- **`reportHref(slug, página, dias)` não existe**: `reportPagesOf` ficou como o X8 a deixou (um teste dele fixa a forma), e o funil ganhou `storeFunnelHref(slug, dias)` ao lado de `salesByOriginHref`. É isso que o P3 troca.
- **O cálculo das taxas mora em `packages/ui/src/lib/funnel-view.ts`**, não em `blocks/reports`: o pacote só exporta `.tsx` de `blocks/`, e a tela precisa de `funnelIsEmpty`.
- **A rota de contagem responde sem corpo em todo caso**, inclusive nas recusas (403 de outra origem, 415, 413, 400, 404 de slug que não é slug): ninguém lê a resposta, e um corpo de erro seria só bytes.
- **A regra "onde conta" é uma função** (`funnelCountedAt` em `lib/funnel-count.ts`), para ter teste; o layout só a chama.
- **A limpeza roda uma vez por dia em cada processo** (`FunnelRetention.pruneDue`), chamada a cada minuto pela `PaymentRoutine`; a marca do dia fica em memória e só é gravada depois de o `DELETE` dar certo.
- **`FUNNEL_RATE_LIMIT_MAX`/`_WINDOW`** entraram no `.env.example`, no mapa da API e na lista do `docker-compose.dokploy.yml`. Sem valor, vale 300 por minuto.
- **Uma frase na regra 4 do `apps/web/AGENTS.md`** diz que a contagem não pode ganhar identificador, página nem produto.
- **Nenhum teste existente do caminho da Meta foi editado.** `storefront-track.test.ts`, `storefront-tracking.test.tsx`, `meta-pixel*.test.ts`, `purchase*.test.*` e os testes dos componentes da vitrine passam como estavam. Dos testes do X8, só `report-period.test.ts` ganhou um bloco (o endereço do funil); nada foi alterado nele.

## Como cada linha da Definição de Pronto está coberta

| # | Evidência |
|---|---|
| 1 | `apps/api/prisma/schema/store.prisma` (`StoreFunnelDay`) e a migração `20261007024112_store_funnel_days`; `apps/api/test/store-funnel.e2e-spec.ts` › "is open to anyone, and keeps one row per shop, day and step — a number and nothing of who"; "has no column to hold a visitor in…" (lê `information_schema`); "stores nothing of the request around the step: not its address, its browser or its cookies" |
| 2 | `apps/web/src/lib/funnel-count.test.ts` › "the dispatch's second destination" (conta sem pixel, sem aceite e com aceite; não cria nada da Meta; a Meta recebe exatamente o que recebia; a resposta de `track` continua a do pixel); `components/storefront/tracking/storefront-funnel-count.test.tsx` › as quatro situações de aceite; os testes do X5/X6 sem edição |
| 3 | mesmo arquivo › "counts nothing from a page whose address carries a token"; "counts nothing where the layout says not to…"; "counts nothing outside a shop's layout — the panel and the design preview draw the same blocks"; `funnel-count.test.ts` › "where a funnel is counted" |
| 4 | `funnel-count.test.ts` › "which step of the funnel an event is", "the shop's own counter" (uma vez por caminho, produto e checkout uma vez por página, carrinho a cada vez, o produto de novo ao voltar); componente › "counts the page once when the yes is given on it…", "counts nothing more when the yes is taken back, and given again", "counts once with every effect run twice, as in development", "counts one page per path…", "counts the checkout begun once, and a search not at all" |
| 5 | e2e › "the purchase" (quatro testes: a regra de venda e o mesmo total de "Vendas por origem"; a venda do painel à parte; o dia de `placedAt`; nada antes do primeiro dia contado); `funnel-count.test.ts` › "never counts a purchase, told to the pixel or not" |
| 6 | e2e › "refuses %s, and counts nothing" (seis corpos); "counts nothing for a slug that is no shop, and answers as if it had"; "counts nothing for a site that sells nothing"; "adds up counts that arrive at the same instant: none is lost to another" (40 em paralelo); "stops counting from one address past its limit, and goes on counting from another"; "counts on the day of the shop's clock, and each shop on its own row". Web: `app/[slug]/api/funnel/route.test.ts` (origem ausente ou alheia, não-JSON, corpo longo, etapa desconhecida, slug que não é slug, só a etapa e o IP seguem adiante, a origem pública atrás do proxy) |
| 7 | `funnel-count.test.ts` › "sending a step" (`keepalive`, `credentials: "omit"`, sem `await`; falha, bloqueio e ausência de `fetch` engolidos, nenhuma promessa rejeitada); "never throws, whatever sending does"; rota › "answers 503, and throws nothing, with the API away" |
| 8 | `apps/api/src/modules/reports/funnel-steps.spec.ts` (o corte: 13 meses, relógio da loja, mês curto); e2e › "deletes the days older than thirteen months, and keeps the day thirteen months back"; "works once per day in a process, however often the clock calls it"; a chamada está em `payment-routine.ts` (o `tick` não roda em teste: a ligação é uma linha lida, não exercitada) |
| 9 | e2e › "who may read it" (dois testes), "the steps" (ordem, soma, período inteiro, zeros, as cinco recusas de período); `packages/contracts/src/report.ts`; `dto/funnel.dto.ts` (`implements`) |
| 10 | `packages/ui/src/blocks/reports/store-funnel.test.tsx`; `packages/ui/src/lib/funnel-view.test.ts`; `apps/web/src/components/reports/store-funnel-screen.test.tsx` (12 testes: etapas, período no endereço, esqueleto, vazio, notas, primeiro dia, vendas do painel, erro, inglês); `services/reports/funnel-hooks.test.tsx`; `app/api/stores/[slug]/reports/funnel/route.test.ts` |
| 11 | `app/(admin)/admin/[slug]/reports/reports-pages.test.tsx`; `store-funnel.test.tsx` › "ReportsIndex"; `/reports/origins` aberta no navegador (abaixo) |
| 12 | `store-funnel.test.tsx` › "draws the five steps in order…" (uma `<ol>`, axe), "draws a bar per step as decoration…"; larguras medidas a 390 px no navegador (abaixo) |
| 13 | `packages/ui/src/locales/{messages,pt-BR,en}.ts` (`reports.funnel`, `reports.index`); "speaks the language it is handed" em cada bloco; `store-funnel.stories.tsx` (oito histórias) |
| 14 | `apps/api/docs/README.md`, `apps/web/docs/README.md`, `packages/ui/docs/README.md`, `docs/product/README.md` ("The shop's funnel"), `apps/web/AGENTS.md`; `pnpm docs-gate` verde |
| 15 | dito no PR, com o commit em que foi rodado |

## 06/10 — o que foi visto no navegador

A loja foi aberta de verdade (`next dev` na 3800, a API compilada na 3801, banco `harness_meta_pixel`) e percorrida por um Chromium sem janela do Playwright, com **toda requisição a `facebook.com` e `connect.facebook.net` abortada e contada** (nenhuma foi tentada). Uma lojista e três lojas novas foram criadas pela API — `funil-sem-pixel-71218`, `funil-com-pixel-71218` (pixel `123456789012345`, que não é de verdade) e `funil-vazio-71218` — cada uma com dois produtos e um cliente confirmado pelo Mailpit. Ficaram no banco; os servidores foram parados depois.

**O mesmo percurso nas duas lojas**, em navegadores novos — na loja com pixel, depois de clicar **"Recusar"** no aviso (`bl_consent=denied`); na sem pixel não há aviso: início → um produto pelo link do cartão → "Adicionar ao carrinho" na página dele → outro produto → o mesmo produto recarregado com `?variant=x` → início → "Adicionar ao carrinho" no cartão (sem abrir o produto) → a lista de produtos → entrar → (volta ao início) → o carrinho → "Retirar na loja", "Dinheiro", uma unidade a mais → "Fechar pedido pelo WhatsApp".

- **Contado, nas duas lojas, igual:** 9 visitas (nove páginas carregadas), 3 produtos vistos (dois produtos, um deles recarregado), 2 adições ao carrinho, 1 checkout iniciado. Mudar a quantidade e fechar o pedido não contaram nada (a página continua em `/carrinho`). Toda resposta da rota foi 204.
- **As linhas no banco** são essas e só essas: oito linhas, `(storeId, day, step, count)`, com `day = 2026-10-06` — quatro por loja, `9 / 3 / 2 / 1`. A tabela tem as quatro colunas e nenhuma outra (`\d store_funnel_days`).
- **O que saiu do navegador para contar:** corpos `{"step":"PAGE_VIEW"}`, `{"step":"PRODUCT_VIEW"}`, `{"step":"ADD_TO_CART"}`, `{"step":"CHECKOUT_START"}` e nenhum outro; **nenhum cabeçalho `cookie`** em nenhuma das requisições de contagem — nem depois de o cliente entrar, com `bl_shopper_access` e `bl_shopper_refresh` no navegador. Os cabeçalhos foram os de qualquer `fetch`: `accept`, `content-type`, `origin`, `referer`, `sec-ch-ua*`, `user-agent` (o handler não repassa nenhum deles à API, só o IP para o limite).
- **Meta:** zero requisições nas duas lojas, `window.fbq` indefinido ao fim do percurso, inclusive na loja com pixel e cookies recusados.
- **A lojista**, com o painel aberto: a home do painel, a lista de produtos, o modo design, **e a própria vitrine** (início, um produto, "Adicionar ao carrinho"): nenhuma requisição de contagem.
- **A página "Funil da loja"** (`/admin/funil-sem-pixel-71218/reports/funnel`), aberta pelo cartão do índice: "De 07/09/2026 a 06/10/2026"; `1. Visitas 9`; `2. Produto visto 3 — 33,3 a cada 100 visitas — 6 a menos que na etapa anterior`; `3. Adição ao carrinho 2 — 66,7 a cada 100 produtos vistos — 1 a menos…`; `4. Checkout iniciado 1 — 50 a cada 100 adições ao carrinho — 1 a menos…`; `5. Compra 1 — 100 a cada 100 checkouts iniciados`. Embaixo: "A contagem desta loja começou em 06/10/2026. Os dias anteriores não têm visitas contadas, e as compras deles não entram no funil." e as sete notas. A loja com pixel mostra os mesmos números. As barras: `aria-hidden`, 100% / 33,3% / 22,2% / 11,1% / 11,1%, na cor do token `primary`.
- **`/admin/<slug>/reports`** não redireciona mais: "Relatórios", dois cartões (`Vendas por origem → /reports/origins`, `Funil da loja → /reports/funnel`), o item do menu marcado. **`/reports/origins`** continua abrindo, com o pedido do percurso: `Direto / sem campanha · 1 · R$ 349,30`.
- **Período:** "7 dias" leva a `?period=7` e mostra "De 30/09/2026 a 06/10/2026"; `?period=banana` lê 30 dias; o Voltar retorna ao índice.
- **Vazio** (`funil-vazio-71218`): "Nenhuma visita contada neste período." e a frase sobre o painel aberto; as sete notas embaixo.
- **Carregando** (a leitura do BFF segurada por 2,5 s): o esqueleto, nenhuma lista, nenhum `role=status`, as notas já na tela.
- **Outra lojista** abrindo o funil de uma loja que não é dela: "Não foi possível carregar o funil da loja." e "Tentar de novo", nenhuma lista.
- **1280 px e 390 px:** página 1280/1280 e 390/390 (`scrollWidth`/`clientWidth`) no funil e no índice; a 390 px o elemento mais à direita termina em 374 px. Vistas as capturas das duas larguras.

**Não visto / não rodado:** a página de token **válida** — `/<loja>/redefinir-senha?token=abc` respondeu 404 (token inventado), então "nenhuma contagem" ali não prova a regra das páginas em silêncio, que fica nos testes de unidade e de componente; um site institucional no navegador (só no e2e da API e no teste de `funnelCountedAt`); o limite por IP no navegador (só no e2e); a limpeza rodando pelo relógio de verdade (a rotina não liga em teste: `prune` e `pruneDue` foram exercitados direto); o build de produção e o site atrás do Traefik (a checagem de origem usa `publicOriginOf`, como os outros handlers; o IP que chega à API é o que o proxy repassa); um navegador sem `keepalive` no `fetch`; o tema escuro; um leitor de tela real (só axe).
