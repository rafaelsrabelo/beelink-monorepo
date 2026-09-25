# BEELINK-105 — API: a porta do cliente — sessão própria e o registro de cliente por loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G1 do Épico G (BEELINK-104, conta do cliente). Empilhado sobre o F4 (BEELINK-103). Só API: as
> telas são o G2 e o G3, e o Google é o G5.

## O pedido

Quem compra na loja pode ter conta. O produto já decidiu o formato (docs/product/README.md,
"Accounts" e "Customers"): a mesma conta do bee-link, por outra porta; a sessão do cliente nunca é a
do lojista; e a loja guarda o seu próprio registro de cliente.

## Definição de Pronto

1. Cadastro, login, refresh e logout em `/api/stores/:slug/customer/...`, com o mesmo rate limit da
   porta do painel.
2. Um token de lojista em `/customer/me` responde 401, e um token de cliente no painel também. Um
   refresh token não troca de porta.
3. A mesma conta em duas lojas tem dois registros de cliente, e nenhum vaza para o outro.
4. "E-mail já existe" responde igual a um cadastro novo.
5. O link de verificação leva de volta à loja.
6. O modelo aceita uma conta sem senha, para o Google (G5).

## Decisões

### 1. A sessão sabe por qual porta foi aberta

`Session.audience` (`OWNER` ou `CUSTOMER`, padrão `OWNER`, então toda sessão existente continua como
era). O token de acesso do cliente carrega `kind: "customer"`, assinado. O guard global do painel
recusa qualquer token com `kind`, e o `CustomerAuthGuard` só aceita esse. Os tokens de lojista já
emitidos não têm `kind` e continuam valendo. O refresh confere a porta da sessão: um refresh token de
cliente no `/auth/refresh` é tão inválido quanto um inexistente.

### 2. Um registro de cliente por loja

`Customer` (loja, conta opcional, nome, telefone, endereço), único por `(loja, conta)` e por
`(loja, telefone)`. É criado no primeiro login do cliente naquela loja, com o nome da conta. Nada
aqui deixa a loja ler a conta: o perfil devolve o registro da loja mais o e-mail de quem está logado,
e só para a própria pessoa.

### 3. O cadastro não revela quem tem conta

A porta do painel responde `AUTH_EMAIL_TAKEN`. A vitrine não pode dizer quem compra, então responde
202 nos dois casos. Uma conta ainda não verificada recebe um link novo.

### 4. O e-mail de verificação volta para a loja

`MailService.sendEmailVerification` aceita um caminho de retorno, e o link ganha `&voltar=/<loja>`. A
tela de verificação do web passa a usá-lo no G2.

### 5. Senha opcional

`User.passwordHash` passa a aceitar null, para uma conta aberta pelo Google (G5). No login, uma conta
sem senha é recusada depois do mesmo trabalho de uma senha errada, então nem o tempo de resposta
revela nada.

### 6. A verificação de credenciais é uma só

`AuthService.verifiedUser` é o que as duas portas usam para conferir e-mail e senha. O login do
painel continua respondendo igual.

## Fora de escopo

- As telas (G2, G3), o Google (G5) e o pedido pedindo identidade (G4).
- Pedidos guardados na API, que são o próximo épico.
