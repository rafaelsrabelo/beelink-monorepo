# IMPULSEIA-100 — a comissão própria do afiliado, definida no convite

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Segunda correção do épico [Afiliados](2026-10-24--afiliados.md) vinda do teste do Rafael em
> produção, depois de #305–#314 na `main`. Segue a [comissão por categoria](2026-11-12--IMPULSEIA-100--comissao-por-categoria-e-cpf.md).

## O pedido

Rafael, 12/11/2026, olhando o diálogo "Convidar afiliado" em produção, onde a tabela de comissão é
um seletor que só mostra "Padrão · 10%":

> "o principal é a tabela de comissão que não tá configurável"

Perguntado como queria, escolheu **"No próprio convite"**: o convite ganha a opção "Comissão própria
deste afiliado", onde o lojista define ali o percentual geral e, se quiser, por categoria e por
produto, só para esse afiliado; o sistema cria a tabela dele sozinho. Escolher uma tabela pronta
continua possível. O desenho aprovado:

```
Tabela de comissão
( ) Padrão · 10%
( ) Influenciadores · 15%
(•) Comissão própria deste afiliado
   Geral ........... [ 12 ] %
   + Por categoria   Suplementos [ 15 ] %
   + Por produto     Whey 900g   [  8 ] %
```

## Definition of Done

1. `CreateAffiliatePayload` leva **ou** `tableId` **ou** `commission` (`defaultRateBps`,
   `categoryRates[]`, `productRates[]`, cada taxa de 0 a 10000); os dois, ou nenhum, é `400
   AFFILIATE_INVALID`. Categoria ou produto de outra loja é `404`, repetido é `400`.
2. Com `commission`, a API cria na mesma transação uma **tabela própria** do afiliado
   (`CommissionTable.affiliateId`, único), com o nome "Comissão de <Nome>" (único na loja, com
   sufixo se preciso), e põe o afiliado nela.
3. Uma tabela própria não conta para o limite de 50, não pode ser escolhida para outro afiliado
   (`409 COMMISSION_TABLE_PERSONAL`), aparece em Tabelas marcada como do afiliado e é editada na tela
   de tabela que já existe (geral, por categoria, por produto).
4. Cancelar o convite apaga a tabela própria. Trocar o afiliado da tabela própria para uma
   compartilhada apaga a própria (os pedidos guardam a taxa). A ficha também troca para "Comissão
   própria", criando uma; mandar `commission` a quem já tem uma substitui as taxas dela.
5. A regra `produto ?? categoria ?? geral` não muda.
6. No diálogo de convite, o campo vira a escolha: as tabelas prontas e "Comissão própria deste
   afiliado", que abre o percentual geral e as linhas por categoria e por produto (o produto se busca
   pelo nome). Na ficha, a mesma escolha, e "Editar comissão" leva à tela da tabela própria.
7. `docs/product`, os mapas de superfície, e2e dos caminhos novos, e2e completo da API, `ci-check`,
   `delivery-check` e as telas exercidas no navegador.

## Decisões

### A tabela própria é uma tabela comum, com dono

Ela usa tudo o que uma tabela já tem — a tela, as rotas, a precedência, a cópia da taxa no pedido.
O que muda é só `affiliateId`: quem é o dono. Assim nada da comissão do pedido precisa saber que ela
existe, e o lojista edita a comissão própria no mesmo lugar onde edita qualquer outra.

### O nome é gerado e único

"Comissão de João Silva", cortado para caber em 60 caracteres; se a loja já tiver esse nome, "(2)",
"(3)". O lojista pode renomear depois, como qualquer tabela. Duas criações com o mesmo nome ao mesmo
tempo: a segunda tenta de novo com o próximo sufixo.

### Fora do limite de 50

O limite segura um script desgovernado nas tabelas que o lojista cria uma a uma. A tabela própria
nasce de um afiliado, e o número de afiliados não tem esse limite.

### Trocar de tabela apaga a própria

Uma tabela própria sem dono não serve a ninguém e só polui a lista. O pedido guarda o nome e a taxa
de cada linha, então apagar não mexe em histórico. Um afiliado encerrado mantém a dele.

### A ficha não edita as taxas da tabela própria em linha

A ficha mostra "Comissão própria" e o link "Editar comissão", que abre a tela da tabela. Duplicar o
editor de taxas na ficha seria uma segunda tela para a mesma coisa. Na troca de uma tabela pronta
para "Comissão própria", a ficha mostra o mesmo editor do convite, porque ainda não há tabela para
abrir.

## Fora de escopo

- Copiar uma tabela pronta para começar a própria a partir dela.
- Mostrar ao afiliado que a tabela é "só dele": o convite mostra o nome e as taxas, como sempre.
