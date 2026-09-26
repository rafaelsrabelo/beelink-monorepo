# BEELINK-117 — API: o estágio do CRM sai dos pedidos

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> H5 do Épico H (pedidos e CRM). Empilhado sobre o H4 (BEELINK-116); usa o resumo do cliente que o
> H1 grava.

## Definição de Pronto

1. `CustomerStage` passa a ser `"LEAD" | "CUSTOMER" | "INACTIVE"`:
   - Lead não tem nenhum pedido válido;
   - Cliente fez o último pedido válido há até N dias;
   - Inativo fez o último pedido válido há mais de N dias.
2. `StoreCustomer` ganha pedidos, total gasto, último pedido e dias sem comprar.
3. A loja ganha `inactiveAfterDays`: padrão 60, entre 7 e 365, editável nas configurações da loja.
4. A lista de clientes aceita `stage` e `sort` (recentes, último pedido, mais pedidos, maior gasto) e
   devolve a contagem por estágio, para as abas do H6.
5. Aceite:
   - com N = 60, quem comprou há 61 dias é Inativo e quem comprou há 59 é Cliente;
   - mudar N para 90 muda os estágios na hora, sem migração;
   - pedido cancelado não conta para nenhum número nem para o estágio.

## Decisões

### 1. O estágio é calculado na leitura, nunca guardado

O H1 já mantém `ordersCount` e `lastOrderAt` só com pedidos válidos, na mesma transação que cria ou
cancela. O estágio é uma conta sobre esses dois números e o N da loja. Por isso trocar N vale na
hora e nenhum job precisa rodar à meia-noite.

### 2. "Há N dias" conta dias inteiros

Os dias sem comprar são os dias inteiros desde o último pedido válido (`floor`). É Cliente quem está
em até N dias: com N = 60, 60 dias e algumas horas ainda é Cliente, e 61 dias já é Inativo. O
filtro por estágio no banco usa o mesmo corte (`lastOrderAt > agora − (N + 1) dias`), para a aba e o
selo nunca discordarem.

### 3. As contagens por estágio respeitam a busca e ignoram o filtro de estágio

As abas do H6 mostram quantos há em cada estágio para a busca digitada. Filtrar por um estágio não
zera os outros dois.

### 4. A ordenação desempata sempre pelo mais novo

Recentes ordena por cadastro. Último pedido deixa quem nunca comprou no fim. Mais pedidos e maior
gasto desempatam pelo cadastro mais novo, e depois pelo id, para a paginação nunca repetir nem pular
alguém.

### 5. N é opcional no PUT da loja

O PUT substitui a loja inteira. Um `inactiveAfterDays` ausente mantém o valor guardado, em vez de
voltar para 60, para que um cliente antigo da API não apague a escolha do lojista.

## Fora de escopo

- As abas, colunas e ordenação na tela de Clientes (H6) e a ficha do cliente (H7). A lista do G6
  continua igual e só ganha o selo "Inativo".
