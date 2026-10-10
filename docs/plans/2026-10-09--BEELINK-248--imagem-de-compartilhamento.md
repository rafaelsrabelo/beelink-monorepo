# BEELINK-248 — V2: o link compartilhado da loja mostra a imagem e o nome dela

09/10/2026. O Rafael compartilhou `https://mutantesuplementos.com.br/` no WhatsApp e a prévia saiu só
com o endereço. Pediu: "poderia sair imagem e destaque nome". É o V2 do Épico V (BEELINK-246, SEO e
compartilhamento), adiantado: o V1 (BEELINK-247, o endereço do site e `metadataBase`) ainda não
existe, e este ticket não o cria.

Toca `apps/web` e, pelo acréscimo do orquestrador descrito no fim, uma função de `packages/ui`.

## O que foi lido antes de escrever

### Em produção, 09/10/2026, com `User-Agent: WhatsApp/2.23.20.0 A`

- **Página inicial** (`/`): `<title>`, `description`, `og:title`, `og:description`, `og:type` e
  `og:image`, mais o cartão do Twitter (`summary_large_image`, título, descrição, imagem), todos
  dentro do `<head>`. **Faltam `og:url` e `og:site_name`**; o canonical é relativo (`/`). A
  `og:image` é a logo crua, PNG de 905×220 com transparência (22 KB): 4,11:1.
- **Categoria** (`/termogenicos`): só `<title>`, `description` e canonical. **Nenhuma tag `og:`.**
- **Produto** (`/produtos/fogo-roxo`): as mesmas tags da página inicial, com a foto do produto
  (PNG de 433×577, 219 KB). Também sem `og:url` e `og:site_name`.
- O cartão do Twitter sai sem que nenhuma página o declare: o Next o preenche a partir do Open Graph
  (`postProcessMetadata` em `node_modules/next/dist/lib/metadata/resolve-metadata.js`, Next 16.3.4).

### O que o WhatsApp documenta

"Link Previews", documentação da WhatsApp Business Platform
(`https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/`), lida
em 09/10/2026:

- "The `<og:title>`, `<og:description>` and `<og:url>` mark-ups must be inside the `<head>` tag.
  They should not be empty."
- "The `<og:image>` mark-up is an absolute URL for an image used as the thumbnail for the link
  preview."
- "This image should be under 600KB in size."
- "Image should be 300px or more in width with 4:1 width/height or less aspect ratio."
- "The `<head>` containing the HTML mark-ups must appear within the first 300KB of the HTML."
- O pedido chega com `User-Agent: WhatsApp/2.x.x.x A|I|N`.
- "WhatsApp will make the best attempt to show link previews, for example: relaxing requirements
  […]. However, this should not be relied on."

Ou seja, a regra de 4:1 lembrada pelo orquestrador está na documentação, e a página da Mutante
falhava em duas exigências dela: a logo de 4,11:1 e a falta de `og:url`. O `<head>` de produção tem
3,4 KB, longe do limite de 300 KB.

### O que o Cloudinary faz pelo endereço

Documentação (`https://cloudinary.com/documentation/resizing_and_cropping` e
`…/transformation_reference`), lida em 09/10/2026: `c_fit` amplia ou reduz até caber na caixa;
`c_pad` encaixa e preenche o resto; **`c_lpad` é "Same as `pad`, but only scales down the image"**;
`c_fill` preenche a medida exata, cortando o que sobra, "By default, the center of the image is
kept"; `f_<formato>` entrega no formato pedido "regardless of the file extension".

Medido na conta de desenvolvimento, com a logo da loja de teste (600×200):

| Endereço | Resultado |
|---|---|
| `c_fit,w_880,h_420/c_pad,w_1200,h_630,b_rgb:…` | 1200×630, mas a logo volta a 1200×400 e encosta nas duas bordas: o `c_pad` amplia |
| `c_fit,w_880,h_420/c_lpad,w_1200,h_630,b_rgb:…` | 1200×630, a logo fica em 880×293, com 160 px de cada lado e 168 px em cima e embaixo |

## Definição de Pronto

1. Uma função pura em `apps/web/src/lib/` devolve a imagem de compartilhamento da loja: a logo
   inteira, centralizada com margem sobre a cor do topo da loja, em 1200×630, montada pelo endereço
   do Cloudinary. Sem logo e com banner, o banner recortado para 1200×630. Sem os dois, nenhuma.
   Endereço que não é do Cloudinary sai como veio. Sem rota nova e sem gerar imagem no servidor.
2. A página inicial da loja e toda página sob `app/[slug]` que não tinha imagem, ou usava a logo
   crua, declara essa imagem, com `og:image:width`, `og:image:height` e `og:image:alt`.
3. O produto continua com a foto dele e a landing com a imagem dela; sem foto ou sem imagem, caem na
   imagem montada da loja, não mais na logo crua.
4. `og:site_name` é o nome da loja em toda página dela; `og:title` da página inicial é o nome da loja.
5. `og:url` absoluto em toda página da vitrine: o host do pedido (`siteOrigin()`) e o endereço que
   `storefrontRoutes()` dá. No domínio próprio, sem o slug; no host da plataforma, com ele.
6. O cartão do Twitter acompanha.
7. A imagem muda quando a logo ou a cor muda, porque as duas estão no endereço.
8. `theme-color` das páginas da loja é a cor da loja.
9. A descrição do produto nos metadados e no JSON-LD não sai mais colada (acréscimo do orquestrador).
10. Nada de `metadataBase`, de variável de ambiente nova, de rota nova ou de mudança na API.
11. Testes de unidade: a função da imagem (logo, banner, nenhum, endereço de fora, cor) e os
    metadados de cada página tocada.
12. Visto com `next dev`: o HTML da página inicial, de uma categoria e de um produto, no host da
    plataforma e no domínio próprio; a imagem montada da loja de teste baixada e medida.
13. Documentos: o mapa de `apps/web/docs/README.md` e a frase da marca em `docs/product/README.md`.
14. `pnpm ci-check` verde.

## Decisões do orquestrador

Tomadas por ele em 09/10/2026, por delegação do Rafael, que pode mudá-las.

1. **A imagem de compartilhamento da loja é a logo, inteira, centralizada com margem sobre a cor da
   loja, em 1200×630, montada pelo endereço do Cloudinary**: uma função pura no web. A cor é a que
   a vitrine põe atrás da logo no cabeçalho. Sem logo e com banner, o banner recortado. Sem os dois,
   nenhuma imagem. Endereço que não é do Cloudinary sai como veio.
2. **Vale para a página inicial e para toda página da vitrine que não tem imagem própria ou usa a
   logo crua.** O produto continua com a foto dele e a landing com a imagem dela.
3. **`og:title` é o nome da loja na página inicial e `og:site_name` é o nome da loja em todas.** A
   descrição continua como está.
4. **`og:url` absoluto**, com o host do pedido e o endereço de `storefrontRoutes()`; medidas e texto
   alternativo quando a imagem é a montada; o Twitter acompanha. Sem `metadataBase` e sem variável.
5. **A imagem muda sozinha quando a logo ou a cor muda.**
6. **`theme-color` é a cor da loja**, se for simples pelo `generateViewport` do layout da vitrine.
7. (Acréscimo, mesma data.) **A imagem do produto não muda**, a não ser que a documentação do
   WhatsApp recuse o formato dela.

## Decisões minhas, ao detalhar

1. **A cor é `store.colors.header`.** O cabeçalho (`StorefrontMasthead`, em `packages/ui`) é pintado
   com `var(--shop-header)`, e `shopPaletteVariables` escreve nessa variável `colors.header`: o
   campo "Cor do topo" do painel. É também a cor do `theme-color`, porque é a faixa que fica colada
   na barra do navegador. O lojista já escolheu uma logo que se lê sobre ela.
2. **A logo cabe numa caixa de 560×400, não de 880×420.** O WhatsApp desenha a prévia de dois
   jeitos: a imagem larga em cima do texto, ou uma miniatura quadrada ao lado dele (é assim na caixa
   de quem está escrevendo a mensagem). A miniatura corta o centro: de 1200×630 sobra o quadrado de
   630 do meio. Com 880 de largura, uma logo comprida como a da Mutante perderia as duas pontas; com
   560 ela fica inteira nos dois desenhos, com 35 px de folga de cada lado no quadrado. A imagem da
   landing da Beelink já seguia essa regra ("centred so a square crop keeps it", em `app/page.tsx`).
   O preço é a logo ocupar menos da metade da largura na prévia larga, em vez de três quartos. São
   duas constantes; trocar é uma linha. Que o WhatsApp corta a miniatura pelo centro é o que se vê
   no aplicativo, não algo que a documentação dele diga.
3. **Dois passos, e o segundo é `c_lpad`:** `c_fit,w_560,h_400` e depois
   `c_lpad,w_1200,h_630,b_rgb:<cor>`. `c_fit` amplia uma logo pequena até a caixa (uma logo de 200 px
   num quadro de 1200 seria um ponto); `c_lpad` preenche sem ampliar de volta, que é o que o `c_pad`
   fazia na medição acima.
4. **A imagem montada sai em JPEG (`f_jpg`).** O envio de imagens aceita PNG, JPEG e WebP de até
   2 MB (`uploads.constants.ts`), e o endereço guardado entrega o formato da extensão. Sem pedir um
   formato, a logo em WebP sairia em WebP, que a documentação do WhatsApp não cita, e um banner em
   PNG recortado para 1200×630 pode passar dos 600 KB. JPEG é aceito por todo leitor de prévia e
   tem peso previsível. A transparência da logo é preenchida pela cor do topo no passo do `c_lpad`:
   conferido com a logo da Mutante, que tem transparência (o canto e o vão entre as letras saem na
   cor do topo, sem caixa branca). A página diz o tipo (`og:image:type`), porque a extensão do
   endereço continua a do arquivo.
5. **O banner, quando é ele, é `c_fill,w_1200,h_630`**, pelo centro, que é o padrão do Cloudinary.
   Sem `g_auto`: o recorte "inteligente" depende do plano da conta e não é reproduzível num teste.
6. **Onde a transformação entra no endereço:** logo antes da versão (`/v123/`), que é onde ela fica
   num endereço que o envio devolve. Um endereço que já trouxer transformações próprias as aplica
   antes; sem versão, a nossa entra logo depois de `/upload/`. Só `res.cloudinary.com` com
   `/image/upload/` é reconhecido.
7. **A cor só entra no endereço se for `#RRGGBB`.** É o que a API valida ao salvar (`HEX_COLOR`), mas
   a coluna aceita 9 caracteres e uma linha importada pode ter outra forma. Uma cor mal escrita no
   endereço faz o Cloudinary responder erro e a prévia perder a imagem sem ninguém ver; fora da
   forma, o endereço sai sem a cor e o Cloudinary usa o fundo padrão dele.
8. **O texto alternativo é o nome da loja**, como no `alt` da logo no cabeçalho. É dado, não frase.
9. **Um construtor só para o Open Graph da loja** (`shopShareOf`), chamado por toda página dela. O
   Next junta os metadados por chave: o `openGraph` de uma página substitui inteiro o de um layout.
   Por isso `og:site_name` não pode morar no layout e precisa estar em cada página; um teste lê a
   árvore e recusa um `openGraph` escrito à mão sob `app/[slug]`.
10. **`og:title` das páginas de seção é o `<title>` delas** ("Termogênicos · Mutante Suplementos").
    Essas páginas não tinham `og:title`, então era o `<title>` que uma prévia mostrava: nada do que
    já aparecia muda, e o nome da loja fica no título, que é o que o WhatsApp desenha (ele não
    desenha `og:site_name`). O produto mantém o `og:title` que tinha, só o nome dele.
11. **`og:url` é o endereço que o canonical já nomeia**, com o host na frente: sem página e sem
    termo de busca. Uma exceção, no produto: quando o endereço escolhe uma variação que existe, o
    `og:url` a mantém (`?variant=`). Os leitores da Meta (Facebook, Messenger, Instagram) vão buscar
    a prévia no `og:url`; sem a variação, o link de "Uva · 300 g" voltaria a mostrar a primeira
    foto, e hoje ele mostra a do pote certo.
12. **As páginas da conta do cliente e do pedido passam pelo mesmo construtor.** Nenhum leitor de
    prévia chega a elas (um visitante é levado para "Entrar"), mas assim "toda página da loja" é
    verdade sem exceção para lembrar.
13. **O Twitter fica por conta do Next**, que já o preenche a partir do Open Graph, como em produção
    hoje. Nenhuma página da loja declara `twitter`.
14. **`theme-color` pelo `generateViewport` do layout `app/[slug]/layout.tsx`**: cinco linhas, sobre
    a mesma leitura guardada da loja (`shopAt`).

## A imagem do produto e da landing: conferido, e não mudou

A foto de `/produtos/fogo-roxo` (433×577, 219 KB) está dentro do que o WhatsApp documenta: mais de
300 px de largura, proporção abaixo de 4:1, menos de 600 KB. Das fotos de capa dos dez produtos que
aparecem nas duas páginas lidas em produção, a mais pesada tem 260 KB. **Nenhuma foi mudada.**

O que a documentação recusaria e o envio aceita: uma foto com mais de 600 KB (o limite do envio é
2 MB) e uma imagem de landing mais larga que 4:1. Na mesma loja há imagens de até 1,97 MB (banners e
artes de seção, não capas de produto). Fica em Riscos, com o conserto possível.

## Fora deste ticket

Texto dentro da imagem (nome, descrição); a tela do painel com a prévia (V3); sitemap e robots (V4);
`metadataBase` e o endereço do site (V1); qualquer mudança na API; dar tratamento à foto do produto
e à imagem da landing.

## Riscos

- **O WhatsApp de verdade não alcança `localhost`.** A prévia real só pode ser vista depois do
  deploy. O WhatsApp guarda a prévia por endereço: um link já compartilhado pode continuar com a
  prévia antiga por um tempo.
- **Loja sem descrição não declara `og:description`**, que a documentação do WhatsApp lista entre as
  três tags que "não devem estar vazias". A decisão 3 do orquestrador mantém a descrição como está.
- **Foto de produto ou imagem de landing acima de 600 KB, ou imagem de landing mais larga que 4:1.**
  O conserto, se for pedido, é o mesmo caminho: `c_limit` e `f_jpg` no endereço, sem cor de fundo.
- **Logo opaca.** Uma logo sem transparência sai como um retângulo com o fundo dela sobre a cor do
  topo, como já sai no cabeçalho da loja.
- **Logo pequena ampliada** até a caixa de 560×400 perde nitidez. A prévia é desenhada pequena.
- **Transformações contam na cota do Cloudinary.** Cada par logo e cor gera uma imagem derivada, uma
  vez; depois ela é servida do cache deles.
- **`siteOrigin()` devolve `https` para todo host que não é local**, inclusive `lvh.me` em
  desenvolvimento. O `og:url` do domínio próprio em `next dev` sai com `https://lvh.me:3800`. Em
  produção é o certo. Some com o V1.

## Acréscimo do orquestrador, 09/10/2026: a descrição do produto sai colada

Visto por ele em produção: `description` e `og:description` de `/produtos/fogo-roxo` começam com
"Fogo RoxoMais energia, disposição…". O pedido: achar onde a descrição vira texto para os metadados
e fazer a fronteira entre blocos virar um espaço, sem espaço duplo e sem espaço antes de pontuação.

**A causa não é a que o pedido supunha.** `plainTextOf` (`packages/ui/src/lib/markdown.ts`), que
alimenta `description`, `og:description` e o JSON-LD, já separa blocos e linhas com um espaço. O que
está colado é o texto guardado: a descrição desse produto está no banco como
`**Fogo Roxo**Mais energia, disposição…`, sem quebra entre o título em negrito e o parágrafo. A
quebra se perdeu ao salvar: `markdownFromDom` (`packages/ui/src/blocks/catalog/rich-text.ts`) só
trata `P` e `DIV` como bloco, e um título colado (`<h2>`, por exemplo) entrega as palavras dele sem
fronteira nenhuma. Por isso **a descrição aparece colada também na página do produto**, à vista do
cliente: o HTML de produção traz `<strong>Fogo Roxo</strong>Mais energia…`.

O que este ticket faz, e o que não faz:

- **Faz:** `plainTextOf` passa a ler a borda de uma marca (negrito, itálico, link) como fronteira de
  palavra. Entra um espaço quando o que vem antes termina em letra, número ou `. , : ; ! ?` e o que
  vem depois começa em letra ou número. Nada entra antes de pontuação, depois de um parêntese ou de
  um hífen, nem onde já há espaço. É a única pista que sobrou no texto guardado. O preço: uma
  palavra com metade em negrito (`**Bo**la`) vira "Bo la" na descrição de busca.
- **Não faz:** consertar o editor para ele não perder a quebra, consertar os textos já guardados e
  mudar o que a página do produto desenha. São outra superfície (o painel), fora do que foi pedido,
  e o editor precisa ser visto num navegador, colando texto de fora. Fica relatado ao orquestrador.

`plainTextOf` tem dois chamadores, os dois em metadados (`[item]/page.tsx` e `product-json-ld.ts`):
nada desenhado na tela passa por ela.

## 10/10/2026 — o que mudou ao escrever, o que foi medido e o que foi visto

### Acréscimos às decisões

- **A página diz também `og:image:type` (`image/jpeg`)** da imagem montada, pela decisão 4: o
  endereço continua terminando em `.png` ou `.webp`.
- **A versão que conta é a primeira do endereço.** Uma pasta pode se chamar `v2`; a transformação
  entra antes de `/v<número>/` na primeira vez que ele aparece.
- **As regras de compartilhamento do produto foram para `apps/web/src/lib/product-share.ts`**
  (descrição cortada, variação escolhida, foto, endereço do cartão). Estavam dentro de
  `[item]/page.tsx`, que tinha 255 linhas e ia crescer; a página ficou com 239, e as regras ganharam
  teste próprio. Nenhuma mudou de comportamento, fora o `og:url` com a variação (decisão 11).
- **O que a Meta documenta sobre `og:url`**, que sustenta a decisão 11
  (`https://developers.facebook.com/docs/sharing/webmasters/getting-started/versioned-link`, lida em
  09/10/2026): "All links that specify the same canonical URL are treated as the same resource" e
  "When the path referred to by `og:url` returns an `og:url` link that is different, the new link is
  followed. […] The sharing details that Facebook uses are the ones at the final link in the redirect
  chain." A mesma documentação pede as medidas da imagem: "Specify height and width for your image
  to ensure that the image loads properly the first time it's shared."
- **As páginas da conta e do pedido herdam a descrição que já tinham.** Elas não declaram
  `description`, então a do layout raiz (a frase da Beelink) é a que vale nelas desde antes, e o
  `og:description` passa a repeti-la quando a loja não tem descrição. Com descrição, é a da loja.
  Nenhum leitor de prévia lê essas páginas (ver abaixo); a `description` delas não foi mexida.

### Medido (Cloudinary, imagens baixadas e lidas pixel a pixel com `sharp`)

| Imagem | Resultado |
|---|---|
| Loja de teste (`loja-dominio-1791487727`), o endereço que a página declara | JPEG de 1200×630, **3,3 KB**. A logo de teste (600×200, um retângulo de uma cor só) fica em 560×187, com 320 px de cada lado, 222 px em cima e 221 px embaixo; o canto é a cor do topo |
| A mesma loja com a cor do topo trocada no painel | endereço novo (`b_rgb:190358`), JPEG de 1200×630, 4,0 KB, canto na cor nova |
| Uma logo comprida com fundo transparente (900×220), enviada pelo painel à conta de desenvolvimento | JPEG de 1200×630, **12,6 KB**. O desenho ocupa 554×128 no centro; o vão transparente sai na cor do topo, sem caixa branca |
| Uma foto de 800×1000 recortada como banner (`c_fill,w_1200,h_630/f_jpg`) | JPEG de 1200×630, 8,7 KB, o quadro inteiro preenchido |
| A logo da Mutante (905×220, transparente) sobre a cor do topo dela, na conta de produção | JPEG de 1200×630, **16,6 KB**. A logo fica em 560×138, com 320 px de cada lado e 246 px em cima e embaixo |

O limite que o WhatsApp documenta é 600 KB; a mais pesada das cinco tem 16,6 KB. As três logos ficam
inteiras dentro do quadrado central de 630 px.

A última linha foi pedida à conta de produção do Cloudinary, uma vez: é a imagem que a página da
Mutante vai declarar depois do deploy. Na véspera a mesma logo foi pedida com a caixa de 600×400,
antes de a decisão 2 fechar em 560: essa imagem derivada ficou guardada lá e ninguém vai pedi-la de
novo.

### Visto com `next dev` (API em 3801, web em 3800), lendo o HTML com `User-Agent: WhatsApp/2.23.20.0 A`

Loja `loja-dominio-1791487727`, que tem logo e não tem descrição. Um produto ganhou foto e descrição
para a conferência (ver "Deixado na loja de teste").

**No host da plataforma (`localhost:3800/<slug>`):**

- **Página inicial:** `og:title` "Loja Dominio", `og:url`
  `http://localhost:3800/loja-dominio-1791487727`, `og:site_name` "Loja Dominio", `og:image` a
  imagem montada, com `og:image:type`, `og:image:width` 1200, `og:image:height` 630 e
  `og:image:alt` "Loja Dominio", `og:type` `website`, `theme-color` na cor do topo. O cartão do
  Twitter saiu junto (`summary_large_image`, título, imagem, texto alternativo e medidas), sem
  nenhuma página declará-lo.
- **Categoria (`/bolsas`):** as mesmas tags, com `og:title` "Bolsas · Loja Dominio" e `og:url` no
  endereço da categoria. Antes não havia nenhuma tag `og:`.
- **Catálogo, busca, carrinho e "Entrar":** as mesmas, cada uma com o título e o endereço dela. A
  busca com `?q=bolsa&pagina=2` declara `og:url` em `/busca`, sem o termo e sem a página, e continua
  `noindex`.
- **Produto com foto (`/produtos/bolsa-amora`):** `og:title` "Bolsa Amora", `og:image` a foto, como
  veio, sem medidas, `og:site_name` e `og:url` presentes. Com `?variant=<a variação dele>`, o
  `og:url` mantém a variação e o canonical não; com uma variação que não existe, o `og:url` sai sem
  ela.
- **Produto sem foto (`/produtos/bolsa-jabuticaba`):** a imagem montada da loja, com as medidas.
- **A descrição do produto**, guardada colada (`**Bolsa Amora**Feita à mão…`): `description`,
  `og:description` e o JSON-LD saem "Bolsa Amora Feita à mão, em crochê, com alça de couro. Forro de
  algodão Fecho com ímã". Na página, à vista do cliente, o texto continua colado, como previsto.
- **Loja sem logo e sem banner (`site-dominio-285`):** nenhuma `og:image`, cartão do Twitter
  `summary`, `og:url` e `og:site_name` presentes, `theme-color` na cor dela.
- **Slug que não existe:** 404, nenhuma tag de loja, nenhum `theme-color`. **`/` e `/login`:**
  como antes; a landing da Beelink continua com a imagem dela (PNG de 1200×630, 9,8 KB).
- **Conta e pedido (`/conta/pedidos`, `/conta/pedidos/1`):** respondem 307 para "Entrar", que tem o
  cartão. É o que um leitor de prévia recebe.
- **Com o `User-Agent` de um navegador** (Chrome), as tags da página inicial também saem dentro do
  `<head>`.

Todas as tags saíram dentro do `<head>`, que tem entre 3 KB e 4,3 KB.

**No domínio próprio (`lvh.me` salvo em `/admin/<slug>/domain` pelo painel; a loja abriu em
`http://lvh.me:3800/` em cerca de 20 segundos):** página inicial, categoria, catálogo, busca,
carrinho, "Entrar", os dois produtos e uma landing. Em todas, `og:url` e canonical **sem o slug**
(`/`, `/bolsas`, `/produtos/bolsa-amora`, `/lp/dia-das-maes`), `og:site_name` e a mesma imagem. O
`og:url` sai `https://lvh.me:3800/…`: é o `https` que `siteOrigin()` dá a todo host que não é local
(está em Riscos). No host da plataforma, as páginas da loja passaram a responder 308 para o domínio,
como já era.

**A landing (`/lp/dia-das-maes`, em branco, sem imagem própria):** a imagem montada da loja, onde
antes saía a logo crua.

**A imagem muda sozinha (decisão 5):** a cor do topo foi trocada pelo painel
(`PUT /api/stores/<slug>/colors`); na leitura seguinte a página declarou outro endereço
(`b_rgb:190358` no lugar de `b_rgb:3b7af7`) e `theme-color` na cor nova, e a imagem baixada desse
endereço tem o fundo novo. A cor foi devolvida ao que era.

### Não visto

- **A prévia no WhatsApp de verdade**, que não alcança `localhost`. Só depois do deploy.
- **A troca da logo no aplicativo.** Está no teste de unidade (logo nova, endereço novo) e decorre do
  endereço: a logo está dentro dele. O BEELINK-312 já tinha visto que cada envio ganha endereço novo.
- **Uma landing com imagem própria** e **uma loja só com banner**: só nos testes de unidade. O
  recorte do banner foi medido com o endereço montado à mão, não por uma loja que o declare.
- **`theme-color` pintando a barra de um celular.** O que foi conferido é a tag no HTML.
- **Um navegador.** Nada do que mudou é desenhado na tela; tudo foi lido no HTML com `curl`. O
  Playwright não foi usado, pela regra de disco desta entrega.
- **A build de produção.** Tudo acima foi em `next dev`.

### Deixado na loja de teste (`loja-dominio-1791487727`)

- O produto `bolsa-amora` com uma foto de teste e com a descrição guardada colada, de propósito.
- Uma landing publicada, em branco: `/lp/dia-das-maes`.
- Duas imagens de teste na conta de desenvolvimento do Cloudinary (a foto e uma logo transparente).
- O domínio `lvh.me` foi removido e a cor do topo voltou a ser a de antes.
