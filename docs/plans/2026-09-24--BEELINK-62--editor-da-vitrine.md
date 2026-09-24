# BEELINK-62 — O editor da vitrine escolhe a fonte, e a galeria oferece uma segunda vitrine

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B5 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do B1 ao B4 ([B4](2026-09-24--BEELINK-61--categorias-trilho-ou-grade.md)).
> Área: UI + web · ajuste · M · ordem 11/17.

## O pedido

> Seletor de fonte, formato e limite no editor da vitrine; 'Vitrine de produtos' entra na galeria.
>
> - Dá para criar uma segunda vitrine pela galeria.
> - Escolher a fonte 'categoria' pede qual categoria, com busca.
> - O preview reflete a fonte escolhida sem recarregar.

## Definição de Pronto

1. A galeria oferece "Vitrine de produtos" mesmo quando a loja já tem uma, e escolher cria uma
   segunda, pelo topo ou dentro de uma faixa. Um site continua sem vitrine.
2. O editor da vitrine escolhe a fonte entre todos os produtos, uma categoria, escolhidos a dedo,
   lançamentos e promoção, cada uma explicada em uma frase.
3. A fonte "categoria" pede qual categoria, numa lista com busca.
4. A fonte "escolhidos a dedo" monta a lista com busca, e deixa reordenar e tirar produtos.
5. O editor escolhe trilho ou grade (com colunas na grade) e o limite, de 1 a 48, com vazio
   querendo dizer 24.
6. Salvar fica bloqueado enquanto falta o que a fonte exige: a categoria, ou ao menos um produto. Se
   a API recusar mesmo assim, o editor diz por quê.
7. Depois de salvar ou criar uma vitrine, o preview mostra os produtos da fonte nova sem recarregar
   a página. Enquanto chegam, a vitrine aparece como skeleton no formato dela.
8. `pnpm ci-check` verde.

## Decisões

### 1. O preview muda ao salvar, e não a cada clique

Os produtos de uma vitrine são resolvidos pela API (B2), e a única leitura que os traz é a da loja
pública, que a página de design faz no servidor. Mostrar a fonte nova antes de salvar exigiria um
endpoint para resolver um rascunho de vitrine, que o contrato não tem. Salvar já é o gesto do
editor, então o preview muda ao salvar: a tela pede ao servidor a leitura de novo
(`router.refresh()` numa transição), sem recarregar a página. Enquanto a leitura não volta, a vitrine
editada aparece como `StorefrontShelfSkeleton`, que é o uso que o B3 deixou para ele.

### 2. A busca é da lista que o painel já carrega

As categorias vêm inteiras, e os produtos vêm pela mesma consulta do banner, com até 100. A busca
filtra essa lista no navegador. Uma loja com mais de 100 produtos acha só os 100 primeiros para
escolher a dedo; isso fica anotado em "Fora de escopo".

### 3. Um bloco por pergunta

`ShowcaseFields` organiza a vitrine. A fonte é `ShowcaseSourceField`, a lista buscável é
`OptionSearch` (serve à categoria e aos produtos), a seleção ordenada é `ShowcasePicksField`, e as
colunas saem de `CategoriesFields` para um `ColumnsField` que os dois usam. `component-form.tsx` só
despacha.

### 4. "Lista de produtos" vira "Vitrine de produtos"

Com mais de uma, o nome do tipo passa a ser o do ticket, na galeria, no painel e na mensagem de que
a última não se apaga.

### 5. `design-screen.tsx` volta para baixo de 250 linhas

Ele já passava do limite antes do épico. O cabeçalho (título, publicar, descartar) sai para
`DesignHeader`, e a transição do preview fica num hook próprio.

## Fora de escopo

- Preview da fonte antes de salvar (decisão 1).
- Escolher a dedo numa loja com mais de 100 produtos além dos 100 primeiros.
- "Mais vendidos": depende de pedidos.
