# BEELINK-169 — L3 · O painel não perde a sessão depois de 15 minutos

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> L3 do Épico L (BEELINK-166, colocar no ar). Sai do `main`, e não do K3: é uma correção de sessão
> que tem de poder entrar sozinha, antes do deploy. O K4 (o sino) depende dele.

## Definição de Pronto

1. Com o token de acesso vencido e o refresh ainda válido, a próxima chamada do painel funciona:
   - o par é renovado no caminho;
   - os cookies novos voltam na resposta;
   - a chamada segue com o token novo.
2. Duas chamadas ao mesmo tempo não derrubam a sessão.
3. O mesmo vale para a sessão do cliente na loja.
4. Com o refresh vencido, a pessoa vai para o login e volta para a página onde estava.
5. Testes: unidade do proxy e do caminho de volta, e um e2e em que, com o cookie de acesso apagado, a
   próxima escrita no painel funciona.

## Decisões

### 1. Quem renova é o proxy, também nas rotas do BFF do painel

Hoje o proxy renova só nas páginas. Ele passa a olhar também `/api/*`, com duas condições, como já
faz na loja:
- o cookie `bl_refresh` existe;
- o `bl_access` não existe, porque o navegador o apagou ao vencer.

Assim uma chamada com a sessão em dia nem passa pelo proxy. Ficam de fora as rotas que escrevem os
seus próprios cookies (`/api/session`, `/api/auth`) e as da loja (`/api/customer`,
`/api/storefront`).

Na rota, o proxy nunca redireciona. Se o refresh foi recusado, ele limpa os cookies e deixa a rota
responder 401.

A alternativa era renovar dentro de `forwardSignedIn`. Isso mudaria as 43 rotas do painel, que
devolvem o corpo e não uma resposta onde gravar cookies.

### 2. O cookie de acesso vence um minuto antes do token

O navegador deixa de mandar o cookie quando ele vence, e é isso que leva a chamada ao proxy. Com um
relógio adiantado no servidor, ou atrasado no navegador, o cookie ainda seria mandado com o token já
recusado. Um minuto de folga cobre essa diferença. Vale para o painel e para a loja.

### 3. Duas chamadas ao mesmo tempo

As duas renovam com o mesmo refresh. A API aceita o reuso dentro de 20 s
(`REFRESH_REUSE_GRACE_SECONDS`) e devolve um par válido para cada uma, na mesma sessão. O navegador
fica com o último par, e os dois funcionam. Nada muda na API.

### 4. De volta à página

- Um 401 `AUTH_UNAUTHENTICATED` numa consulta ou mutação do painel manda para
  `/login?voltar=<página>`.
- O redirect do proxy nas páginas também leva o `voltar`.
- O login volta para `voltar` depois de entrar.

Só um caminho interno do painel é aceito: começa com `/`, sem `//`, e é uma rota do painel. Qualquer
outra coisa cai no `/dashboard` de sempre, então um link de login não vira um redirecionamento para
fora.

### 5. A loja já estava coberta

A loja já tinha as duas coisas:
- o proxy renova em `/<slug>/*`, rotas `/<slug>/api` inclusive;
- o `callAsShopper` renova quando recebe um 401.

Ela só ganha a folga de um minuto no cookie (decisão 2).

## Fora de escopo

- Mudar a duração dos tokens.
- Renovar dentro de `forwardSignedIn` (decisão 1).
