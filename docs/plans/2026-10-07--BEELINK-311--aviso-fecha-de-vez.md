# BEELINK-311 (O10) — o aviso de primeira compra fecha de vez, e o lembrete do cupom fica no carrinho

> Épico O (primeira compra). Sai de `main`, que já tem a [faixa de ofertas](2026-10-07--vitrine-ofertas-relacionados-busca.md), o [pop-up de primeira compra](2026-10-07--BEELINK-306--popup-de-primeira-compra.md) e o [pop-up para o cliente logado](2026-10-07--BEELINK-310--popup-para-cliente-logado.md). Toca `packages/contracts`, `apps/api`, `packages/ui` e `apps/web`, por isso mora aqui.

## O pedido

O dono olhou a loja em produção (`beelink.biz/mutante-suplementos`, logado, sem pedido) e viu a faixa "Seu primeiro pedido tem 15% de desconto com o cupom SEJAMUTANTE." em toda página. Nas palavras dele: "esse componente tá aparecendo em toda página que entro; ele era pra aparecer só uma vez e o cliente fecha, salva no browser isso; aí depois, se a pessoa tá no carrinho e não botou o cupom, fica aparecendo pra ela adicionar no carrinho, e não nas páginas iniciais e de produto."

O que explica o que ele viu: a decisão 7 do plano da faixa ("fechar não é lembrado": a faixa volta a cada carga de página) e, nas lojas com o pop-up ligado, a chave "manter um lembrete" do BEELINK-310, que nasceu ligada. As duas são o que este ticket desfaz.

## Definição de Pronto

1. Fechar a faixa (o "×") ou usá-la ("Usar no carrinho", "Criar conta") é lembrado no navegador: a faixa não é mais desenhada nas páginas daquela loja enquanto durar o cookie (30 dias). "Copiar" não fecha.
2. Quem decide é o servidor, pelo cookie: depois de fechada, a faixa não está no HTML da página seguinte (sem piscar).
3. Vale em toda loja: pop-up ligado ou desligado, visitante ou cliente identificado.
4. O que é lembrado mora no cookie que já existe, `bl_popup` (um número inteiro, `Path=/<slug>`, 30 dias, nada sobre a pessoa). Os valores já gravados em produção continuam lidos exatamente como antes.
5. As regras do BEELINK-310 continuam: o visitante que fechou o convite e depois entra como cliente sem pedido vê o aviso do cupom uma vez; aviso fechado fica fechado; uma revisão nova do pop-up pode mostrar de novo, uma vez.
6. A chave "manter um lembrete" (`keepReminder`) passa a nascer desligada, as linhas que já existem são desligadas por migração, e a ajuda dela e o texto do painel dizem o que ela faz agora. Desligada (o padrão), depois do diálogo fechado não há faixa; ligada, a faixa fica até ser fechada, e então some de vez.
7. No carrinho, o cliente identificado que tem um cupom mostrado e utilizável ainda não aplicado vê uma chamada destacada no alto da área do cupom, com um botão primário "Aplicar cupom" (um toque, o mesmo caminho de digitar o código). Nunca um cupom oculto, nunca um que a cotação recusaria, nunca um abaixo do mínimo.
8. A chamada some quando há um cupom aplicado, e não tem "×" enquanto não há.
9. O visitante no carrinho lê uma frase verdadeira, sem código, quando a loja tem um cupom de primeira compra; uma promoção automática não ganha chamada (o carrinho já a anuncia).
10. A linha do `bl_popup` na política de privacidade volta a ser verdadeira, com a menor edição possível, em commit próprio; os testes que prendem o texto legal continuam verdes.
11. Bloco novo com story e teste (axe); textos em `locales` (pt-BR e en); docs do produto e mapas de superfície; `pnpm ci-check` verde; e2e completo da API verde em banco próprio; usado no navegador a 1280 e 390 px.

## Decisões do assistente, para o dono confirmar

### A. Fechar é lembrado

1. **O que fecha a faixa:** o "×", "Usar no carrinho" e "Criar conta". **O que não fecha:** "Copiar" (copiar o código não é dispensar o aviso; quem copiou ainda pode querer o botão do carrinho) e ver a página.
2. **Onde é guardado: no `bl_popup`**, sem cookie novo. Ele já quer dizer "o aviso de primeira compra desta loja foi fechado neste navegador".
3. **O número.** O cookie continua sendo um número inteiro só. A faixa e o diálogo são duas formas do mesmo aviso, e cada aviso (o convite do visitante, o cupom do cliente) tem agora dois degraus: fechou o diálogo; fechou a faixa. `r` é a revisão do pop-up; numa loja com o pop-up desligado a web não recebe revisão nenhuma (a loja desligada não manda nada do que configurou), e a revisão vale `0`.

   | Valor do `bl_popup` | O que quer dizer | Quem grava |
   |---|---|---|
   | `r` (1 a 999.999.999) | o convite do visitante, em diálogo, fechado na revisão `r` | o diálogo (como hoje) |
   | `1.000.000.000 + r` (r ≥ 1) | o aviso do cupom, em diálogo, fechado na revisão `r` | o diálogo (como hoje) |
   | `2.000.000.000 + r` (r ≥ 0) | a faixa do visitante fechada na revisão `r`; `2000000000` é "fechada numa loja sem pop-up" | a faixa (novo) |
   | `3.000.000.000 + r` (r ≥ 0) | a faixa do cliente (o cupom) fechada na revisão `r`; `3000000000` é "fechada numa loja sem pop-up" | a faixa (novo) |
   | qualquer outra coisa (`0`, `1000000000`, texto, mais de 10 algarismos, 4.000.000.000 em diante) | nada foi fechado | — |

4. **Uma escada só.** Convite em diálogo < faixa do visitante < cupom em diálogo < faixa do cliente. Um degrau fechado fecha os de baixo, na mesma revisão ou numa anterior. Daí saem as regras do BEELINK-310 sem regra nova: quem fechou o convite (diálogo ou faixa) e entra na conta ainda vê o aviso do cupom uma vez; quem fechou o aviso do cupom não vê mais o convite, nem depois de sair da conta.
5. **Como produção lê os cookies que já gravou:** `1` continua sendo "convite fechado na revisão 1" e `1000000001` "cupom fechado na revisão 1": o diálogo não reabre, e o visitante do `1` ainda recebe o aviso do cupom ao entrar na conta. O que muda para essas pessoas é só o que este ticket pede: a faixa não volta depois (o lembrete passa a nascer desligado).
6. **Loja com o pop-up desligado:** a faixa é o aviso. Fechada, fica fechada pelos 30 dias do cookie; não há revisão que a reabra. Um diálogo fechado antes (a loja tinha o pop-up ligado e desligou) também conta: aviso fechado fica fechado.
7. **Loja com o pop-up ligado:** uma revisão nova (o lojista mudou imagem, textos ou benefício) pode mostrar de novo, uma vez, o diálogo e, se houver lembrete, a faixa. É a mesma regra do diálogo. Ligar o pop-up numa loja em que a pessoa só tinha fechado a faixa (revisão 0) é isso também: o diálogo abre uma vez.
8. **A revisão nunca anda para trás no cookie:** um fechamento é gravado na maior revisão que o navegador conhece (a do pop-up, ou a que o cookie já tinha). Sem isso, uma loja que desliga e religa o pop-up reabriria avisos que a pessoa já fechou.
9. **O limite, o mesmo do BEELINK-310:** o cookie é do navegador, não da conta. Outro aparelho mostra o aviso lá uma vez.

### B. Depois de fechado, nada nas páginas da loja

10. **`keepReminder` nasce desligada e é desligada nas lojas que já salvaram** (migração: `DEFAULT false` + `UPDATE … SET "keepReminder" = false`). A chave saiu há poucas horas, ligada por omissão; a fala do dono é a rejeição direta desse padrão, e nenhum lojista teve tempo de escolher "ligada" de propósito de um jeito que dê para distinguir do padrão. Quem quiser o lembrete religa.
11. **Com a chave ligada**, a faixa fica abaixo do cabeçalho depois do diálogo fechado **até a própria faixa ser fechada**; aí some de vez (decisão A). O botão do diálogo ("Usar no carrinho", "Criar conta") continua gravando o degrau do diálogo, como hoje: com o lembrete ligado, a faixa ainda aparece depois dele, até ser fechada.
12. **Uma resposta de ofertas guardada sem `keepReminder`** passa a ser lida como desligada (era ligada no BEELINK-310).

### C. O carrinho leva o lembrete

13. **A chamada** é um bloco novo no alto da área do cupom, antes do campo: "Você tem 15% de desconto no primeiro pedido com o cupom **SEJAMUTANTE**" + botão primário "Aplicar cupom". Para um cupom que não é de primeira compra: "Você tem 15% de desconto com o cupom **X**".
14. **Qual cupom é o destacado:** da lista que o carrinho já recebe ("Cupons disponíveis", decidida pela mesma leitura que aceita ou recusa um código), só entre os que podem ser aplicados agora (`missingCents = 0`): o primeiro de primeira compra, se houver; senão o primeiro da lista (o mais novo). **Não** "o que mais desconta": a API não diz quanto cada cupom tira deste carrinho, e saber pediria uma cotação por cupom.
15. **O cupom destacado sai da lista "Cupons disponíveis" enquanto a chamada está na tela** (não é dito duas vezes); os outros ficam. Com um cupom aplicado, a chamada some e a lista volta inteira, com o aplicado marcado, como hoje.
16. **Sem "×".** É o único lugar que ainda diz o cupom a quem fechou o aviso, e só existe no carrinho.
17. **Abaixo do mínimo** continua "Faltam R$ X…" na lista, e não é chamada.
18. **Visitante no carrinho:** quando o destaque público da loja é um **cupom** de primeira compra, a frase que já existe ("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.") ganha antes dela "Crie sua conta e ganhe 15% de desconto no primeiro pedido." — a mesma frase da faixa, da mesma leitura pública guardada, sem código. Quando o destaque é uma **promoção**, nada é acrescentado: o carrinho já a anuncia (BEELINK-245).
19. **Promoção automática de primeira compra:** nenhuma chamada.

### D. "Só uma vez"

20. O aviso fica até a pessoa **fechar ou usar**. Não some sozinho depois de uma página vista: quem não reparou nele não perde a oferta em silêncio. É isso que "uma vez" quer dizer aqui; se o dono quis "some depois da primeira página", é uma mudança pequena sobre este mesmo cookie.

### O texto legal

21. A linha publicada diz "(pop-up)", "para que ele não abra de novo" e "guarda só o número da versão do aviso". Com este ticket o aviso pode ser a faixa, e numa loja sem pop-up o número não é uma versão. Edição mínima, em commit próprio: "(pop-up ou faixa)", "não apareça de novo" e "guarda só um número que identifica o aviso fechado". Nenhuma outra frase muda.
22. **A versão legal não muda:** hoje ainda é 07/10/2026, o dia da versão `2026-10-07` (mesmo dia, mesma versão, como os planos do 271 e do 306 descrevem).

## Fora do escopo

- Quem é elegível, as páginas, os gatilhos do pop-up, a espera pelo aviso de cookies: tudo fica.
- Eventos de rastreio; anunciar código a visitante; cupons ocultos.
- Lembrar o fechamento por conta (decisão 9).
- "O cupom que mais desconta" (decisão 14).
- Sumir sozinho depois da primeira página (decisão 20).
