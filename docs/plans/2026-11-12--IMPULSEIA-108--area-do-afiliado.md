# IMPULSEIA-108 (AF8) — a área do afiliado, `/afiliado`

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A oitava tarefa do épico [Afiliados](2026-10-24--afiliados.md), empilhada sobre AF7 (#311). Vale o
> que as decisões 1 e 2 dizem, **como o adendo de 11/11 as mudou**: o afiliado vê o nome de quem
> comprou (item B), edita a foto e a frase (item D), a área é `/afiliado` (item F) e mostra o próximo
> pagamento ("As tarefas mudam").

## O pedido

O afiliado entra com a conta do bee-link e acompanha, loja a loja, o que vende: os links para
compartilhar, os números, os pedidos com o nome do cliente, o extrato, os pagamentos que a loja
registrou e o próximo pagamento. Ele mesmo mantém a chave Pix, o telefone, a foto e a frase. E recebe
um e-mail quando a loja registra um pagamento.

## Definition of Done

1. **API, só do afiliado**, sob `affiliate/stores`: a lista das lojas da conta e, por loja, o início
   (vínculo, saldos, próximo pagamento, números dos últimos 30 dias, os dados dele), os produtos com o
   link e o percentual de cada um, os pedidos, o extrato e os pagamentos. Guardada pelo vínculo da
   conta com a loja `ACTIVE`, `PAUSED` ou `ENDED`; convidado não entra. Responde página travada.
2. **Nada de contato do cliente:** o pedido lido pelo afiliado tem o nome do cliente e nenhum telefone,
   e-mail, CPF ou endereço; o extrato não tem autor. Um e2e confere a resposta inteira.
3. **Os dados dele:** `PATCH affiliate/stores/:storeSlug/profile` grava chave Pix (conferida e
   normalizada), telefone, foto (endereço do módulo de uploads) e frase (até 100). Encerrado mexe só
   na chave Pix e no telefone.
4. **E-mail do pagamento:** registrar um pagamento (AF7) deixa um aviso numa caixa de saída, um por
   pagamento, mandado sozinho, com o valor, o dia, o jeito e o caminho para o extrato.
5. **Web `/afiliado`:** as lojas da conta, com o saldo e o estado de cada vínculo; vazia quando não há.
6. **Web `/afiliado/<loja>`:** Início (saldos, próximo pagamento, link principal com "copiar",
   números), Produtos (link de cada produto com "copiar" e o percentual), Vendas (pedidos com o nome do
   cliente e a comissão), Extrato (linhas e pagamentos) e Meus dados (Pix, telefone, foto, frase).
   Abas no endereço; esqueleto enquanto carrega.
7. **Como se chega:** sem sessão, `/afiliado` leva ao login, que volta; `/afiliado/convite` continua
   público. Uma conta sem loja e com vínculo cai em `/afiliado` depois do login; quem é lojista e
   afiliado tem a entrada no menu da conta do painel. A loja de slug `convite` não pode existir.
8. Contracts primeiro; e2e das rotas novas e o e2e completo da API verde; blocos novos com história e
   teste com axe; handlers do BFF com teste; mapas de superfície; `pnpm ci-check` verde; o fluxo
   dirigido no navegador como a afiliada.

## Decisões

### Um vínculo por loja na área

A conta pode ter, na mesma loja, um vínculo encerrado e um novo (o épico deixa convidar de novo). A
área lê o vivo (`ACTIVE` ou `PAUSED`) e, sem ele, o encerrado mais recente. A história de um vínculo
encerrado antes do atual não aparece na área: o lojista a vê na ficha dele. Mostrar os dois juntos
pediria somar extratos que o livro mantém separados de propósito.

### Rotas próprias, abertas à página travada

`affiliate/stores/:storeSlug/...`, nunca as do lojista: o vínculo é a única chave. Todas respondem
`@OpenWhileLocked()` (regra 12 do `apps/api/AGENTS.md`): o que a loja deve ao afiliado não some porque
a loja não pagou o bee-link. Uma loja que mudou de endereço responde como a vitrine responde
(`STORE_MOVED`). Sem vínculo, `404 AFFILIATE_NOT_FOUND` — a loja é pública, o vínculo não.

### Os números: os últimos 30 dias

Visitas (a soma de `AffiliateVisitDay`), pedidos creditados feitos no período (os cancelados não
contam), vendas (desses, os entregues) e comissão (a soma das comissões desses pedidos que não foram
estornadas). Trinta dias pelo calendário de Brasília, contando hoje. Um período só: é o que cabe num
cartão, e o extrato guarda o resto.

### O próximo pagamento

Dois números: o **disponível agora** (o saldo, se positivo — a loja paga por fora) e o **próximo
vencimento** (o dia mais perto entre as comissões pendentes já com dia, e a soma delas). O dia vem do
calendário de AF1, gravado na entrega por AF6; aqui só se lê.

### Os links

O link principal é `/<loja>/<nome>`. O de um produto é `/<loja>/<produtos>/<slug>?afiliado=<nome>`,
montado pela API com as palavras de rota da loja, para o web não guardar uma segunda cópia delas. Os
dois no endereço do bee-link: uma loja com domínio próprio leva até ele (`308`), com o parâmetro. Só
produtos ativos, paginados e com busca pelo nome, cada um com o percentual da tabela do afiliado
(`tabela.produto ?? tabela.geral`). Pausado vê os links com o aviso de que não creditam agora;
encerrado não vê links.

### Os dados dele

- **Chave Pix:** e-mail, chave aleatória, telefone com `+55`, CPF ou CNPJ, guardados normalizados
  (`AF3` deixou "conferir o formato" para cá). O aceite do convite (AF3) continua aceitando texto livre;
  conferir lá também fica para quando o aceite for mexido.
- **Telefone:** como o lojista o grava (dígitos com o código do país).
- **Foto:** o endereço que o módulo de uploads devolve — só `https://res.cloudinary.com/…`. A foto
  aparece na vitrine da loja; um endereço qualquer seria uma imagem de fora na página de outra pessoa.
- **Frase:** até 100 caracteres, vazia é nenhuma.
- Encerrado edita só Pix e telefone (é por onde a loja ainda paga o que deve); foto e frase são da
  vitrine, onde ele não aparece mais: `409 AFFILIATE_STATUS_INVALID`.
- Mudar foto ou frase derruba a tag da loja no web, como pausar faz: a vitrine guarda o afiliado um
  minuto sob ela.

### O e-mail do pagamento

`affiliate_payout_notices`, uma linha por pagamento, escrita na transação do pagamento (AF7) e mandada
pelo `AffiliatePayoutMailer` (`OutboxMailer`), logo depois do commit e, se falhar, no relógio dele. O
botão leva a `/afiliado/<loja>?aba=extrato`.

### O web

- Um grupo próprio, `(affiliate)`, com um cabeçalho simples — a marca, o menu da conta (nome, e-mail,
  "Painel da loja" para quem tem loja, sair) — e sem o menu de loja: a área não é o painel de uma
  loja.
- O proxy toma para si `/afiliado` e `/afiliado/<loja>` como toma o painel; `/afiliado/convite` segue
  público. O login volta a uma página da área.
- `/afiliado` lista sempre, mesmo com uma loja só: é para onde os e-mails levam, e voltar dela não quica.
- `/dashboard` (onde o login cai) manda para `/afiliado` a conta sem loja e com vínculo.
- O menu da conta no painel ganha "Minhas vendas como afiliado" quando a conta tem vínculo.
- `convite` entra nos slugs reservados de loja: `/afiliado/convite` é estático e esconderia a área de
  uma loja com esse slug. **Antes do deploy, conferir que nenhuma loja já o usa.**

## Fora de escopo

- Trocar o `/nome` depois do aceite (épico).
- E-mail por venda além dos de AF6; exportar planilha.
- A política de privacidade nova, `docs/product`, o e2e do fluxo inteiro e ligar
  `AFFILIATE_LINKS_ENABLED`: AF9.
- Ver a história de um vínculo encerrado antes do atual na área (decisão acima).
- Conferir o formato da chave Pix no aceite do convite (AF3).
