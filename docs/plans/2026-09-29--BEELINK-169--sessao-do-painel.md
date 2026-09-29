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

## Adendo — revisão independente e o que a conferência mostrou (2026-09-29)

1. **A decisão 3 não cobria uma chamada lenta.** Os cookies novos de uma rota só chegam ao navegador
   com a resposta dela. Um upload de 40 s que renovasse seguraria o refresh novo, e uma segunda
   chamada, depois dos 20 s de tolerância da API, levaria o refresh já gasto. A API trata isso como
   token roubado e encerra a sessão.

   Agora o proxy renova **antes**: quando faltam menos de 3 minutos para o token vencer, lendo o
   `exp` do token sem verificá-lo, só para decidir a hora. Numa aba aberta e em uso, quem renova é
   uma chamada comum, e o upload nunca renova adiantado.

   Por isso a entrada do matcher perdeu a condição "sem `bl_access`": ela recebe as rotas do painel
   sempre que houver o refresh do painel. Continua de fora o que escreve cookies (`session`, `auth`)
   e o que é da loja (`customer`, `storefront`), agora com o prefixo ancorado.
2. **Queda da API numa rota:** o proxy deixava a rota responder 401, e a página ia para o login.
   Agora a resposta é 503 `SERVICE_UNAVAILABLE`.
3. **Queda da API numa página:** o `requireUser` lia "sem cookie de acesso" como "sem sessão" e
   passava pela rota que limpa os cookies. Uma queda deslogava o lojista; a conferência pegou isso ao
   vivo, quando a API de dev caiu. Agora, com o refresh presente, a página falha e os cookies ficam.
4. **Sessão revogada em outro aparelho:** o `bl_access` continua lá, e o proxy levava de `/login`
   de volta à página, que ia a `/api/session/expired` e perdia o `voltar`. Agora o 401 de uma
   consulta vai direto a `/api/session/expired?voltar=…`, que limpa os cookies e leva ao login com o
   `voltar`.
5. **O `retry` novo** também valia para dois `fetchQuery` do novo pedido, que antes falhavam na hora.
   Eles voltam a `retry: false`.
6. O contrato da web (regra 3) e o `docs/README.md` da web descrevem a entrada nova do matcher.

Fica para depois:
- Um `error.tsx` no painel, com "Tentar de novo", para a página que falha numa queda. Hoje ela
  mostra a tela de erro padrão do Next, o que ainda é melhor do que deslogar.
- O e2e cobre a escrita com o cookie vencido e o redirecionamento com `voltar`, mas não o caminho
  inteiro de uma consulta que recebe 401 numa página aberta. Esse caminho está coberto por unidade.
- Dois cenários do e2e `auth-journey` já falhavam antes deste ticket e continuam falhando:
  - o botão "Ana Souza" do cabeçalho não existe desde a mudança do app shell;
  - o "Esqueceu a senha" responde "Algo deu errado" neste ambiente.

  Não foram mexidos.

Conferido em :3100:
- `/admin/loja-do-design/orders` sem sessão leva a `/login?voltar=…`, e ao entrar volta a Pedidos;
- sem o cookie de acesso, uma chamada do BFF responde 200, e o cookie volta renovado.

O e2e `panel-session` passa contra o build de produção, rodado nas portas 3200/3201 para não parar o
dev.
