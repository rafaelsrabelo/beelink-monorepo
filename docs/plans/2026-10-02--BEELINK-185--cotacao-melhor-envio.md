# BEELINK-185 — N4: a cotação Melhor Envio junto com a entrega local

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o M2 (BEELINK-176, PR #187), que já responde a cotação como
> uma lista de opções com a entrega própria e a retirada. Este ticket põe as transportadoras na mesma
> lista.

## Definição de Pronto

1. **As transportadoras entram na lista** da cotação (`POST /stores/:slug/shipping/quote` e a do
   painel), entre a entrega própria e a retirada, cada uma com a transportadora, o serviço, o frete
   e o prazo em dias úteis.
2. **Com o token da loja**, do CEP de origem da loja ao CEP do destino, com os itens do carrinho:
   peso, medidas e valor segurado de cada um. O preço e o prazo são os da conta do lojista
   (`custom_price`, `custom_delivery_range`).
3. **Só os serviços que a loja ligou** (N2), e o prazo soma os dias de manuseio da loja.
4. **Só quando a loja vende por transportadora:** o interruptor do M1 ligado e a conta conectada.
   Desligado, sem conta, ou com nenhum serviço escolhido: nenhuma transportadora, e a resposta diz
   `OFF`.
5. **Produto que a transportadora não cota** (sem peso; sem medidas e a loja sem embalagem padrão) ou
   loja sem CEP de origem: nenhuma transportadora, e a resposta diz o que falta — a mesma regra do N3.
6. **Melhor Envio fora do ar, lento, ou recusando a conexão:** a lista sai só com as opções locais, em
   até 4 segundos, e a resposta diz `UNAVAILABLE`. A cotação nunca falha por causa dele.
7. **Cache curto** por loja, CEP e carrinho: 10 minutos.
8. Testes: o cliente (unitário), a montagem dos volumes (unitário), a rota (e2e com Melhor Envio
   falso); `pnpm ci-check` verde.

## O que entra

- **contracts (`shipping.ts`):** `ShippingOptionKind` ganha `CARRIER`; `ShippingOption.carrier`
  (`serviceId`, `service`, `company`); `CarriersVerdict` e `ShippingQuote.carriers`.
- **API, `modules/integrations/`:**
  - `melhor-envio.client.ts`: `quote` (`POST /api/v2/me/shipment/calculate`), com o seu próprio prazo
    de resposta.
  - `carrier-parcels.ts`: os itens do carrinho como o Melhor Envio os lê — centímetros, quilos, reais
    — ou o que falta (pura).
  - `melhor-envio/carrier-quote.service.ts` (`CarrierQuotes`): a conexão, os serviços, a origem, o
    cache e a chamada; exportado pelo módulo.
- **API, `modules/delivery/`:** `ShippingQuotes` chama as transportadoras em paralelo com a
  geocodificação e monta a lista.

## Decisões deste ticket

1. **O Melhor Envio monta a caixa.** A cotação manda os produtos (`products`), e não um volume
   (`package`): o algoritmo de empacotamento é dele, e a resposta já diz quantos volumes presumiu. O
   lojista confere a caixa real ao comprar a etiqueta (N6).
2. **Produto sem medidas usa as três medidas da embalagem padrão** e o próprio peso — o peso do
   produto já é "com a embalagem". O peso da embalagem padrão não entra na cotação.
3. **O valor segurado é o que o cliente paga pela unidade**, depois das promoções: é o valor que a
   declaração de conteúdo (ou a nota) vai dizer.
4. **Um serviço que o Melhor Envio devolve com erro** (não atende o CEP, passa do peso) fica fora da
   lista, sem derrubar os outros.
5. **As transportadoras são oferecidas dentro e fora do raio** da entrega própria: quem escolhe é o
   cliente. Ordem: entrega própria, transportadoras da mais barata para a mais cara, retirada.
6. **Para o cliente, conexão a reconectar é `UNAVAILABLE`**, igual a fora do ar: quem conserta é o
   lojista, que vê o aviso no painel.
7. **Só resposta boa entra no cache.** Uma falha é tentada de novo na próxima cotação.
8. **Avisos de recebimento e mão própria desligados** (`receipt`, `own_hand`): são serviços pagos à
   parte que nenhuma tela oferece ainda.

## Fora de escopo

- O checkout mostrar e gravar a escolha (N5), a etiqueta (N6), o rastreio (N7).
- Nota fiscal e declaração de conteúdo (decisão em aberto no épico, para o N6).
