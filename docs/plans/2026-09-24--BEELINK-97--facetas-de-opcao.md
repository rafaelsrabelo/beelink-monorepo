# BEELINK-97 — Facetas de opção, desconto por faixa e a ilha cliente da coluna

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B16 do épico BEELINK-25 (listagem). Empilhado sobre o B4 (BEELINK-29). Com ele, a coluna de filtros
> de 5a filtra de verdade: é o coração dos "filtros estilo Amazon".

## O pedido

A segunda metade da coluna de 5a: um grupo por opção da prateleira (Sabor em lista com contagem,
Tamanho em pílulas), o grupo Desconto com as faixas do B13, e uma ilha cliente que aplica cada
filtro sem recarregar a página.

## Definição de Pronto

1. Um grupo por opção, em lista de caixas com contagem ou em pílulas. Pílula quando algum valor tem
   cor, ou quando são até 6 valores de até 5 caracteres.
2. Depois de 5 valores, "Ver mais". Valor sem produto some, a não ser que esteja marcado.
3. Desconto: "Em promoção" e "10% / 20% / 30% ou mais" com contagem.
4. Valores da mesma opção somam; opções diferentes estreitam, como a API já faz.
5. Uma marcação muda o endereço e a grade sem recarregar a página. Sem JavaScript, o link funciona.
6. Os chips do B4 mostram cada valor marcado.
7. Sem violação de acessibilidade.

## Decisões

### 1. Caixas e pílulas são links com o papel de checkbox

O endereço é o filtro. Um `<input type="checkbox">` só navega com JavaScript; um link navega sempre e
é o que um crawler segue. O HTML permite `role="checkbox"` num link, e é ele que diz ao leitor de tela
o que o controle faz e se está marcado. A ilha faz a barra de espaço funcionar como numa caixa. Sem
JavaScript, Enter segue o link.

### 2. "Ver mais" é um `<details>` nativo

Abre sem JavaScript, e começa aberto quando um valor escondido está marcado. O primitivo Collapsible
precisaria de script para mostrar o que um visitante já escolheu.

### 3. A ilha só muda como os links são seguidos

`StorefrontListingControls` envolve a coluna e a grade. Um clique num link, ou o envio de um
formulário GET, que leve à mesma prateleira vira `router.push` dentro de uma transição. A prateleira
antiga fica esmaecida e com `aria-busy` até a nova chegar. A ilha não lê filtro nem guarda estado.
Links que saem da prateleira, como um produto ou outra categoria, ficam com o navegador. Mudar só a
página rola para o topo; um filtro mantém a rolagem.

### 4. O `Suspense` da listagem deixa de ter chave

O B14 punha o endereço como chave do `Suspense`, para um filtro mostrar o esqueleto de novo. Com a
ilha, isso faria a coluna virar cinza a cada marcação. Sem a chave, a navegação no cliente mantém a
prateleira anterior esmaecida; um carregamento completo continua mostrando o esqueleto.

### 5. O endereço pode escrever a opção diferente da faceta

Um link salvo pode trazer `sabor:uva` e a faceta dizer `Sabor`/`Uva`. Tirar o filtro remove o texto
que o endereço tem, não o que a faceta escreve.

## Fora de escopo

- Preço (B12), celular (B8).
- A ordenação continua recarregando a página: ela mora na faixa, fora da ilha.
- Marca e Objetivo, que não têm dado.
