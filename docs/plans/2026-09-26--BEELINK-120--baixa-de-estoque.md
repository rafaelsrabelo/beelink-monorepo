# BEELINK-120 — O pedido baixa o estoque, e cancelar devolve

*Escrito em 2026-09-26, ao começar o ticket. Épico H.*

## O que muda

Registrar um pedido tira do estoque as variações que a loja conta, na mesma transação do pedido.
Cancelar devolve. Assim o estoque continua sendo o que a prateleira diz, agora que pedidos existem.

## Definição de Pronto

1. Criar o pedido desconta `stockQuantity` das variações com `trackStock`, na mesma transação.
2. Cancelar devolve o que o pedido tirou.
3. Uma variação que não conta estoque não muda.
4. Vender mais do que há é recusado, e a tela diz quanto há de cada linha.

## Decisões

- **A decisão do ticket: vender além do estoque é recusado.** A proposta do próprio ticket: a tela
  mostra o disponível, e um número errado é do lojista corrigir no estoque. Um pedido que deixasse o
  estoque negativo esconderia o erro.
  - A recusa é `409 ORDER_STOCK_INSUFFICIENT`, com cada linha curta e o disponível em `details`.
  - Para isso, `ApiErrorBody` ganha um `details` opcional. O filtro de erros só o repassa quando vem
    de uma recusa do próprio serviço.
- **O formulário avisa antes.** Cada linha sabe quanto há ("Só há 3 em estoque"), e o Salvar espera.
  Se o estoque mudou desde que o produto foi lido, a recusa atualiza as linhas.
- **Corrida:** o pedido já trava a loja para numerar. O estoque é lido depois de travar os produtos
  (na mesma ordem, por id), então dois pedidos pelo último item não vendem os dois.
- **Pedido antigo:** a coluna `orders.stockTaken` diz se o pedido tirou estoque. Os pedidos de antes
  deste deploy ficam com `false`, e cancelar um deles não devolve o que nunca foi tirado.
- **O cache do produto** (preço e estoque somados das variações) é refeito na mesma transação, como
  qualquer edição do catálogo faz.

## Fora do escopo

- Reservar estoque para um pedido "Recebido" pelo checkout (H9, que espera uma resposta).
- Devolver estoque ao editar um pedido: um pedido não se edita, só muda de status.
