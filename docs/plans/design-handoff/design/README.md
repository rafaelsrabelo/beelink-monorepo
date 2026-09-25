# Design 5a e 5b — loja com filtros e página do produto

> **Tier:** plans — snapshots do desenho no dia em que foram copiados (24/09/2026), fora do `docs-gate`.

Os dois artboards vieram do Claude Design "bee-link — fluxos de criação, modo design e variações"
(https://claude.ai/artifact/9RvT4GnPGNWG7JfoGjdFE3), a 1440 de largura. São a referência visual
da rodada de layout (épicos B, D e E). Os estilos estão inline, com os valores exatos.

| Arquivo | Artboard |
|---|---|
| `5a-loja-produtos-filtros.html` | 5a · /produtos — busca com filtros avançados (1440 × 2240) |
| `5b-loja-pagina-produto.html` | 5b · /produtos/[produto] — página do produto (1440 × 2680) |

Os arquivos são `.dc.html`: abrem num navegador como HTML comum, mas os trechos `<sc-for>` e
`{{…}}` são preenchidos pelo runtime do Claude Design. O que importa aqui é a estrutura e os
estilos inline; os dados (marcas, notas, avaliações) são exemplos do desenho, não do produto.

## Notas do designer

**5a (s4):** Filtros saem dos dados que a loja já cadastra: categoria, preço, marca e as opções das variações (sabor, tamanho). Cada filtro mostra a contagem e some quando não tem resultado. Filtros ativos viram chips no topo. Avaliações precisam de uma função nova (nota + comentário após a compra).

**5b (s5):** Página do produto em 3 colunas: fotos | informações e variações | caixa de compra fixa. Sabor e tamanho mostram o preço de cada opção. O pedido termina no WhatsApp, então a caixa avisa isso. Abaixo: compre junto, relacionados, ficha técnica, avaliações.
