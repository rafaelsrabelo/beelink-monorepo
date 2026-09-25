# BEELINK-111 — Conta e sessão do cliente por loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G7 do Épico G (conta do cliente). Pedido do Rafael em 25/09, com prioridade sobre o G5: ele criou
> uma conta na mutante-performance e, ao abrir a lessari, a conta já existia e ele já estava logado.
> Sai da `main`; o G5 (BEELINK-109, Google) é refeito em cima desta branch.

## O pedido

"O usuário é criado por loja, o cliente é por loja." Hoje a conta do cliente é da bee-link inteira:
um `User` serve em todas as lojas (cada loja só guarda o seu registro de cliente), e o cookie de
sessão do cliente tem `path: "/"`, então quem entra numa loja entra em todas.

## Definição de Pronto

1. A conta do cliente pertence à loja onde foi aberta (`users.storeId`); a conta de lojista é da
   bee-link (`storeId` nulo). O e-mail é único **dentro** de cada escopo: duas contas da bee-link
   nunca têm o mesmo e-mail, duas contas da mesma loja também não, e o mesmo e-mail pode ter uma conta
   em cada loja e outra na bee-link.
2. Criar conta na loja B com um e-mail que já tem conta na loja A (ou na bee-link) abre uma conta
   nova em B: senha própria, e-mail de confirmação próprio, e o cliente aparece na lista de B.
3. Entrar numa loja procura só as contas dela: a senha da conta de A falha em B como um e-mail
   desconhecido. O login do painel procura só contas da bee-link; conta de loja nunca abre o painel.
4. Reenviar a confirmação e "esqueci a senha" pela loja agem só na conta daquela loja, e o link de
   nova senha volta para o "Entrar" da loja. Os do painel agem só nas contas da bee-link.
5. O token de acesso ou de renovação de um cliente da loja A é recusado nas rotas da loja B (`/me`,
   `PATCH /me`, `refresh`) com 401.
6. Os cookies de sessão do cliente ficam no caminho da loja (`/<slug>`): logado em A, deslogado em B,
   e as duas sessões convivem no mesmo navegador. Nomes novos (`bl_shopper_access`,
   `bl_shopper_refresh`), para os cookies antigos, do domínio inteiro, ficarem inertes.
7. Os handlers que leem a sessão do cliente ficam sob o caminho da loja
   (`/<slug>/api/customer/[action]`); `api` já é palavra reservada para categoria.
8. Migração: cada registro de cliente ligado a uma conta ganha a sua conta na loja dele (mesmo nome,
   e-mail, senha e confirmação) e passa a apontar para ela; as sessões de cliente abertas são
   encerradas. As contas de lojista não mudam.
9. Os links de confirmação e de nova senha de um cliente abrem mesmo com uma sessão do painel no
   mesmo navegador — hoje o proxy manda para `/admin` e o token nunca é gasto.
10. `safeBackOf` devolve `/` para um slug que não tem forma de slug, então um `%2F` decodificado não
    monta um endereço fora do site (achado da revisão do G5, que vale para o handler movido aqui).
11. `docs/product` (Contas, Clientes) e o `AGENTS.md` da web (regras 2 e 4) dizem a regra nova.

## Decisões

### 1. O escopo é uma coluna em `users`, não uma segunda tabela de contas

A conta da loja é o mesmo tipo de conta, com dono diferente: sessões, tokens de renovação, links por
e-mail, confirmação e troca de senha continuam um mecanismo só. Pôr senha e e-mail em `customers`
pediria uma segunda pilha de sessão e de tokens para o mesmo trabalho.

A unicidade vem de dois índices: `@@unique([storeId, email])` para as contas de loja e um único
parcial `email WHERE storeId IS NULL` para as da bee-link — um único composto sozinho aceitaria duas
contas da bee-link com o mesmo e-mail, porque o Postgres trata nulos como distintos. O parcial usa o
preview `partialIndexes` do Prisma 7.10; escrito à mão no SQL, o próximo `migrate dev` o apagaria.

Toda busca por e-mail recebe o escopo explicitamente (`AccountScope`), sem valor padrão: esquecer o
escopo num caminho de cliente não pode cair, calado, nas contas do painel.

### 2. A loja do token é conferida no serviço

`me` e `PATCH /me` leem a conta com o `storeId` da rota; a renovação compara a loja da conta da
sessão com a da rota. O JWT não muda.

### 3. Cookie no caminho da loja, e os handlers da sessão debaixo dele

Com `path=/<slug>`, o navegador só manda o cookie da loja às páginas dela, e o matcher do proxy
(`has`/`missing`) continua deixando visitantes e robôs de fora — com um nome de cookie por loja, o
matcher, que só aceita nomes fixos, teria de rodar em toda página da vitrine.

O custo é que um handler em `/api/storefront/<slug>` não recebe mais o cookie. Um cookie tem um
caminho só, e o `ResponseCookies` do Next guarda um cookie por nome, então gravar o par duas vezes
(`/<slug>` e `/api/storefront/<slug>`) não cabe numa resposta. O handler das ações da conta
(`entrar`, `criar`, `senha`, `perfil`, `sair`) muda para `/<slug>/api/customer/[action]`.

Os nomes mudam porque os cookies antigos, com `path=/`, continuariam chegando a toda loja: o proxy
tentaria renovar a cada página e não conseguiria apagá-los ao gravar os novos no caminho da loja.

### 4. A migração copia a conta para cada loja

Para cada `customers.userId`, uma conta nova com `storeId` da loja e os dados da conta antiga, e o
registro passa a apontar para ela. As sessões `CUSTOMER` abertas são encerradas (o cliente entra de
novo, uma vez, em cada loja). As contas antigas ficam como estão: não dá para saber se uma conta sem
loja é um cliente ou um lojista que ainda não abriu a loja.

### 5. Os links voltam para a loja

O e-mail de nova senha passa a levar `voltar=/<slug>`, como o de confirmação já leva. As duas telas
mandam o cliente para o "Entrar" da loja, e a tela de link inválido de um cliente aponta para a loja
em vez do "reenviar" do painel, que procuraria a conta no escopo errado.

## Fora de escopo

- O G5 (Google): refeito em cima desta branch, com a identidade do Google presa à conta da loja.
- Domínio próprio por loja: o caminho do cookie assume a vitrine em `/<slug>` do domínio da bee-link.
- Juntar contas, ou apagar as contas da bee-link que só eram de cliente.
