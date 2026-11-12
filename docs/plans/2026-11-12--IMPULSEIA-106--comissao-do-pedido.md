# IMPULSEIA-106 (AF6) — a comissão do pedido

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A sexta tarefa do épico [Afiliados](2026-10-24--afiliados.md), empilhada sobre AF5 (#309). O
> desenho comum está lá; aqui vale o que as decisões 6 a 9 dizem **como o adendo de 11/11 as mudou**:
> a comissão vence por calendário, contado pela entrega (item A), e o afiliado recebe e-mail a cada
> venda (item C).

## O pedido

O pedido feito pelo link de um afiliado credita a comissão dele: atribuída na hora do pedido,
calculada item a item, pendente até a entrega, com vencimento pelo calendário, disponível no dia do
vencimento, estornada no cancelamento, e um e-mail ao afiliado a cada venda e a cada cancelamento.

## Definition of Done

1. O web manda com o pedido a visita que o cookie `bl_affiliate` guarda, pelo mesmo caminho das UTMs, e
   ignora o que a página mandar nesse campo.
2. A API atribui o pedido só se, na hora: o afiliado é da loja e está `ACTIVE`, o programa está ligado,
   `AFFILIATE_LINKS_ENABLED` está ligado e a visita tem no máximo `attributionDays`. Senão o pedido
   entra sem afiliado e sem erro. O pedido guarda `affiliateId` e `affiliateVisitAt`.
3. A conta é uma função pura irmã de `cashback-earning.ts`, sobre a **mesma** repartição: a base é o
   que se pagou pelos produtos (sem frete), a taxa de cada item é `tabela.produto ?? tabela.geral`, e a
   repartição vira uma função só que as duas usam — os testes do cashback passam sem mudança.
4. O pedido guarda a comissão (`AffiliateCommission`: base, valor, nome da tabela) e cada linha
   (`AffiliateCommissionLine`: taxa, base, valor), e as linhas somam o pedido.
5. Compra do próprio afiliado (e-mail ou telefone do cliente iguais aos do afiliado): comissão zero, com
   o motivo, e nenhum e-mail.
6. Entregue: a comissão ganha `dueOn`, o vencimento do período do dia da entrega ao prazo do programa.
   Uma varredura a torna disponível no `dueOn`, com uma linha `RELEASED` no extrato.
7. Saiu de entregue antes de disponível: volta a esperar, sem vencimento. Depois de disponível: linha
   `REVERSED` negativa e volta a esperar. Cancelado antes: estornada, nunca vence. Depois: linha
   `REVERSED` negativa; o saldo pode ficar negativo.
8. Saldos `pendingCents` e `availableCents` no afiliado, refeitos das comissões e do extrato sob a trava
   do afiliado, em toda mudança.
9. E-mail ao afiliado a cada venda atribuída (número, nome do cliente, itens, comissão prevista) e a cada
   cancelamento de um pedido dele, por uma caixa de saída, um por pedido e por tipo.
10. `pnpm ci-check` verde; teste unitário da conta e da repartição; e2e do ciclo inteiro; o e2e completo
    da API verde.

## Decisões

### A repartição: a média ponderada do cashback, e a sobra por maior resto

O cashback já faz a repartição sem dizê-la: a taxa média ponderada pelo valor de cada linha, vezes a
base, é exatamente a soma, linha a linha, de "a parte da linha na base × a taxa da linha". Essa conta
sai de `cashback-earning.ts` para `orders/products-share.ts` (`weightedRateOf`, `shareCentsOf`), e as
duas a usam. O valor do pedido é essa conta, arredondada para baixo ao centavo — o mesmo número que o
cashback daria com as mesmas taxas.

As linhas (`lineSharesOf`) repartem a base e a comissão pelo mesmo peso, cada uma arredondada para
baixo, e a sobra vai para as linhas de maior resto. Assim as linhas somam o pedido ao centavo, e o
pedido nunca é outro número que não o da média.

*Por quê:* "mexer em uma sem a outra é o erro que se quer evitar" (decisão 6). Uma repartição que
desse um centavo diferente do cashback em algum carrinho seria esse erro.

### Atribuída na hora, recusada em silêncio

A API refaz as quatro conferências dentro da transação do pedido, depois de travar a loja. O cookie é
do visitante e pode ter sido editado: um id que não é de um afiliado ativo da loja simplesmente não
atribui. Nenhuma conferência recusa o pedido (decisão 7).

### Venda registrada no painel não atribui aqui

Escolher o afiliado no formulário da venda, e trocar ou tirar o afiliado de um pedido, são AF7.

### Compra própria: e-mail ou telefone

O e-mail comparado é o da conta da loja do cliente ou, na compra sem cadastro, o que ele digitou; o
telefone, o do cadastro dele. Os dois lados guardam o telefone só com dígitos e o código do país.

### O vencimento é o prazo do programa na entrega

O período é o do dia da entrega, e o prazo é o que o programa tiver nesse dia. A taxa é fotografada no
pedido; o prazo, não — ele diz quando a loja paga, e uma mudança vale para o que for entregue dali em
diante.

### Sair de entregue volta a esperar, como no cashback

O épico dizia "estornada" também para quem sai de *entregue* antes de liberar. Isso puniria o afiliado
pelo engano do lojista que marcou entregue antes da hora: o pedido voltaria a *entregue* e a comissão
não. Como o cashback (`revokeOrderCashback`, `BACK`), a comissão volta a esperar, sem vencimento, e uma
nova entrega dá um novo vencimento. Cancelar é que estorna para sempre.

### Saldos refeitos, não somados

`pendingCents` é a soma das comissões pendentes; `availableCents`, a soma do extrato. Os dois são
relidos sob a trava do afiliado a cada mudança, como `recountCashback`, então nenhum caminho soma
errado: o cache é sempre a soma do que o explica.

### A ordem das travas

Loja → cliente → afiliado → comissão. A varredura e o AF7 travam o afiliado antes de tocar numa
comissão, e nunca a loja depois do afiliado.

### Os e-mails vão sozinhos

Uma caixa de saída (`affiliate_sale_notices`), um aviso por pedido e por tipo (`SALE`, `CANCELLED`),
mandado pelo `OutboxMailer` no seu próprio relógio, a cada minuto. O cancelamento só avisa quem foi
avisado da venda. O botão leva à área do afiliado, `/afiliado` (AF8), que está no ar antes dos links
(AF9 liga `AFFILIATE_LINKS_ENABLED`).

### Os tipos do extrato nascem todos

`AffiliateEntryKind` declara `RELEASED`, `REVERSED`, `ADJUSTED` e `PAID_OUT`. Só os dois primeiros são
escritos aqui; os outros, com as colunas que pedem (autor, motivo, acerto), são AF7.

## Fora de escopo

- O afiliado na tela do pedido, o filtro, escolher ou trocar o afiliado, o extrato, o ajuste, o acerto
  e o "quanto devo": AF7.
- A área do afiliado e as leituras dele: AF8.
- Estorno parcial mexer na comissão: fica de fora da v1, como o épico decidiu.
- A política de privacidade e ligar `AFFILIATE_LINKS_ENABLED`: AF9.
