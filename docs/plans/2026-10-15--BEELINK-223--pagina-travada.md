# BEELINK-223 (S5) — API: a página travada (teste vencido, atraso, suspensão, cancelada)

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Sexto ticket de código. A branch nasce da do
> S11 (`feat/BEELINK-293-tela-assinar`, `6b6ed757`), que ainda está no PR #272 (e S10, S3 nos #270,
> #271); o PR deste ticket tem `main` como base e só fica legível depois que os três entrarem. Toca
> `packages/contracts`, `apps/api`, `apps/web` (a vitrine travada, o cache dela e o painel que não
> insiste numa página travada) e `packages/ui` (o aviso da vitrine). As decisões do épico não são
> reabertas; as que estão abaixo são do desenvolvedor. Leituras de base: os planos do S1
> (`2026-10-13--BEELINK-219--assinatura-por-pagina.md`), do S10 (`…BEELINK-292…`), do S3
> (`2026-10-14--BEELINK-221--pagamento-da-assinatura.md`, "O que o S5 precisa saber") e do S11
> (`2026-10-15--BEELINK-293--tela-assinar.md`, "O que o S5 precisa saber"). Escrito em 15/10/2026,
> antes do código.

## O problema

Até aqui a cobrança sabe em que situação cada página está, cria a assinatura no Asaas e aprende o
pagamento, mas nada acontece a uma página que não paga: o teste vence e a página segue no ar, com o
painel aberto. Falta a trava, e ela é a parte mais arriscada do épico porque passa por **todas** as
rotas do painel de uma página e por **toda** a vitrine de todas as lojas.

O que não pode acontecer, em ordem de gravidade:

1. **Com `BILLING_ENFORCED` desligada (produção hoje), qualquer rota que existe mudar de resposta**,
   ficar mais lenta ou perguntar algo a mais ao banco.
2. **Travar uma página que não deve**: isenta, no mês grátis, em carência, no teste, ou que não tem
   como pagar.
3. **Contar a um estranho que uma página está travada, ou por quê.** Um visitante da vitrine não
   pode saber que a loja não pagou; um lojista não pode saber da página de outro.
4. **Uma porta lateral** que sirva produto, preço ou carrinho, ou deixe o lojista usar o painel, de
   uma página travada.
5. **Uma página que pagou continuar travada** depois de a API saber do pagamento.
6. **O cliente que já comprou perder os pedidos dele.**

## Definição de Pronto

1. Testes com o relógio simulado mostram cada transição: fim do teste, pagamento, renovação não paga,
   carência, suspensão, pagamento depois da suspensão, cancelamento com e sem período pago, mês
   grátis.
2. Página travada recebe o erro estável nas rotas do painel e resposta normal nas de cobrança; a outra
   página do mesmo lojista continua aberta.
3. A vitrine de uma página travada mostra o aviso e recusa pedido; a de uma página em carência
   continua aberta.
4. Página isenta, ou com a chave desligada, nunca trava; com a chave desligada nenhuma rota que existia
   muda de resposta.
5. Unidade da API, tipos, lint, os e2e que a branch toca (inclusive os specs de vitrine e pedido que
   passam pela proteção), os testes do web e do `packages/ui` que mudarem, `arch-gates` e `docs-gate`
   verdes.

## Decisões

### A regra, numa função pura (`modules/billing/page-lock.ts`)

1. **`lockOf(linha, agora)` responde `null` (aberta) ou o motivo: `TRIAL_EXPIRED`, `SUSPENDED` ou
   `CANCELED`.** É a única função que decide; a proteção, a leitura da assinatura, a vitrine e o
   relógio da rotina a chamam. Os fins continuam instantes exclusivos (S1, decisão 7): `agora >= fim`
   é "acabou".
2. **A ordem:**
   - `EXEMPT`: nunca trava.
   - **Mês grátis** (`freePeriodEndsAt` no futuro): não trava, qualquer que seja a situação. Depois
     dele, a regra de sempre, que para quem nunca pagou é a trava (o mês conta a partir do fim do
     teste, S6).
   - **Nunca pagou:** `TRIALING` trava no instante de `trialEndsAt` (motivo `TRIAL_EXPIRED`); uma
     linha já gravada `TRIAL_EXPIRED` está travada.
   - **Pagou e o período acabou sem a renovação paga:** em carência até o fim dela, com acesso normal;
     depois, `SUSPENDED`. Vale para uma linha `PAST_DUE` e também para uma `ACTIVE` cujo
     `currentPeriodEndsAt` passou sem ninguém ter gravado nada (o S3 já a lê `PAST_DUE`).
   - `SUSPENDED`: travada até pagar (o S3 escreve `ACTIVE` ao ler o pagamento).
   - `CANCELED`: aberta até `currentPeriodEndsAt`; travada depois, ou já, sem período.
3. **A leitura da situação acompanha o relógio** (`subscription-status.ts`): uma página em atraso
   depois do fim da carência é lida `SUSPENDED`, como uma em teste depois do fim é lida
   `TRIAL_EXPIRED` (S1) e uma ativa depois do período é lida `PAST_DUE` (S3). A trava e a situação
   lida nunca discordam.
4. **A carência são 7 dias** (`GRACE_DAYS`, regra do ticket) **contados de `currentPeriodEndsAt`**, que
   já é a meia-noite de Brasília que fecha o dia do vencimento (S3): a carência acaba na meia-noite
   que fecha o sétimo dia depois do vencimento.
5. **Sem período para contar** (o único pagamento contestado, `PAST_DUE` com `currentPeriodEndsAt`
   nulo, S3 "Como ficou" 2): a carência conta **do dia em que a página foi vista em atraso pela
   primeira vez**, até a meia-noite de Brasília que fecha o sétimo dia depois dele, e esse fim é
   gravado. É o mais generoso que ainda acaba: um lojista nunca recebe menos de 7 dias inteiros.
6. **Uma coluna nova, `store_subscriptions.graceEndsAt`**: o fim da carência, gravado quando a página
   é vista em atraso, para a trava, a faixa do S14 e os e-mails do S7 lerem a mesma data. Quem a
   escreve é quem escreve a situação: a porta do S3 (`SubscriptionSync`, ao gravar `PAST_DUE`) e o
   relógio da rotina (decisão 18). **Uma carência gravada nunca encolhe**: se uma escrita depois
   calcular um fim mais cedo, fica o gravado. Ela é apagada quando a página paga (`ACTIVE`), é
   cancelada ou volta a nunca ter pago; numa `SUSPENDED` fica, dizendo quando a carência acabou.
7. **A trava só existe onde a página pode pagar: `BILLING_ENFORCED` ligada e a chave da plataforma
   configurada** (o mesmo `running` do S3). Com a chave ligada e sem a chave do Asaas, a tela Assinar
   diz que a assinatura está indisponível (S11): travar ali deixaria o lojista sem saída. O S9 já
   dizia "sem a chave, a cobrança fica indisponível e o resto do produto não muda". A regra do
   briefing ("desligada, ou isenta: nunca trava") fica valendo, com esta a mais.
8. **Página sem linha de assinatura** (de antes do S1, até o S15) **nunca trava**: não se sabe o teste
   dela, e o S15 é que lhe dá um mês.

### A proteção (`PageLockGuard`, um guard global, só no servidor)

9. **Um guard global, registrado logo depois do da sessão** (`AppModule`, `APP_GUARD`, na ordem), para
   toda rota com uma página no caminho (`:storeSlug`, ou o `:slug` de `/stores/:slug`). **Fechado por
   padrão:** uma rota nova de página nasce travada. Duas marcas em `modules/billing/page-lock.decorators.ts`
   abrem: `@OpenWhileLocked()` (a rota responde como sempre, e o guard nem pergunta) e
   `@AnswersLockedPage()` (a rota responde à sua maneira, e o guard lhe entrega como a página está).
10. **Com a trava desligada (decisão 7), o guard volta antes de qualquer consulta.** É o que garante a
    produção de hoje: nenhuma pergunta a mais ao banco, nenhuma resposta diferente.
11. **No painel, só o dono ouve a trava.** O guard lê a página (dona e linha de assinatura) numa
    consulta; para quem não é o dono, para um slug que não existe ou sem sessão, ele deixa passar, e a
    rota responde o que responde hoje (`403 STORE_FORBIDDEN`, `404 STORE_NOT_FOUND`, `401`). Assim a
    trava nunca conta a um estranho que uma página está travada.
12. **O erro do painel é `403 PAGE_LOCKED`**, com o motivo em `details` (`{ reason }`), no desenho de
    `ORDER_STOCK_INSUFFICIENT`. `403` e não `423` ou `503`: é uma recusa definitiva até pagar (o canal
    em tempo real do painel já para de tentar num `403`), não é falha do servidor (um `5xx` vai para o
    log como erro, e as leituras da vitrine tomam `5xx` por queda).
13. **Na vitrine, `403 STORE_UNAVAILABLE`, sem motivo:** o visitante sabe que a loja está indisponível,
    nunca por quê.
14. **Abertas no painel de uma página travada:** só as da assinatura dela (`GET`, `PUT` e `check` de
    `/stores/:slug/subscription`). Tudo o que não tem página no caminho já fica de fora: a conta de
    cobrança, os planos, a conta do lojista (`/users/me`), a lista das páginas dele (`/stores/mine`),
    criar uma página (`POST /stores`), os envios de arquivo, a busca de endereço.
15. **`GET /stores/:slug` (a própria página) fica travada.** O S14 desenha a tela de página travada
    com o nome, o slug e o logo que `/stores/mine` já traz (o mesmo `Store`, que o shell do painel já
    lê em `useMyStores`): abrir a rota não daria nada a mais e seria uma exceção à regra.
16. **As leituras do shell do painel** (`panel-counts`, as duas do sino, `realtime/ticket`) **também
    respondem `PAGE_LOCKED`**, e não "abertas" nem "vazias": abertas, as do sino seriam a lista inteira
    de pedidos e de conversas de uma página travada (a mesma rota da tela de pedidos); vazias, seriam
    uma mentira que uma tela leria como "nenhum pedido". Para o shell não insistir: o `QueryClient` do
    web deixa de repetir uma leitura recusada com `PAGE_LOCKED`, como já não repete a de uma sessão
    encerrada, e o canal em tempo real já para num `403`. O shell segue de pé: sem número no menu,
    sino vazio, sem canal. O que ele mostra numa página travada é do S14.
17. **Abertas na vitrine de uma página travada: o que é do cliente e do que ele já comprou.** A conta
    (cadastro, entrada, Google, sessão, perfil, senha, avisos, sair de todos os lugares), os endereços,
    os dados e a exclusão da conta (LGPD), o saldo de cashback, os pedidos (lista, um pedido,
    cancelar), o pagamento de um pedido já feito (ler e pagar), a conversa de um pedido (ler, escrever,
    marcar como lida), as avaliações e o canal em tempo real do cliente. **Recusadas:** a leitura
    pública da loja só no que vende (decisão 19), o catálogo, a página de produto, os produtos do
    carrinho, as cotações (de carrinho, do cliente, de pedido e de frete), as ofertas (públicas e do
    cliente), as formas de pagamento da loja, as landings, as avaliações públicas de um produto, os
    favoritos (uma lista de produtos com preço), o "comprar de novo", **fazer um pedido**, o contato,
    o "avise-me quando chegar" e a contagem do funil. Pagar um pedido já feito fica aberto de
    propósito: o dinheiro é da loja, pelo Asaas dela, por uma compra feita antes da trava; recusar só
    deixaria o pedido do cliente sem pagamento.

### A vitrine

18. **A leitura pública da loja (`GET /stores/:slug/public`) de uma página travada responde `200`**,
    marcada `@AnswersLockedPage()`, com a identidade da loja (nome, logo, cores, palavras das rotas,
    redes) e **nada do que ela vende nem de quem mede**: sem vitrines (`sections: []`), sem landings,
    sem cashback, sem Meta Pixel e sem Google Analytics, e com `unavailable: true`. Por que `200` e não
    o erro: o cliente que já comprou entra pela vitrine para ver os pedidos, e as páginas da conta são
    desenhadas com a identidade da loja. O campo só aparece numa loja travada: com a trava desligada a
    resposta é a de hoje, byte por byte.
19. **No web, as páginas que vendem mostram "Loja indisponível no momento"** com o nome da loja e um
    caminho para "meus pedidos" (só numa loja, não num site): a página inicial, o catálogo, as
    categorias, a busca, o carrinho, a página de produto e as landings, e qualquer endereço que não seja
    da conta. As páginas da conta, de entrada e dos pedidos seguem como hoje (com o menu vazio, porque o
    catálogo é recusado). O aviso é um bloco novo em `packages/ui` (`StorefrontUnavailable`, com story e
    teste), desenhado dentro do `StorefrontFrame` sem cabeçalho nem rodapé (`chrome={false}`), nas
    cores da loja. O texto mora nos locales da UI; o S16 revisa.
20. **A página indisponível não é indexada** (`noindex, nofollow`): o que um buscador guardaria seria
    "Loja indisponível" no lugar da loja. Ela sai do índice enquanto está travada, e volta quando o
    buscador passar de novo; é o sinal verdadeiro de uma loja fora do ar. O Next não deixa uma página
    responder `503`, que seria o ideal.
21. **Fazer um pedido numa vitrine aberta antes da trava** (uma aba velha) é recusado pela API, ao vivo;
    o carrinho lê a página de novo nesse código (`checkout-refusal.ts`), e a página mostra o aviso.

### O cache da vitrine

22. **Como a vitrine é guardada** (lido em `apps/web/src/lib/public-api.ts` e no `patch-fetch` do Next
    16.3): cada leitura pública fica 60 s no cache de dados do Next e é servida velha enquanto se busca
    de novo (sem teto numa loja quieta); **só respostas `200` são guardadas** (`res.status === 200`), e
    um preço que muda sem escrita viaja na resposta (`x-prices-change-at`), que o web não serve depois
    da hora. Então: as recusas (`403 STORE_UNAVAILABLE`) nunca ficam no cache; o que pode ficar velho
    é a leitura pública da loja (`200`) e o que foi guardado antes da trava.
23. **Escolha: limitar quanto tempo a vitrine pode ficar velha, pela própria resposta**, com um
    cabeçalho novo, `x-lock-changes-at`, na leitura pública da loja, que o web trata como o dos preços:
    - **numa página aberta**, o próximo instante em que a trava pode fechar pelo relógio (o fim do
      teste, do período pago, do mês grátis ou da carência, o mais cedo deles): **a vitrine trava no
      instante certo**, sem esperar a rotina nem o cache;
    - **numa página travada**, um minuto depois da leitura: ela só abre com um pagamento, que relógio
      nenhum conhece, então a resposta travada nunca é servida com mais de um minuto. Um minuto, e não
      menos, porque a leitura pública divide um limite de 300 por minuto entre todas as lojas (o web
      chama a API de um endereço só): uma resposta que vencesse antes do cache poder guardar a próxima
      faria cada visita a uma loja travada custar uma chamada.
24. **E a conferência do painel derruba o cache quando lê a página paga:** a rota do web do
    `POST …/subscription/check` chama `revalidateStore` quando a resposta diz `ACTIVE`. É o caminho do
    lojista que acabou de pagar pela tela Assinar (que para de conferir ao ver `ACTIVE`), e assim a
    vitrine dele volta na hora, não em até um minuto. O comentário que o S11 deixou na rota passa a
    dizer isso.
25. **O que fica sem teto:** uma página aberta que trava por um evento (o dinheiro do período devolvido,
    ou a assinatura removida sem período em curso) pode aparecer aberta, numa loja quieta, para o
    primeiro visitante até a leitura seguinte, porque nenhum relógio sabia. Ele vê a loja e não
    consegue comprar (a API recusa ao vivo). Fica em "Riscos".

### O relógio da rotina

26. **`BillingRoutine` ganha um passo** (`PageLockClock`, antes de ler as páginas no Asaas): grava
    `TRIAL_EXPIRED` numa linha `TRIALING` cujo teste acabou; `PAST_DUE` e o fim da carência numa linha
    `ACTIVE` cujo período acabou; o fim da carência numa `PAST_DUE` que ainda não o tem; `SUSPENDED`
    numa em atraso cuja carência acabou. É o que a leitura já diz, gravado para quem consulta por
    situação (o S7, o S15). **A proteção não depende dele:** calcula na hora.
27. **Cada passo é um `UPDATE … WHERE` com a situação e as datas que o tornam devido**, e mais nada:
    o Postgres confere a condição de novo depois de esperar a trava de cada linha, então um pagamento
    gravado pela porta do S3 no meio (que muda a situação ou o período) tira a linha do passo, e nunca
    é desfeito. Sem trava segurada entre passos, sem chamada ao Asaas, sem lote: são quatro comandos
    por volta, e uma volta sem nada a fazer custa quatro consultas por índice.
28. **A porta do S3 grava o fim da carência junto com a situação** (`subscription-facts.ts`): ao
    escrever `PAST_DUE`, pela decisão 6; ao escrever `ACTIVE` ou `CANCELED`, apaga.

### O contrato (`packages/contracts`)

29. `PageLockReason` (`TRIAL_EXPIRED | SUSPENDED | CANCELED`) e `PageLockedDetails`; `PAGE_LOCKED` em
    `BillingErrorCode`; `STORE_UNAVAILABLE` em `StoreErrorCode`; `PublicStore.unavailable?: true`;
    `LockChangesAtHeader`. **A leitura da assinatura ganha dois campos**, para o S14 não refazer a
    regra no navegador: `lock` (o motivo, ou nulo; sempre nulo com a trava desligada) e `graceEndsAt`
    (o fim da carência de uma página em atraso ou suspensa). As rotas de cobrança são do épico e mudam
    com ele (o S6 também acrescenta); nenhuma rota do produto de antes muda de forma.

### O web, além da vitrine

30. **O `QueryClient` não repete uma leitura recusada com `PAGE_LOCKED`** (decisão 16).
31. **As frases dos dois códigos novos** entram no dicionário de erros do web (`errors`), que é tipado
    pelos códigos do contrato.

## Fora do escopo

- A tela de página travada e as faixas do painel (S14): numa página travada, as telas do painel que
  não são a Assinar vão mostrar o erro da leitura delas até o S14. Os e-mails (S7), o cupom (S6), as
  páginas que já existiam (S15), cancelar pelo painel (S12).
- Mexer no texto legal.
- Travar por outro motivo que não a cobrança.

## Riscos

1. **Uma rota de página nova que devia ficar aberta nasce travada** (decisão 9). É o lado seguro: ela
   aparece no primeiro teste com a cobrança ligada, e abrir é uma linha.
2. **Uma loja que trava por um evento** pode aparecer aberta ao primeiro visitante de uma loja quieta
   (decisão 25), sem conseguir comprar.
3. **A vitrine travada sai dos buscadores** (decisão 20).
4. **A trava depende da chave da plataforma** (decisão 7): com a chave recusada pelo Asaas em tempo de
   execução (configurada, mas errada), as páginas travam sem conseguir pagar. É falha de configuração,
   e a subida já recusa uma chave do ambiente errado (S9).
5. **Uma consulta a mais** em cada rota de página, com a cobrança ligada: a página e a linha da
   assinatura, por índice único. Nenhuma com ela desligada.
6. **O shell do painel de uma página travada** fica sem números e sem canal até o S14 decidir o que
   mostra; um lojista que paga pela tela Assinar volta ao painel com o canal parado até recarregar.

## Como desfazer a migration

```sql
DROP INDEX "store_subscriptions_status_idx";
ALTER TABLE "store_subscriptions" DROP COLUMN "graceEndsAt";
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261015120000_store_subscription_grace';
```

Não apaga nada do que foi contratado nem a situação das páginas: só o fim gravado das carências. A
leitura volta a contar a carência do fim do período (ou de hoje, sem período) até a coluna voltar.

---

## Como ficou (acréscimo de 15/10/2026, depois do código)

### O que mudou em relação ao plano acima

1. **A porta do S3 grava também `SUSPENDED`**, e não só o fim da carência: uma leitura do Asaas que dá
   `PAST_DUE` depois do fim da carência grava `SUSPENDED` (`subscription-facts.ts`), para a situação
   gravada ser sempre a que a leitura diz. Por isso um teste do S3 mudou de propósito
   (`test/subscription-payment.e2e-spec.ts`): "ends with the next due day…" usava uma página com o
   período vencido há duas semanas, que agora é lida `SUSPENDED`; ele passou a usar uma vencida há 2 ou 3
   dias (dentro da carência) e ganhou um irmão para a suspensão.
2. **Se a trava está ligada é `PageLocks.engaged`**: `BILLING_ENFORCED` **e** `PlatformAsaas.configured`,
   o mesmo par do `running` do S3 — o cliente injetado, não a variável lida de novo. O teste do S1 em
   `billing-enforced.e2e-spec.ts` (cobrança ligada, sem chave) passou de "nada trava ainda" para "nada
   trava sem chave", e confere que o relógio não escreve nada.
3. **A leitura pública da loja recebe a situação da página pelo próprio guard** (`@AnswersLockedPage()` e
   `@PageLockOf()`), e não por uma consulta do `StoresService`: assim `StoresModule` não importa
   `BillingModule` (que já importa `StoresModule`), e a trava é calculada num lugar só por requisição.
4. **O guard tem teste de unidade** (`page-lock.guard.spec.ts`), além dos e2e: é o que prova que, com a
   trava desligada, ele não pergunta nada ao banco.
5. **A frase da recusa de um pedido numa loja fora do ar** (`checkoutShopUnavailable`) entrou nos locales
   da UI, e a do código no dicionário do web (`errors.STORE_UNAVAILABLE`, `errors.PAGE_LOCKED`).
6. **As páginas da conta de uma loja fora do ar continuam com o cabeçalho e o rodapé da loja** — a busca,
   o carrinho, "Todos os produtos", que levam ao aviso, e "Fazer pedido no WhatsApp", o canal da própria
   loja, que mantive. Visto na tela; o S14 ou o S16 podem querer tirar.
7. **Um teste nasceu de um erro plantado** (abaixo): a página da conta em si (`/conta`) numa loja fora do
   ar.

### O que foi rodado

Postgres 18.6 (`beelink-domain-db`, porta 5442) e Mailpit (1027/8027).

1. **A migration, do zero**, num banco de rascunho (`harness_landing_s5_proof`, criado e apagado):
   `prisma migrate deploy` aplicou as 115; `prisma migrate diff --exit-code` saiu com 0 nos dois sentidos.
   O roteiro de desfazer rodou como está escrito; depois dele o `diff` saiu com 2 (pedindo a coluna e o
   índice), e a migration aplicou de novo (diff 0). Aplicada também nos bancos de desenvolvimento e de
   teste.
2. **Unidade, no último commit de código:** API 137 arquivos e 1.790 testes (eram 135 e 1.745 no S3); web
   334 arquivos e 2.984 testes (antes do último commit, que só acrescentou um teste: o arquivo dele, 13
   testes, rodou depois); `packages/ui` 380 arquivos e 2.926 testes. Todos verdes.
3. **Tipos e lint:** `tsc --noEmit` na API, no web (`next typegen` e `tsc`), no `packages/ui` e em
   `packages/contracts`, saída 0. `oxlint` na API e na UI: 0 erros (os dois avisos antigos de cada, em
   arquivos que este ticket não toca); `eslint` nos arquivos do web tocados: 0 erros (quatro avisos
   antigos em `funnel-count.test.ts`).
4. **e2e da API, um arquivo por vez.** No último commit, os da cobrança e da trava: `page-lock` (45),
   `billing-enforced` (2), `billing` (18), `subscription-payment` (33), `store-subscription` (79),
   `store-subscription-key` (9), `store-subscription-not-enforced` (8), `store-subscription-without-key`
   (9), `billing-webhook` (14), `billing-webhook-key` (4), `billing-account` (34), `billing-account-key` (9),
   `billing-account-without-key` (6): 270 testes, verdes. **E 47 specs de painel e de vitrine que a
   proteção alcança, com a cobrança desligada** (pelo menos um por controller com página no caminho):
   `stores`, `catalog`, `orders`, `panel-counts`, `conversations`, `customers`, `customer-record`,
   `cashback`, `promotions`, `shop-popup`, `leads`, `page`, `pages`, `page-versions`, `page-templates`,
   `sales-by-origin`, `store-funnel`, `realtime`, `custom-domain`, `delivery-settings`, `shipping-quote`,
   `asaas-connection`, `asaas-settings`, `melhor-envio-connection`, `order-label`, `meta-pixel`,
   `google-analytics`, `product-reviews`, `order-payments`, `order-refunds`, `storefront-cart`,
   `storefront-listing`, `storefront-variants`, `storefront-promotions`, `shop-offers`, `first-purchase`,
   `customer-orders`, `order-discounts`, `customer-favorites`, `customer-addresses`, `customer-privacy`,
   `customer-security`, `customer-google`, `shopper-cashback`, `cashback-storefront`, `restock-requests`,
   `showcase-read`: 697 testes. **46 verdes de primeira; `custom-domain` falhou 5 de 14** porque o
   `apps/api/.env` deste worktree tem `SHOP_DOMAIN_PROBE=false` e o `vitest.config.e2e.ts` não o
   sobrescreve (o spec confere que é `true`); com `SHOP_DOMAIN_PROBE=true` só no shell, 14 de 14. Não é
   deste ticket, e o `.env` não foi editado.
5. **`pnpm arch-gates` e `pnpm docs-gate`** verdes em todos os commits (rodam no `pre-commit`).
6. **Os testes postos à prova com 32 erros plantados**, um por vez, cada um desfeito em seguida pelo
   `git checkout` (árvore limpa conferida no fim). **30 pegos de primeira.** Um é equivalente: tirar o
   "isenta nunca trava" do começo de `lockOf` não muda nada, porque `statusAt` devolve `EXEMPT` e a função
   já responde aberta. Um passou — "a página da conta em si sai do ar" — e ganhou o teste que faltava,
   que depois falhou com o erro plantado. Entre os 32: ignorar o mês grátis; travar a cancelada com
   período em curso; seis dias de carência; mover para trás uma carência gravada; ignorar a contagem
   mais tarde; contar a carência de agora e não do fim do dia; nunca ler `SUSPENDED`; guardar a leitura
   de uma loja travada sem teto; esquecer a carência no instante seguinte; a porta não gravar
   `SUSPENDED`; a porta manter a carência numa página paga; dizer travada onde nada trava; o guard ler o
   banco com a trava desligada; contar a um estranho; contar ao visitante o motivo; não entregar a
   situação à leitura pública; o web servir a loja guardada depois do instante; uma página de produto
   vender fora do ar; a página fora do ar ser indexada; a conferência derrubar o cache sem pagamento; o
   painel repetir uma leitura travada; contar o funil fora do ar; o carrinho não ler a página de novo;
   travar sem chave; o relógio vencer um teste em curso; suspender dentro da carência; a leitura pública
   servir o que vende; aceitar pedido novo; travar a própria assinatura; travar os pedidos do cliente.

### Na tela, de verdade (15/10/2026, das 02:43 às 02:53 de Brasília)

A API na 3201 (`nest start`, banco `harness_landing`) com `BILLING_ENFORCED=true` e uma **chave inventada
no formato de sandbox**, só no ambiente do processo — nada neste roteiro pergunta ao Asaas, e assim a
conta de teste compartilhada não foi tocada; o web na 3200 (`next dev`). Uma dona "Teste S5 Dona" com
duas páginas ("Teste S5 Padaria", com um produto, e "Teste S5 Outra"), uma cliente "Teste S5 Cliente" e
um pedido feito antes da trava, tudo pela própria API. A trava, posta pelo banco (o teste vencido
ontem). Tudo abaixo foi **visto**.

| O quê | O que aconteceu |
|---|---|
| A vitrine travada, a 1920, 1280 e 390 px | O nome, "Loja indisponível no momento", a frase e "Já comprou aqui? Veja seus pedidos", nas cores da loja, sem cabeçalho nem rodapé. `noindex, nofollow`, título o nome da loja, nenhuma rolagem horizontal a 390. Nenhuma requisição além dos estáticos (o funil não conta), console sem erro. O botão a 5,31:1 |
| `/produtos`, um produto, `/carrinho` | O mesmo aviso, sem preço em lugar nenhum |
| O caminho da cliente | O botão levou à entrada da loja (`/entrar?voltar=…/conta/pedidos`); entrando, "Meus pedidos" com o pedido nº 1, "Acompanhar pedido", "Falar com a loja" e "Cancelar pedido"; a página do pedido abriu. Console sem erro |
| A tela Assinar da página travada, no painel | "Teste encerrado", os três ciclos, os dados de cobrança. Em volta, o shell de pé: sem número no menu, sino sem contagem. `panel-counts`, as duas leituras de pedidos do sino, a de conversas e o ticket do canal responderam `403` **uma vez cada** (sem as repetições); as três leituras da tela, `200` |
| O início do painel da página travada | Ficou no esqueleto e caiu num estado degradado (o slug no título, a lista de passos), sem quebrar: as leituras dele respondem a trava. É a tela que o S14 troca |
| A outra página da mesma dona | Tudo `200`, console sem erro |
| A carência | Em atraso há 2 dias: a vitrine aberta, com produto e preço, e a API dizendo `x-lock-changes-at` no fim da carência (o período mais 7 dias) |
| **A trava pelo relógio, pelo cache do web** | O fim da carência posto 2 minutos à frente; a vitrine visitada aos 65 s (aberta) e aos 68 s (aberta, guardada de novo dizendo o instante); visitada 3 s depois do instante: **o aviso**, antes de a rotina passar — o cálculo na hora e a leitura guardada que não passa do instante |
| **A página paga** | `ACTIVE` gravado no banco (como a porta grava): a API abriu na hora (catálogo `200`); a vitrine no web continuou com o aviso (a leitura travada guardada vale até um minuto); **a conferência pela rota do web** (`POST /api/stores/…/subscription/check`, com a sessão da dona) respondeu `ACTIVE` e, um segundo depois, a vitrine abriu |
| A rotina | Gravou sozinha, no processo de pé, o teste vencido da página travada e, depois, o fim da carência da página em atraso (as duas linhas "The clock moved pages' standing" do log) |

**O log da API**, lido no fim (409 linhas): nenhuma linha de aviso ou de erro; os e-mails, a senha e a
chave inventada 0 vezes. **Limpeza:** as duas páginas, as duas contas e o pedido apagados do banco (0
lojas, 0 assinaturas, 0 pedidos, 0 clientes depois), os e-mails "teste-s5" apagados do Mailpit, a API e
o web encerrados (`pgrep -fl "worktrees/landing"` vazio) e o `apps/web/.next` apagado. Capturas em
`.claude/worktrees/subscription-pr/screens-223/`.

### O que não foi rodado

- `pnpm ci-check`, `turbo` em todos os workspaces, `next build`, o Storybook (a story nova só foi
  compilada pelo `tsc` da UI), a suíte e2e inteira da API (rodaram 60 dos 101 arquivos, um por vez) e o
  Playwright do web (não há spec novo dele): o briefing proíbe nesta máquina. Ficam para o push.
- **Nada no Asaas de verdade**: este ticket não pergunta nada a ele. O pagamento que destrava foi o Asaas
  falso dos e2e e, na tela, a linha gravada como a porta grava.
- Duas instâncias da API ao mesmo tempo; homologação e produção.
- O aviso em inglês fora dos testes; outros navegadores; um leitor de tela de verdade.
- As telas do painel de uma página travada além da Assinar e do início (o modo design, os pedidos…):
  vão mostrar o erro ou o esqueleto das leituras delas até o S14.

### O que o S14 (BEELINK-296, a tela de página travada e as faixas) precisa saber

- **Como o web descobre a trava:** `GET /api/stores/:slug/subscription` → `subscription.lock`
  (`TRIAL_EXPIRED`, `SUSPENDED`, `CANCELED` ou nulo — sempre nulo onde nada trava) e
  `subscription.graceEndsAt` (o fim da carência de uma página em atraso ou suspensa: a data da faixa da
  carência). `status` já lê `SUSPENDED` depois da carência; `trialDaysLeft` serve para a faixa dos 2
  últimos dias do teste; `billingEnforced` para não mostrar nada onde nada se cobra.
- **O código:** toda outra rota do painel de uma página travada responde `403 PAGE_LOCKED`, com
  `details: { reason }` (`PageLockedDetails`), e só ao dono. No web, `isPageLockedError`
  (`apps/web/src/lib/page-lock.ts`); a frase `errors.PAGE_LOCKED` existe, para o S16 revisar.
- **O que fica aberto:** a assinatura (`GET`, `PUT`, `…/check`), `/billing/*`, `/users/me`,
  `/stores/mine`, `POST /stores`. **`GET /stores/:slug` fica travado:** o nome, o logo e o slug da tela
  de página travada vêm de `/stores/mine`, que o shell já lê (`useMyStores`).
- **O shell numa página travada** (visto): as leituras dele respondem `PAGE_LOCKED` uma vez cada, o
  relógio dos números continua (60 s com o canal) e os traz de volta quando a página é paga; o canal em
  tempo real para no `403` e **não volta sozinho** depois do pagamento (o `router.replace` da tela Assinar
  mantém o efeito): vale remontar o `PanelRealtime` quando a trava sai.
- **Onde desenhar a tela:** em toda página `/admin/<slug>/…` de uma página travada, menos a `/subscribe`,
  levando a `subscribePageOf(slug)`. Hoje o início fica no esqueleto e cai num estado degradado, e o
  modo design deve dar erro.
- **A vitrine fora do ar já existe** (`StorefrontUnavailable`, `ShopUnavailable`); as páginas da conta de
  uma loja fora do ar mantêm o cabeçalho e o rodapé (item 6 de "O que mudou").

### O que o S6 (BEELINK-224, o cupom) precisa saber

- **`freePeriodEndsAt` no futuro deixa a página aberta qualquer que seja a situação** (`lockOf`); depois
  dele, a regra de sempre. O relógio continua gravando `TRIAL_EXPIRED` ou `SUSPENDED` durante o mês
  grátis (é o que a leitura diz): a tela e o card devem dizer "Grátis até …" por `freePeriodEndsAt`, não
  pela situação.
- **A rota do cupom precisa de `@OpenWhileLocked()`** (`modules/billing/page-lock.decorators.ts`): ela é
  de uma página (`stores/:storeSlug/…`) e, sem a marca, o guard a recusa com `PAGE_LOCKED` justamente
  para a página travada que quer o cupom.
- **A vitrine:** `lockChangesAt` já inclui `freePeriodEndsAt`, então ela trava no instante em que o mês
  acaba. Ao dar o mês a uma página travada, a rota do web do cupom deve chamar `revalidateStore(slug)`,
  como a conferência faz ao ler `ACTIVE`; sem isso a vitrine abre em até um minuto.
- `toStoreSubscription(row, now, locks)` agora recebe se a trava está ligada (`PageLocks.engaged`).

### O que o S15 (BEELINK-297, as páginas que já existiam) precisa saber

- **Uma página sem linha de assinatura nunca trava** (`PageLocks.pageOf`). A linha que o S15 cria (teste
  contado da criação, já vencido, e `freePeriodEndsAt` no fim de 13/11/2026) fica aberta até lá; o
  relógio grava `TRIAL_EXPIRED` nela na primeira volta, o que não trava nada durante o mês.
- **O relatório** ("quantas travariam se a chave ligasse agora", "as criadas depois de 13/10 cujo teste já
  passou") deve chamar `lockOf` (`page-lock.ts`) com o instante, e nunca refazer a regra.
- **Ligar trava na hora:** com `BILLING_ENFORCED=true` e a chave, toda página com o teste vencido e sem
  mês grátis trava no primeiro pedido seguinte (`docs/repo/deploy.md`). Marcar `EXEMPT` é escrever em
  `store_subscriptions`, então o comando mora em `modules/billing` (regra `api/page-subscription-in-billing`).

### O que o S7 (os e-mails) precisa saber

- `graceEndsAt` é a data da carência que a trava usa; o relógio a grava em até um minuto depois de a
  página ser vista em atraso, e a porta do S3 ao ler o Asaas. A situação de agora é `statusAt`, a trava
  `lockOf`.

### Riscos, além dos de cima

7. **O `custom-domain.e2e-spec.ts` falha neste worktree** por causa do `.env` dele (item 4 de "O que foi
   rodado"); no CI, sem esse `.env`, não deve.
8. **`apps/web/src/app/[slug]/[section]/[item]/page.tsx` está com 244 linhas**, perto do limite de 250.
