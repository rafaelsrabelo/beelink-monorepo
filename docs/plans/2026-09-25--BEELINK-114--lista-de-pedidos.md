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

## Adendo — revisão (2026-09-25)

A revisão em três lentes, com verificação adversarial, confirmou 16 achados (alguns repetidos entre
as lentes). O que mudou:

1. **A busca comia o espaço digitado.** O endereço guarda a busca sem espaços nas pontas, e a caixa
   era reescrita com ele depois do debounce: "Bia " virava "Bia" e o sobrenome grudava. A caixa só
   é reescrita quando o endereço diz outra coisa.
2. **Um erro não mostra mais "Nenhum pedido ainda".** Sem dados, a lista e o paginador não aparecem;
   fica só o aviso de erro. Antes, um 401 dizia a uma loja com pedidos que ela não tinha nenhum.
3. **O cartão do celular deixou de ser um link com rótulo.** O número é o link, esticado sobre o
   cartão como na tabela; status, total, data e pagamento continuam lidos pelo leitor de tela. O
   cartão mostra também o celular do cliente.
4. **Tabela ou cartões pela coluna principal, não pela janela** (`@4xl/main`): com o menu lateral
   aberto, a 1024 px a tabela cortava a coluna Status. O nome longo trunca, com o nome inteiro no
   `title`. Isso substitui a decisão 1 no ponto do breakpoint: continua sendo CSS, não medida.
5. **O filtro ligado aparece ligado** (preenchido com a cor primária); o cinza do primitivo sumia no
   fundo do painel.
6. **"Registrar pedido" usa o botão do design system** (`buttonVariants`), como Produtos.
7. **Pedido de outro ano mostra o ano** na data.
8. **A história "NoCelular"** usa o formato de viewport do Storybook 10 e o contêiner do painel.

Recusados na verificação: anunciar o resultado da busca ao leitor de tela, a página além do fim e a
largura da página (esta segue a de Clientes).
