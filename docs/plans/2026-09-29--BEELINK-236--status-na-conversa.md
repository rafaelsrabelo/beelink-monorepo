# BEELINK-236 · K7 — A mudança de status do pedido chega à cliente na conversa

> **Tier:** plans — verdade de um momento, para um ticket. Append-only.

## Pedido

Rafael, 29/09/2026: "toda notificação de mudança de status no pedido chegue no chat pro cliente."

## Decisões (com o Rafael, 29/09)

1. **A conversa nasce com o pedido** de uma cliente com conta — não mais na primeira mensagem dela. Muda a regra do Épico K (BEELINK-139), anotada lá.
2. **O aviso conta como não lido para a cliente** e acende o "Chat" do cabeçalho.

## Desenho

- **O aviso é uma mensagem de autor `SYSTEM`** com a coluna `status` e o corpo vazio (`order_messages`). Um CHECK amarra os dois: `(author = 'SYSTEM') = (status IS NOT NULL)`, comparado como texto porque um valor novo de enum não pode ser usado como enum na transação que o criou.
- **O aviso guarda o status, não a frase** (docs/product, "Language": a API manda códigos). A loja e o painel escrevem a frase no idioma de quem lê; uma retirada entregue diz "retirado na loja" — por isso o cabeçalho da conversa passa a levar `fulfillment`.
- **Gravado na mesma transação da mudança** (`noteOrderStatus`), nos três lugares onde o status muda: o nascimento do pedido (`order-placement.ts`: Recebido pelo carrinho, Aceito quando o lojista lança), a troca pelo painel (`orders.service.ts`) e o cancelamento da cliente (`customer-orders.service.ts`). O aviso de fechamento entra antes de a conversa fechar: é a última linha.
- **Só para cliente com conta** (`Customer.userId`). Um pedido antigo, sem conversa, ganha a dele na próxima mudança.
- **Não lidas:** para a cliente, as mensagens da loja e os avisos; para a loja, só as mensagens da cliente (`UNREAD_AUTHORS`). O aviso de uma ação da própria cliente já nasce lido.
- **A lista do painel mostra só conversas com alguma mensagem escrita** (`WRITTEN_AUTHORS`): com a conversa nascendo em todo pedido, sem isso a aba Conversas viraria uma segunda lista de pedidos. O sino (K4) não muda: conta só mensagens da cliente.
- **O lojista pode escrever primeiro**, já que a conversa existe; a recusa `ORDER_CONVERSATION_NOT_FOUND` fica para a cliente sem conta.
- **Tempo real sem evento novo:** o web já relê as conversas dos dois lados em `order.created` e `order.status` (`realtime-invalidation.ts`), que a mesma transação publica ao terminar.
- **Contrato:** `ConversationMessage` e `ConversationLastMessage` viram uniões com `kind: "MESSAGE" | "STATUS"`. As classes do Swagger não podem implementar uma união; as propriedades que a carregam são tipadas com o contrato, e a classe só documenta a forma.

## Verificação

- e2e da API (`conversations.e2e-spec.ts`): a conversa nasce com o pedido; cada mudança entra como aviso, não lida para a cliente e nunca para a loja; a aba do painel só lista conversas escritas; a loja escreve primeiro; o aviso de fechamento é a última linha; cliente sem conta não tem conversa; pedido antigo ganha a conversa na próxima mudança.
- Testes do web e dos blocos: frases por status, "retirado na loja" na retirada, prévia sem "Você:", marca de lida só na última mensagem escrita, o aviso marcado como lido ao aparecer, a linha centralizada nos dois lados.
- No navegador contra o `harness_wt`: o lojista muda o status e o aviso aparece na conversa da cliente sem recarregar.
