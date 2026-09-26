# BEELINK-129 — Páginas: a página inicial e landing pages

*Escrito em 2026-09-26, ao começar o ticket. Épico I (BEELINK-123).*

## O que muda

Hoje a loja tem uma página, a de `/<loja>`. Com este ticket ela passa a ter páginas. A inicial continua
onde sempre esteve. As landing pages ficam em `/<loja>/lp/<endereço>`, e o lojista cria cada uma a
partir de um modelo, já preenchida com o produto que escolheu.

## Quatro PRs, empilhados

1. **Modelo, API e modelos de página** (contratos + API; o web não muda).
2. **A landing na vitrine**, em `/<loja>/lp/<endereço>`, com ou sem o topo e o rodapé da loja.
3. **O modo design edita qualquer página**: aba Páginas e seletor de página na barra de cima.
4. **"Nova landing page" e as configurações da página**: nome, endereço com "disponível", modelo,
   produto principal, menu, topo e rodapé, SEO.

## Definição de Pronto

1. Modelo `StorePage`, com:
   - loja e tipo (inicial ou landing);
   - endereço único na loja;
   - título;
   - usa ou não o topo e o rodapé;
   - aparece ou não no menu;
   - SEO: título, descrição e imagem;
   - status: rascunho, publicada ou arquivada.
2. As faixas pertencem a uma página. A migração cria a página inicial de cada loja, publicada, e põe
   nela todas as faixas de hoje.
3. API do dono:
   - listar, criar a partir de um modelo e editar (nome, endereço, SEO, menu, topo e rodapé, publicar,
     arquivar);
   - saber se um endereço está livre;
   - ver a prévia de qualquer página.
4. Vitrine: a landing publicada responde em `/<loja>/lp/<endereço>`. Rascunho e arquivada respondem 404.
5. Os modelos criam as seções já preenchidas com o produto escolhido:
   - Lançamento de produto;
   - Promoção relâmpago;
   - Coleção ou categoria;
   - Em branco.
6. Editor:
   - aba Páginas;
   - seletor de página na barra de cima;
   - diálogo "Nova landing page";
   - configurações da página.
7. **Aceite:** criar "Lançamento" com um produto, publicar e abrir `/<loja>/lp/<endereço>` com as
   seções preenchidas.

## Decisões

### O modelo

- **A inicial também é uma página.** Uma loja tem uma só, sempre publicada e sem endereço próprio:
  - um índice único parcial garante "uma inicial por loja";
  - um CHECK garante "a inicial não tem endereço; uma landing sempre tem".

  Assim toda faixa tem página, e as regras que já existem (ordem, duplicar, mover) valem em qualquer
  página sem caso especial.
- **As rotas de faixas continuam as mesmas.** Listar, criar e reordenar aceitam `?pageId=`. Sem ele, a
  rota age na inicial, como sempre agiu. As outras rotas já endereçam a faixa ou o bloco pelo id, e a
  página vem junto.
- **O que continua sendo da loja, e não da página:**
  - A barra de aviso é uma só por loja e fica na inicial. A landing desenha a da inicial quando usa o
    topo, e o editor recusa uma barra numa landing (`COMPONENT_KIND_HOME_ONLY`).
  - A vitrine obrigatória (não apagar a última) vale só na inicial. `/<loja>` não pode ficar sem
    produtos, mas uma landing pode.
- **Nada muda de página.** Mover um bloco para uma faixa de outra página responde como faixa que não
  existe. Duplicar põe a cópia na mesma página do original.
- **Formulário de contato só recebe mensagem de página publicada.** Numa landing em rascunho, ninguém
  viu o formulário.
- **`lp` fica reservado** entre os segmentos que uma categoria não pode usar, porque `/<loja>/lp` seria
  lido como categoria.

### A API

- **Rotas de páginas:**
  - `GET/POST /stores/:loja/pages`;
  - `GET /pages/availability?slug=&except=`;
  - `PATCH /pages/:id`;
  - `GET /pages/:id/preview`.
- **A vitrine tem um caminho próprio:** `GET /stores/:loja/landings/:endereço`, público. Fica fora das
  rotas do dono pelo mesmo motivo do catálogo: duas guardas no mesmo caminho é onde um `@Public()` no
  lugar errado abre a outra.
- **O endereço é normalizado pela API**, com a mesma função do resto (`slugify`), até 60 caracteres. Sem
  endereço, ele vem do nome.
- **Endereço ocupado dá 409 (`PAGE_SLUG_TAKEN`).** A API confere sob o lock da loja, e o índice único é a
  garantia final.
- **Publicar grava `publishedAt`** a cada volta ao ar.
- **Arquivar é como se tira uma landing do ar.** Não há apagar: arquivada, ela pode voltar.
- **A inicial não é editada aqui (`PAGE_HOME_FIXED`).** O endereço e o nome dela são os da loja.
- **O menu da loja** (`PublicStore.pages`) lista as landings publicadas marcadas para o menu. O campo é
  opcional no contrato porque uma loja em cache pode não ter ele ainda.

### Os modelos

Os textos são em pt-BR, pelo mesmo motivo das faixas com que uma loja nasce.

- **Lançamento:**
  - banner dividido com a foto do produto;
  - "Por que você vai gostar" com a descrição dele;
  - o produto numa vitrine de um;
  - as vantagens da loja em cartões;
  - "Mais novidades".
- **Promoção relâmpago:**
  - banner com a foto ao fundo ("<produto> em oferta");
  - "Oferta relâmpago" com o produto;
  - "Mais ofertas";
  - as vantagens.
- **Coleção:** banner da categoria do produto, um texto, a categoria inteira em grade e as vantagens.
  Um produto sem categoria vira a página do produto, com as novidades.
- **Em branco:** só um título.
- **Nos três primeiros:**
  - o produto é obrigatório (`PAGE_PRODUCT_REQUIRED`), e o de outra loja é recusado;
  - um site só tem o Em branco;
  - sem foto, o banner vira título;
  - a imagem do SEO nasce com a foto da capa.

## Fora do escopo

- Topo próprio por página: topo e rodapé são globais, e a landing só escolhe se usa.
- Histórico de endereços. Renomear o endereço quebra o link antigo, e isso foi aceito.
- Apagar landing: arquivar resolve.
- Os tipos novos do I7 entram nos modelos quando chegarem.

## Riscos

- **A coluna `pageId` é NOT NULL.** A API antiga não a escreve, então a migração e a API sobem juntas.
- **Arquivos perto do limite de 250 linhas** no web: `design-screen`, `storefront-frame` e
  `storefront-window`. Os PRs 2 e 3 começam extraindo partes deles.
- **O que cortar primeiro, se apertar:**
  - o campo da imagem de SEO;
  - os links de páginas na barra de categorias;
  - despublicar;
  - o fallback da coleção sem categoria.
