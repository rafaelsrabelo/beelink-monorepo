# BEELINK-227 (T1) — o administrador da plataforma, a porta do backoffice e a auditoria

> Épico T (BEELINK-226), "Backoffice da plataforma". Primeiro da pilha: `main` → **T1** → T2 (tela de entrada, casca, listas) → T3 (ficha da loja) → T4 (cupons da plataforma) → T6 (categorias) → T7 (números). Só API e contratos; nenhuma tela.
>
> O dono não estava disponível enquanto este ticket foi feito. **Toda decisão abaixo marcada "(assistente)" foi tomada pelo assistente e espera confirmação.**

## O problema

Não existe papel de administrador da plataforma: `User` não tem papel nenhum, e quem é do time da bee-link entra no painel como qualquer lojista. O backoffice precisa de três coisas antes de qualquer tela: saber quem é administrador, uma porta que só essa pessoa abre — e que um cookie do painel roubado não abre —, e um registro de tudo o que for feito lá dentro.

Decisões do épico, que valem aqui: **tudo o que o backoffice faz entra num registro de auditoria — quem, o quê, quando**; **o backoffice nunca lê a senha nem a sessão de ninguém**.

## Definição de Pronto

1. Existe o papel de administrador da plataforma, que nenhuma rota do lojista, do cliente ou de cadastro consegue conceder.
2. O primeiro administrador é criado por um comando que roda no contêiner da API em produção; recusa e-mail desconhecido ou não verificado, é idempotente, deixa uma linha de auditoria com o ator "comando" e está documentado em `docs/repo/deploy.md`.
3. Um administrador concede e revoga o papel de outro por rotas do backoffice; o último administrador não pode ser revogado.
4. Entrar no backoffice pede a senha **e** um código de uso único enviado por e-mail: 6 dígitos, 10 minutos, guardado só como resumo, poucas tentativas, pedido e verificação limitados por taxa. O código nunca é escrito em log.
5. As respostas da entrada não dizem se um e-mail é de administrador: "não é administrador" responde igual a "senha errada".
6. A sessão do backoffice é própria — outro tipo de token, vida curta — e todas as rotas ficam atrás de **um** guard, que confere o tipo do token, que a pessoa ainda é administradora (a revogação vale no pedido seguinte) e que a sessão passou pelos dois passos.
7. Token de lojista ou de cliente numa rota do backoffice é recusado; token do backoffice numa rota do painel ou da loja é recusado.
8. Toda escrita do backoffice deixa uma linha de auditoria — quem, o quê, em quê, quando, de onde — sem segredo nenhum; entradas (as que deram certo e as que não) também.
9. A auditoria é só de acréscimo: não há rota nem método que altere ou apague, e o banco recusa `UPDATE` e `DELETE`.
10. Uma rota de escrita do backoffice que esqueça de registrar falha — num teste que percorre os controllers, e em tempo de execução.
11. Existe a leitura paginada da auditoria, só para administradores, com filtros de ator, ação e período.
12. Nenhuma resposta do backoffice carrega `passwordHash`, token de sessão de outra pessoa, linha de sessão, segredo selado de integração ou token de e-mail — preso por teste.
13. As formas que atravessam a rede estão em `packages/contracts/src/backoffice.ts`; Swagger nos controllers; o código da API em `modules/backoffice/`, com subpastas onde os próximos tickets crescem.
14. Testes unitários e e2e de cada linha acima; `pnpm ci-check` verde; documentação (`deploy.md`, `docs/product/README.md`, mapa de superfície da API).

## Decisões

Todas (assistente), salvo as duas primeiras, que vieram prontas com o ticket.

1. **O backoffice mora dentro de `apps/web`, em `/backoffice`** (decidido pelo assistente na noite do épico; não há segundo app). Consequência tomada aqui: `backoffice` entra em `RESERVED_SLUGS`, para nenhuma loja ocupar o endereço antes do T2. **Não verificado:** se já existe em produção uma loja com esse slug.
2. **Não há visão somente-leitura do painel de uma loja neste épico**, nem jeito nenhum de agir como lojista.
3. **Administrador é uma linha em `platform_admins`, não uma coluna em `users`.** Chave: o id do usuário. Guarda quem concedeu (nulo = o comando), quando, e `revokedAt`/quem revogou. Uma coluna `role` em `users` ficaria ao alcance de qualquer `user.update({ data })` que um dia espalhe um corpo de pedido; a tabela à parte só é escrita por `PlatformAdminsService`. Conceder de novo a quem foi revogado reaproveita a linha — a história fica na auditoria. Só conta de lojista (`storeId` nulo) com e-mail verificado pode ser administradora.
4. **O primeiro administrador: `node dist/commands/grant-platform-admin.js <e-mail>`**, dentro do contêiner `api`. A imagem de runtime só tem `dist/` e as dependências de produção (sem `ts-node`, sem CLI do Nest), então o comando é um arquivo compilado junto com a API, que sobe um contexto Nest mínimo (Prisma + o serviço de administradores + a auditoria — sem HTTP, sem as rotinas de relógio). Sai com 0 quando concede ou quando a pessoa já era administradora (nada é escrito de novo), e com 1 quando recusa.
5. **Segundo passo = código por e-mail.** O mailer já existe e nenhuma dependência entra; TOTP pode substituí-lo depois atrás do mesmo passo (a sessão guarda qual foi o segundo passo, `secondStep`, hoje só `EMAIL_CODE`).
   - 6 dígitos de `crypto.randomInt`; vale 10 minutos; uso único; no máximo 5 tentativas, depois o desafio morre; pedir outro código mata o anterior.
   - Guardado como HMAC-SHA-256 sob `JWT_SECRET`, salgado com o token do desafio (que também só é guardado como resumo): um despejo do banco não permite testar os 1.000.000 de códigos.
   - O passo 1 devolve um `challengeToken` opaco; o passo 2 pede o token **e** o código. Sem o token do passo 1 não há o que adivinhar.
   - Limites: por IP, os mesmos das rotas de entrada do painel (`AUTH_RATE_LIMIT_*`, 5 por minuto) nos dois passos; por conta, 5 códigos a cada 15 minutos.
6. **A entrada não revela quem é administrador.** Senha errada, e-mail desconhecido, e-mail não verificado e "senha certa, mas não é administrador" respondem o mesmo `401 BACKOFFICE_INVALID_CREDENTIALS`, depois do mesmo trabalho (a verificação argon2 acontece sempre, com o resumo-isca do painel quando não há conta). Só quem tem a senha de um administrador vê o passo 2.
7. **Sessão própria, em tabelas próprias** (`backoffice_sessions`, `backoffice_refresh_tokens`) — não uma nova audiência em `sessions`. Assim nenhum código do painel (renovar, sair, "encerrar todas as sessões") toca uma sessão do backoffice, nem o contrário.
   - Token de acesso: JWT com `kind: "backoffice"`, **10 minutos**. O guard do painel recusa qualquer token com `kind`; o da loja exige `kind: "customer"`. Mesmo segredo de assinatura (sem variável nova).
   - Renovação: token opaco, de uso único e rotativo, com a mesma folga de 20 s do painel para duas abas correndo; reuso fora da folga encerra a sessão.
   - A sessão **acaba 8 horas depois de aberta** (um dia de trabalho; não se renova além disso) **ou após 30 minutos parada**. Curto de propósito: é a chave de todas as lojas.
   - O guard lê a sessão e a linha de administrador **a cada pedido**: revogar o papel, ou sair, vale no pedido seguinte.
8. **Um guard, e um jeito só de declarar um controller.** `@BackofficeController('caminho')` junta `@Controller('backoffice/…')`, o guard e o interceptor de auditoria. Um teste percorre todos os controllers do `AppModule` e recusa qualquer um sob `backoffice/` sem o guard (a porta de entrada é a única exceção, nomeada no teste).
9. **Auditoria: `backoffice_audit_log`, só de acréscimo.**
   - Colunas: ator (`ADMIN` com id e e-mail da época, `COMMAND`, ou `ANONYMOUS` para uma entrada recusada), ação, alvo (tipo, id, rótulo), detalhes (JSON plano e pequeno), IP como a API vê o cliente, user agent, quando.
   - Sem chave estrangeira para `users`: apagar uma conta não pode apagar nem alterar o que ela fez.
   - Imutável por três camadas: `AuditService` só tem `record` e `list`; não há rota de escrita; e um gatilho no banco recusa `UPDATE` e `DELETE`. (`TRUNCATE` continua possível ao dono da tabela — é o que o reset dos testes e2e usa, e ele se recusa fora de um banco `*_test`.)
   - Os detalhes recusam, em tempo de execução, qualquer chave que pareça segredo (`password`, `token`, `secret`, `code`, `hash`, …) e qualquer valor que não seja texto curto, número, booleano ou nulo.
   - **Entradas:** `BACKOFFICE_SIGN_IN_CODE_SENT`, `BACKOFFICE_SIGNED_IN`, `BACKOFFICE_SIGNED_OUT` e `BACKOFFICE_SIGN_IN_FAILED`. Uma falha não guarda o e-mail digitado (pode ser de qualquer pessoa, ou uma senha digitada no campo errado); quando o e-mail é de um administrador, o alvo é essa conta — o time precisa saber que tentaram a conta dele —, senão não há alvo.
10. **Registrar é inevitável** (DoD 10):
    - todo handler que não seja `GET` num controller do backoffice declara `@Audited('AÇÃO', …)` — ou `@Unaudited('motivo')`, cuja lista inteira é conferida por um teste (hoje: só a renovação do token);
    - o interceptor recusa com 500 `BACKOFFICE_AUDIT_MISSING`, **antes** de rodar o handler, uma escrita sem declaração;
    - o handler recebe um `AuditTrail` (`@Trail()`) já preso ao ator, ao IP e às ações declaradas, e o serviço registra **na mesma transação** da escrita; uma ação não declarada é recusada;
    - se um handler declarado terminar bem sem ter registrado, o interceptor registra a ação declarada e escreve um erro no log — a linha nunca falta, e o descuido aparece.
11. **Códigos de ação:** `COISA_VERBO-NO-PASSADO`, em maiúsculas (`ADMIN_GRANTED`, `SHOP_SUSPENDED`). A união `BackofficeAuditAction` em `packages/contracts` é fechada; a coluna no banco é texto, para um código novo não pedir migração.
12. **Sem variável de ambiente nova.** Vidas e limites são constantes (`backoffice.constants.ts`): são decisões do produto, como as do painel.
13. **Revogar a si mesmo é permitido** quando há outro administrador. A regra é "não pode sobrar zero", conferida sob uma trava (`pg_advisory_xact_lock`) para dois administradores não se revogarem ao mesmo tempo.
14. **Conceder a quem já é administrador responde 409** (`BACKOFFICE_ADMIN_ALREADY`) na rota — nada mudou, nada é registrado; o comando, que precisa ser idempotente, sai com 0.

## Fora do escopo

- Qualquer página, handler do BFF ou cookie (T2). A API responde JSON sem cookie, como a do painel, para o BFF embrulhar.
- Lojas, cupons, categorias, números (T3, T4, T6, T7).
- TOTP; agir como lojista; visão do painel de uma loja.
- Avisar por e-mail quem ganhou ou perdeu o papel.
- Auditar a renovação do token (acontece a cada 10 minutos; seria ruído) e o reuso de um token de renovação (a sessão é encerrada, mas sem linha de auditoria).
- Limpeza das linhas vencidas de `backoffice_sign_in_challenges` e das sessões encerradas: são poucas (é o time), e ficam.

## Para o T2…T7

- **Onde pôr o código:** `apps/api/src/modules/backoffice/<domínio>/` (`shops`, `coupons`, `categories`, `metrics`), com os controllers e serviços **registrados no próprio `BackofficeModule`** — o guard e o interceptor resolvem as dependências deles ali.
- **Controller:** `@BackofficeController('shops')` (de `backoffice.decorators.ts`), nunca `@Controller` + `@Public()` à mão. O administrador do pedido vem de `@CurrentAdmin()` (`{ id, name, email, sessionId }`).
- **Escrita:** todo handler que não seja `GET` leva `@Audited('SHOP_SUSPENDED')` e recebe `@Trail() trail: AuditTrail`; o serviço chama `trail.record('SHOP_SUSPENDED', { target: { type: 'STORE', id, label: slug }, details: { … } }, tx)` dentro da transação da escrita. O teste `backoffice-routes.spec.ts` falha sem a declaração.
- **Código de ação novo:** acrescente à união `BackofficeAuditAction` (contracts) e à lista `BACKOFFICE_AUDIT_ACTIONS` (`audit/audit.actions.ts`, conferida com `satisfies`); tipo de alvo novo, a `BackofficeAuditTargetType` e `BACKOFFICE_AUDIT_TARGET_TYPES`. Convenção: `COISA_VERBO-NO-PASSADO`.
- **Detalhes:** planos, pequenos, sem segredo. O que mudou (`{ from: 'ACTIVE', to: 'SUSPENDED' }`), nunca um corpo de pedido inteiro.
- **Respostas:** montadas campo a campo num mapper. `backoffice-responses.spec.ts` recusa um DTO de resposta com campo de nome proibido; os tokens da própria sessão do backoffice são a única exceção, nomeada lá.
- **O fluxo de sessão que o BFF do T2 embrulha** (tudo sob `/api/backoffice`):
  1. `POST auth/sign-in` `{ email, password }` → `200 { challengeToken, expiresAt }` · `401 BACKOFFICE_INVALID_CREDENTIALS` · `429 RATE_LIMITED`. O `challengeToken` pode ficar num cookie httpOnly de 10 minutos.
  2. `POST auth/verify` `{ challengeToken, code }` → `200 BackofficeSession` · `401 BACKOFFICE_CODE_INVALID` (errado, vencido, usado ou tentativas esgotadas — sem dizer qual).
  3. `BackofficeSession` = `{ accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt, sessionExpiresAt, admin }`. Dois cookies httpOnly **próprios** (nomes diferentes dos do painel e, de preferência, `Path=/backoffice` e `/api/backoffice`).
  4. `POST auth/refresh` `{ refreshToken }` → `200 BackofficeSession` · `401 BACKOFFICE_SESSION_INVALID` · `401 BACKOFFICE_REFRESH_REUSED`. Depois de `sessionExpiresAt` não há renovação: é entrar de novo.
  5. `POST auth/sign-out` (com o token de acesso) → `204`.
  6. `GET me` → `BackofficeMe`, para a casca saber quem está e quando a sessão acaba.
  - Toda rota guardada responde `401 BACKOFFICE_UNAUTHENTICATED` quando o token falta, é de outra porta, a sessão acabou ou a pessoa deixou de ser administradora: o BFF tenta renovar uma vez e, se falhar, manda para a entrada.
  - **O IP da auditoria é o que a API vê.** O BFF precisa repassar `x-forwarded-for` como os handlers do painel fazem, ou toda linha sai com o endereço do contêiner da web.
- **T2:** `GET admins`, `POST admins` `{ email }`, `DELETE admins/:userId`, `GET audit?actorId&actorKind&action&from&to&page&pageSize` já existem.

## Acréscimo — 07/10/2026, durante a implementação

O que foi decidido ou descoberto depois do plano, pelo assistente, também à espera de confirmação.

1. **Trocar a senha encerra as sessões do backoffice da conta.** `SessionService.revokeAllForUser` — o que a redefinição de senha chama — passou a encerrar também as linhas de `backoffice_sessions`. É a única linha do módulo do painel que toca o backoffice, e de propósito: quem conhecia a senha antiga (e pode ter lido um código no e-mail) sai de todas as portas. A sessão do painel que fez a troca pode ficar; a do backoffice, nunca.
2. **Três gates de arquitetura**, além do teste que percorre os controllers: `api/backoffice-writes-in-backoffice` (só `modules/backoffice` escreve `platform_admins` e `backoffice_audit_log`), `api/audit-append-only` (nenhum `update`/`upsert`/`delete` da auditoria em lugar nenhum da API) e `api/backoffice-one-door` (ninguém escreve `@Controller('backoffice/…')` à mão). O gate é a metade rápida, no pre-commit; o teste (`backoffice-routes.spec.ts`) lê os metadados de verdade.
3. **O comando é uma casca.** `src/commands/grant-platform-admin.ts` só repassa `process.argv` e as saídas; a lógica está em `modules/backoffice/admins/grant-platform-admin.command.ts`, que o e2e chama direto. O arquivo compilado foi rodado com `node` a partir de um `pnpm deploy --prod` (o mesmo passo que monta a imagem de runtime), **não dentro da imagem construída**.
4. **Um risco aceito:** quem souber a senha de um administrador não entra (falta o código), mas pode pedir 5 códigos a cada 15 minutos e, com isso, deixar o dono da conta sem conseguir pedir o dele. A saída é a de sempre para senha vazada — redefinir a senha —, e as tentativas ficam na auditoria com a conta como alvo.
5. **`@Unaudited` não cria trilha.** A renovação do token não escreve nada; um reuso de token de renovação encerra a sessão sem linha de auditoria. Se o T2 quiser ver isso, a ação é `BACKOFFICE_SESSION_REVOKED` e a rota passa a `@Audited`.
6. **Para o T2, sobre os testes:** `apps/api/test/support/backoffice.ts` tem `signedInAdmin(app)` (um administrador com sessão aberta), `newAdmin`, `backofficeSignIn` e `codeSentTo(email)` — o código é lido do Mailpit, pelo assunto `Seu código de acesso ao backoffice`, como os outros e-mails. Os specs do backoffice não chamam `clearInbox()`: cada teste usa endereços novos.
