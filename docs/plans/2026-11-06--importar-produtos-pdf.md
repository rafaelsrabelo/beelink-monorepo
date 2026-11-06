# Importar produtos de um PDF

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> Sem número de ticket: o pedido veio direto, sem um BEELINK. O número entra num adendo quando existir.

## O pedido

Rafael, 06/11/2026, sobre https://beelink.biz/admin/dindin-da-leia/products: "quero poder importar um pdf e
montar os produtos, entende? so vai ficar faltando as imagens, mas ja cria, como seria melhor botar uma ia pra
algo? pra ver o documento analisar e criar os produtos".

Combinado na conversa: uma IA lê o documento e devolve os produtos, o lojista revisa numa tabela, e só então
eles são criados, como rascunho e sem foto.

## Definition of Done

1. A lista de produtos do painel tem "Importar do PDF" ao lado de "Novo produto", e ele leva a
   `/admin/<slug>/products/import`.
2. Nessa página o lojista escolhe um PDF ou uma foto do cardápio (PDF, PNG, JPEG ou WebP, até 10 MB). Enquanto
   a IA lê, a tela mostra um skeleton da tabela de revisão, nunca um spinner.
3. A API (`POST /stores/:slug/products/import/extract`) manda o arquivo ao Claude junto com as categorias da
   loja e devolve rascunhos: nome, descrição, preço em centavos (ou nenhum, quando o documento não mostra),
   nome da categoria e no máximo uma opção ("Sabor", "Tamanho") com valores, cada um podendo ter preço
   próprio. Esse passo não grava nada.
4. A tabela de revisão deixa o lojista desmarcar linhas e corrigir nome, preço e categoria (uma da loja, uma
   nova com o nome que o documento deu, ou nenhuma). Ela mostra as variações de cada produto, e uma linha
   marcada sem preço não deixa importar.
5. "Importar" (`POST /stores/:slug/products/import`) cria tudo numa transação: as categorias novas, uma por
   nome, e os produtos como **rascunho** (`DRAFT`), com suas opções e o preço de cada variação. Se algo falha,
   nada é criado.
6. Um nome que já é endereço de outro produto da loja (por exemplo, importar o mesmo PDF duas vezes) ganha
   `-2`, `-3` em vez de recusar a importação inteira.
7. Ao terminar, o painel volta para a lista filtrada em rascunhos, onde o lojista põe as fotos e publica.
8. Sem `ANTHROPIC_API_KEY` a API responde `501 PRODUCT_IMPORT_NOT_CONFIGURED`, e a página diz que a
   importação não está disponível neste ambiente. Arquivo grande demais, formato errado, documento sem
   produtos e IA fora do ar viram uma frase cada.
9. A extração tem limite próprio por IP (`PRODUCT_IMPORT_RATE_LIMIT_*`), porque cada leitura custa dinheiro.
10. `pnpm ci-check` verde.

## Decisões

- **Claude, numa chamada só, com saída estruturada.** O projeto não tinha IA nenhuma. O Claude lê PDF direto
  (texto e imagem de cada página), então cardápio feito no Canva ou escaneado funciona, e uma foto do cardápio
  também. Não é um agente: é um pedido, uma resposta num JSON de formato fixo (`output_config.format` com o
  schema em zod). O modelo padrão é `claude-opus-5-5`, trocável por `PRODUCT_IMPORT_MODEL` sem mexer no
  código, caso o custo peça Sonnet ou Haiku depois de medir a precisão.
- **Dois passos, com revisão no meio, e não criar direto.** Preço é onde a leitura mais erra (R$ 5,00 lido
  como R$ 50,00, o preço da linha de baixo), e o próprio schema guarda a memória de um produto vendido a um
  centésimo do preço. A extração não grava nada. O que vai ao banco é o que o lojista confirmou, e passa
  pelas mesmas regras de preço, opções e limites do cadastro à mão.
- **O conteúdo do documento é dado, nunca instrução.** O prompt diz isso ao modelo, e mesmo que um PDF tente
  mandar em algo, a saída só pode ser uma lista de rascunhos que o lojista revisa e a API valida.
- **Rascunho, sempre.** Um produto sem foto não deve aparecer na vitrine por acidente. `DRAFT` já existe e já
  significa "visível só ao dono".
- **No máximo uma opção por produto importado.** Cardápio tem sabor ou tamanho; produto com tamanho e cor ao
  mesmo tempo é raro num PDF e pediria preço por combinação, que a revisão não tem como mostrar bem. As
  opções são escritas pelos mesmos `writeOptions`, `planVariants` e `applyPlan` do editor de variações, dentro
  da transação da importação, e o cache do produto é refeito por `syncProductCache`.
- **Categoria por nome.** A IA recebe os nomes das categorias da loja e prefere uma delas. A revisão casa o
  nome sem diferenciar maiúsculas e acentos e, se não houver nenhuma igual, propõe criar. A API casa de novo
  antes de criar, então dois produtos com "Picolés" geram uma categoria só, e uma que já existe não é
  duplicada.
- **Transação única, com prazo de 60 s.** Cem produtos com variações são algumas centenas de escritas. Tudo
  ou nada torna seguro tentar de novo depois de uma queda de rede: nada fica pela metade.
- **O botão aparece sempre.** Esconder sem a chave pediria uma rota só para perguntar se ela existe. Em
  produção a chave está configurada, e num ambiente sem ela a página explica.
- **Erros da importação são um tipo próprio no contrato**, `ProductImportErrorCode`, ao lado do
  `CatalogErrorCode`, para o painel ter uma frase para cada um.

## Fora do escopo

- **Fotos.** A IA não recorta imagens do PDF. Fica para uma segunda fase: extrair as imagens que o PDF traz
  dentro e sugerir a de cada produto.
- **Mais de uma opção por produto**, adicionais e complementos (bee-link não tem esse conceito hoje).
- **Planilha (CSV/XLSX).** O mesmo caminho poderia ler uma, mas o pedido foi PDF.
- **Guardar o arquivo.** Ele vai ao Claude e é descartado. Nada do documento fica no banco além dos produtos
  criados.
- **Fila em segundo plano.** A leitura leva de 15 a 60 s e roda dentro do pedido. Se cardápios grandes
  passarem do tempo, a próxima fase é um job com aviso no painel.
