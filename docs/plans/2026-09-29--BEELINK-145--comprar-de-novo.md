# BEELINK-145 — J6 · Comprar de novo: os itens de um pedido voltam ao carrinho, com o preço de hoje

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J6 do Épico J (BEELINK-138). Empilhado sobre o J5 (`feat/BEELINK-144-pedido-do-cliente`, PR #126).
> O carrinho é o do F1 (BEELINK-100): o cookie `bl_cart`, com produto, variação e quantidade.

## Definição de Pronto

1. "Comprar de novo" no cartão de um pedido encerrado (entregue ou cancelado) e "Comprar tudo de
   novo" nos itens da página do pedido encerrado põem no carrinho as mesmas variações e quantidades.
2. O preço é o de hoje: o carrinho já precifica pelo catálogo, e o pedido nunca leva preço ao cookie.
3. O que não dá mais para comprar fica de fora: produto em rascunho, excluído ou arquivado, variação
   removida ou desligada, e esgotado. Uma quantidade maior que o estoque entra só até o que há.
4. Depois o cliente vai para o carrinho, que diz de qual pedido os itens vieram e lista o que ficou
   de fora, e por quê. Se a repetição falhar, o carrinho diz isso.
5. Um pedido de outro cliente ou que não existe não é repetido: 404 na API, e nada entra no carrinho.
6. Funciona sem script: é um formulário. Testes (API, e2e, web e UI), histórias e conferência no
   navegador em :3100.

## Decisões

### 1. A API decide o que volta

O catálogo público nunca diz quanto há em estoque, só se há. Para a quantidade respeitar o estoque, a
conta é da API: `GET /stores/:slug/customer/orders/:number/reorder` responde as linhas que entram
(produto, variação, quantidade) e as que ficam de fora, com o motivo: fora de venda, esgotado ou
limitado ao estoque. É uma leitura, sem efeito: nada é reservado, e o checkout confere de novo.

Dizer ao cliente "só 1 disponível" revela um pouco do estoque. A recusa do checkout
(`ORDER_STOCK_INSUFFICIENT`) já revela o mesmo, então não é informação nova.

### 2. Um formulário, e o cookie escrito na rota da loja

O botão é um `POST` para `/<loja>/api/orders/<n>/reorder`, uma rota da loja como a do cancelar. Ela
lê a resposta da API com a sessão do cliente, soma as linhas ao cookie do carrinho (as regras do
F1: 99 por linha, 50 linhas) e redireciona para o carrinho com `?repetido=<n>`. Sem script, sem
estado no navegador: a página do carrinho é lida do cookie, como sempre.

### 3. O aviso no carrinho relê o pedido

A página do carrinho, com `repetido=<n>`, pede de novo a mesma leitura à API para listar o que ficou
de fora. Um endereço com um nº de outro cliente não mostra nada: a API responde 404.

### 4. Só pedidos encerrados

"Comprar de novo" aparece em pedidos entregues ou cancelados, como no 6d. Um pedido ainda em
andamento tem "Acompanhar pedido"; repetir o que ainda vai chegar é raro e confunde.

### 5. Somar ao que já está no carrinho

Os itens se somam ao carrinho, como um "adicionar". Se o carrinho já tinha a mesma variação, a soma
pode passar do estoque; o checkout confere e diz, como já faz hoje.

## Fora de escopo

- Reservar estoque.
- Escolher quais itens repetir: repete o pedido inteiro, como o ticket pede.
