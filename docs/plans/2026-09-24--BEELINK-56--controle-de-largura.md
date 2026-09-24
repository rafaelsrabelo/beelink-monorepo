# BEELINK-56 — Controle de largura no cartão do bloco, no lugar do Tamanho ambíguo

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A6 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Anda
> sobre o A5 ([plano](2026-09-24--BEELINK-55--carrossel-ou-grade.md)).
> Área: FE · ajuste · P · ordem 5/17.

## O pedido

> Hoje a folha do banner diz Tamanho: Um terço e ponta-a-ponta mora na folha da faixa — dois
> controles parecidos, em lugares diferentes. Um controle de largura do bloco no cartão, com rótulos
> que dizem a fatia (cheio, metade, um terço, dois terços) e, ao lado, a largura da faixa.
>
> - Mudar a largura do bloco atualiza o preview sem recarregar.
> - Largura do bloco e largura da faixa aparecem juntas, com rótulos que não se confundem.
> - Nenhuma cor literal; só tokens.

## Definição de Pronto

1. O cartão de todo bloco, de qualquer tipo, tem um controle "Largura do bloco" com as quatro
   fatias. Cada opção é nomeada pela fatia, e a fatia escolhida aparece escrita ao lado.
2. Ao lado dele, o cartão mostra a largura da faixa, com o rótulo "Largura da faixa".
3. Mudar a largura do bloco atualiza o preview sem recarregar e sem publicar.
4. A folha do banner não tem mais "Tamanho". A largura de um bloco se escolhe num lugar só.
5. Nenhuma cor literal nos arquivos tocados.
6. `layout` sai do contrato e da API, porque depois deste ticket nada mais o lê. O plano do A2
   prometeu isso para o último leitor.
7. `pnpm ci-check` verde.

## Decisões

### 1. Um controle, no cartão, para todo tipo

Desde o A4 todo bloco tem uma fatia da faixa: um título ao lado de um banner é tão possível quanto
dois banners. O controle deixa de ser só do banner. Ele vira um bloco próprio (`SpanField`), para
o `arrangement-row` voltar a caber no limite de linhas e para o cartão unificado do C1 reaproveitá-lo.

### 2. Glifos, e a fatia escrita

O painel tem 380px. Quatro botões com palavras não cabem ao lado do nome do bloco. São quatro glifos,
cada um nomeado pela fatia no nome acessível e na dica de passar o mouse, e a fatia escolhida aparece
escrita ao lado dos glifos. Assim o rótulo diz a fatia sem que o dono precise passar o mouse.

### 3. A largura da faixa aparece, não se edita ali

A largura da faixa é da faixa, e a folha da faixa a salva direto no servidor. O cartão a mostra ao
lado da largura do bloco ("Largura da faixa: Dentro da margem"), com um rótulo que não se confunde
com o do bloco. Editar as duas lado a lado é o cartão unificado do C1.

### 4. A folha do banner perde o "Tamanho"

Era o segundo controle do mesmo campo, e gravava `layout` direto no servidor enquanto o rascunho
guardava `span`. Tirá-lo acaba com os dois defeitos de uma vez: o controle duplicado e o rascunho que
não via o que a folha salvou.

### 5. `layout` sai do fio

Depois deste ticket nenhum código do web lê nem manda `layout`. `ShowcaseLayout`, o campo nas três
formas do contrato e a tradução na API (`SPAN_OF_LAYOUT`, `LAYOUT_OF_SPAN`) saem. Uma escrita que
ainda mande `layout` recebe 400, como qualquer campo desconhecido, pelo `forbidNonWhitelisted`.

## Fora de escopo

- Editar a largura da faixa no cartão, e o cartão único da faixa de bloco único: C1.
