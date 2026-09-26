# BEELINK-124 — Bug: criar banner no modo design não funciona

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I0 do Épico I (modo design). Relato do Rafael em 25/09: "não consigo mais criar banner, tá péssimo".
> Vem antes do editor novo (I1 em diante).

## Definição de Pronto

1. Reproduzir o problema na mutante-performance e na loja-do-design.
2. Achar a causa e corrigir.
3. Um teste que falhava antes da correção.
4. Criar um banner com uma imagem e outro com três, um deles com link para um produto, e ver os dois na
   vitrine.

## A investigação

O ticket suspeitava de quatro passos: criar a faixa, abrir o formulário, enviar a imagem e salvar com
o link. Os quatro funcionam, nas duas lojas, com os dados da base de dev copiados numa base à parte:

- a faixa nasce (`POST /sections` 201) e o formulário do banner abre;
- o envio de imagem passa com 2 KB, 0,9 MB, 1,4 MB e 1,8 MB (`POST /uploads` 200), e recusa 3 MB com
  a frase "A imagem passa de 2 MB. Escolha uma menor.";
- salvar um banner de uma imagem e outro de três, com o primeiro slide ligado a um produto, responde
  200, e as imagens aparecem no HTML da vitrine.

O que o teste no celular escondia: **no computador não havia nenhum botão de adicionar à vista.** O
`abb2c7f` (24/09, 02:19 — a noite antes do relato) trocou o "Adicionar bloco" visível por "+" entre as
faixas, e esses "+" ficam com `opacity-0` até o ponteiro passar por uma faixa de 12 px de altura
(`insert-point.tsx`). Em tela de toque eles aparecem sempre (`pointer-coarse`), por isso o fluxo
funcionava no celular. Com mouse, a lista de faixas não mostra nenhum caminho para criar um banner:
é o "não consigo **mais**".

## Decisões

### 1. O fim da página é um botão à vista

O "+" depois da última faixa vira um botão de largura cheia, sempre visível, com o texto "Nova faixa"
(o nome acessível continua "Nova faixa na posição N"). Os "+" entre faixas e dentro das faixas
continuam aparecendo no hover e no foco: é o que evita uma coluna de sinais de mais numa página
longa, e quem precisa inserir no meio já descobriu o botão do fim.

### 2. Nada muda na API nem no envio de imagem

A investigação não achou falha em nenhum dos quatro passos, e o limite de 2 MB é o mesmo nas duas
pontas, com uma frase que diz o que fazer. O editor novo (I1 a I7) redesenha o painel inteiro; esta
correção é a menor que devolve o caminho de criar um banner hoje.

## Fora de escopo

- Aumentar o limite de 2 MB ou comprimir a imagem no navegador.
- O "+" entre faixas mais visível: o I2 redesenha a barra da seção e o "+ Adicionar seção aqui".
