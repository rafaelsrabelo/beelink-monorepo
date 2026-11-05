# Comprar sem cadastro: a conta que a compra deixa para trás

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: é o problema 1 do ticket colado em 05/11/2026, o mesmo do
> [plano do endereço](2026-11-05--checkout-endereco.md). O número entra num adendo quando existir.

## O pedido

"[Checkout] Reduzir abandono de carrinho e simplificar o fluxo de compra", problema 1: para fechar o
pedido o cliente tem de entrar com Google ou criar conta com e-mail e senha — e criar conta por e-mail
são cinco passos (preencher, abrir o e-mail, confirmar, voltar, entrar). Rafael mostrou a trava em
`mutantesuplementos.com.br/carrinho` ("Sign in to order · Create an account") e o checkout da Ceyó como
referência de um que "não trava".

Decidido com Rafael em 05/11/2026:

- **Conta automática**, não visitante sem conta. O checkout pede nome, e-mail e WhatsApp, sem senha e
  sem confirmar e-mail; a conta da loja nasce por trás e a pessoa já segue logada. Daí em diante é o
  checkout de sempre — página do pedido, pagamento online, cupom, cashback e avisos, sem mudança.
- **E-mail que já tem conta na loja recebe um código de 6 dígitos**, e quem digita segue logado. Sem
  senha, e um estranho não entra na conta de ninguém.
- **As etapas no estilo da Ceyó ficam para o PR seguinte.** Este PR não muda o layout do checkout.

## O que já existe, e o que falta

- **Sessão sem verificação:** nada no código impede. `SessionService.start(user, ua, 'CUSTOMER')`
  emite o par; só `AuthService.verifiedUser` (o login com senha) recusa e-mail não confirmado. O guard
  do cliente e o refresh não olham verificação.
- **Precedente:** o login com Google cria a conta sem senha (`customer-google.service.ts`, `accountOf`)
  e chama `sessions.start` na hora. É o mesmo desenho, com o Google provando o e-mail.
- **Falta:** uma rota que crie a conta a partir de nome, e-mail e WhatsApp; um código curto por e-mail
  (não existe nenhum hoje); o formulário no lugar de "Entre para fazer o pedido".

## Definition of Done

1. Um visitante no carrinho vê, no lugar de "Entre para fazer o pedido", um formulário com nome, e-mail
   e WhatsApp e o aviso de que continuar aceita os termos e a política de privacidade.
2. "Continuar" com um e-mail que a loja não conhece cria a conta e o cadastro na loja (com o WhatsApp),
   e volta ao checkout já logado, sem senha e sem e-mail a confirmar antes.
3. Com um e-mail que já tem conta, a loja manda um código de 6 dígitos para ele, e o checkout pede o
   código. Certo, volta logado; errado, diz, e depois de 5 erros o código para de valer. O código vale
   10 minutos, e pedir outro desfaz o anterior.
4. "Entrar" (senha ou Google) e "Criar conta" continuam ali, como opções.
5. Logado assim, o pedido sai como o de quem criou conta: entrega com o endereço do PR 1, pagamento na
   entrega ou online, cupom e a tela do pedido.
6. Um WhatsApp que já é de outro cadastro da loja não trava a compra: fica como reivindicado
   (`claimedPhone`), para o lojista juntar os dois, como na aba de perfil.
7. O aceite dos termos fica registrado com um canal próprio do checkout.
8. As regras de [docs/product/](../product/README.md) dizem o que mudou: comprar pede nome, e-mail e
   WhatsApp, não um e-mail confirmado antes; e o checkout é o único lugar que diz se um e-mail tem conta.
9. Celular primeiro: teclado de e-mail, de telefone e numérico nos campos certos, e o código aceita
   colar e o preenchimento automático do celular (`one-time-code`).
10. `pnpm ci-check` verde; bloco novo com story e teste com axe; API com testes de unidade e e2e.

## Decisões

- **Uma rota, duas respostas.** `POST /stores/:slug/customer/checkout` com `{ name, email, phone }`
  responde `{ kind: "SESSION", session }` para um e-mail novo e `{ kind: "CODE_SENT" }` para um que
  já tem conta; `POST .../checkout/code` com `{ email, code }` responde a sessão. A forma vai para
  `packages/contracts` primeiro.
- **Revelar se o e-mail tem conta é o preço, e fica só aqui.** O cadastro responde 202 para qualquer
  e-mail justamente para não dizer quem é cliente. Aqui não dá: um e-mail novo segue direto e um
  conhecido pede o código, e nenhum desenho sem fricção para o cliente novo esconde isso. Limites: o da
  rota de autenticação por IP, e um código por e-mail a cada minuto. A exceção fica escrita na regra de
  produto.
- **O código em tabela própria, `SignInCode`.** O `EmailToken.tokenHash` é único no banco inteiro e o
  `consume` procura pelo hash sozinho: seis dígitos colidiriam entre pessoas. O código é procurado pela
  conta (loja + e-mail), guardado como HMAC com o segredo da API, com contador de tentativas. Migration.
- **A conta nasce sem e-mail confirmado**, como a do cadastro. O código, quando usado, confirma o
  e-mail: provou que a pessoa o lê. Nunca se marca confirmado um e-mail que ninguém provou — o Google
  usa essa marca para decidir quem é dono de uma conta.
- **O e-mail de confirmação vai na hora**, sem segurar nada: quem confirma passa a receber o andamento
  do pedido por e-mail, que hoje exige e-mail confirmado. O WhatsApp é o canal principal da loja.
- **O WhatsApp segue a regra da aba de perfil**: gravado no cadastro; já sendo de outro cadastro da loja,
  vira `claimedPhone`, sem juntar nada sozinho.
- **Novo canal de aceite `CHECKOUT`** no `LegalAcceptanceChannel` (migration) e no contrato.
- **Formulários puros na web**, como o resto da conta do cliente: `/[slug]/api/customer/checkout` e
  `/codigo`, respostas 303 que voltam ao checkout (`#finalizar`). O e-mail volta na URL para o
  formulário do código; nome e WhatsApp não.

## Fora do escopo

- **Checkout em etapas (Ceyó)** — o PR seguinte.
- **Cupom antes de se identificar.** Continua depois da identificação, que agora é um passo curto.
- **Entrar com código fora do checkout** (na tela de "Entrar"). Quem nasceu pelo checkout e quer senha
  usa "Esqueci minha senha", que já serve a contas sem senha.
- **Funil e GA4** — o ticket do funil, depois deste.
- **A vitrine em inglês para quem tem o navegador em inglês** — perguntado ao Rafael, é outro PR.
