# BEELINK-102 — Adicionar ao carrinho pelo card e pela página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> F3 do Épico F (BEELINK-99). Empilhado sobre o F2 (BEELINK-101). O ticket dizia "depende do B17 e
> do D7"; o refoco de 24/09/2026 tirou essa dependência: o botão entra na área de compra atual, e o D7
> a redesenha depois sem mudar o comportamento.

## O pedido

O botão "Adicionar ao carrinho" de 5a (no card) e de 5b (na página do produto) passa a adicionar de
verdade, na store do F1.

## Definição de Pronto

1. No card, um produto sem opções entra no carrinho com uma unidade, e o card confirma. Um produto
   com opções leva à página dele, onde a combinação é escolhida.
2. Na página do produto, a combinação escolhida entra na quantidade escolhida. "Comprar agora"
   adiciona e vai ao carrinho.
3. O card respeita `layoutSettings.showQuickAdd`.
4. Um produto esgotado não adiciona (o "Avise-me" continua).
5. Adicionar pelo card e pela página produz as mesmas linhas.
6. Nunca um botão que não faz nada.

## Decisões

### 1. O card precisa saber se o produto tem opções

Sem isso, o card não sabe se pode adicionar direto. O card público ganha `hasOptions?: boolean`,
servido nas prateleiras (listagem e vitrines da home) com uma contagem de opções no mesmo select.
Fica opcional, e ausente em outros lugares, porque tornar obrigatório levaria o campo ao formato do
produto no painel, que não precisa dele. Ausente significa "escolha na página".

### 2. "Ver opções" não é um segundo link

O nome do card já é um link esticado sobre o card inteiro. Para um produto com opções, a pílula
"Ver opções" é só visual (`aria-hidden`, `pointer-events-none`), e um clique cai no link do card.

### 3. Sem opções, a linha não nomeia variante

O card não conhece o id da variante padrão, e a página do produto também adiciona `variantId: null`
para um produto sem opções. As duas produzem a mesma linha, e o F2 resolve `null` como a única
variante do produto.

### 4. A área de compra ganha um bloco próprio

`StorefrontBuyActions` traz a quantidade, "Adicionar ao carrinho", "Comprar agora" (um link para o
carrinho que adiciona no caminho, uma vez só) e o pedido pelo WhatsApp embaixo, como caminho mais
quieto. `StorefrontProductDetail` o usa quando recebe `cart`; sem `cart`, fica como era.

### 5. `showQuickAdd` vale "ligado" quando não foi definido

O painel ainda não expõe a chave, e 5a desenha o botão em todo card.

## Fora de escopo

- Fechar o pedido (F4).
- O redesenho da caixa de compra (D7).
