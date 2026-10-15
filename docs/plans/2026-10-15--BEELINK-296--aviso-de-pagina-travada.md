# BEELINK-296 (S14) — Painel: a página travada e as faixas de aviso

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), "a assinatura da plataforma". A branch nasce da do S15
> (`feat/BEELINK-297-paginas-que-ja-existiam`, `dfbf4646`), que ainda está no PR #276 (e S10, S3, S11, S5,
> S16 e S6 nos #270 a #275); o PR deste ticket tem `main` como base e só fica legível depois que eles
> entrarem. Toca `apps/web` e `packages/ui`. **Nenhuma rota da API muda, nenhum tipo de fio muda.** As
> decisões do épico não são reabertas; as que estão abaixo são do desenvolvedor. Leituras de base: os
> planos do S5 (`2026-10-15--BEELINK-223--pagina-travada.md`, "O que o S14 precisa saber"), do S11
> (`…BEELINK-293--tela-assinar.md`), do S16 (`…BEELINK-290--textos-da-assinatura.md`), do S6
> (`…BEELINK-224--cupom-um-mes.md`) e do S15 (`…BEELINK-297--paginas-que-ja-existiam.md`). Escrito em
> 15/10/2026, antes do código.

## O problema

A API já trava uma página que não está em dia (S5): toda rota do painel dela responde `403 PAGE_LOCKED`,
menos a assinatura. O web ainda não sabe o que fazer com isso: o início do painel de uma página travada
fica no esqueleto e cai num estado degradado, as outras telas mostram a frase do erro onde a lista
estaria, o modo design dá erro, e o canal em tempo real para no `403` e não volta depois do pagamento.
Nada avisa o lojista **antes** de travar, e as páginas da conta de uma loja fora do ar ainda oferecem o
carrinho, a busca e "Fazer pedido no WhatsApp".

O que não pode acontecer, em ordem de gravidade:

1. **Com `BILLING_ENFORCED` desligada (produção hoje), o painel mudar**: uma faixa, uma tela nova, um
   esqueleto a mais, um atraso, uma consulta que mude o que se vê.
2. **Dizer a uma página que ela trava quando não trava**: isenta, no mês grátis, numa implantação sem a
   chave do Asaas (onde nada trava, S5 decisão 7), ou contar o teste de quem usou cupom.
3. **Uma tela do painel em branco ou com erro técnico** numa página travada, ou o lojista sem saída.
4. **A página paga continuar travada no painel** depois de a API saber do pagamento, ou pedir que ele
   saia e entre.
5. **Travar a outra página do mesmo lojista**, ou o shell (menu, troca de página, conta).

## Definição de Pronto

1. Cada motivo de trava (teste vencido, renovação não paga, cancelada, mês grátis acabou) mostra o seu
   aviso, com os valores de cada ciclo lidos do catálogo, e leva à tela Assinar.
2. As faixas aparecem nos dias certos: nos 2 últimos dias do teste (e do tempo grátis) e durante a
   carência de uma renovação não paga, com as datas da assinatura no fuso de Brasília, e levam à tela
   Assinar.
3. Uma página com o teste vencido paga pela tela Assinar e volta a `ACTIVE` sem ajuda: o painel dela
   volta ao normal sem sair e entrar, o canal em tempo real inclusive.
4. Nenhuma tela do painel fica em branco ou em erro técnico numa página travada (o modo design
   inclusive); a outra página do mesmo lojista segue aberta; o shell segue funcionando.
5. Com `BILLING_ENFORCED` desligada, o painel fica exatamente como hoje — provado.
6. As páginas da conta de uma loja fora do ar não mostram o que vende.
7. e2e do web (só o spec novo) do bloqueio e da volta; tipos, lint e testes do web e da UI, `arch-gates`
   e `docs-gate` verdes.

## Decisões

### Quem decide que a página está travada, e onde

1. **Um portão no shell do painel, no navegador** (`PageLockGate`, `components/billing/`), montado em
   volta das telas em `SignedInShell`, dentro do `AppShell`: o menu, a troca de página e a conta ficam
   fora dele e continuam de pé. Ele vale para toda rota `/admin/<slug>/…` do grupo `(admin)`, porque é
   o layout delas, e persiste entre as navegações da mesma página. No navegador e não no servidor do
   Next pelos motivos do S11 (decisão 2): o e2e do web só alcança as rotas do BFF pelo navegador, e a
   API do Playwright roda com a cobrança desligada; e um layout que espera uma leitura atrasa toda
   navegação do painel, que é o que o `(admin)/layout.tsx` evita de propósito.
2. **Duas fontes, a mesma regra da API:**
   - **a leitura da assinatura** (`GET /api/stores/:slug/subscription`, a mesma chave
     `billingKeys.subscription(slug)` da tela Assinar e do card do S2): `subscription.lock` diz o
     motivo, e é a regra do S5 calculada na hora (`lockOf`), nunca refeita no navegador;
   - **a recusa de qualquer leitura do painel com `PAGE_LOCKED`** (o briefing: "quando a API responder
     a trava"): uma consulta ativa recusada depois da última leitura da assinatura põe o esqueleto da
     trava no lugar da tela e lê a assinatura de novo, uma vez por recusa. É o que pega a página que
     trava com o painel aberto (o teste que vence à meia-noite) e o que evita, no primeiro carregamento,
     a tela mostrar a frase do erro antes de a assinatura responder. Uma escrita recusada com
     `PAGE_LOCKED` (um "Salvar") faz o mesmo, pelo `MutationCache` do `QueryClient`.
3. **A tela Assinar (`/admin/<slug>/subscribe`) nunca é trocada**: é a saída. O portão também não a
   espera nem lhe põe faixa (ela diz a situação da página no topo).
4. **O modo design** (`/admin/<slug>/design`, grupo `(editor)`, sem o shell) **leva ao início do painel
   da página** (`redirect`), onde está o aviso, quando a leitura pública diz que a loja está fora do ar
   (`unavailable`) ou a prévia do dono responde `PAGE_LOCKED`. As duas porque a leitura pública fica
   até um minuto guardada (S5, decisão 23). Desenhar o aviso dentro do editor perderia o menu e a troca
   de página.

### Com a cobrança desligada, exatamente como hoje

5. **Nada espera a leitura da assinatura.** Enquanto ela não chega, o portão desenha a tela como hoje.
   Com `billingEnforced: false`, ele desenha `{canal}{nada}{tela}` — os mesmos elementos, sem
   embrulho: o DOM do painel é o de hoje, byte por byte (um teste confere).
6. **A única consulta a mais é essa leitura, uma vez por página aberta** no shell (não a cada
   navegação, porque o shell persiste), e nunca de novo ao voltar para a aba quando ela disse que a
   cobrança está desligada. É a mesma leitura que o card do S2 fará em toda tela. O catálogo e a conta
   de cobrança nunca são pedidos com a cobrança desligada. Fora de uma página (`/dashboard`,
   `/create-store`) nada é pedido.

### A tela de página travada

7. **No lugar da tela, dentro do shell**: o nome e o logo da página (de `/stores/mine`, que o shell já
   lê: `GET /stores/:slug` está travada, S5 decisão 15), o título e o texto pelo motivo, o botão para a
   tela Assinar, os preços de cada ciclo e a renovação, e o que estar travada quer dizer. As frases são
   as do S16 (`subscription.locked`), sem algarismo escrito.
8. **O motivo e a data**, lidos da assinatura:

   | `lock` | Motivo na tela | `{date}` |
   |---|---|---|
   | `TRIAL_EXPIRED` sem `freePeriodLastDay` | "Seu teste grátis acabou" | `trialLastDay` |
   | `TRIAL_EXPIRED` com `freePeriodLastDay` | "Seu mês grátis acabou" (`FREE_PERIOD_OVER`, S6) | `freePeriodLastDay` |
   | `SUSPENDED` | "A renovação não foi paga" | o dia de Brasília antes de `graceEndsAt` |
   | `CANCELED` | "Sua assinatura foi cancelada" | o dia antes de `currentPeriodEndsAt` |

   Sem a data, a frase sem data (`textsUndated`). O botão é "Pagar a renovação" numa suspensa e
   "Escolher um plano" nas outras, e leva a `subscribePageOf(slug)`.
9. **Os preços** são os do plano à venda no catálogo (`GET /api/billing/plans`, `offersOf`, a mesma
   conta da tela Assinar): "Mensal: R$ 59,90 por mês", "Semestral: R$ 323,40 a cada 6 meses, R$ 53,90
   por mês"… Esqueleto enquanto chegam; sem catálogo, a lista some e o resto fica.
10. **"Quem já comprou continua vendo os próprios pedidos"** só numa loja (não num site); **"Suas outras
    páginas continuam funcionando"** só para quem tem outras.
11. **Esqueleto** enquanto o motivo não chega (recusa ouvida antes da leitura); **falha com "Tentar de
    novo"** quando a leitura da assinatura falha depois de uma recusa (`subscription.failed`).
12. **Enquanto a tela de página travada está à mostra, a assinatura é relida a cada minuto e ao voltar
    para a aba** (só a leitura do bee-link, sem perguntar ao Asaas): uma página paga por outro caminho
    (o webhook, a rotina) abre sozinha. Na tela Assinar isso não acontece, por causa da corrida que o
    S11 evitou (decisão 5 do "Como ficou" dele).

### A volta, depois do pagamento

13. **Quando a leitura da assinatura passa de travada a aberta** (a conferência da tela Assinar, um
    cupom, a releitura), o portão:
    - **reinicia as leituras que tinham sido recusadas com `PAGE_LOCKED`** (`resetQueries`): voltam ao
      esqueleto e são pedidas de novo, sem mostrar o erro velho; as outras ficam como estão;
    - **monta o canal em tempo real de novo**: enquanto a página está travada ele nem é montado (o
      ticket seria recusado), e montado de novo ele pede um ticket novo.
14. **Uma página travada só pela recusa** (a leitura da assinatura disse aberta) não reinicia nada: é
    uma discordância de instante que se resolve na leitura seguinte, e assim não há laço de pedidos.

### As faixas

15. **Quando:**
    - **teste**: página em `TRIALING`, sem tempo grátis em curso, com `trialDaysLeft` 2, 1 ou 0 ("os 2
      últimos dias", com o "termina em 2 dias" do briefing) — `trialMany`, `trialOne`, `trialToday`;
    - **tempo grátis** (S6: olhar `freePeriodDaysLeft` antes de `trialDaysLeft`): página que nunca pagou,
      com `freePeriodDaysLeft` 2, 1 ou 0. Frases novas, no tom do S16: `banners.freeMany`, `freeOne`,
      `freeToday`. Fora desses dias, uma página no tempo grátis não tem faixa, e a do teste nunca
      aparece para ela (o fim do teste não a trava);
    - **carência**: página `PAST_DUE` ainda aberta (`lock` nulo): "Pague até {data} para a página não
      travar", com `{data}` o dia de Brasília antes de `graceEndsAt` (a API sempre o manda numa página
      em atraso), e o aviso do boleto.
16. **Só onde a página pode travar:** a faixa espera a leitura da conta de cobrança e não aparece quando
    ela responde `BILLING_UNAVAILABLE` (sem a chave do Asaas, nada trava, S5 decisão 7: a faixa seria uma
    ameaça falsa levando a uma tela que diz "indisponível"). É o mesmo sinal que a tela Assinar usa, e a
    mesma chave de cache.
17. **Onde:** no topo de toda tela do painel da página, menos a tela Assinar (para onde ela leva) e o
    modo design (sem shell). Cores só por token: um par novo, `--warning` e `--warning-foreground`, no
    `globals.css` (claro e escuro), que o card do S2 também vai usar.

### A vitrine fora do ar

18. **As páginas da conta de uma loja fora do ar não mostram o que vende**: o cabeçalho fica com o logo,
    a conta e as conversas, sem a busca, o "Entregar em", o carrinho e o menu de categorias; o rodapé
    fica com os textos legais, as redes e o endereço, sem a coluna da loja (produtos, categorias,
    carrinho) e sem "Fazer pedido no WhatsApp". Decidido por `store.unavailable`, que só existe numa loja
    travada. O cabeçalho da loja sai de `storefront-frame.tsx` (257 linhas, acima do limite) para um
    arquivo próprio, onde a regra mora.

## Fora do escopo

- O card do plano no menu (S2), os e-mails (S7), trocar cartão (S13), cancelar (S12), a tela Plano e
  cobrança (S4).
- O prazo da carência dentro da tela Assinar (o S16 deixou para o S14 decidir: a faixa não aparece lá,
  decisão 3).
- "Tem um cupom?" na tela de página travada (o S6 disse opcional): o botão leva à tela Assinar, onde o
  campo está.
- Uma faixa para a cancelada que ainda funciona: o briefing pede duas faixas; o card do S2 diz
  "Cancelado: acesso até …".
- O seletor de loja mostrar "Nenhuma loja" no primeiro quadro: acontece em toda tela do painel desde
  antes do épico, e mudá-lo mudaria o painel com a cobrança desligada.
- O que as abas da conta do cliente mostram dentro da área (favoritos, "comprar de novo"): a API já os
  recusa (S5); aqui, só o cabeçalho e o rodapé.

## Riscos

1. **Uma consulta a mais em toda página aberta no painel**, também com a cobrança desligada (decisão 6):
   a leitura da assinatura, uma por página por visita ao shell. É a do card do S2.
2. **Um formulário aberto quando a página trava** perde o que foi digitado: a tela vira o aviso na
   primeira recusa (decisão 2). A faixa avisa nos 2 dias antes.
3. **A faixa aparece um instante depois da tela** (espera a assinatura e a conta), e empurra o conteúdo
   para baixo uma vez por visita ao shell.
4. **Uma discordância de instante entre a leitura e a trava** (decisão 14) deixa a tela com a frase da
   trava até a leitura seguinte.
