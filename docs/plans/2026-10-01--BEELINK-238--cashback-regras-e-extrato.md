# BEELINK-238 — U1: as regras de cashback da loja e o extrato do cliente

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico U (BEELINK-237). O desenho comum está em `2026-10-01--BEELINK-237--cashback.md`; este plano
> registra o que o U1 entrega e o que ele decide por conta própria.

## Definição de Pronto

1. A loja guarda as regras de cashback: ligado ou desligado, percentual em basis points, validade em
   dias (ou sem validade), pedido mínimo para ganhar e teto de uso por pedido.
2. Cada cliente tem um extrato: ganho, uso, estorno, vencimento e ajuste, em centavos, com o pedido, a
   validade e quanto resta de cada ganho. Nenhum lançamento é editado ou apagado por uma rota.
3. O saldo disponível e o pendente do cliente ficam no cadastro dele, mudam só sob a trava do cliente e
   são sempre iguais ao que os lotes e o extrato dizem.
4. Rotas do lojista: ler e salvar as regras (com o total que a loja deve em crédito), ver o extrato de
   um cliente e lançar um ajuste manual com motivo.
5. O contrato está em `packages/contracts`, e o `docs/product` tem a seção Cashback.
6. Testes unitários das regras e do ajuste, e e2e das rotas. `pnpm ci-check` verde.

## O que entra

### Banco (`apps/api/prisma/schema/cashback.prisma`)

- **`CashbackSettings`**, uma linha por loja, criada no primeiro salvar. Sem linha, a loja lê os
  valores iniciais: desligado, 5%, sem validade, sem pedido mínimo, uso de até 100% dos produtos.
- **`CashbackCredit`**, o lote: valor, quanto resta, situação (`PENDING`, `AVAILABLE`, `VOIDED`,
  `EXPIRED`), quando ficou disponível e quando vence. Um por pedido (índice único em `orderId`), ou um
  por ajuste a favor do cliente.
- **`CashbackEntry`**, o extrato: tipo (`EARN`, `REDEEM`, `REVERSAL`, `EXPIRE`, `ADJUST`), valor com
  sinal, o lote, o pedido, o motivo de um ajuste e quem o lançou. Só recebe linhas.
- **`Customer`** ganha `cashbackBalanceCents` e `cashbackPendingCents`, os caches.
- CHECKs no banco para o que a rota já valida: percentuais entre 1 e 10000, validade de 1 a 3650 dias,
  valores de lote nunca negativos, o resto nunca maior que o valor, caches nunca negativos.

`CashbackRedemption` (de quais lotes um uso tirou) fica para o U3, que é quem usa crédito num pedido.

### A regra de ouro do saldo

- `cashbackBalanceCents` = a soma do que resta dos lotes `AVAILABLE` = a soma dos valores do extrato.
- `cashbackPendingCents` = a soma dos lotes `PENDING`, que ainda não estão no extrato: o ganho só é
  lançado quando o crédito fica disponível (U2).

Toda mudança passa por `src/modules/cashback/cashback-ledger.ts`, dentro de uma transação, depois de
`lockCustomer`, e termina recontando os caches a partir dos lotes.

### Rotas do lojista

| Rota | O quê |
|---|---|
| `GET /stores/:slug/cashback` | as regras e o que a loja deve: disponível, pendente, e quanto vence nos próximos 30 dias |
| `PUT /stores/:slug/cashback` | salvar as regras (corpo inteiro) |
| `GET /stores/:slug/customers/:id/cashback?page=` | saldo, pendente, o próximo vencimento, os lotes em aberto e o extrato, do mais novo ao mais antigo |
| `POST /stores/:slug/customers/:id/cashback/adjustments` | ajuste manual: valor com sinal e motivo |

## Decisões deste ticket

1. **Ajuste a favor cria um lote disponível**, com a validade da regra atual contada a partir de agora.
   Um crédito dado à mão é crédito como outro: vence pela regra da loja.
2. **Ajuste contra consome os lotes que vencem primeiro** (os sem validade por último, e no empate o
   mais antigo), o mesmo critério do uso no U3. Mais que o saldo é recusado (409
   `CASHBACK_BALANCE_INSUFFICIENT`): o saldo nunca fica negativo (decisão 2 do Rafael).
3. **O ajuste vale com o cashback desligado.** Desligar para de dar crédito em pedidos novos; não apaga
   o que a loja já deve, nem impede o lojista de corrigir um saldo.
4. **Juntar dois cadastros junta os extratos já no U1** (o ticket pôs isso no U2). Com o ajuste manual,
   um cadastro pode ter saldo a partir deste PR, e a junção apagaria o extrato do cadastro que sai.
5. **Mudar a regra não toca nos lotes existentes.** A validade de um lote é gravada nele.
6. **Limites:** percentual de 1 a 10000; validade de 1 a 3650 dias; pedido mínimo de 0 a
   R$ 1.000.000,00; ajuste de R$ 0,01 a R$ 1.000.000,00, em qualquer sentido; motivo de 3 a 200
   caracteres.

## Fora de escopo

- Gerar crédito pelo pedido (U2), usar crédito no pedido (U3), vencer (U4).
- Telas (U5, U6, U7).
- A cópia dos dados do cliente com o extrato, e o aviso de saldo perdido ao excluir a conta (U2).

## Adendo — revisão independente (01/10)

1. **Ajuste durante a junção de dois cadastros travava o banco.** A junção trava a loja e depois o
   cliente; o ajuste travava o cliente e, ao gravar o lote, esbarrava na loja. Resultado: deadlock e
   erro 500. Agora todo lançamento passa por `lockLedger`, que trava na mesma ordem (a loja em
   `FOR KEY SHARE`, que não segura pedidos nem outros ajustes, e depois o cliente) e relê o cadastro:
   se a junção o removeu, a resposta é 404. Há um teste e2e da corrida, que falha sem a correção.
2. **Excluir a conta apagava o extrato.** Um cadastro sem pedido nem avaliação era excluído, e o extrato
   ia junto. Agora o extrato também mantém o cadastro, esquecido como os outros. Perder o saldo nesse
   caso continua sendo o U2.
3. **O saldo podia estourar a coluna** (32 bits) depois de muitos ajustes grandes. Um ajuste que leva o
   saldo além de R$ 1.000.000,00 é recusado (409 `CASHBACK_BALANCE_TOO_LARGE`).
4. **Lote vencido e ainda não varrido** não pode ser gasto, não aparece como próximo vencimento e não
   conta como "vence em 30 dias". A varredura que o tira do saldo é o U4; até lá ele ainda conta no
   saldo guardado.
5. A recontagem faz as duas somas uma depois da outra (a transação usa uma conexão só).
