# BEELINK-310 (O9) — pop-up também para o cliente logado (cupom do primeiro pedido), e a faixa vira lembrete

> Épico O (primeira compra). Sai de `main`, que já tem a [faixa de ofertas](2026-10-07--vitrine-ofertas-relacionados-busca.md) e o [pop-up de primeira compra](2026-10-07--BEELINK-306--popup-de-primeira-compra.md). Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`, por isso mora aqui.

## O pedido

O dono olhou a loja em produção (`beelink.biz/mutante-suplementos`) depois das duas entregas e disse: "Em vez de ser um banner pra criar conta, tá como um componente na página e não um modal. O mesmo aconteceu pro cupom: ele não tá como um dialog e sim como um componente."

O que ele viu: como visitante, a faixa "Crie sua conta e ganhe 15% de desconto no primeiro pedido. [Criar conta]"; logado e sem pedido, a faixa "Seu primeiro pedido tem 15% de desconto com o cupom SEJAMUTANTE [Copiar] [Usar no carrinho]". Ele esperava diálogos.

Duas coisas explicam o que ele viu:

- **Na Mutante o pop-up está desligado.** Isso não pede código: é ligar em Cupons → Pop-up de primeira compra.
- **O cliente logado não tem diálogo nenhum** (o pop-up do BEELINK-306 fala só com o visitante), e mesmo com o pop-up ligado a faixa aparece antes dele. Isso é este ticket.

## Definição de Pronto

1. Com o pop-up ligado, o cliente identificado que nunca fez pedido e tem um benefício de primeira compra a ser dito vê o mesmo diálogo numa variante "seu cupom": o benefício, o código grande e selecionável, "Copiar" e "Usar no carrinho" (carrinho com `?cupom=`). Para promoção automática (sem código): o benefício, "aplicado automaticamente" e um botão que só fecha.
2. Quem vê a variante é decidido pela mesma leitura e pela mesma regra da faixa ("minhas ofertas", `firstPurchaseOf`): nunca um cupom que a faixa não mostraria, nunca um código para visitante. Cliente com pedido que vale não vê nada; cliente sem benefício não vê diálogo; os textos que o lojista escreveu para o visitante nunca aparecem para quem já tem conta.
3. A variante tem as garantias da do visitante: diálogo modal acessível (foco, Escape, nome, axe), as mesmas páginas, os mesmos gatilhos e atraso, espera o aviso de cookies, abre uma vez por carga.
4. Uma vez por pessoa, num cookie só: quem fechou o convite e depois entrou vê o cupom uma vez; quem fechou o cupom não vê mais nada. A linha publicada da política de privacidade sobre o `bl_popup` continua verdadeira, sem ser tocada.
5. Com o pop-up ligado, a faixa não é desenhada enquanto o diálogo ainda é devido a quem olha. Decidido no servidor, pelos cookies: sem piscar a faixa antes do diálogo.
6. Chave nova na configuração, "Depois de fechado, manter um lembrete abaixo do cabeçalho", ligada por omissão: contrato, coluna com migração, rota do dono, formulário com uma linha de ajuda. Ligada, a faixa volta depois do diálogo fechado; desligada, a faixa não é desenhada naquela loja enquanto o pop-up estiver ligado.
7. Com o pop-up desligado, a faixa se comporta exatamente como hoje (preso por teste).
8. A faixa não aparece no clique que fecha o diálogo: nada na página se move.
9. O painel diz com quem o pop-up fala (visitante: o convite; cliente que nunca pediu: o cupom), e a prévia mostra a variante do cliente.
10. Docs do produto e mapas de superfície; textos em `locales` (pt-BR e en); story e teste (axe) da variante; `pnpm ci-check` verde; e2e completo da API verde em banco próprio; usado no navegador a 1280 e 390 px.

## Decisões do assistente, para o dono confirmar

### Quem vê qual diálogo

1. **A variante do cliente diz o que a faixa diria a ele**, e não o benefício que o lojista escolheu anunciar no pop-up. A escolha "Benefício anunciado" continua valendo para o convite do visitante. Para o cliente, a fonte é a leitura "minhas ofertas" (`CustomerOffers.firstPurchase`): o cupom de primeira compra mostrado mais novo; sem cupom, a promoção de primeira compra. Uma só regra, extraída para uma função que a faixa e o pop-up chamam (`firstOrderOfferOf`). Consequência: se o lojista nomeou no pop-up um cupom A e a loja tem um cupom B mais novo, o visitante lê o benefício de A e o cliente recebe o código de B, que é o que a faixa já fazia.
2. **Palavras fixas, nos `locales`**; números e código vêm da API. Título: "Seu primeiro pedido tem {benefício}" (ou "… em produtos selecionados"). Cupom: "Use este cupom no carrinho:" + o código + "Copiar" + "Usar no carrinho". Promoção: "Aplicado automaticamente no seu primeiro pedido. Não precisa de código." + "Continuar comprando". A imagem configurada é reaproveitada. Título, texto e botão do lojista **não** aparecem (foram escritos para quem não tem conta).
3. **Cliente sem benefício a dizer não vê diálogo**; cliente com pedido que vale, nunca. Quem segura uma sessão vencida (o caso do BEELINK-306) continua sem diálogo naquela página.
4. **"Usar no carrinho" e "Continuar comprando" contam como fechar**, como o botão do convite: gravam o cookie.
5. **O foco entra no "×"**, pelo motivo do BEELINK-306 (o diálogo abre sozinho).

### O cookie: um número só

6. **O `bl_popup` continua guardando um único número inteiro, e nada mais.** Cada aviso tem a sua numeração de versões: o convite do visitante, na revisão `r` do pop-up, é a versão `r` (como hoje); o aviso do cupom, na mesma revisão, é a versão `1.000.000.000 + r`. O cookie guarda o número da versão do último aviso que a pessoa fechou.
   - Fechou o convite na revisão 3 → `bl_popup=3`. Entra na conta: o aviso do cupom (versão 1000000003) ainda não foi fechado → abre uma vez. Fecha → `bl_popup=1000000003`.
   - Quem fechou o aviso do cupom não vê mais nenhum dos dois naquela revisão, nem depois de sair da conta: o cupom é o aviso que diz mais.
   - Revisão nova (o lojista mudou imagem, textos ou benefício): os dois podem abrir de novo, uma vez.
7. **Por que a frase da política continua verdadeira** ("guarda só o número da versão do aviso, e nada sobre você"): o valor é um número, e é o número da versão de um aviso. Qual dos dois avisos foi fechado é um fato sobre o aviso, não sobre a pessoa: não há identificador, conta, e-mail nem hora. O texto legal e a versão legal não são tocados.
8. **Por que essa numeração e não par/ímpar (`2r-1`, `2r`):** os cookies já gravados em produção (um número simples = convite fechado) continuam lidos exatamente como foram escritos. Com par/ímpar, metade de quem já fechou veria o convite de novo depois do deploy.
9. **O limite, assumido:** o cookie é do navegador, não da conta. Outra pessoa que entre no mesmo navegador depois de alguém ter fechado o aviso do cupom não o vê; a mesma pessoa em outro aparelho o vê lá uma vez. Lembrar por conta pediria guardar isso no servidor, sobre a pessoa, o que a política não descreve.
10. **A chave do lembrete e o gatilho não mexem na revisão** (não são o que a pessoa lê no diálogo).

### A faixa

11. **Pop-up desligado: nada muda.** A decisão passa por uma função pura (`offersViewOf`) cujo primeiro caso é esse.
12. **Pop-up ligado, diálogo devido a quem olha: a faixa não está no HTML.** Vale também enquanto o diálogo espera (o atraso, o aviso de cookies, o gatilho "ao sair"). Consequência assumida: com "ao sair", um visitante que nunca dispara o gatilho não vê nem o diálogo nem a faixa naquela página.
13. **Diálogo fechado + lembrete ligado: a faixa está lá a partir da próxima página**, e não surge no clique. Nada se move sob o ponteiro, e não há estado novo no navegador: o servidor lê o cookie que o fechamento gravou.
14. **Lembrete desligado: a faixa nunca é desenhada naquela loja** enquanto o pop-up estiver ligado, para ninguém.
15. **Quem não tem diálogo a ver** (sessão vencida; cliente cuja leitura falhou) segue a regra do "depois de fechado": faixa conforme a chave.
16. **O "esconder a faixa enquanto o pop-up está aberto" do BEELINK-306 (item 25) sai**: os dois nunca mais estão na mesma página.

### O painel e o fio

17. `StorePopupSettings.keepReminder` (coluna `keepReminder`, `true` por omissão), `StorefrontPopup.keepReminder` na leitura pública. O `PUT` continua sendo o formulário inteiro: a chave que falta é recusada.
18. **`StorePopupOverview.customerOffer`**: o que um cliente que nunca pediu leria agora (com o código, quando é cupom), para a prévia não inventar. Sai da mesma função que monta a oferta do cliente (`firstOrderOfferOf` na API). É a leitura do dono, que já vê os códigos.
19. **Prévia:** um segundo alternador, "Visitante" / "Cliente sem pedido", ao lado de Computador/Celular. Sem benefício, a prévia do cliente diz que ele não vê pop-up.

## Fora do escopo

- Ligar o pop-up por omissão em qualquer loja.
- Textos configuráveis para a variante do cliente.
- "Cupons disponíveis" do carrinho; eventos de rastreio; textos legais e versão legal.
- Lembrar o fechamento por conta (ver decisão 9).
- O banner de categoria cortado em cima e embaixo no print do dono: é o comportamento entregue para um arquivo que não é 4:1 (a moldura é 4:1 e a imagem a preenche); o arquivo recomendado é 1600 × 400 px. É algo a dizer ao lojista, nada a corrigir aqui.
