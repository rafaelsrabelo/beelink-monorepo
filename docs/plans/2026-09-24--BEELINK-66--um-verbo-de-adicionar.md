# BEELINK-66 — Um só verbo de adicionar: um + entre as faixas

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C3 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do C1 ([plano](2026-09-24--BEELINK-64--faixa-de-um-bloco.md)).
> Área: contrato + API + UI + web · ajuste · M · ordem 16/17.

## O pedido

> Um `+` que aparece entre as faixas e dentro da faixa ao passar o mouse. A galeria abre já sabendo
> onde vai inserir.
>
> - O bloco entra exatamente onde o + foi clicado.
> - Some o botão do topo e somem os por-faixa.
> - Dá para inserir pelo teclado, sem mouse.

## Definição de Pronto

1. No painel, um `+` entre cada par de faixas, antes da primeira e depois da última, cria uma faixa
   nova naquele ponto.
2. Dentro de uma faixa, um `+` entre os blocos e depois do último põe o bloco novo naquela faixa,
   naquele ponto.
3. O `+` aparece ao passar o mouse e ao receber o foco pelo teclado. Em tela de toque ele fica
   sempre visível. Cada um tem um nome que diz onde insere.
4. O bloco novo entra exatamente onde o `+` foi clicado: no servidor, e também no rascunho quando há
   um arranjo ainda não publicado.
5. Somem o "Adicionar bloco" do topo e o "Adicionar nesta faixa" de cada faixa. Com a página vazia,
   um botão abre a galeria.
6. `POST /sections` e `POST /sections/:id/components` aceitam `position`, um índice de 0 até o
   tamanho da lista. Sem ele, o bloco continua entrando no fim. Um índice inválido responde 400
   `POSITION_INVALID`.
7. `pnpm ci-check` verde, com e2e para a posição.

## Decisões

### 1. A posição é um índice, e a API renumera

A coluna `position` pode ter buracos depois de exclusões (0, 1, 3). O `position` da criação é o lugar
na lista ordenada, e a API, numa transação que trava a loja (a mesma das exclusões do B1), grava o
novo naquele índice e renumera os demais de 0 em diante. Um índice maior que a lista é o fim.

### 2. O rascunho encaixa o novo depois do vizinho que ele tem no servidor

O `reconcile` punha no fim tudo o que o rascunho não tinha. Agora uma faixa (ou um bloco) nova entra
logo depois da que a precede no servidor. A tela manda à API a posição "logo depois do vizinho de
cima do `+`", contada na ordem do servidor. Assim o bloco cai no ponto clicado, com o rascunho limpo
ou com um arranjo não publicado.

### 3. Uma galeria só, que a tela abre sabendo o ponto

`BlockGallery` ganha um modo controlado (sem gatilho próprio), e a tela guarda o ponto de inserção.
O `+` é um bloco do `ui` (`InsertPoint`), com story e teste.

## Fora de escopo

- `+` dentro do preview: o preview é inerte, e selecionar por ele é o C4.
