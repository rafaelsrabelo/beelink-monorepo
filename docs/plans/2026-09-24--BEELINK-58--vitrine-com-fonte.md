# BEELINK-58 — A vitrine ganha fonte, formato e limite, e deixa de ser única

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B1 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: contrato + API · ajuste · G · ordem 7/17.

## O pedido

> `source` (todos · categoria · seleção · mais vendidos · lançamentos · promoção), `display` (grade ·
> trilho) e `limit` no componente PRODUCTS. Remover a unicidade, mantendo a recusa de apagar a última
> vitrine.
>
> - Uma loja pode ter três vitrines com fontes diferentes na mesma página.
> - Apagar a última vitrine é recusado com errorCode próprio.
> - source=categoria exige categoryId e o valida contra a loja.

## Definição de Pronto

1. `PRODUCTS` guarda `source`, `sourceCategoryId`, `limit`, `display` e, na seleção, os produtos
   escolhidos. O contrato publica esses campos, e as três escritas os aceitam e devolvem.
2. Uma loja pode ter três vitrines com fontes diferentes, inclusive na mesma faixa.
3. Apagar a última vitrine continua recusado com `COMPONENT_REQUIRED`, nos dois níveis (componente e
   faixa). Uma que não seja a última pode ser apagada.
4. `source: CATEGORY` exige uma categoria desta loja. Sem ela, ou com uma de outra loja, a resposta
   é 400 `SHOWCASE_CATEGORY_INVALID`.
5. `source: SELECTION` exige ao menos um produto, todos desta loja. Fora disso, 400
   `SHOWCASE_PRODUCTS_INVALID`.
6. Os campos da vitrine num tipo que não é vitrine respondem 400. Um `display` que o tipo não
   desenha também: um banner não é trilho, e uma vitrine não é carrossel.
7. As vitrines que já existem viram "todos os produtos, em trilho", que é o que desenham hoje.
8. `pnpm ci-check` verde, com e2e da API para os critérios 2 a 5.

## O que já existe e pesa na decisão

- Hoje **todo** `PRODUCTS` desenha as mesmas prateleiras, carregadas pelo web uma vez por página
  (`homeAt` em `storefront-data.ts`). Uma segunda vitrine desenharia prateleiras idênticas. Resolver
  a fonte de cada uma é o B2; desenhar grade ou trilho é o B3.
- O catálogo público só sabe listar tudo ou uma categoria (por slug), na ordem do lojista. Não tem
  ordenação por data, filtro por lista de ids, promoção nem vendas.
- **Não existe tabela de pedidos.** `Order` e `OrderItem` são um domínio posterior do plano BEE-1.

## Decisões

### 1. "Mais vendidos" não entra agora

Sem pedidos, não há venda para contar. Uma fonte "mais vendidos" mostraria outra ordem com um nome
que promete vendas, e esse é o tipo de dado inventado que o brief do catálogo proíbe. O valor entra
no enum quando os pedidos existirem: é uma linha de migração. As outras cinco fontes são todas
servíveis com o que a tabela de produtos já tem:

| Fonte | O que é |
|---|---|
| `ALL` | todos os produtos na prateleira |
| `CATEGORY` | uma categoria e as subcategorias dela |
| `SELECTION` | os produtos que o lojista escolheu, na ordem dele |
| `NEWEST` | os mais recentes primeiro |
| `ON_SALE` | os que têm preço "de" (`compareAtPriceCents`) |

### 2. A categoria é uma coluna; a seleção mora em `items`

`sourceCategoryId` é uma coluna com chave estrangeira para `ProductCategory` (`onDelete: SetNull`).
É um valor só, validado contra a loja, e o B2 filtra por ela com índice.

A seleção é uma lista ordenada, e segue o precedente dos slides: `items` guarda `{ id, productId }`,
sem chave estrangeira. Um produto apagado some da vitrine na leitura, sem derrubar o componente. A
tabela de junção que o plano do épico cogitou compraria o cascade e custaria uma tabela para uma
lista que já tem onde morar.

### 3. `display` ganha `RAIL`, e cada tipo tem os seus

Trilho e carrossel não são a mesma coisa: o carrossel mostra uma imagem por vez, e o trilho mostra
vários cartões rolando. `ComponentDisplay` passa a ter `CAROUSEL`, `GRID` e `RAIL`, e uma tabela diz
o que cada tipo aceita: banner, carrossel ou grade; vitrine, trilho ou grade. As categorias entram no
B4.

### 4. O estado da vitrine é validado inteiro, depois de juntar com o que está gravado

Um patch pode mandar só `source`, só `items` ou só a categoria. A API junta o patch com o que está
gravado, valida a vitrine resultante e grava tudo normalizado: `sourceCategoryId` só existe com
`CATEGORY`, e `items` só com `SELECTION`. Trocar a fonte limpa o que a fonte antiga usava. Assim nunca
sobra uma coluna que ninguém lê.

### 5. `limit` vai de 1 a 48; nulo é o padrão de hoje

Nulo quer dizer 24, que é o que a prateleira única da home carrega hoje. O teto de 48 fica abaixo dos
96 do catálogo, porque uma vitrine é um recorte e não o catálogo.

### 6. A vitrine deixa de ser única, e a última continua protegida

`PRODUCTS` sai de `SINGLETON_COMPONENT_KINDS` e fica em `REQUIRED_COMPONENT_KINDS`: a recusa de
apagar a última continua valendo, com o mesmo `COMPONENT_REQUIRED`.

## Fora de escopo

- Resolver os produtos de cada vitrine na leitura pública: B2.
- Desenhar grade ou trilho: B3. Categorias com `display`: B4.
- O editor da vitrine e a galeria oferecendo uma segunda: B5. Até lá, o web continua escondendo a
  segunda vitrine da galeria.
- "Mais vendidos": quando existirem pedidos.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou quatro pontos, todos corrigidos:

- **Duas exclusões simultâneas podiam apagar as duas últimas vitrines.** A regra "a última não se
  apaga" é uma contagem seguida de uma exclusão. Duas abas contavam duas vitrines, cada uma apagava
  uma, e a loja ficava sem nenhuma. A lógica já existia, mas agora que duas vitrines são normais
  isso fica fácil de acontecer. Os dois caminhos de exclusão (componente e faixa) passam a rodar numa
  transação que trava a linha da loja; a segunda exclusão espera, conta uma e é recusada. Um e2e
  dispara as duas ao mesmo tempo.
- **Um produto apagado travava a seleção.** O painel devolve a seleção como ela foi gravada, com o
  produto apagado junto. A API contava um produto a menos e culpava "outra loja". Agora só é
  recusado um produto que existe e é de outra loja; um que sumiu é descartado da lista.
- **Neste ticket sozinho, a leitura pública servia os ids da seleção.** O B2 resolve isso de vez;
  aqui a vitrine pública passa a vir sem itens até lá.
- **Faltavam dois e2e:** apagar a faixa que guarda as últimas vitrines, e seleção vazia.
