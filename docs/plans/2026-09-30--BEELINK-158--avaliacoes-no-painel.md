# BEELINK-158 — J19 · Painel: a aba Avaliações, para o lojista ver e ocultar

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J19 do Épico J (BEELINK-138), empilhado sobre o J18 (#154). A API das avaliações é do J17 (#153).
> O desenho 7 põe o item "Avaliações" no menu do painel com a contagem das novas.

## Definição de Pronto

1. O menu do painel da loja tem o item Avaliações, com a contagem das novas: as que chegaram desde
   a última vez que o lojista abriu a aba.
2. A lista mostra o produto, a nota, o comentário, o cliente e a data. Ela filtra por nota, por
   produto e por estado (publicadas ou ocultas), com as contagens, e pagina.
3. Ocultar e publicar em cada linha, e a vitrine segue a mudança.
4. Há estados de carregando, falha e vazio.
5. Há testes das rotas do BFF, da leitura do endereço, da tela, dos blocos (com axe) e e2e da API
   para as novas, e stories. `pnpm ci-check` está verde.

## Decisões

### 1. "Novas" é desde a última visita (API)

- **`Store.reviewsSeenAt`:** quando o lojista abriu a aba pela última vez. Nulo conta todas.
- **`GET /stores/:slug/reviews/unseen`** responde `{ count }`, as avaliações da loja criadas depois
  desse momento, ocultas ou não.
- **`POST /stores/:slug/reviews/seen`** grava agora, e a aba chama ao abrir. Isso zera o número do
  menu.
- **É uma marca por loja, e não por pessoa:** a loja tem um dono.
- **Não há evento em tempo real para avaliação.** O número do menu é relido a cada 60 s e ao voltar
  para a aba, como a lista de conversas faz sem canal.

### 2. A tela (`/admin/<loja>/reviews`)

- **O endereço guarda o estado**, como em Conversas: `?estado=publicadas|ocultas`, `?nota=1..5`,
  `?produto=<id>` e `?pagina`.
- **Os filtros:**
  - as abas Todas, Publicadas e Ocultas, com as contagens (que seguem a nota e o produto);
  - a nota em pílulas (Todas as notas, 5★ … 1★);
  - o produto como um chip "Produto: Whey ×". Ele é escolhido pelo nome do produto em qualquer linha
    ("Ver só este produto"). Não há um seletor com todos os produtos: quem filtra por produto parte
    de uma avaliação dele.
- **Cada linha** tem as estrelas, o comentário (ou "Sem comentário"), "Cliente · data", o produto e
  o selo "Oculta" quando for o caso. O botão Ocultar ou Publicar fica ao lado, e a linha fica ocupada
  enquanto salva.
- **Paginação** com o `TablePager` do catálogo, 20 por página.
- **A falha de uma ação** aparece acima da lista (`pageErrorCopy`), como em Leads.

### 3. Os fios

- **O BFF:**
  - `GET /api/stores/[slug]/reviews`;
  - `GET …/reviews/unseen`;
  - `POST …/reviews/seen`;
  - `PATCH …/reviews/[reviewId]`, que chama `revalidateStore` num 2xx, porque ocultar muda a vitrine
    (a nota do card e a lista da página do produto).
- **Os dados:** `services/reviews`, com as chaves, os pedidos e os hooks do TanStack Query. Ocultar e
  publicar invalidam a lista.
- **Os blocos:** `packages/ui/blocks/reviews`: `ReviewFilters`, `ReviewList`, `ReviewListSkeleton` e
  `ReviewsFailed`, com stories ("Blocos/Painel/Avaliações") e testes.

## Fora de escopo

- Responder à avaliação.
- A seção da página do produto (D14).
- Um evento em tempo real de avaliação nova.
