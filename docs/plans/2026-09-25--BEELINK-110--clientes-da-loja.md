# BEELINK-110 — Os clientes da loja no painel

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> G6 do Épico G (conta do cliente). Pedido na revisão do Rafael de 25/09. Empilhado sobre o B10
> (BEELINK-86).

## O pedido

A página Clientes do painel era um "em breve". Quem cria conta na loja já é cliente dela; quem tem
conta e nunca comprou é um lead — a base do CRM que vem depois.

## Definição de Pronto

1. Uma conta criada na vitrine aparece na lista da loja na hora, antes do primeiro login e mesmo com
   o e-mail ainda não confirmado (marcado como "e-mail não confirmado").
2. A lista é só da loja: outra loja do mesmo dono não vê o cliente; outra conta recebe 403 e o token
   de um cliente é recusado.
3. Nome, contato (e-mail e telefone), cidade/UF, estágio e a data da conta; mais recentes primeiro,
   paginada, com busca por nome, e-mail ou telefone (o telefone aceita "(11) 97777").
4. Estágio: **Lead** para quem tem conta e nunca comprou. **Cliente** chega quando os pedidos forem
   registrados — hoje o pedido sai pelo WhatsApp e não fica na base, então todos são Lead.

## Decisões

### 1. O registro da loja nasce no cadastro

Antes, o registro do cliente na loja só nascia no primeiro login. Agora nasce no cadastro feito na
vitrine. Um e-mail que já tinha conta não ganha registro: qualquer um pode digitar o e-mail de outra
pessoa, e isso a colocaria na lista de uma loja em que ela nunca entrou.

### 2. Contas antigas

Quem se cadastrou antes desta mudança e nunca entrou na loja não tem registro, e não aparece. Não há
como saber em que loja uma conta antiga foi criada; ela aparece no primeiro login.

### 3. O estágio já está no fio

`stage` é `LEAD | CUSTOMER` no contrato desde já, para o painel e o CRM lerem o mesmo campo no dia em
que os pedidos forem registrados.

## Fora de escopo

- Editar, excluir e exportar clientes; o funil do CRM; pedidos registrados.
