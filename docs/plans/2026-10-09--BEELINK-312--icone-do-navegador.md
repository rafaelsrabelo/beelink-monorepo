# BEELINK-312 — O ícone do navegador da loja

09/10/2026. Pedido do Rafael, com o primeiro domínio próprio no ar: a aba do navegador de toda loja
mostra o ícone da Beelink, e "no admin é pra ser possível adicionar o ícone da sua marca no browser".
Entre as duas opções oferecidas ele escolheu **um campo próprio "Ícone do navegador" na tela Loja,
com upload de uma imagem quadrada, usando a logo quando o campo estiver vazio.**

Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`.

## Definição de Pronto

1. A loja guarda o endereço do ícone, anulável, ao lado da logo; a migration só acrescenta.
2. `PublicStore` (e com ele `Store`), `CreateStorePayload` e `UpdateStorePayload` carregam `faviconUrl`; a API valida como valida a logo (http/https), salva, remove e devolve nos dados públicos.
3. Na tela Loja há um campo "Ícone do navegador": enviar, ver a prévia no tamanho de uma aba, trocar e remover, com o texto que diz o que ele é e que sem ele a loja usa a logo.
4. Uma imagem que não é quadrada é recusada antes do envio, com uma frase clara.
5. Toda página sob `app/[slug]` (inclusive landings e o domínio próprio) declara o ícone da loja; sem ele, a logo; sem os dois, o da Beelink.
6. O HTML de uma página da loja com ícone (ou logo) não traz nenhum ícone da Beelink, e o `apple-touch-icon` é o da loja.
7. `/favicon.ico` continua respondendo em qualquer host.
8. `/admin`, `/login` e `/` continuam com o ícone da Beelink.
9. Salvar a loja derruba `store:<slug>`; um ícone novo tem endereço novo.
10. Blocos em `packages/ui` com story e teste; textos em pt-BR e inglês; carregamento em skeleton.
11. Testes: unidade e e2e da API; unidade do web para os metadados nos três casos e para o que a tela envia.
12. Documentos: `docs/product/`, e os mapas dos apps se algo novo entrar.
13. `pnpm ci-check` verde; a tela usada num navegador, também em 390 px.

## Decisões

1. **O campo se chama `faviconUrl`**, coluna `Store.faviconUrl String?`, ao lado de `logoUrl`.
2. **Mesmas regras de escrita da logo.** `PUT /stores/:slug` substitui a loja inteira: uma chave opcional ausente apaga o que estava guardado, e `faviconUrl` segue essa regra, como `logoUrl`. O único chamador do `PUT` no web é `toUpdatePayload`, que passa a mandar o campo. `POST /stores` aceita o campo por simetria com a logo, mas a tela de criação não o mostra: criar uma loja continua curto, e o ícone é escolhido depois, na tela Loja.
3. **Formatos e tamanho: os da logo, sem mudança** — PNG, JPEG e WebP, até 2 MB (`uploads.constants.ts`). Os três são aceitos em `<link rel="icon">` pelos navegadores atuais (Chrome, Edge, Firefox, Safari). **SVG fica de fora**: serviria de ícone de aba, mas o upload não o aceita hoje, um SVG guardado é um documento com script, e o iOS não o aceita como `apple-touch-icon`. ICO também fica de fora: o upload (Cloudinary, como imagem) não o aceita e PNG cobre o caso. Ressalva registrada em Riscos: para o ícone de toque, a Apple documenta PNG.
4. **Imagem não quadrada é recusada no navegador, antes do envio**, com a frase "O ícone precisa ser quadrado: a imagem enviada tem {width} x {height} pixels." É o mais simples que não deforma: quem desenha o ícone na aba é o navegador, e centralizar num quadrado só valeria na nossa prévia, não na aba de verdade, sem gerar outra imagem no servidor (fora do ticket). A medida é lida com `createImageBitmap`; onde ela não puder ser lida, o arquivo passa. A API não mede a imagem: ela guarda um endereço, como faz com a logo.
5. **A recusa mora no `StoreImageField`**, por uma propriedade nova e opcional `validate`, depois das recusas de formato e de tamanho que ele já faz. O campo do ícone (`StoreFaviconField`) é esse mesmo campo com a regra do quadrado e, ao lado, a prévia da aba (`StoreFaviconPreview`): 16 px, ao lado do nome da loja. A prévia mostra o que a aba vai mostrar: o ícone; sem ele a logo; sem os dois um ícone neutro, e diz em uma linha qual dos três é.
6. **O envio do ícone tem o seu próprio estado**, separado do da logo (um segundo `useImageUpload` na tela): com um só, enviar a logo escreveria "Enviando…" também no campo do ícone.
7. **A vitrine declara os ícones num lugar só: `generateMetadata` do layout `app/[slug]/layout.tsx`**, que cobre todas as páginas abaixo dele, as landings e o domínio próprio (que é uma reescrita para `/<slug>`). Nenhuma página abaixo declara `icons`, então o do layout vale para todas. A regra (ícone, senão logo, senão nada) é uma função pura em `apps/web/src/lib/shop-icon.ts`. Com endereço, ela devolve `icons.icon` e `icons.apple` apontando para ele; sem endereço devolve nada e a página herda os da Beelink.
8. **Como o `icons` convive com os arquivos fixos (Next 16.3.4, lido em `node_modules/next/dist/lib/metadata/resolve-metadata.js` e em `docs/…/generate-metadata.md`).** São duas regras diferentes:
   - `icon.png` e `apple-icon.png` só entram no HTML quando nenhum segmento declarou `icons`. Com o `icons` do layout da loja, eles saem sozinhos.
   - `app/favicon.ico` é um caso à parte: entra sempre, na frente de todos, mesmo com `icons` declarado. É ele que deixaria a página da loja com dois ícones concorrentes.

   Por isso **`favicon.ico` sai de `apps/web/src/app/` e vai para `apps/web/public/`**: continua respondendo em `/favicon.ico` em qualquer host (o proxy deixa passar todo arquivo com extensão, `isFilePath`), mas deixa de ser injetado. As páginas da Beelink ficam com `icon.png` e `apple-icon.png`, como hoje, menos a linha do `.ico`; um navegador que não lê `<link rel="icon">` continua pedindo `/favicon.ico` por conta própria.
9. **Cache.** O handler `PUT /api/stores/[slug]` do web já chama `revalidateStore(slug)` em toda resposta 200: nada novo a derrubar. O Cloudinary dá um `public_id` novo a cada envio, então um ícone trocado tem outro endereço e o navegador não fica com o antigo.

## Fora deste ticket

Gerar tamanhos ou recortar a imagem no servidor; manifesto de aplicativo por loja; `og:image`; o campo na tela de criação da loja; qualquer coisa do Épico Y.

## Riscos

- Uma loja sem ícone usa a logo, que pode não ser quadrada: a aba a mostra como o navegador decidir. É o comportamento pedido ("usando a logo quando o campo estiver vazio").
- `apple-touch-icon` em JPEG ou WebP: a Apple documenta PNG. Não há iPhone neste ambiente para conferir.
- Tirar o `.ico` do HTML das páginas da Beelink muda qual arquivo o navegador escolhe para a aba delas: passa a ser o `icon.png` reduzido.

## 09/10/2026, mais tarde — o que mudou ao escrever e o que foi visto no navegador

### Acréscimos às decisões

- **O `StoreImageField` ganhou também `copy`** (os nomes dos seus três controles). Com dois campos de imagem na mesma aba, dois botões chamados "Trocar imagem" e duas áreas chamadas "Clique ou arraste a imagem aqui" não se distinguem para quem navega por nome. O campo do ícone diz "Clique ou arraste o ícone aqui", "Trocar ícone" e "Remover ícone".
- **O web não manda `faviconUrl` ao criar a loja.** A API aceita (decisão 2), mas o formulário de criação não mostra o campo, então `toCreatePayload` não inclui a chave.
- **A prévia recebe o ícone da Beelink por propriedade** (`platformIconUrl`, que a tela passa como `/icon.png`), para mostrar o terceiro caso com a imagem certa. `packages/ui` não conhece endereço nenhum do app.
- **Um defeito antigo apareceu e foi consertado aqui: o botão "Trocar imagem" não abria nada.** O único `<input type="file">` do `StoreImageField` ficava dentro da área vazia; com uma imagem guardada ele não estava na página e o botão clicava em `null`. Valia para a logo desde sempre. Agora há um `input` escondido ao lado do botão, e a troca passa pelas mesmas recusas (formato, tamanho, quadrado). Entrou neste ticket porque "trocar" é parte do pedido.

### Visto no navegador (Chromium pelo Playwright, API em 3801 e web em 3800, upload de verdade no Cloudinary de desenvolvimento)

- **Tela Loja, 1280 px e 390 px**: o campo aparece embaixo da logo com o texto de ajuda, os formatos e a dimensão recomendada. Uma imagem de 600 x 200 foi recusada antes do envio com "O ícone precisa ser quadrado. A imagem enviada tem 600 x 200 pixels.", na área vazia e também pelo "Trocar ícone" (o ícone guardado ficou). Uma de 256 x 256 foi enviada (`POST /api/uploads` 200), a prévia grande e a da aba (16 x 16 px medidos) passaram a mostrá-la, e "Salvar alterações" respondeu 200. Em 390 px a página não ganha rolagem horizontal (`scrollWidth` igual a `clientWidth`).
- **"Trocar ícone" abre o seletor de arquivos** (o Playwright acusou o seletor aberto). O arquivo da troca foi entregue direto ao `input` escondido, porque a ferramenta não deixa escolher arquivo de fora do repositório pelo seletor.
- **Trocar muda o endereço**: dois envios seguidos deram `…/uuzzlfmrrflpxe6va4c6.png` e `…/cozphafebiteaxrohbx6.png`.
- **HTML da loja com ícone**, em `localhost:3800/<slug>`, `/produtos`, `/carrinho`, `/entrar`, e no domínio próprio `lvh.me:3800/`, `/produtos`, `/carrinho`: exatamente dois `<link>`, `rel="icon"` e `rel="apple-touch-icon"`, os dois no endereço do ícone da loja. Nenhum da Beelink.
- **Removido o ícone, com logo**: os dois `<link>` passam ao endereço da logo, na leitura seguinte (o cache `store:<slug>` caiu com o salvar); a prévia diz "Sem ícone, a aba mostra a logo da loja.".
- **Sem ícone e sem logo** (`site-dominio-285`, e a loja antes de qualquer envio) e um slug que não existe: `/icon.png` e `/apple-icon.png` da Beelink.
- **`/admin`, `/admin/<slug>`, `/login` e `/`**: `/icon.png` e `/apple-icon.png` da Beelink.
- **`/favicon.ico`** responde 200 `image/x-icon` em `localhost:3800` e em `lvh.me:3800`.

### Não visto

- **O desenho do ícone na aba de um navegador com janela.** O Chromium do Playwright roda sem a barra de abas: o que foi conferido é o HTML e o DOM, não o pixel na aba.
- **Uma landing (`/<slug>/lp/<página>`)**: a loja de teste não tem nenhuma publicada. Ela está sob o mesmo layout, e um teste lê que nenhuma página sob `app/[slug]` declara `icons`.
- **iPhone / "Adicionar à Tela de Início"** e Safari.
- **JPEG e WebP como ícone**: só PNG foi enviado.
- **A build de produção no navegador**: tudo acima foi em `next dev`.
- O ícone enviado por último ficou guardado na loja de teste (`loja-dominio-1791487727`), junto com uma logo de teste; o domínio `lvh.me` foi removido de volta ao fim.
