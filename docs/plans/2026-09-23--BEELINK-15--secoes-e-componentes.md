# BEELINK-15 — Uma seção tem atributos e tem componentes

> "o banner era pra ser uma secao. Uma secao pode ter titulo, descricao, lista de produtos,
> banner, essas variacoes […] Secao tem atributos (cores, ordenacao) e tem Componentes"
> — o dono da loja, 23/09/2026

## O que existe hoje, e o que ele não consegue dizer

A página inicial é uma **lista plana** de blocos: capa, banner, título, vantagens, categorias,
produtos. Cada um é uma linha com uma posição. Funciona, e três coisas que o dono pediu não cabem
nela de jeito nenhum:

**Um título não pertence a nada.** Hoje um bloco de texto acima de um trilho de produtos está
*perto* dele, não *ligado* a ele. Arrastar o trilho deixa o título órfão em cima de outra coisa, e
nada na tela diz que aquilo era um par. "Novidades da semana" vira um título solto sobre banners.

**Uma faixa não pode ter fundo próprio.** Uma cor de fundo pertence a uma faixa da página — um
bloco escuro com um título claro e uma prateleira dentro. Numa lista plana não existe "a faixa": só
existem três blocos que por acaso estão seguidos, e pintar os três é pintar cada um.

**A capa é um tipo só porque está no topo.** `HERO` existe para dizer "este banner é o de cima". É
uma posição virada tipo, e ela já custou uma reversão.

## A decisão

**Dois níveis, com as palavras do dono.**

```
Página
├── chrome            header · navegação · rodapé · barra de aviso  (não entram na ordem)
└── Seção             atributos: cor de fundo, largura, ordem, visível
    └── Componente    ordem dentro da seção
        ├── Título        título + subtítulo
        ├── Texto         um parágrafo
        ├── Banner        uma imagem, ou várias, que viram carousel
        ├── Produtos      o que a loja vende
        ├── Categorias    a grade de categorias
        └── Vantagens     ícone + título + linha, por item
```

### 1. `HERO` deixa de existir, e isso é o teste da decisão

Uma capa é **uma seção de largura cheia, a primeira da página, com um componente de banner
dentro**. "No topo" passa a ser o que sempre foi — estar primeiro — em vez de um tipo.

Um desenho que **apaga** um caso especial em vez de somar outro é o sinal de que ele é o certo. Foi
o mesmo sinal que matou o `belowProducts`, e é o que justifica mexer nisto uma terceira vez.

### 2. Seção e componente são tabelas, não JSON

`store_sections` passa a ser a faixa; a tabela de hoje vira `store_components`.

JSON dentro da seção seria mais curto e está errado pelo motivo que este repositório já pagou duas
vezes: um banner aponta para categoria ou produto **por chave estrangeira**, e `5639c47` apagou uma
tabela inteira porque guardava endereço. Um componente precisa de coluna.

Os slides de um banner continuam JSON com id resolvido na leitura, porque ali a troca já foi feita
e medida: sem cascade, apagar uma categoria deixa o slide sem link em vez de apagar o banner.

### 3. A migração dá uma seção para cada bloco de hoje

Cada bloco vira **uma seção com um componente dentro**, na mesma ordem, com a mesma visibilidade.
Nenhuma loja muda de aparência. Agrupar dois componentes numa seção passa a ser algo que o dono faz
depois, arrastando — não algo que a migração adivinha.

A seção de um `HERO` nasce com largura cheia; as outras, contidas. É exatamente o que cada uma
desenha hoje.

### 4. Banners saem do menu lateral

Um banner é um componente, e componente se cria onde se arruma. A entrada "Banners" some do menu; o
formulário continua existindo, alcançado de dentro do modo design.

Isso resolve de raiz o que foi relatado: um banner de topo que aparecia num lugar e não no outro
existia porque havia **duas telas** para uma coisa.

### 5. O que cada nível tem

| Seção | Componente |
|---|---|
| cor de fundo (vazia = a da página) | tipo |
| largura: cheia ou contida | os campos do tipo |
| ordem na página | ordem dentro da seção |
| visível | visível |

A cor de fundo da seção deriva o primeiro plano dela pela mesma regra do resto da vitrine — o
`readableOn` já escrito. Uma faixa preta num tema claro fica legível sem ninguém escolher nada.

### 6. Ordenar em dois níveis é o custo real

O modelo é simples; **arrastar não é**. Um componente tem de poder sair de uma seção e entrar em
outra, e uma seção tem de se mover inteira. É a parte difícil e é onde um editor desses costuma
ficar confuso — que é, palavra por palavra, a crítica que trouxe este plano.

Então a ordem de entrega é: **o modelo primeiro, arrastar em dois níveis depois**. Entre os dois, o
painel move seções e move componentes dentro da seção, sem atravessar de uma para outra.

## O que isto conserta do que foi relatado

- **"Não consigo editar vantagens / criar blocos de texto / barra de avisos."** A API cria os três
  (verificado: 201). O que falta é onde escrever. Cada tipo de componente ganha os campos dele,
  abertos ao clicar na linha — e é isso que faz um bloco vazio deixar de ser vazio.
- **"Esse componente de categorias está sem sentido."** Está: ele desenha todas as categorias e não
  tem ajuste nenhum. Como componente ele ganha os seus — quais categorias e quantas colunas.
- **"Texto tem que escolher título, subtítulo ou parágrafo."** Dois componentes em vez de um: um
  **Título** com título e subtítulo, e um **Texto** com um parágrafo.

## Fora de escopo

- **Testimonials, Countdown, Newsletter.** Entram um por vez, inteiros, e cada um carrega a pergunta
  que a BEELINK-14 nomeou — o relógio contra o cache, o iframe na página indexada, e o fato de que
  newsletter é funcionalidade e não componente.
- **Preview de celular.** Continua precisando de `iframe`.
- **Arrastar um componente de uma seção para outra.** Entrega seguinte, por decisão 6.

## Definição de Pronto

1. A página é uma lista de seções, e cada seção é uma lista de componentes.
2. Nenhuma loja existente muda de aparência.
3. `HERO` não existe mais; a capa é a primeira seção, de largura cheia, com um banner dentro.
4. Uma seção tem cor de fundo própria, e o texto dentro dela contrasta sem ninguém escolher.
5. Todo componente se edita: título, texto, banner, vantagens, categorias, produtos.
6. Banners não estão mais no menu lateral.
7. Um bloco vazio continua dizendo que está vazio.

---

## Adendo 1 — o que a implementação decidiu que o plano não tinha dito

**Cartazes consecutivos viram uma faixa só, não uma cada.** A decisão 3 dizia "cada bloco vira uma
seção com um componente dentro". Para banners lado a lado isso mudaria a aparência de toda loja que
tem cartazes em "um terço": a vitrine agrupa a sequência deles numa linha do showcase, e é a linha
que decide as colunas — três `THIRDS` entregues separados são três linhas de largura cheia. A
migração agrupa a sequência (gaps-and-islands em SQL) numa faixa contida, com cada cartaz um
componente dentro dela, na ordem. É a primeira vez que a sequência implícita vira uma faixa que diz
que é — o modelo pagando a si mesmo no primeiro dia. Todo outro tipo continua ganhando faixa própria;
dois títulos seguidos ficam em duas faixas, porque juntá-los mudaria o espaçamento.

**O cartaz vira um banner com um slide.** O `prisma migrate diff` acusou: o cartaz guardava a
imagem em `imageUrl` e o destino em quatro colunas; a capa já guardava tudo em `items`. Sendo agora o
mesmo tipo, guardam do mesmo jeito — a migração dobra cada cartaz num slide, exatamente como
`20260922270000` fez com as capas. As quatro colunas de destino (`target`, `categoryId`,
`productId`, `externalUrl`) e o `CHECK` **são apagados**: nada mais as lê, e coluna sem leitor é a
doença do `layoutSettings`. O que se perde é o cascade da chave estrangeira, e essa troca já tinha
sido feita e medida para os slides: apagar uma categoria deixa o slide sem link em vez de apagar o
banner.

**`kind` não muda mais num patch.** Ele era mutável por um caso só — mover um banner entre o topo e o
corpo — que era posição expressa como tipo. Sem `HERO`, esse motivo não existe; toda outra troca de
tipo é uma forma diferente com campos diferentes. Enviado igual, passa; enviado diferente, `400
COMPONENT_KIND_IMMUTABLE`.

**No preview, arrastar move a faixa; o lápis abre o componente.** Os dois níveis não são
arrastáveis no preview: um arrasto dentro de uma faixa dentro de um arrasto de faixas são dois
gestos num ponteiro só. O painel ao lado faz o nível de dentro com espaço para ver.

**A largura da faixa de vantagens nasce "ponta a ponta".** O componente pinta uma tira tingida de
borda a borda e contém a lista por dentro, então é isso que a faixa dele é hoje. A capa honra o
`width` da própria linha; todo o resto nasce contido.

**O rascunho guarda só o que o arranjo muda.** Encontrado ao vivo: uma faixa salva em azul-marinho
pelo sheet continuou branca no preview. O rascunho tinha uma cópia da cor, e só é re-semeado quando
uma linha entra ou sai — então o que um sheet salva direto no servidor ficava escondido por uma
cópia velha até recarregar. O rascunho passa a guardar ordem, visibilidade e tamanho, e nada mais;
título, cor, largura e conteúdo são lidos do que o servidor tem, em toda renderização. O que o
rascunho não guarda não envelhece.

---

## Adendo 2 — a lista de produtos não pode sumir, em nenhum dos dois níveis

Relatado: "tenho produtos criados, mas não aparece na listagem do design". A loja tinha três
produtos ativos e **nenhum componente `PRODUCTS`**. A linha do componente não desenhava lixeira,
mas a lixeira da **faixa** não perguntava o que havia dentro — e o menu "Adicionar bloco" não
oferecia a lista de volta. Três portas, uma regra faltando.

**A regra vai para a API, nos dois níveis.** `REQUIRED_COMPONENT_KINDS = ['PRODUCTS']`: apagar o
componente responde `400 COMPONENT_REQUIRED`; apagar a faixa que o contém, também. A UI espelha —
sem lixeira na faixa que segura a lista — mas a UI não é a tranca.

**Uma loja nova nasce com a página.** `StoresService.create` passou a semear, na mesma transação,
a faixa de vantagens (derivada das formas de pagamento, escondida se não houver nenhuma) e a faixa
de produtos — na ordem que a página sempre desenhou. Antes desta mudança uma loja criada depois
da migração de seções nascia **sem faixa nenhuma** e desenhava nada em `/<slug>`.

**Quem perdeu, recebe de volta.** `20260923010000_every_shop_lists_its_products` insere a faixa
de produtos, por último, em toda loja que não tem o componente. Idempotente. Subir a faixa é um
arrasto.

**O menu oferece a lista enquanto a loja não tem uma.** Some no instante em que ela existe, como
todo singleton. É o caminho de volta que não exige abrir o banco.

**O rascunho só solta a linha depois que o servidor soltou.** Antes, o painel apagava a faixa da
tela antes da resposta; com a API podendo recusar, isso deixaria o dono arrumando uma página com
uma faixa a menos do que a loja tem.

