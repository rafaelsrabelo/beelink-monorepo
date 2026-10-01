# BEELINK-192 — O3 · Painel: as telas de Promoções e de Cupons

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> O3 do Épico O (BEELINK-189). Sai da branch do O2 (BEELINK-191, PR #160). Usa as rotas do lojista do
> O1 (BEELINK-190): nenhuma rota nova na API.

## Definição de Pronto

1. O painel tem a tela **Promoções** (`/admin/<slug>/promotions`) e a tela **Cupons**
   (`/admin/<slug>/coupons`), cada uma com a sua entrada no menu.
2. Cada tela lista o que a loja tem, da mais nova para a mais antiga, com a situação de cada linha
   (agendada, ativa, pausada, encerrada e, no cupom, esgotado), e filtra por situação com a
   contagem de cada uma.
3. O lojista cria e edita uma promoção num formulário com o nome, o alcance, a escolha de produtos
   ou de categorias, o desconto e o período.
4. O lojista cria e edita um cupom num formulário com o código, o tipo, o valor, o pedido mínimo, a
   validade e os dois limites.
5. O lojista pausa e religa uma promoção ou um cupom direto da lista.
6. O lojista vê os usos de um cupom, cada um com o pedido (com link), o cliente, quanto o cupom
   tirou e quando.
7. Uma recusa da API vira uma frase na tela, e um campo inválido é dito antes de enviar.
8. A lista carregando é um esqueleto, e a leitura que falhou diz que falhou e oferece tentar de novo.
9. Cada bloco novo tem história e teste com axe. `pnpm ci-check` está verde.

## Decisões

### 1. Duas telas, o formulário na própria tela

Promoções e Cupons são duas entradas no menu, e não abas de uma tela só: são duas listas, dois
formulários e dois vocabulários, e o lojista procura "cupom" pelo nome.

O formulário abre na própria tela, acima da lista, como em Categorias. Não há rota de "nova" nem
de "editar": criar leva menos de um minuto e não é um endereço que alguém compartilha. A situação
escolhida e a página ficam no endereço (`?situacao=ativas&pagina=2`), como nas Avaliações.

### 2. Os campos são os do lojista, e a conversão fica num lugar só

- **O percentual é digitado em por cento** ("10" ou "12,5") e vira basis points na borda. O valor
  fixo e o pedido mínimo são digitados em reais (`centsFrom`).
- **O início e o fim são data e hora no fuso da loja** (Brasília, `-03:00`, o mesmo que a API usa
  para o ano dos pedidos). O campo é `datetime-local`. Sem fim, a promoção roda até ser pausada.
- **O início de uma promoção nova vem preenchido com agora.**
- **O formulário não tem o interruptor "ativa".** Pausar e religar é um botão da lista. A API mantém
  o interruptor como está quando o corpo não o manda (adendo do O1), então editar uma promoção
  pausada não a religa.
- **A conversão e a conferência dos campos** ficam em `apps/web/src/lib/discount-form.ts`: o que a
  tela digitou vira o corpo do contrato, ou uma lista de campos a corrigir. As regras são as do O1
  (valor conforme o tipo, fim depois do início, alcance com a sua lista, formato do código).

### 3. A escolha de produtos e de categorias

- **Produtos:** uma busca no catálogo (a mesma leitura do registrar pedido) e a lista dos
  escolhidos, cada um com um botão de tirar. Até 200, o limite da API.
- **Categorias:** as categorias da loja como caixas de marcar, as subcategorias sob a mãe. A tela
  avisa que a promoção de uma categoria vale também para as subcategorias dela (decisão do O2).

### 4. Os usos do cupom

"Ver usos" abre, no lugar do formulário, a lista paginada dos usos do cupom: o número do pedido com
link para o pedido, o cliente, a data, quanto o cupom tirou e a situação do pedido. Um pedido
cancelado aparece marcado, porque o uso dele foi devolvido (O2).

### 5. Onde

- **`packages/ui/src/blocks/promotions/`:** os blocos de apresentação. As abas de situação, o selo, o
  esqueleto e o aviso de falha servem às duas telas.
- **`packages/ui/src/locales/`:** a seção `discounts`.
- **`apps/web`:**
  - `services/promotions/` (chaves, pedidos e hooks);
  - os manipuladores em `app/api/stores/[slug]/promotions` e `.../coupons`;
  - `lib/discount-view.ts` (o endereço e as linhas) e `lib/discount-form.ts` (os campos);
  - `components/promotions/` (as duas telas);
  - as frases dos códigos de `PromotionErrorCode` em `locales/`.
- **Uma mudança de promoção derruba o cache da vitrine** (`revalidateStore`). Hoje a vitrine não
  mostra promoção, mas o O4 passa a mostrar, e o manipulador que muda o que o visitante vê é quem
  invalida.

## Fora de escopo

- A opção "só na primeira compra" no formulário (O6).
- O preço promocional na vitrine (O4) e o cupom no checkout (O5).
- Apagar promoção ou cupom, e buscar cupom por código: a API do O1 não tem.
- O formulário de registrar pedido chamando a prévia do dono (O5).
