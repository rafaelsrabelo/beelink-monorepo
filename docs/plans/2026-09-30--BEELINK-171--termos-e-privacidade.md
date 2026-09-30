# BEELINK-171 · L5 — Termos de uso e política de privacidade, com o aceite registrado

> **Tier:** plans. Retrata um momento, para um ticket. Só recebe acréscimos.

## O problema

O bee-link guarda dados pessoais de dois públicos:
- **lojistas:** nome, e-mail e senha;
- **clientes das lojas:** nome, e-mail, telefone, CPF, data de nascimento, endereços, pedidos e conversas.

Não existe termo de uso nem política de privacidade, e nenhum aceite é registrado. O épico L quer a primeira versão no ar para lojas reais, e a LGPD exige dizer quem controla cada dado, para que ele serve, com quem é compartilhado e como o titular exerce seus direitos.

O mapeamento mostrou que só dois caminhos criam conta:
- `AuthService.register` serve o cadastro com senha do painel e da loja, porque `CustomerRegisterDto` estende `RegisterDto`;
- o callback do "Continuar com Google" cria a conta da loja sem formulário nenhum.

## Definition of Done

1. As páginas públicas **`/termos`** e **`/privacidade`** mostram os textos do bee-link, com a versão.
2. A criação de conta registra o aceite com a **data e a versão** do texto, nos três caminhos:
   - o cadastro do lojista no painel;
   - o cadastro do cliente na loja;
   - a conta que nasce pelo "Continuar com Google".
3. A retomada de uma conta nunca confirmada pelo Google registra o aceite do dono verdadeiro do e-mail.
4. Os links para os termos e a política aparecem:
   - no rodapé da loja;
   - nas telas de entrar e de criar conta, no painel e na loja.

   A tela de criar conta diz, ao lado do botão, que criar a conta é aceitar.
5. `termos` e `privacidade` passam a ser slugs reservados: nenhuma loja nova pode tomar esses endereços.
6. A política diz quem é controlador e quem é operador, e qual é o canal do titular:
   - o lojista é controlador dos dados dos clientes da loja, e o bee-link é operador;
   - o bee-link é controlador dos dados da conta do lojista.

## Decisões

- **Uma tabela `legal_acceptances`, só de inserção:** conta, versão, canal (`SIGN_UP` ou `GOOGLE`) e data.
  - Ela segue o padrão do histórico que já existe (`order_events`, `store_page_versions`): uma versão nova dos textos vira uma linha nova, e nada é editado.
  - As linhas vão embora junto com a conta (`Cascade`). Um aceite sem a conta não identifica ninguém. O J13 decide o resto.
- **O aceite é gravado no mesmo `INSERT` da conta.** É um `create` aninhado, então conta e aceite nascem juntos ou nenhum dos dois.
- **Aceitar é criar a conta num lugar que diz isso, sem checkbox.** A frase ao lado do botão é "Ao criar a conta, você aceita os Termos de uso e declara ter lido a Política de privacidade", com links.
  - O formulário da loja funciona sem script.
  - O botão do Google é um link, e nele o clique é o aceite.
  - Uma checkbox obrigatória falharia com a página aberta durante uma troca de versão.
  - **A revisão jurídica pode exigir a checkbox.** Trocar é uma mudança pequena, porque a gravação já está pronta.
- **A política é "lida", e os termos são "aceitos".** Termos de uso são contrato (LGPD art. 7º, V). A política informa, não pede consentimento. O único consentimento que o produto guarda, o de ofertas por e-mail (J12), continua como está.
- **A versão é a data em que os textos passam a valer, com um tipo literal no contrato:** `LegalVersion = "2026-09-30"`.
  - A API grava a constante dela (`LEGAL_VERSION`), e as páginas mostram a do conteúdo delas. As duas são tipadas com `LegalVersion`.
  - Mudar a versão no contrato obriga os dois lados a mudarem juntos, ou o build quebra.
  - O cliente não envia a versão, então não existe "página velha" para recusar.
- **Não guardamos IP nem user-agent no aceite.** Hoje o banco não guarda IP nenhum, e o próprio ticket é sobre minimização.
- **Contas anteriores ao L5 ficam sem aceite.** Nada as bloqueia. Pedir o aceite de novo quando a versão mudar fica para quando a primeira versão mudar.
- **O lojista aceita no cadastro da conta**, como o ticket diz. O aceite não se repete a cada loja criada.
- **Google:**
  - conta nova registra `GOOGLE`;
  - a retomada de uma conta nunca confirmada (o Google prova de quem é o e-mail e apaga a senha que outra pessoa pode ter escolhido) também registra `GOOGLE`, porque quem clicou agora é o dono;
  - uma conta confirmada que só liga o Google não registra nada: ela já passou pelo cadastro.
- **Páginas em `/termos` e `/privacidade`,** num grupo de rotas `(legal)` com layout próprio.
  - Uma rota estática vence o `[slug]` da loja.
  - Os dois nomes entram em `RESERVED_SLUGS`. Produção ainda não tem loja com esses nomes.
- **O texto é só em pt-BR,** que é a versão que vale juridicamente. Ele fica como dado estruturado (seções, parágrafos e listas) em `apps/web/src/locales/legal/`. Um bloco `LegalDocument` em `packages/ui` desenha o texto, sem Markdown e sem dependência nova.
- **Os links do rodapé ficam numa coluna nova, "Termos e privacidade",** nos montadores `shop-chrome.ts` e `site-chrome.ts`. Assim o bloco da vitrine não muda, e ele já está no limite de linhas.

## Fora de escopo

- Baixar e excluir os dados, que é o J13 (BEELINK-152).
- Pedir o aceite de novo quando a versão mudar.
- Aviso de privacidade nos formulários anônimos (contato, "Avise-me"). Eles não criam conta, e o ticket não os lista.

## Pendências do Rafael

- **Revisão jurídica dos dois textos antes do deploy,** como o ticket exige. Nos textos, os marcadores `[PREENCHER: …]` pedem os dados que o código não sabe:
  - razão social, CNPJ e endereço do bee-link;
  - o canal oficial do titular;
  - o foro.
- **Decidir entre a checkbox e o aviso,** na revisão jurídica.

## Depois do mapeamento (30/09)

Um mapeamento em quatro frentes (caminhos que criam conta, modelo de dados, telas, dados pessoais), com um crítico no fim, confirmou o desenho e mudou quatro pontos:

- **Redefinir a senha também registra o aceite (`PASSWORD_RESET`).** Desde o #146, redefinir a senha confirma o e-mail de uma conta nunca confirmada: é a mesma retomada que o Google faz. Além disso, os lojistas importados do sistema antigo entram pela primeira vez por `/reset-password`, nunca pelo cadastro. As duas telas de nova senha, a do painel e a da loja, dizem que definir a senha aceita os termos. O aceite é gravado quando a redefinição é o que confirma o e-mail, ou quando a conta ainda não tem aceite da versão em vigor. Uma conta que já aceitou a versão atual não ganha linha repetida.
- **O texto declara o próprio idioma.** As páginas seguem o idioma do visitante, e o texto é só em pt-BR. Por isso o documento traz `lang="pt-BR"` e a frase de vigência pronta, no próprio idioma. O bloco `LegalDocument` não usa o dicionário da tela.
- **A faixa de links embaixo do card de login usa `text-foreground/80`.** O texto `text-muted-foreground` sobre `bg-muted` fica em 4,34:1 de contraste, e a auditoria axe do Playwright no CI reprova.
- **A tabela de aceite não tem restrição de unicidade.** A retomada pelo Google trata qualquer P2002 como a corrida do vínculo com o Google e responderia 500. Uma conta retomada tem, de propósito, dois aceites da mesma versão.

Pontos confirmados que ficam fora deste ticket:
- **Importação do sistema antigo (L7).** Ela grava lojas direto no banco, sem passar pela checagem de slug. Precisa recusar ou renomear lojas chamadas `termos` e `privacidade`. Na virada loja a loja do BEE-1, os links na raiz (`/termos`, `/privacidade` e as rotas do Google) cairiam no app antigo.
- **A tela de consentimento OAuth do Google (fora do repositório)** precisa das URLs `/privacidade` e `/termos`.
- **A loja não tem dados jurídicos próprios** (razão social, CNPJ, e-mail de contato). Por isso a política não consegue nomear cada loja como controladora com dados do produto, e diz o papel de forma genérica.

## Depois da revisão (30/09)

Uma revisão em quatro frentes, com verificação adversarial, confirmou estes pontos, todos corrigidos:

- **O Google também registra o aceite para a conta que ainda não tem o da versão em vigor.** Isso vale em qualquer ramo: o vínculo que já existe, e a conta confirmada que liga o Google agora. O botão diz "Ao continuar com Google, você aceita…" também na tela de entrar. Pela decisão original, uma conta anterior aos termos entraria pelo Google ouvindo isso sem nada ser registrado. Uma conta que já tem o aceite da versão não ganha linha repetida. Esta regra substitui a do plano ("uma conta confirmada que só liga o Google não registra nada").
- **A redefinição de senha grava a confirmação do e-mail e o aceite numa transação só.**
- **O aviso do Google fica logo abaixo do botão do Google**, nas duas telas que o mostram. Entrar com senha não aceita nada, então essa tela termina só com os dois links.
- **Um teste prende a data que a página mostra à versão do contrato.** "Vigente desde 30 de setembro de 2026" tem que ser a data que `LegalVersion` nomeia.
- **Os commits da UI e do web viraram um só**, para cada commit compilar sozinho.
- **Correções no texto da política:**
  - o WhatsApp também recebe dados quando a loja abre uma conversa pelo painel (com o cliente, com os dados do pedido, ou com quem usou o formulário de contato);
  - o Google também informa a foto de perfil, que o bee-link não guarda;
  - o aviso do "Avise-me" ainda não existe, e hoje a loja não vê esses pedidos.

Refutados na verificação: o texto só em pt-BR e o site institucional, que o `docs/product` ainda não descreve. O primeiro é uma decisão do plano. O segundo é uma diferença anterior a este ticket.
