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

## Adendo — o convite passo a passo, o documento e o desenho do Rafael (12/11/2026)

O Rafael, criando um afiliado:

> "na criação tem que ser passo a passo … hoje é um formulário num dialog, não tá iterativo, não tá
> intuitivo, tá faltando a personalização da comissão e anexo de documento com foto, frente e costa
> e qual tipo de documento"

Depois mandou uma referência ("queria um multi step form") e, por fim, **desenhou o convite ele
mesmo**. O desenho dele é a referência; as decisões abaixo são dele, com os ajustes combinados.

### O convite vira uma página em quatro passos

`/admin/<loja>/affiliates/new`, com o diálogo antigo apagado:

1. **Dados do afiliado** ("Nome, e-mail, telefone e CPF") — telefone e CPF obrigatórios, com
   máscara, CPF conferido pelos dígitos já no navegador, e o erro debaixo de cada campo.
2. **Tabela de comissão** ("Por categoria ou produto") — "Partir de" uma tabela pronta, a comissão
   padrão grande com −/+, a barra e os atalhos 5/10/15/20%, e a árvore de categorias com os
   produtos, cada linha com "Segue o padrão" / "Segue a categoria" e "Personalizar", que vira um
   controle −/+ com volta ao herdado; busca; e, por produto, "afiliado ganha R$ X por venda".
   Sem nenhuma personalização, o afiliado fica na tabela de partida; com qualquer mudança, vira a
   tabela própria dele, que começa da de partida (o `commission` do convite).
3. **Documento** ("Foto da frente e do verso") — tipo RG, CNH, CIN, RNE/CRNM ou Passaporte (o
   passaporte não pede verso), JPG, PNG, WebP ou PDF, arrastar ou clicar, trocar ou remover, e
   **"Dá para anexar depois"**: o documento é opcional no convite, e a ficha mostra "Documento
   pendente" com o envio ali.
4. **Revisão** ("Conferir e enviar") — um cartão por passo, cada um com "Editar", e a anotação.

Depois, "Convite enviado", com "Convidar outro afiliado" e "Ver afiliado". O progresso é
"Passo N/4", com a barra em N/4. No celular, o passo a passo vira uma barra no topo.

### O documento é privado

As fotos vão para o Cloudinary como arquivos `authenticated`, numa pasta da loja, e o banco guarda
só o tipo e os ids. A loja lê por links que a API assina e que valem dez minutos; o afiliado, o
cartão da vitrine, os e-mails e os logs nunca os veem. Cada foto sobe enquanto o convite é
preenchido e espera um dia para ser usada; a não usada é apagada pelo sweeper. Cancelar o convite
apaga as fotos (com aviso no log, sem nome de arquivo, se o Cloudinary não confirmar).

### A política de privacidade ganha uma versão nova

A `2026-11-12` foi publicada e não se edita: a `2026-11-13` diz que a loja guarda o tipo e as fotos
do documento do afiliado, quem vê e por quanto tempo. Revisão jurídica antes do deploy.

### Fora de escopo, do desenho

- **"Tipo de comissão" com valor fixo em R$ por venda.** A API calcula só percentual; o valor fixo
  muda a conta do pedido (AF6) e o extrato, e é uma tarefa própria.
