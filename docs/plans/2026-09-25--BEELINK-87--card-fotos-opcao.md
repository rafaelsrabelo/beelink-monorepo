# BEELINK-87 — O card público traz até 5 fotos e o resumo da primeira opção

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B11 do épico de listagem. Empilhado sobre o B6 (BEELINK-31). Base para o B10 (passar as fotos no
> card) e o B17 ("4 sabores").

## O pedido

O card só trazia a capa (`imageUrl`). O design pede as fotos para passar (B10) e a linha de variações
("4 sabores", B17). Sem consulta por produto.

## Definição de Pronto

1. `imageUrls`: até `CARD_PHOTOS_MAX = 5` fotos na ordem do lojista; a primeira é a capa, igual a
   `imageUrl`, que continua existindo para a busca e o OpenGraph.
2. `optionSummary`: `{ name, valueCount }` da primeira opção por posição; `null` sem opção.
3. As duas leituras de prateleira mudam juntas: a listagem (`productCardInclude`) e as vitrines da
   home (`SHOWCASE_CARD_SELECT`).
4. O BFF de busca não repassa `imageUrls` ao navegador.
5. Nenhuma consulta por produto, com a contagem medida; o tamanho da home registrado.

## Decisões

### 1. Campos das prateleiras, como `hasOptions`

`imageUrls` e `optionSummary` são opcionais no contrato e vêm só nas prateleiras e vitrines. A página
do produto lê a galeria inteira e as opções completas; o painel também. Um mapeador próprio
(`toShelfCard`) monta o card de prateleira: o `toPublicProductCard` serve linhas do painel e da
página, que trazem as opções inteiras e sem contagem.

### 2. Medição

Uma leitura do catálogo com 24 produtos, contada com `log_statement = 'all'` no Postgres local:

| | Antes | Depois |
|---|---|---|
| Statements da leitura | 22 | 23 |
| Consulta das opções | — | 1, com `productId IN (...)` e a contagem de valores no mesmo statement |
| Consulta das fotos | 1 | 1 (`take 5` em vez de `take 1`) |

Cada vitrine da home ganha o mesmo único statement de opções. Nada roda por produto.

Tamanho do JSON da home (`/stores/:slug/public`), sem compressão:

| Loja | Cards | Antes | Depois |
|---|---|---|---|
| loja-do-design | 24 | 12.037 B | 14.021 B (+16,5%) |
| mutante-performance | 3 | 3.771 B | 4.324 B (+14,7%) |

## Fora de escopo

- Usar os campos no card: B10 (fotos) e B17 ("4 sabores").
- Nota, selo, Pix e parcelas (sem dado).

## Revisão (25/09/2026)

Três leituras independentes, cada achado verificado por um revisor que tentou refutá-lo. Três
distintos, todos corrigidos:

- **`valueCount` conta só valores que uma combinação ativa usa.** Um valor cujas combinações o
  lojista desligou ("não vendo esta") não é escolha para o visitante, e as facetas da mesma prateleira
  já o deixam de fora; contá-lo faria o B17 dizer "2 tamanhos" onde só há um. Um valor esgotado
  continua contando: o "4 sabores" de 5b inclui o sabor que acabou. A contagem filtrada segue no mesmo
  statement.
- **Um teste de ponta a ponta prova as 5 primeiras fotos na ordem do lojista** numa listagem com 6,
  e os testes de unidade conferem o `take` e a ordem das duas leituras.
- **Os comentários das duas leituras** diziam "uma foto"; agora dizem o que elas trazem.
