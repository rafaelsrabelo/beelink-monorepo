# BEELINK-132 — 2 ou 3 banners lado a lado, direto da galeria

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I8 do Épico I (modo design). Relato do Rafael em 25/09: "consigo fazer banners 1/3, 2/3 ou 3/3, não
> consigo colocar banners ao lado do outro, somente embaixo — poderia criar 3 banners numa linha, 2
> banners em uma linha e um banner cheio".

## Definição de Pronto

1. A galeria aberta para criar uma faixa ("Nova faixa" ou o "+" entre faixas) oferece, em Destaque,
   "Banner", "2 banners lado a lado" e "3 banners lado a lado", cada um com a sua miniatura.
2. "2 banners lado a lado" cria **uma** faixa com dois banners em metade; "3 banners lado a lado", uma
   faixa com três banners em um terço; "Banner" continua um banner cheio.
3. Na prévia do editor (montada a 1440 px), os banners da mesma faixa ficam na mesma linha.
4. A galeria aberta pelo "+" de dentro de uma faixa oferece um banner só.
5. A faixa nova entra na estrutura com os seus banners e o primeiro abre para editar.
6. Testes: a galeria oferece e entrega a contagem; o hook de criar faixa cria os banners ao lado.

## Por que empilha hoje

Blocos só dividem a linha dentro da grade de **uma** faixa (`StorefrontBandGrid`, 12 colunas). Todo
banner criado pela galeria no nível de faixa nasce numa faixa própria, então um banner em 1/3 fica
sozinho, com 2/3 de vazio ao lado, e o próximo banner vai para a faixa de baixo. O único caminho para
pôr dois na mesma faixa é o "+" no pé do cartão da faixa, que só aparece no hover e tem a mesma cara
do "+" entre faixas.

## Decisões

### 1. A linha é uma opção da galeria, não uma configuração depois

O lojista pediu com as palavras da galeria: "3 banners numa linha, 2 numa linha, um cheio". Três
cartões em Destaque dizem isso sem ensinar o que é uma faixa. A contagem (`Across`: 1, 2 ou 3) viaja
do cartão ao `onAdd`, e o app traduz para a largura do bloco: 1 → `FULL`, 2 → `HALF`, 3 → `THIRD`.

Só o banner ganha linhas. É o único bloco que o lojista quis lado a lado, e o I3 (galeria nova com o
registro de tipos) herda as três opções como dados.

### 2. Sem mudar a API

`POST /sections` cria a faixa em volta de um bloco, e `POST /sections/:id/components` põe outro dentro
dela — os dois já aceitam `span`. O hook `useCreateSection` passa a receber `alongside`: quantos
blocos iguais entram ao lado do primeiro, na mesma faixa, logo depois de criá-la. Um contrato novo
("uma faixa com N blocos numa escrita só") seria mais atômico, mas uma falha no meio aqui deixa uma
faixa válida — um banner em metade, que o lojista vê e completa pelo "+" —, e não uma faixa vazia.

A lista é invalidada no `onSettled`, não no `onSuccess`: se o segundo banner falhar, o primeiro já
existe no servidor e tem de aparecer.

### 3. Só onde nasce uma faixa

Uma linha de banners é uma faixa. Pelo "+" de dentro de uma faixa, a galeria continua pondo um bloco
só — ali, "3 banners lado a lado" teria de dizer o que acontece com o que já está na faixa.

## Fora de escopo

- O "+" de dentro da faixa mais visível, e reequilibrar as larguras quando um bloco entra numa faixa
  que já tem outro: o I2 redesenha o painel e a barra da seção.
- Linhas de outros blocos (categorias, texto).
- Entre 640 e 1024 px a vitrine já desenha terços como metades (`storefront-band-cell.tsx`): três
  banners viram dois e um. Continua assim; no celular cada banner ocupa a linha inteira.
