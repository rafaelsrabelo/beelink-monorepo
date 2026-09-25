# BEELINK-47 — A caixa de compra da página do produto, e a barra do celular

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D7 do épico BEELINK-40 (página do produto). Empilhado sobre o D6 (BEELINK-46). Comparado com
> `docs/plans/design-handoff/design/5b-loja-pagina-produto.html` a 1440px e a 390px.

## O pedido

A caixa de compra de 5b, prometendo só o que existe: preço, estoque, quantidade, "Adicionar ao
carrinho" e "Comprar agora", onde o pedido termina e quem vende. No celular, uma barra fixa com o
preço e o botão, sem cobrir conteúdo.

## Definição de Pronto

1. Caixa de 320px, borda de 1px em `--shop-frame`, raio 16px, respiro de 20px, 14px entre as partes.
2. Preço com o inteiro em 32px, sem `aria-live` (o anúncio fica na coluna de informações).
3. "Em estoque" em 18px/700 na cor positiva, ou "Esgotado" apagado. `showProductStock` esconde só o
   "Em estoque".
4. "Quantidade" num select nativo de 38px, de 1 a 10; a quantidade escolhida vai para o carrinho.
5. Duas pílulas de 48px: "Adicionar ao carrinho" na cor da loja e "Comprar agora" na cor do texto.
6. Combinação esgotada: a frase e "Avise-me quando chegar" no lugar da quantidade e das pílulas.
7. "Você finaliza o pedido pelo WhatsApp da loja." só numa loja com WhatsApp.
8. "Vendido por" e "Pagamento" ("Pix · Cartão · Dinheiro", na ordem do lojista); sem formas de
   pagamento, a linha some.
9. Celular: a barra aparece enquanto os botões da caixa estão abaixo da tela e some quando eles
   aparecem, e daí até o fim da página — nunca cobre as seções de baixo nem o rodapé.

## Decisões

### 1. Sem o link "Pedir este pelo WhatsApp" ao lado do carrinho

5b não tem esse link; o aviso de onde o pedido termina toma o lugar dele. E o BEELINK-108 decidiu que
comprar exige identidade verificada — o link pulava essa etapa. **Reverte a decisão do BEELINK-102
(24/09)**; se ela deve ficar, basta devolver o link ao `StorefrontBuyActions`. O pedido pelo WhatsApp
continua como único caminho numa página sem carrinho.

### 2. A barra é fixa, não parte do fluxo

Mostrar e esconder uma barra fixa não mexe em nada, então não há deslocamento de layout. Ela está no
HTML do servidor escondida e `inert`, e só aparece depois que o script confirma que os botões da caixa
estão abaixo da tela. Some quando eles aparecem e continua sumida dali para baixo: por isso não cobre
o fim da página e não precisa de espaço reservado. Leva a própria linha "Adicionado · Ver carrinho",
porque a da caixa está fora da tela; o leitor de tela ouve a da caixa.

### 3. Sem o primitivo `Alert`

O ticket pede o `Alert` para o aviso do WhatsApp, mas ele é `role="alert"`: o leitor de tela
anunciaria a frase a cada abertura da página. É um parágrafo com o ícone do balão, como o design
desenha.

### 4. Quantidade até 10, sem perder o que o carrinho já tem

O stepper ia até 99; o select vai de 1 a 10, como o design. Uma quantidade acima de 10, se algum dia
chegar ao seletor, continua escolhível. O carrinho continua podendo aumentar a quantidade.

### 5. Pix e Cartão

`storefront.payments.pix` passa a "Pix" e ganha `card: "Cartão"`: crédito e débito viram um só
"Cartão", no lugar do primeiro deles. Ninguém mais lia essas chaves.

## Fora de escopo

- CEP e "Calcular" (o D3 não cota), "Frete GRÁTIS acima de…" (sem configuração), "Restam N" (a
  contagem nunca é pública), "Troca" (sem campo) e "Adicionar aos favoritos" (sem favoritos).
