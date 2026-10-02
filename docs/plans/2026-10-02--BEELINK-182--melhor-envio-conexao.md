# BEELINK-182 — N1: conectar a conta Melhor Envio da loja

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180), primeiro ticket de código. O N0 (BEELINK-181, o aplicativo no Melhor Envio
> e a homologação) é do Rafael, que já tem o aplicativo de sandbox. Decidido em 02/10: o Épico N vem
> antes do Q, e o Q passa a ser o Asaas, com a conta do próprio lojista — o cofre de credenciais deste
> ticket serve aos dois.

## Definição de Pronto

1. **Autorizar.** O dono da loja pede para conectar e recebe o endereço de autorização do Melhor
   Envio, com o `client_id`, o `redirect_uri` fixo, os escopos e um `state` de uso único, ligado à
   loja e à pessoa que pediu, que vence em 10 minutos.
2. **Retorno.** O retorno troca o `code` pelos tokens, lê a conta (`/api/v2/me`) e grava a conexão.
   Um `state` desconhecido, vencido, já usado, de outra loja ou de outra pessoa é recusado
   (`INTEGRATION_STATE_INVALID`) sem chamar o Melhor Envio.
3. **Tokens cifrados.** O `access_token` e o `refresh_token` ficam cifrados (AES-256-GCM) com a
   chave do env, presos à loja e ao provedor (um texto cifrado copiado para outra linha não abre).
   Um arch-gate proíbe o campo cifrado fora de `modules/integrations`.
4. **Renovação.** Um token a menos de 5 dias de vencer é renovado antes de ser usado, e uma rotina
   renova os que vencem em 7 dias, para uma loja parada não perder o `refresh_token` de 45 dias.
   Duas renovações ao mesmo tempo não gastam o mesmo `refresh_token` (trava na linha).
5. **Estado visível.** `GET` diz se o Melhor Envio está disponível nesta instalação, e se a loja está
   conectada, precisa reconectar (o Melhor Envio recusou a renovação) ou não está conectada, com o
   nome e o e-mail da conta e quando o acesso vence.
6. **Desconectar** apaga os tokens.
7. **Só o dono.** Outra pessoa recebe `STORE_FORBIDDEN`; sem configuração, as rotas que falam com o
   Melhor Envio respondem `INTEGRATION_UNAVAILABLE`.
8. **Web.** As rotas BFF: o estado, começar a conexão (redireciona o navegador ao Melhor Envio), o
   retorno fixo `/api/integrations/melhor-envio/callback` e desconectar. A tela do painel é do N2.
9. Testes unitários do cofre e do cliente, e2e da API com um Melhor Envio falso, testes das rotas
   web; `.env.example`, docs e `pnpm ci-check` verde.

## O que entra

- **contracts:** `integration.ts` — `IntegrationStatus`, `MelhorEnvioConnection`,
  `IntegrationAuthorization`, `MelhorEnvioCallbackPayload`, `MelhorEnvioConnected`, os códigos de erro.
- **API, `modules/integrations/`:**
  - `secret-vault.ts`: cifrar e abrir, com o contexto (loja e provedor) como dado autenticado.
  - `melhor-envio/melhor-envio.client.ts`: autorizar, trocar o código, renovar, ler a conta.
  - `melhor-envio/melhor-envio-connection.service.ts`: o fluxo, o estado, desconectar e
    `accessTokenFor(storeId)` — a única porta para os tickets seguintes pegarem um token válido.
  - `melhor-envio/melhor-envio-refresher.ts`: a rotina de renovação (a cada hora, fora dos testes).
  - Prisma: `StoreIntegration` (uma por loja e provedor) e `IntegrationOAuthState`.
- **web:** as quatro rotas BFF.
- **env:** `MELHOR_ENVIO_ENV` (sandbox ou produção), `MELHOR_ENVIO_CLIENT_ID`,
  `MELHOR_ENVIO_CLIENT_SECRET`, `MELHOR_ENVIO_REDIRECT_URI`, `MELHOR_ENVIO_CONTACT_EMAIL` (vai no
  `User-Agent`, que o Melhor Envio exige) e `INTEGRATIONS_SECRET_KEY` (32 bytes em base64). Os quatro
  primeiros e a chave vão juntos ou nenhum.

## Decisões deste ticket

1. **Um campo cifrado só, com um JSON dentro.** O Melhor Envio guarda `{ accessToken, refreshToken }`;
   o Asaas vai guardar `{ apiKey }` na mesma coluna. Um provedor novo não muda o esquema.
2. **O texto cifrado é preso à linha.** Loja e provedor entram como dado autenticado do GCM: quem
   copiar o campo de uma loja para outra no banco recebe um erro, não o token da outra loja.
3. **O `state` fica no banco, preso à pessoa e à loja**, e não num cookie como no Google: o retorno
   chega com a sessão do painel, e quem não é quem começou é recusado. Isso fecha o ataque de fazer a
   vítima conectar a conta Melhor Envio do atacante.
4. **O retorno é uma rota da web, não da API.** A API não é pública (só o socket é). O endereço é um
   só para todas as lojas, cadastrado uma vez no aplicativo do Melhor Envio: a loja vem do `state`.
5. **Escopos pedidos:** os que o épico usa até o N7 — `users-read`, `transactions-read` (saldo),
   `shipping-calculate`, `shipping-companies`, `cart-read`, `cart-write`, `shipping-checkout`,
   `shipping-generate`, `shipping-print`, `shipping-preview`, `shipping-tracking`, `shipping-cancel`,
   `orders-read`. A documentação não diz qual escopo cada rota exige; confirmar no sandbox no N4–N6.
6. **Renovação falha de dois jeitos.** O Melhor Envio recusou (`400`/`401` no token): a conexão vira
   "precisa reconectar". O Melhor Envio não respondeu: a conexão continua e a rotina tenta de novo.
7. **O documento (CPF/CNPJ) da conta não é copiado para o bee-link.** A etiqueta (N6) lê o remetente
   da própria conta no Melhor Envio; aqui só o nome e o e-mail, para o lojista ver qual conta ligou.

## Fora de escopo

- A tela Integrações no painel (N2), o saldo da carteira e os serviços (N2).
- Revogar a autorização no Melhor Envio ao desconectar: a API dele não documenta como; o lojista
  remove o aplicativo pelo painel do Melhor Envio se quiser.
- Rotação da chave do cofre (o prefixo `v1` deixa o caminho aberto).
- O Asaas (Épico Q): só o cofre é feito pensando nele.
