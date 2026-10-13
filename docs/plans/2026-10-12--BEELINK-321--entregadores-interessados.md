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
