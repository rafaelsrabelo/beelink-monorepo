# BEELINK-289 — S8: como o lojista paga depois do teste

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Épico S (BEELINK-218), investigação. Nenhum código: chamadas ao sandbox do Asaas, a documentação
> deles e duas telas deles usadas num navegador. Escrito em 13/10/2026. As respostas cruas do
> sandbox ficam fora do repositório, de propósito: trazem os tokens dos cartões de teste.

## A recomendação, que espera o sim do Rafael

**Criar a assinatura pela API sem cartão e mandar o lojista pagar a primeira cobrança na fatura do
Asaas** (caminho *c* do ticket: `POST /v3/subscriptions` com `billingType: UNDEFINED`, e o
`invoiceUrl` da primeira cobrança).

Por quê:

1. **O cartão nunca passa pelo nosso servidor.** É digitado na página do Asaas.
2. **Pix e boleto vêm juntos, sem trabalho a mais.** A fatura oferece boleto, Pix, cartão de
   crédito e de débito. No checkout hospedado (caminho *b*) a assinatura só aceita cartão: o Asaas
   recusa o pedido com Pix.
3. **Quem paga com cartão na fatura renova sozinho.** A assinatura guardou o cartão e passou a
   `CREDIT_CARD` (visto no sandbox).
4. **A assinatura é nossa desde antes do pagamento:** nasce com o nosso `externalReference` e o id
   fica guardado. No checkout hospedado a assinatura só existe depois de pago, e o
   `externalReference` do checkout não chega a ela.
5. **Pix pesa no caixa dos planos longos.** No sandbox, o semestral no cartão deixa R$ 313,25 em 32
   dias; no Pix, R$ 321,41 no mesmo dia. O anual: R$ 557,13 contra R$ 572,81. (Taxas do sandbox; as
   de produção são 'a verificar'.)

O que ela custa:

- A página é a fatura do Asaas, não uma tela de compra: mostra razão social, CNPJ, e-mail e
  endereço da conta que recebe, e um link "Reportar problema".
- Quem paga com Pix ou boleto **não renova sozinho**: a cada ciclo existe uma cobrança nova para
  pagar. Combina com a regra do épico (conta travada até pagar), mas é mais aviso para a bee-link
  mandar.
- Uma tentativa abandonada deixa uma assinatura com cobrança em aberto no Asaas. O S10 precisa
  reaproveitá-la ou removê-la.
- Trocar o cartão sem pagar nada não é possível sem o cartão passar por nós (ver S13).

Se o Rafael preferir só cartão e uma tela com cara de compra, o caminho *b* também funciona nos
três ciclos. O formulário próprio (caminho *a*) fica para depois: é o melhor para quem paga e o
mais caro para nós.

## Os três caminhos

| | *a* formulário nosso | *b* checkout hospedado | *c* fatura do Asaas |
|---|---|---|---|
| O cartão passa pelo nosso servidor? | Sim | Não | Não |
| Carga de segurança de cartão | A mais pesada: número e código de segurança trafegam por nós, mesmo sem gravar | A mais leve | A mais leve |
| Mensal, semestral e anual | Sim (visto) | Sim (visto) | Sim (visto) |
| Pix | Sim, como assinatura à parte (visto) | **Não** (o Asaas recusa) | Sim, na mesma página (visto) |
| Liberação do Asaas em produção | Guardar o token do cartão "depende de habilitação e está sujeita à análise da operação" (documentação) | A documentação não cita | A documentação não cita |
| Dados que o Asaas exige de nós | Titular: nome, e-mail, CPF/CNPJ, CEP, número, telefone, e o IP de quem paga | Com cliente já criado: telefone, endereço, número, CEP, bairro e cidade | Nome e CPF/CNPJ |
| Volta ao painel | Não sai | Tela do Asaas com um botão; não volta sozinho (visto) | Precisa do site cadastrado na conta (visto) |

A linha da carga de segurança é a minha leitura da norma PCI DSS (questionário D para quem
transmite dado de cartão, A para quem usa página de terceiros), não uma afirmação do Asaas.

## O que o sandbox respondeu

Conta de teste aprovada. Valores do épico: R$ 59,90, R$ 323,40 e R$ 574,80. Cartões de teste: dois
aprovados e os dois recusados que a documentação do Asaas publica. Pessoas e CPFs inventados.

| # | Teste | Resultado |
|---|---|---|
| 1 | Cliente só com nome, e-mail e CPF | Criado. |
| 2 | Assinatura no cartão, `MONTHLY`, primeira cobrança hoje | `ACTIVE`; cobrança `CONFIRMED` no mesmo dia; próxima em 13/11/2026. Líquido R$ 57,62. |
| 3 | Idem, `SEMIANNUALLY` | Próxima em 13/04/2027. Líquido R$ 313,25. |
| 4 | Idem, `YEARLY` | Próxima em 13/10/2027. Líquido R$ 557,13. |
| 5 | Guardar o cartão como token e assinar com `creditCardToken` | Funcionou no sandbox, igual ao cartão enviado. |
| 6 | Cartão recusado na criação | `400 invalid_action`, "Transação não autorizada. Verifique os dados do cartão de crédito e tente novamente." Nada fica para trás: nenhuma assinatura, nenhuma cobrança. |
| 7 | Cartão recusado com a primeira cobrança para amanhã | O mesmo `400`: o cartão é conferido na criação, mesmo sem cobrar. |
| 8 | Trocar o cartão (`PUT /subscriptions/{id}/creditCard`) | `200`, sem cobrança nova. Uma segunda troca logo em seguida: `400`, "Já existe uma atualização de cartão em andamento para esta assinatura". Minutos depois, troca para um cartão recusado: `400`, e o cartão anterior continua. |
| 9 | Renovação com problema | Paguei à mão a cobrança seguinte com cartão recusado: `400`, e ela continua `PENDING`. Forcei o vencimento: `OVERDUE`, **a assinatura continua `ACTIVE`** e a cobrança do mês seguinte continua de pé. Paguei a vencida com outro cartão: `CONFIRMED`, e esse cartão virou o da assinatura. |
| 10 | Cancelar (`DELETE /subscriptions/{id}`) | `deleted: true`, situação `INACTIVE`. As três cobranças em aberto somem. A paga fica, sem devolução. |
| 11 | Devolver uma cobrança paga | `REFUNDED` na hora. **A assinatura continua `ACTIVE`** com a cobrança de 13/11. |
| 12 | Assinatura no Pix, sem chave Pix na conta | **O pedido `PIX` voltou como `BOLETO`, sem erro.** O QR Code respondeu `400`, "Você não possui uma chave Pix cadastrada". |
| 13 | Assinatura no Pix, com chave | `PIX`, QR Code gerado; confirmada pela ação de teste: `RECEIVED`, líquido R$ 321,41, dinheiro no mesmo dia. A renovação é uma cobrança nova, `PENDING`, para 13/04/2027. |
| 14 | Assinatura no boleto, anual | `PENDING` com boleto, líquido R$ 572,81. Vencida: `OVERDUE`, assinatura `ACTIVE`. |
| 15 | Mensal com vencimento no dia 31 | 31/10, 30/11, 31/12, 31/01, 28/02, 31/03, 30/04, 31/05: o Asaas guarda o dia 31 e recua para o último dia do mês. |
| 16 | Cobrança avulsa de R$ 323,40 no cartão | `CONFIRMED`, líquido R$ 313,25. Em 6 vezes: 6 × R$ 53,90, líquido R$ 51,94 cada. |
| 17 | Checkout hospedado com assinatura | Criado nos três ciclos. Com Pix: `400`, "CREDIT_CARD é o único método de pagamento permitido para operações RECURRENT". Com cliente sem endereço: `400` pedindo telefone, endereço, número, CEP, bairro e cidade. CEP inventado: `400`. |
| 18 | Checkout mensal pago no navegador | Assinatura criada no cliente que já existia, cobrança `CONFIRMED`. O `externalReference` do checkout não chega à assinatura nem à cobrança: as duas trazem `checkoutSession`. `GET /checkouts/{id}` responde `404`. Depois de pagar, o Asaas mostra a tela dele com o botão "Acompanhar meu pedido", que leva ao `successUrl` sem acrescentar nada. |
| 19 | Assinatura `UNDEFINED`, paga com cartão na fatura | A fatura oferece boleto, Pix, crédito e débito. O cartão pediu número, titular, validade, código e CPF. `CONFIRMED`; a assinatura passou a `CREDIT_CARD` com o cartão guardado. |
| 20 | `callback` de retorno na assinatura | `400`, "Não há nenhum domínio configurado em sua conta. Cadastre um site em Minha Conta na aba Informações." |
| 21 | Assinatura `CREDIT_CARD` sem enviar cartão | Aceita; cobrança `PENDING` com fatura. Não abri essa fatura. |

Não foi exercitado: nenhum webhook foi visto chegar; a recusa do cartão **na cobrança automática**
de uma renovação; a cobrança automática no vencimento; os checkouts semestral e anual, criados e
não pagos; a fatura paga com Pix, boleto ou débito pela página; nada em produção.

## O que isso ensina ao desenho

- **O Asaas não trava ninguém.** Cobrança vencida, devolvida ou recusada não muda a assinatura.
  Quem decide se a conta está em dia é a bee-link, olhando se a cobrança do período está paga.
- **Devolver não cancela, e cancelar não devolve.** São duas chamadas, e a ordem importa.
- **Cancelar agora e usar até o fim** é `DELETE` na hora e a conta ativa até o fim do período pago,
  que é uma data nossa.
- **A data de renovação é a do Asaas:** mesmo dia do mês, recuando para o último dia. As funções de
  data do S1 precisam dar o mesmo resultado, com teste para o dia 31.
- **O estado se aprende listando** (`GET /subscriptions/{id}/payments`), como `PaymentSync` faz com
  os pedidos. O webhook é só o motivo para ir olhar.
- **Um pedido de Pix pode virar boleto em silêncio.** O S10 confere o `billingType` que voltou.
- **Uma conta do Asaas guarda vários webhooks.** A do sandbox já tem dois: o da loja
  `picole-da-leia` em homologação e um de outro produto. Se a conta da plataforma também for a
  conta de uma loja, cada webhook ouve as cobranças do outro e precisa ignorar o que não é seu.

## A verificar

| O quê | Quem |
|---|---|
| O que o Asaas faz quando o cartão é recusado na renovação: tenta de novo sozinho? quantas vezes? em que situação a cobrança fica? A documentação não diz, e os cartões de teste recusados não entram numa assinatura (testes 6 a 8). | Rafael, com o Asaas |
| A cobrança automática no vencimento e a geração da cobrança seguinte. Ficou uma assinatura de teste com vencimento em 14/10/2026 para ler. | Claude, em 14/10 |
| Quais webhooks chegam e quando (`SUBSCRIPTION_*`, `PAYMENT_*`). Não havia para onde o sandbox enviar. | Claude, quando o S3 tiver um endereço em homologação |
| As taxas de produção (`GET /myAccount/fees` com a chave de produção). | Claude, quando houver a chave |
| Se a fatura pode esconder boleto e débito. | Rafael, com o Asaas |
| O retorno automático ao painel depois de cadastrado o site (teste 20). | Claude, depois do cadastro |
| De onde veio a chave Pix aleatória que apareceu na conta de teste às 12:07 de 13/10, durante os testes de Pix. Eu não pedi a criação. | Rafael |

## O que o Rafael precisa fazer ou pedir ao Asaas

1. Dizer qual conta do Asaas recebe as assinaturas em produção. O nome, o CNPJ, o e-mail e o
   endereço dela aparecem na fatura. Na conta de teste o e-mail é o de outro produto.
2. Cadastrar o site (`beelink.biz`) em Minha Conta → Informações, para o lojista voltar ao painel.
3. Ter uma chave Pix na conta de produção antes de oferecer Pix.
4. Perguntar ao Asaas o que acontece na renovação recusada (primeira linha de "A verificar") e se a
   fatura pode esconder formas de pagamento.
5. Só se um dia formos ao formulário próprio: pedir a habilitação do token de cartão em produção.

## O que muda nos tickets, se o caminho for o recomendado

Nada foi alterado no Plane: espera o sim.

- **S1 (BEELINK-219):** guarda também a forma de pagamento que o Asaas devolveu e o endereço da
  fatura em aberto. As funções de data seguem a regra do dia 31. As situações não mudam.
- **S9 (BEELINK-291):** o cliente no Asaas precisa só de nome e CPF/CNPJ (e do e-mail). Telefone e
  endereço saem.
- **S10 (BEELINK-292):** cria a assinatura sem cartão e devolve o endereço da fatura. Saem o IP de
  quem paga, o tempo limite de 60 segundos e o caso do cartão recusado. Entram: reaproveitar a
  tentativa em aberto do mesmo ciclo, remover a de outro ciclo, e conferir a forma de pagamento que
  voltou.
- **S11 (BEELINK-293):** sem campos de cartão nem de endereço. O botão abre a fatura; na volta, a
  tela espera a confirmação. O teste de ponta a ponta do cartão recusado sai (a tela é do Asaas) e
  entra o de quem voltou sem pagar.
- **S13 (BEELINK-295):** a troca de cartão como está escrita exige o cartão passando por nós. Vira
  "pagar a cobrança em aberto com outro cartão", que passa a ser o da assinatura (teste 9), ou
  espera o formulário próprio. O que o ticket pedia para confirmar está nos testes 8 e 9: a troca
  não cobra, e um cartão recusado mantém o anterior.
- **S3 (BEELINK-221), fora da lista do ticket:** aprende o estado listando as cobranças da
  assinatura, e o webhook da plataforma é um cadastro à parte na conta.

## Riscos

- **Tudo aqui é sandbox.** A documentação do Asaas avisa que validações podem ser mais simples lá e
  que o que funciona no teste pode depender de habilitação em produção.
- **A ação de teste do sandbox falhou na primeira tentativa** em duas cobranças (`500`) e funcionou
  na segunda. Um teste automatizado contra o sandbox precisa tentar de novo.
- **A renovação recusada é o ponto cego.** O desenho acima não depende da resposta, porque olha a
  cobrança paga e não o que o Asaas tentou. Os avisos ao lojista dependem.
- **As cobranças de teste dispararam eventos para a homologação**, pelo webhook da loja
  `picole-da-leia` que a conta já tinha. O webhook seguiu sem falhas registradas.

## O que ficou na conta de teste

Dezessete clientes de nome "Teste S8 …", as cobranças pagas e uma assinatura mensal com vencimento
em 14/10/2026 (`teste-s8-sub-amanha-ok`), deixada para a leitura de amanhã. As outras assinaturas
de teste foram removidas. Dois checkouts não pagos expiram sozinhos. A chave Pix aleatória
continua lá.
