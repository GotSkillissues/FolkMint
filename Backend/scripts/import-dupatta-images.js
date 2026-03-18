#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INPUT_PATH = process.argv[2] || 'C:/Users/Mahi/Downloads/aarong_dupatta.json';
const LISTING_URL = process.argv[3] || 'https://www.aarong.com/bgd/women/dupatta';
const MAX_IMAGES_PER_PRODUCT = 1;
const IMAGE_MIN_BYTES = 8 * 1024;
const CLOUDINARY_FOLDER_BASE = 'folkmint/product/bangladesh/women/dupatta';
const OUTPUT_MAP_PATH = path.join(__dirname, 'output', 'dupatta-cloudinary-upload-map.json');
const ENABLE_LISTING_SCRAPE = String(process.env.DUPATTA_SCRAPE_LISTING || '').toLowerCase() === 'true';
const ENABLE_PLAYWRIGHT_FALLBACK = String(process.env.DUPATTA_PLAYWRIGHT_FALLBACK || '').toLowerCase() === 'true';
const ENABLE_PRODUCT_PAGE_SCRAPE = String(process.env.DUPATTA_PRODUCT_PAGE_SCRAPE || '').toLowerCase() === 'true';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'folkmint',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toAbsoluteUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `https://www.aarong.com${value}`;
  return value;
};

const normalizeImageUrl = (value) => {
  const url = toAbsoluteUrl(value);
  if (!url) return '';

  if (url.includes('/_next/image?')) {
    try {
      const parsed = new URL(url);
      const original = parsed.searchParams.get('url');
      if (original) return toAbsoluteUrl(decodeURIComponent(original));
    } catch {
      return url;
    }
  }

  return url;
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const uniqueValues = (values = []) => {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = 4000) => {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(handle);
  }
};

const hasImageMagicSignature = (buffer) => {
  if (!buffer || buffer.length < 12) return false;

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;

  return isJpeg || isPng || isWebp;
};

const uploadBufferToCloudinary = async (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });

const uploadBufferToCloudinaryWithTimeout = async (buffer, publicId, timeoutMs = 30000) =>
  Promise.race([
    uploadBufferToCloudinary(buffer, publicId),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Cloudinary upload timeout after ${timeoutMs}ms: ${publicId}`)), timeoutMs);
    }),
  ]);

const buildProductUrlFromNameAndSku = (name, sku) => {
  const safeSku = String(sku || '').trim().toLowerCase();
  const safeNameSlug = slugify(name);
  if (!safeSku) return '';
  return `https://www.aarong.com/bgd/${safeNameSlug || safeSku}-${safeSku}.html`;
};

const buildCodeBasedImageCandidates = (code) => {
  const normalizedCode = String(code || '').trim().toLowerCase();
  if (!normalizedCode || normalizedCode.length < 2) return [];

  const first = normalizedCode[0];
  const second = normalizedCode[1];
  const base = `https://mcprod.aarong.com/media/catalog/product/${first}/${second}/${normalizedCode}`;

  return [
    `${base}.jpg`,
    `${base}_1.jpg`,
    `${base}_2.jpg`,
    `${base}_3.jpg`,
  ];
};

const scrapeListingProductUrls = async () => {
  if (!ENABLE_LISTING_SCRAPE) return new Map();

  let playwright;

  try {
    playwright = require('playwright');
  } catch {
    return new Map();
  }

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
    await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3500);

    for (let i = 0; i < 8; i += 1) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1200);
    }

    const list = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/bgd/"][href$=".html"]'));
      return anchors.map((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
        return { href, text };
      });
    });

    const map = new Map();
    for (const item of list) {
      const url = toAbsoluteUrl(item.href);
      const nameKey = slugify(item.text);
      if (!url || !nameKey || map.has(nameKey)) continue;
      map.set(nameKey, url);
    }

    return map;
  } catch {
    return new Map();
  } finally {
    await browser.close();
  }
};

const fetchPageImageCandidates = async (productUrl) => {
  try {
    const response = await fetchWithTimeout(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return [];
    const html = await response.text();

    const regex = /https:\/\/mcprod\.aarong\.com\/media\/catalog\/product\/[^"'\s>]+\.(jpg|jpeg|png|webp)/gi;
    const matches = html.match(regex) || [];
    return uniqueValues(matches.map((value) => normalizeImageUrl(value)));
  } catch {
    return [];
  }
};

const fetchPageImagesWithPlaywright = async (productUrl) => {
  let playwright;

  try {
    playwright = require('playwright');
  } catch {
    return [];
  }

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);

    const raw = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[src],img[data-src],img[srcset],img[data-srcset]'));
      const collected = [];

      for (const img of imgs) {
        const src = img.getAttribute('src') || '';
        const dataSrc = img.getAttribute('data-src') || '';
        const srcSet = img.getAttribute('srcset') || '';
        const dataSrcSet = img.getAttribute('data-srcset') || '';

        if (src) collected.push(src);
        if (dataSrc) collected.push(dataSrc);

        if (srcSet) {
          const first = srcSet.split(',')[0]?.trim()?.split(' ')[0] || '';
          if (first) collected.push(first);
        }

        if (dataSrcSet) {
          const first = dataSrcSet.split(',')[0]?.trim()?.split(' ')[0] || '';
          if (first) collected.push(first);
        }
      }

      return collected;
    });

    return uniqueValues(raw.map((value) => normalizeImageUrl(value))).filter((value) =>
      /mcprod\.aarong\.com\/media\/catalog\/product\//i.test(value)
    );
  } catch {
    return [];
  } finally {
    await browser.close();
  }
};

const resolveSourceImages = async (productUrl, sku) => {
  const candidates = [];

  let fromHtml = [];
  if (ENABLE_PRODUCT_PAGE_SCRAPE) {
    fromHtml = await fetchPageImageCandidates(productUrl);
    candidates.push(...fromHtml);

    if (ENABLE_PLAYWRIGHT_FALLBACK && fromHtml.length === 0) {
      const fromDom = await fetchPageImagesWithPlaywright(productUrl);
      candidates.push(...fromDom);
    }
  }

  candidates.push(...buildCodeBasedImageCandidates(sku));

  const uniqueCandidates = uniqueValues(candidates.map((value) => normalizeImageUrl(value)));
  const resolved = [];

  for (const candidate of uniqueCandidates) {
    try {
      const response = await fetchWithTimeout(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://www.aarong.com/',
        },
      });

      if (!response.ok) continue;
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) continue;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < IMAGE_MIN_BYTES) continue;
      if (!hasImageMagicSignature(buffer)) continue;

      resolved.push({ source_url: candidate, buffer });
      if (resolved.length >= MAX_IMAGES_PER_PRODUCT) break;
    } catch {
      // continue
    }
  }

  return resolved;
};

const loadProducts = async (inputPath) => {
  const raw = await fs.readFile(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => ({
    name: String(item?.product_name || item?.name || '').trim(),
    sku: String(item?.product_code || item?.sku || '').trim(),
    product_url: String(item?.product_url || '').trim(),
  })).filter((item) => item.name && item.sku);
};

const findVariantBySku = async (sku) => {
  const result = await pool.query(
    `SELECT pv.variant_id, pv.product_id
       FROM product_variant pv
      WHERE pv.sku = $1
      LIMIT 1`,
    [sku]
  );

  return result.rows[0] || null;
};

const replaceVariantImages = async (client, variantId, secureUrls) => {
  await client.query('DELETE FROM product_image WHERE variant_id = $1', [variantId]);

  for (let index = 0; index < secureUrls.length; index += 1) {
    await client.query(
      `INSERT INTO product_image (image_url, is_primary, variant_id)
       VALUES ($1, $2, $3)`,
      [secureUrls[index], index === 0, variantId]
    );
  }
};

const configureCloudinary = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are missing in Backend/.env');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const run = async () => {
  configureCloudinary();

  const inputFile = path.resolve(INPUT_PATH);
  const products = await loadProducts(inputFile);
  const listingUrlMap = await scrapeListingProductUrls();

  console.log(`Listing scrape enabled: ${ENABLE_LISTING_SCRAPE}`);
  console.log(`Product page scrape enabled: ${ENABLE_PRODUCT_PAGE_SCRAPE}`);
  console.log(`Playwright fallback enabled: ${ENABLE_PLAYWRIGHT_FALLBACK}`);

  const outputRows = [];
  let linkedCount = 0;
  let skippedNoVariant = 0;
  let skippedNoImage = 0;

  for (let index = 0; index < products.length; index += 1) {
    const item = products[index];
    const sku = item.sku;
    const name = item.name;
    const nameKey = slugify(name);

    const variant = await findVariantBySku(sku);
    if (!variant) {
      skippedNoVariant += 1;
      outputRows.push({ sku, name, status: 'missing_variant' });
      continue;
    }

    const productUrl =
      toAbsoluteUrl(item.product_url) ||
      listingUrlMap.get(nameKey) ||
      buildProductUrlFromNameAndSku(name, sku);

    console.log(`[${index + 1}/${products.length}] ${name} (${sku})`);
    console.log(`  URL: ${productUrl}`);

    const sourceImages = await resolveSourceImages(productUrl, sku);
    if (!sourceImages.length) {
      skippedNoImage += 1;
      outputRows.push({ sku, name, product_url: productUrl, status: 'no_images_found' });
      continue;
    }

    const publicBase = `${CLOUDINARY_FOLDER_BASE}/${slugify(name)}-${sku}`;
    const uploadedSecureUrls = [];

    for (let imageIndex = 0; imageIndex < sourceImages.length; imageIndex += 1) {
      const publicId =
        imageIndex === 0
          ? `${publicBase}/thumb`
          : `${publicBase}/${String(imageIndex + 1).padStart(2, '0')}`;

      const upload = await uploadBufferToCloudinaryWithTimeout(sourceImages[imageIndex].buffer, publicId);
      uploadedSecureUrls.push(String(upload?.secure_url || ''));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await replaceVariantImages(client, variant.variant_id, uploadedSecureUrls);
      await client.query('COMMIT');
      linkedCount += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    outputRows.push({
      sku,
      name,
      product_url: productUrl,
      status: 'linked',
      uploaded_count: uploadedSecureUrls.length,
      secure_urls: uploadedSecureUrls,
    });

    await sleep(120);
  }

  await fs.mkdir(path.dirname(OUTPUT_MAP_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_MAP_PATH,
    `${JSON.stringify({ generated_at: new Date().toISOString(), listing_url: LISTING_URL, results: outputRows }, null, 2)}\n`,
    'utf8'
  );

  console.log('Dupatta image import completed.');
  console.log(`Total input: ${products.length}`);
  console.log(`Linked with images: ${linkedCount}`);
  console.log(`Missing variant SKU: ${skippedNoVariant}`);
  console.log(`No images found: ${skippedNoImage}`);
  console.log(`Output map: ${OUTPUT_MAP_PATH}`);
};

run()
  .catch((error) => {
    console.error('Dupatta image import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
