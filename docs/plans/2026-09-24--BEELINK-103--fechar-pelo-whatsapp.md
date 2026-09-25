# BEELINK-103 — Fechar o pedido pelo WhatsApp com todas as linhas do carrinho

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> F4 do Épico F (BEELINK-99). Empilhado sobre o F3 (BEELINK-102). Fecha o carrinho.

## O pedido

O pedido continua terminando no WhatsApp da loja, como a página do produto sempre disse. A diferença
é que agora a mensagem leva o carrinho inteiro: cada linha com nome, combinação, quantidade e preço,
mais o total e o nome da loja.

## Definição de Pronto

1. "Fechar pedido pelo WhatsApp" no resumo do carrinho abre o WhatsApp da loja com todas as linhas e
   o total.
2. Um nome opcional vai junto na mensagem.
3. Depois de enviar, o carrinho é esvaziado.
4. Uma loja sem WhatsApp não mostra o botão e diz por quê.

## Decisões

### 1. A mensagem é montada no navegador

O ticket dizia "no servidor", mas as quantidades mudam na página sem pedir nada ao servidor (F2). A
mensagem sai de `orderMessageOf`, uma função pura, com os preços com que a página foi servida, e o
link é o `wa.me` com a mensagem inteira escapada, como o link do produto já faz.

### 2. Uma linha esgotada não entra na mensagem

O carrinho já disse que ela não seria pedida. Com nada que se possa pedir, o botão fica desabilitado.

### 3. O carrinho esvazia ao abrir o WhatsApp, e o link fica

A página não tem como saber se a mensagem foi enviada de fato. O carrinho é esvaziado quando o link
abre, e a página mostra "Seu pedido foi para o WhatsApp da loja" com o mesmo link para tentar de
novo. Assim quem volta à página não encontra o pedido ainda no carrinho, e quem teve o WhatsApp
bloqueado não perde o pedido.

### 4. A revisão é o próprio carrinho

O ticket falava numa tela curta de revisão. O carrinho já é essa tela: linhas, combinação,
quantidade, total e o nome. Uma segunda tela seria um clique a mais com as mesmas informações.

## Fora de escopo

- Guardar o pedido na API e mostrá-lo no painel (módulo de pedidos, épico próprio).
- Pagamento, frete, endereço. O endereço e a identidade chegam com o G4.
