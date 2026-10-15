# BEELINK-290 (S16) — Os textos do teste e da assinatura (proposta para o Rafael aprovar)

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". Ticket de texto. A branch nasce da do S5
> (`feat/BEELINK-223-pagina-travada`, `185e489a`), que ainda está no PR #273 (e S10, S3 e S11 nos #270,
> #271 e #272); o PR deste ticket tem `main` como base e entra depois do #273. Toca `packages/ui` (os
> dicionários, um tipo e o aviso da vitrine fora do ar) e `apps/web` (o dicionário de erros, o aviso da
> vitrine e testes). **Nenhuma rota, nenhum tipo de fio e nenhum texto legal mudam:** `LegalVersion`
> continua `"2026-10-15"` e `apps/web/src/locales/legal/` não é tocado. Os textos são **proposta**: o
> Pronto do ticket pede a aprovação escrita do Rafael, que vem depois do PR. Leituras de base: os planos
> do S11 (`2026-10-15--BEELINK-293--tela-assinar.md`, "O que o S16 precisa saber"), do S5
> (`2026-10-15--BEELINK-223--pagina-travada.md`, "O que o S14 precisa saber") e do S8
> (`2026-10-13--BEELINK-289--como-o-lojista-paga.md`: o que a fatura do Asaas oferece), e
> `docs/product/README.md` ("What a page costs"). Escrito em 15/10/2026, antes do código.

## O problema

O S11 e o S5 escreveram as frases da tela Assinar, dos erros da cobrança e do aviso da vitrine fora do
ar, cada um com o que tinha à mão, e o S14 (a página travada e as faixas do painel) ainda não tem
nenhuma. O lojista precisa entender, **antes de pagar**, como funciona o teste, o que acontece quando
ele acaba, quanto custa cada período por página, como renova e como cancela.

O que não pode acontecer, em ordem de gravidade:

1. **Prometer o que não existe.** Hoje não há cancelamento pelo painel (S12), troca de cartão (S13),
   e-mail da Beelink sobre a cobrança (S7) nem canal de atendimento publicado: nenhum e-mail, WhatsApp
   ou telefone da Beelink aparece no site, na landing ou nos textos legais (que têm `[PREENCHER]` no
   lugar).
2. **Dizer uma regra errada**: que nada renova sozinho (o cartão de crédito renova), que os dias de
   teste se somam ao plano (não se somam), que o valor é da conta (é por página).
3. **Um número escrito à mão** que discorde do catálogo ou da assinatura: preço, dias de teste, dias de
   carência.
4. **Mudar o texto legal de uma versão já aceita.** Subir a `LegalVersion` obriga todo mundo a aceitar
   de novo, e isso é decisão do Rafael.

## Definição de Pronto

1. Os textos de tela estão nos dicionários (`packages/ui/src/locales` e `apps/web/src/locales`, pt-BR e
   en), sem número escrito à mão, com os testes de componente atualizados.
2. Onde o assunto aparece, eles dizem: o valor é por página; o teste não pede cartão e nada é cobrado
   sozinho; com cartão de crédito o plano renova sozinho, e com Pix ou boleto cada renovação é uma
   fatura nova; quem assina no teste perde os dias que faltavam.
3. Os textos do S14 (a página travada, por motivo; a faixa dos últimos dias do teste; a faixa da
   carência) estão nos dicionários, prontos para o S14 usar.
4. Nenhum texto promete cancelar pelo painel, trocar cartão, e-mail ou um canal de atendimento que não
   existe.
5. A cláusula dos termos e a lista do que pede decisão jurídica estão neste plano; `LegalVersion` e
   `apps/web/src/locales/legal/` intocados.
6. Tipos, lint e testes do web e do `packages/ui`, `arch-gates` e `docs-gate` verdes.

## Decisões

### O tom

1. **O de um lojista pequeno lendo no celular:** frases curtas, uma ideia por frase, "você", verbo no
   presente. Sem jargão de cobrança: "ciclo", "carência" e "inadimplência" não aparecem na tela;
   "período do plano", "prazo" e "renovação" sim. As palavras que o produto já usa: **página** (o que
   tem plano), **loja** e **site** (o que o visitante vê), **travada** (como a landing já diz) e **fora
   do ar** (a vitrine). **Beelink**, como na landing.
2. **Toda frase que fala de valor, dia ou prazo recebe o número por `{placeholder}`:** o preço vem do
   catálogo, os dias e as datas vêm da assinatura. Nenhum "7 dias" escrito, nem os do teste nem os da
   carência: a faixa da carência diz a data, que a API calcula. Um teste novo confere, nos dois
   dicionários, que nenhuma frase da assinatura tem um algarismo e que as duas línguas pedem os mesmos
   `{placeholders}`.

### Onde cada regra é dita

3. A tabela (as chaves são de `subscription.*`, no dicionário da UI):

   | Regra | Tela Assinar | Página travada (S14) | Faixas (S14) |
   |---|---|---|---|
   | O valor é por página | `lead`, `facts.chargedToday` | `locked.pricesTitle` | — |
   | O teste não pede cartão, e nada é cobrado sozinho | `standing.trialing*` | `locked.texts` ("nada foi cobrado") | `banners.trialText` |
   | Cartão de crédito renova sozinho; Pix ou boleto, uma fatura nova a cada renovação | `facts.renewal`, `paid.renewsBy*` | `facts.renewal`, a mesma frase | — |
   | Quem assina no teste perde os dias que faltavam | `facts.trialLoss*` | — (o teste já acabou) | — (a faixa leva à tela Assinar, que diz) |

   As faixas são curtas de propósito: levam à tela Assinar, que diz tudo antes do botão.

### A tela Assinar (S11)

4. **O que muda** (a lista inteira, frase a frase, fica em "Como ficou"):
   - O teste diz que **não pede cartão**, que **nada é cobrado sozinho** e o que acontece quando ele
     acaba: **a página trava e sai do ar** até o lojista assinar.
   - Assinar no teste diz **"você perde os N dias de teste que faltam"**, e não "não são somados ao
     plano", que se lê sem perceber a perda.
   - A renovação diz **cartão de crédito**, e não "cartão": o de débito, como Pix e boleto, gera uma
     fatura a cada renovação (S8 e S11). E diz **onde a fatura nova aparece: aqui no painel**, porque
     nada avisa o lojista dela (o S7 não existe, e o Asaas não avisa: o cliente nasce com
     `notificationDisabled`).
   - O que se paga hoje é dito **por esta página**.
   - A situação atrasada vira **"Pagamento em atraso"** (era "pendente", que se lê como "em
     processamento"); a suspensa diz que a página está **travada e fora do ar**.
   - Os dados de cobrança dizem **que valem para todas as páginas da conta e para que servem**: a
     finalidade dita na coleta (LGPD, art. 9º), enquanto a política de privacidade não cita o CPF/CNPJ.
   - Quem paga com boleto lê que **pode fechar a tela**: a confirmação chega sozinha, pelo webhook e
     pela rotina do S3.
   - A legenda dos períodos vira **"Escolha o período do plano"**: "Como você quer pagar?" se confunde
     com a forma de pagamento, que se escolhe no Asaas.
5. **O que não muda, de propósito:** os nomes pelos quais o e2e do web e os testes acham a tela
   ("Plano Beelink", "Mensal", "Anual", "Nome completo ou razão social", "CPF ou CNPJ", "Assinar e
   pagar", "Aguardando a confirmação do pagamento", "Abrir a fatura", "Escolher outro plano",
   "Continuar o pagamento", "Já paguei, verificar agora", "Pagamento confirmado"). Estão claros, e
   mudá-los obrigaria a rodar o Playwright, que o briefing não deixa rodar nesta máquina.
6. **A descrição da fatura** ("Plano Beelink mensal — página "…"", escrita pela API no S10, que o
   lojista lê no Asaas) foi lida e fica: diz o plano, o período e a página.

### O cancelamento e o canal de atendimento

7. **A tela diz o que é verdade hoje:** "Ainda não dá para cancelar pelo painel. Para cancelar, fale com
   a Beelink: a página continua funcionando até o fim do período já pago." Não promete botão (S12) e
   **não inventa um endereço**. "Fale com o suporte da Beelink" vira "fale com a Beelink" nas quatro
   frases que o diziam (`facts.cancel`, `due.missing`, `errors.BILLING_SUBSCRIPTION_PAID`,
   `errors.BILLING_SUBSCRIPTION_REFUSED`): "suporte" sugere um setor que o lojista procuraria e não
   acharia.
8. **O canal é decisão do Rafael, e pré-requisito de ligar a cobrança.** Proposta: um e-mail de
   atendimento no domínio `beelink.biz` (a Beelink já envia e-mail pela Purelymail), mostrado na tela
   Assinar, na página travada, no rodapé da landing e nos textos legais, que já reservam o lugar
   (`[PREENCHER: canal oficial de atendimento do bee-link]`); um WhatsApp é opcional. Escolhido o canal,
   as quatro frases ganham o endereço, uma linha em cada dicionário. **Sem canal, quem paga com cartão
   não tem como parar a renovação**: a assinatura no Asaas só sai por alguém da Beelink (com Pix ou
   boleto, a fatura nova simplesmente não é paga, e a página trava depois do prazo).

### Os textos do S14

9. **Moram no dicionário da UI**, em `subscription.locked` (a página travada) e `subscription.banners`
   (as duas faixas), porque os blocos do S14 serão de `packages/ui`, como os da tela Assinar. O motivo
   ganha um tipo, `SubscriptionLockValue` (`lib/subscription.ts`): os três de `PageLockReason` e mais
   `FREE_PERIOD_OVER` — a página que nunca pagou e cujo mês grátis (o do cupom, ou o das páginas que já
   existiam) acabou. A API a trava como `TRIAL_EXPIRED`; o lojista lê "Seu mês grátis acabou". Quem
   escolhe entre os dois é o S14, por `freePeriodEndsAt`.
10. **Os títulos são os do briefing do S14, com uma troca:** "A renovação não foi paga" no lugar de "Não
    conseguimos receber a renovação". Quem paga com Pix ou boleto não teve nada recusado — só não
    pagou —, e "não conseguimos" sugere uma falha do lado da Beelink.
11. **Cada motivo tem uma frase com a data e outra sem**, para o S14 não depender de uma data que pode
    faltar (a cancelada sem período, a carência não gravada). A página travada diz também: o que estar
    travada quer dizer (o painel fechado; a página fora do ar, **sem o motivo para o visitante**); que
    **quem já comprou continua vendo os pedidos** (só numa loja); que **nada foi apagado** e a página
    volta como estava ao pagar; que **as outras páginas seguem** (só para quem tem outras); e o preço de
    cada período **por página**, montado do catálogo (`{cycle}`, `{total}`, `{months}`, `{amount}`). A
    renovação é dita com `facts.renewal`, a frase da tela Assinar, para as duas nunca divergirem.
12. **A faixa do teste** tem três frases (faltam `{days}` dias; amanhã; hoje) e diz que **nada é
    cobrado sozinho**; quais dias mostram a faixa é do S14 ("os 2 últimos dias" pode ser 2, 1 e 0 dias
    restantes). **A faixa da carência** diz "Pague até `{date}` para a página não travar" — `{date}` é o
    último dia da carência, o dia de Brasília antes de `graceEndsAt` — e avisa quem vai pagar com boleto
    que ele leva alguns dias úteis para ser confirmado. Nenhuma das duas fala em trocar cartão (S13): as
    duas levam à tela Assinar, onde a fatura devida pode ser paga com outro cartão, Pix ou boleto.

### O aviso da vitrine fora do ar (S5)

13. **Um site não é uma loja.** O aviso dizia "Loja indisponível no momento" e "Esta loja não está
    recebendo pedidos agora" também para um site institucional, que não recebe pedidos. O bloco
    `StorefrontUnavailable` ganha `site` (falso por padrão), e um site diz "Site indisponível no
    momento" e "Este site está fora do ar agora. Volte mais tarde." O resto fica como o S5 escreveu:
    nada diz por quê, e a frase da loja ("não está recebendo pedidos agora") é a mais útil para o
    cliente dela.
14. `errors.PAGE_LOCKED` diz que a página está travada **até o plano dela ser pago**: serve aos três
    motivos, a cancelada inclusive, sem culpar ninguém. `errors.STORE_UNAVAILABLE` e
    `checkoutShopUnavailable` ficam como estão.

### A landing

15. **Não muda.** A seção de planos e as perguntas frequentes dizem "por mês, por página", "sem cartão",
    que a página trava quando o teste acaba e que "nada é cobrado sozinho" — dito do fim do teste, que é
    a regra. Nada nelas contradiz a regra; elas só não falam da renovação, e omitir não é contradizer.

### A cláusula dos termos e as questões jurídicas

16. **Vão como proposta neste plano**, nas duas seções abaixo, e não no texto legal. Publicar a cláusula
    é uma `LegalVersion` nova, com o aceite de todos de novo: decisão do Rafael, com o advogado.

## Proposta de cláusula para os Termos de uso

> Para o texto legal, quando o Rafael decidir publicar. Uma seção nova, "Planos, teste e cobrança",
> depois de "Deveres do lojista"; na seção "O que é o bee-link", o
> `[PREENCHER: condições comerciais do uso do bee-link pelo lojista…]` vira uma frase que aponta para
> ela. No estilo dos Termos de hoje ("o bee-link"). Cada `[DECIDIR: …]` é uma escolha que o código não
> faz; o resto diz o que o produto faz.

**Planos, teste e cobrança**

1. **O plano é por página.** O uso do bee-link pelo lojista é pago por página: cada loja ou site que o
   lojista cria é uma página, com o seu teste, o seu plano e a sua cobrança. Quem tem duas páginas paga
   duas, e uma página que deixa de ser paga não afeta as outras.
2. **O teste grátis.** Cada página nova pode ser usada de graça por 7 dias, contados do dia em que foi
   criada; o teste termina à meia-noite, no horário de Brasília, do sétimo dia depois desse. O teste não
   pede cartão nem outro meio de pagamento, e nada é cobrado quando ele termina.
3. **O fim do teste sem plano.** Se nenhum plano for pago até o fim do teste, a página fica travada: o
   painel dela mostra só a assinatura, e a vitrine sai do ar — os visitantes veem que ela está
   indisponível, sem o motivo, e não conseguem comprar. Os clientes que já compraram continuam vendo os
   seus pedidos e conversando com a loja sobre eles. Nada é apagado, e a página volta como estava quando
   o pagamento é confirmado. [DECIDIR: por quanto tempo uma página travada é mantida, e se é excluída
   depois.]
4. **Os planos e os valores.** Os planos, os valores e os períodos de pagamento — mensal, semestral e
   anual — são os informados na página de planos do bee-link e no painel antes da contratação. O
   semestral e o anual são pagos de uma vez, pelo período inteiro, e custam menos por mês. O valor de
   uma assinatura é o que estava em vigor quando o período foi escolhido, e vale para as renovações
   dela. [DECIDIR: se e como o bee-link pode reajustar o valor de uma assinatura em curso, e com quanto
   tempo de aviso.] [DECIDIR: se os valores incluem os tributos.]
5. **A contratação e o pagamento.** O lojista escolhe o período no painel da página e informa, uma vez
   para todas as suas páginas, o nome ou a razão social e o CPF ou o CNPJ de quem paga. O pagamento é
   feito na fatura do Asaas, instituição de pagamento que faz a cobrança em nome do bee-link, com cartão
   de crédito, cartão de débito, Pix ou boleto, conforme a fatura oferecer. Os dados do cartão são
   digitados no Asaas e não passam pelo bee-link, que guarda só a bandeira e os quatro últimos dígitos.
   A assinatura começa a valer com o pagamento confirmado; escolher o período sem pagar não muda nada na
   página. A cobrança do plano é feita na conta do bee-link no Asaas e não se mistura com o dinheiro das
   vendas da loja.
6. **Assinar durante o teste.** Quem assina durante o teste não acumula os dias que faltavam: o período
   pago começa no dia em que o período foi escolhido.
7. **A renovação.** A assinatura se renova ao fim de cada período, pelo mesmo período e valor, no mesmo
   dia do mês do primeiro pagamento — ou no último dia do mês, quando ele não tem esse dia. Paga com
   cartão de crédito, a renovação é cobrada automaticamente no mesmo cartão. Paga com cartão de débito,
   Pix ou boleto, cada renovação gera uma fatura nova, disponível no painel da página, a ser paga até o
   vencimento. [DECIDIR: se o bee-link avisa antes de cobrar a renovação no cartão, e como — depende dos
   e-mails, S7.]
8. **O atraso.** Se a renovação não for paga até o vencimento, a página continua funcionando por mais 7
   dias. Passado esse prazo sem pagamento, a página é suspensa e fica travada, como no fim do teste, até
   a fatura em aberto ser paga. [DECIDIR: multa e juros por atraso; hoje a assinatura nasce no Asaas sem
   multa e sem juros.]
9. **O cancelamento.** O lojista pode cancelar a assinatura de uma página quando quiser, pelo canal de
   atendimento indicado na seção "Contato" [DECIDIR: e pelo painel, quando o S12 existir]. Cancelada, a
   assinatura não se renova, e a página continua funcionando até o fim do período já pago; depois, fica
   travada.
10. **O arrependimento e o reembolso.** [DECIDIR com o jurídico. A proposta mais conservadora:] Nos 7
    dias seguintes ao primeiro pagamento de cada assinatura, o lojista pode desistir dela e recebe de
    volta todo o valor pago, pelo mesmo meio de pagamento. Depois desse prazo, o cancelamento não devolve
    o mês em curso; no semestral e no anual, [DECIDIR: (a) nada é devolvido; (b) são devolvidos os meses
    inteiros ainda não começados, descontados os meses usados pelo preço do mensal; (c) é devolvida a
    parte proporcional ao tempo que falta].
11. **O mês grátis por cupom.** O bee-link pode oferecer cupons que dão um mês grátis a uma página, uma
    vez por página. O cupom não é desconto, não vale dinheiro e não pode ser trocado, transferido ou
    somado a outro. O mês conta do fim do teste ou do dia em que o cupom é usado, o que vier depois.
    Durante o mês nada é cobrado; quando ele acaba, vale o que vale para o fim do teste. A validade e o
    limite de usos de cada cupom são os informados com ele. As páginas criadas até 13 de outubro de
    2026 receberam um mês grátis, até o fim de 13 de novembro de 2026.
12. **A isenção.** O bee-link pode isentar uma página da cobrança. A página isenta não é cobrada nem
    travada enquanto a isenção durar. [DECIDIR: se o fim de uma isenção é avisado antes, e com quanto
    tempo.]
13. **A nota fiscal.** [DECIDIR (S18): a emissão da nota fiscal de serviço de cada pagamento, por quem e
    com quais dados.]

## O que pede decisão (do Rafael e do jurídico)

1. **Aprovar os textos**: a tela Assinar, os erros da cobrança, o aviso da vitrine fora do ar e os do
   S14. A lista frase a frase está em "Como ficou".
2. **O canal de atendimento** (decisão 8): qual, e onde aparece. Pré-requisito de ligar a cobrança.
3. **A cláusula acima, e quando publicá-la.** É uma `LegalVersion` nova, com o aceite de todos de novo.
   Junto, decidir como as contas que já existem são avisadas e aceitam: os Termos já têm esse
   `[PREENCHER]` na seção "Mudanças nestes Termos".
4. **Arrependimento** (Código de Defesa do Consumidor, art. 49: 7 dias para desistir de uma compra
   feita fora do estabelecimento, como pela internet, com a devolução do que foi pago). O lojista compra
   para o negócio; se ele conta como consumidor é questão jurídica (a jurisprudência admite o pequeno
   empresário vulnerável). Proposta conservadora: valer para todos, do primeiro pagamento de cada
   assinatura.
5. **Reembolso do semestral e do anual** depois dos 7 dias: as opções (a), (b) e (c) do item 10 da
   cláusula.
6. **Cancelamento fácil.** O Decreto nº 7.962/2013 (comércio eletrônico) pede atendimento eletrônico
   capaz de resolver "suspensão ou cancelamento do contrato" (art. 4º, V) e deixa o consumidor se
   arrepender "pela mesma ferramenta utilizada para a contratação" (art. 5º, § 1º). Contratado pelo
   painel, o cancelamento só por mensagem pode não bastar: pesa a favor de o S12 (cancelar pelo painel)
   existir antes de ligar a cobrança.
7. **Quem é o fornecedor.** O mesmo decreto (art. 2º) pede razão social, CNPJ e endereço físico e
   eletrônico em local de destaque. Os textos legais têm `[PREENCHER]` nesses lugares, e o site não os
   mostra. A fatura do Asaas mostra os dados da conta que recebe.
8. **A política de privacidade** não cita o nome e o CPF/CNPJ de quem paga, a bandeira e os 4 últimos
   dígitos do cartão, a situação da assinatura, nem o Asaas como quem recebe nome, e-mail e CPF/CNPJ do
   lojista; e diz que o bee-link "não recebe nem guarda dados de cartão" (frase escrita para os
   clientes das lojas). Falta também a base legal (execução de contrato e, para a nota, obrigação
   legal) e o prazo de guarda dos registros de cobrança. Antes de ligar a cobrança em produção.
9. **A nota fiscal (S18):** emitir a nota de serviço de cada pagamento, por quem (o Asaas emite, se
   configurado na conta) e com que dados — se a prefeitura pedir o endereço de quem paga, a tela não o
   pede hoje. Nenhum texto promete nota.
10. **Reajuste de preço** de uma assinatura em curso, e o aviso antes (item 4 da cláusula).
11. **Multa e juros por atraso:** hoje zero (item 8 da cláusula).
12. **Aviso antes da renovação** no cartão, e da fatura nova de Pix ou boleto: depende dos e-mails (S7).
    Sem eles, o lojista só sabe pelo painel.
13. **Por quanto tempo uma página travada é mantida** (item 3 da cláusula). A tela diz que "nada foi
    apagado", o que é verdade hoje.
14. **Chave Pix na conta Asaas de produção** (S8, "O que o Rafael precisa fazer", item 3): a tela diz
    que a fatura aceita cartão, Pix ou boleto.
15. **Se os valores incluem os tributos** (item 4 da cláusula).

## Fora do escopo

- Publicar a cláusula, subir a `LegalVersion`, mudar `apps/web/src/locales/legal/`.
- E-mails (S7). As frases do card do plano (S2), do cupom (S6) e do aviso por e-mail das páginas que já
  existiam (S15): cada ticket escreve as suas, no tom daqui.
- Desenhar a página travada e as faixas (S14): aqui estão só as frases.
- Mostrar o prazo da carência na própria tela Assinar: a tela não recebe `graceEndsAt` hoje, e o S14
  decide se a faixa da carência aparece também nela.

## Riscos

1. **Os textos podem não ser aprovados como estão.** Cada frase é uma linha em cada dicionário, e os
   testes apontam onde mais ela aparece.
2. **A frase do cancelamento manda falar com a Beelink, e não há canal** (decisão 8). Ligar a cobrança
   antes de o canal existir deixa sem saída quem paga com cartão.
3. **A tela promete Pix na fatura**, e isso depende de a conta de produção ter uma chave Pix (S8).
4. **As frases de situação falam da trava** (`TRIALING`: "quando acabar, a página trava";
   `TRIAL_EXPIRED`: "para usar a página, escolha um plano"; `SUSPENDED` e `CANCELED`: "travada e fora do
   ar"), e uma página no mês grátis não trava, qualquer que seja a situação (S5). O S6 já precisa pôr o caso do mês grátis em `subscribeViewOf` antes de olhar a
   situação; sem isso, essas frases diriam a uma página no mês grátis que ela trava.
