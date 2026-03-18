#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const LISTING_URL = 'https://www.aarong.com/bgd/home-decor/dining/plates-platters';
const OUTPUT_PATH = path.join(__dirname, 'output', 'aarong_plates_platters_listing_full.json');
const MAX_PAGES = 12;

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
    const byCode = new Map();
    let emptyPageStreak = 0;

    for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex += 1) {
      const pageUrl = pageIndex === 1 ? LISTING_URL : `${LISTING_URL}?p=${pageIndex}`;
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(2600);

      // Scroll repeatedly so lazy-loaded cards for the current page are rendered.
      let previousCount = 0;
      for (let i = 0; i < 25; i += 1) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
        await page.waitForTimeout(700);

        const currentCount = await page.locator('a[href$=".html"]').count();
        if (currentCount === previousCount && i > 6) break;
        previousCount = currentCount;
      }

      const items = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href$=".html"]'));
        const rows = [];

        for (const anchor of anchors) {
          const href = anchor.getAttribute('href') || '';
          const absoluteHref = href.startsWith('http')
            ? href
            : href.startsWith('/')
            ? `https://www.aarong.com${href}`
            : href;

          if (!/\/bgd\//i.test(absoluteHref)) continue;
          if (/\/customer\//i.test(absoluteHref)) continue;
          if (/\/checkout\//i.test(absoluteHref)) continue;

          const productName = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
          if (!productName) continue;
          if (/quick view/i.test(productName)) continue;

          const codeMatch = absoluteHref.match(/-([0-9]{10,})\.html$/i);
          const slugMatch = absoluteHref.match(/\/bgd\/(.+)\.html$/i);
          const productCode = codeMatch
            ? codeMatch[1]
            : `UNKNOWN-${String(slugMatch?.[1] || productName).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;

          const card = anchor.closest('li, .product-item, .item, div');
          let price = '';

          if (card) {
            const cardText = (card.textContent || '').replace(/\s+/g, ' ').trim();
            const priceMatch = cardText.match(/Tk\s*([0-9.,]+)/i);
            if (priceMatch) price = priceMatch[1];
          }

          rows.push({
            product_name: productName,
            product_code: productCode,
            listing_url: absoluteHref,
            listing_price_bdt: price,
          });
        }

        return rows;
      });

      if (items.length === 0) {
        emptyPageStreak += 1;
        if (emptyPageStreak >= 2) break;
      } else {
        emptyPageStreak = 0;
      }

      for (const item of items) {
        if (!byCode.has(item.product_code)) {
          byCode.set(item.product_code, item);
        }
      }
    }

    const products = Array.from(byCode.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name)
    );

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(products, null, 2));
    console.log(`Saved ${products.length} products to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('Plates & platters listing scrape failed:', error.message);
  process.exit(1);
});
