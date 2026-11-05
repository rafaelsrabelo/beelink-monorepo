# O aviso de cookies da loja vai para o pé da tela

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio direto, sem um BEELINK. O número entra num adendo quando existir.

## O pedido

Rafael, 05/11/2026, com uma captura de https://mutantesuplementos.com.br/carrinho: "o componente de cookies
ta horrivel, tem que ficar em baixo, arredondados, com cores do site do cliente".

Hoje a faixa da BEELINK-271 fica no fluxo, acima do cabeçalho, ocupando a largura toda, com o fundo da página
e botões contornados. Numa loja de cabeçalho escuro, como a Mutante, ela parece uma tarja branca solta em cima
da loja.

## Definition of Done

1. Numa loja com Pixel da Meta, o aviso aparece como um cartão de cantos arredondados, preso ao pé da tela,
   com margem dos lados e embaixo, e não mais como uma faixa no topo.
2. O cartão usa as cores da loja: o fundo e o texto do cabeçalho (`--shop-header`, `--shop-on-header`), e os
   dois botões na cor de destaque do cabeçalho (`--shop-primary-on-header`). Nenhuma cor literal.
3. Recusar e Aceitar continuam com o mesmo tamanho, o mesmo peso e o mesmo desenho.
4. Nada fica escondido atrás dele: no fim da página o cartão ocupa o próprio lugar, depois do rodapé, e o que o
   Tab alcança é rolado para cima dele.
5. No celular, na página do produto, o cartão fica acima da barra de compra quando ela aparece, e não por cima.
6. "Cookies" no rodapé reabre o cartão, que recebe o foco e diz a escolha atual, como hoje.
7. Uma loja sem pixel não mostra nada, como hoje.
8. `pnpm ci-check` verde; o bloco com story e teste com axe.

## Decisões

- **Preso ao pé por `sticky`, não por `fixed`, e posto depois das páginas.** É o desenho que a landing já usa
  (BEELINK-319): enquanto a página rola, o cartão acompanha o pé da tela; no fim, ele descansa no próprio lugar,
  e por isso nunca cobre o último botão do checkout nem o fim do rodapé. A BEELINK-271 tinha ficado no topo
  justamente para não cobrir essas coisas, e o `sticky` resolve isso sem precisar do topo.
- **A barra de compra do celular diz a própria altura** (`--shop-buy-bar-height` no documento, medida enquanto
  ela aparece), e o cartão sobe essa altura. Assim nem a linha "Adicionado · Ver carrinho", que muda a altura da
  barra, fica embaixo do cartão.
- **As cores são as do cabeçalho da loja.** É a cor que a loja escolheu para a própria marca, no topo de toda
  página. O fundo da página, que a faixa usava, é quase sempre branco.
- **Os dois botões continuam iguais**, agora preenchidos na cor de destaque do cabeçalho. A regra da BEELINK-271
  vale: recusar custa o mesmo que aceitar.
- **O texto não muda.** Ele fala só do Pixel da Meta, porque é só ele que a loja carrega com o consentimento.

## Fora do escopo

- **O Google Analytics da loja não é carregado na vitrine.** O ID é salvo pelo painel (BEELINK-301/302), mas o
  `gtag` na vitrine (Z3) nunca foi feito: `googleAnalyticsId` não é lido em lugar nenhum do web. Ligar o GA, sob
  o mesmo consentimento, e citar o Google no aviso é outro trabalho, com outra frase na política de privacidade.
- **O aviso da landing da Beelink**, que já fica no pé da tela, com as cores da Beelink.
