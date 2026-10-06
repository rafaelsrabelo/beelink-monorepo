# Integrações numa página só

> Sem ticket: pedido direto do dono do produto em 06/10/2026, depois de ver a página em produção. Toca `apps/web` e `packages/ui`, por isso mora aqui.

## O problema

Nas palavras dele: "Tá muito mal feita, era pra a página ser a listagem de todas as integrações disponíveis; em vez de usar ícone fictício poderia usar um ícone da marca mesmo, Melhor Envio e Asaas; e se tiver conectado aparecer a flag verde de conectado. Lista e conecta com a integração na página."

Hoje `/admin/<slug>/integrations` lista só o que a loja já conectou (uma loja nova vê "Nenhuma integração conectada" e um botão), e o que há para conectar fica em outra tela, `/integrations/new`. Os ícones são um caminhão e um cartão do lucide, e o selo "Conectado" é o `default`, escuro.

## Definição de Pronto

1. `/admin/<slug>/integrations` mostra um cartão por integração disponível (Melhor Envio e Asaas), conectada ou não. Sem lista vazia e sem "Nova integração".
2. `/integrations/new` redireciona para a lista; nenhum link aponta para ela.
3. Cada cartão leva a logo da marca, vinda por prop; os dois cartões grandes (a página de cada integração) também.
4. O selo "Conectado" é verde, de token (`--success` / `--success-foreground`), por uma variante `success` do `Badge`, com story. "Precisa reconectar" continua vermelho.
5. Cada cartão diz o que a integração dá, o estado, a conta quando houver, e a ação: "Conectar", "Configurar", "Reconectar" com o aviso, ou a frase de indisponível.
6. As duas leituras em paralelo: skeleton por cartão, e a falha de uma fica só no cartão dela, com "Tentar de novo".
7. Código morto removido (`integration-list`, `integration-catalog`, `PROVIDER_ICONS`, as visões, os textos, os helpers, os testes e as stories deles, a tela "Nova integração").
8. Testes dos blocos e das telas, stories em cada estado, mapas de superfície; usada no navegador a 1280 e a 390 px, com capturas; `pnpm ci-check` verde.

## Decisões

1. **A logo é o ícone quadrado de cada marca** (`asaas-icon.png`, `melhor-envio-icon.png`), ao lado do nome escrito, com `alt=""`. As logos com o nome não servem num cartão: `asaas.svg` é toda branca (some no cartão claro) e `melhor-envio.svg` tem o nome em azul escuro, largo, e repetiria o título. Os dois SVG não são usados por nada e por isso não entram no repositório.
2. **O arquivo não é alterado.** O ícone do Melhor Envio tem fundo branco opaco; o do Asaas já vem com os cantos arredondados. O bloco só recorta os dois no mesmo raio e põe uma borda de token em volta, para o branco não sumir no cartão branco.
3. **O caminho da logo é dado do web** (`INTEGRATION_LOGOS` em `apps/web/src/lib/integration-pages.ts`) e chega aos blocos por prop: `packages/ui` não lê `public/`.
4. **Verde é um par de tokens novo**, `--success` (o fundo do selo) e `--success-foreground` (o texto), nos dois temas, com contraste AA medido (7,0:1 no claro e 8,7:1 no escuro). O `--shop-positive` que existe é da vitrine e é um verde cheio com texto branco; o painel não o usa. O painel hoje é fixado no tema claro (`forcedTheme="light"`), então o escuro só se vê no Storybook.
5. **Um cartão, quatro estados lidos e dois não lidos.** A visão de um cartão (`IntegrationCardView`) traz `connection`: `"loading"`, `"failed"`, ou `{ state, account, sandbox }` com `state` em `unavailable | disconnected | connected | needsReconnect`. O nome, a logo e a frase aparecem já durante a leitura (são fixos); só o estado e a ação viram skeleton.
6. **"Conectar" é escrito curto, e o nome acessível diz de quem** ("Conectar Melhor Envio"), porque dois cartões dividem a página. O mesmo para "Configurar" e "Reconectar".
7. **O caminho de conectar continua dito por `connectBy`**: `authorization` é âncora simples (um link do roteador faz prefetch, e buscar esse endereço já começa a autorização no Melhor Envio); `page` é o link do app para a página da integração, onde está o campo da chave do Asaas. O campo da chave não é duplicado na lista.
8. **Precisa reconectar:** o aviso, "Reconectar" pelo mesmo caminho de conectar e, quando esse caminho não é a própria página da integração (Melhor Envio), também "Configurar", para a página continuar alcançável (é lá que se desconecta).
9. **Não conectado leva o selo `outline` "Não conectado"**, como já levam os cartões grandes; nunca o verde. O selo de sandbox aparece sempre que a integração está disponível, como nos cartões grandes.
10. **A frase do cartão é nova e curta** (`summary`, uma ou duas linhas); o texto longo (`lead`) continua na página de cada integração.
11. **`/integrations/new` vira um `redirect()` na própria página**, para um favorito antigo não cair num 404.

## Fora do escopo

- A API não muda: nenhuma rota, nenhum contrato.
- Tema escuro do painel: continua fixado no claro.

## Acréscimo (06/10/2026, tarde): o cartão do BeeFlow, "em breve"

Pedido do dono depois do PR #212: um terceiro cartão na página, **BeeFlow**, "desativado por enquanto, mas já visível". O BeeFlow é um produto da própria Beelink que põe o WhatsApp da loja para avisar do pedido, mandar cupons e atender sozinho.

1. **Não é uma integração lida da API.** Não há rota, contrato nem página do BeeFlow, então ele não vira um `IntegrationProviderValue` com estado inventado. É uma lista à parte, `upcoming` (`UpcomingIntegrationView`: `product` e `logoSrc`), que `IntegrationCards` desenha depois das integrações reais com um bloco próprio, `integration-upcoming-card`. A lista mora no web (`UPCOMING_INTEGRATIONS`).
2. **Nenhuma ação.** O cartão não tem link nem botão. Um botão desabilitado ainda seria uma parada do teclado sem nada atrás; no lugar da ação fica a linha "Disponível em breve.", na altura do botão dos vizinhos, e o selo `outline` "Em breve" (neutro). O cartão tem a mesma moldura dos outros, para ler como "mais um, por vir", e não como erro.
3. **Sem preço no cartão.** O material fala em ativação por R$ 39,90; no painel isso seria um compromisso que ninguém pediu ali.
4. **A logo é o arquivo que o dono mandou**, recortado só na margem branca (o quadrado amarelo, 936 px de lado, centrado) e reduzido a 360 px: `apps/web/public/brand/integrations/beeflow.png`. Nada redesenhado. O ícone traz o nome escrito, que a 48 px mal se lê; o nome está no título ao lado.
5. **Com três cartões a grade vai a três colunas** quando a coluna da página comporta (`@4xl`), e a página passou de `max-w-4xl` para `max-w-6xl`: a 1280 px os três ficam numa linha. Em largura média são duas colunas e o terceiro fica embaixo com a largura de um cartão, sem esticar.

## Acréscimo (06/10/2026, tarde): o banner do BeeFlow na tela inicial do painel

Pedido seguinte do dono: a arte pronta do BeeFlow ("Seu WhatsApp trabalhando por você!") no topo de `/admin/<slug>`.

1. **Um bloco, `blocks/dashboard/beeflow-banner`**: a arte inteira numa moldura 16:9 (a proporção dela), cantos e borda dos cartões, como um link só para a página de Integrações da loja. Nada é cortado: no celular é a mesma arte, menor.
2. **A imagem chega ao bloco como slot, e não como caminho.** O pedido falava em caminho por prop e também em `next/image` "como o resto do web usa"; o resto do web (as fotos da landing) entrega ao bloco o próprio componente de imagem, porque `packages/ui` não importa `next/*`. Segui esse padrão: o arquivo fica em `apps/web/src/assets/images/beeflow-banner.jpg` (import estático, com dimensões e blur, sem salto de layout) e é servido por `BrandPhoto` em AVIF ou WebP na largura da tela. O original é um PNG de 1,7 MB; o arquivo guardado é a mesma arte, 1600 × 900, em JPEG de qualidade 92 (389 kB), sem nenhuma outra alteração.
3. **O nome acessível do link é o que a arte diz e depois para onde leva**: o `alt` descreve a arte, com "Ativação por apenas R$ 39,90" (o preço está desenhado, e quem não vê a imagem precisa da mesma informação), seguido de "Conheça o BeeFlow em Integrações". Aqui o preço aparece porque está na arte oficial; no cartão de Integrações continua sem.
4. **Abaixo do título da página e acima dos cartões.** O título (o nome da loja) continua sendo a primeira coisa da tela; o banner ocupa a largura do conteúdo, alinhado com a grade de cartões.
5. **Só em loja, não em site institucional.** Um site não tem pedidos para avisar nem "Integrações" no menu: o banner levaria a uma página que o menu dele não mostra. Enquanto o tipo da loja é lido, o lugar do banner fica guardado por um skeleton da mesma forma.
6. **Sem botão de fechar e sem estado guardado**: foi pedido um banner, não um aviso dispensável. Dispensar (e lembrar disso por loja ou por pessoa) pode vir depois, e pede onde guardar a escolha.

**Em aberto:** a 1280 px o banner tem 992 × 558 px e empurra os cartões de configuração para baixo da dobra. É o que "largura do conteúdo" dá com uma arte 16:9; limitar a largura (ou a altura) é uma linha, se o dono preferir.
