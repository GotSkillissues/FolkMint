#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, 'output', 'terracotta-clay-cloudinary-upload-map.json');
const SOURCE_JSON_PATH = path.join(
  __dirname,
  '..',
  '..',
  'Frontend',
  'vite-project',
  'src',
  'data',
  'aarong-terracotta-clay-details.json'
);
const FRONTEND_GENERATED_PATH = path.join(
  __dirname,
  '..',
  '..',
  'Frontend',
  'vite-project',
  'src',
  'data',
  'terracotta-clay.json'
);

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeSku = (value) =>
  String(value || '')
    .replace(/^sku\s*#?\s*:?\s*/i, '')
    .replace(/[^a-z0-9\-_.]/gi, '')
    .toLowerCase()
    .trim();

const makeKey = (name, sku) => {
  const skuKey = normalizeSku(sku);
  if (skuKey) return `sku:${skuKey}`;
  return `name:${normalizeName(name)}`;
};

function run() {
  if (!fs.existsSync(MAP_PATH)) {
    throw new Error(`Map not found: ${MAP_PATH}`);
  }

  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const results = Array.isArray(map?.results) ? map.results : [];

  const uploadedKeys = new Set(
    results
      .filter((item) => item?.status === 'uploaded')
      .map((item) => makeKey(item?.name, item?.sku))
  );

  if (!fs.existsSync(SOURCE_JSON_PATH)) {
    throw new Error(`Source JSON not found: ${SOURCE_JSON_PATH}`);
  }

  const source = JSON.parse(fs.readFileSync(SOURCE_JSON_PATH, 'utf8'));
  const sourceProducts = Array.isArray(source)
    ? source
    : Array.isArray(source?.products)
      ? source.products
      : [];

  const filteredSourceProducts = sourceProducts.filter((item) =>
    uploadedKeys.has(makeKey(item?.product_name || item?.name, item?.product_code || item?.sku))
  );

  if (Array.isArray(source)) {
    fs.writeFileSync(SOURCE_JSON_PATH, JSON.stringify(filteredSourceProducts, null, 2));
  } else {
    const next = {
      ...source,
      products_captured: filteredSourceProducts.length,
      products: filteredSourceProducts,
    };
    fs.writeFileSync(SOURCE_JSON_PATH, JSON.stringify(next, null, 2));
  }

  if (fs.existsSync(FRONTEND_GENERATED_PATH)) {
    const generated = JSON.parse(fs.readFileSync(FRONTEND_GENERATED_PATH, 'utf8'));
    const generatedList = Array.isArray(generated) ? generated : [];
    const filteredGenerated = generatedList.filter((item) => item?.status === 'uploaded');
    fs.writeFileSync(FRONTEND_GENERATED_PATH, JSON.stringify(filteredGenerated, null, 2));
  }

  const nextMap = {
    ...map,
    product_count: results.filter((item) => item?.status === 'uploaded').length,
    results: results.filter((item) => item?.status === 'uploaded'),
  };
  fs.writeFileSync(MAP_PATH, JSON.stringify(nextMap, null, 2));

  console.log(`Kept uploaded products: ${nextMap.product_count}`);
  console.log(`Updated source JSON: ${SOURCE_JSON_PATH}`);
  console.log(`Updated generated data: ${FRONTEND_GENERATED_PATH}`);
  console.log(`Updated upload map: ${MAP_PATH}`);
}

try {
  run();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
