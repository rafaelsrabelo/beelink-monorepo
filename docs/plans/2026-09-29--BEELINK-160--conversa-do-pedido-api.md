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

## Adendo — revisão independente (2026-09-29)

1. **As listas varriam a plataforma inteira.** Como `include`, o Prisma contava as não lidas numa
   subconsulta sem filtro por conversa (todas as mensagens não lidas de todas as lojas) e trazia
   todas as mensagens da página para ficar com a última. Agora a linha é só a conversa e o pedido,
   e duas leituras presas aos ids da página trazem o resto: a última mensagem por `DISTINCT ON` e
   as não lidas por `groupBy`, servidas pelos índices.
2. **Uma mensagem podia entrar depois do pedido fechar.** O status era lido fora da transação. Agora
   ele é relido com `FOR SHARE` dentro dela: a mudança para Entregue ou Cancelado espera a mensagem,
   ou a mensagem espera a mudança e a vê.
3. **"Abertas primeiro" se perdia depois de 50 conversas.** O limite era aplicado antes da
   separação. Agora as abertas vêm numa consulta e as fechadas completam até o limite.
4. **O Swagger escondia dois 404** do envio da loja: agora lista `STORE_NOT_FOUND`,
   `ORDER_NOT_FOUND` e `ORDER_CONVERSATION_NOT_FOUND`.
5. **O e2e ganhou** as não lidas por linha nas duas listas, o total e a página, o pedido cancelado,
   o token do lojista nas rotas do cliente e o cliente de outra loja.

### Outra loja: 403 para o lojista, como no resto do painel

A DoD 6 diz "de outra loja responde 404". Do lado do cliente, é 404 (ou 401 para o token de outra
loja). Do lado do painel, o dono de outra loja recebe `STORE_FORBIDDEN` (403), como em toda rota do
painel de uma loja que não é dele: o e2e fixa isso.

### O limite de ritmo não tem e2e

Como no pedido do carrinho, o e2e eleva o limite para não tropeçar nele, e nenhum teste confirma
que ele existe. Fica registrado.

### Dados de teste

No `harness_wt`, o cliente de teste escreveu no pedido nº 18 ("Olá! O pedido chega até sexta?"). A
mensagem fica para conferir o K3 e o K4.
