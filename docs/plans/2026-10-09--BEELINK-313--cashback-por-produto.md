# BEELINK-313 — Cashback por produto

09/10/2026. Pedido do Rafael, olhando a tela de Cashback da Mutante: "Cashback PODE ser vinculado ao
produto" e, em seguida, "aqui tem que ser configurável pra dizer, vai ser % no produto, ou de forma
geral; se tiver ligado e configurado pro produto, na tela de produtos posso editar/criar o cashback
do produto; pode na listagem dar um gatilho pra ADICIONAR CASHBACK".

Era o item 4 do "fica para depois" do Épico U (`2026-10-01--BEELINK-237--cashback.md`): percentual
por produto. Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`.

## Definição de Pronto

1. As regras de cashback da loja dizem **como** ele é dado: um percentual para a loja toda (como hoje) ou por produto. Toda loja existente continua no primeiro.
2. Na tela Cashback o lojista escolhe entre os dois. Em "por produto", o campo "Quanto volta (%)" some, a tela diz que cada produto tem o seu e leva aos produtos; o percentual geral já salvo é guardado.
3. O produto guarda o seu percentual, de 0,01% a 100%, ou nenhum. A API recusa o que estiver fora disso.
4. Com o cashback ligado e por produto, o cadastro do produto (novo e edição, com ou sem variações) mostra "Cashback deste produto (%)". Fora desse caso o campo não aparece e o que estava salvo é preservado.
5. Com o cashback ligado e por produto, a listagem de produtos tem a coluna Cashback: o percentual de cada um, ou "Adicionar cashback", que abre o produto já no campo.
6. Por produto, o pedido ganha, item a item, o percentual do produto sobre o que foi pago em dinheiro por aquele item; produto sem percentual não ganha nada. Cupom, desconto manual e crédito usado são repartidos entre os itens na proporção do valor de cada um.
7. No modo "loja toda", o percentual do produto não é lido: o pedido ganha exatamente o que ganhava antes.
8. O mínimo do pedido, a validade e o quanto o crédito paga continuam sendo da loja, sobre o pedido inteiro.
9. A cotação do carrinho promete o mesmo que o pedido registra.
10. Na vitrine, a página do produto diz o cashback com o percentual daquele produto; sem percentual, não diz nada. A aba Cashback da conta do cliente diz que o cashback é por produto, e não um percentual que não vale.
11. O pedido registra o percentual médio a que ganhou, que é o que o painel mostra.
12. Blocos novos em `packages/ui` com story e teste; textos em pt-BR e inglês.
13. Testes: unidade e e2e da API; unidade do web e do ui. Documentos: `docs/product/` e os mapas.
14. `pnpm ci-check` verde; as telas usadas num navegador.

## Decisões

1. **Um modo, não uma mistura.** `CashbackSettings.mode`: `STORE` ou `PRODUCT` (enum `CashbackMode`, padrão `STORE`). O pedido foi "% no produto, **ou** de forma geral". Em `PRODUCT`, produto sem percentual **não gera cashback**: não há percentual geral por trás. É o que dá sentido ao "Adicionar cashback" da listagem. *(Decisão minha; a alternativa era o produto sem percentual herdar o geral.)*
2. **O percentual geral é guardado em `PRODUCT`** (`rateBps` continua obrigatório no `PUT`, a tela reenvia o que estava salvo), e **o percentual do produto é guardado em `STORE`**. Trocar de modo e voltar não perde nada.
3. **O percentual é do produto, não da variação**: `Product.cashbackRateBps Int?`, com CHECK de 1 a 10000. Não entra no cache por variação; por isso o campo tem um card próprio no cadastro, e não fica no card Preço, que some quando o produto tem combinações.
4. **Sem 0%.** Vazio já é "não gera"; um zero seria uma segunda forma de dizer a mesma coisa.
5. **A conta, item a item.** `earned = floor(Σ(líquido_i × taxa_i) × base ÷ (Σ líquido_i × 10000))`, onde `líquido_i` é o item depois da promoção dele e `base` é o que já era: produtos menos promoções, cupom (não o de frete grátis), desconto manual e crédito usado. É o mesmo que tirar os descontos do pedido de cada item na proporção do seu valor. Em `STORE` a fórmula se reduz à de hoje, centavo por centavo. Em BigInt: centavos × pontos-base × centavos passa do que um double guarda inteiro.
6. **O pedido registra a média** (`Order.cashbackRateBps`): a média dos percentuais ponderada pelo valor de cada item, arredondada ao ponto-base, no mínimo 1 quando o pedido ganhou algo (o CHECK do pedido não aceita 0). Em `STORE` é o percentual da loja, como sempre. A cotação abaixo do mínimo diz a mesma média ("faltam R$ X para ganhar Y%"), e não diz nada quando nenhum produto do carrinho tem percentual.
7. **O item do pedido não guarda o percentual.** O que o pedido ganhou está no pedido e no lote; a divisão por item não é mostrada em lugar nenhum.
8. **Vitrine.** `PublicCashback` ganha `mode`; `PublicProduct` ganha `cashbackRateBps` (não o cartão da grade). A regra que a página do produto usa é uma função pura do web, `productCashbackRuleOf`. O cartão da grade continua sem dizer cashback, como hoje.
9. **"Adicionar cashback" leva ao cadastro do produto, com o foco no campo** (`#product-cashback`), e não abre um diálogo na listagem: o percentual é digitado onde o produto é editado, e a regra do painel é formulário em rota própria.
10. **O campo aparece só com o cashback ligado e por produto**, lido de `GET /stores/:slug/cashback` (a mesma consulta da tela Cashback). Enquanto a consulta não chega, o campo não aparece.

## Fora deste ticket

Percentual por categoria ou por variação; cashback em valor fixo (R$) por produto; edição em massa; dizer o cashback no cartão da grade; filtrar a listagem por "sem cashback".

## Riscos

- Uma loja que passa para "por produto" sem preencher nenhum produto deixa de dar cashback em tudo. A tela diz isso ao lado da escolha, e a listagem mostra "Adicionar cashback" em cada linha.
- O percentual médio do pedido pode ser um número quebrado (3,33%) no detalhe do pedido.
