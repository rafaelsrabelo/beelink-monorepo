# BEELINK-261 (W2) — aplicar um modelo substitui o rascunho, nunca o que está publicado

> Épico W (BEELINK-259), "Templates do modo design". Segundo ticket da pilha: `main` → W1 → **W2** → W3 → … → W7.
> Plano anterior: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md).

## O problema

Um modelo só é gravado na criação de uma página. O lojista que já tem a página não tem como trocá-la por um modelo: teria de apagar faixa por faixa. O W1 deixou o catálogo (`template-catalog.ts`); falta a escrita que troca o rascunho de uma página que já existe.

## Definição de Pronto

1. `POST /api/stores/:slug/pages/:pageId/apply-template` responde só ao dono (401 sem sessão, 403 na loja de outro, 404 na página de outra loja).
2. O corpo (`ApplyTemplatePayload`, em `packages/contracts`) leva o id do modelo e, quando o modelo precisa, o produto ou a categoria.
3. A troca é uma transação, sob a trava da loja e a revisão do rascunho: `x-page-revision` velho responde `409 PAGE_DRAFT_STALE` e nada muda; uma troca aceita soma um à revisão.
4. Substitui faixas e blocos e **não publica**: a página pública (a inicial e a landing) lida antes e depois é a mesma, nenhuma versão nova é criada, o status e o SEO da página não mudam.
5. Na inicial, a barra de aviso continua a mesma (o mesmo id, o mesmo texto) e continua única; a inicial de uma loja online sai com uma vitrine.
6. Recusas com código próprio: modelo que não vale para o tipo de loja ou de página (`PAGE_TEMPLATE_UNAVAILABLE`), modelo de produto sem produto (`PAGE_PRODUCT_REQUIRED`), produto de outra loja (`PAGE_PRODUCT_INVALID`), e o par da categoria.
7. Nenhum lead é apagado nem fica com chave quebrada; a decisão sobre o vínculo está registrada aqui.
8. Loja sem produto, sem foto ou sem categoria: o modelo é aplicado sem faixa vazia e sem id que não existe.
9. A resposta é o rascunho (`PageDraft`), com a revisão nova, como o restaurar devolve.
10. Testes unitários da regra pura e e2e da rota; a rota está em `apps/api/docs/README.md`; `pnpm ci-check` verde.

## O que o código já faz (lido antes de decidir)

- `page-restore.ts` (`restoreDocument`) troca o rascunho inteiro por um documento, **mantendo os ids** que o documento nomeia e apagando o resto. É o que o restaurar de versão usa, sob `rules.lockShop` e `touchDraft`.
- O lead aponta para o bloco de contato por `componentId`, com `onDelete: SetNull` (`leads.prisma`): apagar o bloco nunca apaga o lead, só o deixa sem formulário.
- O formulário que um visitante envia é lido **da versão publicada**, não do rascunho (`leads.service.ts`): se o bloco sumiu do rascunho, o lead novo entra com `componentId` nulo. Logo, trocar o rascunho não quebra o formulário que está no ar.
- A regra da vitrine obrigatória (`REQUIRED_COMPONENT_KINDS`) conta as vitrines da inicial; um site (`INSTITUTIONAL`) nasce sem nenhuma e vive assim.

## Decisões

1. **Aplicar é restaurar um documento montado na hora.** As faixas do modelo viram um `PageDocument` (`page-template-arrange.ts`, função pura) e quem grava é o mesmo `restoreDocument` do restaurar de versão. Uma escrita só para "trocar o rascunho inteiro", com a mesma trava e a mesma revisão. O W3 lê esse mesmo documento pelo resolvedor da vitrine, sem gravar.
2. **O bloco de contato herda o id do formulário que já estava no rascunho.** É o que o restaurar faz (mantém o id para o lead não perder o vínculo): se o modelo traz um formulário e o rascunho já tinha um, o novo ocupa a linha do antigo, em ordem (primeiro com primeiro). Os leads antigos continuam apontando para um formulário que existe, e os que chegarem pelo formulário ainda publicado também. Os campos passam a ser os do modelo; cada lead guarda o rótulo com que foi perguntado, então continua legível. **Se o modelo não traz formulário**, o bloco sai do rascunho e os leads ficam com `componentId` nulo, pela chave estrangeira — exatamente o que acontece ao apagar o bloco ou ao restaurar uma versão sem ele. Nenhum lead é apagado em nenhum dos casos.
3. **A barra de aviso é da loja, não do modelo.** Na inicial, a faixa que a segura fica como está (mesmos ids), em primeiro; um modelo que trouxesse uma barra perde a dele quando a loja já tem a sua, e nunca grava mais de uma. Numa landing, a barra de um modelo é descartada (a regra `COMPONENT_KIND_HOME_ONLY`). Nenhum modelo de hoje traz barra; é a guarda para o W6.
4. **A vitrine é garantida só onde é obrigatória: a inicial de uma loja online.** Se o modelo não trouxer uma `PRODUCTS`, a faixa de vitrine da página padrão (`RAIL`, todos os produtos) entra no fim. Um site não ganha vitrine. Hoje nenhum modelo vale para a inicial de loja online (decisão 7 do W1), então isto é coberto por teste unitário e fica pronto para o W6.
5. **Uma função decide o que vale e monta o assunto, para criar, aplicar e pré-visualizar** (`page-template-choice.ts`): `refuseUnavailable` (tipo de loja e de página) e `subjectOf` (produto, categoria), tiradas de `PagesService`, que passa a chamá-las. As mensagens e os códigos da criação de landing não mudam.
6. **Categoria: o vocabulário já existe (`needs: CATEGORY`), então a recusa também.** Dois códigos novos, `PAGE_CATEGORY_REQUIRED` e `PAGE_CATEGORY_INVALID`, espelhando os do produto. Uma categoria escondida é recusada como inválida: não é uma coleção que alguém possa visitar. Nenhum modelo declara `CATEGORY` ainda; o caminho é coberto por teste unitário. `productId` e `categoryId` são ignorados por um modelo que não os pede, como a criação de landing já faz com o produto.
7. **Um id de modelo desconhecido é `400 PAGE_TEMPLATE_UNAVAILABLE`**, pelo DTO, como na criação de landing.
8. **As leituras do assunto acontecem dentro da transação, depois da trava.** A categoria de uma vitrine é chave estrangeira; lida antes da trava, uma categoria apagada no intervalo viraria um 500.
9. **O SEO da página não é tocado.** A criação grava a foto da capa em `seoImageUrl`; aplicar não, porque a página pode estar publicada e o SEO não tem rascunho.
10. **A rota mora no `PageVersionsController`** (`stores/:storeSlug/pages/:pageId`), ao lado de publicar e restaurar: é mais uma escrita do rascunho, com o mesmo cabeçalho de revisão e o mesmo limite de escrita. A regra fica num serviço próprio, `PageTemplateApplyService`.
11. **Os ids novos são `randomUUID`**, como o restaurar já usa para uma linha que não pode manter o seu.

## Fora do escopo

A prévia (W3), a galeria e a confirmação na tela (W4/W5), modelos novos de inicial (W6), escolher modelo ao criar a loja (W7). O BFF do web continua para o W4.

## Para os próximos tickets

### W3 — a prévia

`templateDocument(db, { storeId, page }, { template, productId, categoryId })` (`page-template-choice.ts`) devolve o `PageDocument` que aplicar gravaria, já com as recusas, a barra de aviso mantida, a vitrine garantida e os ids do formulário. Não grava nada: é só leitura. A prévia é resolver `servedSectionsOf(document)` com `lookupsOf` e `toPublicSection`, como `LandingReadService` faz com uma versão. Não repita as recusas.

### W4 e W5 — a galeria e o botão de aplicar

```
POST /api/stores/:slug/pages/:pageId/apply-template
x-page-revision: <a revisão que o editor leu>          (opcional, como nas outras escritas)
{ "template": "lancamento", "productId": "<uuid>" }    (ApplyTemplatePayload)
→ 200 PageDraft                                         (a mesma forma de GET …/draft; revision = a enviada + 1)
```

- `pageId` é obrigatório aqui, inclusive para a inicial (o editor já o tem em `PageDraft.page.id`).
- A resposta substitui o rascunho que o editor tem em memória: faixas, blocos e revisão. `hasUnpublishedChanges` vem `true`.
- Erros para a tela tratar: `409 PAGE_DRAFT_STALE` (recarregar), `400 PAGE_PRODUCT_REQUIRED` (pedir o produto), `400 PAGE_PRODUCT_INVALID`, `400 PAGE_TEMPLATE_UNAVAILABLE`. As palavras já estão em `apps/web/src/locales`, inclusive as dos dois códigos de categoria.
- A confirmação "isto substitui o rascunho inteiro" é da tela (decisão 1 do épico); a API não pede.
- Depois de aplicar, os ids das faixas e dos blocos são novos, menos o da barra de aviso e o do formulário de contato. Seleção e foco guardados por id no editor deixam de valer.

### W6 — modelo de página inicial para loja online

- Um modelo sem `PRODUCTS` ganha a vitrine padrão no fim (`arrangedDocument`). Se o modelo quiser a vitrine em outro lugar, traga a sua.
- Um modelo que traga `ANNOUNCEMENT` só a grava numa inicial que ainda não tem barra.
- `page-template-arrange.spec.ts` já percorre todo modelo do catálogo em toda página em que ele vale e confere as regras da página; o modelo novo entra sem editar o teste.
- O primeiro modelo com `needs: ['CATEGORY']` torna alcançáveis `PAGE_CATEGORY_REQUIRED` e `PAGE_CATEGORY_INVALID` pela rota: acrescente o e2e junto.
