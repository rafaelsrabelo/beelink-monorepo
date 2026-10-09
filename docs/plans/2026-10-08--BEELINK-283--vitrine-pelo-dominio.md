# BEELINK-283 (Y4) — Web: a loja abre no domínio dela

> Épico Y (BEELINK-279). O desenho é o do [BEELINK-280](2026-10-08--BEELINK-280--dominio-proprio.md), decisões 3 a 8 e 11; o que a API entrega está no [BEELINK-281](2026-10-08--BEELINK-281--dominio-da-loja-api.md). A pilha fica `main` → Y1 → Y2 → **Y4** → Y6 → Y5 → Y3 → Y7. Escrito em 08/10/2026. Só recebe acréscimos.

## O problema

A API já guarda o domínio da loja e diz ao web qual host é de qual loja, e o web ainda não lê nada disso: todo endereço da vitrine começa por `/<slug>`, todo cookie do cliente mora em `Path=/<slug>`, e o `proxy.ts` só é chamado nos caminhos que o `matcher` lista, sem saber o host. Com um domínio `ACTIVE`, `http://<domínio>/` precisa mostrar a home da loja, a navegação inteira precisa acontecer sem o slug, e `beelink.biz/<slug>/…` precisa levar ao domínio.

## Definição de Pronto

1. **A cópia da tabela de hosts**, num módulo do web: lê `GET /custom-domains` com `callApi`, vale 60 s na memória do processo, uma leitura em voo por vez, mantém a última cópia quando a API falha, só conhece os domínios `ACTIVE` e compara hosts sem a porta e em minúsculas.
2. **O `proxy.ts` é chamado em todo pedido que renderiza página ou roda handler.** Fora do `matcher` fica só o que não chega a código nenhum do app.
3. **No host da plataforma o comportamento é o de hoje.** As condições do `matcher` antigo viram uma função com teste; os 21 testes de `proxy.test.ts` passam com os blocos `it` intactos; visitante anônimo e robô numa vitrine passam direto, sem redirecionamento e sem chamada à API.
4. **`WEB_DOMAIN` no web:** pedido nesse host não consulta a tabela por host. Sem a variável, todo host consulta a cópia.
5. **`/favicon.ico` responde em qualquer host**, sem reescrita.
6. **Host da plataforma, página `/<slug>/…` de loja com domínio `ACTIVE`:** 308 para o domínio, com o resto do caminho e a query. Nunca `/<slug>/api/…`.
7. **Host de loja com domínio `ACTIVE`:** `www.<domínio>` → 308 para o domínio; `/_next/…`, arquivos e `/api/…` passam; `/<slug>/api/…` passa; a página `/<slug>` ou `/<slug>/…` → 308 para a mesma sem o slug; qualquer outro caminho é reescrito para `/<slug><caminho>`. A sessão do cliente é renovada ali, com o slug vindo do host. Um domínio `PENDING` não muda nada.
8. **O pedido leva um carimbo** dizendo que chegou pelo domínio da loja; um pedido que já chega com ele é recusado (400) em qualquer host; quem lê a loja só aceita o carimbo com o slug dela.
9. **O prefixo viaja no objeto da loja:** `storefrontRoutes(store)` monta os endereços sem o slug, a home é `/`; `safeBackOf`, `quietPathsOf`, `order-origin.ts`, os redirecionamentos dos handlers e o `returnTo` mandado à API seguem a mesma regra.
10. **Cookies:** no domínio da loja os sete cookies da vitrine ficam em `Path=/`; gravar ou limpar a sessão ali limpa também `/<slug>`.
11. **O botão do Google não aparece** no domínio da loja.
12. **`PublicStore.customDomain` é obrigatório** no contrato, com o fixture do web ajustado.
13. **API:** `termos` e `privacidade` entram em `RESERVED_PATH_SEGMENTS`, com teste.
14. **Testes de unidade:** a tabela, o proxy (cada regra acima), as rotas com e sem prefixo, os cookies.
15. **Spec de Playwright:** guarda um domínio `ACTIVE` direto no banco, abre `http://<algo>.localhost:3100/`, navega sem que nenhum endereço leve o slug, cria conta e entra por e-mail, põe um produto no carrinho, recarrega e ainda o vê, e confere que `http://localhost:3100/<slug>` leva ao domínio.
16. **No navegador**, em `http://<algo>.localhost:3800`: home, categoria, produto, busca, carrinho, entrar, conta, sair.
17. **Documentos:** `apps/web/AGENTS.md`, `apps/web/docs/README.md`, `apps/web/.env.example`, `docs/repo/deploy.md`, e `WEB_DOMAIN` no serviço `web` do compose.
18. **Nenhuma página da vitrine deixou de ser estática** por causa deste ticket (saída do `next build`).
19. `pnpm ci-check` verde.

## Decisões

As do épico estão no plano do BEELINK-280. As abaixo são deste ticket. As marcadas "orquestrador" foram confirmadas por ele em 08/10, antes de qualquer código; as outras são do desenvolvedor. O Rafael pode mudar qualquer uma.

### O carimbo: como a página sabe por onde o pedido chegou

1. **O proxy carimba o pedido** (orquestrador). Quando o host é de uma loja `ACTIVE`, o proxy põe no pedido o header `x-bl-shop-domain: <slug>` e o manda adiante (reescrito ou não). `shopAt`, os handlers de `/<slug>/api/…` e mais ninguém leem o header. O briefing sugeria comparar o host do pedido com `PublicStore.customDomain`; ficou o carimbo por dois motivos:
   - **os handlers precisam da resposta sem ler a loja.** Catorze arquivos de `app/[slug]/api/…` e `lib/shopper-forward.ts` gravam ou limpam o cookie da sessão, e nove montam redirecionamentos: o `Path` do cookie e o destino dependem de por onde o pedido chegou. Comparar com a loja custaria uma leitura por pedido em cada um;
   - **a página fica coerente com a rota que a serviu** (ver o acréscimo à decisão 6, abaixo).
2. **Um pedido que já chega com o header é recusado com 400**, em qualquer host e antes de qualquer outra regra. Nenhum navegador o manda; quem manda está dizendo que chegou pelo domínio de uma loja. Recusar é uma linha; limpar o header exigiria que toda resposta do proxy sobrescrevesse os headers do pedido.
3. **`shopAt` só aceita o carimbo cujo slug é o da loja que está lendo** (orquestrador), e o handler só o aceita igual ao slug do próprio caminho. No host de uma loja, `/<outra>/api/…` não chega a handler nenhum: é reescrito como página e dá 404.
4. **O que fica fora do `matcher`**, e por que nada ali lê o carimbo (orquestrador pediu a lista):
   - `/_next/static/…`: os arquivos do build, servidos do disco;
   - `/_next/image…`: o otimizador de imagens do Next.

   Nenhum dos dois executa página, layout ou handler do app. **Os arquivos com extensão ficam dentro do `matcher`**, ao contrário do que o briefing dizia: um segmento dinâmico aceita ponto, então `/<slug>/produtos/a.b` e `/<slug>/api/customer/a.b` chegam ao código da página e do handler, e ficariam fora do proxy se o `matcher` excluísse "o que tem extensão". Arquivo passa direto **dentro** da função, depois da recusa do carimbo forjado. O custo é o proxy rodar também para `public/` e para `/favicon.ico`: uma chamada sem leitura nenhuma.
5. **O carimbo nunca vai na resposta**, só no pedido que segue para a página.

### Acréscimo à decisão 6 do épico (08/10)

A decisão 6 do BEELINK-280 diz que "o prefixo vem do pedido": sem prefixo quando o host do pedido é o domínio da loja, com `/<slug>` em qualquer outro host. **O que este ticket fixa: o prefixo segue o que o proxy fez naquele pedido**, e não uma segunda comparação de host feita pela página. A cópia da tabela que o proxy guarda e o cache da loja que a página lê vencem em horas diferentes; no minuto em que discordam, uma página que comparasse o host por conta própria montaria endereços sem slug num host que o proxy ainda não reescreve, e o clique seguinte daria 404. Com o carimbo, a página serve endereços sem slug exatamente quando o proxy a serviu sem slug. `PublicStore.customDomain` continua no contrato, obrigatório, e o web não precisa dele para o prefixo.

### O proxy

6. **O `matcher` é uma entrada só:** tudo, menos `/_next/static` e `/_next/image`.
7. **As condições do `matcher` antigo viram `wasHandedOver()`** (`lib/proxy-scope.ts`): os dez caminhos do painel, os handlers de `/api` com `bl_refresh` (fora `session`, `auth`, `customer`, `storefront`), e a vitrine com `bl_shopper_refresh` e sem `bl_shopper_access`. No host da plataforma, o que essa função não entrega passa direto, como passava quando o `matcher` não chamava o proxy.
8. **Um defeito conhecido é reproduzido, não consertado** (orquestrador). O `matcher` antigo testava `(?!_next|api)` como prefixo do primeiro segmento: a loja cujo slug começa por `api` (`apiario`) ou por `_next` nunca teve a sessão do cliente renovada pelo proxy no host da plataforma. A função faz o mesmo. No domínio próprio isso não acontece, porque o slug vem do host.
9. **`proxy.test.ts`: os 21 blocos `it` ficam byte a byte iguais** (orquestrador). Mudam duas coisas do arquivo, fora deles:
   - o helper `selects()` lia `config.matcher`; como o `matcher` deixou de ser a lista, ele passa a perguntar a `wasHandedOver()`, a função que herdou as condições. Sem isso o teste "never selects a storefront path" falharia, e com razão: ele existe para falhar quando o `matcher` vira pega-tudo;
   - entra um `vi.mock` do módulo da tabela de hosts, vazia por padrão. Sem ele, o teste "renews an expired session in place" veria a leitura da tabela como a primeira chamada de `fetch`.
10. **Ordem das regras.** Primeiro a recusa do carimbo forjado. Depois, pelo host: se `WEB_DOMAIN` está definida e o host é ela, vai direto para as regras da plataforma; senão consulta a cópia pelo host (e por `www.` + host).
    - **Host de loja:** `www` → 308; `/_next/…` e `/api/…` passam; `/<slug>/api/…` passa com o carimbo e a renovação da sessão; arquivo (último segmento com ponto) passa; `/termos` e `/privacidade` passam (decisão 14); `/<slug>` e `/<slug>/…` → 308 sem o slug; o resto é reescrito para `/<slug><caminho>` com o carimbo e a renovação da sessão.
    - **Host da plataforma:** a página `/<slug>/…` cujo slug tem domínio `ACTIVE` → 308 para o domínio. Só é consultado o que tem forma de página de loja: não é arquivo, não é `/api/…`, não é caminho do painel, e o segundo segmento não é `api`. Depois, `wasHandedOver()` e o código de hoje.
11. **O destino do 308 para o domínio** (orquestrador): quando o host do pedido é local (`localhost`, `*.localhost`, `127.0.0.1`, `[::1]`), o esquema e a porta são os do pedido, porque não existe https em desenvolvimento nem no e2e; em qualquer outro host, `https://<domínio>` sem porta. Os redirecionamentos dentro do mesmo site (o `www`, o slug a mais) saem de `publicOriginOf()`, nunca de `request.url`.
12. **A reescrita sai de `request.nextUrl`**, não de `publicOriginOf()`: ela é interna, e o Next só a trata como interna quando a origem é a do próprio servidor.
13. **A renovação da sessão do cliente no domínio da loja** vale nas mesmas condições de hoje (há `bl_shopper_refresh`, falta `bl_shopper_access`), nas páginas reescritas e em `/<slug>/api/…`.
14. **`/termos` e `/privacidade` passam direto no host da loja** (orquestrador). O rodapé da vitrine, a faixa de cookies e o cadastro apontam para lá; reescritos virariam `/<slug>/termos` e dariam 404. As duas palavras já são slugs de loja reservados, e passam a ser também segmentos reservados de categoria (`RESERVED_PATH_SEGMENTS`, na API, neste PR): sem isso, uma categoria com esse nome sumiria no domínio próprio.

### A cópia da tabela

15. **`lib/shop-hosts.ts`.** Uma leitura vale 60 s. Vencida, o próximo pedido espera a leitura nova (uma só em voo, para todos os que chegarem juntos); se ela falhar, vale a cópia anterior e a próxima tentativa é em 5 s, não a cada pedido. Servir a cópia vencida enquanto a nova é lida seria mais rápido, e numa loja sem visitas a primeira visita depois de horas receberia a tabela de horas atrás.
16. **Só os `ACTIVE` entram na cópia.** Um `PENDING` não existe para o proxy, que é o que "não muda nada" quer dizer.
17. **Não há função exportada para derrubar a cópia** (orquestrador). O Next avisa que o proxy pode não dividir módulos nem globais com o resto do app; uma função que o handler do Y6 chamasse e que não alcançasse a cópia do proxy seria uma promessa falsa. **Uma mudança de domínio leva até um minuto para o proxy ver.** A medição (o proxy e os handlers dividem memória em `next dev` e em `next start`?) fica para quando o ambiente voltar.

### Endereços

18. **`ShopAddress`** (`lib/shop-address.ts`): `{ slug, ownDomain? }`. `shopBaseOf()` é `/<slug>` ou vazio; `shopHomeOf()` é `/<slug>` ou `/`, e é também o `Path` dos cookies. `storefrontRoutes()` continua sendo chamado com a loja; a loja que `shopAt` devolve leva `ownDomain`.
19. **`safeBackOf(shop, raw)` passa a receber o endereço, não o slug.** No domínio da loja o site inteiro é a loja: vale qualquer caminho dele, e um `/<slug>/…` é descascado, porque é assim que a API ainda escreve o `voltar` dos e-mails.
20. **O `returnTo` vai para a API na forma `/<slug>/…`** (`platformPathOf`). A API reduz à frente da loja o que não começa por `/<slug>` (`shopReturnOf`), e os e-mails só passam a ser escritos com o domínio no Y7.
21. **Os componentes de cliente leem `ownDomain` de um contexto** (orquestrador), posto pelo layout da vitrine. Seis deles montam rotas com `{ slug, routeWords }` soltos e sete escrevem cookies. Fora do layout (a prévia do modo design) o contexto diz que não, e os endereços saem com `/<slug>`, que é o certo no painel.
22. **O canonical da home deixa de ser o literal `/${slug}`** e passa a sair de `storefrontRoutes()`, como o das outras páginas. Só para as páginas não discordarem entre si; a política de canonical é do Y7.

### Cookies

23. **São sete, não três** (orquestrador): a sessão (`bl_shopper_access`, `bl_shopper_refresh`), `bl_cart`, `bl_consent`, `bl_origin`, `bl_popup`, `bl_purchases` e `bl_shop`. No domínio da loja a página está em `/produtos`, e um cookie em `Path=/<slug>` não é lido ali.
24. **O gêmeo em `/<slug>` é limpo com um `Set-Cookie` cru** (orquestrador). O jar de cookies do Next guarda um cookie por nome: um segundo `set` com outro `path` substitui o primeiro (conferido). Por isso `setCustomerSessionCookies` e `clearCustomerSessionCookies` recebem a resposta, e não o jar, e acrescentam o header depois das escritas do jar.
25. **Só a sessão limpa o gêmeo.** Um cookie em `/<slug>` só nasce no domínio da loja no minuto em que a cópia do proxy ainda não conhece o domínio; os seis que o navegador escreve vencem sozinhos, e o Next lê o de `Path=/` quando os dois chegam (conferido: `RequestCookies.get` devolve o último, e o navegador manda o caminho mais longo primeiro).
26. **O isolamento dos cookies do Google Analytics (BEELINK-303) não está nesta branch.** Quando entrar, o `cookie_path` dele segue `shopHomeOf()`.

## Fora do escopo

- O painel e os handlers de `/api/stores/:slug/custom-domain` (Y6).
- Login com Google e o chat do pedido no domínio da loja (Y5). O botão do Google só some; o socket continua apontando para `NEXT_PUBLIC_REALTIME_URL`.
- Traefik: roteador e certificado por domínio (Y3).
- Canonical absoluto, `sitemap.xml`, `robots.txt` e e-mails escritos com o domínio (Y7).
- Consertar o defeito do slug que começa por `api` (decisão 8).

## Riscos

- **Trocar o `matcher`** é a mudança que o comentário do arquivo avisava que quebra a vitrine em silêncio. O que a segura agora é `wasHandedOver()` e os testes dela.
- **Uma categoria com o slug da própria loja** some no domínio próprio: `/<slug>` ali redireciona para `/`.
- **Uma mudança de domínio leva até um minuto** para o proxy ver (decisão 17), e durante esse minuto a loja pode responder nos dois endereços.
- **O proxy passa a rodar em todo pedido**, inclusive nos arquivos de `public/`. No host da plataforma com `WEB_DOMAIN` definida isso não lê nada; sem ela, ou em outro host, lê a cópia em memória.
- **A tabela é lida pelo web a cada minuto.** Com a API fora no arranque, a cópia é vazia e todo host é tratado como o da plataforma até a primeira leitura que der certo.

## Notas da entrega (acréscimo, 08/10)

**O ambiente no dia.** O código, os testes de unidade e os documentos foram escritos com o Docker fora do ar e o disco da máquina quase cheio: no meio do ticket o disco encheu durante um `next build` de base e o Docker Desktop desligou o engine. A partir dali, por ordem do orquestrador, nada que precisasse do banco, de um build ou de um servidor foi rodado. **Tudo o que depende disso está escrito e não conferido**; a lista está em "O que não rodou".

**Correções ao que está acima.**

- **Decisão 9:** fora dos 21 blocos `it`, o arquivo `proxy.test.ts` mudou em quatro pontos, não dois: o helper `selects()`; o `vi.mock` da tabela de hosts; duas linhas no `afterEach`, que devolvem a tabela simulada ao vazio; e os imports (`wasHandedOver` e `unstable_doesMiddlewareMatch`, este para os testes novos do `matcher`). Um `diff` contra o arquivo anterior mostra só isso antes dos testes acrescentados no fim.
- **Decisão 10:** a recusa do carimbo forjado responde `400` com o corpo de erro de sempre (`{ statusCode, errorCode: "BAD_REQUEST", message }`).
- **Decisão 18:** o tipo que `shopAt` devolve é `ServedShop` (`PublicStore` mais `ownDomain: boolean`). `SectionPlace.store` aceita a loja com ou sem a marca.
- **Decisão 19:** além de descascar o `/<slug>`, `safeBackOf` no domínio da loja resolve o caminho como o navegador resolve e confere a origem. Sem isso, `/<tab>/evil.example` passava: o navegador tira a tabulação e sobra `//evil.example`, outro site (conferido: `new URL("/\t/evil.example", base).origin` é `http://evil.example`). No host da plataforma a regra antiga já barrava, porque exige o `/<slug>` na frente.
- **Decisão 24:** a ordem importa mais do que a decisão dizia. Uma escrita no jar **depois** dos headers crus os apaga (o jar reescreve todos os `Set-Cookie` a partir do que guarda). Os helpers da sessão são, por isso, a última coisa escrita numa resposta; no retorno do Google a limpeza do cookie de estado passou para antes deles. Há teste para a perda.
- **Riscos:** faltaram três. O **carrinho, a sessão e a resposta sobre cookies não atravessam** do `beelink.biz/<slug>` para o domínio: são sites diferentes para o navegador, e o cliente que estava no meio de uma compra recomeça. **O funil conta a visita do próprio lojista** no domínio da loja, porque o cookie do painel, que o tira da conta, não chega àquele host. E **uma categoria `termos` ou `privacidade` que já exista** numa loja continua abrindo no host da plataforma e some no domínio próprio: a reserva na API só vale para o que for criado ou renomeado dali em diante, e nenhuma loja de produção foi consultada para saber se existe alguma.

**Onde ficou cada coisa.**

- `apps/web/src/lib/shop-address.ts`: `ShopAddress` (`{ slug, ownDomain? }`), `SHOP_DOMAIN_HEADER` (`x-bl-shop-domain`), `shopAddressOf(headers, slug)`, `shopBaseOf`, `shopHomeOf`, `platformPathOf`.
- `apps/web/src/lib/shop-hosts.ts`: `shopHosts()` devolve `{ slugOf(host), hostOf(slug) }`; `hostNameOf(raw)`; `createShopHosts(read, now)` para os testes; `SHOP_HOSTS_FRESH_MS` (60 s) e `SHOP_HOSTS_RETRY_MS` (5 s).
- `apps/web/src/lib/proxy-scope.ts`: `wasHandedOver(pathname, has)`, `isAuthPath`, `isPanelPath`, `isFilePath`, `shopPageOf`.
- `apps/web/src/proxy.ts`: `proxy()` recusa o carimbo, lê o host e entrega a `onShopDomain()` ou a `onPlatform()`. `config.matcher` é `["/((?!_next/static|_next/image).*)"]`.
- `apps/web/src/lib/storefront-data.ts`: `ServedShop`, e `shopAt` lendo o carimbo com `headers()`.
- `apps/web/src/lib/storefront-routes.ts`: `StorefrontShop` estende `ShopAddress`; `safeBackOf(shop, raw)`.
- `apps/web/src/lib/customer-session-cookies.ts`: `setCustomerSessionCookies(answer, shop, session)` e `clearCustomerSessionCookies(answer, shop)`.
- `apps/web/src/components/storefront/shop-address-provider.tsx`: `ShopAddressProvider` e `useShopAddress(slug)`; o provider está em `app/[slug]/layout.tsx`.
- `apps/web/src/lib/server-env.ts`: `WEB_DOMAIN`.
- `apps/api/src/modules/catalog/catalog.constants.ts`: `termos` e `privacidade` em `RESERVED_PATH_SEGMENTS`. A lista é a mesma para o slug de um produto, então um produto chamado "Termos" também passa a ser recusado sem slug próprio.

**Para o Y6 (painel).**

- **Não há o que chamar para derrubar a cópia da tabela** (decisão 17). Depois de salvar, conferir ou remover um domínio, o handler derruba só o cache da loja (`revalidateStore`, como o plano do BEELINK-281 já pedia); o proxy vê a mudança em até um minuto. A tela precisa dizer isso ao lojista, ou o "ativo" dela vai adiantar-se à loja abrindo.
- Um link do painel para a vitrine (`/<slug>`) continua certo: com o domínio ativo, o proxy o leva ao domínio.
- `PublicStore.customDomain` é obrigatório e a loja lida por `shopAt` traz `ownDomain`.

**Para o Y5 (Google e chat).** O botão do Google some no domínio da loja por `store.ownDomain` em `storefront-sign-in-section.tsx`; as duas rotas do Google usam `safeBackOf({ slug }, …)`, isto é, endereços do host da plataforma. O socket do chat continua abrindo em `NEXT_PUBLIC_REALTIME_URL`: no domínio da loja a origem é outra, e o que acontece ali não foi visto.

**Para o Y7 (canonical, sitemap, e-mails).**

- O canonical de cada página sai de `storefrontRoutes()` e é relativo: no domínio da loja fica sem o slug. Não há `metadataBase`.
- `robots.txt` e `sitemap.xml` passam pelo proxy como arquivos, sem reescrita e sem carimbo, em qualquer host. Hoje nenhum dos dois existe. Para responderem por loja, o proxy precisa reescrevê-los no host da loja antes do teste de "é arquivo".
- Os e-mails continuam escritos pela API com `WEB_URL`. Funcionam por causa do 308 do host da plataforma, e o `voltar` deles chega no formato `/<slug>/…`, que `safeBackOf` lê.
- O JSON-LD do produto usa endereços relativos.

**O que rodou.**

- `pnpm ci-check`, no último commit: verde. `type-check` dos cinco workspaces, `lint`, os testes de unidade (ui 354 arquivos, api 119, web 291), `arch-gates` e `docs-gate`. Sem `--e2e`: nenhum build, nenhuma suíte que precise de banco.
- Os testes de unidade deste ticket: `proxy.test.ts` (62: os 21 de antes e 41 novos), `proxy-scope.test.ts` (11), `shop-hosts.test.ts` (13), `shop-address.test.ts` (7), `own-domain-cookies.test.ts` (10), `customer-session-cookies.test.ts` (6), `shop-address-provider.test.tsx` (3), e acréscimos em `storefront-routes`, `storefront-data`, `storefront-track`, `order-origin`, `server-env`, no handler `customer/[action]` e no de `reorder`; na API, um teste em `catalog-slug.service.spec.ts`.
- `next typegen` (escreve só os tipos de rota) e `playwright test --list` do spec novo, que o lê sem subir servidor nem navegador.
- Antes da queda do ambiente: `prisma migrate status` no banco de dev ("Database schema is up to date!", 105 migrations), e um `next build` da branch **sem nenhuma mudança deste ticket**, em que todas as páginas já saíam dinâmicas (`ƒ`): `/`, as cinco de `/[slug]/…`, as do painel e as de autenticação. Só `/icon.png` e `/apple-icon.png` são estáticas.

**O que não rodou.** Nada disto foi conferido; cada item é uma coisa escrita e não vista funcionar.

- **`next build` com este ticket.** O item 18 da Definição de Pronto está sem evidência: o que há é o build de antes. A leitura de `headers()` em `shopAt` não deve mudar nada, porque as páginas já eram dinâmicas, mas isso é raciocínio, não saída de comando.
- **O spec de Playwright** `apps/web/e2e/shop-domain.spec.ts`: escrito, tipado, listado, nunca rodado. Os seletores foram tirados dos textos em `packages/ui/src/locales/pt-BR.ts`, não de uma tela aberta. Quando rodar: `MAILPIT_URL=http://localhost:8027 SMTP_URL=smtp://localhost:1027 DATABASE_URL=postgresql://harness:harness@localhost:5442/harness_domain_test`, depois de `pnpm --filter api build && pnpm --filter web build`. `prisma db execute --stdin` também nunca foi visto funcionar: a única tentativa foi com o banco já fora.
- **Os outros specs de Playwright** (`auth-journey`, `panel-session`, `shared-tab`, `accessibility`): o proxy mudou para todos eles e nenhum foi rodado.
- **A suíte e2e da API.** A API mudou em duas linhas (a lista de palavras reservadas e o campo obrigatório no DTO); só os testes de unidade dela rodaram.
- **O navegador.** Nenhuma tela foi aberta: nem `http://<algo>.localhost:3800`, nem o host da plataforma depois da troca do `matcher`.
- **O proxy num servidor de verdade.** Os testes conferem os headers que o `NextResponse` escreve (`x-middleware-rewrite`, `x-middleware-request-x-bl-shop-domain`); que o Next entregue a página reescrita com o carimbo, numa navegação e num pedido de RSC, não foi visto. Idem para o `matcher`: `unstable_doesMiddlewareMatch` diz o que ele alcança, um servidor não foi perguntado.
- **`usePathname()` sob reescrita.** Três componentes o usam (`like-on-return`, `storefront-favorite-live`, `shopper-conversations-live`). Se no servidor ele devolver o caminho reescrito (`/<slug>/produtos`) e no navegador o da barra (`/produtos`), há aviso de hidratação e o `voltar` do coração sai com o slug no HTML sem script; o destino continua certo, porque `safeBackOf` descasca. A documentação do Next só avisa do caso pré-renderizado, que não é o destas páginas.
- **Se o proxy e os handlers dividem memória** em `next dev` e em `next start` (decisão 17).
- **Os endpoints de desenvolvimento do Next fora de `/_next/`** (`/__nextjs_…`, a sobreposição de erro) num host de loja: lá eles seriam reescritos como página. Só afeta desenvolvimento, e não foi visto.
- **Nada no servidor de produção**: nem `WEB_DOMAIN` no serviço `web`, nem o `X-Forwarded-Host` que o Traefik manda para um domínio de loja.

**Acréscimo às notas (08/10).** O item 11 da Definição de Pronto ganhou teste depois das notas acima: `storefront-sign-in-section.test.tsx` (3 testes) confere que o botão do Google é oferecido no host da plataforma e não no domínio da loja, onde a API nem é perguntada. `pnpm ci-check` foi rodado de novo no commit que traz este acréscimo, e continuou verde (web: 292 arquivos de teste).

## Acréscimo do orquestrador (08/10, na revisão)

**A leitura da tabela de hosts tem tempo limite.** `callApi` não tem nenhum, e o proxy espera a leitura em voo na frente de todo pedido de página de loja (e de todo pedido num host que não é o da plataforma): uma API que aceita a conexão e nunca responde seguraria esses pedidos pelos cinco minutos do próprio `fetch`. `readFromApi` agora desiste em 3 s (`SHOP_HOSTS_READ_TIMEOUT_MS`, `settledWithin` em `apps/web/src/lib/shop-hosts.ts`); uma leitura atrasada é uma leitura que falhou, e a última cópia continua valendo. Conferido só por teste de unidade, como o resto do proxy.

## O que rodou em 09/10 (acréscimo)

Com o disco liberado e o Docker de volta, rodou tudo o que a seção "O que não rodou" listava. Na branch do BEELINK-285 (o painel, em cima desta), que contém este ticket inteiro; a tela de domínio usada abaixo é dela. Banco de dev e de e2e no Postgres da porta 5442, Mailpit na 1027/8027.

**Build.** `pnpm --filter api build` e `pnpm --filter web build`: os dois com saída 0. Na tabela de rotas do web, as únicas estáticas (`○`) são `/apple-icon.png` e `/icon.png`, as mesmas duas do build de 08/10, feito antes de qualquer mudança deste ticket. `/`, `/[slug]`, `/[slug]/[section]`, `/[slug]/[section]/[item]`, `/[slug]/[section]/[item]/[sub]`, `/[slug]/lp/[page]`, `/login`, `/termos` e `/privacidade` seguem `ƒ`. O item 18 da Definição de Pronto tem evidência agora. O log do build de 08/10 se perdeu com a pasta temporária; a comparação é com a lista que este plano e o relatório daquele dia registraram.

**Playwright**, contra os apps compilados, com `MAILPIT_URL=http://localhost:8027 SMTP_URL=smtp://localhost:1027 DATABASE_URL=…5442/harness_domain_test`: **12 passaram** (`12 passed (1.1m)`), os 11 que já existiam e o `shop-domain.spec.ts`. O spec novo falhou duas vezes antes de passar, as duas por seletor, nenhuma por defeito do app:

1. `getByRole("link", { name: <produto> }).first()` pegava o coração ao lado do cartão ("Entre para curtir <produto>"), que leva ao entrar. O cartão passou a ser achado pelo endereço para onde leva (`a[href="/produtos/<slug>"]`), o que também confere o endereço.
2. `getByText("Olá, Bia")` casava com o cabeçalho e com o título da página. Passou a pedir o `h1`.

O jeito de ativar o domínio no banco (`prisma db execute --stdin`) funcionou de primeira, e a cópia do proxy conheceu o domínio dentro do prazo em todas as rodadas. Depois entrou um passo a mais no spec: um filtro da prateleira seguido pelo roteador (`router.push`), que pede os dados da página no endereço sem o slug (`/produtos?precoMin=…&_rsc=…`, 200, sem recarregar).

**Suíte e2e da API**, inteira, com `TEST_DATABASE_URL`, `TEST_SMTP_URL` e `MAILPIT_URL` deste worktree: `Test Files 1 failed | 86 passed (87)`, `Tests 1 failed | 1096 passed (1097)`. O que falhou é `meta-pixel-without-vault-key.e2e-spec.ts`, o conhecido do `.env`.

**No navegador** (`next dev --port 3800`, API na 3801), com a loja `loja-dominio-1791487727`, uma categoria e dois produtos criados pelo painel:

- **Host da plataforma, sem domínio ativo:** visitante anônimo em `/<slug>`, catálogo, categoria, busca, produto, carrinho e entrar: 200, nenhum redirecionamento para `/login`, todo link com o slug. `/<slug>/conta` leva ao entrar da loja. `/admin` e `/admin/<slug>` sem sessão levam a `/login?voltar=…`; o login do painel entra. O carrinho e a sessão do cliente ficam em `Path=/<slug>` e não são mandados para `/` (conferido no header `Cookie` de cada pedido). O botão do Google aparece. Um pedido com `x-bl-shop-domain` responde 400 em página, handler e `/favicon.ico`; num arquivo de `/_next/static` o header passa (o proxy não é chamado ali).
- **Domínio da loja** (`loja.localhost`, escrito `ACTIVE` no banco): `/`, `/produtos`, `/bolsas`, `/categorias`, `/busca?q=…`, `/produtos/<produto>`, `/carrinho`, `/entrar`, `/entrar?modo=criar`: 200, nenhum `href` com o slug, no HTML do servidor inclusive. `/termos`, `/privacidade` e `/favicon.ico`: 200. `/admin`, `/login` e o handler de outra loja: 404. Produto no carrinho (`bl_cart` em `Path=/`), ainda lá depois de recarregar. Conta criada; o link do e-mail, escrito com o endereço da plataforma e `voltar=/<slug>/carrinho`, abriu no host da plataforma, foi levado (308) ao domínio e terminou em `/entrar?voltar=%2Fcarrinho&confirmado=1`. Entrar devolveu ao `/carrinho`; `bl_shopper_access` e `bl_shopper_refresh` em `Path=/`, mandados às páginas e a `/<slug>/api/…`. Perfil salvo pelo formulário, voltando ao carrinho. **Pedido nº 1 fechado** (`POST /<slug>/api/orders` → 201), a página do pedido e "Meus pedidos" sem o slug. Sair levou a `/`, e `/conta` voltou a pedir o entrar. O botão do Google não aparece.
- **Redirecionamentos:** `localhost:3800/<slug>/produtos/<p>?variant=x&cor=azul` → 308 → `http://loja.localhost:3800/produtos/<p>?variant=x&cor=azul`; `/<slug>/…` no domínio → 308 para o mesmo sem o slug; `www.` → 308 para o domínio, com caminho e query. Um handler nunca é redirecionado.
- **A sessão vencida no domínio:** com `bl_shopper_access` apagado, `/conta/pedidos` abriu já logado, e a resposta trouxe o par novo em `Path=/` e os dois gêmeos de `/<slug>` com `Max-Age=0`.
- **O caminho pelo painel** (`SHOP_DOMAIN_PROBE=false` no `.env` da API): em `/admin/<slug>/domain`, `https://www.LVH.me/` foi salvo como `lvh.me`, `ACTIVE` ("Domínio salvo e ativo."). `http://lvh.me:3800/` abriu a loja **51 s depois**; `www.lvh.me` levou a `lvh.me`. Removido pela tela, o endereço da plataforma voltou a servir a loja **49 s** depois numa vez e **48 s** na outra. Escrito direto no banco, o domínio levou 13, 33, 21 e menos de 2 s para valer: é o minuto da cópia, contado de quando ela foi lida.

**O que o navegador mostrou e mudou código.**

- **Em `next dev`, a loja em `lvh.me` desenhava e nenhum botão respondia.** O servidor de desenvolvimento do Next recusa os próprios recursos (o socket de recarga) a um host em que não foi iniciado, e a página não hidrata. `localhost` e `*.localhost` já eram aceitos. `allowedDevOrigins: ["lvh.me", "*.lvh.me"]` em `next.config.ts` resolve; conferido depois: hidrata, o carrinho grava, o filtro navega sem recarregar. Um servidor compilado não tem essa checagem (conferido em `next start`).

**O que o navegador mostrou e não mudou nada.**

- **`usePathname()` sob reescrita devolve o caminho da barra, no servidor também.** O HTML do servidor traz o coração com `voltar=%2Fprodutos%3Fcurtir%3D…`, sem o slug. Nenhum aviso de hidratação no console em toda a sessão.
- **O socket do chat é recusado por CORS no domínio da loja**, para o cliente logado, em toda página, e tenta de novo (32 erros no console durante a sessão). As páginas funcionam. É o que o BEELINK-284 resolve.
- **Os endpoints de desenvolvimento do Next fora de `/_next/`** (`/__nextjs_…`) respondem igual nos dois hosts: não passam pela reescrita.
- A página 404 escreve no console "Encountered a script tag while rendering React component" nos dois hosts: já era assim.

**O proxy e os handlers dividem memória?** Medido com um módulo de sonda temporário, importado pelo proxy e por um handler, nunca commitado:

| Onde | Mesmo processo | Mesma instância do módulo | Mesmo `globalThis` |
|---|---|---|---|
| `next dev` | sim | **não** | sim |
| `next start` | sim | **não** | sim |
| `node .next/standalone/…/server.js` | sim | **não** | sim |

O estado guardado num módulo não é dividido: uma função exportada de `lib/shop-hosts.ts` e chamada por um handler mexeria numa cópia que o proxy não lê, e a decisão 17 fica como está. O `globalThis` é dividido nos três modos, então uma cópia guardada nele seria alcançável por um handler. Isso contraria o aviso da documentação do Next, que diz para não contar com globais em comum, e não foi feito.

**No servidor `standalone`, com os headers que o Traefik manda** (`X-Forwarded-Host`, `X-Forwarded-Proto: https`): página da loja pelo host do domínio, 200; `/<slug>/carrinho?cupom=X` no domínio → 308 `https://lvh.me/carrinho?cupom=X`; `www.` → 308 `https://lvh.me/carrinho`; `beelink.biz/<slug>/produtos?pagina=2` → 308 `https://lvh.me/produtos?pagina=2`. Os destinos saem do host encaminhado, não do endereço em que o servidor escuta.

**O que continua sem ter sido visto.**

- Nada no servidor de produção: o Traefik de verdade, o certificado, `WEB_DOMAIN` no serviço `web`.
- Um domínio ficando `ACTIVE` com a sonda de HTTPS ligada. Aqui ela estava desligada.
- "Comprar de novo" no domínio: o pedido feito não o oferecia. Só o teste de unidade cobre.
- O login com Google e o chat do pedido no domínio da loja, que são do BEELINK-284.
- O pixel da Meta e a faixa de cookies no domínio: a loja de teste não tem pixel.
- Um navegador que não seja o Chromium.

**O que ficou no ambiente.** `SHOP_DOMAIN_PROBE=false` no `apps/api/.env` do worktree, que o roteiro mandou pôr. No banco de dev, a loja `loja-dominio-1791487727` sem domínio, com uma categoria, dois produtos, um cliente (`cliente-1791543071550@teste.dev`) e um pedido. No banco de e2e, uma loja com domínio `ACTIVE` por rodada do spec.
