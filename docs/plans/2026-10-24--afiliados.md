# Épico Afiliados — quem vende pela loja e ganha comissão

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> O estudo do épico, antes de qualquer tarefa começar. Cada tarefa (AF1 a AF9) escreve o seu próprio
> plano quando for implementada; este registra o desenho comum a todas e por que ele é assim. Os
> tickets ainda não existem: os números entram no adendo quando forem criados.

## O pedido

Rafael, 24/10/2026: "quero poder cadastrar afiliados, afiliados vai ser configurável, o valor que o
afiliado vai vender, a diferença vai ser que o site do afiliado vai ter /nomequeeleescolher e ele vai
ter um usuário no sistema […] vou configurar % em cima dos produtos e depois disso mando convite, pode
ter um padrão, mas posso oferecer condições especiais".

Respostas dele, no mesmo dia, às quatro perguntas que mudavam o desenho:

| Pergunta | Resposta |
|---|---|
| Endereço do afiliado | `/<loja>/<afiliado>` — e `minhaloja.com.br/<afiliado>` no domínio próprio |
| O cliente paga outro preço? | Não. Mesmo preço da loja; o afiliado só leva a comissão |
| Como o afiliado recebe | Acerto manual na v1: o sistema calcula, o lojista paga por fora e registra |
| Quando conta e por quanto tempo | A comissão nasce pendente e libera na entrega; a visita pelo link vale 30 dias, o último link vence |

## O que existe hoje

- **Nada de afiliado.** Nenhum modelo, rota, documento ou branch fala disso (busca em 24/10).
- **Contas** (`auth.prisma`, `User`): uma conta é do bee-link (`storeId` nulo, abre o painel) ou de uma
  loja (abre só a vitrine dela). `Session.audience` separa as duas portas.
- **"Só o dono lê o que é seu"** (`docs/product/README.md`, "Stores") é decidido na API. Não existe
  papel além de dono: o afiliado é o primeiro a ler algo de uma loja sem ser o dono.
- **Endereço da vitrine.** `/<slug>/<section>` é um segmento só (`app/[slug]/[section]/page.tsx`):
  `sectionOf` lê primeiro as palavras de rota (`StorefrontRouteWords`: produtos, categorias, busca,
  carrinho, conta…) e só depois uma categoria. A API recusa categoria com slug de palavra de rota
  (`catalog-slug.service.ts`, `RESERVED_PATH_SEGMENTS`).
- **Slug da loja** (BEELINK-331, regra 13 do `apps/api/AGENTS.md`): reivindicado num lugar só, sob
  advisory lock, e o slug deixado continua levando à loja. É o molde para o slug do afiliado.
- **Percentual por produto** já existe para o cashback (BEELINK-313): `Product.cashbackRateBps`, a conta
  item a item com o desconto do pedido repartido proporcionalmente (`cashback-earning.ts`).
- **Lote é estado, extrato é história** (Épico U, `cashback-ledger.ts`): o padrão para o que se deve
  ao afiliado.
- **Origem do pedido** (BEELINK-275, `order-origin.ts`): as UTMs chegam com o pedido e são
  fotografadas nele. A atribuição ao afiliado anda pelo mesmo caminho.
- **Funil** (BEELINK-276, `StoreFunnelDay`): conta eventos por dia, sem pessoa e sem cookie. As visitas
  do link do afiliado seguem a mesma regra.
- **O produto não movimenta dinheiro** ("What the product does not do"). O acerto manual mantém isso.

## Decisões

### 1. O afiliado tem conta do bee-link, não da loja

O afiliado entra pela mesma porta do lojista (`/login`, conta com `storeId` nulo) e tem uma área
própria, `/parceiro`. Uma pessoa pode ser afiliada de várias lojas com uma conta só, e uma conta pode
ser lojista e afiliada ao mesmo tempo.

*Por quê:* o afiliado é parceiro comercial do lojista, não cliente. A conta da loja abre só a vitrine
e é apagada pelo próprio cliente; não cabe nela um contrato de comissão. E o vínculo "conta do bee-link
× loja, com um papel" é o mesmo que a equipe do lojista vai precisar um dia: o afiliado o estreia.

*A alternativa descartada:* conta da loja, com a área dentro de `/<loja>/conta`. Mais simples e com a
marca da loja, mas o afiliado de três lojas teria três senhas e o vínculo não serviria para mais nada.

### 2. O afiliado lê pouco, e por rotas só dele

Nada do afiliado passa pelas rotas do lojista. A API ganha um prefixo próprio,
`affiliate/stores/:storeSlug/...`, guardado por um vínculo `ACTIVE`, `PAUSED` ou `ENDED` da conta com
a loja. Ele lê:

- os próprios links, números (visitas, pedidos, vendas, comissão) e extrato;
- os pedidos atribuídos a ele: número, data, status, itens, valor da base e comissão;
- **nunca** telefone, e-mail, CPF ou endereço do cliente. O cliente é "Cliente" — o dado é do lojista,
  e a política de privacidade diz que o bee-link o trata em nome dele.

Afiliado com vínculo `ENDED` continua lendo o histórico e os acertos, sem gerar nada novo. Nas rotas
dele, uma página travada por falta de pagamento responde `@OpenWhileLocked()` (regra 12 do
`apps/api/AGENTS.md`): o que já se deve a ele não some porque a loja não pagou o bee-link.

### 3. Comissão vem de uma tabela; condição especial é outra tabela

- A loja tem **tabelas de comissão**. Uma é a **Padrão**, criada com o programa e que não pode ser
  apagada.
- Uma tabela tem um **percentual geral** e, opcionalmente, um **percentual por produto** que o
  substitui. O produto pode ter 0% numa tabela: é "este produto não paga comissão".
- **Todo afiliado está numa tabela.** Condição especial = colocá-lo noutra ("Influencers 15%") ou numa
  tabela só dele.
- A taxa de um item é `tabela.produto[item] ?? tabela.geral`. Nenhuma outra regra de precedência.
- O campo **"Comissão de afiliado (%)"** no cadastro do produto e a coluna na listagem editam a tabela
  Padrão, como o "Adicionar cashback" de BEELINK-313. As outras tabelas se editam na tela delas.

*Por quê:* "um padrão, com condições especiais" pedia exceção sobre exceção (afiliado geral × produto
geral × afiliado-produto) e uma ordem de precedência que ninguém lembra. A tabela tem uma regra só. Ela
também permite mudar a condição de dez influenciadores de uma vez.

*A taxa é fotografada:* uma tabela editada vale para pedidos feitos dali em diante. O pedido guarda a
taxa de cada item e o nome da tabela.

### 4. O endereço: `/<loja>/<afiliado>`, e depois a loja de sempre

- `/<loja>/<afiliado>` abre a **página inicial da loja**, com uma faixa logo abaixo do cabeçalho:
  "Você chegou pela indicação de João". Os preços e o catálogo não mudam.
- A visita grava um cookie da loja com **o id do afiliado e a hora**, nada da pessoa, válido por 30
  dias. A navegação continua em `/<loja>/...` normal. Um link novo de outro afiliado substitui o
  anterior: **o último vence**.
- O afiliado também compartilha **qualquer página**: `/<loja>/produtos/<produto>?afiliado=joao` tem o
  mesmo efeito. A área dele tem "copiar link" ao lado de cada produto.
- No domínio próprio é igual: `minhaloja.com.br/joao`.
- **Ordem de leitura do segmento:** palavra de rota → categoria → afiliado. Para isso nunca empatar:
  - o slug do afiliado não pode ser uma palavra de rota, nem o slug de uma categoria da loja;
  - **uma categoria não pode ser criada nem renomeada com o slug de um afiliado** daquela loja
    (`catalog-slug.service.ts` ganha esse caso).
- O slug é único **dentro da loja** (`@@unique([storeId, slug])`): "joao" pode ser afiliado de duas
  lojas. Mesmo formato do slug de loja (`[a-z0-9-]`).
- **Link de afiliado pausado ou encerrado não dá 404**: abre a loja sem faixa e sem atribuir. Um link
  impresso ou postado continua levando a algum lugar.
- Página travada: a vitrine já está fora do ar, e o link também.

### 5. O afiliado escolhe o nome, ao aceitar o convite

1. O lojista cadastra o afiliado: **nome, e-mail, tabela** e, opcionalmente, telefone e uma nota. O
   status é `INVITED`.
2. Sai um e-mail com um link de uso único, válido por 7 dias e reenviável. Ele **não** usa `EmailToken`,
   que exige uma conta que o convidado talvez ainda não tenha: é uma tabela `AffiliateInvite`, com o
   hash do token.
3. O convidado abre o link e vê a loja, a condição (a tabela, em percentuais) e os termos do programa.
   - **Sem conta:** cria uma com aquele e-mail (senha ou Google), já verificada pelo próprio convite.
   - **Com conta:** entra, e o vínculo vai para a conta dele.
   - **O e-mail não confere:** o convite é para o e-mail que o lojista digitou. Entrar com outra conta
     é recusado e a tela diz para quem é.
4. Ele escolhe o `/nome`, com sugestão do nome e disponibilidade checada na hora, e informa a chave
   Pix (pode deixar para depois). Aceita os termos. O status vira `ACTIVE`.
5. O lojista vê o aceite no painel. Até lá, o afiliado não tem link e não gera nada.

**Status:** `INVITED` → `ACTIVE` ⇄ `PAUSED` → `ENDED`. Pausado não atribui pedidos novos, e os já
atribuídos seguem o curso. Encerrado é definitivo; o mesmo e-mail pode ser convidado de novo e começa
um vínculo novo. O convite pode ser cancelado enquanto `INVITED`.

**Trocar o `/nome` depois** fica fora da v1. Quando entrar, é como o slug da loja: o nome deixado
continua do afiliado e leva ao novo.

### 6. A conta da comissão é a do cashback por produto

- **Base:** o que o cliente pagou pelos produtos, depois da promoção do item, com cupom, desconto
  digitado e crédito de cashback usado repartidos entre os itens na proporção do valor de cada um.
  **Nunca o frete.**
- **Comissão do item** = base do item × taxa do item. A do pedido é a soma, arredondada para baixo ao
  centavo. A conta é em BigInt, como em BEELINK-313.
- O cálculo é uma função pura irmã de `cashback-earning.ts`, sobre o mesmo repartimento. Mexer em uma
  sem a outra é o erro que se quer evitar, então a repartição vira uma função só, que as duas usam.

### 7. Atribuição: no pedido, pela API, com recusa explícita

- O web manda o afiliado do cookie com o pedido, pelo mesmo caminho das UTMs (`order-origin.ts`).
- A API aceita a atribuição se, **na hora do pedido**: o afiliado é da loja, está `ACTIVE`, o programa
  está ligado e a visita tem no máximo 30 dias. Senão, o pedido entra sem afiliado e sem erro: o cliente
  não tem nada a ver com isso.
- **Compra do próprio afiliado não gera comissão.** Se o e-mail da conta do cliente, ou o telefone dele,
  é o do afiliado, o pedido grava o afiliado com comissão zero e o motivo, e o painel diz "compra do
  próprio afiliado".
- **Venda registrada no painel:** o lojista pode escolher um afiliado no formulário (opcional). É o caso
  do cliente que chegou pelo afiliado e fechou pelo WhatsApp.
- O lojista pode **tirar ou trocar o afiliado de um pedido** enquanto a comissão está pendente, dizendo
  o motivo, e isso fica no histórico do pedido. Depois de liberada, a correção é um ajuste no extrato
  (decisão 9).

### 8. Pendente na entrega, liberada depois da carência, desfeita no cancelamento

- A comissão nasce **pendente** com o pedido.
- Fica **disponível** quando o pedido é **entregue** — a mesma prova de venda que o cashback e as
  avaliações usam — mais a **carência** do programa, em dias (0 a 60, padrão 7). A carência cobre a
  devolução: comissão paga sobre produto devolvido é dinheiro que o lojista não recupera.
- **Cancelado**, ou saiu de *entregue* antes de liberar: a comissão é **estornada** e nunca chega a
  disponível.
- **Cancelado depois de liberada:** uma linha negativa no extrato. O saldo pode ficar negativo e é
  descontado no próximo acerto. O painel diz isso, e a área do afiliado também.
- **Estorno parcial** (BEELINK-208) não mexe sozinho na comissão na v1. O pedido avisa o lojista de que
  houve estorno, e ele ajusta à mão se quiser.
- A liberação depois da carência é uma varredura, no molde de `cashback-sweeper.ts`.

### 9. Comissão é estado, extrato é história, acerto é um fato registrado

- `AffiliateCommission`, uma por pedido: o estado (pendente, disponível, estornada, zero por compra
  própria), a base, o valor, a tabela fotografada e as linhas por item com a taxa de cada uma.
- `AffiliateEntry`, o extrato, só cresce: liberada (+), estornada depois de liberada (−), ajuste do
  lojista (±, com motivo) e acerto (−). Uma linha nunca é editada; um erro se corrige com outra linha.
- `AffiliatePayout`: o lojista registra que pagou — valor, data, como (Pix, transferência, dinheiro),
  uma nota e, opcionalmente, um comprovante. Por padrão o valor é o saldo disponível; pode ser menor.
  Nada sai do bee-link: é o registro de um pagamento feito por fora.
- O saldo (`pendingCents`, `availableCents`) fica no vínculo, mantido sob a trava do afiliado, como o
  saldo de cashback do cliente.
- O ajuste e o acerto têm autor e motivo. O afiliado vê o acerto e o motivo do ajuste: diferente do
  cashback, aqui o motivo é escrito para os dois.

### 10. Visitas do link contadas como o funil conta

`AffiliateVisitDay`: por loja, por afiliado, por dia, um número. Sem linha de visitante, sem
identificador. Não conta navegador com painel aberto, como no funil. Mostra ao afiliado e ao lojista
"visitas pelo seu link → pedidos → vendas". Guardado por 13 meses, como o funil.

### 11. O que muda nos textos legais

- **Política de privacidade:** o bee-link passa a guardar dados do afiliado (nome, e-mail, telefone,
  chave Pix) e um cookie de atribuição na vitrine. O lojista responde pelos dados do afiliado dele; o
  bee-link responde pela conta. É uma **versão nova** dos textos, nunca uma edição (regra de "Accounts").
- **O cookie de atribuição** guarda só o id do afiliado e a hora, e é necessário para cumprir o acordo
  entre loja e afiliado. Não é marketing e não depende do "sim" ao pixel. Isso precisa constar na
  política antes do primeiro link no ar. *A confirmar com quem cuida do jurídico.*
- **Termos do programa:** um texto da loja, escrito pelo lojista no painel, que o afiliado aceita ao
  entrar. O vínculo guarda a versão aceita e quando.

## Modelo de dados (rascunho)

Um arquivo novo, `apps/api/prisma/schema/affiliate.prisma`. Valores em centavos, taxas em pontos-base.

| Modelo | Campos principais |
|---|---|
| `AffiliateProgram` | `storeId` (PK), `enabled`, `attributionDays` (30), `holdDays` (7), `termsText`, `termsVersion` |
| `CommissionTable` | `id`, `storeId`, `name`, `defaultRateBps` (0–10000), `isDefault` — `@@unique([storeId, name])`, uma Padrão por loja (índice parcial) |
| `CommissionTableRate` | `tableId`, `productId`, `rateBps` (0–10000) — PK `[tableId, productId]` |
| `Affiliate` | `id`, `storeId`, `userId?`, `name`, `email`, `phone?`, `slug?`, `status`, `tableId`, `pixKey?`, `termsVersion?`, `termsAcceptedAt?`, `pendingCents`, `availableCents`, `invitedAt`, `acceptedAt?`, `endedAt?` — `@@unique([storeId, slug])`, `@@unique([storeId, userId])`, e-mail único entre os não encerrados |
| `AffiliateInvite` | `id`, `affiliateId`, `tokenHash` (unique), `expiresAt`, `usedAt?` |
| `AffiliateCommission` | `orderId` (PK), `affiliateId`, `status`, `baseCents`, `commissionCents`, `tableName`, `availableAt?`, `zeroReason?` |
| `AffiliateCommissionLine` | `orderItemId` (PK), `orderId`, `rateBps`, `baseCents`, `commissionCents` |
| `AffiliateEntry` | `id`, `affiliateId`, `kind` (`RELEASED`, `REVERSED`, `ADJUSTED`, `PAID_OUT`), `amountCents` (com sinal), `orderId?`, `payoutId?`, `reason?`, `actorId?`, `createdAt` |
| `AffiliatePayout` | `id`, `affiliateId`, `amountCents`, `paidAt`, `method`, `note?`, `receiptUrl?`, `createdById` |
| `AffiliateVisitDay` | `storeId`, `affiliateId`, `day`, `visits` — PK `[affiliateId, day]` |
| `Order` (+) | `affiliateId?`, `affiliateVisitAt?` — o filtro "pedidos do afiliado" sem join |

`/parceiro` entra em `RESERVED_SLUGS` (`stores.constants.ts`). **Antes da migração, conferir que
nenhuma loja já usa esse slug.**

## As tarefas

| Tarefa | O que entrega | Toca |
|---|---|---|
| **AF1** | Programa e tabelas de comissão: schema, contracts, módulo `affiliates` na API (ligar/desligar, carência, termos, CRUD de tabelas e taxas por produto) | `affiliate.prisma`, `packages/contracts`, `apps/api` |
| **AF2** | Painel: menu "Afiliados" com Configurações e Tabelas; "Comissão de afiliado (%)" no produto e coluna na listagem | `apps/web`, `packages/ui` |
| **AF3** | Cadastro e convite na API: criar, reenviar, cancelar, pausar, encerrar; e-mail do convite; aceite que cria ou vincula a conta e reivindica o slug (palavra de rota, categoria, outro afiliado); categoria passa a recusar slug de afiliado | `apps/api` (`affiliates`, `auth`, `catalog`), e-mail |
| **AF4** | Web do convite e da lista: tela de aceite (conta, `/nome`, Pix, termos), lista de afiliados e ficha no painel, formulário de convite | `apps/web`, `packages/ui` |
| **AF5** | Link na vitrine: terceiro caso de `sectionOf`, faixa "indicação de", cookie de 30 dias, `?afiliado=` em qualquer página, contagem de visitas, link pausado sem 404 | `apps/web` (`storefront-section.ts`, rotas), `apps/api` (leitura pública do afiliado, visitas) |
| **AF6** | Comissão do pedido: atribuição em `order-placement.ts`, cálculo puro com a repartição compartilhada com o cashback, linhas, compra própria, liberação na entrega + carência (varredura), estorno em `order-cancellation.ts` e na saída de *entregue*, extrato e saldos sob trava | `apps/api` (`orders`, `cashback`, `affiliates`) |
| **AF7** | Painel do dinheiro: afiliado no pedido e filtro na lista; escolher/trocar afiliado (venda registrada e pedido pendente); extrato do afiliado, ajuste com motivo, registrar acerto, "quanto devo a cada um" | `apps/web`, `apps/api` |
| **AF8** | Área do afiliado: `/parceiro` (lojas), `/parceiro/<loja>` com links, copiar link de produto, números, pedidos (sem dados do cliente), extrato, acertos, dados (Pix, telefone); e-mail quando um acerto é registrado | `apps/web`, `apps/api` (rotas `affiliate/...`) |
| **AF9** | Textos e verdade: nova versão da privacidade, `docs/product/` (seção Afiliados e "What the product does not do"), e2e do fluxo inteiro, mapas de superfície | `docs/product`, `apps/web` (legal), e2e |

## Ordem

1. **AF1** primeiro: tudo depende das tabelas.
2. **AF3 → AF6** é o caminho crítico da API. **AF2** e **AF4** andam em paralelo, cada uma depois da
   sua API.
3. **AF5** depende de AF3 (o slug existe) e precisa estar pronta antes de AF6 ter o que atribuir de
   verdade.
4. **AF7** e **AF8** depois de AF6.
5. **AF9** fecha. A privacidade nova tem de estar publicada **antes** de o primeiro link de afiliado
   ir ao ar em produção, então AF5 só é ligada em produção junto com ela.

Estimativa grosseira, no ritmo dos épicos de cashback e cupom: 15 a 20 dias, dos quais AF6 sozinha
leva 4 a 5.

## A decidir

1. **Carência padrão:** 7 dias proposto. Pode ser 0 para quem vende comida e não aceita devolução.
2. **O afiliado vê o primeiro nome do cliente** ("Maria S.")? Proposta: não na v1 — "Cliente" e o número
   do pedido.
3. **E-mail ao afiliado a cada venda?** Proposta: não na v1; ele vê na área. Só convite e acerto
   mandam e-mail.
4. **A faixa da vitrine tem foto e frase do afiliado?** Proposta: só o nome na v1.
5. **Afiliado é recurso do plano?** "What a page costs" tem um plano só. Se afiliado for vender plano
   mais caro, isso se decide antes de AF2, porque muda o que o painel mostra.
6. **Nome da área:** `/parceiro` ou `/afiliado`. Qualquer um vira slug reservado.
7. **O lojista pode exportar** o "quanto devo" em planilha para pagar em lote? Proposta: depois.

## Fora de escopo

- Preço próprio do afiliado, ou revenda com margem.
- Cupom do afiliado aplicado automaticamente pelo link.
- Split automático no Asaas para a carteira do afiliado. O desenho não fecha a porta: o acerto vira um
  segundo jeito de quitar o mesmo extrato.
- Comissão recorrente por cliente ("o cliente é do afiliado para sempre").
- Afiliado de vários níveis (indicação de indicação).
- Afiliado do próprio bee-link, que indica lojistas. É outro programa, sobre a assinatura.
- Trocar o `/nome` depois do aceite.

## Adendo — os tickets (24/10)

Criados no Plane, no projeto ImpulseIA, a pedido do Rafael, em Backlog:

| Tarefa | Ticket |
|---|---|
| Épico | IMPULSEIA-100 |
| AF1 | IMPULSEIA-101 |
| AF2 | IMPULSEIA-102 |
| AF3 | IMPULSEIA-103 |
| AF4 | IMPULSEIA-104 |
| AF5 | IMPULSEIA-105 |
| AF6 | IMPULSEIA-106 |
| AF7 | IMPULSEIA-107 |
| AF8 | IMPULSEIA-108 |
| AF9 | IMPULSEIA-109 |
