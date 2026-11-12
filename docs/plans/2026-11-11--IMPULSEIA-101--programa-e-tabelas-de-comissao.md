# IMPULSEIA-101 (AF1) — o programa de afiliados e as tabelas de comissão

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A primeira tarefa do épico [Afiliados](2026-10-24--afiliados.md). O desenho comum está lá, com os
> adendos de 11/11; aqui fica só o que esta tarefa entrega e por que tem esta forma.

## O pedido

AF1 do épico: o programa da loja (ligado, prazos, termos) e as tabelas de comissão (a Padrão, as
condições especiais e o percentual por produto). Schema, contracts e o módulo `affiliates` na API.
Nenhuma tela: o painel é AF2.

## Definition of Done

1. `apps/api/prisma/schema/affiliate.prisma` declara `AffiliateProgram`, `CommissionTable` e
   `CommissionTableRate`, e a migração chega junto, com os `CHECK` dos limites e o índice parcial de
   uma Padrão por loja.
2. `packages/contracts/src/affiliate.ts` declara o programa, o que o formulário grava, as tabelas, as
   taxas, os períodos de pagamento e os códigos de erro; a API implementa com `satisfies`/`implements`.
3. `GET /stores/:slug/affiliate-program` responde ao dono o programa, as tabelas e os três períodos do
   mês corrente com o vencimento de cada um. Uma loja que nunca abriu o programa recebe os padrões
   (desligado, 30 dias de atribuição, 10 de prazo, sem termos) e uma tabela Padrão de 10%.
4. `PUT /stores/:slug/affiliate-program` grava o programa inteiro. A versão dos termos sobe só quando o
   texto muda. Um valor fora da faixa responde `400 AFFILIATE_PROGRAM_INVALID`.
5. Tabelas: criar, ler com as taxas, mudar nome e percentual geral, apagar. A Padrão não se apaga
   (`409 COMMISSION_TABLE_DEFAULT`); um nome repetido na loja é `409 COMMISSION_TABLE_NAME_TAKEN`; a
   51ª tabela é `409 COMMISSION_TABLE_LIMIT`.
6. Taxa por produto: gravar de 0% a 100% (0% é "este produto não paga comissão") e apagar, que volta ao
   percentual geral da tabela. Produto de outra loja é `404 PRODUCT_NOT_FOUND`; apagar o produto apaga
   as taxas dele.
7. Só o dono: outra conta é `403 STORE_FORBIDDEN`, sem sessão `401`, loja inexistente `404`. As rotas
   nascem fechadas a uma página travada por falta de pagamento (regra 12 do `apps/api/AGENTS.md`).
8. O calendário é uma função pura com teste: 1–10, 11–20, 21–último dia; vencimento = último dia do
   período + prazo; fevereiro, a virada de ano e prazo 0.
9. `afiliado` entra nos slugs reservados de loja.
10. O mapa de superfície da API (`apps/api/docs/README.md`) ganha o módulo; `pnpm ci-check` verde e o
    e2e do módulo verde.

## Decisões

### O programa e a Padrão nascem na primeira leitura

Uma loja sem linha de programa não lê só padrões, como o cashback: na primeira vez que o dono abre
qualquer rota do programa, a linha e a tabela Padrão são criadas, desligadas.

*Por quê:* a Padrão precisa de um id desde o primeiro momento, porque é nela que o campo "Comissão de
afiliado (%)" do produto (AF2) grava, e uma tabela virtual sem id pediria uma segunda rota só para
ela. A criação é `INSERT … ON CONFLICT DO NOTHING` nos dois casos, então duas leituras ao mesmo tempo
não criam duas Padrões, e o índice parcial é o backstop.

### A Padrão começa em 10%

Como o cashback começa em 5%: um ponto de partida para o formulário, não uma regra. O programa nasce
desligado, então nada se paga até o lojista ligar.

### O calendário mora na API

`affiliate-payout-calendar.ts` diz em que período cai um dia e quando o período vence. AF6 grava o
vencimento na entrega com a mesma função; aqui ela já serve à prévia que a tela de Configurações
mostra ("vendas entregues de 1 a 10 vencem dia 20"). A prévia vem da API para o web não ter uma
segunda cópia da conta. Os dias são do calendário de Brasília, pelas funções de `billing-dates.ts`,
como `store-slugs.ts` já faz.

### O prazo de atribuição fica no programa

`attributionDays` (30, de 1 a 90) é uma coluna, como o rascunho do épico desenhou. AF1 só o guarda;
quem o lê é AF5/AF6.

### Rotas próprias, fora de `affiliates`

`stores/:slug/affiliate-program` e `.../tables/...`. A lista de afiliados (AF3) fica em
`stores/:slug/affiliates/...`, sem dividir o prefixo com o programa.

### Tabela apagada some de vez

Sem arquivo morto: o pedido guarda o nome da tabela e a taxa de cada item (decisão 3 do épico), então
apagar uma tabela não mexe em história nenhuma. Em AF1 ainda não existe afiliado; quando AF3 o criar,
apagar uma tabela com afiliados passa a ser recusado.

### Até 50 tabelas por loja

Condição especial é uma tabela; cinquenta é mais condição do que um lojista acompanha, e o teto segura
um script desgovernado. Duas criações ao mesmo tempo podem passar de 50 por uma: o teto é uma
proteção, não uma regra de dinheiro, e não leva trava.

### Os termos têm versão

`termsVersion` começa em 0 (nunca escritos) e sobe a cada texto diferente, inclusive quando o texto é
apagado. O vínculo do afiliado (AF3) guarda a versão que ele aceitou.

## Fora de escopo

- `Affiliate`, convite, aceite e o slug do afiliado: AF3.
- Qualquer tela, inclusive o campo no produto e a coluna na listagem: AF2.
- O preço por afiliado (R$ 9,90 por mês, por afiliado ativo, começando em zero): AF10, junto com a
  cobrança. Enquanto for zero nada o lê, e onde ele mora (no plano, na página) depende de como entra na
  assinatura do Asaas.
- A conta da comissão do pedido: AF6.
