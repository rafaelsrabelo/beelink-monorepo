# BEELINK-270 (X3) — o painel ganha a tela "Pixel da Meta" nas integrações

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X2 ([BEELINK-269](2026-10-06--BEELINK-269--pixel-da-meta-id.md)), que guarda o ID e entrega os handlers do BFF. A pilha fica `main` → X1 → X2 → **X3** → X4 (consentimento) → X5 (eventos), e é mesclada junta.

## O problema

A API já guarda o ID do pixel e o BFF já o lê, salva e remove, mas nenhuma tela chama essas rotas. O lojista não tem onde colar o ID, não vê se está conectado e não sabe onde achar o número na Meta.

## Definição de Pronto

1. A lista de Integrações mostra um cartão "Pixel da Meta", com a marca da Meta servida pelo próprio app, o selo verde "Conectado" quando há um ID salvo e "Não conectado" quando não há; "Conectar" e "Configurar" levam à página própria.
2. Existe a página `/admin/<slug>/integrations/meta-pixel`: o caminho de volta à lista, o cartão como título (`h1`), esqueleto enquanto a conexão é lida e a falha de leitura dita com "Tentar de novo".
3. O campo do ID salva pelo BFF. Antes de enviar, valida como a API: só dígitos, de 10 a 20. Espaços e quebras de linha colados junto são tirados. Um valor inválido não é enviado e é dito numa frase; a recusa `META_PIXEL_ID_INVALID` da API vira a mesma frase.
4. Conectado, a página mostra o ID salvo, deixa trocar por outro e desconectar; desconectar pede confirmação, como o Asaas e o Melhor Envio.
5. A página traz o passo a passo de onde copiar o ID (Gerenciador de Eventos → Fontes de dados → o pixel → o ID) e diz que **não** é preciso verificar o domínio na Meta.
6. A página avisa que os relatórios e a criação dos anúncios continuam na Meta.
7. Os dados passam por hooks do TanStack Query em `services/integrations`; depois de salvar ou remover, a página e a lista leem a mesma conexão.
8. O texto existe em pt-BR e em inglês, nos arquivos de locale, e nenhuma frase promete que eventos estão sendo enviados.
9. Blocos novos têm story e teste com axe; os mapas de superfície (`apps/web/docs/README.md`, `packages/ui/docs/README.md`) dizem o que entrou; `pnpm ci-check` verde.

## Decisões

1. **A marca da Meta é um arquivo SVG em `apps/web/public/brand/integrations/meta-icon.svg`**, ao lado dos PNG do Asaas e do Melhor Envio, e chega aos blocos por `logoSrc` como as outras. O traço é o do símbolo da Meta como o Simple Icons o publica (conferido no pacote, versão 15), no azul da marca sobre um quadrado branco, porque `IntegrationLogo` desenha um quadrado de 48 px. Um arquivo em `public/` não passa pelo portão de cores, que olha `src/`. Nada é carregado de fora.
2. **O cartão da lista é o genérico** (`IntegrationCard`), com `connectBy: "page"` como o do Asaas. O pixel não tem "indisponível nesta instalação", sandbox nem "precisa reconectar": a fatia de texto que todo provedor compartilha é dividida em duas — `IntegrationCardMessages` (o que todo cartão diz) e `IntegrationProviderMessages` (isso mais o que só uma conta de terceiro tem) — em vez de escrever frases para estados que o pixel nunca tem.
3. **O estado é o do contrato, sem inventar outro:** `CONNECTED` é "há um ID salvo". O selo diz "Conectado" porque é a regra da página de Integrações; o texto em volta diz o que isso significa aqui (o ID está guardado), sem falar de eventos.
4. **A validação mora em `packages/ui/src/lib/integrations.ts` (`metaPixelIdOf`)** e o formulário a aplica ao enviar, com a frase vinda do locale. O campo é controlado, sem máscara: o ID não é segredo (o do Asaas é, e por isso é diferente). Tira **todo** espaço em branco, inclusive no meio — a API só tira das pontas, mas um número colado com espaços ou quebras continua sendo o mesmo número. Letras, pontuação ou um trecho de código continuam recusados, não limpos, como na API.
5. **Salvar escreve a resposta direto no cache** (a API responde com a conexão); remover lê de novo, como o Asaas.
6. **O passo a passo e os avisos são um bloco próprio (`MetaPixelGuide`)**, embaixo do cartão, visível conectado ou não: quem troca o ID precisa dele tanto quanto quem conecta. O link do Gerenciador de Eventos (`https://business.facebook.com/events_manager`) abre em nova aba, com `noopener noreferrer`; o endereço responde com o redirecionamento para o login da Meta, conferido por `curl`. Os nomes dos menus da Meta em português ("Fontes de dados", "conjunto de dados") vêm do que conheço da interface, não foram conferidos numa conta.
7. **O texto é verdadeiro hoje e no dia em que a pilha for ao ar.** Depois deste ticket o ID só fica guardado; a vitrine passa a usá-lo no X5. Por isso nenhuma frase diz "eventos sendo enviados" nem "a loja ainda não envia": o texto diz para que serve o pixel, que aqui se informa o ID, que o bee-link não confere o ID com a Meta (decisão 7 do X2), que não é preciso verificar o domínio, e que relatórios e anúncios ficam na Meta. O aviso sobre consentimento do visitante é do X4, e o que é enviado é do X5: cada um acrescenta a sua frase.
8. **A data em que o ID foi salvo aparece** ("Salvo em"), no fuso de São Paulo, formatada na tela e entregue pronta ao bloco.
9. **Sem e2e de Playwright novo.** Os vizinhos não têm um para as páginas de integração; a cobertura é a dos testes de componente, de hook e de tela. A tela real é olhada uma vez, à mão, com o banco `harness_meta_pixel`.

## Fora do escopo

- A API e os contratos: nada falta para esta tela.
- Carregar qualquer script da Meta (X5) e o aviso de consentimento (X4).
- O campo do token da API de Conversões e o botão de evento de teste (X7).
- `docs/product/`: o que o lojista ganha passa a ser verdade quando os eventos existirem (X5).
