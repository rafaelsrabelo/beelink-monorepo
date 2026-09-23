# BEELINK-51 — Dar largura ao bloco: `span` e `display` no `StoreComponent`

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A1 do épico BEELINK-50 ([plano do épico](../../../../docs/plans/2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: API · ajuste · M · ordem 1/17.

## O pedido

> Separar os três significados que hoje moram em `layout` e criar o que falta: a fatia do bloco
> dentro da faixa. Adicionar `span` (`FULL`/`HALF`/`THIRD`/`TWO_THIRDS`) e `display`
> (`CAROUSEL`/`GRID`) em `StoreComponent`. Migrar o `layout` atual para os dois e remover a coluna.
> Fora de escopo: desenhar a grade — isso é A4.

## Definição de Pronto

1. `StoreComponent` tem `span` (`FULL`/`HALF`/`THIRD`/`TWO_THIRDS`, obrigatório, padrão `FULL`) e
   `display` (`CAROUSEL`/`GRID`) no schema do Prisma, com a migração no mesmo PR.
2. A migração converte todo `FULL`/`HALVES`/`THIRDS` existente sem perder a intenção do lojista:
   `FULL → FULL`, `HALVES → HALF`, `THIRDS → THIRD`, e todo banner existente ganha `display = CAROUSEL`.
3. Nenhuma linha fica com `span` nulo depois da migração, e um valor de `layout` que a migração não
   conheça **aborta** a migração em vez de virar `FULL` em silêncio.
4. A coluna `layout` e o tipo `ShowcaseLayout` do Postgres deixam de existir, e nenhum código da API
   lê a coluna.
5. O contrato de hoje não muda: a leitura continua devolvendo `layout`, agora derivado de `span`, e
   uma escrita de `layout` grava `span`. O painel e a vitrine desenham exatamente o que desenhavam.
6. Um banner criado depois da migração nasce com `display = CAROUSEL`; os outros tipos, com `null`.
7. `pnpm ci-check` verde.

## O que foi medido

Na base de desenvolvimento, 23/09/2026:

| tipo | `layout` | slides | linhas |
|---|---|---|---|
| BANNER | THIRDS | 0 / 1 / 3 | 1 / 4 / 1 |
| BANNER | HALVES | 0 / 1 | 1 / 2 |
| BANNER | FULL | 2 | 3 |
| todos os outros | FULL | — | 36 |

Só `BANNER` tem `layout` diferente de `FULL`. E o seletor "Tamanho" do modo design aparece para
**todo** banner, com qualquer número de slides (`hasLayout` em `arrangement-row.tsx`). Um banner de
três slides marcado `THIRDS` é exatamente o relato do dono: ele escolheu um terço e viu largura cheia.

Hoje a vitrine decide assim:

- banner com **1 slide** é um pôster: `layout` escolhe a grade da fileira, e pôsteres vizinhos do
  mesmo `layout` dividem uma fileira;
- banner com **2 ou mais slides** é carrossel de largura cheia, e `layout` é ignorado.

## Decisões

### 1. O corte é o armazenamento; o fio fica como está até A2

A1 é da API, e publicar os campos novos no contrato é A2. Tirar `layout` do contrato aqui
arrastaria `packages/contracts`, o web e o `packages/ui` para este PR, ou seja, A2, A4 e A6 juntos.

Então a coluna sai, e o fio continua dizendo `layout`: o mapper deriva `layout` de `span`, e o
service traduz um `layout` recebido para `span`. As duas tabelas de tradução moram juntas em
`page.constants.ts`, e morrem no dia em que o último leitor de `layout` no web deixar de ler
(A4 para a vitrine, A6 para o seletor).

`TWO_THIRDS` não tem nome no vocabulário velho. Nenhuma escrita consegue gravá-lo antes de A2
aceitar `span`, então a tradução de volta é inalcançável hoje. Ela devolve `FULL`, que é o que um
bloco desenha em todo lugar onde a largura não é honrada.

### 2. `span` é a tradução literal de `layout`, com qualquer número de slides

`THIRDS → THIRD` também no banner de três slides, embora hoje ele seja desenhado em largura cheia.
O título do épico é "um terço vira um terço", e o plano do épico diz que `span` é o campo que o dono
pensa que está escolhendo. A alternativa, preservar o desenho de hoje e gravar `FULL` nesse banner,
cimentaria o defeito relatado na base.

Consequência a registrar: quando A4 honrar `span`, esse banner encolhe para um terço. É o que o dono
pediu. Na base de desenvolvimento a única linha nessa situação está na loja descartável `probe-design`.

### 3. `display` é anulável, lido no `BANNER`, e todo banner existente vira `CAROUSEL`

Segue o precedente de `align`, `columns` e `body` neste mesmo modelo: um campo que só um tipo lê é
anulável, e é `null` nos outros. Um valor gravado num `HEADING` que ninguém desenha é a doença do
`layoutSettings`, contra a qual o próprio schema avisa.

`CAROUSEL` para **todo** banner, e não só para os de dois ou mais slides: com um slide, carrossel e
grade desenham a mesma capa, mas com `GRID` o segundo slide que o dono adicionasse depois de A5
viraria uma grade, e hoje ele vira carrossel. `CAROUSEL` preserva o comportamento atual nos dois
casos.

`PRODUCTS` e `CATEGORIES` ficam `null`. B1 e B4 decidem o que `display` significa neles; gravar um
valor agora seria decidir por eles.

### 4. A migração falha alto

`CASE` com os três valores explícitos e **sem `ELSE`**: um valor que não esteja na lista vira
`NULL`, bate no `NOT NULL` e aborta a migração. Um `ELSE 'FULL'` apagaria a escolha do lojista sem
avisar ninguém.

### 5. A migração é escrita à mão e verificada numa cópia

`prisma migrate dev` aplicaria na base `harness`, que outras sessões usam neste momento com o
schema antigo. A migração é escrita à mão, conferida contra o schema com `prisma migrate diff`, e
aplicada numa cópia descartável da base de desenvolvimento para comparar antes e depois.

## Fora de escopo

- Publicar `span` e `display` no contrato, validar e aceitar na escrita: A2.
- A faixa virar grade de 12 colunas e honrar `span`: A4.
- O banner honrar `display`, e de onde vem o número de colunas da grade de slides: A5.
- O seletor de largura no modo design: A6.
- `prisma/seed/dev-catalog.sql` ainda escreve em `store_banners`, uma tabela que as seções
  substituíram. É anterior a este ticket e não roda em CI. Não é tocado aqui.
