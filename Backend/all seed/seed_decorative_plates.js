const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = [
  {
    "name": "Mustard Olive Ceramic Oval Platter - 36 cm",
    "price": 1139.53,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004299.jpg",
    "description": "Mustard Olive Ceramic Oval Platter - 36 cm"
  },
  {
    "name": "Grey Mini Oval Trey",
    "price": 66.67,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004297.jpg",
    "description": "Grey Mini Oval Trey"
  },
  {
    "name": "Blue Ceramic Rice Tray- 31x20 cm",
    "price": 638.10,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004298.jpg",
    "description": "Blue Ceramic Rice Tray- 31x20 cm"
  },
  {
    "name": "Blue Ceramic Rice Tray- 36x23.5 cm",
    "price": 933.33,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003829.jpg",
    "description": "Blue Ceramic Rice Tray- 36x23.5 cm"
  },
  {
    "name": "Blue Shiuli Design Half Plate - 22.5 cm",
    "price": 271.43,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003827.jpg",
    "description": "Blue Shiuli Design Half Plate - 22.5 cm"
  },
  {
    "name": "Blue Shiuli Design Dinner Plate - 27.5 cm",
    "price": 419.05,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003826.jpg",
    "description": "Blue Shiuli Design Dinner Plate - 27.5 cm"
  },
  {
    "name": "Black Ceramic Dinner Plate-27.5 CM",
    "price": 452.38,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003965.jpg",
    "description": "Black Ceramic Dinner Plate-27.5 CM"
  },
  {
    "name": "Slate Blue Ceramic Half Plate-22.5 CM",
    "price": 271.43,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003910.jpg",
    "description": "Slate Blue Ceramic Half Plate-22.5 CM"
  },
  {
    "name": "Slate Blue Ceramic Round Dish-30.5 CM",
    "price": 752.38,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003908.jpg",
    "description": "Slate Blue Ceramic Round Dish-30.5 CM"
  },
  {
    "name": "Grey Mandala Design Ceramic Rice Plate - 31 cm",
    "price": 871.43,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000003853.jpg",
    "description": "Grey Mandala Design Ceramic Rice Plate - 31 cm"
  },
  {
    "name": "Blue Ceramic Tie-Dyed Studio Firing Half Plate - 20.6 cm",
    "price": 297.67,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004112.jpg",
    "description": "Blue Ceramic Tie-Dyed Studio Firing Half Plate - 20.6 cm"
  },
  {
    "name": "Brick Red Ceramic Rice Dish",
    "price": 900.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004001.jpg",
    "description": "Brick Red Ceramic Rice Dish"
  },
  {
    "name": "Tree Shoot Design Dessert Plate - 21 CM",
    "price": 223.26,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004187.jpg",
    "description": "Tree Shoot Design Dessert Plate - 21 CM"
  },
  {
    "name": "Tree Shoot Design Dinner Plate - 27 CM",
    "price": 348.84,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004188.jpg",
    "description": "Tree Shoot Design Dinner Plate - 27 CM"
  },
  {
    "name": "Tree Shoot Design Oval Platter - 36 CM",
    "price": 1051.16,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004196.jpg",
    "description": "Tree Shoot Design Oval Platter - 36 CM"
  },
  {
    "name": "White Ceramic Dinner Plate (Blue Flower)",
    "price": 347.62,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0920000004011.jpg",
    "description": "White Ceramic Dinner Plate (Blue Flower)"
  }
];

async function seedDecorativePlates() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Decorative Plates...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 67 for Decorative Plates
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 67, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-DP-${Math.floor(Date.now() / 1000)}-${i}`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, p.image_url]
        );
        
        // Add variant for stock (Universal size)
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 20)',
            [productId, 'Standard']
        );
        
        console.log(`Added ${p.name}`);
    }

    console.log('Decorative Plates seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedDecorativePlates();
