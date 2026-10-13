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
