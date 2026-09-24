# BEELINK-52 — Publicar `span` e `display` no contrato e aceitá-los na escrita

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A2 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do A1 ([plano](../../apps/api/docs/plans/2026-09-23--BEELINK-51--span-e-display.md)), já na `main`.
> Área: contrato + API · ajuste · P · ordem 2/17.

## O pedido

> Tipos em `packages/contracts`, validação dos dois enums, `POST /sections`, `POST .../components`
> e `PATCH .../components/{id}` aceitando e devolvendo os campos.
>
> - Um PATCH com span inválido responde 400 com errorCode próprio, não 500.
> - A leitura pública devolve span e display em todo componente.
> - O tipo vive só em packages/contracts, sem redeclaração na API nem no web.

## Definição de Pronto

1. `ComponentSpan` e `ComponentDisplay` existem em `packages/contracts`. `PublicComponent` e
   `StoreComponent` carregam `span` e `display`, e `CreateComponentPayload` aceita os dois.
2. Os três endpoints de escrita aceitam `span` e `display`, e a resposta devolve o que foi gravado.
3. Um `span` inválido responde 400 com `errorCode` `COMPONENT_SPAN_INVALID`. Um `display` inválido
   ou num tipo que não o lê responde 400 com `COMPONENT_DISPLAY_INVALID`. Nenhum dos dois chega ao
   banco como 500.
4. A leitura pública e a do painel devolvem `span` e `display` em todo componente.
5. A API e o web importam os dois tipos de `packages/contracts`. Nenhum dos dois os redeclara, e a
   API deixa de importar os enums gerados pelo Prisma para isso.
6. Quem ainda manda `layout` continua funcionando. Se `span` e `layout` chegam juntos, `span` vence.
7. `pnpm ci-check` verde, e o e2e da API cobre o 400 e a leitura pública.

## Decisões

### 1. O `errorCode` próprio sai do DTO, não do service

A validação de entrada desta API mora no DTO, com class-validator; `width` e `align` já são
validados assim. Mover dois enums para um zod no service só para ter um código próprio faria esses
dois campos serem os únicos validados em outro lugar.

Então o `ValidationPipe` global aprende uma coisa: quando a restrição que falhou declara um
`errorCode` no seu `context`, é esse o código da resposta. Sem `context`, nada muda e continua
`BAD_REQUEST`. O ticket fala em "validação zod"; o resultado que ele pede, um 400 com código
próprio, é o mesmo.

### 2. `span` vence `layout`, e `layout` fica no fio marcado como obsoleto

O painel ainda manda `layout` e a vitrine ainda lê `layout`: A4 e A6 trocam os dois. Até lá, a API
aceita os dois campos, e `span` vence quando os dois chegam juntos, porque é o nome do que a coluna
guarda. `layout` ganha `@deprecated` no contrato, e o editor mostra isso em cada leitor que resta.

### 3. `display` é recusado num tipo que não o lê

Seguindo o A1: `display` é lido no `BANNER` e é `null` nos outros. Uma escrita que manda
`display: "GRID"` num `HEADING` responde 400 em vez de gravar um valor que ninguém desenha. A lista
dos tipos que leem mora numa constante, `DISPLAY_KINDS`, que B1 e B4 vão estender.

Num `BANNER`, `display: null` também é recusado: todo banner tem uma escolha desde o A1.

### 4. O web carrega os campos, e não os lê ainda

O preview do modo design monta `PublicComponent` a partir do rascunho. Ele passa a copiar `span` e
`display` do servidor. Ninguém desenha esses campos antes do A4 e do A5, então o seletor "Tamanho"
continua escrevendo `layout` até o A6.

## Fora de escopo

- A faixa desenhar `span`: A4. O banner desenhar `display`: A5. O seletor de largura: A6.
- Remover `layout` do contrato: fica para o último ticket que parar de lê-lo.

## Adendo — 23/09/2026, depois da revisão

Uma revisão independente do diff (três leituras, cada achado verificado por quem tentou refutá-lo)
confirmou um defeito deste ticket e um anterior a ele.

**O eco de `layout` apagava `TWO_THIRDS`.** Este ticket torna `TWO_THIRDS` gravável, e esse valor é
lido como `layout: "FULL"`. O painel manda `layout` em toda escrita: ao renomear um bloco, ou ao
escondê-lo, o `FULL` voltava, era traduzido para `span: FULL`, e a largura de dois terços sumia com
resposta 200. A partir de agora, um `layout` que só repete o que o `span` gravado já lê não muda
nada. Um `layout` diferente continua mudando o `span`.

**`POST /sections` sem `component` responde 500.** Isso já acontecia antes deste ticket. É exatamente
o A3 (BEELINK-53), e é corrigido lá.

A recusa de `display` em `POST .../components` não tinha teste. Agora tem, e o e2e cobre também um
`display` fora da lista.
