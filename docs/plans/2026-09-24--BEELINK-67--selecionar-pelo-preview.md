# BEELINK-67 — Clicar no bloco dentro do preview seleciona e abre o inspetor

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C4 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)). Depende
> do C1 ([plano](2026-09-24--BEELINK-64--faixa-de-um-bloco.md)).
> Área: UI + web · novo · G · ordem 17/17.

## O pedido

> Selecionar pelo preview; o painel vira inspetor do que está selecionado. A lista continua como
> estrutura, para arrastar e alcançar o escondido.
>
> - Clicar num bloco no preview seleciona ele e o painel mostra seus campos.
> - A seleção é visível no preview e na lista ao mesmo tempo.
> - Arrastar continua funcionando pela lista.

## O que já existe

Clicar num bloco no preview já abre os campos dele, e o preview já marca o bloco escolhido. Mas os
campos abrem numa folha lateral que se sobrepõe ao painel: enquanto ela está aberta, a lista fica
coberta, e a lista não marca qual bloco está escolhido. A seleção aparece em um lugar só.

## Definição de Pronto

1. Clicar num bloco no preview (ou no nome dele na lista) seleciona o bloco, e o painel mostra os
   campos dele no topo da aba de componentes, com o nome do bloco e um botão de fechar.
2. A lista continua visível embaixo dos campos. O bloco escolhido aparece marcado na lista (linha ou
   cartão) e no preview ao mesmo tempo.
3. Arrastar faixas e blocos continua funcionando pela lista com os campos abertos, e a lista alcança
   os blocos escondidos, que o preview não desenha.
4. Escolher outro bloco troca os campos sem fechar e abrir nada. Salvar ou fechar tira a seleção.
5. Com o teclado: escolher um bloco leva o foco para os campos; fechar devolve o foco para onde ele
   estava.
6. Escolher um bloco estando na aba de cores volta para a aba de componentes.
7. `pnpm ci-check` verde.

## Decisões

### 1. O inspetor é parte do painel, e não uma folha por cima

Os campos do bloco saem da folha lateral e passam a ser um cartão no topo da aba de componentes. A
lista fica embaixo, rolando junto. A folha da faixa continua folha: é aberta de um lugar só e não
tem par no preview.

### 2. A seleção é uma só, e os dois lados a desenham

A tela já guarda qual bloco está em edição. Esse id vira `selected` nos itens da lista, que a linha e
o cartão desenham com um contorno e `aria-current`, do mesmo jeito que o preview já faz.

## Fora de escopo

- Selecionar uma faixa pelo preview.
- Editar o texto direto no preview.

## Adendo — 24/09/2026, depois da revisão

A revisão independente confirmou seis pontos, todos corrigidos:

- **Ir para a aba de cores desmontava o inspetor.** A aba de componentes saía da página, o que foi
  digitado se perdia e o foco era puxado para o bloco do preview. A aba de componentes passa a
  ficar montada (escondida e inerte) enquanto as cores aparecem.
- **Depois de trocar de bloco, fechar devolvia o foco ao primeiro bloco aberto.** Quem abriu o
  inspetor passa a ser lido durante a renderização, antes de o inspetor anterior mexer no foco, e
  um inspetor substituído por outro não devolve o foco a ninguém.
- **Escolher de novo o mesmo bloco, estando nas cores, não voltava para os componentes.** A aba
  passa a ser da tela, que volta para os componentes a cada escolha, e não só quando o id muda.
- **`aria-pressed` nos nomes da lista** anunciava um botão de alternar que não alterna. Sai; a
  marca é o `aria-current` do item, como planejado.
- **A cor da barra de aviso:** com a folha da faixa mudando a cor enquanto o inspetor da barra
  estava aberto, salvar o inspetor desfazia a mudança. O inspetor só escreve a cor quando ela foi
  mudada nele.
- **Focar o título do inspetor rolava a página até o topo do painel.** Ao lado do preview, o painel
  fica fixo na tela e rola sozinho; medido: escolher um bloco não move a página.

Também atendido: o inspetor passa a ser descrito pelo nome do bloco (`aria-describedby`), e os testes
pedidos foram escritos (cartão escolhido, ordem inspetor-lista, foco depois de trocar de bloco).
