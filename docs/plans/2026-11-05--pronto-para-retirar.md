# Pronto para retirar

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio direto, sem um BEELINK. O número entra num adendo quando existir.

## O pedido

Rafael, 05/11/2026, sobre https://beelink.biz/admin/mutante-suplementos/orders/24: "Hoje em dia se o pedido
for pra retirada, eu nao consigo como dono da loja, marcar que ta pronto pra retirada, isso deveria existir e
deveria notificar o cliente via chat, email".

## O que já existe, e o que falta

O produto já tem a ideia de "pronto para retirar". Ela é o status `OUT_FOR_DELIVERY` num pedido de retirada:

- **E-mail ao cliente** (BEELINK-151): `orderStatusChanged` diz "pedido nº N em <loja> está pronto para
  retirar" quando o pedido é de retirada (`mail.templates.ts`), e o e2e `order-status-emails.e2e-spec.ts` prova.
- **Card e página do pedido na loja:** `order-card-view.ts` e `order-page-view.ts` já dizem "Pronto para retirar".
- **Aviso no chat** (BEELINK-236): a API grava o aviso em qualquer mudança de status (`noteOrderStatus`).

O que falta está todo no painel e nas palavras do chat:

- **O painel tira o passo de propósito.** `flowOf` em `order-status-actions.tsx` remove `OUT_FOR_DELIVERY`
  de uma retirada ("A pick-up never goes out for delivery", 25/09). A loja e o e-mail aprenderam a ler esse
  status numa retirada quatro dias depois, e o painel ficou para trás.
- **O painel chama o status de "Saiu para entrega"** em toda parte: o selo, o histórico, os botões, a linha da
  conversa e a mensagem de WhatsApp.
- **O chat diz "saiu para entrega"** dos dois lados: `statusNoticeKeyOf` só troca o `DELIVERED` de uma
  retirada ("retirado"), não o `OUT_FOR_DELIVERY`.

## Definition of Done

1. Num pedido de retirada aceito ou em preparo, o próximo passo do painel é "Marcar como pronto para
   retirar". Depois dele vem "Marcar como retirado".
2. Em todo o painel, uma retirada nesse status se chama "Pronto para retirar", e uma retirada entregue se
   chama "Retirado": selo da lista, cards, detalhe, histórico, pedidos do cliente, conversa e mensagem de
   WhatsApp.
3. Marcado, o cliente com conta lê no chat do pedido "Seu pedido está pronto para retirar na loja.", e a
   loja lê "Pedido pronto para retirar".
4. Marcado, o cliente com conta e e-mail confirmado recebe o e-mail "pronto para retirar", se não desligou
   os avisos de pedido.
5. Um pedido de entrega continua exatamente igual.
6. `pnpm ci-check` verde.

## Decisões

- **O mesmo status, e não um novo `READY_FOR_PICKUP`.** O e-mail, a página do cliente e as regras de "pedido
  aberto", da aba do cliente e da conversa já leem `OUT_FOR_DELIVERY` numa retirada como "pronto para
  retirar". Um status novo pediria migration, contrato, API, e-mails e todas essas regras de novo, para dizer
  a mesma coisa. O preço é o nome técnico: quem lê o banco ou filtra a API por status vê "out for delivery"
  numa retirada. A tela não mostra esse nome em lugar nenhum.
- **As palavras dependem da forma de entrega num lugar só**, `orderStatusLabelOf` em `packages/ui/src/lib/`,
  e o aviso do chat ganha a chave `READY_FOR_PICKUP` em `status-notice.ts`, como o `PICKED_UP` já tinha.
- **"Pronto para retirar", e não "pronto para retirada"**: é como a loja e o e-mail já dizem ao cliente.
- **O filtro da lista** é um só para os dois casos, já que o status é o mesmo. O chip passa a dizer "Saiu ou
  pronto para retirar".

## Fora do escopo

- **Cliente sem conta** (pedido lançado pela loja para um telefone): não tem chat nem e-mail para receber o
  aviso, e continua assim. A loja segue tendo o botão de WhatsApp, que agora diz "Pronto para retirar".
- **Aviso por WhatsApp automático** ou push: não existem hoje para nenhum status.
- **Pedidos com transportadora:** o status que a transportadora move continua "Saiu para entrega".
