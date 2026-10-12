# BEELINK-317 (AA1) — Landing: a seção "Integrações"

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Primeiro ticket da pilha: `main` → **AA1** → AA2
> (planos) → … Sai da `main`. Toca `packages/ui` e `apps/web`. O Rafael delegou as decisões deste
> épico; as que estão abaixo são do desenvolvedor, e ele pode mudar qualquer uma.

## O problema

A landing (`/`) fala de loja, checkout, chat, envios e marketing, mas não diz com que serviços a loja
do lojista se conecta. Quem já tem conta no Asaas ou no Melhor Envio, ou já anuncia na Meta, não
descobre ali que pode usá-las.

## Definição de Pronto

1. A seção `id="integracoes"` fica entre "Ecossistema" e "Como funciona" e aparece do celular ao
   computador. Na tela estreita os cartões ficam empilhados, e a 390 px a página não rola de lado.
2. São cinco cartões, nesta ordem: Asaas, Melhor Envio, Google Analytics, Meta e Beelia. Cada um tem
   a marca, o nome e uma frase.
3. Cada uma das quatro marcas tem texto alternativo.
4. O link "Integrações" existe no menu do topo, no menu do celular e no rodapé, e leva à seção.
5. A Beelia mostra "Em breve", sem link e sem botão.
6. As frases dizem só o que o produto faz hoje. As do Google Analytics e do Melhor Envio continuam
   verdadeiras com o que se sabe dos dois (ver "Atenção").
7. Os textos estão em `messages.landing.integrations`, em pt-BR e em inglês.
8. O bloco mora em `packages/ui`, com história no Storybook e teste com axe. Os testes que a landing
   já tinha continuam passando. `pnpm ci-check` verde.
9. O bloco e a seção entram nas tabelas de `packages/ui/docs/README.md` e `apps/web/docs/README.md`.
10. A página foi usada num navegador a 1280 px e a 390 px, com teclado, e há capturas das duas
    larguras.

## O que o produto faz hoje (conferido no código antes de escrever as frases)

| Integração | O que existe | Onde está |
|---|---|---|
| Asaas | Pix e cartão de crédito no checkout, cobrados na conta Asaas da loja. **Boleto não existe.** | `packages/contracts/src/payment.ts:13` (`OnlinePaymentMethod` é `PIX` ou `CREDIT_CARD`); `apps/api/src/modules/integrations/asaas/asaas.client.ts:56` ("boleto is out of the first version"); o texto do painel em `integrations.asaas.summary` |
| Melhor Envio | Frete de Correios, Jadlog e outras cotado no checkout com a conta da loja; etiqueta comprada pelo painel; rastreio gravado no pedido | `integrations.melhorEnvio.summary`; planos BEELINK-185, 187 e 188; `docs/product/README.md` ("carriers through its own Melhor Envio account") |
| Google Analytics | O painel guarda o ID de medição (GA4). **A vitrine ainda não carrega o Google Analytics** | planos BEELINK-301 e 302; nenhum `gtag` em `apps/web/src`; BEELINK-303 em Todo |
| Meta | Pixel na vitrine para quem aceita os cookies, com os eventos de navegação e a compra; a compra também pelo servidor, com o token da API de Conversões | `integrations.metaPixel` e `integrations.metaConversions`; planos BEELINK-272, 273 e 274 |
| Beelia | Nada. É o produto de WhatsApp da Beelink (antes BeeFlow), ainda por vir | decisão 2 do épico |

## Decisões

1. **O cartão do Asaas não fala em boleto.** O resumo do ticket diz "Pix, cartão e boleto", e a regra
   do mesmo ticket diz que a frase só pode dizer o que o produto já faz. O produto cobra Pix e cartão
   de crédito, e a API recusa `BOLETO`. Vale a regra: a frase diz Pix e cartão de crédito. Quando o
   boleto existir, é uma palavra a mais no dicionário.
2. **O cartão do Google Analytics fala do ID, não das visitas.** A frase diz que o lojista informa o
   ID de medição do GA4 no painel, sem colar código, e que os relatórios ficam no Google. É verdade
   hoje, com a vitrine ainda sem enviar nada, e continua verdade quando o BEELINK-303 chegar. Nenhuma
   frase diz que visitas ou vendas "aparecem" no GA4.
3. **O cartão do Melhor Envio diz o que a integração faz com a conta do lojista**, sem prometer prazo
   nem disponibilidade: frete das transportadoras no checkout, etiqueta e rastreio pelo painel. A
   frase não tem como ser verdadeira enquanto o Melhor Envio recusar as chamadas do servidor de
   produção; isso é um risco do PR, não algo que o texto resolva.
4. **O cartão da Meta junta o pixel e a API de Conversões** num cartão só, com o nome "Meta" e a marca
   que o painel usa no cartão do pixel. A frase diz "de quem aceita os cookies", que é a condição
   real do envio.
5. **A Beelia é um item da lista como os outros, sem nada que se possa acionar.** Não é link, não é
   botão e não tem `tabindex`. No lugar da marca, um ícone de conversa do lucide
   (`MessagesSquareIcon`) sobre o amarelo da marca, decorativo: o nome "Beelia" está escrito ao lado.
   O selo "Em breve" é texto, lido por um leitor de tela junto com o nome. O ícone não é o
   `MessageCircleIcon`, que a página já usa para o "Chat" do ecossistema: Beelia e Chat são coisas
   diferentes.
6. **O texto alternativo é uma frase por marca no dicionário** ("Logo do Asaas", "Logo da Meta"), e
   não um modelo com `{name}`: o artigo muda com a marca. O painel desenha as mesmas marcas com
   `alt=""` porque lá elas ficam dentro de um cartão que já tem o nome como título de um controle;
   aqui o ticket pede o texto.
7. **O bloco recebe as quatro imagens prontas**, como `LandingPosters` e `LandingBanners`:
   `logos: Record<"asaas" | "melhorEnvio" | "googleAnalytics" | "meta", ReactNode>`. `packages/ui`
   não importa `next/*`. No app, um componente pequeno (`components/landing/integration-mark.tsx`)
   desenha cada uma com `next/image`, a partir dos mesmos endereços que o painel usa
   (`INTEGRATION_LOGOS` em `lib/integration-pages.ts`): se um arquivo for trocado, a landing e o
   painel mudam juntos. Os dois PNG saem otimizados; os dois SVG saem como estão, que é o que o Next
   faz sozinho com um `src` terminado em `.svg`. O `beeflow.png` não é usado.
8. **Os cartões não se levantam sob o ponteiro.** Os de "Como funciona" se levantam, mas um cartão
   que reage ao ponteiro sugere um clique, e nenhum destes leva a lugar algum. O Rafael já tirou esse
   movimento dos banners em 02/10.
9. **Grade:** uma coluna no celular; duas a partir de 640 px; três a partir de 1024 px; cinco numa
   linha a partir de 1280 px. Onde a última linha fica incompleta, os cartões dela crescem até
   fechar a largura, em vez de deixar um buraco.
10. **Menu do topo:** "Integrações" entra como o terceiro link, na ordem da página (Soluções,
    Ecossistema, Integrações, Como funciona, Para entregadores, Perguntas). O menu do celular recebe
    a mesma lista. Se os seis links não couberem a 1280 px, a largura em que a barra troca o menu
    pelos links, o espaço entre eles diminui; nenhum link é escondido e nenhum rótulo muda.
11. **Rodapé:** um link "Integrações" no fim da coluna "Soluções", para `#integracoes`. Uma coluna
    própria com os cinco nomes daria à Beelia um link, e ela não leva a lugar nenhum.
12. **Título e apoio**, no padrão das outras seções (`LandingTitle`, uma linha leve e uma forte):
    "Conecte a loja / às suas contas." A frase de apoio diz o que os quatro serviços têm em comum:
    cada um usa a conta do próprio lojista.

## Atenção (não é para resolver aqui)

- **Google Analytics:** a vitrine ainda não carrega o GA da loja (BEELINK-303, em Todo). O cartão
  aparece na landing antes de a integração medir alguma coisa. A frase foi escrita para isso
  (decisão 2), mas o cartão por si só já sugere que funciona.
- **Melhor Envio:** em 06/10 o Melhor Envio respondia 403 às chamadas do servidor de produção. Com
  isso de pé, nenhuma loja em produção consegue conectar, e a landing anuncia a integração mesmo
  assim.

## Fora de escopo

- Preços e planos (AA2, BEELINK-318), consentimento e medição da landing, e o formulário de
  entregador (tickets seguintes do épico).
- Renomear BeeFlow para Beelia no painel (AA8, que espera a arte). O painel não muda neste ticket.
- A arte da Beelia. Quando chegar, troca o ícone num lugar só.
- Uma página por integração, ou qualquer link saindo dos cartões.
- Carregar o Google Analytics na vitrine (BEELINK-303) e o bloqueio do Melhor Envio.
- Suíte e2e e `next build`: o Docker está desligado e o disco tem cerca de 3 GB livres.
