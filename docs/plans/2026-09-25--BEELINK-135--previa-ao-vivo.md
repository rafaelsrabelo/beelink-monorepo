# BEELINK-135 — Prévia em tempo real: o que se digita e a imagem escolhida aparecem na hora

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> I11 do Épico I. Rafael, 25/09: "queria que fosse em tempo real as mudanças: crio o banner, adiciono
> a imagem e já fica na preview, em tempo real, entende?"

## Definição de Pronto

1. Ao escolher a imagem de um banner, ela aparece na prévia assim que termina de enviar, antes de
   Salvar.
2. Títulos e textos mudam na prévia enquanto se digita.
3. Cancelar (ou fechar os campos) volta a prévia ao que está salvo; Salvar grava como antes.
4. Uma imagem que termina de enviar depois de o dono digitar não desfaz o que foi digitado; Salvar
   fica travado enquanto uma imagem está a caminho.

## Por que não aparecia

Os campos do bloco viviam num `useState` do inspetor, e a prévia era montada só do que está salvo
(`previewOf(rows, saved, shelves)`). Nada do formulário chegava nela até o PATCH do Salvar voltar.

## Decisões

### 1. Prévia do que não foi salvo, com o Salvar explícito — sem salvamento automático

Salvar grava a linha que a loja lê e limpa o cache da vitrine na hora. Um salvamento automático
poria título pela metade na frente dos clientes, e a API recusaria estados intermediários (um link
externo ainda sendo digitado, uma categoria ainda não escolhida). A paleta de cores já funciona assim:
prévia ao vivo e "Salvar cores". O I6 (rascunho no servidor) troca o Salvar por um salvamento
automático no rascunho, e este mesmo mecanismo vira a camada otimista dele.

### 2. Os campos em edição num store Zustand (`src/stores/design-edit.ts`)

O inspetor e a prévia são irmãos. O store guarda o formulário como está sendo digitado; o bloco salvo
continua no TanStack Query. Abrir os campos do mesmo bloco de novo mantém o que foi digitado: numa
janela estreita, a gaveta monta a sua cópia dos campos enquanto a coluna desmonta a dela.

### 3. A prévia desenha pelo mesmo `toPayload` do Salvar

`withLiveEdit` sobrepõe ao que está salvo exatamente o que um Salvar enviaria. Um slide ainda sem
foto, um benefício sem título ficam de fora, como ficariam no Salvar. A largura e a visibilidade
continuam as do rascunho da arrumação. Uma edição que ficou para trás (campos fechados) não desenha
nada: a prévia só a aplica ao bloco cujos campos estão abertos.

### 4. A tela não renderiza a cada tecla

`LivePreviewPane` é quem assina o store; a estrutura, a barra e as listas de arrastar ficam como
estão. `useDeferredValue` deixa a digitação rápida.

### 5. Dois defeitos que a prévia ao vivo deixaria à mostra

- O envio da imagem entregava a foto ao `onChange` do momento em que o arquivo foi escolhido: o que
  fosse digitado durante o envio era desfeito. Agora a foto vai ao `onChange` mais recente, e a
  nenhum se o campo já saiu da tela.
- Salvar durante o envio gravava o slide sem foto. Agora fica travado até a foto chegar.

## Fora de escopo

- Perguntar antes de trocar de bloco ou sair com campos não salvos.
- A lista da estrutura (nome e miniatura do bloco) continua lendo o que está salvo.
- Os produtos de uma vitrine vêm do servidor: mudar a fonte continua pedindo Salvar para aparecer.
