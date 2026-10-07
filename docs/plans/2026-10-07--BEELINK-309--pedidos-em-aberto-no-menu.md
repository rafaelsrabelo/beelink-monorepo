# BEELINK-309 · H11 — Menu lateral do painel: "Pedidos" mostra quantos estão em aberto, ao vivo

> Épico H. Toca `packages/contracts`, `apps/api`, `apps/web` e `packages/ui`, por isso mora aqui.

## O pedido

Nas palavras do dono:

> "No sidebar do admin, Pedidos tem que ter sempre o número de pedidos em aberto. Hoje quem tem comportamento de mostrar que chegou pedido é a notificação; o sidebar tem que ser dinâmico também. E a notificação poderá ter de outras coisas: a notificação poderia ser de um chat, chegou msg no chat, pedido aceito… então notificação é geral e o sidebar é específico, e tem que ser dinâmico."

O princípio: **o sino é geral** (qualquer novidade), **cada item do menu é específico** da sua área e mostra o número vivo dela. Este ticket faz a metade do menu e a base que as outras áreas reaproveitam. Não redesenha o sino.

## O que existe hoje (lido no código em 07/10/2026)

- **Menu.** `apps/web/src/components/app-shell.tsx` monta a lista de itens e a entrega ao bloco `AdminSidebar` (`packages/ui/src/blocks/admin/admin-sidebar.tsx`). O item já aceita `badge` + `badgeLabel` (`DashboardNavItem`). "Conversas" e "Avaliações" já têm número; "Pedidos" não. Recolhido (`railCollapsed`, cookie `bl_prefs`), o número **some** (`lg:hidden`).
- **Leituras da casca ao abrir o painel de uma loja** — cinco:
  1. `orders?status=RECEIVED&pageSize=5` (sino: pedidos que ninguém aceitou);
  2. `orders?payment=PAID_UNSEEN&pageSize=5` (sino: pagos online que ninguém abriu);
  3. `conversations/unread` → `{ messages, conversations }` (sino soma `messages`; menu mostra `conversations`);
  4. `conversations?filter=UNREAD` (sino: a lista);
  5. `reviews/unseen` → `{ count }` (menu; relida a cada minuto, nenhum evento a anuncia).
- **O que o sino mostra hoje.** A soma de: mensagens de clientes não lidas + pedidos `RECEIVED` + pedidos pagos online ainda não abertos; a lista com os 8 mais recentes desses três tipos; o mesmo número no título da aba. Os avisos na hora (toast) são: pedido novo feito por cliente, mensagem de cliente, pagamento aprovado, dinheiro que o pedido não pediu.
- **Canal em tempo real** (`docs/repo/realtime.md`): eventos `order.created`, `order.status`, `order.payment`, `conversation.message`, `conversation.read`, `conversation.closed`. `PanelRealtime` invalida as consultas de `panelKeysOf(event, slug)`; ao reconectar, invalida tudo.
- **Quem escreve o status de um pedido**: só dois lugares, e os dois publicam `order.status` depois do commit — `OrdersService` (lojista, transportadora, sistema) e `CustomerOrdersService.cancel` (cliente). Criar pedido publica `order.created` nos dois caminhos (vitrine e painel).
- **Índices.** `orders` tem `@@index([storeId, status])`; `order_messages` tem `(conversationId, author, readAt)`; `product_reviews` tem `(storeId, createdAt desc)`.
- **Sessão expirada.** A memória dizia que as chamadas do painel respondiam 401 depois de 15 min. **Não é mais verdade** (BEELINK-169, já no `main`): `src/proxy.ts` renova o par de cookies nas chamadas `/api/*` do painel três minutos antes de vencer. Um 401 agora quer dizer sessão encerrada de fato: `Providers` não tenta de novo e leva ao login, voltando à página. Uma renovação que falha por indisponibilidade responde 503.
- **Lista de pedidos.** Filtro por status um a um ("Todos", "Recebido", …). Não existe "em aberto".
- **Site institucional.** O menu dele não tem Pedidos, Conversas nem Avaliações.

## Definição de Pronto

1. `GET /stores/:slug/panel-counts` responde `{ openOrders, unreadConversations, unreadMessages, unseenReviews }`, formato em `packages/contracts` antes de tudo. Só o dono: sem sessão 401, loja de outro 403, loja que não existe 404, token de cliente recusado.
2. "Em aberto" é uma regra só, na API (`OPEN_ORDER_STATUSES` em `orders.constants.ts`): `RECEIVED`, `ACCEPTED`, `PREPARING`, `OUT_FOR_DELIVERY`. `DELIVERED` e `CANCELLED` ficam fora. Testado status por status. Pedido de outra loja nunca conta. Pedido registrado pelo painel conta (nasce `ACCEPTED`).
3. A contagem é um `COUNT` no índice `(storeId, status)` — nenhum pedido é carregado; nenhuma migração.
4. `unreadConversations`/`unreadMessages` e `unseenReviews` são as mesmas contas que `conversations/unread` e `reviews/unseen` já fazem (o mesmo código, chamado por id de loja), não uma segunda implementação.
5. A lista de pedidos ganha o filtro **"Em aberto"** (`?status=OPEN`), que usa a mesma constante: o total da lista filtrada é o número do menu.
6. No painel de uma loja, "Pedidos" mostra `openOrders`, "Conversas" `unreadConversations`, "Avaliações" `unseenReviews`, de **uma** consulta (`usePanelCounts`). O sino lê `unreadMessages` da mesma consulta: a casca faz uma chamada de contagens, e `conversations/unread` + `reviews/unseen` deixam de ser pedidas por ela (5 leituras → 4).
7. O número se mexe sem recarregar: `order.created`, `order.status` (inclui cancelamento, do lojista, do cliente, da transportadora ou do sistema, nesta aba ou em outra), `conversation.message`, `conversation.read` e `conversation.closed` invalidam a consulta. Nenhum número viaja pelo socket; nenhum socket novo; nenhum evento novo.
8. Com o socket fora: relê ao voltar o foco à janela, ao voltar a rede, e por um relógio lento (60 s com canal configurado, 30 s sem canal, como os vizinhos). As mutações do próprio painel (mudar status, cancelar/reembolsar, registrar pedido, responder/ler conversa, ver avaliações) também invalidam, sem depender do eco do socket.
9. Sessão encerrada (401): não tenta de novo, o relógio para, e o painel leva ao login como já faz. Erro passageiro (503, rede): o último número conhecido continua na tela e a próxima leitura o corrige.
10. O selo: nada em zero; número até 99, depois "99+"; nome acessível em palavras ("Pedidos, 3 em aberto"), sem região viva; visível no trilho recolhido (no canto do ícone) e na gaveta do celular; só tokens; não muda a altura da linha nem empurra o menu ao aparecer ou ir a dois dígitos.
11. Enquanto a contagem não chegou, nenhum selo (nem "0", nem esqueleto).
12. "Este item tem número vivo" é uma propriedade do item, declarada numa lista tipada (`PANEL_MENU_COUNTS`): outra área entra com uma linha.
13. Site institucional: sem itens com número e sem a chamada.
14. Docs: `docs/product/README.md` (o que os números do menu dizem; o sino é o geral), mapas de superfície que os gates pedem. `docs/repo/realtime.md` não muda (nenhum evento novo).
15. `pnpm ci-check` verde; e2e completo da API verde em banco próprio; provado no navegador (dois contextos) com os números anotados.

## Decisões tomadas pelo assistente, para o dono confirmar

1. **"Em aberto" = todo pedido que ainda pede algo da loja**: Recebido, Aceito, Em preparo e Saiu para entrega. Não só os recém-chegados — quem anuncia "chegou pedido" é o sino; o menu diz quantos ainda estão na mão da loja. É a mesma lista que a aba "Em andamento" do cliente e que o "aberto" das conversas já usam; a constante passa a ter um nome e uma casa (`OPEN_ORDER_STATUSES`, em pedidos), e conversas a importam de lá.
2. **Pedido registrado pelo painel conta.** Nasce "Aceito": ainda falta preparar e entregar.
3. **Um endpoint para todas as contagens**, `panel-counts`, em vez de um por item. Os endpoints antigos (`conversations/unread`, `reviews/unseen`) continuam na API — nada os remove —, mas a casca não os chama mais.
4. **O sino e o menu dividem uma consulta** (a chave `panelCountsKeys.shop(slug)`): o sino tira dela as mensagens não lidas; as duas listas de pedidos e a lista de conversas não lidas continuam sendo dele, porque são listas, não números. Nada mais muda no sino.
5. **"Conversas" conta conversas** com mensagem não lida (como já era), não mensagens; o sino continua somando mensagens. Os dois números vêm na mesma resposta.
6. **Filtro "Em aberto" na lista de pedidos**, depois de "Todos". É a única mudança na tela de pedidos: sem ele o número do menu não teria onde ser conferido. O link "Pedidos" continua levando à lista inteira — mudar a porta de entrada da tela é decisão do dono.
7. **Sem selo enquanto carrega.** A regra "carregando é esqueleto" existe para conteúdo cujo lugar se conhece. Um selo é a *presença* de algo esperando: um esqueleto afirmaria que há algo, e piscaria em toda loja sem pedido; um "0" mentiria por um instante. Ausente até saber é o estado honesto, e o selo foi desenhado para não mexer no layout quando chega.
8. **Relógio lento de 60 s** mesmo com o canal ligado. Avaliações não têm evento (já eram relidas a cada minuto), e é o que conserta o número se o socket cair sem avisar. Aba escondida não consulta; ao voltar, relê na hora.
9. **Nenhuma migração.** O índice `(storeId, status)` já serve o `COUNT`.
10. **Recolhido, o selo vai para o canto do ícone** em vez de sumir, menor, ainda com "99+".

## Fora do escopo

- Redesenhar ou ampliar o sino. Fica anotado para um ticket de "central de notificações":
  - **hoje ele mostra**: pedido novo (Recebido), pagamento online aprovado ainda não visto, conversa com mensagem não lida;
  - **o dono disse que poderia mostrar**: "de um chat, chegou msg no chat, pedido aceito…" — isto é, novidades de qualquer área, inclusive mudanças de status. Faltaria decidir: quais eventos viram notícia, se a notícia é guardada (hoje o sino é derivado de leituras, não há tabela de notificações nem "marcar como lida"), e o que acontece com avaliações novas, leads e estoque.
- Som, push do navegador.
- Números em outros itens do menu (Produtos sem estoque, Leads…): a base fica pronta, nenhum é ligado agora.
- Mudar status de pedidos ou a tela de pedidos além do filtro.
- Evento em tempo real para avaliação nova (continua por relógio).
