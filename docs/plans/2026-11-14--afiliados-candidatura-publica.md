# Afiliados — a página "Seja afiliado" e as candidaturas

> **Tier:** plans — verdadeiro num momento, para um pedido. Fica velho por construção, e é append-only.
>
> Um seguimento do épico [Afiliados](2026-10-24--afiliados.md). O desenho foi aprovado pelo usuário em
> 14/11/2026, num canvas com a vitrine, a página, o formulário, o configurador, o editor de conteúdo e
> as candidaturas.

## O pedido

Hoje só o lojista cadastra afiliados: o assistente de quatro passos manda o convite. O usuário quer que
a pessoa também chegue de fora para dentro: clica num banner da loja, cai numa página de afiliados curta
e explicativa e, com um clique, preenche um formulário. A comissão é a que o painel já define: uma
padrão, ajustável por afiliado.

Na revisão do desenho, o usuário pediu: **o conteúdo da página é de cada loja, e nada nela é fixo**. Cada
cliente escreve os textos dela.

## Definition of Done

1. **Modelo.** `AffiliatePage` (uma por loja) guarda:
   - se as candidaturas estão abertas;
   - onde a página aparece: banner na página inicial, link no rodapé, faixa no topo;
   - a tabela de comissão que a página anuncia;
   - se a aprovação é manual ou o convite sai na hora;
   - o conteúdo.

   `AffiliateApplication` guarda cada candidatura: nome, e-mail, WhatsApp, a resposta da pergunta extra,
   a situação (`PENDING`, `APPROVED` ou `REFUSED`), quando foi decidida e o afiliado que gerou. Os dois
   vêm com a migração.
2. **Contracts.** Ficam em `packages/contracts`:
   - a página como o lojista a edita e como a vitrine a lê;
   - o conteúdo, com os seus limites;
   - a candidatura, como o lojista a lista e como o visitante a envia;
   - o que a aprovação recebe e os códigos de erro novos.
3. **Rotas do lojista.**
   - `GET` e `PUT /stores/:slug/affiliate-page`.
   - `GET /stores/:slug/affiliate-applications`, filtrada por situação e paginada, com a contagem de
     pendentes.
   - `POST …/:id/approve`, com a tabela, ou a da página se nenhuma vier, e `POST …/:id/refuse`.

   São só do dono e nascem fechadas à página travada.
4. **Rotas públicas**, num controller e num caminho só delas (`affiliate-join`), longe das do dono.
   - `GET /stores/:slug/affiliate-join` responde o conteúdo, a taxa geral da tabela anunciada, os termos
     e a versão deles. Se a página não está aberta, `404 AFFILIATE_PAGE_CLOSED`.
   - `POST /stores/:slug/affiliate-join/applications` grava a candidatura e responde `202`, sempre igual.
     Responde assim mesmo quando o e-mail já tem candidatura pendente, já é afiliado vivo da loja ou
     quando o campo-isca vem preenchido: o formulário não revela quem já está lá. Tem limite por
     endereço, configurável como o do formulário de entregador (`AFFILIATE_APPLICATION_RATE_LIMIT_*`).
5. **Aberta** quer dizer: candidaturas abertas, programa ligado e `AFFILIATE_LINKS_ENABLED` no deploy.
   Fora disso, nem a página nem a vitrine mostram nada.
6. **`PublicStore` ganha `affiliatePage`.** Traz onde a página aparece, os textos do banner e a taxa.
   Fica `null` quando a página não está aberta.
7. **Aprovar** cria o afiliado `INVITED` com nome, e-mail e WhatsApp da candidatura, sem CPF e sem
   documento, e o convite sai pelo e-mail de sempre. Com "convidar na hora", isso acontece no envio do
   formulário.
8. **O convite sem CPF pede o CPF no aceite.** `AffiliateInvitation.cpfRequired` diz quando. O aceite
   recebe `cpf`, conferido e único na loja entre os vivos (`AFFILIATE_CPF_TAKEN`). Faltando, responde
   `AFFILIATE_ACCEPTANCE_INVALID`.
9. **Retenção.** Uma candidatura decidida é apagada 90 dias depois da decisão, por um varredor.
10. **Endereço.** `seja-afiliado` e `become-an-affiliate` viram palavras de rota (`affiliateJoin`) e
    segmentos reservados. Nenhuma categoria nem `/nome` de afiliado pode tomá-los.
11. **Painel.**
    - Em Afiliados › Configurações, o cartão "Página de afiliados".
    - Em `/admin/<slug>/affiliates/page`, o editor de conteúdo com prévia do topo.
    - Em `/admin/<slug>/affiliates/applications`, a aba Candidaturas, com a contagem de pendentes.
    - O aceite do convite com o campo de CPF quando ele é pedido.
12. **Vitrine.**
    - A página em `/<loja>/seja-afiliado` (`/seja-afiliado` no domínio da loja): topo, como funciona,
      benefícios, perguntas e chamada final.
    - O formulário abre no lugar com um clique. A confirmação usa a mensagem da loja.
    - O banner na página inicial, o link no rodapé e a faixa no topo aparecem conforme a configuração.
    - Nada disso aparece no sub-site de um afiliado.
13. **Docs.** O mapa de superfície, o produto (`docs/product/README.md`), a versão não publicada da
    política de privacidade e o `deploy.md` (conferir que nenhuma loja tem categoria ou afiliado
    `seja-afiliado`).
14. **Verde.** `pnpm ci-check`, o e2e novo e a suíte e2e da API inteira.

## Decisões

### Uma candidatura não é um afiliado

O formulário público grava uma `AffiliateApplication`. Aprovar reaproveita o cadastro de afiliado que
já existe, com convite, `/nome`, Pix e termos. Nada do aceite é duplicado. Recusar não avisa a pessoa.

### Aprovação manual por padrão

O link põe o nome da loja na página de outra pessoa, e o AF10 prevê cobrar por afiliado ativo. Então
cada candidatura passa pelo lojista, a não ser que ele escolha "convidar na hora". Na aprovação ele pode
trocar a tabela; sem trocar, vale a que a página anuncia, e sem esta, a Padrão.

### CPF no aceite, documento depois

O formulário pede só nome, e-mail e WhatsApp. Assim a loja guarda o mínimo de quem ela vai recusar.
Quem foi aprovado informa o CPF ao aceitar o convite, e o CPF é conferido como no assistente. O
documento de identidade continua sendo do lojista: a ficha mostra "documento pendente" como já faz para
os convidados antes de 12/11, e o lojista o anexa lá. **O afiliado enviar o próprio documento fica fora**
(veja abaixo).

### O conteúdo é da loja; o padrão é do produto

Cada campo do conteúdo é opcional. `null` quer dizer "o texto padrão", que mora no locale do web, nunca
no banco. Assim um padrão melhorado chega a toda loja que não escreveu o seu, e "Restaurar padrão" é
gravar `null`. Duas marcas valem em qualquer texto: `{loja}`, que vira o nome da loja, e `{comissao}`,
que vira a taxa geral da tabela anunciada ("10%"). As marcas acompanham uma troca de nome ou de tabela.

O que a loja escreve:

- **Topo:** selo, título, subtítulo, texto do botão, até 3 destaques e uma imagem opcional (a mesma
  subida de imagem da loja). Sem imagem, o topo mostra como fica o link do afiliado.
- **Como funciona:** de 1 a 4 passos, cada um com título e texto.
- **Benefícios:** de 0 a 6, cada um com título e texto.
- **Perguntas frequentes:** de 0 a 10, cada uma com pergunta e resposta.
- **Chamada final:** título e texto.
- **Formulário:** título, subtítulo, a pergunta extra (ligada ou não, e o texto dela) e a mensagem
  depois do envio.
- **Banner da vitrine:** título, texto e botão.

Nome, e-mail, WhatsApp e o aceite dos termos e da política de privacidade não saem do formulário: são o
que o convite e a lei pedem.

Os títulos das seções ("Como funciona", "Perguntas frequentes") seguem o mesmo esquema: opcionais, com
padrão.

O conteúdo é uma coluna `jsonb` validada por DTO, com tipo em `contracts`. Não são tabelas, porque
nenhuma consulta lê um passo ou uma pergunta isolados.

### Uma página, um endereço

`/<loja>/seja-afiliado` é uma palavra de rota por vocabulário, como `carrinho`: `seja-afiliado` em
PT_BR e `become-an-affiliate` em EN. As duas são reservadas em todo vocabulário, como manda a lista de
segmentos reservados. Antes do deploy, é preciso conferir em produção que nenhuma categoria (atual ou
antiga) e nenhum afiliado têm esse nome.

### Fora do sub-site

No sub-site de um afiliado (`/<loja>/<nome>/…`), a loja é a vitrine dele. Recrutar ali competiria com
quem trouxe o visitante. Então banner, faixa e link do rodapé não aparecem sob um nome.

### Nada no ar antes da política

O formulário recolhe dados de quem não é cliente. A versão não publicada da política (AF9) ganha um
parágrafo sobre isso, e a página só abre com `AFFILIATE_LINKS_ENABLED`, o mesmo interruptor dos links.

### O formulário não revela quem está lá

Toda candidatura válida recebe a mesma resposta. Um e-mail com candidatura pendente atualiza a que
existe, sem criar outra. Um e-mail de afiliado vivo não grava nada. Um campo-isca preenchido, que só
robô vê, não grava nada. O limite por endereço é o de uma escrita pública.

## Entrega em três PRs empilhados

1. **API e contracts** (esta branch, `feat/afiliado-candidatura-publica`): itens 1 a 10 do DoD, com o
   e2e e os docs do lado da API.
2. **Painel**: item 11.
3. **Vitrine e política**: itens 12 e 13.

## Fora de escopo

- O afiliado enviar o próprio documento no aceite: uma porta de upload aberta por token é uma superfície
  nova sobre arquivos que só o lojista vê. Fica para depois.
- Avisar o lojista de uma candidatura nova por e-mail ou no sino: na v1, só o contador da aba.
- Avisar o candidato de que foi recusado.
- Campos de formulário além da pergunta extra.
- Medir o funil da página (visitas, cliques no botão, envios).
