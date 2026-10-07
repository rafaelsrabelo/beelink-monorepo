# BEELINK-301 (Z1) — a loja guarda o ID de medição do Google Analytics

> Épico Z (BEELINK-300), "Google Analytics". É o X2 ([BEELINK-269](2026-10-06--BEELINK-269--pixel-da-meta-id.md)) outra vez, para o Google, e segue o desenho dele arquivo por arquivo. A pilha fica `main` → **Z1** → Z2 (painel, BEELINK-302) → Z3 (vitrine, BEELINK-303).

## O problema

O lojista não tem onde dizer qual é a propriedade do Google Analytics dele, e a vitrine não tem de onde ler. Antes da tela (Z2) e do `gtag` na vitrine (Z3), a API precisa guardar o ID de medição, validado, e entregá-lo nos dados públicos da loja.

## Definição de Pronto

1. Existe a integração "Google Analytics" no módulo de integrações da loja: uma linha de `StoreIntegration` com o provedor `GOOGLE_ANALYTICS`, uma por loja.
2. Salvar um ID válido (`G-` seguido de letras maiúsculas e dígitos) conecta: a rota responde a conexão com `CONNECTED`, o ID e quando foi salvo.
3. Um ID fora do formato é recusado com 400, o código próprio `GOOGLE_ANALYTICS_ID_INVALID` e uma mensagem que diz o formato esperado e nomeia o que não serve (`UA-`, `GTM-`, `AW-`); nada é gravado e o que estava salvo continua. O banco recusa o mesmo, por uma `CHECK`.
4. Remover desconecta: a linha some, a rota do dono responde `DISCONNECTED`, e os dados públicos da loja voltam a `googleAnalyticsId: null`.
5. O ID sai nos dados públicos da loja (`PublicStore.googleAnalyticsId`), ao lado de `metaPixelId`, e os dois não se misturam: uma loja com os dois tem os dois, cada um no seu campo.
6. Uma loja nunca lê nem altera o ID de outra: quem não é dono recebe 403 em ler, salvar e remover; quem não entrou recebe 401; o ID de uma loja não aparece nos dados públicos de outra.
7. Salvar funciona numa implantação sem `INTEGRATIONS_SECRET_KEY`: o ID não é segredo e nada vai para o cofre.
8. As formas que atravessam a rede estão em `packages/contracts`, uma vez só; a API as implementa com `satisfies`/`implements`.
9. Swagger nas rotas novas e no campo novo da loja pública; o mapa de superfície `apps/api/docs/README.md` diz as rotas.
10. O web e o `packages/ui` continuam compilando e com os testes verdes com o provedor e o campo novos.
11. Testes unitários e e2e das linhas acima; `pnpm ci-check` verde.

## Decisões

As do épico vêm do briefing do orquestrador (só o ID, nunca um script nem Google Tag Manager; nada é perguntado ao Google). As abaixo são deste ticket, tomadas pelo desenvolvedor; o Rafael pode mudar qualquer uma.

1. **O ID mora numa coluna própria, `StoreIntegration.measurementId`**, com uma `CHECK` do formato. Não reaproveita `pixelId`: a `CHECK` daquela coluna é "só dígitos", e afrouxá-la para aceitar `G-…` afrouxaria o que protege o pixel. Não vai em `secretSealed` (não é segredo) nem em `accountId` ("mostrado, nunca usado para agir", e este ID é o que a vitrine usa).
2. **Formato: `G-` e de 6 a 16 letras maiúsculas ASCII ou dígitos** (`^G-[A-Z0-9]{6,16}$`). O Google não documenta o tamanho; os IDs que ele entrega hoje têm 10 caracteres depois do `G-`. O intervalo aceita um mais curto ou mais longo que exista e recusa o que claramente não é um ID. Mesma regra no DTO e na `CHECK`, e um teste prende as duas.
3. **A API tira os espaços das pontas e não conserta mais nada**, como no pixel: minúsculas (`g-abc…`), espaço no meio ou um trecho de script são recusados, não limpos. O ID copiado do Google Analytics já vem em maiúsculas; pôr em maiúsculas por conta própria seria começar a "limpar" a entrada.
4. **`UA-`, `GTM-` e `AW-` não têm regra própria**: são recusados porque não casam com o formato. O que é próprio é a **mensagem**, uma só para toda recusa, que diz o formato e nomeia os três como coisas que não são um ID de medição. O texto que o lojista lê é do painel (Z2), escolhido pelo `errorCode`; a mensagem da API é em inglês, como todas.
5. **Código de erro novo, `GOOGLE_ANALYTICS_ID_INVALID`**, na união `IntegrationErrorCode`, como `META_PIXEL_ID_INVALID`.
6. **Rotas como as do pixel**: `GET`, `POST` (salva ou troca, 200 com a conexão) e `DELETE` (204) em `/stores/:slug/integrations/google-analytics`. O corpo do `POST` é `{ measurementId }`.
7. **A conexão é `{ status, measurementId, connectedAt }`**, sem `available`, `environment` nem `conversions`: nada aqui depende da implantação e não há segredo. Se o Z4 (envio pelo servidor) trouxer um segredo de API, o campo entra lá.
8. **`PublicStore.googleAnalyticsId: string | null`**, obrigatório, como `metaPixelId`. A leitura pública da loja passa a pedir as linhas dos dois provedores, selecionando `provider`, `pixelId` e `measurementId` e mais nada, e cada campo público é lido da linha do seu provedor (não "da primeira linha"), para um nunca sair no lugar do outro.
9. **Trocar o ID reinicia `connectedAt`**, como no pixel.
10. **Sem limite de taxa próprio no `POST`** e **nada é perguntado ao Google**: não sai chamada nenhuma. Um ID de formato certo que não existe simplesmente não recebe eventos.
11. **Sem gate novo em `arch-gates.sh`.** Os gates do Asaas e da Meta existem para que só uma pasta abra o segredo do provedor; aqui não há segredo para guardar.
12. **Os handlers do BFF ficam no Z2**, e não aqui como no X2. O orquestrador delimitou este ticket a "API e contratos, e o que o web precisar para continuar compilando". Consequência registrada: a parte "a vitrine deixa de receber o ID" do critério de pronto é provada aqui na API (os dados públicos voltam a `null`); a vitrine em si lê esses dados sob o cache `store:<slug>` do web, e quem derruba esse cache numa escrita é o handler do BFF, que nasce no Z2.

## Fora do escopo

- A tela no painel, o card em Integrações, os handlers do BFF e o hook de serviço (Z2).
- O aviso de cookies, o texto de privacidade e o `gtag` na vitrine (Z3): o campo `googleAnalyticsId` chega à vitrine e ninguém o lê ainda.
- Envio pelo servidor (Z4) e Google Ads (Z5).
- `docs/product/`: o que o lojista ganha passa a ser verdade quando a tela e os eventos existirem.

## Para o Z2 e o Z3

- **Z2 (painel):**
  - Contratos em `packages/contracts/src/google-analytics.ts`: `GoogleAnalyticsConnection` (`status`, `measurementId`, `connectedAt`) e `GoogleAnalyticsConnectPayload` (`{ measurementId }`).
  - Rotas da API: `GET`, `POST` e `DELETE` em `/api/stores/:slug/integrations/google-analytics`. A recusa de formato é `400 GOOGLE_ANALYTICS_ID_INVALID`.
  - Os handlers do BFF são seus: copie `apps/web/src/app/api/stores/[slug]/integrations/meta-pixel/route.ts` (checagem de origem e de JSON) e chame `revalidateStore(slug)` num 2xx de escrita, senão a vitrine continua servindo o ID antigo do cache. Eles entram em `apps/web/docs/README.md`.
  - O formato para validar na tela antes de enviar é `^G-[A-Z0-9]{6,16}$` (`GOOGLE_ANALYTICS_ID` em `apps/api/src/modules/integrations/google-analytics/dto/google-analytics.dto.ts`). A API só tira espaços das pontas.
  - `IntegrationProviderValue` em `packages/ui/src/lib/integrations.ts` já tem `GOOGLE_ANALYTICS`; o que este ticket teve de tocar no web e no `ui` para compilar está nas "Notas da entrega" abaixo.
- **Z3 (vitrine):**
  - `store.googleAnalyticsId` já está em toda leitura pública da loja (`PublicStore`), `null` sem ID salvo. É `G-` mais maiúsculas e dígitos por construção (DTO e `CHECK`), mas continua sendo dado: vai como argumento de `gtag('config', id, …)` e como parâmetro de URL codificado no `src` do script do Google, nunca interpolado num script.
  - Ele é independente de `store.metaPixelId`: uma loja pode ter um, o outro, os dois ou nenhum.

## Notas da entrega (acréscimo, 07/10)

**Correção ao "Para o Z2 e o Z3".** A linha que diz que `IntegrationProviderValue` em `packages/ui` "já tem `GOOGLE_ANALYTICS`" está errada: este ticket **não** tocou o `packages/ui`. O `ui` espelha a união do contrato num tipo próprio, então o web e o `ui` compilaram sem mudança com o provedor novo. Acrescentar `GOOGLE_ANALYTICS` ali obriga a preencher os mapas exaustivos de texto e de logo dos cards (`integration-providers.ts`, `integration-pages.ts`, `integrations-screen.tsx`), que é o trabalho do Z2. O único arquivo do web tocado foi um fixture de teste, `apps/web/src/components/store/store-payloads.test.ts`, que passou a dizer `googleAnalyticsId: null`.

**Onde ficou cada coisa.**

- Contratos: `packages/contracts/src/google-analytics.ts`; `IntegrationProvider` e `IntegrationErrorCode` em `integration.ts`; `PublicStore.googleAnalyticsId` em `store.ts`.
- Migration `20261007152413_google_analytics_integration`: valor `GOOGLE_ANALYTICS` no enum, coluna `store_integrations."measurementId" VARCHAR(18)` anulável e a `CHECK` `store_integrations_measurement_id_check`.
- API: `apps/api/src/modules/integrations/google-analytics/` (controller, service, `dto/`), registrado em `integrations.module.ts`; `storeInclude` e `toPublicStore` em `modules/stores/store.mapper.ts`.
- Testes: `dto/google-analytics.dto.spec.ts`, `google-analytics.service.spec.ts`, `store.mapper.spec.ts`, e os e2e `test/google-analytics.e2e-spec.ts` e `test/google-analytics-without-vault-key.e2e-spec.ts`.

**Decisões acrescentadas durante o trabalho.**

13. **A mensagem de formato fica só no `@Matches`.** Um corpo sem o campo, ou com um número, responde também a mensagem padrão do `@IsString`; o `errorCode` é o mesmo.
14. **O e2e "sem chave do cofre" troca o `dotenv` por um vazio** (`vi.mock('dotenv')`). O `dotenv-expand` escreve o valor do arquivo por cima de uma variável deixada em branco, então com um `apps/api/.env` que tenha `INTEGRATIONS_SECRET_KEY` a chave voltava e o teste falhava. O teste equivalente do pixel (`meta-pixel-without-vault-key.e2e-spec.ts`) tem o mesmo defeito, já na `main`, e **não foi alterado**: fica anotado como achado para um ticket próprio.
15. **Um teste do pixel foi ajustado fora do escopo, num commit à parte** (`test(api): the Meta test event's page…`): `meta-pixel.service.spec.ts` afirmava `http://localhost:3000`, e falhava em qualquer worktree cujo `.env` tenha outro `WEB_URL` (este usa a 3700), deixando o `pnpm ci-check` vermelho aqui. Passou a afirmar `env.WEB_URL`. O commit pode ser retirado sem afetar o resto.

**O que foi e o que não foi conferido.**

- Conferido: os testes unitários novos; os dois e2e novos rodados sozinhos contra `harness_ga_test` (2 arquivos, 12 testes, verdes); a migration aplicada em `harness_ga` (`prisma migrate dev`) e em `harness_ga_test` (pelo `global-setup` do e2e); o Swagger servido pela API de pé na 3701 (as três operações da rota e o campo `googleAnalyticsId` em `PublicStoreResponse`); `pnpm ci-check` verde.
- **Não conferido: a suíte e2e inteira da API.** A única rodada completa foi invalidada pelo ambiente: o disco da máquina encheu, o Postgres compartilhado passou a responder erro de E/S (`58030`) no meio da rodada e depois a porta 5432 deixou de aceitar conexão. 50 arquivos passaram antes da queda, entre eles `google-analytics.e2e-spec.ts`; os 30 restantes falharam todos no `resetDatabase`, sem chegar a rodar. Precisa ser rodada de novo com o banco de pé.
- **Não conferido: as rotas à mão por HTTP** (salvar, recusar, remover com `curl` e uma conta real). A tentativa coincidiu com a suíte e2e, que limpa a caixa do Mailpit, e a seguinte já encontrou o banco fora do ar.
- Nada foi conferido no Google: nenhum teste o chama, e não há propriedade de teste.
