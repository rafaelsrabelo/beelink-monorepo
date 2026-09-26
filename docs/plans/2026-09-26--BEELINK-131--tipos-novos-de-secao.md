# BEELINK-131 — Tipos novos de seção

*Escrito em 2026-09-26, ao começar o ticket. Épico I (BEELINK-123).*

## O que muda

Uma página de venda ganha as seções que ainda não tem:

- **contagem regressiva**;
- **perguntas frequentes**;
- **imagem + texto**;
- **produto em destaque**;
- **chamada final**.

Cada uma chega pelo caminho de sempre:

- aparece na galeria;
- tem os campos no painel;
- escolhe o layout na aba Layout;
- é desenhada pela mesma vitrine na loja e na prévia.

## Seis PRs, empilhados

0. **Base:** arruma o terreno para os tipos novos, sem mudar nada que a loja mostra. A exceção é um
   bug: a vitrine desenhava um tipo desconhecido como uma vitrine de produtos.
1. **Perguntas frequentes:** estabelece o padrão.
2. **Chamada final:** traz o botão com link.
3. **Imagem + texto.**
4. **Produto em destaque:** preço e estoque resolvidos na hora.
5. **Contagem regressiva.**

Branches: `feat/BEELINK-131-base`, `-perguntas`, `-chamada-final`, `-imagem-texto`,
`-produto-destaque` e `-contagem`, empilhadas sobre `feat/BEELINK-130-publicar-historico`.

## Definição de Pronto

1. Cada tipo existe em todas as camadas:
   - o valor no `ComponentKind`;
   - o schema na API;
   - o tipo no contrato;
   - o componente da vitrine em `packages/ui`, com story e teste (axe incluído);
   - os campos no painel;
   - a entrada no registro de seções, com os layouts.
2. **Contagem regressiva** (faixa, bloco):
   - tem data e hora de término;
   - some da vitrine quando termina.
3. **Perguntas frequentes** (acordeão): perguntas e respostas, que o lojista reordena.
4. **Imagem + texto** (imagem à esquerda, imagem à direita).
5. **Produto em destaque** (imagem à esquerda, imagem grande):
   - um produto do catálogo;
   - preço e estoque resolvidos na hora;
   - o botão de comprar.
6. **Chamada final** (faixa, cartão): título, texto e botão com link.
7. Publicar, restaurar e duplicar funcionam com os tipos novos sem código novo.

## Decisões

### Onde cada tipo guarda o que tem

**Tudo em `items`, sem coluna nova.** É o que o aviso já faz com o seu link. Por isso:

- o documento de uma versão não muda de forma;
- nenhuma página passa a acusar "alterações não publicadas" depois do deploy;
- restaurar, duplicar e a leitura tolerante já tratam os tipos novos.

| Tipo | Palavras | Itens |
|---|---|---|
| Perguntas frequentes | título, subtítulo | até 20 `{ pergunta, resposta }` |
| Chamada final | título, texto | um botão: rótulo e destino |
| Imagem + texto | título, texto | uma imagem, com descrição e botão opcionais |
| Produto em destaque | título, subtítulo | um produto, pelo id |
| Contagem regressiva | título, subtítulo | um instante de término |

### Layouts

Sete valores novos no `ComponentDisplay`. Dois deles valem para dois tipos: "Faixa" e "Imagem à
esquerda". Cada tipo nasce com um layout, então nenhum tem o estado "sem layout escolhido".

| Valor | Nome | Usado por |
|---|---|---|
| `BAND` | Faixa | contagem, chamada final |
| `BLOCK` | Bloco | contagem |
| `ACCORDION` | Acordeão | perguntas frequentes |
| `IMAGE_LEFT` | Imagem à esquerda | imagem + texto, produto em destaque |
| `IMAGE_RIGHT` | Imagem à direita | imagem + texto |
| `IMAGE_LARGE` | Imagem grande | produto em destaque |
| `CARD` | Cartão | chamada final |

- Perguntas frequentes tem um layout só. A aba Layout não mostra a escolha quando só há uma opção.
- Cada PR traz a sua migração, e cada migração só acrescenta valores ao enum. O Postgres não deixa
  usar, na mesma transação, um valor que acabou de criar.

### Contagem regressiva

- **O término é um instante.** Os dígitos mostram uma duração e não dependem de fuso.
- **Data e hora escritas:** a frase para o leitor de tela e o campo do painel usam o horário de
  Brasília. A loja não tem fuso próprio; um fuso por loja fica para depois.
- **A contagem some de dois jeitos:**
  - a API a tira da página quando o término passou;
  - no navegador, ela se esconde ao chegar a zero. A página em cache pode ter até 60 s de atraso.
- **No editor** continua desenhada, como "Encerrada", para o lojista ver.
- **Acessibilidade:** `role="timer"`, sem anúncio a cada segundo. Os dígitos ficam ocultos para o
  leitor de tela, que ouve uma frase fixa com a data de término.
- **Publicar** avisa quando a contagem já terminou ou não tem data.

### Produto em destaque

- **Preço, estoque e foto** são resolvidos a cada leitura da página, como numa vitrine. Mudar o
  preço não pede para publicar de novo.
- **Produto apagado, em rascunho ou arquivado:** o bloco some, e Publicar avisa.
- **Produto esgotado:** continua aparecendo, marcado "Esgotado", e o botão leva à página do produto,
  onde está o "Avise-me".
- **O botão:**

  | Situação | Botão |
  |---|---|
  | Produto sem variações | "Comprar agora", que põe no carrinho |
  | Produto com variações | "Ver opções" |
  | Landing sem topo e rodapé | leva à página do produto: sem cabeçalho não se chega ao carrinho |

- **Um site nunca oferece este tipo:** ele fica na prateleira "Produtos e venda", que um site não
  tem.
- **Produto de outra loja:** recusado com `FEATURED_PRODUCT_INVALID`.

### Perguntas frequentes, chamada final e imagem + texto

- **Perguntas frequentes na vitrine:** `<details>`/`<summary>` nativos, não o acordeão do shadcn.
  - A página é anônima e indexada, e as respostas precisam estar no HTML mesmo fechadas.
  - Abre e fecha antes da hidratação.
  - O `name` comum deixa uma pergunta aberta por vez nos navegadores atuais.
- **O botão da chamada final e o da imagem + texto:**
  - usa os mesmos destinos do banner (categoria, produto, link externo);
  - passa pela mesma resolução de endereço;
  - entra no mesmo aviso de "link para produto excluído".
- **Imagem + texto no celular:** empilha, com a imagem primeiro. A descrição da imagem é opcional;
  vazia, a imagem é decorativa.

### Modelos de landing

Os tipos novos entram nos modelos, no PR de cada tipo:

- **Lançamento:**
  - o "produto numa vitrine de um" vira produto em destaque;
  - ganha perguntas frequentes (entrega, troca, pagamento);
  - termina com uma chamada final.
- **Promoção relâmpago:**
  - ganha uma contagem de 72 horas a partir da criação;
  - o produto em destaque;
  - uma chamada final.
- **Coleção:** só a variante sem categoria troca a vitrine de um pelo produto em destaque.

Isto reverte a decisão do I5 de mostrar o produto "numa vitrine de um". As landings já criadas
continuam como estão.

### A base (PR 0)

- **A vitrine desenha só os tipos que conhece.** O renderizador era uma cadeia de `if` que caía numa
  vitrine de produtos para qualquer outro tipo. Uma página em cache, ou uma API mais nova, que
  servisse "perguntas frequentes" a uma web antiga desenharia as perguntas como cartões de produto.
  - Agora é um `switch` exaustivo.
  - Um tipo desconhecido não desenha nada, e uma faixa sem mais nada some.
- **As buscas de uma página viajam num objeto só** (`PageLookups`). Um tipo que resolve algo novo,
  como o produto em destaque, acrescenta um campo e não um parâmetro em cada chamada.
- **`page-links.ts`:** os links por id ficam num lugar só. Um tipo que passa a ter link ganha, de
  graça, a resolução de endereço e o aviso de Publicar.
- **Divisões de arquivos** que os tipos novos fariam passar de 250 linhas:
  - o schema dos itens;
  - o mapper público;
  - os modelos de landing;
  - o renderizador da vitrine e as seções;
  - a tela do editor;
  - a prévia do rascunho;
  - os valores do formulário;
  - os campos de conteúdo.
- **`WORDS_OF`:** cada tipo declara quais palavras pede (título, subtítulo, texto). Um tipo novo que
  não declara não compila.
- **A descrição dos layouts no Swagger** é montada a partir de `DISPLAYS_OF_KIND`.

## Fora do escopo

- Fuso horário por loja.
- JSON-LD de perguntas frequentes. O Google limitou esse resultado em 2023.
- Largura padrão da faixa por tipo. Uma "Faixa" numa faixa contida aparece como uma caixa dentro das
  margens.
- A descrição do produto no produto em destaque.

## Riscos

- **Ordem do deploy:** a web do PR 0 precisa ir antes da API de qualquer tipo novo. Cada PR de tipo
  sobe a migração e a API juntas.
- **Voltar a API** para antes de um tipo já em uso: o Prisma pode recusar um valor de enum que não
  conhece ao abrir o rascunho. As versões publicadas estão a salvo, porque a leitura tolerante descarta
  o que não entende.
- **Contagem em cache:** por até 60 s depois do término, uma faixa que só tinha a contagem mantém o
  espaçamento.
- **A promoção relâmpago** nasce com uma data que expira sozinha. É o comportamento do ticket; o aviso
  de Publicar e a nota no painel deixam isso visível.

## Durante a implementação

*Acrescentado em 2026-09-26, ao terminar os seis PRs.*

- **A contagem não usa `suppressHydrationWarning`.**
  - O primeiro render, no servidor e no navegador, desenha a data de término à vista e traços no lugar dos dígitos. Os dígitos começam quando o script roda.
  - Assim os dois renders são iguais, e quem não tem script ainda lê quando a oferta acaba.
- **O `showStock` do produto em destaque ficou de fora.** "Esgotado" sempre aparece, porque explica por que não há botão, e o bloco não mostra a quantidade em estoque.
- **`readsCatalog`** em `design-kinds.ts` diz quais tipos carregam categorias e produtos no painel. A chamada final apareceu sem produtos para escolher na primeira conferência no navegador.
- **O aviso "não está à venda"** do produto em destaque só aparece quando há um produto salvo que não resolve. Antes de escolher, o bloco mostra o convite para escolher.
- **A galeria recebe o relógio uma vez, ao abrir o editor.** A amostra da contagem conta a partir dele, e o render continua puro.

## Depois da revisão

*Acrescentado em 2026-09-26.*

- **Cores dentro de uma faixa pintada.** A faixa agora redefine todas as cores que derivam do fundo,
  não só a tinta: o tom claro, os preenchimentos, as linhas e as tintas de promoção. Antes, o cartão
  da chamada final e as caixas da contagem guardavam o fundo claro da página, com a letra branca de
  uma faixa escura em cima.
- **Imagem e texto:** o botão só é pedido quando há imagem, porque é guardado junto com ela. Antes, um
  botão digitado sem imagem sumia ao salvar, sem aviso.
- **Produto em destaque:**
  - o produto escolhido é nomeado pelo cartão que a leitura já trouxe, então um produto além dos
    primeiros 96 não aparece mais como "Produto não encontrado";
  - a busca diz que ainda está procurando, em vez de "Nada com esse nome.".
- **Swagger:** a lista de problemas do Publicar é montada a partir do tipo do contrato, e um problema
  novo não fica mais de fora.
- **Contagem:** os dígitos quebram em duas linhas numa metade ou num terço estreito da faixa.
