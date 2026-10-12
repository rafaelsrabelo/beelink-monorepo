# BEELINK-319 (AA3) — Landing: aviso de cookies com aceitar e recusar, e o link "Cookies" no rodapé

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Terceiro ticket da pilha: `main` → AA1 (317) → AA2
> (318) → **AA3** → AA4 (320) … Sai de `feat/BEELINK-318-landing-planos`, e o PR tem essa branch como
> base. Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`. O Rafael delegou as
> decisões deste épico; as que estão abaixo são do desenvolvedor, e ele pode mudar qualquer uma.

## O problema

A Beelink quer medir as visitas à própria landing e a criação de contas com o Google Analytics
(AA4, BEELINK-320). Antes de qualquer script do Google carregar, o visitante precisa poder dizer sim
ou não, a resposta precisa ser lembrada e poder ser mudada, e a política de privacidade, que hoje diz
"o bee-link não grava cookies de análise", precisa passar a dizer a verdade.

Este ticket **não carrega nada do Google**. Ele entrega a pergunta, a resposta guardada e o texto.
O modelo é o aviso das lojas (BEELINK-271), que não muda.

## Definição de Pronto

1. Existe uma variável de ambiente do servidor com o ID de medição da Beelink, opcional, validada no
   formato de um ID do GA4. Ela está no `.env.example` do web, sem valor, e chega ao contêiner de
   produção. O ID não está escrito em nenhum arquivo do repositório.
2. Sem a variável, a landing não desenha aviso nem "Cookies" no rodapé, e não grava cookie (teste).
3. Com a variável, quem ainda não respondeu vê o aviso na landing, fixo no pé da tela, com o que o
   aceite libera, o link para a política de privacidade e dois botões do mesmo tamanho e peso,
   "Recusar" e "Aceitar". Não há botão de fechar. Não é diálogo: o foco não fica preso e a página
   continua usável.
4. "Aceitar" e "Recusar" gravam `bl_site_consent` com `granted` ou `denied`, por 180 dias, com
   `Path=/`, `SameSite=Lax` e `Secure` em https. Na visita seguinte o aviso não volta, e a página já
   sai certa do servidor, sem piscar.
5. Um valor que não seja uma das duas respostas é "ainda não perguntado", nunca um sim.
6. Um `bl_consent` de loja nunca é lido como resposta do site, nem o `bl_site_consent` como resposta
   de uma loja (teste, nos dois sentidos).
7. O rodapé da landing tem "Cookies", que reabre o aviso mostrando a escolha atual e leva o foco até
   ele. Dá para responder só com o teclado. A resposta dada é anunciada numa linha de status.
8. O aviso não cobre o botão do hero nem o do formulário de entregador de modo que não dê para
   usá-los, e o rodapé não fica atrás dele no fim da página, a 1280 e a 390 px.
9. As telas de entrar e de criar conta não perguntam nada (um teste prende onde o aviso é montado).
10. A `LegalVersion` subiu. `/privacidade` mostra o texto novo: a linha do `bl_site_consent`, o Google
    como quem recebe os dados de navegação da landing e das telas de entrar e criar conta, só de quem
    aceitou, e os cookies `_ga`. A frase "o bee-link não grava cookies de análise…" foi reescrita. A
    API e o web compilam com a versão nova.
11. Os textos do aviso estão em `messages.landing.consent`, em pt-BR e em inglês.
12. O bloco mora em `packages/ui`, com história e teste com axe. Há testes do store, do cookie e da
    leitura no servidor. Os testes da landing e os do aviso das lojas continuam passando.
13. Existe um spec Playwright do aviso.
14. O que entrou está nas tabelas de `apps/web/docs/README.md` e `packages/ui/docs/README.md` e na
    regra 4 de `apps/web/AGENTS.md`, que continua com menos de 120 linhas.
15. `pnpm ci-check` verde.
16. A página foi usada num navegador a 1280 e a 390 px, com teclado, com e sem a variável, e há
    capturas das duas larguras.

## Decisões

### A variável

1. **`SITE_GA_MEASUREMENT_ID`, só do servidor.** Fica em `apps/web/src/lib/server-env.ts`. Vazia conta
   como ausente, como as outras: o compose entrega uma variável não definida como `""`. Nunca
   `NEXT_PUBLIC_`: a mesma imagem serve produção e homologação, e só produção vai medir.
2. **O formato é o que o produto já aceita como ID do GA4:** `G-` e de 6 a 16 letras maiúsculas ou
   dígitos (`GOOGLE_ANALYTICS_ID`, na API, e `googleAnalyticsIdOf`, no painel). `G-JL73KN2ZR9` e
   `G-TEST000000` passam.
3. **Um valor fora do formato impede o web de subir**, como já acontece com `EXAMPLE_STORE_SLUG`,
   `APP_ENVIRONMENT` e `WEB_DOMAIN`. A alternativa seria tratar o erro como "sem ID": a página subiria
   sem aviso e sem medição, e ninguém saberia por quê. Um erro na subida aparece no deploy.
4. **A variável entra no `docker-compose.dokploy.yml` e no `.env.dokploy.example`.** O compose lista as
   variáveis do serviço `web` uma a uma; sem a linha, o valor posto no Dokploy nunca chegaria ao
   contêiner. O ID de produção não é escrito em lugar nenhum do repositório.
5. **Neste ticket o ID não vai para o navegador.** A página só precisa saber se ele existe. Quem
   escreve o ID no HTML é o AA4, junto com o script.

### Como a resposta é guardada

6. **Cookie `bl_site_consent`, nosso, não `httpOnly`, `Path=/`, `SameSite=Lax`, `Secure` em https,
   180 dias para o sim e para o não.** As mesmas escolhas do `bl_consent`, pelos mesmos motivos: o
   servidor lê para desenhar a página já certa, o navegador escreve na hora do clique, e recusar não
   pode ser a resposta que se dá mais vezes. `Path=/` porque a resposta vale para a landing e para as
   telas de entrar e de criar conta (AA4).
7. **Um módulo próprio, que não importa nada do cookie das lojas** (`lib/site-consent-cookie.ts`). O
   briefing manda reaproveitar o que servir. O que serve é o desenho, não o código: se o `bl_consent`
   ganhar uma segunda finalidade, o valor dele muda de forma (decisão 4 do BEELINK-271), e o do site
   não pode mudar junto por tabela. São quatro linhas repetidas, de propósito.
8. **O que separa os dois cookies é o nome, e só ele.** No endereço da plataforma o `bl_consent` vai
   em `Path=/<slug>` e nunca chega a `/`; no domínio próprio de uma loja ele vai em `Path=/`, mas ali
   o endereço é outro. Já o `bl_site_consent` vai em `Path=/` e por isso **é enviado** às páginas das
   lojas no endereço da plataforma. Ele não vale nada lá: `consentAt()` lê só `bl_consent`, e
   `siteConsentAt()` lê só `bl_site_consent`. Um teste prende isso nos dois sentidos.
9. **Nada é gravado na API.** A resposta é de um navegador, não de uma conta. O aviso não é um aceite
   dos Termos e não escreve em `legal_acceptances`.
10. **Store Zustand próprio, por carga de página** (`stores/site-consent.ts`), no molde de
    `stores/consent.ts`. Começa do que o servidor leu. O store das lojas não foi generalizado para
    servir aos dois: mexer nele seria mexer no aviso das lojas.
11. **Uma decisão, num lugar só: `SiteConsentGate`.** Com ID ele fornece o estado; sem ID devolve a
    página como veio. O aviso e o botão do rodapé leem o estado e, fora do portão, não desenham nada.
    Assim a página monta os dois sem condição nenhuma, e não há como desenhar o botão sem o aviso ou
    o aviso sem o ID. Fora do portão, quem perguntar pela resposta recebe uma recusa que não muda:
    nada pode ser carregado por ela.
12. **Um cookie que sobrou de quando havia ID não vale nada sem ID.** Sem ID não há estado, e sem ID
    o AA4 não tem o que carregar.

### O aviso

13. **Fixo no pé da tela com `position: sticky`, e não `fixed`.** O aviso é o primeiro elemento do
    documento (um teclado e um leitor de tela chegam a ele antes de tudo) e o último na ordem do
    desenho: a moldura da landing vira uma coluna, e o aviso vai para o fim dela com `order`. Com
    `sticky; bottom: 0` ele acompanha a tela enquanto a página rola e, no fim da página, pousa no
    próprio lugar, depois do rodapé. O espaço que o briefing pede no fim da página existe por
    construção: é a altura do próprio aviso, em qualquer largura e em qualquer idioma, sem script
    medindo nada. Com `fixed` seria preciso medir o aviso para reservar o espaço, e antes de o script
    chegar o rodapé ficaria atrás dele.
14. **A moldura da landing (`LandingShell`) passa a ser uma coluna flex, sempre**, com ou sem aviso.
    Uma moldura que mudasse de desenho conforme a variável faria a página de produção diferente da de
    desenvolvimento. A mudança não pode mexer em nenhuma medida da página: conferir no navegador, antes
    e depois, a altura do documento e a posição de cada seção.
15. **Uma faixa de borda a borda**, com o fundo branco dos cartões (`brand-surface`) e uma linha preta
    em cima. Aparece sobre o creme, sobre o amarelo da chamada final e sobre o preto da seção dos
    entregadores. O texto fica na coluna da página; no celular, texto em cima e os dois botões lado a
    lado, da mesma largura.
16. **Dois botões de um desenho só**, "Recusar" primeiro e "Aceitar" depois: a mesma classe, o mesmo
    contorno. Nenhum dos dois é o botão "cheio". Sem "X".
17. **Não é diálogo.** É uma região com nome (`section` rotulada pelo título). Recebe foco por script
    (`tabindex="-1"`) e não é parada do Tab.
18. **Fica acima da página e abaixo do menu do celular.** O menu aberto cobre o aviso; o contrário
    esconderia os últimos itens do menu num celular baixo.
19. **O texto diz o que acontece, sem a palavra "essenciais" e sem categorias:** a Beelink usa o Google
    Analytics para medir as visitas à página e a criação de contas; aceitar envia dados da navegação
    ao Google, nesta página e nas telas de entrar e de criar conta; recusar não muda nada. O aceite
    vale para as três telas, então o aviso diz as três.
20. **A resposta dada é anunciada** numa linha `role="status"`. Uma resposta lida do cookie não é
    anunciada a cada visita.

### O rodapé

21. **"Cookies" é um botão, não um link**, como no rodapé das lojas: é uma ação na página. Fica na
    coluna "Empresa", depois de "Privacidade". O rodapé recebe o botão pronto por uma prop
    (`cookies`), e o desenho dele é um bloco pequeno (`landing-footer-action`).
22. **Reabrir leva o foco ao aviso; responder devolve o foco ao botão.** Quem respondeu ao aviso da
    primeira visita, sem ter passado pelo rodapé, não tem para onde voltar: o foco fica onde o
    navegador o deixa, no começo do documento.

### Os textos legais

23. **Versão nova: `LegalVersion = "2026-10-12"`.** O mecanismo é o do BEELINK-171, seguido como está:
    o tipo muda no contrato, e a API (`LEGAL_VERSION`) e a web (`legalTexts.version` e a frase
    "Vigente desde…" dos dois documentos, presa por teste) param de compilar ou de passar até dizerem
    o mesmo dia. Os Termos mudam só de data.
24. **O que acontece com quem aceitou a versão anterior** é o que o BEELINK-271 descreveu, sem
    mudança: nada é apagado, ninguém é bloqueado, conta nova grava `2026-10-12`, e a conta antiga
    ganha uma linha nova na próxima vez que passar por "Continuar com Google" ou definir a senha pelo
    link do e-mail.
25. **O que muda na política** (rascunho para revisão, como o resto do documento):
    - a abertura passa a incluir quem visita o site do bee-link;
    - "Controlador e operador": a medição das visitas ao próprio site entra nos usos em que o bee-link
      é o controlador;
    - seção nova, "Google Analytics no site do bee-link": o que é, em que páginas é carregado (a
      página inicial e as telas de entrar e de criar conta), que só é carregado depois do aceite, o
      que vai para o Google, que nunca é carregado numa loja, que a resposta é separada da resposta
      dada a uma loja, e como retirar o aceite;
    - "Dados técnicos": a frase "não usa, por conta própria, ferramentas de análise de audiência" e a
      do "único script de terceiros" são reescritas;
    - "Para que os dados são usados": a medição entra no item do consentimento;
    - "Com quem os dados são compartilhados": o item do Google ganha o segundo caso;
    - "Cookies": a linha do `bl_site_consent`; a frase "o bee-link não grava cookies de análise, de
      publicidade ou de rastreamento" é reescrita; os cookies `_ga` e `_ga_<identificador>` são
      nomeados, com a duração, com a observação de que valem para o endereço inteiro e de que o
      script só é carregado naquelas páginas, nunca numa loja.
26. **O texto descreve o produto do dia em que a pilha for ao ar** (AA3 e AA4 juntos), como o
    BEELINK-271 decidiu para o pixel. O AA4 não sobe a versão de novo.
27. **O texto só afirma o que este épico decide.** Ele diz que o Google Analytics serve para medir, e
    que o bee-link não usa dados pessoais para publicidade própria. Isso deixa de ser verdade se a
    propriedade do GA4 for ligada ao Google Ads ou tiver os "sinais do Google" ligados (ver
    "Pendências do Rafael").
28. **A duração dos cookies `_ga` (2 anos) e o domínio em que são gravados** vêm da documentação do
    Google, lida em 12/10: "_ga: 2 years", "_ga_<container-id>: 2 years", e "cookies are set on the
    highest level of domain possible".

### Testes e documentação

29. **O spec Playwright do aviso é escrito e entra na suíte**, e o `playwright.config.ts` passa a subir
    o web com um ID de teste (`G-TEST000000`). Sem isso o spec não teria o que ver. O efeito colateral:
    o `e2e/accessibility.spec.ts` passa a examinar `/` com o aviso na tela, que é o que um visitante
    novo vê.
30. **`docs/product/` não muda.** Ele descreve o que o produto faz, e até o AA4 nada é medido.

## Contrato para o AA4

- **No servidor:** `siteConsentAt()` em `apps/web/src/lib/site-consent.ts` devolve `granted`, `denied`
  ou `null`. O ID é `serverEnv.SITE_GA_MEASUREMENT_ID`. Sem ID não há o que carregar, qualquer que
  seja o cookie.
- **No cliente:** `useSiteConsent((consent) => consent.choice)`, de
  `components/landing/site-consent-provider.tsx`. Aceitar muda o valor na hora, sem recarregar, e
  retirar o aceite também: o script já carregado só sai da página na próxima carga, então o AA4
  precisa parar de enviar quando a escolha deixar de ser `granted`.
- **Nas telas de entrar e de criar conta:** montar `SiteConsentGate` com o ID e o que
  `siteConsentAt()` leu, **sem** o aviso (`LandingConsentLive`). Um teste deste ticket prende que só
  a landing monta o aviso; o AA4 não precisa mexer nele.
- **Para o texto continuar verdadeiro:** carregar o script só nessas três telas; não ligar sinais de
  publicidade (`allow_google_signals`, `allow_ad_personalization_signals`); e, se o AA4 enviar mais do
  que as páginas abertas e a criação da conta, a política precisa de outra versão.
- **No e2e:** o web sobe com `G-TEST000000`. Um spec que aceite o aviso vai fazer o navegador pedir o
  script do Google com esse ID; o AA4 decide se intercepta o pedido.

## Atenção (não é para resolver aqui)

- **Se este ticket for ao ar sozinho com a variável configurada,** o aviso diz que aceitar envia dados
  ao Google quando ainda nada é enviado. O erro é para o lado seguro, mas a variável só deve ser
  posta em produção com o AA4 no ar.
- **BEELINK-303 (o Google Analytics da loja na vitrine)** vai carregar um script do Google numa loja.
  A frase "nunca numa loja" fala do Google Analytics do bee-link e continua verdadeira, mas os cookies
  `_ga` são um só conjunto para o endereço inteiro: o GA de uma loja leria o mesmo identificador. O
  303 precisa de uma versão nova dos textos e de pensar nisso.

## Fora de escopo

- Carregar o script do Google, `gtag`, qualquer evento (AA4, BEELINK-320).
- As telas de entrar e de criar conta: elas não perguntam, e só passam a ler a resposta no AA4.
- Guardar a resposta na API.
- Um painel de preferências por categoria: há uma finalidade só.
- Pedir de novo o aceite dos Termos a contas antigas (fora desde o BEELINK-171).
- `docs/product/`.
- Suíte e2e e `next build`: o Docker está desligado e o disco tem cerca de 3 GB livres. O spec é
  escrito e não roda aqui.

## Pendências do Rafael

- **Revisão do texto da política** (e, de preferência, de um advogado) antes de mesclar: é um rascunho
  factual, não um parecer.
- **A propriedade do GA4 da Beelink:** não ligar ao Google Ads e deixar os "sinais do Google"
  desligados, ou a política precisa dizer outra coisa (com o Google Ads ligado, o script grava mais
  cookies do que os dois que o texto nomeia).
- **Pôr `SITE_GA_MEASUREMENT_ID` só no ambiente de produção do Dokploy**, depois do AA4 no ar. A
  homologação fica sem a variável.
- Os `[PREENCHER: …]` do BEELINK-171 continuam no texto; "Transferência internacional" tem mais um
  fornecedor para considerar (o Google, pelo Google Analytics).
