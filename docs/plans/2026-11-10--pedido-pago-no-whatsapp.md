# Pedido pago online também no WhatsApp da loja, por escolha da loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: pedido urgente do Rafael em 10/11/2026.

## O pedido

Rafael, 10/11/2026: uma loja que recebe pagamento online quer que o pedido vá também para o WhatsApp dela, "o
cliente abrindo a conversa como se fosse finalizar": ele compra os dindins e manda para a loja separar. Tem de ser
configurável, porque outra loja que também recebe online não quer o WhatsApp.

## O desenho

- **Uma opção por loja**, desligada por padrão: "Receber o pedido pago no WhatsApp", em Integrações → Asaas,
  junto do Pix, do cartão e de pagar na entrega. Fica em `asaas_settings.whatsappWhenPaid`. Só aparece enquanto
  Pix ou cartão estão ligados.
- **Depois do pagamento, e não antes.** Quando a API diz que o pedido foi pago, a tela "Pagamento aprovado" mostra
  "Enviar pedido no WhatsApp" com a mensagem pronta (número, itens, entrega, "Pagamento: Pix — já pago pelo site")
  e fica nela, sem ir sozinha para o pedido. Abrir o WhatsApp ao fechar o pedido levaria a pessoa para fora antes
  de pagar o Pix, e no celular ela voltaria para a aba do WhatsApp, não para a do QR code.
- Um `PUT` das configurações sem o campo o deixa como estava: um painel aberto antes do deploy salva o resto sem
  desligar a opção.
- A vitrine lê a opção em `payment-options`, como `online.whatsappWhenPaid`.

## O que fica de fora

- Abrir o WhatsApp sozinho, sem o toque da pessoa: o navegador bloqueia uma aba aberta sem toque, e a confirmação
  do Pix chega sem toque nenhum.
- O botão na página do pedido, para quem saiu da tela de pagamento antes de tocar.
