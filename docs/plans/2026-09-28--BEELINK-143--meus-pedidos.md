# BEELINK-143 — J4 · Meus pedidos: a lista de pedidos do cliente, com abas por situação

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J4 do Épico J (BEELINK-138). Empilhado sobre o J3 (`feat/BEELINK-142-area-minha-conta`). A API é a
> do J2 (BEELINK-141).

## Definição de Pronto

1. A aba Meus pedidos entra no menu da área, com a contagem de pedidos em andamento, e na Visão geral.
   O cabeçalho da loja ganha o link para ela.
2. `/<loja>/<conta>/<pedidos>` lista os pedidos do cliente, um cartão por pedido, do mais recente ao
   mais antigo. O cabeçalho do cartão tem: feito em, total · forma de pagamento, enviar para (quem
   recebe, ou retirada) e o nº.
3. A situação em destaque, nas palavras do cliente: Aguardando a loja confirmar · A loja confirmou ·
   Em preparo · Saiu para entrega · Entregue em … · Cancelado em …, pela loja ou por você.
4. Os itens aparecem com foto, nome (link para o produto), variação e quantidade, até três, e
   "+ N itens" quando há mais.
5. Abas Todos · Em andamento · Entregues · Cancelados, com contagem. Período (últimos 3 meses e os
   anos com pedido) e busca por nº ou produto. Paginação. Tudo fica na URL.
6. Cancelar pedido, enquanto Recebido, com confirmação. A recusa aparece em palavras.
7. Esqueleto enquanto a lista carrega. Sem pedidos: "Você ainda não fez pedidos nesta loja" e um botão
   para as compras. Com filtros e nenhum resultado: uma frase própria e o caminho para limpar.
8. No celular os cartões empilham e o cabeçalho do cartão vira uma coluna.
9. Testes de unidade e de componente, histórias, e conferência no navegador em :3100.

## Decisões

### 1. Só as ações que já existem

O cartão do design tem Ver detalhes, Acompanhar pedido, Falar com a loja, Comprar de novo e Avaliar
produto. Cada uma abre uma página ou um fluxo de outro ticket: a página do pedido é o J5, a conversa
é o K3, comprar de novo é o J6 e avaliar é o J18. Pela mesma regra do menu, o J4 não desenha um link
que abre nada. Aqui entra só Cancelar pedido, que a API do J2 já atende. Cada ticket liga a sua ação
no cartão, como liga a sua aba no menu.

### 2. O cabeçalho diz "Meus pedidos", não "Devoluções e pedidos"

O design copia o rótulo de marketplace. O bee-link não tem fluxo de troca ou devolução, e o épico o
deixa fora de escopo. Um link que promete devolução e leva a uma lista de pedidos é uma promessa
falsa. O link fica "Acompanhar / Meus pedidos", só a partir de `shop-lg`, como o de Minha conta.

### 3. Tudo na URL, sem script para filtrar

As abas são links (`?situacao=em-andamento|entregues|cancelados`), a busca e o período são um
formulário GET (`q`, `periodo=3m|2025`) com um botão, e a página é `pagina`, como nas prateleiras. A
lista é renderizada no servidor, com o token do cliente, a cada pedido de página: nada dela vai para
o cache do catálogo. Os anos do seletor vêm da resposta (`years`).

### 4. Cancelar é o único script da página

O botão abre uma confirmação e chama `POST /<loja>/api/orders/<n>/cancel`, uma rota da loja que usa
o mesmo `callAsShopper` do carrinho, e a página é relida. As recusas: a loja já aceitou
(`ORDER_NOT_CANCELLABLE`), já cancelado (`ORDER_CANCELLED`) e sessão encerrada.

### 5. A linha do item precisa do slug do produto

`CustomerOrderItem` tem `productId` e a foto, mas o link do nome precisa do slug. O J4 acrescenta
`productSlug` (nulo quando o produto foi apagado) no contrato e no mapper do J2.

### 6. O que a situação diz, sem WhatsApp

O design escreve "Você enviou este pedido pelo WhatsApp…". Aqui a linha de apoio diz de onde o pedido
veio ("Feito por você na loja em …" ou "Lançado pela loja em …") e, no Recebido, que a loja confirma
o pedido e o prazo.

### 7. A contagem do menu custa uma leitura por página da área

O menu mostra quantos pedidos estão em andamento. O número vem da própria lista do J2, pedida com
uma linha só (`counts.ACTIVE`), em cada página da área. É uma leitura a mais por página, com a sessão
do cliente. Quando pesar, a API ganha uma rota só de contagens.

## Fora de escopo

- A página do pedido, com etapas e comprovante (J5).
- Rastreio e previsão (J7).
- Comprar de novo (J6), Avaliar produto (J18), Falar com a loja (K3).
