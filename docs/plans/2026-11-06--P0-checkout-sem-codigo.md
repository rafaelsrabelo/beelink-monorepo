# P0 — o checkout sem código, sem conta e sem dizer quem é cliente

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Ticket colado por Rafael em 06/11/2026: "TASK P0 — Remover bloqueio de verificação de e-mail no Checkout",
> prioridade crítica, antes de qualquer redesign.

## O pedido

Hoje (#284), um e-mail que já tem conta na loja para a compra em "Confirme que é você" e manda um código de 6
dígitos. O P0 decide: **a verificação de e-mail não pode ser obrigatória para comprar como visitante.** Nada de
código, confirmação de e-mail, senha, login ou criação de conta; e-mail novo e e-mail cadastrado avançam igual;
**não expor se um e-mail está cadastrado**; ter o e-mail de alguém não dá acesso à conta, aos endereços, ao
histórico nem a benefícios; o pedido de visitante confirmado e consultado por um identificador limitado a ele.

## O desenho

**A sessão do visitante** — a sessão de compra de [whatsapp-primeiro](2026-11-06--whatsapp-primeiro.md),
agora com uma linha no banco (`purchase_sessions`): o que o visitante digitou (nome, e-mail, telefone, e o
endereço quando houver), o cadastro da loja em que o pedido entra, e até quando vale. O token carrega só o id
da sessão e a loja; 7 dias, para dar tempo de pagar um Pix (3 dias); encerrar é marcar a linha.

- **"Seus dados"** — `POST customer/checkout` com nome, e-mail e telefone abre a sessão. **A mesma resposta
  para qualquer e-mail ou telefone.** Nenhuma conta é criada ou consultada pelo e-mail.
- **O cadastro do pedido é o do telefone**, a regra que o painel já usa numa venda pelo WhatsApp (o telefone
  identifica um cliente dentro da loja); sem cadastro com aquele telefone, um novo, com o nome digitado. Nada
  desse cadastro chega ao visitante.
- **O endereço é o que o visitante digitou**, guardado na sessão (`PUT customer/purchase/address`) e copiado
  para o pedido. Os endereços salvos de qualquer cadastro não são lidos nem escritos.
- **O que a sessão faz**, pelas rotas marcadas `@OpenToPurchase()`: ler a si mesma (`GET customer/purchase`),
  guardar o endereço, cotar, ver cupons, fazer o pedido, ler o pedido e o pagamento — só os pedidos dela. Nada
  de cashback, o CPF sempre digitado, o endereço do pedido devolvido mascarado. Toda outra rota a recusa.
- **O pedido guarda o e-mail digitado** (`orders.contactEmail`): a loja tem como falar com quem comprou.
- **Quem está logado** continua como está: a sessão da conta, sem pergunta nenhuma.

## O que sai

- O passo do código no checkout, as rotas `checkout/code` e `checkout/code/resend`, o e-mail do código e a tabela
  `sign_in_codes` (migration).
- A conta criada pelo checkout (#284). O canal de aceite `CHECKOUT` fica no enum, sem uso: um visitante não
  tem conta onde guardar o aceite, e o aviso ao lado do botão continua.
- O "reconhecer pelo WhatsApp" (`checkout/phone`, endereços mascarados do cadastro): dizia quem é cliente.

## Definition of Done

1. Cliente novo e cliente com e-mail cadastrado compram sem código, sem senha, sem conta, pelo mesmo caminho.
2. `POST customer/checkout` responde igual para qualquer e-mail e telefone; nenhum código é enviado.
3. O visitante não lê nada de uma conta ou cadastro existente: nem nome, endereços, histórico, CPF ou cashback.
4. O pedido de visitante entra no cadastro do telefone (ou num novo), com o endereço e o e-mail digitados.
5. Pix e cartão funcionam pela sessão do visitante, que só lê o próprio pedido e o pagamento dele.
6. Recarregar a página mantém a sessão, os dados e o endereço; nada de código reaparece.
7. Quem está logado compra como antes.
8. Lojas diferentes não se enxergam: uma sessão é estranha em outra loja.
9. A regra de produto diz o que mudou.
10. `pnpm ci-check` verde; e2e da API para cada item; web com testes da rota e do checkout.
