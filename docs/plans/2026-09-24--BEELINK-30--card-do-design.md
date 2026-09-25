# BEELINK-30 — O card do produto como o design desenha, em todo lugar

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B5 do épico BEELINK-25 (listagem), com o escopo reduzido pela revisão de 24/09: a estrutura do
> card, o nome e o preço dividido. A nota, a linha de variações e o botão são o B17 (BEELINK-98);
> as fotos que passam, o B10 (BEELINK-86). Empilhado sobre o B9 (BEELINK-85).

## O pedido

Copiar o card de 5a e usar o mesmo card em todo lugar que mostra produto: a home (grade e
trilho), /produtos, categorias, busca e a prévia do modo design. Hoje o card é um link único sem
borda, com a foto recuada 8px, zoom no hover e uma dica de nome que o design não tem.

## Definição de Pronto

1. A 1440, lado a lado com 5a, o card bate: borda de 1px, raio 12px, foto rente ao topo na
   proporção 259:230, corpo de 14px, nome em 15px com duas linhas, preço dividido do B9 e o selo
   no canto da foto.
2. A home mostra o mesmo card, na grade e no trilho.
3. O esqueleto do card tem a forma nova.
4. Story e teste do card, com axe. `pnpm ci-check` verde.

## Decisões

### 1. Um `<article>` com um link só, esticado

O card deixa de ser um `<Link>` inteiro. O nome é o link, e um `::after` absoluto o estica sobre o
card, então o card continua clicável e há um link por produto. Uma foto que fosse um segundo link
para o mesmo lugar seria o mesmo produto lido duas vezes. O que o card ganhar depois (o link da
nota, o botão) fica acima do link esticado.

### 2. Sem zoom e sem dica de nome

O zoom no hover brigaria com as fotos que passam (B10). A dica que completava o nome cortado não
está no design: o DOM guarda o nome inteiro, e o leitor de tela o ouve inteiro.

### 3. Os espaços seguem o design

Grade da listagem, grade e trilho da home passam de 12px para 16px entre os cards. O trilho ganha
cards um pouco mais largos no celular (192px) para o preço de 28px caber com o preço antigo.

## Fora de escopo

- Nota, variações e botão "Comprar" (B17). Fotos que passam (B10). A variante compacta dos
  relacionados (D8). O selo "Mais vendido" (sem dado).
