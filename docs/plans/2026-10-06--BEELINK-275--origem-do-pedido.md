# BEELINK-275 (X8) — o pedido guarda de onde o cliente veio (primeira metade: a captura e o painel)

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X6 ([BEELINK-273](2026-10-06--BEELINK-273--pixel-evento-de-compra.md), PR #227). A pilha fica `main` → X1 → X2 → X3 → X4 → X5 → X6 → **X8 (captura)** → X7 → X8 (relatório), na ordem que o X1 ([BEELINK-268](2026-10-06--BEELINK-268--pixel-em-dominio-compartilhado.md)) propôs.

## Este PR é a primeira metade do ticket

O ticket tem três partes: (1) guardar `utm_source`, `utm_medium`, `utm_campaign` e `fbclid` da chegada do visitante e gravá-los no pedido; (2) mostrar a origem na página do pedido, no painel; (3) um relatório "vendas por origem" ao lado dos relatórios de vendas.

**Este PR entrega as partes 1 e 2.** A parte 3 depende do Épico P (relatórios de vendas), que ainda não existe, e vem num PR próprio. Esta metade passou à frente do X7 porque o X7 (compra enviada à Meta pelo servidor) lê o que ela grava.

## Definição de Pronto

1. Quem chega a uma loja com `utm_*` e/ou `fbclid` no endereço tem a origem guardada num cookie nosso com `Path=/<slug>`. Uma origem capturada na loja A nunca é gravada num pedido da loja B.
2. Uma visita sem parâmetros não apaga a origem guardada; uma chegada com outros parâmetros de campanha a substitui; a origem vale 30 dias contados da chegada.
3. Todo valor vindo do endereço é limpo e limitado antes de ser guardado, na web e de novo na API, e é desenhado como texto, nunca como HTML.
4. As UTMs são guardadas com ou sem pixel e com ou sem resposta ao aviso de cookies. O `fbclid` só é guardado enquanto `marketingAllowed` for verdade nesta loja: um sim dado na mesma carga de página em que ele chegou passa a guardá-lo; um não, ou um sim retirado, o remove; numa loja sem pixel ele nunca é guardado. Com o `fbclid` fica o instante da chegada.
5. O pedido do carrinho leva a origem lida **no servidor**, do cookie, pelo handler `app/[slug]/api/orders`. O que o corpo enviado pela página disser nesses campos é descartado.
6. O mesmo handler leva o fato do consentimento: se o aceite de marketing estava de pé nesta loja na hora do pedido e, só nesse caso, o `fbclid` com o instante do clique, o `_fbp`, o agente do navegador e o endereço da página. Sem aceite, nada disso é enviado nem gravado.
7. A API valida e limita cada campo, e grava a origem e os fatos do consentimento com o pedido, na mesma transação. Nada aqui chama a Meta.
8. Um pedido registrado pelo lojista no painel não tem origem nem consentimento.
9. A página do pedido no painel mostra uma linha "Origem", em pt-BR e em inglês; diz que o clique veio de um anúncio da Meta quando o `fbclid` foi guardado, sem mostrar o identificador. `_fbp`, agente do navegador e `fbclid` nunca aparecem no painel.
10. O pedido que o **lojista** lê ganha a origem no contrato; o que o **cliente** lê não muda.
11. Está decidido e escrito o que a exportação dos dados do cliente e a exclusão da conta fazem com o que foi gravado, e há teste.
12. A política de privacidade lista o cookie novo, num commit só dela.
13. Este plano diz o que o X7 lê e quando existe, e o que o relatório vai precisar.
14. `pnpm ci-check` verde.

## Decisões

### Onde a origem fica no navegador

1. **Cookie `bl_origin`, nosso, `Path=/<slug>`, não `httpOnly`, `SameSite=Lax`, `Secure` em HTTPS** — as escolhas do `bl_cart`, do `bl_consent` e do `bl_purchases`, pelos mesmos motivos. O caminho é o que faz a origem ser de uma loja só: o navegador não envia o cookie da loja A a nenhuma página nem handler da loja B. `localStorage` é proibido (`web/no-web-storage`).
2. **Um cookie só**, com as UTMs e, quando o aceite permite, o `fbclid`. Dois cookies dariam duas datas e dois jeitos de ficarem fora de sincronia. O valor é um JSON curto (`s`, `m`, `c`, `n`, `t`, `f`, `a`), escrito com `encodeURIComponent`.
3. **A captura roda no navegador**, num componente cliente montado em `app/[slug]/layout.tsx` (`StorefrontOrigin`), ao lado do `StorefrontTracking` e dentro do `StorefrontConsentGate`. Motivos:
   - o layout da loja é montado numa carga inteira **e** numa navegação de cliente que entra na loja, e o efeito lê `window.location.search` nos dois casos (a chave do efeito é o `slug`);
   - a regra do `fbclid` depende do aceite, que muda no navegador sem recarregar (`useConsent`); no servidor, um sim dado depois da chegada não teria mais o `fbclid` para guardar;
   - o `proxy.ts` não serve: a lista dele é uma lista de permissão, e caminho de loja só passa por ele quando há sessão de cliente a renovar (regra 3 do `apps/web/AGENTS.md`). Colocar toda a vitrine no proxy para ler a query é o risco que essa regra descreve.
   - *Custo aceito:* quem chega sem JavaScript não tem a origem guardada; o carrinho também não funciona sem JavaScript.
4. **Só a chegada conta**, não cada navegação: o efeito roda quando o layout da loja é montado (ou o `slug` muda). Um link interno da loja com `utm_*` (um banner, por exemplo) não substitui a origem do anúncio que trouxe o visitante.

### O que é "primeira visita"

5. **Vale a última chegada com campanha, por 30 dias.** Uma visita sem parâmetros nunca apaga nem renova. Uma chegada com parâmetros **diferentes** dos guardados substitui a origem inteira e reinicia os 30 dias; uma chegada com os mesmos parâmetros não muda nada (recarregar a página de chegada não renova o prazo).
   - *Por que substituir:* o lojista quer saber qual campanha trouxe a venda. Quem viu a campanha A há 20 dias e clicou na B ontem comprou pela B. É o modelo "último clique não direto", o padrão do Google Analytics e do Gerenciador de Anúncios.
   - *Por que 30 dias:* é a janela de atribuição mais usada em comércio eletrônico; a do clique na Meta é de 7 dias por padrão e a do Google Analytics chega a 6 meses. 30 cobre a compra pensada sem atribuir a uma campanha de meses atrás. O prazo é contado da chegada: o `Max-Age` do cookie é o que resta, e o servidor confere a data de novo ao ler.
6. **"Tem parâmetros" é ter `utm_source`, `utm_medium` ou `utm_campaign`, ou um `fbclid` que possa ser guardado.** `utm_content` e `utm_term` são guardados junto quando vêm, mas sozinhos não fazem uma chegada. Um endereço só com `fbclid`, sem aceite, não muda nada na hora; o `fbclid` fica na memória da página (item 8).

### Limpeza do que vem do endereço

7. São textos escritos por qualquer pessoa num link. Em `lib/origin-cookie.ts`:
   - **UTMs:** caracteres de controle e de formatação invisível (`\p{Cc}`, `\p{Cf}`) removidos, espaços em sequência reduzidos a um, pontas aparadas, **cortadas em 80 caracteres**; vazio vira ausente. `utm_source` e `utm_medium` vão para minúsculas (são vocabulário: "Facebook" e "facebook" são a mesma origem); `utm_campaign`, `utm_content` e `utm_term` ficam como foram escritos.
   - **`fbclid`:** só `[A-Za-z0-9_.-]`, até 500 caracteres. Um valor fora disso é **descartado**, não cortado: um identificador cortado é outro identificador.
   - **Tamanho do cookie:** se o valor escrito passar de 3 000 caracteres (UTMs longas em escrita não latina), `utm_content` e `utm_term` saem.
   - O cookie é do visitante para editar: ao ler, tudo passa pela mesma limpeza; data no futuro ou mais velha que 30 dias é "sem origem".
   - No painel os valores são nós de texto do React, com quebra de palavra; nenhum `dangerouslySetInnerHTML`.

### O `fbclid` e o aceite

8. **Regra, num lugar (`originAfter` em `lib/origin-cookie.ts`), usada pelo componente:**
   - com `marketingAllowed(loja, escolha)` verdadeiro na chegada, o `fbclid` entra na origem;
   - sem aceite, o `fbclid` da chegada fica **só na memória** do componente (o layout da loja), nunca no cookie; um **sim** dado antes de uma nova carga de página grava a chegada inteira, com o instante em que ela aconteceu; um **não** esvazia a memória;
   - quando o aceite deixa de valer (recusa, retirada, loja que removeu o pixel), o `fbclid` sai do cookie e as UTMs ficam, com a data e o prazo que tinham; uma origem que era só `fbclid` deixa de existir;
   - numa loja sem pixel não há `ConsentProvider`, a escolha lida é "recusou", e o `fbclid` nunca é guardado.
9. **O instante do clique é o da origem** (`a`, em ms): o `fbclid` só entra junto de uma chegada, então os dois têm a mesma data. É o que o X7 usa em `fb.1.<ms>.<fbclid>`.
10. **O servidor não confia no cookie para o `fbclid`:** o handler do pedido só o repassa se `marketingAllowed` for verdade para a loja lida por ele e o `bl_consent` recebido naquela requisição.

### O caminho até o pedido

11. **O handler `app/[slug]/api/orders` monta os dois campos**, depois de apagar o que o corpo da página trouxer com esses nomes:
    - `origin`: as UTMs e a data da chegada, do `bl_origin`. Sempre que houver.
    - `marketingConsent`: presente **só** quando o aceite está de pé (`bl_consent` = `granted` **e** a loja tem pixel — a loja é lida por `shopAt`, e só quando o cookie diz `granted`; se a leitura falha, vale "sem aceite"). Leva `fbclid` e `clickedAt` (do `bl_origin`), `fbp` (o cookie `_fbp`, só se tiver a forma `fb.<n>.<ms>.<n>`), `userAgent` (cabeçalho, até 512) e `pageUrl`.
12. **`pageUrl` vem do cabeçalho `Referer`**, não do corpo: tem de ser da mesma origem que o site (`publicOriginOf`) e de um caminho sob `/<slug>`; guarda-se origem + caminho, **sem a query** (a query do carrinho pode levar cupom e outros parâmetros que a Meta não precisa receber). Fora disso, fica ausente.
13. **O IP não é repassado nem gravado.** A política diz que o bee-link não grava IP no banco. Se o X7 quiser `client_ip_address`, decide lá, com o texto legal dele.
14. **A API é pública para quem tem um token de cliente**, então os campos podem ser forjados por quem chama a API direto. Vale o que o X4 já disse: nada de dinheiro depende deles; o pior caso é um cliente atribuir o próprio pedido a uma campanha inventada.

### API e banco

15. **UTMs em colunas do próprio `orders`:** `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` (`VARCHAR(80)`, nulas), `originAt` (quando o visitante chegou) e `originMetaAd` (booleano: o clique veio de um anúncio da Meta, isto é, um `fbclid` foi guardado com aceite).
    - *Por que colunas, e não tabela:* o relatório soma `totalCents` e filtra por `status` e `placedAt`, que estão em `orders`; com as UTMs na mesma linha, "vendas por origem" é um `GROUP BY` sem junção. A origem é um fato do pedido, escrito uma vez e nunca editado, como o cupom fotografado.
    - *Índice:* `(storeId, utmSource, utmMedium, utmCampaign)`. O relatório de um período usa o `(storeId, placedAt)` que já existe; o índice novo serve o agrupamento sem período e a pergunta "quais pedidos vieram desta campanha".
    - `originMetaAd` fica em `orders` para o relatório e o painel não precisarem tocar na tabela dos identificadores.
16. **Os fatos do consentimento numa tabela à parte, `order_marketing_consents`**, uma linha por pedido, com o `orderId` como chave: `fbclid` (`VARCHAR(500)`), `clickedAt`, `fbp` (`VARCHAR(100)`), `userAgent` (`VARCHAR(512)`), `pageUrl` (`VARCHAR(500)`), `createdAt`. **A linha existir é o fato "o aceite estava de pé quando o pedido foi feito".** `fbclid` e `clickedAt` vêm juntos ou não vêm (um `CHECK`).
    - *Por que à parte:* são identificadores do navegador de uma pessoa, não dado de venda. Fora de `orders`, nenhuma leitura de pedido os carrega sem pedir (o `include` do painel e o do cliente não mudam), e apagá-los é apagar uma linha.
    - *Uma consulta:* `order.findUnique({ include: { marketingConsent: true } })` — é o que o X7 faz em `applyCharge` e na criação do pedido.
17. **Validação no DTO: valor ruim é limpo ou descartado, nunca recusa o pedido.** Uma etiqueta de campanha não pode custar uma venda. As UTMs passam pela mesma limpeza da web (corte em 80); `fbclid`, `fbp`, datas e `pageUrl` fora da forma são descartados. O que continua sendo recusado com 400 é o que já era: um campo desconhecido (`forbidNonWhitelisted`) ou `origin`/`marketingConsent` que não seja um objeto — isso é erro de quem chama, não dado do visitante.
18. **`originMetaAd` só é verdadeiro com `marketingConsent.fbclid` presente**; a API deriva, ninguém envia.

### O painel

19. **Uma linha "Origem" no cartão do cliente (`OrderFacts`)**, só em pedido feito pelo cliente no carrinho (primeiro evento com `actor: CUSTOMER`). Pedido registrado no painel não mostra a linha: ele não veio do site, e "Direto" ali seria falso.
20. **O texto**, montado por `originLineOf` (`packages/ui/src/lib/order-origin.ts`):
    - com campanha: `facebook / cpc · campanha teste`; com clique da Meta guardado: `Anúncio da Meta · facebook / cpc · campanha teste`; só o clique: `Anúncio da Meta`;
    - sem nada: `Direto / sem campanha`;
    - `utm_content` e `utm_term`, quando há, numa segunda linha menor: `Conteúdo: … · Termo: …`.
21. *Limite:* um pedido do carrinho feito antes deste PR também lê "Direto / sem campanha". Não há como distinguir "não veio de campanha" de "não era gravado".

### Exportação e exclusão (LGPD)

22. **A exportação inclui.** `CustomerDataExport` diz ser "tudo o que a loja guarda" sobre o cliente; `fbclid`, `_fbp`, agente do navegador e endereço são dados dele. Entra um campo novo, `orderOrigins`: uma entrada por pedido que tenha algo gravado, com o número do pedido, as UTMs e, quando houve aceite, os fatos do consentimento como foram gravados. O `CustomerOrder` não muda.
23. **A exclusão da conta apaga as linhas de `order_marketing_consents` dos pedidos daquele cliente.** Os pedidos são os livros da loja e ficam, como hoje, com as UTMs e o `originMetaAd` — que descrevem a campanha, não a pessoa. Os identificadores do navegador não são dos livros. Consequência para o X7: um pagamento confirmado depois de a conta ser apagada não tem mais consentimento gravado e não é enviado.

### O texto legal

24. **Uma linha nova na lista de cookies**, na versão `2026-10-06` (a do X4, ainda não publicada), num commit só dela, como o X6 fez com `bl_purchases`. Nenhuma outra frase muda.
25. **Para o dono rever, dito no topo do PR:**
    - a seção "Cookies" abre com "só cookies essenciais" e fecha com "não grava cookies de análise, de publicidade ou de rastreamento". O `bl_origin` guarda de qual campanha a visita veio, com ou sem aceite: é atribuição de vendas da própria loja, e pode não caber em "essencial";
    - a política ainda não diz que o **pedido** guarda a origem e, com aceite, `fbclid`, `_fbp`, agente do navegador e endereço da página. O X4 (decisão 26) deixou o texto do envio pelo servidor para o X7; este PR grava esses dados antes de esse texto existir. A pilha é mesclada junta.

## Para o X7 — o que ler, e quando existe

Tudo numa consulta: `prisma.order.findUnique({ where: { id }, include: { marketingConsent: true } })`.

| Campo | Onde | Quando existe |
|---|---|---|
| **o aceite estava de pé** | `order.marketingConsent !== null` | só em pedido do carrinho feito com `bl_consent=granted` numa loja com pixel naquele momento. Nunca em pedido registrado no painel. Some se o cliente apagar a conta |
| `fbclid` | `marketingConsent.fbclid` | quando o visitante chegou por um anúncio da Meta **nesta loja**, com aceite, nos 30 dias antes do pedido. Nulo sem isso |
| instante do clique | `marketingConsent.clickedAt` | junto do `fbclid`, sempre (um `CHECK`). `fbc` = `` `fb.1.${clickedAt.getTime()}.${fbclid}` `` |
| `fbp` | `marketingConsent.fbp` | quando o navegador tinha o cookie `_fbp` na hora do pedido; nulo se não (bloqueador, script que não carregou). Vai sem cifrar |
| `client_user_agent` | `marketingConsent.userAgent` | quase sempre; cortado em 512; nulo se o navegador não enviou |
| `event_source_url` | `marketingConsent.pageUrl` | origem + caminho da página do carrinho, sem query; nulo se o navegador não enviou `Referer` — o X7 precisa de um substituto (o endereço da loja, por exemplo), porque a Meta exige o campo |
| UTMs | `order.utmSource` … `order.utmTerm` | com ou sem aceite. O X7 não as envia à Meta |

- **Sem linha em `order_marketing_consents`, o X7 não envia nada.**
- O aceite gravado é o da hora do pedido. Num pedido `ONLINE` pago dias depois, é esse que vale (como o X6 escreveu), a menos que o X7 decida outra coisa.
- IP: não gravado (decisão 13). E-mail e telefone o X7 lê do cliente, como já estava previsto.

## Para a segunda metade (o relatório)

- Agrupar por `utmSource`, `utmMedium`, `utmCampaign` em `orders`, filtrando por `storeId`, período (`placedAt`) e `status`. Nulo nos três é "Direto / sem campanha"; `originMetaAd` separa "anúncio da Meta sem UTM".
- `utmSource` e `utmMedium` já estão em minúsculas; `utmCampaign` está como foi escrita — o relatório decide se agrupa sem diferenciar maiúsculas.
- Pedidos de antes deste PR e pedidos registrados no painel têm tudo nulo; o relatório deve separar os do painel pelo primeiro evento, como a página do pedido faz.
- `originAt` permite "dias entre o clique e a compra".

## Fora do escopo

- O relatório de vendas por origem (segunda metade, depois do Épico P).
- Chamar a Meta, guardar token, montar o evento do servidor (X7).
- Mudar os eventos do X5 e do X6.
- Mostrar a origem na lista de pedidos, filtrar pedidos por origem.
- Guardar outros identificadores de clique (`gclid`, `ttclid`).
- e2e de Playwright novo no CI: a suíte da web não cria loja com pixel (como do X3 ao X6). A prova no navegador é feita uma vez, à mão, e contada abaixo.

## 06/10, depois do código — o que mudou ao escrever

- **A função da regra chama `originAfter(guardada, chegada, permitido)`** e ganhou um caso: se outra aba já guardou uma chegada mais recente, a chegada mais velha desta página não passa por cima dela.
- **Um não também vale para o clique que estava esperando.** Quem recusa e depois muda de ideia na mesma carga de página não tem o `fbclid` daquela chegada guardado: o não foi dado sobre ele.
- **A loja só é lida no handler quando o `bl_consent` diz `granted`.** Sem sim, o pedido não custa uma leitura a mais.
- **A API recusa o caractere nulo em qualquer texto do corpo**, antes de qualquer DTO (`api-validation.pipe.ts`, regra antiga). É a única coisa nesses campos que ainda recusa um pedido, e a web nunca o envia: a limpeza do cookie tira os caracteres de controle antes.
- **`arrivedAt` e `clickedAt` com mais de 90 dias ou no futuro são descartados pela API** (até 5 minutos de relógio adiantado contam como "agora"). A janela de 30 dias é regra da web; a API só recusa datas que não fazem sentido. Um clique sem instante não é gravado.
- **`originAt` de um pedido só com clique** (sem UTMs) é o instante do clique.
- **A linha "Origem" entrou no `OrderFacts`** (o cartão "Cliente"), por `originLinesOf` (`packages/ui/src/lib/order-origin.ts`), com story (`ComOrigem`, `OrigemDireta`) e teste próprio com axe.
- **A linha da política** ficou: "bl_origin: a campanha do link pelo qual você chegou a uma loja, isto é, os parâmetros utm_source, utm_medium, utm_campaign, utm_content e utm_term do endereço, para que o pedido que você fizer ali registre de qual campanha veio; e, numa loja que usa o Pixel da Meta, só depois que você aceita, o identificador do clique no anúncio (fbclid) com que você chegou; vale só para aquela loja e dura 30 dias a partir da chegada;".
- **A exportação** ganhou `orderOrigins`; o `CustomerOrder` segue sem origem (o teste que lista as chaves do pedido do cliente não mudou).

## 06/10 — o que foi visto no navegador

A vitrine foi aberta de verdade (`next dev` na 3800, API na 3801, banco `harness_meta_pixel`, lojas `loja-do-pixel` e `loja-b`, as duas com pixel de mentira) e percorrida pelo Playwright, com **toda requisição a `facebook.com` e `connect.facebook.net` abortada**: nada chegou à Meta. Um cliente novo foi criado e confirmado pelo e-mail (Mailpit); a senha da conta de teste do lojista foi redefinida pelo link do e-mail, de novo. Os servidores foram parados depois. Os pedidos nº 4 a 9 de `loja-do-pixel` ficaram no banco.

- **Chegada com `?utm_source=facebook&utm_medium=cpc&utm_campaign=teste&fbclid=abc123`, antes de responder ao aviso:** `bl_origin` com `Path=/loja-do-pixel`, 30 dias, `SameSite=Lax`, sem `httpOnly`, valor `{"s":"facebook","m":"cpc","c":"teste","a":<ms>}` — sem o `fbclid`. O cookie não é enviado a `/loja-b`, `/` nem `/privacidade`.
- **"Aceitar" na mesma página:** o valor ganha `"f":"abc123"`, com a **mesma** data da chegada. Navegar pela loja e recarregar outra página não muda nada.
- **Pedido (nº 4)**, retirada e dinheiro: o corpo que a página enviou não nomeia `origin` nem `marketingConsent`; a resposta ao cliente não tem `origin`. Linha no banco: `facebook | cpc | teste`, `originMetaAd` verdadeiro, e em `order_marketing_consents` `fbclid = abc123`, `clickedAt` = o instante da chegada (ao milissegundo), agente do navegador, `pageUrl = http://localhost:3800/loja-do-pixel/carrinho`. `fbp` vazio — ver abaixo.
- **Painel, pedido nº 4:** o cartão "Cliente" termina com "Origem — Anúncio da Meta · facebook / cpc · campanha teste". Nem a página nem a resposta da API ao painel (`origin: { source, medium, campaign, content, term, metaAd: true }`) trazem `abc123`, `_fbp`, agente do navegador ou o endereço do carrinho.
- **Chegada na `loja-b` com outra campanha e `fbclid`, aceite lá, depois pedido na `loja-do-pixel` (nº 5):** a `loja-do-pixel` não tem `bl_origin`; o handler do pedido não recebeu nenhum (cabeçalho `Cookie` conferido); o pedido ficou sem UTMs, `originMetaAd` falso. No painel: "Direto / sem campanha". (O cliente aceitou os cookies também na `loja-do-pixel`, então há linha de consentimento, sem `fbclid`.)
- **Chegada com `fbclid` e "Recusar" (nº 6):** cookie só com as UTMs; pedido com `facebook | cpc | teste`, `originMetaAd` falso, **nenhuma** linha em `order_marketing_consents`; nenhuma requisição à Meta. No painel: "facebook / cpc · campanha teste".
- **Sim e depois "Cookies" → "Recusar":** o `fbclid` sai do cookie; as UTMs e a data da chegada ficam.
- **Entrada na loja sem recarga** (`router.push` de `/loja-b` para `/loja-do-pixel?utm_source=newsletter…`, pela API de desenvolvimento do Next): a origem foi guardada na `loja-do-pixel`, e a `loja-b` ficou sem cookie.
- **Venda registrada no painel (nº 7):** `origin: null` na resposta, colunas nulas, nenhuma linha de consentimento; o cartão "Cliente" não tem a linha "Origem".
- **`_fbp`:** com a biblioteca da Meta abortada, nada grava o `_fbp`. Ele foi **plantado pelo teste** (`fb.0.1791333000000.…`, no domínio inteiro): com "Aceitar" (nº 8) foi gravado no pedido; com "Recusar" (nº 9) o handler o recebeu no cabeçalho e **não** o repassou — nenhuma linha.
- Console sem erros no percurso.

**Não rodado:** um `_fbp` escrito pela biblioteca real da Meta; o build de produção e o site atrás do Traefik (o `Referer` e o `publicOriginOf` com `https` estão só em teste de unidade); uma loja sem pixel no navegador (teste de componente e de handler); a exportação e a exclusão da conta na tela (e2e da API); um pedido `ONLINE`.
