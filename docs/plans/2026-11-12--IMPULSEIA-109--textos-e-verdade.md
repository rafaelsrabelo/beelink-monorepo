# IMPULSEIA-109 (AF9) — os textos e a verdade

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A última tarefa do épico [Afiliados](2026-10-24--afiliados.md). AF1 a AF8 entregaram o programa; esta
> diz em público o que ele faz com dados, escreve a verdade do produto e prova o fluxo inteiro.

> **Rascunho para revisão jurídica — não mergear antes.** A decisão 11 do épico pede que quem cuida do
> jurídico confirme a política nova. Este PR traz o texto pronto para essa revisão, não publicado.

## O pedido

A linha AF9 do épico: a nova versão da política de privacidade, `docs/product`, o e2e do fluxo
inteiro e os mapas de superfície. Junto, o que a decisão 11, o item 5 da "Ordem" e os adendos de 11/11
(B, E, F) pedem, e o que AF8 deixou para cá.

## Definition of Done

1. Uma **versão nova** dos textos legais, nunca uma edição da publicada. `LegalVersion` em contracts,
   `LEGAL_VERSION` na API e `legalTexts.version` no web andam juntos.
2. A política diz:
   - que o bee-link guarda os dados do afiliado (conta, telefone, chave Pix, foto e frase);
   - quem é o controlador de cada um: o bee-link da conta, a loja do vínculo;
   - os cookies `bl_affiliate` e `bl_affiliate_hidden`, o que guardam, por quanto tempo e por que o
     primeiro não depende do aviso de cookies;
   - que o **nome do cliente** vai para o afiliado do link pelo qual ele comprou, e nunca o contato;
   - que as visitas pelo link são um número por dia, sem visitante.
3. Os termos dizem que o afiliado é uma conta do bee-link e numa seção própria o que é o programa de
   afiliados de uma loja e de quem é cada parte.
4. Os testes de `apps/web/src/locales/legal/pt-BR.test.ts` provam cada frase de 2 e 3, e a versão nova.
5. `docs/product/README.md` ganha a seção "Affiliates" com o que é verdade depois de AF1 a AF8.
   "Accounts", "What a page costs" e "What the product does not do" dizem o que mudou.
6. Um e2e da API percorre o fluxo inteiro: convite → aceite → visita pelo link → pedido atribuído →
   entregue → dia do vencimento → varredura → acerto → extrato e área do afiliado, sem contato do
   cliente em nenhuma resposta.
7. Um e2e do web (Playwright) percorre o fluxo pelo navegador, com o interruptor ligado na API do e2e.
8. Os mapas de superfície de `apps/api`, `apps/web` e `packages/ui` nomeiam toda rota e tela de
   afiliados.
9. `docs/repo/deploy.md` traz o checklist do épico:
   - a revisão e a publicação da política;
   - `AFFILIATE_LINKS_ENABLED=true`;
   - os slugs `afiliado` e `convite`;
   - as migrações em ordem;
   - a ordem de merge dos PRs.

   O interruptor **não** é ligado no código.
10. O épico ganha o adendo "o que foi entregue".
11. Ficam verdes o `pnpm ci-check`, o e2e completo da API e o docs-gate, e o delivery-check não tem
    bloqueios.

## Decisões

### A data da versão é a do rascunho, e muda na publicação

A versão é o dia em que os textos passam a valer, e quem decide esse dia é a publicação. O rascunho
leva `2026-11-12`. Se a revisão terminar noutro dia, a data muda nos três lugares — contracts, API e
web — e nos testes que a dizem, num commit só, antes do merge. Não há aviso às contas que aceitaram a
versão anterior: a política já deixa isso como `[PREENCHER]` em "Mudanças nesta Política", e esse
mecanismo não é deste épico.

### Dois controladores para o afiliado

O épico diz "o lojista responde pelos dados do afiliado dele; o bee-link responde pela conta".

- **A conta** (nome, e-mail, senha, sessões, o aceite dos termos): o bee-link é o controlador, como
  da conta do lojista.
- **O vínculo com uma loja** (o nome e o e-mail convidados, telefone, nota, tabela, `/nome`, a versão
  aceita dos termos do programa, chave Pix, foto, frase, comissões, extrato, acertos, visitas): a loja
  é a controladora e o bee-link, o operador, como dos clientes dela.

### O nome do cliente é compartilhado pela loja

O cliente é da loja. Quem decide mandar o nome dele ao afiliado é ela, pelo acordo com o afiliado, e
o bee-link é o meio. A política diz isso ao cliente com as mesmas palavras do checkout ("ele verá seu
nome neste pedido"). O afiliado vê o nome, o número, a data, o andamento, os itens e os valores do
pedido; nunca o e-mail, o celular, o CPF ou o endereço.

### Base legal: a do rascunho, para o jurídico confirmar

- O cookie `bl_affiliate` e o nome do cliente para o afiliado ficam sob o **legítimo interesse da loja**
  em cumprir o acordo com quem a indicou. O cliente não é parte desse acordo, então "execução de
  contrato" não cabe para os dados dele.
- Os dados do afiliado ficam sob **execução de contrato**: a conta, com o bee-link; o programa, com a
  loja.

As duas escolhas vão listadas no PR para a revisão.

### Termos: uma seção, não um contrato

O programa é um acordo entre a loja e o afiliado, nos termos que a loja escreve. Os termos do bee-link
dizem só o que o bee-link faz e não faz nisso:

- calcula e registra;
- não paga, não guarda e não move dinheiro;
- não é parte do acordo.

Dizem também o que se espera do afiliado: não se passar pela loja, não prometer o que ela não
oferece, usar o nome dos clientes só para acompanhar as próprias vendas.

### O interruptor fica desligado no código

`AFFILIATE_LINKS_ENABLED` continua ausente no compose de produção. Ligá-lo é um passo do deploy,
depois da publicação. O checklist em `docs/repo/deploy.md` é a fonte, e o PR o repete.

### O e2e do web usa a API do Playwright com os links ligados

`playwright.config.ts` passa `AFFILIATE_LINKS_ENABLED=true` à API que ele sobe. O interruptor é da
implantação, e o e2e é uma implantação de teste, como o `.env.example`. Os testes que não tocam
afiliados não mudam com isso.

## Fora de escopo

- **AF10:** a cobrança por afiliado, com preço no seed e aviso antes de começar.
- Comprovante do acerto, trocar o `/nome`, exportar planilha e cadastro pelo Google no convite (o
  adendo "o que foi entregue" do épico lista onde cada um ficou).
- Preencher os `[PREENCHER: …]` que já existiam nos textos: são fatos do jurídico e da empresa.
