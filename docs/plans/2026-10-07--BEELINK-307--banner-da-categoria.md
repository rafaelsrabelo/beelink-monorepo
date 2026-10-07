# BEELINK-307 (B18) — banner da categoria: uma imagem larga no topo da página da categoria

> Épico B (listagem). Referência do dono: a página de categoria de matconcasa.com.br, que abre com um banner largo entre o caminho ("Início › …") e o título, de cantos arredondados (cerca de 1136 × 150 px numa tela de 1280). A pilha fica `main` → I14 ([BEELINK-308](2026-10-07--BEELINK-308--categorias-so-a-arte.md)) → **B18**.

## O problema

Uma categoria tem uma imagem só — a do cartão — e a página da categoria não mostra imagem nenhuma. O lojista não tem como abrir a página de "Ferramentas" com a arte da campanha de ferramentas.

## Definição de Pronto

1. O formulário de categoria do painel tem um segundo campo de imagem, **Banner da página**, enviado pelo mesmo caminho de upload do campo de imagem, com o tamanho recomendado escrito na ajuda do campo.
2. Salvar grava o banner; limpar o campo o remove; um patch que não nomeia o campo não mexe nele. A API valida o endereço com a mesma regra de `imageUrl` (só http/https).
3. O banner sai na leitura pública do catálogo (`PublicProductCategory.bannerUrl`) e na do painel; o de uma loja nunca aparece em outra.
4. A página da categoria (`/<loja>/<categoria>`) mostra o banner entre o caminho e o título, **numa proporção só em toda largura de tela**, com cantos arredondados, `alt=""`, espaço reservado antes de carregar e carregamento imediato (está acima da dobra).
5. Sem banner, a página fica exatamente como hoje.
6. Uma subcategoria sem banner próprio mostra o da categoria-mãe; com banner próprio, mostra o dela. Uma categoria de primeiro nível sem banner não mostra nenhum.
7. Salvar ou limpar um banner pelo painel derruba o cache do catálogo da loja (`catalog:<slug>`), como toda escrita de categoria.
8. A busca e a listagem "todos os produtos" não mostram banner.
9. Copy pt-BR nos arquivos de locale, com o par em inglês; stories; testes (e2e da API, UI, web).
10. `pnpm ci-check` verde e o e2e completo da API verde.

## Decisões

Tomadas pelo assistente; o Rafael pode mudar qualquer uma.

1. **Subcategoria sem banner próprio (o ticket diz "definir"): mostra o da categoria-mãe.** Uma de primeiro nível sem banner não mostra nenhum. O formulário de uma subcategoria diz isso na ajuda do campo.
2. **Proporção 4:1, uma só em toda largura; arquivo recomendado de 1600 × 400 px.** A referência é mais baixa (perto de 7,5:1), mas ela troca de arte no celular; aqui o arquivo é um só, e a 390 px um 4:1 tem cerca de 90 px de altura — o mínimo para as palavras da arte se lerem — contra 72 px de um 5:1. No computador são cerca de 304 px de altura numa faixa de 1216 px. A razão de ser uma proporção só é a que `storefront-span-shape.ts` registra para os banners da home: uma moldura que muda de forma com a tela corta do mesmo arquivo, no celular, o que mostrava no monitor.
3. **A imagem cobre a moldura (`object-cover`)**: um arquivo na proporção recomendada aparece inteiro; um fora dela perde as bordas, igual em toda tela, em vez de ganhar barras.
4. **`bannerUrl` significa a mesma coisa nas duas leituras: o banner da própria categoria.** A herança da categoria-mãe é resolvida na vitrine, que já tem a categoria e a mãe em mãos (`place.category` e `place.parentCategory`), e não na API. Se a API devolvesse "o banner que a página mostra" na leitura pública, o mesmo campo significaria outra coisa na leitura do painel (que estende a pública), e o formulário de uma subcategoria abriria com o banner da mãe como se fosse dela — e o gravaria nela ao salvar.
5. **Mãe escondida não empresta banner.** A vitrine só conhece as categorias que a loja mostra; uma mãe oculta não está entre elas (o caminho da página também já a omite).
6. **Coluna nova anulável `product_categories."bannerUrl"`**, sem default: há migration, e nenhuma linha é reescrita.
7. **Sem limite de taxa nem regra nova**: o campo entra no DTO que já existe, ao lado de `imageUrl`.
8. **O banner é decorativo (`alt=""`)**: o `h1` logo abaixo já diz o nome da categoria.

## Fora do escopo

- Banner na busca, em "todos os produtos" ou na página "todas as categorias".
- Um arquivo diferente para o celular, link no banner, ou mais de um banner por categoria.
- Recorte da imagem no envio.
- Usar o banner como imagem de compartilhamento (Open Graph) da categoria.

## Notas da entrega (acréscimo, 07/10)

**Onde ficou cada coisa.**

- Contrato: `PublicProductCategory.bannerUrl` e `CreateProductCategoryPayload.bannerUrl?` em `packages/contracts/src/catalog.ts`.
- Migration `20261007200000_category_banner`: coluna anulável `product_categories."bannerUrl"`.
- API: `dto/product-category.dto.ts` (regra `imageUrl`), `product-categories.service.ts` (criar e patch), `catalog.mapper.ts`, `dto/catalog.response.ts`.
- UI: `blocks/storefront/storefront-category-banner.tsx` (a moldura 4:1); `storefront-results-band.tsx` ganhou o lugar `banner`, entre a trilha e o título; `blocks/catalog/category-form.tsx` ganhou o campo; copy em `locales/` (`catalog.categories.bannerLabel`, `bannerHelp`, `bannerHelpChild`).
- Web: `lib/storefront-section.ts` (`bannerOf`, a herança), `components/storefront/storefront-section-band.tsx`; `components/catalog/category-form-values.ts` (o que a tela fazia em funções privadas, agora testável) e `category-screen.tsx` (um segundo `useImageUpload`, para o envio de um campo não aparecer nos dois).

**Cobertura da Definição de Pronto.**

| # | Evidência |
|---|---|
| 1 | `packages/ui/src/blocks/catalog/category-form.test.tsx` — "asks for a wide banner apart from the card's image, and says the size to make"; "sends a picked file through the banner's own upload, and keeps the address it answers" |
| 2 | `apps/api/test/category-banner.e2e-spec.ts` — "has none until one is saved, on create or on an update…"; "leaves it alone on a patch that does not name it, and clears it on null or a blank"; "refuses an address that is not http or https, and keeps what was saved"; `apps/web/src/components/catalog/category-form-values.test.ts` — "sends the banner as saved, and null once the field is cleared" |
| 3 | `category-banner.e2e-spec.ts` — "serves it to a visitor with the catalogue"; "never serves one shop's banner in another, nor lets a stranger write it" |
| 4 | `packages/ui/src/blocks/storefront/storefront-category-banner.test.tsx` (uma proporção só, `alt=""`, `loading="eager"`); `storefront-results-band.test.tsx` — "draws a banner between the trail and the title, on a row of its own"; `apps/web/src/components/storefront/storefront-section-band.test.tsx`; no navegador, 1216 × 304 a 1280 px e 358 × 90 a 390 px (4,000 nas duas) |
| 5 | `storefront-results-band.test.tsx` — "is drawn as it always was with no banner…"; `storefront-section-band.test.tsx` — "draws no picture, and the band as it always was, for a category with none"; no navegador, o título de uma categoria sem banner fica na mesma altura de antes |
| 6 | `apps/web/src/lib/storefront-section.test.ts` — `bannerOf` (4 casos); `storefront-section-band.test.tsx` — "draws a subcategory with none under its parent's"; `category-banner.e2e-spec.ts` — "serves a subcategory its own, or none beside the parent's it falls back on"; `category-form.test.tsx` — "says, on a subcategory, that with none of its own it shows its parent's" |
| 7 | `apps/web/src/app/api/stores/[slug]/product-categories/[categoryId]/route.test.ts` — "forwards … and drops what the shop window kept"; no navegador, salvar e limpar pelo painel mudaram a página na requisição seguinte |
| 8 | `storefront-section.test.ts` — "is none on the search and on the whole catalogue, even narrowed to a category that has one"; `storefront-section-band.test.tsx` — "draws none on the whole catalogue" |
| 9 | `locales/pt-BR.ts`/`en.ts`; stories `Banner da categoria` (3), `Faixa de resultados` (`CategoriaComBanner`, `CategoriaComBannerNoCelular`), `Formulário de categoria` (3) |

**O que o navegador mostrou** (Chromium sem janela, web em :4100 e API em :4101, banco `harness_offers`).

- O Cloudinary deste ambiente não está configurado, então **o envio de arquivo não foi exercitado**: o banner foi gravado com uma URL pública (`placehold.co`, 1600 × 400) pelo handler do BFF do painel, com o cookie da sessão; limpar foi feito no formulário de verdade ("Remover imagem" → "Salvar").
- Categoria com banner: a moldura mede 1216 × 304 px a 1280 e 358 × 90 px a 390 — 4:1 nas duas, a arte inteira, cantos de 18 px, entre a trilha e o título, sem rolagem horizontal.
- Categoria sem banner: o título na mesma posição de antes da entrega (medido antes de gravar o primeiro banner).
- Subcategoria sem banner ("Furadeiras") mostra o da mãe; subcategoria com banner ("Serras") mostra o dela; depois de limpar o da mãe, "Furadeiras" fica sem nenhum e "Serras" continua com o dela.
- "Todos os produtos", `?categoria=ferramentas` e a busca restrita à categoria: sem banner.
- Formulário: o campo "Banner da página" com a moldura 4:1, "Dimensão recomendada: 1600 x 400 pixels." e, numa subcategoria, a frase da herança.

**Visto e não mexido** (já estava assim em `main`): o seletor "Dentro de" do formulário mostra o valor cru `none` em vez de "Nenhuma" quando a categoria é de primeiro nível; e o formulário de categoria abre acima da lista, não numa rota própria.
