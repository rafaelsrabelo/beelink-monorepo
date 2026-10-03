# BEELINK-176 — M2: a cotação da entrega

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico M (BEELINK-174). Empilhado sobre o M3 (BEELINK-177, PR #186), que salva as regras do M1
> (BEELINK-175, PR #185). O N4 (BEELINK-185) acrescenta as transportadoras a esta mesma lista; por
> isso a resposta já nasce como uma **lista de opções**, e não como uma resposta só da entrega própria.

## Definição de Pronto

1. **Dado um destino** (o CEP, e o resto do endereço quando houver) e os itens do carrinho, a API
   responde as opções de entrega da loja para aquele endereço: a **entrega própria** e a **retirada**,
   cada uma com o frete e a janela.
2. **A entrega própria** mede a distância em linha reta da posição da loja até o destino geocodificado
   e responde:
   - **dentro de uma faixa:** o frete e a janela daquela faixa;
   - **grátis**, quando os produtos (depois das promoções) chegam ao "grátis acima de" da loja;
   - **fora do raio:** não é opção, e a resposta diz a distância e o raio;
   - **sem informação** — loja sem posição no mapa, sem faixas, ou endereço que não se localiza: a opção
     existe com o frete a combinar (`null`), nunca com um preço ou prazo inventado.
3. **Retirada** é opção quando a loja a oferece, com frete zero. Modo desligado não aparece.
4. **Cache por CEP e número**: o mesmo destino não geocodifica de novo a cada clique.
5. **Duas rotas:** uma pública da loja (checkout e página do produto), com limite de chamadas, e uma
   do painel (só o dono, aceita rascunhos, como o "registrar pedido").
6. Testes: a regra (unitário), a distância (unitário), as rotas (e2e com geocodificador falso);
   `pnpm ci-check` verde.

## O que entra

- **contracts:** `shipping.ts` — `ShippingDestination`, `ShippingQuotePayload`, `ShippingWindow`,
  `ShippingOption`, `OwnDeliveryVerdict`, `ShippingQuote`, `ShippingErrorCode`.
- **API, `modules/delivery/`:**
  - `distance.ts`: a distância entre dois pontos (haversine), em metros inteiros.
  - `own-delivery.ts`: a regra pura — regras + posição da loja + posição do destino + produtos →
    veredito e opção.
  - `destination-geocoder.ts`: o destino → um ponto, pelo MapTiler (a busca de endereços que a API já
    tem) ou, sem a chave, pelo Nominatim (o geocodificador da loja); com o cache em memória.
  - `shipping-quote.service.ts` e os controllers: `POST /stores/:slug/shipping/quote` (público) e
    `POST /stores/:slug/delivery/quote` (painel).
- `StoresModule` exporta o `StoreGeocoder`.

## Decisões deste ticket

1. **Uma lista de opções desde já**, na ordem que o checkout mostra: entrega própria, (transportadoras,
   no N4), retirada. O veredito da entrega própria vem à parte, para o checkout dizer **por que** ela
   não está na lista (fora do raio, com a distância).
2. **"Grátis acima de" é medido nos produtos depois das promoções**, antes do cupom: é o preço que o
   cliente lê no carrinho. Um cupom não liga nem desliga o frete grátis.
3. **Sem informação é frete a combinar**, e não uma recusa: é o que o checkout faz hoje (L4). Um
   endereço que não se localiza, numa loja com faixas, também é "a combinar" — recusar seria pior do
   que deixar o lojista combinar, e o lojista ainda vê o endereço no pedido.
4. **O frete grátis vale numa faixa e numa loja sem faixas** (que entrega e combina o preço). Com a
   loja ou o endereço sem posição, não há como saber se o endereço está no raio: fica a combinar.
5. **Cache em memória**, por CEP e número, por 30 dias, até 5.000 destinos. Um processo só serve a API
   (Dokploy); um deploy esvazia o cache, o que só custa uma geocodificação por destino. Um destino que
   não se localizou não fica no cache: a próxima tentativa pode dar certo.
6. **MapTiler primeiro**, como pede o ticket: a busca de endereços já o usa, e a chave é do servidor.
   Sem a chave, o Nominatim, que precisa da rua, da cidade e da UF — só com o CEP, sem informação.
7. **Itens no corpo**, como a cotação do carrinho: os produtos são lidos e precificados pela API
   (`readOrderLines` + `priceOrder`), nunca um subtotal vindo da página.

## Fora de escopo

- As transportadoras (N4), o checkout (M4), a página do produto (D3) e o registrar pedido (M5).
- A distância pelas ruas (precisa de um serviço de rotas).
