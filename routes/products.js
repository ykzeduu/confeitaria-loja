const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const PUBLIC_FIELDS = `id, name, description, price_cents, category, image_emoji, image_url,
  (image_data IS NOT NULL) AS has_uploaded_image, stock_quantity, active`;

// GET /api/products - lista produtos ativos (loja)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM products WHERE active = TRUE ORDER BY category, name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
});

// GET /api/products/:id/image - serve a imagem enviada por upload (armazenada no banco)
router.get('/:id/image', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT image_data, image_mime FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0 || !rows[0].image_data) return res.status(404).end();
    res.set('Content-Type', rows[0].image_mime || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// ---------- Rotas administrativas ----------

// GET /api/products/admin/all - lista TODOS os produtos (inclusive inativos), para o painel admin
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM products ORDER BY category, name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
});

// POST /api/products - cria produto (admin)
router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, description, priceCents, category, imageEmoji, imageUrl, stockQuantity } = req.body;
  if (!name || !priceCents || !category) {
    return res.status(400).json({ error: 'Nome, preço e categoria são obrigatórios.' });
  }
  try {
    const imageData = req.file ? req.file.buffer : null;
    const imageMime = req.file ? req.file.mimetype : null;
    const { rows } = await pool.query(
      `INSERT INTO products (name, description, price_cents, category, image_emoji, image_url, image_data, image_mime, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${PUBLIC_FIELDS}`,
      [
        name,
        description || null,
        parseInt(priceCents, 10),
        category,
        imageEmoji || '🍰',
        imageUrl || null,
        imageData,
        imageMime,
        parseInt(stockQuantity, 10) || 0,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar produto.' });
  }
});

// PUT /api/products/:id - edita produto (admin)
router.put('/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, description, priceCents, category, imageEmoji, imageUrl, stockQuantity, active } = req.body;
  try {
    const fields = [];
    const values = [];
    let idx = 1;

    function set(field, value) {
      fields.push(`${field} = $${idx++}`);
      values.push(value);
    }

    if (name !== undefined) set('name', name);
    if (description !== undefined) set('description', description);
    if (priceCents !== undefined) set('price_cents', parseInt(priceCents, 10));
    if (category !== undefined) set('category', category);
    if (imageEmoji !== undefined) set('image_emoji', imageEmoji);
    if (imageUrl !== undefined) set('image_url', imageUrl || null);
    if (stockQuantity !== undefined) set('stock_quantity', parseInt(stockQuantity, 10));
    if (active !== undefined) set('active', active === 'true' || active === true);
    if (req.file) {
      set('image_data', req.file.buffer);
      set('image_mime', req.file.mimetype);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nada para atualizar.' });

    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${PUBLIC_FIELDS}`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
});

// DELETE /api/products/:id - remove produto (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover produto.' });
  }
});

module.exports = router;
