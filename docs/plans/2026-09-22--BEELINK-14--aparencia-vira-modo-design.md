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
