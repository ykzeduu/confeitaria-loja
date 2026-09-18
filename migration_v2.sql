-- Migração v2: adiciona contas de cliente, admin, cupons e campos novos em produtos/pedidos.
-- Seguro rodar mesmo que você já tenha dados (produtos existentes são preservados).

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  cpf VARCHAR(20),
  cep VARCHAR(12),
  address TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) UNIQUE NOT NULL,
  discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',
  discount_value INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Novas colunas em products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_mime VARCHAR(60);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

-- Dá um estoque inicial razoável para produtos que ainda estão com 0 (recém-migrados)
UPDATE products SET stock_quantity = 20 WHERE stock_quantity = 0;

-- Novas colunas em orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(40);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0;

-- Cria o usuário admin padrão (usuário: admin / senha: doceencanto123 — troque depois de logar!)
INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2a$10$hGocBAQKLCxj7q/7ZB77tussT.B4ZNS7vU6mNIQhfYqv0sXpFPzcy')
ON CONFLICT (username) DO NOTHING;
