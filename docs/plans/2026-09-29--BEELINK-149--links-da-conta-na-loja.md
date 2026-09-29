# BEELINK-149 — J10 · Confirmar e-mail e redefinir senha dentro da loja, com a marca da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J10 do Épico J (BEELINK-138). Sai do J9 (#140), empilhado como manda a fila, embora não dependa dele:
> o J8 e o J9 mexeram na página de entrar e na rota do BFF que este ticket também toca.

## Definição de Pronto

1. O link do e-mail de confirmação abre uma tela da própria loja, com o cabeçalho e as cores dela. Ao
   confirmar, o cliente volta para onde estava.
2. O link de nova senha abre uma tela da loja, com a nova senha e a confirmação. Ao salvar, o cliente
   volta para onde estava.
3. A API monta os links da conta de cliente para as rotas da loja. Os links do painel continuam os
   mesmos.
4. Os e-mails da conta de cliente levam o nome da loja no assunto e no corpo ("Mutante Suplementos —
   confirme seu e-mail"), e não o do bee-link.
5. Com o link vencido ou já usado, a própria tela da loja oferece mandar outro.
6. Testes: e2e da API (links e e-mails), templates, rotas do BFF e blocos. Conferência em :3100 com o
   Mailpit.

## Decisões

### 1. Duas palavras de rota novas, com endereço próprio

`StorefrontRouteWords` ganha duas palavras:

| Tela | Palavra | Endereço |
|---|---|---|
| Confirmar o e-mail | `verifyEmail` | `/<loja>/confirmar-email?token=…` (em inglês, `verify-email`) |
| Nova senha | `resetPassword` | `/<loja>/nova-senha?token=…` (em inglês, `reset-password`) |

- **É a API que monta os links,** a partir das palavras da loja, que já são dela (`ROUTE_WORDS`).
- **As quatro palavras entram em `RESERVED_PATH_SEGMENTS`,** para nenhuma categoria tomá-las.
- **Por que não um `?modo=` da página de entrar:** isso levaria para a API o vocabulário da query do
  web.

### 2. "Volta para onde estava"

- **Os formulários da loja mandam para onde o cliente ia** (o `voltar` deles) no cadastro, no
  "reenviar" e no "esqueci a senha", como `returnTo`.
- **A API só aceita um caminho dentro da loja.** Qualquer outra coisa vira a vitrine da loja. Ela
  escreve o caminho no link como `voltar`, e o web confere de novo com `safeBackOf`.

### 3. Confirmar o e-mail

- **O token é gasto no servidor, na requisição do clique,** como na tela do painel.
- **Deu certo:** a pessoa vai direto para a página de entrar da loja, com "E-mail confirmado! Entre
  para continuar." e o `voltar`. Ela ainda precisa da senha para entrar: confirmar o e-mail não abre
  sessão.
- **Link vencido ou já usado:** a tela diz isso e traz o formulário de reenviar, que já existe no BFF
  (`reenviar`).

### 4. Nova senha

- **Um formulário simples:** nova senha e confirmação, com 8 caracteres no mínimo. Ele posta no BFF,
  numa ação nova, `nova-senha`.
- **Senhas diferentes** voltam com a frase delas, sem chamar a API.
- **Deu certo:** a pessoa vai para a página de entrar, com "Pronto, sua senha foi trocada. Entre com
  a nova senha." A API encerra todas as sessões da conta.
- **Link vencido ou já usado:** a tela diz isso e leva ao "esqueci a senha" da loja.

### 5. Os e-mails levam a loja

- **Assunto:** "{Loja} — confirme seu e-mail" e "{Loja} — crie uma nova senha".
- **Corpo:** diz de qual loja é a conta, com o nome da loja no alto.
- **Remetente:** o nome exibido é o da loja, e o endereço continua o do produto (`MAIL_FROM`).
- **O nome da loja e o do cliente passam por `escapeHtml`.** Os dois são digitados por alguém.

### 6. Links já enviados

Os e-mails que já saíram apontam para `/verify-email` e `/reset-password` com `voltar=/<loja>`. Essas
telas do painel passam a redirecionar para a tela da loja antes de gastar o token.

## Fora de escopo

- As cores e o logo da loja no próprio e-mail. O ticket pede o nome no assunto e no corpo.
- Entrar sozinho depois de confirmar o e-mail ou trocar a senha.

## Adendo da implementação (29/09)

- **Salvar a senha nova não apaga a sessão deste navegador.** A API já encerra as sessões da conta
  cujo link foi usado. Uma sessão de outra conta aberta no mesmo aparelho não é dela e fica.
- **A tela "reenviar" da loja no painel (`ShopResendVerification`, do G7) saiu.** Os links de lojista
  seguem no painel. Os de cliente redirecionam para a loja antes de chegar ali.
- **A página de entrar da loja ganhou um aviso,** para "E-mail confirmado!" e "Senha trocada".
- **Conferido em :3100, com o Mailpit:**
  - um cadastro vindo do carrinho recebe "Loja do Design — confirme seu e-mail", de "Loja do Design";
  - o link confirma e cai em Entrar com o aviso e `voltar` para o carrinho;
  - o mesmo link, de novo, mostra a tela de link vencido dentro da loja;
  - o "esqueci a senha" leva à tela de nova senha, que recusa duas senhas diferentes e, ao salvar,
    cai em Entrar;
  - os links antigos do painel com `voltar=/<loja>` redirecionam para a loja.
- **Dados de teste:** a conta `cliente-j10@teste.dev` (senha `Senha!Nova456`) na loja-do-design.
