# BEELINK-18 — Os primitivos shadcn que as telas do catálogo exigem

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A0 do épico BEELINK-17 (variações de produto). Área: UI · novo · P · ordem 1/29.

## O pedido

> Instalar de uma vez os primitivos shadcn que faltam em packages/ui, para que as tarefas de FE do
> catálogo não disputem o mesmo pacote rodando `shadcn add` em paralelo: accordion, aspect-ratio,
> calendar, collapsible, command, dialog, form, pagination, popover, radio-group, slider, switch.

## Definição de Pronto

1. Os primitivos existem em `packages/ui/src/components/` e são exportados como os atuais
   (`./components/*`).
2. Nenhuma cor literal entrou: os componentes usam os tokens do design system.
3. Cada primitivo novo tem uma story mínima.
4. Nenhum primitivo existente foi sobrescrito.
5. `pnpm ci-check` verde.

## Decisões

### 1. Onze, e não doze: `form` não existe no estilo do projeto

O `components.json` do `ui` usa o estilo `base-nova` (primitivos sobre Base UI). Nesse estilo o
shadcn não tem `form`: o formulário é o `field.tsx`, que o projeto já usa em todo o painel. O
`shadcn add form` não gera arquivo nenhum. O catálogo segue o padrão controlado (`value`/`onChange`
com `Field`) que o cadastro de produto já usa, como o próprio BEELINK-22 recomenda.

### 2. `command` traz `input-group` junto

O `command` depende do `input-group`, que entra como o décimo segundo arquivo.

### 3. O botão não é sobrescrito

O `button.tsx` do projeto tem um ajuste próprio ("a button does not sink when pressed"), e o shadcn
queria substituí-lo pela versão do registro. A instalação recusou a sobrescrita; `input` e `textarea`
eram idênticos.

### 4. Três dependências novas, as que os primitivos exigem

`cmdk` (command), `react-day-picker` e `date-fns` (calendar). O ticket dizia que nenhuma entraria,
mas esses dois primitivos não existem sem elas. O `cn`, que os arquivos gerados importam, já era
dependência: é o `clsx` + `tailwind-merge` que todos os primitivos do projeto usam.

### 5. O botão de fechar do `dialog` recebe o texto de fora

O texto do leitor de tela do botão de fechar vinha fixo em inglês. O `DialogContent` ganha
`closeLabel`, para as telas passarem "Fechar". A paginação já aceita `text` e `aria-label` por
props.

## Fora de escopo

- Usar os primitivos: cada tela do catálogo os usa no seu ticket.

## Adendo — revisão independente (24/09/2026)

Duas leituras (contrato do design system; acessibilidade e comportamento). Cada achado passou por
um verificador que tentou refutá-lo. Nove achados confirmados, todos introduzidos por este ticket e
todos corrigidos:

1. **Slider — polegares sem nome.** O `aria-label` no `Slider` só nomeava o grupo, e os polegares
   não recebiam nada. O `Slider` passa a aceitar `getAriaLabel` e `getAriaValueText` e a
   repassá-los a cada polegar.
2. **Slider — texto em inglês.** O Base UI lê "50 start range" num intervalo de dois polegares. O
   padrão agora é só o número, e a tela pode trocar.
3. **Slider — cor literal.** O polegar usava `bg-white` e passa a usar `bg-background`, o token que
   o `switch` já usa.
4. **Slider — polegares a mais.** Um valor só desenhava dois polegares. Agora desenha um.
5. **`DialogFooter` com `showCloseButton`.** Escrevia "Close" visível, sem como trocar. Ganha
   `closeLabel`, como o `DialogContent`.
6. **`CommandDialog` sem `closeLabel`.** Não repassava a prop e passa a repassar.
7. **`CommandDialog` — cabeçalho fora do popup.** O título e a descrição ficavam fora do popup,
   presentes na página com o diálogo fechado. Agora ficam dentro.
8. **`PaginationLink` anunciado como botão.** Era anunciado como botão, e passa a ser um link com
   o visual do botão (`buttonVariants`).
9. **`PaginationLink` sem link da app.** Não aceitava o link da aplicação. Ganha `render`, como o
   `BreadcrumbLink`, para o web passar o `next/link`.

A evidência está em `packages/ui/src/components/primitives-a11y.test.tsx`: os nomes e o texto do
valor dos polegares, um polegar para um valor, o link com `aria-current` e o componente injetado,
e o "Fechar" do rodapé e do `CommandDialog`.
