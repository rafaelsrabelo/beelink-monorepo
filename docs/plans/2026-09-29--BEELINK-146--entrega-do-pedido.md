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
