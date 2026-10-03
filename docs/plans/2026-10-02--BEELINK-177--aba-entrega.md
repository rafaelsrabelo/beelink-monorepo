# BEELINK-177 — M3: a aba Entrega nas configurações da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico M (BEELINK-174). Empilhado sobre o M1 (BEELINK-175, PR #185), que guarda as regras.
> Pedido do Rafael em 02/10, por cima do ticket: as configurações da loja ganham um **configurador**
> de como a loja entrega — só retirada, entrega própria, Melhor Envio, ou uma combinação —, a aba
> **Aparência sai** (o modo design já cuida das cores e dos banners), e o conteúdo das configurações
> **ocupa a largura toda** da tela.

## Definição de Pronto

1. **A aba existe.** Em `/admin/<slug>/store`, uma aba "Entrega" ao lado das outras.
2. **Três cartões, cada um com o seu interruptor:** Retirada na loja (com o endereço da loja), Entrega
   própria e Transportadoras (Melhor Envio). O que está dentro de um cartão desligado não aparece.
3. **Faixas.** Na entrega própria, o editor de faixas: até N km, frete (R$) e janela (de–até, em
   minutos), acrescentar e remover. Até 10. "Grátis acima de", opcional.
4. **O mapa** mostra a loja e o círculo do raio (a última faixa). Loja sem posição no mapa: o cartão
   manda completar o endereço primeiro, e o mapa não aparece.
5. **Prévia** de cada faixa em palavras: "até 3 km: R$ 5,00, chega em 30–50 min".
6. **Transportadoras:** o estado da conexão do Melhor Envio. Sem conexão, "Conectar Melhor Envio";
   conectado, a conta e o caminho para os serviços em Integrações. Instalação sem o app: o cartão
   diz isso e não oferece o interruptor.
7. **Salvar** grava a aba inteira (`PUT /stores/:slug/delivery`), com o próprio botão. Um campo
   errado é dito no campo antes de enviar; a recusa da API, em palavras.
8. **Aparência sai** das configurações. O "Salvar" das outras abas reenvia o layout, o banner, as
   cores e o `cardLayout` como a loja já tem.
9. **Largura toda.** O conteúdo deixa o `max-w-5xl` e ocupa a área do painel; o título vem antes das abas.
10. Blocos com story e teste (axe), a conversão do formulário com teste, a tela com teste;
    `pnpm ci-check` verde.

## O que entra

- **packages/ui:**
  - `blocks/delivery/`: `delivery-settings-form` (a aba inteira), `delivery-mode-card` (o cartão com
    interruptor), `delivery-band-rows` (o editor de faixas), `delivery-carriers` (o estado do Melhor
    Envio), `delivery-settings-skeleton`. Cada um com story e teste.
  - `lib/delivery.ts`: os valores do formulário (o que foi digitado, em km, R$ e minutos) e as
    visões que a tela entrega aos blocos.
  - `store-map`: um `radiusMeters` opcional desenha o círculo e enquadra o mapa nele.
  - `store-settings-form`: sem a aba Aparência; aceita `extraTabs`, abas com conteúdo próprio que
    ficam fora do `<form>` da loja (um formulário dentro de outro é HTML inválido).
  - `store-appearance-fields` e a sua story e teste saem: nada mais os usa.
- **apps/web:**
  - BFF `GET`/`PUT /api/stores/[slug]/delivery`.
  - `services/delivery/`: requests, keys, hooks.
  - `lib/delivery-form.ts`: regras ↔ formulário, e o que o formulário recusa. Com teste.
  - `components/store/store-delivery-tab.tsx`: a aba, que lê as regras, a loja e a conexão.
  - `store-settings-screen`: largura toda, a aba Entrega; `store-payloads` ecoa a aparência da loja.

## Decisões deste ticket

1. **A aba Entrega salva sozinha.** As outras abas são um `PUT /stores/:slug` inteiro; as regras de
   entrega são outra rota. Um botão para as duas misturaria dois pedidos num "Salvar" que pode dar
   certo pela metade.
2. **Os serviços do Melhor Envio continuam em Integrações.** O cartão de transportadoras liga e
   desliga a venda por transportadora e mostra a conexão; escolher serviços e embalagem padrão é da
   tela que o N2 fez, e o cartão leva até ela. Duas telas editando a mesma coisa é o que o modo
   design já ensinou a evitar.
3. **Km e R$ na tela, metros e centavos no fio.** "até 3,5 km" vira 3500 m. A conversão mora em
   `lib/delivery-form.ts`, num lugar só.
4. **A distância é em linha reta** (M1): o cartão diz isso numa linha, para o lojista calibrar.
5. **Sem `?tab=` na URL** por enquanto: a aba abre em "Informações básicas", como hoje.

## Fora de escopo

- A cotação (M2) e o checkout (M4).
- Editar layout e `cardLayout` em outro lugar: o Rafael confirmou que o modo design cobre a aparência.
