# packages/ui — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── styles/globals.css     # tokens (light + dark), base layer, @source for this package
├── lib/utils.ts           # cn()
├── components/            # 23 shadcn primitives, written by `shadcn add` (base-nova, Base UI)
├── hooks/use-mobile.ts    # the breakpoint the sidebar reads
├── test/a11y.ts           # axe assertion shared by every block test
└── blocks/
    ├── auth/              # login · signup · forgot · reset · verify — each with a story and a test
    └── dashboard/         # sidebar · header · cards · chart
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
| `blocks/dashboard/app-sidebar` | `user`, `onSignOut`, `navMain`, `activeHref` | Blocos/Painel/Barra lateral |
| `blocks/dashboard/site-header` | `title` | — |
| `blocks/dashboard/section-cards` | `cards` | Blocos/Painel/Cartões |
| `blocks/dashboard/chart-area-interactive` | `data`, `title`, `description` | Blocos/Painel/Gráfico |

The form blocks validate shape only — a well-formed e-mail, a long-enough password. Whether the account exists is the API's answer, and it arrives as the `error` prop, already a sentence.

## Commands

```bash
pnpm storybook                              # http://localhost:6006
pnpm --filter @harness-monorepo/ui test     # component tests, with axe
pnpm --filter @harness-monorepo/ui build-storybook
```
