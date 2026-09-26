# BEELINK-130 — Rascunho no servidor e versões

*Escrito em 2026-09-26, ao começar o ticket. Épico I (BEELINK-123).*

## O que muda

Hoje parte do que o lojista faz vai para a loja na hora (textos, blocos novos, faixas apagadas) e
parte espera o Publicar (ordem, o que está oculto, layout). Com este ticket, tudo é rascunho até
publicar. Publicar congela a página numa versão, e a loja mostra a última versão publicada. Dá para
voltar para a versão de ontem.

## Quatro PRs, empilhados

1. **Versões e a loja lendo a versão publicada:**
   - o modelo de versões, com a migração que congela o que cada loja mostra hoje;
   - o Publicar que congela;
   - a vitrine, as landings e os formulários de contato lendo a versão publicada;
   - no editor, a prévia do rascunho também na inicial.
2. **Revisão do rascunho, histórico e restaurar** (API):
   - o número de revisão que dá o 409 entre abas;
   - a lista de versões;
   - restaurar;
   - os problemas antes de publicar.
3. **O editor salva cada mudança na hora:** o rascunho do navegador sai; o 409 vira o aviso "outra
   aba alterou, recarregar".
4. **Publicar com a lista de problemas, e o histórico na aba Páginas.**

## Definição de Pronto

1. As tabelas de faixas e blocos são o rascunho, salvo no servidor a cada mudança; o rascunho que
   fica no navegador sai.
2. Publicar congela a página numa versão imutável: página, documento, quem, quando e uma nota.
3. A vitrine lê a última versão publicada. Produtos, preços e estoque continuam resolvidos na hora.
4. Histórico na aba Páginas. "Restaurar" copia a versão para o rascunho e não publica sozinho.
5. Antes de publicar, um aviso lista os problemas e deixa publicar mesmo assim:
   - link para produto excluído;
   - vitrine sem produtos;
   - banner sem imagem.
6. Duas abas editando: a segunda recebe 409 e "outra aba alterou, recarregar".
7. **Aceite:**
   - adicionar ou editar um bloco não muda a vitrine até publicar;
   - restaurar a versão anterior e publicar devolve a vitrine exatamente como estava.

## Decisões

### As versões

- **A versão servida é a de número mais alto.** Não há ponteiro, porque o histórico só cresce e
  restaurar não publica. O `@@unique([pageId, number])` e o lock da loja impedem duas publicações com
  o mesmo número.
- **O documento** guarda faixas e blocos, inclusive os ocultos, para restaurar sem perder nada.
  - A ordem é a do array.
  - Não guarda loja, posição nem datas.
  - `format: 1` é o gancho para mudar a forma um dia.
- **A leitura nunca quebra.** Um bloco que não se lê (um tipo novo, de um deploy mais novo) sai
  sozinho; a página continua.
- **A migração congela o que cada loja mostra hoje como versão 1**, para todas as páginas publicadas,
  e a loja segue igual depois do deploy. Um e2e roda o mesmo SQL e compara com o `documentOf`.
- **Quando se congela:** uma loja nova congela a inicial na criação, e um landing que vai ao ar pelo
  PATCH de status também congela. "Publicada" sempre quer dizer "o rascunho de agora, congelado".

### O que a loja lê

- **A inicial** (`PublicStore.sections`, e com ela a faixa de aviso e o menu de um site em todas as
  páginas) e **uma landing** vêm da última versão.
- **O formulário de contato** vale como foi publicado. Um formulário apagado no rascunho, mas ainda
  publicado, continua recebendo; o lead fica sem ligação com a linha, como já acontece quando um
  formulário é apagado.
- **Continua ao vivo o que não é faixa nem bloco:** cores da loja, configurações da loja e da página
  (nome, endereço, SEO, topo e rodapé, menu) e a lista de landings do menu. O ticket fala de
  "faixas e blocos".

### O editor

- O editor lê a prévia do rascunho também na inicial (`GET /pages/home/preview`), porque a loja
  agora mostra a versão publicada. Uma vitrine nova apareceria sem produtos no editor.
- **A barra:** "Alterações não publicadas" quando o rascunho salvo no servidor difere do que a loja
  mostra, e o Publicar fica disponível mesmo sem mudanças arrumadas no navegador.
- **Cache:** as escritas do rascunho deixam de revalidar a vitrine, porque o rascunho não é servido a
  ninguém. O Publicar revalida.

## Fora do escopo

- Cores e configurações como rascunho (continuam valendo na hora).
- Limite de versões guardadas. Cada publicação guarda de 5 a 50 KB; um teto fica para depois.
- Comparar duas versões lado a lado.

## Riscos

- **Deploy:** a migração e a API sobem juntas. Uma API antiga que crie uma loja depois da migração
  deixaria a inicial sem versão. O backfill é idempotente e resolve se rodar de novo.
- **Uma aba antiga aberta** durante o deploy publica o arranjo mas não congela. Ela precisa recarregar.
- **`hasUnpublishedChanges`** pode acusar diferença quando uma categoria apagada zera a vitrine no
  rascunho. Isso não faz mal.

## Depois da revisão

*Acrescentado em 2026-09-26.*

- **Revisão por página, não por loja:** cada escrita leva a revisão da página que está aberta no
  editor. Ir para uma landing e voltar para a inicial não dá mais um 409 falso.
- **Outra aba nunca é adotada sem aviso:** uma leitura do rascunho mais adiante do que as escritas
  desta aba explicam abre o "outra aba alterou, recarregar". Antes, a leitura em segundo plano movia
  a revisão e deixava um formulário antigo sobrescrever o trabalho da outra aba.
- **Cabeçalho de revisão:** só dígitos, dentro do tamanho da coluna. Qualquer outra coisa é 400, nunca
  500.
- **`?page=` desconhecido:** abre a inicial de novo, como antes. Uma inicial que não se lê é erro, não
  404.
- **Status da landing pela aba Páginas:** publicar ou tirar do ar por ali atualiza o histórico e a
  barra.
- **Voltar:** o editor empurra um passo no histórico do navegador uma vez só, e não a cada salvamento.
  Um Voltar sai.
- **A barra:** sem a contagem de alterações e sem o Descartar, que o salvamento na hora tornou
  inalcançáveis. Enquanto o rascunho não foi lido, a barra não diz "Publicado".
- **O aviso de conflito** diz que a última alteração não foi salva.
- **Publicar:** quando a conferência falha, o diálogo diz isso e oferece conferir de novo, no lugar de
  "Nada a revisar". Enquanto publica, não fecha.
- **Histórico:** quando não carrega, diz isso e oferece "Tentar de novo". Restaurar mostra o progresso
  no próprio diálogo e, ao terminar, diz que a versão está no rascunho e que a loja só muda ao
  publicar. As datas seguem o idioma do painel.
