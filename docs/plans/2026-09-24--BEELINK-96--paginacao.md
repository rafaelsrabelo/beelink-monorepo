# BEELINK-96 — A paginação da listagem no estilo de 5a

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B15 do épico BEELINK-25 (listagem). Empilhado sobre o B12 (BEELINK-88).

## O pedido

A paginação de 5a: caixas de 40px com borda e raio de 10px, gap de 6px, a página atual na tinta da
página, "‹ Anterior" e "Próxima ›", e a janela 1 2 3 … N na primeira página.

## Definição de Pronto

1. Caixas de 40px, borda `--shop-line-strong`, raio 10px, fundo da página, gap 6px.
2. A página atual em `--shop-text`/`--shop-on-text`, peso 700, com `aria-current`.
3. "‹ Anterior" e "Próxima ›" com 40px de altura; "Próxima" em 600.
4. Na página 1, "Anterior" fica no lugar, apagado, e não é link.
5. Na página 1 a janela é 1 2 3 … N; na última, 1 … N-2 N-1 N.
6. Sem violação de acessibilidade.

## Decisões

### 1. "Anterior" na página 1 é texto que o leitor pula

5a mantém a palavra no lugar, para a fileira não andar entre a página 1 e a 2. Um link desabilitado
não existe em HTML: ficaria na ordem de tabulação prometendo uma página que não existe. Então é um
`<span aria-hidden>` apagado. Os testes que diziam "sem Anterior na página 1" mudam de propósito.

### 2. A janela alcança um a mais nas pontas

Na página 1 a atual só tem um vizinho, e a janela mostrava 1 2 … N. Agora mostra 1 2 3 … N, como 5a
desenha, e o mesmo vale na última página.

### 3. As setas são decoração

"‹" e "›" ficam fora do nome acessível: o leitor ouve "Anterior" e "Próxima".

## Fora de escopo

- O tamanho da página (16, do B7).
