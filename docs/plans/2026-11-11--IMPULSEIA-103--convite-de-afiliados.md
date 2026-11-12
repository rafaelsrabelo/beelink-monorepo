# IMPULSEIA-103 (AF3) — cadastro e convite de afiliados, na API

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A terceira tarefa do épico [Afiliados](2026-10-24--afiliados.md), empilhada sobre AF1
> ([IMPULSEIA-101](2026-11-11--IMPULSEIA-101--programa-e-tabelas-de-comissao.md)) e AF2. O desenho
> comum está no épico (decisões 1, 2, 4 e 5 e o adendo de 11/11); aqui fica o que esta tarefa entrega.

## O pedido

O lojista cadastra o afiliado (nome, e-mail, tabela, telefone e nota opcionais) e o convite sai por
e-mail. O convidado abre o link, cria a conta do bee-link ou entra com a dele, escolhe o `/nome`, diz a
chave Pix e aceita os termos; o vínculo fica `ACTIVE`. O lojista pausa, retoma, encerra, troca a
tabela, reenvia ou cancela o convite. Só API: as telas são AF4.

## Definition of Done

1. `affiliate.prisma` ganha `Affiliate` e `AffiliateInvite`, com a migração: e-mail único na loja entre
   os não encerrados, conta única na loja entre os não encerrados, slug único na loja.
2. Contracts: o afiliado como o lojista o lê, o convite como o convidado o lê, o que cada rota recebe e
   os códigos de erro.
3. `POST /stores/:slug/affiliates` cria `INVITED` e manda o e-mail do convite; `GET` lista (filtro por
   status, paginado) e lê um; `PATCH` troca a tabela e a nota; `POST …/resend`, `…/pause`, `…/resume`,
   `…/end`; `DELETE` cancela o convite. Só o dono; nasce fechado à página travada.
4. `GET /affiliate-invites/:token` responde a loja, a condição (a tabela, com as taxas por produto), os
   termos e a versão, se o e-mail já tem conta e um `/nome` sugerido. Vencido: `410`; usado, cancelado
   ou inexistente: `404`.
5. `GET /affiliate-invites/:token/slug?slug=` diz se o `/nome` serve, já normalizado, e por que não.
6. `POST /affiliate-invites/:token/accept` vincula a conta do bee-link com sessão; e-mail diferente do
   convite é `403` com o e-mail para quem ele é. `POST /affiliate-invites/:token/sign-up` cria a conta
   já verificada e aceita, numa transação, e responde a sessão.
7. O aceite reivindica o `/nome` sob uma trava compartilhada com as categorias: não é palavra de rota,
   não é slug (atual ou antigo) de categoria da loja, não é de outro afiliado da loja.
8. Uma categoria não é criada nem renomeada com o `/nome` de um afiliado da loja.
9. Seguimentos de AF1: apagar uma tabela com afiliados vivos é recusado; o resumo da tabela conta os
   afiliados, e o web de AF2 mostra esse número.
10. Mapa de superfície, `pnpm ci-check` verde, e2e novo verde e a suíte e2e inteira da API verde.

## Decisões

### Um convite por vínculo, e reenviar troca o link

`AffiliateInvite` tem o vínculo como chave. Reenviar gera token novo e mais 7 dias, e o link anterior
deixa de valer: o e-mail mais recente é o que conta. Entre dois envios, no mínimo um minuto
(`409 AFFILIATE_INVITE_RECENTLY_SENT`), para o botão não virar spam na caixa de outra pessoa.

### Cancelar o convite apaga o vínculo

Um convite que ninguém aceitou não tem venda, extrato nem link: não há história a guardar. O mesmo
e-mail pode ser convidado de novo na hora.

### E-mail e conta únicos entre os vivos; o `/nome`, para sempre

- E-mail e conta são únicos **entre os não encerrados** (índices parciais). O rascunho do épico dizia
  `@@unique([storeId, userId])`, mas o mesmo épico deixa o encerrado ser convidado de novo, num vínculo
  novo: só o índice parcial cabe nas duas frases.
- O `/nome` é único na loja **mesmo depois de encerrado**. O link de um afiliado encerrado continua
  abrindo a loja sem faixa (decisão 4), e liberar o nome faria esse link impresso creditar outra pessoa.
  Quem volta escolhe outro nome; reaproveitar o próprio fica para quando trocar o nome existir.

### O `/nome` mora no mesmo espaço das categorias

`/<loja>/<segmento>` lê palavra de rota, depois categoria, depois afiliado. Então:

- O nome é normalizado como o das categorias (`slugify`) e segue o formato do slug de loja (3 a 40,
  `[a-z0-9-]`).
- É recusado se for palavra de rota (`RESERVED_PATH_SEGMENTS`), slug atual **ou antigo** de categoria
  da loja (um antigo redireciona e esconderia o afiliado), ou de outro afiliado da loja.
- Reivindicar segura uma trava `pg_advisory_xact_lock` por loja e segmento, a mesma que a criação e a
  renomeação de categoria passam a segurar, no molde da regra 13. Sem ela, uma categoria e um afiliado
  criados no mesmo instante ficariam com o mesmo endereço. O índice único é o backstop.
- A categoria que esbarra num afiliado responde um código próprio,
  `PRODUCT_CATEGORY_SLUG_AFFILIATE`, para o painel dizer de quem é o endereço.

### Duas portas para aceitar

- **Com conta:** o convidado entra pelo login de sempre e chama `accept` com a sessão. O e-mail da
  conta tem de ser o do convite; senão `403 AFFILIATE_INVITE_EMAIL_MISMATCH`, com o e-mail para quem
  ele é em `details`. Quem tem o link recebeu o e-mail, então mostrar o endereço não revela nada novo.
- **Sem conta:** `sign-up` cria a conta do bee-link com o e-mail do convite, já verificada — o link
  chegou naquela caixa, que é tudo o que verificar prova —, grava o aceite dos termos do bee-link como
  no cadastro (`SIGN_UP`) e aceita o convite na mesma transação. Responde a sessão, como o login. Se o
  e-mail já tem conta, `409 AUTH_EMAIL_TAKEN`: a tela manda entrar.
- **Google:** o painel não entra com Google hoje (só os clientes da loja). Criar essa porta é uma
  funcionalidade nova do painel, fora do épico: fica registrada aqui e não entra em AF4.

### Os termos aceitos são os que foram lidos

O aceite manda a versão dos termos que a tela mostrou. Se o lojista mudou os termos no meio,
`409 AFFILIATE_TERMS_CHANGED` e a tela relê. O vínculo guarda a versão e quando.

### O que fica para depois

- `pendingCents` e `availableCents`: são o saldo, que só existe com a comissão. Entram em AF6.
- `photoUrl` e `tagline` entram agora no schema, nulos; o afiliado os edita em AF8 e o lojista os tira
  em AF7.
- A chave Pix é texto livre, de 1 a 140 caracteres. Conferir o formato fica para AF8, onde o afiliado
  a edita.

### Tabela com afiliados

Apagar uma tabela com afiliados vivos é `409 COMMISSION_TABLE_IN_USE`. Os encerrados nela passam para a
Padrão na mesma transação: a tabela deles não paga mais nada, e a chave estrangeira (`Restrict`) é o
backstop. O resumo da tabela conta os vivos (`affiliateCount`).

### O programa desligado não impede convidar

O lojista monta a lista antes de ligar. Atribuir pedido só com o programa ligado (AF6).

### O link do convite

`${WEB_URL}/afiliado/convite?token=…`, no domínio do bee-link: o afiliado é conta do bee-link, nunca da
loja. A página é de AF4. As rotas públicas do convite têm o mesmo limite por endereço das de login.

### Corrigido de AF1

O índice parcial de uma Padrão por loja estava só na migração; o `migrate diff` o lia como sobra e
gerava um `DROP INDEX`. Agora está declarado no schema (`partialIndexes`).

## Fora de escopo

- As telas do convite, da lista e da ficha: AF4.
- O link na vitrine e a atribuição: AF5 e AF6.
- O saldo e o extrato: AF6 e AF7.
- Editar foto, frase, Pix e telefone pelo afiliado: AF8.
- Trocar o `/nome` depois do aceite: fora da v1 (épico).
- Entrar no painel com Google: fora do épico.
