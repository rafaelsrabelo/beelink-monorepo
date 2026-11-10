# Modo Gestor: o balcão dos pedidos, com campainha

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: pedido do Rafael em 10/11/2026, a partir da loja Dindin da Leia.

## O pedido

Rafael, 10/11/2026: "Queria ter um modo gestor… tipo o iFood: a plataforma vai receber pedidos e quero ouvir sino…
aprovar aqui, e chamar motoqueiro (integrar com Uber depois, mas já faz pensando nisso)… tá muito pobre a página
atual". E, ao ver o desenho: "o modo gestor é só pedidos, cupons, chat… entrega tá associada ao pedido, então não
precisa ter aba pra ela dentro do gestor, o gestor é gestor mesmo, é pro pedido".

O desenho aprovado ("ficou muito bom!") está no canvas https://claude.ai/artifact/AU8n3dAUVghQBFrnmMdXB7.

## Decidido

- **Um modo dentro da web**, em `/admin/<loja>/gestor`, de tela cheia, sem o menu do painel. Um app para baixar só
  se o uso pedir (o navegador para o som com o celular bloqueado).
- **Só pedidos, cupons e conversas.** Nada de configuração dentro do gestor; "Voltar ao painel" leva ao resto.
- **O quadro**: Novos → Em preparo (aceito ou preparando) → A caminho (ou pronto para retirar) → Concluídos (os
  últimos entregues). Os status são os de hoje: nenhum status novo.
- **A campainha** toca em loop enquanto houver pedido novo, até alguém aceitar ou recusar. O navegador só toca som
  depois de um toque na página, então o gestor abre com "Começar", que liga o som e mantém a tela acesa.
- **Tocar no card abre o pedido**, ao lado do quadro, com duas abas: **Pedido** (andamento, itens, cupom, pagamento,
  cliente e endereço, e "Chamar entregador") e **Conversa** (o chat do pedido, o mesmo do painel).
- **Chamar entregador**, nesta primeira versão: o motoboy da loja, pelo WhatsApp — a mensagem leva número, endereço,
  itens e o que cobrar na entrega. A Uber Direct entra depois, no mesmo lugar, com a conta da própria loja ligada em
  Integrações, como o Asaas.
- **Recusar** um pedido é cancelá-lo. Um pedido que já tem o dinheiro do cliente é cancelado com o estorno, na tela
  de estorno que já existe.

## Fora desta primeira versão

- Instalar como app (manifesto, ícones) e notificação push com o gestor fechado.
- Imprimir comanda.
- Os itens no card do quadro: a lista de pedidos da API traz só quantos itens; o pedido aberto mostra todos.
- Os números do dia (pedidos, vendido, tempo para aceitar).
- Uber Direct e cadastro de motoboys.
