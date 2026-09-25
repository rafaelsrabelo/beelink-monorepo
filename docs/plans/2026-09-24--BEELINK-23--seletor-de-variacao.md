# BEELINK-23 — O seletor de variação na página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A5 do épico BEELINK-17 (variações de produto). Área: FE · ajuste · M · ordem 7/29. Empilhado
> sobre o A4 (BEELINK-22), e usa o A3 (leitura pública) e o A6 (Avise-me).

## O pedido

> Estender `storefront-product.tsx` com um seletor de opções: ToggleGroup para os valores e bolinha
> de cor com nome para Cor. A variante escolhida vai para a URL como `?variant=`. O "Avise-me" abre
> um Dialog que pede o WhatsApp e grava o pedido do A6, sem simular sucesso se a chamada falhar. O
> carrinho não existe: o botão fica desabilitado ou "em breve".

## Definição de Pronto

1. Uma combinação que não existe aparece riscada e desabilitada. Uma esgotada aparece riscada e
   não pode ser pedida.
2. Preço, foto e a mensagem do pedido mudam ao trocar a escolha, sem recarregar.
3. `?variant=` restaura a mesma escolha ao recarregar ou compartilhar, já no HTML do servidor.
4. "Avise-me" abre um diálogo, grava o pedido (A6) e só diz que deu certo quando a API responde.
5. O leitor de tela ouve o estado de cada valor e o preço novo.
6. `pnpm ci-check` verde, com testes e as stories dos blocos novos.

## Decisões

### 1. Esgotada fica riscada e escolhível; inexistente fica desabilitada

O ticket pede as duas riscadas e desabilitadas, mas o quarto critério dele pede "Avise-me" para
uma combinação esgotada, e uma combinação que não pode ser escolhida nunca chega ao "Avise-me". O
design 5b tem o mesmo nó: põe "Esgotado · avise-me" dentro de um botão desabilitado. A regra fica
assim:

- **inexistente** (a loja não vende): desabilitada, riscada, e o leitor de tela diz
  ", indisponível";
- **esgotada** (a loja vende e acabou): riscada e escolhível, e o leitor de tela diz ", esgotado".
  Escolhida, some o botão de pedir e aparece "Avise-me quando chegar".

Uma combinação esgotada continua impossível de pedir. O que ela permite é pedir o aviso.

### 2. Sem carrinho: o botão continua sendo o pedido pelo WhatsApp

A loja pede hoje pelo WhatsApp, e o carrinho não existe. Em vez de um botão "em breve", o botão
atual "Pedir este pelo WhatsApp" continua, e a mensagem agora nomeia a combinação: `Olá! Tenho
interesse em "Blusa" (P · Areia) — Loja`. A página monta o link com uma marca
(`ORDER_VARIANT_MARK`), e o bloco, que não sabe o que o wa.me quer, a troca pela combinação
codificada.

### 3. `?variant=` lido no servidor, escrito com `replaceState`

- **Na leitura:** a página lê `searchParams.variant`, e o bloco abre nessa combinação. Na falta
  dela, abre na primeira que pode ser pedida, e na falta dessa, na primeira. Um link compartilhado
  abre já escolhido, sem piscar depois da hidratação.
- **Na escolha:** o endereço é trocado com `history.replaceState`, sem navegação e sem entrada
  nova no histórico. Escolher um tamanho não é uma página para o botão de voltar percorrer.

### 4. O estoque diz "esgotado", nunca o número; o SKU não aparece

O contrato público nunca leva a quantidade ("Derived, never the count"), e o SKU é só do lojista
(A3). Por isso ficam fora o "Restam N" do design e o código na página.

### 5. A foto da combinação vai na frente da galeria

Quando a variante tem foto própria, ela vira a primeira da galeria, e a galeria remonta nela. A
galeria saiu de `storefront-product.tsx` para `storefront-product-gallery.tsx`, para o bloco
continuar abaixo de 250 linhas.

### 6. O bloco desenha; `StorefrontProductLive` liga à rede

Segue o padrão do `ContactFormLive`: o bloco de `packages/ui` recebe os callbacks, e um componente
cliente do web cuida do `replaceState` e da mutation do Avise-me. A mutation passa por um handler
BFF novo, `/api/storefront/[slug]/products/[productId]/restock-requests`, que repassa o endereço
do visitante para o limite por IP.

`forwardToApi` passou a repassar como tal um sucesso sem corpo, como o 201 do A6, em vez de
transformá-lo num corpo de erro com status 201.

### 7. O diálogo usa o botão do design system

O diálogo é renderizado fora da vitrine (portal), onde as variáveis de cor da loja não chegam. O
botão de envio usa o `Button` do design system.

### 8. `ORDER_VARIANT_MARK` mora em `lib/variant-choice.ts`

Um valor exportado de um módulo `"use client"` chega a um Server Component como referência, e não
como a string.

## Fora de escopo

- O carrinho e o botão "Adicionar ao carrinho".
- A barra fixa de compra no celular, que não está desenhada.
- "Restam N" e a economia por peso ("econ. 12%").
- A tela do lojista com os pedidos de aviso.

## Adendo — revisão independente (24/09/2026)

Três leituras (comportamento; acessibilidade e regras da vitrine; evidência). Cada achado passou
por um verificador que tentou refutá-lo. Nove confirmados, cinco distintos, todos introduzidos por
este ticket e todos corrigidos:

1. **Combinações inalcançáveis** (bloqueador na evidência, grave nas outras leituras). "Indisponível"
   era decidido pela combinação com as outras escolhas como estavam. Com combinações esparsas,
   comuns com o "não vendo esta" do A4, uma combinação vendida e em estoque só era alcançável por
   um link com `?variant=`. No próprio fixture, G·Preto não era alcançável a partir de P·Areia.
   Agora:
   - um valor só é desabilitado quando nenhuma combinação o tem;
   - escolher um valor cuja combinação exata não existe leva à combinação com esse valor que mais
     preserva as outras escolhas, dando preferência a uma que possa ser pedida (`targetOf`).

   Isso refina a decisão 1: "inexistente" passa a significar "nenhuma combinação tem este valor".
2. **"Avise-me" sem rede não dizia nada.** Uma falha sem código de erro volta como `UNKNOWN`. Um
   teste do componente web cobre a rede caída, a recusa do número e o sucesso.
3. **As cores do painel na vitrine** (grave). O valor escolhido herdava o fundo `--muted` do
   primitivo. Agora usa a tinta da própria loja (`bg-current/10`).
4. **Uma linha de opção podia sair da ordem de tabulação** (grave): o item que tinha o foco podia
   ficar desabilitado sem o Base UI mover a parada de tabulação. O grupo agora remonta quando muda
   o conjunto de valores desabilitados.
5. **Contraste e erros do diálogo:**
   - um valor esgotado continua escolhível, então deixou de ficar esmaecido e só fica riscado;
   - só a recusa do número marca o campo de WhatsApp;
   - o nome ganhou `maxLength` de 80.

Quatro achados foram refutados, todos sobre lacunas de teste. O do componente web foi coberto
mesmo assim.
