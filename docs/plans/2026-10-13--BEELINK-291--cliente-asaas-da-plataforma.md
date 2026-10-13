# BEELINK-291 (S9) — API: a conta Asaas da plataforma e o lojista como cliente dela

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Segundo ticket de código. A branch nasce da do
> S1 (`feat/BEELINK-219-assinatura-por-pagina`, `e9abfb8d`), que ainda está no PR #268; o PR deste
> ticket tem `main` como base e só fica legível depois que o #268 entrar. Toca `packages/contracts` e
> `apps/api`. **Nenhuma tela, nenhuma assinatura criada, nenhum webhook.** As decisões do épico não
> são reabertas aqui; as que estão abaixo são do desenvolvedor. Leituras de base:
> `2026-10-13--BEELINK-219--assinatura-por-pagina.md` (o modelo) e
> `2026-10-13--BEELINK-289--como-o-lojista-paga.md` (o que o sandbox respondeu). Escrito em
> 13/10/2026, antes do código.

## O problema

O S1 deixou o lugar onde a cobrança da plataforma escreve (`plans`, `billing_accounts`,
`store_subscriptions`) e nenhuma conversa com o Asaas. Para cobrar uma página, a bee-link precisa
falar com o Asaas **pela conta dela** (não pela de uma loja) e ter o lojista cadastrado lá como
cliente. Hoje a API só sabe falar com o Asaas com a chave de uma loja, aberta do cofre, e o CPF ou
CNPJ do lojista não existe em lugar nenhum.

Este ticket entrega: a chave da plataforma na configuração; um cliente HTTP para a conta da
plataforma que reaproveita a chamada que já existe; os dados de cobrança do lojista (nome e CPF ou
CNPJ) guardados na conta de cobrança; e o cliente do Asaas criado uma vez e reaproveitado.

## Definição de Pronto

1. Sem `ASAAS_PLATFORM_API_KEY`, as rotas dos dados de cobrança respondem `503 BILLING_UNAVAILABLE`;
   a API sobe e nenhuma outra rota muda de resposta (os specs que existiam passam).
2. Com dados válidos, um cliente é criado no sandbox do Asaas; a segunda gravação reaproveita o mesmo
   cliente e não cria outro.
3. Documento inválido é recusado com `400 BILLING_DOCUMENT_INVALID` e mensagem em pt-BR, antes de
   qualquer chamada ao Asaas (e antes de qualquer escrita no banco).
4. O cliente HTTP da plataforma tem teste de unidade com respostas simuladas: recusa, 429, 5xx,
   silêncio e resultado desconhecido numa criação.
5. A chave da plataforma não aparece em log, resposta nem erro: um teste lê o que o pino escreveu, e
   a regra de arquitetura nova (`api/platform-asaas-key-in-billing`) está verde.
6. Os specs do cliente Asaas das lojas passam sem uma linha alterada.
7. A migration aplica num Postgres de verdade e `prisma migrate diff` não acha diferença.
8. Unidade da API, tipos, lint, os e2e que a branch toca, `arch-gates` e `docs-gate` verdes.

## O que eu perguntei ao sandbox antes de desenhar

Com a chave de sandbox da plataforma, por `curl`, num cliente de nome "Teste S9 Reconhecimento"
(criado e removido: `cus_000009458155`). Tudo abaixo foi **visto**, em 13/10/2026.

| Pergunta | Resposta |
|---|---|
| A busca `GET /customers?externalReference=X` é exata? | No comprimento, sim: um prefixo do valor não acha nada. **Não diferencia maiúsculas de minúsculas.** |
| O cliente recém-criado aparece logo na busca? | Sim, na chamada seguinte. |
| Um cliente removido aparece na busca? | Não. Pelo id (`GET /customers/{id}`) ele ainda responde, com `deleted: true`. |
| `PUT /customers/{id}` troca nome, CPF/CNPJ e e-mail? | Sim, e só o que é enviado: `externalReference` e `notificationDisabled` ficam. Trocar CPF por CNPJ muda `personType` para `JURIDICA`. |
| `PUT` num cliente removido | `400 invalid_object`, "Cliente excluído, não é possível fazer alterações". **Não é 404.** |
| `PUT` num id que nunca existiu | `404`, corpo vazio. |
| CPF com dígito verificador errado na criação | `400 invalid_object`, "O CPF/CNPJ informado é inválido." Nada é criado. |
| Um nome de 120 caracteres | Aceito. |
| `GET /subscriptions/{id}` de um id que não existe | `404`, corpo vazio. |
| `GET /subscriptions/{id}/payments` de um id que não existe | **`200` com lista vazia.** Não dá para distinguir de uma assinatura sem cobranças. |
| A assinatura e a cobrança trazem o cartão? | Trazem `creditCard` com `creditCardBrand`, `creditCardNumber` (os 4 últimos) **e `creditCardToken`**. |
| A cobrança de uma assinatura | Traz `subscription` (o id), o `externalReference` da assinatura, `status`, `billingType`, `value`, `dueDate`, `paymentDate`, `invoiceUrl`. |

## Decisões

### Onde mora a parte comum da chamada HTTP

1. **`apps/api/src/shared/asaas/`**, três arquivos sem estado e sem chave:
   - `asaas-call.ts`: `asaasCall(endpoint, apiKey, method, path, body?)`. É o corpo do método `call`
     que hoje é privado em `integrations/asaas/asaas-http.client.ts`, mudado de lugar sem mudar uma
     regra: dez segundos de limite, 4xx é recusa (com o código do Asaas), 429 é `AsaasThrottled` com
     a hora que o Asaas disse, 5xx e silêncio são `AsaasUnreachable`, e a chave é cortada de qualquer
     texto que volte. `endpoint` é `{ baseUrl, userAgent }`: o `AsaasConfig` das lojas já tem os dois,
     então o cliente delas passa o que sempre passou.
   - `asaas-errors.ts`: `AsaasRefused`, `AsaasUnreachable`, `AsaasThrottled`, `AsaasOutcomeUnknown`.
     Saem de `asaas.client.ts`, que passa a **reexportá-las**: nenhum `import` do resto da API muda,
     e um `instanceof` continua valendo dos dois lados porque a classe é uma só.
   - `asaas-environment.ts`: os dois endereços e os dois prefixos de chave (`$aact_hmlg_`,
     `$aact_prod_`). Saem de `asaas.config.ts`, que continua exportando `ASAAS_KEY_PREFIXES`.
2. **Por que `shared/` e não `integrations/asaas/`:** aquela pasta é, por regra de arquitetura, o
   lugar onde a chave de uma loja é aberta. Se a cobrança da plataforma importasse o transporte de
   lá, a pasta "da chave da loja" passaria a ser também "de quem fala com o Asaas", e a regra
   perderia o sentido que tem. Além disso `env.ts` precisa dos prefixos para recusar a chave do
   ambiente errado na subida, e não pode importar de um módulo que importa `env.ts`.
3. **O que não muda nas lojas:** `AsaasHttpClient` segue com o construtor sem argumentos e os mesmos
   métodos públicos; o método privado `call` vira uma linha que delega. Selar e abrir a chave
   (`secret-vault.ts`, `asaas-connection.service.ts`, `asaas-charges.service.ts`) não é tocado. A
   recusa da chave do outro ambiente na conexão de uma loja também fica como está: é uma linha, e
   juntá-la com a da subida obrigaria a mexer no serviço de conexão.

### A chave da plataforma

4. **`ASAAS_PLATFORM_API_KEY` e `ASAAS_PLATFORM_WEBHOOK_TOKEN`**, opcionais, em `env.ts`. Vazia conta
   como ausente (como as outras opcionais). A chave é aparada (`trim`): um espaço colado no fim
   viraria um cabeçalho inválido. O token segue a regra do Asaas para o `authToken` de um webhook (32
   a 255 caracteres, sem espaço) e **não é lido por nada** neste ticket.
5. **Chave do outro ambiente para a subida.** `$aact_prod_…` com `ASAAS_ENV=sandbox` (ou o
   contrário) é um `refine` do esquema: a API não sobe, e a mensagem diz a variável e o prefixo
   esperado, **nunca a chave**. Uma chave sem nenhum dos dois prefixos passa, como passa a de uma
   loja: é o Asaas que decide.
6. **A chave é lida num arquivo só:** `modules/billing/platform-asaas.config.ts`. Ele monta o cliente
   HTTP já com a chave dentro e devolve só o cliente. O cliente guarda a chave num campo privado de
   verdade (`#`), que `JSON.stringify`, `util.inspect` e o pino não enxergam: se alguém logar o
   objeto por engano, a chave não sai. Não há método que a devolva.
7. **Regra de arquitetura `api/platform-asaas-key-in-billing`:** o nome `ASAAS_PLATFORM_API_KEY` só
   pode aparecer em `shared/config/` (onde é declarada) e naquele arquivo. Mais estreita que a das
   lojas (que libera uma pasta): aqui é um arquivo.
8. **A chave não vai para o cofre.** O cofre (`INTEGRATIONS_SECRET_KEY`) sela o que é de uma loja, no
   banco. A chave da plataforma é configuração do ambiente, como `JWT_SECRET`.
9. **Sem a chave**, o cliente existe e diz `configured: false`; as rotas respondem
   `503 BILLING_UNAVAILABLE` antes de olhar o banco. Nada mais na API consulta o cliente.
10. **Um 429 é lembrado no processo**, como `AsaasCharges` faz por loja: até a hora que o Asaas
    disse (ou cinco minutos, se não disse), a conta da plataforma não é chamada. A cota (25.000
    chamadas em 12 horas) é uma só para todos os lojistas.

### O cliente da plataforma (`modules/billing/platform-asaas.client.ts`)

11. **Uma porta (`PlatformAsaas`) e a implementação HTTP**, como `AsaasClient` e `AsaasHttpClient`:
    os testes de ponta a ponta põem um Asaas de mentira no lugar. Métodos:
    - `customers(externalReference)`: os clientes **de pé** com exatamente essa referência (o Asaas
      não diferencia maiúsculas, então a comparação exata é feita aqui). Devolve a lista, e não o
      primeiro, para quem chama poder preferir o id que já conhece e avisar de uma duplicata.
    - `createCustomer`: nome, e-mail, CPF/CNPJ, `externalReference`, `notificationDisabled: true`.
      Silêncio numa criação é `AsaasOutcomeUnknown`.
    - `updateCustomer(id, dados)`: **não estava na lista do briefing; ver decisão 17.**
    - `subscription(id)`: a assinatura, ou `null` quando o Asaas responde 404.
    - `subscriptionCharges(id)`: as cobranças dela, página a página, sem as removidas.
12. **Do cartão o cliente lê a bandeira e os 4 últimos dígitos, e nada mais.** O Asaas devolve também
    `creditCardToken`; o leitor monta o objeto campo a campo, e o token não tem para onde ir.
13. **Dinheiro em centavos e dias como `AAAA-MM-DD`**, como no cliente das lojas. A conversão de
    reais para centavos é uma linha (`Math.round(valor * 100)`) escrita de novo aqui: importar
    `asaas-money.ts` de `integrations/asaas/` puxaria a pasta das lojas para dentro da cobrança por
    causa de uma conta.

### Os dados de cobrança e a migration

14. **`billing_accounts` ganha quatro colunas** (migration nova):
    - `name` (`VARCHAR(120)`, obrigatória): nome ou razão social, como vai ao Asaas.
    - `document` (`VARCHAR(14)`, obrigatória): CPF ou CNPJ, só os caracteres, sem pontuação.
      `CHECK` de formato: 11 dígitos, ou 12 alfanuméricos maiúsculos e 2 dígitos.
    - `asaasCustomerSyncedAt` (nula): quando o Asaas passou a ter **estes** nome e documento. Nula
      quer dizer "o Asaas ainda não sabe do que está nesta linha".
    - `asaasCustomerClaimedUntil` (nula): a marca de que uma conversa com o Asaas sobre este cliente
      está em curso, com prazo. É o mesmo desenho de `orders.paymentClaimedUntil`.
15. **`name` e `document` são obrigatórias sem valor padrão.** A tabela não tem linha (o S1 não
    escreve nenhuma, e ele nem chegou à `main`). Se tivesse, a migration falharia com a mensagem do
    Postgres, que é o aviso certo: uma conta de cobrança sem nome e sem documento não é cobrável.
16. **O CPF/CNPJ fica guardado em claro**, como `customers.cpf` e `asaas_customers.cpf`. Motivo para
    guardar e não só repassar: a segunda gravação precisa saber se algo mudou sem perguntar ao
    Asaas, e a leitura mostra o documento mascarado ao dono. Na leitura ele sai sempre mascarado
    (`maskedDocumentOf`, que já existe em `integrations/asaas/masked-document.ts`: uma função pura,
    importada de lá).
17. **Dados alterados são levados ao Asaas (`PUT /customers/{id}`).** O briefing lista procurar e
    criar; não lista atualizar. Sem atualizar, um lojista que corrige o CPF na segunda gravação
    ficaria com um documento no banco e outro no Asaas, e a fatura sairia com o antigo. Por isso
    "garantir o cliente" aqui é: existir **e** ter o que a linha diz. O `PUT` é seguro de repetir.
    Visto no sandbox (tabela acima).
18. **Telefone e endereço não são guardados** (decisão do épico). **O e-mail é o da conta**
    (`users.email`), lido na hora de falar com o Asaas e não copiado para a conta de cobrança. Hoje
    nenhuma rota troca o e-mail de uma conta; se um dia trocar, quem troca precisa zerar
    `asaasCustomerSyncedAt`.

### Garantir o cliente (`BillingAccounts`)

19. **A referência do cliente é `beelink-account-<id da conta>`**, em minúsculas. O prefixo existe
    porque a conta de sandbox é dividida com outros produtos e a de produção pode ser também a conta
    de uma loja, cujos clientes usam o id cru do registro deles como referência.
20. **A ordem, que é a regra 10 do `AGENTS.md` da API aplicada ao cliente:**
    1. Numa transação curta, sob uma trava de aviso da conta
       (`pg_advisory_xact_lock('billing-account:<id>')`): se há uma conversa em curso (marca no
       futuro), responde `409 BILLING_ACCOUNT_BUSY` **sem escrever nada**. Se nada mudou e o Asaas
       já tem o que a linha diz, devolve a linha e **não chama o Asaas**. Senão grava nome e
       documento, zera `asaasCustomerSyncedAt` e escreve a marca com prazo de 60 s.
    2. **A transação fecha.** Nenhuma chamada ao Asaas acontece com trava segurada.
    3. Procura os clientes de pé com a nossa referência. Achou: se o que o Asaas tem difere, atualiza;
       fica com ele. Não achou: renova a marca (só se ainda for desta requisição) e cria.
    4. Grava o id e `asaasCustomerSyncedAt`, e solta a marca, **só se a marca ainda for desta
       requisição**. Quem a perdeu não escreve nada: a conversa é de quem a pegou.
21. **A busca vem sempre antes da criação**, e não só depois de um resultado desconhecido: uma
    requisição que morreu depois de o Asaas criar e antes de gravar o id é exatamente o caso de uma
    marca que venceu sem ser solta. É a mesma regra de `OrderPayments`.
22. **Resultado desconhecido numa criação** (silêncio ou 5xx no `POST`): a marca é empurrada 45 s
    para a frente, para ninguém criar de novo antes de o cliente ter tempo de aparecer na busca, e a
    resposta é `503 BILLING_UNREACHABLE`. A tentativa seguinte procura antes de criar (item 3).
23. **Duas requisições ao mesmo tempo terminam com um cliente:** a trava de aviso põe as duas em
    fila na transação; a primeira escreve a marca e fecha; a segunda lê a marca e recebe `409`.
24. **Trava de aviso e não `FOR UPDATE` em `users`:** na primeira gravação a linha de
    `billing_accounts` ainda não existe para ser travada, e travar a linha da conta faria um login
    simultâneo esperar. A trava de aviso não segura nada que outra parte da API leia.
25. **Um cliente removido no Asaas é substituído sozinho**: a busca não devolve removidos, então a
    gravação seguinte que tiver algo a levar cria outro. Uma linha já em dia com um id que foi
    removido por fora só descobre isso quando alguém usar o id: **fica para o S10**, que é quem vai
    usá-lo (ver "O que o S10 e o S3 precisam saber").
26. **Mais de um cliente de pé com a nossa referência** (não deveria acontecer): fica o que a linha já
    conhece, senão o primeiro da lista, e um aviso vai para o log com os ids.

### As rotas e os erros

27. **`GET /api/billing/account` e `PUT /api/billing/account`**, da conta de quem está logado. Sem
    `:storeSlug`: o cliente no Asaas é um por conta (decisão 6 do épico). Num controller próprio, com
    `@ApiBearerAuth()` (o público dos planos fica no dele, pelo motivo que o S1 registrou).
28. **`GET` responde `{ account: null }` com `200`** para quem nunca gravou. O documento sai
    mascarado; `customerReady` diz se o Asaas já tem o cliente com o que está guardado.
29. **`PUT` é limitado por endereço** com o par que já existe para as escritas de loja
    (`STORE_WRITE_RATE_LIMIT_*`, 20 por minuto por padrão). O motivo é o mesmo de lá: cada escrita
    pode disparar chamadas a um terceiro, e aqui a cota do terceiro é de todos os lojistas juntos.
    Não criei uma variável nova.
30. **Os códigos de erro** (`BillingErrorCode`, em `packages/contracts`):

    | Código | Status | Quando |
    |---|---|---|
    | `BILLING_UNAVAILABLE` | 503 | o ambiente não tem a chave da plataforma, ou o Asaas recusou a chave (401) |
    | `BILLING_NAME_INVALID` | 400 | nome ausente, curto demais ou longo demais |
    | `BILLING_DOCUMENT_INVALID` | 400 | CPF ou CNPJ que não fecha nos dígitos verificadores |
    | `BILLING_ACCOUNT_BUSY` | 409 | outra gravação desta conta está falando com o Asaas |
    | `BILLING_CUSTOMER_REFUSED` | 502 | o Asaas recusou o cliente (um 4xx que não é da chave) |
    | `BILLING_UNREACHABLE` | 503 | o Asaas não respondeu, falhou ou pediu para esperar |

    `502` para a recusa segue `PAYMENT_REFUSED`. Depois de `BILLING_CUSTOMER_REFUSED` ou
    `BILLING_UNREACHABLE` os dados **ficam gravados**, com `customerReady: false`; gravar de novo
    tenta de novo.
31. **Mensagens de validação em pt-BR**, como o briefing pede, com o `errorCode` declarado no
    `context` de cada validador (o mecanismo de `ApiValidationPipe`). As outras mensagens seguem em
    inglês como no resto da API: `docs/ai-rules/code-quality.md` diz que `message` é para o log e
    que a tela mapeia o código. **A tela do S11 continua mapeando o código**, não mostrando a
    mensagem.
32. **O nome não exige sobrenome.** Uma razão social pode ser uma palavra só. De 2 a 120 caracteres,
    com os espaços das pontas tirados e os do meio reduzidos a um.
33. **Nada de dado pessoal no log.** As linhas de aviso levam o id da conta e as palavras do Asaas
    (já sem a chave); nunca o nome, o documento ou o e-mail.

## Fora do escopo

- Criar assinatura, reaproveitar tentativa em aberto, devolver a fatura (S10).
- Webhook da plataforma e leitura de `ASAAS_PLATFORM_WEBHOOK_TOKEN` (S3).
- Tela (S11), telefone e endereço.
- Aceitar CNPJ com letras: ver risco 2.
- Trocar o e-mail da conta.

## Riscos

1. **Uma chave do Asaas começa com `$`, e os dois lugares onde ela é escrita interpretam `$`.** No
   `apps/api/.env`, o `dotenv-expand` trata `$aact_…` como variável e entrega **vazio**, com ou sem
   aspas simples (visto, com uma chave inventada); só `\$aact_…` chega inteira. No ambiente do
   Dokploy quem lê é o Docker Compose, que também interpola: pela documentação dele, aspas simples
   deixam o valor literal. **Isso eu não testei** (o briefing proíbe `docker compose` nesta máquina).
   Uma chave engolida chega vazia, que conta como ausente: a cobrança fica indisponível e nada mais
   quebra. A API escreve uma linha na subida dizendo se achou a chave, sem a chave.
2. **CNPJ com letras** (emitido desde julho de 2026) é recusado: `shared/http/cnpj.ts` só valida
   dígitos, e mudá-lo mexeria na validação do CNPJ das lojas e do Melhor Envio. Também não sei se o
   Asaas os aceita. A coluna já aceita o formato; falta o validador.
3. **A unicidade no Asaas depende de nós.** O Asaas aceita dois clientes com a mesma referência. O
   que impede a duplicata é a marca na linha; se alguém criar um cliente à mão no painel do Asaas
   com a nossa referência, a decisão 26 escolhe um e avisa.
4. **O `PUT` não estava no briefing** (decisão 17). Se o orquestrador preferir sem ele, é um método
   e um `if` a menos, e o problema do documento divergente volta.
5. **Tudo foi visto só no sandbox**, que a própria documentação do Asaas diz validar menos.

## Como desfazer a migration

```sql
ALTER TABLE "billing_accounts"
  DROP CONSTRAINT "billing_accounts_document_check",
  DROP COLUMN "asaasCustomerClaimedUntil",
  DROP COLUMN "asaasCustomerSyncedAt",
  DROP COLUMN "document",
  DROP COLUMN "name";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013210000_billing_account_data';
```

Apaga o nome e o documento de quem já gravou. Os clientes criados no Asaas continuam lá.

---

## Como ficou (acréscimo de 13/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **A migration ganhou uma segunda `CHECK`**, `billing_accounts_name_check`: o nome é guardado sem
   espaço nas pontas e com pelo menos 2 caracteres. O roteiro de desfazer acima está incompleto por
   isso; o certo é:

   ```sql
   ALTER TABLE "billing_accounts"
     DROP CONSTRAINT "billing_accounts_name_check",
     DROP CONSTRAINT "billing_accounts_document_check",
     DROP COLUMN "asaasCustomerClaimedUntil",
     DROP COLUMN "asaasCustomerSyncedAt",
     DROP COLUMN "document",
     DROP COLUMN "name";
   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261013210000_billing_account_data';
   ```

   Rodei este, como está escrito (ver "O que foi rodado", item 2).
2. **A decisão 13 foi desfeita.** O cliente da plataforma importa `centsOf` de
   `integrations/asaas/asaas-money.ts` em vez de reescrever a conta: o comentário daquele arquivo diz
   que ele é o único lugar onde reais viram centavos, e eu já importo de lá `maskedDocumentOf`. São
   as duas únicas coisas que a cobrança da plataforma importa da pasta das lojas, as duas funções
   puras, sem chave e sem estado.
3. **`filled` e `gone` também foram para `shared/asaas/asaas-call.ts`**, porque a parte comum os usa.
   O cliente das lojas passou a importá-los em vez de defini-los.
4. **O nome tem um validador só** (`IsBillingName`, no DTO), e não três em fila. Com três, um nome
   ausente saía com a mesma frase repetida três vezes na resposta. A contagem é em caracteres como o
   Postgres conta (um emoji é um, não dois), que é o que a coluna e a `CHECK` medem.
5. **Uma busca recusada pelo Asaas não é culpa do cliente.** Um 4xx que não é 401 na busca (o caso
   real é um 403 de quem bloqueia o endereço do servidor, como o Melhor Envio já fez com este)
   responde `503 BILLING_UNREACHABLE`, e não `502 BILLING_CUSTOMER_REFUSED`. Só a recusa de uma
   criação ou de uma alteração diz "o Asaas recusou o cliente".
6. **A decisão 33 virou código:** `asaas-reason.ts` tira o documento (com ou sem pontuação), o e-mail
   e o nome das palavras do Asaas antes de elas irem para o log. No sandbox o Asaas não repetiu
   nenhum dos três, mas nada garante que nunca repita.
7. **A regra de arquitetura libera um arquivo e nenhum spec.** Por isso `platform-asaas.config.ts`
   não tem teste de unidade (um teste teria que escrever o nome da variável): quem prova que a chave
   do ambiente chega ao cliente, com o endereço do sandbox e o `User-Agent`, é
   `test/billing-account-key.e2e-spec.ts`.
8. **Uma linha de um spec do S1 mudou:** `test/billing.e2e-spec.ts` grava uma conta de cobrança à
   mão, e as duas colunas novas são obrigatórias. O spec foi rodado depois.
9. **A API diz na subida se achou a chave**, sem a chave: `bee-link's own Asaas account is set up
   (SANDBOX)` ou `… has no key here: billing is unavailable`. É a conferência de um deploy.
10. **Sem a chave, um corpo inválido ainda responde `400`**: a validação roda antes do serviço. Um
    corpo válido responde `503 BILLING_UNAVAILABLE`, sem escrever nada.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027).

1. **A migration, do zero**, num banco de rascunho (`harness_landing_s9_proof`, criado e apagado):
   `prisma migrate deploy` aplicou as 112 ("All migrations have been successfully applied.");
   `prisma migrate diff --exit-code` respondeu "No difference detected." e saiu com 0 nos dois
   sentidos (banco → schema e schema → banco).
2. **As restrições, com `INSERT` à mão** nesse banco: aceitos um CPF de 11 dígitos, um CNPJ de 14, um
   CNPJ com letras e um nome de 120 caracteres; recusados o documento com pontuação, o de 12
   dígitos, o de letras minúsculas, a linha sem documento, a sem nome, o nome de uma letra, o nome
   com espaço na frente, o de 121 caracteres e uma segunda conta com o cliente Asaas da primeira.
   Apagar a conta apagou a conta de cobrança. **O roteiro de desfazer** (o do item 1 acima) rodou;
   depois dele o `migrate diff` voltou a pedir a migration. **Sobre uma tabela com uma linha, a
   migration falha** (`P3018`, "column "document" of relation "billing_accounts" contains null
   values"), como o plano previa; sobre a tabela vazia, aplicou de novo.
3. **Unidade:** `pnpm --filter api test`, 131 arquivos e 1616 testes, todos passando (eram 126 e
   1534 no S1). Os 9 arquivos de `integrations/asaas/` (81 testes) passam sem uma linha alterada:
   `git diff e9abfb8d...HEAD -- apps/api/src/modules/integrations apps/api/src/modules/payments` só
   mostra `asaas-http.client.ts`, `asaas.client.ts` e `asaas.config.ts`.
4. **e2e, um arquivo por vez:** `billing-account` (34), `billing-account-without-key` (6),
   `billing-account-key` (9), `billing` (18), `billing-enforced` (2), `stores` (19),
   `asaas-connection` (7), `asaas-settings` (16), `asaas-approval` (11), `asaas-webhook` (24),
   `order-payments` (42), `order-refunds` (24), `payment-approved` (9) e `payment-reconciliation`
   (20). Todos passando. Os oito últimos não foram tocados; rodei porque usam as classes de erro que
   mudaram de arquivo.
5. **Os testes postos à prova com 28 erros de propósito**, um por vez, cada um desfeito em seguida.
   Todos fizeram algum teste falhar. Entre eles: não cortar a chave das palavras do Asaas; guardar a
   mensagem do `fetch`; carregar a falha como `cause`; não distinguir a criação sem resposta; tomar
   um 429 por resultado desconhecido; ler "sem lista" como "nenhum cliente"; não comparar a
   referência exatamente; ler o token do cartão; deixar subir com a chave do outro ambiente; não
   recusar a segunda gravação com conversa em curso; não renovar a marca antes de criar; gravar o
   cliente sem conferir a marca; soltar a marca depois de uma criação sem resposta; criar sem
   procurar; **chamar o Asaas dentro da transação, com a trava segurada**; logar as palavras do
   Asaas como vieram; responder sem a chave como se tivesse; tirar o limite da escrita.
6. **Tipos e lint:** `tsc --noEmit` na API e em `packages/contracts`, sem erro; `oxlint` na API, sem
   erro (os mesmos dois avisos de antes, em arquivos que este ticket não toca). `pnpm arch-gates` e
   `pnpm docs-gate` verdes. A regra nova ficou vermelha quando pus o nome da variável num segundo
   arquivo, e também quando o pus num spec ao lado do cliente.
7. **O `.env` e o `$`:** com uma chave inventada, `dotenv-expand` entregou vazio para
   `NOME=$aact_…`, `NOME='$aact_…'` e `NOME="$aact_…"`, e a chave inteira para `NOME=\$aact_…`. Um
   valor vindo do shell não é tocado.

### No sandbox, de verdade

A API de pé (`nest start`, porta 3201, banco `harness_landing`), com a chave de sandbox passada só no
shell do comando. Duas contas inventadas, criadas pela rota de cadastro e apagadas no fim.

1. **A linha da subida:** `bee-link's own Asaas account is set up (SANDBOX)`.
2. **Documento com dígito errado:** `400 BILLING_DOCUMENT_INVALID`, "CPF ou CNPJ inválido: confira os
   números digitados."; nada no Asaas sob a referência da conta.
3. **A primeira gravação** ("Teste S9 Lojista A", um CPF inventado e válido): `200`,
   `customerReady: true`. No Asaas, um cliente (`cus_000009458756`) com o nome, o CPF, o e-mail da
   conta, `externalReference` `beelink-account-<id da conta>` e `notificationDisabled: true`.
4. **A mesma gravação de novo:** `200`, o mesmo cliente, `totalCount: 1` no Asaas, e o `updatedAt`
   da linha igual ao de antes (nada foi escrito).
5. **Dados alterados** (uma razão social e um CNPJ): `200`; no Asaas o mesmo id, agora `JURIDICA`,
   com o nome e o CNPJ novos.
6. **Como uma requisição que morreu depois de o Asaas criar:** apaguei o id e a data da linha à mão.
   A leitura respondeu `customerReady: false`; a gravação repetida achou o cliente pela referência e
   ficou com o mesmo id. `totalCount: 1`.
7. **Duas gravações de uma conta nova no mesmo instante:** uma `200`, outra
   `409 BILLING_ACCOUNT_BUSY`; um cliente no Asaas.
8. **O cliente removido no Asaas à mão, e depois uma gravação que muda o nome:** um cliente novo, e
   só ele, sob a referência.
9. **A assinatura de teste do S8** (`teste-s8-sub-amanha-ok`, `sub_0idkyaerpc1r1tmt`), lida pelo
   cliente de verdade: `ACTIVE`, 5990 centavos, `MONTHLY`, `CREDIT_CARD`, próxima cobrança em
   2026-11-14, cartão com bandeira e 4 dígitos. Uma cobrança: `PENDING`, vencimento 2026-10-14,
   fatura em `https`. Nada parecido com um token no que foi lido. Uma assinatura que não existe:
   `null`; as cobranças dela: lista vazia.
10. **O log da API**, lido no fim: a chave aparece 0 vezes, inteira ou em parte; nenhum nome,
    documento ou e-mail das contas de teste; nenhuma linha de aviso ou de erro.
11. **Limpeza:** os quatro clientes que criei (`cus_000009458155`, `…8756`, `…8771`, `…8772`) estão
    com `deleted: true`; a busca por "Teste S9" no nome e pelas referências usadas responde vazio. A
    assinatura do S8 só foi lida. Nenhuma assinatura e nenhuma cobrança foi criada. O processo da
    API foi encerrado.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, a suíte e2e inteira e o Playwright:
  o disco não deixava (3,6 Gi livres). O `ci-check` fica para o push.
- **O Docker Compose com a chave entre aspas simples** (risco 1): o briefing proíbe `docker compose`
  aqui. A forma de escrever a chave no Dokploy está na documentação como não testada.
- **Um 429 de verdade, um 5xx de verdade e um tempo esgotado de verdade** do Asaas: só simulados.
- **Duas instâncias da API ao mesmo tempo.** A marca na linha é o que as coordena, e ela foi testada
  com requisições simultâneas num processo só.
- Nada em homologação nem em produção, e nada com uma chave de produção.

### O que o S10 e o S3 precisam saber

- **Para ter o cliente antes de criar a assinatura (S10):** a linha de `billing_accounts` com
  `asaasCustomerId` **e** `asaasCustomerSyncedAt` preenchidos é o que diz "o Asaas tem este cliente
  com estes dados" (`customerReady` no fio). Se `asaasCustomerSyncedAt` é nula, os dados mudaram e
  não chegaram lá: o S10 precisa de um "garanta agora" antes de criar a assinatura. Ele ainda não
  existe como método público; o caminho é o de `BillingAccounts.save` sem corpo novo (`claim` com os
  dados da linha, depois `converge`).
- **Um cliente removido no Asaas não é percebido por uma linha em dia** (decisão 25). Se a criação da
  assinatura for recusada por causa do cliente, o S10 deve zerar `asaasCustomerId` e
  `asaasCustomerSyncedAt` e garantir de novo: a busca não devolve removidos e um cliente novo nasce.
  **Se o id do cliente mudar, as assinaturas do antigo já não existem no Asaas**, e nada aqui avisa
  as linhas de `store_subscriptions`.
- **`PUT` num cliente removido responde `400 invalid_object`, não `404`** (visto).
- **`subscriptionCharges` de uma assinatura que não existe responde lista vazia** (visto). Quem diz
  se a assinatura existe é `subscription(id)`, que devolve `null` no 404. O S3 lê as duas.
- **A referência do Asaas não diferencia maiúsculas** na busca (visto). O cliente compara exatamente
  depois. A referência que o S10 escolher para a assinatura deve ser minúscula e ter prefixo próprio
  (a do cliente é `beelink-account-<id>`).
- **O cliente não tem busca de assinatura pela referência.** O S10 vai precisar dela para
  "reaproveitar a tentativa em aberto"; `GET /subscriptions?externalReference=…` funciona (usei à
  mão para achar a do S8).
- **O 429 é lembrado no processo.** Uma rotina do S3 que varre assinaturas recebe `AsaasThrottled` na
  hora, sem chamar o Asaas, até o horário que ele disse.
- **Do cartão só saem `brand` e `last4`**, na assinatura e em cada cobrança. O token que o Asaas
  manda junto não é lido.
- **`paymentDate` e `confirmedDate` de uma cobrança paga não foram vistos**: a única cobrança lida
  estava `PENDING`, com as duas nulas. O formato com hora (`2026-10-14 10:20:30`) é tratado no
  teste de unidade, por precaução.
- **`ASAAS_PLATFORM_WEBHOOK_TOKEN` já é validado na subida** (32 a 255 caracteres, sem espaço) e não
  é lido por nada. A regra de arquitetura nova cerca só a chave; o token é do S3.
- **O limite de escrita da rota** é o das lojas (`STORE_WRITE_RATE_LIMIT_*`).

### Riscos, além dos de cima

6. **Quem puser a chave no `apps/api/.env` vê `billing-account-without-key.e2e-spec.ts` falhar**:
   uma variável vazia no ambiente do teste perde para o valor do `.env` (é o mesmo motivo de
   `meta-pixel-without-vault-key` falhar nesta worktree). O spec troca o `fetch` por um que recusa
   qualquer endereço do Asaas, então mesmo assim nada sai da máquina. O `.env.example` deixa a
   variável comentada e diz isso.
7. **O Compose pode escrever o nome da "variável que falta" na saída do deploy**, e esse nome seria a
   chave sem o `$`. Não vi isso acontecer; é o que ele faz com variáveis não definidas no arquivo do
   Compose. A documentação de deploy manda trocar a chave se ela aparecer num log.
8. **A política de privacidade não cita o CPF/CNPJ do lojista guardado para cobrança.** Não mexi nos
   textos legais: não há tela ainda. Fica para o S11 ou para quem decidir o texto.

### Mais um acréscimo de 13/10/2026: a chave também é cortada do código da recusa

Relendo o diff: a chamada comum cortava a chave do **texto** da recusa do Asaas (`description`) e não
do **código** (`code`), que também vai para o erro e, daí, para o log. Passou a cortar dos dois. É a
única diferença de comportamento na parte comum em relação ao que o cliente das lojas fazia, e
nenhuma resposta real a exercita: os códigos do Asaas são palavras como `invalid_object`. Os specs
das lojas seguem passando sem alteração (9 arquivos, 81 testes), e um erro plantado (deixar o código
como veio) faz o spec do cliente da plataforma falhar. Com esse, são 29 erros plantados, todos
pegos.
