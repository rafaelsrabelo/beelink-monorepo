# BEELINK-193 — O4 · Loja: o preço da promoção na vitrine e na página do produto

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O4 do Épico O (BEELINK-189). Sai da branch do O3 (BEELINK-192, PR #161). Usa o cálculo do O2
> (BEELINK-191): a regra por unidade é a mesma do carrinho e do pedido.

## Definição de Pronto

1. O card, a listagem e a página do produto mostram o preço promocional, o preço de antes riscado e
   o selo de desconto enquanto a promoção vale. A página do produto diz o nome da promoção.
2. O preço promocional de uma unidade, vezes a quantidade, é o desconto que o carrinho e o pedido
   aplicam naquela linha.
3. O filtro "em oferta", os cortes "10%, 20%, 30% ou mais" e as contagens deles contam os produtos
   em promoção.
4. A ordenação "maior desconto" ordena pelo desconto que o card mostra, com a promoção.
5. A vitrine "Ofertas" do modo design traz os produtos em promoção.
6. Uma promoção de 10% nunca aparece como 9% no selo.
7. Sem promoção ativa, a vitrine lê exatamente o que lia antes.
8. Os formatos estão em `packages/contracts`.
9. Há testes de unidade e e2e. `pnpm ci-check` está verde.

## Decisões

### 1. O preço público já vem com a promoção

As leituras públicas do catálogo passam a responder o preço promocional em `priceCents` e o preço de
antes em `compareAtPriceCents`. É o que esses dois campos já querem dizer na vitrine: quanto se paga
agora, e quanto era. Todo componente que mostra preço, preço riscado e selo passa a mostrar a
promoção sem mudar.

- **O preço de antes** é o "de" que a loja já tinha (`compareAtPriceCents`), quando existe, e senão o
  preço do catálogo.
- **`priceRange`** e o preço de cada combinação recebem a mesma regra.
- **`promotionName`** entra no card público: o nome que o lojista deu à promoção.
- **Só as leituras públicas mudam.** O produto do painel continua com o preço do catálogo, e a linha
  do pedido também (o desconto fica à parte, como o O2 definiu).

Isso também acerta o carrinho do web antes do O5: ele soma os preços que a vitrine responde, e esses
agora são os promocionais. O total do carrinho passa a bater com o do pedido.

### 2. A regra é a de uma unidade, a mesma do carrinho

`unitDiscountOf` (em `promotions/discount-pricing.ts`) é o que o carrinho multiplica pela quantidade.
A vitrine chama a mesma função. Por isso o preço do card vezes a quantidade é a linha do pedido.

**O valor fixo no carrinho inteiro não aparece no preço do produto:** ele não é de uma unidade. Ele
continua valendo no carrinho, quando ganha da soma das linhas (O2).

### 3. O percentual passa a ser arredondado para cima, a favor do cliente

O selo é calculado pelos dois preços e arredonda para baixo. Com o desconto arredondado para baixo
(como o O2 fazia), 10% de R$ 18,99 dava R$ 1,89, e o selo lia "9%". Arredondando o desconto para
cima, ao centavo, a promoção de 10% lê sempre 10% ou mais.

Vale para a promoção e para o cupom, para a regra ser uma só. A diferença é de no máximo um centavo
por unidade. **Isso corrige a decisão 1 do plano do O2,** que dizia "arredondado para baixo".

### 4. Filtro e ordenação por desconto

O desconto de uma promoção não está em coluna nenhuma: depende da hora. Com promoção ativa:

- **"Em oferta":** o produto tem "de/por" próprio, ou uma promoção por unidade o alcança.
- **"N% ou mais":** três casos, somados com `OR`:
  - o "de/por" próprio já dá N% (`discountPercent`, como antes);
  - uma promoção percentual de N% ou mais o alcança;
  - uma promoção de valor fixo o alcança e o preço é baixo o bastante para o valor dar N%.
- **O produto com "de/por" e promoção ao mesmo tempo** tem o desconto dos dois juntos, que nenhuma
  das condições acima calcula. Esses poucos são lidos à parte e entram por id.
- **"Maior desconto":** com promoção ativa, a ordem é calculada em memória sobre a prateleira
  filtrada, pelo percentual que o card mostra. Sem promoção, continua sendo a coluna, no banco.
- **As contagens das facetas** usam as mesmas condições.

**O filtro e a ordenação por preço continuam no preço do catálogo.** Um produto de R$ 100,00 com 10%
aparece por R$ 90,00 e é filtrado como R$ 100,00. Fica registrado como limite conhecido.

### 5. O cache da vitrine

As leituras públicas ficam 60 segundos em cache no web. Criar, editar ou pausar uma promoção já
derruba esse cache (O3). O começo e o fim de uma promoção não são uma escrita: aparecem em até um
minuto.

### 6. A faixa de anúncio

O Rafael decidiu em 01/10: **usar a faixa de aviso que o modo design já tem,** com texto livre e
link. Nenhum código novo. A faixa ligada à promoção (que some sozinha quando a promoção acaba) vira
um ticket à parte.

## Fora de escopo

- O preço promocional nos favoritos e no aviso de "baixou de preço": eles comparam o preço do
  catálogo.
- O filtro e a ordenação por preço sobre o preço promocional (decisão 4).
- A linha de promoção nos totais do checkout e o campo de cupom (O5).
- A faixa ligada à promoção (decisão 6).

## Adendo da revisão (01/10)

Um revisor de correção leu o diff. A vitrine e o pedido concordam (a mesma leitura das promoções, a
mesma regra por unidade), e o arredondamento novo não quebra nenhum `CHECK`. O que mudou:

- **O selo não lê mais 28% numa promoção de 29%.** `discountPercent` (no `packages/ui`) dividia antes
  de multiplicar, em ponto flutuante: 0,29 × 100 dá 28,999…, e o selo arredonda para baixo. Acontecia
  com cortes exatos de 29%, 57% e 58%, de uma promoção ou do "de/por" da própria loja. Agora multiplica
  antes, em centavos inteiros, que é a conta que a API faz nos filtros.
- **Um preço promocional vencido não é mais servido.** A decisão 5 dizia "aparecem em até um minuto",
  e estava errada: o cache do web serve a resposta guardada enquanto busca a nova, então a primeira
  visita depois de uma noite sem movimento via o preço da promoção que acabou à meia-noite. O começo
  e o fim de uma promoção não são uma escrita, e nada derrubava esse cache. Agora:
  - toda leitura pública do catálogo responde, no cabeçalho `x-prices-change-at`, o próximo instante
    em que os preços da loja mudam sozinhos (uma promoção ativa que ainda vai começar ou acabar);
  - o `public-api.ts` do web não serve uma resposta guardada depois desse instante: busca de novo, sem
    cache, só naquela requisição, enquanto o cache se atualiza por trás.

  Conferido no navegador: uma promoção agendada para dali a um minuto apareceu na primeira visita
  depois do horário. **Isso corrige a decisão 5.**
- **Um produto de preço zero não é mais contado como oferta.** Uma promoção não tira nada de um
  brinde, mas a condição de busca o incluía por alcance. As condições agora pedem preço maior que zero.
- **Cada combinação diz a promoção que deu o preço dela.** Com duas promoções valendo, a combinação
  mais cara podia ter o preço de uma e a página dizer o nome da outra. `PublicProductVariant` ganhou
  `promotionName`, e a faixa de preço do card é calculada ponta a ponta.
- **No máximo 50 promoções valem ao mesmo tempo, as mais novas** (`RUNNING_PROMOTIONS_MAX`). É o teto
  do que cada leitura da vitrine e cada pedido carregam. A vitrine e o pedido passaram a usar a mesma
  função de leitura (`runningPromotions`), em vez de duas que concordavam.
- **Os produtos com "de/por" e promoção são lidos só entre os que estão na prateleira** (sem rascunhos
  nem esgotados).
- **`promotionName` entrou no Swagger,** e a comparação de preço do corte não passa mais do limite da
  coluna.

O que fica como está, sabendo:

- **Um percentual quebrado logo abaixo de um corte pode ler o corte no selo e ficar fora do filtro.**
  9,99% de R$ 18,99 dá R$ 1,90 de desconto (arredondado para cima), o selo lê 10%, e o filtro "10% ou
  mais" não traz o produto. Com percentual inteiro isso só acontece abaixo de R$ 1,00.
- **Uma promoção no carrinho inteiro faz cada listagem ler todos os produtos com "de/por" próprio da
  prateleira,** para calcular o desconto dos dois juntos. São os que o lojista marcou à mão.
- **"Maior desconto" com promoção ativa lê a prateleira filtrada inteira a cada página** (decisão 4).
- **A mensagem do WhatsApp do pedido mostra as linhas pelo preço do catálogo e o total com desconto,**
  sem uma linha de desconto entre eles. Vem do O2 e fica para o O5, que é quem mostra o desconto no
  comprovante e nas mensagens.
