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
