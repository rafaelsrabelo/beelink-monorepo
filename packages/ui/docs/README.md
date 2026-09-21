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
| `blocks/store/store-settings-form` | `slug`, `defaultValues`, `onSubmit`, `categories`, `colorPresets`, `onZipCodeLookup`, `onImageUpload`, `pending`, `error` | Blocos/Loja/Configurações da loja |
| `blocks/store/store-settings-skeleton` | — | Blocos/Loja/Esqueleto das configurações |
| `blocks/store/store-identity-fields` | `value`, `onChange`, `slug`, `onSlugChange`, `slugError`, `categories`, `onLogoUpload`, `errors` | Blocos/Loja/Aba informações básicas |
| `blocks/store/store-address-fields` | `value`, `onChange`, `onZipCodeLookup`, `lookupPending` | Blocos/Loja/Aba endereço |
| `blocks/store/store-social-fields` | `value`, `onChange`, `errors` | Blocos/Loja/Aba redes sociais |
| `blocks/store/store-appearance-fields` | `value`, `onChange`, `presets`, `colorErrors`, `onBannerUpload` | Blocos/Loja/Aba aparência |
| `blocks/store/store-colors-fields` | `value`, `onChange`, `presets`, `errors` | Blocos/Loja/Cores da loja |
| `blocks/store/store-payment-methods-fields` | `value`, `onChange`, `error` | Blocos/Loja/Aba pagamento |
| `blocks/store/store-image-field` | `id`, `label`, `value`, `onChange`, `onUpload`, `pending`, `previewAlt`, `aspect` | Blocos/Loja/Campo de imagem |
| `blocks/store/store-color-field` | `id`, `label`, `value`, `onChange`, `pickerSuffix` | Blocos/Loja/Campo de cor |
| `blocks/store/store-color-preview` | `colors` | Blocos/Loja/Prévia das cores |

`auth-link` is the default every block navigates with until an app passes `next/link`. It is one line, and its test is still
the longest of the three it has: a link component that swallowed the extra props would drop the `aria-current` the sidebar
injects, and the page would look right while telling a screen reader nothing.

The form blocks validate shape only — a well-formed e-mail, a long-enough password, six hexadecimal digits. Whether the account exists, or the slug is taken, is the API's answer, and it arrives as the `error` prop, already a sentence.

The `store-*-fields` blocks are the panels of one form, not five forms: `store-settings-form` owns the react-hook-form instance and `PUT /stores/:slug` replaces the shop whole, so a tab that saved on its own would clear what the others hold. A save refused by the schema opens the first tab that refused it.

`store-create-form` composes the same panels over `POST /stores`, which accepts less: no layout, no banner and no payment methods, so its appearance tab is `store-colors-fields` alone. Two things it does that the settings form cannot. The slug is **editable** — `store-identity-fields` shows it read-only until a screen passes `onSlugChange` — and is proposed from the name by `slugify` until the shopkeeper touches it, so a shop whose address is taken is renamed rather than abandoned. And each tab carries an icon **and** a screen-reader sentence when it holds a refused field: a create submitted from the first tab that fails on the fourth otherwise refuses in silence, and a coloured dot alone is not a verdict.

`store-image-field` is the whole of what this package knows about uploads: it takes the URL the shop has now, an `onUpload(file) => Promise<string>` and a pending flag, and it never learns where the bytes go. The file input is a real, labelled `<input type="file">` — not a div with a click handler, which is a keyboard trap and the classic axe failure — and with no `onUpload` wired up the block degrades to its address field, which is how it stands in Storybook. `store-settings-form` and `store-create-form` take one `onImageUpload` for the logo and the banner alike, because one upload endpoint serves both.

A shop's colours are **data**, not tokens: `store-color-field` renders the value it is handed and reports a change back, and `store-color-preview` and the palette swatches apply the values as CSS custom properties through an inline style. No block here contains a colour, which is what keeps `web/no-hex-colors` at zero. The sample palettes live in `store-palettes.json` and reach `store.fixtures.ts` as data: `arch-gates.sh` passes `--include='*.ts' --include='*.tsx'` to grep, so a `.json` file is out of scope — and legitimately so, because it holds no className, no `style` attribute and no component, and therefore cannot be the thing the gate exists to catch. Assembling a literal from its digits inside a `.ts` file would be the dodge, since that file can still paint something. The named themes a shopkeeper picks from arrive through the `presets` prop, because their names are copy the API owns.

`cardLayout` is the one key of the storefront's `layoutSettings` blob the panel offers a control for. It is lifted into `StoreAppearanceValues` so react-hook-form can hold it; the screen echoes the rest of that blob back untouched and merges this one key over it.

## Commands

| Command | What it does |
|---|---|
| `pnpm storybook` | http://localhost:6006 |
| `pnpm --filter @harness-monorepo/ui test` | component tests, each with axe |
| `pnpm --filter @harness-monorepo/ui build-storybook` | the static build CI runs |
