# BEELINK-150 — J11 · Segurança: trocar a senha, criar senha para quem entrou com Google e sair de todos os aparelhos

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> J11 do Épico J (BEELINK-138). Sai do J10 (#141), empilhado. O "Criar senha" usa o link e a tela de
> nova senha da loja que o J10 fez.

## Definição de Pronto

1. **Trocar a senha:** pede a senha atual e a nova (de 8 a 128 caracteres). Encerra as sessões dos
   outros aparelhos e mantém a deste. Uma senha atual errada volta com a frase dela.
2. **Conta que só entrou com Google:** "Criar senha" manda por e-mail o link de definir senha, no
   fluxo do J10.
3. **Sair de todos os aparelhos.**
4. **API:** rotas na porta do cliente, com um `errorCode` para a senha atual errada.
5. **Testes:** e2e da API, rota do BFF e bloco. Conferência em :3100.

## Decisões

### 1. Uma seção "Segurança" na aba Perfil e endereços

O design (6c–6h) não tem essa tela. A seção fica abaixo de "Endereços", no mesmo cartão: é onde já
estão os dados da conta, e o menu da área é o do design, sem espaço para outra aba.

### 2. As rotas, na porta do cliente

| Rota | O que faz | Resposta |
|---|---|---|
| `PUT /stores/:slug/customer/me/password` | Troca a senha: `{ currentPassword, newPassword }` | 204 |
| `POST /stores/:slug/customer/me/password/link` | Manda o link de definir senha: `{ returnTo? }` | 202 |
| `DELETE /stores/:slug/customer/me/sessions` | Sai de todos os aparelhos | 204 |

- **Os códigos novos são de conta** (`AuthErrorCode`), porque a senha é da conta:
  - `AUTH_PASSWORD_WRONG` (403): a senha atual está errada;
  - `AUTH_PASSWORD_NOT_SET` (409): a conta não tem senha para trocar.

  Nenhum é 401, que o BFF lê como sessão vencida e tentaria renovar.
- **Trocar a senha e mandar o link têm o limite de tentativas do login,** para ninguém adivinhar a
  senha atual por ali.

### 3. `CustomerProfile.hasPassword`

É o que decide o que a tela oferece: trocar a senha ou criar uma. A conta que entrou pelo Google
não tem senha até criar uma.

### 4. Trocar a senha mantém esta sessão

`revokeAllForUser` ganha uma exceção, a sessão atual, que o guard já conhece. Os outros aparelhos
caem na hora, junto com o canal de tempo real (`endSessions`).

### 5. "Sair de todos os aparelhos" inclui este

A pessoa sai daqui também e vai para a página de entrar da loja, com "Você saiu de todos os
aparelhos".

### 6. A tela

- **Formulários simples, que postam no BFF** `/<loja>/api/customer/seguranca/<ação>`
  (`trocar-senha`, `criar-senha`, `sair-de-todos`). A volta é para `#seguranca`, com o aviso ou a
  recusa.
- **A nova senha é digitada duas vezes,** como no J10. Senhas diferentes voltam sem chamar a API.
- **O campo recusado fica marcado** (`aria-invalid` e a frase como descrição).
- **O formulário de troca leva o e-mail da conta num campo de usuário escondido**
  (`autocomplete="username"`). Assim o gerenciador de senhas associa a senha nova à conta.

## Fora de escopo

- Trocar o e-mail.
- Verificação em duas etapas.
- A lista dos aparelhos com sessão aberta.
