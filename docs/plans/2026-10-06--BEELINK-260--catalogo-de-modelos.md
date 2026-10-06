# BEELINK-260 (W1) — um catálogo só para os modelos de página

> Épico W (BEELINK-259), "Templates do modo design". Primeiro ticket da pilha: `main` → **W1** → W2 → … → W7.

## O problema

Um "modelo" hoje são faixas prontas (`SeededBand[]`) gravadas uma vez, na criação. Há dois vocabulários, cada um com o seu arquivo e o seu caminho:

- `PageTemplateId = "servicos-b2b"` (`page-templates.ts`), lido por `stores/store-opening.ts` ao criar um site;
- `LandingTemplateId` com quatro ids (`landing-templates.ts`), lido por `pages.service.ts` ao criar uma landing.

Onde cada um vale está espalhado: `SITE_TEMPLATE_IDS` e `PRODUCT_TEMPLATE_IDS` em `landing-templates.ts`, um `if` em `store-opening.ts`. Não há como perguntar "quais modelos valem para esta página desta loja".

## Definição de Pronto

1. Existe um catálogo único na API; cada entrada diz id, tipos de página, tipos de loja, categorias indicadas, o que precisa (produto, categoria) e a função que monta as faixas.
2. "servicos-b2b" e os quatro de landing estão no catálogo, e criar site, criar loja e criar landing gravam exatamente as mesmas faixas de antes. Os testes existentes passam sem mudança.
3. `GET /api/stores/:slug/page-templates?pageId=` responde só ao dono, com os modelos da página (a inicial quando `pageId` falta), filtrados pelo tipo de loja, os indicados para a categoria da loja primeiro, e o que cada um precisa. Não aplica nada e não devolve faixas.
4. Os formatos da rota estão em `packages/contracts`; os ids antigos continuam válidos.
5. Onde mora o nome e a descrição de cada modelo está decidido e registrado.
6. Testes unitários do catálogo e e2e da rota.
7. A rota está na tabela de `apps/api/docs/README.md`.
8. `pnpm ci-check` verde.

## Decisões

1. **O catálogo é `apps/api/src/modules/page/template-catalog.ts`**, um `Record<TemplateId, …>`: um id novo no contrato não compila até ter entrada, e um id não pode aparecer duas vezes. A ordem das chaves é a ordem em que a galeria os mostra.
2. **Os montadores não mudam de arquivo.** `page-templates.ts` (as faixas do site) e `landing-templates.ts` (as das landings) ficam como estão; o catálogo aponta para eles. É o que garante "nada muda": o diff nesses arquivos é só a saída de `SITE_TEMPLATE_IDS` e `PRODUCT_TEMPLATE_IDS`, que viraram `storeTypes` e `needs` no catálogo.
3. **Um caminho de aplicação.** `store-opening.ts` e `pages.service.ts` passam a pedir o modelo ao catálogo (`templateOf(id).bands(subject)`) em vez de chamar cada arquivo. As recusas (`PAGE_TEMPLATE_UNAVAILABLE`, `PAGE_PRODUCT_REQUIRED`) leem `storeTypes` e `needs` da entrada, com as mesmas mensagens.
4. **Toda função de montar recebe o mesmo `TemplateSubject`** (título, produto, categoria, promessas da loja, fim da oferta) — o `LandingSubject` de antes, com outro nome. Um modelo que não precisa de nada ignora o que não usa. `shopSubject()` monta o assunto de quem não escolheu produto.
5. **Os dois tipos antigos ficam.** `PageTemplateId` ainda tipa `CreateStorePayload.template` e `LandingTemplateId` ainda tipa `CreateLandingPayload.template`. O contrato ganha `TemplateId` (a união), `TemplateNeed` e `PageTemplateSummary`.
6. **Nome e descrição moram nos locales do `packages/ui`, não na API**, como os quatro de landing já fazem (`design.pages.form.templates`): texto de interface só nos locales, em pt-BR e en. A API devolve o id e o cliente procura as palavras. Para que nenhum modelo do catálogo fique sem nome, este ticket acrescenta "servicos-b2b" a esse mesmo registro, que já é indexado por id. O `packages/ui` não depende de `packages/contracts`, então o tipo do registro repete os ids por extenso, como já fazia.
7. **A página padrão da loja online (`defaultPage`) não entra no catálogo.** O ticket migra cinco modelos; a página padrão não é escolhida por ninguém hoje, e a decisão 5 do épico a mantém até o W7. Consequência: para a página inicial de uma loja online a rota responde lista vazia até o W6.
8. **As categorias indicadas são slugs de `store_categories`** (`prisma/seed/store-categories.sql`), escritos na entrada. São um primeiro palpite e só ordenam (decisão 3 do épico): `servicos-b2b` → serviços; `lancamento` → suplementos, eletrônicos, beleza; `promocao-relampago` → alimentação, padaria, doces e bolos, bebidas, mercado; `colecao` → moda, casa e decoração, petshop; `em-branco` → nenhuma. A rota devolve só `recommended: boolean`; os slugs não cruzam a rede.
9. **`needs` é o que o lojista tem de escolher antes de montar**, não tudo o que o modelo lê. "colecao" pede um produto e tira a categoria dele (e degrada sem ela), então declara só `PRODUCT`. `CATEGORY` existe no vocabulário para o W6 e ninguém o declara ainda.
10. **A rota é um controller próprio**, `stores/:storeSlug/page-templates`, com o `?pageId=` de `PageScopeDto`: página de outra loja ou inexistente responde `404 PAGE_NOT_FOUND`, como nas faixas.
11. **O BFF do web fica para o W4**, que é quem consome.

## Fora do escopo

Aplicar um modelo a uma página que já existe (W2), a prévia (W3), a galeria (W4), modelos novos (W6), escolher modelo ao criar a loja (W7).

## Para os próximos tickets

### W2 — aplicar um modelo a uma página que já existe

```ts
const template = templateOf(id);                       // template-catalog.ts
if (!template.pageKinds.includes(page.kind) || !template.storeTypes.includes(store.type)) → PAGE_TEMPLATE_UNAVAILABLE
if (template.needs.includes('PRODUCT') && !productId)  → PAGE_PRODUCT_REQUIRED
const bands = template.bands(subject);                 // SeededBand[]
```

- O `subject` é um `TemplateSubject`. O que o monta a partir de um produto está em `PagesService.subjectOf` (privado, lê produto, primeira foto e categoria ativa): o W2 deve extraí-lo para um arquivo que os dois serviços usem, em vez de copiá-lo. Sem produto, `shopSubject(title, paymentMethods, new Date())`.
- `bands` é o mesmo formato que `writeBands(tx, storeId, pageId, bands)` grava. Substituir o rascunho é apagar as faixas da página e chamar `writeBands` na mesma transação, sob `rules.lockShop` e somando `draftRevision` — o molde é `page-restore.ts`.
- **O id do bloco de contato muda** quando as faixas são regravadas, e os leads apontam para ele. O W2 decide o que acontece com os leads de um formulário substituído antes de apagar.
- Na inicial: `bands` de um modelo de landing nunca traz `ANNOUNCEMENT`, e a inicial tem barra única e vitrine obrigatória (`COMPONENT_REQUIRED`). `pageKinds` é o que impede aplicar um modelo de landing na inicial; não o contorne.
- `template.coverImage(subject)` é a foto que a capa desenha; a criação de landing a grava em `seoImageUrl`. Aplicar num rascunho não deve mexer no SEO de uma página publicada.

### W6 — acrescentar um modelo de página inicial

1. Acrescente o id a `TemplateId` em `packages/contracts/src/page-templates.ts` — **na união, não em `PageTemplateId`** (que é o que `POST /stores` aceita para abrir um site) nem em `LandingTemplateId` (o que `POST /pages` aceita). O compilador então exige a entrada no catálogo.
2. Escreva o montador `(subject: TemplateSubject) => SeededBand[]` num arquivo próprio, com as peças de `landing-template-parts.ts` (`cover` degrada para título sem foto; `promises` esconde a faixa vazia).
3. Acrescente a entrada em `TEMPLATES` (`template-catalog.ts`): `pageKinds: ['HOME']`, `storeTypes`, `recommendedFor` (slugs), `needs`, `bands`, `coverImage`.
4. Acrescente nome e descrição em `packages/ui/src/locales/{messages,pt-BR,en}.ts`.
5. `template-catalog.spec.ts` já cobre o modelo novo sem ser editado: todo modelo, com todo assunto, só grava o que o editor aceitaria. Um modelo de inicial para loja online tem de trazer uma vitrine (`PRODUCTS`) e no máximo uma barra de aviso — acrescente esse teste junto com o primeiro modelo.
