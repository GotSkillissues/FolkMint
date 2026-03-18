#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const LISTING_URL =
  process.argv[2] ||
  'https://www.aarong.com/bgd/gifts-crafts/non-textile-crafts/terracotta-clay';

const OUTPUT_BACKEND = path.join(
  __dirname,
  'output',
  'aarong-terracotta-clay-details.json'
);

const OUTPUT_FRONTEND = path.join(
  __dirname,
  '..',
  '..',
  'Frontend',
  'vite-project',
  'src',
  'data',
  'aarong-terracotta-clay-details.json'
);

const text = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeUrl = (value) => {
  const raw = text(value);
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `https://www.aarong.com${raw}`;
  return raw;
};

const parseSkuFromUrl = (url) => {
  const clean = text(url).split('?')[0];
  const match = clean.match(/-([a-z0-9]{8,})\.html$/i);
  return match?.[1] ? match[1] : '';
};

const cleanSpecifications = (specifications) => {
  const out = {};
  for (const [key, value] of Object.entries(specifications || {})) {
    const k = text(key).toLowerCase().replace(/[\s:]+/g, '_').replace(/[^a-z0-9_]/g, '');
    const v = text(value);
    if (!k || !v) continue;
    out[k] = v;
  }
  return out;
};

const uniqueByUrl = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const url = normalizeUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
};

async function getProductUrls(browser) {
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
    await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);

    let stableRounds = 0;
    let previousCount = 0;

    while (stableRounds < 5) {
      const currentCount = await page.evaluate(() =>
        document.querySelectorAll('a[href*="/bgd/"][href$=".html"]').length
      );

      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1300);

      if (currentCount === previousCount) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
        previousCount = currentCount;
      }
    }

    const urls = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/bgd/"][href$=".html"]'));
      return anchors.map((a) => a.getAttribute('href') || '');
    });

    await page.close();
    return uniqueByUrl(urls);
  } catch (error) {
    throw error;
  }
}

async function scrapeProduct(page, productUrl, index, total) {
  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1800);

    const data = await page.evaluate(() => {
      const textValue = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      const pickFirst = (selectors) => {
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          const val = textValue(el?.textContent || el?.innerText || '');
          if (val) return val;
        }
        return '';
      };

      const name =
        pickFirst(['h1', '[data-ui-id="page-title-wrapper"]', '.page-title span', '.product-name']) ||
        textValue(document.title).replace(/\s*\|\s*Aarong.*$/i, '');

      const descriptionCandidates = [
        '.product.attribute.description .value',
        '.product.attribute.overview .value',
        '.product-info-main .product.attribute.overview',
        '[itemprop="description"]',
      ];

      let description = pickFirst(descriptionCandidates);

      if (!description) {
        const meta = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        description = textValue(meta);
      }

      const specifications = {};

      const addSpec = (label, value) => {
        const k = textValue(label);
        const v = textValue(value);
        if (!k || !v) return;
        specifications[k] = v;
      };

      const rows = document.querySelectorAll('table tr');
      rows.forEach((row) => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        addSpec(th?.textContent, td?.textContent);
      });

      const dts = document.querySelectorAll('dl dt');
      dts.forEach((dt) => {
        const dd = dt.nextElementSibling;
        if (dd && dd.tagName.toLowerCase() === 'dd') {
          addSpec(dt.textContent, dd.textContent);
        }
      });

      const liSpecs = document.querySelectorAll('.product.attribute.additional li, .additional-attributes li, .product-info-main li');
      liSpecs.forEach((li) => {
        const raw = textValue(li.textContent);
        if (!raw || raw.length > 200) return;
        const separatorMatch = raw.match(/^([^:]{2,60})\s*:\s*(.+)$/);
        if (separatorMatch) {
          addSpec(separatorMatch[1], separatorMatch[2]);
        }
      });

      const scriptJsons = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((el) => textValue(el.textContent))
        .filter(Boolean);

      let sku = '';

      for (const rawJson of scriptJsons) {
        try {
          const parsed = JSON.parse(rawJson);
          const stack = Array.isArray(parsed) ? parsed : [parsed];

          while (stack.length > 0) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;

            if (!sku && typeof node.sku === 'string') sku = textValue(node.sku);

            if (!description && typeof node.description === 'string') {
              description = textValue(node.description);
            }

            for (const value of Object.values(node)) {
              if (value && typeof value === 'object') stack.push(value);
            }
          }
        } catch {
          // ignore malformed blocks
        }
      }

      return {
        product_name: name,
        product_code: sku,
        descriptions: description,
        specifications,
      };
    });

    const fallbackSku = parseSkuFromUrl(productUrl);
    const item = {
      product_name: text(data.product_name),
      product_code: text(data.product_code || fallbackSku),
      descriptions: text(data.descriptions),
      specifications: cleanSpecifications(data.specifications),
      product_url: productUrl,
    };

    console.log(`[${index + 1}/${total}] ${item.product_name || productUrl}`);
    return item;
  } catch (error) {
    throw error;
  }
}

async function run() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error('Playwright is required. Run: npm install');
  }

  console.log('Launching browser...');
  const browser = await playwright.chromium.launch({ headless: true });

  try {
    console.log('Collecting product URLs from listing...');
    const urls = await getProductUrls(browser);
    if (!urls.length) throw new Error('No product URLs found from listing page.');

    console.log(`Found ${urls.length} product URLs. Scraping product details...`);
    const result = [];
    const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });

    for (let i = 0; i < urls.length; i += 1) {
      const productUrl = urls[i];
      try {
        const item = await scrapeProduct(page, productUrl, i, urls.length);
        if (item.product_name && item.product_code) {
          result.push(item);
        }
      } catch (error) {
        console.warn(`Failed to scrape: ${productUrl} -> ${error.message}`);
      }
    }

    await page.close();

    const deduped = [];
    const seen = new Set();

    for (const item of result) {
      const key = `${item.product_code}::${item.product_name}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    await fs.mkdir(path.dirname(OUTPUT_BACKEND), { recursive: true });
    await fs.mkdir(path.dirname(OUTPUT_FRONTEND), { recursive: true });

    const payload = JSON.stringify(deduped, null, 2);
    await fs.writeFile(OUTPUT_BACKEND, payload, 'utf8');
    await fs.writeFile(OUTPUT_FRONTEND, payload, 'utf8');

    console.log(`Saved ${deduped.length} products:`);
    console.log(`- ${OUTPUT_BACKEND}`);
    console.log(`- ${OUTPUT_FRONTEND}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
