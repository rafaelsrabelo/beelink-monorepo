# BEELINK-137 — Cabeçalho no celular: a busca numa linha própria, na largura inteira

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> E10 do Épico E. Rafael, 25/09: "no responsivo, ajustar o header na página do cliente: o componente
> de busca desce ocupando todo espaço, pq se ficar na mesma linha fica com experiência ruim".

## Definição de Pronto

1. Abaixo de 768 px, a primeira linha do cabeçalho tem a logo, a conta e o carrinho, e a busca fica
   na segunda linha, na largura inteira.
2. A partir de 768 px, a linha única de 72 px de antes.
3. O que se posiciona pela altura do cabeçalho (`--shop-masthead-height`) continua certo.
4. O mesmo na prévia do modo design em Celular.
5. Um site (sem busca) continua com a linha única de 72 px.

## Por que estava ruim

Numa linha só, em 390 px a busca ficava com ~100 px, menos que o seletor "Buscar em" e o botão
dela: o campo ia a zero e o botão era cortado.

## Decisões

1. **Só CSS, no `storefront-masthead.tsx`.** A busca muda de linha por `order` e `basis-full`, e a
   ordem do DOM não muda: o foco continua logo → busca → conta → carrinho, a ordem do computador,
   que é onde se usa teclado. Renderizar a busca duas vezes, uma para cada tamanho, daria dois
   landmarks de busca e perderia o termo digitado ao girar o tablet.
2. **A quebra é em `shop-md` (768 px).** Em 640 px, numa linha só, o campo ainda ficaria com ~180 px,
   menos se uma categoria tiver nome longo. A partir de 768 px ele tem ~300 px.
3. **A altura continua medida.** `MastheadHeight` mede o cabeçalho com um `ResizeObserver`, então no
   celular a variável passa a ~153 px sozinha. Ganha um teste do caminho de redimensionar.
4. **16 px no campo e no seletor do celular.** Abaixo disso o iOS dá zoom na página ao tocar no
   campo, que agora é o elemento mais visível do topo.

## Fora de escopo

- Altura máxima e rolagem da lista de sugestões.
- A prévia do modo design passa `searchSlot={null}`, que cai na busca ao vivo: continua assim.
