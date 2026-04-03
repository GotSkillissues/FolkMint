const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = [
  {
    "name": "Mahogany Wooden Spice Pot",
    "price": 613.95,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097860.jpg",
    "description": "Mahogany Wooden Spice Pot"
  },
  {
    "name": "Mahogany Wooden Pen",
    "price": 65.12,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097925.jpg",
    "description": "Mahogany Wooden Pen"
  },
  {
    "name": "Beige/Coffee Jute Basket - Big",
    "price": 700.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096853.jpg",
    "description": "Beige/Coffee Jute Basket - Big"
  },
  {
    "name": "Coffee/Beige Jute Basket - Small",
    "price": 550.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096852.jpg",
    "description": "Coffee/Beige Jute Basket - Small"
  },
  {
    "name": "Coffee/Beige Jute Basket - Big",
    "price": 710.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096851.jpg",
    "description": "Coffee/Beige Jute Basket - Big"
  },
  {
    "name": "Wooden Mortar and Pestle",
    "price": 552.38,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0892018996308_2.jpg",
    "description": "Wooden Mortar and Pestle"
  },
  {
    "name": "Chocolate Mahogany Wooden Bowl",
    "price": 1000.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097973.jpg",
    "description": "Chocolate Mahogany Wooden Bowl"
  },
  {
    "name": "Brown Wooden Poddo Pata (Large)",
    "price": 904.76,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097693.jpg",
    "description": "Brown Wooden Poddo Pata (Large)"
  },
  {
    "name": "Brown Wooden Poddo Pata (Medium)",
    "price": 800.00,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097692.jpg",
    "description": "Brown Wooden Poddo Pata (Medium)"
  },
  {
    "name": "Brown Wooden Poddo Pata (Small)",
    "price": 628.57,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097691.jpg",
    "description": "Brown Wooden Poddo Pata (Small)"
  },
  {
    "name": "Wooden Decorative Naksha Stand",
    "price": 1723.81,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/8/0890000097666.jpg",
    "description": "Wooden Decorative Naksha Stand"
  },
  {
    "name": "Cane Basket- Small",
    "price": 223.81,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095674.jpg",
    "description": "Cane Basket- Small"
  },
  {
    "name": "Bamboo Plain Bati-Medium",
    "price": 93.02,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093190100.jpg",
    "description": "Bamboo Plain Bati-Medium"
  },
  {
    "name": "Cane Basket- Big",
    "price": 366.67,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0930000095673.jpg",
    "description": "Cane Basket- Big"
  },
  {
    "name": "Bamboo Plain Bati-Big",
    "price": 111.63,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/0/0000093191600.jpg",
    "description": "Bamboo Plain Bati-Big"
  },
  {
    "name": "Bamboo Basket",
    "price": 157.14,
    "image_url": "https://mcprod.aarong.com/media/catalog/product/0/9/0932019300137_1.jpg",
    "description": "Bamboo Basket"
  }
];

async function seedWoodenCrafts() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Wooden Crafts...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 33 for Wooden Crafts
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 33, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, `FM-WC-${Math.floor(Date.now() / 1000)}-${i}`]
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

    console.log('Wooden Crafts seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedWoodenCrafts();
