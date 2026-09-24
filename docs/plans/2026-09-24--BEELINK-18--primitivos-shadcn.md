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
