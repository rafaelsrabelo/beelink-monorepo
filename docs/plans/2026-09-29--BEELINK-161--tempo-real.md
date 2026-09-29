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

## Adendo — revisão independente (2026-09-29)

Dois revisores, um na API e um no web. Corrigido:

1. **O socket não pertencia à sessão.** O ticket guardava o usuário, e ninguém o relia: um socket
   seguia ouvindo a sala depois de sair da conta, de trocar a senha ou de um refresh reusado, e uma
   sessão revogada dentro do minuto do ticket ainda entrava. Agora o ticket guarda `sessionId` (no
   lugar de `userId`, na mesma migração, que ainda não tinha saído daqui) e só é tomado com a
   sessão viva (`DELETE … USING sessions`). O socket entra também na sala `session:<id>`, e o
   `SessionService` fecha os sockets em toda revogação (`RealtimePublisher.endSessions`). O gateway
   relê a sessão depois de entrar nas salas, para não perder uma revogação no meio. O publisher foi
   para um módulo próprio, sem imports: o AuthModule não podia importar o RealtimeModule sem ciclo.
   No web, um socket fechado pela API pede um ticket de novo, e a resposta decide se ele volta.
2. **O 401 parava o canal para sempre.** No painel, um 401 é tanto o cookie de acesso de 15 minutos
   vencido quanto a sessão encerrada: o BFF do painel não renova o cookie (o problema conhecido do
   "401 do painel"). Agora o 401 espera o máximo (30 s) e pede de novo; só 403 e 404 (loja que não é
   da sessão, ou que não existe) param. O retry manual ganhou jitter. O pedido do ticket ganhou um
   timeout de 10 s, e a resposta de uma tentativa já superada é descartada.
3. **O canal da loja estava na moldura da página.** A `StorefrontWindow` descarta os filhos quando a
   página é de blocos, então a home e as landing pages ficavam sem canal, e cada página abria um
   socket novo. Agora ele é montado uma vez em `app/[slug]/layout.tsx`, com o cliente lido por
   `shopperAt`, a mesma leitura por requisição que as páginas já fazem para o cabeçalho.
4. **O estoque do painel não se atualizava.** `order.created`, e `order.status` com Cancelado,
   invalidam agora `catalogKeys.products`, como as mutações do próprio painel.
5. **`conversation.closed` relia a página da loja uma segunda vez.** Ele sempre vem junto de um
   `order.status`, que já relê. E a API não o emite mais quando a conversa já estava fechada
   (Entregue → Cancelado).
6. **Os e2e não provavam a maioria dos pontos de aviso.** Entraram:
   - a resposta e a leitura da loja chegando ao cliente;
   - a leitura do cliente chegando ao painel;
   - a leitura sem nada novo, sem aviso;
   - o cancelar do cliente nas duas salas;
   - o pedido do painel chegando ao cliente;
   - dois sockets disputando o mesmo ticket;
   - o fim da sessão fechando o socket e recusando o ticket não usado;
   - o long-polling e o seu CORS.

   O teste de isolamento usa um marcador enviado depois: o que chegou antes dele chegou inteiro, sem
   esperar por tempo.
7. **Duas cópias do `socket.io`.** O `@nestjs/platform-socket.io` fixa 4.8.3, e a API declarava
   ^4.8.4. Agora a API fixa 4.8.3, a versão que roda.
8. **Miúdos:**
   - `RealtimeTicketResponse` foi para `dto/`.
   - `serveClient: false`.
   - O socket ficou tipado (`RealtimeServer`, `RealtimeSocket`), e a identidade virou uma união por
     `audience`, com um CHECK no banco.
   - `REALTIME_TICKET_INVALID` entrou nos contratos, em `RealtimeErrorCode`.
   - O comentário do caminho (fixo, fora do `API_PREFIX`) e o do hash foram corrigidos.
   - `conversations.service.ts` voltou a menos de 250 linhas.
   - `NEXT_PUBLIC_REALTIME_URL` é lido só pela origem, porque um caminho viraria namespace.

Conferido de novo em :3100 depois das correções:
- o canal abre na home da loja;
- o pedido nº 20 passou para Em preparo sozinho, na página do cliente e na lista do painel.

Testes:
- e2e da API inteiro verde no banco privado (33 arquivos, 358 testes), com o do canal em 9 cenários;
- unidade do `SessionService` para os três jeitos de a sessão acabar.

### A decisão 3 estava errada no motivo

"O Next não repassa WebSocket" não é verdade: o servidor do Next repassa o upgrade de um
`rewrites()` para uma URL externa. O que não segura um WebSocket é o route handler, que é o BFF. A
decisão fica. Passar o socket pelo Next deixaria a API sem rota nenhuma, mas:
- o destino do rewrite é fixado no `next build`;
- o redirect da barra final teria de ser desligado nas duas pontas;
- cada página aberta seguraria uma conexão também no processo do web.

O contrato do web (`apps/web/AGENTS.md`) agora registra a exceção.

### Hospedagem, com o deploy do Dokploy em andamento

O compose de produção em preparo (`chore/dokploy-deploy`, ainda fora da main) deixa a API sem rota
pública. O `docs/repo/realtime.md` agora descreve o encaixe:
- um segundo router no Traefik, `Host(<domínio do web>) && PathPrefix(/api/socket.io)`, para a
  porta da API;
- `NEXT_PUBLIC_REALTIME_URL=https://<domínio do web>` no build do web.

É a mesma origem: sem CORS, sem segundo domínio nem certificado, e o resto da API continua sem rota.
Sem essas duas coisas, o canal fica desligado e tudo funciona como antes.

Para mais de uma instância, a nota agora cita o adaptador de Postgres (`LISTEN`/`NOTIFY`, o que o
`deploy.md` do Dokploy prevê) ao lado do de Redis.

### Fica para depois

- **O 401 do painel depois de 15 minutos** (já existia antes do K2). O BFF do painel não renova o
  par de tokens. Com o painel parado por mais de 15 minutos, o evento chega, mas a releitura dá 401
  até a próxima navegação. Isso limita o tempo real do painel e vai limitar o sino do K4. Merece
  ticket próprio antes do K4: o proxy renovar o par também nas rotas `/api/stores/*`, ou o
  `forwardSignedIn` renovar como o `callAsShopper` já faz.
- **Tentativas de handshake sem limite por conexão.** Cada palpite custa um delete por chave
  primária contra 256 bits. Conter uma enxurrada fica com o proxy, como diz a nota.
- **Mudanças na entrega do pedido não avisam** (`setDelivery`, `clearDelivery`). Estão fora da lista
  do ticket, e entram quando o app do entregador mexer na entrega.
- **O intervalo entre a leitura da página e a entrada na sala** não é relido na primeira conexão.
  Está aceito, e escrito no hook.

### Dados de teste

- No `harness_wt`, o pedido nº 20 da loja-do-design foi para Em preparo na conferência.
- A migração foi reescrita e reaplicada no `harness_wt` e no `harness_jk_test`. A tabela só guarda
  tickets de um minuto, então nada se perdeu.
