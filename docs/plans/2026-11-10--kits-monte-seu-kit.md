# Kits: o cliente monta o kit escolhendo os sabores

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: pedido do Rafael em 10/11/2026, a partir da loja Dindin da Leia.

## O pedido

Rafael, 10/11/2026: "na loja do dindin da leia, posso comprar kits, e os kits têm um desconto… em vez de botar 10
dindin eu compro kit com 10… porém não consigo escolher os produtos do kit. Como pensar isso no admin pra refletir na
página?"

Hoje o kit é um produto comum ("Kit Festa – até 20 sabores", R$ 139,80) e cada sabor é um produto à parte (R$ 7,00 a
R$ 10,20). O cliente compra o kit sem dizer quais sabores quer.

## Decidido com o Rafael

- **Preço fixo do kit**: o kit custa o que a loja definiu, qualquer que seja a mistura de sabores.
- **Os sabores vêm de uma categoria**: a loja escolhe uma (ex.: Dindins) e todo produto dela entra no kit — um sabor
  novo entra sozinho.
- **Pode repetir sabor**: num kit de 20, o cliente escolhe 20 unidades como quiser.

## O desenho

**No painel**, no produto: "É um kit", com quantos itens tem e de qual categoria vêm os sabores. O preço é o do
próprio produto.

**Na página do kit**: "Monte seu kit — escolha 20", os sabores com foto e − n +, o contador "12 de 20", e "Adicionar
kit ao carrinho", que só libera no 20. Sabor esgotado aparece desativado; um produto com opções (variações) não entra
no kit na primeira versão.

**No carrinho**: uma linha "Kit Festa (20)" com os sabores embaixo e "Editar kit". Dois kits com sabores diferentes
são duas linhas.

**No pedido**: o kit é uma linha ao preço do kit, e os sabores vão com ela — no painel, na página do pedido, no
comprovante, nas mensagens de WhatsApp e nos e-mails. O estoque baixa de cada sabor escolhido, e volta se o pedido for
cancelado.

## Em dois PRs

1. **API e painel**: o produto vira kit; o pedido e a cotação aceitam a composição, conferem a categoria, a soma e o
   estoque de cada sabor, e gravam os sabores com o item.
2. **Loja**: "Monte seu kit" na página do produto, o carrinho com a composição, e os sabores em todo lugar que mostra
   itens de pedido.

## Revisto no mesmo dia: uma regra, e não uma categoria

Rafael, ao ver o painel: "o kit só pode ter uma categoria? E se eu quiser várias categorias, ou todos os produtos?
Hoje todos os produtos, exceto de uma categoria, podem ser pedidos". A categoria única virou uma regra, com três
opções:

- **Todos os produtos da loja.**
- **Só destas categorias**, uma ou várias.
- **Todos, menos estas categorias** — o caso da Dindin da Leia.

Uma subcategoria acompanha a categoria marcada, um produto novo segue a regra sozinho, e nenhum kit entra em outro.
