# BEELINK-69 — Todo estado vazio do modo design fala com o dono e oferece o conserto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C6 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: UI + web · ajuste · P · ordem 15/17.

## O pedido

> No modo design, cada estado vazio explica a causa em uma frase e leva à correção. Fora do modo
> design a frase do cliente continua.
>
> - Com 4 categorias sem produto, o editor diz que categoria vazia não aparece na loja e leva a
>   vincular produtos.
> - A vitrine pública continua mostrando a mensagem do cliente.
> - Toda mensagem nova existe em pt-BR e en.

## Os estados vazios do modo design hoje

| Onde | O que aparece | Para quem |
|---|---|---|
| Bloco de categorias sem nenhuma categoria à mostra | "Esta loja ainda não separou o que vende em categorias" | o cliente |
| Vitrine sem produto na prateleira | marcador "Cadastrar produtos", e nada na folha | o dono, sem causa e sem caminho |
| Bloco sem conteúdo (banner sem imagem, título sem texto…) | marcador com a ação ("Adicionar a imagem") | o dono; clicar abre a folha, que é o conserto |
| Painel sem faixas | "Nada para arrumar ainda." com o botão de adicionar | o dono |

Os dois primeiros são o que o pedido aponta.

## Definição de Pronto

1. No preview, um bloco de categorias sem nenhuma à mostra é o marcador do modo design, com uma frase
   para o dono, e não a frase do cliente. O painel o marca como vazio.
2. A folha desse bloco diz a causa e leva ao conserto:
   - com categorias que ainda não têm produto: "N categorias sem produto não aparecem na loja", e um
     link para os produtos, onde se vincula produto a categoria;
   - sem nenhuma categoria: um link para criar categorias.
3. A folha de uma vitrine diz a causa quando ela sai vazia:
   - loja sem produto: um link para cadastrar o primeiro;
   - produtos existem, mas a fonte não traz nenhum: a frase diz que é a fonte, e o conserto é a
     própria folha.
4. A vitrine pública continua com a frase do cliente.
5. Toda frase nova existe em pt-BR e en.
6. `pnpm ci-check` verde.

## Decisões

### 1. A causa é dita na folha, porque o preview não navega

O preview é inerte de propósito: nenhum link dele leva a lugar nenhum. Um link de conserto dentro
dele seria o único que funciona, e confuso. O marcador do preview diz o que falta, e a folha do
bloco, que o clique no marcador abre, diz por quê e tem o link.

### 2. O link abre em outra aba

O arranjo do modo design é um rascunho até publicar, e sair da página pelo link perderia o que não
foi publicado. Em outra aba, o dono vincula os produtos e volta para o rascunho como deixou.

### 3. A causa é uma função, e a folha só a desenha

`emptyStateOf` decide, com as contagens que a tela já tem (categorias à mostra, categorias da loja,
produtos da loja, prateleira da vitrine), qual estado vale. O aviso é um bloco do `ui`
(`EmptyStateNotice`), com story e teste.

## Fora de escopo

- Os marcadores de bloco sem conteúdo, que já falam com o dono e abrem a folha.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou três pontos, todos corrigidos:

- **A folha misturava contagens ao vivo com o retrato do servidor.** As listas do painel (categorias,
  produtos) se atualizam quando a aba volta a ter foco; o que a loja mostra (categorias à mostra,
  prateleira da vitrine) vinha da página e só se relia ao recarregar. Voltando da aba do conserto, o
  aviso trocava de causa e mentia: "escolha outra fonte" para uma fonte que agora tinha produto. A
  tela passa a reler a loja quando a aba volta a ficar visível, sem recarregar e sem perder o
  rascunho, numa transição que não desenha nenhuma vitrine como carregando.
- **"A loja não tem produtos" contava rascunhos e esgotados.** Uma loja com tudo em rascunho ouvia
  "escolha outra fonte", e toda fonte é igualmente vazia. Os produtos passam a ser contados na
  prateleira (publicados e com estoque), e esse caso tem aviso próprio: "Nenhum produto está à
  venda", com o link para os produtos. Numa loja com mais produtos do que a página que o painel
  carrega, quando essa página não tem nenhum à venda, o aviso não arrisca uma causa.
- **A causa das categorias contava só as ativas.** Categorias todas ocultas e categorias cujos
  produtos estão todos em rascunho recebiam "vincule produtos", que não resolve. As duas têm aviso
  próprio: "Suas categorias estão ocultas" (link para as categorias) e "Os produtos das suas
  categorias ainda estão em rascunho" (link para os produtos).

Um ponto de teste (a vitrine enquanto os produtos carregam) foi refutado como defeito e coberto
mesmo assim.
