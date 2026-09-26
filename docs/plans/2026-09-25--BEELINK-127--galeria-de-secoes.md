# BEELINK-127 — A galeria de seções nova

*Escrito em 2026-09-25, ao começar o ticket. Épico I (BEELINK-123), tela 9b do canvas.*

## O que muda

O lojista escolhe a seção vendo como ela fica na loja dele. A gaveta de hoje (quatro grupos e
desenhos de arame) vira um diálogo largo:
- à esquerda, as categorias e a busca;
- à direita, uma grade de prévias com "Adicionar";
- no alto, uma linha que diz onde a seção entra.

## Dois PRs, empilhados

1. **Registro de tipos e o diálogo.** O registro único em `packages/ui` substitui `BLOCK_GROUPS`,
   `GROUP_OF_KIND` e `DISPLAYS_OF_KIND`. O diálogo traz as categorias, a busca, a linha "Entra entre
   … e …" e, ao adicionar, a prévia rola até a seção. As prévias ainda são os desenhos de hoje.
2. **Prévias de verdade.** Cada cartão desenha o componente real, em escala, com as cores, a logo e
   os produtos da loja. Só a categoria aberta é desenhada.

## Definição de Pronto

1. Diálogo largo no lugar da gaveta, com as categorias à esquerda: Recomendadas, Capa, Produtos e
   venda, Confiança, Conteúdo, Conversão, Topo e rodapé. Tem busca e uma grade de cartões com
   "Adicionar".
2. Um registro único de tipos em `packages/ui` (categoria, se é recomendado, layouts, se oferece
   fileira; nome e descrição vêm dos textos por tipo). A galeria, a aba Layout e a barra leem dele.
3. O diálogo diz onde a seção entra: "Entra entre Capa e Produtos", "no começo", "no fim", "ao
   lado de …".
4. Ao adicionar, a seção entra escolhida, o painel abre em Conteúdo e a prévia rola até ela.
5. A regra continua: o site não tem Produtos nem Categorias, a loja não tem Contato, e a barra de
   aviso só uma vez.
6. PR 2: cada prévia é o componente real em escala, com as cores, a logo e os produtos da loja, e só
   a categoria aberta é desenhada.

## Decisões

- **Recomendadas não é uma categoria de verdade.** É um filtro do registro: os tipos marcados como
  recomendados, que continuam na categoria deles também.
- **Nome e descrição continuam nos textos** (`design.kinds`, `design.gallery.hints`), por idioma. O
  registro guarda o que não depende de idioma.
- **Em tela estreita**, as categorias ficam numa fileira em cima (abas horizontais). No computador,
  ficam numa coluna (abas verticais).
- **Com busca**, a grade mostra o que casa em todas as categorias.

## Fora de escopo

- Os tipos novos (I7): o registro nasce pronto para recebê-los.
- Layouts por tipo que mantêm o conteúdo (I4).

## Depois da revisão

*Acrescentado em 2026-09-26.*

- **PR 1:**
  - a prévia do cartão é `inert`, então um formulário nela não vira parada de Tab;
  - a frase de onde a seção entra chama a faixa pela posição quando a seção entra dentro dela, e chama uma vitrine sem título pela categoria;
  - o diálogo guarda o último "+" enquanto some;
  - apertar a categoria já escolhida sai da busca;
  - as colunas da grade seguem a largura da área, não a da janela.
- **PR 2:**
  - o cartão sem prévia volta ao desenho de arame;
  - a prévia do formulário tem os campos com que ele nasce;
  - as prévias têm o layout e a largura com que a seção entra;
  - as prévias usam a fonte da loja.
