# BEELINK-134 — Pôr um banner ao lado de outro, novo ou que já existe

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I10 do Épico I. Rafael, 25/09: "no modo design continuo sem conseguir colocar banners ao lado do
> outro". Depois do I8 (BEELINK-132), que criou "2/3 banners lado a lado" na galeria.

## Definição de Pronto

1. Cada bloco da estrutura tem um botão **"Adicionar ao lado"** sempre visível (não só no hover),
   quando a linha dele ainda tem espaço para mais um.
2. O bloco que entra ao lado ganha a largura que cabe: ao lado de um terço, um terço; ao lado de
   metade, metade; ao lado de um bloco cheio, os dois viram metade.
3. Na prévia, o vazio ao lado de um bloco estreito mostra **"+ Adicionar ao lado"**, que faz o mesmo.
4. Um bloco sozinho numa faixa, abaixo de outra faixa com espaço, tem **"Pôr ao lado de <bloco de
   cima>"**: ele vai para a faixa de cima, na mesma linha, sem ser feito de novo (as fotos vão junto),
   e a faixa que ficou vazia some.
5. API: `PUT /stores/:slug/components/:id/section` move um bloco para outra faixa, com e2e.

## Por que ainda não dava

- Blocos só dividem a linha dentro da mesma faixa. Nada movia um bloco de uma faixa para outra: a
  arrumação arrasta blocos só dentro da faixa deles, a prévia arrasta faixas inteiras, e o PATCH da
  API recusa `sectionId`.
- O único jeito de pôr um bloco numa faixa existente era o "+" do pé do cartão, que só aparece no
  hover e é igual ao "+" entre faixas. E o bloco entrava com largura cheia, então caía embaixo.
- Mudar um banner sozinho para "Um terço" só o estreitava, com dois terços vazios ao lado.
- A prévia abria no celular, onde toda linha empilha (resolvido no I12).

## Decisões

### 1. A conta da linha fica num lugar só

`packages/ui/src/lib/band-rows.ts`: as colunas de cada largura (cheio 12, dois terços 8, metade 6,
um terço 4, as do computador), as linhas que o grid monta e a largura que cabe ao lado de um bloco.
A estrutura, a prévia e o app leem daí.

### 2. Ao lado de um bloco cheio, os dois viram metade

A largura do vizinho muda como toda largura muda hoje: no rascunho, até Publicar. O bloco novo é
gravado na hora, como todo bloco novo, já com a largura dele.

### 3. Mover um bloco que existe é uma rota própria na API

Um `sectionId` no PATCH misturaria editar o bloco com mudar a estrutura. Mover muda duas faixas de
uma vez (onde entra, e o que fecha atrás), numa transação só, sob o lock da loja. A faixa que fica
vazia é apagada, porque uma faixa nunca existe vazia. A barra de aviso não se move, e nada entra na
faixa dela (`COMPONENT_NOT_MOVABLE`).

### 4. "Pôr ao lado" só para um bloco sozinho na faixa

É o caso dos banners empilhados, cada um na sua faixa. Mover um bloco de uma faixa com outros fica
para o arrastar entre faixas, que continua fora.

## Fora de escopo

- Arrastar blocos entre faixas.
- Reequilibrar as larguras ao tirar um bloco de uma linha.
- Entre 640 e 1024 px, a loja desenha um terço como metade (três banners viram dois e um), como antes.
