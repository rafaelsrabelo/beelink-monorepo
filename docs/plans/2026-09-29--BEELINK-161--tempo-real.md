# BEELINK-161 — K2 · Tempo real: canal WebSocket entre a API e o navegador, com ticket emitido pelo BFF

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> K2 do Épico K (BEELINK-139). Empilhado sobre o K1 (`feat/BEELINK-160-conversa-do-pedido-api`,
> PR #129). A tela da conversa é o K3 (loja) e o K4 (painel): aqui só o canal e o que ele invalida.

## Definição de Pronto

1. Um gateway WebSocket na API (Nest sobre Fastify), em `/api/socket.io`.
2. O navegador entra com um ticket curto (60 s, uso único) que o BFF pede à API com a sessão dos
   cookies. A API troca o ticket pela identidade: lojista da loja X, ou cliente da loja X. Os tokens
   de sessão nunca chegam ao JavaScript.
3. Salas: a da loja (painel) e a do cliente naquela loja. Eventos: mensagem nova, conversa lida,
   conversa fechada, pedido novo e mudança de status do pedido.
4. A escrita continua pelo REST e pelo BFF: o socket só avisa, com o mínimo (qual pedido, o quê).
5. O cliente do socket reconecta com espera crescente e, ao voltar, invalida as queries do TanStack
   Query (e relê a página na loja), para nada se perder enquanto esteve fora.
6. Web: um componente abre o canal no painel e outro na loja (com o cliente logado), e cada evento
   invalida as queries certas. Nenhum `fetch` em componente.
7. A URL pública do socket no `.env.example` do web, e uma nota em `docs/repo` sobre a hospedagem
   (WebSocket) e o adaptador Redis com mais de uma instância.
8. Testes: unidade na API e no web, e2e do canal (ticket, salas, eventos, ticket usado ou vencido),
   e conferência no navegador em :3100.

## Decisões

### 1. Socket.IO, não `ws`

`@nestjs/platform-socket.io`: salas prontas, reconexão com espera crescente e aleatória no cliente,
queda para long-polling quando um proxy corta o WebSocket, e o adaptador Redis oficial para mais de
uma instância. Com `ws`, cada uma dessas seria nossa.

### 2. O ticket mora no banco

`realtime_tickets`: o hash do ticket (nunca o ticket), a identidade (loja, e cliente quando é um) e
quando vence. Trocar é um `DELETE … RETURNING` com o vencimento na condição: uso único mesmo com
mais de uma instância da API, sem Redis. Os vencidos saem a cada emissão.

### 3. O socket é a única conversa direta do navegador com a API

O web não põe a URL da API no navegador: tudo passa pelo BFF. O socket é a exceção, porque o Next
não repassa WebSocket. Ele carrega só o ticket de uso único, e a URL pública vai em
`NEXT_PUBLIC_REALTIME_URL`. A API aceita o socket das mesmas origens do CORS (`CORS_ORIGINS`).

### 4. Um evento só, `event`, com o tipo dentro

`{ type: "order.created" | "order.status" | "conversation.message" | "conversation.read" |
"conversation.closed", orderNumber, … }`. O navegador não lê nada do evento além de saber o que
invalidar: o conteúdo vem do REST, com a validação de sempre.

### 5. Quem emite

Os serviços, depois de gravar: o pedido do carrinho e o do painel (`order.created`), a mudança de
status e o cancelar do cliente (`order.status`, e `conversation.closed` quando fecha uma conversa
que existe), e a conversa (`conversation.message`, `conversation.read`). A loja recebe tudo da sua
sala; o cliente, o que é dele.

### 6. A loja relê a página

As páginas do cliente são desenhadas no servidor. Na loja, um evento de pedido relê a página
(`router.refresh`), e um de conversa invalida as queries da conversa (as do K3). No painel, tudo é
TanStack Query: cada evento invalida as listas e o pedido aberto.

## Fora de escopo

- A tela da conversa (K3, K4), o sino e a aba Conversas do painel (K4).
- O adaptador Redis: fica a nota, e entra quando houver mais de uma instância.
