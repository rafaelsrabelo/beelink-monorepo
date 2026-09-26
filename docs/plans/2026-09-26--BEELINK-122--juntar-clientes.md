# BEELINK-122 — Juntar o cliente cadastrado pelo lojista com a conta que a pessoa cria depois

*Escrito em 2026-09-26, ao começar o ticket. Épico H. Empilhado sobre o H8 (BEELINK-120).*

## O que muda

A Maria compra pelo WhatsApp, e o lojista a cadastra com o celular. Depois ela cria conta na loja e,
em Minha conta, tenta salvar o mesmo celular. Hoje isso dá `CUSTOMER_PHONE_TAKEN`, e a loja fica com
dois registros da mesma pessoa.

Juntar sozinho não é seguro: qualquer pessoa pode digitar o celular de outra e herdar o endereço e o
histórico dela. Por isso quem junta é o lojista, que conhece o cliente:

- a lista e a ficha marcam **"possível duplicado"**;
- a ficha oferece **"Juntar com…"** cada um desses registros;
- em Minha conta, o erro diz para a pessoa **falar com a loja**.

## Definição de Pronto

1. A lista de clientes marca "possível duplicado" no registro que tem outro com o mesmo celular ou o
   mesmo nome.
2. A ficha mostra os possíveis duplicados, cada um com nome, celular, e-mail (ou "sem conta") e
   pedidos, e o motivo: mesmo celular ou mesmo nome.
3. "Juntar" pede confirmação e diz qual registro fica e qual some.
4. Ao juntar:
   - todos os pedidos passam para o registro que tem conta;
   - o resumo (pedidos, total, primeiro e último pedido) é recalculado;
   - o outro registro é apagado.
5. Dois registros com conta não se juntam: a API recusa com `CUSTOMER_MERGE_TWO_ACCOUNTS`.
6. Depois de juntar, o painel abre a ficha do registro que ficou.
7. Em Minha conta, o celular recusado diz para a pessoa falar com a loja.

## Decisões

### "Mesmo celular"

O celular é único na loja: dois registros nunca têm o mesmo. O caso do ticket só deixa rastro na
tentativa recusada. Então:

- **o registro da conta guarda o celular que tentou salvar** (`claimedPhone`), quando o índice o
  recusa;
- é esse o "mesmo celular": o `claimedPhone` de um é o `phone` do outro;
- a tentativa se apaga quando a conta salva um celular que fica, e quando o registro é juntado.

Guardar a tentativa não entrega nada à pessoa: a loja só vê um aviso, e quem decide é o lojista.

### "Mesmo nome"

- Igual sem diferença de maiúsculas, acentos e espaços a mais: "Mária  Silva" é "maria silva". O
  `unaccent` é o mesmo que a busca da vitrine já usa.
- **Dois registros com conta nunca são marcados:** não se juntam, e um aviso sem ação é ruído.

### Qual registro fica

- **O que tem conta.** É o que a pessoa vê em Minha conta, e é onde o pedido dela vai cair.
- **Sem conta nenhum dos dois:** fica o da ficha aberta, onde o lojista clicou.

### O que passa para o registro que fica

| Dado | Regra |
|---|---|
| Pedidos | Todos, os cancelados também. |
| Resumo | Recalculado dos pedidos, pela mesma função que um pedido usa. |
| Nome | O do registro que fica. O lojista corrige depois, se quiser. |
| Celular | O do registro que fica; se ele não tem, o do outro. |
| Endereço | O do registro que fica; se ele não tem nenhum, o do outro inteiro. Nunca parte a parte: duas metades de endereços diferentes não são um endereço. |
| Na loja desde | O do registro que fica. |

### Concorrência

- A junção tranca a linha da loja, a mesma trava que um pedido e uma troca de status tomam.
- Um pedido registrado ao mesmo tempo para o registro que some:
  - se entra antes, é levado junto;
  - se entra depois, recebe `ORDER_CUSTOMER_NOT_FOUND`, que a tela de pedido já explica ("Esse
    cliente não é mais desta loja. Escolha outro.").

### A rota

`POST /stores/:storeSlug/customers/:customerId/merge` com `{ otherId }`, e responde a ficha do
registro que ficou.

| Caso | Resposta |
|---|---|
| O mesmo registro dos dois lados | 400 `CUSTOMER_MERGE_SELF` |
| Um dos dois não é da loja | 404 `CUSTOMER_NOT_FOUND` |
| Os dois têm conta | 409 `CUSTOMER_MERGE_TWO_ACCOUNTS` |

A rota aceita juntar dois registros que não foram marcados. O painel só oferece os marcados, mas a
regra de segurança é quem junta, não o aviso.

### Na web

- **Lista:** um selo "Possível duplicado" ao lado do nome, na tabela e nos cartões.
- **Ficha:** uma seção "Possíveis duplicados", entre os números e os dados, só quando há algum.
- **Confirmação:** um diálogo que nomeia os dois registros e diz o que acontece. O botão fica
  travado enquanto junta.
- **Depois:** a lista, a ficha e os pedidos são invalidados, e o painel vai para a ficha que ficou.

## Fora do escopo

- **Dispensar um falso duplicado** (duas Marias Silva diferentes). Pede uma tabela de pares
  dispensados; fica para quando o aviso incomodar.
- **Juntar com alguém que não foi marcado.** O lojista pode corrigir o nome para o aviso aparecer.
- **Desfazer uma junção.**
- **Juntar duas contas.**
- **Juntar sozinho**, sem o lojista.

## Riscos

- **Nomes comuns** ("Maria") podem marcar pessoas diferentes. O aviso diz "possível", e juntar sempre
  pede confirmação.
- **A migração** só acrescenta uma coluna opcional e um índice.
