#!/usr/bin/env node

const fs = require('fs');

const MAP_PATH = 'scripts/output/terracotta-clay-cloudinary-upload-map.json';
const LISTING_URL = 'https://www.aarong.com/bgd/gifts-crafts/non-textile-crafts/terracotta-clay';

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function run() {
  const playwright = require('playwright');
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const failed = (map.results || [])
    .filter((item) => item.status !== 'uploaded')
    .map((item) => ({
      name: String(item.name || '').trim(),
      key: normalizeName(item.name),
    }));

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
    await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);

    for (let index = 0; index < 8; index += 1) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1200);
    }

    const cards = await page.evaluate(() => {
      const text = (value) =>
        String(value || '')
          .replace(/\s+/g, ' ')
          .trim();

      const anchors = Array.from(document.querySelectorAll('a[href*="/bgd/"][href$=".html"]'));

      return anchors.map((anchor) => {
        const card =
          anchor.closest('article') ||
          anchor.closest('li') ||
          anchor.closest('div[class*="product"]') ||
          anchor.parentElement;

        const img =
          card?.querySelector('img[src],img[data-src],img[srcset],img[data-srcset]') ||
          anchor.querySelector('img[src],img[data-src],img[srcset],img[data-srcset]');

        const srcset = img?.getAttribute('srcset') || img?.getAttribute('data-srcset') || '';
        const srcsetFirst = srcset.split(',')[0]?.trim()?.split(' ')[0] || '';

        const image =
          img?.getAttribute('src') ||
          img?.getAttribute('data-src') ||
          srcsetFirst ||
          '';

        return {
          name: text(anchor.innerText || anchor.textContent || ''),
          image,
        };
      });
    });

    const cardRows = cards.map((entry) => ({
      key: normalizeName(entry.name),
      image: entry.image,
      name: entry.name,
    }));

    const summary = failed.map((item) => {
      const hit =
        cardRows.find((row) => row.key === item.key) ||
        cardRows.find((row) => row.key.includes(item.key) || item.key.includes(row.key));

      return {
        name: item.name,
        foundOnListing: Boolean(hit),
        cardHasImage: Boolean(hit && hit.image),
        matchedCardName: hit?.name || '',
      };
    });

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
