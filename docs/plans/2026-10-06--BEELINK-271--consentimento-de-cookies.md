# BEELINK-271 (X4) — a loja pergunta antes de rastrear, e a política de privacidade cita a Meta

> Épico X (BEELINK-267), "Pixel da Meta". Empilhado sobre o X3 ([BEELINK-270](2026-10-06--BEELINK-270--pixel-da-meta-no-painel.md)). A pilha fica `main` → X1 → X2 → X3 → **X4** → X5 (eventos), e é mesclada junta. O que o domínio compartilhado exige deste ticket está no X1 ([BEELINK-268](2026-10-06--BEELINK-268--pixel-em-dominio-compartilhado.md), itens 2 e 6).

## O problema

A loja já guarda o ID do pixel (X2) e o lojista já o informa no painel (X3). O X5 vai carregar o script da Meta na vitrine. Antes disso, o visitante precisa poder dizer sim ou não, a escolha precisa ser lembrada, e a política de privacidade — que hoje diz "o bee-link não usa pixels de publicidade nem scripts de terceiros" — precisa passar a dizer a verdade.

Este ticket **não carrega nada da Meta**. Ele entrega a pergunta, a resposta guardada e o texto.

## Definição de Pronto

1. Numa loja com pixel conectado (`PublicStore.metaPixelId`), a vitrine mostra uma faixa de cookies a quem ainda não escolheu, com "Recusar" e "Aceitar" — dois botões iguais em tamanho e destaque, nada pré-marcado.
2. A escolha é guardada num cookie nosso, `bl_consent`, com `Path=/<slug>`: vale só naquela loja, e o aceite dado numa loja não conta em outra. Recarregar a página não pergunta de novo.
3. Uma loja sem pixel não mostra a faixa, não mostra o link "Cookies" e não grava o cookie. Um cookie antigo de quando a loja tinha pixel não conta como aceite.
4. O visitante muda de ideia quando quiser: o rodapé de uma loja com pixel tem "Cookies", que reabre a faixa, e a faixa reaberta diz qual é a escolha atual.
5. A faixa é desenhada nas cores da loja (`--shop-*`, sem cor literal), fica no fluxo da página — não cobre a barra de compra do celular nem o checkout — e não impede o uso da loja.
6. Acessível: uma região com nome, botões alcançáveis pelo teclado, sem prender o foco; a escolha feita é anunciada a quem usa leitor de tela; sem violações no axe.
7. O painel e a prévia do modo design nunca mostram a faixa.
8. A escolha é legível no servidor (para o X5 decidir se desenha o carregador, e para o X7 no pedido) e no cliente (para o X5 reagir ao aceite sem recarregar), por uma função e um hook nomeados neste plano.
9. Ler o cookie não muda o que é guardado em cache: nenhuma leitura pública passa a depender do visitante.
10. Os textos legais ganham uma versão nova (`LegalVersion`), e a política de privacidade diz: o que vai para a Meta e quando, que quem anuncia é a loja, que o identificador da Meta no navegador é um só para o domínio, e como retirar o aceite. As frases que deixaram de ser verdade são corrigidas.
11. O texto existe em pt-BR e em inglês onde a tela tem os dois (a faixa e o rodapé); os textos legais continuam só em pt-BR, como decidiu o BEELINK-171.
12. Blocos novos têm story e teste com axe; os mapas de superfície dizem o que entrou; `pnpm ci-check` verde.

## Decisões

### Como o consentimento é guardado

1. **Cookie `bl_consent`, nosso, não `httpOnly`, `Path=/<slug>`, `SameSite=Lax`, `Secure` em HTTPS** — as mesmas escolhas do `bl_cart` (`cart-cookie.ts`), pelos mesmos motivos: o servidor o lê para desenhar a página já certa, o navegador o escreve na hora do clique, e o caminho faz duas lojas no mesmo domínio terem duas respostas. Não é segredo: é uma resposta que o próprio visitante deu. Nada de `localStorage` (portão `web/no-web-storage`).
2. **Dois valores: `granted` e `denied`.** Qualquer outra coisa lida do cookie é "ainda não escolheu" — o cookie é do visitante para editar, e um valor estranho nunca vira um aceite.
3. **Dura 180 dias, para o sim e para o não.** Depois disso a loja pergunta de novo. Não há prazo na LGPD; seis meses é o que a CNIL francesa recomenda e é curto o bastante para um "sim" não valer para sempre. O prazo é o mesmo nos dois sentidos para a recusa não ser mais cara que o aceite (perguntar de novo mais cedo a quem recusou seria insistência).
4. **A finalidade é uma só: marketing, isto é, o Pixel da Meta desta loja.** O cookie não guarda categorias. Se um dia houver uma segunda finalidade (outro pixel, análise de audiência), o valor ganha forma nova e os valores de hoje passam a ser lidos como "ainda não escolheu".
5. **Nada é gravado na API neste ticket.** O consentimento é de um navegador numa loja, não de uma conta: um visitante anônimo consente, e a mesma pessoa em dois aparelhos responde duas vezes.

### Como os próximos tickets leem (contrato para X5 e X7)

6. **Uma regra, num lugar só:** `marketingAllowed(store, choice)` em `apps/web/src/lib/consent-cookie.ts` — verdadeiro só quando a loja tem pixel **e** a escolha é `granted`. Ninguém compara o valor do cookie à mão.
7. **X5, no servidor:** `consentAt()` em `apps/web/src/lib/consent.ts` (lê `cookies()`, como `cartLinesAt()`), e então `marketingAllowed(store, await consentAt())` decide se o carregador é desenhado no HTML.
8. **X5, no cliente:** `useConsent((consent) => consent.choice)` de `components/storefront/consent-provider.tsx`. O provedor é montado em `app/[slug]/layout.tsx` com a escolha que o servidor leu; aceitar muda o valor na hora, sem recarregar. Retirar o aceite também muda na hora: o X5 deve parar de enviar (e chamar `fbq('consent', 'revoke')`) — o script já carregado só sai da página na próxima carga.
9. **X7, no pedido:** o pedido é criado por `app/[slug]/api/orders`, que fica sob o caminho da loja e por isso **recebe** o `bl_consent`. O handler lê o cookie (`decodeConsent`) e manda o fato à API num campo novo do pedido, que o X7 acrescenta ao contrato. O navegador não informa o próprio consentimento no corpo: o handler lê o cookie. A API só confia nisso para decidir se envia à Meta; nada de dinheiro depende do campo.
10. **Ponto em aberto para o X5: `_fbp` e `_fbc` depois de uma recusa.** São da Meta e do domínio inteiro; apagá-los quando o visitante retira o aceite na loja A tiraria o identificador que a loja B, onde ele aceitou, ainda usa — e daqui não dá para saber se existe uma loja B, porque cada `bl_consent` só é visível no caminho da própria loja. A política diz o que é verdade: retirar o aceite faz esta loja parar de enviar; o identificador fica no navegador até vencer ou ser apagado.
11. **Duas abas:** a escolha feita numa aba chega à outra na próxima carga de página. Nenhum canal entre abas neste ticket.

### A faixa

12. **No fluxo da página, no topo, antes do cabeçalho — não fixa na tela.** A página de produto tem no celular uma barra de compra fixa embaixo (`storefront-buy-bar`), e o checkout tem as ações no fim da tela: uma faixa fixa embaixo cobriria exatamente isso. No fluxo ela não cobre nada, não precisa de `z-index`, é a primeira coisa lida por um leitor de tela e some ao rolar sem que a loja deixe de funcionar. O custo é a faixa não seguir o visitante; quem não responde simplesmente não é rastreado, que é o padrão seguro.
13. **Montada em `app/[slug]/layout.tsx`, fora do `StorefrontFrame`.** O painel e a prévia do modo design desenham o `StorefrontFrame`, mas nunca passam por esse layout: assim a faixa não tem como aparecer lá. O layout fica fora do elemento que carrega as variáveis `--shop-*`, então a faixa recebe a paleta da loja do próprio layout (`shopPaletteVariables(store.colors)`).
14. **Dois botões do mesmo desenho**, "Recusar" primeiro e "Aceitar" depois, lado a lado e da mesma largura no celular. Nenhum "X" para fechar: fechar sem responder seria um terceiro botão cujo sentido ninguém sabe.
15. **"Cookies" no rodapé é um botão, não um link:** é uma ação na página, não um endereço. O item do rodapé passa a aceitar, além de `{ label, href }`, um nó pronto; o botão é um bloco pequeno (`storefront-footer-action`) que a vitrine liga ao estado. Reabrir leva o foco à faixa (ela está no topo, o botão no rodapé), e responder devolve o foco ao botão.
16. **Reaberta, a faixa diz a escolha atual** ("Sua escolha atual: você aceitou."). Os dois botões continuam lá: escolher de novo é a forma de fechar.
17. **Na prévia do modo design, "Cookies" aparece no rodapé de uma loja com pixel e não faz nada**, como todo link da prévia. Fora do layout da loja não há estado de consentimento, e um estado inerte fica no lugar (como o carrinho faz).
18. **Uma landing sem cabeçalho e rodapé (`chrome` desligado) mostra a faixa, mas não tem o "Cookies"** — ela não tem rodapé nenhum. O caminho de volta está em qualquer outra página da loja.
19. **O texto da faixa não usa a palavra "essenciais" nem lista categorias.** Diz o que acontece: esta loja usa o Pixel da Meta, aceitar envia dados da navegação nesta loja à Meta, recusar não muda o funcionamento da loja, e leva à política.

### Cache

20. **Nada novo vira dinâmico.** `app/[slug]/layout.tsx` já lê `cookies()` três vezes por requisição (carrinho, sessão do cliente, idioma): as páginas da vitrine são desenhadas por requisição, e o que é guardado são as leituras públicas (`public-api.ts`, por tag). O consentimento é lido no mesmo layout, do mesmo jeito que o carrinho, e não entra em nenhuma leitura guardada: nenhuma chave de cache passa a depender do visitante, e a faixa de um visitante não tem como ser servida a outro.

### Os textos legais

21. **Versão nova: `LegalVersion = "2026-10-06"`.** O mecanismo é o do BEELINK-171, seguido como está: o tipo muda no contrato, e a API (`LEGAL_VERSION`) e a web (`legalTexts.version`, e a frase "Vigente desde…" dos dois documentos, presa por teste) param de compilar ou de passar até dizerem o mesmo dia. Uma versão para os dois documentos: os Termos mudam só de data.
22. **O que acontece com quem aceitou a versão anterior** (lido no código, `auth.service.ts` e `customer-google.service.ts`):
    - nada é apagado nem editado: as linhas de `legal_acceptances` com `2026-09-30` e `2026-10-02` continuam lá;
    - ninguém é bloqueado e ninguém vê uma tela pedindo novo aceite — isso não existe no produto (ficou fora do BEELINK-171, "pedir o aceite de novo quando a versão mudar");
    - conta nova grava `2026-10-06`;
    - conta antiga ganha uma linha `2026-10-06` na próxima vez que passar por uma tela que diz que aceita: "Continuar com Google" (`GOOGLE`) ou definir a senha pelo link do e-mail (`PASSWORD_RESET`). Entrar com e-mail e senha não grava nada, como hoje.
    - O aviso de cookies **não** é um aceite dos Termos e não escreve em `legal_acceptances`: são duas coisas diferentes, e o visitante anônimo não tem conta.
23. **O que muda no texto da política** (rascunho para revisão jurídica, como o resto do documento):
    - seção nova, "Pixel da Meta nas lojas": o que é, quando é carregado (só em loja que conectou um pixel, só depois do aceite), o que vai para a Meta, que quem anuncia é a loja, o identificador único no domínio e como retirar o aceite;
    - "Dados técnicos": a frase "não usa … pixels de publicidade nem scripts de terceiros" ganha a exceção;
    - "Para que os dados são usados": o aceite do aviso de cookies entra no item de consentimento, e "o bee-link não usa dados pessoais para publicidade" passa a dizer que quem os usa para anúncios é a loja que conectou o pixel;
    - "Com quem os dados são compartilhados": a Meta entra na lista, apontando para a seção nova;
    - "Cookies": `bl_consent` entra na lista; `_fbp` e `_fbc` são nomeados como cookies da Meta, gravados só depois do aceite.
24. **O texto descreve o produto do dia em que a pilha for ao ar** (X4 e X5 juntos), como o X3 decidiu para o painel. Se o X4 fosse ao ar sozinho, a política diria que algo é enviado à Meta depois do aceite quando ainda nada é — o erro seria para o lado seguro, mas a pilha é mesclada junta.
25. **Nenhuma base legal nova é inventada.** O texto diz o fato (só depois do aceite) e põe o aviso de cookies no item "Consentimento" que a política já tem. Se a revisão jurídica quiser outra redação, a troca é de frase. A duração de `_fbp` (90 dias) vem do que conheço da documentação da Meta; a do `_fbc` foi lida no X1.
26. **Para o X7:** enviar pelo servidor (com e-mail e telefone cifrados) é um compartilhamento que este texto não descreve. O X7 traz outra versão dos textos.

### O painel

27. **Uma frase a mais em "Bom saber", na tela do pixel:** o visitante vê um aviso de cookies e nada vai para a Meta sem o aceite dele. É verdade hoje (nada é enviado) e continua verdade com o X5. O X3 deixou essa frase para este ticket.

## Fora do escopo

- Carregar o script da Meta, chamar `fbq`, qualquer evento (X5, X6).
- Guardar o consentimento no pedido ou na API (X7), captura de UTM e `fbclid` (X8).
- Pedir de novo o aceite dos Termos a contas antigas quando a versão muda (fora desde o BEELINK-171).
- Um painel de preferências por categoria: há uma finalidade só.
- e2e de Playwright novo no CI: a suíte da web não cria loja com pixel; a cobertura é de teste de unidade e de componente, e a tela real é olhada uma vez, à mão, no banco `harness_meta_pixel`.
- `docs/product/`: o que o lojista ganha passa a ser verdade quando os eventos existirem (X5).

## Pendências do Rafael

- **Revisão do texto da política** (e, de preferência, de um advogado) antes de mesclar: é um rascunho factual, não um parecer.
- Os `[PREENCHER: …]` do BEELINK-171 continuam no texto; a seção "Transferência internacional" passa a ter mais um fornecedor para considerar (a Meta).
