# BEELINK-64 — A faixa de um bloco só vira um cartão só

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C1 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: UI · ajuste · M · ordem 12/17.

## O pedido

> Quando a faixa tem um bloco, mostrar um cartão com os controles dos dois. A faixa se revela como
> contêiner ao ganhar o segundo bloco.
>
> - Uma página de cinco faixas de bloco único mostra cinco cartões, não cinco contêineres.
> - Adicionar um segundo bloco expande o cartão em contêiner sem perder o que estava editado.
> - Nenhum arquivo passa de 250 linhas.

## Definição de Pronto

1. Uma faixa com um bloco é desenhada no painel como **um** cartão: o do bloco, com a miniatura, o
   nome, o que ele é e a largura dele ao lado da largura da faixa.
2. O cartão carrega os controles da faixa que fazem sentido para uma coisa só: arrastar (move a
   faixa), a cor e o nome da faixa (abre a folha dela), esconder e excluir.
3. Esconder o cartão esconde a faixa. Mostrar de novo mostra a faixa e o bloco, se o bloco também
   estava escondido. Excluir o cartão exclui a faixa, e não aparece quando o bloco não pode sair (a
   última vitrine).
4. Uma faixa com dois blocos ou mais continua o contêiner de hoje. Adicionar um segundo bloco à faixa
   de um cartão o transforma em contêiner, e o rascunho (ordem, largura, visibilidade) continua o
   mesmo.
5. Nenhum arquivo passa de 250 linhas.
6. Story e teste para o cartão.
7. `pnpm ci-check` verde.

## Decisões

### 1. O cartão é o item da faixa no quadro de arrastar

O quadro de fora ordena faixas. O cartão é a faixa nesse quadro: a alça dele move a faixa, e não
existe o quadro de dentro, porque um bloco sozinho não tem com quem trocar de lugar.

### 2. Um olho, com a regra do que o dono vê

Uma faixa escondida com um bloco visível e uma faixa visível com um bloco escondido dão a mesma
loja. O cartão tem um olho: aberto só quando os dois estão visíveis. Fechar esconde a faixa (o bloco
fica como estava, e reaparece com ela). Abrir mostra a faixa e, se o bloco estava escondido, ele
também.

### 3. O lixo do cartão é o da faixa

A API aceita apagar o único bloco de uma faixa e deixa a faixa vazia. Para o dono, o cartão é uma
coisa só, então o lixo exclui a faixa, com a confirmação que a faixa já tem.

### 4. A faixa é dita no cartão, não escondida

O nome da faixa (ou "Faixa N") aparece na segunda linha do cartão, ao lado do que o bloco é, e a
bolinha da cor abre a folha da faixa. A largura da faixa já aparece ao lado da largura do bloco, no
controle de largura do A6.

## Fora de escopo

- O `+` entre as faixas: C3.
- A seleção pelo preview: C4.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou dois pontos, ambos corrigidos:

- **Com a faixa e o bloco escondidos, o olho do cartão mostrava só o bloco.** O clique faz duas
  edições do rascunho (mostrar a faixa, mostrar o bloco), e a tela montava cada uma a partir do
  mesmo retrato do rascunho: a segunda desfazia a primeira. O `edit` do rascunho passa a aceitar uma
  função que parte do estado mais recente, e mostrar ou esconder uma faixa (`patchSection`) e um
  bloco (`patchComponent`) usam essa forma. Um teste do `useDesignDraft` faz as duas edições no
  mesmo evento, e falha com a forma antiga.
- **Adicionar o segundo bloco pelo teclado perdia o foco.** O cartão e o contêiner eram raízes
  diferentes, e o React remontava a faixa inteira, com o botão de adicionar que estava com o foco.
  Agora a faixa é sempre o mesmo `<li>` com o mesmo lugar para adicionar; só o miolo muda.

Um ponto foi refutado como defeito, e atendido mesmo assim: a confirmação de excluir chama a faixa
pelo nome dela quando ela tem nome, como o painel já chamava. Os testes que a revisão pediu foram
escritos: faixa escondida com bloco visível, os dois escondidos, a miniatura e a largura da faixa no
cartão.
