# BEELINK-68 — A folha da faixa usa o nome da faixa, e não "Faixa N"

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> C5 do épico BEELINK-50 ([plano do épico](2026-09-23--BEELINK-50--largura-e-vitrines.md)).
> Área: web · ajuste · P · ordem 14/17.

## O pedido

> Reproduzido: o painel mostra HERO SECTION e a folha que abre se intitula 'Faixa 2'.
>
> - Abrir a folha de uma faixa nomeada mostra o nome dela no título.
> - Uma faixa sem nome continua mostrando Faixa N.
> - Renomear atualiza o título sem fechar a folha.

## Definição de Pronto

1. A folha de uma faixa com nome tem o nome como título.
2. A folha de uma faixa sem nome continua "Faixa N", com N a posição dela.
3. Enquanto o dono digita o nome, o título acompanha, sem fechar a folha. Apagar o nome volta o
   título para "Faixa N".
4. O painel, a folha e a confirmação de excluir chamam a faixa do mesmo jeito.
5. `pnpm ci-check` verde.

## Decisões

### 1. Uma regra só para o nome de uma faixa

O nome, se houver, e a posição, se não houver. O painel (`BandRow`) já fazia assim, a folha não, e
a confirmação de excluir passou a fazer no C1. A regra vira uma função do `ui` (`bandLabelOf`), que o
painel e a tela usam.

### 2. O título lê o que está sendo digitado

A folha abre com o nome salvo e o título acompanha o campo. Salvar continua fechando a folha, como
toda folha do modo design; o que o pedido quer é que o título não espere o salvar para mudar.

## Fora de escopo

- Renomear a faixa direto no painel.

## Adendo — 24/09/2026, depois da revisão

A revisão independente não achou defeito introduzido por este ticket. Confirmou dois pontos
anteriores a ele, ambos no mesmo assunto (como uma faixa é dita), e os dois foram corrigidos aqui:

- **Arrastar uma faixa pelo teclado anunciava "na posição Serviços".** O modelo promete uma posição,
  e recebia o nome da faixa de destino. Agora recebe o número.
- **O quadro de arrastar do preview falava inglês e citava o id da faixa.** Ele não recebia os
  anúncios que o painel tem. Os dois quadros agora usam o mesmo `bandAnnouncements`.

Um teste de renomear uma faixa que já tem nome foi acrescentado, a partir de um ponto de evidência
que a revisão refutou como defeito.
