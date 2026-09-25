# BEELINK-84 — Filtros no celular: "Filtrar (N)" e uma folha de baixo

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B8 do épico BEELINK-25 (listagem). Empilhado sobre o B15 (BEELINK-96). Fecha a parte de filtros do
> refoco de 24/09/2026.

## O pedido

5a só desenha o desktop. Abaixo de `shop-lg` a coluna de filtros some, e o celular precisa de outra
porta para os mesmos grupos.

## Definição de Pronto

1. Abaixo de `shop-lg`, acima da grade, "Filtrar (N)" e os chips. N é o número de chips: a
   categoria da rota e o termo buscado não contam.
2. O botão abre uma folha de baixo com os mesmos grupos da coluna (Categoria, Preço, Desconto,
   opções).
3. O rodapé da folha diz "Ver N resultados" com o total da prateleira como ela está, e fecha a
   folha.
4. Esc fecha e o foco volta ao botão.
5. Grade de 2 colunas no celular e 3 no tablet (as container queries do B4 já fazem).

## Decisões

### 1. Os grupos são desenhados uma vez só

A listagem monta os grupos uma vez e os entrega à coluna do desktop e à folha do celular. Não existe
uma segunda implementação de filtro para o celular.

### 2. Marcar dentro da folha filtra atrás dela

A folha é um portal, mas eventos React sobem pela árvore React, não pela do DOM, então a ilha do B16
recebe os cliques de dentro dela. Uma marcação navega no lugar, a folha continua aberta, e o botão e
o rodapé mostram os números novos. "Ver N resultados" só fecha.

### 3. A paleta vai junto para o portal

Fora da janela da loja não existem as variáveis `--shop-*`. A folha lê a paleta do contexto da
janela e a aplica no conteúdo, como o aviso de reposição já faz.

### 4. Os chips viram um bloco

Os chips saem da coluna para `StorefrontFilterChips`, usado pela coluna e pela fileira do celular.

### 5. Sem JavaScript, o celular fica com a ordenação e as subcategorias

A folha precisa de script. Sem ele, a ordenação (formulário GET) e a fileira de subcategorias
continuam funcionando; os chips também, porque são links.

## Fora de escopo

- Prever N antes de aplicar, o que exigiria uma chamada ao BFF a cada marcação.
