# BEELINK-10 — Modo design: a loja à esquerda, o editor à direita

> **Tier:** plans — verdadeiro num momento, para um ticket. Append-only.

## O pedido, e como ele encolheu

> "eu como dono da loja quero entrar no site da loja no modo design (…) o site a esquerda como
> preview e a direita o componente onde posso (…) arrastar os banners"
>
> "aqui eu monto e na edicao de layout eu organizo se aparece ou nao e onde"

A segunda frase é a que define esta tarefa. Os banners já existem e **guardam o próprio tamanho,
a própria posição e se aparecem** — foi decisão tomada na BEELINK-9 justamente para que esta
tarefa não precisasse de um documento de seções antes de mostrar qualquer coisa.

Então isto **não** é o "documento de seções" que os planos antigos descreviam. É arrumar o que já
existe, e não há contrato novo, endpoint novo nem migração.

## Definição de Pronto

1. O dono abre o modo design e vê **a loja de verdade** à esquerda, com os componentes da vitrine.
2. À direita, a lista dos banners que ele criou — os ocultos inclusive.
3. **Arrastar** reordena, e a ordem vale na loja depois de publicar.
4. Ligar/desligar "aparece" e trocar o tamanho ali mesmo.
5. O preview muda na hora, sem recarregar e sem salvar.
6. O preview reproduz o desktop fielmente, não uma versão espremida do painel.
7. Arrastar funciona pelo teclado.
8. Nada muda na loja até **Publicar**, e sair com alteração pendente avisa.
9. Uma porta para o modo design que não quebra o cache nem a indexação de `/<slug>`.
10. `pnpm ci-check` verde.

## Decisões

### 1. O preview lê os dados públicos, não os do painel

A tentação é montar o preview com o que o painel já tem em mãos. **Ela mente.** `useProducts` e
`useProductCategories` são as visões do dono: trazem rascunho, esgotado, categoria oculta e
contagens que a vitrine não usa. Reproduzir a regra no cliente seria uma segunda implementação de
`ON_THE_SHELF_WHERE`, e a contagem rolada de uma categoria-mãe não dá para reproduzir de jeito
nenhum a partir de `categoryId`.

Então a página do modo design é **Server Component** e chama `shopAt` e `catalogueAt` — as mesmas
funções que a vitrine chama —, passando o resultado ao editor como props. O que aparece à esquerda
é, por construção, o que o visitante recebe. Custo: zero endpoint novo, zero regra duplicada.

### 2. A lista que se arrasta vem do dono, e precisa de todos

`Store.banners` já vem resolvido e **filtrado por `isActive`** — serve ao preview, não ao editor:
não dá para ligar de volta um banner que a resposta não traz. O editor usa `useBanners`, que traz
todos.

E não é só conveniência: `reorder` recusa lista parcial com 409. Arrastar numa lista filtrada
mandaria um subconjunto e tomaria erro.

### 3. O arranjo é rascunho no navegador até o Publicar

Decisão do dono. Ele arruma à vontade e a loja só muda no Publicar.

> **Isto parece contrariar `state-and-data.md`** — "server data never enters a store" — e não
> contraria. O que fica no cliente não é o que o servidor tem: é **o que ainda não foi mandado**.
> TanStack Query continua dona do arranjo salvo; o estado local é dono da edição não enviada, e
> nenhum refetch pode sobrescrevê-la. É a mesma fronteira que o plano do editor de tema já
> nomeava.

O preço é real e vira obrigação: **recarregar antes de publicar perde o arranjo**, então sair com
alteração pendente avisa (`beforeunload`).

Publicar manda o que mudou: a ordem inteira por `reorder` (a API exige todos os ids), e um `PUT`
por banner cujo tamanho ou visibilidade mudou.

### 4. O preview é uma superfície de largura fixa, escalada

Os blocos da vitrine dimensionam contra a **viewport**, não contra um contêiner — 33 variantes
`sm:`/`lg:` e zero `@container` em `blocks/storefront/`. Deixar a vitrine preencher um painel
estreito quebra: medido antes, a banda de 1440px colapsa para 700px e o rodapé de 322px para 137px.

A saída, também medida: `width: 1440px; transform: scale(larguraDoPainel / 1440)`. `transform` é
tempo de pintura — não muda layout —, então o preview continua verdadeiro em qualquer zoom. Trocar
1440 por 390 é o botão de celular, e sai quase de graça.

### 5. Nenhum link do preview navega

Um preview em que clicar sai da tela é um preview que atrapalha. `linkComponent` sem `href` resolve
a maior parte — âncora sem `href` não navega **e não pega foco**, então o preview não rouba tab.

Mas três coisas passam por fora dele: o botão de WhatsApp, os ícones sociais (âncoras literais com
`target="_blank"`) e o `<form method="get">` da busca. Por isso o preview inteiro vai dentro de um
`onClickCapture`/`onSubmitCapture` que barra o padrão — as duas camadas juntas são mais baratas que
bifurcar a vitrine, e cobrem clique do meio e Enter no formulário.

Duas divergências a suprimir de propósito, ou o preview mostra **mais** do que o visitante vê:
`addressLine`, que na vitrine é sempre nulo porque `PublicStore` não tem endereço (e o `Store` do
dono tem); e o `searchSlot`, que na vitrine é um componente que consulta a busca a cada tecla.

### 6. A lista arrastável mora em `packages/ui`

`@dnd-kit` é dependência de `packages/ui` e de mais ninguém. Importá-lo do `apps/web` resolveria em
silêncio pelo `node_modules` achatado — dependência fantasma, a armadilha 1 do contrato raiz. O
bloco recebe `onReorder`, `onToggle` e `onLayoutChange` como props, o que também é a regra 1 daquele
workspace.

Teclado não sai de graça: o sensor precisa de `coordinateGetter: sortableKeyboardCoordinates`, senão
o padrão empurra 25px por seta e nunca cai na próxima linha de uma lista de alturas variáveis.

### 7. A porta fica no painel, não na vitrine

`/<slug>` não tem sessão para ler: o `proxy.ts` é uma lista de permissão que não a nomeia, de
propósito, e é o único lugar que pode renovar um par de tokens. Um dono com o acesso expirado e o
refresh vivo seria indistinguível de um estranho na própria loja, e o botão sumiria sem explicação.
Pior é o conserto que alguém tentaria: pôr `/<slug>` no matcher, que devolve 302 para todo crawler
e todo cliente.

A entrada fica no menu lateral e na tela de Banners.

## Fora de escopo

- **O documento de seções e o tema global.** Os banners guardam o que precisam; um documento de
  seções é outra tarefa, com contrato e migração.
- **Rascunho que sobrevive a recarregar.** Decisão do dono: custaria colunas e uma segunda cópia
  do arranjo para manter em dia.
- **Criar e editar banner aqui.** Isso é a tela de Banners, com rota própria. Aqui se arruma.
- **Botão "Modo design" dentro da vitrine.** Ver decisão 7.

---

## Adendo, 2026-09-22 — o preview de celular saiu, e a medição que o tirou

O plano previa um interruptor computador/celular: a mesma superfície de largura fixa, trocando
1440px por 390px. Implementado, foi medido no Chrome e **não funciona** — e a razão não tem
conserto dentro desta abordagem.

Uma media query resolve contra a **janela**, e a largura da superfície não muda a janela.
`transform: scale()` roda em tempo de pintura justamente para não mexer no layout; é o que torna o
preview de desktop fiel, e é o que torna o de celular uma mentira. Medido, numa janela de 1574px
com a superfície em 390px:

```
classes:  grid-cols-2 ... sm:grid-cols-4
largura:  390.00px
janela:   1574px          sm: casa       lg: casa
colunas:  59.49px 59.51px 59.49px 59.51px     ← quatro
```

A faixa de pagamento desenhou **quatro colunas dentro de 390 pixels**. Um celular de verdade
desenha duas. O dono estaria arrumando a loja olhando para um layout que nenhum cliente recebe —
no aparelho em que quase todos eles chegam.

**O preview de computador, esse, é fiel.** A vitrine usa `sm:` (640) e `lg:` (1024) e nenhum outro
breakpoint — contados nos blocos: 25 e 8, zero `xl:`, zero `2xl:`. Então em qualquer janela de
editor a partir de 1024px a superfície de 1440px desenha exatamente o que o visitante de desktop
recebe. É por isso que a superfície continua de largura fixa em vez de preencher o painel.

Então: **um preview só, de computador.** O bloco perdeu a prop `device` e o `PREVIEW_WIDTHS` virou
`PREVIEW_WIDTH`. As chaves `desktop` e `mobile` saíram dos três dicionários.

Um preview de celular honesto precisa de um **viewport próprio**, o que quer dizer `iframe` — com
o custo de levar as folhas de estilo para dentro do documento e de portar o rascunho para lá. É
tarefa própria, não um ajuste desta.

Entrou no lugar um botão **Descartar**, que já tinha chave no dicionário e não tinha botão: sem
ele, a única saída de um rascunho não publicado era recarregar a página — exatamente o gesto que o
aviso de saída existe para desencorajar.
