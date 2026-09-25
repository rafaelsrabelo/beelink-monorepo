# BEELINK-46 — A coluna de informações da página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D6 do épico BEELINK-40 (página do produto). Empilhado sobre o D12 (BEELINK-91). Comparado com
> `docs/plans/design-handoff/design/5b-loja-pagina-produto.html` a 1440px e a 390px.

## O pedido

A coluna do meio de 5b, na ordem do design: "Visite a loja" → título → divisória → preço →
divisória → seletor → divisória → "Sobre este item", com a lista da descrição e "Ver descrição
completa ›".

## Definição de Pronto

1. Blocos a 14px um do outro e uma divisória de 1px em `--shop-line` acima do preço, do seletor e de
   "Sobre este item". Uma parte ausente leva a sua divisória junto.
2. "Sobre este item": h2 de 17px/800; lista com recuo de 20px, 6px entre os itens, 14px com altura de
   linha 1,5; a abertura em negrito de cada item mantida.
3. "Ver descrição completa ›" em 14px/600 na tinta da loja, levando a `#descricao`, abaixo do
   cabeçalho fixo.
4. Sem lista com marcadores na descrição, não há "Sobre este item" nem a última divisória.
5. A descrição não repete a lista: `#descricao` desenha o resto, e some quando a lista era tudo — e
   então o link também some.

## Decisões

### 1. A lista vem da descrição, com as marcas

`firstListOf` passa a devolver os itens com as marcas (`MarkdownInline[][]`), não o texto puro: a
abertura em negrito de 5b é o negrito que o lojista escreveu. Só conta uma lista com marcadores —
uma lista numerada é passo a passo, não destaque.

### 2. Sem repetir a lista

A descrição de hoje é um texto só. Com a primeira lista em "Sobre este item", `#descricao` desenharia
a mesma lista de novo, logo abaixo. `withoutFirstList` tira só essa lista; a página e a coluna usam a
mesma função, então o link e a seção aparecem juntos ou somem juntos.

### 3. Divisória como `div` decorativa

Um `<hr>` é um separador para o leitor de tela. As divisórias de 5b são só visuais, então são uma
`div` de 1px com `aria-hidden`.

### 4. `PRODUCT_DESCRIPTION_ID`

O id `descricao` sai de uma constante do bloco de seção, usada pela página e pelo link.

## Fora de escopo

- Linha de nota, "Mais vendido" e "Ver perguntas": avaliações adiadas, sem ranking de vendas, sem
  perguntas e respostas.
- Pix e parcelas: sem configuração da loja.
- Ficha rápida: escondida até existirem as especificações do D4 — feita só das opções, repetiria as
  legendas do seletor logo acima (ajuste da revisão do ticket).
- O aviso "Esgotado" continua acima do preço até o D7 levá-lo para a caixa de compra.
