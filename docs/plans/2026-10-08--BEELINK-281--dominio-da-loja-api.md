# BEELINK-281 (Y2) — API e contratos: a loja guarda o domínio próprio

> Épico Y (BEELINK-279). O desenho é o do [BEELINK-280](2026-10-08--BEELINK-280--dominio-proprio.md); este plano detalha o Y2 e não muda nenhuma decisão de lá. A pilha fica `main` → Y1 → **Y2** → Y4 (web) → Y6 (painel) → Y5 → Y3 → Y7. Escrito em 08/10/2026. Só recebe acréscimos.

## O problema

O lojista não tem onde dizer qual é o domínio dele, a API não sabe conferir se esse domínio já aponta para o servidor, e o web não tem de onde ler quais hosts são de quais lojas. Antes de o web resolver a loja pelo host (Y4) e de o painel ganhar a tela (Y6), a API precisa guardar o domínio, conferi-lo e entregá-lo.

## Definição de Pronto

1. **O dado.** A loja guarda o host do domínio (único entre as lojas, anulável), o estado (`PENDING` ou `ACTIVE`), quando foi conferido pela última vez e o código do problema da última conferência (anulável). Uma loja tem no máximo um domínio. A migration só acrescenta.
2. **Normalização**, numa função pura com teste: `https://www.MinhaLoja.com.br/`, com espaços, com caminho ou com porta, vira `minhaloja.com.br`.
3. **Validação**, na mesma função, cada recusa com código próprio e mensagem clara: o que não é um nome de host com pelo menos dois rótulos; IP; `localhost`; o host da plataforma (o de `WEB_URL`) e qualquer subdomínio dele; nome internacionalizado fora da forma ASCII. Domínio já usado por outra loja responde 409.
4. **Conferência de DNS**, atrás de uma interface injetável: os registros `A` do host têm que ser exatamente os IPs de `SHOP_DOMAIN_TARGET_IPS`. O nome que não resolve e o nome que resolve para outro lugar são problemas distintos, e o segundo devolve para onde. `www.<host>` é conferido à parte e só gera aviso.
5. **Resposta por HTTPS**, atrás de outra interface injetável, só depois do DNS certo: distingue não conectou, certificado inválido e respondeu, com tempo limite curto. `SHOP_DOMAIN_PROBE=false` desliga a etapa, e aí o DNS certo basta.
6. **Estado.** DNS certo e resposta certa: `ACTIVE`. Qualquer outra coisa: `PENDING` com o código do problema. Um domínio `ACTIVE` cuja conferência falha continua `ACTIVE` e a resposta traz o problema.
7. **Rotas do lojista**, com a guarda de dono das outras rotas de `/stores/:slug/…`: ler o domínio e os IPs a configurar (nulo sem a variável); salvar (normaliza, valida, grava `PENDING`, confere na hora, devolve o resultado); conferir de novo; remover. Sem `SHOP_DOMAIN_TARGET_IPS`, salvar e conferir são recusados com um código de "não disponível nesta instalação".
8. **A tabela para o web:** uma rota de leitura, sem sessão, com todos os domínios guardados (host, slug, estado), numa consulta de três colunas.
9. **Dados públicos da loja:** `PublicStore` traz o host e o estado do domínio, ou nulo.
10. **Formatos** em `packages/contracts`, num arquivo próprio, exportado como os vizinhos; a API os implementa com `satisfies`/`implements`.
11. **Documentos:** as rotas e as duas variáveis em `apps/api/docs/README.md`; as variáveis em `apps/api/.env.example`, no schema zod, em `.env.dokploy.example` e em `docker-compose.dokploy.yml` (serviço `api`); a seção "Shop domains" em `docs/repo/deploy.md`.
12. **Testes:** unidade para a normalização, a validação e cada desfecho da conferência, com o resolvedor e o cliente HTTP trocados por dublês; e2e para as rotas (dono e não dono, domínio repetido, sem a variável, salvar → conferir → remover), para a tabela e para o campo nos dados públicos. Nenhum teste resolve DNS de verdade nem chama a internet.
13. `apps/web` e `packages/ui` não são tocados e continuam compilando; `pnpm ci-check` verde.

## Decisões

As do épico estão no plano do BEELINK-280. As abaixo são deste ticket, tomadas pelo desenvolvedor a partir do briefing do orquestrador; o Rafael pode mudar qualquer uma.

### Nomes e dado

1. **O nome é "custom domain" em todo lugar**, e não "store domain": o épico ainda vai trazer o subdomínio `<slug>.beelink.biz` (Y8), que também é um "domínio da loja". Colunas `customDomain*`, tipos `CustomDomain*`, rotas `/custom-domain`, módulo `modules/custom-domain`.
2. **Quatro colunas na própria `stores`**, como o briefing pede ("na loja", "siga o estilo das colunas vizinhas"): `customDomain` (`VARCHAR(253)`, único), `customDomainStatus` (enum `CustomDomainStatus`, anulável), `customDomainCheckedAt` e `customDomainProblem` (`VARCHAR(40)`). Uma tabela à parte obrigaria toda leitura pública da loja a mais uma junção; na linha, o campo público sai de graça e a tabela para o web é uma consulta só.
3. **O estado é nulo quando não há domínio**, e duas `CHECK` prendem isso no banco: host e estado são nulos juntos ou preenchidos juntos, e o host guardado está na forma normalizada (minúsculas, rótulos de `a-z0-9-`, pelo menos dois, sem `www.` na frente). É o que faz o índice único dizer a verdade, como no `slug`.
4. **O problema é texto, não enum do banco.** Um problema novo vira uma linha de código, não uma migration. A união `CustomDomainProblem` em `packages/contracts` é a lista.

### Normalização e validação

5. **Uma função pura**, `customDomainHostOf(input, platformHost)`, devolve o host ou o motivo da recusa. Na ordem: tira espaços das pontas, põe em minúsculas, tira o esquema (`algo://`), corta em `/`, `?` ou `#`, tira a porta, tira um ponto final, tira **um** `www.` da frente, e só então valida.
6. **Um código por motivo**, porque o texto que o lojista lê é do painel (Y6), escolhido pelo `errorCode`: `CUSTOM_DOMAIN_INVALID` (não é um nome de host com dois rótulos: vazio, com `_`, com espaço, com `@`, rótulo de mais de 63 caracteres, mais de 253 no total), `CUSTOM_DOMAIN_IP_ADDRESS`, `CUSTOM_DOMAIN_LOCAL`, `CUSTOM_DOMAIN_NOT_ASCII`, `CUSTOM_DOMAIN_PLATFORM` e `CUSTOM_DOMAIN_TAKEN` (409).
7. **IP é todo host cujo último rótulo é numérico**, além do IPv4 e do IPv6 escritos por extenso: nenhum domínio de topo é um número, e é assim que o navegador lê `1.2.3` ou `0x7f.1`.
8. **Local é `localhost` e o que termina em `.localhost`, `.local` ou `.internal`**: nomes que só existem dentro de uma rede. O briefing pede `localhost`; os outros três entram pela mesma razão.
9. **Nome internacionalizado só em punycode.** `xn--lojao-fta.com.br` é aceito; `lojão.com.br` é recusado com a mensagem dizendo para usar a forma `xn--`. A API não converte: converter exigiria as tabelas IDNA, e o registrador já mostra a forma ASCII.
10. **A plataforma é o host de `WEB_URL` e qualquer subdomínio dele.** Isso também reserva `<slug>.<plataforma>` para o subdomínio do Y8.

### Conferência

11. **Duas portas, uma por coisa que toca a rede:** `CustomDomainResolver` (os registros `A` de um nome) e `CustomDomainProbe` (a resposta por HTTPS). O módulo liga a primeira ao `node:dns` e a segunda ao `node:https`; os testes põem dublês no lugar.
12. **"Exatamente os IPs do servidor" é igualdade de conjuntos.** Um `A` certo ao lado de um `A` de estacionamento do registrador responde `DNS_POINTS_ELSEWHERE`, com a lista do que foi achado.
13. **Um terceiro problema de DNS, `DNS_LOOKUP_FAILED`**, para quando o próprio DNS não respondeu (tempo esgotado, `SERVFAIL`). Dizer "o nome não resolve" nesse caso mandaria o lojista mexer num registro que está certo.
14. **Só os registros `A` são conferidos.** `SHOP_DOMAIN_TARGET_IPS` aceita só IPv4. Um `AAAA` apontando para outro lugar não é visto aqui (ver Riscos).
15. **A sonda HTTPS liga direto no IP que acabou de ser conferido**, com o nome do domínio no SNI, no `Host` e na checagem do certificado, e não segue redirecionamento. Sem isso, entre uma etapa e a outra o nome poderia resolver para outro endereço (ou ter um `AAAA` interno), e a API chamaria um endereço que não é o servidor. É o que o briefing quer proteger com "só depois do DNS certo".
16. **Respondeu é qualquer resposta HTTP sobre um certificado válido**, seja qual for o status. Com o DNS certo, quem atende a 443 com um certificado válido para aquele nome é o Traefik com um roteador para ele. Certificado inválido cobre o padrão do Traefik (sem roteador, ou certificado ainda não emitido), vencido e nome que não confere. Todo o resto (recusou, tempo esgotado, não fala TLS) é "não conectou".
17. **O caminho pedido é `/favicon.ico`**, uma constante: é o que o web já serve sem sessão e sem loja (`apps/web/src/app/favicon.ico`). Nenhuma rota de `/api/…` do web responde a um anônimo sem depender de loja. Como o status não importa (decisão 16), o Y4 só precisa não fazer esse caminho responder erro de conexão; se quiser uma prova mais forte de que quem respondeu foi o bee-link, cria uma rota própria e troca a constante.
18. **Tempos:** 3 s por consulta de DNS e 5 s para a sonda. O pior caso de um salvar fica perto de 8 s.

### Estado e rotas

19. **`ACTIVE` não volta para `PENDING` numa conferência pedida pelo lojista.** A conferência grava quando foi feita e o problema achado, e mantém o estado: derrubar a loja por uma falha passageira de DNS é pior do que mostrar um aviso. Por isso `ACTIVE` com `problem` preenchido é uma combinação válida, e quer dizer "ativo, e a última conferência achou isto".
20. **Salvar de novo o mesmo host é conferir de novo**: não rebaixa um domínio `ACTIVE` para `PENDING`. Só um host diferente grava `PENDING` e zera a conferência.
21. **O resultado da conferência só é gravado se o host ainda for o conferido** (`updateMany` com o host no `where`): um salvar concorrente não recebe o veredito de outro domínio.
22. **Rotas:** `GET`, `PUT` e `DELETE` em `/stores/:slug/custom-domain`, e `POST /stores/:slug/custom-domain/check`. As três primeiras respostas têm uma forma só, `CustomDomainOverview` (`targetIps`, `domain`, `check`), com `check` nulo numa leitura. `DELETE` responde 204 e não é erro remover o que não existe.
23. **Sem `SHOP_DOMAIN_TARGET_IPS`:** ler responde `targetIps: null`, remover funciona, e salvar e conferir respondem `503 CUSTOM_DOMAIN_UNAVAILABLE`, o status das integrações sem configuração. Conferir sem domínio salvo responde `409 CUSTOM_DOMAIN_NOT_SET`.
24. **Salvar e conferir têm o limite por IP das escritas da loja** (`STORE_WRITE_RATE_LIMIT_*`): cada um espera uma consulta de DNS e uma chamada HTTPS, como o salvar da loja espera o geocodificador.
25. **A tabela é `GET /api/custom-domains`**, ao lado de `stores` e não debaixo, como `store-categories`: `/stores/<algo>` é de um slug. Pública e sem limite de taxa: a API não tem rota de fora em produção (só o socket), e quem chama é o web, uma vez por minuto. Traz os pendentes também; quem decide o que fazer com cada estado é o web.
26. **`PublicStore.customDomain` é opcional no tipo** (`{ host, status } | null`, e a API sempre manda). Duas razões: este ticket não toca `apps/web`, e um campo obrigatório quebraria o fixture tipado de `store-payloads.test.ts`; e a resposta guardada no cache do web antes do deploy não tem o campo, então quem lê precisa mesmo tratar a ausência. O Y4 pode torná-lo obrigatório no PR em que toca o web.
27. **O dono lê o domínio na rota própria.** `Store` (o que o painel edita) herda o campo público e nada mais; quando foi conferido e o problema ficam em `CustomDomainOverview`.

## Fora do escopo

- Qualquer coisa em `apps/web`: os handlers do BFF, o `proxy.ts`, a tela (Y4, Y6).
- O Traefik: roteador e certificado por domínio continuam feitos à mão na aba Domains do Dokploy até o BEELINK-282 (Y3).
- Login com Google e o CORS do socket no domínio da loja (Y5); e-mails e canonical (Y7).
- Uma rotina que confere os domínios sozinha. Aqui a conferência acontece ao salvar e quando o lojista pede.
- Prova de posse do domínio por registro `TXT` (ver Riscos).
- `docs/product/`: o que o lojista ganha passa a ser verdade quando a loja abrir no domínio (Y4).

## Riscos

- **Quem salva primeiro fica com o domínio.** Apontar um `A` para um IP compartilhado não prova de qual loja o domínio é: uma loja que salve o domínio de outra antes dela fica `PENDING`, bloqueia a dona (409) e vira `ACTIVE` no dia em que a dona apontar o DNS. Enquanto o roteamento é feito à mão pelo Rafael (até o Y3), ele vê cada domínio antes de entrar. Com o autosserviço do Y3, isso pede uma prova de posse (um `TXT` com um código da loja) antes de ativar.
- **`AAAA` não é conferido.** Um domínio com `AAAA` para outro lugar passa no DNS daqui, e o Let's Encrypt, que prefere IPv6, pode não emitir o certificado: o lojista fica em `HTTPS_CERTIFICATE_INVALID` sem a causa à vista.
- **A sonda supõe que o container da API alcança o IP público do próprio servidor** na 443. Onde não alcança, toda conferência termina em `HTTPS_UNREACHABLE`; é para isso que `SHOP_DOMAIN_PROBE=false` existe. Nada disto foi testado no servidor de produção.
- **O DNS que a API consulta é o do container**, com o cache dele: uma mudança recém-feita pode levar o tempo do TTL para aparecer.
- **`ACTIVE` é o que faz o web redirecionar a loja inteira para o domínio** (decisão 3 do épico). A sonda prova DNS e certificado; não prova que quem respondeu foi o web do bee-link (decisão 17).
