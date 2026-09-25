# BEELINK-24 — Pedidos de aviso de reposição para combinações esgotadas

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A6 do épico BEELINK-17 (variações de produto). Área: API · novo · P. Feito antes do A5, que o
> usa. Empilhado sobre o A3 (BEELINK-21).

## O pedido

> Uma tabela `restock_requests` (productId, variantId, phone, createdAt) e o endpoint público
> `POST /stores/:storeSlug/products/:productId/restock-requests`, com limite por IP. Aceita um
> telefone válido e responde 201. Recusa com 400 um productId ou variantId que não exista ou não
> seja da loja do slug. Sem tela de admin e sem notificação nesta entrega.

## Definição de Pronto

1. O POST aceita um WhatsApp com DDD e responde 201 sem corpo. O número é gravado só com dígitos e
   o 55, como o WhatsApp da loja.
2. O pedido é recusado com 400 (`RESTOCK_VARIANT_INVALID`) quando a combinação não é daquele
   produto nem daquela loja. Também é recusado quando a loja não a vende ou o produto está em
   rascunho. Um productId que não é id é 400.
3. O endpoint tem limite por IP.
4. `pnpm ci-check` verde, com e2e.

## Decisões

### 1. O limite é o de uma escrita, não o da vitrine

O ticket pede o `STOREFRONT_RATE_LIMIT`, de 300 por minuto, mas esse é o limite das **leituras**
da vitrine. A única outra escrita pública do projeto, o formulário de contato, tem 5 a cada 10
minutos, e 300 escritas por minuto de um só endereço encheriam a tabela. Fica
`RESTOCK_RATE_LIMIT = 10 a cada 10 minutos`: um visitante pede aviso de algumas combinações, e
não de centenas. É um desvio do texto do critério, anotado aqui e no PR.

### 2. Um pedido por número por combinação

`@@unique([variantId, phone])`. Pedir duas vezes é a mesma pessoa esperando. O segundo pedido
responde 201 e não grava nada (`skipDuplicates`), porque o primeiro já guarda a data de quando ela
começou a esperar.

### 3. Controller próprio, fora do `ProductsController`

A rota fica sob `stores/:storeSlug/products/:productId`, como o ticket pede, mas num controller só
dela, com `@Public()`. É o mesmo arranjo do formulário de contato: guardas diferentes na mesma
classe é onde um `@Public()` no lugar errado abre as rotas do lojista.

### 4. Um código só para toda recusa

Combinação inexistente, de outro produto, de outra loja, desligada, arquivada ou de produto em
rascunho: todas respondem `RESTOCK_VARIANT_INVALID`. Um estranho não descobre, pela resposta,
quais ids existem em qual loja. Só vale pedido para o que o visitante pode ver na página do
produto.

### 5. A combinação não precisa estar esgotada

A página pode ter sido aberta antes da reposição. Recusar o pedido nesse caso seria punir quem
chegou um minuto atrasado, e o pedido não faz mal a ninguém.

### 6. Armadilha contra robô, como no formulário de contato

Um campo `website` fora da vista. Um corpo que o preenche recebe 201 e não é gravado.

### 7. Nome opcional

O diálogo proposto para o A5 tem "Seu nome", opcional. Ele fica guardado para o lojista saber com
quem fala quando houver a tela.

## Fora de escopo

- A tela do lojista para ler os pedidos e o aviso automático quando o estoque volta.
- A LGPD do número: quando houver a tela, ela precisa de uma forma de apagar os pedidos já
  atendidos.

## Adendo — revisão independente (24/09/2026)

Duas leituras (segurança e comportamento; evidência). Cada achado passou por um verificador que
tentou refutá-lo. Quatro achados confirmados, todos corrigidos:

1. **Um nome dentro de `@MaxLength(80)` podia estourar a coluna.** O validador não conta os
   seletores de variação de emoji, e o Postgres conta. O endpoint público respondia 500. O limite
   agora é contado em code points, como a coluna conta.
2. **Número com prefixo de longa distância.** "(011) 98888-7777" era gravado como
   `011988887777`, sem o 55, e o mesmo número digitado sem o 0 virava outro pedido. O defeito
   vinha do normalizador do WhatsApp da loja, anterior a este ticket e compartilhado com ele. O
   normalizador agora tira o 0 e o código de operadora antes de pôr o 55, o que conserta também o
   campo da loja. Aqui, o padrão recusa um número que comece com 0.
3. **Um teste não provava a recusa pelo produto** (grave, na evidência). O caso "de outro produto"
   usava uma variante de outra loja, e a recusa vinha pela loja. Agora há os dois casos que só o
   filtro de produto recusa: a variante de outro produto da mesma loja e um productId inexistente
   com uma variante real.
4. **O Swagger descrevia `name` como objeto.** Agora é `String`.

Um achado foi refutado, mas o teste pedido nele também foi escrito: o código de erro nas recusas
de combinação desligada e de rascunho.
