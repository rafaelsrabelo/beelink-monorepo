# BEELINK-60 — A vitrine desenha grade ou trilho horizontal

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B3 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do B2 ([plano](2026-09-24--BEELINK-59--leitura-resolve-fonte.md)).
> Área: UI + web (e a limpeza que isso obriga na API) · ajuste · M · ordem 9/17.

## O pedido

> Ler `display` na vitrine, reaproveitando `scroll-rail.tsx` em vez de escrever outro. Stories para
> os dois formatos.
>
> - display=trilho rola horizontalmente no celular com snap.
> - display=grade respeita a contagem de colunas.
> - Skeleton nos dois formatos enquanto carrega.

## Definição de Pronto

1. Cada vitrine desenha os **próprios** produtos, os `items` que a leitura pública resolveu no B2,
   e não mais as prateleiras que o web carregava sozinho para a página inteira.
2. `display: RAIL` desenha o trilho (`StorefrontProductRail`, sobre `scroll-rail`), que rola na
   horizontal com snap. `display: GRID` desenha uma grade com as colunas do bloco.
3. A grade respeita `columns`: o número de colunas escolhido numa célula larga, menos numa estreita.
4. O título é o do bloco, ou o nome da categoria de uma vitrine de categoria, ou "Produtos". O
   "ver tudo" leva à categoria numa vitrine de categoria, e ao catálogo nas outras.
5. Há um skeleton para cada formato, com story, e a vitrine da loja o mostra enquanto carrega.
6. O preview do modo design desenha cada vitrine com os produtos dela.
7. O interruptor "agrupar produtos por categoria" deixa de existir, e a loja que o usava passa a ter
   uma vitrine por categoria, que era o que o interruptor desenhava.
8. `pnpm ci-check` verde.

## Decisões

### 1. O web para de carregar prateleiras

`homeAt` montava as prateleiras da página inteira (uma com tudo, ou até seis por categoria), e todo
`PRODUCTS` desenhava as mesmas. Os produtos chegam agora na leitura da loja, por vitrine. `homeAt`,
`HomeBand` e a prop `bands` saem da vitrine, da tela de design e do preview. O que continua sendo
carregado à parte são as categorias, que o bloco de categorias lê.

### 2. O interruptor vira vitrines

`showProductsByCategory` trocava a prateleira única por até seis prateleiras de categoria. Com as
vitrines lendo a própria fonte, o interruptor não teria mais efeito, e um controle no painel que não
muda nada é pior que controle nenhum.

Uma migração converte cada loja com o interruptor ligado. Cada vitrine `ALL` dela vira uma vitrine
por categoria, até seis, na ordem em que as categorias aparecem, com limite de 12, que era o tamanho
de cada prateleira. Depois disso a coluna sai, junto com o campo no contrato, na API, no formulário
de aparência e no web. Na base de desenvolvimento nenhuma loja tem o interruptor ligado.

### 3. A grade é um bloco novo; o trilho é o que já existe

O trilho já é `StorefrontProductRail`, sobre `scroll-rail`, com snap e setas. A grade é
`StorefrontProductGrid`, com o mesmo cabeçalho. As colunas seguem a largura da célula (container
query), como a grade de slides do A5: três colunas num terço seriam cartões pequenos demais.

### 4. O skeleton é da vitrine, e aparece na página da loja

`StorefrontShelfSkeleton` desenha cabeçalho e cartões nos dois formatos. A página da loja ganha um
`loading.tsx`, que é onde "enquanto carrega" acontece: na navegação para a vitrine, antes da leitura
da loja voltar. A regra da casa vale aqui: carregando é skeleton, nunca spinner.

### 5. O preview lê as prateleiras resolvidas

O rascunho do modo design guarda os ids escolhidos, e não os cartões. O preview passa a usar as
prateleiras da leitura pública da loja (que a página de design já carrega), por id de componente.
Mudar a fonte no editor e ver o preview mudar sem recarregar é o B5.

## Fora de escopo

- Categorias com o mesmo `display`: B4.
- O editor da vitrine: B5.
