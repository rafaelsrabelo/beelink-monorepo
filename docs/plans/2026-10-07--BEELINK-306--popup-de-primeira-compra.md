# BEELINK-306 (O8) — pop-up de primeira compra, configurável pelo lojista

> Épico O (primeira compra). Empilhado sobre o [BEELINK-307](2026-10-07--BEELINK-307--banner-da-categoria.md) (PR #237 ← #236 ← `main`). Constrói sobre a [faixa de ofertas](2026-10-07--vitrine-ofertas-relacionados-busca.md) e segue, para o cookie e o texto legal, o que o [BEELINK-271](2026-10-06--BEELINK-271--consentimento-de-cookies.md) estabeleceu. Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`, por isso mora aqui.

## O pedido

A referência do dono (matconcasa.com.br): um modal sobre a página inicial, com uns 720 px, foto na metade esquerda e, na direita, um painel colorido — "Ei, antes de ir embora… Que tal ter 5% de desconto? Se cadastre agora e receba um cupom para sua PRIMEIRA COMPRA!", três campos (nome, e-mail, telefone), o botão "GANHAR CUPOM!!" e um "×". Nas palavras dele: "já chamativo, com o nome ganhar cupom; então pensar no admin, na parte de config, poder configurar essas coisas."

Objetivo: a loja chama o visitante a abrir uma conta com um pop-up chamativo, e o lojista configura tudo no painel.

## Duas decisões do assistente que o ticket deixava "a decidir" — para o dono confirmar

**A. Não há formulário dentro do pop-up.** Na referência o modal recolhe nome, e-mail e telefone. Aqui o cupom pertence a uma CONTA de cliente, que pede senha e e-mail confirmado (ou "Continuar com Google"). O botão do pop-up LEVA ao cadastro que a loja já tem, carregando o caminho de volta para a página em que a pessoa estava (o mesmo link que a faixa de ofertas monta). Depois de criada a conta, a faixa de ofertas mostra o cupom com "Usar no carrinho". Não existe um segundo cadastro.

**B. "Fechei uma vez" é lembrado num cookie novo da loja, `bl_popup`, e isso é uma versão nova da política de privacidade.** A política publicada (versão `2026-10-06`, no ar) enumera cada cookie `bl_*`. O cookie entra na lista e a versão passa a `2026-10-07`, pelo mecanismo do BEELINK-271, **num commit só dele**. Nenhuma outra frase legal muda e nenhuma base legal é inventada.

## Definição de Pronto

1. A configuração é guardada por loja: ligado/desligado, imagem, título, texto, texto do botão, gatilho (ao chegar, com atraso em segundos; ou ao sair) e qual benefício anuncia. Contrato em `packages/contracts`, migração, rotas só do dono com validação e Swagger.
2. Limites: título até 80 caracteres, texto até 200, botão até 30, atraso de 0 a 60 s; texto puro, sem caracteres de controle; imagem só http(s). Uma loja que nunca salvou lê os padrões, desligado.
3. O benefício anunciado segue, por omissão, o destaque público de primeira compra da loja (o mesmo da faixa); o lojista pode escolher uma promoção ou um cupom mostrado de primeira compra. Nunca um cupom oculto, nunca um código para o visitante, nunca o de outra loja.
4. O pop-up nunca promete um número que a API não deu: o número só entra pelo marcador `{beneficio}`, e um desconto digitado à mão ("10%", "R$ 15") é recusado ao salvar. Sem benefício em vigor, o pop-up é um convite simples e o painel diz que nenhum desconto está sendo prometido.
5. A leitura pública (`GET /stores/:slug/offers`) traz o pop-up de uma loja que o ligou, é guardada em cache na web e cai quando o painel salva.
6. Tela no painel, em rota própria, a um clique da tela de cupons, com prévia ao vivo nas larguras de computador e de celular, mostrando exatamente o que o visitante lê.
7. Na vitrine: um diálogo modal acessível (foco entra e fica preso, Escape e "×" fecham, o foco volta, `aria-modal`, nomeado pelo título, página de trás inerte, sem salto de layout, respeita `prefers-reduced-motion`), imagem de um lado e chamada do outro no computador, empilhado no celular e nunca mais alto que a tela. Nas cores da loja, só por tokens.
8. Quem vê: só visitante sem sessão de cliente nesta loja. Onde: início, listagem/categoria/busca e produto — o mesmo conjunto da faixa. Nunca no carrinho, na conta, em entrar/criar conta, páginas de token, landings, painel ou prévia do modo design.
9. Gatilhos: "ao chegar" abre depois do atraso; "ao sair" abre quando o ponteiro deixa o topo da janela no computador e, no celular, pelo substituto descrito abaixo.
10. Uma vez por visitante: no máximo uma vez por carga de página; fechado ou com o botão apertado, não volta enquanto durar o cookie. O cookie é `bl_popup`, `Path=/<slug>`, `SameSite=Lax`, `Secure` em https, não `httpOnly`, e nunca é gravado numa loja com o pop-up desligado.
11. Enquanto o aviso de cookies não foi respondido, o pop-up espera.
12. Com a faixa de ofertas na mesma página, as duas não dizem a mesma coisa ao mesmo tempo.
13. O botão leva ao cadastro e volta para a página; a conta criada vê o cupom na faixa.
14. Nenhum evento novo no Pixel da Meta nem nos contadores do funil.
15. A política de privacidade nomeia `bl_popup` e a versão legal passa a `2026-10-07`, em commit próprio.
16. Blocos novos com story e teste (axe); textos em `locales` (pt-BR e en); docs do produto e mapas de superfície; `pnpm ci-check` verde; e2e completo da API verde em `harness_offers_test`; usado no navegador a 1280 e 390 px.

## Decisões

### Onde a configuração mora

1. **Tabela própria, `store_popups`, uma linha por loja** (`StorePopup`, em `prisma/schema/promotion.prisma`), escrita na primeira vez que o lojista salva — como `cashback_settings`. Colunas na `stores` engordariam uma linha lida em toda página da vitrine com nove campos que a maioria das lojas nunca usa.
2. **No módulo `promotions` da API**, ao lado do destaque público: o pop-up fala de promoção e cupom e é servido na mesma resposta.
3. **Rotas do dono:** `GET` e `PUT /stores/:slug/popup` (`StorePopupOverview`). O `PUT` é o formulário inteiro: uma chave que falta é recusada, não zerada.
4. **Leitura pública: dentro de `GET /stores/:slug/offers`**, no campo novo `popup` (`StorefrontPopup | null`). Não é uma segunda leitura: a página que desenha a faixa já fez essa, sob a tag `offers:<slug>`, e o instante em que um benefício começa ou acaba (`x-prices-change-at`) já viaja nela. `null` quando o pop-up está desligado ou nunca foi salvo — uma loja desligada não manda nada do que configurou a ninguém.
5. **Título, texto e botão são `null` quando o lojista não escreveu nada**, e então valem os padrões, que moram nos `locales` da web (a API não escreve frase de vitrine). Assim o padrão melhora sem migração e segue o idioma.

### O benefício e a verdade do texto

6. **Escolha do benefício: `AUTO`, `PROMOTION` ou `COUPON`** (`benefitSource` + `benefitId`). `AUTO` é o destaque público (`firstPurchaseHeadlineOf`, a mesma função da faixa). Uma promoção ou um cupom escolhido tem de ser desta loja, de primeira compra e, se cupom, mostrado na loja — senão o `PUT` responde `POPUP_BENEFIT_INVALID`.
7. **Escolhido e fora do ar** (pausado, encerrado, esgotado, deixou de ser mostrado): o pop-up **não anuncia benefício nenhum** e vira o convite simples. Não cai para o automático: o lojista escolheu um, e trocar por outro sem ele saber é a surpresa que a escolha existe para evitar. O painel avisa.
8. **O número só entra por `{beneficio}`.** Título, texto e botão aceitam o marcador, preenchido com as palavras do benefício real ("10% de desconto", "R$ 15,00 de desconto", "frete grátis") pela mesma função da faixa (`offerBenefitWords`). **Um desconto digitado à mão é recusado ao salvar** (`POPUP_TEXT_PROMISES_NUMBER`): um algarismo seguido de `%`, ou `R$` seguido de algarismo. Um aviso valeria só no dia em que foi dado; a recusa continua verdadeira quando o cupom mudar de 10% para 5% daqui a um mês. O custo, assumido: "100% algodão" não pode ser escrito no pop-up.
9. **Sem benefício em vigor**, um campo que usa `{beneficio}` (os padrões inclusive) mostra o convite simples daquele campo; um campo escrito à mão, sem o marcador, é mostrado como está. O botão padrão é "Ganhar cupom" quando o benefício é um cupom, "Ganhar desconto" quando é promoção (não há cupom: ela se aplica sozinha) e "Criar minha conta" sem benefício. O painel diz, com todas as letras, que nenhum desconto está sendo prometido, e a prévia mostra o que sai.
10. **Uma linha de condição, da API:** o mínimo do cupom ("Em compras a partir de R$ 50,00.") e "em produtos selecionados" para promoção que não vale para o carrinho todo. O lojista não a edita: é a letra miúda verdadeira.
11. **Padrões** (pt-BR): título "Ganhe {beneficio} na primeira compra", texto "Crie sua conta e o desconto é seu.", botão conforme o item 9. Sem benefício: "Crie sua conta na loja" / "Acompanhe seus pedidos, salve favoritos e compre mais rápido." / "Criar minha conta".

### A imagem

12. **Proporção 4:5 (retrato); tamanho recomendado 800 × 1000 px**, escrito na ajuda do campo. No computador ela ocupa a metade esquerda do pop-up, cortada para preencher; no celular vira uma faixa no alto (3:2), cortada pelo centro. É decorativa (`alt=""`): a chamada está no texto, e um campo de alt a mais é um campo a mais para errar.
13. **Sem imagem, o pop-up é o painel colorido sozinho**, mais estreito (28rem), nas cores da loja.
14. **Subida pelo caminho que já existe** (`useImageUpload` → `/api/uploads`), como o banner da categoria.

### Gatilhos

15. **`ON_ARRIVAL`**: abre `delaySeconds` depois (0 a 60; padrão 5).
16. **`ON_LEAVE`, computador** (ponteiro fino com hover): quando o ponteiro sai pelo topo da janela (`mouseout` do documento, sem destino, `clientY <= 0`).
17. **`ON_LEAVE`, celular**: não existe esse sinal. O pop-up abre quando a pessoa rola metade da página **ou** depois de 30 segundos nela, o que vier primeiro. A tela do painel diz isso ao lado da opção.
18. **Não interrompe**: se na hora de abrir houver outro diálogo aberto (menu, busca) ou a pessoa estiver digitando num campo, o pop-up espera e tenta de novo a cada segundo.

### Uma vez por visitante

19. **Cookie `bl_popup`, `Path=/<slug>`, `SameSite=Lax`, `Secure` em https, não `httpOnly`, 30 dias.** Guarda um número: a **revisão** do pop-up que a pessoa viu e fechou. Nada sobre a pessoa, nem a hora — "quando" é a validade do próprio cookie. Qualquer outro valor lido é "não viu".
20. **Revisão:** a linha `store_popups` tem um contador que sobe quando muda **o que o visitante lê** (imagem, título, texto, botão, escolha do benefício). Ligar/desligar e trocar o gatilho não mexem nele. Quem fechou a revisão 3 pode ver a 4 uma vez. Editar o próprio cupom (de 5% para 10%) não muda a revisão: o cupom não é do pop-up.
21. **Quando é gravado:** ao fechar ("×", Escape, clique fora) e ao apertar o botão. Quem viu e saiu da página sem fechar vê de novo na próxima. Numa loja desligada o componente nem é montado, então nada é gravado.
22. **O servidor lê o cookie** (`popupSeenAt`) e não monta o pop-up para quem já fechou: a página nem carrega o diálogo.
23. **Não depende do aceite de cookies**: não é rastreio, é uma escolha de interface lembrada, como o CEP (`bl_prefs`).

### Com o aviso de cookies e com a faixa

24. **Enquanto a faixa de cookies está na página, o pop-up não arma o gatilho** (`useConsent((c) => c.asking)`). Respondida, o gatilho começa a contar dali (o atraso inteiro, para não abrir no instante do clique). Loja sem pixel não tem faixa e não espera nada.
25. **Enquanto o pop-up está aberto, a faixa de ofertas fica invisível mas no lugar** (`visibility: hidden`): não diz a mesma coisa duas vezes e não faz a página pular. Fechado, ela volta e é o lembrete calmo. Nada mais muda nela.

### Onde é montado

26. **`StorefrontOffers` monta o pop-up**, no mesmo lugar da faixa: é o componente que já sabe quem está olhando e em que páginas a loja fala de oferta. Não há segunda lista de páginas. A prévia do modo design desenha o `StorefrontFrame` sem `notice`, então o pop-up não tem como aparecer lá; no painel ele só existe como prévia inerte da tela de configuração.
27. **O diálogo é desenhado fora do elemento que carrega as `--shop-*`** (portal), então recebe a paleta da loja por `shopPaletteVariables`, como a faixa de cookies.

### O painel

28. **Rota `/admin/<slug>/coupons/popup`**, com um botão "Pop-up de primeira compra" no topo das telas de cupons e de promoções. É onde o lojista cuida das ofertas, e a regra do painel é formulário em rota própria.
29. **Prévia**: o mesmo cartão que a vitrine desenha (`StorefrontPopupCard`), dentro de uma moldura de 720 ou 360 px que o lojista alterna. O cartão decide empilhar por `@container`, e por isso a prévia de celular é fiel dentro de uma tela larga.
30. **Salvar derruba `offers:<slug>`** (`revalidateOffers`): o pop-up não faz parte do catálogo.

### O texto legal

31. **`LegalVersion = "2026-10-07"`**, pelo mecanismo do BEELINK-171/271: o tipo no contrato, `LEGAL_VERSION` na API, `legalTexts.version` e as frases "Vigente desde…" na web, os testes que prendem a data. Ninguém é bloqueado nem perguntado de novo; conta nova grava a versão nova.
32. **Uma linha a mais na lista de cookies** da política, e nada além. Se alguma outra frase da política passar a soar falsa com o cookie novo, ela é citada no PR para o dono, não reescrita.

## Fora do escopo

- Recolher nome, e-mail ou telefone no pop-up; enviar e-mail ou WhatsApp a partir dele.
- Qualquer evento de "pop-up visto/clicado" — nem no Pixel, nem no funil. Uma contagem ajudaria o lojista a saber se o pop-up funciona; fica para um ticket próprio.
- Texto alternativo da imagem, agendamento do pop-up, mais de um pop-up por loja, pop-up para cliente identificado.
- Mudar a faixa de ofertas além de escondê-la enquanto o pop-up está aberto.
- Policiar palavras ("cupom", "desconto") escritas à mão numa loja sem benefício: só os números são recusados.
