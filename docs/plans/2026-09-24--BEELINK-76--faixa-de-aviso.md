# BEELINK-76 — A faixa de aviso em todas as páginas, parada e centralizada

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E4 do épico BEELINK-72 (a casca da loja igual ao design). Empilhado sobre o E8 (BEELINK-80).

## O pedido

5a e 5b começam com a faixa de aviso, o "banner chamando atenção" do pedido. Hoje só a home e a
prévia do modo design a desenham; produtos, categorias, busca, carrinho e a página do produto não
mostram nada, embora todo `shopAt()` já traga as seções da loja e o contrato diga que a faixa fica
acima do cabeçalho em toda página. E ela é um letreiro que corre, enquanto o design a desenha
parada, centralizada, em maiúsculas.

## Definição de Pronto

1. As sete rotas da vitrine mostram a mesma faixa, conferido no HTML.
2. A 1440 a faixa fica estática e centralizada, 32px de altura, 12px, peso 700, mensagens em
   spans separados com 56px entre elas. Em 390 nada é cortado.
3. A prévia do modo design continua mostrando a faixa do rascunho, e um site a mostra também.
4. Testes e stories atualizados, `pnpm ci-check` verde.

## Decisões

### 1. Quem deriva a faixa é o quadro, não cada página

`StorefrontFrame` chama `announcementOf(sections ?? store.sections)` sozinho. A home e a prévia
deixam de passar `announcement`, e as outras cinco rotas ganham a faixa sem mexer em nada. A prévia
já passa `sections` com o rascunho, então a faixa dela continua sendo a do rascunho.

### 2. Parada do tablet para cima, letreiro só no celular

O lojista tinha pedido o letreiro. O design decidiu o desktop: a partir de `shop-sm` a faixa fica
parada e centralizada, e as cópias do letreiro não são desenhadas. Abaixo disso, duas mensagens de
12px não cabem em 390px, e a faixa volta a correr. Com `prefers-reduced-motion` nada se move em
largura nenhuma.

### 3. As mensagens são uma lista

O bloco recebe `messages: string[]` e desenha um `<span>` por mensagem, sem o " · " de antes. O
quadro da loja continua com `left` e `right`, que são o título e o subtítulo da faixa: a terceira
mensagem do design precisaria de campo novo na API e no editor, e fica para depois.

## Fora de escopo

- Uma terceira mensagem.
- O visual do cabeçalho abaixo da faixa (E5, BEELINK-77).
