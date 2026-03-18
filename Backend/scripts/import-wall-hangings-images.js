#!/usr/bin/env node
/**
 * import-wall-hangings-images.js
 *
 * For each wall hangings product in the listing JSON:
 *   1. Scrapes the product page to get description + specs
 *   2. Finds valid image URLs (code-based CDN candidates, page HTML, Playwright fallback)
 *   3. Downloads and validates images
 *   4. Uploads to Cloudinary under folkmint/product/bangladesh/home-decor/decor/wall-hangings/
 *   5. Updates product description + spec in DB
 *   6. Inserts image URLs into product_image table
 *   7. Writes an output map JSON
 */

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INPUT_PATH =
  process.argv[2] || path.join(__dirname, 'output', 'aarong_wall_hangings_listing.json');

const CLOUDINARY_FOLDER =
  process.env.MIGRATE_CLOUDINARY_FOLDER ||
  'folkmint/product/bangladesh/home-decor/decor/wall-hangings';

const OUTPUT_MAP_PATH = path.join(
  __dirname,
  'output',
  'wall-hangings-cloudinary-upload-map.json'
);

const MAX_IMAGES_PER_PRODUCT = 3;
const IMAGE_MIN_BYTES = 8 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const CLOUDINARY_UPLOAD_TIMEOUT_MS = 90000;

// ──────────────────────────────────────────────
// DB pool
// ──────────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'folkmint',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ──────────────────────────────────────────────
// URL helpers
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Image validation
// ──────────────────────────────────────────────

const hasImageMagicSignature = (buffer) => {
  if (!buffer || buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
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

// ──────────────────────────────────────────────
// Fetch helpers
// ──────────────────────────────────────────────

const fetchWithTimeout = async (url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const handle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(handle);
  }
};

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// ──────────────────────────────────────────────
// Product page scraping (description + specs + images)
// ──────────────────────────────────────────────

const extractMetaDescription = (html) => {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  return match?.[1] ? String(match[1]).replace(/\s+/g, ' ').trim() : '';
};

const extractSkuFromHtml = (html) => {
  const patterns = [
    /"sku"\s*:\s*"([^"]+)"/i,
    /data-product-sku=["']([^"']+)["']/i,
    /SKU\s*[:#]\s*<[^>]*>\s*([^<\s][^<]*)</i,
    /SKU\s*[:#]\s*([A-Za-z0-9\-_.]+)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return String(match[1]).trim();
  }
  return '';
};

const extractSpecificationsFromHtml = (html) => {
  const specs = {};

  // Try JSON-LD or structured data for attributes
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const jsonContent = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonContent);

        // Extract material/color/dimensions from product structured data
        if (data?.color) specs.colour = data.color;
        if (data?.material) specs.material = data.material;
        if (data?.description && !specs.description) specs.product_description = data.description;
      } catch {
        // skip malformed JSON-LD
      }
    }
  }

  // Regex patterns for common product attributes in Magento/Aarong HTML
  const attributePatterns = [
    { key: 'colour', pattern: /(?:colou?r|shade)\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'material', pattern: /material\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'dimensions', pattern: /(?:dimensions?|size|measurement)\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'weight', pattern: /weight\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'origin', pattern: /(?:country of origin|origin|made in)\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'care', pattern: /(?:care instructions?|washing|care)\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
    { key: 'style', pattern: /(?:style|type|category)\s*[:\-]\s*<\/?\w*[^>]*>\s*([^<\n]+)/i },
  ];

  for (const { key, pattern } of attributePatterns) {
    if (specs[key]) continue;
    const match = html.match(pattern);
    if (match?.[1]) {
      const cleaned = String(match[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (cleaned && cleaned.length < 200) specs[key] = cleaned;
    }
  }

  // Also look for table-based specs (Aarong product detail tables)
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let tableMatch;
  while ((tableMatch = tableRowRegex.exec(html)) !== null) {
    const label = String(tableMatch[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const value = String(tableMatch[2]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (label && value && value.length < 300) {
      const normalKey = label.replace(/\s+/g, '_');
      specs[normalKey] = value;
    }
  }

  return specs;
};

const fetchProductDetails = async (productUrl) => {
  if (!productUrl) return {};
  try {
    const response = await fetchWithTimeout(
      productUrl,
      { headers: { 'User-Agent': USER_AGENT } },
      12000
    );
    if (!response.ok) return {};
    const html = await response.text();

    return {
      description: extractMetaDescription(html),
      sku: extractSkuFromHtml(html),
      specifications: extractSpecificationsFromHtml(html),
      source_image_urls: uniqueValues(
        (html.match(/https:\/\/mcprod\.aarong\.com\/media\/catalog\/product\/[^"'\s>]+\.(jpg|jpeg|png|webp)/gi) || []).map(
          (u) => normalizeImageUrl(u)
        )
      ),
    };
  } catch {
    return {};
  }
};

// ──────────────────────────────────────────────
// Playwright fallback image scraper
// ──────────────────────────────────────────────

const fetchImagesWithPlaywright = async (productUrl) => {
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

    const rawUrls = await page.evaluate(() => {
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

    return uniqueValues(rawUrls.map((v) => normalizeImageUrl(v))).filter((v) =>
      /mcprod\.aarong\.com\/media\/catalog\/product\//i.test(v)
    );
  } catch {
    return [];
  } finally {
    await browser.close();
  }
};

// ──────────────────────────────────────────────
// Image resolution
// ──────────────────────────────────────────────

const buildCodeBasedCandidates = (code) => {
  const normalizedCode = String(code || '').trim().toLowerCase();
  if (!normalizedCode || normalizedCode.length < 2) return [];
  const first = normalizedCode[0];
  const second = normalizedCode[1];
  const base = `https://mcprod.aarong.com/media/catalog/product/${first}/${second}/${normalizedCode}`;
  return [`${base}.jpg`, `${base}_1.jpg`, `${base}_2.jpg`, `${base}_3.jpg`];
};

const resolveSourceImages = async (item) => {
  const productCode = String(item.product_code || '').trim().toLowerCase();
  const productUrl = toAbsoluteUrl(item.listing_url || '');

  const candidates = [];

  // 1. Thumbnail from listing page
  if (item.thumbnail_url) candidates.push(normalizeImageUrl(item.thumbnail_url));

  // 2. Code-based CDN URL patterns
  candidates.push(...buildCodeBasedCandidates(productCode));

  // 3. Product page HTML scrape for mcprod URLs
  const pageDetails = await fetchProductDetails(productUrl);
  if (Array.isArray(pageDetails.source_image_urls)) {
    candidates.push(...pageDetails.source_image_urls);
  }

  // 4. Playwright fallback if nothing found yet
  const httpCandidates = uniqueValues(candidates.filter(Boolean));
  if (httpCandidates.filter((u) => /mcprod\.aarong\.com/i.test(u)).length === 0) {
    const playwrightImages = await fetchImagesWithPlaywright(productUrl);
    candidates.push(...playwrightImages);
  }

  const uniqueCandidates = uniqueValues(candidates.map((v) => normalizeImageUrl(v)).filter(Boolean));
  const resolved = [];

  for (const candidate of uniqueCandidates) {
    if (resolved.length >= MAX_IMAGES_PER_PRODUCT) break;
    try {
      const response = await fetchWithTimeout(candidate, {
        headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.aarong.com/' },
      });
      if (!response.ok) continue;
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) continue;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < IMAGE_MIN_BYTES) continue;
      if (!hasImageMagicSignature(buffer)) continue;

      resolved.push({ source_url: candidate, buffer });
    } catch {
      // continue
    }
  }

  return { resolved, pageDetails };
};

// ──────────────────────────────────────────────
// Cloudinary
// ──────────────────────────────────────────────

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

const uploadToCloudinary = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: true, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const uploadWithTimeout = (buffer, publicId, timeoutMs = CLOUDINARY_UPLOAD_TIMEOUT_MS) =>
  Promise.race([
    uploadToCloudinary(buffer, publicId),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Cloudinary upload timeout: ${publicId}`)), timeoutMs)
    ),
  ]);

// ──────────────────────────────────────────────
// DB helpers
// ──────────────────────────────────────────────

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

const buildDetailedDescription = (productName, pageDescription, specs) => {
  const parts = [];
  if (pageDescription) parts.push(pageDescription);

  const specEntries = Object.entries(specs || {}).filter(([, v]) => String(v || '').trim().length > 0);
  if (specEntries.length > 0) {
    const specLines = specEntries.map(([k, v]) => {
      const label = k.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `- ${label}: ${String(v).trim()}`;
    });
    parts.push(`Specifications:\n${specLines.join('\n')}`);
  }

  return parts.filter(Boolean).join('\n\n').trim() || `${productName} — handcrafted wall hanging from Aarong Bangladesh.`;
};

const updateProductDescription = async (client, productId, description) => {
  await client.query(
    `UPDATE product SET description = $1, updated_at = NOW() WHERE product_id = $2`,
    [description, productId]
  );
};

const replaceVariantImages = async (client, variantId, secureUrls) => {
  await client.query('DELETE FROM product_image WHERE variant_id = $1', [variantId]);
  for (let i = 0; i < secureUrls.length; i += 1) {
    await client.query(
      `INSERT INTO product_image (image_url, is_primary, variant_id) VALUES ($1, $2, $3)`,
      [secureUrls[i], i === 0, variantId]
    );
  }
};

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

const run = async () => {
  configureCloudinary();

  const inputFile = path.resolve(INPUT_PATH);
  const raw = await fs.readFile(inputFile, 'utf8');
  const products = JSON.parse(raw);

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Input JSON must be a non-empty array of wall hangings products.');
  }

  console.log(`Processing ${products.length} wall hangings products...`);
  console.log(`Cloudinary folder: ${CLOUDINARY_FOLDER}`);

  const outputRows = [];
  let linkedCount = 0;
  let skippedNoVariant = 0;
  let skippedNoImage = 0;

  for (let index = 0; index < products.length; index += 1) {
    const item = products[index];
    const sku = String(item.product_code || '').trim();
    const name = String(item.product_name || item.name || '').trim();

    if (!sku || !name) {
      skippedNoVariant += 1;
      outputRows.push({ sku, name, status: 'skipped_no_sku_or_name' });
      continue;
    }

    console.log(`\n[${index + 1}/${products.length}] ${name} (${sku})`);
    console.log(`  URL: ${item.listing_url}`);

    // Find existing variant in DB
    const variant = await findVariantBySku(sku);
    if (!variant) {
      console.log(`  ⚠  No variant found in DB for SKU ${sku}`);
      skippedNoVariant += 1;
      outputRows.push({ sku, name, status: 'missing_variant' });
      continue;
    }

    // Resolve images + page details
    const { resolved: sourceImages, pageDetails } = await resolveSourceImages(item);

    // Build updated description from scraped data
    const description = buildDetailedDescription(name, pageDetails.description || '', pageDetails.specifications || {});

    // Update product description + specs in DB (regardless of images)
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await updateProductDescription(dbClient, variant.product_id, description);

      if (sourceImages.length === 0) {
        console.log(`  ⚠  No images found`);
        await dbClient.query('COMMIT');
        skippedNoImage += 1;
        outputRows.push({ sku, name, listing_url: item.listing_url, status: 'no_images_found', description });
        continue;
      }

      // Upload to Cloudinary
      const publicBase = `${CLOUDINARY_FOLDER}/${slugify(name)}-${sku}`;
      const uploadedSecureUrls = [];

      for (let imgIndex = 0; imgIndex < sourceImages.length; imgIndex += 1) {
        const publicId =
          imgIndex === 0
            ? `${publicBase}/thumb`
            : `${publicBase}/${String(imgIndex + 1).padStart(2, '0')}`;

        try {
          const upload = await uploadWithTimeout(sourceImages[imgIndex].buffer, publicId);
          const secureUrl = String(upload?.secure_url || '');
          if (secureUrl) uploadedSecureUrls.push(secureUrl);
          console.log(`  ✓ Uploaded image ${imgIndex + 1}: ${secureUrl}`);
        } catch (uploadError) {
          console.warn(`  ✗ Upload failed for image ${imgIndex + 1}: ${uploadError.message}`);
        }
      }

      // Link images in DB
      if (uploadedSecureUrls.length > 0) {
        await replaceVariantImages(dbClient, variant.variant_id, uploadedSecureUrls);
        await dbClient.query('COMMIT');
        linkedCount += 1;
        console.log(`  ✓ Linked ${uploadedSecureUrls.length} image(s) in DB`);
        outputRows.push({
          sku,
          name,
          listing_url: item.listing_url,
          status: 'linked',
          uploaded_count: uploadedSecureUrls.length,
          secure_urls: uploadedSecureUrls,
          description,
          specifications: pageDetails.specifications || {},
        });
      } else {
        await dbClient.query('ROLLBACK');
        skippedNoImage += 1;
        outputRows.push({ sku, name, listing_url: item.listing_url, status: 'upload_failed', description });
      }
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    } finally {
      dbClient.release();
    }

    await sleep(200);
  }

  // Write output map
  await fs.mkdir(path.dirname(OUTPUT_MAP_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_MAP_PATH,
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        listing_url: 'https://www.aarong.com/bgd/home-decor/decor/wall-hangings',
        cloudinary_folder: CLOUDINARY_FOLDER,
        total_input: products.length,
        linked_with_images: linkedCount,
        missing_variant: skippedNoVariant,
        no_images_found: skippedNoImage,
        results: outputRows,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log('\n══════════════════════════════════════════');
  console.log('Wall Hangings image import completed.');
  console.log(`Total products processed : ${products.length}`);
  console.log(`Linked with images       : ${linkedCount}`);
  console.log(`Missing variant in DB    : ${skippedNoVariant}`);
  console.log(`No images found          : ${skippedNoImage}`);
  console.log(`Output map               : ${OUTPUT_MAP_PATH}`);
  console.log('══════════════════════════════════════════');
};

run()
  .catch((error) => {
    console.error('Wall Hangings image import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
