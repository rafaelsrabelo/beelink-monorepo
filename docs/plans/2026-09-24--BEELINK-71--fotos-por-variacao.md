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

## Adendo — evidência no navegador (24/09/2026)

Na loja de teste `loja-do-design`, o "Whey teste sabores" (Peso 900g/750g × Sabor Chocolate/Morango)
recebeu três fotos que já estavam no banco local. Nenhuma imagem nova foi enviada ao Cloudinary.

1. No editor, cada foto ganhou o botão "Todas as variações". A foto 2 foi marcada Morango, e a 3,
   Morango e 900g.
2. A tabela de variações passou a mostrar a foto 3 em 900g · Morango, a 2 em 750g · Morango e a 1
   nas duas de Chocolate.
3. Salvo, o banco guardou "todas", "Morango" e "900g + Morango". Reaberto, o editor mostra as marcas
   e não acusa alteração pendente.
4. Na vitrine:
   - 900g · Chocolate mostra só a foto geral;
   - 900g · Morango abre na foto 3, seguida da 2 e da 1;
   - 750g · Morango mostra a 2 e a 1;
   - o link com `?variant=` abre já na foto da combinação.

O p95 da listagem com 5 mil produtos (`perf:catalog`) ficou em 70,6 ms, contra 69,2 ms antes de
ler as marcas. Depois da correção 3, abaixo, a vitrine nem lê mais as marcas.

## Adendo — revisão independente (24/09/2026)

Um revisor leu o diff e tentou refutar cada achado. Não houve bloqueador. Os quatro achados menores
foram corrigidos:

1. **"Alterações não salvas" sem alteração.** O editor compara rascunhos como texto. Desmarcar e
   remarcar um valor mudava a ordem das chaves. Agora as marcas têm uma forma só, em
   `lib/variation-photos.ts`: fotos em ordem de URL, chaves ordenadas, e nenhum mapa quando nada
   está marcado.
2. **Produto novo com opções criado sem fotos.** A decisão 5 tirou as fotos da primeira requisição
   também na criação. Se um passo seguinte falhasse, o produto ficava no ar sem fotos. Agora a
   criação leva as fotos sem marcas, e a última requisição as marca.
3. **A listagem da vitrine lia as marcas de todas as fotos** e não usava nenhuma. A grade ganhou uma
   leitura própria (`productCardInclude`), só com a primeira foto de cada produto.
4. **Opção sem nome na escolha da foto.** Uma opção "outra" recém-criada não tem nome. A escolha a
   chama por "Opção N", como o cartão da opção faz.

E um bug **grave, anterior a este ticket (A4, BEELINK-22)**, que agora também atingia as marcas:

- **Depois de um salvamento que falhou nas opções,** o editor renomeava as chaves novas pelos ids das
  opções antigas, casando por posição. Um valor novo (Baunilha) herdava o id de um removido
  (Morango), e o salvamento seguinte transformava as combinações de Morango (estoque, código, pedidos
  de aviso) em Baunilha.
- Agora `SaveProductError` diz se as opções chegaram a ser salvas (`optionsSaved`). Só então o
  rascunho é renomeado.
- A correção fica aqui, e não no branch do A4, porque o PR dele já está aberto com três outros
  empilhados em cima.
