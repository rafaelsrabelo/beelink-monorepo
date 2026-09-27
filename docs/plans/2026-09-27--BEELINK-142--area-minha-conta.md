# BEELINK-142 — J3 · A área Minha conta: menu lateral, rotas por aba e o cabeçalho da loja

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J3 do Épico J (BEELINK-138). Empilhado sobre o J2 (`feat/BEELINK-141-pedidos-do-cliente-api`).

## Definição de Pronto

1. O menu lateral do design (6c a 6h) mostra:
   - as iniciais, o nome e o contato do cliente;
   - Visão geral · Perfil e endereços · Sair.

   Uma aba ainda não entregue não aparece. Meus pedidos (J4), Favoritos (J15), Avaliar compras
   (J18) e Falar com a loja (K3) entram cada uma no seu ticket. O menu já tem o lugar e a contagem
   de cada uma, e o ticket da aba só a liga.
2. Cada aba tem sua rota dentro da loja, em `/<loja>/<conta>/<aba>`, com as palavras da loja em pt e
   en, e um esqueleto por rota. Sem sessão, a rota leva a Entrar e volta para a aba pedida.
3. No celular, a página inicial da conta é o menu, em lista. Cada aba abre em tela própria, com um
   voltar para o menu.
4. O cabeçalho da loja segue o design: "Olá, Nome / Minha conta" leva à área. O link "Devoluções e
   pedidos" entra com Meus pedidos, no J4 (Decisão 3).
5. O formulário de hoje (G3, BEELINK-107) passa para Perfil e endereços sem mudar de comportamento:
   ele salva, volta ao carrinho e diz a recusa como antes.
6. Há testes de unidade e de componente, uma história por bloco e conferência no navegador em :3100.

## Decisões

### 1. As palavras das abas vão para `routeWords`

Os caminhos seguem a língua da loja, como `/produtos` e `/products`. As palavras novas ficam em
`routeWords.accountTabs`:

| Aba | pt | en |
|---|---|---|
| Pedidos | `pedidos` | `orders` |
| Perfil e endereços | `perfil` | `profile` |
| Favoritos (J15) | `favoritos` | `favorites` |
| Avaliar compras (J18) | `avaliacoes` | `reviews` |
| Conversas (K3) | `conversas` | `messages` |

Já ficam declaradas para a URL não mudar depois. A aba só aparece quando o ticket dela entra.

### 2. A raiz da conta é a Visão geral mínima

Sem o J20, a raiz não pode ser uma página vazia. No computador, `/<loja>/conta` mostra o menu e a
Visão geral do design reduzida ao que já existe: "Olá, Nome" e os atalhos das abas entregues. O J20
acrescenta o pedido em andamento, as avaliações e os favoritos. No celular, a mesma rota é o menu em
lista, e cada aba é uma tela própria.

### 3. Meus pedidos entra com o J4, e o link do cabeçalho junto

O ticket pede as duas coisas: que "Devoluções e pedidos" leve a Meus pedidos e que uma aba não
entregue fique fora do menu. Não dá para cumprir as duas no J3, porque a lista é o J4, o próximo
ticket. Fica a regra do menu. O J3 deixa a rota, a palavra e o item de menu prontos, desligados, e o
J4 liga o item, com a contagem de em andamento que vem do J2, e o link do cabeçalho.
