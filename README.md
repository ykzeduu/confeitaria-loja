# 🍰 Doce Encanto — Loja de Confeitaria (demonstração)

Site de vendas fictício de uma confeitaria: catálogo de produtos, carrinho de
compras e checkout **simulado** (Pix, boleto e cartão são todos fictícios —
nenhum pagamento real é processado).

## Stack

- Node.js + Express (backend / API)
- PostgreSQL (banco de dados) — pensado para rodar no [Neon](https://neon.tech) (free tier)
- HTML/CSS/JS puro no frontend (sem build step)
- Deploy pensado para o [Render](https://render.com) (free tier)

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e preencha com a connection string do seu banco Neon:
   ```bash
   cp .env.example .env
   ```

3. Popule o banco com os produtos de exemplo (cria as tabelas automaticamente):
   ```bash
   npm run seed
   ```

4. Suba o servidor:
   ```bash
   npm start
   ```

5. Acesse http://localhost:3000

## Deploy no Render + Neon (passo a passo)

### 1. Banco de dados no Neon
1. Crie um projeto no [neon.tech](https://neon.tech) (se ainda não tiver).
2. Vá em **Connection Details** e copie a **connection string** (formato
   `postgresql://usuario:senha@ep-xxxx.neon.tech/neondb?sslmode=require`).

### 2. Deploy no Render
1. Crie uma conta em [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New +** → **Web Service**.
3. Selecione o repositório `confeitaria-loja`.
4. Configurações:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Em **Environment Variables**, adicione:
   - `DATABASE_URL` = a connection string do Neon (do passo anterior)
6. Clique em **Create Web Service**. O Render vai instalar e subir o app.

### 3. Popular o banco em produção
Depois do primeiro deploy, rode o seed uma vez apontando para o banco do Neon
(pode ser da sua máquina local, usando o mesmo `DATABASE_URL` do Render no seu `.env`):
```bash
npm run seed
```

Pronto — o site estará no ar na URL que o Render fornecer (algo como
`https://doce-encanto.onrender.com`), com o catálogo carregado do banco Neon.

> **Nota sobre o plano free do Render:** o serviço "dorme" após um período de
> inatividade e demora alguns segundos para "acordar" no primeiro acesso —
> normal para o tier gratuito.

## Estrutura do projeto

```
├── server.js              # entrada da aplicação Express
├── routes/
│   ├── products.js         # GET /api/products
│   └── orders.js           # POST /api/orders, GET /api/orders/:id
├── db/
│   ├── pool.js              # conexão com PostgreSQL
│   ├── schema.sql            # criação das tabelas
│   └── seed.js                # popula produtos de exemplo
└── public/                # frontend estático
    ├── index.html           # catálogo
    ├── checkout.html         # finalizar pedido
    ├── confirmacao.html       # confirmação + pagamento fictício
    └── js/, css/
```

## Sobre o checkout fictício

Este projeto é uma demonstração. No checkout, ao escolher:
- **Pix** → gera um "QR code" e código Pix fictícios
- **Boleto** → gera um código de barras e data de vencimento fictícios
- **Cartão** → permite escolher entre 3 cartões de teste fictícios e gera um código de autorização fictício

Nenhuma integração real de pagamento é feita — é puramente visual/simulado.
