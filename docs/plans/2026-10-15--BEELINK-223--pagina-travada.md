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
