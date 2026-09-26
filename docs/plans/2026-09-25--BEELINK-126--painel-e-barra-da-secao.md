# BEELINK-126 — O painel em abas e a barra da seção

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I2 do Épico I (modo design). É a coluna da direita da tela 9a do canvas ("Editor-secoes") e a barra
> que flutua sobre a seção escolhida na prévia. Empilhado sobre o I11 (BEELINK-135), a ponta da pilha
> do modo design (124 → 125 → 136 → 137 → 132 → 133 → 134 → 135).

## Quatro PRs, empilhados

| PR | Branch | O que entrega | Workspaces |
|---|---|---|---|
| 1 | `feat/BEELINK-126-painel-em-abas` | O bloco escolhido abre em **Conteúdo, Layout e Estilo**; a folha da faixa vira a aba Estilo. | ui, web |
| 2 | `feat/BEELINK-126-barra-da-secao` | Uma **barra flutuante** sobre a seleção na prévia (Subir, Descer, Trocar layout, Ocultar, Excluir), e ↑↓, Alt+↑↓ e Delete. | ui, web |
| 3 | `feat/BEELINK-126-duplicar` | **Duplicar** uma faixa e um bloco: API, barra e Cmd/Ctrl+D. | api, web, ui |
| 4 | `feat/BEELINK-126-aparece-em` | **"Aparece em: computador · celular"** em faixas e blocos; a loja esconde pelo tamanho da tela. | contracts, api, web, ui |

Cada PR acrescenta aqui a sua seção. Este é o PR 1.

Decididas pelo dono antes de começar, e não reabertas aqui:

- **Sem espaçamento por faixa no Estilo.** Contradiria o I9 (BEELINK-133, "os espaçamentos têm que ser
  padrão"; uma regra só, em `band-rhythm.ts`). Estilo é nome, cor de fundo e ponta a ponta / dentro da
  margem.
- Uma faixa duplicada (PR 3) nasce sem nome: um nome põe a faixa no menu do site.

## PR 1 — o painel em Conteúdo | Layout | Estilo

### Definição de Pronto

1. Escolher um bloco mostra três abas. **Conteúdo**: textos, imagens, links, o link da barra de aviso e
   a fonte da vitrine, os escolhidos e o limite. **Layout**: a largura do bloco, o formato (carrossel,
   grade ou trilho, conforme o tipo), as colunas quando é grade e o alinhamento no título e no
   parágrafo. **Estilo**: o nome da faixa, a cor de fundo e ponta a ponta / dentro da margem.
2. A faixa da barra de aviso mostra no Estilo só a cor, sem largura (a regra fica no bloco do
   `packages/ui`).
3. Clicar no cabeçalho de uma faixa com vários blocos, ou no botão de paleta do cartão de um bloco
   sozinho, escolhe a faixa e abre o Estilo. A folha `BandEditor` deixa de existir.
4. O que muda no Layout aparece na prévia na hora, entra em "Rascunho · N alterações", vai com o
   Publicar e volta com o Descartar. A aba diz isso ("Muda na prévia agora; vai para a loja quando você
   publicar") e não tem Salvar próprio.
5. Um Salvar só grava o bloco (`PATCH`) e depois a faixa (`PUT`), o segundo só se o Estilo mudou.
   Cancelar desfaz os dois. A cor e a largura da faixa aparecem na prévia antes do Salvar.
6. As linhas da estrutura perdem o controle de largura: mostram o ícone, o nome e "tipo · largura", e
   continuam com os botões do I10 ("Adicionar ao lado", "Pôr ao lado de…").
7. Uma imagem a caminho sobrevive a uma troca de aba: o painel de Conteúdo fica montado.
8. Os testes de hoje continuam passando, mudados de lugar onde o código mudou.

### Decisões

#### 1. Uma seleção só, e o bloco sozinho age como a faixa dele

Saem `editingComponent` e `editingBand`; entra `DesignSelection` (`design-selection.ts`), uma faixa ou
um bloco. `targetOf` diz o que a seleção edita: um bloco sozinho na faixa age como a faixa (como o
cartão de um bloco só (BEELINK-64) já faz — a alça move a faixa, o olho esconde a faixa, a lixeira apaga a faixa), então
escolher o bloco ou a paleta do cartão abre o mesmo painel, com as três abas. Uma faixa com vários
blocos, escolhida pelo cabeçalho, abre só o Estilo, que diz "vale para os N blocos desta faixa".

A aba fica num `useState` da tela, não no endereço: a guarda de saída empurra um passo no histórico no
mesmo endereço (I1), e uma aba na URL brigaria com ele. Escolher um bloco abre Conteúdo; escolher a
faixa abre Estilo.

#### 2. O Layout vai para o rascunho; Conteúdo e Estilo continuam gravando no Salvar

| O que muda | Quando chega à loja |
|---|---|
| Conteúdo: textos, imagens, links, a fonte da vitrine | Salvar → `PATCH /components/:id` na hora (como hoje) |
| Layout: largura, formato (`display`), `columns`, `align` | **Rascunho, até o Publicar.** A largura já era; formato, colunas e alinhamento entram no rascunho, e o Salvar deixa de mandá-los |
| Estilo: nome, cor e largura da faixa | Salvar → `PUT /sections/:id` na hora (o que a folha da faixa fazia) |

Sem isso, uma aba teria uma largura esperando o Publicar ao lado de um formato que vai ao ar no Salvar.
E com um escritor só o problema da cópia velha (`design-draft.ts`) não acontece: o Salvar do Conteúdo
não escreve mais esses três campos.

O rascunho compara o que a loja desenha, não o valor cru: um título salvo sem alinhamento é centrado,
então escolher "esquerda" e voltar para "centro" não é alteração, como uma faixa movida e devolvida
não é. O Publicar manda o formato só quando há um (um banner antigo guarda nulo, e a API recusa
formato nulo num banner).

#### 3. A faixa é gravada só no que mudou aqui

O Salvar manda à faixa só os campos que o Estilo mudou, e a prévia pinta só esses. É a regra da barra
de aviso do I11 (a cor dela era a da faixa) generalizada: o que a prévia desenha é o que o Salvar
escreveria, e um valor salvo por outra aba enquanto este painel estava aberto não é escrito por cima.

#### 4. O estado em edição continua no store do I11, agora com a faixa

`useDesignEdit` guarda a faixa (`band`, e como ela abriu, `bandOpened`) e o bloco, quando há um. As
garantias do I11 ficam: uma mudança só vale para a faixa ou o bloco abertos; abrir de novo o mesmo
alvo mantém o que foi digitado; sair do editor limpa tudo.

#### 5. A barra de aviso não tem Layout

Ela é desenhada acima do topo, fora da grade, sem largura, formato ou alinhamento: a aba Layout não
aparece para ela. O Estilo dela é só a cor, com as palavras da barra ("Cor da barra").

#### 6. Linhas compactas na estrutura

A largura sai da linha e vai para a aba Layout. A linha diz "tipo · largura" ("Banner · Metade"), o
que ainda deixa ver de relance a arrumação de uma faixa; os botões "Adicionar ao lado" e "Pôr ao lado
de…" do I10 ficam, porque são o jeito de pôr blocos lado a lado sem saber o que é uma faixa.

### Fora de escopo

- A barra flutuante, o teclado e escolher uma faixa pela prévia (PR 2); Duplicar (PR 3); "Aparece em"
  (PR 4).
- Espaçamento por faixa (decisão do dono, acima).
- Perguntar antes de trocar de bloco ou de sair com campos não salvos (já fora no I11).
- A coluna Estrutura voltar aos 280 px da 9a: as linhas encolheram, mas os botões do I10 ainda pedem
  a largura de hoje.

## PR 2 — a barra flutuante e o teclado

*Acrescentado em 2026-09-25, ao começar o PR 2.*

### Definição de Pronto

1. O que está escolhido na prévia tem uma barra por cima: Subir, Descer, Trocar layout (um menu com
   os formatos do tipo; some nos tipos que não têm), Ocultar e Excluir.
2. Cada ação segue a regra do alvo do PR 1: o bloco sozinho age como a faixa dele; Trocar layout é
   sempre do bloco. Subir e Descer ficam desligados nas pontas. Excluir some na última vitrine da loja.
3. Subir, Descer, Ocultar e Trocar layout mexem no rascunho; Trocar layout também abre a aba Layout.
   Excluir abre a confirmação de sempre.
4. ↑↓ andam pela estrutura (toda faixa e todo bloco, os ocultos também; a faixa de um bloco só é uma
   parada). Alt+↑↓ movem. Delete e Backspace perguntam antes de excluir; Cancelar devolve o foco.
5. Nada reage a tecla digitada num campo.

### Decisões

#### 1. As teclas só valem onde o foco está numa parada

Uma parada é o que tem `data-design-node`: o nome na estrutura, o bloco na prévia, a barra e o título
do painel. Um `onKeyDown` só, na moldura do editor, olha de onde a tecla veio; num campo, numa alça
de arrastar (o teclado do dnd-kit continua) ou num menu aberto, ele não faz nada.

#### 2. ↑↓ não troca de escolha com campos não salvos

Trocar de bloco com o painel aberto joga fora o que foi digitado. Pelo clique isso já era assim (fora
de escopo no I11); por uma seta, é uma tecla de distância. Então a seta não troca e diz por quê na
região de status ("Salve ou cancele o que mudou em … antes de escolher outro.").

#### 3. O foco fica com as teclas

Escolher pelas setas não abre a gaveta numa tela estreita nem puxa o foco para o título do painel: o
foco vai para a nova parada na mesma região (estrutura, prévia ou painel). Na prévia, desenhada com
`transform: scale()`, o foco usa `preventScroll` e a rolagem é feita pela diferença entre os
retângulos, nunca com `scrollIntoView`.

#### 4. Um bloco sobe e desce dentro da faixa dele

Para outra faixa é o arrastar da estrutura, que grava na hora. A barra e Alt+↑↓ são um passo do
rascunho, que o Publicar manda.

#### 5. A barra da faixa escolhida sozinha

Uma faixa de vários blocos escolhida pelo cabeçalho ganha um contorno e a barra no canto dela, sem
Trocar layout.

### Fora de escopo

- Escolher o próximo depois de excluir: a confirmação não diz se excluiu ou cancelou, e escolher no
  cancelar tiraria o foco de onde ele estava.
- Dicas (tooltip) com o atalho: o `title` e o `aria-keyshortcuts` dizem; um Tooltip por botão fica
  para quando a barra tiver Duplicar (PR 3).
- O primitivo de Toolbar do Base UI: o foco com ← → foi escrito na barra, que é a única que precisa.

## PR 3 — Duplicar

*Acrescentado em 2026-09-25, ao começar o PR 3.*

### Definição de Pronto

1. Duplicar, na barra e com Ctrl/⌘+D, cria uma cópia logo depois do original.
2. A cópia é criada **oculta** no servidor e aparece no rascunho como o original está. Ela conta em
   "N alterações" e vai para a loja no Publicar.
3. A barra de aviso não se duplica: o botão some e a API responde 409 `COMPONENT_KIND_SINGLETON`.
4. A escolha passa para a cópia.
5. Testes de unidade e e2e.

### Decisões

#### 1. A cópia é o que o dono vê

A API copia o que está gravado. O rascunho, então, põe na cópia o que o original tem no rascunho:
visibilidade, ordem e layout dos blocos. Duplicar um banner que foi para "Um terço" sem publicar
duplica o banner em um terço.

#### 2. Oculta no servidor, mostrada no rascunho

Assim a loja não muda antes do Publicar, como tudo o que o dono arruma. A cópia chega pela resposta
da API. `withBandCopy`/`withBlockCopy` dão o mesmo resultado se o rascunho já foi recarregado com a
cópia ou ainda não.

#### 3. A faixa copiada não tem nome

O menu de um site é feito das faixas com nome; duas com o mesmo nome seriam um link duas vezes.

#### 4. O serviço da página foi dividido

As faixas ficam em `PageService`, os blocos vão para `PageComponentsService`, e a leitura da página
virou `pageOf()`. O arquivo tinha 338 linhas antes das cópias.

### Fora de escopo

- **Descartar não apaga a cópia.** Ela já foi criada, oculta, e continua na estrutura como um bloco
  oculto; sai pela lixeira. Apagar no Descartar pediria lembrar quais cópias o rascunho criou.
- Copiar as mensagens recebidas por um formulário: a cópia começa sem nenhuma.

## PR 1 — depois da revisão

*Acrescentado em 2026-09-25, com as correções da revisão em três frentes.*

- O que foi digitado segue cada metade pela identidade dela. O bloco continua o mesmo quando muda de
  faixa ("Pôr ao lado de…"), e o estilo da faixa continua o mesmo quando ela ganha ou perde um bloco.
- O Salvar espera cada gravação (`mutateAsync`), em vez de encadear pelos callbacks, que param se o
  painel fecha no meio. Ele grava o bloco só se o Conteúdo mudou, e fecha só se o painel aberto ainda
  é o dele.
- Um rascunho limpo acompanha qualquer resposta do servidor, layout incluído.
- **Fica em aberto:** com o rascunho sujo, uma publicação de outra aba num bloco que não foi mexido
  aqui ainda pode ser desfeita no Publicar. Resolver isso pede uma fusão em três vias com a base do
  rascunho.

## PR 2 — depois da revisão

*Acrescentado em 2026-09-25.*

- Subir e Descer na barra devolvem o foco à barra (o mesmo botão, se ainda estiver ligado): o React
  reinsere o bloco que desceu, e o botão focado ia junto.
- A região de status tem `aria-live` explícito. A gaveta modal esconde tudo fora dela, menos o que
  tem esse atributo.
- As regiões do editor são marcadas pela moldura (`data-design-region`). A prévia desenha a loja com
  um `<main>` próprio, que era achado no lugar da área que rola.
- ↑↓ passa por paradas que a tela não desenha (um bloco oculto, a barra de aviso) em vez de parar
  nelas. Ocultar leva o foco à parada mais próxima que ainda aparece.
- Um painel escolhido pelas setas devolve o foco à própria parada ao fechar.
- Excluir a faixa de um bloco só pergunta pelo nome da faixa, como a lixeira da estrutura.

## PR 3 — depois da revisão

*Acrescentado em 2026-09-25.*

- Duplicar recusa com campos não salvos no painel aberto, como as setas: a cópia sai do que está
  gravado e vira a escolha, então o que foi digitado se perderia.
- Uma cópia por vez: um segundo clique no mesmo instante ou o Ctrl+D segurado não fazem outra.
- A recusa aparece também embaixo da barra, não só na região de status.
- A cópia da faixa só casa os blocos um a um quando as listas batem. Se não batem, ela aparece como o
  servidor a fez. A API desempata a ordem dos blocos pelo id.
