# BEELINK-308 (I14) — seção Categorias: cartão só com a arte, sem o nome por cima

> Épico I (modo design). Referência do dono: a fileira de quadrados de categoria da home de matconcasa.com.br — cada quadrado é uma arte pronta, que já traz as palavras ("Ferramentas Elétricas até 41% OFF"), e o site não escreve nada por cima. A pilha fica `main` → **I14** → B18 (banner da categoria, BEELINK-307).

## O problema

A seção "Categorias" usa a imagem da categoria (`PublicProductCategory.imageUrl`, enviada no formulário de categoria do painel), mas sempre escreve o nome da categoria junto. Com uma arte que já carrega o próprio texto, o nome é dito duas vezes.

## Definição de Pronto

1. No modo design, a aba Layout de uma seção Categorias tem a escolha "Estilo do cartão": **Foto com nome** (o de hoje, o padrão) ou **Só a arte**. A escolha só aparece nos formatos com foto (trilho e grade); em "Etiquetas" não há imagem e ela some.
2. Toda página que já existe desenha exatamente como antes: uma linha salva antes da escolha guarda `null`, que é "foto com nome", e nenhum dado é reescrito.
3. Em "Só a arte" o cartão é um quadrado só com a imagem, nada desenhado por cima nem embaixo; o nome da categoria é o nome acessível do link; o cartão tem anel de foco visível e os cantos do cartão da loja.
4. Funciona no trilho e na grade, em toda fatia da faixa (inteira, dois terços, metade, um terço) e a 390 px.
5. Uma categoria sem imagem, em "Só a arte", é desenhada do jeito "foto com nome" (a inicial sobre a cor da loja e o nome) — nunca um quadrado vazio, nunca escondida. O formulário diz isso em uma linha de ajuda e diz o tamanho recomendado da imagem.
6. A escolha atravessa a rede tipada uma vez (`packages/contracts`), é validada pela API (valor fora da lista recusado; valor numa seção que não é Categorias recusado), fica no rascunho, é publicada por Publicar, congelada na versão publicada, restaurada por "restaurar versão", copiada por "duplicar" e aparece na prévia do editor antes de publicar.
7. Um documento publicado antes desta entrega (sem o campo) continua sendo lido inteiro.
8. Copy pt-BR nos arquivos de locale, com o par em inglês; stories dos dois estilos; testes.
9. `pnpm ci-check` verde.

## Decisões

Tomadas pelo assistente; o Rafael pode mudar qualquer uma.

1. **Categoria sem imagem em "Só a arte" (o ticket diz "definir"): é desenhada do jeito "foto com nome".** Um lojista que ainda não enviou todas as imagens continua vendo todas as categorias. Consequência aceita: numa grade mista, o cartão sem imagem é mais alto que os quadrados (tem o nome embaixo).
2. **Um campo próprio do componente, `cardStyle: "PHOTO_WITH_NAME" | "ART_ONLY" | null`, e não valores novos de `display`.** As opções de um componente são colunas (`display`, `columns`, `align`, `visibleOn`), não um JSON; e o estilo é ortogonal ao formato — vale para trilho e para grade. `ART_RAIL`/`ART_GRID` em `display` dobrariam a lista a cada formato novo. Por isso **há migration**: um enum `CategoryCardStyle` e a coluna anulável `store_components."cardStyle"`, sem default e sem reescrever linhas.
3. **`null` é "foto com nome"**, como `align` nulo é "o hábito do tipo". Nenhuma linha existente muda, e a comparação "há algo a publicar?" trata `null` e `PHOTO_WITH_NAME` como o mesmo desenho.
4. **A API recusa `cardStyle` não nulo num tipo que não é `CATEGORIES`** (`COMPONENT_CARD_STYLE_INVALID`, código novo na união `PageErrorCode`), pela razão escrita em `refuseDisplayFor`: um valor guardado para ninguém ler. Em `CHIPS` ele é aceito e guardado: trocar o formato e voltar não perde a escolha, como o resto do Layout.
5. **O documento da versão publicada continua `format: 1`**: o campo é lido com `null` quando ausente. Subir para `format: 2` faria um deploy anterior descartar a página inteira; um campo opcional custa nada a quem não o conhece.
6. **No contrato público o campo é opcional** (`PublicComponent.cardStyle?`), como `visibleOn`: uma página em cache de antes do deploy não o traz, e desenha foto com nome.
7. **A escolha mora na aba Layout**, ao lado de Formato, e portanto espera o Publicar como o resto do Layout.
8. **Tamanho recomendado: quadrada, 600 × 600 px.** O maior quadrado que a vitrine desenha é o da grade de 2 colunas numa faixa inteira no computador (cerca de 570 px de lado); no trilho o quadrado tem 144, 176 ou 208 px. A conferir no navegador e corrigir aqui se o número for outro.
9. **No trilho, o quadrado da arte é um pouco mais largo que o cartão com nome** (144/176/208 px contra 128/160/192): a arte carrega palavras, e a 128 px elas não se leem.
10. **Os modelos de página (templates) não ganham o estilo**: nenhum modelo abre com "Só a arte", porque uma loja nova não tem arte nenhuma. Eles passam a dizer `cardStyle: null` onde enumeram os campos.

## Fora do escopo

- O banner largo no topo da página da categoria (BEELINK-307, o próximo da pilha).
- Uma segunda imagem só para a arte: o cartão usa a imagem que a categoria já tem.
- A faixa de categorias sob o cabeçalho, o filtro da listagem e a página "todas as categorias": só a seção do modo design.
- Recorte ou edição da imagem no envio.

## Notas da entrega (acréscimo, 07/10)

**Correção à decisão 8.** O maior quadrado medido no navegador é de **602 px** (grade de 2 colunas, faixa inteira, tela de 1280 px; a faixa não passa de 1216 px, então é o teto), e não "cerca de 570". O tamanho recomendado fica **600 × 600 px**. No trilho o quadrado mede 144 px (390), 176 px e 208 px (1280).

**Onde ficou cada coisa.**

- Contrato: `CategoryCardStyle`, `StoreComponent.cardStyle`, `PublicComponent.cardStyle?`, `CreateComponentPayload.cardStyle?` e `COMPONENT_CARD_STYLE_INVALID` em `packages/contracts/src/page.ts`.
- Migration `20261007190000_category_card_style`: enum `CategoryCardStyle` e coluna anulável `store_components."cardStyle"`.
- API (`apps/api/src/modules/page/`): `CATEGORY_CARD_STYLES` (`page.constants.ts`), `refuseCardStyleFor` (`page.rules.ts`), DTO e respostas (`dto/`), linhas (`page-rows.ts`: criar, patch, duplicar), mapeadores, documento da versão (`page-document.ts`), restauração (`page-restore.ts`) e modelos (`page-template-arrange.ts`).
- UI: `blocks/storefront/storefront-category-art.tsx` (o quadrado), `storefront-category-card.tsx`, `-rail.tsx`, `-grid.tsx`; `blocks/design/card-style-field.tsx` na aba Layout (`component-layout-fields.tsx`); copy em `locales/pt-BR.ts` e `en.ts` (`design.cardStyle`).
- Web: `components/design/component-layout.ts`, `design-draft.ts`, `use-design-draft.ts`, `design-draft-preview.ts`; `components/storefront/storefront-categories-block.tsx`.

**Cobertura da Definição de Pronto.**

| # | Evidência |
|---|---|
| 1 | `packages/ui/src/blocks/design/component-layout-fields.test.tsx` — "offers the categories a card of photo and name, or of the artwork alone"; "asks no card style of the pills…" |
| 2 | `apps/api/test/page-category-card-style.e2e-spec.ts` — "opens as the photo with its name: null…"; `apps/web/src/components/storefront/storefront-sections.test.tsx` — "keeps the name under the photo where the style is unset, null or absent"; `component-layout.test.ts` — "reads an unset card style as the photo with its name…" |
| 3 | `storefront-category-rail.test.tsx` e `-grid.test.tsx` — "draws the picture and nothing else, and the link answers to the category's name" (nome acessível, sem texto, `aspect-square`, anel de foco, `rounded-xl`) e o axe; no navegador, `outline: solid 2px` com 2 px de afastamento no foco pelo teclado |
| 4 | `storefront-sections.test.tsx` — "draws the picture alone in a RAIL / GRID…"; navegador a 1280 e 390 px, faixa inteira e metade, sem rolagem horizontal da página |
| 5 | `storefront-category-rail.test.tsx` e `-grid.test.tsx` — "draws a category with no picture as the card with its name, never an empty square"; `component-layout-fields.test.tsx` — "says, under the artwork alone, the file to make and what a category with no picture does" |
| 6 | `page-category-card-style.e2e-spec.ts` — rascunho e Publicar ("holds the choice in the draft, and serves it only once published"), duplicar, restaurar, recusas; `design-draft.test.ts` — "publishes the card style of a categories block, and none for any other kind", "draws the card style the draft holds, not the one saved"; `page.mapper.spec.ts` — "carries cardStyle to the owner and to the shop window alike…" |
| 7 | `apps/api/src/modules/page/page-document.spec.ts` — "reads a block frozen before the card style existed, as the photo with its name" |
| 8 | `locales/pt-BR.ts`/`en.ts`; stories `SoAArte` e `SoAArteNoCelular` (trilho e grade), `Categorias` e `CategoriasSoAArte` (aba Layout) |

**O que o navegador mostrou** (Chromium sem janela, web em :4100 e API em :4101, banco `harness_offers`; as imagens das categorias são URLs públicas de `placehold.co` gravadas pela API — o envio pelo painel não foi exercitado).

- Loja publicada, 1280 e 390 px: a seção "foto com nome" continua com nome e contagem; nas seções "só a arte" (trilho, grade de 4, grade de 2 na faixa inteira, e metade + metade) cada categoria com imagem é um quadrado só com a arte, e "Jardim", sem imagem, aparece com a inicial e o nome.
- Editor: na aba Layout de uma seção Categorias, "Estilo do cartão" abre em "Foto com nome"; ao escolher "Só a arte" a prévia troca na hora, a barra passa a dizer "Alterações não publicadas", e a loja publicada continua escrevendo o nome até o Publicar.

**Visto e deixado como está.** Numa seção "só a arte", o cartão da categoria sem imagem tem a margem interna do cartão com nome (8 px), então o quadrado dele fica um pouco menor e desalinhado dos quadrados de arte ao lado. É o estado transitório de uma loja que ainda não enviou todas as artes; igualar os dois pede redesenhar o cartão com nome.
