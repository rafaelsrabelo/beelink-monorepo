# BEELINK-101 — A página do carrinho: linhas, quantidades, totais e o caminho para fechar

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> F2 do Épico F (BEELINK-99). Empilhado sobre o F1 (BEELINK-100).

## O pedido

`/<loja>/carrinho` era um estado vazio. Agora lista as linhas do carrinho com foto, nome, combinação,
preço, quantidade editável, remover, subtotal e total.

## Definição de Pronto

1. Cada linha com foto, nome (link para o produto), combinação, preço unitário, − n +, remover e o
   total da linha.
2. Um resumo com o subtotal e quantos itens entram no pedido.
3. Mudar a quantidade e remover uma linha atualizam o total sem recarregar e sobrevivem ao reload.
4. Um produto que saiu da loja some da lista com um aviso, em vez de quebrar a página.
5. Um produto esgotado fica visível, marcado, e fora do total.
6. Vazio, o carrinho continua uma frase e um caminho de volta.

## Decisões

### 1. Um endpoint público devolve os produtos que o carrinho nomeia

O cookie só tem ids. `GET /api/stores/:slug/cart?produto=<id>` (até 50) devolve esses produtos no
mesmo formato da página do produto: variações, preços, fotos, esgotado. É um GET porque o caminho
público do web só faz GET em cache. A resposta é a mesma para qualquer um que pergunte pelos mesmos
ids: o carrinho nunca sai do cookie do visitante. Um produto em rascunho, apagado ou de outra loja
não vem. Um id malformado é ignorado, em vez de chegar a uma coluna uuid e virar 500.

### 2. Nome e preço vêm sempre do catálogo

`cartViewOf(linhas, produtos)` monta as linhas e os totais com os preços de agora. Uma linha aponta
para uma combinação. Um produto sem opções tem uma só; uma linha salva antes de a loja criar opções
não aponta para nenhuma e sai, em vez de ser adivinhada.

### 3. A página é servidor; a edição é cliente

A página lê o cookie e busca os produtos, então o HTML já vem com o carrinho. `StorefrontCartLive`
recalcula os totais a partir da store a cada mudança, com os preços com que a página foi servida,
sem pedir nada ao servidor até a próxima página.

### 4. Nada de botão que não faz nada

O resumo ganha o espaço do botão de fechar, mas o botão só entra com o F4.

## Fora de escopo

- Fechar o pedido (F4), cupom, frete e pagamento.
