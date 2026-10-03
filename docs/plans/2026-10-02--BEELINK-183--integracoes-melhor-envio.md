# BEELINK-183 — N2: a tela Integrações → Melhor Envio

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico N (BEELINK-180). Empilhado sobre o N1 (BEELINK-182, PR #182), que fez a conexão, o cofre e o
> retorno fixo — que já cai em `/admin/<slug>/integrations?conectado=…` ou `?erro=<código>`.

## Definição de Pronto

1. **A tela existe.** `/admin/<slug>/integrations`, com "Integrações" no menu do painel.
2. **Conectar.** Sem conexão, o cartão do Melhor Envio explica o que ele faz e oferece "Conectar
   Melhor Envio", que leva ao Melhor Envio pela rota do N1. Sem o app configurado na instalação, o
   cartão diz isso e não oferece o botão.
3. **A conta ligada.** Conectado: o nome e o e-mail da conta, se é sandbox, e o saldo da carteira,
   lido na hora do Melhor Envio. Saldo que não pôde ser lido é dito como tal, nunca como R$ 0,00.
4. **Reconectar.** Quando o Melhor Envio parou de aceitar a conexão, o cartão avisa e oferece
   "Conectar de novo".
5. **Desconectar**, com confirmação.
6. **A volta do Melhor Envio é dita.** `?conectado=melhor-envio` diz que deu certo; `?erro=<código>` diz
   o que houve em português (cancelado, não começou aqui, o Melhor Envio recusou, não respondeu).
7. **Serviços.** Os serviços do Melhor Envio (PAC, SEDEX, Jadlog…), agrupados por transportadora, cada
   um ligado ou desligado. A loja que nunca escolheu tem todos ligados.
8. **Dias de manuseio**: de 0 a 30, quanto a loja leva para postar; somados ao prazo da transportadora
   no N4.
9. **Embalagem padrão**: peso (gramas) e as três medidas (centímetros), os quatro ou nenhum; usada no
   N3/N4 quando o produto não tem medidas.
10. **Só o dono** lê e grava. Testes da API (e2e), dos blocos (com axe), da tela e das rotas;
    `pnpm ci-check` verde.

## O que entra

- **contracts:** `MelhorEnvioAccountOverview` (saldo e serviços), `MelhorEnvioShippingService`,
  `MelhorEnvioSettings`, `MelhorEnvioSettingsPayload`, `ShippingPackage`.
- **API:**
  - Prisma `MelhorEnvioSettings` (uma linha por loja, criada no primeiro "Salvar"). Fica separada da
    conexão: desconectar e conectar de novo não apaga as escolhas da loja.
  - `GET /stores/:slug/integrations/melhor-envio/account`: o saldo (`/api/v2/me/balance`) e os
    serviços (`/api/v2/me/shipment/services`), com o token da loja via `accessTokenFor`.
  - `GET`/`PUT /stores/:slug/integrations/melhor-envio/settings`.
- **ui:** blocos `integrations/` — o cartão do Melhor Envio, o formulário de envio, o aviso da volta e
  o esqueleto; tipos do formulário em `lib/integrations.ts`; textos em pt-BR e en.
- **web:** a página, a tela, os hooks (TanStack Query), as rotas BFF `account` e `settings`, o item
  no menu.

## Decisões deste ticket

1. **Sem escolha salva, todos os serviços valem.** Depois do primeiro "Salvar", vale a lista salva, e
   um serviço novo que o Melhor Envio passe a oferecer entra desligado até o lojista ligá-lo: um
   frete que aparece sozinho para o cliente seria uma surpresa para a loja.
2. **O saldo é lido na hora**, a cada abertura da tela, nunca guardado: é dinheiro da carteira do
   lojista e muda fora do bee-link. Reais em decimal no Melhor Envio, centavos no bee-link: a
   conversão fica no cliente do Melhor Envio, num lugar só.
3. **A embalagem padrão usa as unidades do produto**: gramas e centímetros na tela, gramas e
   milímetros no fio, com os mesmos limites (`PARCEL_GRAMS_MAX`, `PARCEL_MM_MAX`).
4. **Dias de manuseio começam em 1**: a maioria das lojas posta no dia útil seguinte.
5. **As configurações só aparecem com a conta conectada**: sem conexão não há lista de serviços para
   escolher. A API aceita salvar de qualquer jeito (não depende do Melhor Envio).
6. **A logo da transportadora não entra**: vem de um domínio do Melhor Envio que o `next/image` não
   libera, e o nome basta para escolher.

## Fora de escopo

- Marcar produtos sem peso ou medidas (N3) e usar a embalagem na cotação (N4).
- Adicionar saldo à carteira pelo bee-link: o lojista faz isso no próprio Melhor Envio.
- O Asaas na mesma tela (Épico Q, Q2): a tela nasce com espaço para um segundo cartão.
