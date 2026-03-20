const { pool } = require('../config/database');

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOptionalText = (value) => {
  const trimmed = String(value || '').trim();
  return trimmed.length ? trimmed : null;
};

const moneyStringToCents = (value) => {
  const str = String(value ?? '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error(`Invalid money value: ${str}`);
  }

  const [whole, fraction = ''] = str.split('.');
  const paddedFraction = (fraction + '00').slice(0, 2);

  return Number.parseInt(whole, 10) * 100 + Number.parseInt(paddedFraction, 10);
};

const centsToMoneyString = (cents) => {
  const safe = Number.isInteger(cents) ? cents : 0;
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
};

const buildCartItemResponse = (row) => {
  const subtotal =
    row.price != null
      ? centsToMoneyString(moneyStringToCents(row.price) * Number(row.quantity))
      : null;

  return {
    cart_id: row.cart_id,
    variant_id: row.variant_id,
    quantity: row.quantity,
    size: row.size || null,
    stock_quantity: row.stock_quantity,
    product_id: row.product_id,
    name: row.name,
    sku: row.sku || null,
    price: row.price != null ? String(row.price) : null,
    subtotal,
    primary_image: row.primary_image || null,
    updated_at: row.updated_at
  };
};

const fetchCartItem = async (client, userId, variantId) => {
  const result = await client.query(
    `SELECT
       c.cart_id,
       c.variant_id,
       c.quantity,
       c.updated_at,
       pv.size,
       pv.stock_quantity,
       p.product_id,
       p.name,
       p.sku,
       p.price,
       (
         SELECT pi.image_url
         FROM product_image pi
         WHERE pi.product_id = p.product_id
           AND pi.is_primary = true
         LIMIT 1
       ) AS primary_image
     FROM cart c
     JOIN product_variant pv ON pv.variant_id = c.variant_id
     JOIN product p ON p.product_id = pv.product_id
     WHERE c.user_id = $1
       AND c.variant_id = $2
       AND p.is_active = true`,
    [userId, variantId]
  );

  return result.rows[0] || null;
};

// Resolve a cart target to a concrete variant.
// Rules:
// - variant_id always works if valid
// - product_id without size only works for unsized products
//   (single NULL-size/default variant and no sized variants)
// - product_id with size resolves that exact variant
const resolveVariantForCart = async (client, { variant_id, product_id, size }) => {
  const parsedVariantId = parsePositiveInt(variant_id);
  const parsedProductId = parsePositiveInt(product_id);
  const normalizedSize = normalizeOptionalText(size);

  if (parsedVariantId) {
    const result = await client.query(
      `SELECT
         pv.variant_id,
         pv.product_id,
         pv.size,
         pv.stock_quantity,
         p.name,
         p.sku,
         p.price
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1
         AND p.is_active = true
       FOR UPDATE OF pv`,
      [parsedVariantId]
    );

    if (result.rows.length === 0) {
      return {
        ok: false,
        status: 404,
        error: 'Product variant not found'
      };
    }

    return { ok: true, variant: result.rows[0] };
  }

  if (!parsedProductId) {
    return {
      ok: false,
      status: 400,
      error: 'variant_id or product_id is required'
    };
  }

  const variantsResult = await client.query(
    `SELECT
       pv.variant_id,
       pv.product_id,
       pv.size,
       pv.stock_quantity,
       p.name,
       p.sku,
       p.price
     FROM product_variant pv
     JOIN product p ON p.product_id = pv.product_id
     WHERE pv.product_id = $1
       AND p.is_active = true
     ORDER BY
       CASE WHEN pv.size IS NULL THEN 0 ELSE 1 END,
       pv.variant_id
     FOR UPDATE OF pv`,
    [parsedProductId]
  );

  if (variantsResult.rows.length === 0) {
    return {
      ok: false,
      status: 404,
      error: 'Product variant not found'
    };
  }

  const variants = variantsResult.rows;
  const sizedVariants = variants.filter((v) => v.size !== null);
  const nullVariant = variants.find((v) => v.size === null) || null;

  if (normalizedSize !== null) {
    const lowered = normalizedSize.toLowerCase();

    const matched = variants.find(
      (v) => String(v.size || '').trim().toLowerCase() === lowered
    );

    if (!matched) {
      return {
        ok: false,
        status: 404,
        error: 'Requested variant not found for this product'
      };
    }

    return { ok: true, variant: matched };
  }

  if (sizedVariants.length === 0 && nullVariant) {
    return { ok: true, variant: nullVariant };
  }

  return {
    ok: false,
    status: 400,
    error: 'This product has multiple variants. Please select a size before adding to cart.'
  };
};

// GET /api/cart
// Authenticated. Returns all cart items with full product details.
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         c.cart_id,
         c.variant_id,
         c.quantity,
         c.updated_at,
         pv.size,
         pv.stock_quantity,
         p.product_id,
         p.name,
         p.sku,
         p.price,
         (
           SELECT pi.image_url
           FROM product_image pi
           WHERE pi.product_id = p.product_id
             AND pi.is_primary = true
           LIMIT 1
         ) AS primary_image
       FROM cart c
       JOIN product_variant pv ON pv.variant_id = c.variant_id
       JOIN product p ON p.product_id = pv.product_id
       WHERE c.user_id = $1
         AND p.is_active = true
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const items = result.rows.map(buildCartItemResponse);

    const totalCents = result.rows.reduce((sum, row) => {
      return sum + (moneyStringToCents(row.price) * Number(row.quantity));
    }, 0);

    const total_items = result.rows.reduce((sum, row) => sum + Number(row.quantity), 0);

    return res.status(200).json({
      items,
      total_items,
      total_amount: centsToMoneyString(totalCents)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

// POST /api/cart
// Authenticated. Adds a variant to cart or increments quantity if already exists.
// Supports:
// - { variant_id, quantity? }
// - { product_id, size?, quantity? } for convenience
//   (product_id without size works only for unsized products)
const addToCart = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const requestedQuantity = Math.max(1, Number.parseInt(req.body?.quantity, 10) || 1);

    client = await pool.connect();
    await client.query('BEGIN');

    const resolved = await resolveVariantForCart(client, {
      variant_id: req.body?.variant_id,
      product_id: req.body?.product_id,
      size: req.body?.size
    });

    if (!resolved.ok) {
      await client.query('ROLLBACK');
      return res.status(resolved.status).json({ error: resolved.error });
    }

    const variant = resolved.variant;

    if (Number(variant.stock_quantity) === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'This item is out of stock. Add it to your wishlist to be notified when it is back.'
      });
    }

    const existing = await client.query(
      `SELECT cart_id, quantity
       FROM cart
       WHERE user_id = $1
         AND variant_id = $2
       FOR UPDATE`,
      [userId, variant.variant_id]
    );

    if (existing.rows.length > 0) {
      const currentQuantity = Number(existing.rows[0].quantity);
      const newQuantity = currentQuantity + requestedQuantity;

      if (newQuantity > Number(variant.stock_quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Only ${variant.stock_quantity} units available. You already have ${currentQuantity} in your cart.`
        });
      }

      await client.query(
        `UPDATE cart
         SET quantity = $1,
             updated_at = NOW()
         WHERE user_id = $2
           AND variant_id = $3`,
        [newQuantity, userId, variant.variant_id]
      );
    } else {
      if (requestedQuantity > Number(variant.stock_quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Only ${variant.stock_quantity} units available.`
        });
      }

      await client.query(
        `INSERT INTO cart (user_id, variant_id, quantity)
         VALUES ($1, $2, $3)`,
        [userId, variant.variant_id, requestedQuantity]
      );
    }

    const fullItem = await fetchCartItem(client, userId, variant.variant_id);

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Item added to cart',
      item: fullItem ? buildCartItemResponse(fullItem) : null
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Add to cart error:', error);
    return res.status(500).json({ error: 'Failed to add item to cart' });
  } finally {
    if (client) client.release();
  }
};

// PATCH /api/cart/:variantId
// Authenticated. Updates quantity of a specific variant.
// quantity = 0 removes the item.
const updateCartItem = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const variant_id = parsePositiveInt(req.params.variantId);
    const quantity = Number.parseInt(req.body?.quantity, 10);

    if (!variant_id) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    if (Number.isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be 0 or more' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT cart_id
       FROM cart
       WHERE user_id = $1
         AND variant_id = $2
       FOR UPDATE`,
      [userId, variant_id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not in cart' });
    }

    if (quantity === 0) {
      await client.query(
        `DELETE FROM cart
         WHERE user_id = $1
           AND variant_id = $2`,
        [userId, variant_id]
      );

      await client.query('COMMIT');
      return res.status(200).json({ message: 'Item removed from cart' });
    }

    const variantResult = await client.query(
      `SELECT pv.stock_quantity
       FROM product_variant pv
       JOIN product p ON p.product_id = pv.product_id
       WHERE pv.variant_id = $1
         AND p.is_active = true
       FOR UPDATE OF pv`,
      [variant_id]
    );

    if (variantResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product variant not found' });
    }

    const availableStock = Number(variantResult.rows[0].stock_quantity);

    if (availableStock < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Only ${availableStock} units available.`
      });
    }

    await client.query(
      `UPDATE cart
       SET quantity = $1,
           updated_at = NOW()
       WHERE user_id = $2
         AND variant_id = $3`,
      [quantity, userId, variant_id]
    );

    const fullItem = await fetchCartItem(client, userId, variant_id);

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Cart updated',
      item: fullItem ? buildCartItemResponse(fullItem) : null
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Update cart error:', error);
    return res.status(500).json({ error: 'Failed to update cart' });
  } finally {
    if (client) client.release();
  }
};

// DELETE /api/cart/:variantId
// Authenticated. Removes a specific variant from cart.
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const variant_id = parsePositiveInt(req.params.variantId);

    if (!variant_id) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const result = await pool.query(
      `DELETE FROM cart
       WHERE user_id = $1
         AND variant_id = $2
       RETURNING cart_id`,
      [userId, variant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not in cart' });
    }

    return res.status(200).json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    return res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

// DELETE /api/cart
// Authenticated. Clears entire cart.
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `DELETE FROM cart
       WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      message: 'Cart cleared',
      deleted_count: result.rowCount
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
};

// POST /api/cart/sync
// Authenticated. Merges guest localStorage cart into server cart on login.
// items: [{ variant_id, quantity }] or [{ product_id, size?, quantity }]
// - invalid or unavailable items are skipped
// - quantities are capped at current stock
// - unsized products can be resolved from product_id alone
const syncCart = async (req, res) => {
  let client;

  try {
    const userId = req.user.userId;
    const items = req.body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const synced = [];
    const skipped = [];

    for (const item of items) {
      const quantity = Math.max(1, Number.parseInt(item?.quantity, 10) || 1);

      const resolved = await resolveVariantForCart(client, {
        variant_id: item?.variant_id,
        product_id: item?.product_id,
        size: item?.size
      });

      if (!resolved.ok) {
        skipped.push({
          item,
          reason: resolved.error
        });
        continue;
      }

      const variant = resolved.variant;
      const stock = Number(variant.stock_quantity || 0);

      if (stock < 1) {
        skipped.push({
          variant_id: variant.variant_id,
          reason: 'Out of stock'
        });
        continue;
      }

      const existing = await client.query(
        `SELECT cart_id, quantity
         FROM cart
         WHERE user_id = $1
           AND variant_id = $2
         FOR UPDATE`,
        [userId, variant.variant_id]
      );

      if (existing.rows.length > 0) {
        const mergedQuantity = Math.min(
          Number(existing.rows[0].quantity) + quantity,
          stock
        );

        await client.query(
          `UPDATE cart
           SET quantity = $1,
               updated_at = NOW()
           WHERE user_id = $2
             AND variant_id = $3`,
          [mergedQuantity, userId, variant.variant_id]
        );
      } else {
        const safeQuantity = Math.min(quantity, stock);

        await client.query(
          `INSERT INTO cart (user_id, variant_id, quantity)
           VALUES ($1, $2, $3)`,
          [userId, variant.variant_id, safeQuantity]
        );
      }

      synced.push(variant.variant_id);
    }

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Cart synced successfully',
      synced_count: synced.length,
      skipped_count: skipped.length,
      skipped
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
      client = null;
    }
    console.error('Sync cart error:', error);
    return res.status(500).json({ error: 'Failed to sync cart' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  syncCart
};