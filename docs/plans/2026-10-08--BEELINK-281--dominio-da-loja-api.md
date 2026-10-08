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

## Notas da entrega (acréscimo, 08/10)

**Correções ao que está acima.**

- **Decisão 5:** são tirados **todos** os `www.` da frente, não um só. `www.www.loja.com.br` vira `loja.com.br`. Com um só, o host guardado poderia começar com `www.`, que é a forma de que o web redireciona, e a `CHECK` da coluna (que recusa `www.` na frente) responderia 500.
- **Decisão 3:** a `CHECK` de estado prende mais uma coisa: sem domínio, `customDomainCheckedAt` e `customDomainProblem` também são nulos.
- **Decisão 11:** o verificador (`CustomDomainChecker`) recebe os IPs e o liga/desliga da sonda como argumento, em vez de ler a configuração. Quem lê é o serviço, de `CustomDomainSettings`.

**Onde ficou cada coisa.**

- Contratos: `packages/contracts/src/custom-domain.ts` (`CustomDomainStatus`, `CustomDomainDnsProblem`, `CustomDomainHttpsProblem`, `CustomDomainProblem`, `PublicCustomDomain`, `CustomDomain`, `CustomDomainWwwCheck`, `CustomDomainCheck`, `CustomDomainOverview`, `SaveCustomDomainPayload`, `CustomDomainEntry`, `CustomDomainErrorCode`); `PublicStore.customDomain` em `store.ts`.
- Migration `20261008120000_store_custom_domain`: o enum `CustomDomainStatus`, as quatro colunas anuláveis em `stores`, o índice único `stores_customDomain_key` e as `CHECK` `stores_custom_domain_check` e `stores_custom_domain_status_check`. Foi escrita à mão a partir do `prisma migrate diff`, porque o `migrate dev --create-only` pede confirmação num terminal por causa do índice único; o `prisma migrate dev` seguinte a aplicou e não achou diferença com o schema.
- API: `apps/api/src/modules/custom-domain/`. `custom-domain-host.ts` (normaliza e valida), `custom-domain.ports.ts` (as duas portas), `custom-domain-dns.resolver.ts` e `custom-domain-https.probe.ts` (o que toca a rede), `custom-domain-checker.ts` (a conferência e o que ela grava), `custom-domain.settings.ts`, `custom-domain.service.ts`, `custom-domain.controller.ts` (as rotas do lojista), `custom-domains.controller.ts` (a tabela), `dto/`. O campo público sai de `modules/stores/store.mapper.ts`.
- Variáveis: `SHOP_DOMAIN_TARGET_IPS` e `SHOP_DOMAIN_PROBE` em `apps/api/src/shared/config/env.ts`.

**Para o Y4 (web) e o Y6 (painel).**

- **A tabela:** `GET {API_URL}/custom-domains`, sem sessão, responde `CustomDomainEntry[]` (`{ host, slug, status }`), ordenado por host, **com os pendentes**. O web filtra por `status === "ACTIVE"`.
- **Nos dados públicos:** `PublicStore.customDomain?: PublicCustomDomain | null`, isto é `{ host, status }`. A API sempre manda; o `?` é para a resposta guardada em cache antes do deploy. Um domínio pendente também vem.
- **Rotas do lojista**, todas com `Authorization` e a guarda de dono: `GET`, `PUT` (`{ domain }`) e `DELETE` em `/api/stores/:slug/custom-domain`, e `POST /api/stores/:slug/custom-domain/check`. `GET`, `PUT` e `POST` respondem `CustomDomainOverview`; `DELETE` responde 204.
- **Os handlers do BFF não existem** (este ticket não toca o web). Quem os criar precisa derrubar o cache `store:<slug>` (`revalidateStore`) em todo 2xx de `PUT`, `DELETE` e `POST …/check`, porque os três podem mudar `PublicStore.customDomain`, e a cópia da tabela que o web guarda.
- **A etapa de HTTPS** pede `GET https://<host>/favicon.ico` (constante `CUSTOM_DOMAIN_PROBE_PATH`), que o web já serve de `apps/web/src/app/favicon.ico`. O status não é lido: qualquer resposta HTTP sobre um certificado válido para o host conta. O Y4 não precisa criar rota nenhuma; só não pode fazer esse caminho deixar de responder no host de uma loja.
- **`ACTIVE` com `problem` preenchido é válido** e quer dizer "ativo, e a última conferência achou isto". A tela mostra o aviso sem tratar o domínio como pendente.
- **Os códigos que a tela precisa traduzir:** os de recusa (`CUSTOM_DOMAIN_INVALID`, `_IP_ADDRESS`, `_LOCAL`, `_NOT_ASCII`, `_PLATFORM`, `_TAKEN`, `_UNAVAILABLE`, `_NOT_SET`) e os de problema (`DNS_NOT_FOUND`, `DNS_POINTS_ELSEWHERE`, `DNS_LOOKUP_FAILED`, `HTTPS_UNREACHABLE`, `HTTPS_CERTIFICATE_INVALID`). Para `DNS_POINTS_ELSEWHERE`, `check.addresses` diz para onde; `check.www` é o aviso do `www`. `check` só vem na resposta de salvar e de conferir: numa leitura simples a tela tem `domain.problem` e não tem os endereços.
- **`targetIps: null`** é a instalação sem a variável: a tela diz que não está disponível, e `PUT` e `POST …/check` respondem `503 CUSTOM_DOMAIN_UNAVAILABLE`.

**Achados fora do escopo, não corrigidos.**

1. **O e2e da API manda e-mail para a porta 1025.** `apps/api/vitest.config.e2e.ts` fixa `SMTP_URL: 'smtp://localhost:1025'`, e o `env` da configuração do Vitest ganha do ambiente do shell. Nesta máquina a 1025 e a 8025 são do Mailpit de outro projeto (`tradvogados-mail-1`), e cinco specs chamam `clearInbox()`, que apaga a caixa inteira. Rodar `pnpm --filter api test:e2e` aqui escreveria e apagaria na caixa dos outros. A suíte foi rodada com uma configuração local, não commitada, que só troca o `SMTP_URL` para a 1027, e com `MAILPIT_URL=http://localhost:8027`. A correção é uma linha (`SMTP_URL: process.env.TEST_SMTP_URL ?? 'smtp://localhost:1025'`) e fica para um ticket próprio.
2. **Um apelido da plataforma pode ser tomado por uma loja.** A recusa "é o host da plataforma" só conhece o host de `WEB_URL`. Qualquer outro host que já aponte para o servidor e já tenha roteador e certificado para o web (um apelido antigo do site, por exemplo) passa na validação, passa no DNS, passa na sonda e fica `ACTIVE` na hora, para a primeira loja que o salvar. Com o Y4 no ar, o web passaria a abrir essa loja nesse host. É o risco "quem salva primeiro" com o Rafael fora do caminho: precisa de uma lista de hosts reservados ou da prova de posse por `TXT` antes de o Y4 ir para produção.
3. **`test/meta-pixel-without-vault-key.e2e-spec.ts` falha neste worktree**, como a decisão 14 do plano do BEELINK-301 já registrava: não troca o `dotenv`, então a `INTEGRATIONS_SECRET_KEY` do `apps/api/.env` volta. O arquivo não foi tocado.

**O que foi e o que não foi conferido.**

- Conferido: os testes unitários novos (144 em 5 arquivos do módulo, mais o do mapper), entre eles a sonda HTTPS contra um servidor TLS de verdade na interface de loopback, com um certificado gerado na hora pelo `openssl` (resposta com certificado da casa, certificado sem autoridade, certificado de outro nome, porta fechada, porta que não fala TLS, servidor mudo); os dois e2e novos (2 arquivos, 16 testes); a suíte e2e inteira da API contra `harness_domain_test` na 5442 e o Mailpit da 8027: 86 arquivos passaram e 1 falhou, o do achado 3; `pnpm ci-check` verde.
- Conferido à mão, com a API de pé na 3801 e uma conta criada pelo fluxo normal: o Swagger das cinco operações e do campo novo; ler, salvar, conferir, remover e as recusas por `curl`. Isso usou o DNS de verdade: `example.com` respondeu `DNS_POINTS_ELSEWHERE` com os endereços, um nome inexistente respondeu `DNS_NOT_FOUND`, e `lvh.me` (um nome público que resolve para `127.0.0.1`, o IP configurado neste worktree) passou no DNS e parou em `HTTPS_UNREACHABLE`, porque nada escuta na 443 daqui.
- **Não conferido: um domínio ficando `ACTIVE` pela rede de verdade.** Não há aqui um servidor na 443 com certificado válido. O caminho "respondeu" da sonda só foi exercitado no teste unitário, com o certificado do teste dado como autoridade.
- **Não conferido: nada no servidor de produção.** Em especial, se o container da API alcança o IP público do próprio servidor na 443, e o que o DNS de dentro do container responde.
- **Não conferido: o adaptador de DNS em teste automatizado.** Ele consulta um servidor de DNS de verdade, então nenhum teste o chama; o que tem teste é a leitura dos erros dele. Foi exercitado só à mão, como acima.
- **Não conferido: o limite de taxa** de salvar e conferir, e a `CHECK` e o índice único contra dados de produção (a migration só foi aplicada em bancos sem domínio nenhum).

**Correção às notas acima (08/10).** No achado 1, não são cinco os specs que chamam `clearInbox()`: são 50 arquivos de `apps/api/test/`. A primeira contagem foi lida de uma busca cortada. O achado fica mais grave, não diferente: quase toda a suíte apaga a caixa inteira do Mailpit para onde aponta.
