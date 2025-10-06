const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const { pool, initializeDatabase } = require('./db');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const DEFAULT_ORDER_STATUS = 'Новый';
const ORDER_STATUSES = new Set(['Новый', 'Принят', 'Отправлен', 'Отменён']);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base || 'image'}-${unique}${ext}`);
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '..')));

function buildImagePath(filename) {
  return `/uploads/${filename}`;
}

function resolveUploadPath(imagePath) {
  if (!imagePath) {
    return null;
  }
  const fileName = path.basename(imagePath);
  return path.join(UPLOADS_DIR, fileName);
}

async function removeFile(imagePath) {
  const absolutePath = resolveUploadPath(imagePath);
  if (!absolutePath) {
    return;
  }
  try {
    await fsPromises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Не удалось удалить файл', absolutePath, error.message);
    }
  }
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    image: row.image_url || ''
  };
}

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price) || 0,
    categoryId: row.category_id || null,
    category: row.category_name || '',
    image: row.image_url || ''
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    name: row.customer_name,
    phone: row.phone,
    address: row.address,
    items: Array.isArray(row.items) ? row.items : row.items ? row.items : [],
    totalPrice: Number(row.total_price) || 0,
    status: row.status || DEFAULT_ORDER_STATUS,
    createdAt: row.created_at
  };
}

async function syncProductSequence(client) {
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('products', 'id'),
      COALESCE((SELECT MAX(id) FROM products), 0)
    )
  `);
}

app.get('/categories', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, image_url FROM categories ORDER BY name ASC');
    res.json(result.rows.map(mapCategoryRow));
  } catch (error) {
    next(error);
  }
});

app.post('/categories', upload.single('image'), async (req, res, next) => {
  const { name } = req.body;
  const file = req.file;
  if (!name || !name.trim()) {
    if (file) {
      await removeFile(buildImagePath(file.filename));
    }
    return res.status(400).json({ error: 'Название категории обязательно' });
  }
  if (!file) {
    return res.status(400).json({ error: 'Изображение категории обязательно' });
  }
  const imageUrl = buildImagePath(file.filename);
  try {
    const result = await pool.query(
      'INSERT INTO categories (name, image_url) VALUES ($1, $2) RETURNING id, name, image_url',
      [name.trim(), imageUrl]
    );
    res.status(201).json(mapCategoryRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put('/categories/:id', upload.single('image'), async (req, res, next) => {
  const categoryId = Number(req.params.id);
  if (!Number.isInteger(categoryId)) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Некорректный идентификатор категории' });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Название категории обязательно' });
  }

  try {
    const existing = await pool.query('SELECT image_url FROM categories WHERE id = $1', [categoryId]);
    if (existing.rowCount === 0) {
      if (req.file) {
        await removeFile(buildImagePath(req.file.filename));
      }
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    const imageUrl = req.file ? buildImagePath(req.file.filename) : existing.rows[0].image_url;

    const result = await pool.query(
      'UPDATE categories SET name = $1, image_url = $2 WHERE id = $3 RETURNING id, name, image_url',
      [name.trim(), imageUrl, categoryId]
    );

    if (req.file && existing.rows[0].image_url && existing.rows[0].image_url !== imageUrl) {
      await removeFile(existing.rows[0].image_url);
    }

    res.json(mapCategoryRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete('/categories/:id', async (req, res, next) => {
  const categoryId = Number(req.params.id);
  if (!Number.isInteger(categoryId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор категории' });
  }
  try {
    const existing = await pool.query('SELECT image_url FROM categories WHERE id = $1', [categoryId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    await pool.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    await removeFile(existing.rows[0].image_url);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/products', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.description, p.price, p.category_id, p.image_url, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name ASC
    `);
    res.json(result.rows.map(mapProductRow));
  } catch (error) {
    next(error);
  }
});

app.post('/products', upload.single('image'), async (req, res, next) => {
  const { productId, name, description = '', price, categoryId } = req.body;
  const file = req.file;
  const trimmedName = name ? name.trim() : '';

  if (!trimmedName) {
    if (file) {
      await removeFile(buildImagePath(file.filename));
    }
    return res.status(400).json({ error: 'Название товара обязательно' });
  }

  const priceValue = Number(price);
  if (!Number.isFinite(priceValue)) {
    if (file) {
      await removeFile(buildImagePath(file.filename));
    }
    return res.status(400).json({ error: 'Цена товара должна быть числом' });
  }

  if (!file) {
    return res.status(400).json({ error: 'Изображение товара обязательно' });
  }

  const categoryValue = categoryId ? Number(categoryId) : null;
  if (categoryId && !Number.isInteger(categoryValue)) {
    await removeFile(buildImagePath(file.filename));
    return res.status(400).json({ error: 'Некорректный идентификатор категории' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let insertQuery;
    let params;

    if (productId) {
      const parsedId = Number(productId);
      if (!Number.isInteger(parsedId)) {
        await client.query('ROLLBACK');
        await removeFile(buildImagePath(file.filename));
        return res.status(400).json({ error: 'ID товара должен быть числом' });
      }
      insertQuery = `
        INSERT INTO products (id, name, description, price, category_id, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      params = [parsedId, trimmedName, description, priceValue, categoryValue, buildImagePath(file.filename)];
    } else {
      insertQuery = `
        INSERT INTO products (name, description, price, category_id, image_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      params = [trimmedName, description, priceValue, categoryValue, buildImagePath(file.filename)];
    }

    const inserted = await client.query(insertQuery, params);
    const newId = inserted.rows[0].id;
    await syncProductSequence(client);
    await client.query('COMMIT');

    const product = await pool.query(`
      SELECT p.id, p.name, p.description, p.price, p.category_id, p.image_url, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [newId]);

    res.status(201).json(mapProductRow(product.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    await removeFile(buildImagePath(file.filename));
    next(error);
  } finally {
    client.release();
  }
});

app.put('/products/:id', upload.single('image'), async (req, res, next) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId)) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Некорректный идентификатор товара' });
  }

  const { name, description = '', price, categoryId } = req.body;
  const trimmedName = name ? name.trim() : '';

  if (!trimmedName) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Название товара обязательно' });
  }

  const priceValue = Number(price);
  if (!Number.isFinite(priceValue)) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Цена товара должна быть числом' });
  }

  const categoryValue = categoryId ? Number(categoryId) : null;
  if (categoryId && !Number.isInteger(categoryValue)) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    return res.status(400).json({ error: 'Некорректный идентификатор категории' });
  }

  try {
    const existing = await pool.query('SELECT image_url FROM products WHERE id = $1', [productId]);
    if (existing.rowCount === 0) {
      if (req.file) {
        await removeFile(buildImagePath(req.file.filename));
      }
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const nextImageUrl = req.file ? buildImagePath(req.file.filename) : existing.rows[0].image_url;

    await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, category_id = $4, image_url = $5 WHERE id = $6',
      [trimmedName, description, priceValue, categoryValue, nextImageUrl, productId]
    );

    if (req.file && existing.rows[0].image_url && existing.rows[0].image_url !== nextImageUrl) {
      await removeFile(existing.rows[0].image_url);
    }

    const product = await pool.query(`
      SELECT p.id, p.name, p.description, p.price, p.category_id, p.image_url, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [productId]);

    res.json(mapProductRow(product.rows[0]));
  } catch (error) {
    if (req.file) {
      await removeFile(buildImagePath(req.file.filename));
    }
    next(error);
  }
});

app.delete('/products/:id', async (req, res, next) => {
  const productId = Number(req.params.id);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор товара' });
  }
  try {
    const existing = await pool.query('SELECT image_url FROM products WHERE id = $1', [productId]);
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    await removeFile(existing.rows[0].image_url);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/orders', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, customer_name, phone, address, items, total_price, status, created_at FROM orders ORDER BY created_at DESC'
    );
    res.json(result.rows.map(mapOrderRow));
  } catch (error) {
    next(error);
  }
});

app.post('/orders', async (req, res, next) => {
  const { name, phone, address, items, totalPrice } = req.body;

  if (!name || !name.toString().trim()) {
    return res.status(400).json({ error: 'Имя обязательно' });
  }
  if (!phone || !phone.toString().trim()) {
    return res.status(400).json({ error: 'Телефон обязателен' });
  }
  if (!address || !address.toString().trim()) {
    return res.status(400).json({ error: 'Адрес обязателен' });
  }

  const orderItems = Array.isArray(items) ? items : [];
  const total = Number(totalPrice) || 0;

  try {
    const result = await pool.query(
      `INSERT INTO orders (customer_name, phone, address, items, total_price, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, customer_name, phone, address, items, total_price, status, created_at`,
      [name.toString().trim(), phone.toString().trim(), address.toString().trim(), orderItems, total, DEFAULT_ORDER_STATUS]
    );
    res.status(201).json(mapOrderRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put('/orders/:id', async (req, res, next) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор заказа' });
  }

  const { status } = req.body;
  const nextStatus = typeof status === 'string' ? status.trim() : '';
  if (!ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ error: 'Недопустимый статус заказа' });
  }

  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, customer_name, phone, address, items, total_price, status, created_at`,
      [nextStatus, orderId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    res.json(mapOrderRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete('/orders/:id', async (req, res, next) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Некорректный идентификатор заказа' });
  }
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Не удалось инициализировать базу данных', error);
    process.exit(1);
  });
