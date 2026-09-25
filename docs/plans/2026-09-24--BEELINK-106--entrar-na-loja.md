# BEELINK-106 — Entrar e criar conta dentro da loja, com a sessão do cliente em cookies próprios

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G2 do Épico G (BEELINK-104). Empilhado sobre o G1 (BEELINK-105), que abriu a porta na API.

## O pedido

As telas de entrar, criar conta e pedir senha nova, dentro da loja e nas cores dela, gravando a
sessão do cliente em cookies próprios.

## Definição de Pronto

1. `/<loja>/entrar`, `?modo=criar` e `?modo=senha`, nas cores da loja.
2. Funciona sem JavaScript: formulários comuns que postam e voltam por redirect.
3. A sessão fica em `bl_customer_access` e `bl_customer_refresh` (httpOnly, `path=/`), nunca nos
   cookies do painel.
4. O proxy renova a sessão do cliente nas páginas da loja sem nunca redirecionar a vitrine.
5. Depois de entrar, a pessoa volta para a página de onde veio (`?voltar=`), sempre dentro da loja.
6. Sair encerra só a sessão do cliente.
7. O e-mail de verificação de quem se cadastrou na loja leva de volta ao "entrar" da loja.

## Decisões

### 1. Palavras de rota novas: `signIn` e `account`

`entrar`/`login` e `conta`/`account` entram no vocabulário da loja (contrato e API). As quatro já
estavam na lista de segmentos reservados desde o começo, então nenhuma categoria colide. Criar conta
e pedir senha são modos da mesma página (`?modo=`), para não reservar mais palavras. `account` já vai
no contrato e fica sem página até o G3.

### 2. Formulário comum, sem JavaScript

A página não tem ilha cliente. O formulário posta para `/api/storefront/<loja>/customer/<ação>`, e o
handler responde 303: para `voltar` quando entra, ou para a própria página com `erro`, `enviado` e o
e-mail preenchido. A senha nunca passa por código da página. Como é post de formulário, o handler usa
só a checagem de origem: um formulário não consegue dizer que fala JSON.

### 3. `voltar` só dentro da loja

`safeBackOf` aceita só caminhos sob `/<loja>`. Outro site, outra loja, `//evil.example` ou `\\` viram
a porta da loja. Um link montado por alguém não tira o cliente da loja depois do login.

### 4. O proxy mantém o cliente logado, e só ele

Uma entrada nova no matcher pega caminhos de loja só quando há `bl_customer_refresh` e falta
`bl_customer_access`, então visitante anônimo e crawler nunca passam pelo proxy. Ali o proxy renova o
par; se a API recusar, apaga os cookies e segue sem redirecionar. O proxy também deixou de mandar um
caminho de loja para `/login` se um dia receber um: só os caminhos do painel redirecionam.

### 5. A verificação volta para a loja

A tela `/verify-email` lê o `voltar` que a API grava no link e aponta "Ir para a tela de entrada"
para o `entrar` da loja.

## Fora de escopo

- O "Entrar" e o "Olá, Nome" no cabeçalho e a página Minha conta (G3).
- O Google (G5): o botão entra acima do formulário quando existir.
