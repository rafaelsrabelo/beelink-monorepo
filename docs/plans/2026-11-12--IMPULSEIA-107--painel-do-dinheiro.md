# IMPULSEIA-107 (AF7) — o painel do dinheiro: o que a loja deve a cada afiliado

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A sétima tarefa do épico [Afiliados](2026-10-24--afiliados.md), empilhada sobre AF6 (#310). Vale o
> que as decisões 7, 8 e 9 dizem, **como o adendo de 11/11 as mudou**: o "quanto devo" é por
> vencimento (item A), e o lojista pode tirar a foto ou a frase de um afiliado (item D).

## O pedido

O lojista vê o afiliado de cada pedido e filtra os pedidos por afiliado; escolhe um afiliado numa venda
registrada no painel; tira ou troca o afiliado de um pedido enquanto a comissão está pendente, dizendo
por quê; vê o saldo e o extrato de cada afiliado, ajusta com motivo e registra o pagamento feito por
fora; e vê, numa tela só, quanto deve e para quando.

## Definition of Done

1. **O afiliado do pedido**: `GET /stores/:slug/orders/:number/affiliate` responde quem é, a comissão
   (estado, base, valor, tabela, motivo de zero, vencimento), o histórico das trocas e quanto do pedido
   já foi estornado (BEELINK-208). A tela do pedido mostra um cartão "Afiliado" com isso, e o aviso de
   que um estorno parcial não mexeu na comissão sozinho.
2. **Trocar ou tirar**: `PUT …/orders/:number/affiliate` `{ affiliateId | null, reason }`, só com o
   pedido não cancelado e a comissão pendente (ou sem afiliado). A comissão nova é calculada na tabela
   do afiliado de agora, com a mesma conta da AF6 (compra própria inclusive); um pedido já entregue
   ganha o vencimento do dia da entrega. Cada troca fica no histórico do pedido, com o motivo e o autor.
   Comissão já disponível: `409 AFFILIATE_COMMISSION_NOT_PENDING` — a correção é um ajuste.
3. **Venda registrada**: `affiliateId` opcional em `POST /stores/:slug/orders`, só para afiliado ativo,
   com o programa ligado e os links no ar; a tela "Registrar venda" tem o campo quando isso vale.
4. **Filtro**: `affiliateId` em `GET /stores/:slug/orders`; a lista lê `?affiliate=` do endereço e
   mostra de quem é o filtro, com um jeito de tirar. A ficha do afiliado leva aos pedidos dele.
5. **Extrato e saldo**: `GET /stores/:slug/affiliates/:id/statement` (pendente, disponível — que pode
   ser negativo —, as linhas paginadas). Ajuste `POST …/adjustments` (± com motivo, autor guardado) e
   acerto `POST …/payouts` (valor até o saldo disponível, dia, Pix/transferência/dinheiro, nota), que
   escreve `PAID_OUT`. Tudo sob a trava do afiliado, com os saldos refeitos.
6. **"Quanto devo"**: `GET /stores/:slug/affiliate-program/owed` e a aba "A pagar": o que se deve por
   dia de vencimento ("dia 20: R$ X para N afiliados"), atrasado ou de hoje; o que vai vencer; o que
   espera a entrega; e a lista por afiliado, com a chave Pix e o caminho para registrar o pagamento.
7. **Foto e frase**: `DELETE …/affiliates/:id/photo` e `…/tagline` tiram o que a vitrine mostra; a
   ficha tem os dois botões.
8. Contracts primeiro; e2e de cada rota; o e2e completo da API verde; `pnpm ci-check` verde; blocos
   novos com história e teste com axe; o fluxo dirigido no navegador.

## Decisões

### O afiliado do pedido é uma leitura à parte

O pedido (`Order`) já é lido por muitas telas e testes; o afiliado chega por uma rota própria, lida só
pela tela do pedido. Assim nenhum consumidor de `Order` muda, e a vitrine nunca recebe nada disso.

### Trocar exige o pedido aberto e a comissão pendente

É a regra da decisão 7. A troca trava a loja (como uma mudança de status), depois os afiliados — o de
antes e o de agora, pela ordem dos ids — e só então mexe na comissão: a mesma ordem de travas da AF6.
A comissão antiga, pendente, não deixou linha no extrato, e é apagada; a nova nasce pendente.

### Quem perde o pedido não recebe e-mail; quem ganha, recebe

O e-mail de venda é lido na hora de sair, do afiliado da comissão de então. Na troca, o aviso de venda
do pedido é refeito para o afiliado novo (o antigo, se ainda não saiu, não sai mais). Quem perde o
pedido deixa de vê-lo na área dele (AF8); um e-mail de "pedido tirado de você" fica para depois, se
fizer falta.

### Escolher afiliado pede o programa ligado e os links no ar

O nome do cliente vai para o afiliado (adendo B), e isso só pode acontecer depois da política nova
(AF9). Por isso a venda registrada e a troca para um afiliado obedecem ao mesmo
`AFFILIATE_LINKS_ENABLED` da vitrine. Tirar o afiliado de um pedido vale sempre. O programa conta ao
painel se pode (`linksLive` no `AffiliateProgramOverview`), e a recusa é
`409 AFFILIATE_ATTRIBUTION_CLOSED`.

### Só afiliado ativo

Pausado não atribui pedidos novos (decisão 5); encerrado, nunca mais. Escolher um deles é
`409 AFFILIATE_STATUS_INVALID`.

### O acerto não passa do saldo

O valor padrão é o saldo disponível, e pode ser menor (decisão 9). Mais do que o saldo, ou um saldo de
zero ou negativo, é `409 AFFILIATE_PAYOUT_EXCEEDS_BALANCE`: um adiantamento se registra como ajuste,
com motivo. O dia do pagamento não pode ser no futuro.

### "Quanto devo": cada acerto paga o mais antigo primeiro

O que se deve a um afiliado é o saldo disponível. Para dizer de que vencimento ele é, o saldo vai para
as comissões disponíveis mais recentes, porque um pagamento quita primeiro o que venceu antes. O que
sobra depois de todas as comissões (um ajuste a favor) é "sem vencimento". Um dia antes de hoje com
algo ainda devido é atrasado; o de hoje vence hoje. O que vai vencer são as comissões pendentes já com
dia; o que espera a entrega não tem dia.

### Sem comprovante na v1

O módulo de uploads é das fotos do catálogo; um comprovante pediria outro tipo de arquivo e outra
política de acesso. O acerto guarda a nota, e o comprovante fica para depois.

### O e-mail do acerto fica na AF8

O plano o põe na área do afiliado, que é para onde o e-mail leva.

### Sem autor na tela

O ajuste e o acerto guardam quem os fez (`actorId`), mas a loja tem um dono só; a tela não diz o nome.

## Fora de escopo

- A área do afiliado, as leituras dele, a edição de foto e frase e o e-mail do acerto: AF8.
- A política de privacidade, `docs/product` e ligar `AFFILIATE_LINKS_ENABLED`: AF9.
- Exportar o "quanto devo" em planilha.
- O comprovante do acerto.
