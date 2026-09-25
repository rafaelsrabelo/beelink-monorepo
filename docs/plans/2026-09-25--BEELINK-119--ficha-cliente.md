# BEELINK-119 — Painel: a ficha do cliente — dados, números e histórico de pedidos

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H7 do Épico H (pedidos e CRM). Empilhado sobre o H6 (BEELINK-118), cuja lista já leva cada linha a
> `/admin/<loja>/customers/<id>`. Usa o pedido aberto do H4 (BEELINK-116), os números e o estágio do
> H5 (BEELINK-117) e o "Novo pedido" com cliente escolhido do H3 (BEELINK-115).

## O pedido

Tudo o que a loja sabe de um cliente numa página só: quem é, como falar com ele, quanto e quando
comprou, e cada pedido que fez.

## Definição de Pronto

1. `/admin/<loja>/customers/<id>` mostra o nome, o e-mail (e se foi confirmado), o celular e o
   endereço do cliente.
2. O lojista edita nome, celular e endereço por `PATCH /stores/:slug/customers/:id`:
   - o e-mail é da conta e não se edita (a API recusa o campo com 400);
   - um campo ausente fica como está; uma parte do endereço apagada vira vazia.
3. Números: estágio, pedidos, total gasto, ticket médio, primeiro e último pedido e dias sem comprar.
4. Ticket médio = total gasto ÷ pedidos válidos, em centavos inteiros; sem pedido válido, não há
   ticket médio (a tela mostra "—").
5. Trocar o celular para um que já é de outro cliente da loja responde `409 CUSTOMER_PHONE_TAKEN`,
   não grava nada do PATCH, e a tela diz o erro no campo do celular, com o formulário aberto.
6. Histórico de pedidos paginado, do mais recente ao mais antigo, com os cancelados; cada pedido
   leva à sua página (H4). A página do histórico fica na URL (`?page=2`).
7. "Novo pedido" abre o formulário do H3 com o cliente já escolhido (`/orders/new?customer=<id>`).
8. "Chamar no WhatsApp" abre a conversa com a mensagem do estágio do cliente (a mesma da lista, H6);
   sem celular, o botão fica desligado e diz por quê.
9. Esqueleto no carregamento; um cliente que não é da loja mostra o erro e o caminho de volta.
10. Testes:
    - API: unidade do ticket médio; e2e da ficha, do PATCH (conflito de celular, e-mail recusado,
      outra loja) e do filtro de pedidos por cliente;
    - BFF: o PATCH e o filtro repassados com o token do dono;
    - blocos novos com Testing Library e axe; a tela da ficha com o erro de celular.

## Decisões

### 1. A ficha lê o mesmo `GET /stores/:slug/customers/:id`, que passa a devolver a ficha inteira

`StoreCustomerDetail` estende `StoreCustomer` com o endereço completo, o primeiro pedido e o ticket
médio. Quem já lia o cliente (o "Novo pedido" do H3) continua lendo o que lia; nada de uma segunda
rota para o mesmo registro. O `PATCH` responde o mesmo formato, que substitui a ficha em cache.

### 2. O primeiro pedido já está guardado; o ticket médio é conta na leitura

O H1 mantém `firstOrderAt` junto com `ordersCount`, `totalSpentCents` e `lastOrderAt`, na mesma
transação que cria ou cancela um pedido, só com os válidos. A ficha só o expõe. O ticket médio é
`totalSpentCents ÷ ordersCount`, arredondado ao centavo mais próximo (meio centavo sobe), e `null`
sem pedido válido — dividir por zero não é "R$ 0,00".

### 3. O histórico é a lista de pedidos filtrada pelo cliente, não uma rota nova

`OrderListQuery` ganha `customerId`. A lista de pedidos já pagina, ordena e resume do jeito que o
histórico precisa, e o BFF já repassa a query inteira. Um id que não é UUID é 400; o cliente de outra
loja devolve uma página vazia, porque o filtro soma com a loja.

### 4. O celular, quando enviado, é um celular

O lojista corrige o celular, não apaga: um cliente cadastrado num pedido só é conhecido por ele, e
apagá-lo faria o próximo pedido com o mesmo número criar um segundo cliente. `null` e vazio são 400.
Um cliente de conta que nunca deu celular continua sem; a tela só manda o campo quando há o que
mandar. O conflito reusa o `CUSTOMER_PHONE_TAKEN` do cadastro (H3) e do próprio cliente (`PATCH
/customer/me`), e a frase que já existe: "Esse celular já está no cadastro de outro cliente desta loja."

### 5. O registro é um só

A ficha edita o registro da loja, o mesmo que o cliente vê e edita na conta dele na loja. O que o
lojista corrige, o cliente vê. O e-mail é da conta: aparece na ficha, com "confirmado" ou "não
confirmado", e nunca entra no formulário.

### 6. O formulário é o mesmo campo a campo do cadastro no pedido

Os campos de endereço e a validação na tela (nome com 2 letras, celular com DDD, CEP com 8 dígitos,
UF com 2 letras) saem do bloco de cadastro do H3 para uma peça comum, que os dois usam. As palavras
dos campos são as mesmas.

### 7. A edição acontece no cartão, e o foco acompanha

"Editar dados" troca o cartão pelo formulário e põe o foco no nome; salvar ou cancelar volta ao
cartão e ao botão. Salvo, a tela diz "Dados salvos." num aviso educado. Uma recusa mantém o
formulário aberto com o que foi digitado.

### 8. Salvar relê pedidos e clientes

O nome, o celular e o endereço aparecem nos pedidos e na lista de clientes. A resposta do PATCH
substitui a ficha; as listas de clientes e os pedidos da loja são relidos.

### 9. O nome do cliente no pedido aberto leva à ficha

O H4 deixou para cá ("o nome do cliente ainda não leva a ela"). O caminho agora vai e volta: da ficha
ao pedido e do pedido à ficha.

## Fora de escopo

- Excluir ou mesclar clientes.
- Editar o e-mail ou qualquer coisa da conta do cliente.
- Notas do lojista sobre o cliente e etiquetas.
- O "voltar" do formulário de novo pedido levar de volta à ficha quando aberto dela.
