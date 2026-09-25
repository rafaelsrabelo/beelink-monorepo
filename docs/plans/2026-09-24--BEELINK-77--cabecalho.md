# BEELINK-77 — O cabeçalho da loja no layout do design

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E5 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E4 (BEELINK-76).

## O pedido

Copiar a linha de cima do cabeçalho de 5a e 5b: logo · Entregar em · busca · Minha conta ·
Carrinho. Hoje a linha tem 64px, a busca é limitada a 448px e centralizada, e conta e carrinho
são ícones sem palavra.

## Definição de Pronto

1. A 1440, lado a lado com 5a, a linha tem 72px e os itens ficam na mesma posição: 28px entre
   eles, a busca ocupando o que sobra, conta e carrinho como texto ao lado das marcas.
2. O selo do carrinho é visível na Mutante, onde primária e cabeçalho são a mesma cor.
3. O masthead escreve a própria altura em `--shop-masthead-height`.
4. Testes do masthead atualizados, axe sem violações, story com e sem logo, e um site continua
   com menu e botão. `pnpm ci-check` verde.

## Decisões

### 1. A busca ocupa a linha

O dono tinha pedido a busca limitada e centralizada. O design decidiu o contrário, e o pedido
desta rodada é copiá-lo. O comentário do bloco registra a troca.

### 2. Conta e carrinho como texto, com o selo no tom da marca para o cabeçalho

"Olá, entre / Minha conta" e "Carrinho" em 14px/700, com as palavras escondidas abaixo de
`shop-lg`. O selo usa `--shop-primary-on-header` (E3): na Mutante ele volta a aparecer. O nome
acessível do carrinho diz a contagem: "Carrinho, 0 itens".

### 3. A conta some até existir conta de cliente

O ícone apontava para `/login`, que é o login do lojista, o público errado. O bloco continua
desenhando o link quando a página passa `accountHref`; o quadro deixa de passar até existir a
conta de cliente (desenhos 6a a 6h).

### 4. A altura vira variável CSS

`--shop-masthead-height` = 72px, mais 45px quando há a linha de categorias na variante de barra.
A variante de fotos é mais alta; quem precisar da altura exata sob ela a mede.

### 5. O slot "Entregar em" fica pronto e vazio

`deliverTo` é um nó entre o logo e a busca, escondido abaixo de `shop-lg`. O E9 (BEELINK-81) o
preenche.

## Fora de escopo

- A caixa de busca em si (E6, BEELINK-78), o menu de categorias (E7, BEELINK-79) e o bloco de CEP
  (E9, BEELINK-81).
