# BEELINK-128 — Layouts por tipo de seção

*Escrito em 2026-09-26, ao começar o ticket. Épico I (BEELINK-123).*

## O que muda

A mesma seção com outra cara, sem digitar de novo. Cada tipo tem os seus layouts; trocar muda só a
aparência, e o conteúdo (título, subtítulo, imagem, link, itens) continua no bloco, pronto para voltar.

## Dois PRs, empilhados

1. **API, contratos e vitrine.** Os layouts novos, validados por tipo, e desenhados pela loja. A aba
   Layout já os oferece com os botões de hoje.
2. **"Trocar layout" com miniaturas.** Um popover com as miniaturas na barra flutuante e na aba Layout.
   A barra de aviso ganha a aba Layout só com o layout.

## Definição de Pronto

1. Layouts por tipo:
   - Banner: imagem ao fundo, dividida, carrossel (e a grade de hoje).
   - Produtos: grade e trilho.
   - Categorias: cartões com foto (grade ou trilho) e chips.
   - Vantagens: em linha e cartões.
   - Barra de aviso: fixa e rolando.
2. A API valida o layout do bloco pelo tipo dele.
3. A vitrine desenha cada layout (`packages/ui`, com story e teste).
4. "Trocar layout" na barra flutuante e na aba Layout, com miniaturas (PR 2).
5. **Aceite:** ir de Imagem ao fundo para Dividida, depois Carrossel, e voltar mantém título, subtítulo,
   imagem e link.

## Decisões

- **A coluna de hoje, com valores novos.** O `display` já era "a aparência do bloco", já era validado
  por tipo (`DISPLAYS_OF_KIND`) e já ficava no rascunho até o Publicar. Uma coluna nova duplicaria o
  mesmo significado. A migração só acrescenta valores ao enum.
- **Nada é apagado ao trocar.** Os campos ficam no bloco. Um layout que não usa um campo não o desenha,
  e ele volta quando outro layout o desenha. Um banner "Dividida" mostra a primeira imagem; as outras
  continuam guardadas para o carrossel.
- **Sem valor, cada tipo mantém a cara de sempre.** Vantagens e barra de aviso gravadas antes não têm
  layout e são desenhadas como antes:
  - vantagens: em linha;
  - barra de aviso: parada onde cabe e rolando no celular.
  "Fixa" nunca rola e "Rolando" rola em qualquer largura.
