# BEELINK-307 (B18) — banner da categoria: uma imagem larga no topo da página da categoria

> Épico B (listagem). Referência do dono: a página de categoria de matconcasa.com.br, que abre com um banner largo entre o caminho ("Início › …") e o título, de cantos arredondados (cerca de 1136 × 150 px numa tela de 1280). A pilha fica `main` → I14 ([BEELINK-308](2026-10-07--BEELINK-308--categorias-so-a-arte.md)) → **B18**.

## O problema

Uma categoria tem uma imagem só — a do cartão — e a página da categoria não mostra imagem nenhuma. O lojista não tem como abrir a página de "Ferramentas" com a arte da campanha de ferramentas.

## Definição de Pronto

1. O formulário de categoria do painel tem um segundo campo de imagem, **Banner da página**, enviado pelo mesmo caminho de upload do campo de imagem, com o tamanho recomendado escrito na ajuda do campo.
2. Salvar grava o banner; limpar o campo o remove; um patch que não nomeia o campo não mexe nele. A API valida o endereço com a mesma regra de `imageUrl` (só http/https).
3. O banner sai na leitura pública do catálogo (`PublicProductCategory.bannerUrl`) e na do painel; o de uma loja nunca aparece em outra.
4. A página da categoria (`/<loja>/<categoria>`) mostra o banner entre o caminho e o título, **numa proporção só em toda largura de tela**, com cantos arredondados, `alt=""`, espaço reservado antes de carregar e carregamento imediato (está acima da dobra).
5. Sem banner, a página fica exatamente como hoje.
6. Uma subcategoria sem banner próprio mostra o da categoria-mãe; com banner próprio, mostra o dela. Uma categoria de primeiro nível sem banner não mostra nenhum.
7. Salvar ou limpar um banner pelo painel derruba o cache do catálogo da loja (`catalog:<slug>`), como toda escrita de categoria.
8. A busca e a listagem "todos os produtos" não mostram banner.
9. Copy pt-BR nos arquivos de locale, com o par em inglês; stories; testes (e2e da API, UI, web).
10. `pnpm ci-check` verde e o e2e completo da API verde.

## Decisões

Tomadas pelo assistente; o Rafael pode mudar qualquer uma.

1. **Subcategoria sem banner próprio (o ticket diz "definir"): mostra o da categoria-mãe.** Uma de primeiro nível sem banner não mostra nenhum. O formulário de uma subcategoria diz isso na ajuda do campo.
2. **Proporção 4:1, uma só em toda largura; arquivo recomendado de 1600 × 400 px.** A referência é mais baixa (perto de 7,5:1), mas ela troca de arte no celular; aqui o arquivo é um só, e a 390 px um 4:1 tem cerca de 90 px de altura — o mínimo para as palavras da arte se lerem — contra 72 px de um 5:1. No computador são cerca de 304 px de altura numa faixa de 1216 px. A razão de ser uma proporção só é a que `storefront-span-shape.ts` registra para os banners da home: uma moldura que muda de forma com a tela corta do mesmo arquivo, no celular, o que mostrava no monitor.
3. **A imagem cobre a moldura (`object-cover`)**: um arquivo na proporção recomendada aparece inteiro; um fora dela perde as bordas, igual em toda tela, em vez de ganhar barras.
4. **`bannerUrl` significa a mesma coisa nas duas leituras: o banner da própria categoria.** A herança da categoria-mãe é resolvida na vitrine, que já tem a categoria e a mãe em mãos (`place.category` e `place.parentCategory`), e não na API. Se a API devolvesse "o banner que a página mostra" na leitura pública, o mesmo campo significaria outra coisa na leitura do painel (que estende a pública), e o formulário de uma subcategoria abriria com o banner da mãe como se fosse dela — e o gravaria nela ao salvar.
5. **Mãe escondida não empresta banner.** A vitrine só conhece as categorias que a loja mostra; uma mãe oculta não está entre elas (o caminho da página também já a omite).
6. **Coluna nova anulável `product_categories."bannerUrl"`**, sem default: há migration, e nenhuma linha é reescrita.
7. **Sem limite de taxa nem regra nova**: o campo entra no DTO que já existe, ao lado de `imageUrl`.
8. **O banner é decorativo (`alt=""`)**: o `h1` logo abaixo já diz o nome da categoria.

## Fora do escopo

- Banner na busca, em "todos os produtos" ou na página "todas as categorias".
- Um arquivo diferente para o celular, link no banner, ou mais de um banner por categoria.
- Recorte da imagem no envio.
- Usar o banner como imagem de compartilhamento (Open Graph) da categoria.
