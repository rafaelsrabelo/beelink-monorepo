# BEELINK-263 (W4) — a galeria de modelos, com a prévia na loja do lojista

> Épico W (BEELINK-259), "Templates do modo design". A pilha é `main` → W1 → W2 → W3 → W6 → **W4** → W5 → W7: o W6 veio antes para a galeria ter modelos de página inicial para mostrar.
> Planos anteriores: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md), [BEELINK-261](2026-10-06--BEELINK-261--aplicar-modelo.md), [BEELINK-262](2026-10-06--BEELINK-262--previa-do-modelo.md) e [BEELINK-265](2026-10-06--BEELINK-265--modelos-de-pagina-inicial.md).

## O problema

A API lista os modelos de uma página e desenha a prévia de cada um com os dados da loja, mas nenhuma tela mostra isso. O lojista não tem onde escolher um modelo olhando.

## Definição de Pronto

1. Handlers do BFF para listar os modelos e para a prévia, na via do admin, com teste; requests e hooks do TanStack Query.
2. Bloco da galeria em `packages/ui/src/blocks/design`, com story e teste: um cartão por modelo com nome, descrição, selo de "indicado", o que o modelo pede e a prévia.
3. A prévia é desenhada pelo renderizador real da loja, em miniatura; só é pedida e desenhada quando o cartão aparece na tela, com skeleton enquanto carrega e uma falha por cartão que não derruba os outros.
4. Filtro "indicados para a sua loja".
5. Um modelo que pede produto mostra a escolha do produto antes da prévia.
6. Skeleton, vazio e falha da lista.
7. A galeria abre de uma entrada "Modelos" na barra do editor. Escolher um modelo o marca como selecionado e mostra a prévia grande. Não aplica: fica o ponto de encaixe para o W5.
8. Acessível por teclado, com foco preso no diálogo, rótulos e papéis; a 390 px os cartões empilham.
9. Usada no navegador a 1280 e a 390 px, numa loja com produtos e fotos, numa loja vazia e num site, com capturas.
10. Testes do bloco, da tela, dos helpers e dos handlers; mapas de superfície; `pnpm ci-check` verde.

## Decisões

1. **Diálogo de tela cheia, como a galeria de seções** (`section-gallery.tsx`), e não rota própria: o editor já abre a galeria de seções, "Nova landing" e "Publicar" como diálogos sobre a tela, e o estado de qual está aberto mora em `stores/design-pages.ts`. A galeria de modelos entra ali (`kind: "templates"`).
2. **Dois painéis onde há espaço, um onde não há.** A partir de `lg`, os cartões ficam numa coluna à esquerda e a prévia grande do modelo escolhido à direita. Abaixo disso há uma coluna só: os cartões empilhados e, ao escolher um, a prévia grande no lugar da lista, com "Voltar aos modelos".
3. **O bloco não busca nada.** `TemplateGallery` recebe a lista e o estado dela, e pede a prévia de cada cartão por `renderPreview(template, size)`, que só é chamado depois que o cartão apareceu na tela (`IntersectionObserver`; onde ele não existe, o cartão conta como visível). Quem chama a API é a tela: um componente por prévia (`TemplatePreview`, no web) lê o hook e desenha o estado com `TemplatePreviewFrame`, do bloco. A falha de uma prévia fica no cartão dela.
4. **A prévia do cartão e a grande são a mesma consulta** (mesma chave: loja, modelo, página, produto). O cartão desenha só as faixas, na largura de um computador, encolhidas; a grande desenha a página inteira com o cabeçalho e o rodapé da loja quando a página os usa, na largura de um computador onde há espaço e na de um celular onde não há.
5. **As prévias são inertes** (`inert`): são o renderizador real, com links, botões e um formulário de contato que não devem receber foco nem enviar nada. O que as descreve para um leitor de tela é o nome e a descrição do modelo, ao lado. A área de rolagem da prévia grande recebe foco, para rolar pelo teclado.
6. **Um produto para a galeria inteira.** Quando algum modelo listado pede produto, a galeria mostra uma busca de produto acima dos cartões (o mesmo `OptionSearch` de "Nova landing", com a mesma consulta de produtos ativos). Até um ser escolhido, o cartão de um modelo que pede produto diz "Escolha um produto para ver a prévia" e não chama a API. Um seletor por cartão repetiria a mesma lista quatro vezes.
7. **Nenhum modelo pede categoria** (decisão do W6), então a galeria não tem seletor de categoria. `needs` com `CATEGORY` é tratado como "pede algo que esta tela não sabe escolher": o cartão diz que a prévia não está disponível, em vez de chamar a API para ser recusada.
8. **O filtro é um interruptor**, "Indicados para a sua loja", que só aparece quando a lista tem algum indicado e algum não indicado: sem isso ele não filtraria nada. A ordem é a da API (indicados primeiro).
9. **Selecionar é um botão por cartão** (`aria-pressed`), não o cartão inteiro: um cartão de figura e texto lido como um botão só diz tudo de uma vez, como a galeria de seções já explica.
10. **O ponto de encaixe do W5 é `onApply`**, uma prop opcional do bloco. Sem ela (este ticket) a prévia grande não tem botão de aplicar. Com ela, o bloco desenha "Usar este modelo" no cabeçalho da prévia grande e chama `onApply(template)`; `applying` desabilita o botão. A tela (`template-gallery.tsx`, no web) já tem o modelo, a página e o produto escolhidos: o W5 liga `onApply` ao `POST …/apply-template`.
11. **Os nomes dos modelos vêm de `design.pages.form.templates`**, onde já estão. Um id que a API devolva e os locales não conheçam é deixado de fora da galeria: um cartão sem nome não é uma escolha.
12. **Nada é revalidado nos handlers**: as duas rotas são de leitura.

## Fora do escopo

Aplicar o modelo e a confirmação (W5); escolher modelo ao criar a loja (W7); trocar o dispositivo da prévia grande dentro da galeria.
