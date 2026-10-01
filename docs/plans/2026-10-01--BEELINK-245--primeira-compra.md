# BEELINK-245 — O6 · Primeira compra: promoção e cupom que só valem para quem nunca comprou na loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O6 do Épico O (BEELINK-189). Sai da branch do O5 (BEELINK-194, PR #163). Mexe no cálculo do O2
> (BEELINK-191), nos formulários do O3 (BEELINK-192) e no carrinho do O5.

## Definição de Pronto

1. A promoção e o cupom têm um público: todos, ou só a primeira compra. O formulário do painel
   oferece a opção, e a lista diz qual é.
2. Primeira compra é o cliente sem nenhum pedido válido na loja. Pedido cancelado não conta.
3. A condição é conferida na gravação do pedido, sob a trava do cliente. Duas compras ao mesmo tempo
   não levam as duas.
4. O visitante vê a oferta anunciada no carrinho, com o valor. O desconto entra quando ele se
   identifica.
5. Quem já comprou lê o motivo antes de fechar: na promoção, uma frase no resumo; no cupom, a recusa
   "vale só na primeira compra".
6. O checkout mostra a linha da promoção de primeira compra, como a de qualquer promoção.
7. Os dois casos do Rafael são criados só com configuração: a promoção de 15% na primeira compra e
   o cupom de 10%.
8. A vitrine não mostra o preço de uma promoção de primeira compra: o preço público é o mesmo para
   todos.
9. Os formatos estão em `packages/contracts`. Há testes de unidade e e2e. `pnpm ci-check` verde.

## Decisões

### 1. O público é um campo da promoção e do cupom

`audience`: `EVERYONE` ou `FIRST_PURCHASE`. Ausente no envio é `EVERYONE`. Uma coluna em cada
tabela, com `EVERYONE` de padrão, para que as promoções e os cupons que já existem continuem valendo
para todos.

### 2. Quem está na primeira compra

O cliente sem nenhum pedido na loja que não esteja cancelado. O pedido que está sendo gravado ainda
não existe, então não conta contra ele mesmo. Se o único pedido do cliente é cancelado, ele volta a
estar na primeira compra.

Quando ninguém está identificado (o carrinho do visitante), não dá para dizer. A promoção de
primeira compra não entra no total, e a cotação a anuncia.

### 3. O cálculo continua sendo um só

`priceOrder` lê as promoções que valem, como hoje, e separa as de primeira compra:

- **Cliente na primeira compra:** elas competem com as outras, linha por linha, pela regra do O2 (a
  melhor para o cliente, sem somar).
- **Ninguém identificado, ou cliente que já comprou:** elas ficam de fora. A cotação responde em
  `firstPurchase` o que elas tirariam a mais deste carrinho, com `UNIDENTIFIED` ou `NOT_FIRST`. Se
  não tirariam nada a mais (outra promoção já dá mais), a cotação não anuncia nada.

O cupom de primeira compra usado por quem já comprou é recusado com `NOT_FIRST_PURCHASE`, na cotação
e no pedido.

### 4. A trava

A gravação do pedido já segura a linha da loja até o fim da transação: dois pedidos na mesma loja
esperam um pelo outro. O ticket pede a trava do cliente, e ela entra também: antes de contar os
pedidos do cliente, a gravação trava a linha dele. Assim a regra não depende de a trava da loja
continuar existindo.

### 5. A vitrine

A vitrine é a mesma para todo mundo e fica em cache. Ela não aplica a promoção de primeira compra ao
preço, ao selo, ao filtro "em oferta" nem à ordenação. O anúncio da oferta fica no carrinho, que é
onde a pessoa se identifica. Para anunciar na vitrine, a loja usa a faixa de aviso do modo design
(decisão do O4).

### 6. O carrinho do cliente identificado passa a ser cotado como dele

No O5, o carrinho sem cupom era cotado na porta pública, porque a resposta era a mesma para todos.
Com a primeira compra, não é mais. Entra uma porta nova, `POST /stores/:slug/customer/cart/quote`:
o carrinho do cliente identificado, sem cupom, com o limite de requisições da vitrine. A porta que
responde sobre códigos (`customer/orders/quote`, 30 em 5 minutos) continua só para quando há um
código.

A primeira cotação, feita no servidor, também passa a ser a do cliente quando ele está identificado.

### 7. O painel

- **Formulários de promoção e de cupom:** o campo "Para quem vale", com as duas opções.
- **Listas:** a marca "Primeira compra" na promoção e no cupom que têm esse público.
- **Registrar pedido:** a cotação passa a levar o cliente escolhido. Sem isso o resumo não mostraria
  a promoção de primeira compra que a API aplica ao gravar.

## Fora de escopo

- **O modal de boas-vindas** ("crie sua conta e resgate o cupom"). O Rafael perguntou em 01/10 por
  curiosidade; não é deste ticket.
- **Anunciar a oferta de primeira compra no card e na página do produto.** O preço público é um só.
- **Outros públicos** (clientes que voltaram, aniversariantes, grupos).

## Como o trabalho foi dividido

O Rafael pediu para usar agentes em paralelo neste ticket. O contrato e este plano foram escritos
antes. Depois, três frentes: a API, os blocos de `packages/ui` e, quando os blocos terminam, o
`apps/web`. Por fim, uma revisão com verificação dos achados.

## Adendo: o que a implementação decidiu (01/10)

Os agentes que implementaram as três frentes tomaram decisões que o plano não fechava. Ficam
registradas aqui, e valem:

- **A trava do cliente é a que já existe** (`lockCustomer`, em `customers/customer-lock.ts`,
  `FOR NO KEY UPDATE`), e não um `FOR UPDATE` novo: o comentário dela diz que `FOR UPDATE` travaria
  com os avisos de favorito que a escrita de um produto insere. Um teste e2e com duas transações
  prova que dois pedidos do mesmo cliente se enfileiram sem depender da trava da loja.
- **O segundo de dois pedidos simultâneos é gravado com o preço de catálogo** (201), não recusado.
  É o que "não levam as duas" quer dizer. Um cupom de primeira compra no segundo é recusado (409).
- **Os pedidos do cliente só são lidos (e a linha dele só é travada) quando há um desconto de
  primeira compra em jogo:** uma promoção dessas valendo na loja, ou o cupom digitado é desse público.
  Um carrinho sem isso não custa nenhuma leitura a mais.
- **Nada é anunciado quando a promoção de primeira compra não tiraria nada a mais** do carrinho (outra
  promoção já dá o mesmo ou mais). O anúncio é a diferença entre as duas cotações, não o valor da
  promoção. Conferido no navegador: um carrinho só com creatina (20%) não anuncia os 15%.
- **Cotação do painel com telefone que a loja não tem** é precificada como primeira compra: o pedido
  cadastraria esse cliente, e a cotação tem que dizer o que o pedido vai gravar. Sem cliente nenhum,
  a promoção é anunciada como `UNIDENTIFIED` e o cupom não é recusado por isso.
- **`audience: null` é 400**, como `active: null`; ausente é `EVERYONE`, no POST e no PUT. Por isso os
  formulários do web sempre enviam o público.
- **O campo "Para quem vale" usa botões de alternância**, como "Onde vale" e "Tipo de desconto" nos
  mesmos formulários. A frase do que é primeira compra aparece só quando essa opção está escolhida,
  numa região viva: sob "Todos os clientes" ela diria o contrário do escolhido.
- **A marca nas listas** é um `Badge` secundário ao lado do resumo, não um `outline` (o badge de
  situação, na linha de cima, já é `outline`).
- **O anúncio no carrinho** usa a tinta da loja de fundo com a tinta da página por cima: medido no
  navegador, a cor da marca sobre a própria tinta fica abaixo de 4,5:1. Ele some enquanto a primeira
  cotação não chega e esmaece com as linhas de desconto.
- **Quem pergunta faz parte da pergunta:** a chave de cache da cotação leva o id do cliente, e o
  preço servido pela página só vale para quem a página leu. Dois clientes no mesmo navegador não
  veem o preço um do outro.
- **`NOT_FIRST_PURCHASE` é recusa definitiva:** o carrinho não pergunta de novo a cada mudança.

Conferido no navegador em `loja-o3`: promoção "Boas-vindas" (15% no carrinho) e cupom `PRIMEIRA10`
(10%), os dois "só na primeira compra", criados pelo formulário do painel. Visitante vê "Boas-vindas:
− R$ 35,99 na sua primeira compra. Entre na sua conta para confirmar." já no HTML servido. Cliente
nova: a linha "Promoção: Boas-vindas", o cupom aceito depois dela, o pedido #4 gravado com os dois.
No carrinho seguinte dela e no da Marina (que já comprou): "Boas-vindas vale só na primeira compra."
e o cupom recusado com "Esse cupom vale só na primeira compra."

## Adendo da revisão (01/10)

Um revisor independente leu o diff e não achou defeito: não há estado em que o pedido saia com preço
diferente do que a API calcula, nem ciclo novo de travas. O que mudou a partir das observações dele:

- **O nome da promoção anunciada é o da que acrescenta algo,** e não o da que só ocupa uma linha. Num
  empate exato entre uma promoção para todos e uma de primeira compra, a de primeira compra ficava na
  linha sem tirar nada a mais, e o anúncio perdia o nome da que de fato tirava. Teste de unidade.
- **Os pedidos do cliente só são lidos para uma promoção de primeira compra que alcança o carrinho.**
  Uma de produtos escolhidos que não tem nenhum deles no carrinho não custa mais a leitura nem a trava.
- **A ordem das travas ficou documentada** em `PricingInput.lock`: o pedido do cliente trava o cupom
  antes do cliente; a venda do painel cadastra o cliente antes de cotar. O que impede de cruzarem é a
  trava da linha da loja, que toda gravação toma primeiro.

O que fica como está, sabendo:

- **Sessão que acaba com o carrinho aberto:** o handler cota como visitante e limpa os cookies, mas a
  página ainda guarda o preço sob a chave do cliente até a próxima ação. Decisão do O5, mantida.
- **`PUT` sem `audience` volta para "todos".** É a regra de toda chave opcional menos `active`, e o
  formulário sempre envia. Um cliente de API que não for o web precisa saber.
- **O `like` dos favoritos e a gravação do pedido já se cruzavam antes deste ticket** (cliente → produto
  num, produto → cliente no outro). Este ticket não cria a aresta; `refreshBooks` já a tinha.

