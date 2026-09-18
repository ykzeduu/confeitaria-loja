require('dotenv').config();
const express = require('express');
const path = require('path');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Doce Encanto rodando em http://localhost:${PORT}`);
});
