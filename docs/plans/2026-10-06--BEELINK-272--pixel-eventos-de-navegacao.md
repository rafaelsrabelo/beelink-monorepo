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

## 06/10, depois do código — o que mudou ao escrever

- **A decisão 7 mudou: nenhum `consent grant` vai para a fila antes de a biblioteca chegar.** A biblioteca para de ler a fila num `revoke`; um `grant` enfileirado atrás dele nunca era alcançado, e todo evento seguinte ficava preso. Apareceu rodando a biblioteca de verdade (um efeito do React montado duas vezes em desenvolvimento punha `revoke` e `grant` na fila antes de o script chegar), e aconteceria em produção com quem aceita, recusa e aceita de novo depressa. Agora, enquanto a biblioteca não chegou, o consentimento é virado **editando a fila**: recusar tira os eventos que ainda não saíram e deixa um `revoke`; aceitar de novo tira o `revoke`. Depois que ela chega, `revoke` e `grant` são chamadas diretas, que ela atende mesmo travada. A ordem por pixel ficou `set autoConfig false` → `init` → `set trackSingleOnly true`.
- **Sair das páginas da loja fecha a biblioteca com um respiro** (`leaveMetaPixel`): se outra loja com aceite monta no mesmo instante, ou as mesmas páginas montam de novo, ela nem é fechada; só fecha quando ninguém disse sim em seguida.
- **O `PageView` é posto na frente pelo próprio despacho** (`createTrack`), uma vez por caminho: o primeiro evento que sai de um caminho leva o `PageView` antes dele. Na navegação sem recarga o efeito da página rodava antes do que acompanha o caminho, e o `ViewContent` saía antes do `PageView`. `StorefrontPageViews` continua existindo para a página em que nada mais acontece.
- **Um aceite dado de novo conta de novo onde o visitante está** (`PageView` e, na página de produto, `ViewContent`), como qualquer aceite — a decisão 16, aplicada também ao segundo sim.
- **A vitrine navega, quase sempre, com carga de página.** Os links dos cartões, do cabeçalho e o formulário de busca são `<a>` e `<form>` comuns; a navegação sem recarga existe (`router.push`, alguns links), e é nela que duas lojas dividem uma aba. As duas foram exercitadas.
- **`AddToCart` não confere se o carrinho aceitou a linha.** Um carrinho já com 50 linhas, ou uma linha em 99 unidades, não cresce, e o evento sai mesmo assim. Fica assim: é um canto que não vale um segundo caminho de leitura do carrinho.
- **A frase do painel** entrou em "Bom saber": "De quem aceita, a loja envia à Meta as páginas e os produtos vistos, as buscas, os favoritos, o que vai para o carrinho e a chegada ao checkout. As compras ainda não são enviadas." O teste do X3 que proibia a palavra "enviado" na tela passou a exigir que toda frase que fale de envio fale do aceite, e continua proibindo "está medindo", "já envia" e afins. **O X6 tira o "ainda não".**

## 06/10 — o que foi visto no navegador

A vitrine foi aberta de verdade (`next dev` na 3800, API na 3801, banco `harness_meta_pixel`) e percorrida pelo Playwright, **com a biblioteca real da Meta** (`fbevents.js` e a configuração dos dois IDs, baixados uma vez e servidos do disco) e **toda requisição a `facebook.com` gravada e abortada**: nenhum evento chegou à Meta. Os dois IDs (`123456789012345`, `999888777666555`) não são pixels de verdade. Lojas: `loja-do-pixel` (três produtos, uma categoria), `loja-b` (outro pixel) e `loja-sem-pixel`.

- **Antes de responder** (início → produto → "Adicionar ao carrinho"): nenhuma requisição a `connect.facebook.net` nem a `facebook.com`, `window.fbq` indefinido, nenhum cookie `_fb*`, nenhum `bl_consent`.
- **"Aceitar" na página do produto, sem recarregar:** saem `fbevents.js` e `signals/config/123456789012345`; depois `PageView` e `ViewContent`, nessa ordem, os dois com `id=123456789012345`. O "adicionar ao carrinho" de antes do aceite não saiu. `ViewContent` levou `content_ids: ["<uuid do produto>"]`, `content_type: product`, `contents: [{id, quantity: 1}]`, `content_name: Whey Baunilha`, `content_category: Proteínas`, `value: 129.9`, `currency: BRL`.
- **Depois, em ordem:** `AddToCart` (`value: 129.9`, `quantity: 1`) → busca por "creatina": `PageView`, `Search` (`search_string: creatina`) → outro produto: `PageView`, `ViewContent` → um `replaceState` na mesma página: nada → três trocas de rota sem recarga (um produto, o catálogo, o catálogo ordenado): `PageView` + `ViewContent`, `PageView`, e nada para a mesma rota com outra query → o carrinho: `PageView`, `InitiateCheckout` (`num_items: 2`, `value: 259.8`, o carrinho inteiro, inclusive a unidade posta antes do aceite). Doze eventos, doze `eventID` diferentes, nenhum `PageView` em dobro, nenhum parâmetro `ud[…]` (nada do visitante para correspondência).
- **"Cookies" no rodapé → "Recusar":** `bl_consent=denied`; ir a um produto e adicionar ao carrinho não gerou nenhuma requisição. O script continua na página até a próxima carga.
- **Carga de página com o aceite já no cookie:** `PageView`, `ViewContent`. **Página de redefinir senha, com `?token=`, com o aceite no cookie:** nenhum evento.
- **Duas lojas na mesma aba, sem recarregar** (conferido: o mesmo documento do começo ao fim): A com aceite → `PageView` para A. Ida para B (`router.push`), que tem outro pixel e não foi respondida: a faixa de B aparece; página inicial, produto e "adicionar ao carrinho" em B: **nenhum evento, nem para A nem para B**. "Aceitar" em B: sai `signals/config/999888777666555`, e `PageView`, `ViewContent`, `AddToCart` com `id=999888777666555`. Ida para a loja sem pixel: nada, nenhuma faixa. Volta para A: um `PageView` para A, sem iniciar o pixel de A de novo (`fbevents.js` foi buscado uma vez só na aba; a biblioteca segura dois pixels). Ida para `/privacidade`: nada.
- **Cliente com conta:** o link de confirmação do e-mail leva (redirecionado pelo servidor) à página de entrar, cujo `PageView` não tem token no endereço. Curtir um produto: `AddToWishlist` (`content_name`, `value: 89.5`) depois que a API guardou; descurtir: nada. No checkout, escolher "Dinheiro": `AddPaymentInfo` (`value: 89.5`, sem a forma escolhida); trocar para "Pix": nada.
- **Console sem erros** nos quatro percursos. Rodou em desenvolvimento, com os efeitos do React montando duas vezes.

Não visto: um pixel de verdade (o que o Gerenciador de Eventos mostra, e o que a configuração de um pixel real liga sozinha — a dos IDs de teste vem vazia); `_fbp` e `_fbc`, que a biblioteca **não gravou** nesta prova (a configuração vazia não liga os cookies próprios; com um pixel real devem aparecer depois do aceite, e não há nada no código que os apague); o build de produção no navegador; o `Search` da caixa de sugestões (não dispara, por decisão); o favorito feito na volta do login (só em teste de componente).
