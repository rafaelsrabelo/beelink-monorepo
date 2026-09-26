# BEELINK-98 — Card: a linha de variações

*Escrito em 2026-09-26, ao começar o ticket. Épico B.*

## O que muda

O card do produto ganha a linha "4 sabores": quantos valores tem a primeira opção do produto, para o
visitante saber, antes de abrir a página, que vai escolher alguma coisa lá.

O ticket foi refocado em 24/09: a linha de nota sai junto com as avaliações (D14), e o botão
"Adicionar ao carrinho" já veio com o carrinho (F3). Sobra só esta linha.

## Definição de Pronto

1. O card mostra "{quantidade} {nome da opção no plural}", em 12 px e `--shop-muted`, a partir do
   `optionSummary` que a API já serve (B11).
2. Uma opção com um valor só, ou nenhuma, não mostra linha: não há o que escolher.
3. O card continua navegável como antes, sem violação de acessibilidade.

## Decisões

- **O plural é feito no código, pelas regras do português:** "Sabor" → "sabores", "Opção" → "opções",
  "Tamanho do copo" → "tamanhos do copo". O nome da opção é do lojista, e pedir o plural a cada opção
  criada seria um campo a mais para um detalhe. Uma palavra que não é só capitalizada ("GB") fica como
  está.
- **A linha fica sob o preço, e não sob o nome.** Assim os preços de uma mesma fileira ficam na mesma
  altura, com ou sem a linha. Conferido no navegador.
- **Só no card padrão.** O card compacto dos relacionados não tem ação nem detalhes; continua igual.

## Fora do escopo

- A linha de nota e as estrelas (D14, sem domínio de avaliações).
- "Frete grátis" (não há configuração de frete).
