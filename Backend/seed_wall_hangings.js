const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = [
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in wooden frame.",
    "price": 1269.77,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/0/0000007993510_1.jpg"
  },
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame (Large)",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in a wooden frame. Can be hung or framed for wall decoration.",
    "price": 3581.40,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993731_1.jpg"
  },
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame (XL)",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in a wooden frame. Can be hung or framed for wall decoration.",
    "price": 5213.95,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993636_1.jpg"
  },
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame (Medium)",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in a wooden frame. Can be hung or framed for wall decoration.",
    "price": 3362.79,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993431_1.jpg"
  },
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame (Small)",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in a wooden frame. Can be hung or framed for wall decoration.",
    "price": 2074.42,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993424.jpg"
  },
  {
    "name": "Red Nakshi Kantha Cotton Wall Hanging Tapestry with Frame (Mini)",
    "desc": "Red cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in a wooden frame.",
    "price": 1637.21,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993525.jpg"
  },
  {
    "name": "Red Cotton Nakshi Kantha Embroidered Wall Hanging",
    "desc": "Red cotton wall hanging with multicolour Nakshi Kantha embroidery in a wooden frame. Can be hung or framed for wall decoration.",
    "price": 2344.19,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792610094562.jpg"
  },
  {
    "name": "Ivory Embroidered Polyester Wall Hanging (A)",
    "desc": "Ivory polyester wall hanging with multicolour embroidery in an wooden frame. Hanging thread on back for mounting to walls.",
    "price": 813.95,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792610094775.jpg"
  },
  {
    "name": "Ivory Embroidered Polyester Wall Hanging (B)",
    "desc": "Ivory polyester wall hanging with multicolour embroidery in an wooden frame.",
    "price": 813.95,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792610095377.jpg"
  },
  {
    "name": "Nakshi Kantha Cotton Wall Hanging Tapestry",
    "desc": "Nakshi Kantha cotton wall hanging tapestry with multicolour embroidery.",
    "price": 813.95,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792510094872.jpg"
  },
  {
    "name": "Nakshi Kantha Embroidered Silk Tapestry",
    "desc": "Ivory silk wall hanging tapestry with multicolour Nakshi Kantha embroidery in wooden frame.",
    "price": 4153.49,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0790000094810.jpg"
  },
  {
    "name": "White Nakshi Kantha Cotton Wall Hanging Tapestry with Frame",
    "desc": "White cotton wall hanging tapestry with multicolour Nakshi Kantha embroidery in wooden frame.",
    "price": 4716.28,
    "imageUrl": "https://mcprod.aarong.com/media/catalog/product/0/7/0792527993732.jpg"
  }
];

async function seedWallHangings() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(`Connected. Seeding ${PRODUCTS.length} Wall Hangings...`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 71 for Wall Hanging
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 71, $4, true) RETURNING product_id',
            [p.name, p.desc, p.price, `FM-WH-${Math.floor(Date.now() / 1000)}-${i}`]
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

    console.log('Wall Hangings seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedWallHangings();
