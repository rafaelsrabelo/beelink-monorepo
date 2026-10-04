# BEELINK-258 — N8: o e-mail de pedido enviado diz a transportadora e o código de rastreio

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Épico N (BEELINK-180). Área: API · ajuste · P. Depende do N7 (BEELINK-188), que grava o rastreio do
> Melhor Envio no registro de entrega e move o pedido para "saiu para entrega" quando a etiqueta é postada.

## O pedido

> Quando o pedido sai por transportadora, o cliente recebe no e-mail a transportadora e o código de
> rastreio, sem precisar abrir o pedido para descobrir.

Hoje o e-mail de status (`orderStatusChanged`, pago pelo `OrderStatusMailer`) diz só "saiu para entrega",
seja quem for que leva o pedido.

## Definição de Pronto

1. **Pedido por transportadora** — o registro de entrega é `CARRIER` — ao ir para "saiu para entrega":
   o assunto diz `pedido nº N enviado` e o texto diz que ele **foi enviado pela transportadora**, com o
   nome dela e o do serviço quando houver (`Correios (SEDEX)`).
2. O mesmo e-mail traz o **código de rastreio**, quando houver, e o **link de acompanhamento**, com a
   regra do `order-tracking.ts` (`toCustomerDelivery`): o link gravado; sem ele, a página dos Correios
   para um código dos Correios; sem nenhum, só o código. Sem código, diz que ele aparece no pedido assim
   que for informado.
3. **Entrega própria** (registro `OWN`, ou nenhum registro) **e retirada**: o e-mail é o de hoje,
   palavra por palavra.
4. Os outros status (confirmado, entregue, cancelado) não mudam.
5. O que a loja ou a transportadora escreveu (nome, serviço, código, link) sai escapado no HTML, e o
   link só vira `href` quando é `https`.
6. **Conversa do pedido:** conferida; a linha de status não mostra dados da entrega, então fica como
   está (ver Decisões).
7. **Rastreio que chega depois do status:** decidido e registrado (ver Decisões).
8. Testes: o template (unitário) e os dois caminhos ponta a ponta — a transportadora postando pelo
   webhook do Melhor Envio, e o lojista contando a entrega à mão — além da entrega própria intacta.
9. `pnpm ci-check` verde.

## O que entra

Só `apps/api`:

- `shared/mail/mail.templates.ts`: `OrderStatusContent` ganha `shipment` (transportadora, serviço,
  código e link), e `orderStatusChanged` escreve o "enviado" quando ele vem.
- `modules/orders/order-status-mailer.ts`: lê o registro de entrega na hora do envio e o passa ao
  template pelo `toCustomerDelivery`, só para "saiu para entrega" de um pedido por transportadora.
- Testes: `mail.templates.spec.ts`, `test/order-status-emails.e2e-spec.ts` e
  `test/carrier-tracking.e2e-spec.ts`.

Nada em `packages/contracts`: nada novo cruza a rede.

## Decisões

1. **"Por transportadora" é o registro de entrega `CARRIER`**, venha do checkout (N5, Melhor Envio) ou
   do lojista contando a entrega à mão no painel. O cliente lê a mesma coisa nos dois casos, como já lê
   em Minha conta.
2. **O link segue o `toCustomerDelivery`, reaproveitado, não copiado:** a regra dos Correios mora num
   lugar só.
3. **Rastreio que chega depois do status:** o e-mail é montado quando o outbox o envia, logo depois do
   commit da mudança, e usa o rastreio que existir naquele momento. Não há um segundo e-mail quando o
   código chega depois: o cliente o vê no pedido, e o e-mail sem código diz isso ("aparece no pedido
   assim que for informado"). No caminho do Melhor Envio, o `CarrierTracking` grava o código antes de
   mover o pedido, então um "postado" que já traz o código chega ao e-mail com ele.
4. **Conversa do pedido:** a linha de status grava só o status (e o cashback da entrega); cada lado a
   escreve com as próprias palavras, sem dados da entrega. Ela continua como está. Mostrar a
   transportadora e o código ali seria uma mudança de contrato (`OrderMessage`) e de web, fora deste
   ticket.
5. **Link só `https`** no e-mail: o do lojista já é validado assim, mas o do Melhor Envio é gravado como
   chega, e uma caixa de e-mail não tem o React para barrar um `javascript:`. Um link que não seja
   `https` some do e-mail; o código continua.
6. **As palavras do e-mail são as da tela do pedido:** "Código de rastreio" e "Ver no site da
   transportadora".

## Fora de escopo

- Um segundo e-mail quando o rastreio chega depois do status.
- Dados da entrega na conversa do pedido.
- Os e-mails de "entregue" e de outros status, que continuam iguais.
- `docs/product`: ele não descreve o conteúdo dos e-mails de status, e continua sem descrever.
