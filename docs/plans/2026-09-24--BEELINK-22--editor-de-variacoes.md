# BEELINK-22 — O editor de variações no cadastro do produto

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A4 do épico BEELINK-17 (variações de produto). Área: FE · novo · G · ordem 6/29. Empilhado
> sobre o A6 (BEELINK-24), que está sobre A3, A2, A1 e A0.

## O pedido

> Uma seção "Variações" no `ProductEditor`, no padrão controlado que o cadastro já usa. Cada opção
> é um Card com valores em Badge removíveis e arrastáveis, e Enter adiciona um valor. A tabela de
> combinações mostra preço, estoque e SKU editáveis na linha e tem ação em massa (mesmo preço,
> definir estoque) por seleção. Remover uma opção pede confirmação num AlertDialog. Um aviso aparece
> ao tentar sair com edições pendentes. Todo carregamento é Skeleton.

## Definição de Pronto

1. Cada opção é um cartão com os valores como chips removíveis e arrastáveis, e Enter no campo
   adiciona um valor.
2. A tabela mostra preço, estoque e código editáveis na linha, e tem as duas ações em massa sobre as
   linhas selecionadas.
3. Remover uma opção com valores pede confirmação e diz quantas combinações restam.
4. Com edições pendentes, o rodapé avisa, Cancelar pergunta antes de descartar e fechar a aba
   mostra o aviso do navegador.
5. O carregamento é Skeleton.
6. Salvar grava produto, opções e variantes: sem perder o que sobrevive, sem mandar preço ao
   produto que tem opções e sem criar o produto duas vezes.
7. `pnpm ci-check` verde, com testes e as stories dos blocos novos.

## Decisões

### 1. O rascunho é puro e mora em `packages/ui/src/lib/variations.ts`

A tela e os blocos precisam das mesmas regras. A combinação é nomeada pelo conjunto das chaves dos
seus valores, ordenado, e por isso reordenar opções ou valores nunca move uma linha. Renomear
mantém a chave, e com ela a linha. Acrescentar e remover seguem o que a API faz no `PUT
.../options`:

- o primeiro valor de uma opção nova estende todas as linhas;
- remover uma opção colapsa as combinações na primeira;
- uma combinação nova pega o preço da vizinha, e nunca o código nem o estoque.

A tela mostra, portanto, o que o salvamento vai produzir.

### 2. Controlado, sem react-hook-form

Como o ticket recomenda, o cadastro inteiro segue `value`/`onChange` com `Field`, sem misturar dois
paradigmas de formulário na mesma tela.

### 3. Selecionar e "vendo esta" são dois controles

O design 4a usa um checkbox só para as duas coisas, e por isso o cabeçalho conta "3 selecionadas"
sobre 4 linhas marcadas. Aqui:

- **o checkbox** escolhe as linhas da ação em massa. A seleção fica no TanStack Table v9, com só a
  feature de seleção;
- **o switch** diz se a combinação é vendida. Uma linha desligada fica riscada, com os campos
  fechados.

### 4. Atalhos de opção em botões, como no design

Tamanho, Cor, Peso, Sabor e Outra são botões, e não o Command+Popover do brief: são cinco, e uma
lista que precisa ser aberta para mostrar cinco escolhas custa um clique à toa. O atalho em uso
fica desligado, e todos se desligam em 3 opções.

### 5. Arrastar reaproveita o `ArrangeBoard` do modo design

O dnd-kit já é dependência do `packages/ui` e já tem um quadro com teclado e anúncios. Os chips o
reaproveitam em modo grade.

### 6. A cor é o campo de cor do navegador, e a bolinha é dado

Como o ticket permite, a primeira versão usa `input type="color"`. O `#rrggbb` é dado do lojista,
como a cor da marca. Um valor novo nasce sem bolinha, e o campo fica não controlado até a primeira
escolha, porque um campo de cor recusa valor vazio. Os fixtures montam os `#rrggbb` a partir dos
dígitos, para que o gate `no-hex-colors` continue querendo dizer "nenhuma cor escrita num
componente".

### 7. Salvar são até três chamadas, num hook próprio

`saveProduct` (`use-save-product.ts`) segue esta ordem:

1. `PUT` do produto, com os campos por unidade só enquanto ele vende uma coisa. Na criação, é o
   `POST`.
2. `PUT .../options`.
3. `PUT .../variants` com cada linha. Quando a última opção sai, é um novo `PUT` do produto com o
   preço.

Os ids dos valores novos são casados pela posição: as opções vão em ordem, e a resposta mantém a
ordem. Se a criação passa e uma etapa seguinte falha, o erro carrega o id do produto criado, e a
tela troca para a edição dele. Assim ele não é criado duas vezes.

### 8. Com combinações, preço e estoque saem das seções deles

As seções Preço e Estoque trocam os campos por uma frase: o preço e o estoque ficam em cada
combinação. Ficam na seção deles:

- **a chave "Controlar estoque":** vale para todas as combinações;
- **o Envio (peso e caixa):** aplicado a todas. A tabela não tem coluna de caixa.

Preço "de" e custo por combinação ficam fora desta versão.

### 9. O aviso de sair

- **Dirty:** o formulário ou o rascunho diferem do que foi carregado.
- **Enquanto dirty:** o rodapé diz "Você tem alterações não salvas.", e Cancelar pergunta num
  AlertDialog, com o foco em "Continuar editando".
- **Ao fechar a aba:** vem o aviso do próprio navegador (`beforeunload`), como no modo design.

### 10. A tela foi dividida

`product-editor-screen.tsx` passaria de 250 linhas. Saíram dela:

- o mapeamento do formulário, para `product-form-mapping.ts`;
- o do rascunho, para `variations-mapping.ts`;
- o salvamento, para `use-save-product.ts`.

### 11. O `ProductEditor` ganhou teste e story

Ele não tinha nenhum dos dois, e mudou neste ticket.

## Fora de escopo

- Preço "de", custo, código de barras, peso e foto **por combinação**.
- Um seletor de cor próprio.
- Arrastar os cartões de opção. O design desenha a alça, mas o ticket pede arrastar os valores.

## Adendo — revisão independente (24/09/2026)

Três leituras (rascunho e salvamento; interface e acessibilidade; evidência). Cada achado passou
por um verificador que tentou refutá-lo. Dezenove confirmados, cerca de catorze distintos, todos
introduzidos por este ticket e todos corrigidos:

1. **Uma linha desligada sem preço não era enviada** (bloqueador). O "desligada" se perdia, e a
   combinação podia ficar à venda por R$ 0. Agora toda linha vai, e a sem preço vai sem
   `priceCents`. Conferido no navegador: M desligada sem preço foi gravada `isActive: false`.
2. **Uma falha depois de criar o produto trocava de página** (grave). A tela perdia o erro e tudo o
   que foi digitado. Agora a tela fica onde está e guarda o produto criado. O próximo salvamento o
   atualiza, e o rascunho recebe os ids que a API já deu às opções e aos valores (`rekeyDraft`), em
   vez de criá-los de novo e arquivar as combinações recém-feitas.
3. **Preço "de" herdado do produto** (grave). Quando o preço da linha o alcança, ele vai como
   `null`. Antes, o salvamento travava sem campo para corrigir.
4. **O colapso mantinha a linha desligada** (grave). Agora fica a primeira à venda, como a API
   decide. Tirar a última opção não deixa mais uma linha vazia, que prendia o aviso de "não
   salvo".
5. **Linhas sem digitação seguiam a vizinha** (grave). O "mesmo preço" alcançava linhas não
   escolhidas. Agora a linha nasce escrita quando o valor é acrescentado, e todo patch escreve as
   linhas visíveis antes de aplicar.
6. **"Selecionar todas" aparecia como misto** (grave), com tudo marcado, porque o v9 conta "algum"
   diferente do v8. Ids de combinações que sumiram saem da seleção.
7. **O "Cancelar" da ação em massa guardava o valor** (grave). O diálogo agora remonta a cada
   abertura e limpa o valor ao cancelar.
8. **O campo de cor** (grave):
   - começava em preto sem disparar mudança, então o preto era a única cor impossível de escolher;
   - agora é sempre controlado;
   - um valor novo começa num cinza neutro (`FIRST_SWATCH`, escrito a partir dos canais RGB).
9. **Uma opção "Cor" salva sem bolinha voltava como opção comum.** Agora ela também é reconhecida
   pelo nome.
10. **O arraste pelo teclado anunciava em inglês e pela chave.** Agora anuncia em pt-BR, pelo nome
    do valor.
11. **O título da confirmação de remover ficava vazio numa opção sem nome.** Agora usa "Nome da
    opção N".
12. **O foco se perdia ao remover um valor ou uma opção.** Agora vai para o vizinho, ou para o
    primeiro controle da seção.
13. **O teste do Enter não tinha formulário ao redor**, então nunca podia falhar. Agora tem.

A tabela passou a desenhar o próprio cabeçalho (contagem e ações em massa), para a seção ficar
abaixo de 250 linhas. Três achados foram refutados.
