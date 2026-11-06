# Carrinho e checkout em páginas próprias, com "Você também pode gostar"

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: pedido do Rafael de 06/11/2026, com os prints do fluxo da Ceyó como referência.

## O pedido

Rafael, 06/11/2026: "Esse cabeçalho quebra a experiência de compra na finalização… O checkout é pra ser página
só dele… o carrinho é o carrinho, o checkout é o checkout". E, sobre o carrinho: "na página do carrinho eu tenho
Você também pode gostar e poder adicionar junto ali no carrinho naquele momento". Em seguida: "Produtos =>
Carrinho => Checkout são páginas pra cada".

## O desenho

**Três páginas:** a vitrine, o carrinho (`/<loja>/carrinho`) e o checkout (`/<loja>/checkout`).

- **O carrinho** tem as linhas (quantidade e remover), o resumo com "Total estimado", "em até 6x de… sem juros",
  "Frete calculado no checkout" e o botão **Finalizar compra**, que leva ao checkout com o cupom. Embaixo, **"Você
  também pode gostar"**: produtos da loja que não estão no carrinho, com o "+" que põe no carrinho sem sair dele.
  O preço do carrinho é o da retirada: o frete só existe depois do endereço, que é do checkout.
- **O checkout** não tem o cabeçalho da loja (busca, menu, faixa de aviso, rodapé). Tem uma barra com a logo,
  que volta para a loja, e a sacola, que volta para o carrinho. Embaixo, o **"Resumo (N) R$ X"**, que abre e
  fecha no celular e fica aberto ao lado no computador, com as linhas, os valores e "Editar carrinho". Depois, o
  cupom ("Inserir cupom de desconto") e as três etapas de sempre: identificação, entrega e pagamento.
- `checkout` é a mesma palavra em todo vocabulário, como `lp`: a API já a reserva, e nenhuma categoria a toma.
- Toda volta que antes era para o carrinho — entrar, criar conta, alterar os dados, salvar um endereço, a
  identificação de quem compra sem conta — agora é para o checkout, com o cupom.
- O checkout de um carrinho vazio leva ao carrinho.
- "InitiateCheckout" passa a ser contado ao abrir o checkout, e não mais ao abrir o carrinho.

## O que fica de fora

- Cupom digitado no carrinho: o cupom vem pelo endereço (a faixa de primeira compra) e aparece aplicado no
  resumo; digitar ou trocar é no checkout.
- Escolher os produtos sugeridos por categoria: a lista é o catálogo na ordem da loja, sem o que já está no
  carrinho. Para as lojas de hoje, de poucos produtos, é o que faz sentido.
