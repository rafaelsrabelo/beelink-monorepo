# BEELINK-50 — Um bloco tem largura, e a página tem mais de uma vitrine

> "se eu crio um banner e digo que ele tem um terço, ele fica ocupando todo o espaço, não consigo
> botar banners ao lado do outro, só um embaixo do outro […] hoje só mostro uma lista de todos
> produtos, e se quiser também produtos por categorias? hoje tenho um componente de categorias que
> visualmente é muito feio, devia scrollar horizontalmente" — o dono, 23/09/2026

## O que foi medido, antes de qualquer decisão

Loja descartável `probe-design`, com a estrutura da `mutante-performance` clonada. Uma faixa com três
blocos de banner, larguras medidas no navegador em três viewports:

| bloco | `layout` | slides | 1440px | 640px | 390px |
|---|---|---|---|---|---|
| UMSO | `THIRDS` | 1 | 443px (3 colunas) | **288px (2 colunas)** | **358px (largura cheia)** |
| TRES | `THIRDS` | 3 | **1360px (carrossel)** | 592px (carrossel) | 358px (carrossel) |
| METADEUM | `HALVES` | 1 | 672px (2 colunas) | **592px (largura cheia)** | 358px (cheia) |

E as coordenadas verticais dos três blocos em 1440px — 1860, 2224, 2640 — provam o segundo relato:
**os blocos nunca ficam lado a lado, em largura nenhuma.**

O modo design não tem alternância de dispositivo, então o dono nunca vê a coluna da direita dessa
tabela. No celular, "um terço" é sempre largura cheia.

## O diagnóstico

Um campo só, `layout`, foi encarregado de três significados que não são o mesmo:

1. **A grade dos slides dentro de um bloco.** `StorefrontShowcase` agrupa os *items* de um único
   componente e aplica `COLUMNS[layout]` — `THIRDS` é `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
   Com **um** slide, o bloco ocupa uma célula: um terço em desktop, **metade** em 640px e a
   **largura toda** abaixo de 640px.
2. **Um gatilho de carrossel.** A partir de três slides o bloco vira carrossel e `layout` deixa de
   ter qualquer efeito — cada slide ocupa a largura inteira, em todos os tamanhos.
3. **A largura do bloco na página** — que é o que o dono lê quando escolhe "um terço", e que
   **não existe como campo nenhum.**

A faixa, por sua vez, é `flex w-full flex-col` em `storefront-section.tsx`: ela empilha. Pôr dois
banners lado a lado não é uma opção mal desenhada — é uma opção que o modelo não tem.

O mesmo buraco explica o resto do pedido. `PRODUCTS` é único por loja e não pode ser apagado, e seu
editor oferece apenas título e linha de apoio: sem fonte, sem filtro, sem ordenação, sem limite. Uma
segunda vitrine ("Suplementos", "Mais vendidos") não é difícil hoje — é **inexprimível**. E
`CATEGORIES` só oferece contagem de colunas, então "rolar horizontalmente" também não cabe.

## A decisão

Separar os três significados, e criar o que falta.

- **`span` no `StoreComponent`** — a fatia do bloco dentro da faixa: `FULL`, `HALF`, `THIRD`,
  `TWO_THIRDS`. É o campo que o dono pensa que está escolhendo. A faixa passa a ser uma grade de 12
  colunas e os blocos fluem nela, então dois banners `HALF` ficam lado a lado.
- **`display` no bloco** — `CAROUSEL` ou `GRID`, uma escolha e não uma consequência silenciosa da
  contagem de slides.
- **`layout` deixa de existir** como está. O que sobra dele — quantas colunas a grade de slides
  desenha — só é lido quando `display` é `GRID`.
- **A regra responsiva permanece**: abaixo de 640px todo bloco ocupa a largura inteira. Isso está
  certo; o que está errado é o dono não poder ver.

## Entregas

### Entrega A — Um bloco tem largura, e blocos ficam lado a lado

| # | Área | Tarefa | Tam. |
|---|---|---|---|
| A1 | API | `span` e `display` no `StoreComponent`, migração de `layout` para os dois, `layout` removido | M |
| A2 | API | Contrato e validação dos dois campos novos; `PUT`/`PATCH` do componente aceitam `span` | P |
| A3 | API | `POST /sections` sem `component` responde **400**, não 500 `INTERNAL_ERROR` | P |
| A4 | UI | `storefront-section` vira grade de 12 colunas e honra `span`, colapsando em 1 coluna no celular | M |
| A5 | UI | O banner honra `display`: carrossel ou grade, por escolha | P |
| A6 | FE | Controle de largura no cartão do bloco, substituindo o "Tamanho" ambíguo | P |

**Aceite da entrega:** dois banners `HALF` na mesma faixa ficam lado a lado em 1440px e empilhados em
390px; um banner `THIRD` com um slide mede um terço da faixa em desktop; três slides com
`display: GRID` ficam três lado a lado em vez de virar carrossel.

### Entrega B — A página tem mais de uma vitrine

| # | Área | Tarefa | Tam. |
|---|---|---|---|
| B1 | API | `PRODUCTS` ganha `source` (todos · categoria · seleção · mais vendidos · lançamentos · promoção), `display` (grade · trilho) e `limit`; deixa de ser único e passa a ser apagável desde que reste um | G |
| B2 | API | Leitura pública resolve a fonte de cada vitrine, com índice por categoria | M |
| B3 | UI | Vitrine desenha grade ou **trilho horizontal**, reaproveitando `scroll-rail` | M |
| B4 | UI | `CATEGORIES` ganha o mesmo `display`: grade ou trilho horizontal | P |
| B5 | FE | Editor da vitrine com seletor de fonte, e a galeria passa a oferecer "Vitrine de produtos" | M |

**Aceite da entrega:** a home tem três vitrines — "Mais vendidos", "Suplementos" e "Lançamentos" —
cada uma com sua fonte, e as categorias rolam horizontalmente no celular.

### Entrega C — A casca do editor

| # | Área | Tarefa | Tam. |
|---|---|---|---|
| C1 | FE | Faixa de bloco único colapsa em um cartão só, com largura da faixa e largura do bloco lado a lado | M |
| C2 | FE | Alternância celular/desktop no preview, começando em celular | P |
| C3 | FE | Um só verbo de adicionar: `+` entre as faixas, com o ponto de inserção já conhecido | M |
| C4 | FE | Clicar no bloco dentro do preview seleciona e abre o inspetor | G |
| C5 | FE | A folha da faixa usa o nome da faixa, não "Faixa N" | P |
| C6 | FE | Todo estado vazio do modo design fala com o dono e oferece o conserto | P |

**Aceite da entrega:** nas cinco faixas da loja real — todas de bloco único — o editor mostra cinco
cartões, não cinco contêineres com um filho cada.

## Ordem e caminho crítico

```
A1 → A2 → A4 → A5 → A6        (o bug relatado, fechado)
A1 → B1 → B2 → B3/B4 → B5     (as vitrines)
A4 ──────────→ C1 → C2/C3/C5/C6 → C4
A3 solta, a qualquer momento
```

O crítico é **A1 → A4 → C1**: a largura do bloco governa a grade da faixa, e a grade da faixa governa
o cartão unificado do editor.

A entrega A fecha o defeito que o dono relatou e é a menor das três. C4 é a maior peça isolada e a
última, porque só compensa depois que a faixa de bloco único existe.

## Por que isto vem antes do catálogo

As 33 issues do catálogo (BEELINK-17 a 49) constroem blocos em `packages/ui/src/blocks/`, e o
**B5 — card de produto** é justamente o bloco que uma vitrine com fonte repete. Construir o card
antes de a vitrine ter fonte é construí-lo duas vezes.

## Decisões em aberto

1. **`TWO_THIRDS` entra agora ou depois?** Quatro valores cobrem o que os mockups mostram; três
   cobrem o que o dono pediu. Recomendo os quatro, porque o custo é uma linha no enum e a migração
   é a mesma.
2. **Onde `span` colapsa?** Recomendo 640px, que é onde o Tailwind do projeto já quebra. A
   alternativa é dar ao dono uma escolha por bloco, e isso é um campo a mais para pouca gente usar.
3. **"Mais vendidos" precisa de `soldCount`,** que hoje não existe em `Product`. Ou a fonte espera o
   B2 do catálogo, ou entra com ordenação por data e ganha vendas depois.
4. **Seleção manual de produtos** numa vitrine precisa de uma tabela de junção. Vale agora, ou as
   cinco fontes automáticas bastam para a primeira versão?
5. **`PRODUCTS` deixar de ser único** significa que a loja pode ficar sem nenhuma vitrine. Recomendo
   a API recusar apagar a última, como já faz hoje por outro caminho.
