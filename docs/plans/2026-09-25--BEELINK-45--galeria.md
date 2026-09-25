# BEELINK-45 — A galeria da página do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> D5 do épico BEELINK-40 (página do produto). Empilhado sobre o D7 (BEELINK-47). Comparado com
> `docs/plans/design-handoff/design/5b-loja-pagina-produto.html` a 1440px e a 390px.

## O pedido

A galeria de 5b: miniaturas em coluna ao lado de uma foto de 560px, o desconto no canto da foto, zoom
sob o cursor e as fotos em tela cheia no clique. No toque, a foto passa com o dedo.

## Definição de Pronto

1. A 1440px, miniaturas de 64×64 em x=32, 8px entre elas; a foto em x=108, 560px de altura, raio 16.
2. No máximo cinco miniaturas; "+N" (12px, apagado) abre a tela cheia na primeira que ficou de fora.
3. A miniatura da foto em exibição tem `aria-pressed` e borda de 2px; as outras, 1px na moldura.
4. O desconto no canto da foto, a 14px/14px, com respiro de 5×10px e raio 8px.
5. "Passe o mouse para ampliar · clique para tela cheia" 10px abaixo, 12px — só onde há ponteiro que
   paira.
6. Zoom de 2× sob o cursor, só com mouse.
7. Tela cheia: setas, ← e →, contador anunciado, Esc fecha e o foco volta para a foto; a paleta da loja
   vai junto para o portal.
8. No celular: foto quadrada, miniaturas numa linha embaixo, e o dedo passa as fotos — também antes do
   script chegar. A miniatura pressionada acompanha a foto.
9. Só a primeira foto carrega de imediato; as outras quando chegam perto.

## Decisões

### 1. Uma faixa com snap nativo, não um carrossel

Cada foto é um slide de uma faixa com `scroll-snap`: o dedo, o trackpad e o shift+roda passam as fotos
com o navegador sozinho, antes da hidratação. As miniaturas e a tela cheia movem a faixa, e a posição
da faixa diz qual miniatura está pressionada (`useSnapIndex`). Embla foi descartado pelo mesmo motivo
do `ScrollRail`: ele toma o overflow, e sem script só a primeira foto seria alcançável.

### 2. A foto vem primeiro no HTML

A ordem do foco segue a leitura: a foto e depois as miniaturas. Numa tela larga, `order-first` põe a
coluna de miniaturas à esquerda, como em 5b. Só a foto em exibição entra no Tab; as outras são
alcançadas pelas miniaturas.

### 3. Zoom só numa foto que aguenta

O zoom transforma a imagem dentro do próprio slide (`overflow-hidden`), para não virar rolagem na
faixa, e não acontece numa foto que mal passa do tamanho da caixa — só borraria.

### 4. "+N" é um botão

Em 5b é texto. Como texto não leva a lugar nenhum; como botão, abre a tela cheia nas fotos que não
couberam.

### 5. A borda da miniatura escolhida é a tinta

Como no seletor (BEELINK-91): uma cor de loja clara fica abaixo de 3:1 sobre o branco.

## Fora de escopo

- Coração de favoritos (sem favoritos), miniatura de vídeo (a API não tem vídeo), o rótulo "Tabela"
  (arte do design) e setas sobre a foto (5b não tem; a tela cheia tem).
- Redimensionar as fotos: as miniaturas baixam o original, porque só há uma URL por foto.

## Revisão (25/09/2026)

Três leituras independentes, cada achado verificado por um revisor que tentou refutá-lo. Dez
confirmados (seis distintos), todos corrigidos; quatro rejeitados.

- **← e → na foto levam o foco junto.** Antes a faixa andava e o foco ficava na foto anterior, fora
  da tela, e Enter abria a foto errada.
- **As miniaturas cabem na linha do celular.** Elas encolhem até caber, com o "+N" junto, em vez de
  rolar escondidas: a 390px, cinco de 56px e o "+2" dentro dos 343px da coluna. Sem rolagem, o
  contorno do foco também deixa de ser cortado.
- **As setas da tela cheia continuam focáveis nas pontas** (`aria-disabled`), sem jogar o foco para o
  corpo da página.
- **O selo de desconto deixa o ponteiro passar**, então o zoom e o clique funcionam também sobre ele.
- O teste do "+3" confere que a tela cheia abre na sexta foto.
