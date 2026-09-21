# BEE-2 — Pesquisa do escopo novo (pagamento, envio, deploy, conta de cliente, vitrine, Storybook)

> **Tier:** plans — verdade de um momento, para um ticket. Append-only.
>
> **Status:** pesquisa, não decisão. Em 2026-09-20 o dono parou os itens de pagamento (ASAAS),
> conta de cliente, Melhor Envio e configurador de loja, para primeiro **voltar a funcionar o que já
> existia**, no padrão novo. Este documento existe para que a pesquisa não se perca quando eles
> voltarem à mesa. A decisão de monetização já tomada — **mensalidade do lojista, sem comissão por
> venda** — estreita várias das bifurcações abaixo.
>
> Complementa [2026-09-20--BEE-1--migracao-bee-link.md](2026-09-20--BEE-1--migracao-bee-link.md),
> que continua sendo o plano da migração.

# Memo de decisão — o que a expansão de escopo faz com o plano BEE-1

**Para:** dono do produto / desenvolvedor único
**De:** síntese de seis frentes de pesquisa (ASAAS, Melhor Envio, Dokploy, contas de cliente, vitrine/configurador, Storybook)
**Status do plano:** `scratchpad/phase0/plan.md` é append-only. Este memo é a seção datada que ele pede — nada aqui foi escrito no plano ainda.

---

## 1. O que a expansão faz com o plano

O plano dimensionou a migração em **≈61 dias + 0,5/loja**, dez fases, ~3–4 meses de calendário, e colocou explicitamente em *Não coberto*: **pagamentos online** ("hoje não existem; `payment_method` é só um rótulo") e o checkout terminando em deep-link `wa.me`. Quatro dos sete itens novos atacam exatamente essa fronteira. Um quinto (Dokploy) invalida a decisão §5.6 (Vercel + Railway/Fly + Postgres gerenciado do provedor).

Antes da tabela, três correções de fato que o plano ainda carrega:

- O plano diz `apps/bee-link`. A decisão já tomada é que **`apps/web` *é* o bee-link** e nada chamado `apps/bee-link` existe. Toda referência a paths na fase 0 precisa ser relida.
- **§5.6 morre inteira.** Vercel sai, Railway/Fly sai. Entra Dokploy sobre docker-compose, com Postgres como recurso gerenciado do Dokploy e imagens construídas no GitHub Actions. O risco que o plano lista ("provar o build da Vercel na fase 0, com o app vazio") continua valendo palavra por palavra, trocando Vercel por `docker build`.
- **O `pg_dump` continua não tirado.** Todas as seis frentes concluem coisas sobre o legado lendo código, não schema. Isso já era item 3 de "Antes de tudo"; agora é pré-requisito de três decisões de dinheiro.

### Fases: o que sobrevive, o que cresce, o que é novo

| Fase | Escopo revisado | Orig. | Rev. | Por quê |
|---|---|---:|---:|---|
| 0 | Bootstrap + gates + split do schema **+ harness do Storybook + fix do `getMessages()` no layout raiz + prova do Docker build** | 2 | **6,5** | O item 7 tem 4,5 d que só funcionam se vierem primeiro |
| 1 | Auth + stores **+ `Session.kind` + guards de principal + OAuth Google + blocos sociais** | 5 | **12** | Item 3, núcleo |
| 2 | Catálogo **+ peso/dimensões/`insuranceValue` + `compareAtPriceCents` + grade de edição em massa** | 6 | **8,5** | Pré-requisito duro do item 5 e do card do item 1 |
| 3 | **Vitrine nova**: header com busca, filtros por categoria em rota própria, hero, faixa de valor, footer, rotas `(storefront)`, SEO/ISR real, `StoreTheme` | 6 | **16** | Itens 1 e 2. Não é a vitrine like-for-like que o plano orçou |
| 3c | **Conta do cliente na vitrine**: entrar/criar conta/minha conta/meus pedidos/endereços, BFF, segunda ramificação do `proxy.ts` | — | **6** | Novo (item 3) |
| 4 | Delivery **+ `ShippingOption[]` de três modos + Melhor Envio: OAuth por loja, cliente tipado, cotação, cache** | 3 | **12** | Item 5 |
| 5 | Orders + checkout **+ ASAAS inteiro + compra de etiqueta + identificação do cliente + máquina de estados de pagamento** | 7 | **≈49** | Itens 3, 4 e 5 convergem aqui. **Deixa de ser uma fase** |
| 6 | Promotions + coupons | 4 | 4 | Inalterada — mas o motor de preço do carrinho (desconto PIX, frete grátis por modo) tem de nascer na 5 |
| 7 | Profundidade do admin **+ configurador de seções + telas de pagamento e frete** | 12 | **19** | Item 6. A aba "minha loja" legada nunca é construída |
| 8 | SSE, analytics, impressão | 5 | 5 | Inalterada |
| RV | Regressão visual (Playwright sobre `storybook-static`) | — | **2** | Item 7, ao fim da fase 3 |
| M | Migração de dados **+ clientes legados sem e-mail** | 5 | 5,5 | Quase inalterada |
| D | **Deploy Dokploy**: dois Dockerfiles, compose de produção, GHCR, backup + ensaio de restore | 3 | **5** | Item 0 |
| 9 | Cutover | 2+0,5/loja | 2+0,5/loja | Inalterada |
| 10 | Decomissionamento | 1 | 1 | Inalterada |
| | **Total** | **≈61** | **≈153 + 0,5/loja** | |

**Não é "um pouco mais". É duas vezes e meia.** A soma bruta dos seis tópicos é ~110 dias; ~14 deles substituem trabalho já orçado (a vitrine like-for-like da fase 3 e a aba "minha loja" da fase 7 simplesmente não são construídas na forma antiga), o que dá ~95 dias líquidos sobre os 61.

Em calendário solo, na mesma proporção que o plano usou (61 d → 3–4 meses), isso é **8 a 10 meses** — e há dois relógios externos de duração não publicada em cima disso: a homologação regulatória do ASAAS e a verificação de integração do Melhor Envio. Nenhuma das duas empresas publica SLA. Ambas precisam ser iniciadas na **semana 1**, não quando o código estiver pronto.

**A fase 5 deixa de existir como fase.** Quarenta e nove dias não é um PR nem três. Ela tem de virar 5a (orders + customers + checkout sem pagamento, ~12 d), 5b (ASAAS: PIX próprio + checkout hospedado + webhooks + reconciliação, ~24 d) e 5c (Melhor Envio no checkout + compra de etiqueta + rastreio, ~9 d). O plano já avisa que a fase 5 é a que "vale quebrar em três PRs"; agora ela vale quebrar em três fases.

O que **fica mais barato**: o trabalho de mensagem de WhatsApp da fase 5 praticamente evapora (o deep-link vira um link de contato no rodapé e na confirmação); a página-intersticial, três filtros de categoria mortos e dois componentes de cupom mortos são **apagados**, não portados (~1.000 LOC que não entram na conta de ninguém); e a aba "minha loja" de 1.717 linhas não é reconstruída aba a aba — é substituída por um renderizador de seções.

---

## 2. As decisões, da mais irreversível para a menos

A ordenação é por **custo de mudar de ideia depois**, não por importância. As duas primeiras são as únicas cujo erro não se corrige com um refactor.

### 1. Quem é o merchant of record na cobrança ASAAS — o bee-link ou o lojista?

Tudo (schema, onboarding, KYC, responsabilidade por chargeback, mecanismo de comissão) é derivado dessa resposta.

| Opção | O que custa |
|---|---|
| **(a) Plataforma + split** — o bee-link cobra com a própria chave; o lojista é só um `walletId` no `split[]`; o resto do `netValue` é a comissão | Uma credencial, um webhook, uma conta para conciliar. Mas o bee-link vira merchant of record: come chargeback, a análise de risco do ASAAS recai sobre a venda de todas as lojas, e o dinheiro passa pelo saldo do bee-link |
| **(b) Subconta de record** — `POST /v3/accounts` por loja, cobrar como a subconta | Postura jurídica limpa, desbloqueia Conta Escrow. Mas: a conta-mãe precisa ser CNPJ; o **período de avaliação regulatória trava em 10 subcontas / R$ 2.000 cada / 60 dias**; e usar a `apiKey` da subconta depois disso exige estar "adequada ao BaaS", cujas regras vêm num Playbook privado |
| **(c) Chave própria por loja** | Zero exposição regulatória, e N credenciais de produção que criam cobrança e movem dinheiro dentro do seu banco, sem mecanismo confiável de comissão |

**Recomendação: (a)**, com criação de subconta usada como *conveniência de onboarding*, nunca como mecanismo de autenticação — o bee-link cria a subconta, guarda o `walletId` e **descarta a `apiKey`**. O argumento técnico decisivo é do próprio repo: `apps/api/src/shared/config/env.ts` é o único leitor de `process.env`, com gate `api/env-through-schema` em `scripts/arch-gates.sh:89`, e um segredo por tenant não cabe ali por construção. Um `walletId` é identificador, não credencial: só recebe.

**Custo de mudar depois: o mais alto do escopo inteiro.** Virar (a)→(b) significa re-onboarding de cada lojista com KYC (documento + selfie), credenciais novas, e conciliação permanente entre duas contas — cobranças históricas não se movem entre contas ASAAS. Pior: reabre o teto de 10 subcontas exatamente quando já há volume. **O seguro é barato e deve entrar no primeiro commit**: `ChargeOwner { PLATFORM | STORE }` como coluna discriminadora em `Payment` e `StorePaymentAccount`, para que a virada seja troca de credencial + `split[]` diferente, não reescrita.

**Ressalva que não é técnica:** o modelo (a) — volume de muitos lojistas independentes numa conta só — **não é descrito em lugar nenhum da documentação do ASAAS**. Estruturalmente parece subadquirência. Essa é uma ligação para um gerente de contas ASAAS na semana 1, antes de construir, não depois.

### 2. O configurador de loja é template, é builder de seções, ou é página livre?

Está em segundo porque **(c) não é reversível em direção nenhuma**: no momento em que a página de um lojista é uma árvore arbitrária, você nunca mais muda semântica de renderização sem quebrar lojas vivas — não existe migração para "mudei este padding". E é o item com maior tendência a crescer por acreção, um "dá pra mover isso pra cima?" de cada vez.

**Recomendação: construir (a), modelar como (b).** Um tema só (`VITRINE`, a forma do alphagenin), com a lista de seções **armazenada** como array ordenado e validado de `{ id, type, enabled, settings }`; o admin v1 só liga/desliga seção e edita settings. Reordenar e "adicionar seção" viram um *unlock de UI* (o `@dnd-kit` já é dependência do `packages/ui` e não tem nenhum importador), não uma reescrita, porque storage, schema, renderizador e invalidação de cache já são section-shaped.

**A trava que torna isso executável é escrever o catálogo de seções ANTES do primeiro commit** — `hero`, `value-strip`, `product-grid`, `featured-products`, `rich-text`, `instagram`, `newsletter`, `banner-pair`. Oito é o produto inteiro. Qualquer coisa fora da lista é um PR, não uma conversa no admin.

Evidência a favor: alphagenin.com.br é um lojista real, com marca real, numa plataforma que oferece (b) — e a home dele é um hero, um parágrafo, quatro ícones e um carrossel.

**Custo de mudar depois:** (a)→(b) é uma semana *se e somente se* o storage nasceu em seções. (b)→(c) é uma porta sem volta.

### 3. A conta do cliente é global ao bee-link ou por loja? E comprar exige conta?

**Recomendação: credencial global, registro por loja.** `User` é a credencial; `Customer` é o registro do lojista, ligados por `userId` **nullable** e `@@unique([storeId, userId])` ao lado do `@@unique([storeId, phone])` que o plano já previu. É exatamente o modelo da Nuvemshop (login Conta Nuvem global, lista de clientes por loja) — a plataforma com que o produto vai ser comparado. É também a leitura limpa de LGPD: cada lojista é controlador da própria base, o bee-link é operador, e uma credencial global que **nenhum lojista lê** não é compartilhamento entre controladores (Art. 7 §5). A frase de `docs/product/README.md:59` — "a mesma pessoa comprando em duas lojas são dois clientes, e nenhuma loja sabe da outra" — sobrevive literalmente.

**Guest checkout permanece o padrão.** Vou discordar da leitura literal de "para poder comprar": nenhum cliente legado tem e-mail cadastrado (`src/types/order.ts:31-53`), então uma trava dura deixa 100% da base atual de fora no dia do corte. A evidência brasileira também não sustenta a trava — a pesquisa da Opinion Box (n=1.000) nem lista cadastro obrigatório entre os motivos de abandono; frete acima do esperado lidera com 57%. O login social entra como o caminho **rápido** na etapa de identificação, e o convite para criar senha vai na confirmação do pedido e no e-mail, onde a pessoa já converteu.

**A parte irreversível é a direção da chave única.** Se lançar com credencial por loja (`@@unique([storeId, email])` + senha por loja), unificar depois significa pedir a gente de carne e osso que reconcilie contas duplicadas na mão. Decidir antes da primeira migration; o resto é refactor.

Duas coisas que têm de estar **no mesmo PR** do primeiro login de cliente, não depois: `Session.kind` + claim `typ` no JWT (hoje `jwt-auth.guard.ts` só checa assinatura e sessão viva — um token de cliente satisfaz o guard em qualquer rota de lojista), e o par de cookies separado `bl_c_access`/`bl_c_refresh` (o `proxy.ts:31` trata *presença* do cookie de acesso como "logado"; compartilhar o par faz o lojista testando a própria loja ser deslogado do admin ao clicar em "sair" na vitrine).

### 4. No Melhor Envio, cada lojista autoriza o bee-link na conta dele, ou o bee-link tem uma conta só?

**Recomendação: OAuth por loja, um aplicativo bee-link, N autorizações** — é o que o ME documenta para plataformas multi-lojista, e as duas orientações que mais importam ("o usuário precisa ter saldo suficiente na carteira" e "use `custom_price`, que reflete customizações configuradas na conta do usuário integrado") só fazem sentido com o token do lojista. Conta única faria o bee-link virar revendedor de frete: etiqueta sai do CNPJ e do endereço do bee-link, float e risco no bee-link, e todo lojista perde as próprias tarifas negociadas.

**Custo de mudar depois: alto.** Decide schema (tabela de token por loja vs uma env var), superfície de admin (fluxo Conectar/Desconectar + indicador de saúde), fluxo de dinheiro, e o que você conta ao ME na verificação. Mudar depois é re-onboarding de todas as lojas.

### 5. Onde moram credenciais de terceiros por lojista — e a contradição entre as frentes 4 e 5

Esta decisão **não existia** e precisa ser resolvida conscientemente, porque as duas frentes chegaram a recomendações incompatíveis:

- A frente ASAAS recomenda escrever em `apps/api/AGENTS.md` que **"o bee-link não guarda credencial de terceiro de nenhum tenant, apenas identificadores"** — o que é verdade no modelo de split, onde o valor por loja é um `walletId`.
- A frente Melhor Envio **exige** guardar, por loja, um `access_token` (30 d) e um `refresh_token` (45 d) que **gastam a carteira do lojista**.

Não dá para ter as duas. **Recomendação:** o princípio vira "o bee-link não guarda credencial de *pagamento* de nenhum tenant", e a capacidade de guardar credencial de terceiro é construída **uma vez, direito, para o Melhor Envio**: modelo dedicado (`MelhorEnvioAccount`), ciphertext AES-256-GCM em `Bytes`, chave em `env.ts` fora do blast radius do banco, descriptografia apenas dentro do cliente ME, e um arch-gate proibindo o nome do campo fora daquela pasta. Se um dia o ASAAS obrigar subcontas, o mecanismo já existe e a decisão 1 fica um degrau mais barata.

**Custo de mudar depois: FÁCIL hoje, IMPOSSÍVEL depois.** No instante em que uma chave de produção de terceiro entra no banco, voltar atrás significa rotacionar tudo que você já guardou e provar que destruiu o antigo.

### 6. Cartão: checkout hospedado do ASAAS (redirect) ou transparente na vitrine?

**Recomendação: hospedado na v1, PIX in-house.** É o único caminho que entrega cartão + PIX + parcelamento + split **sem escopo PCI e sem depender de um gerente de contas** — a tokenização do ASAAS é server-side e em produção exige liberação manual, e a própria tabela PCI deles diz que na integração por API "sua infraestrutura permanece no escopo". O PIX vai pelo caminho direto (`POST /v3/payments` + `GET /v3/payments/{id}/pixQrCode`), porque não envolve dado de cartão, mantém escopo zero e permite renderizar QR + copia-e-cola com o seu design — que é onde a conversão brasileira é ganha.

**Conflito a declarar em voz alta:** o item 6 pede uma vitrine totalmente controlável no estilo alphagenin, e o cartão redireciona para uma página do ASAAS que você não tematiza. A alternativa não é um override de CSS — é um projeto de escopo PCI (determinação de SAQ com o adquirente ou um QSA, possível varredura ASV). Desenhe o fluxo para que o redirect seja o **último** passo, depois de carrinho e endereço 100% bee-link.

**Custo de mudar depois: médio.** Se o modelo `Payment` for escrito contra o vocabulário de status do ASAAS (e não contra "checkout" ou "payment"), o transparente entra como estratégia adicional de criação atrás do mesmo modelo e do mesmo handler de webhook. O que não é barato é o PCI que a troca destrava.

### 7. Forma dos recursos no Dokploy

**Recomendação: híbrido** — Postgres como **recurso gerenciado do Dokploy** (backup agendado para S3/R2, restore, e o `PGDATA` correto de PG18), e a camada de aplicação (web + api + migrate) num **recurso Docker Compose** a partir de `docker-compose.prod.yml` no repo. O compose é a única forma em que o gate de migration é declarativo: `depends_on: { migrate: { condition: service_completed_successfully } }`. Swarm ignora `depends_on` e o Dokploy **não tem release hook**. As imagens são construídas no GitHub Actions e empurradas para o GHCR; o auto-deploy nativo do Dokploy fica **desligado**, porque ele dispara no push e não no CI verde.

**Custo de mudar depois: baixo** — mover para dois recursos "Application" com `Order: start-first` é uma tarde, e o banco não se move. O que **não** é barato é colocar o Postgres dentro do compose e extrair depois: isso é dump/restore com downtime.

### 8. Onde os blocos genéricos são escritos, e o `addon-vitest` agora

`packages/ui` no beelink-monorepo é **byte a byte idêntico** ao template hoje. Cada bloco genérico escrito aqui sem plano de flow-back é um conflito de merge permanente, e o `AGENTS.md` da raiz proíbe push para `template`. **Recomendação:** teste operacional de "genérico" — *um bloco é genérico se suas props não mencionam dinheiro, BRL, transportadora, slug de loja nem nenhum substantivo de `packages/contracts`* —, cherry-pick para o harness, merge de volta. E instalar `@storybook/addon-vitest` **na fase 0**, porque `parameters.a11y.test: "error"` hoje é decorativo (nenhum runner instalado) e `packages/ui` **não tem cobertura nenhuma de CI** — o job `web` usa `--filter=web`, que não alcança o pacote, apesar de `packages/ui/AGENTS.md:37` afirmar o contrário.

### 9 e 10 — baratas, decidir e seguir

**Boleto fica fora da v1** (é o único método que força um segundo caminho de criação de cobrança e um estado pendente de dias), mantendo `BOLETO` no enum para que entrar depois seja um branch de service. **"5x sem juros" e "5% no PIX" são regras de preço do bee-link, não features do ASAAS** — não há campo de juros na API; vire `Store.maxInstallments`, `installmentsInterestFree` e `pixDiscountBasisPoints`, e mostre ao lojista, no admin, quanto ele absorve (2,99% à vista → 4,29% em 13–21x), porque isso é uma decisão dele com o número na frente, não um default descoberto no extrato.

---

## 3. Sequenciamento: o que bloqueia o quê

**Dois relógios externos começam na semana 1, em paralelo à fase 0:** (i) a conversa comercial com o ASAAS, que decide a decisão nº 1 e portanto o schema de pagamentos; (ii) o pedido de verificação/homologação do Melhor Envio (`novosnegocios@melhorenvio.com` + o checklist deles), que exige entregar credenciais de uma loja de teste no bee-link para o time deles exercitar o fluxo. Nenhuma das duas publica prazo. Começar quando o código estiver pronto é como se descobre, em produção, que faltavam seis semanas.

**Bloqueios duros de código:**

- **Produto com peso e dimensões (fase 2) → cotação Melhor Envio (fase 4).** Hoje não existe nenhum metadado de envio em lugar nenhum do legado: `src/app/api/stores/[slug]/products/route.ts` monta a linha com um spread não tipado do que o cliente mandou, e o grep por `weight|peso|altura|largura|comprimento|dimensions|sku` em todo o `src/` só retorna `font-weight` e `.length` de array. Sem isso, toda cotação é impossível, para todo produto.
- **`Store` com documento (CPF/CNPJ) e endereço estruturado (número, bairro, UF) → `from` do carrinho ME.** A mesma exigência que o `to` tem. Fase 1/2.
- **Schema de `Customer` (CPF + `CustomerAddress` estruturado) → ASAAS e ME.** Aqui está a resposta à pergunta do briefing: **não, você não precisa de identidade de cliente para cobrar.** O ASAAS exige um `customer` com `cpfCnpj`, não uma conta bee-link. O que precisa existir antes é a *linha* `Customer` com as colunas novas — o *fluxo de login* (item 3) é independente e pode vir depois. O que acopla os dois é o produto, não a técnica: o CPF passa a ser obrigatório no checkout de qualquer forma, o que muda a conversa sobre conta de "cobrança extra" para "quantas vezes você redigita".
- **Vitrine nova (fase 3) → rework do checkout (fases 5b/5c).** O checkout é uma superfície da vitrine nova. Mas os **blocos** de pagamento e frete (`payment-method-picker`, `pix-payment`, `shipping-options`) são presentacionais e se constroem no Storybook contra fixtures, em paralelo à API — é exatamente a mitigação que o plano já prescreve para a fase 5.
- **`StoreTheme` + o array de seções têm de nascer na MESMA migration da fase 3.** Se a vitrine nova for escrita lendo `layout_settings` e só depois virar seções, o renderizador é escrito duas vezes. O configurador (fase 7) consome a estrutura; a estrutura nasce na 3.
- **O bloqueador que ninguém encontrou ainda:** `apps/web/src/app/layout.tsx` dá `await getMessages()`, que chama `cookies()` e `headers()`. Isso tira **toda** rota abaixo do render estático. `public-api.ts` e `revalidate.ts` existem e **não têm nenhum chamador**. Até isso ser corrigido, cada afirmação sobre ISR, `revalidate` e tags de cache neste plano é teatro. É a primeira coisa da fase 3 — dois arquivos.
- **A intersticial só pode ser apagada quando a vitrine nova subir**, porque hoje ela é a única superfície onde uma loja com catálogo vazio parece intencional. O estado vazio do catálogo é requisito, não polimento. Rotas não mudam: a URL `/<slug>` é a mesma, o botão de compartilhar do admin sempre emitiu a URL nua, e basta que a página **ignore** um `?showCatalog=true` desconhecido.
- **Compra de etiqueta é ação do admin, não do checkout.** A carteira é do lojista e pode estar vazia; um 422 do ME dentro do fluxo de um cliente pagante é o pior lugar possível para essa falha. O checkout registra a intenção (serviço, transportadora, preço cotado, janela); o card do pedido no admin tem "Comprar etiqueta".
- **Fase 3b (shadow só-leitura para uma loja-piloto) ficou mais valiosa, não menos.** O redesenho visual é a maior aposta de produto do escopo novo; servir a vitrine nova para uma loja real enquanto o legado ainda é dono de toda escrita é a forma mais barata de descobrir se o "estilo alphagenin" funciona para o público do bee-link antes de gastar os 19 dias do configurador.

**Ordem real:** semana 1 (ASAAS + ME em paralelo) → fase 0 ampliada → fase 1 (stores + principal kind + OAuth) → fase 2 (catálogo + dimensões) → fase 3 (vitrine + `StoreTheme`) → 3b opcional → 3c (conta do cliente) → fase 4 (delivery + ME) → 5a (orders/checkout) → 5b (ASAAS) → 5c (ME no checkout + etiqueta) → fase 6 → fase 7 (admin + configurador) → fase 8 → M/D/9/10.

---

## 4. O que ficou perigoso e não era

| Risco novo | Falha concreta | Mitigação mais barata |
|---|---|---|
| **bee-link vira quem move o dinheiro** | Chargeback de mercadoria que o bee-link nunca viu, de loja que não controla; e o split é calculado sobre `netValue` (**depois** das taxas), então comissão fixa num carrinho de R$ 20 gera `PAYMENT_SPLIT_DIVERGENCE_BLOCK` com 2 dias úteis para corrigir antes de o split ser cancelado e o dinheiro ficar na plataforma | Comissão percentual com piso, nunca valor fixo; `chargeOwner` no schema desde o commit 1; a conversa sobre reserva/limite por loja é comercial, não de produto |
| **Perda silenciosa e permanente de webhook** | 15 falhas consecutivas **pausam a fila** do ASAAS; eventos são retidos 14 dias e apagados. Um deploy ruim numa sexta perde confirmações de pagamento e o pedido nunca vira pago. E o recreate do compose gera 502 de 2–10 s a cada deploy | Tabela `PaymentWebhookEvent` com `@@unique([provider, eventId])`, `ON CONFLICT DO NOTHING`, 200 só depois do commit, worker drenando `PENDING`; **alerta quando a fila pausa**; e um job de reconciliação que re-consulta o ASAAS para pagamentos cuja cópia local está velha. Nunca marcar pago pelo `successUrl` |
| **N refresh tokens de OAuth de terceiros no banco** | Um dump vazado vira capacidade de gastar a carteira de todo lojista. E o token de refresh tem 45 dias: uma loja parada por 45 dias, ou cujo dono revoga o acesso no painel do ME, **perde o frete em silêncio** — o cliente simplesmente deixa de ver Correios | AES-256-GCM na aplicação, chave fora do blast radius do banco; job proativo de refresh em ~T-7d (refresh preguiçoso no 401 não salva loja parada); advisory lock por loja (o refresh devolve um token novo e o ME não documenta se invalida o antigo na hora); coluna `status` + indicador no admin + e-mail |
| **Escopo PCI** | Cartão transparente põe PAN e CVV dentro do processo Fastify; o ASAAS se recusa explicitamente a dizer qual SAQ se aplica | Checkout hospedado para cartão. PIX in-house não muda nada, porque não há dado de cartão |
| **Sem chave de idempotência na criação de cobrança** | Não existe header `Idempotency-Key` em lugar nenhum da API ASAAS. Um `POST /v3/payments` reenviado depois de timeout cria cobrança duplicada | `externalReference` único por tentativa + consulta pré-voo antes de qualquer retry |
| **Deploy self-hosted substituindo duas plataformas gerenciadas** | O Postgres gerenciado do Dokploy **não cria volume por padrão** — sem adicionar um em Advanced → Volumes, os dados vivem na camada gravável do container. E um backup nunca restaurado não é backup. Construir imagem na mesma caixa que serve tráfego congela a caixa (o próprio doc "Going Production" deles abre com esse aviso) | Volume explícito; **um ensaio real de restore** para um banco descartável, escrito em `docs/repo/deploy.md`; build no GitHub Actions → GHCR, Dokploy só puxa; `ufw-docker` (UFW não cobre portas publicadas pelo Docker) |
| **`API_URL` tem default `http://localhost:3001/api`** | Variável ausente em produção não derruba o boot — aponta a vitrine para localhost, em silêncio | Tornar o default condicional a `NODE_ENV !== "production"`, ou remover |
| **LGPD entre lojistas com CPF na mesa** | `customers` vira tabela de CPFs. Qualquer bug de escopo de tenant sai de "constrangedor" para "notificável à ANPD". E o legado tem um IDOR puro: `GET /api/orders?store_slug=…&customer_phone=…`, sem auth, devolve todos os pedidos de quem souber o telefone | A checagem de escopo mora em **um** guard, nunca copiada por endpoint (o legado copiou 25 vezes); a rota legada **não é portada**, é substituída por `OrderAccessToken` de uso único no e-mail do pedido |
| **Contratos que o repo acredita ter e não tem** | `parameters.a11y.test: "error"` é inerte sem runner; `packages/ui` não roda em CI nenhum; e um PR que só toca `packages/ui` dispara os jobs `web`, `api` e `e2e` — parece coberto, e o pacote alterado é justamente o não testado | Job `ui` no `ci.yml` (~15 linhas) + `addon-vitest`, fase 0, antes de existirem 45 blocos |
| **Dinheiro em duas representações** | O plano manda `Int` cents; o ASAAS fala decimais BRL (`129.9`). O legado **já perdeu uma taxa de entrega** exatamente nessa classe de erro, sem ninguém notar pela vida inteira do produto | Um par de conversão dentro do cliente ASAAS, em um só lugar; `netValueCents` vem de parsear a resposta uma vez, nunca de re-derivar; float nunca entra em código de conciliação |
| **Marcas de terceiros vs. `web/no-hex-colors`** | O 'G' do Google, PIX, Visa/Mastercard e logos de transportadora reprovam o gate, cuja baseline é 0 — e o `AGENTS.md` da raiz trata adicionar baseline como destruir o gate permanentemente | Ativos em `apps/web/public/`, injetados como prop `icon: ReactNode` (padrão que `dashboard-types.ts` já usa). Decidir **antes** do botão de login social, na fase 1 |
| **Migration/code skew** | `prisma migrate deploy` roda como gate antes da API nova subir, e um deploy que falha deixa o código anterior rodando contra o schema novo | **Expand/contract obrigatório** desde a primeira migration, escrito em `apps/api/AGENTS.md`: aditivo primeiro, destrutivo (DROP, NOT NULL, rename) só um release depois. Rename são dois releases |

---

## 5. O que não foi possível confirmar

Em ordem de **impacto sobre uma decisão já tomada acima**.

**Mudariam uma decisão se saírem diferente:**

1. **Se o ASAAS aceita o padrão de marketplace em conta única.** A documentação simplesmente não trata o caso. Se a resposta for "tem de ser subcontas", a decisão nº 1 vira (b), entram +8–12 dias (criação de conta, fluxo de documentos, os quatro `ACCOUNT_STATUS_*` como assistente de onboarding, reconfirmação anual, credencial cifrada com rotação) e o teto regulatório de 10 subcontas / R$ 2.000 / 60 dias vira o limite de crescimento até a homologação sair. **É uma ligação, e ela decide a arquitetura.**
2. **Se o `refresh_token` do Melhor Envio renova os 45 dias a cada refresh, ou corre desde a autorização original.** A doc diz "45 dias de validade" sem ponto de referência. Se **não** renovar, toda loja precisa reautorizar manualmente a cada 45 dias independentemente de atividade — isso é um produto materialmente diferente, e o fluxo de "conectar" deixa de ser onboarding e vira rotina. Acredito que renova; não consegui confirmar.
3. **Se o ME invalida o refresh token antigo imediatamente ao emitir o novo.** Determina se um refresh concorrente (job agendado + cotação ao vivo) queima o token válido. Define o desenho do lock.
4. **Qual escopo OAuth cada endpoint do ME exige.** A lista completa está documentada; as páginas de referência por endpoint não dizem o escopo. O mapeamento usado foi inferido dos nomes. **Escopo errado = reautorizar todas as lojas.** Verificar empiricamente no sandbox pedindo o mínimo e observando os 403 antes de fixar a string de produção.
5. **Se `pnpm install --frozen-lockfile --prod --filter api...` poda corretamente sob `node-linker=hoisted`.** É a linha load-bearing não verificada do Dockerfile da API — combinação com histórico de bugs no pnpm. Fallback: enviar o `node_modules` sem podar, correto e ~300–600 MB mais gordo. **Provar na fase 0, no app vazio.**
6. **Se todos os primitivos shadcn que faltam têm implementação Base UI no estilo `base-nova`.** `carousel` (Embla) e `chart` (recharts) são agnósticos; `navigation-menu`, `command`, `pagination`, `empty` e `input-group` não foram confirmados individualmente, e a página oficial de `components.json` parece desatualizada em relação ao produto. Descobrir no meio do build significa escrever o primitivo à mão.
7. **Os peerDependencies exatos de `@storybook/addon-vitest@10.6.0` contra o pin de Vitest `4.1.11`.** A versão existe; o registro não devolveu a faixa de peers dela. Se excluir 4.1.11, a recomendação nº 8 precisa de uma negociação de pin em quatro workspaces.
8. **Se `next: { revalidate }` sozinho mantém o fetch no Data Cache numa rota que já leu uma Request-time API.** Os docs do Next 16 são genuinamente ambíguos. Por isso a recomendação de passar `cache: "force-cache"` explicitamente em `public-api.ts` — se a inferência não valer, a rota de busca re-consulta a API a cada navegação e o rate limit dispara em tráfego legítimo.
9. **Se os lojistas querem template.** O pedido diz "ou com templates ou melhores configuradores", que se lê como "não sei, faça ficar bom". Se o que eles querem for literalmente "deixe minha loja parecida com a alphagenin", a resposta é **um tema e um seletor de cores**, e metade dos 19 dias da fase 7 desaparece. É uma conversa de produto e vale ter antes de escrever o catálogo de seções.

**Riscos de cronograma, não de desenho:** nem o ASAAS nem o Melhor Envio publicam prazo de aprovação (homologação regulatória e verificação de integração, respectivamente). O que "adequada ao BaaS do Asaas" exige contratualmente não é definido em lugar nenhum, e as regras obrigatórias de marca do BaaS vivem num Playbook enviado em privado — ou seja, as restrições de UI do checkout são desconhecidas até você tê-lo. Taxas de criação de subconta e de transferência de split são específicas do contrato; todos os percentuais citados são da página de marketing.

**Limites operacionais que só aparecem em produção:** o sandbox do ME simula **apenas Correios e Jadlog** — qualquer coisa com Azul, Buslog ou Latam Cargo (que exigem tratamento de `agency`) é não testável antes do go-live, e a compra de etiqueta Azul Cargo não existe via API. A tokenização de cartão do ASAAS **funciona no sandbox e exige liberação manual em produção** — exatamente o tipo de coisa que passa na homologação e falha no lançamento. O formato da resposta 429 e a existência de `Retry-After` não são documentados por nenhum dos dois.

**Duas lacunas de dados que custam dez minutos e ninguém fechou:** o `pg_dump` do Supabase continua não tirado — toda afirmação sobre o schema legado neste memo é evidência de *código*, não de *schema*, inclusive a de que nenhum pedido histórico carrega dado de pagamento (muito provavelmente correto, já que nunca houve gateway). E ninguém rodou `SELECT count(*)` em `customers` — esse número decide se o fluxo de reivindicação de histórico vale ser construído ou se a base é pequena o bastante para começar do zero.

**Obrigação fiscal sem solução desenhada:** envio comercial exige nota fiscal. `options.non_commercial: true` com declaração de conteúdo só é permitido a pessoa física e não-contribuinte de ICMS; um lojista CNPJ precisa fornecer a chave da NF-e em `options.invoice.key`, que o bee-link não emite e não tem campo para receber. Ou o frete por transportadora é escopado a remetentes não-comerciais na v1 — e isso é dito em voz alta ao lojista — ou o campo entra e se aceita que lojistas vão deixá-lo em branco e ter etiqueta recusada no balcão. Essa é uma decisão de produto que não apareceu em nenhum dos sete itens do escopo e precisa aparecer.