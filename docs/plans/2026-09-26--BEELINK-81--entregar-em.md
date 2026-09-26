# BEELINK-81 — "Entregar em / Informe seu CEP" no cabeçalho

*Escrito em 2026-09-26, ao começar o ticket. Épico E.*

## O que muda

Entre o logo e a busca, o cabeçalho da loja ganha "Entregar em" sobre "Informe seu CEP". O visitante
digita o CEP, e a loja guarda para a cotação de frete usar quando existir (D3). Hoje não promete nada:
nem prazo, nem valor, nem cidade.

## Definição de Pronto

1. Bloco `StorefrontDeliverTo` em `packages/ui`, com story e teste (axe incluído): o gatilho em duas
   linhas e um painel com o campo de CEP (máscara 00000-000) e o botão.
2. O CEP fica no cookie `bl_shop`, com `path=/<slug>`, e é lido no navegador. Depois de salvo, o bloco
   mostra "Entregar em" e o CEP.
3. Recarregar a página mantém o CEP. Nada vai para web storage.
4. Inerte na prévia do modo design; escondido abaixo de `shop-lg`.
5. Nada promete prazo ou valor.

## Decisões

- **Cookie próprio, `bl_shop`:** `bl_prefs` é o cookie do painel e colidiria (ajuste da revisão de
  24/09).
- **Lido só no navegador,** por uma ilha com `useSyncExternalStore`. Ler com `cookies()` no servidor
  tornaria dinâmica toda página da vitrine. O servidor desenha o convite; o navegador desenha o CEP.
- **Um painel preso ao botão, e não um popover em portal.** O popover do design system renderiza fora
  do cabeçalho e perderia as cores da loja. O painel fica dentro do cabeçalho e fecha com Esc e com um
  clique fora, devolvendo o foco ao botão.
- **Um site não mostra o bloco:** ele não vende, então não entrega.

## Fora do escopo

- Prazo, valor de frete e cidade. A consulta `/api/cep` é do painel e não abre para o público.
