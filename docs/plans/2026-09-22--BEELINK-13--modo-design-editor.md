# BEELINK-13 — O modo design vira o editor da página

> "design é pra ser o foco de tudo" — o dono da loja, 22/09/2026

## O pedido

1. Recolher o menu lateral.
2. Blocos de **título e subtítulo**, inseridos onde o dono quiser.
3. Trocar o título de **"Todos os produtos"**.
4. A faixa **Dinheiro / PIX / Cartão** deixa de ser derivada: ícone, título e descrição escritos
   pelo dono, com layout próprio — e removível.
5. O **banner fixo do topo** pode ser removido no modo design.
6. Esse banner **sai de Aparência e vai para Banners**, pode virar **carousel**, e pode ser
   **full como hoje ou mais centralizado**.

O item 1 é independente e já foi entregue (`eea09cb`). O resto é um pedido só, e este plano trata
dele como tal.

## O que o levantamento achou, e por que ele decide o desenho

Cinco agentes leram o código e um sexto tentou refutar cada afirmação. Três fatos decidem tudo:

**`Store.layoutSettings` declara 21 chaves e a vitrine desenha quatro.** As lidas são
`productsPerRow`, `showCategoryIcons`, `showProductPrice` e `showProductBadges`. `cardLayout` é
editável no painel e não tem renderizador. As outras dezesseis são validadas na escrita, salvas,
resgatadas na leitura — e desenhadas por nada.

**Seis das mortas são exatamente este pedido.** `showBanner`, `bannerType: 'single' | 'carousel'`,
`bannerImages` (array de URLs, cada uma `.max(2048)`, array `.max(20)`), `bannerHeight`,
`bannerRounded`, `bannerPadding`. O carousel foi modelado, validado, limitado por segurança — e
nunca construído. `packages/ui/src/components/carousel.tsx` também já está instalado (shadcn sobre
Embla, sete exports) com **zero importadores**.

A lição não é "falta modelo". É que **declarar não é a parte difícil**, e que uma chave a mais no
blob é uma chave que ninguém vai desenhar. Acrescentar `bannerCentered` ali seria a décima sétima.

**Existem três mecanismos de ordenação concorrentes.** A tabela `StoreBanner` com `position`; a
coluna `Store.layoutType` com `bannerImageUrl`; e o blob. O dono não pensa em três — ele pensa numa
página com blocos em ordem.

## A decisão

**`StoreBanner` vira `StoreSection`: uma tabela ordenada de blocos com tipo.**

```prisma
enum SectionKind {
  COVER      /// A capa do topo. Uma imagem ou várias, que viram carousel.
  BANNER     /// Um cartaz no corpo da página — FULL, HALVES ou THIRDS.
  TEXT       /// Título e subtítulo, e nada mais.
  BENEFITS   /// A faixa de vantagens: ícone, título e descrição por linha.
  PRODUCTS   /// Os trilhos de produtos. Existe uma por loja e não se apaga.
}
```

Cada bloco tem `kind`, `position` e `isActive`. O resto é por tipo.

**Por que uma tabela e não mais chaves no blob.** Porque tudo que foi pedido é "um bloco, numa
ordem, com ajustes, que o modo design edita" — e isso é uma lista. O blob não tem ordem, e é o
lugar onde dezesseis chaves já morreram. Uma linha morta numa tabela de blocos é uma faixa em
branco que o dono vê na hora; uma chave morta no blob é invisível por seis meses.

**Por que generalizar a tabela que existe e não criar outra.** `StoreBanner` já tem `position`,
`isActive`, os alvos com chave estrangeira e os endpoints de reordenação que o modo design usa. Ela
tem um dia de vida e quatro linhas no banco de desenvolvimento. Criar uma segunda tabela ordenada
ao lado dela seria o quarto mecanismo.

**`belowProducts` morre, e isso é o teste da decisão.** Aquele booleano só existe porque não havia
como dar uma posição à faixa de produtos. Com uma lista de blocos, `PRODUCTS` é uma linha com
`position` como qualquer outra. O desenho **remove um caso especial** em vez de acrescentar outro —
é assim que se sabe que ele é o certo, e eu o escrevi ontem.

### Onde cada pedido cai

| Pedido | Onde cai |
|---|---|
| Título e subtítulo | `kind = TEXT`, com `title` e `subtitle` |
| Trocar "Todos os produtos" | `title` da linha `PRODUCTS`. Nulo = a palavra da plataforma |
| Faixa de vantagens | `kind = BENEFITS`, linhas em `items` |
| Remover o banner do topo | `isActive = false` na linha `COVER` |
| Banner sai de Aparência | A linha `COVER` é editada em Blocos, não em Aparência |
| Carousel | Mais de uma imagem em `items` da linha `COVER` |
| Full ou centralizado | `width: FULL | CONTAINED` |

### O `items Json`, e por que ele não é o blob de novo

Um `COVER` guarda seus slides ali; um `BENEFITS` guarda suas linhas. A forma é decidida pelo
`kind`, validada por uma união discriminada em zod — o mesmo padrão que
`store-layout-settings.schema.ts` já usa, com o mesmo alarme de `satisfies`.

A diferença para o blob é a que importa: **`items` é o conteúdo**. Se nada o desenhar, a faixa
aparece vazia e o dono reclama no mesmo dia. Uma chave morta em `layoutSettings` não aparece em
lugar nenhum — foi exatamente assim que dezesseis delas sobreviveram.

### O ícone é uma lista fechada

Não existe resolvedor de nome lucide para componente em lugar nenhum do repositório — `StoreCategory.icon`
guarda um nome desde sempre e **nada o desenha**. Importar lucide inteiro dinamicamente para uma
faixa de quatro linhas é pagar um bundle por uma grade de escolha.

Então: uma tabela fechada de ícones em `packages/ui`, o dono escolhe numa grade, e o nome guardado
é validado contra essa tabela. Um nome que a tabela não conhece desenha o ícone padrão em vez de
quebrar a página.

## Fora de escopo

- **Preview de celular.** Continua precisando de `iframe`; a medição está no plano da BEELINK-10.
- **Blocos de depoimento e newsletter.** O catálogo de seções fecha nos cinco tipos acima. O
  sexto entra por PR, não por conversa.
- **`layoutSettings`.** As dezesseis chaves mortas não são apagadas aqui: apagar uma chave começa a
  recusar o que uma loja antiga já tem guardado. Elas ficam, e este plano só deixa de acrescentar.
- **A aba Aparência inteira.** Ela perde a capa; as cores, o `cardLayout` e o agrupamento por
  categoria continuam lá.

## Definição de Pronto

1. A vitrine desenha os blocos na ordem da tabela, e header e rodapé não são blocos.
2. O dono insere um bloco de texto e ele aparece onde foi solto.
3. O trilho de produtos aceita um título escolhido pelo dono, e vazio volta à palavra da plataforma.
4. A faixa de vantagens é escrita pelo dono — ícone, título, descrição — e pode ser removida.
5. A capa é um bloco: some com um clique, aceita várias imagens como carousel, e escolhe entre
   ocupar a largura toda ou ficar contida.
6. Nenhuma loja existente muda de aparência sem que o dono peça.
7. `belowProducts` não existe mais, e a faixa de produtos tem posição própria.
8. Nenhuma chave nova em `layoutSettings`.

---

## Adendo — o que a verificação mudou

### O painel de arquitetos falhou; a decisão veio do mapa

Quatro arquitetos independentes deviam propor o modelo e um júri pontuar. Os quatro **travaram**
(sem progresso por 180s, seis tentativas cada) e voltaram vazios — dois milhões de tokens sem um
resultado. Não repeti o mesmo desenho: o levantamento, que deu certo, já continha o que decide, e
as três medições da seção anterior sustentam a escolha sozinhas.

### Duas regressões que só a comparação antes/depois pegou

Fotografei a home de três lojas **antes** de migrar e comparei depois. Sem isso nenhuma das duas
teria aparecido, porque as duas compilam e nenhuma quebra um teste.

**A capa sumiu.** A migração pôs `stores.bannerImageUrl` na coluna `imageUrl` do bloco — que é onde
um BANNER guarda a foto dele. Mas uma capa desenha a partir de `items`, porque uma capa é um ou
vários slides, e um slide só continua sendo um slide. Consertado numa **segunda** migração e não
editando a primeira: a primeira já estava aplicada, e o Prisma guarda um checksum por migração —
editar um arquivo aplicado faz o `migrate status` recusar a pasta inteira, que é uma falha pior que
a consertada.

**Uma loja passou a responder 500.** `TypeError: sections is not iterable`, numa loja e não na
vizinha. A causa é o **cache**: a vitrine serve `shopAt` de um cache com tag, então no dia em que a
forma do fio muda a loja continua servindo a forma antiga até a janela fechar. `StorefrontSections`
agora trata a ausência como nenhum bloco — numa página anônima que um crawler lê, uma faixa que
falta por alguns minutos é um erro muito menor que um 500.

> **Para o deploy:** esta mudança renomeia um campo de `PublicStore`. As lojas servem a forma antiga
> até `revalidateTag('store:<slug>')` correr ou a janela vencer. É um ponto do plano de subida, não
> um detalhe de desenvolvimento.

### O que ainda não está aqui

O renomeio, a migração, a vitrine e o modo design estão inteiros. Falta o que cada tipo novo
precisa para ser **criado e escrito** pelo dono:

- **A tela de Blocos** lista só os banners por enquanto. Capa, vantagens e título são blocos que o
  dono arruma no modo design e ainda não cria ali — cada um quer um formulário próprio, e um que
  crescesse um ramo por tipo é o formulário que ninguém lê.
- **A aba Aparência ainda escreve a capa.** `stores.layoutType` e `stores.bannerImageUrl` não foram
  derrubadas de propósito: uma coluna derrubada antes do último escritor dela é um 500 no salvar.
  Elas saem quando a tela que as substitui existir.
