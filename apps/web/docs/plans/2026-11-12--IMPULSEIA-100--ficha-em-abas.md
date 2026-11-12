# IMPULSEIA-100 — a ficha do afiliado em abas

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Correção de tela do épico [Afiliados](../../../../docs/plans/2026-10-24--afiliados.md), vinda do
> teste do Rafael em produção. Só o web e o design system mudam; a API não.

## O pedido

Rafael, 12/11/2026, olhando `/admin/<loja>/affiliates/<id>`:

> "achei muito feio a página de afiliados por id, devia ser em tabs"

Com uma referência: uma página de configurações com o nome da pessoa e uma linha embaixo, as ações à
direita, uma fileira de abas e, em cada aba, seções com linhas de **rótulo à esquerda · valor no
meio · "Editar" à direita**, separadas por linhas finas.

Hoje a ficha é uma coluna de cartões empilhados: detalhes, dinheiro, vitrine, documento, um formulário
de cadastro e um cartão de ações.

## Definition of Done

1. **Cabeçalho**: voltar para a lista; foto ou iniciais, nome, situação (Convidado, Ativo, Pausado,
   Encerrado), e-mail e o link `/<nome>`; à direita **Copiar link** e a ação principal da situação
   (Reenviar convite, Pausar, Retomar), com as outras num menu "⋯" (Cancelar convite, Encerrar), com
   as confirmações de sempre.
2. **Abas**, cada uma um endereço (`?aba=geral|comissao|documento|financeiro|pedidos`), de modo que
   recarregar e voltar mantêm a aba: **Geral**, **Comissão**, **Documento**, **Financeiro**, **Pedidos**.
3. **Geral**: a seção "Dados" em linhas — Foto (tirar), Nome, E-mail, Telefone (Editar), CPF
   (Editar), Link (copiar), Chave Pix, Frase (tirar), Termos, Anotação (Editar) — e "Histórico"; com o
   convite aberto, quando foi enviado e até quando vale. Editar troca o valor por um campo, com Salvar e
   Cancelar, na própria linha.
4. **Comissão**: a tabela (trocar e salvar), a comissão própria com "Editar comissão" ou "Personalizar",
   o percentual geral, as categorias com percentual próprio e quantos produtos têm o seu.
5. **Documento**: o que já existe (tipo, frente e verso por link assinado, enviar ou trocar,
   "Documento pendente").
6. **Financeiro**: o saldo, o extrato, "Registrar pagamento" e "Ajustar", como hoje; para quem ainda
   está convidado, uma linha dizendo que não há movimento.
7. **Pedidos**: os pedidos atribuídos ao afiliado, com número, data, situação e total, cada um levando
   ao pedido, com paginação.
8. As linhas são um bloco reutilizável do design system (`settings-section`, `settings-row`,
   `settings-editable-row`); no celular as abas rolam de lado e cada linha empilha o rótulo sobre o
   valor, com o Editar ao lado do rótulo.
9. `pnpm ci-check` verde, `delivery-check` sem bloqueio, e cada aba percorrida no navegador, no
   computador e numa largura de celular.

## Decisões

### Uma reorganização, nada novo por trás

Cada aba usa os hooks e as mutações que já existem (AF4, AF7, #314, #315). Nenhuma rota nova.

### A aba Pedidos não mostra a comissão de cada pedido

A lista de pedidos da loja (`GET /stores/:slug/orders?affiliateId=`, do AF7) não traz a comissão, e
não existe leitura das comissões de um afiliado do lado da loja. Abrir o pedido mostra a comissão
dele. Uma coluna de comissão pediria uma rota nova; fica fora.

### Nome e e-mail não se editam

A API não muda o nome nem o e-mail de um afiliado (o e-mail é a conta dele). As duas linhas ficam sem
"Editar".

### A aba é um endereço, Geral quando não há nenhuma

Como as abas da área do afiliado (`?aba=`), com palavras em português. Uma palavra desconhecida cai em
Geral.

### Os blocos antigos saem

`affiliate-record-details`, `affiliate-record-form`, `affiliate-record-actions` e
`affiliate-showcase-card` deixam de ser usados e são apagados, com as histórias e os testes passados
para os blocos novos.

## Fora de escopo

- A comissão por pedido na aba Pedidos (rota nova).
- Editar nome ou e-mail do afiliado.
