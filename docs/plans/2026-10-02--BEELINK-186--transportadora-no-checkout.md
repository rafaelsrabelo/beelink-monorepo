# BEELINK-186 — N5: o cliente escolhe a transportadora

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o M4 (BEELINK-178, PR #189), que levou a entrega própria e a
> retirada ao checkout e ao pedido. A cotação (N4, PR #188) já devolve as transportadoras na mesma lista;
> este ticket deixa o cliente **escolher** uma e o pedido **guardar** a escolha.

## Definição de Pronto

1. **O checkout lista as formas de entrega** para o endereço: a entrega da loja e cada transportadora,
   com o preço e o prazo — "Correios · SEDEX — R$ 27,45 · 3–4 dias úteis". Com uma forma só, ela é
   dita dentro da escolha de entrega, como no M4; com várias, o cliente escolhe.
2. **O total segue a forma escolhida:** a cotação do carrinho recebe a escolha e soma o frete dela.
3. **Fora do raio da loja, as transportadoras continuam oferecidas**; sem nenhuma forma, o aviso do M4.
4. **Ao fechar, a API cota de novo** e o pedido grava o frete, a janela (dias úteis) e, no **registro de
   entrega** (J7), a transportadora, o serviço e as datas estimadas. A transportadora que saiu da
   cotação, ou cujo preço mudou, recusa o pedido — como o M4 já faz com a entrega própria.
5. **O pedido do cliente e "Meus pedidos" mostram a transportadora** e o prazo; o painel também, e o
   lojista acrescenta o rastreio no mesmo registro.
6. Testes: API (e2e), blocos (axe), a tela do carrinho; `pnpm ci-check` verde.

## O que entra

- **contracts:** `OrderShippingChoice` (`OWN_DELIVERY` | `CARRIER` + `serviceId`); `shipping` na cotação
  do cliente e em `PlaceCustomerOrderPayload`.
- **API:**
  - `deliveryTermsOf(quote, choice)`: a opção escolhida, com a transportadora.
  - `OrderPlacement` grava o `OrderDelivery` da transportadora; Prisma `OrderDelivery.carrierServiceId`
    (o serviço do Melhor Envio, para a etiqueta do N6), com a migration.
  - `orders/business-days.ts`: dias úteis a partir do dia do pedido, no calendário da loja.
- **packages/ui:** o bloco das escolhas ganha a lista de formas de entrega; a janela em dias úteis em
  palavras.
- **apps/web:** a escolha entra na pergunta de preço e no pedido.

## Decisões deste ticket

1. **Sem escolha, vale a entrega da loja** (o M4). A página só manda `shipping` quando o cliente está
   numa transportadora: o carrinho de uma loja sem Melhor Envio pergunta exatamente o que perguntava.
2. **A primeira forma da lista é a escolhida até o cliente escolher outra:** a entrega da loja quando
   existe, senão a transportadora mais barata (a ordem da cotação).
3. **As datas estimadas contam dias úteis a partir do dia do pedido**, sem feriados: o Melhor Envio
   conta a partir da postagem, e os dias de manuseio da loja já estão na janela (N4). É uma estimativa,
   e o lojista a corrige no registro de entrega.
4. **`carrierServiceId` fica no banco, fora do contrato**, até o N6 precisar dele na tela. O registro
   que o lojista salva à mão não o apaga enquanto continuar sendo de transportadora.
5. **O aviso de transportadoras indisponíveis não aparece ao cliente** quando há outra forma de
   entrega: a lista simplesmente sai sem elas. Sem nenhuma forma, o checkout diz que não há entrega
   para o endereço agora.

## Fora de escopo

- Comprar a etiqueta (N6) e o rastreio automático (N7).
- A transportadora no "registrar pedido" do painel (M5).
