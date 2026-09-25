# BEELINK-136 — O modo design abre na visualização Computador

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I12 do Épico I. Rafael, 25/09: "por padrão em design o modo de visualização tem que ser o web".

## Definição de Pronto

1. Abrir `/admin/<loja>/design` mostra a prévia em **Computador**.
2. Trocar para Celular vale até sair do editor ou recarregar a página.

## Decisão

O editor abria em Celular de propósito ("é onde a loja vende", `design-screen.tsx`). O dono da loja
decidiu o contrário, e há um motivo que o código confirma: dentro da prévia, `shop-sm` e `shop-lg`
perguntam a largura do contêiner (`globals.css`), então no Celular de 390 px toda célula volta a
`col-span-12` e uma linha de dois ou três banners aparece empilhada. Era metade do "não consigo pôr
banners lado a lado".

A escolha continua em `useState`, sem cookie nem armazenamento: um recarregar volta ao Computador,
que é o padrão pedido.

## Fora de escopo

- Um editor aberto num celular continua mostrando a prévia de computador reduzida; o botão Celular
  está na barra.
