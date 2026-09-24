# BEELINK-65 — O preview alterna entre celular e computador, e começa no celular

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C2 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: UI + web · novo · P · ordem 13/17.

## O pedido

> Botão de dispositivo no topo do preview, com largura de celular real, começando em celular.
>
> - O preview em celular mostra os blocos colapsados em uma coluna.
> - A escolha sobrevive a trocar de faixa, mas não precisa sobreviver ao reload.
> - Foco visível e rótulo acessível no controle.

## Definição de Pronto

1. Um controle no topo do preview alterna entre celular (390px) e computador (1440px). Ele abre em
   celular.
2. Em celular, o preview desenha o que um celular recebe: os blocos de uma faixa empilhados em uma
   coluna, o cabeçalho, o rodapé e as grades do jeito do celular.
3. A loja de verdade continua igual em toda largura.
4. A escolha sobrevive a abrir e fechar a folha de uma faixa ou de um bloco. Recarregar a página
   volta para celular.
5. O controle tem rótulo acessível, foco visível e marca a opção escolhida.
6. `pnpm ci-check` verde.

## O que já existe e pesa na decisão

`DesignPreview` explica por que só mostrava o computador. Os blocos da loja respondem à janela
(`sm:`, `md:`, `lg:`), e não ao espaço que ocupam. Uma superfície de 390px numa janela de 1574px
ainda casa `sm:`, e a faixa de pagamento desenhava quatro colunas onde o celular desenha duas. Pintar
menor não resolve; só um viewport separado resolveria.

## Decisões

### 1. A loja responde ao próprio contêiner, e não à janela

A raiz da janela da loja passa a ser um contêiner nomeado (`@container/shop`), e os blocos da vitrine
trocam `sm:`/`md:`/`lg:`/`xl:` por `shop-sm:`/`shop-md:`/`shop-lg:`/`shop-xl:`. São variantes
declaradas no CSS do design system com os mesmos limites de antes (640, 768, 1024 e 1280px), só que
medidos no contêiner. Na loja o contêiner ocupa a janela, então os limites caem nos mesmos lugares.
No preview o contêiner é a superfície, então 390px é um celular de verdade.

Um iframe também resolveria, mas levaria o preview inteiro para outro documento: estilos copiados,
arrastar entre documentos, e eventos atravessando o limite. O contêiner é uma troca de nome de
variante, e deixa a loja coerente com as grades que já respondem à célula (A4, B3, B4).

A contenção de layout de um contêiner muda a referência de elementos `fixed` dentro dele. A loja não
tem nenhum. O cabeçalho é `sticky`, e continua funcionando.

### 2. As stories da vitrine rodam dentro do mesmo contêiner

Sem contêiner, as variantes `shop-*` nunca casam e toda story desenharia o celular. O preview do
Storybook embrulha as stories de `Blocos/Vitrine` num contêiner `shop` da largura do canvas.

### 3. O controle mora no preview, e o estado na tela de design

`PreviewDeviceToggle` é um bloco do `ui`, com dois botões (celular e computador) num grupo de seleção
única. A escolha é estado da tela, que não é remontada ao abrir uma folha, e não vai para o endereço
nem para o armazenamento do navegador: recarregar começa no celular, como o pedido diz.

## Fora de escopo

- Tablet.
- Girar o celular.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou quatro pontos, todos corrigidos, e o primeiro muda a decisão 1:

- **Na loja, com barra de rolagem clássica (Windows, Linux), os limites viraram 15px depois.** Uma
  media query mede a janela com a barra; o contêiner mede sem ela. Em 645px a loja caía para o
  layout de celular, onde antes era tablet. **A decisão 1 passa a ser:** as variantes `shop-*` são a
  media query de sempre fora do preview, e a container query só dentro dele (`data-shop-preview`).
  O contêiner `shop` sai da raiz da janela da loja e vai para a superfície do preview. Medido com
  barra clássica: 645px → respiro de 24px, 1030px → 40px, como antes do ticket. O preview de
  celular continua empilhando as metades.
- **No preview de celular, a alça de arrastar a faixa ficava embaixo da capa de edição do bloco.**
  Com margem de 16px no celular, a capa cobria a alça e o arraste pelo mouse não pegava. A alça
  sobe acima da capa (`z-20`); medido: as dez alças do preview ficam por cima.
- **A borda do celular comia 2px da largura.** A moldura passa a ficar fora dos 390px
  (`box-content`).
- **O decorator do Storybook (decisão 2) colapsava stories centralizadas, e as stories do arnês de
  design ficavam sem contêiner.** Com a decisão 1 nova, as stories da vitrine voltam a responder à
  janela do Storybook sem decorator nenhum, e o arnês ganha o contêiner da superfície do preview.
  A decisão 2 deixa de existir.

Um ponto de teste ausente foi refutado como defeito, mas atendido: um teste lê o CSS e confirma as
duas formas de cada variante, e outro confirma a superfície marcada.
