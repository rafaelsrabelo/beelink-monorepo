# BEELINK-285 (Y6) — Painel: o item na página inicial e a tela "Domínio próprio"

> Épico Y (BEELINK-279). O desenho é o do [BEELINK-280](2026-10-08--BEELINK-280--dominio-proprio.md), decisão 10; a API que a tela consome está no [BEELINK-281](2026-10-08--BEELINK-281--dominio-da-loja-api.md), e o que a vitrine faz com o domínio no [BEELINK-283](2026-10-08--BEELINK-283--vitrine-pelo-dominio.md). A pilha fica `main` → Y1 → Y2 → Y4 → **Y6** → Y5 → Y3 → Y7. Escrito em 08/10/2026. Só recebe acréscimos.

## O problema

A API já guarda, confere e remove o domínio de uma loja, e a vitrine já abre nele. O lojista ainda não tem onde informar o domínio: hoje isso é uma chamada à API feita à mão. Falta o painel dizer qual é o endereço da loja, levar a uma tela própria, receber o domínio, mostrar o que configurar no provedor e dizer em que pé a configuração está, sem que ninguém precise falar com o suporte.

## Definição de Pronto

1. **Handlers do BFF** em `apps/web/src/app/api/stores/[slug]/custom-domain/` (`GET`, `PUT`, `DELETE`) e `…/check/` (`POST`): origem conferida, sessão do painel, repasse à API com o corpo como veio. O 204 do `DELETE` vira 200 com corpo vazio, como todo remover daqui.
2. **`revalidateStore(slug)`** em todo 2xx de `PUT`, `DELETE` e `POST …/check`, e nunca numa leitura nem numa recusa.
3. **Serviço e hooks** do TanStack Query em `apps/web/src/services/custom-domain/`: ler, salvar, conferir de novo e remover. Um erro carrega o código da API, nunca uma frase.
4. **O cartão da página inicial**, para loja e para site, no padrão dos que já estão lá: sem domínio, o endereço atual e a chamada "Aponte para o seu domínio"; com domínio pendente, o domínio e "Aguardando"; com domínio ativo, o domínio como endereço, marcado como feito. O endereço mostrado no estado ativo é o host que a API devolve.
5. **A tela em `/admin/<slug>/domain`**, rota própria: o campo do domínio; depois de salvo, o domínio, o selo do estado ("Ativo" em verde, "Aguardando" no pendente), quando foi conferido, "Verificar de novo" e remover, com confirmação.
6. **O que configurar no provedor**, numa tabela com botão de copiar em cada valor: um registro `A` em `@` para cada IP de `targetIps`, e um `CNAME` em `www` para `@`; e o texto curto (onde se faz, quanto demora, o encaminhamento, por que a raiz usa `A`).
7. **Uma frase por problema**, dizendo o que o lojista faz. Para `HTTPS_CERTIFICATE_INVALID` e `HTTPS_UNREACHABLE`: o DNS já está certo e a ativação do certificado é feita pela equipe da Beelink e pode levar algumas horas. O aviso do `www` é discreto.
8. **Depois de ativo**, a tela diz que a página já abre no domínio, que o endereço da plataforma passa a levar para ele, e que a mudança pode levar até um minuto para aparecer. Remover diz o mesmo minuto.
9. **Instalação sem a variável** (`targetIps` nulo): a tela diz que o domínio próprio não está disponível, sem campo.
10. **Carregamento em skeleton**; a leitura que falha é dita como falha, nunca como "sem domínio".
11. **Cada recusa da API vira uma frase**, escolhida pelo `errorCode` num lugar só.
12. **A porta de entrada:** o cartão da página inicial e um link dentro da tela "Loja".
13. **Textos** em `packages/ui/src/locales/` (os blocos) e em `apps/web/src/locales/` (o que é só do app), em pt-BR e em inglês; nenhuma frase dentro de componente.
14. **Testes de unidade:** os handlers (inclusive o `revalidateStore`), os hooks, os blocos e a tela. **Stories:** sem domínio, pendente com cada problema, ativo, indisponível, carregando, e o cartão da página inicial nos três estados.
15. **Documentos:** `apps/web/docs/README.md` (a página e os handlers) e `packages/ui/docs/README.md` (os blocos).
16. `pnpm ci-check` verde.

## Decisões

As do épico estão no plano do BEELINK-280. As abaixo são deste ticket, tomadas pelo desenvolvedor a partir do briefing do orquestrador; o Rafael pode mudar qualquer uma.

### Palavras

1. **Os textos não dizem "loja".** O cartão e a tela valem para loja e para site, e a página inicial do painel já tem um conjunto de frases só porque "loja" lê errado num site. Em vez de dobrar cada frase, os textos falam de "a sua página" e de "o endereço", que é como o fluxo de criação já chama as duas coisas.
2. **"Beelink"** na frase do certificado, como o briefing escreveu.

### A tela

3. **Não há "trocar o domínio".** O `PUT` da API troca o domínio salvo, mas a tela só oferece salvar (quando não há nenhum) e remover. Quem quer outro domínio remove e salva de novo: um estado a menos numa tela que ninguém vai ter visto num navegador antes do PR. Trocar com um botão só fica para quando alguém pedir.
4. **A API é quem decide o que é um domínio.** O campo só recusa o vazio; o que foi colado vai como veio (`https://www.MinhaLoja.com.br/` vira `minhaloja.com.br` lá). Repetir aqui a validação do BEELINK-281 seriam duas regras para manter iguais.
5. **A tabela de registros aparece sempre que a instalação tem `targetIps`**, também antes de salvar: o lojista pode apontar o DNS primeiro e informar o domínio depois, e assim o primeiro salvar já sai ativo.
6. **O valor do `CNAME` é `@`**, como o épico decidiu, com uma linha dizendo que o provedor que não aceita `@` ali recebe o próprio domínio. Registro.br e outros pedem o nome por extenso.
7. **A frase de `DNS_POINTS_ELSEWHERE` manda apagar o outro registro `A`.** A conferência exige que os registros `A` sejam exatamente os do servidor (decisão 12 do BEELINK-281), e o provedor costuma deixar um `A` de estacionamento ao lado do novo.
8. **Os endereços achados só vêm na resposta de salvar e de conferir** (`check`), nunca numa leitura. A leitura seguinte (ao voltar para a aba, por exemplo, que é exatamente o que o lojista faz depois de mexer no provedor) apagaria a lista. Por isso o hook guarda o `check` enquanto o domínio lido for o mesmo e tiver sido conferido no mesmo instante; uma conferência nova o substitui.
9. **`ACTIVE` com problema** é mostrado como ativo, com o aviso do que a última conferência achou, sem voltar a tela para "aguardando" (decisão 19 do BEELINK-281).
10. **O minuto é dito sempre que o domínio está ativo**, e não só logo depois de ativar: a tela não tem como saber se a ativação foi agora ou há uma hora quando é recarregada, e a frase é verdadeira nos dois casos.
11. **Instalação sem a variável e com um domínio já salvo:** a tela mostra o aviso de indisponível e o domínio com o botão de remover, sem "Verificar de novo" (a API recusaria com 503).
12. **A moldura da tela é a das integrações** (`IntegrationFrame`: o caminho de volta, o aviso do que acabou de acontecer, o cartão como título). O caminho de volta leva à página inicial do painel.
13. **O botão de copiar é um bloco novo, do painel.** O da vitrine (`storefront-copy-button`) faz o mesmo e é desenhado com as cores da loja; ele é usado por quatro blocos da vitrine, e mexer nele hoje, sem navegador, não se justifica por vinte linhas.

### A página inicial

14. **O cartão é um `SetupCard`**, o bloco dos outros cartões, com uma palavra a mais: `status`, o selo de quem não está feito nem por fazer ("Aguardando"). O bloco novo (`ShopAddressCard`) só escolhe as frases pelo estado.
15. **O cartão entra por último na lista**, estreito. No site ele completa a segunda fileira, que hoje tem dois cartões; na loja ele fica sozinho numa terceira fileira em telas largas. A página vai ser redesenhada, e nenhum cartão existente mudou de lugar.
16. **O cartão lê `Store.customDomain`**, que a leitura da loja já traz: nenhuma chamada a mais na página inicial. Salvar, conferir e remover derrubam essa leitura.
17. **O endereço da plataforma vem do pedido** (`siteOrigin()`), porque o web não tem variável que diga o próprio endereço fora do proxy. O painel só é servido no host da plataforma.
18. **"Ver a loja" não muda.** O link continua em `/<slug>`; com o domínio ativo, o proxy do BEELINK-283 o leva ao domínio.

### O menu

19. **Sem entrada no menu.** O menu não tem um grupo de configurações: tem um item só, "Configurações", no rodapé. A tela é alcançada pelo cartão da página inicial e por um link no fim da tela "Loja".

### Erros

20. **O mapa de erros fica no dicionário dos blocos**, em `customDomain.errors`, e uma função do app (`customDomainErrorOf`) escolhe a frase pelo código, como as integrações fazem (`googleAnalyticsErrorOf`). A função recebe o mapa tipado pelo `CustomDomainErrorCode` do contrato: um código novo na API deixa de compilar até ganhar uma frase.
21. **`RATE_LIMITED` tem frase própria.** Salvar e conferir têm limite por IP, e "Verificar de novo" é um botão que se aperta várias vezes.

## Fora do escopo

- A API, o `proxy.ts` e a vitrine (Y2, Y4): nada deles é tocado.
- Login com Google e chat no domínio da loja (Y5); Traefik (Y3); prova de posse por `TXT`.
- Uma rotina que confere os domínios sozinha: a tela só mostra o que a última conferência pedida achou.
- Trocar o domínio com um botão (decisão 3).
- `docs/product/`: o que o lojista ganha com o domínio já está escrito lá desde o BEELINK-283.

## Riscos

- **Nada desta tela foi visto num navegador** antes do PR: o ambiente do dia não deixa subir a API nem o web (ver as notas da entrega). Disposição, quebra de linha em tela estreita, foco e o botão de copiar só foram conferidos por teste de unidade.
- **O "Ativo" da tela pode adiantar-se à loja em até um minuto** (decisão 17 do BEELINK-283). A tela diz isso; não há o que o handler possa derrubar.
- **O cartão da página inicial depende do cache da leitura da loja.** Se outra aba ou outro aparelho muda o domínio, o cartão só acompanha na próxima leitura.
- **A frase do certificado promete uma ação da equipe.** Até o BEELINK-282, alguém precisa de fato cadastrar o domínio no Dokploy; a tela não avisa ninguém.

## Notas da entrega (acréscimo, 08/10)

**O ambiente no dia.** Como no BEELINK-283: o disco da máquina estava quase cheio e o Docker, desligado. Por ordem do orquestrador, nada que precisasse de banco, de build ou de servidor foi rodado: nem `next build`, nem Storybook, nem Playwright, nem a API, nem o web. **A tela nunca foi aberta num navegador.** O que há de evidência são testes de unidade (jsdom), `tsc`, `lint` e os gates.

**Correções e acréscimos ao que está acima.**

- **Decisão 22 (nova): o aviso do `www` só aparece quando o domínio em si já aponta para cá.** Com o DNS da raiz errado, a frase do problema já manda o lojista aos registros, e o do `www` está na mesma tabela; dois avisos ao mesmo tempo seriam ruído. O aviso também não aparece quando o DNS não respondeu para o `www` (`DNS_LOOKUP_FAILED`): isso não diz nada sobre o registro. Fica em `wwwOffOf` (`apps/web/src/lib/custom-domain-form.ts`).
- **Decisão 23 (nova): a frase lida depois de "Verificar de novo" não diz "agora".** A linha fica na tela enquanto a página está aberta; "Verificação feita: …" continua verdadeira dez minutos depois. Quando foi, está em "Última verificação".
- **Decisão 24 (nova): pedir uma das três ações limpa o que as outras duas disseram por último** (o aviso de salvo, uma recusa, o resultado de uma conferência). Sem isso, remover um domínio e salvar outro deixaria na tela "Verificação feita" da conferência do domínio anterior.
- **Decisão 8:** o `check` é guardado dentro da própria leitura (`withKeptCheck`, em `custom-domain-hooks.ts`), comparando o host e o `checkedAt` do que foi lido com o que estava no cache. Não há estado fora do TanStack Query.
- **Decisão 14:** além de `status`, a descrição do `SetupCard` ganhou `break-words`: um domínio é uma palavra só para um cartão estreito.
- **Decisão 19:** o link na tela "Loja" é uma linha embaixo do formulário, escrita pelo app (`web.stores.settings.domainText` e `domainLink`), e não uma mudança no bloco do formulário.

**Onde ficou cada coisa.**

- Handlers: `apps/web/src/app/api/stores/[slug]/custom-domain/route.ts` (`GET`, `PUT`, `DELETE`) e `…/custom-domain/check/route.ts` (`POST`).
- Serviço: `apps/web/src/services/custom-domain/`. `custom-domain-requests.ts` (`CustomDomainRequestError`, `fetchCustomDomain`, `saveCustomDomain`, `checkCustomDomain`, `removeCustomDomain`), `custom-domain-keys.ts` (`customDomainKeys.overview(slug)`), `custom-domain-hooks.ts` (`useCustomDomain`, `useSaveCustomDomain`, `useCheckCustomDomain`, `useRemoveCustomDomain`).
- App: `apps/web/src/lib/custom-domain-form.ts` (`customDomainPageOf`, `platformAddressOf`, `customDomainViewOf`, `customDomainErrorOf`); `components/custom-domain/custom-domain-screen.tsx`; a página `app/(admin)/admin/[slug]/domain/page.tsx`.
- Blocos: `packages/ui/src/blocks/custom-domain/`. `custom-domain-card` (que desenha `custom-domain-form`, `custom-domain-status` e `custom-domain-actions`), `custom-domain-records`, `custom-domain-copy-button`, `custom-domain-skeleton`, `shop-address-card`. Tipos e a lista de registros em `packages/ui/src/lib/custom-domain.ts`. Textos em `customDomain` (`packages/ui/src/locales/`).
- Stories: `Blocos/Painel/Domínio próprio` (22) e `Blocos/Painel/Início/Endereço da página` (4).

**Para o Y5, o Y3 e o Y7.**

- A tela não sabe nada do login com Google nem do chat no domínio da loja (Y5); nada nela precisa mudar por causa deles.
- **Y3 (Traefik):** quando o roteador e o certificado deixarem de ser feitos à mão, a frase de `HTTPS_UNREACHABLE` e `HTTPS_CERTIFICATE_INVALID` (`customDomain.problems`, nos dois idiomas) deixa de ser verdade: ela diz que a ativação é feita pela equipe da Beelink. As duas chaves têm hoje o mesmo texto. E se a prova de posse por `TXT` entrar, a tabela de registros (`customDomainRecordsOf`) ganha uma linha.
- **Y7:** o cartão da página inicial e a tela mostram o endereço da plataforma lido do pedido (`siteOrigin()`), sem esquema. Quando o web tiver uma variável com o próprio endereço, `platformAddressOf` passa a ler dela.

**O que rodou.**

- `pnpm ci-check` na árvore com todo o código (commit `ca965eea`): verde. `type-check` e `lint` do web e do ui rodaram de verdade; os da API e dos contratos vieram do cache do turbo, porque nenhum arquivo deles mudou. Testes de unidade: ui 358 arquivos e 2600 testes, web 298 e 2560, e os da API (119 e 1314) do cache. `arch-gates` e `docs-gate` verdes. Sem `--e2e`.
- Os testes deste ticket. No web: os dois handlers (7 e 3), os hooks (16), `custom-domain-form` (14), a tela (35), a página inicial (9, seis deles novos), a tela "Loja" (3). No ui: o cartão da tela (29), a tabela e o botão de copiar (7), o cartão da página inicial e o skeleton (7), `customDomainRecordsOf` (2), o `SetupCard` (7, um novo).
- Duas quebras propositais na regra do `check` guardado (devolver a leitura sem ele; guardá-lo sem comparar host e instante), para conferir que os testes dos hooks pegam cada uma. Pegaram, e o arquivo voltou ao que era.
- `next typegen` (escreve só os tipos de rota), dentro do `type-check` do web: a rota `/admin/[slug]/domain` e os dois handlers existem para o compilador.

**O que não rodou.** Nada disto foi conferido; cada item é uma coisa escrita e não vista funcionar.

- **O navegador.** Nem a tela, nem o cartão da página inicial, nem a linha na tela "Loja". Disposição, quebra de linha em tela estreita, a tabela num celular, o tema escuro, o foco depois de salvar e de remover, e o diálogo de confirmação só existem em jsdom.
- **O botão de copiar com a área de transferência de verdade.** Os testes trocam `navigator.clipboard` por um dublê.
- **Storybook.** As stories compilam (`tsc`) e nunca foram abertas; o painel de acessibilidade delas, que é onde o contraste é conferido, não rodou. Os testes dos blocos rodam o axe sem contraste, como os dos vizinhos.
- **`next build`.** A página nova e os handlers passaram pelo `tsc` e pelo `next typegen`, não por um build.
- **A API de verdade.** Nenhuma chamada saiu daqui: os handlers foram testados contra um `fetch` trocado, os hooks também. Em especial, não foi visto o corpo de um 429 (`RATE_LIMITED`) chegando à tela, nem o `PUT` demorando os até 8 segundos que a conferência pode levar.
- **O caminho inteiro**: salvar na tela, ver "Aguardando", apontar o DNS, "Verificar de novo", ver "Ativo", abrir a loja no domínio, remover. Depende do banco, da API, do web e de um domínio que resolva.
- **O minuto.** Que a loja de fato leve até um minuto para acompanhar o que a tela diz é o que o BEELINK-283 escreveu e também não viu.
- **Playwright.** Nenhum spec foi escrito para esta tela, e nenhum dos que existem foi rodado. Os que existem não abrem a página inicial do painel nem a tela "Loja" (conferido por leitura).
- **`delivery-check` como skill.** A lista dela foi conferida à mão contra o diff, sem bloqueador; o `pnpm ci-check` que ela pede é o de cima.

**Correção às notas acima (08/10).** Em "O que não rodou", a frase sobre o Playwright diz que nenhum spec abre a página inicial do painel. Um abre: `apps/web/e2e/shop-domain.spec.ts`, do BEELINK-283, vai a `/admin/<slug>` de uma loja com domínio ativo, no último passo, e confere só o endereço da página. O cartão novo vai estar nessa tela ("Domínio próprio", "Feito") e nada no spec olha para ele. Esse spec nunca rodou, nem lá nem aqui. Os outros (`auth-journey`, `panel-session`, `shared-tab`, `accessibility`, `screenshots`) não abrem a página inicial de uma loja, nem a tela "Loja", nem a tela nova.

**Segunda correção às notas (08/10): em qual commit o `ci-check` rodou.** As notas dizem "commit `ca965eea`". Quando foram escritas, o `pnpm ci-check` tinha rodado no `bc78435a`, antes da troca de "Verificado agora" por "Verificação feita" (o `ca965eea`), e estava verde. Depois das notas ele rodou de novo, na árvore do `81ba413e`, que é o código do `ca965eea` mais o texto deste plano: verde, com o web e o ui executados de verdade (298 arquivos e 2560 testes; 358 e 2600) e a API e os contratos vindos do cache do turbo. O que rodar depois deste parágrafo roda sobre uma árvore em que só este arquivo mudou.

## Conferência no navegador (acréscimo, 09/10)

O ambiente voltou em 09/10 e a tela foi, enfim, usada num navegador: API na 3801 e web em `next dev` na 3800, contra o banco de dev (`harness_domain`), com as ferramentas `mcp__playwright__*`. As seções "O que não rodou" acima descrevem o dia 08/10; o que mudou está aqui. Os screenshots estão em `.claude/worktrees/custom-domain-pr/screens-285/` (fora do repositório).

**A base mudou.** O orquestrador refez a branch sobre a ponta nova do BEELINK-283 (PR #244); os doze commits de 08/10 são os mesmos, com outros hashes (o último é o `b709c8e5`). Os hashes citados nas notas acima são os de antes.

### O que foi visto

Com a API de verdade, na loja `loja-dominio-1791487727` e num site criado pelo fluxo normal (`site-dominio-285`):

- **Sem domínio:** a tela, o campo, a tabela de registros (um `A` em `@` para `127.0.0.1`, um `CNAME` em `www` para `@`) antes de salvar.
- **O botão de copiar com a área de transferência de verdade:** `127.0.0.1` e `@` lidos de volta dela; o botão diz "Copiado" e volta a "Copiar" em quatro segundos.
- **Salvar um endereço inteiro colado** (`https://www.Exemplo…com.br/produtos?x=1`, com espaços): a tela mostra o domínio como a API o leu.
- **Problemas, cada um com a frase dele:** nome que não existe (`DNS_NOT_FOUND`); `example.com` (`DNS_POINTS_ELSEWHERE`, com os dois endereços achados); `lvh.me` com a sonda ligada (`HTTPS_UNREACHABLE`, a frase do certificado).
- **Voltar à aba** (uma releitura disparada pelo foco da janela): os endereços achados continuam na frase. Recarregar a página: a frase fica sem eles, como previsto.
- **Recusas sob o campo:** IP (v4 e v6), `localhost` e outros nomes locais, texto que não é domínio, nome com acento, e o domínio de outra página (`CUSTOM_DOMAIN_TAKEN`, com o site como dono). O campo fica marcado, o foco volta para ele e o que foi digitado fica.
- **O limite de tentativas:** na 21ª conferência em um minuto, "Muitas tentativas. Espere um minuto e tente de novo." (o 429 da API chega à tela).
- **Ativo:** `lvh.me` com a sonda desligada, ao salvar; e, no caminho que o lojista de fato faz, um domínio salvo como "Aguardando" que vira "Ativo" ao apertar "Verificar de novo" (a sonda foi desligada entre uma coisa e outra).
- **O minuto:** depois de a tela dizer "Ativo", o endereço da plataforma respondeu 200 por 60 segundos e só então passou a responder 308 para o domínio.
- **Remover,** com o diálogo: pelo mouse e pelo teclado (Enter abre, o foco cai em "Manter domínio", Esc fecha e devolve o foco, Tab fica preso entre os dois botões, Enter em "Remover domínio" remove).
- **Instalação sem a variável** (API reiniciada sem `SHOP_DOMAIN_TARGET_IPS`): com um domínio já salvo, o aviso, o domínio e só "Remover domínio"; sem domínio, "Indisponível", sem campo e sem tabela.
- **Página inicial:** o cartão nos três estados, na loja e no site. "Abrir a loja" continua em `/<slug>` e, com o domínio ativo, abriu `http://lvh.me:3800/`. Depois de ativar pela tela, o cartão acompanhou numa navegação pelo próprio painel, sem recarregar. No site o cartão completa a segunda fileira; na loja fica sozinho na terceira, como previsto.
- **Tela "Loja":** a linha embaixo do formulário, na loja e no site, levando à tela.
- **390px:** a tela nos estados principais, o diálogo, o cartão, a linha da tela "Loja". Nada estoura a página.
- **Contraste** (medido nas cores computadas): "Ativo" 7,08:1; "Aguardando" 19,8:1; o texto cinza (a explicação, os rótulos, o aviso do `www`) 4,74:1 em 14px.
- **Estados de ocupado,** com as respostas de verdade seguradas por dois segundos: "Salvando…" com o campo travado, "Verificando…" com os dois botões presos.
- **`pnpm --filter web build`:** verde, com `/admin/[slug]/domain`, `/api/stores/[slug]/custom-domain` e `…/check` na tabela de rotas.
- **A suíte de Playwright do web,** contra os apps compilados nas portas 3100/3101 e o banco `harness_domain_test`: 12 passaram, entre eles `shop-domain.spec.ts`, que passa pela página inicial do painel. Rodada com `--grep-invert @screenshot`, como o `test:e2e` do workspace: o spec `@screenshot` regrava as imagens de `assets/screenshots/`, que são do repositório.

**Vistos só com respostas simuladas** (o código da página de verdade, sobre respostas da rota do BFF montadas no navegador, porque nenhum nome do DNS público produz esses estados aqui): o aviso do `www` num domínio ativo; "ativo, e a última conferência achou um problema"; `DNS_LOOKUP_FAILED`; e a tabela com os endereços mais compridos possíveis.

### Defeitos achados e consertados

1. **O foco caía no começo da página depois de "Verificar de novo".** O botão ficava `disabled` enquanto a conferência rodava, e um botão que fica `disabled` com o foco em cima o perde. Quem usa o teclado ouvia o resultado longe do botão que apertou. O jsdom não mostra isso. Os dois botões agora ficam presos com `aria-disabled`, continuam focáveis e não fazem nada enquanto presos (`focusableWhenDisabled`, como `order-fee-card` já faz). Commit `6ab9daa6`.
2. **A 390px o botão "Copiar" era cortado na borda do cartão.** O valor e o botão, lado a lado, eram mais largos do que o cartão, e a tabela rolava de lado dentro dele. Abaixo de `sm` o botão vai para debaixo do valor. Commit `e40babbf`.
3. **A tela dizia "<domínio> já abre a sua página" durante o minuto em que ele ainda não abria** (o agente do BEELINK-283 tinha medido 51 s; aqui foram 60). A frase passou a dizer o que é verdade desde o primeiro segundo: "<domínio> é o endereço da sua página, e <endereço da plataforma> leva para ele. Um domínio que acabou de ser ativado pode levar até um minuto para começar a abrir a página." O aviso de "salvo e ativo" ganhou o mesmo minuto. Nos dois idiomas, com um teste que proíbe "já abre" e "already opens". Isto corrige a decisão 10: o minuto continua dito sempre, mas como coisa de um domínio recém-ativado. Commit `6c1225c3`.
4. **"…só para 127.0.0.1: troque…" lia como endereço com porta.** Os endereços achados foram para dentro de parênteses, e o endereço certo passou a ser seguido de vírgula. No mesmo commit `6c1225c3`.
5. **Numa instalação sem a variável, remover o domínio que tinha ficado salvo deixava o foco no começo da página,** porque não sobra campo nem botão. O foco agora vai para o aviso. Visto com respostas simuladas, depois do conserto. Commit `9c2635fd`.

### O que continua sem ter sido visto

- **Um leitor de tela.** O foco e os papéis (`status`, `alert`) foram conferidos; ninguém ouviu a tela. A linha do resultado de "Verificar de novo" fica com `display: none` enquanto está vazia (`empty:hidden`, como no aviso do Asaas), e há leitores que não anunciam uma região que acabou de aparecer.
- **O tema escuro, porque o painel não tem um:** o app força o tema claro (`forcedTheme="light"`) e os tokens `--shell-*` só existem no claro. Pondo a classe `dark` à mão, todo cartão do painel (os deste ticket e os das integrações) fica com texto claro sobre fundo branco.
- **Storybook:** as 26 stories continuam sem ter sido abertas (ordem do dia: não subir o Storybook).
- **`CUSTOM_DOMAIN_PLATFORM`:** aqui `WEB_URL` é `localhost`, e a API recusa esse nome antes como local.
- **`HTTPS_CERTIFICATE_INVALID`:** o que apareceu foi `HTTPS_UNREACHABLE` (nada escuta na 443 desta máquina). As duas têm a mesma frase.
- **Um domínio ficando ativo com a sonda ligada,** isto é, com um certificado de verdade na 443.
- **A 320px com um endereço de quinze caracteres** a tabela ainda rola 56px de lado dentro do cartão (os botões continuam à vista). A 390px, e a 360px com o endereço da produção, cabe.
- **Nada em produção.**

Duas coisas notadas e deixadas como estão: numa instalação sem a variável o cartão da página inicial convida a configurar um domínio e a tela responde "Indisponível" (o cartão lê só `Store.customDomain`, e saber mais custaria outra chamada); e a tela "Loja" de um site tem o título "Minha loja", que não é deste ticket.
