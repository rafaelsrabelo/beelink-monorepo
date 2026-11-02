# Ordenar os produtos na vitrine

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio direto, sem um BEELINK. O número entra num adendo quando existir.

## O pedido

Rafael, 02/11/2026: "Eu como admin no https://beelink.biz/admin/lecomcre/products quero poder ordenar
meus produtos na vitrine".

## O que já existe, e o que falta

Quase tudo, menos o que o lojista toca:

- **Banco e API:** `products.position`, `PUT /api/stores/:slug/products/reorder` (a lista inteira, uma
  vez cada, ou `409 CATALOG_REORDER_MISMATCH`). Produto novo entra no fim.
- **BFF:** `PUT /api/stores/[slug]/products/reorder`, que derruba o cache da vitrine num 200.
- **Vitrine:** a ordem padrão do catálogo e das vitrines de todos os produtos, de categoria e de
  promoção já é `position`.
- **Falta:** nenhuma tela chama essa rota. O painel não tem como mudar `position`.

Nenhuma forma nova na rede, nenhuma migration: `packages/contracts` e o schema não mudam.

## Definition of Done

1. Em `/admin/<slug>/products`, "Ordenar vitrine" leva a `/admin/<slug>/products/order`.
2. A tela lista **todos** os produtos da loja na ordem atual, inclusive numa loja com mais de uma
   página da API (96), e marca rascunho e esgotado, que guardam o lugar mas não aparecem na vitrine.
3. Um produto muda de lugar arrastando (mouse e toque), pelo teclado e pelos botões de subir, descer e
   ir para o topo.
4. Nada é gravado até "Salvar ordem". "Desfazer" volta à ordem salva. Sem mudança, os dois ficam
   desligados.
5. Salva, a ordem é a que o visitante vê na loja, sem esperar o cache vencer, e a lista do painel
   segue a mesma ordem.
6. Se um produto entrou ou saiu da loja enquanto o lojista ordenava, a recusa vira uma frase, a lista
   se ajusta sem perder o que ele arrumou, e ele salva de novo.
7. Sair da tela com mudança por salvar pergunta antes.
8. A carga é skeleton. Uma loja sem produto, ou com um só, diz que não há o que ordenar.
9. `pnpm ci-check` verde; bloco com story e teste com axe.

## Decisões

- **Uma tela própria, não arrastar na tabela.** A tabela é paginada e filtrada, e a API pede a lista
  inteira: arrastando numa página de 20 não dá para levar um produto da página 3 para o topo, e numa
  lista filtrada a ordem resultante nem está definida. Além disso, a tabela rola de lado no celular,
  onde o lojista também trabalha, e um gesto de arrastar ali compete com a rolagem. Uma lista de uma
  coluna resolve os dois. A tela é um endereço, como `products/new`.
- **Salvar com um botão, não a cada soltar.** Cada gravação reescreve a posição de todos os produtos e
  derruba o cache da vitrine inteira. Arrumar dez produtos seriam dez reescritas e a vitrine mudando no
  meio do caminho. É o mesmo pacto de "rascunho e Publicar" do modo design.
- **Ler a loja inteira andando pelas páginas da API que já existe**, de 96 em 96, numa função de
  `catalog-requests.ts`. Uma rota enxuta economizaria bytes numa loja grande, mas é uma forma nova na
  rede para um ganho que ninguém mediu. Se pesar, ela entra depois sem mudar a tela.
- **Rascunho e esgotado aparecem, marcados.** A API exige todos na lista, e esconder um produto
  esgotado deixaria o lojista sem saber onde ele volta quando o estoque voltar.
- **Botões além do arrastar.** Numa loja de 300 produtos, arrastar do fim ao topo é longo, e "ir para o
  topo" é o gesto mais comum: o lojista sabe o que quer vender primeiro.
- **A ordem que aparece é rascunho sobre o servidor.** A tela guarda só os ids que o lojista arrumou. Se
  a lista muda por baixo (outra aba, recarga ao voltar à janela), o que saiu some e o que entrou vai para
  o fim, a mesma regra da API para um produto novo.

## Fora do escopo

- **Ordenar as categorias.** A rota também existe sem tela, mas é outro pedido.
- **Ordem dentro de cada categoria.** `position` é uma só por loja, e uma categoria mostra os seus nessa
  mesma ordem. Ordem por categoria seria outra coluna e outro modelo.
- **Vitrines de novidades e de seleção manual.** Continuam como são: as mais novas primeiro, e a ordem
  da própria seleção. A tela avisa, para ninguém procurar um defeito.
- **Busca e filtro dentro da tela de ordenar.** Um filtro esconderia linhas de uma lista cuja ordem é
  inteira.

## Adendo, 02/11/2026: ver como na vitrine

Rafael, com a tela de lista já de pé: "poderia ter opcao de visualizar com ota vitrine de produtos no
site, e poder ir arrastando pra ajudar, ter opcao de visualizar assim e editar ordenacao, o que voce
sugere?"

O que ficou decidido:

- **Dois modos na mesma tela, sobre a mesma ordem por salvar.** "Lista" e "Como na vitrine", e trocar de
  modo não perde nada. O modo fica no endereço (`?view=shelf`), como a regra manda para abas. A lista
  continua sendo o padrão: é a que serve numa loja longa e no celular.
- **O card de verdade.** `StorefrontProductCard`, nas colunas de uma vitrine em grade e com as cores e a
  fonte da loja, e com o link desligado. Um desenho parecido envelheceria longe do real.
- **No modo vitrine, o mouse pega o card em qualquer ponto e o dedo só pela alça.** Uma grade de cards
  enche o celular: se o dedo no card arrastasse, a página não rolaria.
- **Rascunho e esgotado aparecem também aqui**, marcados, pela mesma razão da lista. Por isso é "como na
  vitrine", e não a vitrine exata.
- **Não é o preço de promoção.** O card usa o preço que o painel lê, sem as promoções em andamento:
  calcular isso aqui seria outra leitura, e o que se decide nesta tela é o lugar.

A DoD ganha uma linha:

10. Em "Como na vitrine", os mesmos produtos aparecem nos cards da loja, com as cores dela, e arrastar
    muda a mesma ordem da lista. Trocar de modo não perde o que foi arrumado.

Também saiu daqui um conserto de fora do escopo, em commit próprio: a fixture de cashback de
`order-detail` vencia em 26/10/2026 e deixava o teste do pacote `ui` vermelho para todo mundo.
