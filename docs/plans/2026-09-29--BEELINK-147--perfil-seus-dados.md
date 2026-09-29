# BEELINK-147 — J8 · Perfil: seus dados (nome, celular, e-mail, CPF e data de nascimento)

> **Tier:** plans — verdadeiro num momento, para um ticket. Fica velho por construção, e é append-only.
>
> J8 do Épico J (BEELINK-138). Sai do `main`, e não do K5 (#137): o perfil não depende do sino nem das
> conversas do painel, e uma pilha a mais é o que fez o K4 (#135) cair num branch já mergeado. Tela:
> 6h · Perfil e endereços (Seus dados).

## Definição de Pronto

1. A seção "Seus dados" da aba Perfil tem:
   - nome completo;
   - celular;
   - e-mail, que é o login: aparece, mas não se edita;
   - CPF, opcional, para a nota;
   - data de nascimento, opcional.
2. O CPF é conferido pelos dígitos verificadores. Um CPF inválido volta com a frase certa, e não com
   "confira os campos". O mesmo vale para uma data de nascimento impossível: no futuro, ou antes de
   1900.
3. API: CPF e data de nascimento no registro do cliente (migração) e em
   `UpdateCustomerProfilePayload`. Os dois voltam em `CustomerProfile`.
4. O painel mostra os dois na ficha do cliente (H7).
5. A regra do celular que já é de outro cliente (H10) continua valendo.
6. Testes (e2e da API, validadores, rota do BFF, blocos) e conferência em :3100.

## Decisões

### 1. O CPF guarda só os dígitos

A coluna é `CHAR(11)`. A API aceita o CPF escrito como a pessoa escreve (`123.456.789-09`) e guarda
os onze dígitos. Ela confere três coisas: são 11 dígitos, não são todos iguais, e os dois dígitos
verificadores batem. Em branco, apaga. A recusa tem código próprio, `CUSTOMER_CPF_INVALID`.

### 2. O CPF não é único na loja

O celular é único, porque é a chave pela qual um pedido acha o cliente. O CPF não é: uma recusa por
"CPF já cadastrado" diria a um estranho que aquele CPF compra na loja. Dois registros com o mesmo CPF
podem virar um aviso de duplicado no painel mais tarde, como o celular reclamado. Não é deste ticket.

### 3. A data de nascimento é uma data, sem hora

A coluna é `DATE`, e no fio vai `AAAA-MM-DD`. A API recusa uma data que não existe (31/02), uma data
no futuro e uma anterior a 1900, com `CUSTOMER_BIRTH_DATE_INVALID`. Na tela, o campo é o
`<input type="date">` do navegador, que em pt-BR se escreve dd/mm/aaaa.

### 4. O CPF aparece inteiro

A 6h mascara o CPF no campo (`•••.456.789-••`). Mas um campo mascarado que se edita mandaria a
máscara de volta num POST de formulário simples. O cliente vê o próprio CPF formatado, na própria
sessão. O lojista também o vê inteiro na ficha, porque é para a nota.

### 5. Só o cliente edita CPF e nascimento

O ticket pede que o painel **mostre** os dois. O formulário do lojista (nome, celular, endereço)
continua como está.

### 6. "Celular", e não "Celular (WhatsApp)"

Nenhuma cópia nova fala de WhatsApp. A 6h tinha um selo "Verificado" e "Trocar número", mas verificar
o celular está fora do escopo.

### 7. Juntar dois registros leva junto CPF e nascimento

Na mesclagem do H11, o registro mantido fica com o CPF e a data de nascimento do outro quando não
tem os seus, como já fica com o celular e o endereço.

### 8. O formulário continua um POST simples

Numa recusa, a página volta com os valores já salvos, e não com os digitados. É o padrão de hoje, e
a frase diz o que corrigir.

## Fora de escopo

- Trocar o e-mail; verificar o celular.
- Os endereços (J9), os avisos por e-mail (J12), a privacidade (J13).

## Adendo da revisão (29/09)

Dois revisores leram o ramo: um olhou correção, o outro regras e acessibilidade. O que entrou:

- **O BFF deixa passar a frase do CPF e a da data.** Antes, todo 400 virava "confira os campos".
  Agora só vira quando nenhum campo tem código próprio.
- **A data no painel segue o idioma do painel.** Antes era sempre pt-BR. A página passa o `locale`,
  e as estatísticas da ficha passam a usá-lo também.
- **O "hoje" da data de nascimento é o de São Paulo, e não o de UTC.** Com o de UTC, das 21h à
  meia-noite a API aceitava o dia de amanhã.
- **O campo de nascimento não oferece um dia depois de hoje** (`max`, com o mesmo hoje da API). Uma
  recusa custaria os outros valores digitados (decisão 8).
- **O campo que a recusa nomeia fica marcado.** Vale para o celular de outro cliente, o CPF e a data.
  Ele leva `aria-invalid` e é descrito pela frase da recusa.
- **Na ficha, "Data de nascimento".** "Nascimento: Não informada" não concordava.
- **O e2e da mesclagem cobre o CPF e a data.** O registro mantido recebe o CPF que não tinha e fica
  com a data que já era sua.

O que ficou de fora, de propósito:

- **Dois campos errados de uma vez dizem só o do CPF ou o da data.** O pipe de validação responde o
  primeiro código declarado. Com "confira os campos", a pessoa também precisaria de uma segunda volta.
  Mudar o pipe mexe em toda a API, e não compensa aqui.
- **Uma recusa já está na página quando ela carrega, e o leitor de tela pode não anunciá-la.** Isso
  vem de antes deste ticket (G3), e vale para toda recusa do formulário. Pôr a recusa no `<title>`
  resolveria sem script. Fica anotado no PR como pendência, fora deste ticket.
