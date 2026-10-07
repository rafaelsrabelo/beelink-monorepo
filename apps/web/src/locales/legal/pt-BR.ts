// Types
import type { LegalVersion } from "@harness-monorepo/contracts"
import type { LegalDocumentContent } from "@harness-monorepo/ui/blocks/legal/legal-document"

/** Bee-link's legal texts in force (BEELINK-171). pt-BR only: the Portuguese text is the one that binds. */
export interface LegalTexts {
  version: LegalVersion
  terms: LegalDocumentContent
  privacy: LegalDocumentContent
}

/**
 * A first draft for legal review: each "[PREENCHER: …]" is a fact the code cannot know — who answers
 * for bee-link, its channels, the forum, the minimum age, the retention periods — and none may reach
 * production. Every other sentence says what the product does today, so a change in what it collects,
 * keeps or shares is a new version of these texts, with a new `version`.
 */
export const legalTexts = {
  version: "2026-10-06",
  terms: {
    lang: "pt-BR",
    title: "Termos de uso",
    effective: "Vigente desde 6 de outubro de 2026",
    intro: [
      "Estes Termos de uso são as regras para usar o bee-link. Eles explicam o que a plataforma faz, o que ela não faz e o que se espera de cada pessoa que a usa.",
      "Eles valem para dois públicos: o lojista, que cria uma conta no painel para publicar a sua loja, e o cliente, que cria uma conta numa loja para comprar dela. Quando uma regra vale só para um dos dois, o texto diz.",
      "Você aceita estes Termos quando cria a sua conta, pelo formulário de cadastro ou pelo botão \"Continuar com Google\", e também quando define uma senha pelo link enviado por e-mail. Nesses mesmos momentos, você declara ter lido a Política de privacidade, que explica como o bee-link trata dados pessoais.",
    ],
    sections: [
      {
        heading: "Quem somos",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link é operado por [PREENCHER: razão social], inscrita no CNPJ sob o nº [PREENCHER: CNPJ], com sede em [PREENCHER: endereço completo]. Nestes Termos, \"o bee-link\" é a plataforma e também quem responde por ela.",
          },
        ],
      },
      {
        heading: "O que é o bee-link",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link é uma plataforma em que lojistas publicam a sua loja na internet, com vitrine, catálogo e carrinho, e recebem os pedidos num painel. Cada loja tem um endereço próprio. A vitrine é pública: qualquer pessoa pode abri-la, e buscadores podem mostrá-la nos seus resultados.",
          },
          {
            kind: "paragraph",
            text: "Em vez de uma loja, o lojista pode publicar um site institucional, que apresenta o negócio e recebe mensagens por um formulário de contato.",
          },
          {
            kind: "paragraph",
            text: "O pedido feito numa loja fica registrado no bee-link, e cliente e loja podem conversar sobre ele dentro da plataforma. Depois do pedido, o bee-link também abre o WhatsApp da loja, quando ela tem um, com uma mensagem pronta, que o cliente decide se envia. O bee-link não envia mensagens de WhatsApp em nome de ninguém.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não é um marketplace. Não existe uma página que reúna todas as lojas, e uma loja não vê os clientes de outra.",
          },
          {
            kind: "paragraph",
            text: "[PREENCHER: condições comerciais do uso do bee-link pelo lojista, como gratuidade, planos, preços e cobrança; hoje o produto não cobra nada].",
          },
        ],
      },
      {
        heading: "A venda é entre o cliente e a loja",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link fornece a ferramenta, mas não participa da venda. Quem vende é a loja: ela define os produtos, os preços, o estoque, a entrega e o atendimento, e responde ao cliente por eles.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não vende, não compra, não entrega e não recebe pagamento pelos produtos anunciados. Ele também não garante a qualidade dos produtos nem o cumprimento das ofertas de uma loja.",
          },
          {
            kind: "paragraph",
            text: "Uma loja pode ter regras próprias, como as de troca, devolução e entrega. Elas valem entre o cliente e a loja, desde que respeitem a lei.",
          },
        ],
      },
      {
        heading: "Pedidos, pagamento e entrega",
        blocks: [
          {
            kind: "paragraph",
            text: "Para fazer um pedido, o cliente precisa de uma conta na loja, com o e-mail confirmado. O pedido começa como \"recebido\", e a loja decide se o aceita ou o cancela. O cliente acompanha o andamento na loja e pode receber avisos por e-mail quando o pedido é aceito, sai para entrega ou fica pronto para retirada, é entregue ou é cancelado.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não processa pagamentos e não guarda dados de cartão. A forma de pagamento que aparece no pedido só indica o que o cliente e a loja combinaram. Nada é cobrado, retido ou devolvido pelo bee-link.",
          },
          {
            kind: "paragraph",
            text: "A taxa de entrega pode ficar a combinar com a loja. Enquanto a loja não a informar, o total mostrado não inclui a entrega.",
          },
          {
            kind: "paragraph",
            text: "O cliente pode cancelar pelo bee-link um pedido que ainda está como \"recebido\". Depois que a loja o aceita, só ela pode cancelá-lo no sistema. Isso descreve apenas como o pedido é registrado: não limita os direitos do cliente perante a loja, como o direito de arrependimento previsto no Código de Defesa do Consumidor.",
          },
        ],
      },
      {
        heading: "Cashback das lojas",
        blocks: [
          {
            kind: "paragraph",
            text: "Uma loja pode oferecer cashback: uma parte do valor dos produtos de um pedido volta para o cliente como crédito para usar em compras futuras na mesma loja. É a loja que decide se oferece cashback, a porcentagem, o valor mínimo do pedido, o prazo de validade do crédito e quanto de cada pedido pode ser pago com ele. A loja pode mudar essas regras, e a mudança vale para os pedidos seguintes.",
          },
          {
            kind: "paragraph",
            text: "O cashback é um crédito concedido pela loja, e não dinheiro. Ele vale só na loja que o concedeu e não pode ser sacado, trocado por dinheiro nem transferido para outra pessoa ou para outra loja. O bee-link só registra o saldo e o extrato: não recebe, não guarda e não paga nenhum valor.",
          },
          {
            kind: "paragraph",
            text: "O crédito de um pedido fica pendente até o pedido ser entregue, e só então pode ser usado. Se a loja definiu um prazo de validade, ele conta a partir da entrega, e o crédito que não for usado até o fim do prazo vence e deixa de existir. O cliente pode receber um aviso por e-mail antes do vencimento.",
          },
          {
            kind: "paragraph",
            text: "Se um pedido for cancelado, o crédito que ele gerou é retirado, e o crédito que o cliente usou nele volta ao saldo, com pelo menos 7 dias para ser usado. A loja também pode ajustar o saldo de um cliente, para mais ou para menos, e cada ajuste aparece no extrato.",
          },
          {
            kind: "paragraph",
            text: "O cliente vê o saldo, os créditos com a validade de cada um e o extrato em \"Minha conta\". Quando o cliente exclui a sua conta na loja, perde o saldo que tiver nela.",
          },
        ],
      },
      {
        heading: "Contas",
        blocks: [
          { kind: "paragraph", text: "Há dois tipos de conta, separados um do outro:" },
          {
            kind: "list",
            items: [
              "a conta de lojista é do bee-link e abre o painel, onde o lojista pode ter uma ou mais lojas;",
              "a conta de cliente pertence à loja em que foi criada e só vale nela: quem compra em duas lojas tem duas contas, com duas senhas, e uma loja não sabe da outra.",
            ],
          },
          {
            kind: "paragraph",
            text: "Para criar uma conta, você informa nome, e-mail e uma senha de 8 a 128 caracteres. Numa loja, você também pode usar o botão \"Continuar com Google\", quando ele estiver disponível. A conta criada com e-mail e senha só funciona depois que você confirma o e-mail pelo link que o bee-link envia, válido por 24 horas.",
          },
          {
            kind: "paragraph",
            text: "Para ter uma conta, você precisa ter [PREENCHER: idade mínima para conta de lojista e para conta de cliente]. Ao criar a conta, você declara que os dados informados são verdadeiros e que o e-mail é seu.",
          },
          {
            kind: "paragraph",
            text: "Você é responsável por guardar a sua senha e pelo que for feito com a sua conta. Se notar um uso que não reconhece, redefina a senha, o que encerra todas as sessões da conta, e avise o bee-link pelo canal indicado na seção de contato.",
          },
        ],
      },
      {
        heading: "Deveres do lojista",
        blocks: [
          { kind: "paragraph", text: "Ao usar o bee-link para vender, o lojista se compromete a:" },
          {
            kind: "list",
            items: [
              "manter corretas e atualizadas as informações da loja e dos produtos, como descrições, fotos, preços, estoque, prazos, formas e taxas de entrega;",
              "cumprir os pedidos que aceitar, entregar o que anunciou e atender o cliente, inclusive pela conversa do pedido e pelo WhatsApp informado na loja;",
              "cumprir o Código de Defesa do Consumidor e as regras do comércio eletrônico (Decreto nº 7.962/2013), o que inclui informar ao cliente quem é o fornecedor e como falar com ele, e respeitar o direito de arrependimento, as trocas e as garantias;",
              "emitir as notas fiscais e cumprir as obrigações fiscais, sanitárias e regulatórias do seu negócio, com as licenças e autorizações que os seus produtos exigirem;",
              "tratar os dados dos seus clientes como controlador, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD), como explica a seção seguinte;",
              "ter os direitos sobre tudo o que publicar, como textos, marcas, logotipos e fotos, ou a autorização de quem os tem;",
              "manter correto o número de WhatsApp da loja, que aparece na vitrine.",
            ],
          },
        ],
      },
      {
        heading: "Os dados dos clientes da loja",
        blocks: [
          {
            kind: "paragraph",
            text: "Para os dados dos clientes de uma loja, o lojista é o controlador, e o bee-link é o operador, nos termos da LGPD. O lojista decide para que usa esses dados, e o bee-link os trata em nome dele, para prestar o serviço.",
          },
          { kind: "paragraph", text: "Como controlador, o lojista deve:" },
          {
            kind: "list",
            items: [
              "usar os dados para finalidades ligadas à venda e ao atendimento, e mandar ofertas só a quem as aceitou;",
              "informar aos seus clientes como trata os dados deles e atender os pedidos que eles fizerem com base na LGPD;",
              "não repassar os dados a terceiros sem base legal;",
              "proteger o acesso ao painel, que mostra os dados dos clientes.",
            ],
          },
          { kind: "paragraph", text: "Como operador, o bee-link se compromete a:" },
          {
            kind: "list",
            items: [
              "tratar esses dados só para prestar o serviço à loja, seguindo estes Termos, que valem como as instruções da loja;",
              "enviar aos clientes, com o nome da loja como remetente, os e-mails de confirmação de conta, de nova senha e de andamento dos pedidos;",
              "proteger os dados com as medidas descritas na Política de privacidade e usar só os fornecedores listados nela;",
              "apoiar a loja no atendimento aos pedidos dos titulares e avisá-la de incidentes de segurança que afetem os clientes dela.",
            ],
          },
          {
            kind: "paragraph",
            text: "Quando uma loja deixar de usar o bee-link, [PREENCHER: o que acontece com os dados dos clientes da loja, como o prazo para a loja obter uma cópia e o prazo para a exclusão].",
          },
        ],
      },
      {
        heading: "Deveres do cliente",
        blocks: [
          { kind: "paragraph", text: "Ao usar uma loja no bee-link, o cliente se compromete a:" },
          {
            kind: "list",
            items: [
              "informar dados verdadeiros e só criar conta com um e-mail que seja seu;",
              "fazer pedidos de boa-fé e cumprir o que combinar com a loja, inclusive o pagamento;",
              "tratar a loja com respeito nas conversas dos pedidos;",
              "guardar a própria senha e não compartilhar a conta.",
            ],
          },
          {
            kind: "paragraph",
            text: "Dúvidas sobre um produto, um pagamento ou uma entrega são resolvidas com a loja, que é quem vende.",
          },
        ],
      },
      {
        heading: "Usos proibidos",
        blocks: [
          { kind: "paragraph", text: "Ninguém pode usar o bee-link para:" },
          {
            kind: "list",
            items: [
              "vender produtos ou serviços ilegais, falsificados, roubados ou que dependam de uma autorização que a loja não tem;",
              "publicar conteúdo ilegal, enganoso, discriminatório ou violento, ou que viole direitos de outras pessoas, como marcas, direitos autorais e imagem;",
              "aplicar golpes, criar lojas ou ofertas falsas, ou tentar obter senhas, dados de cartão ou outros dados de alguém;",
              "criar contas com dados falsos ou de outra pessoa;",
              "enviar mensagens em massa que ninguém pediu, ou usar os dados dos clientes para fins alheios à venda e ao atendimento;",
              "tentar acessar contas, lojas ou dados de outras pessoas, contornar limites de uso e medidas de segurança, ou procurar falhas de segurança sem autorização do bee-link;",
              "enviar vírus ou código malicioso, sobrecarregar o serviço ou coletar dados pessoais de forma automatizada;",
              "copiar, revender ou explorar o bee-link de forma diferente da prevista nestes Termos.",
            ],
          },
        ],
      },
      {
        heading: "Propriedade intelectual e conteúdo",
        blocks: [
          {
            kind: "paragraph",
            text: "A marca bee-link, o design e os textos da plataforma são protegidos por lei. Estes Termos dão a você o direito de usar o bee-link como descrito aqui, e nenhum outro direito sobre eles.",
          },
          {
            kind: "paragraph",
            text: "O conteúdo que o lojista publica, como textos, fotos, logotipos e marcas, continua sendo dele ou de quem o licenciou. Ao publicá-lo, o lojista autoriza o bee-link, sem custo e enquanto o conteúdo estiver na plataforma, a guardar, reproduzir e exibir esse conteúdo em diferentes tamanhos e telas, só para fazer o serviço funcionar, inclusive na vitrine pública, que buscadores podem indexar.",
          },
          {
            kind: "paragraph",
            text: "O lojista responde pelo conteúdo que publica. O bee-link pode retirar do ar um conteúdo que viole estes Termos, a lei ou direitos de terceiros, como prevê a seção sobre suspensão e encerramento.",
          },
        ],
      },
      {
        heading: "Disponibilidade do serviço",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link trabalha para manter a plataforma no ar, mas não garante que ela funcione sem interrupções ou sem erros. Manutenções e falhas de fornecedores, da internet ou de energia podem deixar o serviço fora do ar por algum tempo.",
          },
          {
            kind: "paragraph",
            text: "O bee-link pode mudar, melhorar ou retirar funções da plataforma. Quando uma mudança afetar de forma relevante o uso das lojas, o bee-link procura avisar os lojistas com antecedência.",
          },
          {
            kind: "paragraph",
            text: "Recomenda-se que o lojista guarde os originais do que publica, como fotos e textos.",
          },
        ],
      },
      {
        heading: "Limitação de responsabilidade",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link responde pelo funcionamento da plataforma, nos limites da lei. Ele não responde por:",
          },
          {
            kind: "list",
            items: [
              "produtos, preços, ofertas, entregas, trocas e pagamentos, que são da loja;",
              "conteúdo publicado pelas lojas;",
              "fatos ocorridos fora do bee-link, como conversas no WhatsApp e sites de terceiros abertos por links;",
              "danos causados pelo uso da conta por outra pessoa, quando a senha foi compartilhada ou não foi bem guardada;",
              "interrupções causadas por caso fortuito ou força maior.",
            ],
          },
          {
            kind: "paragraph",
            text: "Perante o lojista, o bee-link não responde por lucros cessantes, perda de vendas ou outros danos indiretos.",
          },
          {
            kind: "paragraph",
            text: "Nada nestes Termos afasta direitos que a lei garante ao consumidor e que não podem ser renunciados.",
          },
        ],
      },
      {
        heading: "Suspensão e encerramento",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link pode suspender ou encerrar uma conta ou uma loja, e retirar conteúdo do ar, quando houver violação destes Termos ou da lei, ordem de autoridade competente, risco à segurança da plataforma ou de outras pessoas, ou suspeita fundada de fraude. Sempre que possível, o bee-link avisa antes e explica o motivo.",
          },
          {
            kind: "paragraph",
            text: "Você pode deixar de usar o bee-link quando quiser. Hoje, o encerramento de uma conta ou de uma loja é pedido pelo canal indicado na seção de contato. No caso de uma conta de cliente, o pedido também pode ser feito à loja.",
          },
          {
            kind: "paragraph",
            text: "Depois do encerramento, os dados seguem o que a Política de privacidade diz sobre por quanto tempo são guardados.",
          },
        ],
      },
      {
        heading: "Mudanças nestes Termos",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link pode mudar estes Termos. Cada versão nova é publicada nesta página com a data em que passa a valer, e a data no topo mostra a versão em vigor.",
          },
          {
            kind: "paragraph",
            text: "Quando você aceita estes Termos, o bee-link registra a versão aceita, a data e o momento em que o aceite foi dado: no cadastro, no \"Continuar com Google\" ou ao definir a senha. [PREENCHER: como as contas existentes serão avisadas de uma versão nova e como vão aceitá-la].",
          },
        ],
      },
      {
        heading: "Lei aplicável e foro",
        blocks: [
          {
            kind: "paragraph",
            text: "Estes Termos seguem as leis do Brasil. Eles são escritos em português, e esta é a versão que vale, mesmo quando o painel é usado em outro idioma.",
          },
          {
            kind: "paragraph",
            text: "Fica eleito o foro da comarca de [PREENCHER: cidade e estado do foro] para resolver questões sobre estes Termos, ressalvado o direito do consumidor de propor ação no foro do seu domicílio.",
          },
        ],
      },
      {
        heading: "Contato",
        blocks: [
          {
            kind: "paragraph",
            text: "Dúvidas sobre estes Termos, pedidos de encerramento de conta e denúncias de uso indevido podem ser enviados para [PREENCHER: canal oficial de atendimento do bee-link, como um e-mail].",
          },
          {
            kind: "paragraph",
            text: "Assuntos sobre dados pessoais, inclusive os pedidos dos titulares, seguem o que diz a Política de privacidade.",
          },
        ],
      },
    ],
  },
  privacy: {
    lang: "pt-BR",
    title: "Política de privacidade",
    effective: "Vigente desde 6 de outubro de 2026",
    intro: [
      "Esta Política de privacidade explica quais dados pessoais o bee-link trata, para quê, com quem os compartilha, por quanto tempo os guarda e como você exerce os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD).",
      "Ela vale para os lojistas, para os clientes das lojas e para quem visita uma loja sem criar conta. Ao criar uma conta, ou ao definir uma senha pelo link enviado por e-mail, você declara que leu esta Política.",
    ],
    sections: [
      {
        heading: "Quem somos",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link é uma plataforma em que lojistas publicam a sua loja na internet e recebem pedidos. Ele é operado por [PREENCHER: razão social], inscrita no CNPJ sob o nº [PREENCHER: CNPJ], com sede em [PREENCHER: endereço completo].",
          },
        ],
      },
      {
        heading: "Controlador e operador",
        blocks: [
          {
            kind: "paragraph",
            text: "A LGPD chama de controlador quem decide para que e como um dado pessoal é usado, e de operador quem trata o dado em nome do controlador. No bee-link, os papéis são estes:",
          },
          {
            kind: "list",
            items: [
              "Dados do lojista: o bee-link é o controlador dos dados da conta do lojista e das lojas que ele cria.",
              "Dados dos clientes de uma loja: a loja é a controladora, e o bee-link é o operador, que trata esses dados em nome dela para prestar o serviço. A conta de cliente pertence à loja em que foi criada.",
              "Dados de quem usa o formulário de contato ou o \"Avise-me\" de uma loja: a loja é a controladora, e o bee-link é o operador.",
              "Dados que o bee-link trata para fins próprios, como o registro do aceite dos Termos de uso, a segurança da plataforma e os registros técnicos de acesso: o bee-link é o controlador, seja de quem for o dado.",
            ],
          },
          {
            kind: "paragraph",
            text: "Cada loja responde pelo uso que faz dos dados dos seus clientes e deve informá-los sobre esse uso.",
          },
        ],
      },
      {
        heading: "Dados dos lojistas",
        blocks: [
          { kind: "paragraph", text: "Quando você cria uma conta de lojista e monta a sua loja, o bee-link guarda:" },
          {
            kind: "list",
            items: [
              "nome, e-mail e senha, esta guardada só como um código irreversível (hash), nunca como você a digitou;",
              "a data em que você confirmou o e-mail, as sessões abertas, com as datas de início e de encerramento, e o registro de cada aceite dos Termos de uso, com a versão, a data e se foi no cadastro ou ao definir a senha;",
              "os dados de cada loja: nome, endereço na internet, descrição, logo, imagens, cores, categoria, número de WhatsApp, perfis em redes sociais, formas de pagamento aceitas e endereço completo com CEP, a partir do qual o bee-link calcula a posição da loja no mapa;",
              "o que você publica e registra no painel, como produtos, páginas, promoções e pedidos, e qual conta fez cada publicação, mudança de status ou mensagem.",
            ],
          },
          {
            kind: "paragraph",
            text: "Tudo o que a vitrine mostra é público, inclusive o número de WhatsApp e as redes sociais, e buscadores podem indexar essas informações. O endereço da loja e a posição dela no mapa não aparecem na vitrine.",
          },
        ],
      },
      {
        heading: "Dados dos clientes das lojas",
        blocks: [
          { kind: "paragraph", text: "Quando você cria uma conta numa loja e compra dela, o bee-link guarda, em nome da loja:" },
          {
            kind: "list",
            items: [
              "nome, e-mail e senha, esta guardada só como hash; quem entra só pelo \"Continuar com Google\" não tem senha até criar uma;",
              "se você usar o \"Continuar com Google\", o identificador da sua conta Google e o nome e o e-mail que o Google informa;",
              "celular, CPF, se você quiser informá-lo para a nota fiscal da loja, e data de nascimento, se quiser informá-la;",
              "até 10 endereços de entrega, cada um com o nome que você der a ele e quem recebe ali;",
              "os seus pedidos: itens, valores, formas de entrega e de pagamento, o endereço e quem recebe como eram no momento da compra, o histórico de andamento, os dados de envio, como o código de rastreio, e a observação interna que a loja pode anotar, que você não vê;",
              "as conversas dos pedidos: cada mensagem, quem a escreveu, quando e quando foi lida;",
              "as suas escolhas de avisos por e-mail, sobre o andamento dos pedidos, favoritos, cashback perto de vencer e ofertas da loja; só a escolha de receber ofertas é um consentimento, e o bee-link guarda a data em que você a fez;",
              "um resumo das suas compras na loja, como o número de pedidos e o valor total;",
              "o seu cashback na loja, quando ela oferece: o saldo, o que está pendente, cada crédito com a sua validade e o extrato do que entrou e saiu, com os ajustes que a loja fez e o motivo que ela anotou, que você não vê no extrato;",
              "a data em que você confirmou o e-mail, as sessões abertas e o registro de cada aceite dos Termos de uso, com a versão, a data e a forma do aceite.",
            ],
          },
          {
            kind: "paragraph",
            text: "Ao criar a conta, o seu nome e o seu e-mail já aparecem para a loja, mesmo antes da primeira compra. No painel, a loja vê o seu nome, e-mail, celular, CPF, data de nascimento, endereço padrão, pedidos, conversas e o saldo e o extrato do seu cashback. Ela nunca vê a sua senha nem as suas sessões.",
          },
          {
            kind: "paragraph",
            text: "A loja também pode cadastrar no painel clientes que compraram por outros meios, como o WhatsApp, com nome, celular e endereço, e pode corrigir o nome, o celular e o endereço padrão de um cliente. Nesses casos, quem informa os dados é a loja.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não processa pagamentos e não recebe nem guarda dados de cartão. A forma de pagamento do pedido é só uma indicação do que você combinou com a loja.",
          },
        ],
      },
      {
        heading: "Dados de quem visita uma loja sem conta",
        blocks: [
          { kind: "paragraph", text: "Para ver uma loja, você não precisa se identificar. Alguns recursos guardam dados:" },
          {
            kind: "list",
            items: [
              "o carrinho e o CEP de \"Entregar em\" ficam em cookies no seu navegador, e não no banco de dados do bee-link;",
              "a sua resposta ao aviso de cookies de uma loja que usa o Pixel da Meta também fica num cookie no seu navegador, e não no banco de dados do bee-link;",
              "o formulário de contato de uma loja ou site guarda o seu nome e as respostas aos campos que o dono escolheu, como e-mail e telefone, e a mensagem também é enviada ao e-mail do dono;",
              "o \"Avise-me\" de um produto esgotado guarda o seu número de WhatsApp e, se você quiser, o seu nome, para que a loja possa avisar quando o produto voltar; esse aviso ainda não existe no bee-link, e hoje o pedido fica guardado sem que a loja o veja.",
            ],
          },
        ],
      },
      {
        heading: "Dados técnicos",
        blocks: [
          {
            kind: "paragraph",
            text: "Quando você usa o bee-link, o servidor registra dados técnicos de cada acesso, como o endereço IP, a data e a hora, o endereço da página ou da ação pedida, que pode conter termos de busca, e a resposta dada. Esses registros (logs) servem para a segurança, a prevenção de abusos e a correção de erros.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não grava o endereço IP no banco de dados. Fora dos logs, o IP é usado só na memória do servidor, para limitar tentativas repetidas, como as de senha.",
          },
          {
            kind: "paragraph",
            text: "O bee-link não usa, por conta própria, ferramentas de análise de audiência, rastreadores nem pixels de publicidade, e não pede a sua localização ao navegador. O único script de terceiros que uma página do bee-link pode carregar é o Pixel da Meta de uma loja que o conectou, e só depois que você aceita, como explica a seção \"Pixel da Meta nas lojas\". As fontes das páginas são servidas pelo próprio bee-link, e os e-mails não têm imagens de rastreamento.",
          },
        ],
      },
      {
        heading: "Para que os dados são usados",
        blocks: [
          { kind: "paragraph", text: "Cada uso tem uma base legal prevista no art. 7º da LGPD:" },
          {
            kind: "list",
            items: [
              "Execução de contrato: criar e manter contas, confirmar o e-mail, redefinir a senha, publicar a loja e localizá-la no mapa, preencher endereços pelo CEP, registrar pedidos e conversas, enviar os e-mails de andamento dos pedidos, registrar o aceite dos Termos de uso e atender o que você pede pelo formulário de contato ou pelo \"Avise-me\".",
              "Cumprimento de obrigação legal: guardar registros de acesso e atender ordens de autoridades, quando a lei exigir.",
              "Legítimo interesse: proteger as contas e a plataforma, prevenir fraudes e abusos, limitar tentativas repetidas e investigar erros, sempre dentro do que se espera de um serviço como este.",
              "Consentimento: enviar ofertas e novidades de uma loja por e-mail, só a quem aceitou, e, numa loja que conectou um Pixel da Meta, enviar à Meta os dados da sua navegação naquela loja, só depois que você aceita no aviso de cookies. Você pode retirar o consentimento quando quiser: o das ofertas, em \"Avisos por e-mail\", na sua conta na loja; o do pixel, no link \"Cookies\", no rodapé da loja.",
            ],
          },
          {
            kind: "paragraph",
            text: "Para os dados dos clientes, a loja, como controladora, responde pelas bases legais dos usos que fizer deles. O bee-link não usa dados pessoais para publicidade própria. A loja que conecta um Pixel da Meta usa os dados da navegação de quem aceitou para medir e direcionar os anúncios dela, e responde por esse uso.",
          },
        ],
      },
      {
        heading: "Com quem os dados são compartilhados",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link não vende dados pessoais. Para funcionar, ele usa fornecedores que tratam dados em nome dele, cada um só no necessário:",
          },
          {
            kind: "list",
            items: [
              "provedor de e-mail, hoje a Purelymail: entrega os e-mails do bee-link, inclusive os enviados em nome das lojas, e por isso recebe o endereço e o conteúdo de cada um;",
              "Cloudinary: guarda as imagens que os lojistas enviam, como logos e fotos de produtos; o navegador de quem visita uma loja carrega essas imagens direto da Cloudinary, que recebe dados técnicos da conexão, como o endereço IP;",
              "MapTiler: recebe o endereço que o lojista digita na busca de endereço do painel e fornece o mapa dessas telas, que o navegador do lojista carrega direto dela;",
              "OpenStreetMap, pelo serviço Nominatim: recebe o endereço da loja para calcular a posição dela no mapa;",
              "ViaCEP: recebe o CEP digitado no endereço da loja ou num endereço de entrega da sua conta, a partir do servidor do bee-link e sem o seu IP, para preencher rua, bairro e cidade;",
              "Google: só quando você usa o \"Continuar com Google\"; o Google confirma quem você é e informa ao bee-link o identificador da sua conta, o seu nome, o seu e-mail e a sua foto de perfil, e o bee-link guarda só o identificador, o nome e o e-mail;",
              "hospedagem: o servidor onde o bee-link funciona e onde fica o banco de dados, [PREENCHER: provedor e país do servidor].",
            ],
          },
          {
            kind: "paragraph",
            text: "Os dados dos clientes de uma loja ficam disponíveis para ela no painel, e as mensagens do formulário de contato chegam também ao e-mail do dono, que passa a responder por elas.",
          },
          {
            kind: "paragraph",
            text: "O WhatsApp só recebe dados quando alguém toca num link de WhatsApp, e o aplicativo abre com uma mensagem pronta, que pode ser revisada antes de enviar. Depois de um pedido, você pode mandar à loja uma mensagem com o número do pedido, os itens, o total, o endereço de entrega, a forma de pagamento, o seu nome e o seu celular. No painel, a loja pode abrir uma conversa com o seu celular, com os dados do seu pedido, como os itens, o total, a forma de pagamento e o andamento, e também com o telefone de quem deixou uma mensagem no formulário de contato. O que é enviado passa a seguir as regras do WhatsApp e de quem o recebe.",
          },
          {
            kind: "paragraph",
            text: "A Meta só recebe dados numa loja que conectou um Pixel da Meta, e só depois que você aceita no aviso de cookies daquela loja. Ela não é fornecedora do bee-link: o pixel é da loja. O que é enviado e como recusar estão na seção \"Pixel da Meta nas lojas\".",
          },
          {
            kind: "paragraph",
            text: "Os links da loja para redes sociais e para o rastreio de entregas levam a sites de terceiros, que têm políticas próprias. O bee-link também compartilha dados quando a lei ou uma ordem de autoridade competente exigir.",
          },
        ],
      },
      {
        heading: "Pixel da Meta nas lojas",
        blocks: [
          {
            kind: "paragraph",
            text: "Uma loja pode conectar à própria vitrine um Pixel da Meta, a ferramenta com que a Meta, dona do Facebook e do Instagram, mede e direciona anúncios. Quem anuncia é a loja, e não o bee-link: o pixel é da conta de anúncios dela na Meta, é ela quem decide usá-lo, e os relatórios e os anúncios ficam com ela, na Meta. O bee-link não faz anúncios com esses dados e não os recebe de volta da Meta.",
          },
          {
            kind: "paragraph",
            text: "O pixel só existe nas lojas que o conectaram, e só é carregado depois que você aceita. Nessas lojas, um aviso de cookies pergunta se você aceita ou recusa. Enquanto você não responde, e se você recusa, o script da Meta não é carregado no seu navegador e nada é enviado à Meta por causa da sua visita. A loja funciona do mesmo jeito nos dois casos.",
          },
          { kind: "paragraph", text: "Se você aceita, o seu navegador carrega o script da Meta e passa a enviar a ela, direto:" },
          {
            kind: "list",
            items: [
              "o que você faz naquela loja, como as páginas e os produtos que abre, o que coloca no carrinho e o pedido que faz;",
              "os dados técnicos que toda conexão leva, como o endereço IP e a identificação do navegador;",
              "os identificadores que a Meta guarda em cookies no seu navegador, _fbp e _fbc, descritos na seção \"Cookies\".",
            ],
          },
          {
            kind: "paragraph",
            text: "Todas as lojas do bee-link ficam no mesmo domínio, e os cookies da Meta valem para o domínio inteiro, e não para uma loja só. Por isso, o identificador que a Meta guarda no seu navegador é um só para todas as lojas do bee-link: se você aceitar em duas lojas que usam pixel, a Meta recebe das duas o mesmo identificador e pode relacionar as duas visitas. O mesmo vale para o registro do clique num anúncio. Já a sua resposta ao aviso é de cada loja: aceitar numa loja não vale para outra, e cada loja que usa pixel pergunta por conta própria.",
          },
          {
            kind: "paragraph",
            text: "Você pode mudar de ideia quando quiser: o link \"Cookies\", no rodapé da loja, abre o aviso de novo e mostra a sua escolha atual. Se você retira o aceite, aquela loja deixa de enviar dados à Meta. Os cookies da Meta continuam no seu navegador até vencerem ou até você apagá-los nas configurações do navegador, e o que já foi enviado à Meta passa a seguir a política de dados dela.",
          },
          {
            kind: "paragraph",
            text: "O bee-link guarda a sua resposta só no seu navegador, no cookie bl_consent, e pergunta de novo depois de 180 dias.",
          },
        ],
      },
      {
        heading: "Transferência internacional",
        blocks: [
          {
            kind: "paragraph",
            text: "Alguns desses fornecedores podem guardar ou tratar dados fora do Brasil: [PREENCHER: quais fornecedores tratam dados fora do Brasil e em quais países].",
          },
          {
            kind: "paragraph",
            text: "Nesses casos, a transferência é feita como permite o art. 33 da LGPD, com base em [PREENCHER: mecanismo usado com cada fornecedor, como as cláusulas-padrão contratuais aprovadas pela ANPD].",
          },
        ],
      },
      {
        heading: "Cookies",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link usa só cookies essenciais e próprios, com nomes que começam por bl_. Eles guardam o que o serviço precisa para funcionar:",
          },
          {
            kind: "list",
            items: [
              "bl_access e bl_refresh: mantêm o lojista conectado ao painel; o primeiro dura cerca de 15 minutos, e o segundo, 30 dias, renovados a cada uso;",
              "bl_shopper_access e bl_shopper_refresh: fazem o mesmo para a conta de cliente e só são enviados às páginas da loja em que ela foi criada;",
              "bl_oauth_google: guarda por até 10 minutos uma entrada com Google em andamento, para confirmar que ela termina no mesmo navegador em que começou;",
              "bl_cart: o carrinho de cada loja, só com os produtos, as variações e as quantidades; dura 30 dias, renovados a cada mudança;",
              "bl_shop: o CEP informado em \"Entregar em\", em cada loja; dura 1 ano;",
              "bl_consent: a sua resposta, aceitar ou recusar, ao aviso de cookies de uma loja que usa o Pixel da Meta; vale só para aquela loja e dura 180 dias;",
              "bl_purchases: numa loja que usa o Pixel da Meta, e só depois que você aceita, os códigos dos seus últimos pedidos já informados à Meta, para que o mesmo pedido não seja informado duas vezes; vale só para aquela loja e dura 7 dias, renovados a cada pedido informado;",
              "bl_prefs: as preferências de exibição do painel, como o menu recolhido; dura 1 ano;",
              "bl_locale: o idioma escolhido; dura 1 ano.",
            ],
          },
          {
            kind: "paragraph",
            text: "O bee-link não grava cookies de análise, de publicidade ou de rastreamento, nem usa outros meios de guardar dados no seu navegador.",
          },
          {
            kind: "paragraph",
            text: "Os únicos cookies de publicidade que podem existir no endereço do bee-link são os da Meta, _fbp e _fbc. Quem os grava é o script da Meta, e só depois que você aceita o aviso de cookies de uma loja que usa o Pixel da Meta. O _fbp identifica o seu navegador para a Meta, e o _fbc guarda o clique no anúncio que trouxe você. Cada um dura cerca de 90 dias e vale para o domínio inteiro, e não só para a loja em que você aceitou.",
          },
          {
            kind: "paragraph",
            text: "Você pode apagar os cookies nas configurações do navegador. Apagar os do bee-link, que são essenciais, encerra as suas sessões, esvazia o carrinho e faz as lojas que usam pixel perguntarem de novo. Apagar os da Meta não muda nada no funcionamento das lojas.",
          },
        ],
      },
      {
        heading: "Por quanto tempo os dados são guardados",
        blocks: [
          {
            kind: "paragraph",
            text: "Os dados ficam guardados enquanto a conta ou a loja existir. Hoje, o bee-link não apaga dados automaticamente depois de um prazo. [PREENCHER: prazos de guarda a adotar, se houver, por exemplo para contas nunca confirmadas, sessões encerradas e pedidos de \"Avise-me\"].",
          },
          {
            kind: "paragraph",
            text: "Os registros técnicos do servidor são guardados por [PREENCHER: prazo de guarda dos logs; o art. 15 do Marco Civil da Internet pede 6 meses para os registros de acesso a aplicações, e hoje o servidor descarta os logs por volume, sem prazo fixo].",
          },
          {
            kind: "paragraph",
            text: "[PREENCHER: se há cópias de segurança do banco de dados, onde ficam e por quanto tempo são guardadas].",
          },
          {
            kind: "paragraph",
            text: "Quando uma conta ou uma loja for excluída, os dados ligados a ela serão eliminados, exceto os que a LGPD permite conservar, como os necessários para cumprir uma obrigação legal.",
          },
        ],
      },
      {
        heading: "Segurança",
        blocks: [
          { kind: "paragraph", text: "O bee-link adota medidas técnicas para proteger os dados, entre elas:" },
          {
            kind: "list",
            items: [
              "senhas guardadas só como hash, com o algoritmo argon2, e códigos de sessão e de links guardados também só como hash;",
              "acesso ao site só por conexão segura (HTTPS);",
              "cookies de sessão fora do alcance de scripts da página;",
              "links de confirmação de e-mail e de nova senha que valem uma única vez: o primeiro por 24 horas, o segundo por 1 hora;",
              "redefinição de senha que encerra todas as sessões da conta;",
              "limite de tentativas para entrar, criar conta, fazer pedidos e enviar mensagens e formulários;",
              "banco de dados numa rede interna do servidor, sem acesso direto pela internet;",
              "separação entre as lojas: cada lojista só acessa os dados das próprias lojas.",
            ],
          },
          {
            kind: "paragraph",
            text: "O acesso direto ao banco de dados é restrito a quem administra o servidor.",
          },
          {
            kind: "paragraph",
            text: "Nenhum sistema é totalmente seguro. Se houver um incidente de segurança que possa causar risco ou dano relevante, o bee-link o comunica como a LGPD exige: à Autoridade Nacional de Proteção de Dados (ANPD) e às pessoas afetadas, quando for o controlador dos dados, e à loja, quando os dados forem de clientes dela.",
          },
        ],
      },
      {
        heading: "Seus direitos",
        blocks: [
          { kind: "paragraph", text: "A LGPD (art. 18) garante a você, entre outros, os direitos de:" },
          {
            kind: "list",
            items: [
              "confirmar se os seus dados são tratados e ter acesso a eles;",
              "corrigir dados incompletos, inexatos ou desatualizados;",
              "pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;",
              "pedir a portabilidade dos seus dados a outro fornecedor;",
              "pedir a eliminação dos dados tratados com o seu consentimento;",
              "saber com quem os seus dados são compartilhados;",
              "saber que pode não dar o consentimento e o que acontece se não der;",
              "retirar o consentimento a qualquer momento;",
              "opor-se a um tratamento que descumpra a lei.",
            ],
          },
          {
            kind: "paragraph",
            text: "Você também pode apresentar reclamação à ANPD.",
          },
        ],
      },
      {
        heading: "Como exercer os seus direitos",
        blocks: [
          { kind: "paragraph", text: "O caminho depende de quem controla o dado:" },
          {
            kind: "list",
            items: [
              "Se você é cliente de uma loja, faça o pedido à loja, que é a controladora dos seus dados. O bee-link, como operador, apoia a loja e leva a ela o pedido que receber sobre esses dados.",
              "Se você é lojista, faça o pedido ao bee-link, pelo canal indicado na seção de contato.",
              "Para os dados que o bee-link trata para fins próprios, como os registros técnicos e o aceite dos Termos de uso, qualquer pessoa pode falar direto com o bee-link.",
            ],
          },
          {
            kind: "paragraph",
            text: "Na sua conta numa loja, em \"Minha conta\", você já pode ver os seus pedidos, conversas e cashback, corrigir nome, celular, CPF, data de nascimento e endereços, mudar os avisos por e-mail, trocar a senha e sair de todos os aparelhos. O e-mail, que é o seu login, não muda pela tela.",
          },
          {
            kind: "paragraph",
            text: "Hoje, a exclusão de uma conta ou de uma loja é pedida pelo canal indicado na seção de contato. Para proteger você, o bee-link pode pedir que confirme a sua identidade antes de atender, e responde nos prazos da LGPD.",
          },
        ],
      },
      {
        heading: "Crianças e adolescentes",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link não é dirigido a crianças. Para criar uma conta, é preciso ter [PREENCHER: idade mínima para conta de lojista e para conta de cliente].",
          },
          {
            kind: "paragraph",
            text: "O bee-link não verifica a idade de quem cria uma conta, e a data de nascimento é opcional. Se você é responsável por uma criança ou um adolescente e acredita que ele informou dados ao bee-link ou a uma loja, fale pelo canal indicado na seção de contato para que o caso seja analisado.",
          },
        ],
      },
      {
        heading: "Mudanças nesta Política",
        blocks: [
          {
            kind: "paragraph",
            text: "O bee-link pode mudar esta Política, por exemplo ao usar um fornecedor novo. Cada versão é publicada nesta página com a data em que passa a valer, e a data no topo mostra a versão em vigor.",
          },
          {
            kind: "paragraph",
            text: "[PREENCHER: como as pessoas com conta serão avisadas de mudanças relevantes nesta Política].",
          },
        ],
      },
      {
        heading: "Contato e encarregado",
        blocks: [
          {
            kind: "paragraph",
            text: "Para exercer os seus direitos ou tirar dúvidas sobre esta Política, fale com o bee-link por [PREENCHER: canal oficial de atendimento ao titular, como um e-mail].",
          },
          {
            kind: "paragraph",
            text: "Encarregado pelo tratamento de dados pessoais: [PREENCHER: nome do encarregado], pelo e-mail [PREENCHER: e-mail do encarregado].",
          },
        ],
      },
    ],
  },
} satisfies LegalTexts
