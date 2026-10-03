# BEELINK-175 — M1: as regras de entrega da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico M (BEELINK-174). Empilhado sobre o N3 (BEELINK-184, PR #184): o Rafael decidiu em 02/10 fazer
> o M1 e o M2 antes do N4, para a cotação do Melhor Envio já nascer ao lado da entrega própria com preço.
> Também em 02/10: as configurações da loja ganham uma aba "Entrega" onde o lojista liga e desliga cada
> modo — retirada, entrega própria e transportadoras (Melhor Envio) — e combina os que quiser. Este
> ticket guarda essas escolhas; a aba é o M3.

## Definição de Pronto

1. **Três modos, cada um ligado ou desligado:** retirada na loja, entrega própria e transportadoras.
   Uma loja que nunca salvou lê os padrões de hoje: retirada e entrega própria ligadas, transportadoras
   desligadas, nenhuma faixa (frete "a combinar", como o L4 deixou).
2. **Faixas da entrega própria**, ordenadas por distância: até N metros → R$ X, com a janela de chegada
   (de–até, em minutos). De 0 a 10 faixas; cada uma vai mais longe que a anterior; a janela tem
   `de ≤ até`.
3. **O raio é a última faixa.** Não há um campo de raio à parte: o que passa da última faixa está fora
   do raio. A resposta traz `radiusMeters` calculado (null sem faixas), para o mapa do M3.
4. **Grátis acima de** um subtotal, opcional (null é nunca).
5. **Rotas do dono:** `GET /stores/:slug/delivery` (os padrões até o primeiro "Salvar") e
   `PUT /stores/:slug/delivery` (salva inteiro). Outra pessoa recebe `STORE_FORBIDDEN`; um corpo fora
   das regras, `DELIVERY_SETTINGS_INVALID`.
6. Testes: as regras das faixas (unitário) e as rotas (e2e); `pnpm ci-check` verde.

## O que entra

- **contracts:** `delivery.ts` — `DeliveryBand`, `DeliverySettings`, `DeliverySettingsPayload`,
  `DeliveryErrorCode`.
- **API, `modules/delivery/`:** módulo, controller, service, `dto/`, `delivery.constants.ts` e
  `delivery-bands.ts` (a regra das faixas, pura).
- **Prisma:** `DeliverySettings` (uma linha por loja, criada no primeiro "Salvar") e `DeliveryBand`
  (as faixas, trocadas inteiras a cada "Salvar", na mesma transação).

## Decisões deste ticket

1. **Os três modos moram juntos aqui**, inclusive o interruptor das transportadoras. A conexão e os
   serviços do Melhor Envio continuam no módulo de integrações (N1/N2); este interruptor diz se a loja
   *quer* vender por transportadora. Conectada e desligada não oferece; ligada e desconectada também
   não — a cotação (N4) exige os dois.
2. **O raio é derivado da última faixa.** Guardar raio e faixas separados abre um buraco: um endereço
   dentro do raio e depois da última faixa não teria preço. Uma faixa só "até 10 km → R$ 0" é a loja
   que entrega grátis até 10 km.
3. **Distância em linha reta** (decisão em aberto no épico): sem custo de API e sem serviço de rotas.
   A distância pelas ruas é sempre maior; o lojista calibra as faixas sabendo disso (o M3 diz).
4. **Entrega própria ligada e sem faixas** é a loja que entrega e combina o frete — o comportamento de
   hoje —, não um erro. O M2 responde "sem informação" e nunca inventa preço.
5. **Todos os modos desligados é aceito.** Até o M4, o checkout ainda não lê estas regras; o M4 decide
   o que mostrar a uma loja que não entrega de jeito nenhum.
6. **Unidades:** metros inteiros (até 200 km), centavos, minutos (até 7 dias).

## Fora de escopo

- A cotação (M2), a tela (M3), o checkout (M4).
- Respeitar `pickupEnabled` no checkout: é do M4.
