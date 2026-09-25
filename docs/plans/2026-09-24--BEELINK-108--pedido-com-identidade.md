# BEELINK-108 — Fazer o pedido pede identidade, e a mensagem sai com os dados do cliente

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G4 do Épico G (BEELINK-104). Empilhado sobre o G3 (BEELINK-107).

## O pedido

O documento de produto já decidiu: "comprar exige identidade verificada; chegar ao checkout não". O
carrinho e o total ficam abertos para qualquer um; "Fechar pedido" pede que a pessoa entre, e a
mensagem do WhatsApp sai com o nome, o celular e o endereço que a loja guarda dela.

## Definição de Pronto

1. Um visitante vê o carrinho e o total, e no lugar do botão um convite para entrar ou criar conta.
2. Entrar ou criar conta a partir do carrinho mantém o carrinho (cookie) e volta a ele.
3. Um cliente com sessão vê os próprios dados como a loja guarda e um "Alterar dados" que volta ao
   carrinho depois de salvar.
4. A mensagem leva nome, celular e endereço.
5. Quem já comprou não redigita o endereço: ele vem do registro da loja.

## Decisões

### 1. O nome livre sai; entra o registro da loja

O campo "Seu nome (opcional)" do F4 sai. Quem fecha o pedido está logado, e os dados vêm do registro
dele na loja (G1), editável em Minha conta (G3).

### 2. Dados incompletos não bloqueiam

Sem celular ou endereço, o pedido ainda pode ser fechado: o WhatsApp da pessoa já identifica quem
mandou. Uma dica pede para completar os dados, e "Alterar dados" leva a Minha conta com `voltar` para
o carrinho.

### 3. Minha conta aceita `voltar`

Vindo do carrinho, salvar volta ao carrinho; vindo de qualquer outro lugar, fica na própria conta.
Sempre dentro da loja (`safeBackOf`).

## Fora de escopo

- Guardar o pedido na API e mostrá-lo no painel (módulo de pedidos, próximo épico).
- O Google (G5): o convite para entrar vai ganhar "Continuar com Google" quando existir.
