# BEELINK-86 — Passar as fotos no card quando o produto tem mais de uma

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B10 do épico de listagem. Empilhado sobre os ajustes da revisão (`fix/ajustes-revisao-vitrine`), que
> vêm do B11 (BEELINK-87), de onde saem as fotos do card.

## O pedido

Pedido do dono: no card da home, de todos os produtos, das categorias e da busca, um produto com mais
de uma foto deixa passar entre elas.

## Definição de Pronto

1. Com duas fotos ou mais, a foto do card é uma faixa que encaixa (`scroll-snap`), uma foto por
   largura: o dedo passa as fotos antes de o script chegar.
2. Com ponteiro fino, duas setas redondas aparecem ao passar o mouse no card; da última foto, voltam
   para a primeira. Pontos de 6px embaixo, o da foto em vista na cor da loja.
3. Tudo é decorativo para o leitor de tela (o nome do produto é o link do card e a galeria está na
   página do produto): escondido da árvore de acessibilidade e fora do Tab.
4. Num trilho da home, no toque, o dedo move o trilho, não a foto; ali os pontos (numa área de toque
   de 24px) passam as fotos.
5. Com uma foto só, o card continua como era, renderizado no servidor.

## Decisões

### 1. Âncoras simples dentro da ilha

O card renderiza no servidor e a faixa é uma ilha cliente: um componente de link injetado é uma
função, que o servidor não pode passar para ela. Cada foto é um `<a>` para a página do produto.

### 2. O selo de desconto fica acima da faixa e deixa o ponteiro passar

### 3. Carregamento das fotos 2..N

As fotos 2..N usam `loading="lazy"`. O Chrome baixa a vizinha de uma foto em vista dentro de uma faixa
que rola (margem de carregamento em roladores), então a segunda foto chega junto com o card na tela.
Adiar mais exigiria tirar o `src` do HTML, e aí a faixa não passaria antes do script — o critério 1
pesa mais. Fica registrado.
