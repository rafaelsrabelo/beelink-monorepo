# IMPULSEIA-105 (AF5) — o link do afiliado na vitrine

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A quinta tarefa do épico [Afiliados](2026-10-24--afiliados.md), empilhada sobre AF1 a AF4. O
> desenho comum está no épico (decisões 4 e 10, "Ordem" 5, adendo de 11/11, itens B e D); aqui fica o
> que esta tarefa entrega.

## O pedido

`/<loja>/<afiliado>` e `?afiliado=` em qualquer página levam à loja de sempre, guardam quem indicou
por 30 dias (o último link vence) e mostram de quem é a indicação: um cartão na chegada, uma faixa
fina no resto da navegação e uma linha no carrinho e no checkout. As visitas pelo link são contadas
como o funil conta. Mandar o afiliado com o pedido, e a comissão, são AF6.

## Definition of Done

1. `affiliate.prisma` ganha `AffiliateVisitDay` (loja, afiliado, dia, um número), com a migração.
2. Contracts: o afiliado como a vitrine o mostra, a resposta do link, o corpo da visita e o código
   `AFFILIATE_LINK_NOT_FOUND`.
3. `GET /stores/:slug/affiliate-link?slug=` (ou `?id=`), público: `404` quando o endereço não é de
   nenhum afiliado da loja; senão o afiliado, **só** quando está `ACTIVE`, o programa está ligado e o
   interruptor da implantação está ligado — em qualquer outro caso `affiliate: null`, e a loja abre
   sem faixa. Página travada: fora do ar, como hoje.
4. `POST /stores/:slug/affiliate-visits`, público e com limite por endereço: soma um na visita do
   dia do afiliado vivo, numa instrução; responde `204` sempre e não conta nada para um afiliado que
   não credita.
5. As visitas com mais de 13 meses são apagadas junto com os contadores do funil.
6. `AFFILIATE_LINKS_ENABLED`, validado em `env.ts`: desligado por padrão, ligado no `.env.example` e
   nos e2e. Desligado, nenhum link credita, nada é contado e nenhum cookie é escrito.
7. Web: `/<loja>/<afiliado>` responde `307` para a loja com `?afiliado=<nome>`; o de um afiliado que
   não credita, para a loja sem nada; um segmento que não é de ninguém continua `404`. No domínio
   próprio, `minhaloja.com.br/<afiliado>` igual.
8. Web: `?afiliado=` em qualquer página grava `bl_affiliate` (o id e a hora, pelos dias do programa,
   no caminho da loja), conta a visita — não para um navegador com o painel aberto — e some do
   endereço. Um link novo substitui o anterior.
9. Web: o cartão na página da chegada; a faixa nas outras, que o cliente fecha sem perder a
   atribuição; e a linha "Indicação de Nome — ele verá seu nome neste pedido" no carrinho e no
   checkout. Só cores do tema da loja.
10. Mapas de superfície, `deploy.md` e o compose; `pnpm ci-check` verde, e2e novo verde, e2e inteiro
    da API verde, e o fluxo dirigido no navegador.

## Decisões

### O interruptor da implantação

`AFFILIATE_LINKS_ENABLED` na API, desligado quando ausente. O épico manda o link ir ao ar em produção
junto com a política de privacidade nova (AF9), e o programa de cada loja liga sozinho: sem o
interruptor, o primeiro lojista a ligar o programa depois do deploy já gravaria um cookie que a
política ainda não diz. A API é o único lugar que decide — desligado, ela responde `affiliate: null` e
não conta visita —, então o web não tem interruptor próprio e não pode discordar. No `.env.example` e
nos e2e ele vem ligado; no compose de produção, ausente. AF9 o liga.

### Chegar pelo caminho é chegar pelo parâmetro

`/<loja>/<afiliado>` não desenha página própria: responde `307` para `/<loja>?afiliado=<nome>`. Uma só
porta de chegada, o parâmetro, serve as duas formas do link e qualquer página que o afiliado
compartilhe. `307`, não `308`: o afiliado pode ser pausado e o link continuar existindo. O afiliado
que não credita (pausado, encerrado, programa desligado, interruptor desligado) leva à loja sem o
parâmetro: o link impresso nunca dá `404`.

A ordem do segmento é a do épico: palavra de rota, depois categoria, depois afiliado. O afiliado só é
perguntado à API quando o segmento não é nenhuma das duas primeiras — o mesmo caminho que antes dava
`404`.

### A chegada é contada pelo navegador, não pelo servidor

O parâmetro é lido por um componente do layout da loja, no navegador, como `StorefrontOrigin` lê as
UTMs. Ele chama `/<loja>/api/affiliate-arrival`, que pergunta à API pelo afiliado, conta a visita e
devolve o cookie. Pelo navegador porque a prévia de link do WhatsApp e do Instagram busca o endereço
sem rodar a página: contar no servidor contaria cada prévia como visita. A rota recusa pedido que não
vem de uma página do site, como a do funil.

Depois, o componente tira `afiliado` do endereço (`history.replaceState`) — recarregar a página não é
uma segunda visita — e pede ao servidor a página de novo (`router.refresh()`), que já lê o cookie.

### O cookie

- `bl_affiliate`, no caminho da loja (`/<loja>`, ou `/` no domínio próprio), como o carrinho e as UTMs.
- O valor é `<id do afiliado>.<milissegundos da chegada>` — nada da pessoa.
- `Max-Age` = os dias de atribuição do programa, contados da chegada; uma chegada nova recomeça.
- `HttpOnly`: só o servidor o lê — o layout, para a faixa, e AF6, no pedido. `SameSite=Lax`,
  `Secure` em produção.
- Não depende do "sim" ao pixel: é o que cumpre o acordo entre loja e afiliado (decisão 11 do épico).

### Fechar a faixa

O "×" grava `bl_affiliate_hidden` com o id do afiliado, só pela sessão do navegador, e um store em
memória tira a faixa na hora. Um link de outro afiliado volta a mostrar a faixa dele; o mesmo
afiliado fica escondido até fechar o navegador. O cartão da chegada não fecha: é uma página.

### Onde a faixa mora

O layout da loja lê o cookie, pergunta à API quem é o afiliado (resposta guardada por um minuto, sob a
tag da loja: pausar um afiliado no painel já derruba a tag) e entrega isso a um provider. O quadro da
loja (`StorefrontFrame`) põe um componente do navegador no lugar do aviso, logo abaixo do cabeçalho:
cartão se esta é a página da chegada, faixa se não. A prévia de design desenha o mesmo quadro fora do
layout, e lá o componente não acha o provider e não desenha nada. O carrinho e o checkout leem o mesmo
provider para a linha.

### As visitas

`AffiliateVisitDay` é o `StoreFunnelDay` do afiliado: uma linha por afiliado e dia, um número, escrita
por `INSERT … ON CONFLICT … + 1`, nunca lida antes. A rota segue a do funil: pública, sem cookie, o
mesmo limite por endereço (`FUNNEL_RATE_LIMIT_*`) e a mesma recusa de página fora do ar. Um navegador
com sessão do painel não conta, como no funil. A poda dos 13 meses é a do funil, na mesma passada.
Ler os números é AF7 e AF8.

### O que AF6 lê

O handler do pedido (`app/[slug]/api/orders/route.ts`) lê `bl_affiliate` com `affiliateVisitOf`
(`lib/affiliate-cookie.ts`), que devolve `{ affiliateId, visitedAt }` ou `null` — limpo, com a data
conferida —, e manda isso no corpo do pedido pelo mesmo caminho das UTMs (`order-origin.ts`). A API
confere de novo, na hora do pedido, se o afiliado credita e se a visita cabe nos dias do programa.

## Fora de escopo

- Mandar o afiliado com o pedido, a comissão e os e-mails: AF6.
- Ler as visitas no painel e na área do afiliado: AF7 e AF8.
- Editar foto e frase: AF8. Tirar foto e frase pelo lojista: AF7.
- A política de privacidade nova e ligar `AFFILIATE_LINKS_ENABLED` em produção: AF9.

## Adendo — o que dirigir no navegador mudou (12/11)

- **O `?afiliado=` fica no endereço.** O plano tirava o nome do endereço com `history.replaceState`
  logo na chegada. Na hidratação, o próprio Next refaz o `replaceState` do endereço com que a página
  carregou e o nome voltava; e saber "esta é a página da chegada" num store do navegador não sobrevive
  ao `router.refresh()` que a chegada pede — no `next dev`, o módulo do store foi avaliado de novo
  depois dele, e o cartão virava faixa. Agora:
  - o cartão é desenhado quando o endereço traz `?afiliado=` com o nome do afiliado que o cookie
    guarda (`useSearchParams`), e a faixa nas outras páginas — nenhum estado do navegador decide;
  - recarregar a página não conta outra visita: o handler da chegada não conta quando `bl_affiliate`
    já guarda o mesmo afiliado de menos de 30 minutos atrás, e mantém o instante da visita;
  - um link copiado da barra de endereço continua creditando o mesmo afiliado, o que é o que o link
    dele faria.
- **Uma chegada por endereço.** O efeito roda duas vezes no modo estrito do React; a página guarda o
  endereço que já contou e não manda a chegada de novo.
- O store em memória ficou só com "a faixa foi fechada".
