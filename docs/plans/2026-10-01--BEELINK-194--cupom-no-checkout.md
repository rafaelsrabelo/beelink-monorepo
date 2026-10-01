# BEELINK-194 — O5 · Checkout: o campo de cupom, o desconto nos totais e o desconto no pedido

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O5 do Épico O (BEELINK-189). Sai da branch do O4 (BEELINK-193, PR #162). Usa a cotação do O2
> (BEELINK-191): nenhum cálculo novo de desconto entra aqui, só quem o mostra.

## Definição de Pronto

1. No carrinho, o cliente identificado tem o campo "Cupom de desconto". Ao aplicar, a resposta vem
   antes de fechar o pedido: o cupom entrou, ou o motivo da recusa em palavras (não existe, venceu,
   esgotou, não está valendo, já foi usado, não se aplica, valor mínimo).
2. Os totais do carrinho mostram o subtotal, a promoção e o cupom em linhas separadas, e o total.
   São os números da cotação da API, o mesmo cálculo que grava o pedido.
3. O pedido leva o cupom que a tela mostrou como aplicado. Se ele deixou de valer entre a cotação e
   o pedido, o pedido é recusado e a tela diz por quê.
4. O pedido do cliente, o comprovante e Meus pedidos mostram o desconto e o código do cupom.
5. No painel, o pedido aberto mostra a promoção, o cupom com o código e o desconto digitado. O resumo
   de "Registrar pedido" mostra o total que a API grava, com a promoção.
6. A mensagem do WhatsApp do pedido tem as linhas de desconto entre os itens e o total.
7. Sem promoção e sem cupom, o carrinho e o pedido leem o que liam antes.
8. Os formatos estão em `packages/contracts`.
9. Há testes de unidade e e2e. `pnpm ci-check` está verde.

## Decisões

### 1. Os totais do carrinho vêm da cotação

O carrinho soma hoje os preços que a vitrine responde. Isso não basta: o valor fixo no carrinho
inteiro não é preço de produto nenhum, e o cupom depende de quem compra. O resumo passa a ler a
cotação do O2:

- **Sem cupom:** `POST /stores/:slug/cart/quote`, a porta pública. Vale para o visitante e para o
  cliente identificado, que hoje recebem a mesma resposta.
- **Com cupom:** `POST /stores/:slug/customer/orders/quote`, com a sessão do cliente. Essa porta tem
  um limite próprio (30 em 5 minutos por endereço), porque responde se um código existe. Por isso só
  é chamada quando há um código.
- **Um endereço só no web:** `POST /<slug>/api/orders/quote`. O handler escolhe a porta.
- **A primeira cotação é feita no servidor,** junto com a página, e chega no HTML. O resumo não pisca
  depois da hidratação (regra 7 do `apps/web/AGENTS.md`).
- **Se a cotação falha,** o resumo mostra a soma da vitrine, como hoje, sem as linhas de desconto. O
  pedido continua sendo precificado pela API.

As linhas do resumo: Subtotal (o preço do catálogo, antes da promoção), Promoção, Cupom, Total. O
total só aparece quando algo foi descontado: sem desconto, o resumo é o de hoje.

**A linha do carrinho** ganha o valor de antes riscado e o nome da promoção, quando a cotação diz
que a promoção tirou algo dela. Sem isso, as linhas somariam menos que o "Subtotal" e a conta não
fecharia aos olhos de quem lê.

### 2. O cupom é de quem está identificado, e fica na memória do carrinho

- **O visitante não digita cupom.** A porta pública não responde sobre códigos (decisão do O2). Ele
  lê uma frase: o cupom se aplica depois de entrar.
- **O código aplicado fica na loja de estado do carrinho, em memória.** Ele sobrevive à ida para
  "adicionar endereço" e à volta. Não vai para o cookie: recarregar a página pede o código de novo, e
  nada é cobrado diferente do que a tela mostra.

### 3. "Aplicar" pergunta antes de guardar

- **Aplicar** cota o carrinho com o código. Se entrou, o código é guardado e passa a acompanhar o
  carrinho. Se foi recusado, a frase aparece sob o campo e o código não é guardado. Um palpite errado
  não é reenviado a cada mudança de quantidade.
- **Um cupom guardado que deixa de valer** (o carrinho caiu abaixo do mínimo, a entrega virou
  retirada) continua guardado. A tela diz o motivo e mostra os totais sem ele. Se o carrinho voltar a
  cumprir a regra, ele volta sozinho.

### 4. O pedido leva o cupom só quando a tela disse "aplicado"

- O pedido envia `couponCode` quando a cotação do carrinho atual respondeu `APPLIED`.
- Enquanto um cupom guardado está sendo conferido, o botão espera. Se a conferência falhou, o botão
  pede para tentar de novo ou remover o cupom.
- `ORDER_COUPON_REFUSED` (o cupom acabou entre a cotação e o pedido) vira uma frase com o motivo, e
  o carrinho é cotado de novo.

### 5. As linhas de desconto são uma função só

`discountRowsOf` (em `packages/ui/src/lib`) lê as partes do desconto e devolve as linhas, na ordem:
promoção, cupom, desconto digitado. Quem usa: o carrinho, o pedido do cliente, o comprovante, o
painel e as duas mensagens de WhatsApp.

- **Promoção:** "Promoção: {nome}" quando uma só tirou tudo, "Promoções" quando foram várias.
- **Cupom:** "Cupom {código}". No frete grátis com o frete ainda a combinar, o valor lê "Frete
  grátis" em vez de "− R$ 0,00".
- **Desconto:** o que o lojista digitou, que é o resto.
- **Total com frete grátis:** para o cliente, o total não lê "+ frete". O cupom cobre o frete que for
  combinado.

### 6. Meus pedidos

`CustomerOrderSummary` ganha `discountCents` e `coupon`. O card diz "Desconto de R$ 42,50 · cupom
BEMVINDO10" sob o total.

### 7. O painel

- **Pedido aberto:** as linhas de desconto da decisão 5, e a promoção em cada item.
- **Registrar pedido:** o resumo passa a ler `POST /stores/:slug/orders/quote`. Desde o O2 a API
  aplica a promoção também na venda registrada no painel, e o resumo da tela somava sem ela: o
  lojista via um total e a API gravava outro. A conta local continua, para a validação e enquanto a
  cotação não chega.

## Fora de escopo

- **Campo de cupom no "Registrar pedido" do painel.** A API aceita (`CreateOrderPayload.couponCode`),
  o ticket pede o campo no checkout. Fica para um ticket próprio.
- **Guardar o cupom entre recarregamentos** (decisão 2).
- **O desconto nos e-mails de status do pedido:** eles não mostram valores.
- **O total da lista de pedidos do painel com frete grátis:** continua lendo "+ frete", que ali quer
  dizer "o frete ainda não foi informado".

## Para o O6

A promoção "só na primeira compra" depende de quem compra. Quando ela existir, o carrinho do cliente
identificado precisa da porta do cliente mesmo sem cupom, e o limite de 30 em 5 minutos passa a
contar cada mudança de quantidade. O O6 resolve isso (um limite para a cotação e outro para o
código).

## Adendo: o cupom viaja no endereço do carrinho (01/10)

A conferência no navegador derrubou a decisão 2. Ela dizia que o cupom, guardado em memória,
sobreviveria à ida para "adicionar endereço" e à volta. Não sobrevive: salvar o endereço envia um
formulário e carrega a página de novo, e os links do carrinho são carregamentos de página também. O
cliente aplicava o cupom, cadastrava o endereço, voltava, e o cupom tinha sumido sem aviso.

- **O cupom aplicado fica no endereço do carrinho:** `/<slug>/carrinho?cupom=BEMVINDO10`. Aplicar e
  remover trocam o endereço sem recarregar a página. Recarregar mantém o cupom.
- **Os links que saem do carrinho e voltam** (entrar, criar conta, alterar dados, adicionar endereço)
  levam o cupom no `voltar`. O visitante que chega com um cupom no endereço entra na conta e volta
  com ele, e aí ele é conferido.
- **Ao chegar,** a página mostra os totais com que foi servida (sem o cupom), esmaecidos, até a
  resposta do cupom. O botão de fechar o pedido espera essa resposta.
- **Feito o pedido,** o cupom sai do endereço.
- **Sair para comprar mais e voltar pelo ícone do carrinho perde o cupom.** O campo fica vazio e os
  totais sem a linha, e o cliente digita de novo.

**Por que não um cookie, como o do carrinho.** A política de privacidade lista cada cookie pelo nome
e pelo que guarda (`apps/web/src/locales/legal/pt-BR.ts`), e mudar o que o produto guarda pede uma
versão nova dos textos legais (`LegalVersion`). Um cookie para o cupom seria essa mudança. O endereço
da página não guarda nada no navegador.

**Um efeito a mais:** um link com `?cupom=` já deixa o cupom pronto para quem tem conta. Ninguém
pediu isso; o ticket do modal de boas-vindas, se vier, pode usar.

Também da conferência: no card de Meus pedidos, a linha do desconto quebra em duas em vez de cortar o
código do cupom.

