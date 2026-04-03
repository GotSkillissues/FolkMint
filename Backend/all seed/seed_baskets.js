const { pool } = require('./src/config/database');
require('dotenv').config();

const basketProducts = [
  {
    "name": "Large Kaisa Grass Basket",
    "price": "850",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096867.jpg",
    "description": "Large Kaisa Grass Basket"
  },
  {
    "name": "Natural Bamboo Planter Basket",
    "price": "450",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096688.jpg",
    "description": "Natural Bamboo Planter Basket"
  },
  {
    "name": "Multicolour Date Palm Basket",
    "price": "600",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096870.jpg",
    "description": "Multicolour Date Palm Basket"
  },
  {
    "name": "Woven Cane Storage Basket",
    "price": "1200",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096687.jpg",
    "description": "Woven Cane Storage Basket"
  },
  {
    "name": "Artisan Crafted Jute Basket",
    "price": "950",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096917.jpg",
    "description": "Artisan Crafted Jute Basket"
  },
  {
    "name": "Striped Hogla Leaf Basket",
    "price": "750",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096893.jpg",
    "description": "Striped Hogla Leaf Basket"
  },
  {
    "name": "Round Braided Cotton Storage Basket",
    "price": "1100",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096866.jpg",
    "description": "Round Braided Cotton Storage Basket"
  },
  {
    "name": "Hogla Basket with Lid",
    "price": "1300",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096692.jpg",
    "description": "Hogla Basket with Lid"
  },
  {
    "name": "Painted Seagrass Basket",
    "price": "850",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/0/0000009493697.jpg",
    "description": "Painted Seagrass Basket"
  },
  {
    "name": "Hand-stitched Jute Basket Set",
    "price": "2200",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096927.jpg",
    "description": "Hand-stitched Jute Basket Set"
  },
  {
    "name": "Square Bamboo Utility Basket",
    "price": "550",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096920.jpg",
    "description": "Square Bamboo Utility Basket"
  },
  {
    "name": "Woven Cane Fruit Basket",
    "price": "400",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096918.jpg",
    "description": "Woven Cane Fruit Basket"
  },
  {
    "name": "Natural Fibre Waste Basket",
    "price": "650",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096916.jpg",
    "description": "Natural Fibre Waste Basket"
  },
  {
    "name": "Check pattern Bamboo Storage Bin",
    "price": "900",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096811.jpg",
    "description": "Check pattern Bamboo Storage Bin"
  },
  {
    "name": "Handcrafted Kaisa Grass Basket - Large",
    "price": "1400",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096849.jpg",
    "description": "Handcrafted Kaisa Grass Basket - Large"
  },
  {
    "name": "Embroidered Fabric Basket",
    "price": "1800",
    "image": "https://mcprod.aarong.com/media/catalog/product/1/4/14d249417001.jpg",
    "description": "Embroidered Fabric Basket"
  },
  {
    "name": "Mini Cane Decor Basket",
    "price": "250",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096867.jpg",
    "description": "Mini Cane Decor Basket"
  },
  {
    "name": "Macrame Organizer Basket",
    "price": "1550",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096688.jpg",
    "description": "Macrame Organizer Basket"
  },
  {
    "name": "Twin Tone Natural Sea Grass Basket",
    "price": "950",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096870.jpg",
    "description": "Twin Tone Natural Sea Grass Basket"
  },
  {
    "name": "Traditional Wicker Basket",
    "price": "2100",
    "image": "https://mcprod.aarong.com/media/catalog/product/0/9/0940000096687.jpg",
    "description": "Traditional Wicker Basket"
  }
];

async function seedBaskets() {
  const categoryId = 25; // Handmade Baskets
  
  for (const item of basketProducts) {
    try {
      // 1. Insert into product table
      const productRes = await pool.query(
        `INSERT INTO product (name, description, price, category_id, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING product_id`,
        [item.name, item.description, item.price, categoryId]
      );
      
      const productId = productRes.rows[0].product_id;
      
      // 2. Generate SKU
      const sku = 'FM-HBK-' + String(productId).padStart(6, '0');
      await pool.query(
        `UPDATE product SET sku = $1 WHERE product_id = $2`,
        [sku, productId]
      );

      // 3. Insert into product_image table
      await pool.query(
        `INSERT INTO product_image (product_id, image_url, is_primary)
         VALUES ($1, $2, true)`,
        [productId, item.image]
      );

      // 4. Update the default variant's stock to 20
      await pool.query(
        `UPDATE product_variant SET stock_quantity = 20 WHERE product_id = $1`,
        [productId]
      );

      console.log(`✓ Seeded: ${item.name}`);
    } catch (err) {
      console.error(`✗ Failed to seed ${item.name}:`, err.message);
    }
  }
  
  console.log('Baskets seeding completed.');
  process.exit(0);
}

seedBaskets();
