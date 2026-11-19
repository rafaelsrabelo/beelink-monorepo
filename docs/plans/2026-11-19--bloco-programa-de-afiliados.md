# O banner de afiliados vira um bloco do modo design

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Sem ticket. Pedido do dono do produto em 19/11/2026, pela Mutante Suplementos: "o cliente criou um
> banner pra afiliados, então não faz sentido mais o componente lá embaixo; esse componente é pra
> aparecer no modo design (componente de afiliados) e posso ocultá-lo lá". Segue o plano
> 2026-11-14 (página "Seja afiliado"), que pôs o banner no fim da home por uma chave da página de
> afiliados. Área: contracts, API, web, ui · Tipo: mudança · Tamanho: M.

## Objetivo

O convite para ser afiliado deixa de ser desenhado sozinho no fim da página inicial. Ele passa a ser
um bloco do modo design, **"Programa de afiliados"**, que o lojista adiciona onde quiser, move,
oculta e exclui como qualquer outro bloco, e que vale ao publicar.

## Decisões (com o dono do produto, 19/11/2026)

1. **Um tipo novo de componente, `AFFILIATE_JOIN`**, e não uma linha fixa no fim da home. Escolhido
   entre os dois: o bloco se comporta como os outros (mover, ocultar ao publicar, excluir); a linha
   fixa só teria Ocultar, valendo na hora.
2. **Sem migração de dados.** Só a Mutante mostrava o banner, e ela quer tirá-lo. O banner automático
   some de todas as lojas; quem quiser adiciona o bloco. A coluna `affiliate_pages.homeBanner` e a
   chave "Banner na página inicial" do painel saem: uma coluna sem leitor é o que este repositório
   não guarda.
3. **Os textos continuam na página de afiliados** (`bannerTitle`, `bannerText`, `bannerCta`, com
   `{loja}` e `{comissao}`). O bloco não tem conteúdo próprio: o painel diz onde editar e leva lá.
   Um texto só, em um lugar, para o banner do bloco e para a faixa do topo.
4. **Resolvido na leitura, como o produto em destaque.** O rascunho guarda o bloco sem `items`; a
   leitura da página (`lookupsOf`) põe nele os textos e as taxas da página de afiliados quando ela
   está no ar, e nada quando não está — e um bloco vazio não aparece na loja. Assim a loja, as landing
   pages, a prévia do modo design e o aviso do Publicar leem a mesma coisa.
5. **Nunca sob o nome de um afiliado.** No sub-site de um afiliado o bloco não é desenhado, pela
   mesma regra do banner de antes (`recruitingOf`): ali a loja é a vitrine de quem trouxe o visitante.
6. **Só em loja.** O bloco fica em "Produtos e venda", que um site institucional não oferece.

## Desenho

- `ComponentKind` ganha `AFFILIATE_JOIN` (migração só do enum, mais a remoção da coluna). Sem
  formatos, sem `items` gravados, com largura (`span`) como qualquer bloco.
- `PageLookups.affiliateJoin`: `PublicAffiliateJoinBanner` (`rateBps`, `maxRateBps` e os três
  textos da loja) ou `null`. A leitura pública da loja reaproveita a leitura da página de afiliados
  que já fazia.
- Publicar avisa `AFFILIATE_PAGE_CLOSED` quando um bloco visível não tem o que mostrar.
- Vitrine: `StorefrontAffiliateJoinBanner` vira só o cartão, sem margem própria (a faixa dá a
  margem), e o renderizador preenche `{loja}` e `{comissao}` com o nome da loja que recebe.
- Modo design: miniatura, nome e linha na galeria, a nota "os textos ficam na página de afiliados"
  no Conteúdo, e o porquê de um bloco vazio ("a página de afiliados não está no ar").

## Fora de escopo

- Formatos do bloco (faixa, cartão). Um só agora; um segundo é um valor de `ComponentDisplay`.
- Textos próprios por bloco. Se dois blocos precisarem dizer coisas diferentes, é outro plano.
