# BEELINK-49 — Dados estruturados e desempenho da página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D9 do épico BEELINK-40 (página do produto). Empilhado sobre o D8 (BEELINK-48). O último da rodada.

## O pedido

JSON-LD `Product` com `AggregateOffer`, a foto da combinação escolhida no compartilhamento, e o LCP
medido de verdade.

## Definição de Pronto

1. `Product` e `BreadcrumbList` em JSON-LD no HTML do servidor, antes de qualquer hidratação.
2. A oferta vai do menor ao maior preço das combinações, com a disponibilidade de alguma delas; sem
   preço quando a loja esconde preços. Nenhum dado de exemplo (nota, avaliações) entra.
3. A descrição é só o texto (`plainTextOf`), nunca o Markdown.
4. Um link com `?variant=` compartilha a foto daquela combinação.
5. O JSON escapa todo `<`: um nome de produto não fecha a tag.
6. O LCP é medido e relatado como é, sem declarar a meta atingida.

## Decisões

### 1. Endereços relativos

O app não tem configuração do próprio endereço (nem `metadataBase`). O JSON-LD usa os caminhos do
site, que o buscador resolve contra a página. Um endereço absoluto espera uma variável que diga qual é
o domínio da loja — registrado como acompanhamento.

### 2. A foto compartilhada segue a combinação

A foto própria da combinação, senão a foto mais específica marcada para ela (a mesma regra da
galeria), senão a primeira.

### 3. LCP: medido, e não atingido

Medido no servidor de desenvolvimento, a 390px:

| Condição | LCP | Elemento |
|---|---|---|
| Sem limitação, localhost | 176–184ms | a foto principal |
| 4G lento (1,6 Mbps, 150ms) e CPU 4× mais lenta, sem cache | 7,6–8,0s | a foto principal |

O elemento é o certo: a primeira foto carrega de imediato com prioridade alta (D5). O número limitado
não vale para produção — o servidor de desenvolvimento manda JavaScript sem minificar, de vários MB,
que disputa a banda com a foto — mas a meta de 2,5s não pode ser dada como atingida:

- **Toda rota da vitrine renderiza dinamicamente.** O layout raiz chama `getMessages()`, que lê
  cookies (armadilha registrada em `apps/web/AGENTS.md`), então nenhuma página vem do cache de rota
  do Next.
- **As fotos não são redimensionadas.** Cada foto tem uma URL só, e a miniatura baixa o original.

Os dois ficam para tickets próprios; medir de novo depois deles, num build de produção.

## Fora de escopo

- Resolver a renderização dinâmica e o redimensionamento de fotos.
- `aggregateRating` e `review`: sem avaliações reais.

## Revisão (25/09/2026)

Três leituras independentes, cada achado verificado por um revisor que tentou refutá-lo. Dois
distintos, os dois corrigidos:

- **A oferta usa a faixa de preço da API** (`priceRange`), a mesma dos cards: do que pode ser pedido
  agora. Calculada de novo aqui sobre todas as combinações, um sabor esgotado de R$ 69,90 virava um
  "a partir de" que ninguém consegue comprar. `offerCount` conta as combinações que podem ser pedidas.
  Isso corrige o item 2 da Definição de Pronto, que dizia "das combinações".
- **O comentário da trilha voltou para cima da trilha**: o script de JSON-LD tinha entrado entre os dois.
