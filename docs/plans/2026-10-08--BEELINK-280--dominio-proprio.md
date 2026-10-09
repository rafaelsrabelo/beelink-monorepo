# BEELINK-280 (Y1) — Domínio próprio da loja: o desenho

> Plano do Épico Y (BEELINK-279). Escrito em 08/10/2026. Só recebe acréscimos.

## O pedido

Em 08/10/2026 o Rafael pediu o domínio próprio "agora": o cliente da loja `mutante-suplementos` já tem `mutantesuplementos.com.br` na GoDaddy e quer que **a página da loja seja o domínio**: `https://beelink.biz/mutante-suplementos` passa a ser `https://mutantesuplementos.com.br`, sem o slug no caminho e sem redirecionar para `beelink.biz`. A página inicial do painel vai ganhar um item "aponte para seu domínio".

O encaminhamento da GoDaddy foi tentado e descartado no mesmo dia: ele troca o endereço na barra para `beelink.biz`, e a versão "com mascaramento" abre a loja numa moldura, onde os cookies `SameSite=Lax` da sessão do cliente não viajam.

## O que foi conferido em 08/10

- **DNS de `beelink.biz`:** na Cloudflare, sem proxy (`A` → `161.97.70.106`), sem registro curinga.
- **DNS do cliente:** na GoDaddy (`ns67/ns68.domaincontrol.com`), sem MX. A GoDaddy não aceita `CNAME` na raiz do domínio; `www` é um `CNAME` para `@`.
- **Servidor:** pelo host do cliente, o Traefik responde 404 em http e o certificado padrão em https. Nada conhece esse host.
- **Dokploy:** a aba Domains do compose de produção **já lista `beelink.biz`** (serviço `web`, porta 3000, HTTPS, Let's Encrypt), ao lado dos labels do `docker-compose.dokploy.yml`. O `docs/repo/deploy.md` diz para não fazer isso; produção responde 200 mesmo assim. Fica para o Y3 entender qual dos dois roteadores atende e alinhar o documento.
- **Web:** os endereços da vitrine saem todos de `storefrontRoutes()` (`apps/web/src/lib/storefront-routes.ts`), com `home = /<slug>`. As chamadas às rotas da loja usam `/<slug>/api/…` (14 lugares). Os cookies da sessão do cliente têm `path: /<slug>` (`customer-session-cookies.ts`). A checagem de origem (`publicOriginOf`) e a imagem de compartilhamento (`siteOrigin`) já leem o host do pedido.
- **Login com Google:** o retorno é fixo em `https://<WEB_DOMAIN>/api/customer/google/callback`, e o cookie do estado fica no host em que o fluxo começou.
- **Tempo real:** o navegador abre o socket em `NEXT_PUBLIC_REALTIME_URL` (o `WEB_DOMAIN`, decidido no build), e o CORS da API aceita só essa origem.
- **O web não sabe o próprio endereço em produção:** o container recebe `API_URL`, `EXAMPLE_STORE_SLUG` e `APP_ENVIRONMENT`.

Nada foi testado no servidor de produção.

## Decisões

Do orquestrador (Claude), com o que o Rafael disse em 08/10. O Rafael pode mudar qualquer uma.

1. **Só o domínio próprio agora.** O subdomínio `<slug>.beelink.biz` (certificado curinga, migração das lojas atuais — metade do Y3 e o Y8) fica para depois. Nada aqui o impede.
2. **Um domínio pertence a uma loja só**, e uma loja tem no máximo um. Guardado em minúsculas, sem `www.` e sem esquema. `www.<domínio>` também abre a loja e redireciona (308) para o domínio sem `www`.
3. **A loja com domínio ativo tem um endereço só.** `beelink.biz/<slug>/…` redireciona (308) para `https://<domínio>/…`, com caminho e query. É o que mantém vivos os links já compartilhados e os links dos e-mails, que a API escreve com `WEB_URL`. As rotas `/<slug>/api/…` nunca redirecionam.
4. **A web resolve a loja pelo host, no `proxy.ts`.** O web guarda por um minuto uma cópia da tabela (host, slug) dos domínios ativos, lida da API pela rede interna; se a API não responde, vale a última cópia. Host que é de uma loja: o pedido de página é reescrito para `/<slug>/…`. Host que não é de loja nenhuma: tudo como hoje.
5. **No domínio da loja, as páginas não levam o slug e as rotas de API levam.** `storefrontRoutes()` monta os endereços sem prefixo quando o pedido chegou pelo domínio da loja; as chamadas continuam em `/<slug>/api/…`, porque `/api/customer/…` e `/api/storefront/…` já são rotas da plataforma e colidiriam. Uma página pedida com o slug no domínio da loja (`/mutante-suplementos/produtos`) redireciona para a versão sem slug.
6. **O prefixo vem do pedido, não só do cadastro.** A vitrine monta endereços sem prefixo quando o host do pedido é o domínio da loja, e com `/<slug>` em qualquer outro host. Assim a página é coerente consigo mesma no minuto em que as cópias em cache discordam.
7. **No domínio da loja, os cookies do cliente têm `path: /`.** O host já é de uma loja só. No `beelink.biz` continuam em `/<slug>`.
8. **O `proxy.ts` passa a rodar em todo pedido de página**, porque o `matcher` é estático e não sabe o host. O comportamento no host da plataforma tem que ficar idêntico ao de hoje — as condições do `matcher` atual viram código, com teste para cada uma. O web recebe `WEB_DOMAIN` no ambiente: pedido nesse host não consulta tabela nenhuma.
9. **Certificado e roteamento: o Traefik que já está no servidor, com Let's Encrypt por HTTP.** O domínio do primeiro cliente entra pela aba Domains do Dokploy (duas entradas, com e sem `www`) e um redeploy. O autosserviço — o Traefik lendo da API os hosts verificados, um roteador por domínio — é o Y3. Cloudflare for SaaS foi descartado por ora: não atende domínio sem `www` fora do plano Enterprise, e é o que este cliente quer.
10. **O lojista aponta o DNS no provedor dele:** `A` em `@` para o IP do servidor, e `www` como `CNAME` para `@`. O painel mostra os registros e confere se o domínio já resolve para cá.
11. **Login com Google no domínio da loja passa pelo host da plataforma** e volta com um código de uso único (Y5). Até o Y5, o botão do Google não aparece no domínio da loja; o login por e-mail funciona.
12. **O chat do pedido no domínio da loja** precisa que a API aceite a origem dos domínios ativos (Y5).
13. **O painel continua em `beelink.biz/admin/<slug>`.** Os webhooks e retornos de Asaas e Melhor Envio não mudam.

## Recorte e ordem

`main` → Y1 → Y2 → Y4 → Y6 → Y5 → Y3 → Y7, um PR por ticket, cada um sobre o anterior.

| Ticket | O que entrega |
|---|---|
| Y1 · 280 | este plano |
| Y2 · 281 | API e contratos: o domínio da loja, as rotas do lojista (salvar, remover, conferir o DNS), a tabela (host, slug) para o web, e o domínio nos dados públicos da loja |
| Y4 · 283 | Web: decisões 3 a 8 — a loja abre no domínio, navega, entra por e-mail e compra |
| Y6 · 285 | Painel: o item na página inicial e a tela "Domínio próprio" |
| Y5 · 284 | Login com Google e chat do pedido no domínio da loja |
| Y3 · 282 | Infra: roteador e certificado por domínio sem redeploy; `docs/repo/deploy.md` |
| Y7 · 286 | Canonical, sitemap e e-mails escritos com o domínio da loja |
| Y8 · 287 | adiado, junto com o subdomínio |

Com Y2 e Y4 em `main` e no ar, o domínio do primeiro cliente abre a loja.

## O que o Rafael faz à mão para o primeiro domínio

1. No Dokploy, em Domains do compose de produção: `mutantesuplementos.com.br` e `www.mutantesuplementos.com.br`, serviço `web`, porta 3000, HTTPS, Let's Encrypt.
2. Com Y2 e Y4 em `main`: na GoDaddy, um único `A` em `@` para `161.97.70.106`; esperar a propagação; redeploy.
3. Ligar o domínio à loja (pela tela do Y6, ou pela rota do Y2 enquanto a tela não existe).

## Riscos

- **O modo design** mostra a vitrine dentro do painel. Se ele carrega `/<slug>` numa moldura, o redirecionamento da decisão 3 a quebraria: o Y4 confere e, se for o caso, a prévia não redireciona.
- **Trocar o `matcher`** do `proxy.ts` é a mudança que o comentário do arquivo avisa que quebra a vitrine em silêncio. Os testes do proxy precisam cobrir o visitante anônimo e o robô no host da plataforma.
- **Um cookie antigo com `path: /<slug>`** no domínio da loja pode conviver com o novo de `path: /`. Ao gravar ou limpar a sessão no domínio da loja, os dois caminhos são limpos.
- **Let's Encrypt** valida por HTTP: o certificado só sai com o DNS já apontando para o servidor. Um redeploy antes da propagação falha a emissão e ela só é tentada de novo quando a configuração do Traefik muda.
- **O IP do servidor fica no DNS do cliente.** Trocar de servidor passa a exigir que cada lojista atualize o registro `A`.
