# BEELINK-157 — J18 · Avaliar compras: a aba do cliente e o "Avaliar produto" no pedido entregue

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J18 do Épico J (BEELINK-138), empilhado sobre o J17 (#153), que fez a API. As telas são a 6c
> (Avalie suas compras) e a 6d (o "★ Avaliar produto" em cada linha do pedido entregue).

## Definição de Pronto

1. A aba Avaliar compras, em `/<loja>/conta/avaliacoes`, mostra:
   - os produtos entregues sem nota, com estrelas e comentário ali mesmo;
   - as avaliações já enviadas, que se editam ali.
2. O "★ Avaliar produto" aparece em cada linha do cartão do pedido entregue (J4) e do pedido (J5).
   Ele leva à aba, direto no produto.
3. O menu da conta mostra o número de pendentes.
4. A aba tem esqueleto, estado vazio e o resultado de cada envio (enviada, salva, ou o motivo da
   recusa).
5. Há testes da rota do BFF, dos blocos (com axe) e da leitura, e stories. `pnpm ci-check` está
   verde.

## Decisões

### 1. Formulários que funcionam sem script

- **Cada pendente e cada avaliação enviada é um formulário** que posta no BFF
  `/<loja>/api/customer/avaliacoes`:
  - `acao=criar` com `produto`, ou `acao=editar` com `avaliacao`;
  - `nota`, `comentario`, `retorno` e `entrada`.
- **A resposta é um 303 de volta à aba:**
  - `?aviso=avaliacao-enviada` ou `avaliacao-salva`;
  - ou `?erro-avaliacoes=<código>`, com `#avaliar-<produto>` para voltar ao ponto.
- **Sessão que acabou:** vai a Entrar, que volta à aba, como os avisos do J12.
- **A edição reenvia o comentário que está na caixa:** apagar o texto é remover o comentário, e o
  PUT recebe `null`.

### 2. As estrelas

- **São cinco rádios** dentro de um `fieldset` ("Sua nota"), cada um com o nome lido ("3 estrelas").
- **O desenho é só CSS:** os rádios vêm na ordem de 5 a 1 e a linha se inverte com `flex-row-reverse`.
  A estrela escolhida e as anteriores se pintam por `peer-checked:` nos irmãos seguintes.
- **Sem script, e o teclado anda pelas setas,** como num grupo de rádios. O foco se vê no grupo
  inteiro (`has-[:focus-visible]`).
- **A nota é obrigatória** (`required`): sem ela o navegador segura o envio, e a API recusa do mesmo
  jeito.

### 3. A aba

- **Duas seções:**
  - **"Para avaliar":** foto, nome, "Entregue em 12 set · Sabor: Uva", as estrelas, o comentário
    (opcional, até 1000) e "Enviar avaliação";
  - **"Suas avaliações":** o produto, as estrelas lidas, o comentário, "Oculta pela loja" quando for
    o caso, e "Editar" (um `details` com o mesmo formulário preenchido).
- **Com `?produto=<id>`** (o link do pedido), o formulário daquele produto vem aberto, e a âncora
  `#avaliar-<id>` leva até ele.
- **O vazio:** "Quando um pedido for entregue, você avalia os produtos aqui", com Meus pedidos.
- **O esqueleto** fica no `Suspense`.
- **O resultado de um envio aparece acima das seções.** O bloco de resultado da aba Favoritos vira
  genérico (`StorefrontAccountOutcome`) e passa a servir às duas abas.

### 4. "★ Avaliar produto" nos pedidos

- **Aparece nas linhas de um pedido Entregue** cujo produto ainda está à venda (tem `productSlug`),
  no cartão de Meus pedidos e na página do pedido.
- **Leva a `/conta/avaliacoes?produto=<id>#avaliar-<id>`:** o formulário, se ainda falta a nota, ou
  a avaliação dele para editar.
- **O cartão e a lista de itens** ganham `reviewHref` por linha.

### 5. O menu e as frases

- **Os links do menu:** `DELIVERED_ACCOUNT_TABS` ganha `reviews`, entre Favoritos e Perfil, como o
  design ordena.
- **O número no menu** é o tamanho da lista de pendentes, lida em cada página da conta, como a
  contagem de Favoritos.
- **Os códigos de erro:** os `ReviewErrorCode` entram no registro de erros do web, com as frases.

## Fora de escopo

- As estrelas dentro da Visão geral (J20).
- A aba do painel (J19).
- A seção da página do produto (D14).
- Fotos na avaliação.
