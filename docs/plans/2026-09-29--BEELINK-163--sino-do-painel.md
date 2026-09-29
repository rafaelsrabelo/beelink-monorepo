# BEELINK-163 — K4 · Painel: o sino, com mensagens novas e pedidos novos

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> K4 do Épico K (BEELINK-139). Empilhado sobre o L3 (`fix/BEELINK-169-sessao-do-painel`, PR #133):
> o sino só vale com um painel aberto que não perde a sessão. Não depende do K3 (a loja).

## Definição de Pronto

1. O sino no cabeçalho do painel mostra quantas coisas novas há, em tempo real pelo canal do K2:
   - as mensagens de clientes não lidas;
   - os pedidos novos (Recebido, os que vêm do carrinho).
2. Clicar abre um menu com as últimas notificações, a mais recente primeiro. Cada uma leva ao pedido,
   aberto no painel (H4).
3. Quando algo chega, aparece um toast discreto, com um jeito de abrir. O título da aba mostra
   "(N)" enquanto houver algo novo.
4. Um canal de tempo real só no painel: o do K2. Não há SSE.
5. Sem som, sem notificação do sistema operacional, sem e-mail.
6. Testes (blocos com axe, rotas do BFF, visões), história e conferência no navegador em :3100.

## Decisões

### 1. O que o número conta

A soma de duas leituras, as duas já invalidadas pelo canal do K2 a cada evento:
- as mensagens de clientes não lidas, pela rota da API do K1 (`GET …/conversations/unread`);
- o total de pedidos Recebido, pela lista de pedidos do painel (`status=RECEIVED`).

Recebido é o pedido que ninguém aceitou ainda: o do carrinho nasce Recebido, e o lançado pelo
lojista nasce Aceito. O número baixa sozinho quando a mensagem é lida ou o pedido é aceito.

### 2. O menu

Um popover no sino. Ele junta:
- as conversas com não lidas (as 5 mais recentes);
- os pedidos Recebido (os 5 mais recentes).

A lista fica em ordem de tempo e mostra no máximo 8. No pé do menu, "Ver pedidos novos" leva à lista
de pedidos já filtrada.

Uma mensagem leva ao pedido dela, e não à conversa. A aba Conversas e a conversa dentro do pedido são
o K5: até lá, o pedido é onde o lojista vê o contexto e liga para o cliente, se precisar. Quando o
K5 chegar, a conversa aparece nesse mesmo pedido.

### 3. O toast, só para o que veio de fora

Para um pedido lançado pelo próprio lojista, ou uma mensagem que ele mesmo mandou, o toast só
atrapalharia. Por isso:
- o evento `order.created` passa a dizer quem fez o pedido (`placedBy`, o `OrderPlacedBy` que o
  contrato já tem);
- o toast aparece para pedidos de cliente e para mensagens de cliente (`author`).

O toast tem "Ver", que abre o pedido.

### 4. O título da aba

O título ganha "(N) " enquanto o número for maior que zero, e perde o prefixo quando chega a zero.
O Next reescreve o título a cada navegação, então o prefixo é refeito sempre que o caminho muda.

### 5. Sem SSE

O H9 previa um aviso por SSE, mas ele nunca foi feito. O painel tem um canal só, o do K2, e o K4 não
abre outro.

## Fora de escopo

- A aba Conversas e a conversa no pedido (K5).
- Som, notificação do sistema operacional, e-mail.
- Marcar notificações como vistas sem abrir: o número é o que falta fazer (ler e aceitar), não o que
  falta ver.

## Adendo — revisão independente (2026-09-29)

Um revisor. Corrigido:

1. **O menu ficava aberto depois de escolher uma notificação.** O cabeçalho do painel continua entre
   as páginas, então o menu cobria o pedido que tinha acabado de abrir. Agora ele fecha ao escolher.
2. **O "(N)" ficava no título ao sair do painel da loja.** O dashboard divide o título com o painel,
   e ninguém reescrevia. Agora o prefixo sai quando o sino some. Ele também é refeito ao trocar de
   idioma, e o comentário que dizia o contrário foi corrigido.
3. **Trocar de loja mostrava, por um instante, os pedidos da loja anterior** com o endereço da nova.
   Agora o sino é refeito por loja.
4. **Sem o canal, só as conversas eram relidas.** Agora os pedidos novos também, a cada 30 s.
5. **O idioma do painel** vale para as datas e o dinheiro do menu.
6. **Uma resposta da loja aparecia como se fosse do cliente,** quando é a última linha de uma
   conversa com não lidas. Agora aparece só o nome do cliente.

Fica registrado: **a metade das mensagens só baixa com o K5.** Nada no painel lê uma conversa ainda,
então uma mensagem de cliente fica contada até o K5 trazer a conversa, que marca como lida ao abrir.
O K5 é o próximo ticket. Nem o K3 nem este deveriam ir para produção antes dele.

Conferido em :3100, no painel da loja-do-design:
- o sino mostrou 3, com o título "(3) bee-link";
- o menu listou as mensagens dos pedidos 18 e 20 e o pedido novo nº 23;
- uma mensagem de cliente no nº 19, pela API, levou o sino a 4 na hora, com o toast "Mensagem no
  pedido nº 19";
- o "Ver" do toast abriu o pedido nº 19, com o "(N)" mantido no título.

Dados de teste no `harness_wt`: duas mensagens da cliente no pedido nº 19.
