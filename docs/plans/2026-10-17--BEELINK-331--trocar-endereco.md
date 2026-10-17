# BEELINK-331 — Configurações da página: trocar o endereço (slug), com o antigo redirecionando

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Branch `feat/BEELINK-331-trocar-endereco`, cortada de `origin/main` (`f8845581`, com o Épico S até o S2).
> O PR tem base `main` e não depende de nenhum outro. Toca `packages/contracts`, `apps/api`, `packages/ui` e
> `apps/web`. Escrito em 17/10/2026, antes do código. As decisões do Rafael (abaixo) não são reabertas; as
> numeradas em "Decisões" são do desenvolvedor, tomadas pelo lado mais conservador, sem perguntar.

## O pedido

"Quero poder editar informações de slug da minha página, criei uma com nome errado e não posso editar."
Escolhido pelo Rafael em 17/10/2026: **o lojista troca o endereço a qualquer momento, nas configurações da
página, com confirmação; o endereço antigo fica reservado e redireciona para o novo** (links impressos,
compartilhados e de e-mail continuam funcionando); **clientes logados precisam entrar de novo**; **uma troca
a cada 30 dias**.

Até aqui o produto inteiro foi escrito sobre "o slug nunca muda" (`store.prisma`, `UpdateStoreDto`, o
contrato `UpdateStorePayload`, a cópia "o endereço não pode ser alterado depois da criação"). Este ticket
muda esse pressuposto num lugar só e confere cada coisa que dependia dele (lista abaixo).

## Definição de Pronto

1. `PUT /api/stores/:slug/slug` troca o endereço, só para o dono, com as regras da criação (normalização de
   `CreateStoreDto`, 3 a 40 caracteres, `SLUG_PATTERN`, `RESERVED_SLUGS`) e recusas estáveis:
   `STORE_SLUG_INVALID`, `STORE_SLUG_RESERVED`, `STORE_SLUG_TAKEN`, `STORE_SLUG_UNCHANGED` e
   `STORE_SLUG_CHANGE_TOO_SOON` (com o dia em que a troca volta a valer). Limite de chamadas.
2. O antigo vai para `store_slug_history` (endereço único), na mesma transação em que a página recebe o novo;
   a página pode voltar a um endereço que já foi dela (ele sai do histórico).
3. Ninguém pega um endereço reservado: nem outra página trocando, nem uma página nova sendo criada, nem na
   corrida (duas trocas pelo mesmo endereço ao mesmo tempo terminam com uma só) — provado em e2e.
4. Uma troca a cada 30 dias, contados da última (gravada em `stores.slugChangedAt`); o painel sabe o dia
   (`Store.slugChangeableOn`).
5. Toda rota que acha uma página pelo endereço e não acha responde, para um endereço antigo, `404
   STORE_MOVED` com o endereço atual em `details.slug` — decidido num ponto só.
6. No web, `/<antigo>/…` leva a `/<novo>/…` e `/admin/<antigo>/…` a `/admin/<novo>/…` com `308`, mantendo
   o resto do caminho e a busca; o domínio próprio continua abrindo a página.
7. O cache da vitrine do antigo e do novo é derrubado na troca.
8. Tela: o endereço atual e "Trocar endereço" nas configurações da página, levando a uma rota própria com o
   campo, a prévia normalizada, a disponibilidade, o que acontece e a confirmação; depois de trocar, o painel
   vai para o novo endereço sem sair e entrar.
9. Nada que dependia do slug quebrou: a lista abaixo conferida, item por item, com o que foi feito.
10. Tipos de fio em `packages/contracts`; textos em pt-BR e en; documentação (`apps/api/docs/README.md`,
    `apps/web/docs/README.md`, `docs/product/README.md`).
11. Unidade e e2e da API (os specs que a branch toca), testes do web e da UI, e2e do web do redirecionamento,
    tipos, lint, `arch-gates`, `docs-gate`; capturas a 1920 e 390 px em `screens-331/`.

## Decisões

### O que a API responde para um endereço antigo

1. **`404 STORE_MOVED`, com `details: { slug: "<atual>" }`** (`StoreMovedDetails`). 404 e não 301/308:
   a API é interna e responde JSON; quem não conhece o código continua lendo "não existe", que é o lado
   seguro, e quem conhece (o web) sabe para onde levar. Respondido a qualquer um: o endereço antigo é público
   por natureza (estava impresso) e quem o visita é levado ao novo de qualquer jeito.
2. **Um endereço antigo nunca age.** Nem leitura nem escrita passam por ele: o painel, a vitrine, o pedido,
   a conta do cliente — tudo recusa com `STORE_MOVED`. Nada é gravado numa página por um endereço que ela
   deixou.
3. **Um ponto só de resolução:** `StoresService` é por onde todo módulo acha uma página pelo endereço
   (`ownedStoreId`, `publicStoreId`, `publicStoreNaming`, `publicBySlug`, `assertOwnership`), e as cinco
   recusas passam a sair de um método só, que olha o histórico (`movedTo` em `stores/store-slugs.ts`). A
   trava de página (`PageLocks.pageOf`) não acha página num endereço antigo e deixa passar, como faz hoje com
   um endereço que não existe; a rota então responde `STORE_MOVED`.
4. `update` e `updateColors` passam a gravar pela **id** e não pelo endereço: entre a conferência do dono e a
   gravação o endereço agora pode mudar, e um `where: { slug }` viraria um 500.

### O histórico e a corrida

5. **`store_slug_history`**: `slug` (o endereço deixado, chave primária — um endereço só pode ser deixado por
   uma página), `storeId` (cascata), `leftAt`. E `stores.slugChangedAt` (nulo: nunca trocou).
6. **Livre** é o endereço que nenhuma página tem e que não está no histórico de outra. O da própria página no
   histórico está livre para ela, e sai do histórico quando ela volta.
7. **Toda tomada de endereço — criar uma página e trocar o endereço — segura
   `pg_advisory_xact_lock(hashtextextended('store-slug:<endereço>', 0))`** até o fim da sua transação, e só
   então confere as duas tabelas numa consulta só. Duas tomadas do mesmo endereço ficam em fila; a segunda vê a
   primeira e é recusada. O índice único de `stores.slug` e a chave do histórico seguem como reserva (`P2002`
   vira `STORE_SLUG_TAKEN`). Deixar um endereço não precisa da trava: a página o tem até o commit, e o
   histórico o tem a partir dele — uma consulta só nunca vê os dois vazios.
8. **A troca também segura a linha da página** (`SELECT … FOR UPDATE`) e confere de novo, dentro, o endereço
   e os 30 dias: duas trocas da mesma página ao mesmo tempo fazem uma só, e a segunda recebe `STORE_MOVED`
   (o endereço pelo qual ela pediu já foi deixado). Ordem das travas: a linha, depois o endereço — nenhuma
   outra transação as pega ao contrário.
9. **A criação passa a recusar um endereço do histórico** com o mesmo `STORE_SLUG_TAKEN` de hoje (e o texto de
   hoje, "Este endereço já está em uso").

### As regras da troca

10. **As mesmas da criação**, pelo mesmo código: a normalização sai de `CreateStoreDto` para um decorador só
    (`storeSlugField`), usado pelos dois; `RESERVED_SLUGS` é o mesmo. O DTO da troca declara
    `STORE_SLUG_INVALID` (o da criação continua respondendo `BAD_REQUEST`, como hoje — o formulário de criação
    não muda).
11. **Trocar para o mesmo endereço é recusado** (`400 STORE_SLUG_UNCHANGED`): não queima os 30 dias à toa.
12. **30 dias pelo calendário de Brasília**: trocou no dia D, a próxima troca vale a partir da 0h de D+30
    (horário de Brasília). Dia e não instante, para a tela dizer "a partir de 16/11/2026" sem hora — 17/10 + 30
    dias = 16/11. Recusa `409 STORE_SLUG_CHANGE_TOO_SOON` com `details: { changeableOn: "YYYY-MM-DD" }`. A
    primeira troca de qualquer página vale na hora (nunca trocou).
13. **Rota da página, `PUT /stores/:slug/slug`, corpo `{ slug }`**, que responde a `Store` já com o endereço
    novo. Limite de chamadas: o das escritas da loja (`STORE_WRITE_RATE_LIMIT_*`, por endereço IP). Uma página
    travada por falta de pagamento é recusada (`PAGE_LOCKED`), que é como nasce toda rota nova de página (regra
    12 da API): troca o endereço quem está em dia. Com `BILLING_ENFORCED` desligada (produção hoje), nada trava.
14. **Disponibilidade:** `GET /stores/:slug/slug-availability?slug=…` (só o dono) responde o endereço
    normalizado e se está livre, com o motivo (`INVALID`, `RESERVED`, `TAKEN`, `UNCHANGED`), como
    `GET …/pages/availability` faz com as landings. A troca confere tudo de novo: a disponibilidade é só um
    aviso.

### O redirecionamento no web

15. **No proxy, de uma cópia da tabela de endereços deixados**, lida da API uma vez por minuto
    (`GET /store-slug-moves`, sem sessão, pela rede interna — a API não é pública), como a tabela de domínios
    (`lib/shop-hosts.ts`). É o vizinho certo: o proxy já leva a página de uma loja com domínio próprio ao
    domínio "mantendo caminho e busca, o que mantém vivo um link já compartilhado"; e só ele vê o caminho
    inteiro e a busca de toda requisição, da vitrine e do painel, para responder um `308` só. A parte que
    guarda a cópia sai de `shop-hosts.ts` para um módulo comum (`lib/kept-copy.ts`), usado pelas duas tabelas.
16. **O que é levado:** `/<antigo>` e tudo debaixo (produto, categoria, busca, conta, carrinho, landings),
    com a busca; `/admin/<antigo>` e tudo debaixo (o painel e o modo de design). **O que não é:** os handlers
    (`/api/…`, `/<antigo>/api/…`) — quem os chama é JavaScript de uma página, que espera JSON; um handler num
    endereço antigo responde o `STORE_MOVED` da API. Um endereço antigo de uma página que tem domínio ativo vai
    direto ao domínio, num salto só.
17. **No domínio próprio**, a tabela de domínios diz o endereço da página por até um minuto depois da troca;
    a cópia dos endereços deixados corrige isso quando já sabe da troca. Nada no domínio próprio depende do
    endereço além dessa reescrita interna.
18. **Até um minuto depois da troca**, enquanto a cópia não foi lida de novo, o endereço antigo responde 404
    na vitrine (e `STORE_MOVED` no painel), como um domínio recém-salvo leva até um minuto para abrir a loja.
    Aceito e dito na documentação: o painel do próprio lojista vai para o novo endereço na hora, sem depender
    da cópia. Uma resposta temporária de reserva por página (sem o caminho inteiro) foi descartada: um `308`
    para o lugar errado fica guardado no navegador.

### Cookies, sessão e cache

19. **Nada do caminho antigo é levado para o novo.** Os cookies de uma loja vivem em `path=/<slug>`
    (regra 4 do web): a sessão do cliente (`bl_shopper_*` — é o combinado: entra de novo), o carrinho
    (`bl_cart`), a resposta sobre anúncios (`bl_consent`), de onde veio (`bl_origin`), o pop-up (`bl_popup`),
    as compras já contadas (`bl_purchases`). Levar a resposta sobre anúncios para outro caminho seria presumir
    um consentimento; o lado seguro é perguntar de novo. O carrinho em andamento recomeça vazio — a tela diz
    isso ao lojista. No domínio próprio os cookies são de `path=/` e nada muda.
20. **O cache da vitrine** (`store:`, `catalog:`, `offers:` de cada endereço) é derrubado para o antigo e para
    o novo pelo handler da troca, numa resposta 200 — o antigo para não servir a loja guardada num endereço que
    ela deixou; o novo para não servir um 404 guardado de antes.

### A tela

21. **Onde:** as configurações da página são `/admin/<slug>/store` (aba Identidade). O campo do endereço, só
    leitura, ganha "Trocar endereço" ao lado (prop `slugAction` do bloco, um link montado pelo web), e o texto
    "não pode ser alterado depois da criação" muda. A troca mora em **`/admin/<slug>/store/address`**, rota
    própria (regra da casa), com: o endereço atual (`beelink.biz/<slug>`), o campo com o prefixo, a prévia
    normalizada (`beelink.biz/<novo>`), a disponibilidade (perguntada à API depois de uma pausa na digitação),
    o que acontece em frases curtas no tom do S16 e o botão, que pede confirmação num diálogo.
22. **Dentro dos 30 dias** a tela diz a partir de quando dá para trocar de novo, e o campo e o botão ficam
    fechados.
23. **Depois de trocar:** a resposta entra no cache do painel (`storeKeys.detail(<novo>)`), a lista das páginas
    é lida de novo, e o painel vai para `/admin/<novo>/store/address?trocado=1`, onde diz que deu certo, o
    endereço novo e até quando não dá para trocar de novo. Outras abas abertas no endereço antigo recebem
    `STORE_MOVED`, que vira "O endereço desta página mudou. Recarregue a página."

## Tudo que dependia do slug (conferido antes de desenhar)

**API**

| # | Onde | O que acontece numa troca | O que foi feito |
|---|---|---|---|
| 1 | `StoresService`: `publicBySlug`, `publicStoreId`, `publicStoreNaming`, `ownedStoreId`, `assertOwnership` — o caminho de quase todo módulo (catálogo, pedidos, cupons, cashback, conversas, clientes, páginas, integrações, relatórios…) | o antigo não acha mais a página | recusa num método só, `STORE_MOVED` com o atual (decisão 3) |
| 2 | `StoresService.update`/`updateColors` gravam `where: { slug }` | corrida com a troca viraria 500 | gravam pela id (decisão 4) |
| 3 | `PageLockGuard` / `PageLocks.pageOf(slug)`; assinatura e trava | trava acha a página pelo endereço; assinatura, cobrança e `externalReference` no Asaas são pela id da página | nada: num endereço antigo a trava deixa passar e a rota responde `STORE_MOVED`; a assinatura não sabe do endereço |
| 4 | `POST /stores` (criação) | podia tomar um endereço reservado | recusa o histórico, com a trava do endereço (decisões 7 e 9) |
| 5 | `PricesChangeInterceptor` e `shelf-sale.ts` (filtram promoções por `store: { slug }`) | num endereço antigo não acham nada | nada: a rota responde `STORE_MOVED` antes de qualquer preço |
| 6 | Sessões e contas de cliente (`AccountScope`, `session.service`) | presas à id da loja | nada na API; no web o cookie fica no caminho antigo (decisão 19) |
| 7 | Links de e-mail: confirmação e nova senha do cliente (`customers.service`, `shop-return.ts`), pedido pago, devolução, favoritos, cashback a vencer, situação do pedido, aviso de cobrança, contato do site | montados com o endereço **na hora do envio**, lido do banco | os novos levam o novo; os já enviados levam o antigo, que redireciona; o token da conta vale pela id da loja |
| 8 | Meta (API de conversões, `shopUrl`) | montado na hora do envio | nada |
| 9 | Webhook da Beelink no Asaas da loja | endereço `…/api/integrations/asaas/webhook`, sem slug; só o **nome** "bee-link (<slug>)" leva o endereço de quando foi cadastrado | nada: o nome antigo é só um rótulo no painel do Asaas (dito na documentação) |
| 10 | Melhor Envio: retorno do OAuth e webhook | `MELHOR_ENVIO_REDIRECT_URI` fixo; o fluxo guarda a id da loja e lê o endereço na volta | nada |
| 11 | Entrar com Google (cliente) | o fluxo guarda a id da loja; `returnTo` pode ter o caminho antigo | nada: o caminho antigo redireciona |
| 12 | Tempo real (tickets e canais) | pela id da loja | nada |
| 13 | `GET /custom-domains` (domínio → endereço) | lido ao vivo | nada na API; no web, decisão 17 |
| 14 | Comandos de suporte (`page-exemption`, relatório de cobrança, cupom) | pelo endereço atual | nada: o suporte usa o endereço atual |

**Web**

| # | Onde | O que acontece numa troca | O que foi feito |
|---|---|---|---|
| 15 | Vitrine `/<slug>/…` e painel `/admin/<slug>/…` | o antigo deixaria de abrir | `308` no proxy (decisões 15 a 18) |
| 16 | Cache da vitrine por tag (`revalidate.ts`, `storefront-data.ts`) | o antigo serviria a loja guardada | derrubado para os dois (decisão 20) |
| 17 | Cookies em `path=/<slug>` (sessão, carrinho, consentimento, origem, pop-up, compras) | ficam no caminho antigo | não são levados (decisão 19); a tela avisa |
| 18 | `og:url`, canônico, imagem de compartilhamento | montados com `store.slug` na hora | nada além do cache derrubado |
| 19 | Pixel da Meta e Google Analytics no navegador | leem o endereço da página aberta | nada: depois do redirecionamento é o novo |
| 20 | `/stores/mine`, seletor de páginas, cache do painel | chave por endereço | a troca grava o novo e relê a lista (decisão 23) |
| 21 | Domínio próprio (`shop-hosts.ts`) | até um minuto com o endereço antigo | corrigido pela cópia dos endereços deixados (decisão 17) |
| 22 | Textos "o endereço não pode ser alterado" (criação e configurações), comentários e contrato que dizem que o slug é imutável | ficariam falsos | reescritos |

## Fora do escopo

- Levar cookies do caminho antigo para o novo (decisão 19).
- Liberar um endereço antigo para outra pessoa: fica reservado para sempre, como decidido. Se um dia o suporte
  precisar, é apagar a linha de `store_slug_history` à mão; nenhum comando para isso.
- Avisar os clientes da loja por e-mail da troca; trocar o domínio próprio; disponibilidade ao vivo na tela de
  criação.
- A exclusão de página (BEELINK-330), que vai precisar olhar o histórico também.
