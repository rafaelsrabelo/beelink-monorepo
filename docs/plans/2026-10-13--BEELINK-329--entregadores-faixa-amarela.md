# BEELINK-329 (AA13) — "Para entregadores" vira faixa amarela com formulário curto

> Plano de um ticket, escrito em 13/10/2026. Verdade naquele momento; só recebe acréscimos.
> Épico AA (BEELINK-316). Depende do AA12 (BEELINK-328, a API aceita o cadastro sem e-mail): esta
> branch sai da dele. O plano foi mostrado ao Rafael na conversa antes de qualquer alteração, e ele
> respondeu "pode seguir"; este arquivo o registra, com o que foi decidido e o que foi visto.

## O pedido

A seção "Para entregadores" da landing era um bloco preto alto, com foto de fundo, quatro cartões de
vantagens, as quatro etapas e um formulário de seis campos. O Rafael pediu, com duas pranchetas do
canvas ("10 · Landing Beelink v2" e "10b · Para entregadores no celular") e o portal de entregadores
do iFood como inspiração:

- uma faixa amarela compacta, de ponta a ponta;
- à esquerda a etiqueta, o título, uma linha e quatro vantagens com check em duas colunas;
- no meio a bag preta com a marca em amarelo, com o logo oficial;
- à direita um cartão branco com o formulário curto: nome, CPF, WhatsApp, veículo, aceite, "Continuar"
  e a frase "E-mail e documentos ficam para o próximo passo.";
- fora do primeiro passo: o e-mail e o select de cidade, com a cidade fixa como Fortaleza/CE no envio;
- no celular: a faixa em cima, o cartão sobrepondo a faixa e as quatro etapas abaixo;
- CPF já cadastrado: não duplicar, mostrar "Esse CPF já tem cadastro" e seguir para o passo 2;
- depois do envio: o passo 2, ou a confirmação atual com um TODO se ele não existir.

Os dois arquivos HTML de referência citados no pedido (`docs/design-handoff/entregadores/…`) não
existem no repositório; a referência usada foi o canvas, que abriu.

## Definição de Pronto

1. Em 390, 768, 1280, 1440 e 1920px a seção é a faixa amarela de ponta a ponta, sem rolagem lateral,
   com o conteúdo na coluna da página.
2. O formulário tem só nome, CPF, WhatsApp, veículo e aceite; não há campo de e-mail nem de cidade.
3. O botão "Continuar" fica travado até tudo estar certo e o aceite marcado, e diz o que falta.
4. O envio leva `city: FORTALEZA_CE` e nenhum e-mail, e a API o aceita.
5. Um CPF que já está na lista mostra "Esse CPF já tem cadastro" no lugar do formulário, sem gravar
   nada e sem contar lead.
6. Um WhatsApp que já está na lista, com outro CPF, é recusado no campo, com o formulário mantido.
7. No celular o cartão sobrepõe a faixa e as quatro etapas aparecem abaixo dele; no desktop as etapas
   não aparecem.
8. Nenhuma frase da seção, da confirmação ou das perguntas frequentes promete e-mail a quem se
   cadastra agora.
9. A política de privacidade em vigor lista o que o formulário coleta, sem o e-mail, numa versão nova.
10. Sem violações de acessibilidade (axe) na seção: travada, com erro num campo, liberada e enviada.
11. `pnpm ci-check` verde.

## Decisões

As seis primeiras foram perguntadas ao Rafael com uma recomendação; ele mandou seguir as recomendações.

1. **A altura é a do cartão, não 480px.** O pedido falava em ~480px. Na própria prancheta 10 a faixa
   mede cerca de 680px, porque o cartão com três campos tem cerca de 565px. Feita, ficou com 755px no
   desktop com o formulário vazio: além da prancheta, o cartão guarda uma linha para o erro de cada
   campo (ver a decisão 9) e mostra, enquanto o botão está travado, a frase do que falta. Com tudo
   preenchido são 708px, e com a confirmação no lugar do formulário, 373px.
2. **A confirmação não promete e-mail.** Sem e-mail no primeiro passo, "as informações chegam por
   e-mail" prometia uma mensagem a um endereço que não temos. A confirmação, a seção e as três
   respostas das perguntas frequentes passam a dizer que a Beelink fala com a pessoa pelo WhatsApp
   informado. Ninguém envia nada sozinho: quem responde faz isso à mão, a partir da lista.
3. **CPF repetido vira confirmação.** O passo 2 não existe e não há envio por WhatsApp, então o
   equivalente a "seguir" é o cartão dar lugar a "Esse CPF já tem cadastro", com "Cadastrar outro
   CPF". Nada é gravado e `generate_lead` não é contado. O WhatsApp repetido com outro CPF continua
   sendo erro no campo: a pessoa pode ter digitado errado.
4. **O PR #263 (BEELINK-326) entrou antes.** A recomendação era deixá-lo parado; ele foi mergeado no
   mesmo dia. O AA12 resolveu o encontro: o aviso por e-mail só é criado para um cadastro que tem
   endereço, e os endereços que já estavam na lista continuam recebendo o deles.
5. **Versão `2026-10-15` dos textos legais.** A política listava "nome completo, CPF, e-mail e número
   de WhatsApp" e citava o formulário "Comece seu cadastro". Pela regra da casa (BEELINK-171), mudar
   o que se coleta é versão nova. A `2026-10-14` já estava publicada; como a versão é o dia de
   vigência, publicada em 13/10 a página dirá "Vigente desde 15 de outubro de 2026" dois dias antes.
6. **Dois tickets, dois PRs.** AA12 (API e contrato) e este. Este depende do outro para compilar.

Decididas sem perguntar, e ditas ao Rafael junto com o plano:

7. **`aceiteTermosEm` não vai no corpo.** A API carimba a versão e o momento do aceite no servidor e
   recusa um corpo que traga qualquer um dos dois. O corpo segue com `acceptedTerms: true` e os nomes
   do contrato.
8. **Os veículos são um grupo de rádio de verdade**, vestido como os quatro botões da prancheta, para
   as setas do teclado funcionarem e um leitor de tela ouvir "um de quatro". Moto vem marcada, como
   na prancheta. Com 44px de altura em todas as larguras.
9. **A linha do erro de cada campo continua reservada.** É o que impede o clique perdido achado no
   AA6: um erro que aparecia ao sair do campo empurrava o aceite para baixo no meio do clique. Custa
   altura; a alternativa custava cliques.
10. **A bag é o logo oficial.** `BeelinkLogo`, variante ícone, já é uma bag: em preto sobre a faixa, a
    marca e os dois aros são furos por onde o amarelo aparece. Nenhum desenho novo.
11. **Nome completo fica.** A nota do canvas fala em cartão só com CPF e WhatsApp; as duas pranchetas
    e o pedido têm o nome.
12. **As quatro vantagens têm o mesmo texto nas duas larguras.** A prancheta 10b usa versões mais
    curtas no celular; os textos do pedido cabem em duas colunas a 390px.
13. **A frase do aceite continua "Li e aceito os termos de uso e a política de privacidade".** A
    prancheta diz "Aceito os termos e a privacidade"; os termos dizem que quem envia o formulário
    "declara ter lido" a política, e a frase mantém isso.
14. **A cor do botão muda de uma vez.** A transição de travado para liberado passava por um cinza
    sobre cinza; uma auditoria de contraste tirada nesse meio falhou no teste de navegador. Só a
    subida do botão sob o ponteiro continua suavizada.

## Fora do escopo

- O passo 2 do cadastro (e-mail e documentos). Fica um `TODO(BEELINK-329)` em
  `landing-courier-form-live.tsx`, onde as duas confirmações vão levar a ele.
- O envio do link de continuação pelo WhatsApp.
- O contraste da borda dos campos (cerca de 1,5:1 sobre o branco, como na prancheta e como já era). O
  contraste AA de texto está coberto pelo axe; o de borda de campo (WCAG 1.4.11) pediria um token
  novo, mais escuro que o do desenho.

## O que foi visto (13/10)

- **Design system, unidade:** os testes de `blocks/landing` — formulário (46), esquema e máscaras
  (92), seção e página (46).
- **Web, unidade:** `components/landing`, `services/couriers`, a rota e os textos legais (93 + 43).
- **Navegador, contra o build** (`next start` e a API compilada, banco `harness_banner` em :5442):
  `e2e/courier-application.spec.ts` e `e2e/site-consent.spec.ts`, 48 de 48. Entre eles: o corpo
  enviado tem a cidade e não tem e-mail, e a API responde 204; o CPF repetido responde 409 e a tela
  mostra "Esse CPF já tem cadastro" com o foco no cartão; o WhatsApp repetido fica no campo; o axe
  passa travado, com erro, liberado, com um texto legal aberto e enviado; a 390px nada estoura.
  - A primeira rodada teve 4 falhas: a data da versão legal em dois testes, um `role="alert"` que é
    do próprio Next (o anunciador de rota) e o contraste do botão no meio da transição (decisão 14).
- **Capturas** em 390, 768, 1280, 1440 e 1920px, com o formulário vazio, com erros, preenchido,
  enviado e com o CPF repetido: `.claude/worktrees/landing-aa-pr/screens-329/` (pasta ignorada pelo git).

## Acréscimo — o e-mail volta ao formulário (13/10, depois do PR aberto)

Com os PRs #266 e #267 abertos, o Rafael olhou o #266 e disse: "é necessário ter e-mail o entregador
para se cadastrar: nome, e-mail, WhatsApp, tipo de transporte". O pedido de design tirava o e-mail do
primeiro passo; a regra do produto é a dele. Perguntado sobre o CPF, que não estava na lista,
respondeu que fica.

O que mudou em relação ao que está acima:

- **O formulário pede nome, CPF, e-mail, WhatsApp e veículo.** Continua sem o select de cidade, com a
  cidade fixa no envio. O e-mail é obrigatório e validado como antes. Vale no lugar da linha 2 da
  Definição de Pronto e da linha 4 ("nenhum e-mail").
- **O BEELINK-328 foi cancelado e o #266 fechado sem merge.** A API fica como está no `main`: o
  e-mail é obrigatório. Os commits dele, que esta branch carregava, foram revertidos aqui; a
  migration que soltava o `NOT NULL` nunca foi mergeada nem publicada.
- **A confirmação volta a dizer que o resto chega por e-mail** (vale no lugar da decisão 2 e da linha
  8). É verdade desde o BEELINK-326: a API envia o e-mail de "cadastro recebido" a cada cadastro que
  guarda. As perguntas frequentes voltam ao texto do `main`. Nada mais promete contato por WhatsApp.
- **Para o próximo passo ficam só os documentos**: a frase embaixo do botão é "Os documentos ficam
  para o próximo passo."
- **E-mail repetido** volta a ser erro no campo do e-mail, como o WhatsApp. O CPF repetido continua
  virando "Esse CPF já tem cadastro" no lugar do formulário.
- **A versão legal `2026-10-15` ficou menor.** O que o formulário coleta não mudou; a política só
  deixa de citar o nome antigo do formulário ("Comece seu cadastro") e passa a dizer que a cidade
  não é perguntada porque hoje é sempre Fortaleza/CE.
- **A altura cresceu com o campo:** 848px no desktop com o formulário vazio, 802px preenchido, 373px
  com a confirmação. No celular, 1194px.

O que foi visto depois da mudança: os testes de `blocks/landing` (267), os do web para a seção, o
envio e os textos legais (136) e o navegador contra o build, `courier-application` e `site-consent`,
48 de 48 — entre eles o corpo enviado com e-mail e cidade, o e-mail repetido recusado no campo e o
CPF repetido no cartão.

Sobre o CI do #267 antes desta mudança: o job `web` falhou no build ao baixar a fonte Figtree do
Google no runner ("next/font/google"), com os testes verdes; o job de e2e, que builda o mesmo commit,
passou.
