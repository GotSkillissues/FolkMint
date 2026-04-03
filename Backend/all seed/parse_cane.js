const fs = require('fs');
const html = fs.readFileSync('aarong_cane.html', 'utf8');

// The product list might be embedded in some script tag. Let's try parsing Magento 2 style JSON.
const matches = [...html.matchAll(/"name":"([^"]+)".*?"price":\{.*?"price":([0-9.]+).*?"image":\{.*?"url":"([^"]+)"/g)];

console.log(`Found ${matches.length} products with simple regex.`);

const products = [];
for (const match of matches) {
  if (products.length >= 24) break;
  // some basic deduplication by name
  if (!products.find(p => p.name === match[1])) {
    products.push({
      name: match[1],
      price: parseFloat(match[2]),
      image_url: match[3],
      description: match[1]
    });
  }
}

console.log(JSON.stringify(products, null, 2));

if (products.length === 0) {
    // maybe try another regex
    const nameMatches = [...html.matchAll(/data-title="([^"]+)"/g)];
    const priceMatches = [...html.matchAll(/data-price-amount="([^"]+)"/g)];
    const imgMatches = [...html.matchAll(/class="product-image-photo" src="([^"]+)"/g)];
    console.log(`Names: ${nameMatches.length}, Prices: ${priceMatches.length}, Imgs: ${imgMatches.length}`);
}
