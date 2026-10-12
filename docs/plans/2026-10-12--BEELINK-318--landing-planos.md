# BEELINK-318 (AA2) — Landing: a seção "Planos", com 7 dias grátis

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Segundo ticket da pilha: `main` → AA1 (317) →
> **AA2** → AA3 … Sai de `feat/BEELINK-317-landing-integracoes`, e o PR tem essa branch como base.
> Toca `packages/ui` e `apps/web`. O Rafael delegou as decisões deste épico; as que estão abaixo são
> do desenvolvedor, e ele pode mudar qualquer uma.

## O problema

A landing (`/`) diz o que a Beelink é e com o que a loja se conecta, mas não diz quanto custa nem
que dá para testar antes de pagar. O lojista só descobriria o preço depois de criar a conta, e hoje
nem lá.

## Definição de Pronto

1. A seção `id="planos"` fica entre "Como funciona" e "Para entregadores" e aparece do celular ao
   computador. A 390 px a página não rola de lado.
2. O cartão "Beelink" mostra "7 dias grátis, sem cartão" em destaque, o mensal como R$ 59,90 e o
   botão "Testar 7 dias grátis", que leva a `/signup`.
3. O seletor Mensal / 6 meses / Anual é um grupo de rádios com legenda. Trocar a opção muda o valor,
   o valor por mês e a economia sem recarregar a página, pelo ponteiro e pelo teclado.
4. O cartão "Beelink + Beelia" mostra R$ 89,90 por mês e "Em breve", sem botão e sem link.
5. Uma frase diz o que vem depois do teste: a conta fica travada até o lojista escolher um plano e
   pagar, e nada é cobrado sozinho.
6. Os preços ficam num lugar só, em centavos (5990, 32340, 57480, 8990). O valor por mês e a
   economia são calculados. Nenhum preço está escrito num componente ou num dicionário, e um teste
   segura isso.
7. Cada plano lista o que inclui, e cada item foi conferido no produto.
8. Os 7 dias grátis, sem cartão, aparecem também no hero e na chamada final, sem mudar o desenho
   delas.
9. Na barra do topo, "Planos" ocupa o lugar de "Perguntas", entre "Como funciona" e "Para
   entregadores", e a barra cabe a 1280 px com barra de rolagem clássica (medido). O menu do celular
   lista as sete seções. O rodapé ganha um link "Perguntas".
10. A FAQ do lojista ganha "Quanto custa?", "Como funciona o teste de 7 dias?" e "O que acontece
    quando o teste acaba?", com os valores preenchidos a partir do dado.
11. Os textos estão em `messages.landing.plans`, em pt-BR e em inglês.
12. O bloco mora em `packages/ui`, com história num arquivo próprio e teste com axe. Os testes que a
    landing já tinha continuam passando. `pnpm ci-check` verde.
13. O bloco e a seção entram nas tabelas de `packages/ui/docs/README.md` e `apps/web/docs/README.md`.
14. A página foi usada num navegador a 1280 px e a 390 px, com teclado, e há capturas das duas
    larguras.

## O que o produto faz hoje (conferido antes de escrever a lista do plano)

| Item da lista | O que existe | Onde está |
|---|---|---|
| Loja no seu link, com a sua marca | vitrine em `/<slug>`, com nome, logo e cores da loja | `docs/product/README.md`, "Stores" e "The shop window" |
| Modo design | editor da página, com seções e modelos prontos | `apps/web/src/app/(editor)/admin/[slug]/design`; dicionário `design` ("Modo design", "Modelos") |
| Catálogo com categorias, variações e estoque | produto, categoria, combinações com preço e estoque próprios | `docs/product/README.md`, "Catalogue"; dicionário `products` ("Variações") |
| Carrinho e checkout | carrinho no aparelho, checkout com entrega, pagamento e cupom | "The shop window", "Checkout and the handoff to WhatsApp" |
| Pedidos, clientes e conversa por pedido | painel com pedidos, clientes e a conversa de cada pedido | "Orders", "Customers", "The order's conversation"; rotas `orders`, `customers`, `conversations` |
| Cupons, promoções e cashback | os três, com as regras do lojista | "Promotions and coupons", "Cashback" |
| Retirada, entrega própria e transportadoras | três formas de entrega; transportadoras pela conta do lojista no Melhor Envio | "Delivery" |
| Pix e cartão de crédito pelo Asaas | cobrança na conta Asaas da loja; **boleto não existe** | "Checkout and the handoff to WhatsApp"; plano do AA1 |
| Relatórios | "Vendas por origem" e "Funil da loja" | dicionário `reports.index` |
| Pixel da Meta e API de Conversões | os dois, para quem aceita os cookies | "The shop's ad pixel" |
| Domínio próprio | a loja no domínio do lojista | "Stores" |
| Avaliações e favoritos | avaliação de quem recebeu o produto; favoritos do cliente com conta | "Reviews", "Customers" |

**Ficou de fora da lista, de propósito:** "combos". A landing já fala deles no banner da loja e no
passo "Monte a vitrine" (textos do BEELINK-256), mas não achei combo nenhum no produto: nada na API,
nada no painel. Não repito a palavra aqui. Corrigir aqueles dois textos é outro ticket.

## Decisões

1. **Os preços e o tamanho do teste moram em `apps/web/src/lib/plans.ts`**, e em mais nenhum lugar:
   `PLAN_PRICES = { trialDays: 7, beelink: { monthly: 5990, semiannual: 32340, annual: 57480 },
   withBeelia: { monthly: 8990 } }`, em centavos. O bloco recebe isso por props. Quantos meses tem
   cada período (1, 6 e 12) é do bloco: é a definição de "semestral" e "anual", não um preço.
2. **O tamanho do teste também é dado, não texto.** O ticket fala só de preço, mas "7 dias" aparece
   em nove frases, e trocar o prazo um dia seria caçar as nove em dois idiomas. As frases usam
   `{days}`, preenchido como a FAQ preenche `{monthly}`. O hero e a chamada final ganham a prop
   `trialDays`.
3. **As contas.** Valor por mês = total ÷ meses, arredondado para cima (nunca anunciar menos do que
   se paga). Economia = mensal × meses − total. Percentual arredondado para baixo, a mesma regra que
   `discountPercent` aplica ao desconto de um produto. Com os valores decididos dá R$ 53,90 por mês,
   R$ 36,00 e 10% no semestral; R$ 47,90 por mês, R$ 144,00 e 20% no anual. São os números da
   decisão 3 do épico, e um teste no app confere isso com os preços de verdade.
4. **O formatador é o `formatCents`** de `blocks/storefront/storefront-price`. O briefing manda
   procurar em `packages/ui/src/lib`; o formatador que o produto usa (35 arquivos) mora nesse bloco.
   A moeda é BRL nos dois idiomas. O bloco recebe o `locale` da página.
5. **O seletor funciona sem script.** Três rádios nativos num `fieldset` com legenda, e o CSS mostra
   o painel do rádio marcado (`group-has-[…:checked]`), como o formulário de entregador já faz com
   `has-checked:`. O bloco continua Server Component. Os três painéis ocupam a mesma célula e os dois
   não escolhidos ficam invisíveis, sem sair do fluxo: o cartão não muda de altura ao trocar. Cada
   rádio aponta para o seu painel com `aria-describedby`, então quem usa leitor de tela ouve o valor,
   o valor por mês e a economia de cada opção ao passar por ela.
6. **"Mensal" vem marcado.** É o preço de entrada e o que o ticket pede para aparecer primeiro
   (R$ 59,90). Abrir no anual mostraria um número menor por mês do que o lojista paga se não
   escolher nada.
7. **O período escolhido não viaja para o cadastro.** O botão leva a `/signup` e pronto. Não existe
   cobrança para receber a escolha (Épico S), e um parâmetro que ninguém lê seria uma promessa.
8. **Os exemplos do `packages/ui` usam preços que não são os da Beelink** (R$ 100,00, R$ 540,00,
   R$ 960,00 e R$ 150,00). É o que faz o teste do bloco pegar um preço escrito à mão: todo valor em
   reais que aparece na tela tem de ser um dos calculados a partir do que foi entregue. A história do
   Storybook diz que os valores são de exemplo. Os de verdade são conferidos num teste do app, que
   desenha o bloco com `PLAN_PRICES`.
9. **Hero e chamada final ganham uma linha de texto**, "7 dias grátis, sem cartão", a mesma frase do
   cartão (`plans.trial`). No hero ela fica sob os dois botões; na chamada final, sob o título. Os
   botões não mudam de rótulo nem de lugar.
10. **Barra do topo:** seis links, na ordem da página, com "Planos" no lugar de "Perguntas". O menu do
    celular recebe os sete. No rodapé, "Perguntas" entra na coluna "Empresa", antes dos textos legais.
    "Planos" não entra no rodapé: o ticket não pede, e a barra do topo já leva até lá.
11. **O cartão com a Beelia promete o que o AA1 já anunciou**, e nada mais: avisos de pedido, cupons e
    atendimento no WhatsApp da loja. É um item de lista, sem link, sem botão e sem `tabindex`. O selo
    "Em breve" é texto.
12. **As respostas da FAQ dizem só o que está decidido.** "Nada é cobrado sozinho" e "a conta fica
    travada até você escolher um plano e pagar". Não digo o que acontece com a vitrine e com os dados
    da loja travada, nem se o plano se renova sozinho: isso é do Épico S.
13. **Título e apoio**, no padrão das outras seções: "Escolha o / seu plano." e "Comece com 7 dias
    grátis, sem cartão. Depois você escolhe como pagar."
14. **Nenhum cookie novo.** A escolha do período vive no próprio rádio. A `LegalVersion` não muda.
15. **`docs/product/` não muda.** Ele descreve o que o produto faz, e o produto ainda não cobra nem
    trava ninguém. Preço e teste entram lá com o Épico S.

## Atenção (não é para resolver aqui)

- **A cobrança não existe** (Épico S, BEELINK-218). Hoje nada trava no oitavo dia. Quando a cobrança
  ligar, a conta com mais de 7 dias trava com o aviso (S15, BEELINK-297). O Rafael decidiu anunciar
  os 7 dias desde já; a landing passa a dizer uma regra que o produto ainda não aplica.
- **A lista do que o plano inclui é rascunho** para o Rafael revisar.
- **Melhor Envio e Google Analytics** seguem como no AA1: a lista cita "transportadoras pelo Melhor
  Envio", e em 06/10 o Melhor Envio recusava as chamadas do servidor de produção. O Google Analytics
  não entra na lista, porque a vitrine ainda não o carrega (BEELINK-303).

## Fora de escopo

- Cobrar, travar a conta, escolher plano no painel (Épico S).
- Levar o período escolhido para o cadastro.
- Renomear BeeFlow para Beelia no painel (AA8) e a arte da Beelia.
- Corrigir "combos" nos textos antigos da landing.
- Consentimento e medição da landing, e o formulário de entregador (tickets seguintes do épico).
- Suíte e2e e `next build`: o Docker está desligado e o disco tem cerca de 3 GB livres.

## 12/10, depois do código — o que mudou e o que foi visto

O texto acima fica como foi escrito. O que segue é o que a construção e o navegador mostraram.

### O que mudou no caminho

- **Os dois cartões ficam um sobre o outro, e não lado a lado.** Lado a lado, o cartão da Beelia
  esticava até a altura do outro (946 px para 420 px de conteúdo) e sobrava meio cartão vazio. Agora
  cada cartão ocupa a largura da página e, a partir de 1024 px, divide-se em dois: o plano de um
  lado, o que ele inclui do outro. A 1280 px o cartão Beelink tem 547 px de altura e o da Beelia, 218.
- **O selo do período é "-10%" e "-20%", só desenhado.** "10% a menos" quebrava em duas linhas dentro
  do rótulo num celular. A forma curta é a mesma do selo de desconto de um produto na vitrine
  (`-{percent}%`). O selo é `aria-hidden`: o rádio se chama "6 meses" e é descrito pela frase que diz a
  economia por extenso.
- **O rótulo marcado não engrossa mais.** A receita do formulário de entregador (borda de 2 px e
  letra mais pesada no item marcado) fazia o rótulo quebrar de outro jeito a 390 px, e o cartão
  mudava 2 px de altura ao trocar de período. A borda e o peso agora são os mesmos, marcado ou não;
  o que muda é a cor da borda e o fundo amarelo.
- **A 320 px** "6 meses" quebrava em "6" e "meses", e a seta do botão sumia espremida. Os rótulos
  ficaram numa linha só, com letra de 14 px abaixo de 640 px, e o botão ganhou margem menor no
  celular.
- **As três perguntas novas entram depois das três que o lojista já tinha**, e não antes. Subir o
  preço para o topo da lista é trocar a ordem de três linhas no dicionário.
- **A história da página inteira** (`Blocos/Landing → Página`) também desenha a seção, senão o link
  "Planos" do topo não levaria a lugar nenhum dentro dela.
- **O seletor não usa o `components/radio-group` do design system.** Ele é do Base UI, um componente
  cliente que guarda a escolha em script; antes de o script chegar, clicar nele não faz nada. O
  arquivo do seletor diz isso, como a regra de estilo pede quando um primitivo não serve.
- **Três testes seguram "nenhum valor escrito à mão"**, e não um: o do bloco, o da FAQ e um da página
  inteira (`landing.test.tsx`), que cobre todos os blocos de uma vez, hero e chamada final
  incluídos. Mais um varre as frases de `messages.landing` nos dois idiomas. Conferi que pegam:
  escrevi "R$ 59,90" no hero e depois numa frase do dicionário, os testes falharam nos dois casos, e
  desfiz as duas mudanças.

### O menu do topo, medido

Num Chromium com a barra de rolagem clássica desenhada de verdade (15 px; a 1280 px a página tem
1265 px de largura útil): os seis links e os dois botões deixam **46 px** de folga a 1280 px e 78 px
a 1440 px, em pt-BR. Em inglês, 128 px e 160 px. "Perguntas" mede 73 px e pede mais 16 px de espaço:
89 px, que não cabem nos 46. Com "Perguntas" no lugar de "Planos" a folga era de 21 px (AA1).

O AA1 chegou aos 21 px medindo sem barra e descontando 15 px. Aqui a barra foi desenhada, e a conta
bate: 46 − (73 − 48) = 21.

### O que foi visto

`next dev` na porta 3200, sem a API. Dois navegadores: o do Playwright compartilhado, para usar a
página e fazer as capturas, e um Chromium headless próprio, para as medidas.

- **1280 px:** a barra do topo com Soluções, Ecossistema, Integrações, Como funciona, Planos e Para
  entregadores. A seção com os dois cartões, o mensal marcado e "R$ 59,90 por mês"; o cartão com a
  Beelia com "R$ 89,90 por mês" e "EM BREVE". Nada passa da largura da página.
- **O seletor pelo ponteiro:** clicar em "6 meses" mostra "R$ 53,90 por mês", "R$ 323,40 pelos 6
  meses." e "Você economiza R$ 36,00 (10%) em relação ao mensal."; clicar em "Anual" mostra
  "R$ 47,90 por mês", "R$ 574,80 pelo ano." e "Você economiza R$ 144,00 (20%) em relação ao
  mensal.". Sem recarregar, e o cartão continua com 547 px.
- **O seletor pelo teclado:** depois do link "Planos", o próximo Tab cai no rádio marcado ("Mensal"),
  com o anel de foco de 2 px em volta do rótulo. Seta para a direita marca "6 meses" e depois
  "Anual"; seta para a esquerda volta. O Tab seguinte cai em "Testar 7 dias grátis", e Enter leva a
  `/signup`.
- **O seletor sem script:** com o JavaScript desligado no navegador, clicar em "6 meses" e em "Anual"
  troca os números do mesmo jeito. É o CSS que mostra o painel do rádio marcado.
- **Teclado a 1280 px:** Tab chega a "Planos" no sexto passo (logo, Soluções, Ecossistema,
  Integrações, Como funciona, Planos). Enter muda o endereço para `#planos` e a seção para a 24 px do
  alto, com o título e o cartão Beelink inteiro à vista.
- **390 px:** tudo numa coluna, cartões de 342 px, os três períodos numa linha (91 px cada), a faixa
  "7 dias grátis, sem cartão" numa linha só. `scrollWidth` igual a `clientWidth`, no alto e na seção,
  e nenhum elemento da seção, do topo (com o menu aberto) ou do rodapé passa da borda. O mesmo a 320,
  360, 375 e 414 px. Tocar em "Anual" troca os números e o cartão continua com 1120 px.
- **Menu do celular:** Tab chega ao botão, Enter abre, e ele lista as sete seções, com "Planos" e
  "Perguntas". Cinco Tabs chegam a "Planos"; Enter fecha o menu e leva à seção (24 px do alto).
- **Larguras entre as duas:** cartões em uma coluna até 1023 px (a lista do que inclui em duas
  colunas a partir de 640 px); a partir de 1024 px cada cartão se divide em dois. Em nenhuma largura
  de 320 a 1920 px a altura do cartão muda entre o mensal e o anual.
- **Hero e chamada final:** "7 dias grátis, sem cartão" sob os dois botões do hero e sob o título da
  chamada final, a 1280 e a 390 px. Os botões continuam com os mesmos rótulos.
- **Perguntas:** o link "Perguntas" do rodapé leva à seção (24 px do alto). As três respostas novas
  aparecem com os valores: "O plano Beelink custa R$ 59,90 por mês. Pagando 6 meses de uma vez sai
  por R$ 323,40, que dá R$ 53,90 por mês; pagando o ano, R$ 574,80, que dá R$ 47,90 por mês. O plano
  com a Beelia ainda não está disponível e vai custar R$ 89,90 por mês."
- **Em inglês** (pelo `Accept-Language`), a 1280 e a 390 px: "Choose your plan.", "R$59.90 a month",
  "Try 7 days free", e nenhum marcador sem preencher. A 320 px os três rótulos cabem numa linha
  também em inglês.
- **A pergunta do `e2e/accessibility.spec.ts` feita à mão** (axe na página inteira, WCAG 2.x A e AA,
  com contraste), a 1280 × 720 e a 390 × 844, em pt-BR e em inglês, com a página como abre e de novo
  com o anual marcado e todas as perguntas abertas: nenhuma violação, e nada que o axe não tenha
  conseguido decidir dentro da seção.
- **Storybook** (modo de desenvolvimento): as quatro histórias de "Blocos/Landing/Planos" abriram,
  o seletor troca os números na história, e as histórias da landing que mudaram (página inteira,
  topo e hero, perguntas, chamada e rodapé) continuam abrindo. Sem erro no console.
- **Console da página:** sem erros nem avisos.

### O que não foi exercitado

- `next build`, `turbo build` e as suítes e2e (API e Playwright): o Docker está desligado e o disco
  tinha 3,2 GB livres. O `e2e/accessibility.spec.ts` de verdade roda sobre o build, e não rodou.
- `build-storybook`, que o CI roda.
- **Um leitor de tela de verdade.** A descrição de cada rádio (`aria-describedby` apontando para um
  painel que pode estar invisível) foi conferida na árvore de acessibilidade dos testes, não com o
  VoiceOver nem com o NVDA.
- Safari, Firefox e um celular de verdade. Só Chromium. O seletor depende de `:has()`, que os três
  têm desde 2023; num navegador mais antigo o painel do período não apareceria.
- A tela `/signup` depois do botão: ela depende da API. Conferi só que o endereço muda para `/signup`.
- Tema escuro: a landing não tem.

### Achados fora do ticket

- **"Combos" na landing.** O banner da loja e o passo "Monte a vitrine" falam em combos, e não achei
  combo no produto. Não mexi.
- **"Pedidos direto no seu WhatsApp"** (banner da loja) e "os pedidos chegam no painel e no seu
  WhatsApp" (FAQ): o produto abre a conversa no WhatsApp, não envia mensagem
  (`docs/product/README.md`, "What the product does not do"). Com a Beelia anunciada como o que
  avisa pelo WhatsApp, as duas frases antigas e o cartão novo dizem coisas parecidas de produtos
  diferentes. Não mexi.
