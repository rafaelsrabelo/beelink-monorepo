# BEELINK-264 (W5) — aplicar o modelo no rascunho, com confirmação

> Épico W (BEELINK-259), "Templates do modo design". A pilha é `main` → W1 → W2 → W3 → W6 → W4 → **W5** → W7.
> Planos anteriores: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md), [BEELINK-261](2026-10-06--BEELINK-261--aplicar-modelo.md), [BEELINK-262](2026-10-06--BEELINK-262--previa-do-modelo.md), [BEELINK-265](2026-10-06--BEELINK-265--modelos-de-pagina-inicial.md) e [BEELINK-263](2026-10-06--BEELINK-263--galeria-de-modelos.md).

## O problema

A galeria mostra os modelos e a prévia de cada um, mas escolher um só o mostra. A API já sabe trocar o rascunho por um modelo (`POST …/apply-template`, W2); falta a tela chamar, e chamar sem susto: o rascunho muda, a loja não.

## Definição de Pronto

1. Handler do BFF `POST /api/stores/[slug]/pages/[pageId]/apply-template`, na via do admin, com teste: repassa o corpo e o `x-page-revision`, e não revalida nada.
2. Request com `draftWrite` (entra na fila das outras escritas do rascunho e leva a revisão que a aba leu) e a mutation.
3. Na galeria, "Usar este modelo" abre a confirmação. Ela diz que tudo o que está no rascunho da página será substituído, que a loja publicada continua igual até Publicar e, quando o rascunho tem alterações não publicadas, que elas se perdem. O foco começa em "Cancelar".
4. Um modelo que pede produto só pode ser aplicado com o produto escolhido; um que pede o que a galeria não sabe escolher não pode ser aplicado.
5. Aplicado: a galeria fecha, o editor mostra o rascunho novo, um aviso curto diz que o modelo foi aplicado e que falta publicar, e os problemas da página são relidos e mostrados com as mesmas frases do diálogo de Publicar.
6. `409 PAGE_DRAFT_STALE`: o diálogo de conflito que o editor já tem, sem perder a escolha do modelo.
7. Cada recusa da API tem a sua frase nos locales, dita na confirmação.
8. A entrada "Modelos" também na aba Páginas, abrindo a galeria para a página escolhida.
9. Usada no navegador a 1280 e a 390 px: aplicar numa inicial com conteúdo e barra de aviso; a vitrine pública não muda; publicar e ver que mudou; aplicar um modelo de landing com produto; o 409 com duas abas; a loja vazia. Com capturas.
10. Testes dos blocos, da tela, dos helpers e do handler; mapas de superfície; `pnpm ci-check` verde.

## Decisões

1. **A confirmação é um bloco próprio**, `TemplateApplyDialog` (`packages/ui/src/blocks/design`), um diálogo de alerta sobre a galeria. Não é o `ConfirmDelete`: aquele pergunta "Excluir?" com um botão destrutivo, e aqui há três frases a dizer e nada é excluído da loja. "Cancelar" é o primeiro que recebe foco, como lá.
2. **A escrita espera o que ainda está a caminho do rascunho.** O arranjo do editor é salvo um instante depois de cada mudança; aplicar passa pela mesma porta de Publicar (`draft.publish`, que esvazia a fila antes), para que uma gravação atrasada não caia em cima do modelo recém-aplicado com ids que já não existem.
3. **Depois de aplicar, o cache é relido, não escrito à mão.** A resposta é o `PageDraft` novo, mas todas as escritas do editor invalidam `sectionKeys.store(slug)` em vez de remendar o cache ("só a API sabe o que a lista é agora", `page-hooks.ts`), e o restaurar de versão, que é a mesma troca do rascunho inteiro, faz isso e chama `router.refresh()` para as prateleiras da prévia. Aplicar faz igual; o pedido tratava "gravar no cache" como condicional a ser o costume da casa, e não é. A invalidação é devolvida pela mutation, então a lista já é a nova quando a galeria fecha. `templateKeys.all` também cai: a prévia de um modelo depende do rascunho.
4. **O aviso de "aplicado" é uma faixa no editor, não um toast.** Ele carrega a lista de problemas da página, que um toast não segura, e fica até ser dispensado, até a página ser publicada ou até o editor trocar de página. É um bloco (`TemplateAppliedNotice`), desenhado num espaço novo de `DesignEditorFrame` (`notice`), entre a barra e as colunas. Os problemas são os de `GET …/problems`, com as frases de `design.publishDialog.problems`, nomeados como o diálogo de Publicar nomeia (a função saiu de `publish-page.tsx` para `page-problems.ts`, para as duas telas usarem a mesma). Sem problema, o aviso é só a frase. O aviso tem "Publicar", que abre o diálogo de Publicar.
5. **Qual modelo foi aplicado, e em qual página, é estado de interface** e mora em `stores/design-pages.ts`, ao lado de qual diálogo está aberto. Não é dado do servidor.
6. **O 409 mantém a escolha no endereço.** O diálogo de conflito só tem "Recarregar", e recarregar apaga o estado da galeria. O repositório proíbe `localStorage` (`web/no-web-storage`), então, ao receber `PAGE_DRAFT_STALE`, a tela grava a escolha no endereço (`?templates=1&template=<id>&product=<id>`, com `history.replaceState`). Depois de recarregar, o editor lê esses parâmetros, abre a galeria com o modelo e o produto escolhidos e limpa o endereço. Aplicar de novo pede a confirmação de novo, agora sobre o rascunho que a outra aba deixou.
7. **A entrada da aba Páginas usa o mesmo endereço.** A escrita do rascunho leva a revisão da página aberta no editor, então a galeria é sempre da página aberta. "Modelos" na linha da página aberta abre a galeria; na linha de outra página, leva ao editor dela com `?templates=1`, pela guarda de saída (que pergunta antes, se há algo a caminho). A página inicial ganha o menu de três pontos só para isso; uma landing arquivada não oferece modelos.
8. **Quando não dá para aplicar, o botão fica desabilitado e diz por quê**: "Escolha um produto para usar este modelo." ao lado dele. A regra é a mesma da prévia (`canAsk`, de `template-offer.ts`).
9. **As recusas são ditas dentro da confirmação**, pela frase de `pageErrorCopy` (as dos modelos já estavam nos locales desde o W2). A confirmação fica aberta: quem recebeu "Esse produto não é desta loja" cancela e escolhe outro. No 409 a confirmação fecha, porque o diálogo de conflito toma a tela.
10. **A seleção do editor não precisa ser limpa à mão**: `targetOf` já devolve nulo para um id que não está mais no arranjo.

## Fora do escopo

Escolher modelo ao criar a loja e "Nova landing" lendo o catálogo (W7); desfazer um modelo aplicado (o histórico de versões restaura o que estava publicado; o rascunho anterior não publicado se perde, e a confirmação diz isso).
