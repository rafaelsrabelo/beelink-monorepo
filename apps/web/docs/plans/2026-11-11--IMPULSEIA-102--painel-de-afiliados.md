# IMPULSEIA-102 (AF2) — as telas de afiliados no painel

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A segunda tarefa do épico [Afiliados](../../../../docs/plans/2026-10-24--afiliados.md), empilhada sobre
> a AF1 ([plano](../../../../docs/plans/2026-11-11--IMPULSEIA-101--programa-e-tabelas-de-comissao.md),
> PR #305). A API já existe; aqui só se desenha e liga.

## O pedido

O menu "Afiliados" no painel, com Configurações e Tabelas, o campo "Comissão de afiliado (%)" no
cadastro do produto e a coluna na listagem. Muda `apps/web` e `packages/ui`; a API fica como a AF1
entregou.

## Definition of Done

1. O menu do painel de uma loja ganha **Afiliados**, que leva a `/admin/<loja>/affiliates/settings`.
   As abas **Configurações** e **Tabelas** ficam no topo das duas telas. `/admin/<loja>/affiliates`
   leva a Configurações até a AF4 pôr lá a lista de afiliados.
2. **Configurações**: liga e desliga o programa, os dias da visita, o prazo de pagamento, os termos e
   a frase "Grátis durante o teste". Embaixo do prazo, os três períodos do mês com o dia em que cada
   um vence, que acompanham o prazo enquanto ele é digitado. O formulário recusa um campo fora da
   faixa antes de enviar, e diz em palavras o que a API recusou.
3. **Tabelas**: a lista (a Padrão primeiro e marcada), com o percentual geral e quantos produtos têm
   percentual próprio. Criar e editar num diálogo (nome e percentual); apagar com confirmação, e a
   Padrão sem o botão.
4. **Uma tabela** (`/affiliates/tables/<id>`): os produtos da loja, com busca e páginas no endereço,
   cada um com o percentual próprio nesta tabela ou o geral dela. Gravar e voltar ao geral, linha a
   linha.
5. **Produto**: com o programa ligado, o editor mostra "Comissão de afiliado (%)", que edita a
   tabela Padrão. Vazio segue o percentual geral, que aparece no campo; 0 é "não paga comissão". O
   percentual é gravado depois do produto, no mesmo "Salvar".
6. **Listagem de produtos**: com o programa ligado, a coluna "Comissão" mostra o percentual do
   produto na Padrão, ou o geral marcado como padrão. Tocar nela abre o produto no campo.
7. Handlers do BFF para cada rota da AF1, com teste; serviços com chaves de query por fábrica;
   esqueleto enquanto carrega; cópia em pt-BR e en.
8. Cada bloco novo de `packages/ui` com história e teste com axe; os mapas de superfície de web e ui
   atualizados; `pnpm ci-check` verde.

## Decisões

### As telas moram em `/affiliates/settings` e `/affiliates/tables`

A AF4 traz a lista de afiliados, que é o que o menu deve abrir quando houver afiliado. Com as telas de
hoje num endereço próprio, a AF4 troca só o destino de `/affiliates`, sem mudar endereço que alguém
salvou.

### O campo e a coluna aparecem só com o programa ligado

Como o cashback por produto: uma loja que não usa afiliados não vê campo nem coluna. A tabela Padrão
continua editável em Tabelas com o programa desligado, para quem prepara antes de ligar.

### O percentual do produto é gravado depois do produto, pelo mesmo "Salvar"

Ele não é do produto, é da tabela Padrão: vai por `PUT`/`DELETE …/rates/<produto>` como último passo
de `saveProduct`. Um produto novo só tem id depois de criado, por isso o passo vem por último. Se ele
falhar, o produto já está salvo e a tela fica onde está, com o rascunho, como nos passos de variações
(`SaveProductError`).

### A prévia soma o prazo digitado ao último dia de cada período

Os períodos (1–10, 11–20, 21–último dia) vêm da API. O web só soma ao último dia o prazo que está no
campo, para a prévia acompanhar a digitação antes de salvar. A regra dos períodos continua numa cópia
só.

### "Grátis durante o teste", sem o preço

A tela diz que afiliados são grátis durante o teste e que a loja será avisada antes de começar a
cobrança. O valor (R$ 9,90 por afiliado ativo por mês) entra com a cobrança, na AF10.

### Os blocos cheios foram divididos antes de crescer

`product-editor.tsx` (249 linhas) e `product-table.tsx` (245) estavam no limite. O diálogo de sair sem
salvar, a célula de preço e a de estoque viraram arquivos próprios, sem mudar o que desenham.

## Fora de escopo

- A lista de afiliados, o convite e a ficha: AF4.
- Escolher a tabela de um afiliado: AF4, quando o afiliado existir.
- O dinheiro (extrato, "quanto devo"): AF7.
