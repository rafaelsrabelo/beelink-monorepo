# BEELINK-53 — POST /sections sem component responde 400, não 500

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A3 do épico BEELINK-50 ([plano do épico](../../../../docs/plans/2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: API · ajuste · P · ordem 6/17.

## O pedido

> Fazer a validação recusar antes de chegar ao Prisma, com errorCode nomeado. Varrer os outros
> POST/PUT do módulo de página atrás do mesmo buraco.
>
> - POST /stores/{slug}/sections sem component responde 400 com errorCode.
> - Um teste e2e cobre o caso.
> - Nenhum outro endpoint do módulo devolve 500 para corpo inválido.

## Definição de Pronto

1. `POST /stores/{slug}/sections` sem `component`, com `component: null` ou com `component` que
   não é um objeto responde 400 `SECTION_COMPONENT_REQUIRED`.
2. Um e2e cobre esse caso.
3. Um e2e dispara corpos inválidos contra todos os endpoints de escrita do módulo — campos obrigatórios
   ausentes, `null` onde a coluna não aceita, tipos errados — e nenhum responde 500.
4. `pnpm ci-check` verde.

## O que a varredura achou

A mesma raiz em três campos. `@IsOptional()` deixa passar `null`, e não só `undefined`. Num campo
cuja coluna é `NOT NULL`, o `null` chega ao Prisma e volta como 500:

| Rota | Corpo | Hoje |
|---|---|---|
| `POST /sections` | `{}` | 500 (`dto.component.kind` de `undefined`) |
| `POST /sections`, `PATCH /sections/:id` | `{"width": null}` | 500 (`width` é `NOT NULL`) |
| `PATCH /sections/:id`, `PATCH /components/:id` | `{"isActive": null}` | 500 (`isActive` é `NOT NULL`) |

Num patch, o `PartialType` põe `@IsOptional()` em todo campo, independente do que o DTO base diz.
Foi por isso que o A2 precisou recusar o `span: null` no service, e não no DTO.

## Decisões

### 1. `component` obrigatório, com código próprio

`@IsDefined()` e `@IsObject()` no `component` de `CreateSectionDto`, os dois declarando
`SECTION_COMPONENT_REQUIRED` no `context`, que o pipe do A2 já transforma no `errorCode` da resposta.

### 2. `null` recusado onde a coluna não o aceita, no DTO

`@ValidateIf((dto) => dto.campo !== undefined)` no lugar de `@IsOptional()` em `span`, `isActive` e
`width`: ausente continua sendo "não mexer", e `null` passa pela validação do campo e falha nela. O
patch de componente usa `PartialType(ComponentDto, { skipNullProperties: false })`, que faz o mesmo
com os campos herdados em vez de pôr `@IsOptional()`.

Com isso, a recusa de `span: null` que o A2 pôs no service (`checkedSpan`) sai. O DTO recusa com o
mesmo código, e o e2e do A2 que cobre o caso continua passando.

### 3. A prova é uma varredura, não um teste por campo

Um e2e com uma tabela de corpos inválidos por rota. Ele afirma uma coisa só: a resposta é 400, e
nunca 500. Um campo novo que repetir o buraco entra na tabela.

## Fora de escopo

- Os outros módulos da API. O ticket fala do módulo de página.

## Adendo — 24/09/2026, depois da revisão

A revisão independente tentou, de verdade, arrancar um 500 de cada rota do módulo, e conseguiu por
mais quatro caminhos. Nenhum foi aberto por este ticket, e todos estavam no escopo dele:

- **Texto que o Postgres não guarda.** Um NUL (U+0000) em qualquer texto, ou meio par de UTF-16 dentro
  de `items`, era recusado pelo banco. O pipe global agora percorre o corpo antes de validar e
  responde 400. Isso vale para a API inteira, que tinha o mesmo buraco em todo módulo.
- **Um corpo aninhado fundo demais** (40 níveis, 3 KB) estourava a recursão do class-transformer com
  um `RangeError`. O mesmo percurso recusa passar de 32 níveis.
- **`@MaxLength` e `VARCHAR` contam diferente.** O validador conta um coração e o seletor de variação
  como um caractere, e o Postgres conta dois. Sessenta e um corações passavam num título de 120.
  `MaxCodePoints` conta como o banco nos três campos `VARCHAR` do módulo. Os outros módulos têm o
  mesmo risco e ficam para quando alguém mexer neles.
- **Um id que não é uuid** chegava a uma coluna uuid e voltava 500. Agora é o mesmo 404 nomeado de um
  bloco que não existe.

A varredura e2e ganhou uma linha para cada um.
