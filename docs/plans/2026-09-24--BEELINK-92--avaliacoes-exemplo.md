# BEELINK-92 — Avaliações de exemplo: uma fonte só, desligada por padrão

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D13 do épico BEELINK-40 (página do produto). Empilhado sobre o B5 (BEELINK-30).

## O pedido

O dono autorizou mostrar avaliações de exemplo enquanto não existe o domínio de avaliações, para
ver o layout de 5a e 5b. Uma avaliação inventada mostrada a comprador real é propaganda enganosa,
e o BEELINK-58 já recusou "mais vendidos" inventado. Por isso o exemplo vive num lugar só e só
liga onde ninguém compra.

## Definição de Pronto

1. Com a chave desligada, nenhum HTML da vitrine contém nota ou estrela.
2. Com a chave ligada, só as lojas listadas mostram avaliações.
3. Teste de unidade da fonte e da chave; a chave documentada em `.env.example`.
4. O bloco de estrelas existe no design system, com story e teste, para o card (B17), a coluna de
   informações (D6) e a seção de avaliações (D14) usarem.

## Decisões

### 1. Um módulo `server-only`, com a chave no `server-env`

`apps/web/src/lib/storefront-demo.ts` é a única origem: `demoRatingsFor(slug, ids)` para uma
página de cards, `demoReviewsOf(slug, product)` para a página do produto. `STOREFRONT_DEMO_REVIEWS`
e `STOREFRONT_DEMO_SHOPS` passam pelo zod; nenhum ambiente de produção as define. `server-only`
impede a prévia do modo design, que é uma árvore cliente, de importar o módulo: a prévia não
mostra notas.

### 2. Determinístico por id

A nota vem de um hash do id do produto: cards variados numa estante, estáveis entre renders, sem
divergência de hidratação. Os textos das avaliações dizem que são exemplo.

### 3. As páginas calculam e passam por prop

Nada em `components/storefront` importa o módulo. A página de servidor monta um mapa de notas e o
entrega aos blocos como prop tipada. Nada entra em `packages/contracts` nem na API; quando o
domínio existir, só este arquivo muda. Nunca em JSON-LD, meta description ou Open Graph.

### 4. `StorefrontRating` é um bloco de apresentação

Estrelas ★/☆ no token de nota, a média em 600 e a contagem, com nome acessível em texto: "Nota
4,7 de 5, 128 avaliações". Quem o desenha decide onde; este ticket só o cria.

## Fora de escopo

- Qualquer avaliação real, "Escrever avaliação", "Útil" e "Denunciar".
- Ligar a nota no card (B17), na coluna (D6), no filtro (B4) e a seção inteira (D14).

## Adendo — 24/09/2026, o foco muda

O dono despriorizou o layout de avaliações enquanto ele for só visual: a seção (D14) volta quando
as avaliações existirem de verdade na API, e a linha de nota sai do card (B17) e da coluna de
informações (D6). A prioridade passa a ser filtros avançados, carrinho e conta do cliente.

Este ticket fecha como estava: a fonte e o bloco existem, e nada os liga. Com a chave desligada, que
é o padrão, a vitrine não muda. Quando o domínio de avaliações existir, `StorefrontRating` segue
útil e `storefront-demo.ts` é apagado.

`server-only` entra como dependência do web: é o pacote marcador que a documentação do Next indica,
e o teste o substitui por um módulo vazio, porque ele lança fora de um ambiente React Server.
