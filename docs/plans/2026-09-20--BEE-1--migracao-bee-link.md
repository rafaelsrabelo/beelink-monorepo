# BEE-1 — Trazer o bee-link para o monorepo

> **Tier:** plans — verdade de um momento, para um ticket. Append-only: escopo mudou, acrescente uma seção datada; o plano errou, acrescente a correção.

## Context

O **bee-link** é um SaaS multi-tenant de vitrine + pedidos: cada lojista tem uma loja pública em `/<slug>` e um painel em `/admin/<slug>`. Hoje ele vive em repositório próprio (`beecoders/bee-link`) como um Next.js 15 monolítico — o backend inteiro são 36 route handlers dentro do próprio app, o banco é Supabase acessado direto pelo query-builder, sem ORM e **sem sistema de migrations**.

Este plano descreve o estado atual, o alvo, e como chegar lá: backend Node separado em `apps/api`, frontend Next em `apps/bee-link`, Postgres com Prisma, e os padrões deste repo valendo do primeiro commit.

## Decisões

**Strangler por domínio, não lift-and-shift.** Um domínio por vez (stores → products → orders → …), já no padrão do harness: contrato → módulo Nest → BFF → service/hook → bloco de UI. O bee-link legado fica em produção o tempo todo. A alternativa — copiar o app como está e refatorar depois — nasceria com baseline alto nos gates, e [arch-gates](../../scripts/arch-gates.sh) documenta que um baseline nunca sobe depois. Código novo nasce conforme.

**Sair do Supabase por completo.** Postgres próprio, Prisma como fonte da verdade do schema, auth própria reusando `apps/api/src/modules/auth` (JWT HS256 + refresh opaco rotativo + argon2). Autorização vira checagem explícita em service, não RLS — as políticas atuais são permissivas a ponto de qualquer usuário autenticado poder editar produto de qualquer loja.

**Um app, `apps/bee-link`, com route groups por audiência:** `(storefront)` para `/<slug>`, `(admin)` para `/admin/<slug>` — do jeito que [apps/web](../../apps/web/AGENTS.md) separa `(auth)` e `(app)`. Dois apps separados custariam dois BFFs, dois pipelines de CI e dois contratos de workspace, sem ganho proporcional.

**Os domínios de backend entram no `apps/api` existente**, como módulos novos. O lojista é o `User` que já existe no schema — não se cria uma segunda noção de conta.

---

## Antes de tudo — três coisas que não são migração

Foram encontradas ao levantar o diagnóstico. São problemas de produção hoje, independentes deste plano, e devem ser resolvidas **nesta semana**, no repositório legado.

1. **Apagar `src/app/api/products/route.ts` do bee-link.** O `POST` não tem autenticação, não tem escopo de loja, e o `saveProducts()` executa `.delete().neq('id', 0)` sobre `products` — todos os produtos de todas as lojas — antes de inserir o que o corpo mandar. A rota é **código morto**: a única referência a `api/products` em `src/` é `api/products/[id]/images`, que é outra rota. Se o efeito destrutivo realmente acontece hoje depende das policies de RLS que só existem no projeto Supabase — os `.sql` do repo só definem `UPDATE` — então vale checar a policy **e** apagar a rota. Não há motivo para mantê-la sob nenhuma hipótese.
2. **Rotacionar as credenciais do Cloudinary** e **apagar o par antigo**, não apenas gerar um novo. `src/app/api/upload-image/route.ts` tem `cloud_name`, `api_key` e `api_secret` como fallback literal, e isso está no histórico do git. Atualizar a env da Vercel do legado em seguida, que continua no ar por meses.
3. **Tirar o `pg_dump`.** É leitura, custa dez minutos, e toda decisão da Parte 3 depende do que está de fato no schema — e não do que os 11 `.sql` soltos afirmam.

---

## Parte 1 — Como o bee-link está hoje

### 1.1 Stack e tamanho

| Item | Hoje |
|---|---|
| Framework | Next.js 15.4.5 App Router, React 19.1.0, **npm** |
| TypeScript | `^5`, strict, alias `@/*` → `./src/*` |
| Banco | Supabase (Postgres) via `@supabase/supabase-js` — **sem ORM** |
| Auth | Supabase Auth + `@supabase/auth-helpers-nextjs` (deprecado upstream) |
| Estilo | Tailwind 3 com `tailwind.config.ts` |
| Estado | Zustand 5 (3 stores; carrinho com `persist`/localStorage) |
| Imagens | Cloudinary |
| Realtime | três mecanismos concorrentes (§1.5) |
| Testes / CI / Docker | **nenhum** |
| Tamanho | 167 arquivos TS/TSX, ~31.000 LOC em `src/` |

| Diretório | Arquivos | LOC |
|---|---:|---:|
| `src/app/api` | 35 | 4.546 |
| `src/app/admin` | 6 | 5.595 |
| `src/app/[slug]` | 15 | 4.212 |
| `src/components` | 53 | 10.964 |
| `src/app/components` (raiz duplicada) | 22 | 1.078 |
| `src/lib` · `types` · `contexts` · `hooks` · `stores` | 20 | 1.920 |

Maiores arquivos, que são os centros de custo da migração: `src/app/admin/[slug]/store/page.tsx` (1.717), `src/components/ui/orders-dashboard.tsx` (1.372), `src/app/admin/[slug]/products/page.tsx` (1.348), `src/app/create-store/page.tsx` (1.108).

### 1.2 O que já facilita

- **Zero server actions.** Toda mutação é `fetch()` para um route handler. A fronteira HTTP já existe — os 36 handlers são um backend pronto para ser levantado para o Nest com a mesma assinatura.
- **Multi-tenancy é por path slug**, não por subdomínio nem domínio custom. O `middleware.ts` só protege `/dashboard`, `/admin` e `/create-store`; não faz rewrite de tenant. Mapeia 1:1 para route groups.
- Só cinco Server Components existem. Ruim para performance, bom para migração: não há lógica de servidor espalhada para desembaraçar.

### 1.3 Os 36 endpoints, por domínio

| Domínio | Rotas | Observação |
|---|---|---|
| Stores | `POST /api/stores`, `GET\|PUT /api/stores/[slug]` (153 LOC), `GET /api/user/stores`, `GET /api/categories`, `GET /api/layouts` | o `PUT` é o endpoint mais pesado: cores, endereço, redes sociais, layout, lat/lng, formas de pagamento |
| Products | `GET\|POST\|PUT\|DELETE /api/stores/[slug]/products` (330), `GET .../products-public` (107), `POST .../products/bulk`, `PUT .../products/reorder`, `GET\|POST\|PUT\|DELETE /api/products/[productId]/images` (283) | `products-public` é o catálogo da vitrine — caminho crítico de SEO |
| Categories | `GET\|POST\|PUT\|DELETE /api/stores/[slug]/product-categories` (382, o maior arquivo de API), `PUT .../categories/reorder` | |
| Orders | `POST /api/orders/create` (382), `GET /api/orders`, `GET /api/orders/[id]`, `PUT /api/orders/[id]/status`, `GET /api/stores/[slug]/orders` | núcleo do negócio |
| Delivery | `GET\|PUT .../delivery-settings` (219), `POST .../calculate-delivery` (176), `POST .../calculate-delivery-public` (189) | as duas últimas são lógica duplicada |
| Promotions | `GET\|POST .../promotions`, `PUT\|DELETE .../promotions/[id]`, `POST .../validate-coupon`, `POST .../register-coupon-usage` | usa RPCs Postgres |
| Suporte | `POST /api/upload-image`, `POST /api/imprimir` (264), `GET\|PUT .../print-settings`, `GET\|POST /api/websocket`, `POST /api/analytics/track`, `GET .../analytics` | |
| A deletar | `/api/debug/stores`, `/api/debug/product-images`, `/api/test-order`, `/api/products` e `/api/product-categories` (globais, sem escopo de loja) | debug exposto em produção |

### 1.4 Os problemas estruturais

1. **Não existe fonte da verdade do schema.** Sem `supabase/migrations/`, sem `schema.sql`. Há 11 `.sql` soltos na raiz do bee-link — alguns destrutivos, como `clear_test_store_data.sql` — e DDL dentro de markdown (`SETUP_ANALYTICS.md`). O schema canônico só existe no projeto Supabase rodando.
2. **Dinheiro em três representações.** Centavos, reais e strings formatadas (`"R$ 25,00"`) dependendo da camada. `src/lib/price-utils.ts` tem `fixCorruptedPrice()` e `parsePriceToCents()`; `orders/create/route.ts` decide por heurística (`if (priceInCents < 1000) priceInCents = Math.round(price * 100)`). O carrinho guarda `price` como string. É o maior risco de correção da migração de dados.
3. **Metadados de pedido em texto livre.** `delivery_fee`, `subtotal`, `coupon_code`, `coupon_discount`, `delivery_type` e `payment_method` são concatenados no campo `orders.notes`; o próprio código chama isso de temporário. **E o esquema já está quebrado em silêncio:** no mesmo arquivo, a linha 288 escreve `Taxa de entrega: R$ …` e a linha 38 lê `/Taxa entrega: R\$ ([\d,\.]+)/`. As duas nunca casaram — a taxa de entrega jamais apareceu na mensagem de WhatsApp montada no servidor. É a evidência de que texto livre não é uma solução temporária que funciona; é uma que falha sem avisar.
4. **Dois modos de acessar o banco.** Dez rotas usam o singleton anon rodando no servidor, sem sessão — dependem inteiramente da RLS. As outras 25 usam o client de route handler e repetem à mão `store.user_id === user.id`.
5. **RLS permissiva demais.** `simple_rls_fix.sql` define `FOR UPDATE USING (auth.role() = 'authenticated')` em `products` e `product_categories`: qualquer usuário autenticado altera produto de qualquer loja.
6. **Segredos hardcoded.** Cloudinary cloud name, API key e API secret estão como fallback literal em `src/app/api/upload-image/route.ts`; o GTM ID está literal no layout. Precisam ser rotacionados independentemente desta migração.
7. **Duplicação de componentes.** Quatro filtros de categoria (`category-filter{,-v2,-v3,-ifood}.tsx`), três gerenciadores de imagem, três componentes de cupom, dois helpers `cn()`, duas raízes de componentes, duas rotas de cálculo de entrega.
8. **`orders.items` é JSONB desnormalizado.** Não existe `order_items`; relatório por produto varre JSON.
9. **Dependências mortas:** `firebase`, `multer`, `socket.io-client`, `dotenv`, `escpos`/`escpos-usb` — zero referências em `src/`.

### 1.5 Os três realtimes concorrentes

| Mecanismo | Onde | Chaveado por | Quem consome |
|---|---|---|---|
| `ws` standalone na :3001 | `websocket-server.js` | `storeSlug` | `POST /api/orders/create` chama seu `/notify` |
| socket.io `WebSocketManager` | `src/lib/websocket-server.ts` + `server.js` | `storeId` | `/api/websocket` |
| Supabase Realtime `postgres_changes` | `src/hooks/useGlobalOrderNotifications.ts` | `store_id` | painel admin |

Os três resolvem o mesmo problema: avisar o lojista que chegou pedido.

### 1.6 Integrações externas

| Integração | Situação |
|---|---|
| Supabase (Postgres · Auth · Realtime · RLS) | produção — **sai** |
| Cloudinary | produção — credenciais vazadas no código |
| WhatsApp | apenas deep-link `wa.me`. O `sendWhatsAppMessage()` do servidor é um stub vazio que retorna `true`. Não há Business API |
| ViaCEP | produção — busca de CEP |
| Nominatim / OpenStreetMap | produção — geocoding sem chave nem tratamento de rate limit (o docstring diz Google Maps; não é) |
| Google Tag Manager | produção, ID literal no código |
| Pagamentos | não existem — `payment_method` é só um rótulo no pedido |

---

## Parte 2 — O que muda ao entrar aqui

Dos dez não-negociáveis do [contrato raiz](../../AGENTS.md), quatro forçam reescrita real:

1. **Nunca `fetch` em componente.** O bee-link inteiro é `useEffect` + `fetch` + `useState`. Vira `src/services/<domínio>/<domínio>-requests.ts` + `<domínio>-hooks.ts` com TanStack Query e query keys como factory, conforme [state-and-data.md](../ai-rules/state-and-data.md).
2. **Um componente por arquivo, abaixo de 250 linhas.** Quatro arquivos do bee-link passam de mil linhas.
3. **Sem cores hardcoded.** As cores de marca por loja vêm do banco e são aplicadas em runtime como CSS custom properties — são valores dinâmicos, não literais, e por isso não colidem com o gate.
4. **O tipo do fio mora uma vez** em [packages/contracts](../../packages/contracts/AGENTS.md): só tipos, sem `enum`, importado com `import type`.

### 2.1 Os gates precisam aprender que `apps/bee-link` existe

[arch-gates.sh](../../scripts/arch-gates.sh) tem listas de path fixas: um app novo não é coberto por gate nenhum até ser acrescentado.

| Gate | Path a acrescentar |
|---|---|
| `web/no-fetch-in-components` | `apps/bee-link/src/components` |
| `web/no-hex-colors` | `apps/bee-link/src` |
| `web/no-web-storage` | `apps/bee-link/src` — ver §5.1 |

[docs-gate.sh](../../scripts/docs-gate.sh) reprova o primeiro commit de um workspace novo sem `apps/bee-link/AGENTS.md` (com `Root contract` nas cinco primeiras linhas, até 120 linhas), `apps/bee-link/CLAUDE.md`, e uma linha na tabela de workspaces de [docs/README.md](../README.md).

### 2.2 Versões

TypeScript `~6.0.3` · React exatamente `19.2.3` · Vitest exatamente `4.1.11` · Prisma `7.10.0` · Next `16.3.4`. O bee-link traz Next 15 e React 19.1: sobe para os pins daqui. Duas majors de Next num lockfile só não pagam o troco.

---

## Parte 3 — O schema novo

Os modelos do bee-link entram em `apps/api/prisma/schema.prisma` junto dos existentes, com as mesmas convenções: `uuid(7) @db.Uuid`, colunas camelCase com `@@map` snake_case, `createdAt`/`updatedAt`, `onDelete: Cascade`, `@@index` explícito, e comentários `///` que dizem a restrição.

As três decisões:

**Dinheiro é `Int` de centavos, em todo lugar.** Nenhum `Decimal`, nenhuma string, nenhuma heurística. O sufixo `Cents` na coluna existe para que a ambiguidade não volte por descuido.

**`order_items` vira tabela de verdade.** O painel tem uma página de relatórios de 764 LOC; relatório por produto sobre JSONB é varredura completa com extração de JSON. A objeção legítima — o pedido histórico não pode mudar quando o produto mudar — se resolve com colunas de fotografia (`nameSnapshot`, `unitPriceCents`) e `productId` opcional com `onDelete: SetNull`. Assim se tem índice e imutabilidade.

**Enum no Prisma, união de literais no contracts.** `packages/contracts` não pode exportar `enum`, então o contrato declara `type OrderStatus = "PENDING" | …` e o DTO valida com `@IsEnum` mais `satisfies`.

```prisma
enum StoreType     { ECOMMERCE RESTAURANT }
enum OrderStatus   { PENDING ACCEPTED PREPARING DELIVERING DELIVERED CANCELLED }
enum DeliveryType  { DELIVERY PICKUP }
enum PaymentMethod { MONEY PIX CREDIT_CARD DEBIT_CARD }
enum DiscountType  { PERCENTAGE FIXED }

/// A loja é o tenant. O slug é a chave pública: /<slug> é a vitrine, /admin/<slug> o painel.
model Store {
  id        String    @id @default(uuid(7)) @db.Uuid
  ownerId   String    @db.Uuid
  owner     User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  slug      String    @unique
  name      String
  type      StoreType @default(ECOMMERCE)
  /// Cores de marca, aplicadas em runtime como CSS custom properties — valores, não tokens.
  colors    Json
  latitude  Decimal?  @db.Decimal(10, 8)
  longitude Decimal?  @db.Decimal(11, 8)
  // … address, socialNetworks, layoutSettings, paymentMethods, printSettings (Json)

  @@index([ownerId])
  @@map("stores")
}

/// Preço em centavos inteiros. O legado guardava reais, centavos e "R$ 25,00" na mesma
/// coluna; aqui existe uma representação só.
model Product {
  id           String  @id @default(uuid(7)) @db.Uuid
  storeId      String  @db.Uuid
  store        Store   @relation(fields: [storeId], references: [id], onDelete: Cascade)
  priceCents   Int
  displayOrder Int     @default(0)
  available    Boolean @default(true)

  images ProductImage[]

  @@index([storeId, displayOrder])
  @@map("products")
}

/// Totais em centavos. O que o legado concatenava em `notes` são colunas de verdade;
/// `legacyNotes` guarda o texto original importado, intocado, para auditoria.
model Order {
  id               String        @id @default(uuid(7)) @db.Uuid
  storeId          String        @db.Uuid
  customerId       String        @db.Uuid
  status           OrderStatus   @default(PENDING)
  subtotalCents    Int
  deliveryFeeCents Int           @default(0)
  discountCents    Int           @default(0)
  totalCents       Int
  deliveryType     DeliveryType
  paymentMethod    PaymentMethod
  couponId         String?       @db.Uuid
  notes            String?
  legacyNotes      String?

  items OrderItem[]

  @@index([storeId, createdAt])
  @@index([storeId, status])
  @@map("orders")
}

/// Nome e preço são fotografia do momento da compra: o produto pode mudar ou sumir depois,
/// e o pedido histórico não muda junto. Por isso productId é opcional.
model OrderItem {
  id             String   @id @default(uuid(7)) @db.Uuid
  orderId        String   @db.Uuid
  order          Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId      String?  @db.Uuid
  product        Product? @relation(fields: [productId], references: [id], onDelete: SetNull)
  nameSnapshot   String
  unitPriceCents Int
  quantity       Int
  lineTotalCents Int

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}
```

Demais modelos, mesma forma: `StoreCategory` (taxonomia global), `ProductCategory` (por loja), `ProductImage`, `Customer` (`@@unique([storeId, phone])`), `DeliverySettings` (um por loja, valores em centavos), `Promotion`, `Coupon`, `CouponUsage`, `PromotionProduct`, `PromotionCategory`, `AnalyticsEvent`.

**O que não é migrado:** a coluna legada `products.image`, as rotas globais sem escopo de loja, os endpoints de debug, e as RPCs Postgres `validate_coupon` / `calculate_discount` / `increment_used_count` — regra de negócio vira TypeScript no service.

---

## Parte 4 — As fases

A ordem não é arbitrária, e três escolhas merecem razão:

- **Auth e stores são uma fase só**, porque não se separam: `Store.ownerId` referencia `User`, e toda checagem de dono das fases seguintes é `store.ownerId === currentUser.id`. É também a fase que prova o padrão inteiro de ponta a ponta no menor domínio possível — contrato → Prisma → módulo Nest → BFF → service/hook → bloco → screen → página — de modo que todo PR posterior copia um exemplo que funciona em vez de inventar.
- **Delivery vem antes de orders.** O checkout precisa da taxa para fechar o total, e o `orders/create` legado já valida o raio antes de inserir. Fazer orders primeiro seria fazer duas vezes.
- **Promotions vem depois de orders.** O cupom é opcional no checkout: orders entra com `couponId = null` e ganha cupons no PR seguinte sem mudança de schema — as colunas já estão lá.

O admin é fase própria, e não diluído nos domínios: cada fase de domínio entrega a **superfície mínima** de admin que a torna testável (uma lista, um formulário), e a fase 7 é a profundidade restante. É isso que mantém as fases anteriores do tamanho de um PR.

### Fase 0 — Bootstrap · 2 dias

`apps/bee-link` existe, vazio, e `pnpm ci-check` fica verde.

| Arquivo novo | Copiar de |
|---|---|
| `apps/bee-link/package.json` | `apps/web/package.json` — nome `bee-link`, porta 3002, mesmos pins |
| `apps/bee-link/tsconfig.json` · `eslint.config.mjs` · `vitest.config.mts` · `vitest.setup.ts` | os equivalentes de `apps/web` |
| `apps/bee-link/AGENTS.md` + `CLAUDE.md` | `apps/web/AGENTS.md`; o `CLAUDE.md` é literalmente `@AGENTS.md` |
| `apps/bee-link/docs/README.md` | `apps/web/docs/README.md` — o surface map |
| `apps/bee-link/src/lib/server-env.ts` | `apps/web/src/lib/server-env.ts` |
| `apps/bee-link/src/app/{layout.tsx,globals.css,page.tsx}` | `apps/web` — o `globals.css` só importa o do design system |

Editar na raiz: `package.json` (script `dev:bee-link`), `.changeset/config.json` (`"bee-link"` no `ignore`), `.github/workflows/ci.yml` (filtro no job `changes` + job espelhando o `web`), `scripts/arch-gates.sh` (os três paths de §2.1), `docs/README.md` (linha no mapa de workspaces).

**Três armadilhas que reprovam o primeiro commit**, todas no `apps/bee-link/AGENTS.md`:

- `Root contract` precisa estar nas **cinco primeiras linhas** (docs-gate g4).
- O arquivo tem teto de **120 linhas**, e o `next dev` acrescenta sozinho um bloco `<!-- BEGIN:nextjs-agent-rules -->` de ~8 linhas que reaparece se for removido. Orçar **≤ 105 linhas escritas à mão** e commitar o bloco injetado.
- O g5 extrai a frase em negrito de cada não-negociável da raiz e reprova repetição literal. Não escrever nenhuma destas: `The wire is typed once.`, `Server state is TanStack Query; client state is Zustand.`, `Loading is a skeleton.`, `No hardcoded colors.`, `Typed everything.`, `One component per file, under 250 lines.`, `English identifiers and comments.`, `Comments state constraints, not narration.`

**Ainda na fase 0, dividir o schema do Prisma.** `apps/api/prisma/schema.prisma` tem 70 linhas hoje; com os modelos da Parte 3 passa de 400. O Prisma 7 aceita uma pasta: mover para `apps/api/prisma/schema/{base,auth}.prisma` e apontar `schema: 'prisma/schema'` no `apps/api/prisma.config.ts`. Zero mudança de comportamento, um commit, e faz cada PR de domínio ser um arquivo novo em vez de um conflito de merge.

**Cookies com nome próprio:** `bl_access` / `bl_refresh`, não `hm_*`. Os dois apps podem vir a dividir um domínio pai.

**No CI, um job `e2e-bee-link` separado**, não estender o `e2e` existente — ele fixa `pnpm --filter web test:e2e` e um conjunto de env de service container. Copiar o job, trocar os filtros. O Playwright do bee-link usa portas **3102/3103**, porque `apps/web/playwright.config.ts` já reivindica 3100/3101.

**O `turbo.json` não precisa de mudança** — as tasks são genéricas por nome e o `build` já declara `env: ["API_URL"]`. Vale dizer isso explicitamente para ninguém "consertar".

Duas variáveis novas em `apps/api/.env.example`: **`BEE_LINK_URL`**, porque os e-mails de verificação e de redefinição de senha do lojista apontam para o bee-link e não para `WEB_URL`; e a origem do bee-link em `CORS_ORIGINS`, só para ferramental — o BFF é server-to-server e não passa por CORS.

Captura do schema atual, uma vez, como referência para escrever o `schema.prisma` à mão (não `prisma db pull`: o schema legado tem os defeitos de §1.4 e não queremos importá-los):

```bash
pg_dump --schema-only --no-owner --no-privileges "$SUPABASE_DB_URL" > /tmp/beelink-schema.sql
pg_dump --data-only   --no-owner                 "$SUPABASE_DB_URL" > /tmp/beelink-data.sql
```

### Fase 1 — Auth e stores · 5 dias · 2 PRs

`apps/api/src/modules/auth` é reusado como está. O que entra é o domínio `stores` e o vínculo `User → Store`.

**PR 1.1 — backend**

```
packages/contracts/src/store.ts            (+ export type * em src/index.ts)
apps/api/prisma/schema.prisma              (+ Store, StoreCategory, StoreLayout)
apps/api/prisma/migrations/<ts>_bee_link_stores/migration.sql
apps/api/src/modules/stores/
  ├── stores.module.ts · stores.controller.ts · stores.service.ts
  ├── store-ownership.guard.ts             ← a checagem hoje copiada em 25 rotas
  └── dto/{store.dto.ts, store.response.ts}
apps/api/src/app.module.ts                 (+ StoresModule)
apps/api/docs/README.md                    (+ linhas na tabela de endpoints)
```

Padrões a seguir literalmente: controller fino devolvendo a promise do service (`modules/users/users.controller.ts`), service lançando exceção Nest com `{ errorCode, message }` (`users.service.ts`), mapper `toStore(…) satisfies WireStore` (`modules/auth/user.mapper.ts`), DTO que `implements` o payload do contrato com os `@Transform` declarados no topo do módulo (`modules/auth/dto/auth.dto.ts`).

O `store-ownership.guard.ts` substitui 25 cópias da checagem de dono e fecha o buraco descrito em §1.4, item 5.

**PR 1.2 — frontend**

```
apps/bee-link/src/lib/{api,bff,session,session-cookies,refresh-session}.ts
apps/bee-link/src/proxy.ts                        ← de apps/web/src/proxy.ts
apps/bee-link/src/app/api/session/route.ts        (+ session/expired/route.ts)
apps/bee-link/src/app/api/auth/[action]/route.ts  ← allow-list, nunca proxy aberto
apps/bee-link/src/app/(admin)/layout.tsx          ← síncrono, com <Suspense>
apps/bee-link/src/app/(admin)/login/page.tsx
apps/bee-link/src/services/stores/{stores-requests,stores-hooks}.ts
apps/bee-link/src/components/stores/store-list-screen.tsx
apps/bee-link/src/locales/{messages,pt-BR,index}.ts
packages/ui/src/blocks/store/store-card.tsx  (+ .stories.tsx + .test.tsx)
```

**Pronto quando:** o lojista faz login e vê a lista das próprias lojas, servida pelo Nest, com e2e de Playwright passando.

### Fase 2 — Catálogo · 6 dias

`products`, `product_categories`, `product_images` e o upload assinado (a forma está na fase 8). As duplicações de §1.4, item 7, se consolidam aqui: quatro filtros de categoria viram um bloco, três gerenciadores de imagem viram um, e as rotas globais sem escopo de loja não são migradas.

Duas invariantes que o legado deixava para um trigger e passam a ser do banco: um índice único parcial `product_images (product_id) WHERE is_primary`, que **recusa** a escrita errada em vez de reescrever as outras linhas como o trigger fazia; e `@@unique([storeId, name])` em produtos e categorias.

### Fase 3 — Vitrine pública · 6 dias

As três faixas de §5.2, o SEO (metadata, `opengraph-image`, `sitemap`, `robots`), o ISR com tags, o cookie de carrinho (§5.1) e a injeção das cores da loja como CSS custom properties. É aqui que o `seo.spec.ts` nasce.

Ganho colateral: a vitrine de hoje renderiza a loja no servidor mas entrega os produtos a um `store-page-client.tsx` de 705 linhas marcado `"use client"`. A versão nova serve o catálogo no HTML — estritamente melhor para indexação do que o estado atual.

**Fase 3b, opcional · 2 dias:** o shadow só-leitura para uma loja-piloto (§5.3).

### Fase 4 — Delivery · 3 dias

`calculate-delivery` e `calculate-delivery-public` viram um service só; a diferença entre público e privado é o guard. Quilômetros viram metros inteiros, horas viram uma janela de minutos (`min`, `max`) — o legado guardava um número de horas e inventava a janela multiplicando por 0,3 e 1,0.

### Fase 5 — Orders, customers e checkout · 7 dias

`POST /api/orders/create` faz seis coisas em 382 linhas: resolve a loja, faz upsert do cliente, geocodifica o endereço, calcula o frete, monta o pedido e notifica. No Nest vira um `OrdersService.create()` orquestrando colaboradores injetados — `CustomersService`, `DeliveryService`, `PricingService`, `OrderNotifier` — nenhum acima de 250 linhas.

É aqui que dinheiro vira centavos, os metadados saem de `notes` para colunas, `order_items` nasce, e `Order.number` passa a ser sequencial por loja (alocado de `Store.orderSequence` dentro da mesma transação do insert — um fragmento de uuid não é algo que um cliente diga no telefone).

### Fase 6 — Promotions e coupons · 4 dias

As RPCs Postgres viram TypeScript no `PromotionsService`. Percentual vira **basis points** (`1000` = 10,00%), valor fixo vira centavos, e `discountType` diz qual é qual. `Coupon` ganha `storeId` denormalizado para que o código seja único por loja — duas promoções da mesma loja compartilhando um código tornavam o `validate-coupon` não determinístico. Corrigir o bug de `register-coupon-usage`, onde a RPC é passada inline dentro de `.update()`.

### Fase 7 — Profundidade do admin · 12 dias

A maior fase, e a que escorrega. O método está em §5.4.

### Fase 8 — SSE, analytics e impressão · 5 dias

Os três realtimes viram **um**: SSE no Nest (`@Sse()` funciona sobre o adapter Fastify), consumido por um `useOrderStream` no admin. Fastify já está lá, não precisa de processo extra nem de dependência nova, atravessa proxy e CDN sem upgrade de protocolo, e o caso de uso é unidirecional. E a auth se resolve sozinha: um `EventSource` cru não consegue mandar header `Authorization`, então o stream **tem** de passar pelo BFF, onde mora o cookie httpOnly — a regra se aplica sem precisar de exceção.

O limite, dito abertamente: um `Subject` em processo só distribui dentro de uma instância da API. Com uma instância — que é onde se começa e provavelmente onde se fica — está correto. O passo seguinte também não pede infraestrutura nova: `LISTEN`/`NOTIFY` do Postgres, com uma conexão dedicada assinando. Fica registrado como próximo passo **com gatilho** ("no dia em que a API rodar mais de uma instância"), não como trabalho de agora. Redis não é necessário.

A página de acompanhamento do pedido na vitrine pode abrir mão de realtime e fazer polling de 15s com `refetchInterval` — um cliente anônimo olhando um pedido não justifica uma conexão aberta por visitante.

**Upload muda de forma:** em vez de passar os bytes pelo Nest, o backend assina (`POST /api/uploads/signature`, autenticado e com checagem de dono) e o browser sobe direto para o Cloudinary, em pasta `bee-link/<storeId>`. O segredo nunca sai do processo da API, corpos de 5 MB não atravessam o event loop, e não é preciso adicionar `@fastify/multipart`. Isso também colapsa quatro componentes de imagem do legado em um bloco só.

Analytics passa a ser chaveado por `storeId` e não por `store_slug` — renomear uma loja orfanava todo o histórico dela. O IP cru sai e entra um `visitorHash` (SHA-256 do endereço mais um sal diário): conta visitante único sem guardar endereço, que é o que a tabela legada fazia sem nenhuma regra de retenção.

### Fases transversais — migração e deploy · 5 + 3 dias

Não são sequenciais: os scripts de migração (§5.3) começam cedo, porque os dry runs precisam de semanas de antecedência para que os relatórios de telefone duplicado e preço ambíguo sejam resolvidos com calma. O deploy (§5.6) precisa estar provado antes da fase 9 — inclusive o build de workspace pnpm na Vercel, que deve ser validado na fase 0 com o app vazio.

### Fase 9 — Cutover · 2 dias + 0,5 por loja

Ver §5.3.

### Fase 10 — Decomissionamento · 1 dia

Congelar o projeto legado na Vercel e mantê-lo em `legacy.beelink.beecoders.dev` por duas semanas. Dump final do Supabase para armazenamento frio, depois apagar o projeto e rotacionar tudo que ele guardava. Apagar os scripts de migração, dropar `legacyNotes` e a tabela de mapa de ids.

---

## Parte 5 — As decisões difíceis

### 5.1 O carrinho e o gate `web/no-web-storage`

O gate proíbe `localStorage` e `sessionStorage`. O racional documentado é sessão: tokens viajam só em cookie httpOnly. O carrinho do bee-link é Zustand com `persist`, e um carrinho não é sessão — mas o grep é cego a essa distinção. São 30 referências a web storage em 9 arquivos hoje.

**Preferir o cookie, não a exceção.** Persistir o carrinho num cookie **não-httpOnly**, com `path=/<slug>`, mantendo o store Zustand como fonte da verdade em memória e escrevendo no cookie a cada mudança. Três ganhos, nesta ordem:

1. O gate continua absoluto em zero — nenhuma exceção a manter, nenhum precedente aberto.
2. **Server Components passam a ler o carrinho.** O resumo do checkout vira server-rendered em vez de uma árvore client com flash de hidratação.
3. O carrinho sobrevive corretamente ao cache ISR da vitrine (§5.2), que é justamente onde um estado só-cliente costuma divergir do HTML servido.

O limite é 4 KB. Um carrinho de até ~20 linhas cabe se o cookie guardar `{productId, qty}` e não o produto inteiro — os nomes e preços vêm do catálogo, que já está em cache. **Medir antes de fechar:** serializar o maior carrinho plausível de uma loja real e conferir o tamanho.

**Se o cookie não couber**, o fallback é a exceção original: um arquivo só, `apps/bee-link/src/lib/cart-storage.ts`, como `--exclude` nomeado no gate, com o porquê em `apps/bee-link/AGENTS.md`. É exceção documentada, não baseline — mas é a segunda opção, não a primeira. As preferências de `sound-toggle` e `order-notification-badge` vão para um cookie `bl_prefs` do mesmo jeito.

### 5.2 A vitrine pública e a regra do BFF

A regra "o browser nunca chama a API" existe para proteger token — o sujeito dela é **o browser**. E o repo já prova a leitura: [apps/web/src/lib/session.ts](../../apps/web/src/lib/session.ts) chama `callApi({ path: "/users/me" })` direto de um Server Component, sem passar por route handler. O BFF existe para que o JavaScript da página não segure token, não porque código de servidor não possa falar com a API.

A vitrine é anônima e sensível a SEO: não tem token a proteger e precisa de HTML renderizado no servidor. Logo, não há tensão de verdade — há três faixas.

| Caminho | Como |
|---|---|
| Catálogo (`/<slug>`, `/<slug>/<productId>`) | Server Component chamando `callApi()` direto, com `next: { revalidate: 60 }`. Continua server-side e `API_URL` continua fora do bundle — a regra não é violada |
| Checkout: criar pedido, validar cupom, calcular frete | route handler BFF, com `refuseCrossOrigin()` e `clientIpOf()` — o rate limit do Nest precisa ver o IP do cliente, não o do servidor Next |
| Carrinho | client-side puro (§5.1) |
| Admin | igual ao `apps/web`: TanStack Query → BFF → Nest |

Endpoints públicos no Nest levam `@Public()` e `@RouteConfig({ rateLimit })`. A criação de pedido é o endpoint mais abusável do produto, e o rate limit por IP só funciona se o `clientIpOf()` do BFF preservar o endereço do cliente na travessia.

A leitura pública usa um `apps/bee-link/src/lib/public-api.ts` separado do `callApi`, porque `callApi` força `cache: "no-store"` — certo para sessão, errado para vitrine. Ele usa `next: { revalidate, tags }`, com as tags `store:<slug>` e `catalog:<slug>`. Um `apps/bee-link/src/lib/revalidate.ts` é o único chamador de `revalidateTag`, invocado por todo handler BFF do admin em resposta 2xx: o pior caso, se uma invalidação escapar, é catálogo velho por 60 segundos — o sistema degrada, não quebra.

**Um teste guarda essa faixa:** `seo.spec.ts` afirma que `/<slug>` devolve os nomes dos produtos **no HTML com JavaScript desligado**. Sem ele, uma refatoração futura que transforme a página em Client Component passa por todos os outros checks.

### 5.3 Migração de dados e cutover

O strangler é a sequência de desenvolvimento. A produção **não** pode ter domínios em bancos diferentes ao mesmo tempo: dual-write entre Supabase e o Postgres novo é mais arriscado que a própria migração. Então:

**Constrói-se por domínio; corta-se por loja.** São eixos diferentes, e confundi-los é o erro clássico deste tipo de migração.

- Durante as fases 1 a 8, o Postgres novo é populado por um import one-way repetível a partir do dump. Roda quantas vezes for preciso, sempre idempotente.
- O corte de produção é **por loja**, uma de cada vez, ~15 minutos cada — não um evento único. O mecanismo é um `rewrite` no `next.config.ts` do **app legado** mandando o slug migrado para a origem nova. É isso que dá o rollback: desfazer uma loja é remover uma linha e fazer um deploy.

Roteiro de cada loja: avisar o lojista e escolher um horário de baixa → colocar a loja em manutenção no legado → rodar o script de import para aquele `store_id` → rodar as queries de verificação → disparar o e-mail de senha daquele lojista → virar o rewrite do slug → checklist de fumaça → tirar a manutenção.

**A exceção que pode ser adiantada:** a leitura anônima. A vitrine é derivada, idempotente e sem sessão, então pode ser servida pelo stack novo para **uma loja-piloto** enquanto o legado ainda é dono de toda escrita, desde que um job de sincronização one-way mantenha o catálogo novo fresco. São ~2 dias de trabalho e compram tráfego real na superfície mais sensível a SEO antes de qualquer coisa irreversível. Vale se a loja-piloto tiver tráfego relevante; pular se não tiver.

O script vive em `apps/api/scripts/import-from-supabase.ts` — fora de `src/`, para não cair nos gates — e faz quatro coisas:

1. **Dinheiro vira centavos inteiros.** Não existe heurística segura, e vale admitir isso em vez de mascarar: um produto de R$ 5,00 gravado como `500` e um gravado como `5` são indistinguíveis pelo valor. Então o classificador tem três baldes confiantes e um ambíguo — tem parte fracionária (`25.50`) → reais; inteiro `>= 1000` → centavos; string com `R$` ou vírgula → reais; **inteiro entre 1 e 999 → ambíguo**. O balde ambíguo sai num CSV com `loja, produto, valor bruto, leitura em reais, leitura em centavos` **e a distribuição dos valores confiantes daquela loja**, para o lojista decidir com contexto. Não se adivinha em silêncio. Rodar isso em `--dry-run` semanas antes do corte, não na janela.
2. **Parsing de `orders.notes`.** O escritor legado produz exatamente seis linhas (`Tipo de entrega:`, `Forma de pagamento:`, `Taxa de entrega:`, `Cupom:`, `Subtotal:`, `Total Final:`), então o parser é **exato, não heurístico**, para tudo que o código atual escreveu. O que está acima da primeira linha reconhecida é a nota real do cliente; o que vem depois é metadado. O que não casar vai inteiro para `legacyNotes` e para o relatório de exceções.

   Duas restrições novas vão rejeitar dados legados e precisam de relatório **antes** da janela, não durante: `customers @@unique([storeId, phone])` (o legado criava um cliente por pedido quando a formatação do telefone variava — normalizar para dígitos, deduplicar, reapontar os pedidos) e `CouponUsage.orderId @unique` (o `register-coupon-usage` podia ser chamado mais de uma vez).
3. **Senhas não migram.** O Supabase guarda bcrypt no schema `auth`, inacessível pela API pública. Cada lojista recebe um e-mail de definição de senha pelo fluxo `RESET_PASSWORD` que já existe em `apps/api/src/modules/auth/email-token.service.ts`, disparado **dias antes** da janela, com validade estendida.
4. **Imagens não se movem.** As URLs do Cloudinary continuam válidas; o que muda é rotacionar as credenciais vazadas e passar a lê-las do `env.ts`.

Ensaio geral obrigatório: rodar o import inteiro contra um Postgres de staging, subir os dois apps contra ele e passar pelo checklist de fumaça antes de marcar a janela.

### 5.4 Os ~10 mil LOC de UI do admin

Reconstruir seis páginas client-side de 400 a 1.700 linhas como blocos de menos de 250 é onde um plano assim normalmente morre. A quebra:

- Cada página vira **um screen fino** em `apps/bee-link/src/components/<domínio>/` mais **N blocos apresentacionais** em `packages/ui/src/blocks/<domínio>/`, cada um com `.stories.tsx` e `.test.tsx` usando `expectNoA11yViolations`.
- Os blocos nascem **no Storybook, com dados falsos**, sem depender do backend do domínio estar pronto. É isso que permite rodar UI e API em paralelo dentro da mesma fase.
- O pior caso é `admin/[slug]/store/page.tsx`, 1.717 linhas: vira cerca de sete blocos — identidade, cores, endereço e CEP, redes sociais, layout, formas de pagamento, entrega — sob um bloco de abas.
- **Não migram:** os quatro filtros de categoria duplicados, os três gerenciadores de imagem, os três componentes de cupom, a pasta `src/app/components/` inteira (1.078 LOC de landing legada) e as páginas de debug. São 2 a 3 mil LOC cortadas antes de começar.

### 5.5 Delta Next 15 → 16

`middleware.ts` vira `src/proxy.ts`. `cookies()`, `headers()`, `params` e `searchParams` passam a ser async — afeta os dois Server Components da vitrine e todos os route handlers novos. `typedRoutes` gera `PageProps<"/…">` e `RouteContext<"/…">` via `next typegen`. Vale a regra 1 de [apps/web/AGENTS.md](../../apps/web/AGENTS.md): ler o guia em `node_modules/next/dist/docs/` antes de usar API de memória.

### 5.6 Deploy

Este repo não tem Dockerfile nem config de deploy — é greenfield. Proposta proporcional:

| Peça | Onde | Como |
|---|---|---|
| `apps/bee-link` | Vercel, onde o bee-link já vive | Root Directory `apps/bee-link`, install via workspace, `API_URL` como variável de servidor |
| `apps/api` | Railway ou Fly.io | `apps/api/Dockerfile` novo, multi-stage com `pnpm deploy --filter api --prod`; `prisma migrate deploy` no release |
| Postgres | managed, no mesmo provedor da API | `DATABASE_URL` só no backend |
| DNS | `app.beelink.beecoders.dev` | aponta para o deploy novo na janela; o antigo fica de pé 48 h para rollback |

O `docker-compose.yml` da raiz já serve dev e CI; só acrescentar um database `beelink` se quiser isolar do `harness`.

---

## Parte 6 — Verificação

```bash
pnpm install
pnpm ci-check                    # type-check · lint · test · arch-gates · docs-gate
pnpm arch-gates                  # isolado, ao editar os paths dos gates
pnpm docs-gate                   # isolado, ao criar AGENTS.md / CLAUDE.md
pnpm db:up && pnpm --filter api exec prisma migrate dev --name <what>
pnpm turbo type-check lint build --filter=bee-link
pnpm stack:up && pnpm --filter api test && pnpm --filter api test:e2e
```

Testes a acrescentar, nos padrões que já existem:

- **API unit** — `apps/api/src/modules/stores/stores.service.spec.ts`, no padrão de `modules/auth/jwt-auth.guard.spec.ts`: colaboradores construídos à mão, sem Nest testing module.
- **API e2e** — `apps/api/test/stores.e2e-spec.ts`, com `test/support/create-test-app.ts` e `reset-database.ts`. Cobertura mínima de ownership: o lojista A não consegue editar a loja de B. É o bug de §1.4, item 5, virando teste.
- **Web unit** — `apps/bee-link/src/app/api/session/route.test.ts`, no padrão de `apps/web/src/app/api/session/route.test.ts`.
- **Web e2e** — `storefront.spec.ts` (vitrine anônima até a mensagem do WhatsApp), `admin-journey.spec.ts` e `accessibility.spec.ts`, com portas dedicadas como em `apps/web/playwright.config.ts`.

Checklist de fumaça do cutover, rodado no ensaio **e** na janela:

1. Lojista entra com a senha recém-definida e vê só as próprias lojas.
2. A vitrine de cada loja carrega com produtos, imagens e preços conferindo com o legado.
3. Pedido de ponta a ponta: carrinho, CEP, frete, cupom, confirmação, notificação no painel.
4. Os valores do pedido batem ao centavo com o mesmo pedido feito no legado.
5. Pedidos históricos aparecem na busca por telefone.
6. Mudança de status no painel chega ao cliente.
7. `GET /api/health` responde; o Swagger não está no ar em produção.
8. Nenhuma credencial antiga do Cloudinary funciona mais.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Dinheiro migrado errado — três representações e heurística legada | Import com relatório CSV de divergências, conferência manual antes do corte, item 4 do checklist comparando ao centavo |
| Perda de informação no parsing de `notes` | O texto original íntegro fica em `legacyNotes`; nada é destruído |
| Lojista trancado fora após o corte, já que a senha não migra | E-mails de definição de senha disparados dias antes, validade estendida, canal de suporte na janela |
| **A fase 7 escorregar** — o admin é um quinto do esforço total | Fatiar por aba e não por página; a tabela de inventário de ~40 linhas; quatro arquivos por commit; capturar as telas legadas antes de começar, para que "pronto" seja comparação e não opinião |
| A fase 5 (orders) escorregar — é o núcleo do negócio | Blocos de UI construídos no Storybook em paralelo à API; é a fase que vale quebrar em três PRs |
| Gates nascerem com baseline alto | Nenhum baseline. É justamente por isso que a estratégia é reescrita e não lift-and-shift |
| Rate limit do Nominatim na vitrine | Geocoding só no admin, no cadastro do endereço da loja; o frete usa a lat/lng já gravada |
| Um lojista fica trancado fora | Token de migração de 7 dias; aviso por WhatsApp na véspera; um `set-owner-password.ts` como escape por telefone; corte uma loja de cada vez, em horário de baixa |
| `customers @@unique([storeId, phone])` rejeitar dados reais — o legado criava um cliente por pedido quando o telefone vinha formatado diferente | Normalizar, deduplicar e reapontar no dry run, semanas antes. É relatório, não falha em runtime no meio da janela |
| Alguém acrescentar um baseline no `arch-gates.sh` no meio da migração | Acrescentar os paths na **fase 0**, com o diretório vazio. `baseline_for()` fica 0 para tudo. Um gate com baseline deixa de significar qualquer coisa, permanentemente |
| Queda de ranking no SEO após a virada | As URLs não mudam; `seo.spec.ts` afirma conteúdo server-rendered com JS desligado; conferir no Search Console antes da segunda loja |
| O build de workspace pnpm falhar na Vercel por causa do `node-linker=hoisted` | Provar o build da Vercel na **fase 0**, com o app vazio — não na fase 9, com o produto inteiro |
| Rollback | Rewrite por loja no `next.config.ts` do legado: desfazer é remover uma linha e deployar. Dump do Supabase antes de cada corte; 14 dias de janela reversível, depois só para frente |

## Esforço

Um desenvolvedor, dias de trabalho focado.

| Fase | Escopo | Dias |
|---|---|---:|
| 0 | Bootstrap, gates, CI, split do schema, `pg_dump`, rotação do Cloudinary, deletar `POST /api/products` | 2 |
| 1 | Auth + stores — é o PR que estabelece o padrão, e por isso mais lento que os seguintes | 5 |
| 2 | Catálogo: categorias, produtos, imagens, upload assinado | 6 |
| 3 | Vitrine pública: as três faixas, SEO, ISR, cookie de carrinho, injeção das cores da loja | 6 |
| 3b | *(opcional)* shadow só-leitura + job de sync para a loja-piloto | 2 |
| 4 | Delivery: settings, geocoding, Haversine, taxa | 3 |
| 5 | Orders + customers + checkout + mensagem de WhatsApp | 7 |
| 6 | Promotions + coupons | 4 |
| 7 | **Profundidade do admin** — as seis abas de loja, as três de produto, o board de pedidos, relatórios (~40 arquivos) | 12 |
| 8 | SSE, analytics, impressão | 5 |
| M | Scripts de migração, dry runs, CSV dos preços ambíguos, revisão do lojista | 5 |
| D | Deploy: Dockerfile, Fly, Postgres gerenciado, Vercel, workflow, `docs/repo/deploy.md` | 3 |
| 9 | Cutover: primeira loja + as demais | 2 + 0,5/loja |
| 10 | Decomissionamento, apagar scripts, dropar `legacyNotes` e o mapa de ids | 1 |
| | **Total** | **≈ 61 + 0,5/loja** |

Em ritmo realista, **três a quatro meses de calendário** — não as sete semanas que uma leitura só das fases sugere. A fase 7 sozinha é um quinto do total e é a que escorrega; a tabela de inventário (§5.4) é o instrumento que torna o atraso visível na primeira semana em vez da oitava.

## Não coberto

- Pagamentos online. Hoje não existem; `payment_method` é só um rótulo.
- WhatsApp Business API. Hoje é deep-link `wa.me` e o stub do servidor não envia nada.
- App mobile do bee-link.
- Impressão térmica via USB de verdade — hoje só se gera o texto ESC/POS.

---

## Apêndice — 2026-09-20 · o alvo mudou antes da fase 0 terminar

*Acrescentado no mesmo dia em que o plano foi escrito, depois de executar a fase 0. O corpo acima fica como estava: ele registra a decisão daquele momento, e é por isso que continua útil. O que segue é o que mudou, e o que no plano ficou sem efeito por causa disso.*

### 1. O alvo é um repositório de produto, não um app dentro do template

O plano assume que o bee-link entra **no** `harness-monorepo`, como um workspace novo ao lado de `apps/web` e `apps/mobile`. Não é mais isso.

O `harness-monorepo` é **template**: o ponto de partida reutilizável para projetos novos, e tem de continuar limpo. O bee-link passou a viver em `beelink-monorepo`, um clone do template com `origin` apontando para o repo do produto e `template` apontando para o harness — de modo que melhoria de harness continua subindo lá e descendo por merge aqui, e decisão de produto não contamina o template.

Consequência prática para quem lê o plano: onde ele diz "este repo", leia "o template"; onde ele diz "o repositório novo", leia "este".

### 2. `apps/web` **é** o app web do bee-link — não existe `apps/bee-link`

A decisão da Parte 4, Fase 0 — criar um workspace `apps/bee-link` — foi abandonada. O app web do template virou o app web do bee-link, mantendo o nome `web`, porque o nome é o que os filtros do turbo, os jobs de CI, o `playwright.config.ts` e todo documento do repo já dizem. Não há um segundo app web do qual desambiguar.

O que isso anula, item por item:

- **A tabela de arquivos novos da Fase 0** some quase inteira. Não há `apps/bee-link/package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.mts`, `AGENTS.md`, `CLAUDE.md` nem `docs/README.md` a criar: os de `apps/web` já existem e foram reescritos para o bee-link. O que sobrou de real na fase 0 foi `src/lib/public-api.ts`, `src/lib/revalidate.ts`, o matcher invertido do `src/proxy.ts`, os cookies `bl_*` e os locales — tudo dentro de `apps/web`.
- **§2.1, "os gates precisam aprender que `apps/bee-link` existe", não se aplica.** Os três gates de `arch-gates.sh` já apontam para `apps/web/src`; não há path novo a acrescentar, e portanto não há o risco — listado em Riscos — de alguém introduzir baseline num gate. O `baseline_for()` continua zero para tudo.
- **O `docs-gate` também não pede nada novo.** `apps/web/AGENTS.md` e `apps/web/CLAUDE.md` já existiam; a linha no mapa de workspaces de [docs/README.md](../README.md) já existia. As três armadilhas da Fase 0 (o cabeçalho `Root contract` nas cinco primeiras linhas, o teto de 120 linhas com o bloco que o `next dev` injeta, e o g5 que reprova repetição literal das frases em negrito da raiz) continuam valendo — só que para a reescrita de `apps/web/AGENTS.md`, não para um arquivo novo.
- **A porta 3002 e o script `dev:bee-link` não existem.** O app serve em `3000`, por `pnpm dev:web`.
- **O job `e2e-bee-link` separado no CI não é necessário.** O job `e2e` existente já roda `pnpm --filter web test:e2e`, e `web` é o bee-link. Pela mesma razão, as portas 3102/3103 do Playwright ficam sem uso: 3100/3101 continuam sendo as do único app.
- **A entrada `"bee-link"` no `ignore` do `.changeset/config.json` não é necessária** — `web` já está lá.
- **A objeção "o `apps/api` serve dois produtos" desaparece por completo.** Este repositório tem um produto só. Os módulos de domínio das fases 1 a 8 entram no `apps/api` sem a pergunta de para quem cada endpoint responde, e `apps/api/src/modules/auth` continua sendo reusado como está.

### 3. `apps/mobile` foi removido deste repositório

O app Expo do template não tem papel no bee-link — a seção "Não coberto" já dizia que não há app mobile do bee-link — e foi apagado junto com o job de CI, o gate `mobile/no-web-imports`, o script `dev:mobile` e o changeset pendente que versionava aquele pacote. Ele continua existindo no `harness-monorepo`, e volta por merge do remote `template` no dia em que houver um app mobile.

Ficou uma decisão em aberto por causa disso: o `.npmrc` ainda é `node-linker=hoisted`, e a razão de existir era o Metro do Expo. Está registrada como armadilha 1 do [contrato raiz](../../AGENTS.md), e é melhor resolvida **antes** do primeiro `pnpm install` deste clone do que no meio de um PR de domínio.

### 4. `BEE_LINK_URL` não é mais necessária — e nem a origem extra em `CORS_ORIGINS`

A Fase 0 pede duas variáveis novas em `apps/api/.env.example`: `BEE_LINK_URL`, porque os e-mails de verificação e de redefinição de senha do lojista apontariam para o bee-link e não para o `WEB_URL`; e a origem do bee-link acrescentada a `CORS_ORIGINS`. **A frase inteira fica sem efeito**, e as duas variáveis não devem ser criadas.

Ambas eram artefato do alvo de dois apps. Com `apps/web` sendo o bee-link, `WEB_URL` **já** aponta para o bee-link: `src/shared/mail/mail.service.ts` monta os dois links a partir de `env.WEB_URL` e de mais nada, `env.ts` declara uma única origem web, e `CORS_ORIGINS` já tem o mesmo `http://localhost:3000`. Uma `BEE_LINK_URL` seria um segundo nome para a mesma origem — configuração morta, que diverge na primeira vez que alguém mudar só uma das duas.

### 5. O split do schema do Prisma está feito

`apps/api/prisma/schema.prisma` virou `apps/api/prisma/schema/{base,auth}.prisma`, com `schema: 'prisma/schema'` no `apps/api/prisma.config.ts`. Verificado com o CLI real: `prisma validate` carrega a pasta, e `migrate diff --from-empty` produz SQL idêntico ao da versão de arquivo único. Zero mudança de comportamento, nenhuma migration nova, e cada PR de domínio passa a ser um arquivo novo em vez de um conflito de merge — que era exatamente o objetivo.

### 6. "Antes de tudo": um dos três está feito

| Item | Estado |
|---|---|
| Apagar `src/app/api/products/route.ts` do bee-link legado | **feito** — a rota destrutiva sem autenticação não existe mais. Confirmado que nada em `src/` a referenciava |
| Rotacionar as credenciais do Cloudinary e apagar o par antigo | **aberto.** Continua sendo o item mais urgente dos três: as credenciais estão no histórico do git, e o app legado fica no ar por meses |
| Tirar o `pg_dump` | **aberto.** Enquanto não sair, o que se sabe do schema legado é o levantamento em `docs/legacy-schema-notes.md` do repo legado, que é registro de salvamento e não a verdade — ele mesmo lista as contradições que só o dump resolve |

Correção de fato, enquanto se está aqui: o plano fala em "11 `.sql` soltos" na raiz do bee-link. Eram **9** rastreados (`git ls-files '*.sql'`). O raciocínio da Parte 3 que se apoia nesse número deve ser conferido contra o levantamento, não contra a contagem.
