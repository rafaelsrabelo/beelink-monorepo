# Vitrine: ofertas à vista, "+" nos relacionados e a busca do topo

> Sem ticket: pedido direto do dono do produto em 07/10/2026, depois de ver a loja em produção (`beelink.biz/mutante-suplementos`). Entra no PR #233, que já levava o botão do checkout. Toca `packages/contracts`, `apps/api`, `apps/web` e `packages/ui`, por isso mora aqui.

## O pedido

Nas palavras dele:

- **A)** "Cliente não logado (abre um banner na página para cliente criar conta); cliente logado na tela mas nunca fez um pedido, abre um banner do cupom do primeiro pedido; cliente chegou no carrinho (fica o cupom lá para o cliente pegar, caso cliente tenha cupom disponível)."
- **B)** "Na página do produto lá embaixo aparece um componente: Você também pode gostar — no produto era bom ter uma opção de adicionar ao carrinho dali, um +, algo assim."
- **C)** "O header hoje tá com um problema: o buscar no header tá muito grande, e o filtro se adapta ao tamanho dos filtros — se tiver um filtro com nome muito grande, fica gigante. E outra coisa, só tá sendo possível buscar se clicar, não é pra ser assim… melhore esse buscar no header, deixe menor."

## O que foi visto na loja em produção (Chromium sem tela, 1280 e 390 px, 07/10/2026)

**B — relacionados.** Em `/produtos/magnesio-360` o trilho "Você também pode gostar" desenha cada produto como um link só (foto de 180 px, nome, preço). Nenhum botão dentro do trilho: o cartão `compact` foi desenhado sem ação ("é uma sugestão; comprar é na página do produto"), e por isso `StorefrontRelated` nunca recebeu o `cardAction` que as prateleiras e a listagem recebem.

**C — tamanho.** A 1280 px a barra de busca tem 646 px (metade do topo) e o select "Buscar em" tem 248 px: ele toma a largura da opção mais longa ("Termogênicos e Controles de peso"), até o teto de 40% da barra. A 390 px o select fica com 143 px e o campo com 159 px.

**C — "só busca se clicar".** O que foi medido, passo a passo:

1. Digitar "creatina" e apertar Enter **envia** o formulário: o endereço vira `/busca?categoria=&q=creatina`, a 1280 e a 390 px, com ou sem a lista de sugestões aberta. A hipótese "Enter não envia" **não se reproduziu**.
2. O defeito está no que acontece depois. Na página de resultados o campo do topo volta com o termo, a busca de sugestões roda de novo e **a lista de sugestões abre sozinha por cima dos resultados** (`aria-expanded="true"` sem ninguém ter digitado). No celular ela cobre o título "Busca — 2 resultados" e a ordenação inteiros.
3. Essa lista **não fecha** ao clicar fora nem ao sair do campo com Tab: o bloco só a fecha com Escape. Para quem apertou Enter, a tela continua com a mesma caixinha de sugestões de antes, como se nada tivesse acontecido; o que "funciona" é clicar numa sugestão (que leva ao produto, não à busca).
4. Com o ponteiro parado sobre uma sugestão, Enter **abre aquele produto** em vez de buscar: `onMouseEnter` marca a opção como a ativa do teclado, e Enter com opção ativa navega para ela.
5. Trocar a categoria no select não busca nada sozinho (é o esperado de um formulário, mas soma à impressão).

Causa, no código (`packages/ui/src/blocks/storefront/storefront-search-combobox.tsx`): `open = !dismissed && (suggestions.length > 0 || pending)` não depende de foco nem de alguém ter digitado; não há fechamento no `blur`; e o realce do mouse e a opção ativa do teclado são o mesmo estado (`active`).

## Definição de Pronto

### A — ofertas à vista

1. O cupom tem a chave "Mostrar este cupom na loja" (`shownInStore`): coluna com `false` por omissão, migração, contrato `Coupon`/`CouponPayload`, formulário do painel com uma linha de ajuda. Cupons existentes ficam ocultos. Salvar sem a chave a desliga.
2. `GET /stores/:slug/offers` (público) responde o destaque de primeira compra da loja: tipo e valor do benefício, mínimo, se é automático; nunca um código. Cacheado no web sob a tag da loja; cai quando o painel salva ou pausa promoção ou cupom.
3. `POST /stores/:slug/customer/offers` (sessão do cliente) responde: se o cliente tem pedido que vale, o benefício de primeira compra a mostrar (com código quando é cupom) e os cupons mostrados que valem para o carrinho enviado. Só lê cupons com `shownInStore`; nunca os de outra loja; recusa quem não está identificado; limitado como os vizinhos.
4. "Nunca fez pedido" é a regra que já existe (`firstPurchaseOf`): nenhum pedido que não esteja cancelado. Não há segunda regra.
5. A lista do carrinho nunca traz cupom que a cotação recusaria: é decidida com o mesmo `couponRefusalOf`, sobre o mesmo carrinho precificado. Abaixo do mínimo entra como "faltam R$ X".
6. Visitante sem conta vê a faixa de criar conta em início, listagem/categoria/busca e produto; com benefício de primeira compra a frase o diz, com os números da API; sem, o convite simples. Nunca um código.
7. Cliente identificado sem pedido que vale vê a faixa do primeiro pedido: cupom (benefício, código, "Usar no carrinho" → carrinho com `?cupom=`, copiar código) ou promoção ("aplicado automaticamente"). Sem benefício, nenhuma faixa. Cliente com pedido, nenhuma faixa.
8. Nenhuma faixa em carrinho, conta, páginas de token, painel e prévia do modo design. Uma faixa por vez. Com a faixa de cookies, a de cookies continua em cima.
9. Fechar esconde a faixa até a próxima carga completa da página; nada é gravado no navegador.
10. No carrinho, cliente identificado vê "Cupons disponíveis" com "Aplicar" (o mesmo caminho de digitar); o cupom em vigor aparece marcado e sem botão; sem cupom mostrado, a seção não é desenhada; visitante não vê códigos.
11. Textos em `locales` (pt-BR e en), blocos em `packages/ui/src/blocks/storefront/` com story e teste (axe), um componente por arquivo abaixo de 250 linhas.

### B — "+" no trilho de relacionados

12. Cada cartão do trilho tem o controle de adicionar ao carrinho das prateleiras, na versão compacta: produto simples entra direto pelo `useAddToCart` (um só caminho: pixel e funil disparam como nas prateleiras) e confirma por 2 s; produto com opções mostra "Ver opções" desenhado e o toque cai no link do cartão; respeita o "adicionar rápido" da loja (`showQuickAdd`).
13. O "+" tem 44 px de alvo, fica sobre a foto e não muda a altura do cartão; o cartão deixa de ter botão dentro de link.

### C — a busca do topo

14. A busca tem largura máxima no desktop (30rem, centrada no espaço entre o CEP e a conta); no celular continua na linha própria.
15. O select "Buscar em" tem largura limitada (7.5rem no celular, 10rem do `shop-md` em diante), com reticências; o nome inteiro está na lista e no `title`. Um nome de 60 caracteres não estica nem quebra o topo.
16. Digitar e apertar Enter leva à página de resultados com a categoria escolhida; a lista de sugestões só abre depois de alguém digitar, fecha ao enviar, ao sair do campo e com Escape; o ponteiro sobre uma sugestão não sequestra o Enter; setas + Enter continuam abrindo a sugestão; o botão continua funcionando. Papéis de combobox mantidos, axe verde.

### Entrega

17. Docs do produto e mapas de superfície atualizados; `pnpm ci-check` verde; e2e completo da API verde em banco próprio; usado no navegador a 1280 e 390 px.

## Decisões tomadas pelo assistente, para o dono confirmar

1. **Um cupom só aparece na loja se o lojista ligar "Mostrar este cupom na loja".** Código é privado por omissão (há cupom de um cliente só, de influenciador). Desligado em todo cupom que já existe. Como os demais campos opcionais do formulário, a chave ausente num salvamento vale desligada.
2. **Visitante: faixa de criar conta**, fina, nas cores da loja, no fluxo da página, logo abaixo do topo. O link vai para o cadastro da loja e volta para a página em que a pessoa estava (`?voltar=`). Com benefício de primeira compra a frase diz o benefício; sem, diz o que a conta dá de fato aqui: acompanhar pedidos, salvar favoritos e endereços.
3. **Qual benefício a faixa do visitante anuncia quando há promoção e cupom de primeira compra:** a promoção, porque é automática: a frase "ganhe X no primeiro pedido" é verdadeira para qualquer um que crie a conta, sem depender de digitar código. Entre várias promoções, a mais nova que vale para o carrinho todo; se nenhuma vale para o carrinho todo, a mais nova, dita como "em produtos selecionados".
4. **Qual a faixa do cliente identificado mostra quando há os dois:** o cupom. A promoção se aplica sozinha e o carrinho já a mostra; o cupom depende de alguém pegar o código, e os dois somam (o cupom vem depois da promoção). Não digo qual "desconta mais": percentual contra valor fixo depende do carrinho, e a frase seria falsa para alguém. Entre vários cupons de primeira compra mostrados, o mais novo.
5. **Sem benefício, o cliente identificado não vê faixa nenhuma.** Não há faixa genérica.
6. **Onde aparecem:** início, listagem/categoria/busca e produto. Fora: carrinho, conta, entrar/criar conta, confirmar e-mail, redefinir senha, landings (`/lp/…`), painel e prévia do modo design.
7. **Fechar não é lembrado.** A faixa some até a próxima carga completa (estado em memória). Lembrar pediria um cookie novo, e a política de privacidade publicada enumera cada cookie: seria uma versão nova de um texto legal. `localStorage` é proibido pelo gate `web/no-web-storage`.
8. **Leitura no servidor para as faixas.** A página já lê quem está olhando (`shopperAt`); a oferta do cliente é lida junto, com a sessão dele, e a faixa já vem no HTML: sem skeleton que some para a maioria. E só é perguntada quando o destaque público diz que a loja tem algum benefício de primeira compra: loja sem benefício não custa chamada nenhuma.
9. **Carrinho: a lista é da API.** `OrderQuotes.offersFor` precifica o carrinho pelo mesmo `priceOrder` da cotação e passa cada cupom mostrado e em vigor pelo mesmo `couponRefusalOf`. Entra quem não é recusado e quem só está abaixo do mínimo (com o quanto falta, sem botão). O frete só é cotado quando há cupom de frete grátis entre os candidatos. No máximo 10 cupons, os mais novos.
10. **Visitante no carrinho:** nada novo. O carrinho já diz "Tem um cupom de desconto? Você aplica depois de entrar na sua conta"; dizer "há cupons esperando" pediria uma leitura pública a mais sobre cupons, e ficou fora.
11. **Trocar a categoria no select não envia a busca sozinho.** Mudar de página ao mexer num select surpreende quem usa teclado (WCAG 3.2.2); a categoria vai junto no Enter ou no botão.
12. **Produto com opções no trilho: "Ver opções" desenhado**, como nas prateleiras, e não um "+" que na verdade navega.
13. **A busca fica centrada** no espaço que sobra do topo, com 30rem. O comentário do bloco registra que o dono já tinha pedido isso antes e o desenho 5a tinha voltado atrás; agora o pedido é dele de novo.

## Fora do escopo

- Lembrar que a faixa foi fechada (ver decisão 7).
- Anunciar cupons ao visitante no carrinho (decisão 10).
- A página de resultados e a API de busca: o defeito não estava lá.
- Textos legais: nenhum cookie novo, nada a mudar neles.
- A "Buscando…" escrita dentro da lista de sugestões continua como está.

## Acréscimo (07/10/2026, tarde): como ficou

**Contrato e rotas.** `Coupon.shownInStore` / `CouponPayload.shownInStore` (migração `20261007155224_coupon_shown_in_store`, coluna `false` por omissão). `GET /stores/:slug/offers` → `StorefrontOffers`; `POST /stores/:slug/customer/offers` → `CustomerOffers`, com o BFF em `/<slug>/api/offers`. As formas estão em `packages/contracts/src/offers.ts`.

**O que mudou em relação ao plano.**

- O destaque público tem uma tag própria, `offers:<slug>`, além da tag da loja: salvar um cupom derruba só ele (`revalidateOffers`), e não o catálogo inteiro. Um pedido do cliente que levou cupom também derruba (pode ter sido o último uso).
- A lista do carrinho vem servida com a página (`servedOffersAt`) e é perguntada de novo quando o carrinho muda: não há skeleton.
- A lista de sugestões também fecha quando o campo é esvaziado: no Chrome, Escape limpa um campo de busca, e as sugestões do termo apagado reabriam por um instante (visto no navegador).
- A lista de sugestões virou bloco próprio (`storefront-search-suggestions`), para o combobox ficar abaixo de 250 linhas.

**Cobertura da Definição de Pronto** (arquivo → o que prova):

1. `apps/api/test/shop-offers.e2e-spec.ts` › "the switch…"; `packages/ui/.../promotions/coupons.test.tsx` › "asks whether the shop may show the coupon…"; `apps/web/.../coupon-editor-screen.test.tsx` › "Mostrar este cupom na loja".
2. `shop-offers.e2e-spec.ts` › "the headline anyone reads" (7 casos); `apps/web/src/lib/storefront-data.test.ts` › "offersAt"; `promotions/route.test.ts` (os handlers de cupom derrubam `offers:<slug>`).
3. `shop-offers.e2e-spec.ts` › "a shopper's own offers" e "the coupons a cart may take"; `apps/web/src/app/[slug]/api/offers/route.test.ts`.
4. `shop-offers.e2e-spec.ts` › "show no first-order benefit once an order stands, and show it again once none does", "count an order the shop registered for them".
5. `shop-offers.e2e-spec.ts` › "agree with the quote about every shown coupon, on a pick-up and on a delivery"; `coupon-verdict.spec.ts` › "couponStandingRefusalOf".
6–8. `apps/web/src/lib/offer-strip.test.ts`; `apps/web/.../storefront-offers.test.tsx`; `packages/ui/.../storefront-offer-strip.test.tsx`; `storefront-window.test.tsx` › "the notice under the header".
9. `storefront-offers.test.tsx` › "closing it".
10. `apps/web/.../storefront-cart-live.test.tsx` › "the cart's available coupons"; `packages/ui/.../storefront-cart-coupons.test.tsx`.
11. `packages/ui/src/locales/locales.test.ts`; stories de cada bloco novo.
12–13. `packages/ui/.../storefront-card-cart-button.test.tsx` › "as a compact card's round +"; `storefront-related-rail.test.tsx` › "with the shop's action on each card"; `apps/web/.../storefront-related.test.tsx` › "adding to the cart from the rail".
14–16. `packages/ui/.../storefront-masthead.test.tsx`; `storefront-search-combobox.test.tsx`; `storefront-search.test.tsx`; `storefront-search-suggestions.test.tsx`.
17. `pnpm ci-check` verde; e2e completo da API verde em `harness_offers_test` (79 arquivos, 1018 testes).

**No navegador** (Chromium sem tela, 1280 e 390 px, web :4100 e API :4101, banco `harness_offers`): visitante com benefício ("Crie sua conta e ganhe 10% de desconto no primeiro pedido. Em compras a partir de R$ 30,00."), sem benefício (convite simples) e em loja com promoção (15%); nenhum código no HTML do visitante; nenhuma faixa em carrinho, entrar e conta; cliente sem pedido vê o cupom PRIMEIRA10 e "Usar no carrinho" cai em `/carrinho?cupom=PRIMEIRA10` com o cupom aplicado; cliente com pedido não vê faixa nem o cupom de primeira compra; cupons ocultos não aparecem em HTML nenhum; "Aplicar" em DEZ aplica e marca; abaixo do mínimo diz "Faltam R$ 450,10"; o "+" do trilho tem 44 × 44 px, fica dentro da foto, não muda a altura do cartão e soma no carrinho; com categoria de 60 caracteres a busca tem 480 px e o select 160 px a 1280, sem rolagem lateral; digitar + Enter leva a `/busca?categoria=…&q=creatina` e a lista não reabre; Enter com o ponteiro numa sugestão busca; clicar fora fecha. Com a faixa de cookies (loja com pixel), a ordem no celular é cookies, topo, faixa de oferta. A barra de compra fixa do celular fica embaixo e a faixa, no fluxo, em cima.

**Não visto no navegador:** produto com opções no trilho ("Ver opções") — a carga de teste não tinha um; está coberto por teste.
