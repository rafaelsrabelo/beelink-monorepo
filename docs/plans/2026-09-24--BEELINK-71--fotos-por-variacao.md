# BEELINK-71 — Associar fotos às variações (por sabor, por peso ou por combinação)

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A8 do épico BEELINK-17 (variações), aberto a partir de uma observação do Rafael em 24/09/2026.
> Empilhado sobre o A7 (BEELINK-70), que deixou "foto por combinação no editor" fora de escopo.

## O pedido

> Deveria poder associar as fotos dos produtos a qual variação. Um whey de (sabor) e (peso) pode
> ter fotos diferentes. Como pensar nisso no cadastro e na edição do produto?

Hoje o produto tem uma galeria só. A vitrine mostra todas as fotos para qualquer escolha: quem
escolhe Morango vê o pote de Chocolate. A API já guarda uma `imageUrl` por variante, mas nenhuma
tela a preenche, e ela comporta uma foto só.

## Definição de Pronto

1. No cadastro, cada foto da galeria pode ser associada a valores das opções: Sabor Morango; ou
   Morango e 900g; ou Chocolate e Baunilha. Sem associação, a foto vale para todas as combinações.
   Salvar grava a associação, e reabrir o produto a mostra.
2. Na tabela de variações, cada combinação mostra a foto com que a vitrine abre.
3. Na vitrine, a galeria mostra só as fotos que servem à combinação escolhida e as gerais, e abre
   na mais específica. Trocar a escolha troca a galeria.
4. A API recusa um valor que não é do produto. Remover um valor não apaga nenhuma foto.
5. `pnpm ci-check` verde, com testes na API (unidade e e2e), no design system e no web.

## Decisões

### 1. A foto aponta para valores, não a combinação para uma foto

O pote de Morango é o mesmo em todas as combinações de Morango. Associar foto a combinação
obrigaria repetir a mesma foto em cada linha de Morango, e cada peso novo começaria sem foto.
Associar a foto a valores cobre os três casos do whey com uma regra:

- **Uma foto de sabor:** marcada Morango, vale para Morango em qualquer peso.
- **Uma foto de pote:** marcada Morango e 900g, vale só para essa combinação.
- **Uma foto geral** (tabela nutricional, foto de ambiente): sem marca, vale para todas.

A regra é a mesma dos filtros da listagem (B1). Valores da mesma opção somam: Chocolate **ou**
Baunilha. Opções diferentes se exigem: Morango **e** 900g. Uma combinação pode ter várias fotos,
coisa que a `imageUrl` da variante não comporta.

### 2. No cadastro: a marca fica na própria foto

Com o produto já tendo combinações, cada foto da galeria ganha um botão abaixo dela. O botão
diz a que a foto vale ("Todas as variações", "Morango", "Morango · 900g"). Ele abre uma escolha
opção por opção, com um botão liga-e-desliga por valor, e "Todas" limpa a opção.

A marca fica na seção Fotos, e não numa grade nova na seção Variações, para não desenhar cada foto
duas vezes. A tabela de variações fecha o ciclo: cada linha mostra, ao lado do nome, a foto com que
a vitrine abre aquela combinação. O lojista vê o resultado sem ir à vitrine.

Remover um valor tira a marca dele das fotos no rascunho. Uma foto que só valia para Morango passa
a valer para todas, e o botão diz isso antes de salvar. A foto nunca é apagada.

### 3. Na vitrine: as fotos da escolha, as mais específicas primeiro

A galeria mostra as fotos que servem à combinação escolhida. As que nomeiam mais opções vêm
primeiro, as gerais depois, e cada grupo mantém a ordem do lojista. A galeria abre na primeira.
Trocar a escolha remonta a galeria quando o conjunto de fotos muda.

Quando nenhuma foto da galeria serve à combinação, a galeria mostra todas, como hoje: é melhor
mostrar outro sabor do que "sem foto". O card da listagem continua com a primeira foto da galeria.

A `imageUrl` da variante continua valendo na vitrine como antes: quando existe, abre a galeria.
Nenhuma tela a preenche, e ela fica na API até alguém decidir retirá-la numa migration própria.

### 4. Armazenamento: uma tabela de marcas, trocada com a galeria

`product_image_values (imageId, valueId)`, com as duas chaves em cascata. A galeria continua
trocada inteira a cada salvamento, e as marcas vão junto, no mesmo `create`.

- **O contrato:** `ProductImagePayload.optionValueIds` (opcional) e
  `PublicProductImage.optionValueIds` (sempre presente, vazio quando geral).
- **A API confere** que cada valor é de uma opção do próprio produto, dentro da transação da
  escrita. Se não for, responde `PRODUCT_OPTION_NOT_FOUND`, como o PUT de variantes.
- **Remover um valor** apaga as marcas dele pela cascata, e a foto fica.

### 5. A ordem do salvamento: as fotos por último, quando há opções

Um valor novo só tem id depois que as opções são salvas. Num produto com opções, o salvamento
passa a ser: o produto (sem as fotos), as opções, as combinações e, por fim, as fotos com as
marcas já traduzidas para ids. Isso dá uma requisição a mais, só para produto com opções. Num
produto que vende uma coisa só, as fotos continuam indo com o produto, na primeira requisição.

## Fora de escopo

- Vídeo por variação.
- Foto do card da listagem por variação: o card continua com a primeira foto.
- Retirar a `imageUrl` da variante.
