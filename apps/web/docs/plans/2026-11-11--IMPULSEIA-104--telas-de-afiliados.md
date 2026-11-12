# IMPULSEIA-104 (AF4) — a tela do convite, e a lista e a ficha dos afiliados no painel

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> A quarta tarefa do épico [Afiliados](../../../../docs/plans/2026-10-24--afiliados.md), empilhada sobre
> a AF3 ([plano](../../../../docs/plans/2026-11-11--IMPULSEIA-103--convite-de-afiliados.md), PR #307),
> que entregou as rotas. Aqui só se desenha e liga: muda `apps/web` e `packages/ui`.

## O pedido

O convidado abre o link do e-mail, vê a loja, a condição e os termos, escolhe o `/nome`, diz a chave
Pix e aceita — criando a conta do bee-link ou entrando na que já tem. No painel, o lojista vê a lista
de afiliados, convida, e numa ficha troca a tabela e a nota, reenvia ou cancela o convite, pausa,
retoma e encerra.

## Definition of Done

1. `/afiliado/convite?token=` mostra o convite: a loja, para quem é, a condição (o percentual geral da
   tabela e os produtos com percentual próprio) e os termos. Esqueleto enquanto carrega.
2. **Sem conta:** nome, senha, `/nome` (com a sugestão já preenchida e a disponibilidade dita enquanto
   se digita), chave Pix opcional e o aceite dos termos da loja; ao aceitar, a conta é criada, a
   pessoa sai conectada como no login e vê a tela de pronto.
3. **Com conta e desconectado:** "Entrar para aceitar" leva ao login, que volta ao convite. **Conectado
   com o e-mail do convite:** `/nome`, Pix e termos, e "Aceitar". **Conectado com outra conta:** a tela
   diz para quem é o convite e oferece sair.
4. Os estados claros: convite inexistente ou já usado, vencido (`410`), termos mudados no meio (relê e
   avisa), `/nome` indisponível com o motivo, e-mail que não confere com o e-mail para quem é.
5. **Pronto:** o link do afiliado `/<loja>/<nome>` e que a área do afiliado chega depois.
6. **Painel:** `/admin/<loja>/affiliates` é a lista (status, tabela, datas), filtrada por status e
   paginada no endereço, com "Convidar afiliado" num diálogo (nome, e-mail, tabela, telefone e nota
   opcionais). As abas viram Afiliados · Configurações · Tabelas.
7. **Ficha** (`/affiliates/<id>`): os dados, o `/nome` e o link, a tabela e a nota editáveis, e as ações
   do status — reenviar e cancelar o convite; pausar, retomar, encerrar —, com confirmação para
   cancelar e encerrar, e cada recusa da API em palavras.
8. Handlers do BFF para cada rota da AF3, com teste; serviços com chaves por fábrica; cópia em pt-BR e
   en; cada bloco novo com história e teste com axe; os mapas de superfície de web e ui; `pnpm
   ci-check` verde; o fluxo dirigido no navegador.

## Decisões

### A página do convite mora no grupo `(auth)`

`/afiliado/convite` é do bee-link, não de uma loja, e é lida por quem talvez ainda não tenha conta: o
mesmo quadro do login e do cadastro, com o cartão mais largo, porque mostra a condição e os termos.
`afiliado` é slug reservado (AF1), então o segmento estático nunca disputa com `/<slug>`. O proxy não
toma a página para si: ela é pública, como a vitrine.

### Quem está conectado, a página do servidor diz

A página lê a conta (`getCurrentUser`) e entrega o e-mail à tela; a tela compara com o do convite. Com
outra conta, o convite não é recusado no aceite, é explicado antes: "Este convite é para X", e "Sair"
encerra a sessão e recarrega a página. Uma conta errada que criasse outra no lugar sairia dela sem
ninguém pedir.

### O login volta ao convite

`panelReturnOf` passa a aceitar `/afiliado/convite` além das páginas do painel, só esse caminho. Sem
isso o login mandaria a pessoa ao painel e o convite ficaria para trás. Com sessão vencida e o
refresh vivo, o proxy renova no `/login` e devolve ao convite pelo mesmo `voltar`.

### O cadastro pelo convite grava a sessão por `/api/session/…`

`POST /api/session/affiliate-invite/<token>` chama o `sign-up` da AF3 e grava os cookies, como o login
faz em `/api/session`. Fica sob `session` de propósito: o proxy não renova os grupos que escrevem os
próprios cookies, e a resposta é só o afiliado aceito — o token não chega ao JavaScript. Depois, a
página recomeça (`startOver`), como em qualquer entrada na sessão. Os termos do bee-link são aceitos
como no cadastro, pela frase com os links embaixo do botão.

### A disponibilidade do `/nome` é dica; o aceite decide

A tela pergunta 400 ms depois de parar de digitar e mostra o nome como ficaria guardado e o motivo
quando não serve. O aceite pode ainda dar `409 AFFILIATE_SLUG_UNAVAILABLE` (alguém pegou no meio): a
mensagem vai para o campo.

### Termos mudados: relê e avisa

`409 AFFILIATE_TERMS_CHANGED` relê o convite; a tela avisa que a loja mudou os termos e desmarca o
aceite, para a pessoa ler de novo antes de aceitar.

### O link mostrado no fim

`<origem>/<loja>/<nome>`, com a origem do pedido (`siteOrigin`). Ele passa a abrir a loja com a faixa
na AF5; a tela diz que a área do afiliado, onde ele acompanha as vendas, chega depois.

### A lista: abas por status, sem números

Todos · Convidados · Ativos · Pausados · Encerrados, e a página, no endereço. A API não conta por
status, e contar cada aba seria uma rota a mais; as abas saem sem número, como as de clientes antes da
primeira resposta.

### A ficha salva a tabela e a nota juntas

Um formulário só, "Salvar", que manda só o que mudou (`PATCH`). Trocar a tabela vale para os pedidos
de agora em diante, e a ficha diz isso.

### As ações pedem confirmação só quando não voltam atrás

Cancelar o convite apaga o afiliado; encerrar é definitivo. Pausar e retomar se desfazem um ao outro e
não perguntam. Um diálogo de confirmação próprio dos afiliados, porque o de apagar diz "Excluir" e
encerrar não é excluir.

## Fora de escopo

- O link na vitrine, a faixa e o cookie: AF5.
- A comissão do pedido e o e-mail a cada venda: AF6.
- O dinheiro (extrato, "quanto devo") e tirar a foto ou a frase: AF7.
- A área `/afiliado` e a edição de foto, frase, Pix e telefone pelo afiliado: AF8.
- Entrar com Google pelo convite: o painel não tem Google (AF3).
