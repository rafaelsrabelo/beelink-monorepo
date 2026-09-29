# BEELINK-151 — J12 · Avisos por e-mail: andamento do pedido, e as preferências do cliente

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J12 do Épico J (BEELINK-138). Sai do J11 (#142), empilhado. Os e-mails usam a marca da loja e os
> links das páginas da loja, que o J10 fez. Tela: 6h · Perfil e endereços (Avisos).

## Definição de Pronto

1. O cliente recebe um e-mail quando o pedido é aceito, sai para entrega, é entregue ou é cancelado.
   O e-mail tem a marca da loja e um link para o pedido na loja.
2. Só recebe quem tem conta. Um pedido lançado para um cliente sem e-mail não manda nada.
3. As preferências ficam na 6h (Avisos):
   - andamento dos pedidos, ligado por padrão;
   - favoritos que baixaram de preço ou voltaram ao estoque (o envio é do J16);
   - ofertas e novidades da loja, desligado por padrão.

   A escolha de receber ofertas é gravada com a data.
4. O e-mail sai fora da transação que muda o status (outbox): a mudança de status nunca falha por
   causa do e-mail.
5. Testes: e2e da API (outbox, e-mails, preferências), templates, rota do BFF e bloco. Conferência
   em :3100 com o Mailpit.

## Decisões

### 1. Outbox: `OrderStatusEmail`

- **A linha nasce na transação que move o pedido,** com o status novo, junto com o aviso da conversa
  (`noteOrderStatus`). O e-mail nunca se perde, e a mudança nunca espera o e-mail.
- **Depois do commit, um despachante manda o que está pendente,** sem que a resposta espere por ele.
  Uma varredura a cada minuto retenta o que falhou: até 5 vezes, com intervalo crescente.
- **Para dois processos não mandarem o mesmo e-mail,** a linha é reservada com
  `FOR UPDATE SKIP LOCKED`. A reserva empurra o `nextAttemptAt`. `sentAt` marca o que foi.
- **A linha só nasce quando o cliente tem conta e quer o aviso** (`notifyOrders`), lido no momento
  da mudança.

### 2. Quais mudanças avisam

- **Avisam:** aceito, saiu para entrega, entregue e cancelado. Recebido e em preparo não avisam.
- **Um cancelamento feito pelo próprio cliente não manda e-mail:** ele já sabe.
- **Numa retirada, os mesmos status se leem como na tela:**
  - "saiu para entrega" vira "está pronto para retirar";
  - "entregue" vira "foi retirado na loja".

### 3. O e-mail

- **O assunto e o remetente levam o nome da loja,** como no J10: "Loja do Design — pedido nº 12
  confirmado".
- **O corpo** diz o que aconteceu e tem o botão "Ver pedido", que leva a
  `/<loja>/conta/pedidos/<nº>`, nas palavras de rota da loja.

### 4. As preferências

- **No registro do cliente na loja:**
  - `notifyOrders` (padrão ligado);
  - `notifyFavorites` (padrão ligado: é o cliente quem marca um favorito);
  - `notifyOffers` (padrão desligado), com `notifyOffersAt`, a data da última escolha.
- **`CustomerProfile.notifications`** traz as três e a data.
- **A gravação** é `PUT /stores/:slug/customer/me/notifications`.

### 5. A tela

- **A seção "Avisos por e-mail"** fica entre "Endereços" e "Segurança", com as três opções da 6h e
  as descrições dela. O canal é e-mail, e não WhatsApp.
- **Um formulário simples:** caixas de marcar e "Salvar avisos". Ele posta no BFF
  `/<loja>/api/customer/avisos` e volta para `#avisos`, com o aviso.

## Fora de escopo

- Notificação push.
- O envio das ofertas.
- O envio dos avisos de favoritos, que é do J16.

## Adendo da implementação (29/09)

- **O despachante usa o relógio deste processo, e não o do banco.** O Prisma grava `nextAttemptAt` a
  partir daqui. No Docker local, o relógio do banco estava um instante atrás, e uma linha recém-gravada
  ainda não vencia.
- **A tela diz quando a pessoa aceitou as ofertas** ("Você aceitou em 29/09/2026"), no dia de São
  Paulo.
- **A frase "no máximo 1 mensagem por semana", da 6h, ficou de fora.** Hoje nada garante esse limite,
  e o envio de ofertas está fora do escopo.
- **Conferido em :3100 e :3101 com o Mailpit:**
  - os avisos da `cliente-j11` foram salvos pelo BFF, com as ofertas e a data;
  - o pedido nº 25 da loja-do-design, aceito pela dona, mandou "Loja do Design — pedido nº 25
    confirmado", de "Loja do Design", com o link para `/loja-do-design/conta/pedidos/25`.

## Adendo da revisão (29/09)

Dois revisores leram o ramo: um olhou correção, o outro regras e acessibilidade. O que entrou:

- **Só recebe quem confirmou o e-mail da conta.** "Ter conta" era só ter `userId`, e uma conta existe
  antes da confirmação. Qualquer um pode digitar o e-mail de outra pessoa no cadastro. O despachante
  confere de novo na hora de enviar.
- **A reserva tem um prazo próprio, de 10 minutos, separado do intervalo das novas tentativas.** Com a
  reserva de 60 segundos, um envio mais lento que isso ia duas vezes.
  - Uma falha devolve a linha antes do prazo, com 1, 2, 4 ou 8 minutos de espera.
  - O SMTP ganhou timeouts bem menores que a reserva.
  - Uma varredura não começa enquanto outra roda no mesmo processo.
  - Depois da quinta falha, o e-mail é abandonado, com um aviso no log.
- **Um aviso velho não chega depois de um novo.** Se uma mudança posterior do mesmo pedido já foi
  avisada, a linha antiga é dada por encerrada sem envio.
- **Índices:** um por pedido, para a cascata, e um parcial com o que ainda está devido. Isso deixa de
  fora o enviado e o abandonado.
- **O e-mail leva ao lugar exato de desligar o aviso** (`/conta/perfil#avisos`), num rodapé depois do
  botão, e diz "desmarque e salve". A frase ficou "Seu pedido nº 25 em Loja do Design foi
  confirmado."
- **Uma sessão que terminou antes de salvar leva a Entrar** com "Sua sessão já tinha terminado, e nada
  foi feito" e a volta para a própria seção. O mesmo vale para a Segurança (J11).
- **O cartão inteiro de cada aviso marca a caixa,** e o nome acessível continua sendo o título.
- **Um POST que não é formulário não desliga todos os avisos:** volta com erro, sem salvar.
