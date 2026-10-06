# BEELINK-265 (W6) — quatro modelos de página inicial para a loja online

> Épico W (BEELINK-259), "Templates do modo design". Feito antes do W4, de propósito: a galeria precisa de modelos de página inicial para mostrar. A pilha fica `main` → W1 → W2 → W3 → **W6** → W4 → W5 → W7.
> Planos anteriores: [BEELINK-260](2026-10-06--BEELINK-260--catalogo-de-modelos.md), [BEELINK-261](2026-10-06--BEELINK-261--aplicar-modelo.md) e [BEELINK-262](2026-10-06--BEELINK-262--previa-do-modelo.md).

## O problema

O catálogo não tem nenhum modelo para a página inicial de uma loja online: a rota de listar responde lista vazia, e o lojista só tem a página padrão (vantagens + uma vitrine). Aplicar e a prévia já funcionam; faltam os modelos.

## Definição de Pronto

1. Quatro modelos de página inicial para `ECOMMERCE` no catálogo, cada um com uma composição diferente dos tipos de seção que já existem: vitrine com capa, por categorias, ofertas, catálogo enxuto.
2. Cada um é preenchido com o que a loja tem: produtos mais novos, em oferta, categorias e as vantagens das formas de pagamento.
3. Em loja sem produto, sem foto ou sem categoria, cada modelo aplica sem buraco e sem id inexistente: a faixa que não teria o que mostrar não é gravada.
4. Nenhum texto promete o que a loja não disse.
5. Nome e descrição de cada um nos locales do `packages/ui` (pt-BR e en); categorias de loja indicadas em cada entrada.
6. `GET …/page-templates` responde os quatro para a inicial de loja online; a prévia e o aplicar funcionam com eles.
7. A página padrão de uma loja nova não muda.
8. Testes unitários de cada modelo (loja cheia e loja vazia) e e2e: listar, prévia, aplicar numa inicial com barra de aviso e conteúdo, publicar e ler a vitrine pública. A vitrine garantida na inicial, que o W2 deixou sem e2e, ganha um.
9. As rotas chamadas ao vivo uma vez; `pnpm ci-check` verde.

## Decisões

1. **Os ids** são `vitrine-com-capa`, `por-categorias`, `ofertas` e `catalogo-enxuto`, num tipo novo do contrato, `HomeTemplateId`, que entra na união `TemplateId`. Não entram em `PageTemplateId` (o que `POST /stores` aceita) nem em `LandingTemplateId`.
2. **Nenhum modelo pede produto nem categoria** (`needs: []`). Uma página inicial fala da loja inteira; o que a preenche é lido da loja, não escolhido pelo lojista. Consequência: `PAGE_CATEGORY_REQUIRED` e `PAGE_CATEGORY_INVALID` continuam sem modelo que os alcance pela rota (o ticket pedia o e2e "se algum modelo pedir categoria"; nenhum pede), e a galeria do W4 não precisa de seletor de categoria.
3. **O assunto do modelo ganha o estoque da loja** (`TemplateSubject.shop`, um `ShopStock`): o nome da loja, quantos produtos estão na prateleira, os três mais novos com foto, quantos estão em oferta e o primeiro deles, e as categorias de primeiro nível que têm produto na prateleira. É lido por `shopStockOf` (`page-template-stock.ts`) só para o modelo que declara `readsShop`, então criar uma landing não paga essas consultas. "Na prateleira" e "em oferta" são as mesmas regras da vitrine (`ON_THE_SHELF_WHERE`, `shelfSaleOf` com as promoções rodando): o modelo não grava uma faixa de ofertas que a vitrine desenharia vazia.
4. **Faixa sem o que mostrar não é gravada** (nem escondida): sem forma de pagamento não há faixa de vantagens, sem categoria não há faixa de categorias, sem oferta não há faixa de ofertas. É diferente dos modelos de landing, que gravam as vantagens escondidas; o ticket pede "não é gravada". A exceção é a vitrine de todos os produtos, que é obrigatória na inicial e é o que a página padrão já grava numa loja vazia: o editor avisa que ela está vazia e por quê.
5. **A capa usa fotos de produto** (decisão 4 do épico). Com duas ou três fotos é um carrossel, com uma é capa de fundo, sem nenhuma vira título com o nome da loja. Cada foto aponta para o produto dela.
6. **"Ofertas" sem oferta não fala de oferta**: degrada para capa, novidades e todos os produtos, com palavras neutras. A loja não disse que tem oferta.
7. **"Novidades" só entra quando a loja tem mais de quatro produtos**: com menos, a faixa repetiria os mesmos produtos da vitrine logo abaixo.
8. **"Por categorias" grava uma vitrine por categoria, até quatro**, na ordem que o lojista deu às categorias, só das que têm produto na prateleira (contando as subcategorias, como a vitrine de categoria conta).
9. **Todo modelo traz a sua vitrine de todos os produtos**, então a vitrine de reserva do W2 (`openingShowcase` no fim) não é acionada por nenhum deles; continua coberta por teste unitário. O e2e novo confere o que importa: a inicial de uma loja online sai de qualquer modelo com uma vitrine, inclusive numa loja vazia.
10. **Categorias indicadas**: `vitrine-com-capa` → moda, beleza, casa e decoração, eletrônicos; `por-categorias` → mercado, petshop, suplementos, saúde; `ofertas` → alimentação, padaria, doces e bolos, bebidas; `catalogo-enxuto` → outros.
11. **A página padrão não muda** (`defaultPage`), e não entra no catálogo (decisão 5 do épico).

## Fora do escopo

A galeria (W4), o botão de aplicar (W5), escolher modelo ao criar a loja (W7), imagens que não sejam da loja.
