# BEELINK-14 — A Aparência se dissolve no modo design, e a capa vira banner

> "a aba Aparência ao meu ver nao deveria mais estar ai e ta dentro de Modo design […] esses
> banners podem ter acao, entao acho que ele tem que ir pra banners e la voce marcar o banner como
> hero section ou carousel de hero section" — o dono da loja, 22/09/2026

## O que o levantamento achou

Três agentes leram a aba Aparência e mediram o que cada valor dela faz. O resultado decide metade
do plano: **três dos cinco controles não desenham nada.**

| Controle | Desenha algo hoje? | Evidência |
|---|---|---|
| Layout `DEFAULT`/`BANNER` | **Não** | O único portão é `storefront-frame.tsx:170`, atrás de `showBanner`, que tem default `false` e **nenhuma das quatro chamadas passa** |
| Imagem do banner | **Não**, só metadado | Único uso vivo é a imagem OpenGraph em `[slug]/page.tsx:50`. O caminho visual está morto duas vezes: `showBanner` nunca é verdade, e `storefront-window.tsx:334` o suprime quando a página passa `blocks` |
| Layout do card | **Não** | Zero ocorrências sob `blocks/storefront/` ou as rotas `[slug]/`. Vai à API e volta sem mudar um pixel |
| Agrupar por categoria | **Sim** | `[slug]/page.tsx:66` → `homeAt(slug, byCategory)` |
| Cores | **Sim, em tudo** | `--shop-background` sozinho tem ~15 consumidores |

E um perigo que precisa ser resolvido junto, não depois:

> **`layoutSettings` tem semântica de substituição e nenhuma versão.** `stores.service.ts:144`
> escreve `{ ...dto.layoutSettings }` sem consultar o valor atual, e o campo é `@IsOptional()` —
> **omitir o blob apaga todas as chaves e responde 200**. O painel só sobrevive porque
> `store-payloads.ts:133` devolve por eco o `Store` que ele leu por último. No dia em que o modo
> design também escrever apresentação, os dois se atropelam: um eco de leitura velha reposta o
> estado pré-edição por cima do novo.

## As decisões

### 1. A capa é um banner, não um bloco com slides dentro

`COVER` vira **`HERO`**, e um hero é uma linha de `StoreSection` inteira — com `target`,
`categoryId`, `productId` e `externalUrl`, exatamente como um cartaz do corpo da página.
**Heroes ativos consecutivos viram um carousel**, pela mesma regra de agrupamento que cartazes do
mesmo tamanho já usam. Um hero sozinho é uma capa; três seguidos são um carousel de três.

Não existe interruptor "single/carousel". A forma é lida da contagem, que é uma coisa a menos para
discordar — `layoutSettings.bannerType` guardava exatamente esse interruptor e nunca foi lido.

**Por que a ação obriga isso.** Um `CoverSlide` só guarda `href`, uma string. Um hero apontando
para `/lessari/blusas` viraria link morto no dia em que a categoria fosse renomeada — que é
literalmente o motivo pelo qual `5639c47` apagou `store_showcases`. Como linha, o hero aponta por
chave estrangeira e o endereço é montado do slug que o alvo tem **agora**.

Some daqui: `CoverSlide`, e o `items` volta a servir só a faixa de vantagens.

### 2. Três controles da Aparência são apagados, não mudados de lugar

Mover um controle que não desenha nada é mover uma mentira para um endereço mais bonito.

- **`Store.layoutType`** — apagado. Uma loja sem linha `HERO` não tem capa; isso **é** o interruptor.
- **`Store.bannerImageUrl`** — coluna apagada. O único uso vivo, a imagem OpenGraph, passa a ser a
  imagem do primeiro `HERO`.
- **`layoutSettings.cardLayout`** — apagado. Ida e volta à API sem renderizador.

### 3. Os dois que desenham mudam de dono

- **Cores** → um painel próprio no modo design, ao lado da lista de blocos. Cor não é bloco: não
  entra na ordem da página, então não é uma linha arrastável.
- **Agrupar por categoria** → ajuste do bloco `PRODUCTS`, onde ele é a pergunta que é: "esta faixa
  é uma prateleira ou uma por categoria?"

### 4. O painel para de escrever `layoutSettings`, e é isso que desarma a corrida

As quatro chaves que ainda têm leitor — `productsPerRow`, `showCategoryIcons`, `showProductPrice`,
`showProductBadges` — são ajustes de bloco e vão para colunas da linha `PRODUCTS` e da linha
`HERO`. Com `cardLayout` apagado, **nada mais lê o blob**, e o formulário de configurações deixa de
enviá-lo.

Aí a corrida some por construção em vez de por convenção: há um escritor por dado, e nenhum
formulário reposta por eco o que outro acabou de salvar.

A coluna fica. Apagá-la começaria a recusar chaves que uma loja antiga já tem guardadas, e é
exatamente o custo que este plano se recusa a pagar duas vezes.

### 5. A aba sai inteira, e a tela de Blocos ganha o formulário do hero

`TAB_OF_SLICE` é `satisfies Record<keyof StoreSettingsValues, string>`, então tirar a fatia
`appearance` obriga o mapa, o schema zod, as três cópias de texto, a história e a fixture a saírem
juntos — o compilador cobra cada um. Ficam quatro abas: Identidade, Endereço, Redes, Pagamento.

Na tela de Blocos, criar um banner passa a perguntar **onde ele mora**: topo da página (hero) ou
corpo. O resto do formulário — imagem, título, alvo — é o que já existe.

## Fora de escopo

- **Preview de celular.** Continua precisando de `iframe`; a medição está na BEELINK-10.
- **Ajustes por bloco além dos citados.** O painel de cada tipo chega com o formulário dele.
- **Apagar as chaves mortas de `layoutSettings`.** Ficam onde estão, sem leitor e sem escritor.

## Definição de Pronto

1. Não existe mais aba Aparência em Configurações da loja.
2. O dono marca um banner como topo da página, e ele aparece lá.
3. Dois ou mais banners de topo viram carousel, sem interruptor.
4. Um banner de topo aponta para produto, categoria, link externo ou nada.
5. As cores se editam no modo design, com preview ao vivo.
6. Agrupar por categoria é ajuste do bloco de produtos.
7. `layoutType`, `bannerImageUrl` e `cardLayout` não existem mais em lugar nenhum.
8. Nenhum formulário envia `layoutSettings`.
9. Nenhuma loja existente muda de aparência sem que o dono peça.

---

## Adendo — o catálogo de componentes que o dono pediu

> "ao lado da preview da pagina tinha COMPONENTES, CORES, pra selecionar e ajustar" — com dezesseis
> tipos listados.

**É possível, e o modelo já é essa forma.** Uma página é uma lista ordenada de blocos com tipo; um
tipo novo é um valor no enum, uma forma no zod, um componente com história e teste, e um painel de
ajustes. O build quebra em cada ponto que faltar, que é o objetivo.

O que não é parecido entre os dezesseis é o **custo**, e juntá-los numa lista só esconde isso.

### Três deles não são blocos

**Header, Navigation e Footer não entram na ordem da página.** Eles estão em toda página da loja,
não só na inicial — o dono já disse isso: *"o que nao muda e o footer e o header"*. Eles ganham
**ajustes**, não posição. Arrastá-los seria oferecer um gesto que não tem resposta na página do
produto nem na do carrinho.

**A Announcement Bar é a exceção que confirma:** ela é conteúdo novo, mas é chrome — mora acima do
header, em toda página, e o que ela pede é um texto, um link e um botão de fechar.

### O resto, por custo

**Já está escrito, falta ligar.**
- **Category Grid** — `blocks/storefront/storefront-category-grid.tsx` existe e **ninguém o usa**.
- **Image** — um cartaz sem palavras. É o `BANNER` que já existe com o texto vazio.
- **Rich Text** — o `TEXT` de hoje são duas linhas; "rich" quer o editor que a descrição do produto
  já tem em `blocks/catalog/rich-text.ts`.

**Conteúdo novo, mecânica conhecida.**
- **Announcement Bar**, **Testimonials**, **Collection** (um conjunto curado de produtos — uma
  tabela de junção ou uma lista de ids guardada, e a decisão entre as duas é real).

**Conteúdo novo com uma pergunta difícil atrás.** Estes três não são "mais um tipo":

- **Countdown.** A vitrine é pré-renderizada e cacheada. Um contador tem que calcular **no
  navegador** a partir de uma data guardada, nunca no servidor, ou toda loja serve o mesmo número
  congelado pela janela de revalidação. E precisa de uma resposta para "acabou" que não seja um
  bloco mostrando zero.
- **Video.** Um iframe do YouTube numa página anônima e indexada custa peso e leva um cookie de
  terceiro junto. Precisa de uma política antes de um componente.
- **Newsletter.** **Não é um bloco, é uma funcionalidade.** Desenhar a caixa é dez por cento; o
  resto é onde os e-mails vão parar, como o dono os exporta, e consentimento — LGPD, num formulário
  que coleta dado pessoal de estranho.

### A regra que este catálogo precisa ter

Este repositório já carrega **dezesseis chaves declaradas que nada desenha**. Declarar dezesseis
tipos e construir seis é esse mesmo erro numa escala maior, e desta vez com uma gaveta de
componentes na tela prometendo cada um deles.

Então: **o catálogo abre um tipo por vez, e cada um sobe inteiro** — contrato, zod, componente com
história e teste, painel de ajustes. Um tipo que não desenha não entra na gaveta.

### As cores

Hoje são quatro: `background`, `primary`, `text`, `header`. **Não existe cor de rodapé** — o rodapé
pega emprestado o `--shop-header` (`storefront-window.tsx:408`).

O pedido é escolher **header, rodapé e fundo**. Então entra uma cor nova, `footer`, com default
igual ao `header`, para que nenhuma loja existente mude de aparência.

Fica uma pergunta em aberto, e ela é de produto: **`primary` e `text` continuam escolhíveis?**
`primary` pinta todo botão, todo selo de preço e toda seta; `text` pinta as palavras. Se o painel
oferecer só três, esses dois passam a ser derivados — e derivar uma cor de marca é uma decisão
sobre a identidade da loja, não sobre a tela.

---

## Adendo — o contraste responde a pergunta das cores, e apaga o tema dark

> "footer, header, e background, tema dark/light tambem viu se possivel, e se cor de fundo for
> preto as fonters tem que contratastar"

### Não existe tema dark. Existe um fundo escuro que o dono escolheu

Essas duas frases são a mesma frase. Um tema dark é um fundo preto com letras claras; se a letra
**deriva** do fundo, escolher preto já é o tema. Dois mecanismos para um resultado seria dois
lugares para discordarem um do outro — e o primeiro relato seria "escolhi dark e o rodapé ficou
branco".

Então: **um mecanismo.** O dono escolhe três cores; tudo que é escrito por cima de qualquer uma
delas é derivado dela.

### Isto conserta um defeito que já existe

`--shop-background` hoje faz dois trabalhos: pinta a página **e** é a cor de toda palavra escrita
sobre superfície colorida — topo, rodapé, selo de preço, botão do WhatsApp. Funciona enquanto o
fundo é claro e o topo é colorido. **Escolha preto para os dois e a loja fica preto no preto.**

O acerto é por superfície, não global: cada superfície carrega o primeiro plano derivado **dela**.

```
--shop-background  +  --shop-on-background
--shop-header      +  --shop-on-header
--shop-footer      +  --shop-on-footer
--shop-primary     +  --shop-on-primary
```

Cada `--shop-on-*` é branco ou preto, escolhido pela luminância relativa da superfície — a fórmula
da WCAG, que é aritmética e não gosto. Calculado onde as variáveis já são escritas, em
`storefront-window.tsx`, para estar no HTML na primeira pintura: a vitrine é pré-renderizada, e uma
cor decidida depois da hidratação é um flash de texto ilegível em toda visita.

Nada de `#hex` nisso: os dois extremos são `oklch(0 0 0)` e `oklch(1 0 0)`, que é o que as
histórias deste pacote já usam, e o portão `web/no-hex-colors` continua em zero absoluto.

### As cores, decididas

| Cor | Quem decide |
|---|---|
| `background` | o dono |
| `header` | o dono |
| `footer` | **nova**, o dono. Default igual ao `header`, para nenhuma loja mudar de aparência |
| `primary` | o dono. É a cor da marca — botão, preço, seta — e derivar isso seria o produto escolhendo a identidade da loja |
| `text` | **derivado.** Deixa de ser escolha: é o primeiro plano do fundo |

São quatro escolhas, não três, e a diferença é deliberada: `primary` é marca, `text` é legibilidade.

### Product Grid e Category Grid são dois blocos, e nenhum é obrigatório

> "hoje a pagina feed so tem todas os produtos sem opcao de tambem trazer toads as categorias, ou
> somente um ou outro"

`PRODUCTS` e `CATEGORIES` viram dois tipos independentes. A página inicial pode ter os dois, um, ou
nenhum — é a lista que decide, como qualquer outro bloco. `storefront-category-grid.tsx` já está
escrito e sem nenhum importador; ligá-lo é o trabalho.

### Testimonials, Countdown e Newsletter ficam fora

O dono confirmou que os três não existem ainda. Eles entram um por vez, inteiros, e cada um carrega
a pergunta que o adendo anterior nomeou — o relógio contra o cache, o iframe na página indexada, e
o fato de que newsletter é funcionalidade e não bloco.
