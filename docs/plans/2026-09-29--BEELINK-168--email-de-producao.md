# BEELINK-168 · L2 — E-mail de produção: provedor SMTP e domínio remetente verificado

> **Tier:** plans. Retrata um momento, para um ticket. Só recebe acréscimos.

## O problema

Sem e-mail, ninguém entra. Toda conta nasce não verificada, e o carrinho exige login. O primeiro deploy (29/09) mostrou três falhas que não apareciam em lugar nenhum até alguém tentar se cadastrar:

- **Senha errada.** O SMTP recusava o login com `535`. A API subia normalmente, e o cadastro dizia "Confira seu e-mail" sem que nada saísse, porque um envio que falha não derruba o pedido que o causou, de propósito. Só o log do envio mostrava a falha.
- **Senha com `?`.** Escrita crua no `SMTP_URL`, ela deixou a URL inválida, e a API não subiu ("Invalid URL at SMTP_URL").
- **Senha com `$`.** O Compose lê `$` como variável, então a senha chegaria alterada, sem erro nenhum.

Além disso, o remetente padrão do código ainda dizia "Harness".

## Definition of Done

1. Um provedor SMTP com `SMTP_URL` e `MAIL_FROM` configurados no Dokploy, e o remetente dizendo bee-link.
2. SPF, DKIM e DMARC publicados no domínio remetente.
3. Em produção, a API confere o login do SMTP quando sobe e diz no log se funcionou.
4. O `.env.dokploy.example` e o `docs/repo/deploy.md` explicam como escrever o `SMTP_URL` e como conferir o login sem enviar nada.
5. Teste de entrega: cadastro de lojista, cadastro de cliente numa loja e redefinição de senha, chegando fora do spam no Gmail e no Outlook.

## Decisões

- **Provedor: Purelymail, no domínio `beecoders.net`.** É o "equivalente" que o ticket admite no lugar do Resend. O domínio já tinha MX, SPF (`include:_spf.purelymail.com`), três chaves DKIM (`purelymail1..3._domainkey`) e DMARC com `p=quarantine`, conferidos por DNS em 29/09. A conta que envia é `beelink@beecoders.net`, e o remetente é `bee-link <beelink@beecoders.net>`. O login foi conferido com `nodemailer.verify()` sem enviar nada.
- **O remetente padrão do código passa a ser `bee-link <nao-responda@bee-link.local>`.** Ele só vale em dev e nos testes, onde o Mailpit recebe tudo. Em produção, o compose exige `MAIL_FROM`.
- **A conferência do login roda uma vez na subida, e só em produção.** Ela não segura a subida: um provedor lento não atrasa a API. Fora de produção, o Mailpit aceita qualquer coisa, e perguntar só faria barulho nos testes.
- **O log não mostra a senha.** O erro do nodemailer traz o código e a resposta do servidor (`EAUTH`, `535 ...`), nunca a URL.

## Fora de escopo

- Os e-mails de andamento do pedido, que são o J12 (BEELINK-151, já na `main`).
- Trocar de provedor. O Purelymail serve para o volume do lançamento. Se o volume crescer, um provedor transacional (Resend, SES) muda só o `SMTP_URL`.

## Pendências do Rafael

- **O teste de entrega do item 5 é manual.** Faça um cadastro de lojista, um cadastro de cliente numa loja e uma redefinição de senha, e confira se cada e-mail chega na caixa de entrada do Gmail e do Outlook, não no spam. A redefinição de senha de 29/09 já chegou.
