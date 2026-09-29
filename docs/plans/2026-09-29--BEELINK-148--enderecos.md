# BEELINK-148 — J9 · Endereços: vários endereços com apelido, um padrão, e o carrinho escolhe

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J9 do Épico J (BEELINK-138). Sai do J8 (#139) e fica empilhado sobre ele. A seção "Endereços" fica
> na mesma aba que "Seus dados", e o J8 mexeu no formulário de onde o endereço sai agora. Tela:
> 6h · Perfil e endereços (Endereços).

## Definição de Pronto

1. O cliente tem vários endereços. Cada um tem:
   - apelido (Casa, Trabalho…);
   - quem recebe;
   - CEP, rua, número, complemento, bairro, cidade e UF.

   Um deles é o padrão. Na migração, o endereço que o cliente já tem vira o padrão.
2. API do cliente: listar, criar, editar, remover e tornar padrão.
   - Remover o padrão promove outro.
   - O primeiro endereço já nasce padrão.
   - O endereço de outro cliente ou de outra loja não se lê nem se altera: responde 404.
3. O painel continua lendo e gravando o padrão:
   - a ficha do cliente (H7) e a lista (cidade e UF);
   - o pedido novo (H6);
   - o cadastro com endereço.
4. A aba "Perfil e endereços" segue a 6h:
   - cartões com PADRÃO, Editar, Remover e Tornar padrão;
   - "Adicionar endereço";
   - o CEP preenche rua, bairro, cidade e UF.
5. O carrinho:
   - na entrega, o cliente escolhe um endereço salvo ou adiciona outro;
   - o pedido grava o endereço escolhido e quem recebe (J1).
6. O "Entregar em" do cabeçalho mostra o CEP do endereço padrão quando há sessão.
7. Testes: e2e da API, rotas do BFF e blocos. Conferência em :3100.

## Decisões

### 1. Uma tabela de endereços, e o cliente perde as colunas de endereço

O modelo novo é `CustomerAddress` (`customer_addresses`), com `isDefault`. Um índice único parcial,
`(customerId) WHERE isDefault`, garante no máximo um padrão por cliente. O schema já tem a preview
`partialIndexes`.

A migração copia o endereço de quem tem alguma parte preenchida, como padrão, e depois apaga as
colunas de `customers`. O endereço passa a morar num lugar só: um espelho no cliente seria uma
segunda verdade para manter em dia.

### 2. Apelido e quem recebe são opcionais

- **O apelido em branco não aparece.** O cartão mostra só quem recebe. O endereço migrado fica sem
  apelido: não sabemos se é "Casa".
- **Quem recebe em branco é o próprio cliente,** com o nome que tiver quando o pedido for feito. O
  formulário já vem com o nome dele preenchido.

O painel não pergunta nem uma coisa nem outra.

### 3. O cliente grava um endereço inteiro

Criar e editar mandam o endereço inteiro (`PUT`). Rua, cidade, UF e CEP são obrigatórios, porque é
para onde a loja entrega. O número pode faltar ("s/n").

O painel continua com a regra dele (H7): as partes são opcionais, uma parte ausente fica como está e
uma em branco é apagada. Um padrão que fica sem nenhuma parte é removido, e outro é promovido.

### 4. "Tornar padrão" e remover

- **Tornar padrão** tira o padrão do outro e põe neste, na mesma transação.
- **Remover o padrão** promove o endereço mexido por último.
- **Remover o último** deixa o cliente sem endereço, como antes do primeiro pedido.
- **Cada cliente tem no máximo 10 endereços** (`CUSTOMER_ADDRESS_LIMIT`).

### 5. `CustomerProfile` traz os endereços, e `address` continua sendo o padrão

- `me` responde `addresses`, com o padrão primeiro. Assim o carrinho, o cabeçalho e o perfil saem de
  uma chamada só.
- `address` continua, com as partes do padrão, todas nulas quando não há padrão. A visão geral, o
  cabeçalho e a mensagem do pedido já leem esse campo.
- O `PATCH` do perfil perde `address`. Endereço se grava pelos endereços.

### 6. O pedido do carrinho leva `addressId`

`PlaceCustomerOrderPayload.addressId` é opcional.

- **Sem ele,** o pedido vai para o padrão, como o do painel.
- **Um id que não é do cliente** é recusado com `ORDER_ADDRESS_NOT_FOUND`, e o carrinho relê a
  página.
- **O pedido fotografa** o endereço e quem recebe (`deliveryName`).

### 7. A mesclagem (H11) leva todos os endereços

Os dois registros são a mesma pessoa, então os endereços do outro passam para o mantido. O padrão do
mantido continua sendo o padrão, e o do outro só vira padrão se o mantido não tinha nenhum. Isso
substitui "o endereço inteiro ou nada" do H11, que só fazia sentido com um endereço por cliente.

### 8. A tela, sem script para o essencial

- **Os cartões** ficam na aba Perfil, abaixo de "Seus dados".
- **"Adicionar endereço" e "Editar"** abrem o formulário na própria aba (`?endereco=novo` ou
  `?endereco=<id>`).
- **"Remover" e "Tornar padrão"** são formulários de um botão.
- **Tudo posta no BFF** `/<loja>/api/customer/enderecos/<ação>` e volta com a frase.
- **O CEP** tem um botão "Buscar", como no painel. Ele usa uma rota nova, `/<loja>/api/cep/<cep>`,
  que só atende quem tem sessão de cliente na loja, e preenche o que o ViaCEP souber. Sem script, a
  pessoa digita tudo.

### 9. O carrinho escolhe

- **Na entrega,** os endereços que dão para entregar (rua e cidade) aparecem como opções, com o
  padrão marcado.
- **"Adicionar endereço"** leva ao formulário e volta ao carrinho já com o endereço novo escolhido
  (`?endereco=<id>`).
- **Sem nenhum endereço,** fica o convite de hoje.

### 10. O CEP do cabeçalho

Com sessão, o "Entregar em" mostra o CEP do padrão enquanto a pessoa não digitar outro. Um CEP
digitado fica no cookie da loja e vale mais: é a escolha dela para aquela compra.

## Fora de escopo

- Frete por endereço.
- Mostrar no painel os outros endereços do cliente.
- Validar o endereço contra o CEP.

## Adendo da implementação (29/09)

- **"Quem recebe" não vem preenchido.** O nome do cliente aparece como placeholder, com a dica "Em
  branco, você". Preenchido, ele ficaria gravado, e uma troca de nome depois não chegaria ao endereço.
  Em branco, vale o nome do dia do pedido (decisão 2).
- **O carrinho só recebe o endereço novo quando o formulário veio dele.** O formulário manda
  `entregar=1`. Voltando ao perfil, a URL não carrega o id.
- **O CEP aparece formatado nas linhas de endereço** (`addressLineOf`): "CEP 60323-231", e não os oito
  dígitos crus que um cadastro antigo guarda. Isso vale também para a mensagem do pedido e para a
  visão geral.
- **O cartão "Seus dados" ficou da largura dos endereços** (`max-w-3xl`). Empilhados com larguras
  diferentes, os dois pareciam desalinhados.
- **Conferido em :3100** com a cliente de teste da loja-do-design:
  - "Buscar CEP" preenche rua, bairro, cidade e UF.
  - "Tornar padrão" e "Remover" funcionam, e o cabeçalho acompanha o CEP do padrão.
  - O caminho do carrinho volta já com o endereço novo escolhido.
  - O pedido nº 24 foi para "Trabalho", com "Recepção" como quem recebe.
  - Tudo conferido também em 390 px.

## Adendo da revisão (29/09)

Dois revisores leram o ramo: um olhou correção, o outro regras e acessibilidade. O que entrou:

- **"Remover" pergunta antes, no próprio cartão** (`?remover=<id>`), sem script. Isso muda a decisão
  8: apagar um dado salvo com um toque só não atende o WCAG 3.3.4.
- **Toda mudança volta para os cartões (`#enderecos`),** onde o aviso aparece. No celular, o topo da
  aba fica embaixo do formulário inteiro de "Seus dados".
- **Os botões de cada cartão levam também a rua no nome.** Dois endereços sem apelido e com o mesmo
  destinatário teriam botões iguais para o leitor de tela. O título do cartão virou `<h3>`.
- **"Buscar CEP" não perde o foco** (`aria-disabled`, e não `disabled`). Com um CEP desconhecido, o
  foco volta ao CEP. Com um CEP de cidade inteira, que não traz rua, o foco vai para a Rua. O CEP e a
  UF dizem o formato que pedem.
- **Os links novos são os do Next** (`AppLink`), como no resto da área da conta.
- **A promoção do padrão prefere um endereço que dá para entregar.** Uma mesclagem move os endereços
  sem mexer no `updatedAt`, então um endereço que chega por ela não passa a ser o "mexido por último".
- **Um código na URL só vale pela chave própria** (`Object.hasOwn`). `?aviso=constructor` ou
  `?erro=toString` derrubavam a página. Isso vale também para `?erro=` do formulário do J8 e da página
  de entrar, que tinham o mesmo defeito.
- **A correção do painel manda só as partes do endereço que mudaram.** Se a cliente trocou o padrão
  enquanto o formulário do painel estava aberto, o que ninguém mexeu não sobrescreve o endereço novo.
- **O BFF só aceita um UUID como id de endereço.** `..` subiria um nível no caminho da API.
