const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = [
  {
    "name": "Rickshaw Painted Ceramic Flower Vase",
    "desc": "Rickshaw Painted Ceramic Flower Vase",
    "price": 660.47,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0922010002768_2.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Green Flower Design Ceramic Flower Vase (Big)",
    "desc": "Green Flower Design Ceramic Flower Vase (Big)",
    "price": 1500.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003898.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Light Grey Flower Design Ceramic Flower Vase (Big)",
    "desc": "Light Grey Flower Design Ceramic Flower Vase (Big)",
    "price": 1500.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003900.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Grey Printed Ceramic Flower Vase",
    "desc": "Grey Printed Ceramic Flower Vase",
    "price": 1300.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003707.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Beige Ceramic Flower Vase",
    "desc": "Beige Ceramic Flower Vase",
    "price": 1172.09,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004185.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "White Ceramic Flower Vase",
    "desc": "White Ceramic Flower Vase",
    "price": 1172.09,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004184.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Slate-Blue Bottle Shape Ceramic Flower Vase",
    "desc": "Slate-Blue Bottle Shape Ceramic Flower Vase",
    "price": 1400.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003904.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Grey Bottle Shape Ceramic Flower Vase (Big)",
    "desc": "Grey Bottle Shape Ceramic Flower Vase (Big)",
    "price": 1600.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003907.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Slate-Blue Jaar Shape Ceramic Flower Vase",
    "desc": "Slate-Blue Jaar Shape Ceramic Flower Vase",
    "price": 1400.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003902.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Grey Jaar Shape Ceramic Flower Vase",
    "desc": "Grey Jaar Shape Ceramic Flower Vase",
    "price": 1400.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003905.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Sand-Beige Ceramic Flower Vase - Medium",
    "desc": "Sand-Beige Ceramic Flower Vase - Medium",
    "price": 1302.33,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004258.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Sand-Beige Ceramic Flower Vase - Big",
    "desc": "Sand-Beige Ceramic Flower Vase - Big",
    "price": 1767.44,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004257.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Black Ceramic Flower Vase - Medium",
    "desc": "Black Ceramic Flower Vase - Medium",
    "price": 1576.74,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004252.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Black Ceramic Flower Vase - Small",
    "desc": "Black Ceramic Flower Vase - Small",
    "price": 976.74,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004253.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Black Ceramic Flower Vase",
    "desc": "Black Ceramic Flower Vase",
    "price": 1306.98,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004186.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  },
  {
    "name": "Blue-Grey Clay Flower Vase",
    "desc": "Blue-Grey Clay Flower Vase",
    "price": 445.00,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/1/1/1152010000668_1.jpg?optimize=high&bg-color=255,255,255&fit=bounds&height=&width="
  }
];

async function seedVasesPots() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Vases & Pots...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 40 for Vases & Pots
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 40, $4, true) RETURNING product_id',
            [p.name, p.desc, p.price, `FM-VP-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, p.imageUrl]
        );
        
        // Add variant for stock (Universal size)
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 20)',
            [productId, 'Standard']
        );
        
        console.log(`Added ${p.name}`);
    }

    console.log('Vases & Pots seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedVasesPots();
