# BEELINK-325 (AA9) — Cadastro de entregador: CPF, e-mail e WhatsApp únicos

> Plano de um ticket, escrito em 13/10/2026. Verdade naquele momento; só recebe acréscimos.
> Épico AA (BEELINK-316). Vem depois do AA5 (BEELINK-321, a tabela e a rota) e do AA6 (BEELINK-322, o
> formulário que envia).

## O problema

O formulário de entregador da landing entrou em produção em 13/10. O Rafael enviou o mesmo cadastro
várias vezes, com o mesmo CPF, e-mail e telefone, e viu "Cadastro recebido" todas as vezes: "cadê as
regras?".

A regra existia, mas era invisível. Pelo AA5, o mesmo CPF não criava a segunda linha: substituía a
primeira, e a resposta era a mesma de um cadastro novo, para o site não dizer quem está na lista. O
e-mail e o WhatsApp podiam repetir. O efeito: a pessoa não ficava sabendo que já estava cadastrada, e
quem sabia o CPF de alguém sobrescrevia os dados dessa pessoa.

## A decisão (do Rafael, 13/10)

Perguntado entre recusar só o CPF repetido, recusar CPF, e-mail e WhatsApp, ou manter como estava,
ele escolheu: **CPF, e-mail e WhatsApp são únicos, cada um com a sua mensagem.**

## Definição de Pronto

1. A API recusa com `409` um envio cujo CPF, e-mail ou WhatsApp já está na lista, com um código para
   cada um: `COURIER_DOCUMENT_TAKEN`, `COURIER_EMAIL_TAKEN`, `COURIER_WHATSAPP_TAKEN`.
2. O cadastro que já existia não é alterado.
3. A comparação é sobre o valor normalizado: o CPF com ou sem pontos, o e-mail em qualquer caixa, o
   WhatsApp com ou sem o 55.
4. Envios simultâneos com o mesmo dado gravam uma linha só.
5. O formulário mostra a frase no campo certo, leva o foco até ele e mantém o que foi digitado:
   "Este CPF já está cadastrado.", "Este e-mail já está cadastrado.", "Este WhatsApp já está
   cadastrado." Em pt-BR e en.
6. A política de privacidade deixa de dizer que o reenvio substitui os dados e que o site não diz se
   o CPF está na lista; passa a dizer a regra nova e o que ela revela. Versão nova dos textos.
7. Testes da API (unidade e contra o Postgres), do web e do navegador; `docs/product/` e os mapas.
8. `pnpm ci-check` verde.

## Decisões

1. **A ordem é CPF, e-mail, WhatsApp.** Com mais de um repetido, a resposta nomeia o primeiro nessa
   ordem, que é a do formulário. Um campo errado (400) vem antes de qualquer repetido (409).
2. **`409` e não `400`:** não há nada de errado com o que foi digitado; o dado já está na lista. O
   web escolhe a frase pelo `errorCode`, não pelo status.
3. **Uma trava, e não dois índices únicos novos.** O CPF já tem índice único (AA5). Para o e-mail e
   o WhatsApp, a API procura e grava num passo só, dentro de uma transação com
   `pg_advisory_xact_lock`, como o módulo do Asaas já faz. Motivo: a lista ficou aberta por algumas
   horas aceitando e-mail e telefone repetidos em CPFs diferentes; se houver um par assim em
   produção, criar o índice falha, e uma migração que falha impede a API de subir. Apagar linhas
   numa migração não é decisão minha. Sem migração, este PR não tem como quebrar o deploy por causa
   de dado existente.
   - O que se perde: quem inserir direto no banco não é barrado no e-mail nem no telefone.
   - Depois: conferir os repetidos em produção e, sem nenhum, criar os dois índices.
4. **Linhas antigas ficam como estão.** A regra vale para os envios novos.
5. **Quem errou um dado não conserta reenviando.** É o preço da regra, aceito na escolha. A política
   já dizia que consulta, correção e exclusão são pedidas pelo canal dela.
6. **A resposta passa a dizer se um CPF, e-mail ou telefone está na lista.** Também aceito na
   escolha. O limite por endereço (5 envios a cada 10 minutos) é o que contém uma varredura. A
   política diz isso com todas as letras.
7. **Versão `2026-10-14` dos textos legais.** A regra da casa (BEELINK-171) pede versão nova quando
   muda o que o produto faz com um dado, e a `2026-10-13` já estava publicada. A versão é o dia de
   vigência, e duas não cabem no mesmo dia: se este PR for publicado ainda em 13/10, as páginas
   dirão "Vigente desde 14 de outubro de 2026" um dia antes.

## O que foi visto (13/10)

- **API, unidade:** `courier-applications.service.spec.ts` e o DTO, 81 testes.
- **API contra o Postgres** (`harness_landing_test`): `test/courier-applications.e2e-spec.ts`, 24 de
  24. Entre eles: o mesmo CPF escrito de outro jeito, o mesmo e-mail em outra caixa e o mesmo
  WhatsApp com `+55` são recusados com o código certo e a linha fica igual; dez envios ao mesmo
  tempo com um CPF gravam uma linha; dez pessoas diferentes ao mesmo tempo com um e-mail gravam uma
  linha, e o mesmo com um WhatsApp; a linha do log de um 409 não tem dado pessoal.
- **`curl` na API de pé:** o primeiro envio, `204`; o segundo, igual,
  `409 {"errorCode":"COURIER_DOCUMENT_TAKEN","message":"That CPF is already on the list"}`.
- **Navegador** (Chromium, `next dev` com a API de pé): o spec do formulário, 25 de 25, duas vezes
  seguidas no mesmo banco. O teste novo cadastra uma pessoa, tenta outra com o CPF da primeira,
  depois com o e-mail, depois com o WhatsApp (as três frases, cada uma no seu campo, com o foco e o
  resto do formulário intacto) e por fim envia com nada repetido. Os envios de verdade do spec
  passaram a usar uma pessoa nova a cada vez, porque a lista não aceita mais a mesma duas vezes.
- Capturas das três recusas a 1280 e a 390 px em `.claude/worktrees/landing-aa-pr/screens-325/`.
- As linhas de teste foram apagadas.

## Fora do escopo

- Os dois índices únicos (decisão 3) e a limpeza de repetidos antigos.
- Uma tela para a pessoa consultar ou corrigir o próprio cadastro.
- `next build` e a suíte e2e sobre o build, localmente (disco com 2 GB): o CI roda.

## Riscos

- **O texto legal é rascunho**, como o do AA6. Revelar se um CPF está numa lista é assunto para o
  advogado.
- **Dá para descobrir quem se candidatou** testando CPFs, e-mails ou telefones, cinco por endereço a
  cada dez minutos.
- **Cadastros com erro de digitação ficam presos** até alguém corrigir à mão.
