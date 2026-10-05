# BEELINK-203 — Q2: o lojista conecta o Asaas e escolhe as formas de pagamento no painel

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico Q (BEELINK-201), segundo ticket. Depende do Q1 (BEELINK-202), que trouxe a conexão por chave
> de API, o cofre e a rota do BFF. Onde o Plane ainda diz Mercado Pago, vale o épico: é o **Asaas**,
> com a conta do próprio lojista. A ficha diz "Área: Web", mas as formas aceitas precisam ser
> guardadas: o ticket também entrega o contrato, a API e a migration delas.
> Área: Web (com contrato, API e banco) · Tipo: novo · Tamanho: M.

## Objetivo

O lojista liga o pagamento online sem sair do painel. Em Integrações → Asaas ele cola a chave de API
da própria conta, vê de quem é a conta ligada e como estão os avisos de pagamento, troca a chave ou
desconecta. Com a conta conectada, escolhe o que o cliente pode usar para pagar: Pix, cartão de
crédito (e em até quantas parcelas) e o acerto na entrega ou na retirada, que é o que a loja faz hoje.

Nada é cobrado neste ticket. As cobranças são do Q3 e do Q4.

## Definição de Pronto

1. **Contrato.** `packages/contracts/src/asaas.ts` tem `AsaasSettings` e `AsaasSettingsPayload`, com
   `pix`, `card`, `maxInstallments` (1 a 12; 1 é à vista) e `offline`. `integration.ts` tem o código
   `ASAAS_SETTINGS_INVALID`.
2. **API.** `GET` e `PUT /api/stores/:slug/integrations/asaas/settings`, só o dono, dentro de
   `modules/integrations/asaas/`. O model `AsaasSettings` (tabela `asaas_settings`) é separado da
   conexão, e a migration vai na mesma entrega.
3. **Padrões.** Até a loja salvar pela primeira vez: Pix ligado, cartão ligado, 1 parcela e pagar na
   entrega ou na retirada ligado.
4. **Regras.** `maxInstallments` é inteiro de 1 a 12. Pelo menos uma das três formas fica ligada. O
   que não passar responde `400 ASAAS_SETTINGS_INVALID`. As configurações são lidas e salvas com a
   loja desconectada. Reconectar e desconectar não as apagam.
5. **BFF.** `apps/web/src/app/api/stores/[slug]/integrations/asaas/settings/route.ts`, com `GET` e
   `PUT`.
6. **O cartão da conta** (bloco em `packages/ui`, com story e teste), em todos os estados:
   indisponível; desconectada (o que conectar dá, o campo da chave, "Conectar", onde achar a chave e
   o link de criar conta, em nova aba, com `rel="noopener noreferrer"`); conectando (botão ocupado,
   campo travado); cada recusa com a sua frase; conectada (nome, documento mascarado, selo de
   sandbox, os quatro estados dos avisos de pagamento, trocar a chave e desconectar com confirmação e
   o foco em "manter"); e precisa reconectar.
7. **O campo da chave é um segredo.** `type="password"` com mostrar e esconder, `autoComplete="off"`,
   `spellCheck={false}`, sem `name`. A chave vive só no estado do componente e some depois de
   conectar. Não vai para storage, URL nem log. A mutation de conectar usa `gcTime: 0` e é zerada
   quando termina. Nenhum teste de snapshot e nenhuma story guarda uma chave que pareça de verdade.
8. **O formulário das formas aceitas** (bloco em `packages/ui`, com story e teste): Pix; cartão, com
   "parcelas sem juros: até N" (1 a 12) e a frase da taxa; pagar na entrega ou na retirada, com a
   frase do acerto direto; salvar, com "salvo" e a falha em palavras; com tudo desligado, a frase que
   pede pelo menos uma forma, sem chamar a API; skeleton enquanto carrega. Só aparece com a conta
   conectada.
9. **A tela** `/admin/<slug>/integrations/asaas`: o link de volta para a lista, o cartão como título
   (`h1`), skeleton enquanto a conexão carrega e o bloco de falha com "tentar de novo". Depois de
   conectar, trocar a chave ou desconectar, a conexão é lida de novo, e a lista e o catálogo também.
10. **A lista e "Nova integração".** `IntegrationProviderValue` inclui `"ASAAS"`, com ícone e texto
    próprios, e `providerTextOf` deixa de devolver o formato do Melhor Envio. A lista mostra a linha
    do Asaas quando a loja conectou ou precisa reconectar, com a conta e o selo de sandbox. As duas
    conexões são lidas em paralelo, e uma falhar não esconde a outra. "Nova integração" tem o cartão
    do Asaas: "Conectar" leva à página dele e, conectado, "Configurar" leva à mesma página.
    `integrationPagesOf` ganha `asaas`.
11. **Testes.** API: unitários do serviço e o e2e `test/asaas-settings.e2e-spec.ts` (padrões, salvar e
    ler, cada recusa, só o dono, fechado a quem não está logado, reconectar e desconectar sem apagar).
    `packages/ui`: testes e stories dos dois blocos em cada estado, e a lista e o catálogo com o
    Asaas. Web: a tela, os helpers e a rota do BFF.
12. **Documentação.** A rota nova em `apps/api/docs/README.md`; a página e o handler em
    `apps/web/docs/README.md`; os blocos em `packages/ui/docs/README.md`.
13. **Visto funcionando** no navegador, no computador e numa largura de celular: as recusas
    (ambiente errado, chave inválida, 429), o estado conectado, o `NEEDS_RECONNECT`, o webhook em
    `ERROR`, salvar as formas, recarregar e desconectar.
14. `pnpm ci-check` verde, a suíte e2e da API inteira e `delivery-check` sem bloqueador.

## O que confirmei na documentação do Asaas (05/10/2026)

- **Onde a chave é criada** (`docs/chaves-de-api`, atualizada em 03/08/2026): na área de Integrações
  da interface web, em **Integrações > Chaves de API**. A página diz que a chave "deve ser criada
  pela interface web do Asaas", "não pode ser gerada pelo aplicativo", "somente pode ser criada por
  usuários administradores" e "é exclusiva do ambiente em que foi gerada". Diz também: "A chave de
  API é exibida apenas uma vez e não pode ser recuperada posteriormente" e "Uma conta Asaas pode ter
  até 10 chaves de API". O link que a página dá para a área de Integrações é o de produção:
  `https://www.asaas.com/customerApiAccessToken/index`. Não há um equivalente confirmado no sandbox.
- **Endereço de cadastro.** No sandbox, `docs/sandbox` (03/08/2026) manda criar a conta em
  `https://sandbox.asaas.com/` e "seguir o fluxo normal de cadastro"; `docs/autenticação-1` cita o
  mesmo cadastro com um parâmetro de origem
  (`https://sandbox.asaas.com/onboarding/createAccount?customerSignUpOriginChannel=HOME`). **Nenhuma
  página da documentação dá um endereço de cadastro em produção.** Fica o que o briefing manda para
  esse caso: `https://www.asaas.com` em produção e `https://sandbox.asaas.com` no sandbox.
- **A conta de sandbox é outra conta** (`docs/sandbox`): "Mesmo que você já tenha uma conta Asaas,
  será necessário criar outra para os testes". Por isso a tela diz qual ambiente esta instalação usa.
- **A chave morre sozinha** (`docs/chaves-de-api`): sem uso por 3 meses, é desabilitada e passa a
  responder `401`; em 6 meses expira de vez. O Asaas avisa por e-mail e pelos eventos de webhook
  `ACCESS_TOKEN_DISABLED`, `ACCESS_TOKEN_EXPIRING_SOON` e `ACCESS_TOKEN_EXPIRED`
  (`docs/eventos-para-chaves-de-api`, 27/08/2026, que lista também `ACCESS_TOKEN_CREATED`,
  `ACCESS_TOKEN_ENABLED` e `ACCESS_TOKEN_DELETED`). Este ticket só usa isso na frase do "precisa
  reconectar"; quem marca o estado são os próximos (veja "Para os próximos tickets").
- **Recusas** (`docs/autenticação-1`, 31/07/2026): os prefixos `$aact_prod_` e `$aact_hmlg_` e os
  códigos `invalid_environment`, `access_token_not_found` e `invalid_access_token_format`, como o Q1
  já tinha anotado.

Nada disso foi tentado com uma conta de verdade: não há chave de sandbox neste ambiente.

## Decisões deste ticket

1. **`AsaasSettings` leva `updatedAt`, e o payload é `Omit<AsaasSettings, "updatedAt">`.** É o
   formato das outras três configurações de loja (`DeliverySettings`, `CashbackSettings`,
   `MelhorEnvioSettings`): `updatedAt` nulo quer dizer "nunca salvou, estes são os padrões".
2. **As colunas têm o nome do contrato** (`pix`, `card`, `maxInstallments`, `offline`), com os
   padrões do item 3 da Definição de Pronto também no banco. Duas `CHECK` guardam o que a API valida
   (`maxInstallments` entre 1 e 12; pelo menos uma forma ligada), como nas migrations de cashback e
   de entrega.
3. **Quem não é o dono recebe 403 antes de qualquer regra.** A faixa de `maxInstallments` e os tipos
   são do DTO. "Pelo menos uma forma" compara três campos e fica no serviço, depois de conferir o
   dono.
4. **`maxInstallments` vale de 1 a 12 mesmo com o cartão desligado.** O número fica guardado, e
   religar o cartão traz de volta a escolha da loja.
5. **O formulário só aparece com `CONNECTED`.** Em `NEEDS_RECONNECT` a tela pede a chave e mais nada:
   as formas online não têm efeito sem uma chave que o Asaas aceite. A API continua lendo e salvando
   as configurações em qualquer estado, como pede o ticket.
6. **A chave não é uma prop.** O formulário da chave guarda o que é digitado no próprio estado e
   entrega a chave só no envio, por `onConnect(apiKey)`. A tela nunca recebe o que está sendo
   digitado, e nenhuma story consegue mostrar uma chave, porque não há por onde passá-la.
7. **`useConnectAsaas` cuida do segredo no TanStack.** A mutation tem `gcTime: 0` e é zerada
   (`reset()`) assim que termina, com sucesso ou com recusa: uma chave do outro ambiente é recusada e
   continua sendo uma chave que vale. Como zerar apaga também o erro, o hook guarda só o código da
   recusa (ou "conectou") no próprio estado. O teste usa um `QueryClient` de verdade e confere que o
   cache de mutations fica vazio.
8. **Gerenciadores de senha.** Além de `autoComplete="off"` e da falta de `name`, o campo leva os
   atributos com que 1Password, LastPass, Bitwarden e Dashlane são avisados para ignorá-lo. É um
   segredo de API, e não a senha de login deste site.
9. **Onde achar a chave é dito em palavras, sem link.** A documentação só confirma o endereço de
   produção. O link que a tela tem é o de criar conta, por ambiente (veja acima).
10. **"Trocar a chave" pertence à conexão em que foi aberto.** O cartão guarda o `connectedAt` de
    quando o lojista abriu o formulário. Quando a conexão muda, o formulário se fecha sozinho e a
    chave digitada some com ele, sem `useEffect` e sem a tela controlar o cartão.
11. **Foco.** Quando o cartão troca o que mostra (a chave pelo estado conectado, ou o contrário), o
    foco vai para o primeiro controle do que entrou, com o `useFocusOnSwap` da casa. Depois de uma
    recusa, o foco volta para o campo da chave, que acabou de ser destravado.
12. **O botão "Conectar" fica desligado com o campo vazio.** Um envio vazio só gastaria uma das
    cinco tentativas por minuto.
13. **"Pelo menos uma forma" aparece assim que a terceira é desligada**, calculada a partir do valor,
    sem estado. Salvar nesse estado não chama a API.
14. **O catálogo diz como cada integração começa.** `IntegrationOptionView` ganha `connectBy`:
    `authorization` (buscar o endereço já começa a autorização, então é uma âncora simples, como no
    Melhor Envio) ou `page` (é só uma página, e vai pelo link do app).
15. **Uma leitura que falha não vira "nada conectado".** Na lista, as linhas do que foi lido
    aparecem junto do aviso de falha com "tentar de novo". A frase de lista vazia só aparece quando
    as duas leituras deram certo. `IntegrationsFailed` aceita uma frase própria para isso.
16. **Os avisos de pagamento só aparecem com `CONNECTED`.** `PAUSED` e `ERROR` viram um aviso que
    manda conectar de novo. Em `NEEDS_RECONNECT` o aviso da chave já pede a mesma coisa.
17. **O sandbox é dito por extenso no cartão**, e não só na dica do selo: no celular não há como
    passar o mouse, e "nada é cobrado de verdade" é o que o lojista precisa ler.
18. **A moldura das páginas de integração vira um componente** (`integration-frame.tsx`), usado pelo
    Melhor Envio e pelo Asaas, em vez de ser copiada.
19. **CNPJ alfanumérico.** O Q1 deixou anotado que uma conta com o CNPJ novo (letras e números,
    desde julho de 2026) ficaria sem documento, e que quem mostra o documento é o Q2. O cliente Asaas
    passa a guardar letras e dígitos, e a máscara cobre os dois formatos. Como o Asaas devolve esse
    CNPJ é suposição: o que não tiver 11 dígitos, nem 14 posições terminadas em dois dígitos, segue
    sem aparecer.
20. **Nenhum cache da vitrine é derrubado ainda.** Nada do que a vitrine serve lê as formas aceitas
    até o Q4.

## O que entra

- **contracts:** `AsaasSettings` e `AsaasSettingsPayload` em `asaas.ts`; `ASAAS_SETTINGS_INVALID` em
  `integration.ts`.
- **API, `modules/integrations/asaas/`:** `asaas-settings.service.ts`,
  `asaas-settings.controller.ts`, o DTO e a resposta em `dto/`, o model `AsaasSettings` em
  `prisma/schema/integration.prisma` e a migration. O cliente HTTP e a máscara passam a aceitar o
  CNPJ alfanumérico.
- **packages/ui, `blocks/integrations/`:** `asaas-card.tsx`, `asaas-key-form.tsx` e
  `payment-settings-form.tsx`, com stories, fixtures e testes; o Asaas em `integration-providers.ts`,
  na lista e no catálogo; os tipos de visão em `lib/integrations.ts`; as fatias `integrations.asaas`
  e `integrations.payments` nos três arquivos de `locales/`.
- **web:** a página `integrations/asaas/page.tsx`; `asaas-screen.tsx`, `asaas-payments.tsx` e
  `integration-frame.tsx` em `components/integrations/`; os hooks e as chamadas em
  `services/integrations/`; `lib/asaas-form.ts` e o Asaas em `lib/integration-pages.ts`; o BFF
  `asaas/settings/route.ts`; a lista e "Nova integração" lendo as duas conexões.
- **docs:** os três mapas de superfície e este plano.

## Fora de escopo

- Cobranças, checkout, receptor do webhook, e-mails e estorno (Q3 a Q7).
- A leitura pública das formas aceitas, para a vitrine e o checkout: é do Q4.
- A lista "Formas de pagamento" que a loja já escolhe nas configurações (dinheiro, Pix e cartões
  como rótulo) fica como está.
- Marcar `NEEDS_RECONNECT`: a tela só desenha o estado.
- Playwright e2e de conectar: o CI não tem `INTEGRATIONS_SECRET_KEY`, e nenhum teste chama o Asaas.
- A frase do produto sobre pagamento (decisão 16 do briefing) muda no ticket da primeira cobrança.

## Para os próximos tickets

- **Q4: a leitura pública das formas aceitas.** O `AsaasSettingsService` só responde ao dono. O
  checkout precisa de uma leitura por loja já achada, que junte as configurações com o estado da
  conexão: sem `CONNECTED`, a loja segue como hoje. O Q4 também passa a derrubar o cache da vitrine
  em três handlers do web: o `POST` e o `DELETE` de `integrations/asaas/route.ts` e o `PUT` de
  `integrations/asaas/settings/route.ts`. Hoje nenhum deles chama `revalidate`.
- **Q4: as duas listas de formas de pagamento.** A loja já escolhe "Formas de pagamento" nas
  configurações (rótulos de dinheiro, Pix e cartões). Com `offline` ligado, é essa lista que o
  checkout oferece para o acerto na entrega. Com `offline` desligado, ela deixa de aparecer para o
  cliente. O Q4 decide como dizer isso na tela das configurações.
- **Q3 e Q4: `maxInstallments`.** A cobrança no cartão confere o número de parcelas contra o
  `maxInstallments` da loja. Com `card` desligado o número continua guardado e não vale nada.
- **Q3 e Q5: quem marca `NEEDS_RECONNECT`.** Uma chave para de valer por três caminhos: o lojista a
  desabilita ou exclui, ou ela fica 3 meses sem uso (o Asaas a desabilita) e 6 (expira). Uma loja que
  conecta e passa três meses sem vender perde a chave sem ter feito nada. O `401` aparece na próxima
  cobrança ou na reconciliação. O Asaas também avisa pelos eventos `ACCESS_TOKEN_DISABLED`,
  `ACCESS_TOKEN_DELETED` e `ACCESS_TOKEN_EXPIRED`, que o webhook do Q1 **não assina** (a lista de
  `asaas.client.ts` só tem eventos `PAYMENT_*`). Assinar agora custa pouco, porque nenhuma loja
  conectou em produção; depois, cada loja teria de reconectar. O evento identifica a chave por
  `accessToken.id`, que o bee-link não guarda, e uma conta pode ter até 10 chaves: sem esse id, um
  evento desses é um motivo para conferir a chave (uma leitura de `GET /myAccount/commercialInfo/`),
  e não uma prova de que foi a nossa.
- **Q5: quem marca `PAUSED`.** A tela já desenha o estado. Falta quem leia no Asaas que a fila do
  webhook foi interrompida.
- **Desconectar com cobranças pendentes.** Hoje desconectar apaga a chave na hora. Quando houver
  cobrança, uma pendente fica sem ter como ser conferida. O Q3 ou o Q5 decide se a tela avisa, se a
  API recusa ou se as pendentes são canceladas antes.
- **A frase do cartão fala do checkout.** "O cliente paga no checkout" só é verdade com o Q4. A
  pilha entra na `main` junta (decisão 17 do briefing).

## Acréscimos de 05/10/2026: o que mudou enquanto o ticket era feito

Nada abaixo muda a Definição de Pronto. É o que o plano não previa, ou previa de outro jeito.

1. **O campo da chave é não controlado.** O plano dizia que a chave ficaria no estado do componente
   (decisão 6). Feito assim, a chave ia parar no HTML da página: o React 19.2.3 copia o valor de um
   input controlado para o atributo `value`, e um teste de sonda mostrou a chave digitada tanto em
   `getAttribute("value")` quanto no `innerHTML`. O campo ficou sem `value`: a chave existe só dentro
   do próprio campo, e o componente guarda apenas "algo foi digitado" e "mostrar ou esconder". O envio
   lê o campo por `ref`, que é o que `docs/ai-rules/state-and-data.md` pede para campo de formulário.
   Um teste do bloco confere que o atributo não existe e que o HTML não contém o que foi digitado.
   Ao enviar, a chave volta a ficar escondida.
2. **Doze parcelas é o teto de qualquer bandeira.** A documentação do Asaas
   (`docs/criar-uma-cobranca-parcelada`, 04/08/2026) diz: "até 21 parcelas para cartões Visa e
   Mastercard; até 12 parcelas para as demais bandeiras". Com o limite de 12 do épico, a loja nunca
   oferece um parcelamento que o cartão do cliente não aceite.
3. **Uma recusa não sobrevive ao formulário em que foi dita.** A frase da recusa vem de fora do
   cartão. Depois de "Cancelar" em "Trocar a chave", ela continuava lá e recebia o campo vazio na vez
   seguinte. O cartão passou a avisar a tela (`onReplaceCancel`), que esquece a recusa. Tentar outra
   chave também apaga o aviso de um desconectar que tinha falhado antes.
4. **O `useConnectAsaas` espera a conexão ser lida de novo antes de terminar.** A invalidação é
   devolvida no `onSuccess` do hook, como o desconectar do Melhor Envio já fazia. Sem isso, o cartão
   voltaria a mostrar o campo da chave por um instante entre a resposta do `POST` e a nova leitura.
5. **Blocos e frases a mais.** `asaas-account-facts.tsx` (a conta e os avisos de pagamento) saiu do
   cartão para manter um componente por arquivo. `integrations.failedSome` é a frase da leitura que
   falhou ao lado de outra que deu certo. A frase da lista vazia passou a citar o Asaas.
6. **O e2e confere as duas `CHECK`** da tabela, além das recusas da API.
7. **A seleção das parcelas tem largura própria.** Vista no painel, ela ocupava a largura inteira do
   campo para uma escolha de poucas palavras.

### O que foi visto no navegador

Com a API na 3501 e o web na 3500, uma conta e uma loja criadas pelo fluxo normal
(`dev-203@teste.dev`, loja `loja-dev-203`), a 1280 px e a 390 px de largura:

- **Desconectada:** `$aact_prod_qualquercoisa` responde na hora com a frase do ambiente errado.
  `$aact_hmlg_qualquercoisa` foi de verdade ao sandbox do Asaas (825 ms) e voltou com a frase da chave
  inválida. Com cinco tentativas no mesmo minuto, a sexta respondeu `429`, com a frase das muitas
  tentativas. Enquanto a chave é conferida, o campo fica travado e o botão diz "Conectando…". Depois
  de cada recusa, o foco volta para o campo.
- **O segredo:** depois de dez tentativas, a chave digitada não estava na URL, em storage, em cookie
  nem no HTML da página, só no próprio campo. O log da API e o do web não tinham nenhuma ocorrência
  de `aact`.
- **Conectada, com uma linha gravada à mão em `store_integrations`:** a conta, o documento mascarado,
  o selo de sandbox e os quatro estados dos avisos (`SKIPPED`, `ERROR`, `PAUSED` e `REGISTERED`,
  trocados por `UPDATE`). O `lastError` gravado no banco não aparece na página. "Trocar a chave" abre
  o campo com o foco nele, uma chave recusada deixa a conta como estava, e "Cancelar" devolve o foco
  ao botão. As formas aceitas foram salvas (`PUT` com 200 e "Formas de pagamento salvas."), lidas de
  novo depois de recarregar e mantidas depois de desconectar e conectar de novo. Com as três
  desligadas, a frase aparece e "Salvar" não manda nenhum `PUT`. "Desconectar" abre a confirmação com
  o foco em "Manter conectado", e Enter mantém a conexão.
- **Precisa reconectar** (`UPDATE` no status): o aviso, a conta, o campo e "Conectar de novo", sem o
  formulário das formas. Desconectar a partir desse estado também funciona.
- **Lista e "Nova integração":** a linha do Asaas com a conta e o selo; a lista vazia; "Conectar
  Asaas" leva à página sem recarregar o documento. Com a leitura do Asaas respondendo 500 (forjado no
  navegador), a lista mostrou só o aviso de falha, sem dizer que a loja não tem nada conectado, e
  "Tentar de novo" trouxe a lista.
- **Storybook:** o build passa, com 16 stories do Asaas.

### O que não deu para exercitar

- **Conectar de verdade.** Não há chave que o Asaas aceite neste ambiente. A passagem de
  "desconectada" para "conectada" sem recarregar foi vista com a resposta do `POST` forjada no
  navegador e a linha gravada à mão: o aviso "Asaas conectado", o cartão trocado, as formas aceitas e
  o foco em "Trocar a chave" apareceram, e a leitura seguinte foi a da API de verdade. Trocar a chave
  com sucesso só foi coberto por teste.
- **O webhook cadastrado de verdade** (`REGISTERED` vindo do Asaas) e a fila pausada.
- **A lista com as duas integrações ao mesmo tempo:** neste ambiente o Melhor Envio não está
  configurado. Ficou nos testes e na story.
- **Gerenciadores de senha.** Os atributos estão no campo; nenhum gerenciador foi instalado para ver
  se ele deixa mesmo de oferecer o salvamento.

### Para os próximos tickets (acréscimo)

- **Q4: as frases do formulário descrevem o checkout que ainda não existe.** "QR Code ou Pix copia e
  cola, sem sair da loja" e "a página segura do Asaas, que abre em outra aba" são as decisões 5 e 6 do
  briefing. Se o Q4 mudar o comportamento, as frases estão em `integrations.payments`, em
  `packages/ui/src/locales/`.
- **Q3 e Q4: o 12 está em dois lugares.** `INSTALLMENTS_MAX`, no DTO da API, e
  `PAYMENT_INSTALLMENTS_MAX`, em `packages/ui/src/lib/integrations.ts`. O contrato só leva tipos.
