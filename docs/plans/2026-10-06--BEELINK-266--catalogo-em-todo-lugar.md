# BEELINK-266 (W7) — "Nova landing" e a criação de loja escolhem no mesmo catálogo

> Épico W (BEELINK-259), "Templates do modo design". Último ticket da pilha: `main` → W1 → W2 → W3 → W6 → W4 → W5 → **W7**.
> Planos anteriores: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md), [BEELINK-261](2026-10-06--BEELINK-261--aplicar-modelo.md), [BEELINK-262](2026-10-06--BEELINK-262--previa-do-modelo.md), [BEELINK-265](2026-10-06--BEELINK-265--modelos-de-pagina-inicial.md), [BEELINK-263](2026-10-06--BEELINK-263--galeria-de-modelos.md) e [BEELINK-264](2026-10-06--BEELINK-264--aplicar-com-confirmacao.md).

## O problema

O catálogo de modelos é um só na API, mas dois lugares ainda não o leem. "Nova landing" tem os quatro modelos escritos no web (`LANDING_TEMPLATES`, `needsProduct`, `SITE_TEMPLATES`): um modelo novo no catálogo não aparece ali. E a criação de loja online não oferece modelo nenhum: toda loja nasce com a página padrão, e os quatro modelos de página inicial do W6 só são alcançados depois, pela galeria.

## Definição de Pronto

1. "Nova landing" lê os modelos da API, com skeleton e falha; nenhuma lista de modelos fica escrita no web. O que ela cria não muda: os mesmos quatro modelos, as mesmas recusas.
2. A criação de loja online oferece, num passo opcional e discreto, a página padrão (selecionada de início) e os quatro modelos de página inicial.
3. A lista para escolher vale sem loja: é pedida por tipo de loja. A categoria escolhida no formulário só ordena os indicados (decisão 3 do épico).
4. O modelo escolhido é aplicado na abertura da loja, por `store-opening.ts`, e abre sem buraco numa loja sem produto.
5. Quem não escolhe nada recebe exatamente a página de hoje, provado por teste. A criação de site continua como está.
6. Usado no navegador a 1280 e a 390 px: uma loja criada com a página padrão, uma com um modelo, e uma landing criada pela lista nova. Com capturas.
7. Testes: API unitário e e2e da abertura com modelo, telas, handler; mapas de superfície; `docs/product` se a descrição da criação mudar; `pnpm ci-check` verde.

## Decisões

1. **Duas leituras do mesmo catálogo, para os dois casos em que a página ainda não existe.**
   - `GET /api/stores/:slug/page-templates?kind=LANDING`: os modelos com que uma página **nova** desse tipo abriria nesta loja. É a rota do W1 com um parâmetro a mais; `pageId`, quando vem, continua mandando. "Nova landing" usa esta: a loja existe, e é a API que sabe o tipo e a categoria dela.
   - `GET /api/page-templates?storeType=ECOMMERCE&categoryId=<uuid>`: os modelos com que a página inicial de uma loja **que ainda não existe** abriria. Pede sessão, como toda a via do admin, e não pede loja. `categoryId` é a categoria marcada no formulário; uma categoria desconhecida não é recusada, só não indica nada (ela só ordena).
   As duas respondem `PageTemplateSummary[]` por `templatesFor`, a função que a galeria já usa.
2. **`CreateStorePayload.template` passa a aceitar os modelos de página inicial** (`OpeningTemplateId = PageTemplateId | HomeTemplateId`). `PageTemplateId` não muda.
3. **Um modelo que não vale para o tipo da loja é ignorado, não recusado**: a loja abre com o que abriria sem ele. É o que a API já fazia (uma loja online que mandasse `servicos-b2b` abria com a página padrão), e criar uma loja é o fim de um formulário de quatro passos: recusar ali por um campo que o formulário nem deixa errar não ajuda ninguém. O que decide é o catálogo (`pageKinds` com `HOME`, `storeTypes` com o tipo), numa função só (`openingTemplateOf`).
4. **O modelo é gravado na abertura, pelas mesmas faixas que aplicar gravaria numa loja vazia.** `openingPageOf` pede `template.bands(subject)` com o estoque vazio e o nome da loja, e `writeBands` grava, como já faz com `servicos-b2b`. Não passa por `arrangedDocument`: não há rascunho a preservar (nem barra de aviso, nem formulário), e todo modelo de inicial traz a sua vitrine (decisão 9 do W6), o que o teste do catálogo já garante.
5. **Uma loja nova não tem produto, então os quatro modelos abrem quase iguais**: o nome da loja, as vantagens das formas de pagamento e a vitrine de todos os produtos (W6, "faixa sem o que mostrar não é gravada"). O passo diz isso: "o modelo se completa quando você o aplicar de novo pelo modo design, depois de cadastrar produtos". Guardar a escolha para reaplicar sozinha fica em aberto (seção final).
6. **O passo é uma seção recolhida no último passo do formulário ("Aparência")**, e não um quinto passo: "Página inicial: página padrão", com "Escolher outro modelo" abrindo as opções. Só aparece para loja online. A página padrão é a primeira opção e vem marcada; a lista da API vem depois, na ordem dela (indicados primeiro, com o selo "Indicado"). Se a lista falha, a criação não é bloqueada: fica a página padrão, com "Tentar de novo".
7. **Sem prévia na criação.** A prévia do W3 pede uma loja que existe. Os cartões têm nome e descrição, como os de "Nova landing".
8. **O formulário avisa a tela do tipo e da categoria** (`onShopKindChange`), como já avisa do que é digitado no endereço: é a tela que busca, o bloco não.
9. **"Nova landing" desenha só o que a API oferece.** Antes, um site via os quatro cartões com três desabilitados; agora vê o que o catálogo dá ao site (`em-branco`), com a mesma frase explicando. O primeiro da lista vem marcado; como a lista vem com os indicados primeiro, o modelo marcado de início pode ser o indicado para a categoria da loja.
10. **Os ícones dos cartões continuam no bloco**, por id: são desenho, não catálogo. Um id que o bloco não conhece (um modelo mais novo que este build) fica de fora, como na galeria.

## Fora do escopo

Prévia do modelo na criação da loja; modelo na criação de site (continua `servicos-b2b`); reaplicar o modelo sozinho quando a loja ganhar produtos.

## Acréscimos durante a implementação

- **Um defeito antigo do formulário de criação, achado no navegador e corrigido aqui porque bloqueava o ticket.** Ao clicar "Continuar" no terceiro passo, a loja era criada na hora: o passo "Aparência" aparecia e o formulário já tinha sido enviado, sem ninguém apertar "Criar loja". Os dois botões do rodapé ("Continuar", `type="button"`, e "Criar loja", `type="submit"`) ocupavam a mesma posição sem `key`; o React reaproveitava o mesmo `<button>` e trocava o `type` ainda dentro do clique (a troca de passo vem de um `await` e é aplicada antes de o clique terminar), e o navegador então enviava o formulário com ele. Conferi que acontece com o arquivo como estava no commit anterior. A correção são duas `key`s. O jsdom não reproduz a ordem dos eventos de um navegador, então **não há teste automático para isso**: a evidência é o navegador (nenhum `POST /api/stores` antes do clique em "Criar loja").
- **A frase do passo** deixou de dizer só "Sua loja abre com a página padrão": com um modelo escolhido ela seria falsa. Agora: "…a não ser que você escolha um modelo".
- **`docs/product` não mudou**: ele não descreve a criação da loja nem a página com que ela abre.
- **As lojas criadas no banco de desenvolvimento** durante o uso: `w7-pagina-padrao`, `w7-padrao-dois` (página padrão) e `w7-mercado-modelo` (categoria Mercado, modelo "Por categorias"), na conta `galeria-modelos@teste.dev`.

## O que foi visto no navegador

- Criação a 1280 px, sem abrir a escolha: o passo mostra "Página inicial" recolhido; `GET /api/page-templates?storeType=ECOMMERCE` sai uma vez; o `POST /api/stores` não leva `template`; a vitrine pública é a de sempre (vantagens e a vitrine vazia, que não desenha nada).
- Criação a 390 px com a categoria "Mercado": a lista vem com "Por categorias" primeiro e o selo "Indicado", os outros três depois, e a página padrão continua marcada. Escolhido "Por categorias", o `POST` leva `"template":"por-categorias"`; a vitrine pública abre com o nome da loja, "Conheça os nossos produtos" e as vantagens; no editor, a página está "Publicado" e a vitrine aparece como "Vazio — não aparece na loja".
- "Nova landing" numa loja: `GET …/page-templates?kind=LANDING`, quatro cartões, o primeiro marcado; criada com "Coleção ou categoria" e um produto, o corpo é o de antes (`template`, `productId`). Num site: um cartão só, "Em branco", com a frase "Um site começa em branco". Na loja de categoria "Mercado": "Promoção relâmpago" vem primeiro, com "Indicado", e já marcado.

## O que o épico deixa em aberto

1. **Um modelo escolhido na criação abre quase vazio, e não se completa sozinho.** A loja nova não tem produto, e uma faixa sem o que mostrar não é gravada (W6): "Por categorias" grava o nome, a vitrine e as vantagens, sem nenhuma categoria. Para ficar como o nome promete, o lojista precisa reaplicar o modelo pela galeria depois de cadastrar produtos e categorias; o passo da criação diz isso, mas nada o lembra depois. Caminhos: guardar a escolha na loja e oferecer "completar o modelo" quando houver produtos, ou reaplicar sozinho enquanto o lojista não tiver mexido na página.
2. **Sem prévia na criação da loja.** A prévia (W3) lê os produtos e as cores de uma loja que existe. Na criação há só nome e descrição do modelo. Uma prévia com dados de exemplo pediria um conjunto de amostra que o épico decidiu não ter (decisão 4: sem banco de imagens).
3. **Não há como desfazer um modelo aplicado.** Aplicar troca o rascunho inteiro (decisão 1); o histórico só guarda o que foi publicado. Um rascunho não publicado que foi substituído se perde, e a confirmação avisa. Um "desfazer" pediria guardar o rascunho anterior.
4. **Nenhum modelo pede categoria.** O vocabulário (`needs: CATEGORY`), as duas recusas (`PAGE_CATEGORY_REQUIRED`, `PAGE_CATEGORY_INVALID`) e as frases existem desde o W2, sem modelo que os alcance e sem e2e pela rota. A galeria, "Nova landing" e a criação deixam de fora um modelo que peça categoria, porque não têm campo para escolhê-la.
5. **A criação de site não escolhe modelo.** O catálogo tem um só para site (`servicos-b2b`); `GET /api/page-templates?storeType=INSTITUTIONAL` já o lista, e o passo do formulário só aparece para loja online. Um segundo modelo de site pediria mostrar o passo para site também.
6. **A galeria só aplica na página aberta no editor.** "Modelos" na linha de outra página leva ao editor dela (W5). E a 390 px o nome do modelo na prévia grande é cortado ao lado dos botões.
7. **As categorias indicadas são um primeiro palpite**, escritas na entrada de cada modelo (W1, W6). Não há dado de uso por trás, nem tela para mudá-las.
8. **Um modelo novo no catálogo precisa de três lugares**: a entrada na API, o nome e a descrição nos locales do `packages/ui`, e um ícone em `landing-template-picker.tsx` ou `store-opening-template.tsx`. Sem os dois últimos ele é deixado de fora das telas, em silêncio, por desenho (um cartão sem nome não é escolha). Não há teste que avise que os três estão desalinhados.
9. **O defeito do botão "Continuar" → "Criar loja"** (acima) foi corrigido sem teste automático. Um teste de navegador (Playwright) da criação de loja o cobriria; a suíte e2e do web não foi rodada no W5 nem no W7.
10. **Tema escuro, inglês no navegador, leitor de tela e Storybook** não foram exercitados no W4, no W5 nem no W7: há testes com axe e stories que compilam.

## Acréscimo: as quatro criações no navegador

Depois da lista acima, a criação foi repetida cruzando as larguras: `w7-capa-grande` (1280 px, "Vitrine com capa", `"template":"vitrine-com-capa"` no corpo) e `w7-padrao-celular` (390 px, sem abrir a escolha, sem `template`). Com as duas anteriores, há uma loja com a página padrão e uma com modelo em cada largura. As cinco lojas `w7-*` ficaram no banco de desenvolvimento.
