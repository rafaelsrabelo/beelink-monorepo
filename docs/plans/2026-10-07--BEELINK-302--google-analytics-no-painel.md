# BEELINK-302 (Z2) — o painel ganha o card e a tela "Google Analytics" nas integrações

> Épico Z (BEELINK-300), "Google Analytics". Empilhado sobre o Z1 ([BEELINK-301](2026-10-07--BEELINK-301--google-analytics-id.md)), que guarda o ID de medição na API. É o X3 ([BEELINK-270](2026-10-06--BEELINK-270--pixel-da-meta-no-painel.md)) outra vez, para o Google, e segue o desenho dele arquivo por arquivo. A pilha fica `main` → Z1 → **Z2** → Z3 (vitrine, BEELINK-303).

## O problema

A API já guarda o ID de medição, mas nenhuma tela chama as rotas e o web nem tem os handlers do BFF (o Z1 os deixou para cá). O lojista não tem onde colar o ID, não vê se está conectado e não sabe onde achar o ID no Google.

## Definição de Pronto

1. A página de Integrações mostra o card "Google Analytics", com o logo do Google Analytics servido pelo próprio app, o selo verde "Conectado" quando há um ID salvo e "Não conectado" quando não há; "Conectar" e "Configurar" levam à página própria. O card espera e falha sozinho, como os outros.
2. Existe a página `/admin/<slug>/integrations/google-analytics`: o caminho de volta à lista, o card como título (`h1`), **esqueleto** enquanto a conexão é lida e a falha de leitura dita com "Tentar de novo".
3. O lojista **conecta**: o campo do ID salva pelo BFF e a página passa a mostrar o ID salvo, a data e o aviso de que foi salvo.
4. **Erro claro para ID inválido:** antes de enviar, o campo valida como a API (`G-` e de 6 a 16 letras maiúsculas ou dígitos); o que não é um ID não é enviado e é dito numa frase que diz o formato e nomeia `UA-`, `GTM-` e `AW-`; a recusa `GOOGLE_ANALYTICS_ID_INVALID` da API vira a mesma frase.
5. O lojista **troca** o ID por outro e **desconecta**; desconectar pede confirmação.
6. A página traz o passo a passo curto de onde copiar o ID (Administrador → Fluxos de dados → o fluxo da Web → o ID).
7. A página avisa que os relatórios ficam no Google Analytics, com o link.
8. Os handlers do BFF existem (`GET`, `POST`, `DELETE` em `/api/stores/[slug]/integrations/google-analytics`), com a checagem de origem e de JSON, e derrubam o cache da vitrine (`revalidateStore`) num 2xx de escrita.
9. Os dados passam por hooks do TanStack Query em `services/integrations`; depois de salvar ou remover, a página e a lista leem a mesma conexão.
10. Os textos existem em pt-BR e em inglês, nos arquivos de locale, e nenhuma frase promete que algo está sendo enviado ao Google.
11. Blocos novos têm story e teste com axe; os mapas de superfície (`apps/web/docs/README.md`, `packages/ui/docs/README.md`) dizem o que entrou; `pnpm ci-check` verde.
12. A tela foi usada num navegador: conectar, trocar, ID inválido, desconectar, o carregamento, e a lista com o logo e o selo.

## Decisões

As do épico vêm do briefing do orquestrador (só o ID, nunca um script nem Google Tag Manager; os relatórios ficam no Google, o painel não repete números). As abaixo são deste ticket, tomadas pelo desenvolvedor; o Rafael pode mudar qualquer uma.

1. **O logo é um arquivo SVG em `apps/web/public/brand/integrations/google-analytics-icon.svg`**, ao lado do da Meta, e chega aos blocos por `logoSrc`. O traço é o do símbolo do Google Analytics como o Simple Icons o publica (`simple-icons@15.0.0`, `icons/googleanalytics.svg`, baixado do unpkg), sobre um quadrado branco. O Simple Icons publica um traço só, de uma cor; o arquivo o divide nos seus três subcaminhos para pintar a barra alta no amarelo da marca e a barra média e o ponto no laranja, como o logo de verdade. Um arquivo em `public/` não passa pelo portão de cores, que olha `src/`. Nada é carregado do Google.
2. **O card da lista é o genérico** (`IntegrationCard`), com `connectBy: "page"`, depois do Pixel da Meta. Como o pixel, não tem "indisponível", sandbox nem "precisa reconectar": a fatia de texto é `IntegrationCardMessages` e mais nada desses estados.
3. **Blocos próprios, copiados dos do pixel** (`GoogleAnalyticsCard`, `GoogleAnalyticsIdForm`, `GoogleAnalyticsGuide`, `GoogleAnalyticsReports`), em vez de tornar os do pixel genéricos. O briefing pede o mesmo desenho arquivo por arquivo; generalizar mexeria nos blocos do pixel, que estão em produção, dentro de um ticket que não é deles. A duplicação fica anotada como dívida: um terceiro "ID colado" é o momento de extrair.
4. **A validação mora em `packages/ui/src/lib/integrations.ts` (`googleAnalyticsIdOf`)**, com o formato da API (`^G-[A-Z0-9]{6,16}$`). Tira todo espaço em branco, inclusive no meio, como o do pixel (um ID colado com quebra de linha continua sendo o mesmo ID). **Minúsculas são recusadas, não convertidas**, como na API (decisão 3 do Z1): a frase de recusa diz "letras maiúsculas" e a dica pede copiar e colar.
5. **O produto chama o ID de "ID de medição"** (o ticket e o briefing), e a tela diz que **o Google o mostra como "ID de métricas"**. Conferido na ajuda do Google em pt-BR (`support.google.com/analytics/answer/9539598?hl=pt-BR`, lida por `curl` em 07/10): "Em Administrador, em Configurações da propriedade, clique em Fluxos de dados … Em Detalhes do fluxo, copie o ID de métricas (começa com "G-" ou "AW-")". O passo a passo usa esses nomes de menu. Não foi conferido numa conta do Google Analytics.
6. **Os relatórios são um bloco próprio (`GoogleAnalyticsReports`)**, no lugar onde o pixel tem o caminho para "Vendas por origem": um título, a frase de que o bee-link não mostra esses números e o link `https://analytics.google.com/`, em nova aba, com `noopener noreferrer` (o endereço responde 301 para `/analytics/web/`, conferido por `curl`). O link de "Vendas por origem" não é repetido aqui: ele é do relatório de campanhas, e o ticket não o pede.
7. **O texto é verdadeiro hoje e no dia em que a pilha for ao ar.** Depois deste ticket o ID só fica guardado; a vitrine passa a usá-lo no Z3. Nenhuma frase diz que visitas ou compras estão sendo enviadas. O aviso de cookies e o que é enviado são do Z3, que acrescenta as suas frases ao "Bom saber", como o X4 e o X5 fizeram no pixel.
8. **Salvar escreve a resposta direto no cache; remover lê de novo**, como no pixel. A chave é `integrationKeys.googleAnalytics(slug)`.
9. **Sem e2e de Playwright novo**, como no X3: os vizinhos não têm um para as páginas de integração. A cobertura é a dos testes de componente, de hook, de handler e de tela, e a tela é usada à mão no navegador.
10. **`docs/product/` não muda**: o que o lojista ganha passa a ser verdade quando a vitrine enviar (Z3).

## Fora do escopo

- A API e os contratos: nada falta para esta tela.
- Carregar o `gtag`, o aviso de cookies e os eventos (Z3).
- Envio pelo servidor (Z4) e Google Ads (Z5).
- Consertar `apps/api/test/meta-pixel-without-vault-key.e2e-spec.ts` (achado do Z1, ticket próprio).
