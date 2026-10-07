# BEELINK-275 (X8) — vendas por origem (segunda metade: o relatório)

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X7 ([BEELINK-274](2026-10-06--BEELINK-274--compra-pelo-servidor.md), PR #229). A primeira metade deste ticket — a captura da origem e a linha "Origem" na página do pedido — é o PR #228 ([plano](2026-10-06--BEELINK-275--origem-do-pedido.md)).

## A situação: o Épico P não existe

O ticket pede o relatório "junto dos relatórios de vendas (Épico P)". O Épico P não foi construído: não há página "Relatórios", não há seletor de período no painel, e a home do painel não mostra números de venda. Este PR entrega a **menor versão honesta** do relatório, feita para o Épico P absorver sem jogar fora:

- uma leitura na API, num módulo `reports` onde o P1 pode crescer;
- uma página só para ela, em `/admin/<slug>/reports/origins`;
- a regra "o que é uma venda" escrita num lugar só (`sale-rule.ts`), para o P1 usar a mesma ou trocá-la de uma vez.

O que o Épico P deve fazer com isso está no fim deste plano.

## Definição de Pronto

1. `GET /api/stores/:slug/reports/sales-by-origin?from=YYYY-MM-DD&to=YYYY-MM-DD` responde, só ao dono da loja, as linhas agrupadas por origem (`source`, `medium`, `campaign`), com o número de pedidos, a receita em centavos, quantos pedidos do grupo vieram de um clique em anúncio da Meta, e os totais do período.
2. O agrupamento é **uma consulta agrupada** no banco; nenhum pedido é carregado em memória.
3. A regra "o que conta como venda" está decidida, escrita aqui e na documentação da rota, e testada caso a caso: cancelado fora; cobrado no site só conta pago; venda registrada no painel é uma linha própria.
4. O valor somado é o total do pedido (`totalCents`), o mesmo que o X6/X7 enviam à Meta como `value`.
5. O período é em dias do relógio da loja (Brasília, `-03:00` fixo), as duas pontas incluídas; sem datas, vale os últimos 30 dias; datas malformadas, invertidas ou com mais de 366 dias são recusadas com 400.
6. Pedidos de outra loja nunca aparecem; um token de cliente, ou de outro lojista, é recusado.
7. A forma da resposta está em `packages/contracts`; a rota está no Swagger.
8. O painel tem a página "Vendas por origem" em `/admin/<slug>/reports/origins`, alcançável pelo item "Relatórios" do menu e por um link na página do Pixel da Meta.
9. O período escolhido (7, 30 ou 90 dias) fica no endereço (`?period=`).
10. A tabela mostra Origem (o mesmo texto da página do pedido, pela mesma função `originLinesOf`), Pedidos, Vendas (R$) e % das vendas, ordenada por receita, com uma linha de totais.
11. Carregando é um esqueleto; vazio explica como uma origem é registrada, com um link de exemplo para o endereço da própria loja; há as notas "pedidos antigos contam como Direto" e "gasto e ROAS ficam na Meta".
12. Nomes de campanha são desenhados como texto, cortados quando longos com o valor inteiro disponível; no celular a tabela não estoura a página.
13. Textos em pt-BR e inglês nos arquivos de locale; blocos em `packages/ui` com story e teste.
14. Os mapas de superfície (`apps/api/docs`, `apps/web/docs`, `packages/ui/docs`) e `docs/product/README.md` descrevem o relatório.
15. `pnpm ci-check` verde; a suíte e2e inteira da API verde no banco de teste desta árvore.

## Decisões

### O que conta como venda

1. **Uma venda é um pedido não cancelado; o cobrado no site só conta enquanto a cobrança dele segura o dinheiro.** Em SQL: `status <> 'CANCELLED'` e, se `paymentChannel = 'ONLINE'` com algo a pagar, existir uma linha de `order_payments` em `CONFIRMED`, `RECEIVED` ou `PARTIALLY_REFUNDED` (a lista `HOLDING` de `payment-filter.ts`, a mesma do filtro "Pago" da lista de pedidos).
   - *Cancelado fora* é a noção que o produto já usa: os livros do cliente (`refreshBooks`: "every one not cancelled"), o cashback e a primeira compra.
   - *Cobrado no site e ainda não pago não é venda.* Um Pix gerado e abandonado é cancelado sozinho em três dias; contá-lo nesse intervalo mostraria ao lojista uma receita que some. É também a regra de compra do X6/X7 (`purchaseCountsWhen`): a loja que cobra no site conta o pagamento, não o pedido. Assim "Pedidos" aqui e "Compras" no Gerenciador de Eventos falam da mesma coisa.
   - *Devolvido por inteiro* (`REFUNDED`) não segura dinheiro e sai, mesmo que o pedido não tenha sido cancelado. *Devolvido em parte* continua, **pelo total do pedido** — o relatório não desconta devoluções parciais (limite conhecido; o P1 decide).
   - *Cobrado no site com nada a pagar* (cupom ou cashback cobriu um total fechado: `totalCents = 0` e a taxa combinada) conta como o pedido acertado direto, igual ao X6.
   - *Acertado direto com o lojista* (`OFFLINE`) conta ao ser feito, em qualquer status que não cancelado — o produto não sabe se foi pago. Custo aceito, o mesmo do X6: um pedido cancelado depois some do relatório.
2. **A data é `placedAt`** — quando foi vendido. Para o pedido cobrado no site isso é o dia do pedido, não o do pagamento: a Meta conta a compra no instante do pagamento, então um Pix pago depois da meia-noite cai em dias diferentes nos dois lugares. O total de um período longo bate; o de um dia pode não bater. `placedAt` é o que tem índice (`storeId, placedAt`) e o que a lista de pedidos mostra.
3. **A venda registrada no painel é uma linha própria: "Venda registrada no painel".** Ela nunca tem origem (não veio do site), e colocá-la em "Direto / sem campanha" misturaria o balcão com a visita direta ao site. Deixá-la de fora faria o total do relatório ser menor que as vendas da loja, e "% das vendas" mentiria. Com a linha própria, **o total é o total de vendas da loja no período**. É separada pelo primeiro evento do pedido (`actor <> 'CUSTOMER'`), como a página do pedido e o X7 fazem.
4. **O valor é `totalCents`**: o que o cliente paga, com entrega, depois de todo desconto e do cashback usado. É o número que o X6 e o X7 enviam como `value`, e por isso o painel e a Meta podem ser comparados. Uma entrega "a combinar" entra pelo total sem a taxa até ela ser combinada.

### O agrupamento

5. **Três tipos de linha (`kind`):**
   - `CAMPAIGN`: pedido do carrinho com alguma UTM **ou** com clique de anúncio guardado. Agrupado por `utmSource`, `utmMedium`, `utmCampaign` exatamente como gravados. Um grupo sem nenhuma UTM é o "Anúncio da Meta" puro (link de anúncio sem UTM, com aceite);
   - `DIRECT`: pedido do carrinho sem UTM e sem clique — "Direto / sem campanha". Inclui os pedidos de antes da primeira metade, que não há como distinguir (dito numa nota na página);
   - `PANEL`: venda registrada no painel.
6. **`utm_content` e `utm_term` não entram no agrupamento.** São o criativo e a palavra-chave; o lojista perguntou "quanto vendi por campanha". O índice `(storeId, utmSource, utmMedium, utmCampaign)` é exatamente essas três.
7. **A campanha agrupa como foi escrita**, diferenciando maiúsculas: é o nome que a Meta preenche em `{{campaign.name}}`, e ali "Black Friday" e "black friday" são campanhas diferentes. `source` e `medium` já são gravados em minúsculas.
8. **Cada linha diz quantos dos seus pedidos vieram de clique em anúncio da Meta (`metaAdOrders`)**, e não só "algum veio". Com um booleano, uma campanha com 1 clique guardado em 50 pedidos leria "Anúncio da Meta" inteira; o número deixa a página dizer "em 1 de 50 pedidos". O clique só é guardado com aceite, então esse número é sempre um piso.
9. **Uma consulta**: `GROUP BY` sobre `orders` filtrado por `storeId` e `placedAt` (índice `storeId, placedAt`), com o primeiro evento lido por subconsulta em `order_events (orderId, createdAt)` e o pagamento por `EXISTS`. Os totais são a soma das linhas, feita na API sobre o resultado agrupado (dezenas de linhas, não pedidos). Ordenação por receita, depois por pedidos, feita no SQL.
   - *Sobre o índice das UTMs:* com período, o plano do Postgres entra por `(storeId, placedAt)`, como a primeira metade previu. O índice das UTMs serve à pergunta sem período e a "quais pedidos são desta campanha", que este PR não faz.

### O período

10. **`from` e `to` são dias, `YYYY-MM-DD`, no relógio da loja: `-03:00` fixo**, a convenção que a API já usa para o ano de um cliente (`SHOP_OFFSET` em `customer-orders.service.ts`) e a web para o formulário de promoção (`lib/shop-time.ts`). As duas pontas contam: `from` às 00:00 até `to` às 23:59:59,999.
11. **As duas ou nenhuma.** Sem nenhuma, os últimos 30 dias terminando hoje (no relógio da loja). A resposta devolve o período usado.
12. **No máximo 366 dias**, para a consulta ter teto. Uma data que não existe (`2026-02-30`), fora do formato, `from` depois de `to`, só uma das duas, ou um intervalo maior: 400 `REPORT_PERIOD_INVALID`. `to` no futuro é aceito (não há venda lá).

### API

13. **Módulo `reports`** (`src/modules/reports/`): `reports.module.ts`, `sales-reports.controller.ts` (`stores/:storeSlug/reports`), `sales-reports.service.ts`, `sale-rule.ts` (a regra da decisão 1, em SQL), `report-period.ts` (função pura, com teste de unidade) e `dto/`. O P1 acrescenta rotas ao mesmo controller.
14. **Dono apenas**, por `StoresService.ownedStoreId`, como toda rota do painel.

### Painel

15. **Rota `/admin/<slug>/reports/origins`**, e `/admin/<slug>/reports` redireciona para ela. O item "Relatórios" do menu aponta para `/reports` — quando o P4 fizer a página Relatórios, troca-se o redirecionamento por ela e o menu não muda. O item entra só no menu de loja (um site institucional não tem pedidos).
16. **O link na página do Pixel da Meta** ("Ver vendas por origem") fica num cartão curto abaixo dos outros, visível com ou sem pixel: as UTMs são guardadas sem pixel.
17. **Período no endereço: `?period=7|30|90`**, 30 como padrão e fora do endereço. Não existe seletor de datas no painel para reaproveitar, e este PR não cria um. A web converte o atalho em `from`/`to` no relógio da loja (`lib/report-period.ts`) e chama a API com datas: a API não conhece atalhos, e o seletor do P3 ("hoje, 7 dias, 30 dias, mês, personalizado") vai usar as mesmas duas datas.
18. **O texto da origem vem de `originLinesOf`** (`packages/ui/src/lib/order-origin.ts`), a função da página do pedido. Uma linha `CAMPAIGN` com UTMs passa `metaAd: false` e mostra, embaixo, "Clique em anúncio da Meta em N de M pedidos" quando houver; uma sem UTMs passa `metaAd: true` e lê "Anúncio da Meta".
19. **"% das vendas" é a fatia da receita**, calculada na página; com receita zero no período, um traço.
20. **Celular:** abaixo de `sm` cada origem é um cartão empilhado (origem em cima, os três números embaixo), não uma tabela com rolagem lateral. A origem quebra em linhas; a campanha longa é cortada com `title` com o valor inteiro.
21. **O link de exemplo** do estado vazio é montado com o endereço público do site (`publicOriginOf`, no servidor) e o slug: `https://…/<slug>?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha`.

### O texto legal

22. **Nada muda.** O relatório lê o que a primeira metade já grava e a política já descreve (o `bl_origin` e a campanha do pedido); não cria cookie, não envia nada a terceiros e mostra só números agregados ao dono da loja. Se o dono entender que a política deve dizer que a loja vê as vendas agrupadas por campanha, é uma frase para a seção que já fala do `bl_origin` — dito no PR, não editado aqui.

## O que o Épico P deve fazer com isto

- **P1 (números de venda por período):** usar `sale-rule.ts` como a definição de venda, ou trocá-la **ali**, para o resumo e este relatório nunca discordarem. Decidir se devolução parcial desconta. As rotas novas entram em `sales-reports.controller.ts`; o período (`from`/`to` em dias de Brasília, `report-period.ts`) pode ser reaproveitado como está — se o P1 precisar de outra convenção (semanas, mês), ela substitui a deste arquivo e esta rota a segue.
- **P3 (home com resumo e seletor de período):** o seletor que nascer lá substitui o `ReportPeriodPicker` desta página; `?period=` pode virar `?from=&to=` sem mudar a API.
- **P4 (página Relatórios):** `/admin/<slug>/reports` deixa de redirecionar e passa a ser a página; "Vendas por origem" vira uma seção ou aba dela (o bloco `SalesByOriginTable` e o hook `useSalesByOrigin` são reaproveitados como estão) e `/reports/origins` continua valendo como endereço da seção, porque o link da página do Pixel aponta para ele. A exportação CSV do P4 pode incluir esta tabela.

## Fora do escopo

- P1, P3 e P4: receita por dia, gráfico, comparação com o período anterior, CSV, seletor de datas.
- Qualquer coisa da Meta: gasto, ROAS, chamadas à API dela.
- Mudar o que a primeira metade grava; filtrar a lista de pedidos por origem; abrir os pedidos de uma campanha a partir da linha.
- Agrupar por `utm_content`/`utm_term`; "dias entre o clique e a compra" (`originAt`).
- O texto legal.
- e2e de Playwright novo no CI, como no resto do épico: a página é vista uma vez no navegador e o que foi visto é contado abaixo.

## 06/10, depois do código — o que mudou ao escrever

- **No celular são cartões, não a tabela espremida** (a decisão 20 dizia "cartão empilhado"; a primeira versão tentou uma tabela só, e a 390 px a coluna da origem ficou com 73 px — "Venda registrad…"). Ficou como a lista de pedidos: `SalesByOriginList` desenha a tabela a partir de `@xl/main` (a largura da coluna principal do painel) e, abaixo disso, um cartão por origem (`SalesByOriginCards`), com o nome na largura toda e os três números embaixo, cada um com o seu rótulo. Os dois estão no documento; o CSS mostra um.
- **Na tabela o nome é cortado em duas linhas com `title`; no cartão ele aparece inteiro**, quebrando em qualquer ponto: no toque não existe `title` para mostrar o resto.
- **O seletor de período é uma lista de links** (`ReportPeriodPicker`), não botões: o período é o endereço, então cada escolha é um lugar para ir, o Voltar desfaz e o link pode ser enviado. O atual é dito por `aria-current`.
- **Trocar de período mostra o esqueleto de novo**, e não os números do período anterior por baixo do novo rótulo (`useSalesByOrigin` não usa `placeholderData`).
- **A API não limita o tamanho de `from`/`to` no DTO**: um texto longo cairia num 400 genérico; assim tudo o que não é um período responde `REPORT_PERIOD_INVALID`, por `reportPeriodOf`.
- **Uma venda do painel nunca mostra rótulos**, mesmo que as colunas `utm*` dela fossem preenchidas à mão: a consulta só lê as UTMs de pedido cujo primeiro evento é do cliente.
- **O exemplo de link** usa `siteOrigin()` (`lib/site-origin.ts`, o que as páginas já usam para endereços absolutos), não `publicOriginOf`, que precisa de um `NextRequest` e é dos handlers.
- **Um erro de leitura** (rede, 403 de outra loja) mostra "Não foi possível carregar as vendas por origem." e "Tentar de novo". O cliente de consultas do painel tenta três vezes antes, como em toda leitura.
- **Sem migração**: o índice da primeira metade basta.

## Como cada linha da Definição de Pronto está coberta

| # | Evidência |
|---|---|
| 1 | `apps/api/test/sales-by-origin.e2e-spec.ts` › "groups by source, medium and campaign, counts the ad clicks kept, and adds up to the totals — highest revenue first"; "answers an empty period with no line and zeros" |
| 2 | `apps/api/src/modules/reports/sales-reports.service.ts`: um `$queryRaw` com `GROUP BY`; os totais somam as linhas agrupadas. Nenhum `findMany` de pedidos |
| 3 | mesmo e2e › "leaves out a cancelled order, by the customer or by the shop"; "counts an order settled with the shop in every status but cancelled"; "counts an order charged online only once it is paid — on the day it was placed"; "reads a charge that is %s as %i sale, for the whole total" (oito status); "counts an order charged online with nothing to pay as it is placed, and one with no charge yet not at all"; "says nothing of a sale registered in the panel but that it is one, even were labels written on it" |
| 4 | os mesmos testes conferem `revenueCents` contra o `totalCents` dos pedidos; a regra está em `sale-rule.ts` e na descrição do Swagger |
| 5 | `apps/api/src/modules/reports/report-period.spec.ts` (14 testes: as duas pontas, o padrão de 30 dias em Brasília e não em UTC, o teto, cada recusa); e2e › "counts both days whole on the shop's clock: midnight in Brasília is 03:00 UTC"; "reads no period as the thirty days ending today, and says which it used"; "refuses %s" (dez consultas); "refuses a query it does not declare, and takes a whole leap year" |
| 6 | e2e › "is the owner's alone: no token, a shopper's and another shopkeeper's are refused"; "never counts another shop's orders, whatever their campaign" |
| 7 | `packages/contracts/src/report.ts`; `dto/sales-by-origin.dto.ts` (`implements` dos tipos do contrato); `/api/docs-json` lista a rota (conferido com a API de pé) |
| 8 | `apps/web/src/components/reports/sales-by-origin-screen.test.tsx`; `apps/web/src/components/integrations/meta-pixel-screen.test.tsx` › "leads to the sales by origin, with or without a pixel saved"; `packages/ui/.../meta-pixel-report-link.test.tsx`; o item do menu e o redirecionamento de `/reports` foram vistos no navegador (abaixo) — não têm teste automático |
| 9 | `apps/web/src/lib/report-period.test.ts`; tela › "reads thirty days ending today on a bare address…", "reads the period the address names, and offers the others as addresses", "reads a period it cannot mean as thirty days…" |
| 10 | `packages/ui/src/blocks/reports/sales-by-origin-table.test.tsx`; `sales-origin-label.test.ts` › "names a campaign exactly as its order's page does"; tela › "draws the period's sales by origin with their share, the total, and the days the API answered with". A ordem é a da API (e2e do item 1) |
| 11 | tela › "holds the table's place with a skeleton while it reads — no spinner, no table, no days"; "says a period with no sale is empty, and how an origin gets recorded…"; "says under the table how an origin gets recorded, that older orders read as direct, and that spend and ROAS stay at Meta"; `sales-by-origin-parts.test.tsx` |
| 12 | `sales-by-origin-table.test.tsx` › "draws a campaign's name as text, never as markup, with the whole of it in the title"; `sales-by-origin-cards.test.tsx` › "draws a campaign's name as text, whole, breaking anywhere"; e2e › "hands a label back as it was written, as text"; a largura a 390 px foi medida no navegador (abaixo) |
| 13 | `packages/ui/src/locales/{messages,pt-BR,en}.ts` (`reports.salesByOrigin`, `integrations.metaPixel.salesByOrigin`), `apps/web/src/locales/*` (`stores.nav.reports`); cada bloco tem teste com axe e story em `sales-by-origin.stories.tsx` / `meta-pixel.stories.tsx`; "speaks the language it is handed" em cada um |
| 14 | `apps/api/docs/README.md`, `apps/web/docs/README.md`, `packages/ui/docs/README.md`, `docs/product/README.md`; `pnpm docs-gate` verde |
| 15 | dito no PR, com o commit em que foi rodado |

Web: `apps/web/src/app/api/stores/[slug]/reports/sales-by-origin/route.test.ts` (o handler: repassa a consulta e o token do dono, devolve as recusas da API como vieram, recusa outra origem, corpo que não é JSON e falta de sessão antes de chamar) e `apps/web/src/services/reports/report-hooks.test.tsx` (a chave por loja e período, o código do erro, nada sem loja).

## 06/10 — o que foi visto no navegador

A página foi aberta de verdade (`next dev` na 3800, a API compilada na 3801, banco `harness_meta_pixel`) e percorrida por um Chromium sem janela do Playwright, a 1280 px e a 390 px, com **toda requisição a `facebook.com` e `connect.facebook.net` abortada** (nenhuma foi tentada). Duas lojas e dois lojistas novos foram criados pela API para isso — `loja-relatorio` (11 pedidos) e `loja-relatorio-vazia` (nenhum) — e ficaram no banco; os servidores foram parados depois.

- **Com dados** (`loja-relatorio`): três pedidos de `facebook / cpc / Black Friday 2026` (dois com clique guardado), um de `instagram / social / bio`, um só com clique de anúncio, dois diretos, uma venda de quatro unidades registrada no painel, um de campanha de 80 caracteres, um de campanha `<img src=x onerror=alert(1)>` e um cancelado. A página mostrou "De 07/09/2026 a 06/10/2026" e, em ordem: `facebook / cpc · campanha Black Friday 2026` — "2 de 3 pedidos com clique em anúncio da Meta" — 3 · R$ 359,40 · 33,3%; `Venda registrada no painel` 1 · R$ 239,60 · 22,2%; `Direto / sem campanha` 2 · R$ 119,80 · 11,1%; `instagram / social · campanha bio`; `Anúncio da Meta`; a campanha longa; a do `<img>`, escrita como texto (nenhum `<img>` no `main`); **Total 10 · R$ 1.078,20 · 100%**. O cancelado não entrou.
- **1280 px:** a tabela; a campanha longa em duas linhas, com o `title` inteiro. Página 1280/1280, tabela 942/942: nada rola para o lado.
- **390 px:** os cartões, a tabela escondida; a campanha longa inteira em quatro linhas, a 300 px de largura. Página 390/390.
- **Carregando** (a leitura do BFF segurada por 2,5 s): o esqueleto no lugar da tabela, os atalhos de período e as notas já na tela, nenhum `role=status` nem ícone girando.
- **Vazio** (`loja-relatorio-vazia`): "Nenhuma venda neste período.", a explicação e `http://localhost:3800/loja-relatorio-vazia?utm_source=instagram&utm_medium=social&utm_campaign=minha-campanha` como texto para copiar; as notas sem repetir o exemplo.
- **Período:** "7 dias" leva a `?period=7` e mostra "De 30/09/2026 a 06/10/2026", com `aria-current`; o Voltar retorna ao endereço sem período, com "30 dias" marcado; `?period=banana` lê 30 dias.
- **Chegada:** `/admin/loja-relatorio/reports` redireciona para `/reports/origins`; o item "Relatórios" do menu aponta para `/reports` e fica marcado na página; o cartão "Vendas por campanha" da página do Pixel da Meta (loja sem pixel) leva à página.
- **Outro lojista** abrindo o relatório de uma loja que não é dele: "Não foi possível carregar as vendas por origem." e "Tentar de novo"; nenhuma tabela.
- Console sem erros no percurso.

**Não visto / não rodado:** o build de produção e o site atrás do Traefik (o endereço do exemplo vem de `siteOrigin()`, que lá lê `x-forwarded-host`); um pedido cobrado no site, pago ou não, na tela (só no e2e da API, com o Asaas de mentira); o plano da consulta com volume — nos bancos desta árvore as tabelas são pequenas e o Postgres escolhe leitura sequencial, então "a consulta entra por `(storeId, placedAt)`" é o esperado, não o medido; o tema escuro; um leitor de tela real (só axe nos testes).

**Correção de nomes (06/10):** o controller e o service do módulo chamam `reports.controller.ts` (`ReportsController`) e `reports.service.ts` (`ReportsService`), como a regra 5 do `apps/api/AGENTS.md` pede (`<name>.controller.ts`), e não `sales-reports.*` como a decisão 13, a seção do Épico P e a tabela de cobertura acima escrevem. É nesses dois arquivos que o P1 acrescenta as rotas dele.
