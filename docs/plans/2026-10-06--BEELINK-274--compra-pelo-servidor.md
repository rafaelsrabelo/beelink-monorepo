# BEELINK-274 (X7) — a compra é enviada à Meta pelo servidor (API de Conversões)

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre a primeira metade do X8 ([BEELINK-275](2026-10-06--BEELINK-275--origem-do-pedido.md), PR #228). A pilha fica `main` → X1 → X2 → X3 → X4 → X5 → X6 → X8 (captura) → **X7**, e é mesclada junta. O que este ticket espelha está no X6 ([BEELINK-273](2026-10-06--BEELINK-273--pixel-evento-de-compra.md), "Para o X7"); o que ele lê, no X8 ("Para o X7"); onde o token mora, no X2 ([BEELINK-269](2026-10-06--BEELINK-269--pixel-da-meta-id.md), decisão 2).

## O problema

A compra só chega à Meta se o navegador do cliente estiver na página do pedido, com o script carregado e sem bloqueador. Um Pix pago com a aba fechada, ou um navegador que bloqueia `connect.facebook.net`, é uma venda que o anúncio nunca fica sabendo. Este ticket envia a mesma compra pelo servidor, com o token que o lojista gera na Meta.

**Nada daqui foi enviado à Meta de verdade.** Não há pixel nem token reais; todo teste usa uma Meta de mentira no lugar do cliente HTTP.

## Definição de Pronto

1. O lojista salva o token de acesso da API de Conversões; ele é selado no cofre das integrações (`StoreIntegration.secretSealed`, `INTEGRATIONS_SECRET_KEY`) e nunca volta ao painel: a leitura diz só se há token, se a Meta o recusou e se esta implantação consegue guardá-lo.
2. Sem `INTEGRATIONS_SECRET_KEY` o ID do pixel continua salvando; o token é recusado com `INTEGRATION_UNAVAILABLE` e a tela diz que não está disponível aqui.
3. Trocar o ID do pixel apaga o token; remover o pixel apaga a linha inteira; o token pode ser removido sozinho.
4. Um pedido feito pelo cliente, com aceite gravado (`order_marketing_consents`), passa a **dever** um `Purchase`: na criação, se é `OFFLINE` ou `ONLINE` com total fechado em zero; quando a cobrança vira paga (`applyCharge`), se é `ONLINE`. A dívida é uma linha de `order_meta_purchases`, única por pedido, escrita na mesma transação do fato.
5. Nunca é devido: pedido sem aceite gravado; pedido registrado pelo lojista; cancelamento; estorno.
6. O evento enviado é o do navegador (X6): `event_name: "Purchase"`, `event_id: "purchase-<Order.id>"`, e `value`, `currency`, `content_ids`, `content_type`, `contents`, `num_items` pela mesma conta. Um arquivo de casos compartilhado é lido pelos testes dos dois lados.
7. `user_data` leva o e-mail e o telefone do comprador em SHA-256, normalizados como a Meta manda, e — só o que o pedido gravou — `fbc` (montado do `fbclid` desta loja), `fbp` e o agente do navegador. Nada de IP, nome, endereço ou CPF.
8. A Meta nunca é chamada dentro da requisição que cria o pedido nem da que confirma o pagamento. Uma rotina em segundo plano entrega: uma requisição por evento, linha reivindicada antes do envio (várias réplicas são seguras), tentativa de novo com espera crescente numa falha passageira.
9. A rotina desiste quando o evento passa de 7 dias ou quando a Meta recusa o evento em definitivo, e grava o motivo. Cada pedido guarda se foi enviado, quando, e o último erro, sem o token.
10. Um token (ou um pixel) que a Meta recusa para de ser usado: a loja fica marcada, a tela diz que precisa de atenção, os eventos da loja esperam, e voltam a sair quando um token novo é salvo.
11. Se o cliente apagou a conta antes do envio, nada é enviado.
12. A tela do pixel ganha o campo do token (nunca preenchido), os quatro estados, o passo a passo de onde gerá-lo, a remoção, e "Enviar evento de teste" com o código de teste do Gerenciador de Eventos; a resposta da Meta é dita em palavras simples. A rota do teste tem limite de taxa.
13. O token nunca é registrado em log, nem devolvido, nem aparece numa URL.
14. As formas que atravessam a rede estão em `packages/contracts`; BFF, hooks, esqueleto, textos em pt-BR e inglês.
15. A política de privacidade diz o que o servidor compartilha e o que o pedido guarda, num commit só dela.
16. `docs/repo/deploy.md` ganha "Meta Pixel"; `docs/product/README.md` e os mapas de superfície dizem o que entrou; `pnpm ci-check` verde.

## O que foi lido na Meta (06/10), e o que ficou inferido

*Lido:*

- **Endereço:** `POST https://graph.facebook.com/{versão}/{ID do pixel}/events`. O exemplo da página usa `v25.0`; o changelog da Graph API lista a `v26.0` (29/07/2026) como a mais nova e a `v25.0` válida até 29/07/2028.
- **Token:** `access_token`, na query ou no corpo. Tokens gerados desde a v12 valem para todas as versões.
- **Corpo:** `data` (lista de até 1.000 eventos) e, opcional, `test_event_code`. "Se qualquer evento do lote for inválido, o lote inteiro é recusado."
- **Campos obrigatórios:** `event_name`, `event_time` (segundos Unix), `user_data` (ao menos um parâmetro) e `action_source`. Para `website`: `event_source_url`, e `client_user_agent` descrito como obrigatório.
- **`event_time`:** mais de 7 dias no passado devolve erro para a requisição inteira.
- **`em`:** sem espaços nas pontas, minúsculas, SHA-256 (exemplo da página: `John_Smith@gmail.com` → `62a14e44…f62f`). **`ph`:** só dígitos, sem zeros à esquerda, com código do país, SHA-256 (`(650)555-1212` com o país → `16505551212` → `e323ec62…3176`). **Não cifrados:** `fbc`, `fbp`, `client_ip_address`, `client_user_agent`.
- **Evento de teste: não é descartado.** A página diz que eventos com `test_event_code` "fluem para o Gerenciador de Eventos e são usados para segmentação e mensuração de anúncios". O código fica em Gerenciador de Eventos → Fontes de dados → o pixel → Testar eventos.
- **Onde o token é gerado:** Gerenciador de Eventos → aba Configurações → seção API de Conversões → "Gerar token de acesso" (em "configurar manualmente"); o link só aparece a quem tem privilégio de desenvolvedor no negócio. Não pede revisão de app.
- **Limite de taxa:** nenhum próprio; as chamadas contam como chamadas da API de Marketing.
- **Erros** (guia de erros da Graph API e referência de erros da API de Marketing): o corpo é `{ error: { message, type, code, error_subcode, fbtrace_id } }`. Códigos 1, 2, 4, 17, 341 e 368: "espere e tente de novo". 190: token inválido ou vencido; 102: sessão inválida. 10 e 200 a 299: permissão. 100 com subcódigo 33: "Unsupported post request" — o objeto não existe ou o token não tem acesso a ele. A Meta avisa que só os códigos são contrato; as frases mudam.

*Inferido, não confirmado:*

- A forma da resposta de sucesso (`{ events_received, messages, fbtrace_id }`): nenhuma página lida a mostra. O código trata qualquer 2xx como aceito, salvo `events_received: 0`.
- Corpo em JSON (`content-type: application/json`) com `access_token` dentro: o exemplo da Meta é um formulário; JSON é o que as bibliotecas dela enviam, do que conheço.
- Que um pixel inexistente responde 100/33, e não outro código: a referência descreve o 100/33 para outro objeto.
- O que a Meta responde a um evento sem `client_user_agent`, e a um evento de teste cujo único identificador é um `external_id`.
- O calendário de fim de vida das versões para a API de Marketing, que costuma ser mais curto que o da Graph API.
- Os nomes dos menus em português.

## Decisões

### O token

1. **Selado em `secretSealed` da linha `META_PIXEL`**, como JSON `{ accessToken }`, com `seal`/`open` de `secret-vault.ts`, ligado à loja e ao provedor. Só `integrations/meta-pixel/` o abre: o portão novo `api/meta-secret-in-meta-pixel` proíbe nomear o provedor `META_PIXEL` em outra pasta de `integrations/`, como o do Asaas.
2. **Rotas próprias, ao lado das do ID:** `POST …/meta-pixel/token` (salva ou troca, responde a conexão) e `DELETE …/meta-pixel/token` (204). O `POST …/meta-pixel` do X2 continua salvando só o ID, e passa a apagar o token **quando o ID muda** (salvar o mesmo ID de novo não apaga).
3. **Nada é perguntado à Meta ao salvar o token**, como o X2 decidiu para o ID. O jeito de conferir é o evento de teste, que o lojista vê chegar. Por isso salvar não tem limite de taxa próprio; o teste tem.
4. **Forma aceita:** sem espaços, caracteres ASCII visíveis, de 20 a 1.000. A Meta não documenta a forma do token; a regra só recusa o que claramente não é um (uma frase, um ID de pixel). Recusa: `META_PIXEL_TOKEN_INVALID`.
5. **A conexão ganha `conversions`:** `available` (esta implantação tem cofre), `token` (`NONE` | `SET` | `REJECTED`), `refusal` (`TOKEN_REJECTED` | `PIXEL_NOT_FOUND` | nulo) e `refusedAt`. O `status` da conexão não muda de sentido: `CONNECTED` é "há um ID salvo", e o pixel do navegador segue funcionando com o token recusado.
6. **A recusa mora em duas colunas novas de `store_integrations`,** `secretRefusal` e `secretRefusedAt`, e não em `status = NEEDS_RECONNECT`: o status é da conexão inteira, e aqui só o token parou.

### O que é devido, e quando

7. **A regra do X6, reescrita na API** (`meta-purchase-event.ts`, `purchaseCountsWhen`): `ONLINE` com algo a pagar → no pagamento; o resto → na criação. Feito pelo cliente (primeiro evento com `actor: CUSTOMER`), não cancelado.
8. **A dívida é escrita por uma função, `owePurchase(tx, pedido, momento, instante)`,** chamada em dois lugares: `OrderPlacement.place`, dentro da transação do pedido, e `applyCharge`, ao lado de `tellPaid`, na mesma condição ("acabou de ser pago"). Ela lê o pedido e só escreve se há linha de consentimento. `orderId` único + `skipDuplicates`: uma segunda escuta do Asaas não deve duas vezes.
9. **Ter token não é condição para dever.** A linha é escrita sempre que há aceite; na hora do envio, loja sem pixel ou sem token fecha a linha como `SKIPPED`, com o motivo. Custa uma linha por pedido consentido e deixa a pergunta "por que este pedido não foi à Meta?" respondida no banco. Consequência: um token salvo **depois** não envia as compras antigas (elas já fecharam em até um minuto).
10. **`event_time`** é `placedAt` ou o `paidAt` da cobrança, guardado na linha (`countedAt`).
11. **Na hora do envio a regra é conferida de novo**, como o navegador faz: pedido cancelado, ou pago e já sem dinheiro retido (estornado inteiro), fecha como `SKIPPED`. Sem linha de consentimento (conta apagada): `SKIPPED`.

### O evento

12. **`custom_data` é o do navegador**, pela mesma conta (`purchaseCustomDataOf`): `value = totalCents / 100`, `currency: "BRL"`, um item por produto com as unidades somadas e `item_price = round(Σ(lineTotalCents − discountCents) / unidades) / 100`, `content_type: "product"`, `num_items`, linhas sem produto fora.
13. **Como os dois lados ficam presos:** `packages/contracts/fixtures/meta-purchase.json` traz pedidos e o `event_id`, o momento e o `custom_data` esperados de cada um. O teste da web (`purchase.fixtures.test.ts`) passa cada pedido por `purchaseOf` + `metaEventOf`; o da API (`meta-purchase-event.spec.ts`), por `purchaseEventOf`. Mudar a conta de um lado quebra o teste dele; mudar o arquivo quebra os dois. O arquivo mora em `packages/contracts` porque os dois apps dependem do pacote: uma mudança nele roda os testes dos dois no CI. Não é código: o pacote continua só de tipos.
14. **`user_data`:** `em` e `ph` em listas de um hash; `fbc = fb.1.<clickedAt em ms>.<fbclid>` quando os dois existem; `fbp` e `client_user_agent` quando gravados. O telefone é guardado aqui só com dígitos e com o código do país (12 a 15, `normaliseWhatsapp`): tira-se o que não for dígito e os zeros à esquerda, e **nada é prefixado**. Um telefone com menos de 12 dígitos não é enviado.
15. **`event_source_url`** é o `pageUrl` gravado; se nulo, `WEB_URL/<slug>`.
16. **Sem `client_user_agent` gravado o evento vai sem ele.** A Meta o descreve como obrigatório; se recusar, a linha fecha como `GIVEN_UP` com as palavras dela. Não se inventa um agente.
17. **O token vai no corpo, nunca na URL**, para não ficar em log de proxy. As mensagens de erro guardadas passam por um corte que tira o token, se a Meta o repetir; falha de rede é descrita só pelo nome e pelo código.
18. **Versão da Graph API numa constante, `META_GRAPH_VERSION = 'v25.0'`** (`meta-conversions-http.client.ts`): é a do exemplo da documentação da API de Conversões, válida até 2028.

### A entrega

19. **`MetaPurchases` (em `integrations/meta-pixel/`) tem a forma do `AsaasEvents`:** a cada minuto, um `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED)` reivindica até 20 linhas vencidas e empurra `nextAttemptAt` dez minutos (o arrendamento); cada uma é trabalhada sozinha, uma requisição à Meta por evento. Em teste o relógio não liga: a suíte chama `flush()`.
20. **Sem disparo logo após a transação.** O relógio de um minuto basta: o navegador conta a compra por 24 h e a Meta junta os dois em 48 h. Não há chamada à Meta nem tarefa pendurada na requisição do cliente ou do webhook.
21. **Falha passageira** (rede, 10 s de silêncio, 5xx, 429, códigos 1, 2, 4, 17, 341, 368): espera 1, 2, 4, 8… minutos, com teto de 6 horas, sem limite de tentativas.
22. **Desistência:** quando o evento tem mais de 7 dias menos 10 minutos (`GIVEN_UP`, "mais velho que o limite da Meta"), ou quando a Meta recusa o evento por outro motivo (`GIVEN_UP`, com o código e a frase dela, até 300 caracteres).
23. **Token ou pixel recusado** (190, 102 → `TOKEN_REJECTED`; 10, 200–299, 100/33, HTTP 404 → `PIXEL_NOT_FOUND`): a loja é marcada (só se o token ainda é o que foi usado), a linha volta a esperar sem gastar tentativa, uma hora de cada vez, e nenhuma outra linha da loja chama a Meta enquanto a marca estiver lá. Salvar um token novo limpa a marca e vence as linhas à espera na hora. O limite de 7 dias continua valendo para elas.
24. **Risco aceito, a decidir pelo dono:** a Meta junta navegador e servidor em 48 h. Um evento do servidor que sai depois disso (token recusado e trocado três dias depois, Meta fora do ar por dias) e cujo navegador **também** contou vira uma segunda compra. O ticket pede o limite de 7 dias; baixá-lo para 48 h é trocar `META_EVENT_MAX_AGE_MS`.

### O evento de teste

25. **Não é um `Purchase`.** A Meta não descarta eventos de teste: um `Purchase` de mentira com `test_event_code` entraria na mensuração do lojista. O teste envia um evento **personalizado**, `BeeLinkTestEvent`, sem valor, com `event_source_url` = o endereço da loja e, em `user_data`, um `external_id` (SHA-256 de `bee-link-test:<id da loja>`) e um `client_user_agent` fixo (`bee-link/test-event`). Nenhum dado de pessoa. Um evento personalizado não alimenta nenhuma otimização de compra; continua aparecendo na lista de eventos do pixel, e a tela diz isso.
26. **`POST …/meta-pixel/test-event`**, corpo `{ testEventCode }` (letras, dígitos, `_` e `-`, 3 a 40; recusa `META_PIXEL_TEST_CODE_INVALID`), com o limite de taxa das rotas vizinhas (`AUTH_RATE_LIMIT_*`): cada chamada apresenta uma credencial a um terceiro a partir do endereço da Beelink. Responde 200 com `{ outcome, detail }`: `ACCEPTED`, `TOKEN_REJECTED`, `PIXEL_NOT_FOUND`, `EVENT_REFUSED` (com as palavras da Meta em `detail`) ou `UNREACHABLE`. Aqui a chamada à Meta é dentro da requisição, de propósito: é o lojista esperando a resposta.
27. **O teste também ensina a rotina:** token ou pixel recusado no teste marca a loja; um teste aceito limpa a marca.

### O painel

28. **Um bloco novo, `MetaConversionsCard`,** embaixo do cartão do ID e só com um ID salvo: o estado do token, o campo (tipo senha, nunca preenchido, `autocomplete="off"`), remover (com confirmação), o passo a passo, e o evento de teste (só com token). Sem cofre na implantação, o cartão diz que o envio pelo servidor não está disponível aqui e não mostra campo.
29. **A frase de "Bom saber" sobre a compra não muda** — o que conta como compra é o mesmo. O cartão novo diz o que o token acrescenta: a compra chega mesmo com a página fechada ou bloqueada, só de quem aceitou os cookies.
30. **O "Enviado à Meta" na página do pedido fica de fora.** Pediria mexer no contrato do pedido do lojista e no mapper de pedidos; o fato fica consultável em `order_meta_purchases`.

### O texto legal

31. **A versão continua `2026-10-06`.** É a do X4, que ainda não foi publicada (a pilha é mesclada junta); o X6 e o X8 acrescentaram linhas nela pelo mesmo motivo. Nenhuma conta aceitou `2026-10-06` em produção. **Se a pilha for ao ar em outro dia, ou se o X4 for publicado antes deste PR, a data tem de andar** — é uma linha no contrato, e a API e a web param de compilar até dizerem o mesmo dia.
32. **O que entra,** num commit só: na seção "Pixel da Meta nas lojas", que o servidor do bee-link também envia a compra à conta da Meta da loja, com o e-mail e o telefone transformados em código (SHA-256), só de quem aceitou, mesmo que o navegador não tenha enviado nada; e que o pedido guarda, com o aceite, o identificador do clique, o `_fbp`, o agente do navegador e o endereço da página, e por quanto tempo valem (até a conta ser apagada). Nenhuma base legal nova: o texto continua apoiado no aceite do aviso de cookies, que a política já tem. **É rascunho factual para o dono e um advogado.**

## Fora do escopo

- O relatório "vendas por origem"; o catálogo; mudar o que o X5 e o X6 enviam do navegador.
- IP do comprador (não é gravado), `external_id` do cliente, nome, endereço.
- Um evento que desfaça uma compra cancelada ou estornada depois de enviada.
- "Enviado à Meta" na página do pedido do painel (decisão 30).
- Conferir o token com a Meta ao salvar (decisão 3).
- e2e de Playwright novo: como do X3 ao X8, a suíte da web não cria loja com pixel.

## Lacunas conhecidas

- Um pedido `ONLINE` criado com frete a combinar e cujo total fecha em **zero** depois não tem cobrança nem passa por `applyCharge`: o navegador o contaria (regra `PLACED`, até 24 h do pedido) e o servidor não.
- Nada foi tentado do servidor de produção, cuja saída é um IP de datacenter na França.

## Fontes

- Meta, "Using the API" (endereço, corpo, 7 dias, evento de teste, limites): https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
- Meta, "Server Event Parameters": https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
- Meta, "Customer Information Parameters": https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
- Meta, "Get Started" (onde gerar o token): https://developers.facebook.com/docs/marketing-api/conversions-api/get-started
- Meta, "Handling Errors" (Graph API): https://developers.facebook.com/docs/graph-api/guides/error-handling
- Meta, "Error Reference" (API de Marketing): https://developers.facebook.com/docs/marketing-api/error-reference
- Meta, changelog da Graph API (versões): https://developers.facebook.com/docs/graph-api/changelog

## 06/10, depois do código — o que mudou ao escrever

- **O texto do cartão novo mora em `integrations.metaConversions`, fora de `integrations.metaPixel`.** O teste do X3/X5 que vigia a tela exige que, sob `metaPixel`, **uma só** frase fale de envio (a de "Bom saber"). Em vez de afrouxá-lo, as frases do token ganharam chave e regra próprias (`meta-pixel-screen.test.tsx`): toda frase inteira que fale de compras chegando à Meta diz de quem — de quem aceita os cookies —, e o texto do teste diz que ele não é uma compra nem leva dados de ninguém. O teste antigo não foi tocado.
- **O formulário de troca do token fica aberto numa recusa.** O cartão nunca vê o token e não tem como distinguir um salvo do seguinte; a tela lhe dá uma `key` nova a cada token salvo (`savedCount` do hook), e é isso que fecha a troca.
- **A mutação que leva o token é descartada na hora** (`gcTime: 0` + `reset`), como a da chave do Asaas; o campo é não controlado, para o token não ir para nenhum atributo da página.
- **`purchaseCountsWhen` na API devolve só `PLACED` ou `PAID`** (o `NEVER` do navegador é a linha de inversão da decisão, e não um caso que exista hoje).
- **Um evento sem ninguém para identificar** (sem e-mail nem telefone) fecha como `SKIPPED` em vez de ir e ser recusado. Na prática é a conta apagada, que já fecha antes por falta de consentimento.
- **Uma falha que não é da Meta** (um erro nosso antes do envio) é tratada como passageira, não como desistência.
- **A política ganhou mais do que a seção do pixel.** Três frases tinham deixado de ser verdade e foram corrigidas: a resposta ao aviso "não fica no banco de dados" (fica, junto de um pedido feito depois do aceite); "o bee-link guarda a sua resposta só no seu navegador"; e "se você retira o aceite, aquela loja deixa de enviar dados à Meta" (o servidor ainda informa um pedido cobrado no site feito **antes** da retirada e pago depois — vale o aceite da hora do pedido, como o X6 e o X8 escreveram). A lista de dados do cliente passou a dizer que o pedido guarda a campanha de chegada e, com aceite, os identificadores do navegador (a pendência que o X8 deixou). **Para o dono e um advogado:** o caso do aceite retirado entre o pedido e o pagamento é o ponto mais delicado; se a resposta for "não pode", a saída é o servidor não enviar pedidos `ONLINE` cujo pagamento chega depois de N horas, ou a loja perguntar de novo — não há como o servidor saber da retirada, que mora no navegador.
- **`docs/product/README.md`** dizia "a loja não envia nome, e-mail ou telefone com um evento": passou a separar o navegador (nada disso) do servidor (e-mail e telefone em código).
- **Nenhuma variável de ambiente nova**, e nenhum ponto de troca do endereço da Meta em produção: o único jeito de pôr outra coisa no lugar do cliente HTTP é a injeção de dependência dos testes.
- **Sem redação nova nos logs.** O token só viaja em corpo de requisição (do navegador ao BFF, do BFF à API, da API à Meta), e nem a API nem a web registram corpos; não há cabeçalho novo para esconder, como o `asaas-access-token`.

## Cobertura da Definição de Pronto

| # | Onde está provado |
|---|---|
| 1 | `meta-pixel.service.spec.ts` "seals the token in the row, answers only that one is set, and never the token"; `test/meta-conversions.e2e-spec.ts` "is sealed, said only as set, and never answered back" |
| 2 | `test/meta-pixel-without-vault-key.e2e-spec.ts`; `meta-conversions-card.test.tsx` "offers no field where the deployment cannot keep a token" |
| 3 | e2e "goes when another pixel ID is saved, stays when the same one is, and goes alone when removed" |
| 4 | `meta-purchase-outbox.spec.ts` (owePurchase); e2e "owes an order settled with the shop at its placement…", "owes an order charged online only when its charge is paid…" |
| 5 | e2e "owes nothing with no consent kept", "…for a sale the shopkeeper registered", "owes nothing on a cancellation…" |
| 6 | `packages/contracts/fixtures/meta-purchase.json`, lido por `meta-purchase-event.spec.ts` (API) e `purchase.fixtures.test.ts` (web) |
| 7 | `meta-purchase-event.spec.ts` (vetores da Meta, o evento completo e o mínimo, "names nothing else of the person"); e2e, o corpo inteiro da requisição |
| 8 | e2e: `meta.requests` vazio logo depois do pedido e do webhook; "tells it once"; "is tried again, later each time" |
| 9 | e2e "is given up once the event is past the seven days…", "is given up when Meta refuses the event itself…"; `meta-purchase-outbox.spec.ts` (prazos) |
| 10 | e2e "stops the shop when Meta refuses the token / the pixel under it, says so on the panel, and resumes with another token" |
| 11 | e2e "sends nothing once the buyer deleted their account" |
| 12 | `meta-conversions-card.test.tsx`, `meta-pixel-screen.test.tsx` (bloco "BEELINK-274"), e2e "the test event" |
| 13 | `meta-conversions-http.client.spec.ts` (token no corpo, nunca no endereço; cortado das palavras da Meta; falha de rede só por nome e código); e2e (`payload` nunca contém o token) |
| 14 | `token/route.test.ts`, `test-event/route.test.ts`, `meta-pixel-hooks.test.tsx`, `meta-pixel-form.test.ts` |
| 15 | `locales/legal/pt-BR.test.ts`, "on the purchase told from the server" |
| 16 | `docs/repo/deploy.md` § Meta Pixel; `docs/product/README.md`; os três mapas de superfície |

O limite de taxa do evento de teste está na rota (`@RouteConfig({ rateLimit })`, como as do Asaas) e **não tem teste próprio**: a suíte roda com `AUTH_RATE_LIMIT_MAX=1000`.

## 06/10 — o que foi visto na tela

A tela do painel foi aberta uma vez, de verdade: `next dev` na 3800 e a API na 3801 sobre o banco `harness_meta_pixel`, **com a Meta de mentira dos testes no lugar do cliente HTTP** (a API foi subida pelo arranjo da suíte e2e, que troca o provedor; nenhum ponto de troca existe em produção) e toda requisição a `facebook.com`/`connect.facebook.net` abortada no navegador. Nada chegou à Meta. Uma conta e uma loja novas (`loja-x7-…`, pixel `123456789012345`, que não é de ninguém) foram criadas pela API; um Chromium sem janela percorreu a página, e as capturas foram olhadas. Os servidores foram parados depois.

- **Sem token:** o cartão "Compras pelo servidor" sob o do pixel, selo "Sem token", o campo do tipo senha e vazio, o passo a passo, e nenhum evento de teste.
- **Uma frase colada no campo:** "Isso não parece um token de acesso…" sob o campo, nada enviado.
- **Um token colado e salvo:** o aviso "Token salvo. Faça um evento de teste para conferir." no topo, selo verde "Token salvo", "Trocar o token" e "Remover o token"; **o token não aparece em nenhum lugar do HTML da página**.
- **Evento de teste**, com `TEST12345`: aceito → "A Meta aceitou o evento…"; recusado → a frase e, embaixo, "Resposta da Meta: Meta refused (400, code 100): Invalid parameter"; Meta fora do ar → "Não foi possível falar com a Meta agora…"; token recusado → o selo vira "Precisa de atenção", a faixa vermelha diz o que parou, "Trocar o token" fica em destaque, e o cartão do pixel continua "Conectado".
- **Trocar o token** abre o campo vazio; salvar volta ao selo verde. **Remover**, depois da confirmação, volta a "Sem token" com o pixel conectado.
- Em 390 px de largura nada transborda.
- A Meta de mentira recebeu os quatro eventos de teste, todos `BeeLinkTestEvent` com o código, nenhum `Purchase`.

Não visto: o tema escuro; o cartão "Indisponível" numa implantação sem cofre (só em teste de componente e no e2e sem chave); uma compra de verdade percorrendo a vitrine até a rotina (só no e2e); um token, um pixel e o Gerenciador de Eventos reais. O console acusou só o soquete de tempo real, recusado por CORS neste arranjo (a API de teste aceita a origem `:3000`).
