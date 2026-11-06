# Reconhecer pelo WhatsApp e seguir: a sessão de compra

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: quarto passo do ticket de checkout de 05/11/2026, depois do #282 (endereço), do #284
> (compra sem cadastro) e do #286 (etapas).

## O pedido

Rafael, 06/11/2026, estudando o checkout da Yampi: "seria interessante no fluxo identificar pelo número do
celular se já é cliente e continuar, não é pra ser uma trava". Combinado com ele:

- **O WhatsApp vem primeiro** em "Seus dados". Número que a loja já conhece segue **sem código e sem senha**.
- **A tela diz "Bem-vindo de volta", sem o nome.** Quem digitar o número de outra pessoa não descobre como
  ela se chama.
- **Reconhecer não é entrar na conta.** Pelo número, a loja usa os dados só para aquela compra: o endereço
  aparece mascarado, e não aparecem e-mail, pedidos antigos nem cashback. O pedido entra no cadastro que a
  loja já tem daquele número — o que o painel já faz numa venda pelo WhatsApp.

## O desenho

**Uma sessão de compra**, apart da sessão do cliente. Um token assinado (`kind: "purchase"`) com o cadastro
da loja (`customerId`) e um id da compra, de 2 horas, sem renovação. O guard do cliente o aceita só nas rotas
marcadas `@OpenToPurchase()`; em todas as outras é como se não houvesse token.

Abre para a sessão de compra:

- **cotar o carrinho e ver os cupons** — o cashback não entra;
- **fazer o pedido** no cadastro, para um endereço que ele já tem ou para retirada — sem cashback, e com o
  CPF sempre digitado, nunca o do cadastro;
- **ler o pedido e o pagamento dele** — só os pedidos feitos nesta sessão (`orders.purchaseSessionId`);
- **`GET customer/purchase`** — os endereços do cadastro, mascarados ("Rua Tib•••, 12•• — Fortaleza/CE").

Fica fechado: perfil, endereços (criar, editar), favoritos, cashback, conversas, avaliações, privacidade.

**`POST customer/checkout/phone`** com o WhatsApp: número de um cadastro da loja responde `RECOGNIZED` com a
sessão de compra; outro número responde `NEW`, e o checkout pede nome e e-mail (o #284).

## Em dois PRs

1. **API (este):** a sessão de compra, a rota do número, as rotas abertas, a coluna nos pedidos, testes e2e.
   Nada muda na tela.
2. **Web:** "Seus dados" começando pelo WhatsApp; o checkout de quem foi reconhecido ("Bem-vindo de volta",
   "Não é você?", endereços mascarados); a tela do pedido e do pagamento para a sessão de compra.

## Definition of Done (PR 1, API)

1. `POST stores/:slug/customer/checkout/phone` responde `RECOGNIZED` com um token de compra para um número que
   é de um cadastro da loja, e `NEW` para outro. Limite por IP, como a porta de contas.
2. O token de compra vale 2 horas, não se renova e é recusado em toda rota não marcada.
3. Com ele: cotar, ver cupons, fazer o pedido e ler o pedido e o pagamento — só os pedidos desta sessão.
4. O pedido da sessão de compra fica no cadastro do número, recusa cashback e endereço de outro cadastro, e
   pede o CPF digitado quando precisa.
5. `GET customer/purchase` devolve os endereços mascarados, sem nome, e-mail, CPF ou telefone.
6. A sessão completa continua como estava em todas as rotas.
7. Migration: `orders.purchaseSessionId`, nula.
8. `pnpm ci-check` verde; e2e da API cobrindo cada item.

## Decisões

- **Sem cookie novo.** A web guarda o token de compra no cookie de acesso do cliente que já existe, sem o de
  renovação: um cookie `bl_*` novo seria uma linha nova na política de privacidade e uma `LegalVersion` nova.
- **Token sem tabela.** Assinado e com 2 horas, ele não precisa ser revogado; o id da compra vive no token e no
  pedido. Encerrar é apagar o cookie ("Não é você?").
- **Endereço novo pede o e-mail.** Pelo número, ninguém escreve no cadastro de outra pessoa: entregar num
  endereço que o cadastro não tem leva ao caminho do e-mail (#284).
- **Revelar que um número é cliente da loja** é a mesma exceção do e-mail no #284, com o mesmo limite: a regra
  de produto passa a dizer as duas.
- **O CPF nunca vem do cadastro** numa sessão de compra: uma cobrança no CPF de alguém não sai de quem só
  digitou o número dele.

## Fora do escopo

- **Código pelo WhatsApp (Z-API)** para a conta completa: o código continua por e-mail.
- **Juntar cadastros** (`claimedPhone`): continua com o lojista.

## Adendo — 06/11/2026, substituído pelo P0 antes de abrir o PR

No mesmo dia, Rafael mandou o "TASK P0 — Remover bloqueio de verificação de e-mail no Checkout": nenhum código,
nenhuma conta, e **não expor se um e-mail está cadastrado**. Reconhecer o número ("Bem-vindo de volta", endereço
mascarado) diz justamente que o número é cliente da loja: este desenho não segue. A sessão de compra que ele
construiu — o guard que só a aceita nas rotas marcadas, os pedidos presos ao id dela, nada de cashback, o CPF
sempre digitado, o endereço devolvido mascarado — vira a sessão do visitante do P0. Ver
[o plano do P0](2026-11-06--P0-checkout-sem-codigo.md).
