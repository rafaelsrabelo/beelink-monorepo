# BEELINK-284 (Y5) — Login com Google e chat do pedido no domínio da loja

> Épico Y (BEELINK-279). Implementa as decisões 11 e 12 do [BEELINK-280](2026-10-08--BEELINK-280--dominio-proprio.md), em cima do que o [BEELINK-283](2026-10-08--BEELINK-283--vitrine-pelo-dominio.md) (o carimbo `x-bl-shop-domain`, `shopAddressOf`, os cookies em `Path=/`) e o [BEELINK-285](2026-10-08--BEELINK-285--dominio-no-painel.md) deixaram em `main`. A branch sai de `main`, e o PR tem `main` como base. Escrito em 09/10/2026. Só recebe acréscimos.

## O problema

O primeiro domínio próprio está em produção, e nele duas coisas não funcionam:

- **Google.** O Google devolve todo cliente a um endereço só, `https://<WEB_DOMAIN>/api/customer/google/callback`, e o cookie do estado (`bl_oauth_google`) e os da sessão são do host da plataforma. Começado no domínio da loja, o fluxo terminaria com a sessão gravada num host que a loja não lê. Por isso o BEELINK-283 escondeu o botão ali, e os clientes dessa loja ficaram sem "Entrar com Google".
- **Chat.** O navegador abre o socket em `NEXT_PUBLIC_REALTIME_URL`, a origem da plataforma. No domínio da loja a origem da página é outra, e o gateway só responde a `CORS_ORIGINS`: o transporte é recusado em toda página, para o cliente logado, e fica tentando.

## Definição de Pronto

**Google (primeiro, por causa da urgência)**

1. No domínio da loja o botão "Continuar com Google" aparece e o cliente termina logado **no domínio da loja**, com os cookies em `Path=/`, de volta à página em que estava.
2. O fluxo é o da plataforma do começo ao fim: o estado, o cookie do estado e o retorno do Google ficam no host da plataforma. **Nada muda no console do Google e nenhuma variável nova é exigida.**
3. No retorno, para um fluxo começado no domínio da loja, o host da plataforma não grava sessão: recebe da API um código e manda o navegador ao domínio `ACTIVE` daquela loja, lido da API.
4. **O destino nunca vem do pedido.** Nenhum parâmetro, header ou cookie muda o host para onde o código vai; o caminho de volta passa por `safeBackOf`.
5. **O código** é aleatório (256 bits), guardado só como hash, vale um minuto e uma vez (a leitura é o `DELETE` que o tira), é preso à loja e à conta, e só vira sessão com o segredo que o navegador que começou o fluxo guarda. Vencido, usado, de outra loja, com outro segredo ou inexistente: a mesma recusa. Nenhuma sessão existe antes da troca, e nenhum token é guardado na tabela.
6. O handler que troca o código responde sempre com redirecionamento para um endereço sem ele, sem cache e sem `Referer`.
7. Recusa do Google, cancelamento e erro terminam na tela de entrar **do domínio da loja**, com as mensagens de hoje.
8. No host da plataforma o fluxo de hoje não muda: os testes dele passam sem edição, salvo assinatura.
9. Uma tabela nova por migration que só acrescenta; a limpeza do que venceu é feita ao criar o próximo.

**Chat**

10. O gateway responde, além de `CORS_ORIGINS`, à origem de cada domínio `ACTIVE`, lida do banco com uma cópia curta em memória. Nunca um curinga.
11. No domínio da loja, o chat de um pedido conecta e recebe uma mensagem enviada pelo painel, sem erro de CORS no console.

**Os dois**

12. Formatos em `packages/contracts` primeiro; rotas novas em `apps/api/docs/README.md`; handlers novos em `apps/web/docs/README.md`; `apps/web/AGENTS.md`, `docs/repo/deploy.md` e `docs/repo/realtime.md` onde descrevem o que mudou.
13. Testes: e2e da API para o código (uso único, vencimento, loja errada, corrida, segredo errado) e para as origens do socket; unidade dos handlers do web (o destino não vem do pedido, recusa, cookies em `Path=/`). Nenhum teste chama o Google.
14. `pnpm ci-check` verde; a suíte e2e da API e o Playwright rodados.

## Decisões

Do desenvolvedor, salvo quando dito. O Rafael pode mudar qualquer uma.

### O caminho do Google

```
domínio da loja                      host da plataforma                     Google
/entrar
  └─ GET /<slug>/api/customer/google
       cookie bl_oauth_google (segredo)
       303 ─────────────────────────► GET /api/storefront/<slug>/customer/google?desafio=<hash>
                                        cookie bl_oauth_google (estado)
                                        303 ───────────────────────────────► consentimento
                                      GET /api/customer/google/callback ◄──── code, state
                                        API: { handoff: { host, code } }
  GET /<slug>/api/customer/google/session?code=… ◄── 303
       API: troca code + segredo pela sessão
       cookies da sessão em Path=/
       303 → /carrinho
```

1. **O código não basta: ele é preso a um segredo do navegador que começou o fluxo.** O briefing pedia um código de uso único preso à loja e ao cliente. Só isso deixaria um buraco que o fluxo de hoje não tem: alguém faz o próprio login com Google, não segue o último redirecionamento e manda o endereço com o código para outra pessoa; quem clicar fica logado **na conta de quem mandou**, e o que digitar ali (endereço, pedido) fica com ele. No host da plataforma quem impede isso é o cookie do estado. No domínio da loja esse cookie não existe, então o começo do fluxo passa por um handler do próprio domínio, que guarda um segredo num cookie dali e manda só o hash dele (o "desafio") pelo caminho. A API guarda o desafio com o estado, depois com o código, e só troca o código por quem trouxer o segredo. É o PKCE, entre os dois hosts. De quebra, um código lido de um log de acesso, de um histórico ou de um endereço copiado não abre nada.
2. **A sessão só nasce na troca.** O retorno do Google cria a conta, se for o caso, e o código; a sessão é aberta por `POST …/google/handoff`. A tabela guarda o hash do código, o desafio, a loja, a conta, o `returnTo` e o vencimento. Nenhum token passa por ela.
3. **Quem decide que há repasse é a API, por duas coisas que ela mesma lê:** o estado traz um desafio (o fluxo começou no domínio) e a loja tem domínio `ACTIVE` no momento do retorno. Um fluxo começado no host da plataforma termina nele, como hoje, com ou sem domínio ativo. Um domínio removido ou que deixou de estar ativo no meio do fluxo também: a sessão fica no host da plataforma.
4. **O host do destino vem do corpo da resposta da API** (`GoogleSignIn.handoff.host`, a coluna `customDomain` da loja), não da cópia da tabela que o web guarda por um minuto, e nunca do pedido. O web ainda confere a forma do host e do slug antes de montar o endereço. Esquema e porta seguem `shopOriginOf`, a regra que o proxy já usa para o 308: `https://<domínio>`, salvo quando o pedido chegou por um host local.
5. **Um código que chega a um navegador sem o segredo é gasto assim mesmo.** O handler manda à API um segredo qualquer, que não casa: a API tira o código da tabela e recusa.
6. **A leitura que tira o código é a troca inteira**: `DELETE … WHERE codeHash`, e só depois a conferência do vencimento, da loja e do segredo. Um código apresentado no lugar errado deixa de existir. De duas trocas simultâneas, uma não acha nada.
7. **A recusa reaproveita `GOOGLE_STATE_INVALID`**, que já tem frase ("O login com Google expirou ou já foi usado. Tente de novo."). Nenhum texto novo.
   - **O cookie do segredo se chama `bl_oauth_google`, como o do estado.** A lista de cookies do texto de privacidade é uma lista de todos (BEELINK-273), e um nome novo pediria uma linha nova e uma versão nova dos textos. A linha que já está lá diz exatamente o que este cookie é: "guarda por até 10 minutos uma entrada com Google em andamento, para confirmar que ela termina no mesmo navegador em que começou". Os dois não se encontram: um é do host da plataforma, em `Path=/api/customer/google/callback`; o outro é do domínio da loja, em `Path=/<slug>/api/customer/google`. **O texto de privacidade não muda e a versão dos textos também não.**
8. **Recusa, cancelamento e erro no host da plataforma** continuam indo para `/<slug>/entrar?…` ali, e é o 308 do proxy (decisão 3 do épico) que leva ao domínio, com a query. Nenhum código novo, nenhum host montado à mão. No minuto em que a cópia do proxy ainda não conhece o domínio, a tela de entrar aparece no host da plataforma.
9. **A origem da plataforma vem da API**, em `GET /customer/sign-in-options` (`platformOrigin`, a origem de `WEB_URL`). O web tem `WEB_DOMAIN` em produção e nada em desenvolvimento nem no e2e; a API tem `WEB_URL` em todo lugar. Nenhum literal.
10. **Os parâmetros que cruzam de um host para o outro** são três, e nenhum é um host: `voltar` e `retorno`, escritos do jeito da plataforma (`platformPathOf`) e conferidos de novo por `safeBackOf` na chegada, e `desafio`, que só vale se tiver a forma de um SHA-256 em base64url.
11. **`shopOriginOf` e `hostAskedOf` saíram de `proxy.ts` para `lib/shop-origin.ts`**, sem mudar uma linha do corpo: o retorno do Google precisa da mesma regra.
12. **Sem FK na tabela nova**, como `oauth_states` e `realtime_tickets`: uma linha vive um minuto, e a troca relê a loja e a conta.
13. **A sessão aberta pela troca registra o `user-agent` do servidor do web**, como a do retorno do Google já registra hoje. Não mudou.

### O chat

14. **`RealtimeOrigins`** (`apps/api/src/modules/realtime/realtime-origins.ts`) responde se uma origem é aceita: as de `CORS_ORIGINS`, sem ler nada, e a de um domínio `ACTIVE`. A lista vem do banco (`stores` com `customDomainStatus = ACTIVE`) e fica numa cópia de 60 s, com uma leitura em voo por vez; uma leitura que falha mantém a cópia anterior e a próxima tentativa é em 5 s. É o desenho da cópia do web (`lib/shop-hosts.ts`), com uma diferença: **uma origem que a cópia não conhece a faz ser lida de novo quando ela tem mais de 5 s.** Sem isso, o chat de um domínio recém-ativado ficaria um minuto recusado; com isso, uma enxurrada de origens desconhecidas custa uma leitura a cada 5 s.
15. **Em produção só `https://<domínio>`, na porta padrão.** Fora de produção (`NODE_ENV` diferente de `production`), o esquema e a porta que vierem, para um domínio `ACTIVE`: em desenvolvimento o domínio é `lvh.me` ou `*.localhost`, sem TLS e na porta do `next dev`. O briefing dizia "para um host local"; como o domínio precisa estar `ACTIVE` no banco de qualquer jeito, a regra ficou "fora de produção", que não depende de uma lista de nomes locais.
16. **A origem tem que ser uma origem**: sem caminho, sem credenciais, `http` ou `https`. Um pedido sem `Origin` não recebe o header. Nunca `*`.
17. **A opção vai ao Socket.IO por um adaptador** (`RealtimeIoAdapter`, em `app.setup.ts`), porque o `cors` do decorator do gateway é avaliado antes de qualquer injeção e não consegue ler o banco. `docs/repo/realtime.md` já previa um adaptador próprio nesse ponto.
18. **Nada muda no web.** O socket continua abrindo em `NEXT_PUBLIC_REALTIME_URL`, com o tíquete pedido a `/<slug>/api/realtime/ticket`, que no domínio da loja já recebe a sessão (cookies em `Path=/`). O CORS do REST (`@fastify/cors` em `app.setup.ts`) não mudou: o navegador nunca chama o REST.

## Fora do escopo

- O Traefik e o socket na mesma origem da loja (Y3), prova de posse por `TXT`, canonical, sitemap e e-mails (Y7).
- Levar a sessão de `beelink.biz/<slug>` para o domínio fora do Google (o login por e-mail é feito no próprio domínio).

## Riscos

- **O código passa uma vez pelo endereço** (`…/google/session?code=…`), como o `code` do próprio Google. Se o Traefik registrar acessos, ele fica no log. Sozinho não abre nada: falta o segredo, e ele vale um minuto e uma vez.
- **Quem controla o DNS do domínio é o lojista.** Um lojista que aponte o domínio para um servidor dele depois de ativo recebe os códigos dos clientes da própria loja, e com um desafio feito por ele consegue trocá-los. O que ele alcança é a conta do cliente **na loja dele**, cujos dados o painel já mostra. Vale para qualquer cookie de sessão num domínio que o lojista controla; não é deste ticket.
- **Um fluxo começado no domínio no minuto em que o proxy ainda não o conhece** termina no host em que começou, com os cookies em `/<slug>`: coerente com a página que o serviu.

## Notas da entrega (acréscimo, 09/10)

**Onde ficou cada coisa.**

- `packages/contracts/src/customer.ts`: `CustomerSignInOptions.platformOrigin`; `GoogleAuthorizePayload.handoffChallenge`; `GoogleHandoff` (`{ host, code }`); `GoogleSignIn` com `session: AuthSession | null` e `handoff: GoogleHandoff | null`; `GoogleHandoffPayload` (`{ code, verifier }`); `GoogleHandoffSession` (`{ session, returnTo }`).
- API: `oauth_states.handoffChallenge` e a tabela `google_handoffs` (migration `20261009235812_google_handoff`, só acrescenta); `CustomerGoogleService.authorize(storeSlug, returnTo?, handoffChallenge?)`, `callback()` e `redeemHandoff(storeSlug, code, verifier, userAgent?)`; `HANDOFF_TTL_MS` (60 s); a rota `POST /api/stores/:slug/customer/google/handoff`; `RealtimeOrigins` e `RealtimeIoAdapter` em `modules/realtime/`.
- Web: `app/[slug]/api/customer/google/route.ts` (o começo no domínio) e `…/google/session/route.ts` (a troca); `lib/shop-origin.ts` (`hostAskedOf`, `shopOriginOf`); em `lib/customer-session-cookies.ts`, `GOOGLE_HANDOFF_KEY` (`desafio`), `GOOGLE_HANDOFF_VALUE`, `setGoogleHandoffCookie`, `googleHandoffFlightOf`, `clearGoogleHandoffCookie`.

**Correções ao que está acima.**

- **Um commit ficou vermelho no meio da pilha.** `c3da7dc8` (o web) quebrou `apps/web/src/lib/storefront-data.test.ts`, que esperava `{ google: false }` de `signInOptionsAt()`; só os testes dos arquivos tocados tinham sido rodados antes do commit. O `ci-check` pegou, e `c69463fd` conserta. Do `c69463fd` em diante a árvore é verde.
- **O spec `shop-domain.spec.ts` mudou** (`3b507644`). Ele conferia que nenhum `<a>` da página leva o slug, e o comentário dizia que `/<slug>/api/…` "é a ação de um formulário, nunca um link". O botão do Google no domínio da loja é um link para o handler da própria loja, que leva o slug em todo host (decisão 5 do épico). A regra passou a valer para endereços de página: `/<slug>/api/…` fica de fora. O spec só encontra o botão onde a API tem o Google configurado, que é o caso deste worktree e não o do CI.
- **Decisão 8, visto no navegador:** na recusa, o `voltar` chega ao domínio escrito do jeito da plataforma (`/entrar?voltar=%2F<slug>%2Fcarrinho&erro=…`), porque é o endereço que o 308 do proxy carrega. `safeBackOf` o lê como `/carrinho`, como já lê o dos e-mails.

**O que rodou.**

- **Suíte e2e da API, inteira**, com `TEST_DATABASE_URL`, `TEST_SMTP_URL` e `MAILPIT_URL` deste worktree: `Test Files 2 failed | 85 passed (87)`, `Tests 6 failed | 1104 passed (1110)`. As seis falhas são as conhecidas do `.env` do worktree: `meta-pixel-without-vault-key` (uma) e `custom-domain.e2e-spec.ts` (cinco, por `SHOP_DOMAIN_PROBE=false`). Do ticket: `customer-google.e2e-spec.ts` passa com 22 testes (os 13 de antes e 9 novos) e `realtime.e2e-spec.ts` com 10 (um novo).
  - **A primeira rodada deu 31 falhas, e não eram do código.** Outra sessão, no worktree `product-cashback`, rodava a suíte dela ao mesmo tempo contra o mesmo Mailpit (1027/8027), e o `clearInbox()` de cada teste dela apagava os e-mails dos meus: 16 das falhas eram "No e-mail reached … within 10000ms". A segunda rodada, com a outra terminada, é a de cima.
- **`pnpm --filter api build` e `pnpm --filter web build`:** saída 0. As rotas novas aparecem como `ƒ`; as únicas estáticas seguem sendo `/icon.png` e `/apple-icon.png`.
- **Playwright**, contra os dois builds, com `--grep-invert @screenshot`: `12 passed (1.1m)`, depois do ajuste do spec descrito acima (na primeira rodada, 11 passaram e o `shop-domain` falhou naquela asserção).
- **`pnpm ci-check`** no último commit de código: verde (api 120 arquivos de teste, web 301, ui 361).

**No navegador** (Chromium do Playwright dirigido por script, `next dev --port 3800`, a loja `loja-dominio-1791487727` com `lvh.me` `ACTIVE` escrito no banco).

*Com um Google de mentira no lugar do de verdade.* A API de desenvolvimento foi subida por um script temporário, nunca commitado, que troca o `GoogleOAuthClient` por um que "consente" na hora (devolve o endereço do retorno com um `code`) e informa uma conta fixa. Todo o resto era o código de verdade: os handlers do web, o proxy, a API, o banco.

- **Entrar.** Em `http://lvh.me:3800/entrar?voltar=/carrinho` o botão aparece, com `href="/<slug>/api/customer/google?voltar=%2Fcarrinho&retorno=%2Fentrar"`. O clique fez: 303 no domínio → 303 em `localhost:3800/api/storefront/<slug>/customer/google?…&desafio=<43>` → 303 em `localhost:3800/api/customer/google/callback?code=…&state=…` → 303 em `lvh.me:3800/<slug>/api/customer/google/session?code=<43>` → 200 em `http://lvh.me:3800/carrinho`. O cabeçalho passou a dizer "Olá, Bia" e `/conta` abriu. Cookies ao fim: `bl_shopper_access` e `bl_shopper_refresh` em `lvh.me`, `Path=/`, `HttpOnly`, `SameSite=Lax`; nenhum `bl_oauth_google` sobrando em nenhum dos dois hosts; nenhum cookie de sessão em `localhost`.
- **O endereço com o código não fica no histórico:** "voltar" duas vezes a partir de `/conta` passou por `/carrinho` e por `/entrar?voltar=%2Fcarrinho`.
- **Cancelar no Google** terminou em `http://lvh.me:3800/entrar?modo=criar&voltar=…&erro=GOOGLE_CANCELLED`, com "Você cancelou a entrada com Google." na tela, pelo 308 do proxy. **Um e-mail que o Google não confirma** terminou em `…&erro=GOOGLE_EMAIL_UNVERIFIED`, com a frase de hoje. Nenhum cookie de sessão nos dois casos.
- **O link com o código aberto por outro navegador** (sem o cookie do segredo): 303 para a home da loja, sem sessão, e o código deixou de existir na tabela. O navegador certo, tentando depois o mesmo link: `erro=GOOGLE_STATE_INVALID`. **O mesmo código trocado duas vezes:** a primeira entra, a segunda recebe `GOOGLE_STATE_INVALID`.
- **Na tabela**, durante o fluxo: uma linha, `codeHash` de 64 caracteres, vencimento a menos de 60 s.
- **No log da API**, as linhas de `POST …/google/handoff` trazem o endereço e os headers, sem o corpo: nem o código nem o segredo aparecem. **No log do `next dev`**, a linha do pedido traz o endereço com o `code` (o servidor de desenvolvimento registra todo pedido; o compilado não registra nenhum).
- **Cinco trocas num minuto do mesmo IP** bateram no limite da rota (`AUTH_RATE_LIMIT_MAX=5`), e a sexta terminou em `/entrar?…&erro=RATE_LIMITED`. Foram os meus testes em sequência, não um defeito; fica dito porque o fluxo pelo domínio gasta três chamadas limitadas (começo, retorno, troca) onde o da plataforma gasta duas.
- **Host da plataforma, loja sem domínio** (`site-dominio-285`): o botão segue apontando para `/api/storefront/<slug>/customer/google`, o fluxo tem os dois saltos de sempre, e os cookies da sessão ficam em `localhost`, `Path=/<slug>`. Nenhum código de repasse foi criado.
- **Chat.** Com o cliente `cliente-1791543071550@teste.dev` logado em `http://lvh.me:3800/conta/conversas?pedido=1`: o handshake de long-polling em `http://localhost:3801/api/socket.io/` respondeu 200 com `Access-Control-Allow-Origin: http://lvh.me:3800`, e o transporte subiu para WebSocket. Uma mensagem enviada pelo painel (`localhost:3800/admin/<slug>/orders/1`, campo "Escreva sua resposta", "Enviar") chegou ao socket do cliente (`conversation.message`, `author: SHOP`) e apareceu na tela sem recarregar. **Nenhum erro no console** em toda a sessão (o BEELINK-283 tinha contado 32 de CORS no mesmo passeio).

*Com o cliente do Google de verdade.* O `apps/api/.env` do worktree tem os três valores (`GOOGLE_CLIENT_ID` de um cliente real, o segredo e o retorno). O fluxo andou até o Google: o domínio mandou ao host da plataforma, que mandou a `accounts.google.com/o/oauth2/v2/auth` com o `client_id` do `.env`. **O Google respondeu `Error 400: redirect_uri_mismatch`**: o `GOOGLE_REDIRECT_URI` do `.env` é `http://localhost:3800/api/auth/google/callback`, que não está registrado no cliente e nem é o caminho que o web serve (`/api/customer/google/callback`).

**O que não foi visto.**

- **Nenhum login com o Google de verdade**, nem no domínio da loja nem no host da plataforma. Daqui não dá: o retorno registrado é o de produção. O que o Google de verdade faz (a tela de consentimento, o `code`, a troca do `code` pelo `id_token`) não mudou neste ticket e é o mesmo caminho que já funciona em `beelink.biz/<slug>`; o que mudou vem depois dele, e foi exercitado com o Google de mentira.
- **Nada em produção:** o Traefik, o `X-Forwarded-Host` num retorno do Google, o 308 de `beelink.biz/<slug>/entrar?erro=…` para o domínio, e a regra de produção das origens do socket (`https` e porta padrão), que só os testes de unidade cobrem.
- **Se o Traefik de produção registra acessos**, e portanto se o endereço com o código vai para algum log lá.
- **Safari e Firefox.** O cookie do segredo é `SameSite=Lax` e volta numa navegação de topo que passa por redirecionamentos de outro site; foi visto no Chromium. É o mesmo comportamento de que o cookie do estado já depende hoje no host da plataforma.
- **O Playwright não cobre o Google nem o chat no domínio.** Ele roda a API compilada de verdade, sem como pôr um Google de mentira, e a origem do socket é fixada no build do web. A cobertura automática é a da suíte e2e da API e dos testes de unidade dos handlers.

**O que ficou no ambiente.** No banco de dev, o domínio da loja `loja-dominio-1791487727` voltou a ficar vazio, como estava. Ficaram duas contas de cliente criadas pelo Google de mentira (`bia.google@gmail.com`, uma em cada loja de teste) e uma mensagem do painel no pedido nº 1. Nenhum processo deste worktree ficou no ar.

**Para o Y3 (roteamento por domínio).** Com o socket roteado no próprio domínio da loja a origem volta a ser a mesma, mas `NEXT_PUBLIC_REALTIME_URL` é fixado no build e continua apontando para a plataforma: enquanto o cliente não abrir o socket na própria origem, é `RealtimeOrigins` que mantém o chat funcionando ali. **Para o Y7:** o `returnTo` do Google continua escrito do jeito da plataforma (`/<slug>/…`), como o dos e-mails.
