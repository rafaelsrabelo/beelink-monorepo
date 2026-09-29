# BEELINK-144 — J5 · O pedido do cliente: etapas, histórico, itens, pagamento e endereço

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J5 do Épico J (BEELINK-138). Sai do `main`, que já tem o J3 e o J4. A API é a do J2 (BEELINK-141):
> `GET /stores/:slug/customer/orders/:number`. Telas: 6e (computador) e 6f (celular).

## Definição de Pronto

1. `/<loja>/<conta>/<pedidos>/<n>` abre um pedido do cliente. Um pedido de outro cliente, de outra
   loja ou um nº que não existe é 404. Um visitante vai para Entrar e volta a este pedido.
2. O topo tem a trilha Minha conta › Meus pedidos › Pedido nº N (no celular, voltar para Meus
   pedidos), o título "Pedido nº N" e a linha "Feito em <dia>, <hora>", com "por você na loja" ou
   "lançado pela loja". As ações são Ver comprovante e, enquanto Recebido, Cancelar pedido.
3. Onde o pedido está: a situação em destaque, quando mudou pela última vez e as etapas do J4 (a
   retirada com as suas). Um cancelado diz quando e por quem, sem etapas.
4. O histórico lista cada mudança com dia e hora, da mais recente para a mais antiga.
5. Os itens com foto, nome (link enquanto o produto está à venda), variação, quantidade e o preço da
   época: o valor da linha, e o de cada um quando são vários.
6. Pagamento: subtotal, entrega (Grátis quando zero, só numa entrega), desconto quando houver, total
   e a forma combinada como rótulo. Nunca "aprovado": o bee-link não cobra.
7. O endereço de entrega com quem recebe, ou "Retirada na loja" com o endereço da loja.
8. Ver comprovante abre uma versão para imprimir: sem o cabeçalho e o rodapé da loja, com os dados da
   loja e do pedido, os itens, os totais, a forma de pagamento, a entrega ou a retirada, a frase
   "Este comprovante não é nota fiscal." e um botão Imprimir. Impresso, só o documento aparece.
9. O J4 liga a página: os cartões ganham "Ver detalhes" e, em andamento, "Acompanhar pedido"; o
   "Acompanhar pedido" da Visão geral leva ao pedido.
10. No celular, a página segue a 6f. Há esqueleto enquanto carrega, e uma falha de leitura diz que o
    pedido não carregou, com tentar de novo. Testes, histórias e conferência no navegador em :3100.

## Decisões

### 1. Um quarto segmento, só para a área

`/<loja>/<produtos>/<produto>` tem três segmentos, e um quarto nunca é um produto. A rota nova,
`[slug]/[section]/[item]/[sub]`, responde só quando a segunda palavra é a da conta, a terceira é a
de pedidos e a quarta é um número. Qualquer outra combinação é 404, como hoje.

### 2. A página não tem o menu da área, como a 6e

A 6e ocupa a largura toda, com a trilha no lugar do menu: o pedido é um documento, não uma aba. No
celular a trilha vira "voltar para Meus pedidos", como a 6f.

### 3. As etapas são as do J4, sem previsão

O destaque diz a situação nas palavras do cartão da lista e "Atualizado em <dia>, <hora>". A 6e tem
previsão de chegada e código de rastreio: isso é o J7. Um cancelado troca as etapas por "Cancelado em
<dia>, por você" ou "pela loja". O motivo do cancelamento fica fora: a API não o guarda.

### 4. O histórico fala nas palavras das etapas

Cada evento vira uma linha com o dia, a hora e o nome da etapa. O primeiro diz quem fez o pedido
("Feito por você na loja" ou "Lançado pela loja"), e o cancelamento diz por quem. O painel não impõe
ordem de status: uma retirada marcada "Saiu para entrega" aparece como "Pronto para retirar", que é o
que essa marcação quer dizer numa retirada.

### 5. O comprovante é a mesma página, sem a moldura

Ver comprovante leva a `?comprovante=1`: o pedido sem o cabeçalho e o rodapé da loja
(`chrome={false}`, como uma landing page), num documento para imprimir. O botão Imprimir chama
`window.print()` e não sai no papel. Uma rota a mais seria um quinto segmento para dizer a mesma
coisa. O comprovante não mostra WhatsApp nem telefone da loja: só o nome e o endereço.

### 6. Ações pela regra do menu

Entram: Cancelar pedido (J2, com o diálogo do J4) e Ver comprovante. "Falar com a loja" e "Algum
problema com o pedido?" entram com o K3; "Comprar tudo de novo" com o J6. Um botão que não abre nada
não é desenhado.

### 7. O cancelar é o do J4

O mesmo diálogo, a recusa segurada até ser lida, e a linha "Pedido nº N cancelado." no topo, que
recebe o foco. Depois da releitura a página mostra o pedido cancelado.

### 8. Não encontrado não é falha

A API responde `ORDER_NOT_FOUND` tanto para um nº que não existe quanto para o pedido de outro
cliente, e a página responde 404 aos dois. Uma falha de leitura é outra coisa: a página diz que o
pedido não carregou e oferece tentar de novo.

## Fora de escopo

- Transportadora, código de rastreio e previsão (J7).
- Falar com a loja e "Algum problema com o pedido?" (K3).
- Comprar tudo de novo (J6).
- O motivo do cancelamento.

## Adendo — revisão independente e o que mudou na execução (2026-09-29)

### A página não tem esqueleto (muda a DoD 10)

A página lê o pedido antes de desenhar, como a de produto. Assim, um pedido que não existe ou que é
de outro cliente responde 404 de verdade. Com o pedido em streaming atrás de um esqueleto, a resposta
já teria saído como 200 quando o 404 aparecesse. Enquanto navega, o Next mantém a tela anterior,
como no produto. Uma falha de leitura mostra o topo, com o título e o voltar, e "Não foi possível
carregar este pedido agora.", com tentar de novo.

### A retirada não mostra o endereço da loja (muda as DoD 7 e 8)

A loja pública não traz endereço, por construção: é o que vai para o índice de busca, e o endereço
cadastrado pode ser o do próprio lojista. A retirada diz "Retirada na loja" e o nome da loja; o
comprovante, só o nome. Mostrar ao cliente onde retirar é uma decisão de produto: pede um endereço de
retirada que o lojista escolha tornar visível. Fica registrado como pendente.

### O que a revisão encontrou

1. **Numa retirada, o destaque dizia "Saiu para entrega" e "Entregue em …"**, enquanto as etapas e
   o histórico falavam de retirada. A linha de situação, a mesma do cartão da lista e da Visão geral,
   agora diz "Pronto para retirar" e "Retirado em …" numa retirada.
2. **O comprovante de um pedido cancelado parecia uma venda.** O link não aparece num cancelado, e o
   comprovante aberto pelo endereço diz "Cancelado em …, por você" ou "pela loja" sob o título.
3. **Um retorno a Recebido repetia "Pedido feito" no histórico.** Só o primeiro evento é "Pedido
   feito"; um retorno diz "Aguardando a loja confirmar".
4. **As linhas do histórico podiam repetir a chave do React** quando o mesmo status volta no mesmo
   minuto. A chave agora é a posição.
5. **A tela de falha não tinha título nem volta.** Ganhou o topo do pedido.
6. **Faltavam testes** da leitura do pedido (encontrado, 404, falha, sem sessão), da regra de
   "Acompanhar pedido" (`isOrderInProgress`), da ordem no celular e do comprovante do cancelado.

O lint do React Compiler também recusou uma ref passada pelo contexto. A linha "Pedido nº N
cancelado." agora é achada pelo id.

### Aceito como está

A trilha começa em "Início", como a do produto, porque o bloco de trilha põe a loja na frente. O 6e
começa em "Minha conta".

### Dados de teste

O pedido nº 16 foi criado e cancelado pela página, na loja-do-design (banco `harness_wt`).
