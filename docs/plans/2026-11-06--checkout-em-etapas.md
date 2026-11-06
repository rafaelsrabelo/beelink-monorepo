# Checkout em etapas, uma por vez

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: terceiro passo do ticket de checkout de 05/11/2026, depois do
> [endereço no checkout](2026-11-05--checkout-endereco.md) (#282) e da
> [compra sem cadastro](2026-11-05--compra-sem-cadastro.md) (#284).

## O pedido

Rafael, 06/11/2026, mostrando o checkout da Yampi (e, na véspera, o da Ceyó): "CHECKOUT SIMPLES, rápido e
direto, sem muita informação, o cara tomou a decisão de compra". Combinado com ele, a ordem: **primeiro o
layout em etapas**; depois a identificação pelo WhatsApp (número conhecido segue sem código, a tela diz
"Bem-vindo de volta" sem o nome); depois o funil e o GA4.

## O que já existe, e o que falta

O checkout inteiro está na página do carrinho e mostra tudo de uma vez: quem pede, como receber, como pagar
e o botão. Num celular, depois das linhas do carrinho, é uma coluna comprida. Falta o checkout em três
etapas, uma aberta por vez, como o da Yampi e o da Ceyó: **① Seus dados → ② Entrega → ③ Pagamento**, cada
etapa concluída virando uma linha com "Alterar".

Nenhuma forma nova na rede, nenhuma migration: só `packages/ui` e `apps/web`.

## Definition of Done

1. O checkout aparece em três etapas numeradas ("1 de 3"…), uma aberta por vez.
2. Visitante: ① aberta com "Seus dados" (o formulário do #284); ② e ③ fechadas, dizendo o que fazer antes.
3. Logado: ① concluída, numa linha (nome · celular) com "Alterar dados". ② abre quando falta algo para a
   entrega (sem endereço, endereço recusado, a loja não entrega ali); senão já vem concluída numa linha (como
   receber, onde, frete e prazo) e ③ vem aberta — quem volta com endereço salvo vai direto ao pagamento.
4. Em ②, "Continuar para o pagamento" fecha a entrega e abre ③; se falta algo, diz o quê e não avança.
   "Alterar" numa ② concluída a reabre.
5. ③ tem as formas de pagamento, o CPF quando pedido, a recusa do último envio e o botão de fechar o pedido.
6. A entrega volta a abrir sozinha quando deixa de valer (a cotação diz que a loja não vai ao endereço).
7. Ao abrir ③ pelo botão, o foco vai para ela: no celular, a tela acompanha.
8. Nada muda no que é enviado: o pedido sai com as mesmas escolhas de antes.
9. Celular primeiro, 360 px sem rolagem lateral.
10. `pnpm ci-check` verde; blocos novos com story e teste com axe.

## Decisões

- **As etapas são da UI, não da URL.** A página continua uma só; a etapa aberta é estado do bloco. Voltar
  ao carrinho (endereço salvo, identificação) já reabre na etapa certa, porque ela sai do que falta.
- **Quem volta vai direto ao pagamento.** Com endereço salvo e entrega possível, ② já vem concluída — "o cara
  tomou a decisão de compra". O frete fica à vista na linha de ②.
- **O botão diz o que falta**, como no #282: "Continuar" com a entrega incompleta mostra o motivo em vez de
  ficar desligado.
- **`useCartCheckout` separa o que trava a entrega do que trava o pagamento**, para ② saber quando abrir e
  ③ continuar dizendo o resto (pagamento online indisponível, CPF de quem paga).
- **`StorefrontCheckoutChoices` se divide:** a parte "Como receber" vira `StorefrontCheckoutFulfillment`; o
  bloco antigo fica como composição das duas, para quem o usa.
- **O formulário "Seus dados" perde o próprio título dentro das etapas**: o título é o da etapa.

## Fora do escopo

- **Identificação pelo WhatsApp** — o próximo PR.
- **Um endereço próprio para o checkout** (`/checkout`, separado do carrinho, como a Ceyó): as etapas ficam
  onde o checkout já está.
- **Cartão dentro da página**: continua na página do Asaas.
- **Funil e GA4.**
