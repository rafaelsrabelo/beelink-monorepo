# Endereço direto no checkout, com busca pelo CEP

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio colado, sem um BEELINK. O número entra num adendo quando existir.

## O pedido

Ticket "[Checkout] Reduzir abandono de carrinho e simplificar o fluxo de compra", colado por Rafael em
05/11/2026, com prioridade alta. 98% das compras são pelo celular, chegando pelo Instagram. Dois
problemas:

1. **Cadastro obrigatório para comprar.** Para finalizar, o cliente tem de entrar com Google ou criar
   conta com e-mail e senha — e criar conta por e-mail são cinco passos: preencher, abrir o e-mail,
   confirmar, voltar, entrar.
2. **Checkout longo e endereço difícil.** Não há onde informar o endereço no checkout: o cliente vai em
   "Alterar dados", acha a seção de endereço na aba de perfil e preenche lá. O CEP não busca o
   endereço sozinho.

Decidido com Rafael no mesmo dia: **dois PRs em sequência**. Este é o primeiro — o problema 2. O
segundo resolve o problema 1 com uma **conta automática**: o checkout pede nome, WhatsApp e e-mail,
sem senha, cria a conta por trás e já deixa o cliente logado — e daí em diante é este checkout. Um
terceiro PR, pedido depois, mostra o funil da compra no painel.

## O que já existe, e o que falta

- **Busca de CEP:** existe (BEELINK-148). `/[slug]/api/cep/[zipCode]` vai ao ViaCEP, fechada a quem não
  tem a sessão do cliente; o formulário de endereço da aba de perfil tem um botão "Buscar CEP". Não é
  automática, e CEP inválido e CEP não achado dizem a mesma frase.
- **Salvar endereço vindo do carrinho:** existe. `/[slug]/api/customer/enderecos/salvar` com
  `entregar=1` volta a `retorno` com `?entregar=<id>`, e o carrinho escolhe esse endereço.
- **Falta:** o formulário morar no checkout. Hoje "Adicionar endereço" é um link para a aba de perfil.
  E sem endereço salvo a entrega nem pode ser escolhida: `useCheckoutChoice` força a retirada.

Nenhuma forma nova na rede, nenhuma migration: `packages/contracts`, a API e o schema não mudam.

## Definition of Done

1. Logado, sem endereço salvo, "Receber em casa" pode ser escolhido e abre o formulário de endereço
   ali mesmo, no checkout. Numa loja que só entrega, o formulário já vem aberto.
2. Com endereços salvos, "Entregar em outro endereço" abre o mesmo formulário no checkout, e
   "Cancelar" o fecha.
3. O formulário do checkout começa pelo CEP e pede só o que a entrega precisa: CEP, rua, número,
   complemento, bairro, cidade e UF. O nome do endereço e quem recebe ficam para a aba de perfil.
4. Completados os 8 números do CEP, a busca roda sozinha e preenche rua, bairro, cidade e UF, levando o
   foco ao número. Vale também para o formulário da aba de perfil.
5. O que a busca preencheu continua editável; número e complemento são digitados.
6. CEP incompleto diz que é inválido, sem consultar; CEP que não existe diz que não foi achado; o
   serviço fora do ar diz para preencher à mão. Três frases diferentes.
7. "Usar este endereço" salva e volta ao checkout, rolando até ele, com o endereço escolhido, o frete
   cotado e o cupom aplicado. Uma recusa volta ao checkout com o formulário aberto e a frase do erro.
8. Entrega sem endereço não sai: o botão diz o que falta, sem mandar o cliente para outra página.
9. Celular primeiro: teclado numérico no CEP, `autoComplete` nos campos, alvos de toque de 44px, nada
   rolando de lado em 360px.
10. `pnpm ci-check` verde; cada bloco novo ou alterado com story e teste com axe.

## Decisões

- **Sem rota nova: o formulário posta na que existe.** Ela já salva e devolve ao carrinho com o
  endereço escolhido, e funciona como formulário puro. Um `fetch` evitaria a recarga, mas pede uma rota
  JSON nova para um ganho pequeno: o endereço vem antes do pagamento, então a recarga não desfaz nada
  que o cliente já tenha feito no checkout.
- **Entrega escolhível sem endereço.** `useCheckoutChoice` deixa de forçar a retirada quando não há
  endereço: a entrega fica escolhida sem endereço, o formulário abre, e o pedido não sai até salvar.
  Enquanto não há endereço, o pagamento não diz "frete a combinar" — o frete ainda não foi perguntado.
- **A busca roda no 8º número**, com máscara `00000-000` enquanto digita. "Buscar CEP" fica, para
  tentar de novo depois de uma falha.
- **O campo do CEP vira um bloco próprio** (`StorefrontZipCodeField`), usado pelos dois formulários.
- **`StorefrontCheckoutChoices` tem 245 linhas:** a parte da entrega sai para um bloco próprio antes de
  receber o formulário.
- **Volta rolando até o checkout:** `retorno` leva `#finalizar`, a âncora do checkout. No celular o
  checkout fica abaixo das linhas do carrinho, e voltar ao topo da página seria perder o cliente.

## Fora do escopo

- **Comprar sem cadastro** — o PR 2, com a conta automática. Ele muda a regra de
  [docs/product/](../product/README.md) de que comprar pede identidade verificada; este PR não toca nela.
- **Celular dentro do checkout.** Hoje é só um aviso, e não segura o pedido. O PR 2 pede o WhatsApp.
- **Funil da compra no painel** — o PR 3.
- **Endereço para quem não está logado.** A busca de CEP segue fechada à sessão do cliente; o PR 2
  cria a sessão antes do endereço.
