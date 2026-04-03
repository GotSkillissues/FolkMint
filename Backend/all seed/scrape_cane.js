const cheerio = require('cheerio');
const fs = require('fs');

async function scrape() {
  const url = 'https://www.aarong.com/bgd/catalogsearch/result?q=Cane%20crafts';
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const products = [];

  $('.product-item').each((i, el) => {
    if (products.length >= 24) return;
    
    const name = $(el).find('.product-item-name a').text().trim();
    const priceText = $(el).find('.price').first().text().trim();
    // Some prices might have 'Tk' or commas, let's remove non-numeric chars except dot
    let price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) price = 500; // fallback

    const image_url = $(el).find('.product-image-photo').attr('src');
    
    if (name && image_url) {
      products.push({
        name,
        price,
        image_url,
        description: name
      });
    }
  });

  const fileContent = `const { Client } = require('pg');
require('dotenv').config();

const PRODUCTS = ${JSON.stringify(products, null, 2)};

async function seedCaneCrafts() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'jobayer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'hqhq',
  });

  try {
    await client.connect();
    console.log(\`Connected. Seeding \${PRODUCTS.length} Cane Crafts...\`);

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        
        // Use category_id 24 for Cane Crafts
        const res = await client.query(
            'INSERT INTO product (name, description, price, category_id, sku, is_active) VALUES ($1, $2, $3, 24, $4, true) RETURNING product_id',
            [p.name, p.description, p.price, \`FM-CC-\${Math.floor(Date.now() / 1000)}-\${i}\`]
        );
        const productId = res.rows[0].product_id;
        
        // Add image
        await client.query(
            'INSERT INTO product_image (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [productId, p.image_url]
        );
        
        // Add variant for stock (Standard size)
        await client.query(
            'INSERT INTO product_variant (product_id, size, stock_quantity) VALUES ($1, $2, 20)',
            [productId, 'Standard']
        );
        
        console.log(\`Added \${p.name}\`);
    }

    console.log('Cane Crafts seeded successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await client.end();
  }
}

seedCaneCrafts();
`;

  fs.writeFileSync('seed_cane_crafts.js', fileContent);
  console.log(`Scraped ${products.length} products and saved to seed_cane_crafts.js`);
}

scrape().catch(console.error);
