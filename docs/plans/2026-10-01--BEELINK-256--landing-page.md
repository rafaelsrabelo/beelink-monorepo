# BEELINK-256 — Landing page da Beelink na rota inicial

> **Tier:** plans. Vale para um momento e um ticket: envelhece por construção e só recebe acréscimos.
>
> Desenho: canvas "bee-link — fluxos de criação, modo design e variações", artboard "10 · Landing
> Beelink v2 — marca nova, banners e cadastro de entregador". Sai da `main`.

## Definição de Pronto

1. `/` mostra a landing v2: topo, hero com o hub, carrossel de três banners, ecossistema em
   hexágonos, três passos, seção Para entregadores, perguntas, chamada final e rodapé.
2. A página funciona no celular. O desenho é só de computador (1440 px).
3. "Entrar" leva ao login. "Criar minha loja" e "Começar agora" levam ao cadastro.
4. O formulário de entregador valida os campos e não envia nada.
5. As cores da marca são tokens do design system. Nenhuma cor escrita num componente.
6. Todo texto está nos dicionários, em pt-BR e en.
7. Cada bloco tem história no Storybook e teste com axe. `pnpm ci-check` verde.

## Decisões do Rafael (01/10)

- **Versão:** a v2.
- **Entregadores:** a seção fica só no visual. O formulário tem as validações e não envia nada. O app
  do entregador é o Épico R.
- **Ticket:** este, BEELINK-256.

## Decisões

### 1. O login continua em `/login`

O Rafael perguntou qual é melhor: `/login` ou `/auth/login`. Fica `/login`.

- Os e-mails de confirmação e de nova senha já enviados apontam para `/verify-email` e
  `/reset-password`. Mudar o endereço exige redirecionar os antigos para sempre.
- Mover para `/auth/*` mexe no proxy, nos e-mails da API, no retorno do Google e nos testes, e não
  muda nada para quem usa.
- A raiz deixa de redirecionar para o painel e vira a landing. "Entrar" aponta para `/login`, e o
  proxy leva quem já está conectado direto ao painel, como hoje.

Se mais adiante fizer sentido juntar as telas de conta em `/auth/*`, é um ticket próprio.

### 2. A marca nova entra como tokens

Creme, amarelo e preto viram tokens `brand-*` em `packages/ui/src/styles/globals.css`, o único
arquivo onde uma cor pode ser escrita. Os blocos usam as classes (`bg-brand-yellow`,
`text-brand-ink`). A fonte do desenho, Plus Jakarta Sans, é carregada só pela landing: o painel
continua em Geist.

### 3. Os blocos ficam em `packages/ui/src/blocks/landing`

Um bloco por seção, cada um com os textos vindos do dicionário (`messages.landing`). O `apps/web`
só monta a página e entrega os endereços.

### 4. Celular

- **Hub do hero e hexágonos:** no computador, as posições do desenho. Em telas menores, os mesmos
  cinco itens viram uma grade de cards. É um DOM só, sem conteúdo duplicado.
- **Banners:** rolagem nativa de lado, com encaixe. As setas e os pontos são um acréscimo: a fileira
  rola com o dedo, o trackpad e o teclado antes de qualquer script carregar (a mesma razão do
  `scroll-rail.tsx` da vitrine).
- **Menu do topo:** os links de seção somem abaixo de `lg`. "Entrar" e "Criar minha loja" ficam.

### 5. O formulário de entregador

Campos: nome completo, WhatsApp, cidade, como entrega (moto, bicicleta, carro, a pé) e o aceite dos
termos. Valida ao enviar, com `react-hook-form` e `zod`, como os outros formulários. Com tudo certo,
mostra uma frase dizendo que o cadastro ainda não está aberto e que nada foi enviado. Nenhuma
requisição sai.

### 6. O que o desenho deixa em aberto

O desenho marca itens entre colchetes como "a confirmar", e alguns links não têm destino. Uma página
pública não pode mostrar colchetes nem link que não leva a lugar nenhum. O que fiz com cada um:

| No desenho | Na página |
|---|---|
| Rodapé: "© 2026 Beelink · [razão social e CNPJ]" | "© ano Beelink". A razão social entra quando o Rafael passar. |
| Formulário: "Requisitos da sua categoria: [confirmar…]" | Fora. |
| Benefício "Ganhos à vista … [regra de repasse]" | A frase sem o colchete. |
| Perguntas de entregador com resposta "[Confirmar…]" (3) | A pergunta fica; a resposta diz que o cadastro ainda não abriu e que a regra será publicada. |
| Pergunta "Posso usar meus próprios entregadores?" ("[Confirmar]…") | Resposta com o que o produto faz hoje: entrega própria ou transportadora. |
| Aceite: "termos para entregadores" | "termos de uso", com link para `/termos`. Não existem termos de entregador. |
| Rodapé: "Termos do entregador", "Central de ajuda", "Fale com a gente" | Fora: não têm página nem canal definido. |
| Rodapé, coluna Soluções (links `#`) | Apontam para a seção do ecossistema. |
| "Ver uma loja de exemplo" | Só aparece quando `EXAMPLE_STORE_SLUG` está configurada. |
| Logo "redesenhado à mão: trocar pelo SVG oficial" | O do desenho, num componente só (`BeelinkMark`), para trocar num lugar. |
| Números "01, 02, 03" em amarelo sobre o card branco | Em preto, com o ponto amarelo dos títulos. Amarelo sobre branco dá contraste de 1,6:1. |

### 7. O que a página promete e o produto ainda não tem

A v2 fala de "Checkout", "eMarketing", "Envios" e de "chamar um entregador Beelink" (passo 3 e banner
Beelink Envios). O Rafael escolheu a v2 sabendo que o app do entregador não existe. Os textos ficam
como no desenho, e o PR lista essas frases para ele decidir antes de publicar.

## Fora de escopo

- Mover as telas de conta para `/auth/*` (decisão 1).
- Guardar o interesse do entregador (tabela e rota na API).
- Sitemap, robots e imagem de compartilhamento: são do Épico V (BEELINK-246, BEELINK-250).
- A landing v1 e a seção de preços dela.
