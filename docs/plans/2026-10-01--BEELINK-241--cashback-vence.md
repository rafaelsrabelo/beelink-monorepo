# BEELINK-241 — U4: o crédito vence

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). Os lotes, o extrato e a trava vieram do U1; o uso no pedido e a devolução, do U3.

## Definição de Pronto

1. Uma rotina da API tira do saldo, sozinha, o crédito que venceu. O lote vira `EXPIRED`, com resto
   zero. O extrato ganha uma linha `EXPIRE` com o valor que sobrava. Os dois totais do cliente são
   recalculados.
2. Um lote vence uma vez só, mesmo com duas varreduras ao mesmo tempo ou com dois processos.
3. A loja sem validade (`expiresAfterDays` nulo) dá crédito que nunca vence e nunca gera aviso.
4. Uma semana antes do vencimento, o cliente recebe um e-mail com o valor, a loja e o dia. É um
   e-mail por lote.
5. O aviso respeita a escolha do cliente: uma opção nova, "Cashback", em Avisos (Minha conta), ligada
   por padrão.
6. Nada é enviado quando, na hora do envio, o lote já foi gasto, desfeito ou venceu, ou quando a conta
   não tem o e-mail confirmado.
7. Testes unitários e e2e; `pnpm ci-check` verde.

## O que entra

- **`CashbackSweeper`**, que roda a cada minuto:
  - vence o que passou do prazo, cliente a cliente. Usa a trava da loja e depois a do cliente, a mesma
    ordem de toda mudança de crédito, e relê os lotes já sob a trava;
  - cria o aviso devido para cada lote que entrou na semana antes de vencer;
  - pede o envio.
- **`CashbackExpiryNotice`** (tabela `cashback_expiry_notices`): a fila de e-mails, igual às outras.
  - `OutboxMailer` reserva cada aviso com `FOR UPDATE SKIP LOCKED` e tenta até 5 vezes.
  - Um índice único por lote garante um aviso só.
- **`Customer.notifyCashback`**, `true` por padrão, na escolha de avisos: contrato, API, o bloco de
  Avisos e o formulário de Minha conta.
- **E-mail `cashbackExpiring`:**
  - assunto: "{loja} — seu cashback de R$ X vence em DD/MM/AAAA", com o dia no horário de Brasília;
  - um link para a loja e outro para os avisos da conta.

## Decisões deste ticket

1. **O aviso vem ligado.** Fala de um crédito que o cliente já tem, não de uma oferta. "Ofertas"
   começa desligado e guarda a data do consentimento; este aviso não. Quem não quiser desmarca em
   Avisos, e o próprio e-mail diz onde.
2. **Uma semana antes, um aviso por lote.** Um lote é o crédito de um pedido ou de um ajuste. Quem tem
   vários lotes vencendo recebe um e-mail por lote. Juntar tudo num resumo fica como melhoria possível.
3. **O texto é montado na hora do envio.** Se o cliente gastou parte do lote, o e-mail diz o que resta.
   Se gastou tudo, nada é enviado.
4. **O lote vence com até um minuto de atraso**, porque a rotina roda a cada minuto. Nesse intervalo o
   crédito já não pode ser gasto: `spendableAt` olha o relógio (U3).
5. **Cada rodada processa até 100 clientes.** O resto fica para a rodada seguinte.
6. **Nos testes, a rotina não roda sozinha.** Cada teste chama a varredura com o instante que quer. O
   relógio de verdade, no meio de uma suíte, venceria o crédito que um teste acabou de montar como
   vencido.

## Fora de escopo e limites

- Um lote devolvido por cancelamento (U3) com prazo novo não ganha um segundo aviso, porque o aviso é
  um por lote.
- O aviso, na exclusão de conta, do valor que o cliente perde (U7).
- Push e WhatsApp.
