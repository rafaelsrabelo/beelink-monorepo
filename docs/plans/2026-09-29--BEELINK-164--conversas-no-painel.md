# BEELINK-164 — K5 · Painel: a aba Conversas, e a conversa dentro do pedido aberto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> K5 do Épico K (BEELINK-139). Empilhado sobre o K4 (`feat/BEELINK-163-sino-do-painel`, PR #135), que
> já trouxe as consultas da loja sob `conversationKeys.shop(slug)`. A API é a do K1: nada muda nela.
>
> Este plano foi escrito depois do código, contra a regra: o desenho saiu direto das decisões do K3 e
> do K4. Fica registrado.

## Definição de Pronto

1. "Conversas" no menu do painel, com o número de conversas com mensagens não lidas.
2. A aba lista cada conversa: cliente, nº e status do pedido, última mensagem, hora e marca de não
   lida.
   - Filtra por abertas, não lidas e todas, e busca por nº ou cliente.
   - A conversa abre ao lado. No celular, ocupa a tela, com a volta para a lista.
   - O cabeçalho da conversa tem o pedido e links para o pedido e para a ficha do cliente.
3. O lojista responde, e a conversa é marcada como lida ao abrir. Uma conversa fechada é só leitura.
4. O pedido aberto (H4) tem um bloco com a conversa daquele pedido.
5. Tempo real pelo canal do K2. O número do sino (K4) baixa quando a conversa é lida.
6. Testes (blocos com axe, rotas do BFF, visões), história e conferência em :3100.

## Decisões

1. **O estado da aba mora no endereço:** `?filtro=`, `?q=` e `?pedido=`. Assim cada estado é um
   link, e o voltar do navegador faz sentido.
2. **A loja não abre conversa.** A API deixa a loja ler a conversa de qualquer pedido (vazia se o
   cliente não escreveu), mas só responder a uma que o cliente abriu. Sem mensagens, o bloco do
   pedido diz que o cliente ainda não escreveu, e não mostra campo de resposta.
3. **Ler marca como lida uma vez por última mensagem do cliente,** como na loja (K3): uma leitura que
   falha não vira laço.
4. **Blocos do painel, e não os da loja.** Os da loja usam a paleta da loja (`shop-*`). O painel tem
   os seus, em `packages/ui/blocks/conversations`, com os tokens do painel.
5. **O menu ganhou um contador** (`badge` no item de navegação), com o número dito também em
   palavras, para leitor de tela.
6. **`lib/message-length.ts`** leva o limite de 2000 caracteres (contado como o banco conta). O K3
   (#131) tem o mesmo cálculo em `conversation-view.ts`; quando os dois estiverem na main, um passa
   a importar do outro.

## Fora de escopo

- Respostas prontas; atribuir a conversa a um atendente.
- Anexos.
