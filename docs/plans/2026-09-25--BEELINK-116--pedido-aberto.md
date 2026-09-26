# BEELINK-116 — Painel: o pedido aberto e a troca de status

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H4 do Épico H (pedidos e CRM). Empilhado sobre o H3 (BEELINK-115); usa a API do H1.

## Definição de Pronto

1. `/admin/<loja>/orders/<número>` mostra:
   - o cliente (nome, celular, endereço);
   - as linhas como foram fotografadas;
   - os totais;
   - entrega ou retirada, o pagamento, a observação e a data.
2. Status:
   - um botão com o próximo passo ("Marcar como em preparo") e um menu com os demais;
   - a retirada pula "Saiu para entrega";
   - cancelar pede confirmação e é final.
3. "Chamar no WhatsApp" abre a conversa com o celular do cliente e o resumo do pedido na mensagem.
4. BFF (`GET /api/stores/:slug/orders/:número` e `PATCH …/status`) e hooks do TanStack Query.
5. Aceite:
   - cancelar tira o pedido do resumo do cliente (pedidos, total gasto, último pedido);
   - um pedido cancelado não oferece mais troca de status.

## Decisões

### 1. O próximo passo segue a ordem do pedido, e o menu leva a qualquer outro

A ordem é Recebido → Aceito → Em preparo → Saiu para entrega → Entregue. Numa retirada, "Saiu para
entrega" some do botão e do menu. Entregue não tem próximo passo. O menu continua oferecendo os
outros status, porque a API deixa o status voltar: um "Entregue" marcado por engano volta com um
toque. Cancelar fica no fim do menu, separado e em vermelho.

### 2. Cancelar pede confirmação e diz o que acontece

O diálogo diz que o pedido sai do resumo do cliente e que não volta mais. Depois de cancelado, a tela
não tem mais botão nem menu de status: só o selo "Cancelado" e o histórico.

### 3. O histórico aparece

Cada status que o pedido teve, quando e por quem (a loja, o cliente ou o sistema), do mais antigo ao
mais recente. É o que a API já guarda para o app de entregador; mostrar custa pouco e responde "quem
cancelou isso?".

### 4. A mensagem do WhatsApp é da loja para o cliente

O texto começa com "Olá, <nome>!" e traz uma linha por item no mesmo formato da mensagem da vitrine
("2× Camiseta (M) — R$ 99,80"), depois entrega, desconto, total, pagamento e o status atual. O
link é o `wa.me` com o celular como está guardado (com 55). Sem celular, o botão não aparece.

### 5. Trocar o status atualiza o pedido na hora e relê o resto

A resposta do PATCH é o pedido inteiro, que substitui o que está em cache. A lista de pedidos e os
clientes são relidos, porque cancelar muda o resumo do cliente.

## Fora de escopo

- Editar um pedido (itens, valores) e a baixa de estoque (H8).
- A ficha do cliente (H7): o nome do cliente ainda não leva a ela.

## Adendo — verificado ao vivo (2026-09-25)

Na loja-do-design, pedido #4 (entrega, do Caio Lima):
- "Marcar como em preparo" gravou o status e acrescentou a linha no histórico;
- "Cancelar pedido", depois da confirmação, tirou o #4 do resumo do Caio: sobraram 3 pedidos
  válidos, total gasto 36870 centavos (a soma dos três), e o último pedido passou a ser o mais
  recente dos que restaram;
- depois de cancelado, a tela mostra só o aviso, sem botão nem menu.

O pedido #2 (retirada, entregue) não tem próximo passo; o menu leva de volta a qualquer status, sem
"Saiu para entrega". O link do WhatsApp abre `wa.me/5511977776666` com o pedido escrito. Não há
rolagem lateral a 390 px.
