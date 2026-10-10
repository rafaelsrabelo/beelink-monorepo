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

## 09/10/2026, mais tarde — como ficou, a cobertura e o que foi visto no navegador

### O que mudou ao escrever

- **Este plano foi escrito com o código já em andamento**, não antes. O pedido chegou em duas mensagens: a primeira ("pode ser vinculado ao produto") levou a um desenho em que o percentual do produto *substituía* o da loja; a segunda ("tem que ser configurável: % no produto ou de forma geral") trocou esse desenho pelo modo da decisão 1, antes de qualquer commit.
- **`earningOf` e `quotedCashbackOf` passaram a receber as partes do pedido** (`EarningParts`, agora com as linhas), e não mais dois números soltos. Quem chama é o mesmo de antes: a colocação do pedido e a cotação.
- **A coluna da listagem e o campo do cadastro são blocos próprios** (`product-cashback-cell`, `product-cashback-field`, este já com o seu card). Para a tabela voltar a caber em 250 linhas, os três botões da linha (ver, editar, excluir) saíram para `product-row-actions`, sem mudar o que fazem. A tabela tinha 272 linhas antes deste ticket; ficou com 239.
- **Um campo recusado deixa de ficar marcado quando é digitado de novo.** Visto no navegador: depois de "150" recusado, o "10" certo continuava em vermelho até o próximo Salvar. `ProductEditorScreen` agora limpa as recusas ao digitar. Vale também para o preço, que tinha o mesmo comportamento.
- **A página do produto na vitrine não mudou**: quem calcula a regra do produto é `StorefrontProductLive`, que já recebia o produto e o cashback da loja.

### Cobertura da Definição de Pronto

| # | Evidência |
|---|---|
| 1 | `apps/api/prisma/migrations/20261009230000_cashback_by_product/migration.sql` (`mode` com padrão `STORE`); `cashback.e2e-spec.ts` "reads the defaults…" |
| 2 | `cashback-settings-form.tsx`; `cashback.test.tsx` "chooses between one rate and by product…"; `cashback-screen.test.tsx` "saves giving it by product…"; `cashback.e2e-spec.ts` "saves giving it by product, and keeps the one rate…" |
| 3 | `product.dto.ts` (`cashbackRateBps`, 1 a 10000) e o CHECK da migration; `cashback-orders.e2e-spec.ts` "refuses a product's rate of %s" e "clears a product's rate with null…" |
| 4 | `product-editor.test.tsx` "asks the product's cashback only when the shop gives it by product, whatever its variations"; `product-cashback-field.test.tsx`; `product-form-mapping.test.ts` |
| 5 | `product-table.test.tsx` "says each product's cashback, and offers to add one…" e "has no cashback column in any other shop"; `product-cashback-cell.test.tsx` |
| 6 | `cashback-earning.spec.ts` "earning by product" (seis casos); `cashback-orders.e2e-spec.ts` "earns on the products that have a rate…" e "earns nothing on an order of products with no rate…" |
| 7 | `cashback-earning.spec.ts` "reads no product's own rate while the shop gives one rate"; `cashback-storefront.e2e-spec.ts` "keeps a product's rate unread…"; todos os testes de cashback que já existiam passam sem mudar o valor esperado |
| 8 | `cashback-earning.spec.ts` "holds the shop's minimum against the whole order…" |
| 9 | A cotação e o pedido chamam o mesmo `earningPartsOf`; `cashback-storefront.e2e-spec.ts` "quotes nothing for a product with no rate, and its own rate once it has one" |
| 10 | `product-cashback.test.ts`; `storefront-product-live.test.tsx` "says what the purchase earns at the product's own rate…"; `cashback-tab-view.test.ts` "says the cashback is by product…" |
| 11 | `cashback-earning.spec.ts` "…records the order's average" e "records a rate of at least one basis point…"; `cashback-orders.e2e-spec.ts` (`rateBps: 333`) |
| 12 | Três blocos novos, cada um com `.stories.tsx` e `.test.tsx` (com axe); `locales/pt-BR.ts` e `locales/en.ts` |
| 13 | Acima; `docs/product/README.md` (Cashback), `packages/ui/docs/README.md`, `apps/web/docs/README.md` |
| 14 | `pnpm ci-check` verde; o navegador, abaixo |

### O que foi visto no navegador

Numa loja de teste local (API e web deste branch, banco próprio), em 1440 px e em 390 px:

- Tela Cashback: "Um percentual para a loja toda" vem marcado; ao ligar e escolher "Por produto" o campo "Quanto volta (%)" some, aparece o texto com "Definir nos produtos" e o exemplo vira "Em cada produto, o cliente ganha o percentual definido no cadastro dele." Salvou.
- Listagem de produtos: sem coluna Cashback enquanto o cashback estava desligado; com ela depois, e "Adicionar cashback" nas três linhas.
- "Adicionar cashback" abriu o produto com o foco no campo, já visível na tela. "150" foi recusado no campo, sem enviar; "10" salvou e a listagem voltou mostrando 10%, sem recarregar. O mesmo com "2,5" em outro produto.
- "Novo produto" mostra o campo.
- Vitrine: o produto de R$ 149,90 a 10% diz "Ganhe até R$ 14,99 de cashback nesta compra"; o de R$ 89,90 a 2,5%, "R$ 2,24"; o produto sem percentual não diz nada.
- Em 390 px nem a tela Cashback nem o cadastro do produto rolam para o lado.

### O que não foi conferido

- A aba Cashback da conta do cliente e a linha de cashback do carrinho não foram abertas no navegador: estão cobertas por teste de unidade e pelo e2e da cotação.
- A suíte e2e inteira da API foi rodada duas vezes neste ambiente e falhou em 12 e depois em 14 testes, de arquivos diferentes a cada rodada, quase todos por e-mail que não chegou a tempo (o Mailpit é dividido com outro worktree). Os seis arquivos de cashback passam. Os arquivos que falharam na segunda rodada, e dois da primeira, passaram rodados à parte, menos `meta-pixel-without-vault-key`, que depende do `.env` local; `custom-domain` começa conferindo esse mesmo `.env` e não foi rodado de novo. Nem todos os que falharam na primeira rodada foram anotados. Vale conferir o job `api` do CI.
- O e2e do web (Playwright) não foi rodado.
