# BEELINK-121 — H9 · Checkout: fechar o pedido pelo carrinho já registra o pedido como Recebido

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H9 do Épico H, liberado em 27/09/2026 para vir logo depois do J1 (BEELINK-140) e antes do resto do
> Épico J (BEELINK-138). Empilhado sobre `feat/BEELINK-140-endereco-do-pedido`.

## Definição de Pronto

1. `POST /stores/:slug/customer/orders`, com a sessão do cliente, cria o pedido a partir do carrinho:
   as linhas (`variantId`, `quantity`), entrega ou retirada e a forma de pagamento. A API recalcula
   os preços, confere o estoque e a forma de pagamento, e grava o endereço de entrega pela regra do J1.
2. O pedido nasce **Recebido**, com o evento de ator `CUSTOMER`, no registro de cliente daquela conta
   naquela loja. O lojista aceita ou cancela no painel (H4), como qualquer pedido.
3. O carrinho pergunta como receber (entrega no endereço cadastrado, ou retirada) e a forma de
   pagamento (as que a loja aceita). Uma entrega sem endereço não sai.
4. Fechar o pedido registra o pedido e então abre o `wa.me` da loja, como hoje, com a mensagem
   levando o **número do pedido**, e as linhas e o total que a API gravou.
5. Uma recusa (estoque, produto que saiu de venda, pagamento, endereço, sessão) aparece em palavras
   no carrinho, e nada é aberto. O carrinho só é esvaziado depois que o pedido existe.
6. O painel mostra o pedido como os outros: na lista, no pedido aberto e na ficha do cliente.
7. e2e da API, testes de unidade e de componente, e conferência no navegador em :3100.

## Decisões

### 1. A mensagem do WhatsApp leva o número, e o link continua o mesmo

A regra desta fila é não criar nada novo de WhatsApp: nenhum aviso, código ou alternativa. O `wa.me`
do carrinho continua sendo o fim da compra, do mesmo jeito. O que muda é o que o próprio ticket pede:
o texto passa a dizer o número do pedido, e as linhas e o total saem do pedido gravado, não da conta
feita no navegador. Assim a loja lê no WhatsApp exatamente o que vê no painel.

### 2. Registrar primeiro, abrir o WhatsApp depois, com uma aba aberta no clique

O pedido precisa existir antes da mensagem, que leva o número. Um navegador bloqueia uma aba aberta
depois de uma espera. Então o clique abre uma aba em branco, registra o pedido e leva a aba para o
`wa.me`. Numa recusa, a aba fecha e o carrinho diz por quê. Se o navegador não deu a aba, o pedido
continua registrado, e a tela de enviado oferece o link para abrir, que é um clique de verdade.

### 3. Uma loja sem WhatsApp também recebe o pedido

Até aqui, sem WhatsApp não havia como pedir. O pedido existe no produto no momento em que é feito
(`docs/product/README.md`, "Checkout"), então sem WhatsApp o botão é "Fazer pedido". Ele registra o
pedido e mostra o número. Nada de WhatsApp é oferecido no lugar.

### 4. Entrega ou retirada, e o pagamento, perguntados no carrinho

O pedido exige os dois. A entrega vai para o endereço do cadastro do cliente (J1), mostrado ali, com
o link de sempre para mudar. Sem rua e cidade, "Entrega" fica indisponível com o motivo. A taxa de
entrega é zero até existir o cálculo de frete (fora de escopo), e o carrinho diz que a taxa é
combinada com a loja. As formas de pagamento são as da loja, e com uma só ela já vem marcada.

### 5. O mesmo caminho do painel para gravar

A criação vira uma função única, com o número, o estoque, o endereço, os totais, o evento e o resumo
do cliente, usada pelo painel (H3, `ACCEPTED`, ator `SHOPKEEPER`) e pelo carrinho (`RECEIVED`, ator
`CUSTOMER`). A trava da loja, a ordem das travas e as recusas são as mesmas nos dois.

### 6. A resposta é o pedido como o cliente o lê

`CustomerOrder` no contrato: número, status, entrega ou retirada, endereço, pagamento, linhas e
totais, e quando foi feito. Nunca a nota interna do lojista. O J2 (BEELINK-141) completa esse formato
(linha do tempo, foto) e traz a lista e o detalhe.

### 7. Limite por endereço

A rota do cliente leva um limite próprio, `CUSTOMER_ORDER_RATE_LIMIT_MAX` por minuto. Um script
com uma conta válida não enche o painel de uma loja.

## Fora de escopo

- O aviso de pedido novo no painel sem recarregar: foi para o K4 (BEELINK-163), no mesmo canal da
  conversa.
- Pagamento e cálculo de frete.
- A observação do cliente no pedido: o campo `note` é do lojista e o J2 garante que o cliente não o
  vê. Uma observação do cliente pede uma coluna própria.
- Ver o pedido na Minha conta (J4 e J5).
