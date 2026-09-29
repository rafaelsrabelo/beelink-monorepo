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

## Adendo — revisão independente (28/09/2026)

Três leituras foram pedidas: rotas e sessão, interface e acessibilidade, escopo e contrato. A
terceira e todos os verificadores caíram no limite semanal da conta, então os seis achados das duas
leituras chegaram sem verificação e foram julgados aqui. A checagem de escopo e contrato (fixtures,
Swagger, spec do mapper, docs) tinha sido feita à mão antes do commit. Quatro achados confirmados,
mais uma lacuna de teste, todos corrigidos:

1. **A loja em cache derrubava o carrinho, não só a área.** Depois de a API passar a mandar
   `accountTabs`, o cache da loja no web guarda a forma antiga por até um minuto, e "Alterar dados"
   do carrinho lia `accountTabs.profile` de `undefined`. `accountTab` agora cai para a raiz da área
   quando a loja lida ainda não soletra as abas.
2. **No celular a raiz da conta não tinha título.** O menu é a página, e o "Olá, Nome" fica escondido
   com a visão geral. A raiz ganhou um `h1` "Minha conta" só no celular.
3. **O cartão do G3 flutuava centralizado na coluna da aba.** Agora fica sob o título, como no 6h.
4. **A régua do menu vinha depois de todos os itens.** No 6c ela separa as páginas da conta de
   "Falar com a loja" e "Sair". Quando o K3 ligar a conversa, ela já cai abaixo da régua.
5. **O 404 de uma aba não entregue não tinha teste.** A regra virou `deliveredAccountTabOf`, com
   teste, e a página a usa.

Dois achados eram o mesmo (o do cache).
