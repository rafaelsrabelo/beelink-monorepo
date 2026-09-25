# BEELINK-107 — "Entrar" ou "Olá, Nome" no cabeçalho, e a página Minha conta

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G3 do Épico G (BEELINK-104). Empilhado sobre o G2 (BEELINK-106). O G5 (Google) ficou para depois
> deste: precisa de credenciais do Google que só o dono pode criar.

## O pedido

O link de conta que o E5 tinha escondido volta com algo atrás: "Olá, entre" para quem não tem sessão,
"Olá, Nome" para quem tem. E `/<loja>/conta` mostra e edita o registro do cliente na loja.

## Definição de Pronto

1. Sem sessão, o cabeçalho diz "Olá, entre / Minha conta" e leva a `/<loja>/entrar`.
2. Com sessão, diz "Olá, Bia" já no HTML servido e leva a `/<loja>/conta`.
3. `/<loja>/conta` sem sessão leva ao entrar e volta para a conta depois.
4. A conta edita nome, celular e endereço, e tem "Sair".
5. Funciona sem JavaScript.

## Decisões

### 1. O cliente é lido uma vez por requisição, no servidor

`shopperAt(slug)` lê o cookie de acesso do cliente e pergunta `/customer/me`, com `cache()` do React
para a página e a conta não perguntarem duas vezes. Visitante anônimo e crawler não custam nada:
sem o cookie, nem há pergunta. As páginas passam o cliente para o frame, e o frame passa o nome para o
cabeçalho, então o HTML já sai com "Olá, Bia", sem piscar.

### 2. Um token vencido lê como visitante no render

Um Server Component não guarda um par novo. O proxy do G2 renova na próxima página. No render, um
token vencido é simplesmente "sem sessão".

### 3. Minha conta é um formulário comum

Como o entrar, posta para o mesmo route handler (ação `perfil`), que responde 303 com `salvo` ou
`erro`. O ticket falava em TanStack Query e esqueleto; um formulário comum funciona sem script e não
precisa de nenhum dos dois. Como o proxy não vê `/api`, o handler renova o token uma vez se ele venceu
desde que a página abriu, e guarda o par novo na resposta.

### 4. O e-mail aparece, não se edita

É da conta, não da loja.

### 5. Recusas com frase para o cliente

`CUSTOMER_PHONE_TAKEN` entra nos contratos. `CUSTOMER_FIELDS_INVALID` e `CUSTOMER_SIGN_UP_INVALID`
são códigos do próprio web para um 400 nesses formulários, porque a frase genérica de `BAD_REQUEST`
fala das abas do painel.

## Fora de escopo

- Histórico de pedidos (chega com o módulo de pedidos).
- O Google (G5) e o pedido pedindo identidade (G4).
