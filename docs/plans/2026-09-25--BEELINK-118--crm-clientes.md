# BEELINK-118 — Painel: a lista de Clientes vira o CRM

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H6 do Épico H (pedidos e CRM). Empilhado sobre o H5 (BEELINK-117), que dá o estágio, os números
> do cliente, a ordenação e a contagem por estágio na API.

## O pedido

O lojista vê de uma vez quem nunca comprou, quem compra e quem sumiu, e age sobre isso: chama no
WhatsApp com a mensagem certa para cada um.

## Definição de Pronto

1. Abas **Todos · Leads · Clientes · Inativos**, cada uma com a contagem que a API devolve para a
   busca digitada (Todos é a soma das três); a aba escolhida filtra a lista.
2. Colunas:
   - cliente: o nome e, embaixo, o e-mail — ou o celular, quando não há e-mail;
   - estágio: o selo, e o Inativo diz há quantos dias não compra ("há 74 dias");
   - pedidos, total gasto (ao centavo), último pedido e cidade/UF.
3. Ordenar por mais recentes, último pedido, mais pedidos e maior gasto.
4. Busca, aba, ordem e página ficam na URL (`?stage=INACTIVE&sort=TOP_SPENT&q=bia&page=2`):
   - voltar de uma ficha cai na mesma lista;
   - trocar aba, ordem ou busca volta para a página 1.
5. "Chamar no WhatsApp" em cada linha abre `wa.me/<celular>` com uma mensagem pronta por estágio:
   - Lead: convite para a primeira compra;
   - Cliente: um obrigado e a porta aberta;
   - Inativo: "faz tempo que você não passa aqui".
6. Sem celular, o botão fica desabilitado e diz por quê.
7. Clicar na linha abre a ficha, em `/admin/<loja>/customers/<id>` (a rota chega no H7).
8. No celular, cartões em vez de tabela.
9. Esqueleto no carregamento. O vazio diz o que houve: nenhum cliente ainda, ninguém com essa busca
   ou ninguém nesse estágio.
10. Testes: cada bloco novo com Testing Library e axe; a mensagem de cada estágio; o estado na URL.

## Decisões

### 1. As abas são abas de verdade, com um painel só

O primitivo `Tabs` desenha as quatro abas, e a lista mora no painel da aba escolhida. Um leitor de
tela ouve "aba, 2 de 4, selecionada" e cai na lista pelo painel, em vez de um grupo de botões
apertados como o filtro de Pedidos. Trocar de aba não guarda nada na tela: a aba é a URL.

### 2. O estado na URL, como em Pedidos

O mesmo desenho do H2: os valores do fio no endereço (`stage=LEAD`, `sort=MOST_ORDERS`), "mais
recentes" e a página 1 ficam de fora, e a busca é segurada na caixa com debounce para não criar uma
entrada no histórico a cada letra. A leitura e a escrita do endereço ficam num hook da tela, para a
tela continuar pequena e o comportamento ser testado sem desenhar nada.

### 3. A mensagem é fixa por estágio, e fala da loja para o cliente

Como a do pedido aberto (H4): "Olá, Bia! Aqui é da Loja do Design." e uma frase do estágio. Só o
primeiro nome — é uma conversa, não uma cobrança. O texto mora nos dicionários (pt-BR e en), ao lado
da mensagem do pedido. O lojista editar o texto está fora de escopo.

### 4. Sem celular: botão desabilitado e o motivo escrito

O motivo aparece embaixo do botão ("Sem celular") e é a descrição dele (`aria-describedby`). Não é
uma dica flutuante: um botão desabilitado não recebe foco nem passagem do mouse, e a dica nunca
abriria.

### 5. O nome é o link da linha; o WhatsApp fica por cima

Como em Pedidos: o nome é o único link, esticado sobre a linha (e sobre o cartão), com o nome
completo no rótulo — "Abrir a ficha de Bia Souza". O botão do WhatsApp fica acima do link esticado:
tocar nele abre a conversa, nunca a ficha.

### 6. "Conta criada" sai da tabela

As colunas do ticket não têm a data da conta, e a tabela ganhou quatro. A data continua ordenando
"mais recentes" e vai para a ficha (H7).

### 7. Contagem, rótulo e dias vêm da API

Os dias sem comprar são os de `daysSinceLastOrder`, com o mesmo corte do estágio (H5, decisão 2):
a tela não recalcula nada, para o selo e a frase nunca discordarem.

## Fora de escopo

- O lojista editar os textos das mensagens.
- Exportar a lista.
- A ficha do cliente (H7): a linha já leva a `/admin/<loja>/customers/<id>`.
