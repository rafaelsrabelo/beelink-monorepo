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
