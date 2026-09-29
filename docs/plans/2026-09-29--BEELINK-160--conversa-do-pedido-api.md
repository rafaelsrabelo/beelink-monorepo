# BEELINK-160 — K1 · API: a conversa do pedido (mensagens, não lidas e fechar quando o pedido termina)

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> K1 do Épico K (BEELINK-139). Empilhado sobre o J7 (`feat/BEELINK-146-entrega-do-pedido`, PR #128).
> Só API: o tempo real é o K2, a tela do cliente o K3 e o painel o K4.

## Definição de Pronto

1. Uma conversa por pedido, aberta pelo cliente logado que fez o pedido, com a primeira mensagem. A
   mensagem tem autor (`CUSTOMER` ou `SHOP`), a conta de quem escreveu, o texto puro de até 2000
   caracteres, quando foi criada e quando o outro lado a leu.
2. Cliente, com a sessão de cliente: ler a conversa de um pedido seu, enviar, marcar como lida e
   listar as suas conversas, as em andamento primeiro, com as não lidas.
3. Lojista: listar as conversas da loja (abertas, não lidas ou todas, com busca por nº ou cliente),
   ler, responder, marcar como lida e contar as não lidas.
4. Mensagem só entra com o pedido Recebido, Aceito, Em preparo ou Saiu para entrega. Entregue ou
   Cancelado fecha a conversa (`ORDER_CONVERSATION_CLOSED`), e o histórico continua legível.
5. Limite de tamanho (2000, contado como a coluna conta) e de ritmo. Texto puro.
6. Pedido de outro cliente ou de outra loja responde 404.
7. Contratos em `packages/contracts`, migração escrita à mão e aplicada com `migrate deploy`,
   testes de unidade e e2e.

## Decisões

### 1. A conversa nasce com a primeira mensagem do cliente

"Aberta pelo cliente", como o épico diz: não há rota para abrir uma conversa vazia, e a loja
responde uma que já existe (`ORDER_CONVERSATION_NOT_FOUND` antes disso). Ler a conversa de um
pedido sem mensagens responde a conversa vazia, não 404: a tela do pedido sempre a pede.

### 2. Aberta ou fechada vem do status do pedido

Não é gravado. A conversa está aberta enquanto o pedido está em andamento e fechada quando ele fica
Entregue ou Cancelado, que é a regra do épico. Um campo gravado poderia divergir do pedido a cada
mudança de status no painel.

### 3. Não lidas vêm das mensagens

Cada mensagem guarda quando o outro lado a leu (`readAt`). As não lidas da loja são as do cliente
sem `readAt`, e vice-versa. Nenhum contador para sair do compasso. Marcar como lida é uma rota
própria (`POST …/read`) dos dois lados: ler não escreve nada.

### 4. O ritmo, por endereço

Como o pedido do carrinho: `CUSTOMER_MESSAGE_RATE_LIMIT_MAX` mensagens por
`CUSTOMER_MESSAGE_RATE_LIMIT_WINDOW` por endereço (20 por minuto por padrão). Um limite por conta
precisaria da conta antes da guarda, e o `sub` do token sem verificar deixaria qualquer um esgotar o
limite de outra pessoa.

### 5. Texto puro

O texto é gravado como foi escrito, sem as pontas em branco, entre 1 e 2000 caracteres. Nenhum lado
o desenha como HTML. Nada é convertido nem limpo, para a loja ler exatamente o que o cliente
escreveu.

### 6. O que cada lado vê

O cliente vê de cada mensagem só o autor (ele ou a loja), o texto e as horas. Não vê qual conta da
loja respondeu. O lojista vê o cliente (nome) e o nº do pedido.

## Fora de escopo

- Anexos, fotos, respostas automáticas.
- Tempo real (K2), a tela do cliente (K3) e o painel (K4).
