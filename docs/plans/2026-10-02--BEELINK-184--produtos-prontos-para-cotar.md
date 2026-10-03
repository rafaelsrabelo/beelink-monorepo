# BEELINK-184 — N3: produtos prontos para cotar

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o N2 (BEELINK-183, PR #183), que guardou a embalagem padrão
> da loja.

## Definição de Pronto

1. Com o Melhor Envio conectado, a lista de produtos do painel marca, em cada linha, o produto que
   não pode ser cotado por transportadora, dizendo por quê:
   - **sem peso**: alguma variação ativa não tem peso;
   - **sem medidas**: alguma variação ativa não tem as três medidas e a loja não tem embalagem padrão.
2. Sem o Melhor Envio conectado, a lista não marca nada: a loja não vende por transportadora.
3. A regra mora num lugar só, na API, e é a mesma que a cotação (N4) vai usar.
4. Testes: a regra (unitário), a lista (e2e), a linha da tabela (ui, com axe), a tela; `pnpm ci-check`
   verde.

## O que entra

- **contracts:** `CarrierGap` (`NO_WEIGHT` | `NO_SIZE`) e `ProductPage.carrierGaps`: null sem Melhor
  Envio conectado; com ele, um mapa do id do produto para o que falta (só os que faltam algo).
- **API:**
  - `integrations/carrier-readiness.ts`: `carrierGapOf(variações, temEmbalagemPadrão)`, pura.
  - `MelhorEnvioSettingsService.carrierContextOf(storeId)`: se a loja tem conexão e se tem embalagem
    padrão. O catálogo pergunta por aqui, sem ler as tabelas da integração.
  - A lista do painel (`ProductsService.list`) lê as variações ativas dos produtos da página e monta
    o mapa — uma consulta a mais, só com o Melhor Envio conectado.
- **ui:** a célula do nome da tabela vira um componente (`product-name-cell.tsx`), que mostra a
  marca embaixo do nome. A tabela já passava de 250 linhas; assim ela diminui.
- **web:** a tela passa a marca de cada linha para a tabela.

## Decisões deste ticket

1. **Qualquer variação ativa sem peso marca o produto.** O cliente escolhe a variação no carrinho, e
   a cotação daquela variação falharia. Variação arquivada ou desligada não conta.
2. **"Conectado" inclui "precisa reconectar".** A loja escolheu vender por transportadora; a marca
   continua valendo enquanto ela reconecta.
3. **A marca fica na linha, sem filtro novo.** Um filtro "não cotáveis" pede a regra em SQL, com as
   variações e a embalagem; fica para quando uma loja tiver produtos demais para achar na página.
4. **O produto continua vendável.** A marca só diz que ele não aparece com frete por transportadora;
   entrega local e retirada seguem valendo (N4).

## Fora de escopo

- Um aviso no formulário do produto (o campo de peso já diz "Em gramas, com a embalagem").
- O filtro na lista (decisão 3).
- A cotação em si (N4).
