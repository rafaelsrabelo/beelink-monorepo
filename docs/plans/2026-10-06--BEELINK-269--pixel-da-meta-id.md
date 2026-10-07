# BEELINK-269 (X2) — a loja guarda o ID do Pixel da Meta

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre a investigação do X1 ([BEELINK-268](2026-10-06--BEELINK-268--pixel-em-dominio-compartilhado.md)), que diz que este ticket não muda com o que foi encontrado. A pilha fica `main` → X1 → **X2** → X3 (tela no painel) → X4 (consentimento) → X5 (eventos).

## O problema

O lojista não tem onde dizer qual é o pixel dele, e a vitrine não tem de onde ler. Antes da tela (X3) e do script na vitrine (X5), a API precisa guardar o ID, validado, e entregá-lo nos dados públicos da loja.

## Definição de Pronto

1. Existe a integração "Meta Pixel" no módulo de integrações da loja: uma linha de `StoreIntegration` com o provedor `META_PIXEL`, uma por loja.
2. O ID é validado como só dígitos, num intervalo de tamanho declarado; qualquer outra coisa é recusada com um código próprio e nada é gravado. O banco recusa o mesmo, por uma `CHECK`.
3. O dono da loja lê a conexão, salva o ID (ou troca o que estava) e remove; quem não é dono recebe 403, quem não entrou recebe 401.
4. O ID sai nos dados públicos da loja (`PublicStore.metaPixelId`), e volta a `null` ao remover.
5. Salvar funciona numa implantação sem `INTEGRATIONS_SECRET_KEY`: o ID não é segredo e não passa pelo cofre.
6. As formas que atravessam a rede estão em `packages/contracts`, uma vez só; a API as implementa com `satisfies`/`implements`.
7. O painel tem os handlers do BFF (`GET`, `POST`, `DELETE`), com checagem de origem e de JSON como os do Asaas, e um 2xx de escrita derruba o cache da vitrine (`revalidateStore`).
8. Swagger nas rotas novas e no campo novo da loja pública; os mapas de superfície (`apps/api/docs/README.md`, `apps/web/docs/README.md`) dizem as rotas.
9. Testes unitários e e2e de cada linha acima; `pnpm ci-check` verde.

## Decisões

1. **O ID mora numa coluna própria, `StoreIntegration.pixelId`**, e não em `secretSealed` nem em `accountId`. `secretSealed` é o que o cofre abre, e o ID não é segredo; `accountId` é, pelo comentário do esquema, "mostrado, nunca usado para agir", e o ID do pixel é justamente o que a vitrine vai usar. A coluna tem uma `CHECK` de só dígitos: mesmo um `UPDATE` feito à mão não põe na linha algo que chegaria a uma página sem escape.
2. **`secretSealed` ganha o padrão `''`** em vez de virar opcional. Uma linha do pixel não tem segredo hoje; tornar a coluna anulável mudaria o tipo em sete lugares do Asaas e do Melhor Envio (código de pagamento, com outras pilhas abertas mexendo nele) para um caso que eles nunca leem — toda leitura deles filtra pelo próprio provedor. Vazio quer dizer "nada selado". **Espaço para o X7:** o token da API de Conversões é segredo e vai selado nessa mesma coluna da mesma linha, sob `INTEGRATIONS_SECRET_KEY`; só então a chave passa a ser necessária, e só para o token.
3. **Intervalo de 10 a 20 dígitos.** A Meta não documenta o tamanho do ID; os que existem têm 15 ou 16. O intervalo recusa o que claramente não é um ID (um telefone curto, um número de pedido) e aceita um ID mais antigo ou um mais longo que venha a existir. A API tira espaços das pontas (colar do Gerenciador de Eventos traz quebra de linha) e não conserta mais nada: letras, pontuação ou espaço no meio são recusados, não limpos.
4. **As rotas seguem o Asaas**: `GET`, `POST` (salva ou troca, responde 200 com a conexão) e `DELETE` (204) em `/stores/:slug/integrations/meta-pixel`. O corpo do `POST` é `{ pixelId }`.
5. **A conexão não tem `available` nem `environment`**, que o Asaas e o Melhor Envio têm: ali dizem se esta implantação consegue conectar (tem chave, tem app). O pixel não depende de nada da implantação. Se o X7 precisar dizer "esta implantação consegue guardar o token", o campo entra lá, junto do token.
6. **Código de erro novo, `META_PIXEL_ID_INVALID`**, na união `IntegrationErrorCode`, como `ASAAS_SETTINGS_INVALID`. `INTEGRATION_KEY_INVALID` fala de uma chave recusada pelo terceiro; aqui nada é perguntado à Meta.
7. **Nada é perguntado à Meta ao salvar.** Não há API pública que confirme um ID sem token; um ID de formato certo que não existe simplesmente não recebe eventos. A tela (X3) pode dizer isso.
8. **Sem limite de taxa próprio no `POST`.** O do Asaas existe porque conectar apresenta uma credencial a um terceiro a partir do endereço da Beelink; aqui não sai chamada nenhuma.
9. **`PublicStore.metaPixelId: string | null`**, obrigatório, como `cashback`: quem monta uma `PublicStore` em teste passa a dizê-lo. É lido junto da loja (`storeInclude`), pela relação, selecionando só `pixelId` — a leitura pública não toca `secretSealed`. Como `Store` estende `PublicStore`, o dono também o recebe na loja; a fonte para a tela continua sendo a rota da conexão.
10. **Trocar o ID reinicia `connectedAt`**, como trocar a chave do Asaas.
11. **Cache da vitrine:** a leitura pública da loja (`public-api.ts`) fica sob a tag `store:<slug>`; os handlers de escrita chamam `revalidateStore(slug)` num 2xx, como os do Asaas.

## Fora do escopo

- A tela no painel, o hook de serviço e o card em Integrações (X3).
- Consentimento (X4) e carregar o script da Meta na vitrine (X5): o campo `metaPixelId` chega à vitrine e ninguém o lê ainda.
- O token da API de Conversões e qualquer chamada à Meta (X7).
- `docs/product/`: o que o lojista ganha passa a ser verdade quando a tela e os eventos existirem.

## Para os próximos tickets

- **X3:** a conexão é `MetaPixelConnection` (`status`, `pixelId`, `connectedAt`); a recusa de formato é `META_PIXEL_ID_INVALID` (400). O intervalo é 10 a 20 dígitos; a tela pode validar o mesmo antes de enviar.
- **X5:** `store.metaPixelId` já está em toda leitura pública da loja; é só dígitos por construção (DTO e `CHECK`), mas continua sendo dado: vai como argumento de `fbq`, nunca interpolado num script.
- **X7:** o token vai selado em `secretSealed` da linha `META_PIXEL`. Trocar o `pixelId` deve apagar o token (um token é de um pixel), e remover a integração já apaga a linha inteira.
