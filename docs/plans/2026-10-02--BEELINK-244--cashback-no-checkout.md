# BEELINK-244 — U7: usar o saldo no checkout e ver o extrato em Minha conta

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237), último ticket. A API de uso e devolução veio do U3, o vencimento do U4. Este
> ticket é o que o cliente e o lojista veem disso.

## Definição de Pronto

1. **Checkout.**
   - Quem tem saldo vê "Usar meu cashback" com o valor disponível.
   - Marcado, o carrinho é cotado de novo e mostra quanto será usado antes de confirmar.
   - Quando não dá para usar tudo, a tela diz quanto cabe neste pedido.
   - Os totais ganham a linha "Cashback usado", separada da promoção e do cupom.
2. **O pedido sai com o valor que a tela mostrou.**
   - Enquanto a cotação com o cashback não volta, o botão de enviar espera.
   - Se o saldo mudou no meio do caminho (`ORDER_CASHBACK_REFUSED`), a tela diz isso e cota de novo.
3. **Minha conta, aba Cashback.**
   - Mostra o saldo, o que está pendente, o que vence primeiro e os créditos com a validade de cada um.
   - Mostra o extrato, dos lançamentos mais novos para os mais antigos, paginado.
   - A aba aparece no menu quando a loja tem cashback ligado ou quando o cliente tem saldo ou pendente.
4. **A linha "Cashback usado"** aparece no pedido do cliente (que é também o comprovante), na mensagem
   do WhatsApp e no pedido do painel.
5. **Registrar pedido (painel).** Com um cliente que tem saldo, a tela oferece usar o saldo dele. A linha
   e o total vêm da cotação, e o pedido é gravado com o valor cotado.
6. **Termos e privacidade.**
   - Os Termos dizem que cashback é crédito da loja, não dinheiro: vale só nela, não se saca nem se
     transfere, e vence no prazo da loja.
   - A Política diz que a loja guarda o saldo e o extrato.
   - A versão dos textos sobe.
7. **Excluir a conta** avisa quanto de cashback o cliente perde.
8. Testes unitários (ui e web), e2e da API para a rota nova; `pnpm ci-check` verde.

## O que entra

- **API**
  - `GET /stores/:slug/customer/cashback?page=&pageSize=`: o cashback do próprio cliente
    (`ShopperCashback`), com as mesmas leituras do painel (`creditsOf`, `entriesOf`). O motivo de um
    ajuste fica de fora (ver decisões).
  - `CustomerProfile.cashback`: `{ balanceCents, pendingCents }`, lidos dos totais que o cliente já
    guarda. Servem ao menu e ao aviso de exclusão sem uma chamada a mais.
  - A palavra da aba nas rotas da loja: `cashback` (pt e en).
- **ui**
  - `discountRowsOf` ganha a linha `cashback`, sempre a última: é o crédito pagando o que sobrou depois
    dos descontos. Como todas as telas leem os descontos por essa função, a linha chega sozinha ao
    carrinho, ao pedido, ao comprovante, ao painel e ao WhatsApp.
  - Bloco `StorefrontCashbackUse`: a caixa do checkout.
  - Bloco `StorefrontAccountCashback`: a aba de Minha conta.
  - `OrderSummary` (registrar pedido) ganha a caixa "Usar o cashback do cliente".
  - O aviso de exclusão ganha o valor.
- **web**
  - Carrinho: `useCashback` na cotação. O pedido sai com `cashbackCents` igual ao `appliedCents` da
    cotação desta tela.
  - Aba `cashback` em Minha conta.
  - Registrar pedido: `useCashback` na cotação e `cashbackCents` no pedido.
  - Termos e Política, com a versão nova.

## Decisões deste ticket

1. **A caixa vem desmarcada.** Usar o crédito é escolha do cliente: ele pode querer guardar para uma
   compra maior.
2. **Usa o máximo possível**, sem campo para digitar o valor: o menor entre o saldo e o teto da loja.
   Digitar um valor parcial fica como melhoria.
3. **O motivo do ajuste manual não aparece para o cliente.** O lojista escreveu o motivo sem ser avisado
   de que o cliente leria. O extrato do cliente mostra "Ajuste da loja". A cópia dos dados (LGPD) já
   traz o motivo, porque ali vai tudo o que a loja guarda sobre a pessoa.
4. **A versão dos textos legais vai para 2026-10-02.** O próprio arquivo dos textos diz que mudar o que
   se guarda é uma versão nova. Ainda não existe fluxo de novo aceite, então quem já aceitou continua
   com o aceite registrado da versão anterior. ⚠️ Ajustar a data para o dia do deploy, se for outro.
5. **No painel, a caixa só aparece com um cliente escolhido que tem saldo.** O valor vem da cotação e é
   gravado exatamente como foi cotado.

## Fora de escopo

- Digitar um valor parcial de cashback.
- Um resumo do cashback na Visão geral de Minha conta.
- O fluxo de novo aceite dos Termos para contas existentes.

## Adendo — o que a tela decidiu ao ser ligada (02/10)

A parte web foi feita numa segunda sessão, sobre os commits de contracts, API e ui. O que não estava
escrito acima:

- **O valor do pedido é o da resposta desta tela.** No carrinho e no painel, o `cashbackCents` enviado
  é o `appliedCents` da cotação do carrinho como ele está agora. Uma cotação guardada do carrinho
  anterior, ou uma que falhou, não serve: o botão espera, e um novo toque pergunta de novo.
- **A caixa do carrinho continua na tela enquanto o preço é recalculado**, lida da última resposta,
  para não piscar a cada "+". Ela some para o visitante e para quem não tem saldo.
- **Pedido recusado por saldo alterado** (`ORDER_CASHBACK_REFUSED`): a tela diz que o saldo mudou e
  cota de novo; a caixa continua marcada, já com o valor que sobrou.
- **No painel, trocar de cliente desmarca a caixa de vez.** O crédito não é do outro cliente, e voltar
  ao primeiro começa desmarcado.
- **A caixa do painel some quando o pedido não aceita cashback**, mas fica se já estava marcada, para
  poder ser desmarcada.
- **O aviso de exclusão de conta soma o saldo e o pendente**: a exclusão anula os dois.
- **A aba abre pelo endereço mesmo fora do menu.** Quem não tem crédito lê que não tem.
- **A linha "Cashback usado" no pedido do painel** precisou do campo `cashbackUsedCents` em
  `OrderDetailView`: o bloco lia só os campos de desconto.
