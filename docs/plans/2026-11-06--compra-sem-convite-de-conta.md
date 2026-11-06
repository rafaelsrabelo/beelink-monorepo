# A vitrine para de convidar a criar conta

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio direto, sem um BEELINK.

## O pedido

Rafael, 06/11/2026, citando a faixa sob o header ("Crie sua conta para acompanhar seus pedidos, salvar
favoritos e comprar mais rápido."): "essa questão de criar conta pra fazer algo não precisa mais, não precisa
mais aparecer esse componente — o fluxo agora é a compra tendo a melhor experiência possível".

## O que mudou por baixo, e o que ficou para trás

Desde o checkout de visitante (#282), comprar não pede conta: nome, WhatsApp e e-mail. E o preço de um pedido
de visitante já é calculado pelo registro daquele telefone na loja (`order-placement.ts` → `priceOrder` com
`customer: { id }`), então **o benefício de primeira compra já vale para quem compra sem conta**. A faixa, o
pop-up e o carrinho ainda dizem o contrário: "Crie sua conta e ganhe X", "o cupom é aplicado depois de entrar".

## Definition of Done

1. Nenhuma página da vitrine convida o visitante a criar conta: nem a faixa, nem o pop-up, nem o carrinho.
2. Quem não está logado vê, na faixa, o benefício de primeira compra **do jeito que o cliente logado sem pedido
   já vê**: o cupom marcado "Mostrar este cupom na loja", com o código e "Usar no carrinho", ou a promoção, que
   entra sozinha. Sem benefício de primeira compra, não há faixa.
3. O pop-up do visitante, quando o lojista o liga, mostra o mesmo: o código, copiar e ir ao carrinho, ou a
   promoção que entra sozinha. Sem benefício, ele não abre para o visitante.
4. No carrinho, o visitante lê "Seu primeiro pedido tem X com o cupom CÓDIGO" em vez de "Crie sua conta e ganhe
   X"; o cupom continua sendo aplicado depois de informar os dados.
5. Um navegador com a sessão de um cliente que expirou continua sem ver nada (pode ser alguém que já comprou).
6. `pnpm ci-check` verde.

## Decisões (escolhidas pelo Rafael)

- **O visitante é tratado como o cliente que ainda não comprou.** As duas regras passaram a ser a mesma. A
  resposta pública de ofertas (`GET /stores/:slug/offers`) ganha `firstOrder`: a mesma oferta, pela mesma
  função (`firstOrderOfferOf`), que o cliente recebe em `customer/offers`. O código do cupom passa a ser público
  — e só o de um cupom que o lojista marcou "Mostrar este cupom na loja", que é o que esse interruptor diz.
- **O pop-up do visitante usa as palavras do produto**, as mesmas do cliente ("Seu primeiro pedido tem 15% de
  desconto", o código grande), com a foto, o gatilho e a espera que o lojista escolheu.
- **O "Entrar / Criar conta" opcional do checkout fica.** É uma opção ao lado da compra, não um convite.

## Fora do escopo

- **O painel do pop-up:** o título, o texto e o botão que o lojista escreve eram o convite ao visitante, e
  deixam de aparecer para alguém. Remover esses campos, ou usá-los sobre o cupom, é a próxima decisão.
- A tela de cadastro e a conta continuam existindo: quem quiser entra ou cria conta pelo header.
