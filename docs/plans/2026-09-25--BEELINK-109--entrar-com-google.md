# BEELINK-109 — Entrar com Google na loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G5 do Épico G (conta do cliente). Pedido do Rafael em 24/09. Sai da `main`, depois do merge da
> pilha. As chaves do Google são geradas pelo Rafael; o código lê as variáveis e funciona sem elas
> (o botão some).

## O pedido

O cliente entra ou cria conta com o Google, além de e-mail e senha — nas telas de entrar e criar
conta da loja (G2), com a mesma sessão de cliente.

## Definição de Pronto

1. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` no `.env.example` da API,
   validadas pelo zod: as três ou nenhuma — metade falha no boot. Sem elas, a API recusa as rotas do
   Google (`GOOGLE_SIGN_IN_UNAVAILABLE`) e a vitrine não mostra o botão.
2. Fluxo authorization code com **PKCE (S256) e state**, no servidor. O state é de uso único, vale
   10 minutos e fica preso ao navegador que começou o fluxo por um cookie `httpOnly`.
3. O retorno do Google chega num endereço fixo do bee-link (`/api/customer/google/callback`, na web)
   e volta para a loja de origem — o console do Google cadastra uma URL só, não uma por loja.
4. Primeira entrada com Google: cria a conta já verificada e **sem senha**; o registro de cliente da
   loja nasce como no G1/G6. A conta pode criar senha depois pelo "esqueci a senha".
5. E-mail do Google igual ao de uma conta existente: liga à conta **só se o Google diz
   `email_verified`**; senão recusa sem revelar se a conta existe.
6. Um `sub` do Google nunca liga a duas contas (`account_identities`, único por provedor + sub).
7. `state` ou PKCE inválido responde erro **sem criar conta** — coberto por e2e com um provedor falso.
8. O callback grava os mesmos cookies de sessão de cliente do G2 (30 dias, renovados pelo uso) e volta
   para a página de origem (`?voltar=`), sem tocar no carrinho.
9. Botão "Continuar com Google" nas faces Entrar e Criar conta; cancelar no Google volta para a
   tela com uma mensagem.

## Decisões

### 1. A API faz o OAuth; a web só guarda o state

A API gera o state e o verificador PKCE, guarda os dois (`oauth_states`, com a loja e o `voltar`),
monta a URL do Google e, no retorno, troca o código usando o verificador. A web guarda o state num
cookie `httpOnly` (`bl_oauth_google`) e confere que o state que voltou é o mesmo antes de chamar a
API: é o que impede alguém de fazer o navegador de outra pessoa terminar um login começado por ele.

### 2. O `id_token` validado sem buscar chaves

O `id_token` chega direto do endpoint de token do Google, por TLS, na troca autenticada com o
segredo. O OpenID Connect (3.1.3.7) permite validar `iss`, `aud` e `exp` sem conferir a assinatura
nesse caso. Evita buscar e guardar as chaves públicas do Google.

### 3. Um provedor falso nos testes

O cliente HTTP do Google é um provider do Nest (`GoogleOAuthClient`). O e2e troca por um falso que
guarda o desafio PKCE de cada código e recusa um verificador que não bate — o PKCE é testado de ponta
a ponta sem rede.

### 4. Como a vitrine sabe que o Google está ligado

`GET /customer/sign-in-options` → `{ google }`, lido no servidor da web com cache. A web não repete
as variáveis do Google.

### 5. O "G" colorido é um arquivo

O logo do Google tem as cores da marca, e o gate `web/no-hex-colors` proíbe cores nos componentes.
O logo fica em `apps/web/public/brand/google.svg` e o bloco recebe o endereço.

## Fora de escopo

- Outros provedores (Apple, Facebook) e Google no painel do lojista.
- Domínio próprio por loja: o retorno fixo assume a vitrine no domínio do bee-link.
