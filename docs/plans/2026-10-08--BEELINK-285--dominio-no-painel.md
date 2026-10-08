# BEELINK-285 (Y6) — Painel: o item na página inicial e a tela "Domínio próprio"

> Épico Y (BEELINK-279). O desenho é o do [BEELINK-280](2026-10-08--BEELINK-280--dominio-proprio.md), decisão 10; a API que a tela consome está no [BEELINK-281](2026-10-08--BEELINK-281--dominio-da-loja-api.md), e o que a vitrine faz com o domínio no [BEELINK-283](2026-10-08--BEELINK-283--vitrine-pelo-dominio.md). A pilha fica `main` → Y1 → Y2 → Y4 → **Y6** → Y5 → Y3 → Y7. Escrito em 08/10/2026. Só recebe acréscimos.

## O problema

A API já guarda, confere e remove o domínio de uma loja, e a vitrine já abre nele. O lojista ainda não tem onde informar o domínio: hoje isso é uma chamada à API feita à mão. Falta o painel dizer qual é o endereço da loja, levar a uma tela própria, receber o domínio, mostrar o que configurar no provedor e dizer em que pé a configuração está, sem que ninguém precise falar com o suporte.

## Definição de Pronto

1. **Handlers do BFF** em `apps/web/src/app/api/stores/[slug]/custom-domain/` (`GET`, `PUT`, `DELETE`) e `…/check/` (`POST`): origem conferida, sessão do painel, repasse à API com o corpo como veio. O 204 do `DELETE` vira 200 com corpo vazio, como todo remover daqui.
2. **`revalidateStore(slug)`** em todo 2xx de `PUT`, `DELETE` e `POST …/check`, e nunca numa leitura nem numa recusa.
3. **Serviço e hooks** do TanStack Query em `apps/web/src/services/custom-domain/`: ler, salvar, conferir de novo e remover. Um erro carrega o código da API, nunca uma frase.
4. **O cartão da página inicial**, para loja e para site, no padrão dos que já estão lá: sem domínio, o endereço atual e a chamada "Aponte para o seu domínio"; com domínio pendente, o domínio e "Aguardando"; com domínio ativo, o domínio como endereço, marcado como feito. O endereço mostrado no estado ativo é o host que a API devolve.
5. **A tela em `/admin/<slug>/domain`**, rota própria: o campo do domínio; depois de salvo, o domínio, o selo do estado ("Ativo" em verde, "Aguardando" no pendente), quando foi conferido, "Verificar de novo" e remover, com confirmação.
6. **O que configurar no provedor**, numa tabela com botão de copiar em cada valor: um registro `A` em `@` para cada IP de `targetIps`, e um `CNAME` em `www` para `@`; e o texto curto (onde se faz, quanto demora, o encaminhamento, por que a raiz usa `A`).
7. **Uma frase por problema**, dizendo o que o lojista faz. Para `HTTPS_CERTIFICATE_INVALID` e `HTTPS_UNREACHABLE`: o DNS já está certo e a ativação do certificado é feita pela equipe da Beelink e pode levar algumas horas. O aviso do `www` é discreto.
8. **Depois de ativo**, a tela diz que a página já abre no domínio, que o endereço da plataforma passa a levar para ele, e que a mudança pode levar até um minuto para aparecer. Remover diz o mesmo minuto.
9. **Instalação sem a variável** (`targetIps` nulo): a tela diz que o domínio próprio não está disponível, sem campo.
10. **Carregamento em skeleton**; a leitura que falha é dita como falha, nunca como "sem domínio".
11. **Cada recusa da API vira uma frase**, escolhida pelo `errorCode` num lugar só.
12. **A porta de entrada:** o cartão da página inicial e um link dentro da tela "Loja".
13. **Textos** em `packages/ui/src/locales/` (os blocos) e em `apps/web/src/locales/` (o que é só do app), em pt-BR e em inglês; nenhuma frase dentro de componente.
14. **Testes de unidade:** os handlers (inclusive o `revalidateStore`), os hooks, os blocos e a tela. **Stories:** sem domínio, pendente com cada problema, ativo, indisponível, carregando, e o cartão da página inicial nos três estados.
15. **Documentos:** `apps/web/docs/README.md` (a página e os handlers) e `packages/ui/docs/README.md` (os blocos).
16. `pnpm ci-check` verde.

## Decisões

As do épico estão no plano do BEELINK-280. As abaixo são deste ticket, tomadas pelo desenvolvedor a partir do briefing do orquestrador; o Rafael pode mudar qualquer uma.

### Palavras

1. **Os textos não dizem "loja".** O cartão e a tela valem para loja e para site, e a página inicial do painel já tem um conjunto de frases só porque "loja" lê errado num site. Em vez de dobrar cada frase, os textos falam de "a sua página" e de "o endereço", que é como o fluxo de criação já chama as duas coisas.
2. **"Beelink"** na frase do certificado, como o briefing escreveu.

### A tela

3. **Não há "trocar o domínio".** O `PUT` da API troca o domínio salvo, mas a tela só oferece salvar (quando não há nenhum) e remover. Quem quer outro domínio remove e salva de novo: um estado a menos numa tela que ninguém vai ter visto num navegador antes do PR. Trocar com um botão só fica para quando alguém pedir.
4. **A API é quem decide o que é um domínio.** O campo só recusa o vazio; o que foi colado vai como veio (`https://www.MinhaLoja.com.br/` vira `minhaloja.com.br` lá). Repetir aqui a validação do BEELINK-281 seriam duas regras para manter iguais.
5. **A tabela de registros aparece sempre que a instalação tem `targetIps`**, também antes de salvar: o lojista pode apontar o DNS primeiro e informar o domínio depois, e assim o primeiro salvar já sai ativo.
6. **O valor do `CNAME` é `@`**, como o épico decidiu, com uma linha dizendo que o provedor que não aceita `@` ali recebe o próprio domínio. Registro.br e outros pedem o nome por extenso.
7. **A frase de `DNS_POINTS_ELSEWHERE` manda apagar o outro registro `A`.** A conferência exige que os registros `A` sejam exatamente os do servidor (decisão 12 do BEELINK-281), e o provedor costuma deixar um `A` de estacionamento ao lado do novo.
8. **Os endereços achados só vêm na resposta de salvar e de conferir** (`check`), nunca numa leitura. A leitura seguinte (ao voltar para a aba, por exemplo, que é exatamente o que o lojista faz depois de mexer no provedor) apagaria a lista. Por isso o hook guarda o `check` enquanto o domínio lido for o mesmo e tiver sido conferido no mesmo instante; uma conferência nova o substitui.
9. **`ACTIVE` com problema** é mostrado como ativo, com o aviso do que a última conferência achou, sem voltar a tela para "aguardando" (decisão 19 do BEELINK-281).
10. **O minuto é dito sempre que o domínio está ativo**, e não só logo depois de ativar: a tela não tem como saber se a ativação foi agora ou há uma hora quando é recarregada, e a frase é verdadeira nos dois casos.
11. **Instalação sem a variável e com um domínio já salvo:** a tela mostra o aviso de indisponível e o domínio com o botão de remover, sem "Verificar de novo" (a API recusaria com 503).
12. **A moldura da tela é a das integrações** (`IntegrationFrame`: o caminho de volta, o aviso do que acabou de acontecer, o cartão como título). O caminho de volta leva à página inicial do painel.
13. **O botão de copiar é um bloco novo, do painel.** O da vitrine (`storefront-copy-button`) faz o mesmo e é desenhado com as cores da loja; ele é usado por quatro blocos da vitrine, e mexer nele hoje, sem navegador, não se justifica por vinte linhas.

### A página inicial

14. **O cartão é um `SetupCard`**, o bloco dos outros cartões, com uma palavra a mais: `status`, o selo de quem não está feito nem por fazer ("Aguardando"). O bloco novo (`ShopAddressCard`) só escolhe as frases pelo estado.
15. **O cartão entra por último na lista**, estreito. No site ele completa a segunda fileira, que hoje tem dois cartões; na loja ele fica sozinho numa terceira fileira em telas largas. A página vai ser redesenhada, e nenhum cartão existente mudou de lugar.
16. **O cartão lê `Store.customDomain`**, que a leitura da loja já traz: nenhuma chamada a mais na página inicial. Salvar, conferir e remover derrubam essa leitura.
17. **O endereço da plataforma vem do pedido** (`siteOrigin()`), porque o web não tem variável que diga o próprio endereço fora do proxy. O painel só é servido no host da plataforma.
18. **"Ver a loja" não muda.** O link continua em `/<slug>`; com o domínio ativo, o proxy do BEELINK-283 o leva ao domínio.

### O menu

19. **Sem entrada no menu.** O menu não tem um grupo de configurações: tem um item só, "Configurações", no rodapé. A tela é alcançada pelo cartão da página inicial e por um link no fim da tela "Loja".

### Erros

20. **O mapa de erros fica no dicionário dos blocos**, em `customDomain.errors`, e uma função do app (`customDomainErrorOf`) escolhe a frase pelo código, como as integrações fazem (`googleAnalyticsErrorOf`). A função recebe o mapa tipado pelo `CustomDomainErrorCode` do contrato: um código novo na API deixa de compilar até ganhar uma frase.
21. **`RATE_LIMITED` tem frase própria.** Salvar e conferir têm limite por IP, e "Verificar de novo" é um botão que se aperta várias vezes.

## Fora do escopo

- A API, o `proxy.ts` e a vitrine (Y2, Y4): nada deles é tocado.
- Login com Google e chat no domínio da loja (Y5); Traefik (Y3); prova de posse por `TXT`.
- Uma rotina que confere os domínios sozinha: a tela só mostra o que a última conferência pedida achou.
- Trocar o domínio com um botão (decisão 3).
- `docs/product/`: o que o lojista ganha com o domínio já está escrito lá desde o BEELINK-283.

## Riscos

- **Nada desta tela foi visto num navegador** antes do PR: o ambiente do dia não deixa subir a API nem o web (ver as notas da entrega). Disposição, quebra de linha em tela estreita, foco e o botão de copiar só foram conferidos por teste de unidade.
- **O "Ativo" da tela pode adiantar-se à loja em até um minuto** (decisão 17 do BEELINK-283). A tela diz isso; não há o que o handler possa derrubar.
- **O cartão da página inicial depende do cache da leitura da loja.** Se outra aba ou outro aparelho muda o domínio, o cartão só acompanha na próxima leitura.
- **A frase do certificado promete uma ação da equipe.** Até o BEELINK-282, alguém precisa de fato cadastrar o domínio no Dokploy; a tela não avisa ninguém.
