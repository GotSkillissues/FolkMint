/**
 * FolkMint — Full Seed Script
 * Run: node seed.js
 *
 * What this seeds:
 *  - 1 admin user
 *  - 4 customer users
 *  - Full category tree (roots + leaf categories)
 *  - 20 products across all categories (sized + unsized, active + draft)
 *  - Product images for every product
 *  - Sized variants for clothing products, unsized for others
 *  - Addresses + payment methods for every customer
 *  - Orders in every status (pending, confirmed, processing, shipped, delivered, cancelled)
 *  - Reviews on delivered products (tests can-review + top-rated)
 *  - Wishlist entries (tests back-in-stock notification)
 *  - Cart items for one user (tests cart sync on login)
 *  - System notifications (tests sent log)
 *  - Order notifications for every order status change
 */

'use strict';

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'folkmint',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'hqhq',
});

const SALT_ROUNDS = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

const hash = (pw) => bcrypt.hash(pw, SALT_ROUNDS);

async function q(client, sql, params = []) {
  const res = await client.query(sql, params);
  return res.rows;
}

async function ensureCategory(client, { name, description, parentCategory = null, sortOrder = 0 }) {
  const existing = parentCategory == null
    ? await q(
      client,
      `SELECT category_id
       FROM category
       WHERE name = $1
         AND parent_category IS NULL
       LIMIT 1`,
      [name]
    )
    : await q(
      client,
      `SELECT category_id
       FROM category
       WHERE name = $1
         AND parent_category = $2
       LIMIT 1`,
      [name, parentCategory]
    );

  if (existing.length > 0) {
    await q(
      client,
      `UPDATE category
       SET description = $1,
           sort_order = $2
       WHERE category_id = $3`,
      [description, sortOrder, existing[0].category_id]
    );

    return { category_id: existing[0].category_id };
  }

  const [created] = await q(
    client,
    `INSERT INTO category (name, description, parent_category, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING category_id`,
    [name, description, parentCategory, sortOrder]
  );

  return created;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 Starting FolkMint seed…\n');

    // ── 1. USERS ────────────────────────────────────────────────────────────

    console.log('👤 Creating users…');

    const adminHash    = await hash('FolkMintAdmin_1');
    const customerHash = await hash('Customer@1234');

    const [admin] = await q(client,
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, 'Admin', 'FolkMint', 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
       RETURNING user_id`,
      ['admin.folkmint@gmail.com', adminHash]
    );

    const customers = [];
    const customerData = [
      { email: 'ayesha@example.com',  first: 'Ayesha',  last: 'Rahman'  },
      { email: 'tanvir@example.com',  first: 'Tanvir',  last: 'Ahmed'   },
      { email: 'priya@example.com',   first: 'Priya',   last: 'Das'     },
      { email: 'karim@example.com',   first: 'Karim',   last: 'Hossain' },
      
    ];

    for (const cd of customerData) {
      const [u] = await q(client,
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, 'customer')
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING user_id`,
        [cd.email, customerHash, cd.first, cd.last]
      );
      customers.push({ ...u, ...cd });
    }

    console.log(`   ✓ admin@folkmint.com (password: Admin@1234)`);
    console.log(`   ✓ ${customerData.map(c => c.email).join(', ')}`);
    console.log(`   ✓ All customer passwords: Customer@1234\n`);

    // ── 2. CATEGORIES ───────────────────────────────────────────────────────

    console.log('📂 Creating categories…');

    // Root categories
    const roots = {};
    let rootSort = 0;
    for (const [key, name, desc] of [
      ['men',         'Men',                     'Traditional and contemporary clothing for men'],
      ['women',       'Women',                   'Handcrafted garments and accessories for women'],
      ['homedecor',   'Home Décor / Showpieces', 'Artisan-crafted home décor and showpieces'],
      ['handicrafts', 'Handicrafts',             'Authentic Bangladeshi handicrafts and crafts'],
      ['bags',        'Bags & Accessories',      'Handmade bags, jewellery and accessories'],
      ['giftcards',   'Gift Cards',              'Digital gift cards for any occasion'],
    ]) {
      const cat = await ensureCategory(client, {
        name,
        description: desc,
        parentCategory: null,
        sortOrder: rootSort++,
      });
      roots[key] = cat.category_id;
    }

    // Child categories
    const leaves = {};
    let childSort = 0;
    const childData = [
      // Men
      ['panjabi',       'Panjabi',        roots.men,         'Handcrafted Panjabi for men'],
      ['sherwani',      'Sherwani',       roots.men,         'Traditional Sherwani for formal occasions'],
      ['lungi',         'Lungi & Dhoti',  roots.men,         'Classic lungis and dhotis'],
      // Women
      ['saree',         'Saree',          roots.women,       'Jamdani, silk and cotton sarees'],
      ['salwarkameez',  'Salwar Kameez',  roots.women,       'Handmade salwar kameez sets'],
      ['jewellery',     'Jewellery',      roots.women,       'Traditional Bangladeshi jewellery'],
      // Home Décor
      ['terracotta',    'Terracotta',     roots.homedecor,   'Terracotta figurines and pottery'],
      ['nakshikantha',  'Nakshi Kantha',  roots.homedecor,   'Embroidered Nakshi Kantha art'],
      ['bamboo',        'Bamboo & Cane',  roots.homedecor,   'Bamboo and cane crafts'],
      // Handicrafts
      ['pottery',       'Pottery',        roots.handicrafts, 'Hand-thrown pottery and ceramics'],
      ['jute',          'Jute Craft',     roots.handicrafts, 'Eco-friendly jute products'],
      // Bags
      ['jutebags',      'Jute Bags',      roots.bags,        'Handwoven jute bags and totes'],
      ['clutches',      'Clutches',       roots.bags,        'Handmade clutch bags'],
    ];

    for (const [key, name, parentId, desc] of childData) {
      const cat = await ensureCategory(client, {
        name,
        description: desc,
        parentCategory: parentId,
        sortOrder: childSort++,
      });
      leaves[key] = cat.category_id;
    }

    console.log(`   ✓ ${Object.keys(roots).length} root categories`);
    console.log(`   ✓ ${Object.keys(leaves).length} leaf categories\n`);

    // ── 3. PRODUCTS ─────────────────────────────────────────────────────────

    console.log('🛍️  Creating products…');

    // Products: [name, description, price, category_key, is_active, sizes_or_null]
    // sizes_or_null: array of {size, stock} for sized products, or {stock} for unsized
    const productDefs = [
      // Sized clothing
      ['Jamdani Saree — Ivory & Gold',     'Hand-woven Jamdani saree from Narayanganj with gold floral motifs. UNESCO heritage craft.',                                      '4500.00', 'saree',        true,  null, [{stock:5},{stock:8},{stock:3}]],
      ['Dhakai Muslin Saree',              'Ultra-fine Dhakai Muslin saree, almost translucent. Passed through a ring.',                                                    '8500.00', 'saree',        true,  null, [{stock:2},{stock:4},{stock:1}]],
      ['Cotton Block Print Saree',         'Vegetable dye block-printed cotton saree from Rajshahi. Cool, comfortable, vibrant.',                                           '1800.00', 'saree',        true,  null, [{stock:10},{stock:12},{stock:6}]],
      ['Embroidered Panjabi — White',      'Fine cotton Panjabi with hand-embroidered collar and cuffs. Perfect for Eid.',                                                  '1200.00', 'panjabi',      true,  ['S','M','L','XL','XXL'], null],
      ['Silk Panjabi — Navy',              'Blended silk Panjabi in deep navy with subtle woven stripe.',                                                                   '2200.00', 'panjabi',      true,  ['S','M','L','XL'], null],
      ['Festive Panjabi — Off-White Katan','Katan silk Panjabi for weddings and festivals. Subtle zari border.',                                                            '3500.00', 'panjabi',      true,  ['M','L','XL'], null],
      ['Silk Sherwani — Charcoal',         'Full-length charcoal silk sherwani with gold embroidery. Traditional wedding wear.',                                            '12000.00','sherwani',     true,  ['S','M','L','XL'], null],
      ['Khadi Salwar Kameez — Powder Blue','Hand-spun khadi cotton salwar kameez. Breathable and elegant.',                                                                 '2400.00', 'salwarkameez', true,  ['S','M','L','XL'], null],
      ['Block Print Salwar Kameez — Rust', 'Block-printed cotton salwar kameez. Bold geometric motifs.',                                                                   '1600.00', 'salwarkameez', true,  ['S','M','L'], null],
      ['Muslin Lungi — Classic White',     'Fine muslin lungi with traditional red border. Lightweight and durable.',                                                       '800.00',  'lungi',        true,  null, [{stock:20}]],
      // Unsized home + handicrafts
      ['Terracotta Horse — Large',         'Hand-sculpted terracotta horse from Rajshahi. Traditional Pala-period style. Approx 28cm tall.',                               '950.00',  'terracotta',   true,  null, [{stock:7}]],
      ['Nakshi Kantha — Red & Black',      'Large hand-embroidered Nakshi Kantha quilt. Each stitch tells a story. Measures 120x180cm.',                                   '5500.00', 'nakshikantha', true,  null, [{stock:3}]],
      ['Bamboo Wall Basket — Set of 3',    'Hand-woven bamboo wall baskets from Chittagong. Sustainable and decorative.',                                                   '1400.00', 'bamboo',       true,  null, [{stock:15}]],
      ['Pottery Tea Set — Earthy Brown',   'Hand-thrown pottery tea set: teapot + 4 cups. Glazed in earthy brown.',                                                        '2200.00', 'pottery',      true,  null, [{stock:5}]],
      ['Jute Placemats — Set of 6',        'Hand-woven natural jute placemats. Eco-friendly and heat-resistant.',                                                           '650.00',  'jute',         true,  null, [{stock:25}]],
      ['Jute Tote Bag — Natural',          'Large hand-woven jute tote. Strong, eco-friendly. 40x35cm with cotton lining.',                                                '750.00',  'jutebags',     true,  null, [{stock:18}]],
      ['Brass Bangle Set — Traditional',   'Set of 6 hand-crafted brass bangles with intricate engraving. One size fits most.',                                            '480.00',  'jewellery',    true,  null, [{stock:30}]],
      ['Embroidered Clutch — Crimson',     'Hand-embroidered silk clutch in crimson with gold thread. 20x12cm.',                                                           '1100.00', 'clutches',     true,  null, [{stock:8}]],
      // Out of stock product (tests wishlist prompt)
      ['Katan Silk Saree — Deep Red',      'Premium Katan silk saree in deep red with gold zari border. Wedding special.',                                                  '9500.00', 'saree',        true,  null, [{stock:0}]],
      // Draft product (tests admin draft visibility)
      ['Muslin Panjabi — Unreleased',      'Premium muslin Panjabi currently in quality review. Not yet released.',                                                         '2800.00', 'panjabi',      false, ['S','M','L','XL'], null],
    ];

    const products = [];
    let productCounter = 0;

    for (const [name, desc, price, catKey, isActive, sizes, unsizedVariants] of productDefs) {
      productCounter++;
      const catId = leaves[catKey];

      // Insert product (trigger auto-creates NULL variant)
      const [prod] = await q(client,
        `INSERT INTO product (name, description, price, category_id, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING product_id`,
        [name, desc, price, catId, isActive]
      );

      // Set SKU
      await q(client,
        `UPDATE product SET sku = $1 WHERE product_id = $2`,
        [`FM-${String(prod.product_id).padStart(6, '0')}`, prod.product_id]
      );

      // Handle variants
      let variantIds = [];

      if (sizes) {
        // Sized product: delete the auto-created NULL variant, add sized variants
        await q(client,
          `DELETE FROM product_variant WHERE product_id = $1 AND size IS NULL`,
          [prod.product_id]
        );
        const stockPerSize = [8, 12, 10, 6, 4]; // stock values for S/M/L/XL/XXL
        for (let i = 0; i < sizes.length; i++) {
          const [v] = await q(client,
            `INSERT INTO product_variant (product_id, size, stock_quantity)
             VALUES ($1, $2, $3) RETURNING variant_id`,
            [prod.product_id, sizes[i], stockPerSize[i] || 5]
          );
          variantIds.push(v.variant_id);
        }
      } else if (unsizedVariants) {
        // Unsized: update the auto-created variant's stock
        const [v] = await q(client,
          `UPDATE product_variant SET stock_quantity = $1
           WHERE product_id = $2 AND size IS NULL
           RETURNING variant_id`,
          [unsizedVariants[0].stock, prod.product_id]
        );
        variantIds.push(v.variant_id);
      }

      // Add product image (placeholder Cloudinary-style URL)
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const [img] = await q(client,
        `INSERT INTO product_image (product_id, image_url, is_primary)
         VALUES ($1, $2, true) RETURNING image_id`,
        [prod.product_id, `https://res.cloudinary.com/folkmint/image/upload/v1/products/${slug}`]
      );

      // Second image for the first 10 products
      if (productCounter <= 10) {
        await q(client,
          `INSERT INTO product_image (product_id, image_url, is_primary)
           VALUES ($1, $2, false)`,
          [prod.product_id, `https://res.cloudinary.com/folkmint/image/upload/v1/products/${slug}-2`]
        );
      }

      products.push({
        product_id: prod.product_id,
        name,
        price: parseFloat(price),
        catKey,
        isActive,
        variantIds,
        isSized: !!sizes,
        isOutOfStock: unsizedVariants?.[0]?.stock === 0,
      });
    }

    console.log(`   ✓ ${products.filter(p => p.isActive).length} active products`);
    console.log(`   ✓ 1 draft product (Muslin Panjabi — Unreleased)`);
    console.log(`   ✓ 1 out-of-stock product (Katan Silk Saree — Deep Red)\n`);

    // ── 4. ADDRESSES & PAYMENT METHODS ──────────────────────────────────────

    console.log('📍 Creating addresses and payment methods…');

    const addressData = [
      { userId: customers[0].user_id, street: '12 Dhanmondi Road 7',   city: 'Dhaka',      postal: '1205' },
      { userId: customers[1].user_id, street: '45 Gulshan Avenue 2',   city: 'Dhaka',      postal: '1212' },
      { userId: customers[2].user_id, street: '8 Chittagong Hill Road', city: 'Chittagong', postal: '4000' },
      { userId: customers[3].user_id, street: '23 Sylhet Zindabazar',   city: 'Sylhet',     postal: '3100' },
    ];

    const addressIds = [];
    for (const a of addressData) {
      const [addr] = await q(client,
        `INSERT INTO address (user_id, street, city, postal_code, country, is_default)
         VALUES ($1, $2, $3, $4, 'Bangladesh', true)
         RETURNING address_id`,
        [a.userId, a.street, a.city, a.postal]
      );
      addressIds.push(addr.address_id);
    }

    // Payment methods
    const pmIds = [];
    const pmTypes = ['bkash', 'cod', 'visa', 'mastercard'];
    for (let i = 0; i < customers.length; i++) {
      const [pm] = await q(client,
        `INSERT INTO payment_method (user_id, type, is_default)
         VALUES ($1, $2, true) RETURNING payment_method_id`,
        [customers[i].user_id, pmTypes[i]]
      );
      pmIds.push(pm.payment_method_id);

      // Second payment method for first two customers
      if (i < 2) {
        await q(client,
          `INSERT INTO payment_method (user_id, type, is_default)
           VALUES ($1, 'cod', false)`,
          [customers[i].user_id]
        );
      }
    }

    console.log(`   ✓ 4 addresses (one per customer)\n`);

    // ── 5. ORDERS ───────────────────────────────────────────────────────────

    console.log('📦 Creating orders in all statuses…');

    // Helper to create a complete order
    async function createOrder(userId, addressId, pmId, items, status, createdDaysAgo = 0) {
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const createdAt = `NOW() - INTERVAL '${createdDaysAgo} days'`;

      const [order] = await q(client,
        `INSERT INTO orders (user_id, address_id, status, total_amount, created_at, updated_at)
         VALUES ($1, $2, $3, $4, ${createdAt}, ${createdAt})
         RETURNING order_id`,
        [userId, addressId, status, total.toFixed(2)]
      );

      for (const item of items) {
        await q(client,
          `INSERT INTO order_item (order_id, product_id, variant_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.order_id, item.product_id, item.variant_id, item.qty, item.price.toFixed(2)]
        );
      }

      // Payment record
      const paymentStatus = status === 'cancelled' ? 'refunded'
        : status === 'delivered'  ? 'completed'
        : 'pending';

      await q(client,
        `INSERT INTO payment (order_id, payment_method_id, amount, status)
         VALUES ($1, $2, $3, $4)`,
        [order.order_id, pmId, total.toFixed(2), paymentStatus]
      );

      return order.order_id;
    }

    const activeProducts = products.filter(p => p.isActive && !p.isOutOfStock);

    // Customer 0 (Ayesha) — delivered order (enables reviews + analytics)
    const ayeshaDelivered = await createOrder(
      customers[0].user_id, addressIds[0], pmIds[0],
      [
        { product_id: activeProducts[0].product_id, variant_id: activeProducts[0].variantIds[0], price: activeProducts[0].price, qty: 1 },
        { product_id: activeProducts[1].product_id, variant_id: activeProducts[1].variantIds[0], price: activeProducts[1].price, qty: 1 },
      ],
      'delivered', 30
    );

    // Customer 0 — second delivered order (different products)
    const ayeshaDelivered2 = await createOrder(
      customers[0].user_id, addressIds[0], pmIds[0],
      [
        { product_id: activeProducts[3].product_id, variant_id: activeProducts[3].variantIds[1], price: activeProducts[3].price, qty: 2 },
      ],
      'delivered', 20
    );

    // Customer 0 — shipped order
    await createOrder(
      customers[0].user_id, addressIds[0], pmIds[0],
      [
        { product_id: activeProducts[5].product_id, variant_id: activeProducts[5].variantIds[0], price: activeProducts[5].price, qty: 1 },
      ],
      'shipped', 5
    );

    // Customer 0 — pending order (tests cancellation)
    const ayeshaPending = await createOrder(
      customers[0].user_id, addressIds[0], pmIds[0],
      [
        { product_id: activeProducts[10].product_id, variant_id: activeProducts[10].variantIds[0], price: activeProducts[10].price, qty: 1 },
      ],
      'pending', 0
    );

    // Customer 1 (Tanvir) — delivered order
    const tanvirDelivered = await createOrder(
      customers[1].user_id, addressIds[1], pmIds[1],
      [
        { product_id: activeProducts[4].product_id, variant_id: activeProducts[4].variantIds[2], price: activeProducts[4].price, qty: 1 },
        { product_id: activeProducts[11].product_id, variant_id: activeProducts[11].variantIds[0], price: activeProducts[11].price, qty: 1 },
      ],
      'delivered', 25
    );

    // Customer 1 — confirmed order
    await createOrder(
      customers[1].user_id, addressIds[1], pmIds[1],
      [
        { product_id: activeProducts[12].product_id, variant_id: activeProducts[12].variantIds[0], price: activeProducts[12].price, qty: 2 },
      ],
      'confirmed', 3
    );

    // Customer 1 — cancelled order
    await createOrder(
      customers[1].user_id, addressIds[1], pmIds[1],
      [
        { product_id: activeProducts[2].product_id, variant_id: activeProducts[2].variantIds[1], price: activeProducts[2].price, qty: 1 },
      ],
      'cancelled', 10
    );

    // Customer 2 (Priya) — delivered order
    const priyaDelivered = await createOrder(
      customers[2].user_id, addressIds[2], pmIds[2],
      [
        { product_id: activeProducts[6].product_id, variant_id: activeProducts[6].variantIds[0], price: activeProducts[6].price, qty: 1 },
        { product_id: activeProducts[13].product_id, variant_id: activeProducts[13].variantIds[0], price: activeProducts[13].price, qty: 1 },
      ],
      'delivered', 15
    );

    // Customer 2 — processing order
    await createOrder(
      customers[2].user_id, addressIds[2], pmIds[2],
      [
        { product_id: activeProducts[7].product_id, variant_id: activeProducts[7].variantIds[0], price: activeProducts[7].price, qty: 1 },
      ],
      'processing', 2
    );

    // Customer 3 (Karim) — delivered order
    const karimDelivered = await createOrder(
      customers[3].user_id, addressIds[3], pmIds[3],
      [
        { product_id: activeProducts[14].product_id, variant_id: activeProducts[14].variantIds[0], price: activeProducts[14].price, qty: 3 },
        { product_id: activeProducts[15].product_id, variant_id: activeProducts[15].variantIds[0], price: activeProducts[15].price, qty: 1 },
      ],
      'delivered', 40
    );

    // Customer 3 — second delivered (populates analytics)
    await createOrder(
      customers[3].user_id, addressIds[3], pmIds[3],
      [
        { product_id: activeProducts[16].product_id, variant_id: activeProducts[16].variantIds[0], price: activeProducts[16].price, qty: 2 },
        { product_id: activeProducts[8].product_id,  variant_id: activeProducts[8].variantIds[1],  price: activeProducts[8].price,  qty: 1 },
      ],
      'delivered', 12
    );

    // Customer 3 — pending order
    await createOrder(
      customers[3].user_id, addressIds[3], pmIds[3],
      [
        { product_id: activeProducts[17].product_id, variant_id: activeProducts[17].variantIds[0], price: activeProducts[17].price, qty: 1 },
      ],
      'pending', 1
    );

    console.log(`   ✓ Orders: 4× delivered, 1× shipped, 1× confirmed, 1× processing, 2× pending, 1× cancelled\n`);

    // ── 6. REVIEWS ──────────────────────────────────────────────────────────

    console.log('⭐ Creating reviews…');

    // Only delivered orders qualify. We review specific products that were in those orders.
    const reviewData = [
      // Ayesha reviews products from her delivered orders
      { userId: customers[0].user_id, product_id: activeProducts[0].product_id, rating: 5, comment: 'Absolutely stunning saree. The Jamdani weaving is incredibly intricate. Worth every taka.' },
      { userId: customers[0].user_id, product_id: activeProducts[1].product_id, rating: 5, comment: 'The Muslin quality is unreal — so light and fine. Perfect for weddings.' },
      { userId: customers[0].user_id, product_id: activeProducts[3].product_id, rating: 4, comment: 'Beautiful Panjabi. The embroidery is clean and the cotton is breathable. Sizing runs slightly large.' },
      // Tanvir reviews
      { userId: customers[1].user_id, product_id: activeProducts[4].product_id, rating: 5, comment: 'Premium feel, rich colour. I wore this to a wedding and got so many compliments.' },
      { userId: customers[1].user_id, product_id: activeProducts[11].product_id, rating: 4, comment: 'Beautiful Nakshi Kantha. The stitching detail is extraordinary. A true piece of art.' },
      // Priya reviews
      { userId: customers[2].user_id, product_id: activeProducts[6].product_id, rating: 5, comment: 'This terracotta horse is gorgeous. Exactly as described. Great packaging too.' },
      { userId: customers[2].user_id, product_id: activeProducts[13].product_id, rating: 5, comment: 'The tea set is beautiful and functional. Hand-thrown quality is evident.' },
      // Karim reviews
      { userId: customers[3].user_id, product_id: activeProducts[14].product_id, rating: 4, comment: 'Good quality jute placemats. Very eco-friendly. Colour is slightly different from photo but still lovely.' },
      { userId: customers[3].user_id, product_id: activeProducts[15].product_id, rating: 5, comment: 'Sturdy, well-made tote bag. Perfect size for daily use. Will definitely buy again.' },
      { userId: customers[3].user_id, product_id: activeProducts[16].product_id, rating: 5, comment: 'These bangles are exquisite. The engraving is very detailed. Great gift item.' },
      { userId: customers[3].user_id, product_id: activeProducts[8].product_id,  rating: 4, comment: 'Nice salwar kameez. The block print is vibrant and the fabric is comfortable.' },
    ];

    for (const r of reviewData) {
      await q(client,
        `INSERT INTO review (user_id, product_id, rating, comment)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, product_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment`,
        [r.userId, r.product_id, r.rating, r.comment]
      );
    }

    console.log(`   ✓ ${reviewData.length} reviews (all from verified buyers)\n`);

    // ── 7. WISHLIST ─────────────────────────────────────────────────────────

    console.log('❤️  Creating wishlist entries…');

    // Out-of-stock product for all customers (tests back-in-stock notification)
    const oosProduct = products.find(p => p.isOutOfStock);
    const oosVariantId = oosProduct.variantIds[0];

    for (const customer of customers) {
      await q(client,
        `INSERT INTO wishlist (user_id, variant_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, variant_id) DO NOTHING`,
        [customer.user_id, oosVariantId]
      );
    }

    // Ayesha also wishlists some in-stock products
    for (const prod of activeProducts.slice(5, 9)) {
      const vid = prod.variantIds[0];
      await q(client,
        `INSERT INTO wishlist (user_id, variant_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, variant_id) DO NOTHING`,
        [customers[0].user_id, vid]
      );
    }

    console.log(`   ✓ All 4 customers wishlisted out-of-stock Katan Silk Saree`);
    console.log(`   ✓ Ayesha has 5 additional wishlist items\n`);

    // ── 8. CART ─────────────────────────────────────────────────────────────

    console.log('🛒 Creating cart items…');

    // Tanvir has items in cart (tests cart persistence + sync)
    const cartItems = [
      { variantId: activeProducts[9].variantIds[0],  qty: 1 },
      { variantId: activeProducts[10].variantIds[0], qty: 2 },
    ];

    for (const ci of cartItems) {
      await q(client,
        `INSERT INTO cart (user_id, variant_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
        [customers[1].user_id, ci.variantId, ci.qty]
      );
    }

    console.log(`   ✓ Tanvir has 2 items in cart (tests cart sync on login)\n`);

    // ── 9. NOTIFICATIONS ────────────────────────────────────────────────────

    console.log('🔔 Creating notifications…');

    // Order notifications for all customers
    const orderNotifData = [
      // Ayesha — delivered order notifications
      { userId: customers[0].user_id, type: 'order_placed',     title: 'Order placed',     message: `Your order #${ayeshaDelivered} has been placed. We'll confirm it shortly.`,         orderId: ayeshaDelivered },
      { userId: customers[0].user_id, type: 'order_confirmed',  title: 'Order confirmed',  message: `Your order #${ayeshaDelivered} has been confirmed and is being prepared.`,          orderId: ayeshaDelivered },
      { userId: customers[0].user_id, type: 'order_shipped',    title: 'Order shipped',    message: `Your order #${ayeshaDelivered} is on its way. Estimated delivery: 2-3 days.`,       orderId: ayeshaDelivered },
      { userId: customers[0].user_id, type: 'order_delivered',  title: 'Order delivered',  message: `Your order #${ayeshaDelivered} has been delivered. We hope you love it!`,           orderId: ayeshaDelivered },
      // Ayesha — pending order notification
      { userId: customers[0].user_id, type: 'order_placed',     title: 'Order placed',     message: `Your order #${ayeshaPending} has been placed. We'll confirm it shortly.`,           orderId: ayeshaPending },
      // Tanvir — delivered order
      { userId: customers[1].user_id, type: 'order_placed',     title: 'Order placed',     message: `Your order #${tanvirDelivered} has been placed.`,                                   orderId: tanvirDelivered },
      { userId: customers[1].user_id, type: 'order_delivered',  title: 'Order delivered',  message: `Your order #${tanvirDelivered} has been delivered. Enjoy your purchase!`,           orderId: tanvirDelivered },
      // Priya — delivered order
      { userId: customers[2].user_id, type: 'order_placed',     title: 'Order placed',     message: `Your order #${priyaDelivered} has been placed.`,                                   orderId: priyaDelivered },
      { userId: customers[2].user_id, type: 'order_delivered',  title: 'Order delivered',  message: `Your order #${priyaDelivered} has been delivered. Thank you for shopping!`,        orderId: priyaDelivered },
      // Karim — delivered
      { userId: customers[3].user_id, type: 'order_delivered',  title: 'Order delivered',  message: `Your order #${karimDelivered} has been delivered. We hope you love it!`,           orderId: karimDelivered },
    ];

    for (const n of orderNotifData) {
      await q(client,
        `INSERT INTO notification (user_id, type, title, message, related_id, related_type, is_read)
         VALUES ($1, $2, $3, $4, $5, 'order', $6)`,
        [n.userId, n.type, n.title, n.message, n.orderId, Math.random() > 0.4]
      );
    }

    // System broadcast notifications (tests sent log)
    const broadcasts = [
      { title: 'Eid Collection Launched 🎉',  message: 'Our special Eid collection is now live. Shop limited-edition Jamdani sarees, embroidered Panjabis, and more. Free shipping on orders above ৳999.' },
      { title: 'New Artisan Partners',         message: 'We have partnered with 12 new artisan families from Sylhet and Rajshahi. Discover their unique handmade pottery, bamboo crafts, and textiles.' },
      { title: 'App Update: Wishlist Alerts',  message: 'You can now add out-of-stock items to your wishlist and get notified the moment they are back. Never miss a piece you love.' },
    ];

    for (const broadcast of broadcasts) {
      // Insert for all customers
      for (const customer of customers) {
        await q(client,
          `INSERT INTO notification (user_id, type, title, message, is_read)
           VALUES ($1, 'system', $2, $3, false)`,
          [customer.user_id, broadcast.title, broadcast.message]
        );
      }
    }

    // Admin gets a notification too
    await q(client,
      `INSERT INTO notification (user_id, type, title, message, is_read)
       VALUES ($1, 'system', 'Welcome to FolkMint Admin', 'Your admin account is ready. Use this panel to manage products, orders, users, and analytics.', false)`,
      [admin.user_id]
    );

    console.log(`   ✓ ${orderNotifData.length} order notifications`);
    console.log(`   ✓ ${broadcasts.length} system broadcasts (${broadcasts.length * customers.length} total rows)\n`);

    // ── COMMIT ──────────────────────────────────────────────────────────────

    await client.query('COMMIT');

    console.log('━'.repeat(60));
    console.log('✅ Seed complete!\n');
    console.log('📋 Login credentials:');
    console.log('   Admin:    admin@folkmint.com     / Admin@1234');
    console.log('   Customer: ayesha@example.com     / Customer@1234  (5 orders, 11 wishlist, reviews)');
    console.log('   Customer: tanvir@example.com     / Customer@1234  (3 orders, cart items)');
    console.log('   Customer: priya@example.com      / Customer@1234  (2 orders)');
    console.log('   Customer: karim@example.com      / Customer@1234  (3 orders, reviews)');
    console.log('\n📊 Data summary:');
    console.log(`   Products:      ${productDefs.length} (${productDefs.filter(p => p[4]).length} active, 1 draft, 1 out-of-stock)`);
    console.log(`   Categories:    ${Object.keys(roots).length} roots + ${Object.keys(leaves).length} leaves`);
    console.log(`   Orders:        11 across all statuses`);
    console.log(`   Reviews:       ${reviewData.length} (from verified buyers)`);
    console.log(`   Broadcasts:    ${broadcasts.length} system notifications in sent log`);
    console.log('━'.repeat(60));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed — transaction rolled back.');
    console.error(err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();