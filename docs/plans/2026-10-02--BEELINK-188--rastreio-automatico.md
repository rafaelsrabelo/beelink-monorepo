# BEELINK-188 — N7: o rastreio automático

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o N6 (BEELINK-187, PR #191), que compra a etiqueta com o app do
> Beelink — e só etiquetas geradas pelo mesmo app recebem os webhooks do Melhor Envio.

## Definição de Pronto

1. **Webhook do Melhor Envio** em `https://<WEB_DOMAIN>/api/integrations/melhor-envio/webhook`, com a
   assinatura `X-ME-Signature` (HMAC-SHA256 do corpo cru, com o secret do app, em base64) conferida;
   sem ela, ou errada, recusado.
2. **Consulta periódica onde o webhook não cobrir:** a cada 30 minutos, as etiquetas geradas de pedidos
   ainda não entregues nem cancelados são consultadas (`/shipment/tracking`).
3. **Cada evento gravado uma vez só**, venha repetido, venha pelo webhook e pela consulta.
4. **Postado → "Saiu para entrega"; entregue → "Entregue"**, com o autor "transportadora" no histórico.
   Só para frente: um "postado" que chegue depois do "entregue" não volta o pedido.
5. **O rastreio** (código e link) entra no registro de entrega assim que o Melhor Envio o der; o cliente
   o vê no pedido e recebe o e-mail de mudança de status (J12).
6. **Etiqueta cancelada no Melhor Envio** aparece cancelada no Beelink.
7. Testes: a assinatura (unitário), o webhook e a consulta (e2e); `pnpm ci-check` verde.

## O que entra

- **contracts:** `OrderActor` ganha `CARRIER`; `IntegrationErrorCode` ganha `INTEGRATION_SIGNATURE_INVALID`.
- **API:**
  - Prisma: `OrderActor.CARRIER`; `IntegrationEvent` (o evento já aplicado, por chave única).
  - `OrdersService`: a mudança de status vira uma só, com o autor — o lojista ou a transportadora — e
    é exportada.
  - `modules/carrier-tracking/`: o controller do webhook (público, com o corpo cru), `CarrierTracking`
    (aplica um evento) e `LabelTrackingRoutine` (a consulta periódica).
  - `main.ts` e o app de teste com `rawBody`.
- **apps/web:** a rota pública que repassa o corpo cru e a assinatura à API.
- **packages/ui:** "pela transportadora" no histórico do pedido.
- **docs/repo/deploy.md:** cadastrar o webhook no app do Melhor Envio.

## Decisões deste ticket

1. **A chave de um evento é a etiqueta e o status** (`<id>:posted`): o webhook e a consulta chegam ao
   mesmo fato, e o segundo a chegar não faz nada.
2. **O corpo é conferido antes de ser lido**: a assinatura é calculada sobre os bytes que chegaram, e
   a rota da web os repassa sem reescrever.
3. **Webhook de etiqueta desconhecida responde 200** e não faz nada: o Melhor Envio tenta de novo cinco
   vezes a cada 15 minutos o que não for 2xx, e uma etiqueta comprada fora do Beelink nunca vai existir aqui.
4. **A consulta só olha o que pode mudar**: etiquetas geradas, de pedidos abertos, até 50 por vez, a
   mais antiga primeiro.
5. **O e-mail ao cliente é o mesmo do lojista mudar o status**: a mudança passa pelo mesmo caminho.

## Fora de escopo

- Os outros eventos (`undelivered`, `paused`, `suspended`): ficam para quando houver o que mostrar ao
  lojista sobre eles.
