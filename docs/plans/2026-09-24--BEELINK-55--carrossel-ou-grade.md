# BEELINK-55 — O banner honra `display`: carrossel ou grade, por escolha

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A5 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do A2 e anda sobre o A4 ([plano](2026-09-23--BEELINK-54--grade-de-12-colunas.md)).
> Área: UI + web · ajuste · P · ordem 4/17.

## O pedido

> `StorefrontShowcase` passa a ler `display`: `GRID` desenha a grade de slides, `CAROUSEL` desenha o
> trilho. A contagem de slides deixa de decidir sozinha.
>
> - Um banner com 3 slides e display GRID mostra os três lado a lado, sem carrossel.
> - Um banner com 1 slide e display CAROUSEL não quebra.
> - A escolha do lojista nunca é sobrescrita pela contagem de slides.

## Definição de Pronto

1. Um banner com `display: GRID` desenha todos os seus slides lado a lado, dentro da célula dele,
   com qualquer número de slides. Abaixo de 640px eles ficam um embaixo do outro.
2. Um banner com `display: CAROUSEL` e dois ou mais slides continua sendo o carrossel.
3. Um banner com um slide desenha o cartão, seja qual for o `display`, e não quebra.
4. A contagem de slides nunca troca carrossel por grade, nem o contrário.
5. O lojista escolhe o formato na folha do banner, e o preview do modo design mostra a escolha.
6. `pnpm ci-check` verde.

## Decisões

### 1. A escolha precisa de um controle, e ele entra aqui

Nenhum ticket do épico põe um controle de `display` no editor: o A6 é o controle de largura. Sem ele,
"por escolha" não tem como acontecer, e o `display` dos banners seria para sempre o `CAROUSEL` que a
migração gravou. A folha do banner ganha "Formato: Carrossel ou Grade", ao lado do "Tamanho" que já
existe lá. É a mesma folha que salva direto no servidor, então o preview o lê do servidor, como lê os
slides.

### 2. Quantas colunas a grade desenha sai da contagem de slides

O plano do épico diz que o que sobrasse de `layout`, quantas colunas a grade de slides desenha, só
seria lido com `display: GRID`. O A1 traduziu `layout` inteiro para `span`, então não sobrou nada nos
dados. A grade desenha uma coluna por slide até quatro. Com mais de quatro, a quinta abre uma nova
fileira. A partir de 640px são até duas colunas, e a partir de 1024px até quatro.

A contagem decide quantas colunas, e nunca se o banner é grade ou carrossel. É isso que o critério
"nunca sobrescrita pela contagem" protege.

`columns` já existe no modelo. Um seletor de colunas para o banner seria um terceiro controle na
mesma folha, para pouca gente usar; fica fora.

### 3. Um slide é sempre o cartão

Com um slide, carrossel e grade desenham a mesma coisa. O cartão continua sendo o que já era.

### 4. Na grade, cada cartão tem a proporção de um cartão pequeno

Um cartão sozinho tira a proporção da largura do bloco, como no A4. Quando vários dividem a célula,
cada um é uma fração dela, e todos usam 4:3, que é a proporção do terço.

## Fora de escopo

- Um seletor de colunas para a grade do banner.
- `CATEGORIES` e `PRODUCTS` lerem `display`: B3 e B4.
- O controle de largura novo: A6.

## Adendo — 24/09/2026, antes do código

**A decisão 2 muda num ponto: as colunas seguem a célula, e não a tela.** Com pontos de quebra da
tela, três slides num terço de uma faixa de 1360px seriam três cartões de 137px. A grade de um
banner usa container queries (`@container`, nativo do Tailwind 4): duas colunas a partir de uma
célula de 448px, três a partir de 768px e quatro a partir de 1024px. Num celular, e num terço, os
slides ficam um embaixo do outro. A contagem continua decidindo só quantas colunas, e nunca se o
banner é grade ou carrossel.

O setup de testes do web ganhou as mesmas simulações de navegador que o do `packages/ui` já tinha
(`matchMedia`, `ResizeObserver`, `IntersectionObserver`), para que um teste da página consiga
desenhar o carrossel.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou quatro defeitos deste diff, todos corrigidos:

- **A folha ainda prometia carrossel.** A dica debaixo das imagens ("Adicione uma segunda imagem e
  o banner vira um carrossel") aparecia com "Grade" escolhido logo acima. Agora ela acompanha o
  formato: com "Grade", diz que as imagens aparecem lado a lado.
- **Um cartão de grade sem título ficava sem nome acessível.** Um slide com as palavras pintadas na
  imagem e com link virava um link vazio na grade, enquanto no carrossel ele se chamava "Voltar para
  a loja". O cartão agora usa o mesmo nome de reserva.
- **Dois testes não provavam o que diziam.** "Um slide é sempre o cartão" passava também se o banner
  virasse a capa. "A folha manda o formato" só testava o valor padrão. Os dois agora falham se o
  código estiver errado.
