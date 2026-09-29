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

## Adendo — revisão independente e a Visão geral nova (2026-09-28)

A revisão independente do J4 confirmou sete problemas, todos corrigidos nesta branch. No mesmo
passo a Visão geral foi refeita, a pedido: a frente da área é um informativo do cliente, não um
índice das abas.

### O que a revisão encontrou e como ficou

1. **O link "Acompanhar / Meus pedidos" do cabeçalho nunca aparecia.** `StorefrontWindow` recebia
   `ordersHref` e não o passava ao cabeçalho. Agora passa, com teste.
2. **Uma recusa do cancelar sumia sem ser lida.** A página era relida logo depois da resposta, e o
   cartão, redesenhado sem o botão, levava o diálogo junto. Agora a recusa fica no diálogo até o
   cliente fechar, e só então a página é relida. Um cancelamento que deu certo fecha o diálogo, deixa
   o botão travado até a releitura e move o foco (ver "O retorno do cancelar").
3. **Sessão encerrada no cancelar mostrava a frase do checkout.** Agora: "Sua sessão terminou. Entre
   de novo para cancelar o pedido." (`lib/order-cancel-refusal.ts`, com teste).
4. **Uma falha ao ler a lista aparecia como "Nenhum pedido com esses filtros".** Agora é o estado
   indisponível: "Não foi possível carregar seus pedidos agora." e "Tentar de novo", no mesmo
   endereço.
5. **A busca e o período ficavam embaixo do título; o 6d os põe ao lado.** A moldura da área ganhou
   `tools` no cabeçalho da aba. A barra lê a mesma página que a lista: `customerOrdersAt` passou a
   usar o `cache()` do React, por requisição, com a consulta em texto (o `cache` compara argumentos
   por identidade). Lista, barra, contagem do menu e Visão geral fazem uma leitura por endereço.
6. **Faltavam testes** do link do cabeçalho (com axe) e dos esqueletos (aria-hidden e axe).
7. **O nome de um produto em rascunho levava a um 404.** A API manda `productSlug` só com o produto
   à venda (`ACTIVE`), e a foto continua. Há um e2e novo.

Também: a busca é cortada em 120 caracteres e a página em 10.000, os limites da API, que recusaria a
leitura inteira. O corte é por caractere, para não partir um emoji.

### O retorno do cancelar

Na aba Em andamento o pedido cancelado sai da lista: o cartão some, e sem mais nada o cliente não
saberia que deu certo. Acima da lista há agora uma linha, "Pedido nº N cancelado.", que recebe o foco
e fica depois da releitura, porque é um componente de cliente que a releitura preserva. Na aba Todos
o cartão fica e diz "Cancelado". A vitrine não usa avisos flutuantes (toast): o Toaster montado na
raiz segue o visual do painel, não o da loja.

### A Visão geral (6c)

- Sem os cartões por aba: o menu já está ao lado, e no celular logo abaixo.
- "Olá, {nome}", depois o pedido em andamento mais recente: nº e total; onde está, nas palavras do
  cartão da lista; para onde vai (quem recebe e o endereço curto, ou a retirada); "A loja confirma o
  pedido e o prazo." enquanto Recebido; as etapas; e "Acompanhar pedido". Com mais de um:
  "Você tem mais N pedidos em andamento".
- Sem pedido em andamento: como terminou o último ("Entregue em …" ou "Cancelado em …, por você ou
  pela loja") e "Ver meus pedidos". Sem pedido nenhum: "Você ainda não fez pedidos nesta loja." e
  "Ir às compras". Se a leitura falhar, o estado indisponível, nunca "nenhum pedido".
- "Seus dados": telefone, e-mail e endereço de entrega, com cada falta dita. Um endereço que não dá
  para entregar, como só o CEP, diz "Falta a rua e a cidade para a loja entregar.", pela mesma regra
  do checkout (`isDeliverable`). O CEP guardado só com dígitos é escrito com hífen.
- O pedido vem por streaming, com esqueleto próprio; a saudação e os dados aparecem na hora.
- As avaliações a fazer (J18) e os favoritos (J15) entram na Visão geral com os seus tickets, como
  no 6c.

### As etapas

Uma por status: Pedido feito → Loja confirmou → Em preparo → Saiu para entrega → Entregue. Na
retirada não há "Saiu para entrega", e a última é "Retirado na loja". O painel não impõe ordem de
status, então as etapas não supõem uma: a que está atrás do status atual está feita, com o horário
quando houve o evento, e a que está à frente espera. Uma retirada marcada "Saiu para entrega" fica
entre o preparo e a retirada. "Pedido feito" tem o horário da colocação, também num pedido lançado
pela loja, que já nasce Aceito. Um pedido cancelado não tem etapas: o J5 diz quando e por quem.

"Acompanhar pedido" leva, por ora, à lista filtrada em Em andamento. O J5 troca pelo endereço do
pedido.

### Muda a decisão do J3 sobre o celular

O J3 fez da raiz da área, no celular, o próprio menu, com a Visão geral escondida. Agora a Visão
geral vem primeiro e o menu embaixo; no computador o menu segue à esquerda. No código o menu continua
antes, como uma barra lateral, e a ordem no celular é só visual.

### Dados de teste

Para conferir no navegador, os pedidos nº 14 e nº 15 foram criados e cancelados na loja-do-design
(banco `harness_wt`), com o cliente de teste do H9. O nº 13, que já existia, ficou intacto.
