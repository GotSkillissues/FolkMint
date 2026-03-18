#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const LISTING_BASE_URL = 'https://www.aarong.com/bgd/home-decor/decor/wall-hangings';
const OUTPUT_PATH = path.join(__dirname, 'output', 'aarong_wall_hangings_listing.json');
const MAX_PAGES = 15;

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

async function run() {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
    const byCode = new Map();
    let emptyPageStreak = 0;

    for (let pageIndex = 1; pageIndex <= MAX_PAGES; pageIndex += 1) {
      const pageUrl = pageIndex === 1 ? LISTING_BASE_URL : `${LISTING_BASE_URL}?p=${pageIndex}`;
      console.log(`Scraping page ${pageIndex}: ${pageUrl}`);

      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(2800);

      // Scroll to load lazy-loaded product cards
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

          const codeMatch = absoluteHref.match(/-([0-9a-z]{8,20})\.html$/i);
          const slugMatch = absoluteHref.match(/\/bgd\/(.+)\.html$/i);
          const productCode = codeMatch
            ? codeMatch[1]
            : `UNKNOWN-${String(slugMatch?.[1] || productName).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;

          // Grab thumbnail from card
          const card = anchor.closest('li, .product-item, .item, article') || anchor.closest('div');
          let price = '';
          let thumbnailUrl = '';

          if (card) {
            const cardText = (card.textContent || '').replace(/\s+/g, ' ').trim();
            const priceMatch = cardText.match(/Tk\s*([0-9.,]+)/i);
            if (priceMatch) price = priceMatch[1];

            const img =
              card.querySelector('img[src]') ||
              card.querySelector('img[data-src]') ||
              card.querySelector('img[srcset]');

            if (img) {
              thumbnailUrl =
                img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                (img.getAttribute('srcset') || '').split(',')[0]?.trim()?.split(' ')[0] ||
                '';
            }
          }

          rows.push({
            product_name: productName,
            product_code: productCode,
            listing_url: absoluteHref,
            listing_price_bdt: price,
            thumbnail_url: thumbnailUrl,
          });
        }

        return rows;
      });

      if (items.length === 0) {
        emptyPageStreak += 1;
        if (emptyPageStreak >= 2) {
          console.log('Two consecutive empty pages — stopping.');
          break;
        }
      } else {
        emptyPageStreak = 0;
        console.log(`  Found ${items.length} product links on page ${pageIndex}`);
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

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(products, null, 2));
    console.log(`\nSaved ${products.length} wall hangings products to ${OUTPUT_PATH}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('Wall hangings listing scrape failed:', error.message);
  process.exit(1);
});
