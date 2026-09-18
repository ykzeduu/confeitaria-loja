-- 1. Criar as tabelas
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
  payment_method VARCHAR(20) NOT NULL,
  payment_detail VARCHAR(120),
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

-- 2. Inserir os produtos de exemplo
INSERT INTO products (name, description, price_cents, category, image_emoji) VALUES
('Bolo de Chocolate com Ninho', 'Massa fofinha de chocolate, recheio de creme de ninho e cobertura de ganache.', 8500, 'Bolos', '🍫'),
('Bolo Red Velvet', 'Clássico bolo aveludado vermelho com cream cheese.', 9500, 'Bolos', '❤️'),
('Bolo de Cenoura com Brigadeiro', 'O queridinho de todo brasileiro, com cobertura generosa de brigadeiro.', 6500, 'Bolos', '🥕'),
('Torta de Limão', 'Base crocante, recheio cremoso de limão e merengue maçaricado.', 7500, 'Tortas', '🍋'),
('Torta Holandesa', 'Camadas de chocolate, biscoito e creme, geladinha e cremosa.', 8000, 'Tortas', '🍪'),
('Brigadeiro Gourmet (unidade)', 'Feito com chocolate belga, disponível em vários sabores.', 450, 'Doces', '🍬'),
('Brownie Recheado', 'Brownie denso e úmido com recheio de doce de leite.', 900, 'Doces', '🍫'),
('Cupcake Red Velvet', 'Mini bolo fofinho com cobertura de cream cheese.', 1200, 'Doces', '🧁'),
('Macaron Sortido (caixa c/ 6)', 'Seleção de sabores: pistache, framboesa, chocolate, baunilha.', 3500, 'Doces', '🌈'),
('Torta Salgada de Frango', 'Perfeita para festas, massa amanteigada e recheio cremoso.', 7000, 'Salgados', '🍗'),
('Kit Festa Mini Doces (30 un)', 'Sortimento de mini doces para eventos e comemorações.', 12000, 'Kits', '🎉'),
('Bolo no Pote', 'Praticidade e sabor: bolo em camadas dentro de um potinho individual.', 1800, 'Doces', '🍮');
