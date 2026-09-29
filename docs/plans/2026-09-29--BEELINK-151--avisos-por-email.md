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
