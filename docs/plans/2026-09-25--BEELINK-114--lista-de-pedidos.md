# BEELINK-114 — Painel: a página Pedidos lista os pedidos da loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H2 do Épico H (pedidos e CRM). Empilhado sobre o H1 (BEELINK-113), que dá a API.

## Definição de Pronto

1. `/admin/<loja>/orders` deixa de ser "em breve": tabela com número, data do pedido, cliente (nome e
   celular), resumo dos itens ("3 itens"), total, pagamento e status.
2. Filtro por status, busca por número, nome ou celular e paginação, com o estado na URL.
3. No celular, cartões em vez de tabela.
4. Esqueleto no carregamento; o estado vazio convida a registrar o primeiro pedido (H3).
5. BFF (`GET /api/stores/:slug/orders`) e hook do TanStack Query.
6. Aceite: os valores batem ao centavo com a API; clicar num pedido abre o pedido (H4).

## Decisões

### 1. Tabela e cartões pelo CSS, não por medida

Os dois são desenhados e o CSS mostra um (`md:`), como a vitrine já faz. O servidor manda o certo
e nada pula na chegada; o link escondido pelo `display: none` também sai da árvore de
acessibilidade.

### 2. O estado na URL, como na lista de produtos

Status, busca e página vivem no endereço: abrir um pedido e voltar cai na mesma página filtrada, e
"os pedidos saindo para entrega" é um link que o lojista guarda. A busca é segurada localmente com
debounce, como na lista de produtos, para não criar uma entrada no histórico a cada letra.

### 3. O número é o link da linha, com o nome inteiro

"Abrir o pedido #12, de Bia" — a linha inteira responde ao clique pelo único link que tem (um
`after:inset-0`), e um leitor de tela não cai num "12" solto.

### 4. O celular aparece como está guardado

Como na lista de Clientes (G6): dígitos, sem máscara. A forma canônica (com 55) vem do H1.

### 5. Os "em breve" saem

A página de Clientes (G6) e agora a de Pedidos deixaram de usar as frases de "em breve"; o grupo
`soon` sai das mensagens da web.

## Fora de escopo

- Registrar um pedido (H3) — o botão e o estado vazio já levam a `/orders/new`, que o H3 cria.
- O pedido aberto (H4) — a linha já leva a `/orders/<número>`.
