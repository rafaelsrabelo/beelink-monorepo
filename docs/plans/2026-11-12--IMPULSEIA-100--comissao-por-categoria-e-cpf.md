# IMPULSEIA-100 — comissão por categoria, e telefone e CPF no cadastro do afiliado

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Correções do épico [Afiliados](2026-10-24--afiliados.md) vindas do primeiro teste do Rafael, com
> #305–#311 já na `main`, o #312 esperando o CI e o #313 segurado sem merge. Empilhado sobre o #313.

## O pedido

Rafael, 12/11/2026, testando o painel:

> "Tabela de comissão tá fixa Padrão - 10% PORÉM é pra ser personalizável, por produto, por
> categoria, entende? Outro detalhe, no cadastro de afiliado é obrigatório telefone e tem que ter o
> CPF."

O que já existia: a tabela tinha um percentual geral, editável só por um lápis pequeno na lista, e
taxa por produto numa tela que se abria por "Abrir". Não havia taxa por categoria. O cadastro pedia
nome, e-mail e tabela; telefone era opcional e CPF não existia.

## Definition of Done

1. Uma tabela tem taxa por **categoria**: `CommissionTableCategoryRate` (tabela, categoria, 0 a
   10000 bps), apagada com a tabela ou com a categoria; `PUT`/`DELETE
   stores/:slug/affiliate-program/tables/:tableId/category-rates/:categoryId`; categoria de outra
   loja é `404`. A tabela inteira devolve as taxas por categoria e o resumo conta quantas.
2. A taxa de um item é `produto ?? categoria do produto ?? geral da tabela`, numa função pura com
   teste, usada pelo pedido (`holdOrderCommission`), pela área do afiliado (o link de cada produto) e
   pelo convite (que mostra as categorias com taxa própria). A linha do pedido continua guardando a
   taxa resolvida.
3. A tela de uma tabela — a Padrão também — mostra o **percentual geral editável ali mesmo**, uma
   seção **"Por categoria"** com um campo por categoria da loja (vazio segue o geral) e a seção
   **"Por produto"**. Na lista de tabelas, editar é um botão com texto.
4. O cadastro do afiliado exige **telefone** e **CPF** (válido, só dígitos). CPF repetido entre os
   afiliados não encerrados da loja é `409 AFFILIATE_CPF_TAKEN`; inválido ou faltando é `400
   AFFILIATE_INVALID`. A ficha mostra e edita telefone e CPF; um afiliado convidado antes mostra "não
   informado".
5. O CPF só chega à loja: nunca no cartão público, nem em e-mail. A área do afiliado mostra o
   próprio CPF mascarado, só para leitura.
6. Compra própria passa a valer também pelo CPF: o CPF do cliente igual ao do afiliado zera a
   comissão, como o e-mail e o telefone já faziam.
7. A política de privacidade do #313, ainda não publicada, passa a citar o CPF entre os dados do
   afiliado. `docs/product` e os mapas de superfície acompanham.
8. `pnpm ci-check` verde, e2e completo da API verde, `delivery-check` sem bloqueio, e as telas
   exercidas no navegador.

## Decisões

### A categoria entra entre o produto e o geral

Um produto tem uma categoria só (`Product.categoryId`), então a ordem é uma só e não há empate:
produto, depois a categoria dele, depois o geral. A taxa do produto vence porque é a mais
específica: o lojista que quer "toda a categoria Bolsas a 15%, menos esta bolsa a 5%" escreve as duas.
Um produto sem categoria vai direto ao geral.

### A taxa é resolvida na hora do pedido e guardada, como antes

Mudar a taxa de uma categoria vale para os pedidos feitos dali em diante. O pedido guarda a taxa de
cada linha já resolvida (decisão 3 do épico), então trocar um produto de categoria depois não mexe
em comissão nenhuma.

### O lojista digita o CPF e o telefone

"No cadastro de afiliado" é o formulário do lojista. É ele quem paga o afiliado e quem responde pelos
dados dele (decisão 11 do épico), então é ele quem informa. O afiliado não edita o CPF na área dele:
é a identidade do vínculo com a loja, e trocá-lo é com o lojista.

### Coluna anulável, obrigatória no formulário

Os afiliados convidados antes desta mudança não têm CPF e podem não ter telefone. A coluna fica
anulável e o DTO de convite a exige; a ficha mostra "não informado" e deixa o lojista completar.
Nada no banco força o preenchimento, para não travar a migração em produção, onde o #307 já pode
ter convites.

### CPF único só entre os não encerrados

Como o e-mail: um afiliado encerrado e convidado de novo começa um vínculo novo com o mesmo CPF.

### A política é a mesma versão, editada

A versão `2026-11-12` do #313 nunca foi publicada: não foi mergeada, ninguém a aceitou. A regra de
"Accounts" (uma versão publicada nunca é editada) protege o que alguém aceitou, e aqui ninguém
aceitou nada. Acrescentar o CPF na mesma versão, antes de ela ir ao ar, é o certo; uma versão nova no
mesmo dia seria uma segunda leitura obrigatória para todo mundo, sem motivo. O aviso de revisão
jurídica continua.

## Fora de escopo

- Taxa por variante.
- Validar o CPF contra a Receita.
- Mostrar o CPF do afiliado ao cliente ou em qualquer e-mail.
