# BEELINK-187 — N6: comprar e imprimir a etiqueta no pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o N5 (BEELINK-186, PR #190): o pedido de transportadora já
> chega com a transportadora, o serviço do Melhor Envio (`carrierServiceId`) e a janela no registro de
> entrega. Decidido pelo Rafael em 02/10: a chave da NF-e é **opcional** (sem ela, a etiqueta sai como
> envio não comercial, com declaração de conteúdo), e o **CPF de quem recebe é pedido no checkout**.

## Como o dinheiro anda (para quem lê o PR)

A carteira do Melhor Envio é **pré-paga e do lojista**. O cliente paga o frete à loja (Pix, cartão…);
o Beelink não toca nesse dinheiro. Para comprar a etiqueta, o Melhor Envio debita a carteira da conta
do lojista; sem saldo, a compra não sai. A tela diz o saldo, e o que fazer quando não basta.

## Definição de Pronto

1. **No pedido aberto de transportadora, "Comprar etiqueta":** carrinho do Melhor Envio → paga com o
   saldo → gera → a etiqueta fica pronta para imprimir, num clique.
2. **A caixa:** o lojista confirma o peso e as medidas da caixa (um volume), já preenchidos pela
   cotação do Melhor Envio para aquele serviço.
3. **Nota fiscal opcional:** com a chave da NF-e (44 dígitos), envio comercial; sem ela, não comercial,
   com a declaração de conteúdo montada dos itens do pedido. A tela diz quando a declaração vale.
4. **Saldo insuficiente** diz o saldo, o preço e o que fazer, com o caminho para a carteira; a etiqueta
   fica no carrinho do Melhor Envio e "Tentar de novo" a compra sem criar outra.
5. **Imprimir** abre o PDF da etiqueta.
6. **Rastreio:** o código da etiqueta preenche o registro de entrega do pedido.
7. **Cancelar a etiqueta** enquanto o Melhor Envio permitir; o valor volta à carteira (em até 12 h, se
   já gerada).
8. **O que falta, dito antes:** o CPF ou CNPJ do remetente (em Integrações), o CPF de quem recebe, o
   CEP da loja. Sem eles, o botão não aparece, e a tela diz o quê e onde.
9. **CPF no checkout:** escolhendo transportadora sem CPF no cadastro, o checkout pede o CPF e o guarda
   no cadastro antes de fechar; o pedido de transportadora sem CPF é recusado.
10. Testes: cliente do Melhor Envio (unitário), a compra (e2e com Melhor Envio falso), blocos (axe), as
    telas; `pnpm ci-check` verde.

## O que entra

- **contracts:** `label.ts` — `OrderLabel`, `OrderLabelStatus`, `OrderLabelVolume`,
  `OrderLabelOverview`, `OrderLabelBlocker`, `BuyOrderLabelPayload`, `OrderLabelPrint`,
  `LabelErrorCode`; `MelhorEnvioSettings.senderDocument` e `senderStateRegister`;
  `ORDER_RECIPIENT_DOCUMENT_MISSING`.
- **API:**
  - Prisma: `OrderLabel` (uma por pedido), `MelhorEnvioSettings.senderDocument/senderStateRegister`,
    `Order.deliveryDocument` (o CPF de quem recebe, fotografado no pedido).
  - `MelhorEnvioClient`: `addToCart`, `removeFromCart`, `checkout`, `generate`, `print`,
    `cancellable`, `cancel`, `tracking`.
  - `integrations/melhor-envio/labels/`: `OrderLabels` (o fluxo) e o controller
    `stores/:slug/orders/:number/label` (GET, POST, DELETE, POST `/print`).
  - A colocação do pedido exige o CPF numa transportadora e o fotografa.
- **packages/ui:** o cartão da etiqueta no pedido do painel; os campos do remetente no formulário de
  envio (Integrações); o campo de CPF no checkout.
- **apps/web:** rotas BFF, hooks, o cartão na tela do pedido, o CPF no checkout.

## Decisões deste ticket

1. **Um volume, uma etiqueta por pedido.** O lojista diz a caixa real. Correios, J&T e Loggi não
   aceitam vários volumes numa etiqueta; um pedido que precise de duas caixas é comprado no painel do
   Melhor Envio (fora de escopo).
2. **"Comprar" avança até onde der, e repetir continua de onde parou:** no carrinho → paga → gera. Uma
   etiqueta paga e não gerada (o Melhor Envio recusou a geração) aparece como paga, com "Gerar de novo".
3. **O saldo é lido antes de pagar.** O Melhor Envio não documenta o erro de saldo; ler o saldo antes
   diz ao lojista exatamente quanto falta, e o pagamento não é tentado à toa.
4. **O link de impressão é público e pedido na hora**, nunca guardado: o lojista pode não estar logado
   no Melhor Envio, e o link privado pediria login.
5. **O remetente é a loja:** o nome, o endereço e o WhatsApp da loja; o e-mail da conta do Melhor
   Envio; o CPF ou CNPJ e a inscrição estadual (opcional) que o lojista informa em Integrações.
6. **O CPF de quem recebe fica fotografado no pedido** (`deliveryDocument`), como o endereço: mudar o
   cadastro depois não muda a etiqueta de um pedido já feito.
7. **O caminho da carteira é o Melhor Envio da conta** (o endereço da página da carteira não é
   documentado); a tela diz "Carteira, Adicionar saldo".
8. **Cancelar uma etiqueta ainda no carrinho** (não paga) a remove do carrinho e apaga o registro.
9. **O rastreio vem do Melhor Envio** (`tracking`) logo depois de gerar; se ainda não houver código, o
   N7 o preenche quando chegar.

## Fora de escopo

- Várias caixas por pedido, coleta, logística reversa.
- Atualização automática do status pelo Melhor Envio (N7).
- Emitir a NF-e.
