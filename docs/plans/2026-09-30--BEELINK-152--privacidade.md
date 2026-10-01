# BEELINK-152 — J13 · Privacidade (LGPD): baixar meus dados e excluir minha conta

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J13 do Épico J (BEELINK-138), empilhado sobre o D14 (#156). Ele vem depois do J14 (favoritos), do
> J17 (avaliações) e do K1 (conversas), para que o arquivo e a exclusão cubram os dados deles. A
> tela é a 6h · Perfil e endereços (Privacidade).

## Definição de Pronto

1. A aba Perfil e endereços termina com a seção "Privacidade" da 6h: "Seus dados ficam só com esta
   loja. Você pode baixar uma cópia ou excluir a conta quando quiser.", "Baixar meus dados" e
   "Excluir minha conta".
2. "Baixar meus dados" baixa um arquivo JSON com tudo o que a loja guarda do cliente: a conta, o
   cadastro, os endereços, os pedidos, os favoritos, as avaliações e as conversas.
3. "Excluir minha conta" pede confirmação: a senha, ou o e-mail da conta digitado de novo quando ela
   não tem senha (aberta com o Google). Depois:
   - a conta deixa de existir, e todas as sessões e os sockets dela acabam;
   - o cadastro do cliente fica com a loja, sem o vínculo com a conta, se ele tem pedidos;
   - CPF, nascimento, preferências, endereços salvos e favoritos saem;
   - as avaliações aparecem como "Cliente";
   - os pedidos mantêm o nome e o endereço gravados na compra.
4. Uma recusa (senha errada, e-mail diferente) volta para a seção, dita nela, com a confirmação
   aberta.
5. `docs/product/README.md`: "Accounts" ganha a exclusão e o que sobra depois dela.
6. Há testes e2e da API, testes das rotas do BFF, dos blocos (com axe), e stories. `pnpm ci-check`
   está verde.

## Decisões

### 1. A API

- **`GET /stores/:slug/customer/me/data`** devolve `CustomerDataExport`. O arquivo reaproveita as
  formas que a conta já mostra, sem redeclarar nenhuma:
  - `CustomerProfile` para o cadastro e os endereços;
  - `CustomerOrder` para os pedidos;
  - `CustomerFavorite` e `CustomerReview` para favoritos e avaliações;
  - `CustomerConversation` para as conversas.
  - Novo é só `CustomerDataAccount`: nome, e-mail, quando foi confirmado e criado, como entra
    (senha, Google) e cada versão dos termos aceita.
- **`DELETE /stores/:slug/customer/me { password? | email? }`** apaga a conta, com o limite de
  tentativas de Entrar. A senha errada é `AUTH_PASSWORD_WRONG` (403), como na troca de senha. Um
  e-mail diferente, numa conta sem senha, é `CUSTOMER_DELETE_EMAIL_MISMATCH` (403). Responde 204.
- **Numa transação, com o cadastro travado:**
  - saem os favoritos e os avisos de favorito pendentes;
  - com pedidos ou avaliações, o cadastro fica com a loja. Ele perde `userId`, CPF, nascimento,
    `claimedPhone`, os endereços salvos e as preferências (que voltam ao padrão). Nome e telefone
    ficam, porque são o que a loja sabe do cliente desde a venda pelo WhatsApp e o que o painel mostra
    nos pedidos;
  - sem pedido nem avaliação, o cadastro sai inteiro. Nada nos livros da loja depende dele;
  - a conta sai, e com ela, em cascata, as sessões, os tokens, as identidades do Google e os aceites
    dos termos. As mensagens das conversas ficam, com `userId` nulo, porque são o histórico do
    pedido para a loja.
  - Depois do commit, os sockets das sessões fecham (`RealtimePublisher.endSessions`). A sessão
    apagada já não passa no guard, então o token de acesso deixa de valer na hora.
- **O e-mail do pedido que estava na fila** não sai: o mailer relê a conta e não acha ninguém.

### 2. A web

- **`StorefrontAccountPrivacy` (packages/ui):** a seção `#privacidade`.
  - "Baixar meus dados" é um link com `download`, que o BFF serve.
  - "Excluir minha conta" é um `details`, que funciona sem script. Ele abre a confirmação: o que
    acontece, o campo (senha ou e-mail) e o botão destrutivo. Ele já vem aberto quando volta com uma
    recusa.
- **O BFF:**
  - `GET /<loja>/api/customer/meus-dados` responde o JSON com `Content-Disposition: attachment`. Uma
    sessão que acabou vai para Entrar.
  - `POST /<loja>/api/customer/excluir-conta` apaga os cookies da loja e vai para o Entrar da loja
    com `?conta-excluida=1`, como "Sair de todos os aparelhos" já faz. Ali o aviso diz que a conta
    foi excluída e que os pedidos continuam com a loja. Uma recusa volta a `#privacidade`.
- **O início da loja não tem lugar para um aviso.** O Entrar tem, e é de lá que alguém abriria uma
  conta nova.

## Fora de escopo

- Apagar os pedidos: eles são os livros da loja.
- Avisar o lojista por e-mail que um cliente excluiu a conta.
- Um prazo de arrependimento (exclusão adiada).
