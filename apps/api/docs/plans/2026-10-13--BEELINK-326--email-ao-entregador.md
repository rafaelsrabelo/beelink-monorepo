# BEELINK-326 (AA10) — API: quem se cadastrou para entregar recebe um e-mail

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316). Vem depois do AA5 (BEELINK-321, a tabela e a rota), do AA6 (BEELINK-322, o
> formulário que envia) e do AA9 (BEELINK-325, CPF, e-mail e WhatsApp únicos). Sai de `main` e o PR
> tem `main` como base. Toca só `apps/api` (e `docs/product/`, que não é workspace). Escrito em
> 13/10/2026.

## O pedido

O Rafael, em 13/10/2026: "enviar email para quem se cadastrou pra entrega, dizendo que em breve
chegará orientações pra seguir o cadastro".

Hoje o formulário da landing grava o interessado em `courier_applications` e a tela diz "Em breve
você recebe no seu e-mail as informações para concluir o cadastro". Nenhum código envia nada: o
plano do AA6 registrou isso como risco ("alguém precisa escrever para essas pessoas, à mão").

O texto e o assunto foram decididos pelo orquestrador, e o Rafael pode mudar:

- Assunto: `Recebemos o seu cadastro de entregador na Beelink`
- Corpo: `Olá, <primeiro nome>.` / `Recebemos o seu cadastro para fazer entregas com a Beelink em
  <cidade>.` / `Em breve você recebe, neste e-mail, as orientações para seguir com o cadastro. Por
  enquanto, não é preciso fazer mais nada.` / `Equipe Beelink`

## Definição de Pronto

1. **A tabela dos e-mails devidos**, `courier_application_notices` (modelo
   `CourierApplicationNotice`, em `prisma/schema/courier.prisma`): o cadastro a que pertence
   (`applicationId`, único, apagado junto com ele) e as quatro colunas que `OutboxMailer` exige
   (`attempts`, `nextAttemptAt`, `sentAt`, `createdAt`). Migration escrita à mão; `prisma validate`
   e `prisma generate` passam.
2. **Quem já está na lista recebe, uma vez:** a mesma migration deixa um e-mail devido para cada
   endereço que já tem cadastro.
3. **Cada cadastro novo deixa o seu e-mail devido na mesma transação que o grava.** Depois do
   commit, o serviço pede o envio e não espera por ele.
4. **A rota não muda:** `204` para cadastro guardado e para a armadilha, `400`, `409`, `429` e `500`
   como antes. Um e-mail que não sai não muda nenhuma dessas respostas.
5. **Cadastro recusado por repetição (409), armadilha e escrita que o banco recusa não deixam e-mail
   devido** e não pedem envio.
6. **A caixa de saída é a da casa:** `CourierApplicationMailer` estende `OutboxMailer`. Enviado,
   marca `sentAt`. Não enviado, espera 1, 2, 4 e 8 minutos; na quinta falha desiste e registra só o
   id do aviso.
7. **Um e-mail por endereço**, garantido na migration, no serviço e na própria caixa (decisão 4).
8. **O texto** acima, em texto puro e em HTML, no cartão dos outros e-mails, sem botão e sem link.
   Só o primeiro nome; a cidade pelo nome que `COURIER_CITIES` dá ao código guardado. Remetente:
   `MAIL_FROM`.
9. **Nada do que este ticket escreve no log tem dado pessoal.**
10. **Privacidade:** conferido se a versão `2026-10-14` já diz que o bee-link fala por e-mail com
    quem se candidata. Nenhuma versão nova é criada aqui.
11. **Documentos:** `apps/api/docs/README.md` (o módulo e a linha da rota), o Swagger da rota e
    `docs/product/README.md`, que hoje diz que o produto não escreve para ninguém.
12. **Testes de unidade:** o modelo do e-mail; o que a caixa envia (um por endereço, falha, desistência);
    o serviço gravando o e-mail devido junto com o cadastro; o `MailService` com o remetente certo.
13. **O spec e2e escrito**, sem rodar: cadastro → e-mail no Mailpit; recusado por repetição não gera
    e-mail; nova varredura não duplica; a instrução de carga da migration contra o Postgres.
14. **Comandos que este ambiente permite:** o Vitest dos arquivos de unidade tocados, `tsc --noEmit`,
    `pnpm arch-gates` e `pnpm docs-gate`. (Sem `ci-check`, sem build, sem Docker: disco com 1 Gi e
    Docker travado.)

## Decisões

### A tabela

1. **Uma linha por cadastro, e não por endereço.** `applicationId` é único e tem chave estrangeira
   com `ON DELETE CASCADE`, como `cashback_expiry_notices.creditId` e `order_refund_notices.refundId`.
   A tabela não guarda o e-mail: o endereço e o nome são lidos do cadastro na hora do envio. Assim
   não existe uma segunda cópia de dado pessoal para corrigir ou apagar, e o `DELETE` por CPF do
   plano do AA5 (o pedido de exclusão) leva o e-mail devido junto: ninguém apagado recebe mensagem.
   - A alternativa era uma coluna `email` com índice único na própria tabela. Ela tornaria "um por
     endereço" uma regra do banco, mas duplicaria o e-mail, e um cadastro corrigido à mão deixaria a
     cópia errada.
2. **O índice é o das caixas mais novas:** parcial, em `nextAttemptAt`, só do que ainda é devido
   (`"sentAt" IS NULL AND attempts < 5`), com o nome `courier_application_notices_owed_idx`.
3. **Os ids da carga são `uuidv7()` do Postgres**, como nas outras migrations que criam linhas
   (produção roda Postgres 18, que tem a função).

### Um e-mail por endereço

4. **Três camadas, cada uma suficiente para o seu caso:**
   - **A carga da migration** escolhe uma linha por endereço: `SELECT DISTINCT ON ("email") … ORDER
     BY "email", "createdAt", "id"`. Dois cadastros de antes do AA9 com o mesmo e-mail geram um
     e-mail devido, o do cadastro mais antigo. É o primeiro nome desse cadastro que a mensagem usa.
   - **O serviço** só grava um cadastro cujo e-mail não está na lista (AA9), e procura, grava o
     cadastro e grava o e-mail devido num passo só, sob a mesma trava. Um cadastro novo é sempre um
     endereço novo.
   - **A caixa**, antes de enviar, confere se o aviso é o mais antigo do seu endereço. Se existe
     outro aviso mais antigo de um cadastro com o mesmo e-mail, este é dado por concluído (`sentAt`)
     sem enviar. A regra não depende de quem enviou primeiro: só o mais antigo de cada endereço é
     enviado, então dois processos varrendo ao mesmo tempo não mandam dois. Ela cobre o que as duas
     camadas de cima não veem: um aviso escrito à mão, ou por um caminho que ainda não existe.
5. **A comparação do endereço é a igualdade do que está guardado**, como no AA9. O DTO já guarda o
   e-mail sem espaços e em minúsculas. Não usei `lower()` do Postgres, pelo motivo da decisão 10 do
   AA5.

### O envio

6. **O serviço chama `dispatch()` depois do commit e não espera.** É o desenho das outras caixas
   (`OrdersService`, `PaymentNews`): `dispatch()` não lança e não devolve promessa. O cadastro
   responde antes de o SMTP ser tocado.
7. **A escrita do e-mail devido faz parte da transação do cadastro.** Se ela falhar, o cadastro não
   é gravado e a rota responde o mesmo 500 sem causa de hoje. É o que "caixa de saída" quer dizer:
   os dois existem ou nenhum existe. O que nunca derruba um cadastro é o **envio**.
8. **Desistir não marca `sentAt`**, como nas cinco caixas que existem: depois da quinta falha a linha
   fica com `attempts = 5` e `sentAt` nulo, e a varredura não a pega mais. `sentAt` fica para o que
   foi enviado e para o que foi dado por concluído sem enviar (decisão 4). Isso deixa as desistências
   visíveis numa consulta, e rearmar uma é um `UPDATE` (ver "Consultas").
9. **A carga sai em lotes de 20 por minuto.** É o `BATCH` do `OutboxMailer`: a primeira varredura
   acontece um minuto depois de a API subir, e cada uma pega até 20. Não mexi nisso.

### O texto

10. **O cartão é o dos outros e-mails, sem o botão.** `layout()` sempre desenha um botão e o endereço
    dele, e este e-mail não tem para onde levar. A moldura do cartão virou uma função (`card`), que o
    `layout()` usa sem mudar um byte do que produzia, e `note()` desenha o mesmo cartão só com título
    e corpo.
11. **Remetente: `MAIL_FROM`, sem nome de loja.** O e-mail é da Beelink, como o de confirmação de
    conta de um lojista.
12. **Só o primeiro nome, e só se ele for feito de letras.** O nome é o que alguém digitou, e o
    endereço não foi confirmado por ninguém: quem preenche o formulário com o e-mail de outra pessoa
    escolhe o que essa pessoa lê depois de "Olá,". Um "nome" como `www.exemplo.com` vira link no
    programa de e-mail de quem recebe, e o pedido é um e-mail sem link. Se a primeira palavra do nome
    tiver qualquer coisa além de letras, apóstrofo ou hífen, a saudação é só "Olá."
13. **A cidade vem de `COURIER_CITIES`**, pelo código guardado (`FORTALEZA_CE` → "Fortaleza"). A
    coluna é texto: um código que saiu da lista (uma cidade fechada depois) não tem nome, e a frase
    sai sem a cidade ("Recebemos o seu cadastro para fazer entregas com a Beelink."). A pessoa recebe
    o e-mail do mesmo jeito.
14. **"Olá, <nome>." com ponto**, como o texto pedido, e não o "Olá, <nome>!" dos outros modelos.

### O log

15. **A caixa registra o id do aviso e nada do cadastro.** Na desistência, `{ noticeId }`. O serviço
    continua registrando só o código de uma falha do banco.

## Fora do escopo

- Qualquer coisa no web ou na landing. A frase de sucesso do formulário já diz que o e-mail chega.
- O e-mail para a Beelink a cada cadastro (BEELINK-323, cancelado pelo Rafael).
- Exportar a lista, tela para ler a lista, as orientações em si.
- Os dois índices únicos de e-mail e WhatsApp e a limpeza dos repetidos antigos (decisão 3 do AA9).
- Versão nova dos textos legais.
- Preferência de "não quero receber": é uma mensagem só, sobre um cadastro que a pessoa enviou.

## Riscos

- **O endereço não foi confirmado por ninguém.** As outras caixas só escrevem para conta com e-mail
  confirmado; aqui não há conta. Quem digita o e-mail de outra pessoa faz a Beelink escrever para
  ela. O que contém isso: um endereço entra na lista uma vez só (AA9), então recebe uma mensagem só,
  para sempre; o limite por IP é de 5 envios a cada 10 minutos; e a mensagem não leva link nem texto
  livre (decisão 12).
- **Um cadastro feito entre a migration e a troca do container não recebe o e-mail.** Em produção a
  migration roda num container próprio antes de a API nova subir, e a API antiga atende enquanto
  isso: um cadastro que ela gravar nesse intervalo fica sem e-mail devido. A consulta para achar e
  consertar está em "Consultas".
- **A migration nunca foi aplicada num banco** (o Docker não respondia). Foi escrita à mão no padrão
  das vizinhas e conferida pelo `prisma validate`; isso não prova o SQL.
- **Quantos e-mails a carga dispara em produção eu não sei.** A consulta está em "Consultas".
- **Homologação recebe a mesma carga:** se o banco de lá tiver cadastros, eles recebem o e-mail
  quando a branch chegar lá, pelo SMTP que estiver configurado.
- **Um envio que falha escreve o erro do nodemailer no log** (`MailService`, como em todo e-mail da
  casa). Quando o provedor recusa o destinatário, esse erro traz o endereço. Não é deste ticket e
  não foi mudado; está anotado como achado.

## Consultas

Antes do deploy, quantos e-mails a carga vai dever (cadastros e endereços distintos):

```sql
SELECT count(*) AS cadastros, count(DISTINCT "email") AS enderecos FROM "courier_applications";
```

Depois do deploy, como está a caixa:

```sql
SELECT count(*) FILTER (WHERE "sentAt" IS NOT NULL)                   AS concluidos,
       count(*) FILTER (WHERE "sentAt" IS NULL AND "attempts" < 5)    AS devidos,
       count(*) FILTER (WHERE "sentAt" IS NULL AND "attempts" >= 5)   AS desistidos
FROM "courier_application_notices";
```

Endereços da lista sem nenhum e-mail devido (o intervalo do deploy):

```sql
SELECT a."id", a."createdAt"
FROM "courier_applications" a
WHERE NOT EXISTS (
  SELECT 1 FROM "courier_application_notices" n
  JOIN "courier_applications" b ON b."id" = n."applicationId"
  WHERE b."email" = a."email"
);
```

Dever um e-mail a cada um deles, um por endereço:

```sql
INSERT INTO "courier_application_notices" ("id", "applicationId")
SELECT uuidv7(), first."id"
FROM (
  SELECT DISTINCT ON (a."email") a."id"
  FROM "courier_applications" a
  WHERE NOT EXISTS (
    SELECT 1 FROM "courier_application_notices" n
    JOIN "courier_applications" b ON b."id" = n."applicationId"
    WHERE b."email" = a."email"
  )
  ORDER BY a."email", a."createdAt", a."id"
) AS first;
```

Rearmar os que a caixa desistiu de enviar (depois de consertar o SMTP):

```sql
UPDATE "courier_application_notices"
SET "attempts" = 0, "nextAttemptAt" = CURRENT_TIMESTAMP
WHERE "sentAt" IS NULL AND "attempts" >= 5;
```

## Desfazer a migration

O Prisma não tem migration de volta. À mão:

```sql
BEGIN;
DROP TABLE "courier_application_notices";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013145546_courier_application_notices';
COMMIT;
```

Não desfaz e-mail enviado. Com o código deste ticket no ar e a tabela apagada, todo cadastro novo
responde 500: desfaça o código antes.

---

## Como ficou (acréscimo de 13/10/2026, depois da implementação)

Nada acima foi reescrito. Esta seção diz o que foi implementado, o que foi rodado e o que cada
coisa mostrou.

### O ambiente mudou: os itens 13 e 14 da Definição de Pronto foram cumpridos de verdade

Quando o plano foi escrito não havia Docker e o disco tinha 1 Gi. Na implementação havia um
Postgres 18.6 em `localhost:5442` e um Mailpit em `localhost:1027` (SMTP) e `localhost:8027` (HTTP),
com 4,4 Gi livres. Então:

- **Item 13:** o spec e2e foi escrito **e rodado**, contra Postgres e Mailpit de verdade.
- **Item 14:** rodaram `pnpm turbo type-check lint test --filter=api` (a suíte de unidade inteira da
  API), `pnpm arch-gates`, `pnpm docs-gate` e a suíte e2e inteira da API. Não rodaram o `pnpm
  ci-check` completo, nenhum build e nenhum Playwright do web.

### Resposta ao risco "a migration nunca foi aplicada num banco"

Foi aplicada em três bancos do Postgres 18.6, com `prisma migrate deploy`:

1. **Um banco de rascunho** (`harness_landing_backfill`, criado para isto e apagado no fim),
   migrado até `20261013010008_courier_applications` e preenchido à mão antes desta migration.
2. **O banco da suíte e2e** (`harness_landing_test`), pelo `global-setup`.
3. **O banco de desenvolvimento desta worktree** (`harness_landing`).

**A prova da carga**, no banco de rascunho. Entraram 7 cadastros com 4 endereços distintos:

| Cadastro (fim do id) | E-mail | `createdAt` |
|---|---|---|
| `…00a` | `repetida@exemplo.test` | 10/10 10:00 |
| `…00b` | `repetida@exemplo.test` | 11/10 09:00 |
| `…00c` | `repetida@exemplo.test` | 12/10 08:00 |
| `…00d` | `sozinha@exemplo.test` | 12/10 11:00 |
| `…00e` | `outra@exemplo.test` | 09/10 07:00 |
| `…f02` | `empate@exemplo.test` | 12/10 12:00 |
| `…f01` | `empate@exemplo.test` | 12/10 12:00 (o mesmo instante) |

Saíram 4 e-mails devidos, um por endereço, cada um do cadastro mais antigo do endereço: `…00a`
(repetida), `…00d` (sozinha), `…00e` (outra) e `…f01` (empate: no mesmo instante decide o id, e o
menor é o `…f01`). Todos com `attempts = 0`, `sentAt` nulo, já vencidos para envio, e com id
`uuidv7`.

No mesmo banco:

- `prisma migrate diff --from-config-datasource --to-schema prisma/schema --exit-code` respondeu
  **"No difference detected"**: o SQL escrito à mão cria exatamente o que o schema descreve.
- Apagar o cadastro `…00a` apagou o e-mail devido dele (`ON DELETE CASCADE`).
- As consultas da seção "Consultas" rodaram como estão escritas: a de endereços sem e-mail devido
  achou `…00b` e `…00c`, e a que conserta deixou um e-mail devido só para `…00b`, o mais antigo que
  restou.
- O roteiro de "Desfazer a migration" rodou, e depois dele a migration foi aplicada de novo sem erro.

### O que foi rodado e o que mostrou

- **O teste que fixava o `layout()` byte a byte** passou contra o `layout()` intocado (23 testes) e
  passou de novo depois de a moldura virar `card` (23 testes). Foi removido antes do commit, como
  previsto. `layout` já era exportado: nenhum `export` novo ficou para trás por causa dele.
- **Unidade:** 123 arquivos, 1451 testes, todos passando. `tsc --noEmit` e `oxlint` sem erro.
- **O spec e2e do cadastro** (`test/courier-applications.e2e-spec.ts`): 35 testes, rodado 4 vezes
  seguidas, 35 de 35 em todas. Cobre: o e-mail chega ao Mailpit com o texto pedido, do remetente da
  casa, sem link; um por cadastro e nova varredura não duplica; 409, 400, armadilha e 500 não deixam
  e-mail devido; a resposta não espera o envio; o envio que falha fica devido e sai na varredura
  seguinte; de dois avisos do mesmo endereço só o mais antigo sai, com duas varreduras ao mesmo
  tempo; **a instrução de carga lida do próprio arquivo da migration** e executada no Postgres;
  apagar o cadastro apaga o e-mail devido; a desistência na quinta tentativa registra só o id do
  aviso; nada de pessoal no log.
- **O spec morde.** Quatro defeitos plantados de propósito, um por vez, e desfeitos em seguida: sem
  a conferência do mais antigo na caixa (1 teste falha), sem o `DISTINCT ON` na migration (1 falha),
  sem o `dispatch()` no serviço (12 ou mais falham) e sem a escrita do e-mail devido (8 falham).
- **A suíte e2e inteira da API:** 88 arquivos, 86 passaram; 1156 testes, 1150 passaram. Os 6 que
  falharam estão em dois arquivos e vêm do `.env` desta worktree, não desta branch (ver "Achados").
- **O processo de verdade** (`nest start` na 3201, banco `harness_landing`, Mailpit): com 47
  cadastros inventados de 45 endereços gravados antes da migration, a carga deixou 45 e-mails
  devidos. Com a API no ar: 0 e-mails ao subir, **20 aos 60 s, 40 aos 121 s, 45 aos 182 s**. É o
  lote de 20 por minuto da decisão 9, medido. Pela rota, com `curl`: `204` e um e-mail em menos de
  um segundo; o mesmo corpo de novo, `409` e nenhum e-mail; armadilha, `204` e nenhum e-mail; CPF
  errado, `400` e nenhum e-mail. No fim, 46 avisos, todos com `sentAt` e `attempts = 1`. O log da
  API em nível `info` não tem nome, CPF, telefone nem endereço de ninguém, e nenhum aviso ou erro.
  Os cadastros inventados foram apagados e a caixa do Mailpit esvaziada.

### Decisões tomadas na implementação (continuam a numeração)

16. **O primeiro nome precisa começar por letra, e é composto antes de ser conferido** (refina a
    decisão 12). O nome passa por `normalize('NFC')` antes do teste: um acento digitado separado da
    letra é uma marca, e sem isso "João" vindo de alguns teclados perderia a saudação. Aceita os dois
    apóstrofos, o do teclado e o que o celular troca sozinho (`'` e `’`). Uma primeira palavra que
    seja só hífen ou apóstrofo não é nome: a saudação fica "Olá."
17. **"O mais antigo do endereço" é medido pelo aviso, não pelo cadastro** (precisa a decisão 4): o
    `createdAt` do aviso e, no empate, o id. Um aviso que já é o mais antigo continua sendo, porque
    todo aviso novo nasce depois dele. Se a medida fosse a idade do cadastro, um aviso escrito mais
    tarde para um cadastro mais velho passaria na conferência depois de o endereço já ter recebido.
18. **O e-mail devido é escrito pela mesma escrita que grava o cadastro** (`notice: { create: {} }`
    dentro do `create`), e não por uma segunda chamada na transação (implementa a decisão 7). Não
    há como gravar um sem o outro, nem por esquecimento.
19. **Um aviso que sumiu entre a reserva e o envio não faz nada.** Apagar o cadastro apaga o aviso;
    a caixa não envia, não escreve e não registra.
20. **`card` não é exportada; `note` é.** `layout()` e `note()` são as duas formas de desenhar o
    cartão, e nada fora do arquivo precisa da moldura crua.
21. **O nome da cidade sai de `courierCityNameOf(code)`**, em `couriers.constants.ts`, que só olha
    chaves próprias de `COURIER_CITIES` (um código como `constructor` não vira cidade).
22. **O spec e2e espera a caixa esvaziar depois de cada teste.** Como o cadastro pede o envio e não
    espera, um teste que terminasse com um e-mail a caminho o deixaria cair na caixa do teste
    seguinte. A consequência: o arquivo inteiro passa a depender do Mailpit, inclusive os testes que
    não são sobre e-mail.
23. **`test/support/mailpit.ts` ganhou `countMessages(to)`**, para os testes que seguram um endereço
    a um e-mail só.

### Riscos, revistos

- **Quantos e-mails a carga dispara em produção continua sem resposta.** A consulta está em
  "Consultas", e precisa ser rodada antes do merge. A mesma pergunta vale para homologação.
- **Cadastros de teste que estiverem na lista de produção recebem o e-mail.** Endereço inventado
  volta como recusa do provedor, é tentado 5 vezes e fica como desistência. Vale olhar a lista e
  apagar os de teste antes do merge.
- **Enquanto a carga escoa, quem se cadastra espera na fila.** A caixa pega os 20 mais antigos por
  varredura, e os da carga são mais antigos que qualquer cadastro novo. Com N na carga, um cadastro
  novo pode esperar até N/20 minutos. Cada cadastro novo dispara uma varredura a mais, o que adianta
  a fila em 20.
- **O provedor de verdade nunca viu este e-mail.** Tudo acima é Mailpit. Como o HTML aparece no
  Gmail, no Outlook e no celular não foi visto, e uma recusa real de destinatário não foi exercitada.
- **Dois processos da API na mesma caixa** não foram exercitados: o spec faz duas varreduras ao
  mesmo tempo no mesmo processo.

### Achados fora do escopo, não mexidos

- **`apps/web/docs/README.md`, linha 85**, ainda diz "Nothing is e-mailed to anyone". Ficou falso
  com este ticket. Não foi corrigido aqui porque o PR é só da API, e tocar em `apps/web` puxa os jobs
  do web para o CI dele. É uma frase, para um PR do web.
- **Dois specs e2e falham nesta máquina por causa do `apps/api/.env` da worktree**, e passam onde não
  há `.env` (o CI): `custom-domain.e2e-spec.ts` (5 testes) espera `SHOP_DOMAIN_PROBE` ligado e o
  `.env` daqui o desliga — com `SHOP_DOMAIN_PROBE=true` no shell, 14 de 14; e
  `meta-pixel-without-vault-key.e2e-spec.ts` (1 teste) zera `INTEGRATIONS_SECRET_KEY` no processo,
  mas `expand(config())` do `env.ts` repõe o valor do `.env` por cima de uma variável vazia (medido
  com uma variável inventada). Esta branch não toca em `env.ts`, nesses specs nem na configuração da
  suíte. O segundo não foi visto passar aqui.
- **O erro do nodemailer no log** (o achado que o plano já anotava) continua como estava.
