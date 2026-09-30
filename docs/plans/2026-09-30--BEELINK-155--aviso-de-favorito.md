# BEELINK-155 — J16 · Aviso de favorito: baixou de preço ou voltou ao estoque

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J16 do Épico J (BEELINK-138), empilhado sobre o J15 (#151). O favorito é do J14 (#150), e a
> preferência "Favoritos" nos avisos por e-mail é do J12 (BEELINK-151).

## Definição de Pronto

1. Sai um e-mail para quem curtiu e aceitou o aviso de favoritos quando:
   - o preço de um produto ou de uma variação curtida cai;
   - o estoque vai de zero para mais.
2. É no máximo um e-mail por produto a cada 7 dias para a mesma pessoa.
3. Quem pediu o Avise-me e também curtiu recebe um e-mail só.
4. O envio sai fora da transação que muda preço ou estoque.
5. A aba Favoritos passa a dizer que os avisos saem por e-mail, com o caminho para desligá-los.
6. Há testes e2e da API (queda, volta, os 7 dias, a preferência, o rascunho) e testes do template e
   do bloco. `pnpm ci-check` está verde.

## Decisões

### 1. O que o favorito já viu, em vez de "antes e depois"

- **Onde a mudança é vista.** Toda escrita que mexe no preço ou no estoque passa por
  `syncProductCache`, na transação que a fez: a edição no painel, a venda (`takeStock`) e o
  cancelamento (`returnStock`). É ali que os favoritos do produto são revistos (`watchFavorites`).
- **O favorito guarda o que viu por último:** `seenPriceCents` e `seenSoldOut`. Ele nasce com o
  preço e o estoque da curtida, e cada revisão os atualiza.
  - Um preço que subiu vira a nova régua, então uma queda depois dele é uma queda de verdade.
  - Uma venda que esgotou marca `seenSoldOut`, e a reposição avisa.
- **Por que não comparar "antes" e "depois" da escrita:** exigiria ler o antes em cada um dos quatro
  lugares que escrevem. Assim é um lugar só, e nenhuma escrita futura esquece.
- **O preço e o esgotado de hoje saem do mesmo cálculo da lista** (`toCustomerFavorite`): a
  variação curtida enquanto a loja a vende; o produto inteiro, pela variação mais barata à venda, com
  ou sem estoque.
- **Uma variação curtida que deixou de existir não avisa nada.** Comparar o preço dela com o do
  produto inventaria uma queda, como já decidido no J14.

### 2. Quando avisa

- **Baixou:** o preço de hoje está abaixo do visto, e o produto está à venda (não esgotado). Uma
  queda num esgotado não se compra, e o aviso dela viria antes da hora.
- **Voltou:** era esgotado e agora não é. Se as duas coisas acontecem juntas, é um e-mail só, que diz
  as duas.
- **Só avisa quando:**
  - o produto está publicado;
  - a conta do cliente confirmou o e-mail;
  - `notifyFavorites` está ligado;
  - nenhum aviso desse produto nasceu para essa pessoa nos últimos 7 dias. Um aviso que nasceu e
    não foi enviado (desligado depois, esgotou) conta também: a regra é de nascer, e é mais simples
    de dizer.
- **O visto se atualiza mesmo sem aviso.** Assim, uma queda na semana do limite não vira aviso depois.

### 3. O Avise-me

- O Avise-me (A6) guarda um telefone, e nada envia para ele ainda (não há WhatsApp). O e-mail do
  favorito é o único aviso que existe. Por isso quem pediu os dois recebe um e-mail só, e nada muda
  no Avise-me.

### 4. O outbox: `FavoriteNotice`

- **A linha nasce na transação que mudou o produto,** com o cliente, o produto, o preço de agora, o
  anterior (quando baixou) e se voltou.
- **A carta sai depois,** pelo `FavoriteNoticeMailer`.
- **O envio em lote do J12 vira uma classe base, `OutboxMailer`, em `shared/mail/`:** a reserva com
  `FOR UPDATE SKIP LOCKED`, o prazo, as 5 tentativas com intervalo crescente e a varredura por
  minuto. `OrderStatusMailer` e `FavoriteNoticeMailer` a estendem, e cada um só diz o que é enviar
  uma linha.
- **O envio não é imediato.** Quem muda o preço (o painel, um pedido) não conhece os favoritos, então
  o aviso sai na varredura do minuto seguinte. Os testes chamam `flush()`.
- **Na hora de enviar, relê tudo:**
  - se o favorito foi desfeito, o aviso de favoritos desligado, a conta perdeu o e-mail confirmado ou
    o produto saiu do ar, não envia e dá a linha por feita;
  - os nomes e a variação são lidos no envio; o preço é o da linha, o que valia quando o aviso nasceu.

### 5. O e-mail

- **O assunto:** "Mutante — Pré-Treino Haze baixou de preço" (ou "voltou ao estoque", ou "baixou de
  preço e voltou ao estoque").
- **O corpo:** "O Pré-Treino Haze (Sabor: Uva), que você curtiu, agora sai por R$ 209,90 (antes
  R$ 239,90)." O botão "Ver produto" leva à página do produto na combinação curtida.
- **O fim diz por que o cliente recebe o e-mail** e leva direto à caixa "Favoritos" dos avisos
  (`/conta/perfil#avisos`), como o e-mail do J12.

### 6. A aba Favoritos

- **Uma linha acima dos filtros** (`StorefrontFavoritesHint`):
  - com o aviso ligado: "Te avisamos por e-mail quando um favorito baixar de preço ou voltar ao
    estoque", com "Mudar avisos";
  - desligado: "Os avisos de favoritos estão desligados", com "Ligar avisos".

  Os dois links levam a `perfil#avisos`, e a preferência vem do perfil já lido para o menu.

## Fora de escopo

- Aviso por WhatsApp ou push.
- Enviar para o Avise-me.
- Um resumo diário ou semanal: o aviso é por produto, com o limite de 7 dias.
