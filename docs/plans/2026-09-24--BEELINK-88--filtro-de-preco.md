# BEELINK-88 — O filtro de preço da coluna: faixas, controle deslizante e mín./máx.

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> B12 do épico BEELINK-25 (listagem). Empilhado sobre o B16 (BEELINK-97).

## O pedido

O grupo "Preço" de 5a: quatro faixas rápidas, um controle de dois polegares e os campos Mín./Máx.
com "Ir".

## Definição de Pronto

1. Faixas "Até R$ 50", "R$ 50 a R$ 100", "R$ 100 a R$ 200" e "Acima de R$ 200". Some a que cai
   fora do que a prateleira custa. Negrito quando o endereço bate com ela.
2. Controle de dois polegares entre o mais barato e o mais caro da prateleira, aplicado só ao
   soltar, operável por teclado e com nome em cada polegar.
3. Mín./Máx. + "Ir" num formulário GET que funciona sem JavaScript.
4. "100,50" digitado não esvazia a listagem; mínimo maior que máximo é trocado (o B7 já faz).
5. Sem violação de acessibilidade.

## Decisões

### 1. O formulário é o filtro; o controle só o preenche

Sem JavaScript, Mín./Máx. + "Ir" é o caminho inteiro. O controle deslizante preenche os mesmos
campos e, ao soltar o polegar, envia o mesmo formulário. A ilha do B16 segue o envio sem recarregar.
Não existe um segundo caminho para o preço.

### 2. Um polegar na ponta não é limite

Deixar o polegar no mais barato da prateleira não escreve `precoMin`. Mover só o máximo gera "Até R$
179", não "R$ 49 a R$ 179".

### 3. O controle é restilizado pelas partes, não no primitivo

O `Slider` desenha com os tokens do painel. O bloco pinta trilho, preenchimento e polegares com os
tokens da loja por seletores de `data-slot`, sem mudar o primitivo que o painel usa.

### 4. Os campos esquecem o que foi digitado quando o endereço muda

O grupo recebe como chave a faixa em vigor. Tirar o chip de preço limpa os campos em vez de deixar o
valor antigo escrito.

## Fora de escopo

- Contagem por faixa: a API não conta por faixa.
