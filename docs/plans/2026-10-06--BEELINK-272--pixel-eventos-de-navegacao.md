# BEELINK-272 (X5) — o pixel carrega depois do aceite e envia os eventos de navegação

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X4 ([BEELINK-271](2026-10-06--BEELINK-271--consentimento-de-cookies.md)). A pilha fica `main` → X1 → X2 → X3 → X4 → **X5**, e é mesclada junta. O que o domínio compartilhado exige deste ticket está no X1 ([BEELINK-268](2026-10-06--BEELINK-268--pixel-em-dominio-compartilhado.md), itens 2, 3, 5 e 6, e a linha do X5 na tabela).

## O problema

A loja guarda o ID do pixel (X2), o lojista o informa (X3) e o visitante responde ao aviso de cookies (X4). Nada é carregado nem enviado ainda. Este ticket faz a Meta receber o caminho do cliente pela loja: o script carrega depois do aceite, e a vitrine conta as páginas, os produtos vistos, as buscas, os favoritos, o carrinho e a chegada ao checkout.

## Definição de Pronto

1. Sem aceite, nada da Meta existe na página: nenhuma requisição a `connect.facebook.net`, nenhum `window.fbq`, nenhum cookie `_fb*`. Vale para loja sem pixel, para quem não respondeu e para quem recusou.
2. O aceite dado na página carrega o pixel e começa a enviar, sem recarregar. O aceite lido do cookie faz o mesmo na carga da página.
3. Retirar o aceite vale no clique: a loja para de enviar e chama `fbq('consent', 'revoke')`. `_fbp` e `_fbc` não são apagados.
4. Todo envio é `fbq('trackSingle', <ID da loja>, …)`. Nunca `fbq('track', …)`.
5. Cada pixel é iniciado uma vez por ID e por aba, com a coleta automática desligada antes do `init` e sem "advanced matching" no `init`.
6. Duas lojas na mesma aba, por navegação de cliente: quem aceitou na loja A e vai para a loja B não envia nada ao pixel de A a partir das páginas de B, e nada ao de B sem o aceite de B.
7. Os sete eventos saem nos lugares e com os parâmetros da tabela abaixo; dinheiro em reais com decimais, moeda `BRL`.
8. `PageView` sai uma vez por página: uma na carga, uma a cada troca de rota, nunca duas na primeira.
9. Cada evento leva um `eventID` gerado no ponto de despacho; quem chama pode dar um ID próprio (o X6 dará o da compra).
10. Existe um único ponto de despacho, tipado, que não sabe nada da Meta; os componentes nunca tocam `window.fbq`.
11. Nenhum evento sai do painel, da prévia do modo design, nem das páginas cujo endereço leva um token.
12. O ID do pixel chega ao `fbq` como dado; nenhum texto de script é montado com ele.
13. `docs/product/` diz o que o pixel da loja faz; a tela do painel diz que os eventos são enviados depois do aceite, e o teste que a vigiava muda de regra, não some.
14. Mapas de superfície atualizados; `pnpm ci-check` verde.

## Decisões

### O ponto de despacho

1. **`useTrack()` devolve `track(event, options?)`**, de `components/storefront/tracking/use-track.ts`. O evento é um `StorefrontEvent` (`lib/storefront-event.ts`): uma união com o nome e os fatos da loja — produto, preço em centavos, quantidade. Nada ali é da Meta: os nomes dos parâmetros dela, a conversão para reais e o `content_type` ficam em `lib/meta-pixel-event.ts`, e `window.fbq` só existe em `lib/meta-pixel.ts`. Um teste lê o código-fonte e prende isso.
2. **O contexto é montado em `app/[slug]/layout.tsx`**, como o consentimento do X4, e pelo mesmo motivo: o painel e a prévia do modo design desenham os mesmos blocos, mas nunca passam por esse layout. Fora dele `track` é uma função que não faz nada. Não existe prévia do lojista na vitrine pública; a prévia é a do modo design.
3. **`track` decide na hora de cada chamada**: a loja tem pixel, o visitante aceitou aqui (`marketingAllowed`, a regra única do X4), e a página não é das que ficam em silêncio (decisão 14). Só então o evento vai ao destino.
4. **`eventID`**: um UUID por evento (`crypto.randomUUID()`), gerado no despacho. `track(event, { id })` aceita um ID de quem chama. **X6:** `track({ name: "Purchase", … }, { id: "purchase-<id do pedido>" })`, o mesmo valor que o X7 enviará pelo servidor — o X6 acrescenta `Purchase` à união e a `metaEventOf`, e mais nada.
5. **X8/X9:** um segundo destino (gravar o evento do nosso lado) entra na mesma função de despacho (`createTrack`, em `lib/storefront-track.ts`), ao lado do envio à Meta. Hoje há um destino só, então não há lista de destinos.

### O pixel

6. **O script é `next/script`, `afterInteractive`, com `src` fixo** (`https://connect.facebook.net/en_US/fbevents.js`), desenhado só quando `marketingAllowed` é verdadeiro. A fila `fbq` que o trecho oficial da Meta cria com um script embutido é criada por código nosso, tipado, em `lib/meta-pixel.ts` — nenhum `dangerouslySetInnerHTML`, e o ID entra como argumento de `fbq`. O `next/script` carrega um `src` uma vez só por aba.
7. **Ordem das chamadas, por pixel, uma vez por ID:** `consent grant` → `set autoConfig false <id>` → `init <id>` → `set trackSingleOnly true <id>`. Sem terceiro argumento no `init` (nada de e-mail ou telefone nosso).
8. **`fbq.disablePushState = true`** na fila, antes de o script chegar. A biblioteca, sozinha, envia um `PageView` a **todos** os pixels iniciados a cada `pushState`/`replaceState`: com duas lojas na aba, o pixel de A receberia as páginas de B. Com isso desligado, o `PageView` é nosso, endereçado.
9. **`trackSingleOnly`** faz o pixel ignorar qualquer `fbq('track', …)` sem endereço — cinto e suspensório para a regra 4.
10. **O consentimento da biblioteca é uma trava da aba inteira, não por pixel.** `revoke` trava; enquanto travada, toda chamada fica na fila e **é enviada no `grant` seguinte**. Por isso: nunca chamamos `fbq` sem aceite (não há o que soltar depois), `grant` é a primeira chamada de quem aceitou, e a trava é fechada sempre que a loja da vez não tem aceite — ao retirar, ao entrar numa loja sem aceite e ao sair do layout da loja.
11. **Retirar o aceite:** o estado do X4 muda no clique; `track` passa a recusar no mesmo instante, e o efeito chama `revoke`. `_fbp` e `_fbc` ficam (decisão 10 do X4). O script só sai da página na próxima carga.
12. **Duas lojas na aba:** o conjunto de IDs já iniciados é da aba; cada loja inicia o seu uma vez. O pixel de A continua iniciado quando o visitante está em B, mas nada é endereçado a ele, o `PageView` automático está desligado e ele ignora envio sem endereço.

### Os eventos

13. **O ID de produto enviado é o `id` do produto (UUID), com `content_type: "product"`** — não o da variação, não o slug. Motivos: (a) a vitrine, a busca, o favorito e o botão do cartão só conhecem o produto; a variação só existe em parte dos eventos, e um catálogo casa pelo mesmo ID em todos; (b) o slug muda quando o lojista renomeia, o UUID não; (c) o X10 pode publicar um item por produto com esse `id`; se publicar um item por variação, o `id` do produto vira o `item_group_id` e o `content_type` daqui passa a `product_group`, numa linha, em `meta-pixel-event.ts`.
14. **Páginas em silêncio:** as de confirmar e-mail e de redefinir senha levam um token de uso único no endereço, e o pixel envia o endereço da página junto de todo evento. Nenhum evento sai delas, nem o `PageView`. A lista vem das palavras da loja (`quietPathsOf`).
15. **Uma página é um caminho.** `PageView` segue o `pathname`: filtro, paginação e variação escolhida (`?variant=`, trocada com `replaceState`) são a mesma página.
16. **O que descreve onde o visitante está é dito no aceite; o que ele fez antes, não.** Ao aceitar numa página de produto, saem `PageView` e `ViewContent` dela (é onde ele está depois do sim — e é o caso de quem chega por um anúncio e vê o aviso). Um "adicionar ao carrinho" de antes do aceite nunca é enviado depois.
17. **`value`** é o preço em reais (`centavos / 100`), `currency: "BRL"`. No carrinho e no checkout é o subtotal dos produtos que podem ser pedidos agora, ao preço do catálogo — antes de cupom, cashback e frete, que ainda estão sendo escolhidos. O valor fechado é o da compra (X6).
18. **`InitiateCheckout` é chegar ao carrinho com pelo menos um item que pode ser pedido.** Nesta loja o carrinho é o checkout: identificação, endereço, pagamento e o botão de fechar estão na mesma página. Uma vez por visita à página; mudar quantidade não repete.
19. **`AddPaymentInfo` é a primeira vez que o visitante escolhe uma forma de pagamento naquela visita ao checkout.** Trocar de Pix para cartão não repete. A forma única de uma loja, que já vem escolhida, não é uma escolha do visitante e não dispara. Não enviamos qual forma foi escolhida.
20. **`AddToCart` sai de um lugar só, `useAddToCart`**, que os quatro botões de adicionar passam a usar (página do produto, cartão, destaque, favoritos). Mudar a quantidade no carrinho não é `AddToCart` (a Meta descreve o evento como "um produto é adicionado ao carrinho"), e "Comprar de novo" também não: é o servidor que monta o carrinho e a página chega com `InitiateCheckout`.
21. **`AddToWishlist` sai quando a API confirma o favorito** (não no clique: um favorito recusado pelo limite não foi adicionado), e nunca ao desfavoritar. Vale também para o favorito feito na volta do login.
22. **`Search` sai na página de resultados, uma vez por termo.** A caixa de sugestões do cabeçalho pergunta a cada tecla e não é uma busca feita.

| Evento | Onde dispara | Parâmetros enviados à Meta |
|---|---|---|
| `PageView` | toda página da loja: na carga, em cada troca de caminho, e no aceite (`StorefrontPageViews`) | nenhum |
| `ViewContent` | página do produto (`StorefrontProductLive`) | `content_ids: [produto]`, `content_type: "product"`, `contents: [{ id, quantity: 1 }]`, `content_name`, `content_category` (quando há), `value` (preço do produto), `currency` |
| `Search` | página de resultados com um termo (`[section]/page.tsx`) | `search_string` |
| `AddToWishlist` | favorito confirmado pela API (`StorefrontFavoriteLive`, `LikeOnReturn`) | `content_ids`, `content_type`, `contents: [{ id, quantity: 1 }]`; `content_name`, `value` e `currency` quando o botão conhece o nome e o preço |
| `AddToCart` | `useAddToCart` | `content_ids`, `content_type`, `contents: [{ id, quantity }]`, `content_name`, `value` (preço da variação × quantidade), `currency` |
| `InitiateCheckout` | chegada ao carrinho com itens (`useCheckoutTracking`) | `content_ids`, `content_type`, `contents`, `num_items`, `value` (subtotal), `currency` |
| `AddPaymentInfo` | primeira forma de pagamento escolhida (`useCheckoutTracking`) | `content_ids`, `content_type`, `contents`, `value` (subtotal), `currency` |

Todos com `{ eventID }` no quarto argumento do `fbq`.

## O que foi lido na Meta, e o que ficou inferido

- *Lido na documentação:* `trackSingle` para vários pixels na página; `fbq('set', 'autoConfig', false, <id>)` **acima** do `init` desliga o envio automático de cliques em botões e metadados da página; `consent revoke`/`grant`; `eventID` no quarto argumento, também com `trackSingle`; os eventos-padrão e os nomes dos parâmetros (`content_ids`, `content_type`, `contents` com `id` e `quantity`, `value`, `currency`, `search_string`, `num_items`, `content_name`, `content_category`). Endereços no fim.
- *Lido no código da biblioteca (`fbevents.js`, baixado em 06/10), não na documentação:* `fbq.disablePushState`; `trackSingleOnly`; a trava de consentimento segura as chamadas na fila e as solta no `grant`; `autoConfig` aceita `false` ou `"false"`; `trackSingle` não descarta `PageView` repetido. São comportamentos sem contrato escrito: o teste de navegador com a biblioteca real existe para notar se mudarem.
- *Inferido, não confirmado:* o "advanced matching" **automático** é ligado pelo lojista no Gerenciador de Eventos e chega pela configuração que a biblioteca baixa da Meta; não encontrei chamada documentada que o desligue pelo código. O mesmo vale para eventos criados pela "Ferramenta de configuração de eventos" na conta do lojista. O que esta loja envia por decisão nossa é a tabela acima; o que o lojista liga na conta dele na Meta não passa por nós. **Para o Rafael:** a política não promete o contrário (o X4 escreveu só o que é enviado), mas vale uma frase na revisão jurídica.

## O texto legal

A política do X4 lista "o que você faz naquela loja, como as páginas e os produtos que abre, o que coloca no carrinho e o pedido que faz". Este ticket envia também **o termo de uma busca**, **um produto favoritado** e **o momento em que uma forma de pagamento é escolhida** (não qual). Cabem em "o que você faz naquela loja", mas não estão entre os exemplos. **O texto legal não foi mexido**: fica dito no PR, para o dono decidir se nomeia os três.

## Fora do escopo

- `Purchase` (X6), a API de Conversões (X7), UTM e `fbclid` (X8), gravar eventos do nosso lado (X9), catálogo (X10).
- CSP: a web não tem uma; não é aqui que nasce.
- e2e de Playwright novo no CI: a suíte não cria loja com pixel (como no X3 e no X4). A prova no navegador é feita uma vez, à mão, e contada abaixo.

## Fontes

- Meta, "Reference: standard events and object properties": https://developers.facebook.com/docs/meta-pixel/reference
- Meta, "Advanced" (`trackSingle`, `autoConfig`): https://developers.facebook.com/docs/meta-pixel/advanced
- Meta, "General Data Protection Regulation" (`consent`): https://developers.facebook.com/docs/meta-pixel/implementation/gdpr
- Meta, "Handling Duplicate Pixel and Conversions API Events" (`eventID`): https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
- A biblioteca: https://connect.facebook.net/en_US/fbevents.js
- Next.js 16, guia de scripts: `node_modules/next/dist/docs/01-app/02-guides/scripts.md`
