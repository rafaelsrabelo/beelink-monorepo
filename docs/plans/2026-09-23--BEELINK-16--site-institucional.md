# BEELINK-16 — Criar site institucional

> "É melhor eu ter um módulo Criar Site Institucional e ele ser diferente: não ter produtos,
> pedidos; mantém clientes, mas quero que sejam leads, pois vai ter um formulário para preencher e
> enviar. No site institucional podiam ter alguns templates e poder adaptar; criar componentes não
> mais como estou criando, está muito cru — queria componentes estilo shadcn já prontos, só para
> escolher." — o dono, 23/09/2026

## O que está sendo pedido, em três frases

1. **Outro produto na mesma casa.** Um site institucional não vende: apresenta, convence e recebe
   contato. Não tem produtos, pedidos nem categorias. O que ele tem de "clientes" chega por um
   formulário — são **leads**.
2. **Começar de um template, não do zero.** Uma estrutura pronta como a do briefing da
   transportadora (topo, números, sobre, serviços, frota, como funciona, área de atuação, clientes,
   FAQ, contato), já com cores e conteúdo de amostra, para o dono adaptar.
3. **Peças prontas, não campos crus.** Um "Serviços" não é um título e três linhas: é uma grade de
   cartões desenhada. O dono escolhe a peça numa galeria e preenche as palavras.

## As decisões

### 1. Um site é um `Store` de tipo `INSTITUTIONAL` — separado na superfície, uma espinha só

Na tela, o site é outro módulo: um fluxo **"Criar site"**, um painel sem Produtos/Pedidos/
Categorias e com **Leads**, uma página pública com cabeçalho e rodapé próprios. Por baixo, é a mesma
linha de `stores`, com `type = INSTITUTIONAL`.

A razão é o que já foi pago: dono e sessão, slug e rota `/<slug>`, cores com tinta derivada,
faixas com componentes e ordem, uploads, modo design com preview fiel. Tudo isso um site precisa
igual, e uma entidade `Site` teria de repetir cada peça — que é o anti-padrão que esta harness
existe para evitar. `StoreType` ganha o segundo valor que nunca teve.

O que hoje é obrigatório e só faz sentido para loja passa a depender do tipo: WhatsApp na criação
("um pedido não tem para onde ir sem ele") e formas de pagamento. Um site pode ter WhatsApp; não é
obrigado.

### 2. Leads são uma tabela, um endpoint público e uma tela

- `leads`: `storeId`, nome, e-mail, telefone, empresa, **`answers` (JSON)** com o que o formulário
  do site perguntou, `componentId` de origem, `status` (`NEW · CONTACTED · WON · LOST`), `createdAt`.
- `POST /stores/:slug/leads`, público, com **limite por IP** (a mesma proteção do pedido) e campo
  armadilha contra robôs. Valida contra os campos que o componente de formulário declarou.
- **E-mail para o dono** a cada lead (o SMTP da autenticação já existe).
- Tela **Leads** no painel: lista mais recente primeiro, detalhe com as respostas, status por
  dropdown. A entrada "Clientes" do menu vira "Leads" quando o tipo é `INSTITUTIONAL`. A tela
  `customers` de hoje é só uma rota sem módulo na API — não há nada a migrar.

CRM e planilha (o briefing pergunta) ficam de fora: um lead é um registro nosso primeiro; exportar é
um botão depois.

### 3. Peças prontas = variantes desenhadas, por tipo, escolhidas numa galeria

Cada componente ganha `variant`, um valor fechado por tipo. Cada variante é **um bloco de verdade em
`packages/ui`**, com story e teste, desenhado com os primitivos shadcn que já são nossos — e não
um arranjo de campos. O menu "Adicionar" vira uma **galeria**: renderiza cada variante com conteúdo
de amostra (não uma imagem estática), o dono aponta e escolhe.

O que "cru" significa e o que muda: hoje um Título é uma linha; uma Vantagem, uma fileira de
ícones. As peças institucionais são seções inteiras com espaçamento, escala tipográfica, imagem e
CTA já decididos. **O desenho é entrega, não detalhe**: cada variante passa pelo Storybook antes de
o painel oferecê-la.

Nota honesta sobre "estilo shadcn": o registro oficial do shadcn traz blocos de aplicação
(dashboard, sidebar, login), não seções de marketing. As seções são nossas, feitas com os
primitivos dele — o que também é o que mantém tokens, tema escuro e testes de acessibilidade.
Registros de terceiros servem de referência de desenho, não de código.

Tipos novos (cada um com 2 variantes na primeira rodada) e os que já existem:

| Bloco do briefing | Tipo | Variantes iniciais |
|---|---|---|
| Topo | `HERO` (o banner, com **botão de CTA** com rótulo e destino) | imagem ao fundo com sobreposição · imagem ao lado do texto |
| Números | `STATS` | fileira de 4 · cartões |
| Sobre | `IMAGE_TEXT` | imagem à esquerda · à direita |
| Serviços | `FEATURES` | grade de cartões com ícone · lista com imagem |
| Frota e segurança | `GALLERY` + `BENEFITS` (selos) | grade · mosaico |
| Como funciona | `STEPS` | linha numerada · vertical |
| Área de atuação | `LOCATIONS` (lista de estados/cidades; mapa fica de fora) | lista por estado · chips |
| Clientes e depoimentos | `LOGOS` + `TESTIMONIALS` | faixa de logos · cartões / carrossel |
| Perguntas frequentes | `FAQ` (`shadcn add accordion`) | acordeão · duas colunas |
| Contato | `CONTACT` (formulário + canais) | formulário ao lado dos canais · formulário centrado |
| Chamada | `CTA` | faixa colorida com botão · com imagem |
| — | `ANNOUNCEMENT`, `HEADING`, `TEXT`, `BENEFITS`, `BANNER` | como hoje |

O formulário do `CONTACT` tem campos **configuráveis dentro de um conjunto fechado** (texto,
e-mail, telefone, área de texto, seleção, data; rótulo; obrigatório ou não) — o suficiente para
"empresa, produto, volume, origem, destino, data desejada" sem virar um construtor de formulários.

### 4. Templates são arranjos iniciais, aplicados na criação

Um template é dado: uma paleta, uma lista de faixas com componentes, suas variantes e um conteúdo
de amostra em pt-BR. Vive na API (`page-templates/*.ts`), como `defaultPage` já vive. O fluxo
"Criar site" pede o template; depois, tudo é editável como hoje — trocar a variante, o texto, a
ordem, a cor, apagar e acrescentar.

O primeiro é **"Serviços B2B / Transportadora"**, exatamente a tabela do briefing. Depois, um ou
dois genéricos (profissional liberal, restaurante) — um por vez, inteiros.

### 5. Cabeçalho e rodapé institucionais

Sem busca, carrinho e conta. Cada faixa ganha um **nome opcional**; o cabeçalho desenha o menu de
âncoras das faixas nomeadas e um botão de CTA (com destino como o slide). O rodapé tem colunas
editáveis — links, redes, endereço — e o mesmo rodapé de loja continua para lojas.

### 6. Uma página, com âncoras

Várias páginas ("Trabalhe conosco" à parte) ficam de fora: `/<slug>/<segmento>` é categoria hoje,
e uma página com slug colidiria com isso — é a discussão de palavra reservada de novo. Entrega
própria, se e quando pedida.

## Fora de escopo, cada um pequeno, cada um separado

Fontes (o manual de marca pede), título/descrição/OG por página, Google Analytics / Pixel / Tag por
site, e **domínio próprio** (infra no proxy + DNS/SSL — o maior dos quatro).

## Entregas, na ordem

| PR | O quê | Tamanho |
|---|---|---|
| **A — o tipo e a casa** | `INSTITUTIONAL`; fluxo "Criar site" com escolha de template; painel condicional ao tipo; cabeçalho de âncoras e rodapé editável; faixa com nome. Usa os componentes de hoje. | M |
| **B — leads** | Tabela, endpoint público com limite e armadilha, e-mail ao dono, tela Leads, componente `CONTACT`. | M |
| **C — a galeria e as peças** | `variant`; galeria com amostras; `HERO` com CTA, `STATS`, `FEATURES`, `STEPS`, `FAQ`, `CTA`, `IMAGE_TEXT` — 2 variantes cada, desenhadas e aprovadas no Storybook. | G |
| **D — o resto das peças e o template** | `TESTIMONIALS`, `LOGOS`, `GALLERY`, `LOCATIONS`; template "Transportadora" completo; um genérico. | M |
| depois | Fontes · SEO por página · analytics · domínio próprio | P·P·P·G |

A ordem existe por uma razão: **A** faz o site existir com o que já há; **B** é a única entrega que
muda o que o produto promete (um contato que chega); **C** é onde "cru" deixa de ser cru, e é a
mais cara porque desenho é trabalho.

## Definição de Pronto (do programa)

1. Um dono cria um site sem produto, pedido ou categoria em lugar nenhum do painel.
2. O site nasce de um template e é editável faixa a faixa, como a loja.
3. Um visitante preenche o formulário; o dono recebe o e-mail e vê o lead no painel com status.
4. Todo componente institucional é escolhido numa galeria de variantes desenhadas, com story e
   teste de acessibilidade, e é o mesmo bloco na vitrine e no preview.
5. O cabeçalho é o menu das faixas nomeadas; o rodapé é do dono.
6. Nenhuma loja existente muda — o tipo `ECOMMERCE` continua desenhando o que desenha hoje.

---

## Adendo 1 — o que a entrega A decidiu ao ser feita

**O botão de CTA do cabeçalho vai com a entrega B.** Ele aponta para o formulário de contato, que
é B; um botão sem destino em A seria um botão para lugar nenhum.

**O rodapé de um site, em A, é navegação + contato.** As faixas nomeadas (as mesmas do menu do
topo, porque o cabeçalho esconde o menu no celular e o rodapé é onde esses nomes se encontram) e
o WhatsApp, quando há. Uma lista livre de links fica para depois — ninguém pediu ainda.

**O tipo se escolhe uma vez, na criação.** O controle "O que você está criando?" aparece só onde o
slug ainda pode mudar. Uma loja virada site deixaria produtos órfãos; um site que quer vender é uma
loja nova.

**O WhatsApp deixa de ser obrigatório no DTO e passa a ser regra do serviço:** o DTO das redes não
sabe em que tipo está aninhado. Uma loja sem WhatsApp responde `STORE_WHATSAPP_REQUIRED`; o
formulário espelha a regra no schema composto, que vê o tipo e o número juntos.

**O template de A usa só os tipos de hoje** (título, parágrafo, vantagens), nomeando cinco faixas:
Início, Serviços, Sobre, Como funciona, Contato. As peças ricas (C e D) substituem essas faixas no
template conforme chegam.

**A âncora vem do nome**, não do id: `#como-funciona` se lê e se compartilha; um uuid não. Duas
faixas com o mesmo nome — a segunda recebe o id no fim.

**Copy que ainda diz "loja" nas telas de um site** (cabeçalho do painel, cards da home, título do
fluxo de criação) fica como polimento para B, junto com a tela de Leads — é onde o painel do site
ganha vocabulário próprio.

---

## Adendo 2 — o que a entrega B decide antes de ser feita

**Dois caminhos, dois guardas.** O visitante envia em `POST /stores/:slug/contact`, público, com limite
por IP e armadilha. O dono lê em `/stores/:slug/leads` (lista paginada, status, exclusão), fechado.
Caminhos separados pelo mesmo motivo que o catálogo público não divide rota com o do dono: um
`@Public()` no controller errado abriria o outro sem ninguém notar.

**O formulário é o componente `CONTACT`; os campos são os `items` dele.** Cada campo é `{ id, label,
type, required, options? }`, com `type` num conjunto fechado de seis (texto, e-mail, telefone, área de
texto, seleção, data). O nome do visitante é sempre pedido e não é um campo — é a coluna que toda
tela mostra. **Um formulário precisa de ao menos um campo obrigatório de e-mail ou telefone**: um
lead sem como responder não é um lead, e a regra vive no schema zod dos items, não na tela. Um
`CONTACT` criado sem items nasce com três (e-mail obrigatório, telefone obrigatório, mensagem), e o
template `servicos-b2b` ganha um na faixa "Contato" no lugar do aviso "chega em breve".

**O que vira coluna e o que vira JSON.** `name`, `email` e `phone` são colunas, preenchidas pela
primeira resposta de tipo e-mail e de tipo telefone — são o que a lista mostra e o que o dono usa
para responder. Todo o resto, empresa incluída, vai em `answers`: uma lista de `{ fieldId, label,
type, value }` com o **rótulo capturado na hora**, porque o campo pode ser renomeado ou apagado
depois e o lead tem de continuar legível sozinho. Não há coluna `company`: nenhuma tela filtra por
ela, e uma coluna sem leitor é a doença do `layoutSettings`. `componentId` é `SET NULL` ao apagar o
formulário — o lead sobrevive ao bloco.

**A validação é contra o que o formulário declarou.** O serviço carrega o componente (do site certo,
tipo `CONTACT`, ativo, em faixa ativa), confere cada resposta pelo tipo (obrigatório, formato de
e-mail, dígitos do telefone, data ISO, opção da lista, tamanho máximo) e recusa um `fieldId` que o
formulário não tem. Código: `LEAD_ANSWER_INVALID`, com a mensagem dizendo qual campo.

**Armadilha e limite.** O corpo tem um campo `website` que a tela desenha fora da vista e nenhuma
pessoa preenche; preenchido, a API responde 201 e não grava nada — um robô que vê sucesso não
insiste. O limite é `LEAD_RATE_LIMIT_MAX` por `LEAD_RATE_LIMIT_WINDOW` (5 a cada 10 minutos, por IP,
via o `x-forwarded-for` que o BFF já encaminha). O endpoint exige JavaScript no site (é um `POST`, não
um link que o Google siga), ao contrário da busca, que é um `GET` por ser uma página.

**O e-mail ao dono sai depois de gravar, nunca antes.** Grava-se o lead, responde-se 201, e o e-mail
é a segunda coisa: uma falha de SMTP é um log, não um 500 para quem acabou de preencher. Os valores
são escapados no HTML — são texto de um estranho, e o template de hoje interpola sem escapar porque
até aqui só interpolou o nome do próprio dono.

**O botão do cabeçalho é a faixa de contato.** A primeira faixa nomeada que tem um `CONTACT` ativo é
desenhada como botão na cor primária, com o **nome da faixa** como rótulo e a âncora dela como
destino, e sai da lista do menu; o rodapé continua listando-a. Nenhuma coluna nova: quem quer que o
botão diga "Pedir orçamento" renomeia a faixa. Aparece também no celular, onde o menu some — é um
botão só e cabe.

**`CONTACT` só é oferecido a um site.** Uma loja que adicionasse um teria leads sem tela para vê-los.
O menu "Adicionar" recebe a lista do que este tipo de loja não pode ter; a API não recusa (o dono de
uma loja que criasse um pela API receberia o e-mail mesmo assim, então nada se perde) — fica
anotado como o que a UI decide e a API ainda não.

**A tela Leads.** Entrada "Leads" no menu de um site (Início · Modo design · Leads · Configurações),
tabela mais recente primeiro com nome, contato, quando, e o status num select na própria linha;
clicar na linha abre a folha com todas as respostas e a exclusão. Paginada como os produtos. A home
de um site ganha um cartão "Leads". CRM, exportação e filtro por texto ficam de fora, como o plano
já dizia.

**Copy de site no painel.** Onde uma tela de site ainda dizia "loja" — subtítulo da home, cartões,
"Configurações da loja", a descrição do modo design — o painel passa a escolher a frase pelo tipo.
O fluxo de criação continua dizendo "loja" no título do passo: é a tela onde o tipo ainda está
sendo escolhido.
