# BEELINK-70 — Peso por combinação, seleção por valor e preço no botão (o caso do whey)

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Filho do épico BEELINK-17 (variações), aberto a partir de uma pergunta do Rafael em 24/09/2026.
> Empilhado sobre o B1 (BEELINK-26).

## O pedido

> Um whey vendido em sabores e pesos: 900g tem um preço, 750g tem outro, e um sabor pode custar
> diferente de outro. Como a aplicação se comporta?

O modelo do épico A já atende o essencial: o preço é por combinação, então "900g · Morango" pode
custar diferente de "900g · Chocolate" e de "750g · Chocolate". A pergunta expôs três lacunas no
editor e na vitrine para esse caso.

## Definição de Pronto

1. Cada combinação tem o próprio peso na tabela do editor. A seção Envio passa a dizer que o peso
   fica nas combinações e mantém a caixa, que vale para todas. Salvar grava o peso de cada
   combinação e não sobrescreve um pelo outro.
2. "Selecionar todas de: 900g" escolhe de uma vez todas as combinações de um valor, para as ações
   em massa. Pressionar de novo desfaz a escolha.
3. Na vitrine, cada valor mostra o preço da combinação a que o clique leva, com o resto da escolha
   mantido, quando os valores daquela opção custam diferente.
4. `pnpm ci-check` verde, com testes.

## Decisões

### 1. Peso na linha, caixa no produto

O frete de 750g e de 900g é diferente, então o peso vai para cada combinação. A caixa (comprimento,
largura e altura) continua única: potes de sabores diferentes num mesmo peso têm a mesma caixa, e
uma tabela com mais três colunas deixaria de caber. Uma combinação nova começa com o peso da vizinha
mais próxima, como o preço: é um ponto de partida visível para corrigir.

Antes, o Envio mandava o mesmo peso para todas as combinações, e um salvamento no editor apagava
pesos diferentes gravados pela API.

### 2. Selecionar por valor, no cabeçalho da tabela

Uma linha de botões lista os valores opção por opção (todos os pesos, depois todos os sabores).
Cada botão soma à seleção as combinações daquele valor, e com todas já escolhidas as libera. É o
caminho para "todas as 900g por R$ 149,90" com um clique e uma ação em massa. O cabeçalho saiu da
tabela para um bloco próprio (`VariationTableHeader`), com story e teste.

### 3. O preço no botão, só quando diferencia

Como os blocos de sabor do design 5b, o botão mostra o preço da combinação a que o clique leva
(`targetOf`), mantendo o resto da escolha. Quando todos os valores daquela opção custam o mesmo, o
preço não se repete em cada botão. O nome acessível do botão é escrito por extenso: valor, preço e
estado ("750g, R$ 129,90", "M, R$ 189,00, esgotado").

## Fora de escopo

- Foto por combinação no editor. A API já guarda `imageUrl` por variante.
- Acréscimo de preço por valor ("sabor premium +R$ 10"). O preço continua final por combinação, e
  a seleção por valor torna rápido preencher por grupo.
- Caixa por combinação.

## Evidência no navegador (loja de teste `loja-do-design`)

"Whey teste sabores" com Peso 900g/750g × Sabor Chocolate/Morango:

1. "Selecionar todas de 750g" e "Mesmo preço" deram 129,90 às duas combinações de 750g.
2. Os pesos 750 e o preço de 900g · Morango (154,90) foram digitados na linha.
3. No banco, cada combinação ficou com o próprio preço e peso, e o resumo ficou de 129,90 a
   154,90.
4. Na vitrine, os botões mostram "900g, R$ 149,90", "750g, R$ 129,90" e "Morango, R$ 154,90", e o
   WhatsApp nomeia "(900g · Chocolate)".
