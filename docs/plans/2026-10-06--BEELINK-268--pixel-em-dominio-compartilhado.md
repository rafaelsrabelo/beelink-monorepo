# BEELINK-268 (X1) — o que o domínio compartilhado limita no Pixel da Meta e na API de Conversões

> Épico X (BEELINK-267), "Pixel da Meta". Investigação, sem código: esta nota é a entrega. Ela existe para o recorte de X2 a X10 ser corrigido antes de alguém construir.

## A pergunta

Toda loja mora em `beelink.biz/<slug>`. O lojista não é dono do domínio e não pode verificá-lo como dele na Meta. Antes de construir: o pixel de cada lojista mede e otimiza nesse endereço? O que quebra, o que só fica pior, e o que muda nos tickets?

## Definição de Pronto

1. Dito o que a falta de verificação de domínio impede hoje, e o que não impede.
2. Dito como `_fbp` e `_fbc` se comportam com vários pixels no mesmo domínio.
3. Listado o que a API de Conversões exige: token, campos mínimos, deduplicação, prazos.
4. Dito, ticket a ticket, o que muda no recorte do épico.
5. Cada afirmação marcada como lida na fonte ou como inferência.

## Resposta curta

**Dá para construir. Nada no domínio compartilhado impede o pixel do lojista de medir e de otimizar campanhas.** O que o domínio compartilhado traz são três cuidados de implementação (itens 2, 3 e 5 abaixo) e um limite que não se resolve sem domínio próprio por loja (item 1).

## O que foi encontrado

### 1. Verificação de domínio e medição agregada (iOS)

- Desde 15/05/2023 a Meta deixou de exigir verificação de domínio, a configuração dos oito eventos priorizados e a escolha de "domínio de conversão" no anúncio. A aba de Medição de Eventos Agregados saiu do Gerenciador de Eventos. A verificação continua "recomendada". *Lido em fontes secundárias (Adviso, DEPT, Jon Loomer); a página de ajuda da própria Meta não pôde ser lida daqui.*
- Consequência: o lojista cria campanha de conversão otimizada para `Purchase` com o pixel dele em `beelink.biz/<slug>` sem verificar nada.
- O que ele continua sem poder: verificar `beelink.biz` no Gerenciador de Negócios dele. Um domínio é verificado por um negócio só, e esse seria o da Beelink. *Inferência minha sobre o uso que resta da verificação (por exemplo, editar a prévia de link dos anúncios): não confirmei na Meta.*
- Saída definitiva, fora deste épico: domínio próprio por loja.

### 2. `_fbp` é um por navegador no domínio inteiro, não um por loja

- O pixel grava `_fbp` como cookie próprio do site, no domínio registrado (`beelink.biz`), no formato `fb.<índice do domínio>.<criação>.<aleatório>`. *Lido na documentação da Meta.*
- Em `beelink.biz` isso é **um identificador para todas as lojas**: o visitante que passa pela loja A e depois pela loja B leva o mesmo `_fbp` aos dois pixels. Não quebra a medição (cada pixel é um fluxo de eventos separado), mas é um ponto de privacidade: o consentimento dado numa loja não pode valer para outra.
- O cookie não aceita escopo por caminho que o pixel respeite; quem tem de ser por loja é o **nosso** consentimento, guardado num cookie com `Path=/<slug>`, como o carrinho já é.

### 3. `_fbc` de uma loja vaza para a outra

- `_fbc` guarda o clique do anúncio (`fbclid`), por 90 dias, também no domínio inteiro. *Lido na documentação da Meta.*
- Um clique num anúncio da loja A fica no navegador e seria enviado junto dos eventos da loja B. *Inferência: a Meta só atribui a cliques da própria conta, então o efeito provável é ruído, não atribuição errada. Não confirmado.*
- A documentação permite montar o `fbc` no servidor a partir do `fbclid` da URL (`fb.1.<criação em ms>.<fbclid>`). *Lido.* Para a API de Conversões vale usar o `fbclid` que **esta loja** recebeu na chegada do visitante, que o X8 já vai gravar, e não o cookie compartilhado.

### 4. API de Conversões

*Lido na documentação da Meta, salvo onde dito.*

- Campos obrigatórios em todo evento: `event_name`, `event_time`, `user_data` (ao menos um identificador) e `action_source`. Para `action_source: "website"`, também `event_source_url` e `client_user_agent`.
- `event_time` aceita até **7 dias** antes do envio. Um evento mais velho derruba a requisição inteira, com todos os eventos dela.
- `em` e `ph` vão com SHA-256, depois de normalizados: e-mail sem espaços e em minúsculas; telefone só dígitos, com o código do país, sem zeros à esquerda. `fbp`, `fbc`, `client_ip_address` e `client_user_agent` **não** são cifrados.
- Deduplicação com o pixel do navegador: mesmo `event_name` e mesmo `event_id` (no pixel, `eventID`), dentro de 48 horas, no mesmo conjunto de dados.
- O token de acesso é gerado pelo lojista no Gerenciador de Eventos, para o pixel dele. *Do meu conhecimento; a página lida não diz a quem o token pertence.*

### 5. Vários pixels na mesma aba

- `fbq('init', id)` acumula: numa navegação de cliente entre duas lojas, sem recarregar a página, os dois pixels ficam iniciados e um `fbq('track', …)` simples iria para os dois. *Lido em fonte secundária (Jentis); bate com o que conheço da biblioteca.*
- O envio tem de ser sempre endereçado: `fbq('trackSingle', <id da loja>, …)`.
- *Inferência, a confirmar no X5:* a coleta automática do pixel (cliques em botões, metadados da página) deve ser desligada por pixel (`fbq('set', 'autoConfig', false, id)`), para o pixel de uma loja não recolher sozinho o que não foi decidido enviar.

### 6. Consentimento

- A biblioteca tem `fbq('consent', 'revoke')` e `fbq('consent', 'grant')`. *Lido.* A decisão do épico é mais estrita e continua: sem aceite, o script da Meta nem é carregado.

### 7. Riscos que não consegui medir

- *Inferência:* se a Meta punir o domínio pelo comportamento de uma loja, todas as lojas sentem. Não encontrei relato nem regra escrita.
- Catálogo (X10): não investigado. O Gerenciador de Comércio pode pedir domínio verificado; fica para quando o X10 for priorizado.

## O que muda no recorte

| Ticket | Muda? | O quê |
|---|---|---|
| X2 · API guarda o ID | não | — |
| X3 · Tela no painel | pouco | o passo a passo diz que **não** é preciso verificar o domínio, e que os relatórios e a criação de anúncios ficam na Meta |
| X4 · Consentimento | sim | a escolha é **por loja** (cookie com `Path=/<slug>`); o texto de privacidade diz que o identificador da Meta no navegador é um só para o domínio |
| X5 · Eventos de navegação | sim | todo envio com `trackSingle` e o ID da loja; nunca `track`; coleta automática desligada; cuidado com a navegação de cliente entre lojas |
| X6 · Compra no navegador | sim | `event_id` derivado do pedido (por exemplo `purchase-<id do pedido>`), o mesmo que o X7 envia. **Decisão em aberto** abaixo |
| X7 · Compra pelo servidor | sim | o pedido grava, com consentimento, `user agent`, URL da página, `_fbp` e o `fbc` montado do `fbclid` desta loja; envio em até 7 dias do pagamento, um evento por requisição para um velho não derrubar os outros |
| X8 · Origem no pedido | ordem | a **captura** de `fbclid` e UTM por loja passa a ser pré-requisito do X7. O relatório por origem continua dependendo do Épico P |
| X9, X10 | não | continuam "só se houver demanda" |

Ordem proposta: X2 → X3 → X4 → X5 → X6 → **X8 (só a captura)** → X7 → X8 (relatório).

## Decisão em aberto, do Rafael

**Pedido com pagamento combinado fora da plataforma conta como `Purchase`?**

Hoje a maioria das lojas não cobra pelo site. Se `Purchase` só existir com pagamento confirmado pelo Asaas, o pixel dessas lojas nunca vê uma compra e as campanhas delas não têm o que otimizar.

Recomendação: **contar o pedido fechado como `Purchase`**, no navegador, na hora em que o pedido é feito, para loja que combina o pagamento; e contar o pagamento confirmado para loja que cobra no site. É o que o lojista entende por venda em cada caso. O custo é contar como compra um pedido que depois é cancelado.

## Fora de escopo

- Domínio próprio por loja.
- Qualquer código: nada foi instalado nem testado com um pixel de verdade.

## Fontes

- Meta, "ClickID and the fbp and fbc Parameters": https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc
- Meta, "Server Event Parameters": https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
- Meta, "Customer Information Parameters": https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
- Meta, "Handling Duplicate Pixel and Conversions API Events": https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events
- Meta, "General Data Protection Regulation" (API de consentimento do pixel): https://developers.facebook.com/docs/meta-pixel/implementation/gdpr
- Adviso, sobre a mudança de 15/05/2023: https://www.adviso.ca/en/blog/evolution-aggregated-measurement-meta
- DEPT, idem: https://www.dept.global/en-dk/insight/metas-removal-of-aggregated-event-measurement-aem-and-its-implications-for-advertisers/
- Jentis, vários pixels na mesma página: https://docs.jentis.com/data-activation/connectors/meta/meta-pixel-best-practices-and-troubleshooting-for-multi-pixel-implementation
