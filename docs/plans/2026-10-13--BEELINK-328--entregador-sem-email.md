# BEELINK-328 (AA12) — O cadastro de entregador aceita vir sem e-mail

> Plano de um ticket, escrito em 13/10/2026. Verdade naquele momento; só recebe acréscimos.
> Épico AA (BEELINK-316). Vem depois do AA9 (BEELINK-325, um cadastro por pessoa) e do AA10
> (BEELINK-326, o e-mail de "cadastro recebido"). Abre caminho para o AA13 (BEELINK-329, a faixa
> amarela com o formulário curto), que é quem muda a tela.

## O problema

O Rafael pediu, em 13/10, que a seção "Para entregadores" da landing vire uma faixa amarela com um
primeiro passo curto: nome, CPF, WhatsApp e como a pessoa entrega. E-mail e documentos ficam para
um passo 2, que ainda não existe. A rota `POST /api/courier-applications` hoje recusa um corpo sem
e-mail (`COURIER_EMAIL_INVALID`), e a coluna `email` é obrigatória.

Este ticket é só a API e o contrato. Sozinho, não muda nada na página: o formulário atual continua
mandando o e-mail, e tudo o que valia para ele continua valendo.

## Definição de Pronto

1. Um corpo sem `email`, com o resto certo, é respondido `204` e fica na lista com `email` nulo.
2. Um corpo com `email` inválido continua recusado com `COURIER_EMAIL_INVALID`; com um e-mail que
   já está na lista, `COURIER_EMAIL_TAKEN`.
3. Dois cadastros sem e-mail, com CPF e WhatsApp diferentes, são os dois aceitos: a falta de e-mail
   não conta como e-mail repetido.
4. Um cadastro sem e-mail não cria aviso (`courier_application_notices`) e nada é enviado; um
   cadastro com e-mail continua criando o seu, na mesma escrita.
5. O contrato (`CourierApplicationPayload`) diz que o e-mail é opcional, e o Swagger da rota também.
6. A migration só solta o `NOT NULL` da coluna: nenhuma linha existente muda.
7. `docs/product/` e o mapa da API dizem a regra nova.
8. `pnpm ci-check` verde.

## Decisões

1. **Opcional, e não removido.** O e-mail sai do primeiro passo da tela, mas a lista já tem
   endereços, o passo 2 vai pedi-lo, e o e-mail de "cadastro recebido" (AA10) depende dele. O campo
   fica no contrato como `email?: string`.
2. **Ausente é ausente; vazio é errado.** Um corpo sem a chave `email` (ou com `null`) é um cadastro
   sem e-mail. Um `email: ""` é um e-mail inválido, como qualquer outro texto que não é endereço: a
   tela nova não manda a chave, e uma tela que manda vazio tem um defeito que a recusa mostra.
3. **A checagem de repetido ignora o e-mail ausente.** No Prisma, `{ email: undefined }` dentro de
   um `OR` é um filtro vazio, que casa com a lista inteira: a consulta passa a montar o `OR` só com
   o que o corpo trouxe. CPF e WhatsApp continuam sempre lá.
4. **Sem endereço, sem aviso.** O aviso é escrito junto com o cadastro só quando há e-mail, e o
   envio só é pedido quando um aviso foi escrito. O carteiro (`CourierApplicationMailer`) também
   passa a dar por encerrado, sem enviar, um aviso cujo cadastro não tem endereço — vale para uma
   linha escrita por outro caminho, como a regra de "um e-mail por endereço" já vale.
5. **O aceite continua do servidor.** O pedido original falava em mandar `aceiteTermosEm` no corpo.
   A rota carimba a versão e o momento do aceite no servidor desde o AA5 e recusa um corpo que
   traga qualquer um dos dois; isso não muda. O corpo segue com `acceptedTerms: true`.
6. **Nenhum índice novo.** O AA9 deixou anotado que os índices únicos de e-mail e WhatsApp dependem
   de conferir os repetidos em produção. Continua assim; com e-mail nulo, um índice único comum
   ainda serviria (nulos não colidem), mas não é deste ticket.
7. **Os textos legais não mudam aqui.** A política lista o que o formulário coleta, e o formulário
   só muda no AA13: a versão nova dos textos vai com ele.

## Fora do escopo

- A tela: faixa amarela, formulário curto, cidade fixa no envio, "Esse CPF já tem cadastro" (AA13).
- O passo 2 do cadastro (e-mail e documentos) e o aviso que ele deve passar a dever.
- Qualquer envio por WhatsApp.

## Arquivos

- `packages/contracts/src/courier.ts` — `email` opcional.
- `apps/api/prisma/schema/courier.prisma` e uma migration — a coluna aceita nulo.
- `apps/api/src/modules/couriers/dto/courier-application.dto.ts` — `@IsOptional()` no e-mail.
- `apps/api/src/modules/couriers/courier-applications.service.ts` — o `OR` só com o que veio; o
  aviso só com endereço.
- `apps/api/src/modules/couriers/courier-application-mailer.ts` — aviso sem endereço é encerrado
  sem envio.
- `apps/api/src/modules/couriers/courier-applications.controller.ts` — o texto do Swagger.
- Testes: `courier-applications.service.spec.ts`, `dto/courier-application.dto.spec.ts`,
  `courier-application-mailer.spec.ts`, `test/courier-applications.e2e-spec.ts`.
- `docs/product/README.md`, `apps/api/docs/README.md`.
