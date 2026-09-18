const fs = require('fs');
const path = require('path');
const pool = require('./pool');

const products = [
  { name: 'Bolo de Chocolate com Ninho', description: 'Massa fofinha de chocolate, recheio de creme de ninho e cobertura de ganache.', price: 8500, category: 'Bolos', emoji: '🍫' },
  { name: 'Bolo Red Velvet', description: 'Clássico bolo aveludado vermelho com cream cheese.', price: 9500, category: 'Bolos', emoji: '❤️' },
  { name: 'Bolo de Cenoura com Brigadeiro', description: 'O queridinho de todo brasileiro, com cobertura generosa de brigadeiro.', price: 6500, category: 'Bolos', emoji: '🥕' },
  { name: 'Torta de Limão', description: 'Base crocante, recheio cremoso de limão e merengue maçaricado.', price: 7500, category: 'Tortas', emoji: '🍋' },
  { name: 'Torta Holandesa', description: 'Camadas de chocolate, biscoito e creme, geladinha e cremosa.', price: 8000, category: 'Tortas', emoji: '🍪' },
  { name: 'Brigadeiro Gourmet (unidade)', description: 'Feito com chocolate belga, disponível em vários sabores.', price: 450, category: 'Doces', emoji: '🍬' },
  { name: 'Brownie Recheado', description: 'Brownie denso e úmido com recheio de doce de leite.', price: 900, category: 'Doces', emoji: '🍫' },
  { name: 'Cupcake Red Velvet', description: 'Mini bolo fofinho com cobertura de cream cheese.', price: 1200, category: 'Doces', emoji: '🧁' },
  { name: 'Macaron Sortido (caixa c/ 6)', description: 'Seleção de sabores: pistache, framboesa, chocolate, baunilha.', price: 3500, category: 'Doces', emoji: '🌈' },
  { name: 'Torta Salgada de Frango', description: 'Perfeita para festas, massa amanteigada e recheio cremoso.', price: 7000, category: 'Salgados', emoji: '🍗' },
  { name: 'Kit Festa Mini Doces (30 un)', description: 'Sortimento de mini doces para eventos e comemorações.', price: 12000, category: 'Kits', emoji: '🎉' },
  { name: 'Bolo no Pote', description: 'Praticidade e sabor: bolo em camadas dentro de um potinho individual.', price: 1800, category: 'Doces', emoji: '🍮' },
];

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products');
  if (rows[0].count > 0) {
    console.log(`Já existem ${rows[0].count} produtos cadastrados. Seed não é necessário.`);
    process.exit(0);
  }

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (name, description, price_cents, category, image_emoji)
       VALUES ($1, $2, $3, $4, $5)`,
      [p.name, p.description, p.price, p.category, p.emoji]
    );
  }

  console.log(`Seed concluído: ${products.length} produtos inseridos.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao rodar seed:', err);
  process.exit(1);
});
