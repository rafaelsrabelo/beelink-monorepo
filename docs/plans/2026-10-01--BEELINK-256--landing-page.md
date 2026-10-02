# BEELINK-256 — Landing page da Beelink na rota inicial

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Desenho: canvas "bee-link — fluxos de criação, modo design e variações", artboard "10 · Landing
> Beelink v2 — marca nova, banners e cadastro de entregador". Sai da `main`.

## Definição de Pronto

1. `/` mostra a landing v2: topo, hero com o hub, carrossel de três banners, ecossistema em
   hexágonos, três passos, seção Para entregadores, perguntas, chamada final e rodapé.
2. A página funciona no celular. O desenho é só de computador (1440 px).
3. "Entrar" leva ao login. "Criar minha loja" e "Começar agora" levam ao cadastro.
4. O formulário de entregador valida os campos e não envia nada.
5. As cores da marca são tokens do design system. Nenhuma cor escrita num componente.
6. Todo texto está nos dicionários, em pt-BR e en.
7. Cada bloco tem história no Storybook e teste com axe. `pnpm ci-check` verde.

## Decisões do Rafael (01/10)

- **Versão:** a v2.
- **Entregadores:** a seção fica só no visual. O formulário tem as validações e não envia nada. O app
  do entregador é o Épico R.
- **Ticket:** este, BEELINK-256.

## Decisões

### 1. O login continua em `/login`

O Rafael perguntou qual é melhor: `/login` ou `/auth/login`. Fica `/login`.

- Os e-mails de confirmação e de nova senha já enviados apontam para `/verify-email` e
  `/reset-password`. Mudar o endereço exige redirecionar os antigos para sempre.
- Mover para `/auth/*` mexe no proxy, nos e-mails da API, no retorno do Google e nos testes, e não
  muda nada para quem usa.
- A raiz deixa de redirecionar para o painel e vira a landing. "Entrar" aponta para `/login`, e o
  proxy leva quem já está conectado direto ao painel, como hoje.

Se mais adiante fizer sentido juntar as telas de conta em `/auth/*`, é um ticket próprio.

### 2. A marca nova entra como tokens

Creme, amarelo e preto viram tokens `brand-*` em `packages/ui/src/styles/globals.css`, o único
arquivo onde uma cor pode ser escrita. Os blocos usam as classes (`bg-brand-yellow`,
`text-brand-ink`). A fonte do desenho, Plus Jakarta Sans, é carregada só pela landing: o painel
continua em Geist.

### 3. Os blocos ficam em `packages/ui/src/blocks/landing`

Um bloco por seção, cada um com os textos vindos do dicionário (`messages.landing`). O `apps/web`
só monta a página e entrega os endereços.

### 4. Celular

- **Hub do hero e hexágonos:** no computador, as posições do desenho. Em telas menores, os mesmos
  cinco itens viram uma grade de cards. É um DOM só, sem conteúdo duplicado.
- **Banners:** rolagem nativa de lado, com encaixe. As setas e os pontos são um acréscimo: a fileira
  rola com o dedo, o trackpad e o teclado antes de qualquer script carregar (a mesma razão do
  `scroll-rail.tsx` da vitrine).
- **Menu do topo:** os links de seção somem abaixo de `lg`. "Entrar" e "Criar minha loja" ficam.

### 5. O formulário de entregador

Campos: nome completo, WhatsApp, cidade, como entrega (moto, bicicleta, carro, a pé) e o aceite dos
termos. Valida ao enviar, com `react-hook-form` e `zod`, como os outros formulários. Com tudo certo,
mostra uma frase dizendo que o cadastro ainda não está aberto e que nada foi enviado. Nenhuma
requisição sai.

### 6. O que o desenho deixa em aberto

O desenho marca itens entre colchetes como "a confirmar", e alguns links não têm destino. Uma página
pública não pode mostrar colchetes nem link que não leva a lugar nenhum. O que fiz com cada um:

| No desenho | Na página |
|---|---|
| Rodapé: "© 2026 Beelink · [razão social e CNPJ]" | "© ano Beelink". A razão social entra quando o Rafael passar. |
| Formulário: "Requisitos da sua categoria: [confirmar…]" | Fora. |
| Benefício "Ganhos à vista … [regra de repasse]" | A frase sem o colchete. |
| Perguntas de entregador com resposta "[Confirmar…]" (3) | A pergunta fica; a resposta diz que o cadastro ainda não abriu e que a regra será publicada. |
| Pergunta "Posso usar meus próprios entregadores?" ("[Confirmar]…") | Resposta com o que o produto faz hoje: entrega própria ou transportadora. |
| Aceite: "termos para entregadores" | "termos de uso", com link para `/termos`. Não existem termos de entregador. |
| Rodapé: "Termos do entregador", "Central de ajuda", "Fale com a gente" | Fora: não têm página nem canal definido. |
| Rodapé, coluna Soluções (links `#`) | Apontam para a seção do ecossistema. |
| "Ver uma loja de exemplo" | Só aparece quando `EXAMPLE_STORE_SLUG` está configurada. |
| Logo "redesenhado à mão: trocar pelo SVG oficial" | O do desenho, num componente só (`BeelinkMark`), para trocar num lugar. |
| Números "01, 02, 03" em amarelo sobre o card branco | Em preto, com o ponto amarelo dos títulos. Amarelo sobre branco dá contraste de 1,6:1. |

### 7. O que a página promete e o produto ainda não tem

A v2 fala de "Checkout", "eMarketing", "Envios" e de "chamar um entregador Beelink" (passo 3 e banner
Beelink Envios). O Rafael escolheu a v2 sabendo que o app do entregador não existe. Os textos ficam
como no desenho, e o PR lista essas frases para ele decidir antes de publicar.

## Fora de escopo

- Mover as telas de conta para `/auth/*` (decisão 1).
- Guardar o interesse do entregador (tabela e rota na API).
- Sitemap, robots e imagem de compartilhamento: são do Épico V (BEELINK-246, BEELINK-250).
- A landing v1 e a seção de preços dela.

## Adendo — revisão independente (01/10)

O que a revisão achou e o que mudou. O texto acima fica como foi escrito.

- **Correção da decisão 4:** os links de seção do topo somem abaixo de `xl` (1280 px), não de `lg`.
  Em 1024 px eles quebravam a linha do topo.
- **`EXAMPLE_STORE_SLUG` vazia derrubava o web ao subir.** O `.env.example` traz a linha em branco, e
  o esquema recusava `""`. Agora vazio vale como ausente. A variável entrou no
  `docker-compose.dokploy.yml` e no `.env.dokploy.example`, para poder ser ligada em produção.
- **Foco pelo teclado invisível.** O anel usava a cor do próprio botão, e um botão preto na seção
  preta não mostrava nada. Agora a moldura desenha o anel de tudo abaixo dela, na cor que o fundo
  pede: preto no creme e no amarelo, claro no preto.
- **Carrossel.** "Anterior" pulava o banner do meio entre 990 e 1346 px, e acima de 1346 px havia
  três pontos para dois lugares de parada. As setas agora vão de parada em parada, e os pontos contam
  as paradas. O texto para leitor de tela virou "Página 2 de 3". Acima de 1440 px a fileira vai até a
  borda da janela, em vez de ser cortada no meio.
- **Formulário.** Antes do script carregar, "Continuar cadastro" fazia um GET com nome e telefone no
  endereço. O formulário agora usa `method="dialog"`, que não envia nada. O aviso de campo saiu de
  dentro do rótulo (era lido duas vezes). "Moto" já vem marcada no HTML. O telefone aceita o 0 na
  frente do DDD e recusa DDD com zero.
- **Peso da página.** O formulário recebia o dicionário inteiro do design system, e ele ia escrito no
  HTML. Agora recebe só as frases dele.
- **Celular estreito.** Os quatro passos do cadastro ficam dois a dois abaixo de 640 px (o quarto era
  cortado em telas de até 365 px). O banner e o título do hero cabem em 320 px.
- **1440 px com barra de rolagem clássica:** a coluna do ecossistema passou a 400 px, com título em
  50 px, para o palco dos hexágonos caber quando a barra tira 15 px da janela.
- **Testes novos:** `/` fora do proxy para qualquer combinação de cookies; uma seção para cada âncora;
  nenhum colchete também em inglês; `server-env.test.ts`.

### Textos que continuam para o Rafael decidir

- **"combos"** aparece no banner da loja e no passo 2. O produto não tem combos.
- O formulário diz **"Leva 2 minutos. Os documentos vêm no próximo passo."**, e o cadastro não está
  aberto.

## Adendo — logo oficial (01/10)

O Rafael entregou `logo.png` (símbolo e nome, preto sobre transparente). O símbolo foi redesenhado
em vetor a partir das medidas do arquivo, em `BeelinkMark`: um PNG preto não aparece na seção preta
nem aceita a cor do texto. O nome "Beelink" continua como texto, na fonte da página. Com o arquivo
em SVG, o nome também pode vir do desenho oficial.

## Adendo — ajustes depois do merge (01/10)

Pedidos do Rafael depois de ver a landing no ar. Branch `fix/landing-smooth-scroll-and-auth-brand`.

- **Rolagem até a seção.** Os links "Soluções", "Ecossistema" e os outros cortavam direto para a
  seção. Agora a página desliza até ela. Quem pediu menos movimento no sistema continua com o corte.
  A regra fica no documento (`globals.css`) e só vale na página que pede (`data-smooth-anchors`): o
  painel e a vitrine não mudam.
- **Telas de conta com a marca.** Login, cadastro, senha e confirmação de e-mail ganharam o fundo
  creme da landing, as duas linhas amarelas e o logo sobre o cartão, que leva de volta à landing
  (`AuthShell`). No tema escuro o fundo continua o do painel: os tokens da marca são de tema claro.
- **Menu no celular.** Abaixo de 1280 px os links de seção vão para um menu atrás de um botão, com
  "Termos de uso" e "Política de privacidade". No celular o menu também traz "Entrar" e "Criar minha
  loja". É um `<details>`: abre mesmo antes do script carregar, e fecha ao seguir um link ou com Esc.
  Corrige a decisão 4, que dizia que os links apenas sumiam.

## Adendo — prévia do link da landing (01/10)

Pedido do Rafael: ao compartilhar `link.beecoders.net`, a prévia mostrar título, descrição e a logo.

- `/` passou a declarar Open Graph e Twitter Card, com endereços absolutos, e o canonical.
- A imagem é `apps/web/public/brand/share-v1.png`: a logo oficial no fundo creme, em 1200×630. O
  nome leva versão porque o WhatsApp guarda a prévia pelo endereço da imagem.
- O endereço do site sai do pedido (`siteOrigin()`), porque o web ainda não tem uma variável com o
  próprio domínio. Isso é o V1 do Épico V (BEELINK-247); quando ele chegar, `siteOrigin()` sai.
- Só a landing. A prévia das lojas é o V2 (BEELINK-248), e `robots.txt` e sitemap são o V4
  (BEELINK-250).

## Adendo — o ícone da marca (01/10)

O Rafael entregou o ícone: uma sacola preta com a marca, sobre amarelo.

- **Aba do navegador:** `favicon.ico`, `icon.png` e `apple-icon.png` em `apps/web/src/app` são o
  ícone. Foi redesenhado em vetor a partir da imagem e exportado nos tamanhos, com o amarelo da marca.
- **Link compartilhado:** `share-v2.png` troca a `share-v1.png` (a logo no creme). É o ícone
  centrado no amarelo, para um recorte quadrado não o cortar.
- **Painel:** a barra do topo deixou de ser preta e passou ao amarelo da marca, com o ícone no lugar
  da palavra "beelink" (o nome continua dito a um leitor de tela). Li "a cor de fundo é o amarelo em
  vez de preto" como a cor da barra. A barra do editor de design usa os mesmos tokens e mudou junto.
- **Contraste na barra amarela:** texto e ícones em preto; o selo da loja e o contador de avisos em
  preto com texto claro (eram verdes); o ponto de "alterações não publicadas" virou vermelho-alaranjado
  (âmbar some no amarelo); o texto de apoio da busca subiu de 60% para 70% do preto (60% dava 4,2:1).

## Adendo — a fonte quebrou o deploy (01/10)

O deploy falhou no `next build` da imagem: `module-not-found` em cada `src` do
`plus_jakarta_sans_*.module.css`. O `next/font/google` baixa a fonte do Google durante o build, e
nesse build os arquivos da Plus Jakarta Sans não vieram.

A fonte agora mora no repositório (`apps/web/src/components/landing/fonts/`) e é carregada com
`next/font/local`: um arquivo só, a versão variável com os pesos 300 a 800, só o alfabeto latino
(cobre pt-BR e en), 27 KB, com a licença SIL OFL ao lado. O build não depende mais da rede para ela.

Geist (painel) e Figtree (vitrine) continuam vindo do Google no build. Não falharam até aqui; se
falharem, a correção é a mesma.

## Adendo — a logo oficial no topo, no rodapé, nas telas de conta e no painel (01/10)

O Rafael entregou `logo-vertical.png`: a sacola com a marca e o nome "Beelink", em preto, com a marca e
as alças vazadas.

- A logo foi vetorizada (potrace) num caminho só, em `BeelinkLogo`. Toma a cor do texto, e os
  vazados mostram o fundo: o creme da landing e o amarelo do painel.
- **Onde:** topo e rodapé da landing, telas de conta e a barra do painel. No celular, a barra do
  painel mostra só a sacola (`variant="icon"`, o mesmo desenho numa caixa mais estreita): ao lado do
  menu, da busca, do sino e da loja, o nome não cabe.
- O nome deixou de ser texto nesses lugares. As telas de conta não carregam mais a Plus Jakarta Sans.
- `BeelinkBag` (a sacola redesenhada à mão no PR anterior) saiu: a barra do painel usa a logo oficial.
  O ícone da aba e a imagem de compartilhamento continuam os gerados daquele desenho.
- O símbolo antigo sem a sacola (`BeelinkMark`) continua dentro da página: no hub do hero, no
  hexágono central, no banner do celular e na marca d'água da chamada final.

## Adendo — as fotos da marca: banners com foto, carrossel nas telas de conta (02/10)

Ajustes pedidos pelo Rafael depois de ver as fotos na página:

- **Banners com a foto no fundo.** Os três banners de "Soluções" têm uma foto atrás do texto, sob um
  véu da cor do próprio banner, mais forte onde o texto está: a caixa, o celular e o caminhão no
  amarelo da loja (`parcel-phone-truck.jpg`, recortado do pôster do ponto de ônibus), o painel no
  notebook no do meio, o entregador no de entregas.
- **Banner do painel.** Deixou de ser só a foto: tem selo, título e descrição
  (`landing.banners.panel`). De `xl` em diante tem a largura de dois banners (mais o vão entre
  eles), com a foto ao lado do texto, surgindo da esquerda; abaixo disso a foto fica na parte de
  cima e se desfaz no texto. A fileira passou a contar as paradas pelo começo de cada banner, já que
  eles não têm mais a mesma largura.
- **Sem o card subindo.** Os banners não se mexem mais sob o ponteiro. O que responde é a foto, que
  aproxima (6%) dentro da moldura — e não aproxima para quem pediu menos movimento. Os cartões do
  hub e dos passos continuam subindo; o pedido foi sobre os banners.
- **Formulário do entregador.** "A pé" saiu. No lugar entrou "Utilitário" (`VAN`), o carro de
  entrega com baú. As opções são moto, bicicleta, carro e utilitário.
- **Telas de conta.** A foto ao lado do formulário virou um carrossel (`blocks/auth/auth-photos`)
  com três fotos da marca: o pôster no muro, o entregador e o pôster no ponto de ônibus. Sem setas;
  as bolinhas embaixo mostram qual está na tela e levam a qualquer uma. Passa sozinho a cada 6
  segundos, para sob o ponteiro e com o foco numa bolinha, e não passa sozinho para quem pediu menos
  movimento. No celular continua só o formulário.
- **Voltar para a landing.** As telas de conta ganharam "Voltar para o site" no alto, acima da
  logo, que já levava para lá: nem todo mundo sabe que uma logo é um link.
