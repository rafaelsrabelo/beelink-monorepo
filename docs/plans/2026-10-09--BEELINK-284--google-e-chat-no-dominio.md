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

## Fora do escopo

- O Traefik e o socket na mesma origem da loja (Y3), prova de posse por `TXT`, canonical, sitemap e e-mails (Y7).
- Levar a sessão de `beelink.biz/<slug>` para o domínio fora do Google (o login por e-mail é feito no próprio domínio).

## Riscos

- **O código passa uma vez pelo endereço** (`…/google/session?code=…`), como o `code` do próprio Google. Se o Traefik registrar acessos, ele fica no log. Sozinho não abre nada: falta o segredo, e ele vale um minuto e uma vez.
- **Quem controla o DNS do domínio é o lojista.** Um lojista que aponte o domínio para um servidor dele depois de ativo recebe os códigos dos clientes da própria loja, e com um desafio feito por ele consegue trocá-los. O que ele alcança é a conta do cliente **na loja dele**, cujos dados o painel já mostra. Vale para qualquer cookie de sessão num domínio que o lojista controla; não é deste ticket.
- **Um fluxo começado no domínio no minuto em que o proxy ainda não o conhece** termina no host em que começou, com os cookies em `/<slug>`: coerente com a página que o serviu.
