# IMPULSEIA-105 — a faixa do afiliado no visual que o Rafael desenhou

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Ajuste do link na vitrine ([o plano do AF5](../../../../docs/plans/2026-11-12--IMPULSEIA-105--link-na-vitrine.md)),
> empilhado sobre o PR que mantém o nome do afiliado no endereço
> ([2026-11-12--IMPULSEIA-105--link-mantem-o-nome.md](2026-11-12--IMPULSEIA-105--link-mantem-o-nome.md)).

## O pedido

Rafael, 12/11/2026, com uma imagem de referência: "queria ter esse visual na faixa do afiliados".

A imagem: uma faixa da largura da página, logo abaixo do cabeçalho, em cor forte. À esquerda, o
avatar redondo com um anel claro (a foto, ou as iniciais), a legenda pequena "Você está na loja de"
em cima do nome em maiúsculas e negrito, e um selo contornado com um visto, "PARCEIRA OFICIAL". À
direita, pequeno: "Suas compras por este link contam para esta indicação."

## O que existia

Duas peças (AF5): na chegada pelo link, um cartão no tom claro da loja ("Você chegou pela indicação
de João Silva", com a frase); nas outras páginas, uma linha fina ("Comprando pela indicação de João"),
que o visitante podia fechar.

## Definition of Done

1. Uma faixa só, `StorefrontAffiliateBanner` (packages/ui), no visual da imagem, no lugar do cartão e
   da linha fina, que saem do pacote.
2. As cores são as da loja, pelas variáveis que a vitrine já usa: o fundo na cor da marca
   (`--shop-primary`), o texto na cor legível sobre ela (`--shop-on-primary`), o selo e as legendas
   nessa mesma cor, com transparência. Nenhuma cor escrita no componente.
3. Na chegada (`/<loja>/<nome>` ou `?afiliado=`), a faixa traz a frase do afiliado, quando há, numa
   linha embaixo do nome. Nas outras páginas, a faixa sem a frase.
4. No celular (até 640px): avatar, legenda e nome numa linha, o selo logo abaixo do nome, e a frase
   da direita embaixo, menor. Nada cortado.
5. A linha do carrinho e do checkout ("Indicação de … — … verá seu nome neste pedido") fica como está.
6. Histórias e testes do bloco; testes do web; o mapa do pacote e a frase de `docs/product` sobre a
   faixa.

## Decisões

### "PARCERIA OFICIAL", não "PARCEIRA"

A imagem diz "PARCEIRA". O bee-link não sabe o gênero de ninguém, e um afiliado pode ser homem, mulher
ou uma empresa. "Parceria oficial" diz o mesmo sem supor nada.

### O fundo é a cor da marca, não a do cabeçalho

A faixa fica colada no cabeçalho. Na cor do cabeçalho, ela sumiria dentro dele. Na cor da marca, ela
se destaca, como na imagem, e `--shop-on-primary` já é calculado para ser legível sobre ela, numa
loja de marca clara também. Quando o cabeçalho é pintado na própria cor da marca, uma linha fina em
cima separa os dois.

### O botão de fechar fica, só fora da chegada

A imagem não tem botão de fechar. Mas a linha fina do AF5 podia ser fechada, e isso escreve o cookie
`bl_affiliate_hidden`, que a política de privacidade já publicada descreve e que o
`apps/web/AGENTS.md` lista. Tirar o botão deixaria esse cookie descrito e sem uso, ou pediria uma
versão nova da política só para tirá-lo. A faixa da chegada não tem o botão, como no desenho. Nas
outras páginas ele aparece pequeno, no fim da faixa, e fechar continua escondendo só a faixa: o
pedido segue sendo do afiliado.

### A frase do afiliado entra só na chegada

Ela cabe numa linha embaixo do nome sem desmontar a faixa. Nas outras páginas a faixa fica com a
mesma altura de sempre, para não empurrar o conteúdo a cada página.

## Fora de escopo

- O cabeçalho da loja, a linha do carrinho e do checkout, o cartão de prévia na área do afiliado.
