# BEELINK-262 (W3) — a prévia de um modelo com os dados da loja, sem gravar nada

> Épico W (BEELINK-259), "Templates do modo design". Terceiro ticket da pilha: `main` → W1 → W2 → **W3** → W4 → … → W7.
> Planos anteriores: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md) e [BEELINK-261](2026-10-06--BEELINK-261--aplicar-modelo.md).

## O problema

O lojista só descobre como um modelo fica na loja dele depois de aplicá-lo, e aplicar substitui o rascunho. Falta ver antes: o modelo montado com os produtos, as fotos e as formas de pagamento dele, sem tocar em nada.

## Definição de Pronto

1. `GET /api/stores/:slug/page-templates/:id/preview` responde só ao dono (401 sem sessão, 403 na loja de outro, 404 na página de outra loja).
2. A página vem pela query (`pageId`; sem ela, a inicial), e o produto ou a categoria quando o modelo precisa (`productId`, `categoryId`). O formato da query está em `packages/contracts`.
3. Devolve as seções como a vitrine as lê, no formato que a prévia do editor já consome (`PagePreview`), resolvidas pelo mesmo resolvedor do rascunho: produtos, preços, promoções e endereços de hoje.
4. Nada é gravado: o número de linhas de faixas, blocos, versões e leads é o mesmo antes e depois, e a revisão do rascunho não muda.
5. As mesmas recusas do aplicar, pelos mesmos códigos, sem repetir a regra.
6. O que a prévia mostra é o que aplicar grava: mesmas faixas, na mesma ordem.
7. Testes unitários e e2e; a rota está em `apps/api/docs/README.md`; `pnpm ci-check` verde.

## Decisões

1. **A prévia lê o documento que aplicar gravaria.** `templateDocument` (do W2) já devolve esse documento, com as recusas, a barra de aviso mantida, a vitrine garantida e os ids do formulário. A prévia o resolve como `LandingReadService` resolve uma versão publicada: `servedSectionsOf` → `lookupsOf` → `toPublicSection`. Nenhuma regra é repetida, e a prévia não pode divergir do que será aplicado.
2. **O formato é `PagePreview`**, o mesmo de `GET …/pages/:pageId/preview`: `{ page, sections: PublicSection[] }`. O W4 desenha com o renderizador real, sem formato novo. `page` é a página de verdade (título, `usesChrome`, status), que não muda.
3. **O resolvedor virou uma função**, `servedSections` em `page-resolve.ts`, tirada do método privado de `LandingReadService`, que passa a chamá-la. A prévia do rascunho, a landing pública e a prévia do modelo desenham pela mesma função.
4. **A rota mora no `PageTemplatesController`** (`stores/:storeSlug/page-templates`), que é de leitura, e a regra em `PageTemplatesService`.
5. **`pageId` é opcional e, sem ele, vale a inicial**, como na listagem do W1 (`PageScopeDto`).
6. **Um id de modelo que não existe é `400 PAGE_TEMPLATE_UNAVAILABLE`**, o mesmo código e status que o aplicar responde para o mesmo erro no corpo. Não há um "modelo não encontrado" separado: para a tela é a mesma coisa, o modelo não está disponível.
7. **Sem transação e sem trava.** É só leitura; uma escrita no meio pode dar uma prévia de um instante que não existiu, e a próxima chamada corrige. O aplicar relê tudo sob a trava.
8. **Os ids das seções e dos blocos da prévia são inventados a cada chamada** (menos a barra de aviso e o formulário de contato, que são os do rascunho). Não são linhas: não servem para editar nem para enviar o formulário.
9. **A contagem regressiva de uma promoção é contada a partir do momento da prévia**; ao aplicar, a partir do momento de aplicar. A diferença é o tempo entre os dois cliques.
10. **Faixa escondida não aparece**, como na vitrine: a faixa de vantagens de uma loja sem forma de pagamento é gravada escondida ao aplicar, e a prévia não a desenha.

## Fora do escopo

A galeria e o desenho da prévia (W4), o botão de aplicar e a confirmação (W5), modelos novos (W6), modelo na criação da loja (W7). O BFF do web fica com o W4.

## Para os próximos tickets

### W4 — a galeria com a prévia

**O que chamar**

```
GET /api/stores/:slug/page-templates/:id/preview?pageId=<uuid>&productId=<uuid>&categoryId=<uuid>
→ 200 PagePreview   { page: StorePage, sections: PublicSection[] }
```

- `:id` é o `id` de um item de `GET /api/stores/:slug/page-templates?pageId=` (W1).
- `pageId`: a página em que o modelo seria aplicado. Sem ele, a inicial. Mande sempre o da página aberta no editor.
- `productId`: mande quando `needs` do modelo (na listagem do W1) tiver `PRODUCT`. `categoryId`: quando tiver `CATEGORY` (nenhum modelo pede ainda). Um modelo que não pede ignora os dois. **Não mande a chave vazia** (`?productId=`): é recusada como id inválido.
- Os tipos da query (`TemplatePreviewQuery`) e da resposta (`PagePreview`) estão em `@harness-monorepo/contracts`. Falta o handler do BFF em `apps/web` e a chave do TanStack Query; a chave tem de incluir o modelo, a página e o produto.

**O que recebe**

- `PagePreview` é **exatamente** a forma de `GET …/pages/:pageId/preview`, que o canvas do editor já desenha (`design-preview.tsx`): `sections` entra no renderizador real sem conversão. Produtos, preços, promoções, estoque e endereços vêm resolvidos de hoje.
- `page` é a página de verdade, sem mudança (título, `usesChrome`, status). Use `usesChrome` para decidir a moldura.
- Na inicial, `sections[0]` é a barra de aviso da loja, se ela tem uma: é a de verdade, e continua lá depois de aplicar.
- Uma faixa que o modelo grava escondida (as vantagens de uma loja sem forma de pagamento) **não vem**: a prévia é o que o visitante veria. Depois de aplicar, ela aparece no editor como faixa escondida.
- **Os ids de `sections` e de `components` são inventados a cada chamada.** Sirva-se deles só como `key` de uma renderização; não guarde, não mande de volta, não use para editar. O formulário de contato da prévia não deve enviar nada: desenhe-o sem ação.
- A contagem regressiva de "promocao-relampago" muda a cada chamada (é contada a partir de agora). Não compare duas respostas por igualdade.

**Erros para a tela tratar** (as palavras já estão em `apps/web/src/locales`)

- `400 PAGE_PRODUCT_REQUIRED`: o modelo precisa de um produto e nenhum foi mandado. É o estado "escolha um produto para ver a prévia", não um erro para o usuário. Uma loja sem produto nunca sai dele: ofereça "em-branco" ou o caminho para cadastrar um produto.
- `400 PAGE_PRODUCT_INVALID`: o produto foi apagado ou é de outra loja. Peça outro.
- `400 PAGE_TEMPLATE_UNAVAILABLE`: o modelo não vale para esta página ou não existe. Não acontece se a galeria vier da listagem do W1 com o mesmo `pageId`.
- `404 PAGE_NOT_FOUND`: a página sumiu.

**Depois da prévia, aplicar** é `POST …/pages/:pageId/apply-template` com `{ template, productId }` e o `x-page-revision` do rascunho (plano do W2). O que a prévia mostrou é o que será gravado: as duas rotas montam o documento pela mesma função (`templateDocument`), e o e2e "shows what applying then writes" compara as duas.

### W6 — modelos novos

Um modelo novo aparece na prévia sem tocar em nada daqui. Se ele desenhar um tipo de bloco que resolve algo novo, é `lookupsOf` (`page-resolve.ts`) que muda, para a vitrine e para a prévia ao mesmo tempo.
