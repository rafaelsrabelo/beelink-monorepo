# BEELINK-322 (AA6) — Landing: o formulário de entregador envia de verdade

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico AA (BEELINK-316), "a landing que vende". Sexto ticket: sai de
> `feat/BEELINK-321-entregadores-interessados` (o AA5, PR #256), e o PR tem essa branch como base.
> Toca `packages/contracts` (a versão dos textos legais), `apps/api` (a mesma versão),
> `packages/ui` (o formulário e o diálogo dos textos) e `apps/web` (a rota, o hook, a ligação e o
> texto da política). O Rafael delegou as decisões deste épico; as que estão abaixo são do
> desenvolvedor, e ele pode mudar qualquer uma. Escrito em 12/10/2026.

## O problema

O AA5 entregou a tabela `courier_applications` e a rota `POST /courier-applications`, e ninguém a
chama: o formulário "Comece seu cadastro" da landing confere o que foi digitado e responde "Nada foi
enviado: seus dados não saíram deste aparelho". Este ticket liga o formulário à rota.

O que o Rafael pediu em 12/10, e que manda aqui:

1. Hoje o cadastro é **só para a cidade de Fortaleza**.
2. Campos: nome, CPF, e-mail, WhatsApp **com máscara**, cidade **com Fortaleza apenas**, e o veículo.
3. Termos de uso e política de privacidade **num modal, e não numa página**.
4. **O botão só é liberado** com tudo preenchido e os termos aceitos.
5. Depois do envio, a mensagem diz que as informações para concluir o cadastro chegam em breve **no
   e-mail**. Nenhum e-mail é enviado por enquanto: é só salvar.

## Definição de Pronto

1. **Campos**, um por linha, com rótulo e exemplo: nome completo; CPF com máscara `000.000.000-00`,
   teclado numérico e dígitos verificadores conferidos; e-mail; WhatsApp com máscara
   `(00) 00000-0000`, teclado numérico e só celular; cidade; como entrega.
2. **As máscaras** valem ao digitar e ao colar, são funções puras com teste, e nenhuma dependência
   nova entra por causa delas.
3. **Cidade:** campo de escolha com uma opção, "Fortaleza/CE", já marcada, e a frase "Por enquanto, o
   cadastro é só para Fortaleza." O valor enviado é o código do contrato (`CourierCity`), e abrir uma
   cidade na API sem o rótulo no formulário não compila.
4. **Termos e política num modal**, sobre o formulário, sem sair da página e sem apagar o digitado. O
   texto é o de `/termos` e `/privacidade`, da mesma fonte e desenhado pelo mesmo componente. Só é
   carregado quando o modal abre: não está no HTML da landing nem no JavaScript que ela pede de
   início (medido). Fecha com Esc, pelo botão e clicando fora; o foco volta ao link que o abriu;
   enquanto carrega, esqueleto. Sem script, o link leva à página.
5. **O botão "Enviar cadastro"** tem `disabled` de verdade enquanto algum campo está vazio ou
   inválido ou o aceite não foi marcado, e já vem assim no HTML antes do script. Uma frase perto dele
   diz o que falta, ligada a ele para leitor de tela. Cada campo mostra o próprio erro quando a
   pessoa sai dele, não antes. Nada do que é digitado vai para o endereço da página.
6. **Envio:** hook do TanStack Query → `apps/web/src/app/api/courier-applications/route.ts`
   (repassando o endereço do visitante) → `POST /courier-applications`. O bloco não conhece a rede. O
   corpo é `CourierApplicationPayload`, com `acceptedTerms` e a armadilha `website`.
7. **Estados:** enviando (botão desabilitado, sem spinner); recusa da API (a frase no campo certo,
   pelo `errorCode`, e o formulário como estava); limite (429, frase própria); falha de rede ou 5xx
   (frase e "Tentar de novo"); sucesso.
8. **Sucesso:** a confirmação "Cadastro recebido. Em breve você recebe no seu e-mail as informações
   para concluir o cadastro." toma o lugar do formulário, é anunciada, recebe o foco e oferece
   "Enviar outro cadastro".
9. **Google Analytics:** o envio aceito conta um `generate_lead` pelo `useSiteTrack()`, só para quem
   aceitou os cookies, sem parâmetro e sem dado pessoal.
10. **Textos:** a seção e a FAQ do entregador dizem que hoje é só Fortaleza; saem `notOpen`, "Leva 2
    minutos. Os documentos vêm no próximo passo." e as três respostas que diziam que o cadastro não
    estava aberto; a frase do aceite diz para que servem o CPF, o e-mail e o WhatsApp. Em pt-BR e en.
11. **Política de privacidade, versão `2026-10-13`** (`LegalVersion`, `LEGAL_VERSION`, texto): o que
    o bee-link guarda de quem se candidata, para quê, que o mesmo CPF enviado de novo substitui os
    dados, e como pedir a exclusão. Só o que o código faz. `/privacidade` mostra a versão nova, e a
    API grava essa versão na linha do cadastro.
12. **Documentos:** `docs/product/` diz que existe a lista de interesse dos entregadores; os mapas de
    superfície do web e do ui estão atualizados.
13. **Testes:** das máscaras; do bloco, com axe, e história no Storybook de cada estado; do handler;
    do hook; e um spec Playwright do formulário, rodado contra o `next dev` com a API de pé.
14. **No navegador, a 1280 e a 390 px, com a API de pé:** um cadastro chega a `courier_applications`
    com `FORTALEZA_CE`; o mesmo CPF não cria a segunda linha; o botão trava e libera; tudo pelo
    teclado; o modal abre e fecha devolvendo o foco sem perder o digitado. Capturas em `screens-322/`.
15. `pnpm ci-check` verde.

## Decisões

### O formulário

1. **O bloco continua em `packages/ui` e continua sem conhecer a rede.** Ele recebe `onSubmit`, o
   estado do envio (`status`) e o problema do último envio (`problem`: uma frase pronta e, quando a
   recusa é de um campo, qual campo). Quem envia é `LandingCourierFormLive`, em `apps/web`.
2. **`LandingCouriers` passa a receber o formulário pronto** (`form`, um `ReactNode`), como já recebe
   a foto. É um Server Component, e uma função (`onSubmit`) não atravessa de um Server Component para
   um Client Component: o formulário ligado precisa ser montado pelo app.
3. **`packages/ui` não importa os contratos** (regra da casa: os blocos repetem os tipos, para o
   Storybook não depender de nada). A cidade é `LandingCourierCityValue` no dicionário do ui, e é o
   app que amarra os dois lados: os rótulos passam por `satisfies Record<CourierCity, string>` (uma
   cidade aberta na API sem rótulo não compila) e o que o formulário entrega passa por
   `satisfies CourierApplicationPayload` (uma cidade no formulário que o contrato não tem também não).
4. **A cidade é um `<select>` nativo com uma opção.** É o "campo de escolha" pedido, funciona antes de
   o script chegar e cresce sem mudar de desenho quando abrir outra cidade. O `select` do design
   system (Base UI) não desenha nada sem script e veste os tokens do painel; o formulário inteiro usa
   controles nativos com os tokens `brand-*`, e o arquivo diz isso.
5. **O que trava o botão e o que a frase diz saem da mesma conta**: o esquema zod aplicado ao que
   está digitado. O botão e a frase não podem discordar. A frase lista os campos pelo nome ("Para
   enviar, falta: CPF, e-mail, aceite dos termos."), sem distinguir vazio de inválido: o erro de um
   campo inválido aparece no próprio campo quando a pessoa sai dele (`mode: "onTouched"`).
6. **A frase do que falta não é anunciada a cada mudança.** Ela é a descrição do botão
   (`aria-describedby`). O que é anunciado é a virada: uma linha de status diz "Tudo certo: o botão
   Enviar cadastro está liberado" quando nada mais falta. Um leitor de tela não ouve a lista seis
   vezes enquanto digita.
7. **A máscara é escrita no próprio campo, antes de a biblioteca do formulário ler o valor**, e o
   cursor volta para depois do mesmo número de dígitos: corrigir um dígito no meio não joga o cursor
   para o fim. O CPF e o WhatsApp são enviados como aparecem, com a pontuação: a API aceita e
   normaliza (contrato do AA5).
8. **WhatsApp, só celular:** DDD sem zero e nove dígitos começando por 9, a regra da API. O `+55` de
   um número colado sai (`+55 85 98888-7777` e `5585988887777` viram `(85) 98888-7777`); um décimo
   segundo dígito digitado é ignorado, e não lido como código do país, porque 55 também é um DDD.
   Não reaproveitei o `maskPhone` da tela da loja: aquele aceita fixo e código de país, e este campo
   não.
9. **O CPF é conferido no navegador pela mesma conta da API** (`shared/http/cpf.ts`), reescrita em
   `packages/ui`: o pacote não pode importar a API. Os dois têm teste com os mesmos casos. Quem
   decide é a API.
10. **Uma recusa da API não trava o botão de novo.** O campo recusado recebe a frase e o foco, e a
    frase sai quando a pessoa mexe no formulário. O navegador já conferiu o mesmo campo: se a API
    discorda, é a frase dela que fica à vista.
11. **A armadilha (`website`)** é desenhada como a do formulário de contato dos sites: fora da tela,
    `aria-hidden`, `tabIndex={-1}` e `autoComplete="off"`.
12. **"Enviar outro cadastro" limpa o formulário.** O cadastro seguinte é de outra pessoa.
13. **Antes do script, o formulário continua `method="dialog"`** e o botão vem `disabled`: nada é
    enviado e nada vai para o endereço.

### O modal dos termos e da política

14. **Mecanismo: carga sob demanda, por `import()`, do módulo dos textos**
    (`apps/web/src/locales/legal/pt-BR.ts`), disparada quando o modal abre, dentro de um hook do
    TanStack Query (`useLegalText`), que dá de graça o carregando, a falha e o "Tentar de novo". É o
    caminho que o guia do Next 16 descreve para isto (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`:
    "defer loading a modal until a user clicks to open it", e `import()` para carregar um módulo
    depois de uma ação). Os textos são dados, e o bloco `LegalDocument` os desenha, como nas páginas.
15. **Por que não a rota interceptada** (`@modal/(.)termos`): ela troca o endereço para `/termos`
    com a landing por baixo. O `SiteAnalytics` do AA4 conta a página pelo `usePathname`, e o
    `instrumentation-client.ts` fecha a trava do Google a cada navegação para outro caminho: abrir
    os termos viraria uma visualização de uma página que a política não nomeia, ou fecharia a
    medição da landing. Além disso o slot `@modal` teria de morar num layout que a landing divide
    com as lojas (o da raiz). É muito para um diálogo.
16. **Por que não um handler que devolve o documento:** seria uma rota pública nova e um formato de
    fio novo (que teria de ir para `packages/contracts`) para servir um texto que o build já tem.
17. **O diálogo é um bloco novo, `landing-legal-dialog`**, sobre o primitivo `Dialog` do design
    system: prende o foco, fecha com Esc e clicando fora, e devolve o foco a quem o abriu
    (`finalFocus`, com o link guardado pelo app). O título e a data de vigência são o nome e a
    descrição do diálogo; o `LegalDocument` ganha `headless` para desenhar só o que vem depois, com
    os títulos um nível abaixo. Enquanto o texto não chega, o diálogo já tem título (o do dicionário
    do formulário) e um esqueleto, sem nenhuma frase de "carregando".
18. **O link continua um link.** Com script, um clique simples abre o modal; com Ctrl, Cmd, Shift ou
    o botão do meio, o navegador abre a página, como em qualquer link. Sem script, ele leva à página.
19. **O diálogo é desenhado fora da moldura da landing** (num portal), então recebe do app a classe e
    a variável da fonte da marca, como o pop-up da loja recebe as cores.

### O envio

20. **A rota do web é `POST /api/courier-applications`**, com `forwardToApi`: confere a origem e o
    `content-type`, repassa o endereço do visitante e devolve o que a API respondeu.
21. **O serviço é `src/services/couriers/`**, e lança o código, nunca uma frase. As frases das sete
    recusas ficam no dicionário de erros do web, como as dos outros domínios, e são escolhidas no
    servidor e entregues ao formulário como texto (o dicionário inteiro não viaja para o navegador).
22. **O 429 tem frase própria** (`COURIER_APPLICATION_LIMITED`): a frase geral diz "espere um minuto",
    e a janela desta rota é de dez. A falha (rede, 5xx, um código desconhecido) tem a sua
    (`COURIER_APPLICATION_FAILED`) e é a única com "Tentar de novo": repetir uma recusa ou um limite
    na hora dá o mesmo resultado.
23. **`generate_lead` entra no tipo `SiteEvent`** e é chamado no `onSuccess` do envio, sem parâmetro.
    O `useSiteTrack()` já acrescenta só o endereço da página sem parâmetros, e só envia com o aceite.

### Os textos

24. **Nada é prometido além do pedido.** Requisitos, prazo de aprovação e repasse continuam sem data:
    as três respostas da FAQ dizem o que vale hoje (deixar os dados, e as informações chegam por
    e-mail) e que o resto ainda não foi definido.
25. **A política ganha a seção "Dados de quem se candidata a entregar"**, e mexe só no que precisa
    concordar com ela: a quem a política vale, quem é o controlador, a base legal, o que o Google
    recebe (o envio do cadastro passa a ser contado), a guarda e como pedir a exclusão. Nenhum prazo
    de exclusão é prometido: nada apaga um cadastro sozinho.
26. **Os termos mudam em duas frases**, além da data: quem envia o cadastro de entregador também os
    aceita, e o aceite é registrado nesse momento. É o que o código faz (a linha guarda a versão e a
    hora). As regras da atividade de entrega não existem e não foram escritas.
27. **A base legal do cadastro foi escrita como procedimento preliminar a pedido do interessado**
    (art. 7º, V, da LGPD, junto da execução de contrato). É uma leitura jurídica, e o PR a marca para
    o advogado.

## Fora do escopo

- E-mail de confirmação, tela para ler a lista, exportação, situação do cadastro (AA5 já disse).
- As regras da atividade de entrega nos termos, e qualquer prazo de guarda.
- O aplicativo dos entregadores e os outros textos da seção que falam dele ("no app").
- `next build`, `turbo build` e a suíte e2e sobre o build: o disco tem cerca de 3 GB.
- Renomear BeeFlow (AA8) e o Google Analytics das lojas (BEELINK-303).

## Riscos

- **O texto legal é rascunho.** Foi escrito pelo desenvolvedor a partir do código, e precisa do
  Rafael e de um advogado antes de valer. Os `[PREENCHER: …]` antigos continuam lá.
- **A mensagem de sucesso promete um e-mail que nenhum código envia.** É o pedido do Rafael: alguém
  precisa escrever para essas pessoas, à mão, lendo a tabela.
- **Quem sabe o CPF de alguém sobrescreve o cadastro dessa pessoa** (decisão 16 do AA5). A política
  agora diz que o envio de novo substitui os dados.
- **O texto fora do JavaScript inicial foi medido no `next dev`.** O build de produção não foi rodado
  aqui; o `import()` de um módulo que nenhum componente de cliente importa estaticamente é um pedaço
  à parte em qualquer empacotador, mas ninguém mediu o build.
- **A máscara foi conferida no Chromium.** Teclados de celular que compõem o texto (IME) e o
  preenchimento automático do navegador não foram exercitados.

## 13/10, depois do código — o que o navegador mostrou

O spec `apps/web/e2e/courier-application.spec.ts` foi escrito em 12/10 e só rodou em 13/10, contra o
`next dev` (3200) com a API de pé (3201) e o banco `harness_landing`. Na primeira passada, 19 de 24
testes passaram. Das cinco falhas, quatro eram do spec e uma era do formulário.

### O defeito: o clique feito a partir de um campo errado se perdia

A recusa de um campo é escrita quando a pessoa sai dele, e quem sai de um campo muitas vezes sai
apertando o que está abaixo. A linha da recusa não existia antes: ao aparecer, empurrava o aceite e
os dois links dos textos legais 26 px para baixo com o botão do mouse ainda apertado. O aperto
terminava em cima do formulário, e o clique não acontecia: a caixa não marcava e o modal não abria.
Medido a 1280 e a 390 px, com um aperto de 90 ms.

**Conserto:** os quatro campos digitados guardam a linha da recusa desde o início
(`LANDING_REFUSAL_LINE`) e ficam numa coluna própria (`LANDING_FIELDS`), cujo espaço entre campos é
o que a linha deixa. Custo, a 1280 px: o formulário vazio cresce cerca de 60 px (de 993, pela conta,
para 1052 medidos); com as quatro recusas na tela ele fica 45 px menor (de 1097 para 1052). A altura
deixou de mudar quando uma recusa aparece.

**O que sobra:** abaixo de 640 px, duas das quatro frases ("Informe o nome completo, com sobrenome."
e "Esse CPF não confere. Confira os números.") ocupam duas linhas, e a segunda ainda empurra o que
está abaixo. Com toque isso não perde o clique (um toque é mirado uma vez só; conferido no Chromium
emulando toque), mas com mouse numa janela estreita pode perder. Encurtar as duas frases resolveria;
ficou de fora por ser troca de texto.

### O que era do spec

- **Apagar um dígito do CPF.** Uma tecla enviada pelo localizador do campo começa no primeiro
  caractere, onde não há o que apagar. O teste agora põe o cursor no fim.
- **O rádio do veículo** fica fora da vista e o cartão é o que a pessoa aperta. O teste aperta o
  cartão.
- **O Tab dentro do modal.** Depois da última parada, o diálogo devolve o foco no quadro seguinte:
  antes da próxima tecla de uma pessoa, depois da de um script. O teste espera o foco voltar. No
  ritmo de uma pessoa (200 ms entre teclas) o foco nunca saiu do modal, para a frente e para trás.
- **A aba nova** do clique com Ctrl/⌘ está em branco antes de chegar a `/termos`. O teste espera o
  endereço.

### Depois dos consertos

25 testes (o da pressão a partir de um campo errado é novo), rodados duas vezes: 50 de 50. No banco,
depois de dezenas de envios com dois CPFs inventados:

```
      name       |  document   |            email             |   whatsapp    |     city     |  vehicle   | termsVersion
 Zuleica Tavares | 52998224725 | zuleica.tavares@exemplo.test | 5585987654321 | FORTALEZA_CE | MOTORCYCLE | 2026-10-13
 Raimundo Nonato | 11144477735 | raimundo.nonato@exemplo.test | 5585912345678 | FORTALEZA_CE | CAR        | 2026-10-13
(2 rows)
```

Uma linha por CPF, com a cidade `FORTALEZA_CE` e a versão `2026-10-13`. As duas linhas foram
apagadas no fim.

O texto legal fora do JavaScript inicial: no `next dev` a landing pede um arquivo com o nome do
texto (`…locales_legal_pt-BR_ts…js`), de 575 bytes, que é só o endereço do pedaço; a frase procurada
não está em nenhum dos 24 scripts pedidos antes de o modal abrir, a 1280 e a 390 px.

### O que não foi feito

- A suíte e2e sobre o build e o `next build`: o disco tinha 3 GB.
- Firefox, Safari e um celular de verdade: tudo acima é Chromium.
- O aviso de cookies do BEELINK-319 ocupa 213 px do pé da tela a 390 px e cobre parte do formulário
  até a pessoa responder. Não é deste ticket.
