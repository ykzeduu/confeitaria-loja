const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./pool');

const products = [
  { name: 'Bolo de Chocolate com Ninho', description: 'Massa fofinha de chocolate, recheio de creme de ninho e cobertura de ganache.', price: 8500, category: 'Bolos', emoji: '🍫', stock: 15 },
  { name: 'Bolo Red Velvet', description: 'Clássico bolo aveludado vermelho com cream cheese.', price: 9500, category: 'Bolos', emoji: '❤️', stock: 10 },
  { name: 'Bolo de Cenoura com Brigadeiro', description: 'O queridinho de todo brasileiro, com cobertura generosa de brigadeiro.', price: 6500, category: 'Bolos', emoji: '🥕', stock: 12 },
  { name: 'Torta de Limão', description: 'Base crocante, recheio cremoso de limão e merengue maçaricado.', price: 7500, category: 'Tortas', emoji: '🍋', stock: 8 },
  { name: 'Torta Holandesa', description: 'Camadas de chocolate, biscoito e creme, geladinha e cremosa.', price: 8000, category: 'Tortas', emoji: '🍪', stock: 8 },
  { name: 'Brigadeiro Gourmet (unidade)', description: 'Feito com chocolate belga, disponível em vários sabores.', price: 450, category: 'Doces', emoji: '🍬', stock: 100 },
  { name: 'Brownie Recheado', description: 'Brownie denso e úmido com recheio de doce de leite.', price: 900, category: 'Doces', emoji: '🍫', stock: 40 },
  { name: 'Cupcake Red Velvet', description: 'Mini bolo fofinho com cobertura de cream cheese.', price: 1200, category: 'Doces', emoji: '🧁', stock: 30 },
  { name: 'Macaron Sortido (caixa c/ 6)', description: 'Seleção de sabores: pistache, framboesa, chocolate, baunilha.', price: 3500, category: 'Doces', emoji: '🌈', stock: 20 },
  { name: 'Torta Salgada de Frango', description: 'Perfeita para festas, massa amanteigada e recheio cremoso.', price: 7000, category: 'Salgados', emoji: '🍗', stock: 6 },
  { name: 'Kit Festa Mini Doces (30 un)', description: 'Sortimento de mini doces para eventos e comemorações.', price: 12000, category: 'Kits', emoji: '🎉', stock: 5 },
  { name: 'Bolo no Pote', description: 'Praticidade e sabor: bolo em camadas dentro de um potinho individual.', price: 1800, category: 'Doces', emoji: '🍮', stock: 25 },
];

const DEFAULT_ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'doceencanto123';

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows: productCount } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (productCount[0].count === 0) {
    for (const p of products) {
      await pool.query(
        `INSERT INTO products (name, description, price_cents, category, image_emoji, stock_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.name, p.description, p.price, p.category, p.emoji, p.stock]
      );
    }
    console.log(`✔ ${products.length} produtos inseridos.`);
  } else {
    console.log(`- Produtos já existentes (${productCount[0].count}), pulando.`);
  }

  const { rows: adminCount } = await pool.query('SELECT COUNT(*)::int AS count FROM admins');
  if (adminCount[0].count === 0) {
    const hash = await bcrypt.hash(DEFAULT_ADMIN_PASS, 10);
    await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [DEFAULT_ADMIN_USER, hash]);
    console.log(`✔ Admin criado — usuário: "${DEFAULT_ADMIN_USER}" senha: "${DEFAULT_ADMIN_PASS}" (troque depois de logar!)`);
  } else {
    console.log('- Admin já existente, pulando.');
  }

  console.log('Seed concluído.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao rodar seed:', err);
  process.exit(1);
});
