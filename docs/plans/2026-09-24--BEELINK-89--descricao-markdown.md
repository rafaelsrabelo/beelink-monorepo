# BEELINK-89 — A descrição do produto mostra o texto formatado

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D10 do épico BEELINK-40 (página do produto). Rodada de layout dos desenhos 5a e 5b.
> Empilhado sobre o E1 (BEELINK-73).

## O pedido

A página do produto imprime a descrição crua. No "100% Whey Protein Concentrado" aparecem
`**Destaques do produto**` e `- Proteína de alta qualidade` com os asteriscos e os traços. A meta
description e o Open Graph mandam o mesmo markdown para o Google e para o WhatsApp.

O cadastro grava a descrição em markdown de propósito: texto puro em repouso não tem nada para
sanitizar. O que faltava era a outra metade da promessa, o renderizador da vitrine.

## Definição de Pronto

1. Nenhum `**` nem `- ` literal na página do produto; negrito, itálico, listas e links aparecem
   como o lojista escreveu.
2. A meta description e o og:description são texto puro, cortados numa palavra.
3. O parser tem uma gramática só, compartilhada pelo editor do painel e pela vitrine, com teste
   de unidade cobrindo listas separadas por linha em branco, links não-http recusados e um `*`
   solto no texto.
4. O bloco tem story e teste com axe. `pnpm ci-check` verde.

## Decisões

### 1. Um parser, em `lib/markdown.ts`, que devolve dados e não marcação

`parseMarkdown` lê a gramática que o editor escreve (parágrafos, listas `- ` e `1. `, `**`, `_`,
`[texto](https://…)`, escape com barra) e devolve blocos. Nada no resultado é HTML. O editor do
painel (`domHtmlFromMarkdown`) e a vitrine (`StorefrontRichText`) desenham a partir dos mesmos
blocos, cada um do seu jeito. Os testes de ida e volta de `rich-text.test.ts` continuam valendo.

### 2. A vitrine desenha elementos, nunca `dangerouslySetInnerHTML`

`StorefrontRichText` transforma os blocos em `<p>`, `<ul>`, `<ol>`, `<strong>`, `<em>` e `<a>`.
As palavras são texto React: um `<script>` na descrição vira nove caracteres na página. Um link
abre em outra aba, sem referrer: é o lojista saindo da loja.

### 3. Itens separados por linha em branco são uma lista só

O dado real das primeiras lojas, colado de outro lugar, tem uma linha em branco entre cada item.
Cinco listas de um item leriam como cinco marcadores com um vão entre eles. O parser junta itens
consecutivos do mesmo tipo numa lista.

### 4. A meta description corta numa palavra

`plainTextOf` dá as palavras, com um espaço entre elas. A página corta em 160 caracteres, no
último espaço, com reticências.

## Fora de escopo

- Imagens na descrição: a API não guarda nenhuma.
- "Sobre este item" a partir da primeira lista (D6, BEELINK-46); `firstListOf` já está pronto.
- A seção `#descricao` de 5b, lado a lado com as informações técnicas (D8, BEELINK-48). A
  descrição continua onde está, com a tipografia de 5b (15px, entrelinha 1.6, tinta a 85%).
