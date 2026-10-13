# BEELINK-321 (AA5) — API: a tabela dos entregadores interessados e a rota pública que recebe o cadastro

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Quinto ticket: sai de `origin/main` (que já tem AA1,
> AA2 e AA3; o AA4 está em PR aberto e não é base deste), e o PR tem `main` como base. Toca
> `packages/contracts` e `apps/api`. **Não toca `apps/web` nem `packages/ui`**: o formulário que envia
> e a rota do web são do AA6 (BEELINK-322). O Rafael delegou as decisões deste épico; as que estão
> abaixo são do desenvolvedor, e ele pode mudar qualquer uma. Escrito em 12/10/2026.

## O problema

O formulário "Comece seu cadastro" da landing confere o que foi digitado e não envia nada: quem se
interessa em entregar pela Beelink não fica em lugar nenhum. O Rafael pediu uma tabela para os
interessados. Por enquanto é só guardar (sem tela e sem e-mail), o cadastro só vale para Fortaleza, e
o formulário passa a pedir nome, CPF, e-mail, WhatsApp, cidade, veículo e o aceite dos termos.

Este ticket entrega o lado do servidor: a tabela, os tipos de fio e a rota pública. Depois dele a
landing continua igual; o AA6 liga o formulário à rota.

## Definição de Pronto

1. **A tabela.** Uma migração Prisma cria `courier_applications` (arquivo novo
   `prisma/schema/courier.prisma`): nome, `document` (CPF em 11 dígitos, com `CHECK` no banco),
   e-mail, WhatsApp (só dígitos), cidade (texto), veículo, a versão dos termos aceita e quando,
   criado em e atualizado em. Índice único no CPF. Sem situação e sem vínculo com `users`. A migração
   aplica do zero sem erro, está aplicada em `harness_landing`, e o SQL que a desfaz está escrito
   neste plano e foi exercitado.
2. **Os tipos de fio** em `packages/contracts/src/courier.ts`, exportados pelo `index.ts`: o corpo do
   cadastro, o veículo, a cidade aberta e os códigos de erro. Só tipos.
3. **A cidade é uma lista fechada**, hoje só Fortaleza/CE: o tipo mora nos contratos, a lista mora na
   API e é tipada por ele de modo que uma não compila sem a outra. Abrir uma cidade não pede migração.
4. **A rota** `POST /api/courier-applications`, pública, num módulo novo `modules/couriers/`, com
   limite por IP próprio: duas variáveis novas, com padrão, em `env.ts`, no `.env.example`, na tabela
   de `apps/api/docs/README.md` e no `docker-compose.dokploy.yml`. O excesso responde 429.
5. **A resposta é 204** para cadastro novo, para CPF repetido e para a armadilha, e as três são
   iguais. O CPF repetido não cria a segunda linha: atualiza os dados e o aceite. A armadilha não
   grava.
6. **A validação é do servidor**, e cada recusa responde 400 com o seu `errorCode` no formato
   `ApiErrorBody`: CPF (dígitos verificadores, com ou sem pontuação, gravado em dígitos), nome com
   sobrenome, e-mail (gravado em minúsculas), celular brasileiro com DDD (gravado em dígitos), cidade
   da lista, veículo conhecido, aceite obrigatório.
7. **A versão dos termos gravada é a `LEGAL_VERSION` do servidor.** Um corpo não consegue escolher a
   versão nem a data do aceite.
8. **Nenhum dado pessoal no log**: nem na linha da requisição, nem na recusa de validação, nem numa
   falha do banco. Um teste prende isso lendo o que o pino escreveu.
9. **Documentos:** a rota no Swagger, a linha na tabela de rotas de `apps/api/docs/README.md` e o
   módulo no mapa do mesmo arquivo. A política de privacidade não muda aqui.
10. **Este plano traz o comando SQL** para apagar um cadastro pelo CPF.
11. **Testes:** o serviço e o DTO em unidade; um spec e2e da rota contra o Postgres; a suíte e2e
    inteira da API rodada, com cada falha comparada com `origin/main`; `pnpm --filter api build` e
    `pnpm ci-check` verdes.
12. **Um `curl` de verdade** na API de pé (porta 3201) com um cadastro válido, e a linha conferida no
    banco com `psql`. Os dados de teste são inventados e apagados no fim.

## Decisões

### Nomes

1. **O recurso é "courier application"**: tabela `courier_applications`, modelo `CourierApplication`,
   rota `/courier-applications`, tipos `CourierApplication*`. O módulo é `couriers`, como o briefing
   pede: é a pasta onde o aplicativo dos entregadores vai morar quando existir, e o cadastro de
   interesse é a primeira coisa dela.
2. **A rota fica na raiz**, `POST /api/courier-applications`, e não debaixo de `/stores/…`: o
   entregador se cadastra na Beelink, não numa loja.
3. **O CPF se chama `document` do fio ao banco** (coluna pedida pelo briefing): um nome só nas três
   camadas. O que ele é está dito no tipo, no Swagger e na `CHECK`.
4. **O aceite se chama `acceptedTerms`** no corpo, um booleano. Só `true` passa: a string `"true"`
   é recusada, porque o `ValidationPipe` daqui não converte tipos (regra 6 de `apps/api/AGENTS.md`).
5. **O campo-armadilha se chama `website`**, como no formulário de contato dos sites: uma armadilha
   só para a casa, e o AA6 desenha o campo do mesmo jeito.

### O dado

6. **Veículo é enum do banco** (`CourierVehicle`: `MOTORCYCLE`, `BICYCLE`, `CAR`, `VAN`), como os
   outros conjuntos fechados daqui. **Cidade é texto**, como o briefing pede: guarda o código
   (`FORTALEZA_CE`), que se lê na tabela sem consultar nada.
7. **A lista de cidades é um `Record<CourierCity, …>` na API**, e não um vetor: com vetor, acrescentar
   uma cidade ao tipo continuaria compilando sem a lista. Com o `Record`, o tipo e a lista só
   compilam juntos, nos dois sentidos. Cada cidade traz nome e UF, para quem for ler a lista.
8. **O WhatsApp é gravado com o 55 na frente** (13 dígitos), do jeito que o WhatsApp de uma loja e o
   telefone de um cliente já são gravados: `wa.me/<isto>` sai direto da coluna, e é por WhatsApp que
   alguém vai chamar essa lista. A normalização é a `normaliseWhatsapp` que já existe
   (`stores/dto/store-fields.dto.ts`); não foi escrita outra.
9. **Só celular**: DDD sem zero, nove dígitos começando por 9. O formulário de hoje aceita fixo; o
   briefing pede celular, e WhatsApp de entregador é celular. O AA6 acerta a regra do formulário.
10. **Duas `CHECK`, as duas de dígitos:** `document` com exatamente 11 dígitos e `whatsapp` só com
    dígitos (10 a 15). São formas que o JavaScript e o Postgres leem igual. **Não há `CHECK` de
    e-mail em minúsculas**: `lower()` do Postgres e `toLowerCase()` do JavaScript discordam em
    letras fora do ASCII, e uma `CHECK` que recusa um e-mail válido é um 500 para uma pessoa de
    verdade.
11. **O nome guarda o que foi digitado**, sem as pontas e com os espaços repetidos reduzidos a um.
    "Com sobrenome" é ter pelo menos duas palavras, a regra que o formulário já usa. Até 120
    caracteres, como o nome de um lead.
12. **Sem índice além do único e da chave.** Nada lê essa tabela ainda.

### A rota

13. **A validação fica no DTO**, com o código de cada recusa declarado no `context` do decorador, que
    é como o `ApiValidationPipe` daqui já responde um `errorCode` por campo (cliente, página). O
    serviço fica com o que é regra: a armadilha, o que se grava, a versão dos termos e o que acontece
    quando o banco falha.
14. **Um código por campo:** `COURIER_NAME_INVALID`, `COURIER_DOCUMENT_INVALID`,
    `COURIER_EMAIL_INVALID`, `COURIER_WHATSAPP_INVALID`, `COURIER_CITY_NOT_OPEN`,
    `COURIER_VEHICLE_INVALID`, `COURIER_TERMS_REQUIRED`. Com vários campos ruins, a resposta traz o
    primeiro, na ordem do corpo. Um campo que o corpo não tem (ou a armadilha com o tipo errado)
    responde o `BAD_REQUEST` de sempre.
15. **A validação vem antes da armadilha.** Um robô com corpo inválido recebe o mesmo 400 que uma
    pessoa; com corpo válido e a armadilha preenchida, o mesmo 204. Em nenhum dos dois ele aprende
    que a armadilha existe.
16. **CPF repetido é um `upsert` pela coluna única**: uma instrução, sem ler antes. Atualiza nome,
    e-mail, WhatsApp, cidade, veículo, a versão dos termos e a hora do aceite; `createdAt` fica como
    estava. Quem tem o CPF de outra pessoa consegue trocar os dados do cadastro dela: é o preço de a
    resposta não dizer se o CPF já estava lá (ver Riscos).
17. **O limite por IP:** `COURIER_APPLICATION_RATE_LIMIT_MAX` (5) e
    `COURIER_APPLICATION_RATE_LIMIT_WINDOW` (`10 minutes`), os números do formulário de contato: uma
    pessoa que erra e tenta de novo, não um robô.
18. **Nada de e-mail e nada de leitura.** A rota só grava. Não existe `GET`.

### O log

19. **O que o pino escreve de uma requisição não tem corpo**: método, endereço, cabeçalhos e status.
    Uma recusa de validação não é registrada pelo filtro (só o que responde 500 ou mais), e a
    mensagem do 400 cita o nome do campo, nunca o valor.
20. **O caminho que vaza é o 500.** O filtro registra a exceção inteira, e o Postgres escreve a linha
    recusada no detalhe do erro ("Failing row contains …"). Por isso o serviço não deixa o erro do
    banco subir: registra só o código do erro e responde um 500 sem causa. É o único `try/catch` do
    módulo, e tem teste.
21. **O teste lê o log de verdade:** o spec e2e sobe o app com as mesmas opções do pino que o
    `main.ts` usa, trocando só o destino por um fluxo em memória, e procura nome, CPF, e-mail e
    telefone em tudo o que foi escrito, nos três casos (204, 400 e 500). Para o 500, o banco de teste
    recusa a linha de verdade.

## Fora do escopo

- O formulário da landing, o handler do web (`/api/…`) e o evento `generate_lead` (AA6, BEELINK-322).
- O texto da política de privacidade sobre os dados do entregador (AA6, junto com o formulário que
  passa a enviar). **Até lá a rota existe e ninguém a chama.**
- Tela para ler a lista, e-mail de confirmação, exportação.
- Situação do cadastro, vínculo com conta, documentos do entregador.
- Rotina de retenção: nada apaga um cadastro sozinho.
- `docs/product/`: o que o entregador ganha passa a ser verdade quando o formulário enviar (AA6).

## Riscos

- **Quem sabe o CPF de alguém pode sobrescrever o cadastro dessa pessoa** (decisão 16). Não há sessão
  nem prova de posse, e recusar o segundo envio diria a qualquer um quais CPFs estão na lista. Para
  uma lista de interesse o dano é um contato errado; quando o cadastro virar conta de entregador,
  isso pede confirmação por e-mail ou WhatsApp.
- **A armadilha e o limite por IP não param um robô paciente.** A tabela pode receber lixo com CPFs
  válidos gerados. Não há captcha.
- **CPF, e-mail e telefone ficam em texto puro no banco**, como o CPF de um cliente. Um dump os leva.
- **O limite depende de o web repassar o endereço do visitante** (`x-forwarded-for`, com
  `TRUST_PROXY`): o handler do AA6 precisa usar `forwardToApi`, como o do formulário de contato. Sem
  isso todos os visitantes dividem um balde de cinco envios.
- **Nada disto foi usado por um formulário.** A rota é exercitada por teste e por `curl`.

## Apagar um cadastro (pedido de exclusão)

Não há tela. Com o CPF em dígitos:

```sql
DELETE FROM "courier_applications" WHERE "document" = '00000000000' RETURNING "id", "createdAt";
```

Uma linha devolvida é o cadastro apagado; nenhuma, o CPF não estava na lista. Para ler antes de
apagar: `SELECT * FROM "courier_applications" WHERE "document" = '00000000000';`

## Notas da entrega (acréscimo, 12/10)

**Correções ao que está acima.**

- **Decisão 14:** "um campo que o corpo não tem" ficou ambíguo. Um campo obrigatório **que falta** é
  recusado com o código daquele campo, como um campo errado (`{}` responde `COURIER_NAME_INVALID`). O
  `BAD_REQUEST` sem código próprio é para um campo **que a rota não conhece** (`termsVersion`, por
  exemplo) e para a armadilha com o tipo errado.
- **Decisão 20:** o que vai para o log quando o banco recusa é a classe do erro, o código do Prisma e
  o SQLSTATE do Postgres, por exemplo `PrismaClientKnownRequestError P2039 23514` (23514 é uma
  `CHECK`). Cada um só entra se tiver forma de código (uma palavra só); qualquer outra coisa que o
  erro carregue pode ser a linha, e fica de fora.
- **Decisão 16:** o `upsert` do Prisma vira **uma instrução**, `INSERT … ON CONFLICT ("document") DO
  UPDATE`. Conferido lendo o SQL que ele emite. Dez envios simultâneos do mesmo CPF respondem 204 e
  deixam uma linha (teste e2e).
- **Definição de Pronto, item 1, "aplica do zero":** ver "O que foi e o que não foi conferido".

**Onde ficou cada coisa.**

- Contratos: `packages/contracts/src/courier.ts` (`CourierVehicle`, `CourierCity`,
  `CourierApplicationPayload`, `CourierApplicationErrorCode`), exportado pelo `index.ts`.
- Migração `20261013010008_courier_applications` e `prisma/schema/courier.prisma`: o enum
  `CourierVehicle`, a tabela, o índice único `courier_applications_document_key` e as `CHECK`
  `courier_applications_document_check` (`^[0-9]{11}$`) e `courier_applications_whatsapp_check`
  (`^[0-9]{10,15}$`). Gerada pelo `prisma migrate dev --create-only`; as duas `CHECK` e o comentário do
  topo foram escritos à mão.
- API, `apps/api/src/modules/couriers/`: `courier-applications.controller.ts` (a rota e o limite),
  `courier-applications.service.ts` (a armadilha, o `upsert`, a versão dos termos e a falha do banco),
  `couriers.constants.ts` (`COURIER_CITIES`, `COURIER_VEHICLES`, os limites e as duas expressões),
  `dto/courier-application.dto.ts` (normaliza e recusa), `couriers.module.ts`.
- `apps/api/src/app.module.ts`: o módulo registrado, e as opções do pino passaram a ter nome
  (`requestLogOptions`, exportadas, com o mesmo conteúdo) para o teste do log subir o app com elas.
- Variáveis: `COURIER_APPLICATION_RATE_LIMIT_MAX` (5) e `COURIER_APPLICATION_RATE_LIMIT_WINDOW`
  (`10 minutes`) em `env.ts`, `.env.example`, `docker-compose.dokploy.yml` e na tabela do README da API.

**Desfazer a migração.** O Prisma não tem migração de volta. À mão:

```sql
BEGIN;
DROP TABLE "courier_applications";
DROP TYPE "CourierVehicle";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013010008_courier_applications';
COMMIT;
```

Sem a última linha o `prisma migrate deploy` acha que ela já está aplicada. Apaga todos os cadastros.

**Contrato para o AA6 (BEELINK-322).**

- **Rota:** `POST {API_URL}/courier-applications`, sem sessão, corpo JSON. Resposta `204` sem corpo
  para novo, repetido e armadilha. O handler do web deve usar `forwardToApi` (como
  `app/api/storefront/[slug]/contact/route.ts`): é ele que repassa o endereço do visitante, e o
  limite é por endereço.
- **Corpo, `CourierApplicationPayload`:** `name`, `document` (o CPF, com ou sem pontuação), `email`,
  `whatsapp` (como digitado, com ou sem `+55`), `city` (`CourierCity`: hoje só `"FORTALEZA_CE"`),
  `vehicle` (`CourierVehicle`: `MOTORCYCLE`, `BICYCLE`, `CAR`, `VAN`, os mesmos valores do
  `LandingVehicleValue` do formulário), `acceptedTerms` (o booleano `true`) e `website` (a armadilha:
  um campo fora da vista; vazio ou ausente numa pessoa).
- **Nenhum outro campo.** Um corpo com um campo a mais (`consent`, `termsVersion`…) responde
  `400 BAD_REQUEST`. O formulário de hoje chama o aceite de `consent`: no fio ele é `acceptedTerms`.
- **Recusas, `CourierApplicationErrorCode`, todas 400:** `COURIER_NAME_INVALID`,
  `COURIER_DOCUMENT_INVALID`, `COURIER_EMAIL_INVALID`, `COURIER_WHATSAPP_INVALID`,
  `COURIER_CITY_NOT_OPEN`, `COURIER_VEHICLE_INVALID`, `COURIER_TERMS_REQUIRED`. Vem **um código por
  resposta**, o do primeiro campo recusado nessa ordem: o formulário precisa validar tudo antes de
  enviar, e o código serve para apontar o campo quando o servidor discorda. `429 RATE_LIMITED` é o
  excesso (5 envios em 10 minutos por endereço, contando os recusados).
- **A regra do WhatsApp mudou em relação ao formulário de hoje:** só celular (DDD sem zero, nove
  dígitos começando por 9). O `hasAreaCode` de `landing-courier-schema.ts` ainda aceita fixo.
- **A cidade vai pelo código**, e o rótulo ("Fortaleza/CE") é texto do formulário, num
  `Record<CourierCity, string>` para não compilar sem a cidade nova.
- **A resposta não diz se o CPF já estava na lista.** A frase de sucesso do formulário é a mesma nos
  dois casos.
- **A política de privacidade** ainda não fala dos dados do entregador: entra no AA6, com nova
  `LegalVersion`, antes de o formulário enviar.

**O que foi e o que não foi conferido.**

- Unidade: `courier-applications.service.spec.ts` (11) e `dto/courier-application.dto.spec.ts` (65),
  76 testes. Com eles a API tem 1412 testes de unidade, todos passando.
- `pnpm ci-check`: verde (type-check, lint, testes de `api` 1412, `web` 2719 e `ui` 2709, arch-gates
  e docs-gate).
- e2e da rota, `test/courier-applications.e2e-spec.ts`, 19 testes contra o Postgres: grava
  normalizado com a versão do servidor; mesmo CPF não cria a segunda linha, troca os dados e o aceite
  e mantém `createdAt`; dez envios simultâneos, uma linha; a armadilha; os sete códigos; um corpo que
  nomeia a versão dos termos; o 429 por endereço; as duas `CHECK` e o índice único recusando por
  conta própria; e o log nos três casos.
- **O teste do log foi posto à prova:** com o serviço trocado para deixar o erro do banco subir, o
  teste do 500 falha, e a linha que o filtro escreve traz
  `Failing row contains (…, Zuleica Tavares, 52998224725, zuleica.tavares@exemplo.test, 5585987654321, …)`.
  O serviço voltou ao que era.
- **O que o pino escreve de um 204 nessa rota** (lido do fluxo, sem os cabeçalhos da resposta):
  `{"level":30,"req":{"id":"req-1","method":"POST","url":"/api/courier-applications","query":{},"headers":{"x-forwarded-for":"203.0.113.1","user-agent":"lightMyRequest","host":"localhost:80","content-type":"application/json","content-length":"188"},"remoteAddress":"127.0.0.1"},"res":{"statusCode":204},"responseTime":22,"msg":"request completed"}`.
  O 400 é a mesma linha com `statusCode: 400`, sem a mensagem da recusa.
- Suíte e2e inteira da API, no commit `a1297f88`, contra `harness_landing_test` na 5442 e o Mailpit
  da 8027: **86 de 88 arquivos e 1134 de 1140 testes passaram.** As seis falhas são as conhecidas do
  `.env` deste worktree: cinco em `custom-domain.e2e-spec.ts` (`SHOP_DOMAIN_PROBE=false`; com
  `SHOP_DOMAIN_PROBE=true` no shell o arquivo passa 14 de 14 nesta branch) e uma em
  `meta-pixel-without-vault-key.e2e-spec.ts` (a `INTEGRATIONS_SECRET_KEY` do `.env` volta). As mesmas
  seis falham com `app.module.ts` e `env.ts` como estão em `origin/main`, isto é, sem o módulo novo
  carregado.
- `pnpm --filter api build`: passou. `next build` e `turbo build` não foram rodados (disco).
- **A migração:** aplicada em `harness_landing` pelo `prisma migrate dev`, que antes repassa todas as
  109 migrações num banco temporário vazio e não achou diferença com o schema. No banco de teste, o
  SQL de desfazer acima foi rodado, o `migrate status` passou a dizer que ela faltava e o
  `migrate deploy` a aplicou de novo. **Não foi feito:** um `migrate deploy` das 109 num banco novo
  criado por mim (só os dois bancos deste worktree podiam ser tocados, e o `migrate reset` é
  destrutivo).
- Com a API de pé na 3201 (`pnpm dev`), por `curl`: um cadastro válido respondeu 204 e gravou a
  linha normalizada; o mesmo CPF com outros dados respondeu 204 e atualizou a linha, com `createdAt`
  igual; a armadilha respondeu 204 sem gravar; as sete recusas e o campo desconhecido responderam 400
  com os códigos; o sexto envio do mesmo endereço respondeu 429. O log do `pino-pretty` não trouxe
  nome, CPF, e-mail nem telefone. O Swagger mostra a rota sem cadeado, o corpo e os códigos. A linha
  de teste foi apagada com o `DELETE` deste plano, e a tabela de desenvolvimento ficou vazia.
- **Não exercitado:** a rota chamada pelo web (o handler não existe), o limite com o endereço
  repassado pelo web de verdade, e nada em produção ou homologação.

**Achados fora do escopo, não corrigidos.**

1. **O comando do e2e sem `TEST_DATABASE_URL` aponta para a 5432.** `vitest.config.e2e.ts` lê
   `TEST_DATABASE_URL` do ambiente do shell antes de qualquer `.env` ser carregado, então a linha do
   `apps/api/.env` não vale para ele. Aqui a primeira tentativa bateu em `localhost:5432` e a conexão
   foi recusada (nada escutava lá, nada foi escrito). A suíte foi rodada com
   `TEST_DATABASE_URL=postgresql://harness:harness@localhost:5442/harness_landing_test` no comando.
   Com o Postgres de outro projeto ligado na 5432, o `global-setup` criaria um banco nele.
2. **O filtro de exceções registra inteiro qualquer erro que responde 500, em todo módulo.** Uma
   recusa do Postgres em qualquer tabela com dado pessoal (o CPF de um cliente, o documento de um
   pedido) escreve a linha recusada no log, pelo `meta.driverAdapterError.cause.detail` do erro do
   Prisma. Este ticket protegeu só a escrita dele. Vale um ticket para o filtro, ou para o
   serializador de erro do pino.
3. **A linha de toda requisição traz o `x-forwarded-for`**, o endereço do visitante. Vale para esta
   rota como para todas.
4. `LEAD_RATE_LIMIT_*` e a rota `POST /stores/:slug/contact` não estão nas tabelas de
   `apps/api/docs/README.md`.
