# packages/ui — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── styles/globals.css     # tokens (light + dark), base layer, @source for this package
├── lib/utils.ts           # cn()
├── components/            # 24 shadcn primitives, written by `shadcn add` (base-nova, Base UI)
├── hooks/                 # the hooks the primitives share
├── locales/               # every sentence a block renders, pt-BR and en, behind one interface
├── test/a11y.ts           # axe assertion shared by every block test
└── blocks/               # every block has a story and a test — no exceptions, no baseline
    ├── auth/              # the shared card and link · login · signup · forgot · reset · verify
    ├── dashboard/         # the shell: sidebar · its three navs · header · cards · chart
    └── store/             # the shop list and the shop's settings, one block per tab
.storybook/                # Vite · Tailwind 4 · a11y · light/dark toggle
```

## Blocks

Every block takes its data, its callbacks and its links through props, which is why each one renders in Storybook with no server behind it.

| Block | Props that matter | Story |
|---|---|---|
| `blocks/auth/login-form` | `onSubmit`, `pending`, `error`, `signupHref`, `forgotPasswordHref` | Blocos/Autenticação/Entrar |
| `blocks/auth/signup-form` | `onSubmit`, `pending`, `error`, `loginHref` | Blocos/Autenticação/Criar conta |
| `blocks/auth/forgot-password-form` | `onSubmit`, `pending`, `sent` | Blocos/Autenticação/Esqueci a senha |
| `blocks/auth/reset-password-form` | `onSubmit`, `pending`, `error` | Blocos/Autenticação/Nova senha |
| `blocks/auth/verify-email-status` | `state`, `onResend`, `resent` | Blocos/Autenticação/Confirmação de e-mail |
| `blocks/auth/auth-card` | `title`, `description`, `error`, `footer` | Blocos/Autenticação/Moldura |
| `blocks/auth/auth-shell` | `homeHref`, `photos` (slots for the app's images), `children` — the landing's ground, a "Voltar para o site" link and Beelink's mark around the signed-out screens; with `photos`, a wide screen splits in two, and two or more pass in `auth-photos` | Blocos/Autenticação/Fundo |
| `blocks/auth/auth-photos` | `photos`, `label`, `position`, `pace` — the photos as a carousel that passes by itself: no arrows, a dot for each; still under a pointer, with the focus inside, and under reduced motion | Blocos/Autenticação/Fotos |
| `blocks/auth/auth-link` | `href`, plus whatever a primitive injects | Blocos/Autenticação/Link injetado |
| `blocks/dashboard/app-sidebar` | `user`, `onSignOut`, `navMain`, `activeHref` | Blocos/Painel/Barra lateral |
| `blocks/dashboard/nav-main` | `items`, `activeHref`, `linkComponent` | Blocos/Painel/Navegação principal |
| `blocks/dashboard/nav-secondary` | `items`, `linkComponent` | Blocos/Painel/Navegação secundária |
| `blocks/dashboard/nav-user` | `user`, `onSignOut`, `signingOut` | Blocos/Painel/Conta |
| `blocks/dashboard/site-header` | `title`, `actions` | Blocos/Painel/Cabeçalho |
| `blocks/dashboard/section-cards` | `cards` | Blocos/Painel/Cartões |
| `blocks/dashboard/chart-area-interactive` | `data`, `title`, `description` | Blocos/Painel/Gráfico |
| `blocks/store/store-card` | `store`, `panelHref`, `storefrontHref` | Blocos/Loja/Cartão da loja |
| `blocks/store/store-empty-state` | `createHref` | Blocos/Loja/Sem lojas |
| `blocks/store/store-list-skeleton` | `count` | Blocos/Loja/Esqueleto da lista |
| `blocks/store/store-create-form` | `defaultValues`, `onSubmit`, `categories`, `colorPresets`, `onZipCodeLookup`, `onImageUpload`, `pending`, `error` | Blocos/Loja/Criar loja |
| `blocks/store/store-settings-form` | `slug`, `defaultValues`, `onSubmit`, `categories`, `onZipCodeLookup`, `onImageUpload`, `pending`, `error`, `extraTabs` | Blocos/Loja/Configurações da loja |
| `blocks/store/store-settings-skeleton` | — | Blocos/Loja/Esqueleto das configurações |
| `blocks/store/store-identity-fields` | `value`, `onChange`, `slug`, `onSlugChange`, `slugError`, `categories`, `onLogoUpload`, `errors` | Blocos/Loja/Aba informações básicas |
| `blocks/store/store-address-fields` | `value`, `onChange`, `onZipCodeLookup`, `lookupPending` | Blocos/Loja/Aba endereço |
| `blocks/store/store-social-fields` | `value`, `onChange`, `errors` | Blocos/Loja/Aba redes sociais |
| `blocks/store/store-colors-fields` | `value`, `onChange`, `presets`, `errors` | Blocos/Loja/Cores da loja |
| `blocks/store/store-payment-methods-fields` | `value`, `onChange`, `error` | Blocos/Loja/Aba pagamento |
| `blocks/store/store-image-field` | `id`, `label`, `value`, `onChange`, `onUpload`, `pending`, `previewAlt`, `aspect` | Blocos/Loja/Campo de imagem |
| `blocks/store/store-color-field` | `id`, `label`, `value`, `onChange`, `pickerSuffix` | Blocos/Loja/Campo de cor |
| `blocks/store/store-color-preview` | `colors` | Blocos/Loja/Prévia das cores |
| `blocks/landing/landing-shell` | `children` — the brand's ground and `--font-brand` | Blocos/Landing |
| `blocks/landing/beelink-logo` | `variant` (`full` or `icon`), `label` — the official logo; the landing, the auth screens and the panel's bar draw it | Blocos/Landing → Logo |
| `blocks/landing/brand-lines` | `className` — the two yellow lines of the corner | Blocos/Landing → Linhas |
| `blocks/landing/landing-header` | `loginHref`, `signupHref`, `termsHref`, `privacyHref`, `homeHref` | Blocos/Landing → Topo e hero |
| `blocks/landing/landing-menu` | `label`, `sections`, `pages`, `signIn`, `createStore` — the header's links below `xl`, a `<details>` | Blocos/Landing → Topo no celular |
| `blocks/landing/landing-hero` | `signupHref` (draws `landing-hub` from `xl`) | Blocos/Landing → Topo e hero |
| `blocks/landing/landing-banners` | `signupHref`, `exampleHref`, `photos` (`store`, `panel`, `shipping`: slots for the app's images, drawn behind each banner's words under a scrim of its ground; the panel's alt is `banners.panel.alt`) — over `landing-rail`; the panel's banner is two banners wide from `xl`; no banner moves under the pointer, its photo zooms | Blocos/Landing → Banners |
| `blocks/landing/landing-ecosystem` | — | Blocos/Landing → Ecossistema |
| `blocks/landing/landing-steps` | — | Blocos/Landing → Passos |
| `blocks/landing/landing-couriers` | `photo` (a slot for the app's image), `termsHref`, `privacyHref` (holds `landing-courier-form`; the photo fades under it) | Blocos/Landing → Entregadores |
| `blocks/landing/landing-courier-form` | `termsHref`, `privacyHref`, `text` (its own slice of the dictionary) — validates, sends nothing | Blocos/Landing → Formulário do entregador |
| `blocks/landing/landing-faq` | — | Blocos/Landing → Perguntas |
| `blocks/landing/landing-posters` | `busStop`, `wall` — slots for the app's own images, framed side by side; their alt texts are `landing.posters.*Alt` | Blocos/Landing → Pôsteres |
| `blocks/landing/landing-cta` | `signupHref` | Blocos/Landing → Chamada e rodapé |
| `blocks/landing/landing-footer` | `termsHref`, `privacyHref`, `year` | Blocos/Landing → Chamada e rodapé |
| `blocks/cashback/cashback-settings-form` | `value`, `onChange`, `onSubmit`, `issues`, `example`, `pending`, `error`, `saved` — the rules as typed (`lib/cashback`) | Blocos/Painel/Cashback |
| `blocks/cashback/cashback-owed` | `owed`, `money` — what the shop owes in credit | Blocos/Painel/Cashback |
| `blocks/cashback/customer-cashback` | `cashback`, `money`, `date`, `onAdjust`, `adjustment`, `pager` — a customer's balance and statement | Blocos/Painel/Cashback → Na ficha do cliente |
| `blocks/cashback/cashback-adjust-form` | `value`, `onChange`, `onSubmit`, `onCancel`, `issues`, `error` | Blocos/Painel/Cashback → Ajuste manual |
| `blocks/cashback/order-cashback` | `cashback`, `money`, `date` — drawn by `orders/order-detail` | Blocos/Painel/Cashback → No pedido |
| `blocks/integrations/integration-list` | `rows` (`lib/integrations`, or `"loading"`), `newHref`, `linkComponent` — the shop's connections, a row each to its own page; empty, the way to add one | Blocos/Painel/Integrações → Lista |
| `blocks/integrations/integration-catalog` | `options` (`lib/integrations`), `linkComponent` — what there is to connect, a card each; a connected one leads to its page. Icons and copy by provider in `integration-providers.ts` | Blocos/Painel/Integrações → Nova integração |
| `blocks/integrations/melhor-envio-card` | `view` (`lib/integrations`), `connectHref`, `onDisconnect`, `disconnecting`, `disconnectError`, `headingAs` (`h1` on its own page) — connect, whose account, the wallet, the reconnect warning; asks before disconnecting. "Conectar" is a plain `<a>`: a router link would prefetch a route that begins an authorization | Blocos/Painel/Integrações |
| `blocks/integrations/shipping-settings-form` | `value`, `onChange`, `onSubmit`, `services` (`"loading"`, `"failed"` or the list), `issues`, `pending`, `error`, `saved` — services by carrier, days to post, default parcel | Blocos/Painel/Integrações |
| `blocks/integrations/integrations-result` · `integrations-skeleton` · `integrations-failed` | `tone`, `message` · — · `onRetry` | Blocos/Painel/Integrações |
| `blocks/delivery/delivery-settings-form` | `value`, `onChange`, `onSubmit`, `issues`, `previews`, `pickupAddress`, `map` (`lib/delivery`), `carriers`, `connectHref`, `manageHref`, `linkComponent`, `pending`, `error`, `saved` — the store settings' Delivery tab: pickup, own delivery by distance bands with the radius on the map, carriers; its own save | Blocos/Entrega/Aba Entrega |
| `blocks/delivery/delivery-mode-card` · `delivery-band-rows` · `delivery-carriers` · `delivery-settings-skeleton` | `title`, `checked`, `onCheckedChange`, `children` · `rows`, `onChange`, `issues`, `previews` · `view`, `connectHref`, `manageHref` · — | Blocos/Entrega |
| `blocks/orders/order-label-card` · `order-label-form` | `view` (`lib/label`), `value`, `onChange`, `onBuy`, `onPrint`, `onCancel`, `issues`, `pending`, `error`, `linkComponent` — an order's shipping label (BEELINK-187): what stands in the way, the box and the invoice key, the wallet, then its tracking, print and a cancel asked twice | Blocos/Pedidos/Etiqueta de envio |

`auth-link` is the default every block navigates with until an app passes `next/link`. It is one line, and its test is still
the longest of the three it has: a link component that swallowed the extra props would drop the `aria-current` the sidebar
injects, and the page would look right while telling a screen reader nothing.

The form blocks validate shape only — a well-formed e-mail, a long-enough password, six hexadecimal digits. Whether the account exists, or the slug is taken, is the API's answer, and it arrives as the `error` prop, already a sentence.

The `store-*-fields` blocks are the panels of one form, not five forms: `store-settings-form` owns the react-hook-form instance and `PUT /stores/:slug` replaces the shop whole, so a tab that saved on its own would clear what the others hold. A save refused by the schema opens the first tab that refused it. `extraTabs` are the exception that proves it: a tab the screen owns whole, with its own route and its own save (the Delivery tab, BEELINK-177), drawn in the same row but outside the `<form>`. The look of the shop — layout, banner, colours — is design mode's, not a tab here; the screen echoes it back on save.

The landing's blocks wear **Beelink's own brand**, not the panel's and not a shop's: the `brand-*` tokens in `globals.css` (a cream ground, one yellow, black) and the typeface the screen hands over as `--font-brand`. Their copy is `messages.landing`, a heading in two weights arriving as two strings. `beelink-logo` is the official logo, traced from the artwork as one path: it takes the colour of the text around it, and its holes show the ground. `beelink-mark` is the older mark without the bag, still drawn inside the page (the hub, the hexagons, the phone, the last call). `landing-rail` is the banners' row, on `storefront/scroll-rail`'s reasoning: native scrolling first, arrows and dots on top — and the dots count the places the row stops at, which on a wide screen are fewer than its banners; a stop is a banner's own start, since the panel's banner is wider than the other two. The two client blocks, `landing-rail` and `landing-courier-form`, import no dictionary and take only their own sentences: what a Client Component is handed is written into the page. `landing-shell` draws every focus ring below it, in the colour `--landing-focus` names, which a black ground sets to a light one.

`store-create-form` composes the same panels over `POST /stores`, which accepts less: no layout, no banner and no payment methods, so its appearance tab is `store-colors-fields` alone. Two things it does that the settings form cannot. The slug is **editable** — `store-identity-fields` shows it read-only until a screen passes `onSlugChange` — and is proposed from the name by `slugify` until the shopkeeper touches it, so a shop whose address is taken is renamed rather than abandoned. And each tab carries an icon **and** a screen-reader sentence when it holds a refused field: a create submitted from the first tab that fails on the fourth otherwise refuses in silence, and a coloured dot alone is not a verdict.

`store-image-field` is the whole of what this package knows about uploads: it takes the URL the shop has now, an `onUpload(file) => Promise<string>` and a pending flag, and it never learns where the bytes go. The file input is a real, labelled `<input type="file">` — not a div with a click handler, which is a keyboard trap and the classic axe failure — and with no `onUpload` wired up the block degrades to its address field, which is how it stands in Storybook. `store-settings-form` takes `onImageUpload` for the logo, as `store-create-form` does.

A shop's colours are **data**, not tokens: `store-color-field` renders the value it is handed and reports a change back, and `store-color-preview` and the palette swatches apply the values as CSS custom properties through an inline style. No block here contains a colour, which is what keeps `web/no-hex-colors` at zero. The sample palettes live in `store-palettes.json` and reach `store.fixtures.ts` as data: `arch-gates.sh` passes `--include='*.ts' --include='*.tsx'` to grep, so a `.json` file is out of scope — and legitimately so, because it holds no className, no `style` attribute and no component, and therefore cannot be the thing the gate exists to catch. Assembling a literal from its digits inside a `.ts` file would be the dodge, since that file can still paint something. The named themes a shopkeeper picks from arrive through the `presets` prop, because their names are copy the API owns.

## Commands

| Command | What it does |
|---|---|
| `pnpm storybook` | http://localhost:6006 |
| `pnpm --filter @harness-monorepo/ui test` | component tests, each with axe |
| `pnpm --filter @harness-monorepo/ui build-storybook` | the static build CI runs |
