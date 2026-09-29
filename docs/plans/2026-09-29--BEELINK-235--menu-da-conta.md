# BEELINK-235 · J21 — Um menu só da conta no cabeçalho da loja, e “Chat” ao lado do ícone

> **Tier:** plans — verdade de um momento, para um ticket. Append-only.

## Pedido

Rafael, 29/09/2026: “Acompanhar / Meus pedidos” e “Olá, cliente / Minha conta” são pra ser um só, que abre ao clicar ou passar o mouse, com Meus pedidos, Meu perfil, Falar com a loja e Sair. E o nome “Chat” do lado do ícone do chat, para manter o padrão da conta e do carrinho.

## Base

Empilhado no K3 (BEELINK-162, `feat/BEELINK-162-conversa-na-loja`), porque o ícone do chat e a aba “Falar com a loja” nascem lá.

## Decisões

- **Um bloco novo, `StorefrontAccountDropdown`**, no lugar do `StorefrontAccountLink` quando há cliente logado. O visitante continua com o link “Olá, entre / Minha conta” para entrar.
- **Disclosure desenhado sob o botão, não popup em portal**, como o “Entregar em” (E9): fica dentro do cabeçalho, nas cores da loja. Não é `role="menu"`: são links de navegação, que se percorrem com Tab.
- **Abre ao passar o mouse e ao clicar.** O hover só vale para ponteiro de mouse: num toque, o celular emula `mouseenter` antes do `click`, e os dois juntos abririam e fechariam o menu. Aberto pelo hover, fecha quando o ponteiro sai (com uma folga, para cruzar até o painel); um clique com ele aberto pelo hover o fixa aberto em vez de fechar. Esc, clique fora ou o foco saindo fecham, e Esc devolve o foco ao botão.
- **O topo do menu é o nome e “Ver minha conta”**, que leva à Visão geral. Sem ele, a Visão geral deixaria de ter caminho pelo cabeçalho, porque o botão agora abre o menu.
- **Os itens são os que o web manda**, na ordem Meus pedidos → Meu perfil → Falar com a loja, filtrados pelas abas entregues (`DELIVERED_ACCOUNT_TABS`). “Sair” posta em `/<slug>/api/customer/sair`, como o menu lateral da área.
- **“Meu perfil” é um texto próprio** (`accountMenuProfile`): o menu lateral continua “Perfil e endereços”, que descreve a página; o cabeçalho usa as palavras do pedido.
- **Links `<a>` simples dentro do bloco.** O cabeçalho é renderizado no servidor e o bloco é client; passar o `linkComponent` (uma função) do servidor para ele quebraria a serialização. O web já não passa `linkComponent` para a vitrine.
- **Sai o `StorefrontOrdersLink`** (e o `ordersHref` do masthead e da janela), e o texto `ordersLinkTop`.
- **“Chat” ao lado do balão**, a partir de `shop-lg`, como “Carrinho”. O nome acessível do link passa a começar por “Chat” (“Chat, 3 mensagens não lidas”), para o texto visível estar contido nele.

## Verificação

- Testes do bloco novo (clique, hover com mouse, toque sem hover, Esc, clique fora, itens, Sair, axe), da janela e do helper do web.
- No navegador, contra a API do beelink-dev (:3101, K3 no `harness_wt`), com a cliente de teste da `loja-do-design`: desktop e 390px.
