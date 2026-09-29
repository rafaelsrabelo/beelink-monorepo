# BEELINK-162 — K3 · Loja: a conversa do pedido, e o ícone de conversas no cabeçalho

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> K3 do Épico K (BEELINK-139). Sai do `main`, que já tem o K1 (a API da conversa, BEELINK-160) e o
> K2 (o canal em tempo real, BEELINK-161). Só web e `packages/ui`: a API não muda.

## Definição de Pronto

1. "Falar com a loja" aparece em todo pedido em andamento, e abre a conversa daquele pedido:
   - na página do pedido (J5);
   - no cartão em andamento da Visão geral (J4);
   - nos cartões de Meus pedidos (J4).
2. O cabeçalho da loja tem um ícone de conversas, só com o cliente logado e com alguma conversa.
   Ele mostra o número de mensagens não lidas e abre um painel lateral com as conversas. No
   celular, o painel ocupa a tela inteira.
3. "Falar com a loja" no menu da Minha conta leva à mesma lista, numa aba própria
   (`/<loja>/conta/conversas`).
4. A conversa mostra as mensagens em ordem, as do cliente de um lado e as da loja do outro, com dia e
   hora. A última mensagem do cliente diz "Enviada" ou "Lida". Abrir uma conversa com mensagens da
   loja não lidas marca essas mensagens como lidas.
5. O cliente escreve e envia. Uma falha diz o porquê e mantém o texto. Enquanto carrega, há esqueleto.
6. As mensagens chegam em tempo real pelo canal do K2, sem recarregar. Sem o canal, a conversa relê a
   cada 30 s.
7. Conversa fechada mostra o histórico, só para leitura, e diz que terminou junto com o pedido.
8. Nenhum caminho, texto ou código de WhatsApp.
9. Testes (blocos com axe, rotas do BFF, serviços, visões), histórias dos blocos e conferência no
   navegador em :3100, no computador e no celular.

## Decisões

### 1. Uma conversa, duas casas

A mesma tela de conversas (a lista e, ao escolher uma, a conversa) vive em dois lugares:
- num painel lateral (Sheet), aberto pelo ícone do cabeçalho e por todo "Falar com a loja";
- inline na aba nova da Minha conta, `/<loja>/conta/conversas`, aonde leva o item do menu.

É um componente só. A aba é também o endereço estável da conversa: `?pedido=N` abre a de um pedido.

### 2. Quem abre a conversa é um link

O ícone do cabeçalho e os "Falar com a loja" são links para a aba (`?pedido=N` num pedido). Um
clique simples abre o painel ali mesmo. Ctrl-clique, nova aba ou uma página sem script seguem o
link e caem na aba. O vitrine já segue essa regra: um drawer é um script, e a página tem de ler sem
ele. O menu é um link comum, porque o bloco do menu só desenha links.

O estado do painel (aberto, e qual pedido) fica numa store do Zustand por página, porque quem abre
(o botão no pedido, o cartão) e quem desenha (o painel no cabeçalho) não são pai e filho.

### 3. Onde "Falar com a loja" entra, e onde não

- Página do pedido: nas ações do topo, ao lado de Ver comprovante, só em andamento. No celular a
  mesma fileira cai sob o título, então um botão serve aos dois.
- Visão geral: o cartão em andamento ganha um lugar de ações ao lado de "Acompanhar pedido".
- Meus pedidos: nos cartões em andamento, com o cancelar quando Recebido.

Ficam fora:
- A faixa "Algum problema com o pedido?" do canvas. As outras ações dela ("Não recebi", "Trocar ou
  devolver") não têm ticket, e uma faixa com um botão só repetiria o do topo.
- O segundo botão, só de celular, dentro do cartão de situação: o do topo já está lá.
- Um pedido fechado não ganha o botão. O histórico da conversa dele fica na lista.

### 4. O ícone só aparece com alguma conversa

Aparece com o cliente logado e com a lista não vazia, e o número é a soma das não lidas. A lista só
tem pedidos em que o cliente já escreveu: um pedido novo não tem conversa até a primeira mensagem, e
a entrada é o "Falar com a loja". Como a lista é lida no navegador, o ícone entra depois da
hidratação. É o preço de um número vivo: um número desenhado no servidor ficaria velho, porque um
evento de conversa não relê a página.

O painel existe para todo cliente logado, com ícone ou sem, porque os botões dos pedidos o abrem.

### 5. Os dados

Tudo é TanStack Query, sob `conversationKeys.shopper(slug)`: o canal do K2 já invalida essa árvore
a cada evento e relê tudo ao voltar de uma queda. Então o K3 não precisa de assinatura própria.

- **Rotas do BFF** sob `/<slug>/api/`, com `callAsShopper`, renovando a sessão no caminho:
  - a lista;
  - a conversa de um pedido;
  - enviar;
  - marcar como lida.

  O repasse fica num helper só, porque são quatro rotas iguais.
- **Enviar:** a resposta é a conversa inteira, que vira o dado da consulta, e a lista é relida. O
  texto só sai do campo quando a API aceita. 409 (fechou no meio) relê a conversa; 429 pede para
  esperar.
- **Ler:** com a conversa na tela e não lidas maior que zero, um POST de leitura. A API só avisa
  quando marcou algo, então o ciclo leitura → evento → releitura termina.
- **Sem o canal** (sem `NEXT_PUBLIC_REALTIME_URL`), a lista e a conversa aberta releem a cada 30 s.
- Sem retry automático. Uma falha mostra a frase e o "Tentar de novo".

### 6. As frases

As frases ficam no dicionário da vitrine (`packages/ui`), em pt-BR e en. Um mapa na web leva cada
código de recusa à frase. O `ORDER_CONVERSATION_NOT_FOUND` do painel não vale para o cliente: o GET
dele devolve uma conversa vazia.

### 7. O painel veste a loja

Um Sheet vai para fora da janela da loja, pelo portal. Por isso ele leva a paleta
(`useShopPalette`) e a fonte da loja (Figtree) consigo. Sem isso, sairia nas cores e na fonte do
painel.

## Fora de escopo

- Anexos e fotos; conversa sem pedido; respostas automáticas.
- Contagem de não lidas no menu da Minha conta: o menu é desenhado no servidor e ficaria velho. O
  ícone do cabeçalho já conta.
- A faixa "Algum problema com o pedido?" (decisão 3).
- Som ou notificação do sistema.
- O painel do lojista: o sino é o K4, a aba Conversas o K5.

## Adendo — revisão independente (2026-09-29)

Dois revisores: um nos dados e na segurança, outro na interface e nas regras. Corrigido:

1. **Marcar como lida entrava em loop quando falhava.** O efeito dependia de `isPending`: uma falha o
   disparava de novo, sem fim. Agora ele pede uma vez por última mensagem da loja.
2. **O painel ficava aberto depois de "Ver pedido" ou de voltar no navegador.** O estado é de módulo
   e sobrevivia à navegação. Agora o painel fecha quando o caminho muda, e o "Ver pedido" fecha o
   painel mesmo quando leva à página que está atrás dele.
3. **Uma releitura que falhava apagava a conversa da tela.** Isso vinha do poll, do foco ou do
   canal, e o campo de escrever sumia junto. Agora só a primeira leitura mostra o erro.
4. **Enviar apagava o que foi digitado durante o envio.** Agora só sai do campo o texto que foi.
5. **Sessão:** o `callAsShopper` deslogava a cliente quando a renovação achava a API fora do ar. Com
   o ícone lendo a lista em toda página, isso passaria a acontecer muito. Agora a resposta é 502 e
   os cookies ficam, com teste.
6. **Cache:** a resposta do envio ou da leitura cancela uma releitura em voo antes de virar o dado,
   para uma resposta velha não chegar por cima dela.
7. **Acessibilidade:**
   - o título da conversa recebe o foco ao abrir;
   - ao voltar, a linha da conversa de onde se veio recebe o foco;
   - o histórico é um `log`, que anuncia o que chega e rola pelo teclado;
   - o botão Enviar não se desabilita enquanto envia, para o foco não cair no `body`;
   - o título do painel ganhou a fonte da loja.
8. **Campo de escrever:**
   - o placeholder estava na cor de fundo de imagem, quase invisível;
   - no celular, Enter quebra a linha e quem envia é o botão;
   - o Enter que encerra uma composição no Safari não envia mais.
9. **Aba:**
   - a caixa rola quando há muitas conversas;
   - o endereço acompanha o que está aberto (`?pedido=`);
   - um `?pedido=` novo na mesma página é respeitado.
10. **Miúdos:**
    - o esqueleto tem a altura real do campo de escrever;
    - "2.000" é escrito com o separador;
    - `emphasis` virou `size`;
    - o comentário do `orderNumberOf` voltou ao lugar;
    - uma resposta 2xx vazia agora é erro.
11. **Testes novos:**
    - componente da conversa: lida pedida uma vez só, releitura que falha sem apagar a tela,
      recusa que mantém o texto;
    - axe no painel, no balão e no "Falar com a loja";
    - o slot de ações do cartão da Visão geral.

Conferido em :3100, no computador e a 390 px, com a cliente de teste:
- o painel abre pelo pedido e pelo balão;
- a cliente enviou no pedido nº 18. A resposta da loja, pela API, chegou sozinha, e a mensagem dela
  passou de "Enviada" a "Lida". A resposta da loja foi marcada como lida ao aparecer;
- o pedido nº 20 foi entregue, e a conversa dele ficou só de leitura, com o aviso;
- a aba abre com `?pedido=`;
- os botões aparecem na Visão geral e em Meus pedidos só nos pedidos em andamento.

Dados de teste no `harness_wt`:
- duas mensagens da loja e uma da cliente no pedido nº 18;
- o pedido nº 20 com uma mensagem, e agora Entregue.

### Fica para depois

- O lojista ainda não lê nem responde pelo painel: o sino é o K4, e a aba Conversas o K5. Até lá, a
  mensagem da cliente fica guardada, e o painel recebe o aviso sem mostrá-lo. Por isso o K3 não
  deveria ir para produção antes do K5.
- A contagem de não lidas no menu da Minha conta (decisão 4).
