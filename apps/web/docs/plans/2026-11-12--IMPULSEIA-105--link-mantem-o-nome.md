# IMPULSEIA-105 — o link do afiliado mantém o nome no endereço

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Correção do link na vitrine do épico [Afiliados](../../../../docs/plans/2026-10-24--afiliados.md),
> vinda do teste do Rafael em produção, com #305–#315 já na `main`.

## O pedido

Rafael, 12/11/2026:

> "cliente tem domínio https://mutantesuplementos.com.br/, quando acesso pelo link
> https://beelink.biz/mutante-suplementos/margarida ele direciona pra https://mutantesuplementos.com.br
> sem o nome da pessoa na url, é importante ter nome da url pra saber que tá no site do afiliado"

## O que acontecia

- O proxy já manda o endereço da plataforma para o domínio da loja **com o caminho**:
  `beelink.biz/mutante-suplementos/margarida` → `mutantesuplementos.com.br/margarida` (308).
- Aí a página do segmento (`app/[slug]/[section]/page.tsx`, AF5) **redirecionava** `/<loja>/<nome>`
  para a página inicial da loja com `?afiliado=<nome>`, e, quando o link não credita ninguém (afiliado
  pausado ou encerrado, programa desligado, `AFFILIATE_LINKS_ENABLED` desligado), para a página inicial
  sozinha. O nome sumia do endereço.

## Definition of Done

1. `/<loja>/<nome>` — e `/<nome>` no domínio próprio — **desenha a página inicial da loja ali mesmo**,
   200, sem redirecionar; a barra de endereço continua mostrando o nome.
2. Quando o link credita o afiliado: o cartão "Você chegou pela indicação de…", e a chegada é contada
   pelo nome do caminho (o mesmo `/[slug]/api/affiliate-arrival` de sempre).
3. Quando o link não credita ninguém: a página inicial no mesmo endereço, sem cartão e sem gravar nada.
   Um segmento que não é de ninguém continua 404.
4. `?afiliado=<nome>` em qualquer outra página continua funcionando como antes, e as UTMs do endereço
   continuam sendo lidas.
5. A página inicial em `/<nome>` aponta o `canonical` para a página inicial da loja e é `noindex`: o
   Google não indexa uma página inicial por afiliado.
6. Testes: a página do segmento, o cartão, a chegada e o proxy reescrevendo `/<nome>` no domínio próprio.

## Decisões

### Desenhar no lugar, e não redirecionar

O redirecionamento existia para a chegada ser lida de um lugar só, o `?afiliado=` do endereço. A
chegada passa a receber o nome também da página: a página inicial desenhada em `/<nome>` diz à chegada
e ao cartão qual nome o endereço carrega. É a mesma página inicial, montada pelo mesmo componente, para
as duas não divergirem.

### O cartão e a contagem continuam iguais

O cartão aparece quando o nome do endereço é o do afiliado que a loja credita, como antes com o
`?afiliado=`. Recarregar a página não conta outra visita: o handler já reconhece a mesma visita por 30
minutos.

### `noindex` e `canonical`

Cada afiliado tem o seu endereço, e todos mostram a mesma página inicial. Para o Google, é uma página
só: `canonical` para a página inicial, e `noindex, follow`.

## Fora de escopo

- Manter o nome no endereço das páginas seguintes, depois que o cliente navega. A faixa "Comprando pela
  indicação de…" já diz isso em toda página, e o pedido carrega a indicação pelo cookie.
