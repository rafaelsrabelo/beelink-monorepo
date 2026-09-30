# BEELINK-154 — J15 · Curtir na loja (card e página do produto) e a aba Favoritos

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J15 do Épico J (BEELINK-138), empilhado sobre o J14 (#150), que fez a API. As telas são a 6g ·
> Favoritos e a 5b (o coração na foto e o "Adicionar aos favoritos" no quadro de compra).

## Definição de Pronto

1. Há um coração no card de produto e na página do produto.
   - No card, ele aparece na grade, na categoria, na busca e nas vitrines da página inicial.
   - Na página, fica na foto principal e no quadro de compra.

   Um produto já curtido aparece pintado, e um toque curte ou descurte.
2. Sem sessão, o coração leva a Entrar. Depois do login, a pessoa volta à mesma página já com o
   produto curtido.
3. A aba Favoritos, como a 6g, em `/<loja>/conta/favoritos`, tem:
   - os filtros com contagem e a ordem;
   - a grade, com o selo "Baixou R$ X", o preço de hoje e o antigo, e "Curtido em";
   - em cada card: Adicionar ao carrinho, "Esgotado · avise-me" e remover.
4. A aba mostra um esqueleto enquanto carrega e um estado vazio que convida a curtir.
5. Há testes das rotas do BFF, da leitura do endereço, dos blocos (com axe) e dos componentes vivos,
   e stories dos blocos novos. `pnpm ci-check` está verde.

## Decisões

### 1. O coração: um bloco que desenha e um componente vivo que sabe

- **`StorefrontFavoriteButton` (packages/ui)** tem dois jeitos:
  - `icon`: o círculo com o coração, sobre a foto;
  - `text`: "Adicionar aos favoritos" ou "Nos seus favoritos", no quadro de compra.

  Com sessão ele é um `<button aria-pressed>`; sem sessão, um link. O coração cheio tem a cor da loja
  (`shop-primary-ink`). Nenhuma cor é escrita à mão.
- **`StorefrontFavoriteLive` (apps/web)** decide o estado:
  - os ids curtidos vêm do BFF `/<loja>/api/favorites/ids` por TanStack Query, e só com sessão;
  - curtir é `PUT` e descurtir é `DELETE` em `/<loja>/api/favorites/<produto>`, de forma otimista: o
    coração muda no toque e volta se a API recusar.
- **O card e a página não sabem quem está olhando:** eles são desenhados no servidor, e a vitrine
  não recebe a sessão. O coração é uma ilha no cliente, e a página continua a mesma para todos.
- **O card ganha a vaga `favorite`,** no canto de cima à direita da foto, acima do link esticado.
  Grade, trilho e catálogo repassam `cardFavorite`. O card compacto dos relacionados não tem
  coração, como já não tem ação.
- **A página do produto** manda a combinação escolhida no momento, ou nenhuma quando ainda não há
  escolha. A galeria ganha a vaga `corner`, e o quadro de compra ganha `favorite`.
- **As prévias do painel não mostram coração.** O coração depende de um provedor que só existe no
  layout da loja; sem ele, não desenha nada.

### 2. Sem sessão: entrar e voltar com o produto curtido

- **Sem sessão, o coração é um link** para Entrar, com `voltar` = a página atual mais
  `curtir=<produto>`, e `curtir-variante=<combinação>` quando há uma.
- **O `FavoritesProvider`, no layout da loja,** conhece a sessão (`shopperAt`, a mesma leitura do
  cabeçalho). Na volta, ele vê `curtir`, curte e tira os dois parâmetros do endereço
  (`router.replace`, sem rolar a página).
- **Uma recusa na volta** (rascunho, limite) cai no aviso da decisão 3.

### 3. Quando o toque falha

- **Não existe aviso flutuante na loja.** O provedor mostra um aviso fixo no pé da tela
  (`StorefrontFavoriteNotice`, com `role="status"` e um botão de fechar), com a frase do erro.
- **O limite de 200** diz que o cliente pode remover alguns na aba, e leva a ela. Os favoritos de
  produtos em rascunho contam, como diz o adendo do J14. Qualquer outro erro diz "Não deu para
  salvar agora. Tente de novo."

### 4. A aba Favoritos (6g)

- **Os filtros são links com contagem:**
  - `filtro=baixou`, `promocao` ou `esgotados`, e sem ele, todos;
  - reusam `StorefrontOrderTabs`, que ganha a propriedade `label`, o nome da navegação.
- **A ordem** é um formulário GET ao lado do título, como a busca de Meus pedidos:
  `ordem=recentes|menor-preco|maior-desconto`. A página tem 24 favoritos, e `pagina` pagina.
- **Cada card (`StorefrontFavoriteCard`) traz:**
  - a foto, o nome e a combinação;
  - o selo "Baixou R$ X desde que você curtiu";
  - o preço de hoje e o "antes" riscado. O "antes" é o maior entre o preço da curtida, quando
    baixou, e o "de" da loja: o mesmo número pelo qual a API ordena "Maior desconto";
  - "Curtido em 18 set".
- **A ação de cada card depende do caso:**
  - **Esgotado:** "Esgotado · avise-me" leva à página do produto (na combinação curtida), onde o
    Avise-me já existe.
  - **Produto inteiro com opções:** "Ver opções" leva à página.
  - **Qualquer outro:** "Adicionar ao carrinho", pelo carrinho da loja (`useCart`), com a combinação
    curtida ou nenhuma.
- **Remover** é um formulário POST ao BFF `/<loja>/api/customer/favoritos`. Ele volta à aba com
  `?aviso=favorito-removido`, ou com `?erro-favoritos=<código>` quando falha. Assim a aba funciona
  sem script.
- **O esqueleto** fica no `Suspense`, como em Meus pedidos.
- **Os vazios:**
  - nunca curtiu: "Toque no coração de um produto para guardá-lo aqui", com a vitrine;
  - nada no filtro: o link que limpa o filtro;
  - não lido: tentar de novo.
- **O menu da conta passa a ter Favoritos, com a contagem** (`counts.ALL`), como a 6g desenha.
- **Nada promete aviso ainda.** A linha "te avisamos quando baixar de preço" entra com o J16, e por
  e-mail, nunca por WhatsApp.

### 5. Os fios

- **`shopper-forward` passa um 204 como 204.** `NextResponse.json` com 204 lança no Node, e a API dos
  favoritos responde 204 a curtir e descurtir.
- **O código de erro vira frase num lugar só:** `FavoriteErrorCode` entra no registro de erros do web,
  com as frases em pt-BR e en.
- **A leitura do servidor com a sessão** (`readAsShopper`) sai de `customer-orders.ts` para
  `lib/shopper-read.ts`, porque pedidos e favoritos passam a usá-la.

## Fora de escopo

- Compartilhar a lista.
- O aviso por e-mail (J16).
- O coração no menu do cabeçalho (J21 escolheu as entradas dele).
- O coração nos cards compactos de "Relacionados".

## Adendo da revisão (30/09)

O revisor de regras e acessibilidade terminou. O de correção parou no meio, por limite de uso da
conta, e eu mesmo fiz as verificações que ele tinha de fazer. O que mudou:

- **A volta do login pela página inicial perdia o coração.** O endereço `/loja?curtir=…` não passava
  pelo `safeBackOf`, que só aceitava `/loja` ou `/loja/…`. Agora a página inicial com parâmetros
  também é da loja. Continuam recusados `/lojaoutra?…` e um parâmetro com `//`.
- **O botão em palavras não é mais `aria-pressed`.** As palavras já dizem o estado ("Nos seus
  favoritos"), e um leitor de tela ouviria o estado duas vezes.
- **Uma leitura dos ids que falhou deixa o coração ativo.** O toque diz o motivo, em vez de deixar
  todos os corações apagados sem aviso.
- **"Esgotado" é lido, e "· avise-me" é só desenhado:** o Avise-me é pedido na página do produto.
- **O botão da ordem diz "Aplicar",** para não ter o mesmo nome do seletor.
- **Toques de 44px** no fechar do aviso e na porta do estado vazio.
- **Carregamento da ordem:** o esqueleto da barra de Meus pedidos segura a altura do título enquanto a
  ordem carrega.
- **O bloco `StorefrontFavoritesOutcome`** diz o que aconteceu depois de remover. Ele não estava
  previsto no plano.
- **Montadores em `lib/favorite-card-view.ts`:** o endereço do produto, a data e a ação de remover,
  com o slug codificado.
- **Fica registrado:** um link compartilhado com `?curtir=<id>` curte o produto para quem o abrir já
  com sessão. É um GET que muda estado, de impacto baixo (curtir é reversível e não expõe nada).
  Fica assim enquanto o J16 não mandar e-mail por causa disso. Se mandar, a curtida da volta passa a
  exigir que a pessoa tenha acabado de entrar.
