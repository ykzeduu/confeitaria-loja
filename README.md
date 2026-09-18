# 🍰 Doce Encanto — Loja de Confeitaria

Loja online completa: catálogo, contas de cliente permanentes, carrinho,
checkout **simulado** (Pix, boleto e cartão fictícios — nenhum pagamento real)
e um painel administrativo completo (dashboard, produtos, clientes, cupons,
financeiro).

## Stack

- Node.js + Express (backend / API)
- PostgreSQL — pensado para o [Neon](https://neon.tech) (free tier)
- Sessão de login via cookie (express-session + connect-pg-simple), armazenada no próprio Postgres
- HTML/CSS/JS puro no frontend (SPA de página única, sem build step)
- Deploy pensado para o [Render](https://render.com) (free tier)

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` com a connection string do seu banco.
3. `npm run seed` (cria as tabelas e produtos de exemplo, se o banco estiver vazio)
4. `npm start`
5. Acesse http://localhost:3000 (loja) e http://localhost:3000/admin.html (painel admin)

**Login padrão do admin:** usuário `admin`, senha `doceencanto123` — troque em
Configurações assim que entrar.

## ⚠️ Se você já tinha o banco antigo (v1) rodando no Neon

O projeto ganhou contas de cliente, cupons e painel admin, o que mudou a
estrutura do banco. Rode o arquivo **`migration_v2.sql`** uma vez no
**SQL Editor do Neon** (cole o conteúdo do arquivo e clique em Run). Ele:
- cria as tabelas novas (`admins`, `customers`, `coupons`)
- adiciona as colunas novas em `products` e `orders`
- preserva os produtos que você já tinha
- cria o usuário admin padrão (`admin` / `doceencanto123`)

Se está começando do zero, pode rodar só `npm run seed` (local, apontando pro
Neon) que ele já cria tudo certo.

## Deploy no Render + Neon

### 1. Banco de dados no Neon
Crie um projeto em [neon.tech](https://neon.tech) e copie a **connection string**
em Connection Details.

### 2. Deploy no Render
1. New + → Web Service → conecte o repositório.
2. Build Command: `npm install` — Start Command: `npm start` — Plan: Free.
3. Em Environment Variables, adicione:
   - `DATABASE_URL` = connection string do Neon
   - `SESSION_SECRET` = qualquer texto aleatório (protege as sessões de login)
   - `NODE_ENV` = `production`
4. Deploy.

### 3. Popular o banco
Rode `npm run seed` uma vez local (apontando `DATABASE_URL` pro Neon) — ou,
se já tinha um banco v1, rode `migration_v2.sql` no SQL Editor do Neon.

> O plano free do Render "dorme" após inatividade e demora alguns segundos
> para acordar no primeiro acesso — normal do tier gratuito.

## Estrutura do projeto

```
├── server.js                 # entrada da aplicação Express + sessão
├── middleware/auth.js         # middlewares requireCustomer / requireAdmin
├── routes/
│   ├── auth.js                 # cadastro/login/perfil/pedidos do cliente
│   ├── admin.js                 # login admin, dashboard, clientes, reset
│   ├── products.js               # catálogo público + CRUD admin (com upload de imagem)
│   ├── orders.js                  # criação/consulta de pedidos
│   └── coupons.js                  # cupons (validação pública + CRUD admin)
├── db/
│   ├── pool.js                      # conexão Postgres
│   ├── schema.sql                    # schema completo (usado pelo seed)
│   └── seed.js                        # cria tabelas + produtos + admin padrão
├── migration_v2.sql                    # migração para bancos v1 já existentes
└── public/
    ├── index.html                       # loja (SPA: início, produtos, conta)
    ├── admin.html                        # painel administrativo
    ├── css/ , js/
```

## Funcionalidades

**Loja (site público, uma única página com scroll):**
- Catálogo com filtro por categoria, imagens (upload ou link) ou emoji
- Conta permanente do cliente (nome, e-mail, senha, CPF, CEP, endereço, telefone) — login fica salvo por 30 dias via cookie
- Carrinho com animação/toast ao adicionar item
- Cupom de desconto no checkout
- Checkout e confirmação em modal (nunca sai da página), com Pix/boleto/cartão **fictícios**
- Histórico de pedidos do cliente

**Painel admin (`/admin.html`):**
- Dashboard: faturamento, pedidos, estoque baixo, clientes, mais vendidos
- Produtos: criar/editar/excluir, imagem por link ou upload (upload fica salvo no banco de dados, funciona mesmo no disco temporário do Render), controle de estoque, ativar/desativar
- Clientes: lista com dados de contato, total gasto e nº de pedidos
- Cupons: criar, ativar/desativar, excluir
- Financeiro: faturamento, ticket médio, lista de todos os pedidos
- Configurações: trocar senha do admin, e um botão de **reset do banco** (zona de perigo, apaga pedidos/clientes/cupons — só para testes)

Nenhuma integração real de pagamento é feita — tudo no checkout é simulado.
