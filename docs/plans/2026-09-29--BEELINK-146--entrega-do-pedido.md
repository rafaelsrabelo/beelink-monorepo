# BEELINK-146 — J7 · A entrega do pedido: quem entrega, código de rastreio e previsão em janela

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J7 do Épico J (BEELINK-138). Empilhado sobre o J6 (`feat/BEELINK-145-comprar-de-novo`, PR #127).
> O doc de produto: "An estimated arrival is a **window** (from–to)". Telas: 6e e 6f, o bloco da
> transportadora.

## Definição de Pronto

1. Um pedido de entrega tem no máximo um registro de entrega, separado do pedido: quem entrega
   (entrega própria ou transportadora), a transportadora e o serviço (texto), o código de rastreio, o
   link de rastreio e a previsão como janela (de–até, em dias). Uma retirada não tem entrega.
2. A API grava e apaga a entrega pelas rotas do lojista e a devolve no pedido do lojista e no do
   cliente, com os tipos em `packages/contracts`. A janela precisa das duas datas, e a segunda não
   vem antes da primeira.
3. No painel, no pedido aberto (H4), o lojista preenche a entrega quando quiser. Ao marcar "Saiu para
   entrega" sem entrega preenchida, o formulário pede para preencher.
4. O cliente vê "Chega entre qui, 25 e sex, 26 de set." no cartão da lista (J4), na Visão geral e no
   pedido (J5), enquanto o pedido está a caminho. No pedido também vê quem entrega, o código com
   "Copiar" e "Ver no site da transportadora".
5. Testes (API, e2e, web e UI), histórias, migração escrita à mão e aplicada com `migrate deploy`, e
   conferência no navegador em :3100 (painel e loja).

## Decisões

### 1. A entrega é um registro à parte

`OrderDelivery`, um por pedido (`orderId` único), apagado com o pedido. Fica separado porque o futuro
app de entregador e as transportadoras vão escrever nele sem mexer no pedido. Os campos: `kind`
(`OWN` | `CARRIER`), `carrier`, `service`, `trackingCode`, `trackingUrl`, `estimateFrom`,
`estimateTo` (datas, sem hora).

### 2. O link dos Correios

Um código no formato dos Correios (duas letras, nove dígitos, duas letras) sem link do lojista leva à
página oficial de rastreamento dos Correios. Não há link público confirmado que já abra o objeto, e
os que abrem são de terceiros. Então o código fica ao lado, com "Copiar". Um link colado pelo lojista
vale sempre, se for `https`.

### 3. A previsão é uma janela de dias

"Chega entre qui, 25 e sex, 26 de set." com duas datas; "Chega qui, 25 de set." quando as duas são o
mesmo dia. Guardada como data, sem hora nem fuso: é um dia no calendário da loja. Só aparece
enquanto o pedido está a caminho: num entregue ou cancelado, a previsão não diz mais nada.

### 4. O painel não obriga

"Saiu para entrega" continua mudando o status na hora. Sem entrega preenchida, o bloco de entrega
aparece em destaque pedindo os dados, sem travar o status: o lojista de bairro que entrega de moto
nem sempre tem código.

## Fora de escopo

- Integração com transportadoras (Melhor Envio) e eventos de rastreio automáticos.
- O app do entregador.

## Adendo — revisão independente (2026-09-29)

Dois revisores leram a entrega: um a API e a migração, outro o painel e a loja. Correções:

1. **O link dos Correios virava o link do lojista.** A leitura do lojista devolvia a página dos
   Correios quando o código tinha o formato deles. O formulário a mostrava como se fosse digitada e,
   ao salvar de novo, gravava como do lojista. Agora o lojista lê só o que digitou, e a página dos
   Correios aparece apenas na leitura do cliente.
2. **Texto com emoji estourava a coluna.** O validador contava um emoji com seletor de variação como
   um caractere, e o Postgres como dois; o excesso virava erro 500. As medidas agora contam como a
   coluna conta (`MaxCodePoints`).
3. **Duas primeiras gravações ao mesmo tempo podiam dar 500.** O `upsert` aninhado no pedido lê e
   depois grava. Agora é o `upsert` direto na entrega, pelo `orderId` único, que o Postgres resolve
   com `ON CONFLICT`. Um e2e manda três ao mesmo tempo e fica uma entrega.
4. **Um link `http://` caía num erro genérico que fala de abas.** A recusa agora tem código próprio
   (`ORDER_DELIVERY_LINK_INVALID`): "O link de rastreio precisa começar com https://.". A dica do
   campo também diz isso, e está ligada ao campo.
5. **O cartão do painel remontava a cada gravação.** O foco caía no começo da página e "Entrega
   salva." nascia pronto, sem ser anunciado. Agora o rascunho recomeça no lugar quando a entrega
   salva muda. Os botões continuam focáveis enquanto salvam, e depois de "Remover" o foco vai ao
   título do cartão.
6. **"Entrega salva." aparecia depois de "Remover"** e ficava durante a edição. Agora só depois de
   salvar, e some quando o formulário muda.
7. **O botão Copiar falhava em silêncio.** Sem acesso à área de transferência, ou com ele recusado,
   o código fica selecionado para copiar à mão, e o botão diz "Código selecionado". Depois de alguns
   segundos ele volta a "Copiar".
8. **O cartão do painel não tinha o visual dos vizinhos**, e **um código longo empurrava a página
   para o lado no celular.** Os dois foram corrigidos.

### Aceito como está

A previsão usa a abreviação do português, com ponto: "Chega entre qui., 1 e sex., 2 de out.". O
ticket escreveu "qui 25" de modo informal, e cortar o ponto seria reescrever o que o idioma da loja
já sabe escrever.

### Dados de teste

O cliente de teste da loja-do-design ganhou rua, número, bairro, cidade e UF no `harness_wt`, para
fazer um pedido de entrega (o nº 18). Então a Visão geral dele não mostra mais "Falta a rua e a
cidade". O pedido nº 18 foi marcado "Saiu para entrega" e recebeu uma entrega pelos Correios.
