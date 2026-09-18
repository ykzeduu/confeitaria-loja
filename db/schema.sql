-- Schema da loja Doce Encanto

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  category VARCHAR(60) NOT NULL,
  image_emoji VARCHAR(10) DEFAULT '🍰',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(160) NOT NULL,
  customer_address TEXT NOT NULL,
  payment_method VARCHAR(20) NOT NULL, -- pix | boleto | cartao
  payment_detail VARCHAR(120),         -- ex: qual cartão fictício escolhido
  total_cents INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pago (simulado)',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(120) NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);
