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
