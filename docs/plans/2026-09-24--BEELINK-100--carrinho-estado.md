# BEELINK-100 — O carrinho existe: estado em Zustand, cookie `bl_cart` e leitura no servidor

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> F1 do Épico F (BEELINK-99, carrinho). Empilhado sobre o B8 (BEELINK-84). É a base sem tela: a
> página do carrinho (F2), o botão de adicionar (F3) e o fechamento pelo WhatsApp (F4) ficam em cima.

## O pedido

A vitrine não tinha carrinho. O contrato do web (regra 7) já dizia como ele deve ser: um cookie
`bl_cart` com ids e quantidades, uma store Zustand que escreve nele a cada mudança, e o servidor
lendo o mesmo cookie para o HTML já vir certo.

## Definição de Pronto

1. Adicionar o mesmo produto e a mesma combinação soma a quantidade; combinações diferentes são
   linhas diferentes.
2. O cookie fica abaixo de 4 KB com 50 linhas.
3. Recarregar a página mantém o carrinho; outra loja no mesmo domínio tem o seu.
4. O contador do cabeçalho lê o carrinho, e o número já vem no HTML.
5. Testes da store e do cookie.

## Decisões

### 1. O cookie guarda `produto.variante.quantidade`

Linhas separadas por `~`, campos por `.`, caracteres que um cookie carrega sem escape. Os UUIDs vão
sem hífens: 32 caracteres cada. Com 50 linhas de 99 unidades e todos os atributos, o cookie tem
cerca de 3,5 KB. O limite é de 50 linhas e 99 unidades por linha.

### 2. `variantId` entra no cookie

A regra 7 falava em `{ productId, qty }`, mas desde o Épico A um produto com opções vende
combinações. A regra passa a dizer `{ productId, variantId, qty }`: ainda só ids e quantidades.

### 3. O cookie é do shopper, então nada nele é confiado

Uma entrada malformada é descartada sozinha, sem derrubar o carrinho. Nome e preço nunca vêm do
cookie: a página do carrinho (F2) busca no catálogo.

### 4. Uma store por loja e por carregamento de página

`createCartStore(slug, linhas)` cria a store dentro de um provider no layout `[slug]`, que lê o
cookie no servidor. Uma store no módulo seria dividida por todas as requisições no servidor e
entregaria o carrinho de um visitante ao próximo.

### 5. O cabeçalho ganha um espaço para o carrinho

O link do carrinho sai do cabeçalho para o bloco `StorefrontCartLink`. O web passa uma versão viva,
que lê a store, pelo novo `cartSlot`. Fora de uma loja, como na prévia do modo design do painel, o
hook devolve um carrinho vazio e inerte em vez de quebrar.

## Fora de escopo

- Qualquer tela: a página do carrinho (F2), o botão de adicionar (F3), o fechamento (F4).
- Sincronizar entre abas abertas ao mesmo tempo.
