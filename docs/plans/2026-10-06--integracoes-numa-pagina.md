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
