# BEELINK-125 — Modo design em tela cheia: sai o menu do admin, entram três colunas

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I1 do Épico I (modo design). É a tela 9a do canvas ("Editor-secoes"). Empilhado sobre o I0
> (BEELINK-124).

## Definição de Pronto

1. `/admin/<loja>/design` sai do AppShell: sem a barra lateral e sem o cabeçalho do painel. Grupo de
   rotas próprio, `(editor)`, como o `(pick)`. Continua exigindo sessão, como o resto do painel.
2. Barra de cima, escura como o cabeçalho do painel: "← Painel" (volta a `/admin/<loja>`), o nome da
   loja e a página ("Página inicial"), Celular | Computador, o status ("Rascunho · N alterações" ou
   "Publicado"), "Ver na loja" (numa aba nova), "Descartar" (quando há o que descartar) e "Publicar".
3. Três colunas a partir de telas largas: Estrutura à esquerda (a lista de faixas e blocos, com as
   abas Seções | Tema — as cores vão para Tema), Prévia no centro e Painel à direita (os campos do
   bloco selecionado; nenhum selecionado, uma frase dizendo como escolher).
4. Em telas estreitas, a Estrutura e o Painel abrem como gavetas sobre a prévia, pelos botões
   "Estrutura" e "Editar" da barra; escolher um bloco abre o Painel.
5. Sair com alterações não publicadas pede confirmação: "← Painel" abre um diálogo, e fechar ou
   recarregar a aba cai no aviso do navegador.
6. Nada do que se faz hoje se perde: adicionar, mover, ocultar, excluir, editar, cores, publicar e
   descartar — os testes de hoje continuam passando, e o fluxo é repetido no navegador.
7. Só web e `packages/ui`: nenhuma mudança de API.

## Decisões

### 1. A moldura é um bloco do design system

`DesignEditorFrame` (as três colunas e as gavetas) e `DesignEditorBar` (a barra) ficam em
`packages/ui/src/blocks/design`, com histórias — a regra 8 da web: a web compõe, o `packages/ui` desenha.
A tela (`design-screen.tsx`) só liga os dados às regiões.

### 2. "N alterações" conta o que o Publicar escreveria

`changeCountOf` soma o que `changesOf` já calcula: a ordem das faixas (uma), cada faixa ocultada ou
mostrada, cada faixa com os blocos reordenados e cada bloco com largura ou visibilidade trocada. É o
mesmo diff que habilita o Publicar, então o número e o botão nunca discordam.

### 3. O dono continua sendo conferido pela API

Como no resto do painel: o servidor da web desenha a loja pública, e as leituras do lojista passam
pela BFF, onde a API recusa quem não é dono. O editor não ganha uma segunda regra.

### 4. O aparelho da prévia sobe para a barra

O estado Celular | Computador sai de dentro da prévia e fica na tela, que o passa à barra e à prévia.
Continua começando no celular.

### 5. A coluna Estrutura tem 360 px, não os 280 da 9a

As linhas de hoje carregam o controle de largura e três ações, e foram medidas para um painel de
380 px. Com 280, o nome do bloco sumia. A 9a desenha linhas compactas (ícone, nome e layout), que
vêm com o I2, quando a largura passa para a aba Layout; aí a coluna pode voltar aos 280.

## Fora de escopo

- As abas Conteúdo | Layout | Estilo e a barra flutuante da seção (I2), a galeria nova (I3), a aba
  Páginas e o seletor de página (I5), desfazer/refazer e "Rascunho salvo" no servidor (I6).

## Adendo — 25/09, revisão

A revisão em três lentes confirmou 15 pontos distintos, todos corrigidos neste PR:

- **Celular:** a barra transbordava e empurrava o Publicar para fora da tela. Agora, abaixo de 640 px,
  ela é uma linha só, sem o seletor Celular | Computador (num telefone a prévia já é a do celular),
  com as palavras reduzidas a ícones e Descartar como ícone; de 768 px para cima é a grade da 9a,
  com o seletor no centro. Os controles têm 36 px, como na 9a.
- **Gavetas:** as larguras não pegavam (o primitivo usa `data-[side]`); o formulário do bloco se
  perdia ao fechar a gaveta com Esc — agora ela fica montada fechada (`keepMounted`, novo no
  `SheetContent`); um só botão de fechar, em português (`closeLabel`); abrir um bloco numa tela
  larga não deixa gaveta aberta para saltar depois.
- **Primeira pintura no celular:** as colunas laterais também são escondidas por CSS abaixo de `lg`,
  então o servidor não mostra três colunas num telefone antes da hidratação.
- **Status e título:** o status existe em toda largura (o ponto; as palavras para leitor de tela
  abaixo de 1024 px), e o `h1` voltou ("Modo design: loja / página"). O ponto de rascunho é âmbar,
  um token novo (`header-pending`), como na 9a.
- **Sair:** o clique com Ctrl/⌘ em "← Painel" abre outra aba sem perguntar; o Voltar do navegador
  pergunta, por um passo empurrado no histórico no mesmo endereço (o roteador do Next adota o
  `pushState` nativo); e um só `beforeunload`, pelo mesmo critério do status (`changed`). A guarda
  ganhou testes.
