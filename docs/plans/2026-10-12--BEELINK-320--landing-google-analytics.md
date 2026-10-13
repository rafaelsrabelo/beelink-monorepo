# BEELINK-320 (AA4) — Landing: o Google Analytics da Beelink carrega só depois do aceite

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Quarto ticket da pilha: `main` → AA1 (317) → AA2
> (318) → AA3 (319) → **AA4** → AA5 (321) … Sai de `feat/BEELINK-319-landing-aviso-de-cookies`, e o PR
> tem essa branch como base. Toca só `apps/web` e os documentos. O Rafael delegou as decisões deste
> épico; as que estão abaixo são do desenvolvedor, e ele pode mudar qualquer uma.

## O problema

O AA3 entregou a pergunta, a resposta guardada (`bl_site_consent`) e o texto da política de
privacidade, versão `2026-10-12`. Nada é medido ainda. Este ticket carrega o Google Analytics da
Beelink, só para quem aceitou, só na landing e nas duas telas em que o lojista entra e cria a conta,
e envia duas coisas: a página aberta e a conta criada.

A política já está escrita e ainda não foi publicada. O código tem de fazer exatamente o que ela
diz; onde não fizer, muda o código ou muda o texto dentro da mesma versão.

## Definição de Pronto

1. Sem resposta e depois de recusar, nenhuma requisição sai para o Google e não existe cookie `_ga`
   (teste e navegador).
2. Depois de aceitar, o script do Google é pedido uma vez, com o ID configurado, e a visualização da
   página é enviada para esse ID. O aceite dado na própria página carrega o script sem recarregar.
3. Navegar da landing para `/signup` (e entre as três telas) sem recarregar conta outra visualização,
   uma só.
4. Uma conta criada em `/signup`, aceita pela API, envia `sign_up` sem nenhum dado pessoal.
5. Nenhum evento leva nome, e-mail, CPF, telefone, nem um endereço com parâmetros que identifiquem
   alguém (teste).
6. O modo de consentimento começa com tudo negado e só `analytics_storage` é concedido no aceite;
   `allow_google_signals` e `allow_ad_personalization_signals` vão desligados (teste).
7. Retirar o aceite pelo "Cookies" do rodapé para os envios na hora e apaga os cookies `_ga` e
   `_ga_*` (teste e navegador).
8. Uma vitrine em `/<slug>`, o painel e as outras telas do grupo `(auth)` não carregam o script, com
   ou sem aceite (teste prende onde ele é montado; navegador para as telas que abrem sem a API).
9. Sem a variável `SITE_GA_MEASUREMENT_ID`, nada é carregado, qualquer que seja o cookie (teste).
10. O ID só chega ao navegador nas três telas e para o visitante que aceitou (teste e `curl`).
11. Um arquivo só nomeia o `gtag`: `apps/web/src/lib/google-analytics.ts`. O teste do AA3 que dizia
    "nada do Google" passa a dizer qual é esse arquivo. O módulo nunca envia sem dizer para qual ID.
12. O texto da política foi conferido contra o que o código faz, sem subir a `LegalVersion`.
13. `docs/product/` diz que a Beelink mede o próprio site com o Google Analytics, só de quem aceitou.
    A regra 4 de `apps/web/AGENTS.md` diz qual é o arquivo (e o contrato continua com menos de 120
    linhas). Os mapas de superfície e o guia de deploy estão atualizados.
14. Um spec Playwright prova num navegador os itens 1, 2, 3, 7 e 8, com toda requisição ao Google
    interceptada. Ele não roda na suíte aqui (ver "Fora de escopo").
15. `pnpm ci-check` verde.
16. As três telas foram usadas num navegador, com as requisições ao Google interceptadas e o ID de
    teste `G-TEST000000`; a lista de requisições e as capturas estão guardadas.

## Decisões

### O módulo

1. **`apps/web/src/lib/google-analytics.ts` é o único arquivo que nomeia o `gtag`, a fila
   `dataLayer`, o endereço do script e a trava `ga-disable-<ID>`**, como `meta-pixel.ts` faz com o
   `fbq`. Toda função recebe o ID de medição, e **todo evento sai endereçado a um ID** (`send_to`).
   Sem `send_to`, um evento do `gtag` vai para todos os IDs que a aba configurou. É isso que deixa
   o BEELINK-303 (o GA de cada loja) usar o mesmo módulo com outro ID sem que um receba o evento do
   outro. Nada do 303 é construído aqui.
2. **A fila é uma função tipada, não um script injetado**, como no pixel. Cada chamada entra na fila
   como o objeto `arguments`, porque é assim que a biblioteca do Google distingue um comando de um
   dado: um array posto na fila nunca é lido.
3. **Modo de consentimento:** `consent default` com os sete tipos negados (`ad_storage`,
   `ad_user_data`, `ad_personalization`, `analytics_storage`, `functionality_storage`,
   `personalization_storage`, `security_storage`) e, em seguida, `consent update` só com
   `analytics_storage: granted`. O script só é pedido depois do aceite, então a biblioteca nunca
   roda no estado "negado" de uma visita sem resposta (o modo que o Google chama de básico).
4. **`allow_google_signals: false` e `allow_ad_personalization_signals: false`** vão no `config` do
   ID. Nenhum identificador de pessoa é passado (`user_id` não existe no módulo).
5. **`send_page_view: false`, e a visualização de página é enviada pelo nosso código.** É o que
   deixa contar uma visualização por tela, com o endereço que nós escolhemos (decisão 9).
6. **Uma trava por ID, a `ga-disable-<ID>` que o Google documenta para desligar a medição.** O ID
   fica aberto só enquanto a aba está numa das três telas com o aceite de pé. Sair da tela fecha;
   retirar o aceite fecha e avisa a biblioteca (`consent update` com `analytics_storage: denied`).
   A biblioteca já carregada continua na aba até a próxima carga de página, fechada: é o mesmo
   desenho do pixel.
7. **Apagar os cookies:** `_ga` e todo `_ga_*`, com `Path=/`, sem domínio e em cada domínio pai do
   endereço (o Google grava "no domínio mais alto que conseguir", e o código não precisa saber qual
   foi). O domínio do cookie fica no padrão do Google: restringir (`cookie_domain`) seria configurar
   algo que não dá para conferir sem a biblioteca de verdade.
8. **Dois cookies e 2 anos são o padrão do Google**, não uma configuração nossa. A política diz o
   mesmo, com a fonte no plano do AA3 (decisão 28).

### O que é enviado

9. **O endereço enviado é a origem e o caminho, e de parâmetros só os rótulos de campanha**
   (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`). Todo o resto sai:
   `/login` recebe o caminho do painel para onde voltar, e qualquer link pode trazer `fbclid`,
   `gclid` ou outro parâmetro. Os rótulos ficam porque são o que diz qual campanha trouxe o
   visitante, e não identificam ninguém. O fragmento (`#planos`) também sai.
10. **A página de onde o visitante veio vai sem parâmetros**: só a origem e o caminho. Um link de
    confirmação de e-mail ou de redefinição de senha tem um token no endereço; quem sai dele para
    `/login` com uma carga de página leva esse endereço como `referrer`.
11. **O endereço vai explícito em todo evento** (`page_location`) e também no `config`, para que a
    biblioteca não leia `location.href` por conta própria.
12. **Dois eventos: `page_view` e `sign_up`.** O `sign_up` vai sem parâmetro nenhum: o `method` que o
    Google recomenda seria sempre "e-mail", e não acrescenta nada.
13. **`generate_lead` fica para o AA6.** O ponto de chamada está pronto: a landing inteira fica
    dentro de `SiteAnalytics`, então o formulário de entregador chama `useSiteTrack()`. O AA6
    acrescenta o nome ao tipo `SiteEvent` e a chamada no envio do formulário, e confere se a política
    cobre ("o que você faz nelas, como criar uma conta").

### Onde carrega, e para quem

14. **Um componente de servidor, `SiteMeasured`, em volta das três páginas** (`app/page.tsx`,
    `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`), e não no layout do grupo `(auth)`:
    esqueci a senha, confirmar e-mail e redefinir a senha ficam de fora. Ele lê a resposta
    (`siteConsentAt()`), monta o `SiteConsentGate` do AA3 e, dentro dele, o carregador
    (`SiteAnalytics`). Um teste prende que só essas três páginas o importam.
15. **O servidor só entrega o ID a quem ele leu como `granted`.** Quem aceita na própria landing
    ainda não tem o ID na página: o carregador pede a página de novo ao servidor (`router.refresh()`),
    que agora lê o aceite e entrega o ID. Não há rota nova. O mesmo pedido acontece depois de
    qualquer resposta dada na página, para que a página que o roteador guarda seja a que o servidor
    desenharia para a resposta em vigor.
16. **Vale o cookie que está no navegador agora, não só o que a página recebeu.** O carregador só
    age com o `bl_site_consent=granted` presente no navegador naquele momento. Uma página devolvida
    pelo botão "Voltar" pode ter sido desenhada para uma resposta que já mudou.
17. **As telas de entrar e de criar conta não perguntam.** Sem resposta, o servidor não entrega o
    ID e nada é carregado.

### Navegar sem recarregar

18. **A biblioteca do Google ouve as mudanças de endereço da aba.** Numa propriedade do GA4, a opção
    "Mudanças na página com base em eventos do histórico do navegador" (medição otimizada) vem
    ligada, e com ela a biblioteca envia sozinha uma visualização a cada mudança de endereço: contaria
    em dobro entre as três telas e, pior, enviaria o endereço da primeira página aberta ao sair delas
    sem recarregar (a loja de exemplo, "Esqueci a senha"). Não há parâmetro no código que desligue
    isso; é uma opção da propriedade.
19. **A defesa no código: a trava fecha antes de o endereço mudar.** O Next avisa o começo de toda
    navegação em `src/instrumentation-client.ts` (`onRouterTransitionStart`), antes do
    `history.pushState`. Ali o módulo fecha a trava de todo ID aberto, quando o destino é outro
    caminho. Quem reabre é a chegada numa tela medida com o aceite de pé. Uma âncora da mesma página
    (`#planos`) não fecha nada.
20. **A defesa não substitui a configuração.** Ela depende de a biblioteca respeitar a trava no
    instante em que ouve a mudança, e isso não foi conferido com a biblioteca de verdade (ver
    "Atenção"). O PR pede ao Rafael que desligue a opção na propriedade.
21. **Um evento pedido com a trava fechada é descartado**, nunca guardado para depois.

### Retirar o aceite, e o texto legal

22. **Retirar o aceite fecha a trava, avisa a biblioteca e apaga os cookies `_ga`.** Recusar também
    apaga, se houver o que apagar (quem aceitou há mais de 180 dias é perguntado de novo, e os
    cookies do Google duram 2 anos).
23. **O texto da política muda num ponto, dentro da mesma versão `2026-10-12`.** O AA3 escreveu que,
    ao retirar o aceite, "os cookies do Google Analytics continuam no seu navegador até vencerem ou
    até você apagá-los". Este ticket apaga. A frase passa a dizer isso. A versão não sobe: ela ainda
    não foi publicada.
24. **O resto do texto confere:** as três telas, "nunca numa loja", nada carregado sem o aceite, as
    telas de entrar e de criar conta que não perguntam, o que é enviado (as páginas abertas, de onde
    o visitante veio e a conta criada), os dois cookies e os 2 anos, e que a medição não é para
    anúncios.

### Testes e documentação

25. **O teste do AA3 "loads nothing of Google's" passa a dizer o arquivo:** só
    `lib/google-analytics.ts` cita `googletagmanager`, `google-analytics.com` ou `gtag(`.
26. **Spec Playwright novo, `e2e/site-analytics.spec.ts`,** com toda requisição ao Google
    interceptada. No lugar da biblioteca do Google ele entrega uma **biblioteca de mentira**
    (`e2e/support/google-tag.ts`), escrita a partir do que o Google documenta: lê a fila, respeita o
    consentimento e a trava, grava `_ga` e `_ga_<id>`, pede `…/g/collect` a cada evento e, como a
    propriedade com a opção ligada, envia uma visualização sozinha a cada mudança de endereço. Ela
    prova o nosso lado do contrato, não o comportamento do Google.
27. **`e2e/site-consent.spec.ts` passa a interceptar o Google também.** Desde este ticket, aceitar o
    aviso faz o navegador pedir o script, e a suíte não pode chamar o Google.
28. **No spec, a resposta da API ao cadastro é interceptada.** O que ele prova é o evento; o cadastro
    de verdade é do `auth-journey.spec.ts`. Assim o spec é o mesmo com e sem a API.
29. **`docs/product/` ganha uma seção** sobre a medição do próprio site; a regra 4 de
    `apps/web/AGENTS.md`, uma frase; o guia de deploy, a opção da propriedade e como conferir.

## Atenção (não é para resolver aqui)

- **Ninguém viu um evento chegar a uma propriedade de verdade do GA4.** Tudo o que este ticket
  prova, prova contra a fila do `gtag` e contra uma biblioteca de mentira. O PR traz o passo a passo
  para o Rafael conferir em produção (Tempo real e DebugView).
- **O que depende da biblioteca de verdade e não foi conferido:** que `ga-disable-<ID>` vale no
  instante em que ela ouve a mudança de endereço; que `page_location` no `config` vale para os
  eventos que ela envia sozinha (rolagem, cliques de saída, `user_engagement`); que o `send_to`
  mantém um evento fora de outro ID.
- **A medição otimizada da propriedade envia mais do que este código pede** (rolagem, cliques de
  saída, interações com formulário). A política diz "o que você faz nelas", e cobre. A opção
  "interações com formulário" não envia o que foi digitado, mas o Rafael deve saber que ela existe.
- **BEELINK-303:** os cookies `_ga` são do endereço inteiro. Retirar o aceite no site apaga o `_ga`
  que o GA de uma loja também usaria, e o contrário. O 303 precisa decidir isso, e de outra versão
  do texto (o AA3 já avisou).
- **Subdomínios (Épico Y):** com o domínio padrão do Google, `_ga` vale para `beelink.biz` e para
  todo subdomínio dele. Se uma loja ganhar um subdomínio da plataforma, o cookie é enviado a ela.
  Nada lá o lê.

## Fora de escopo

- O Google Analytics de cada loja na vitrine (BEELINK-303).
- `generate_lead` e o envio do formulário de entregador (AA6).
- Subir a `LegalVersion`, e qualquer mudança na API ou em `packages/contracts`.
- Medição pelo servidor (Measurement Protocol), `user_id`, comércio eletrônico, Google Ads.
- `next build`, `turbo build` e as suítes e2e: o Docker está desligado e o disco tem cerca de 3 GB
  livres. O spec é escrito e roda aqui só contra o `next dev`, com uma configuração solta.

## Pendências do Rafael

- **Na propriedade do GA4:** desligar "Mudanças na página com base em eventos do histórico do
  navegador" (Administrador → Fluxos de dados → o fluxo da web → Medição otimizada → Visualizações
  de página → Mostrar configurações avançadas). Manter o Google Ads desvinculado e os sinais do
  Google desligados (já pedido no AA3).
- **Pôr `SITE_GA_MEASUREMENT_ID` só no ambiente de produção**, com este ticket no ar, e conferir no
  Tempo real e no DebugView (passo a passo no PR).
- **Rever o texto da política**, que mudou numa frase.

## 12/10, depois do código — o que mudou e o que foi visto

O texto acima fica como foi escrito. O que segue é o que a construção e o navegador mostraram.

### O que mudou no caminho

- **A biblioteca só abre uma tarefa depois de a página chegar** (decisão 19, que dizia só "a chegada
  reabre"). O navegador avisa todos os ouvintes de que o endereço mudou dentro do mesmo evento em
  que o React desenha a página devolvida pelo "Voltar". Aberta pelo efeito da página, a biblioteca
  de mentira ouviu o evento já aberta e enviou uma visualização dela, com o endereço inteiro, além da
  nossa. Agora a tela agenda a abertura (`setTimeout`), e o evento termina com a trava fechada.
- **"Voltar" e "Avançar" fecham sempre.** Quando o Next avisa uma navegação desse tipo, o endereço do
  navegador já é o do destino: comparar caminhos ali não diz se a página foi deixada. Para o caso de
  o destino ser a própria página (voltar de uma âncora), a tela ouve o `popstate` e reabre uma tarefa
  depois, sem contar outra visualização.
- **O título enviado é o que a página entrega, nunca o do documento.** Na chegada sem recarregar, o
  documento ainda não tinha título (a visualização de `/signup` saía sem ele) e, vindo de outra
  página, teria o título dela. `SiteMeasured` recebe `title`: o da landing e, nas duas telas, o
  título do site.
- **A página de onde o visitante veio, quando é do próprio site, vai só como a origem** (decisão 10
  dizia "a origem e o caminho"). O caminho de uma página do site pode ser uma loja, um pedido ou o
  painel.
- **Um rótulo de campanha com `@` ou com mais de 80 caracteres não é enviado.** Um link de campanha
  pode trazer um e-mail escrito por quem o montou.
- **A tela pede a página de novo ao servidor depois de qualquer resposta dada nela, não só do
  aceite**, e compara com o cookie do navegador, não com o estado da tela (decisões 15 e 16). Sem
  isso, quem recusava, ia a outra tela e voltava pelo "Voltar" recebia a página guardada de antes
  da resposta. Visto no navegador: depois de retirar o aceite, ir a `/signup` e voltar, o aviso não
  reaparece e "Cookies" mostra "você recusou".
- **Um endereço de navegação que não dá para ler conta como saída** (a trava fecha).
- **O spec ganhou dois testes além dos planejados:** o aceite dado de novo depois de retirado (a
  biblioteca que já está na aba volta a enviar, sem outro pedido do script) e o ID no HTML, página
  por página e cookie por cookie.
- **`e2e/site-consent.spec.ts` intercepta o Google em todos os testes**, com a mesma biblioteca de
  mentira.

### O que foi visto

`next dev` na porta 3200, sem a API, com `SITE_GA_MEASUREMENT_ID=G-TEST000000` no `.env.local` do
worktree (devolvido ao que era no fim). Um Chromium headless próprio, com toda requisição a um
endereço do Google respondida pelo teste. **Nenhuma requisição saiu para o Google, e nenhum evento
foi visto chegando a uma propriedade de verdade do GA4.** O navegador compartilhado não foi usado:
uma navegação nele sem a interceptação seria um pedido de verdade ao Google.

- **O ID no HTML** (`curl`, 11 endereços × 5 cookies): só aparece em `/`, `/login` e `/signup` com
  `bl_site_consent=granted`. Sem cookie, com `denied`, com um `bl_consent=granted` de loja ou com
  um valor inventado, não aparece. Em `/forgot-password`, `/verify-email`, `/reset-password`,
  `/privacidade`, `/termos` e num endereço de loja não aparece com cookie nenhum. `/admin/…` e
  `/dashboard` respondem 307 para `/login?voltar=…`.
- **Sem resposta e depois de recusar** (pelo teclado: Tab, Tab, Enter), em `/`, `/login` e
  `/signup`, com recarga: nenhuma requisição ao Google, nenhum cookie `_ga`, a trava não existe.
- **Aceitando pelo teclado** (Tab, Tab, Tab, Enter), sem recarregar: um pedido do script
  (`…/gtag/js?id=G-TEST000000`) e uma visualização (`en=page_view`, `tid=G-TEST000000`,
  `dl=http://localhost:3200/`). A linha de status continua dizendo "Escolha salva: você aceitou…".
- **Landing → `/signup` por "Começar agora"**, sem recarregar: mais uma visualização, uma só, com
  `dl=…/signup`; o script não é pedido de novo. Depois, `/signup` → `/login`: mais uma.
- **Conta criada** (a resposta da API foi interceptada, 201): `en=sign_up`, `dl=…/signup`. Nome,
  e-mail e senha não aparecem em nenhuma requisição.
- **`/login?voltar=%2Fadmin%2Floja-da-ana%2Forders%2F1042`:** `dl=…/login`, sem o parâmetro. Um link
  de campanha com `utm_source`, `fbclid`, `utm_campaign` e `#planos`:
  `dl=…/?utm_source=instagram&utm_campaign=lancamento`.
- **Saindo de uma tela medida sem recarregar** (`/login` → "Esqueceu a senha?"; landing →
  "Privacidade"): nenhuma requisição, e a trava fica fechada. "Voltar" para `/login`: uma
  visualização, uma só. "Avançar": nada.
- **Retirando o aceite** ("Cookies" no rodapé, Tab, Tab, Enter): `bl_site_consent=denied`, os dois
  cookies `_ga` somem, a trava fecha. Ir a `/signup` e voltar não envia nada.
- **Aceitando de novo:** outra visualização, com a biblioteca que já estava na aba.
- **As outras telas com o aceite:** nenhuma requisição ao Google. O endereço de loja respondeu 500,
  porque a API está desligada: a vitrine de verdade não foi aberta.
- **O teste pega:** com o `onRouterTransitionStart` desligado, dois testes falham com a
  visualização "da biblioteca" para `/signup` (em dobro) e para `/forgot-password` (uma tela que
  não é medida). Sem a abertura adiada, o do "Voltar" falha com a visualização em dobro.
- **Specs contra o `next dev`**, com uma configuração solta: `site-analytics.spec.ts` 10 de 10,
  `site-consent.spec.ts` 14 de 14.
- **Console:** sem erros nem avisos nas três telas. Os únicos erros são os do endereço de loja (500).
- **Capturas** a 1280 e a 390 px, e a lista de requisições de cada passo, em
  `.claude/worktrees/landing-aa-pr/screens-320/`. As telas não mudaram de desenho.

### O que não foi exercitado

- **A biblioteca de verdade do Google**, e portanto: se `ga-disable-<ID>` vale no instante em que ela
  ouve a mudança de endereço (ou se ela espera antes de enviar); se o `page_location` do `config`
  vale para os eventos que ela envia sozinha; se o `send_to` mantém um evento fora de outro ID; os
  nomes e a duração dos cookies. A lista de requisições prova o que a página pediu e o que o nosso
  código disse à fila.
- `next build`, `turbo build` e as suítes e2e. O spec roda na suíte sobre o build, com a API; aqui
  rodou contra o `next dev`, sem ela. `instrumentation-client.ts` só foi compilado pelo `next dev`.
- **Uma vitrine de verdade e o painel**, que dependem da API. O que prende o item 8 é o teste dos
  arquivos que montam `SiteMeasured`, e o `curl`.
- **Sair de uma tela medida para uma loja sem recarregar** (o link "Ver uma loja de exemplo"): sem a
  API a navegação vira uma carga de página. O mesmo caminho foi exercitado com "Esqueceu a senha?"
  e com "Privacidade".
- **Duas abas**, o atributo `Secure`, Safari, Firefox e um celular de verdade.
- **Uma âncora da mesma página** (`#planos`): a trava não fecha, de propósito. Se a propriedade
  tiver a opção do histórico ligada e a biblioteca contar a mudança de âncora, ela envia uma
  visualização dela para a própria landing.
- Storybook: nada mudou em `packages/ui`.

### Achado fora deste ticket (BEELINK-319)

Passar pelo aviso com o teclado rola a página. A 1280 × 800, cada Tab dentro do aviso desce a página
(0 → 432 → 832 → 1232 px); a 390 × 844, 0 → 453 → 948 → 1443 px. Quem responde pelo teclado termina
a mais de mil pixels do topo. Com o ponteiro não rola. O aviso reserva o pé do documento
(`scroll-padding-bottom`) e os controles dele ficam dentro dessa reserva. É do bloco do AA3, em
`packages/ui`, e não foi mexido aqui.
