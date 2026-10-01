# BEELINK-159 — J20 · Visão geral da conta: o pedido em andamento, avaliações e favoritos

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J20 do Épico J (BEELINK-138), o último da fila, empilhado sobre o J13 (#157). A tela é a 6c ·
> Minha conta — visão geral. O J4 (BEELINK-143) já fez a saudação, o pedido em andamento com as
> etapas e "Seus dados".

## Definição de Pronto

1. A Visão geral tem, nesta ordem:
   - "Olá, Nome";
   - o pedido em andamento, ou o último (J4);
   - "Seus dados" (J4);
   - "Avalie suas compras";
   - "Seus favoritos".
2. "Avalie suas compras" mostra até 4 produtos entregues sem nota. Cada um tem a foto, o nome,
   "Entregue em … · a combinação" e as cinco estrelas ali mesmo: um toque envia a nota. Com mais de 4,
   aparece "Ver todos (N)" para a aba Avaliar compras.
3. A nota enviada volta à Visão geral, dizendo "Avaliação enviada. Obrigado!" com o link para
   escrever um comentário. Uma recusa aparece no card do produto.
4. "Seus favoritos" é um trilho com até 6 produtos (foto, nome, preço e "Baixou R$ X" quando baixou).
   O cabeçalho diz "N produtos · X baixaram de preço" e tem "Ver todos (N)".
5. Cada bloco some quando está vazio, e há esqueleto enquanto carrega.
6. Há testes dos blocos (com axe) e da montagem, e stories. `pnpm ci-check` está verde.

## Decisões

### 1. Sem os cartões por aba

- **O ticket pede os cartões** Meus pedidos, Favoritos e Perfil e endereços.
- **Mas em 28/09, no J4, a Visão geral foi refeita a pedido:** "a frente da área é um informativo do
  cliente, não um índice das abas". O menu já está ao lado, e no celular logo abaixo. Esse pedido é
  mais novo que o ticket (de 27/09), e fica valendo.
- **O que o cartão de Favoritos dizia** ("12 produtos · 2 baixaram de preço") vai para o cabeçalho
  do trilho "Seus favoritos", que leva à aba.
- **"Seus dados" (J4) continua,** no lugar dos cartões.

### 2. A nota de um toque

- **Cada estrela é um botão de envio** (`name="nota" value="N"`) num formulário que posta no handler
  do J18 (`/<loja>/api/customer/avaliacoes`, `acao=criar`), sem comentário. Funciona sem script.
- **As estrelas se pintam até a que está sob o ponteiro ou com foco,** só com CSS: `:has()` nas
  seguintes, como no formulário do J18.
- **O grupo é nomeado "Dar nota a {produto}"** e cada botão "N estrelas".
- **A volta:** o handler já leva a `retorno` com `?produto=<id>&aviso=avaliacao-enviada` e
  `#avaliar-<id>`.
  - O aviso fica no topo da seção, com esse `id`, para a âncora cair nele.
  - "Escrever um comentário" leva à aba com a avaliação aberta para editar (`?produto=`).
  - Uma recusa (`?erro-avaliacoes`) aparece no card do produto, que ainda está pendente.

### 3. O trilho de favoritos

- **Um bloco compacto, `StorefrontFavoritesRail`:** a foto, o nome, o preço de hoje e "Baixou R$ X"
  quando `priceDropCents > 0`. Ele não reusa o card da aba Favoritos, que tem ações e é largo.
- **Uma leitura só:** a frente da conta pede os favoritos com `pageSize: 6` para o menu e para o
  trilho. O `cache()` por endereço faz das duas uma chamada.

### 4. Os dados

- **As pendentes vêm de `pendingReviewsAt`,** a mesma leitura da contagem do menu, com `cache()`.
- **Cada bloco é um componente de servidor num `Suspense`** com o próprio esqueleto. Uma leitura que
  falhou não desenha o bloco: a Visão geral não quebra por um complemento.

## Fora de escopo

- Os cartões por aba (decisão 1).
- Um comentário na Visão geral: ele se escreve na aba Avaliar compras.
