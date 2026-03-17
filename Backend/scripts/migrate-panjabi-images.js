#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LISTING_URL =
	process.env.MIGRATE_LISTING_URL ||
	'https://www.aarong.com/bgd/women/saree?base_fabric=11655&product_list_order=low_to_high';
const PRODUCT_LIMIT = Number(process.env.MIGRATE_PRODUCT_LIMIT || 40);
const MAX_IMAGES_PER_PRODUCT = Number(process.env.MIGRATE_MAX_IMAGES || 3);
const CATEGORY_HIERARCHY_RAW = process.env.MIGRATE_CATEGORY_HIERARCHY || '';
const ROOT_CLOUDINARY_FOLDER = process.env.MIGRATE_ROOT_CLOUDINARY_FOLDER || 'FolkMint/Product';
let CLOUDINARY_FOLDER_BASE = process.env.MIGRATE_CLOUDINARY_FOLDER || '';
let CATEGORY_NAME = process.env.MIGRATE_CATEGORY_NAME || 'Imported Collection';
let PARENT_CATEGORY_NAME = process.env.MIGRATE_PARENT_CATEGORY_NAME || 'Uncategorized';
const COLLECTION_ID_PREFIX = process.env.MIGRATE_COLLECTION_ID_PREFIX || 'collection';
const COLLECTION_KEYWORD = String(process.env.MIGRATE_COLLECTION_KEYWORD || '').toLowerCase();
const OUTPUT_MAP_FILENAME = process.env.MIGRATE_OUTPUT_MAP_FILENAME || 'jamdani-cloudinary-upload-map.json';
const OUTPUT_FRONTEND_FILENAME = process.env.MIGRATE_OUTPUT_FRONTEND_FILENAME || 'jamdani-sarees.json';
const DEFAULT_STOCK = 20;
const DEFAULT_COLOR = 'As listed';
const DEFAULT_SIZE = 'One Size';
const SOURCE_MARKER = '[source_url:';

const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_MAP_PATH = path.join(OUTPUT_DIR, OUTPUT_MAP_FILENAME);
const OUTPUT_FRONTEND_DATA_PATH = path.join(
	__dirname,
	'..',
	'..',
	'Frontend',
	'vite-project',
	'src',
	'data',
	OUTPUT_FRONTEND_FILENAME
);

const textContent = (element) =>
	(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();

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

const parseHierarchySegments = (value) =>
	String(value || '')
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean);

const deriveSettingsFromHierarchy = () => {
	const hierarchySegments = parseHierarchySegments(CATEGORY_HIERARCHY_RAW);

	if (!CATEGORY_NAME && hierarchySegments.length > 0) {
		CATEGORY_NAME = hierarchySegments[hierarchySegments.length - 1];
	}

	if (!PARENT_CATEGORY_NAME && hierarchySegments.length > 1) {
		PARENT_CATEGORY_NAME = hierarchySegments[hierarchySegments.length - 2];
	}

	if (!CLOUDINARY_FOLDER_BASE) {
		const fallbackSegments = hierarchySegments.length > 0
			? hierarchySegments
			: [PARENT_CATEGORY_NAME, CATEGORY_NAME].filter(Boolean);

		const normalizedHierarchy = fallbackSegments.map((segment) => slugify(segment)).filter(Boolean).join('/');
		CLOUDINARY_FOLDER_BASE = normalizedHierarchy
			? `${ROOT_CLOUDINARY_FOLDER}/${normalizedHierarchy}`
			: `${ROOT_CLOUDINARY_FOLDER}/${slugify(CATEGORY_NAME) || 'collection'}`;
	}
};

const parsePrice = (priceText) => {
	if (!priceText) return null;
	const numeric = priceText.replace(/[^\d.]/g, '');
	return numeric ? Number(numeric) : null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const IMAGE_MIN_BYTES = 8 * 1024;

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

const getImageCandidatePriority = (url = '') => {
	const normalized = String(url || '').toLowerCase();

	if (/\/[a-z0-9]{13}\.jpg(?:\?|$)/i.test(normalized)) return 0;
	if (/\/[a-z0-9]{13}_1\.jpg(?:\?|$)/i.test(normalized)) return 1;
	if (/\/[a-z0-9]{13}_2\.jpg(?:\?|$)/i.test(normalized)) return 2;
	if (/\/[a-z0-9]{13}_3\.jpg(?:\?|$)/i.test(normalized)) return 3;
	if (normalized.includes('mcprod.aarong.com') && normalized.endsWith('.jpg')) return 4;
	if (normalized.endsWith('.webp')) return 5;
	if (normalized.endsWith('.jpeg')) return 6;
	if (normalized.endsWith('.png')) return 7;

	return 99;
};

const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 5432),
	database: process.env.DB_NAME || 'folkmint',
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
});

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

const downloadImageBuffer = async (url) => {
	const response = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			Referer: 'https://www.aarong.com/',
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to download image (${response.status})`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return {
		buffer: Buffer.from(arrayBuffer),
		contentType: response.headers.get('content-type') || '',
		contentLength: Number(response.headers.get('content-length') || 0),
	};
};

const fetchProductOgImage = async (productUrl) => {
	try {
		const response = await fetch(productUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			},
		});

		if (!response.ok) return '';
		const html = await response.text();

		const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
		if (ogImageMatch?.[1]) {
			return normalizeImageUrl(ogImageMatch[1]);
		}

		const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
		if (twitterImageMatch?.[1]) {
			return normalizeImageUrl(twitterImageMatch[1]);
		}
	} catch {
		return '';
	}

	return '';
};

const extractProductCode = (productUrl) => {
	const match = productUrl.match(/-(\d{13})\.html$/i);
	return match?.[1] || '';
};

const buildCodeBasedImageCandidates = (code) => {
	if (!code || code.length < 2) return [];
	const first = code[0];
	const second = code[1];
	const base = `https://mcprod.aarong.com/media/catalog/product/${first}/${second}/${code}`;
	return [
		`${base}.jpg`,
		`${base}_1.jpg`,
		`${base}_2.jpg`,
		`${base}_3.jpg`,
	];
};

const fetchProductPageImages = async (productUrl) => {
	try {
		const response = await fetch(productUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			},
		});

		if (!response.ok) return [];
		const html = await response.text();

		const regex = /https:\/\/mcprod\.aarong\.com\/media\/catalog\/product\/[^"'\s>]+\.(jpg|jpeg|png|webp)/gi;
		const matches = html.match(regex) || [];
		const normalizedMatches = uniqueValues(matches.map((match) => normalizeImageUrl(match)));

		return normalizedMatches;
	} catch {
		return [];
	}
};

const extractMetaDescription = (html) => {
	const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
	if (metaMatch?.[1]) return String(metaMatch[1]).replace(/\s+/g, ' ').trim();
	return '';
};

const extractSkuFromHtml = (html) => {
	const skuPatterns = [
		/"sku"\s*:\s*"([^"]+)"/i,
		/data-product-sku=["']([^"']+)["']/i,
		/SKU\s*[:#]\s*<[^>]*>\s*([^<\s][^<]*)</i,
		/SKU\s*[:#]\s*([A-Za-z0-9\-_.]+)/i,
	];

	for (const pattern of skuPatterns) {
		const match = html.match(pattern);
		if (match?.[1]) return String(match[1]).trim();
	}

	return '';
};

const extractSizesFromHtml = (html) => {
	const sizes = [];
	const seen = new Set();

	const addSize = (value) => {
		const size = String(value || '').replace(/\s+/g, ' ').trim();
		if (!size || seen.has(size.toLowerCase())) return;
		seen.add(size.toLowerCase());
		sizes.push(size);
	};

	const sizeJsonRegex = /"size"\s*:\s*"([^"]+)"/gi;
	let match;
	while ((match = sizeJsonRegex.exec(html)) !== null) addSize(match[1]);

	const optionRegex = /<option[^>]*>([^<]+)<\/option>/gi;
	while ((match = optionRegex.exec(html)) !== null) {
		const optionText = String(match[1] || '').trim();
		if (/^(select|choose)/i.test(optionText)) continue;
		if (optionText.length <= 20) addSize(optionText);
	}

	return sizes;
};

const fetchProductDetails = async (productUrl) => {
	try {
		const response = await fetch(productUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			},
		});

		if (!response.ok) return {};
		const html = await response.text();

		const description = extractMetaDescription(html);
		const sku = extractSkuFromHtml(html);
		const sizes = extractSizesFromHtml(html);
		const imageUrls = await fetchProductPageImages(productUrl);

		return {
			description,
			sku,
			sizes,
			source_image_urls: imageUrls,
		};
	} catch {
		return {};
	}
};

const resolveSourceImages = async (item) => {
	const candidates = [];
	if (item.thumbnail_url) candidates.push(item.thumbnail_url);
	if (Array.isArray(item.source_image_urls)) candidates.push(...item.source_image_urls);

	const code = extractProductCode(item.product_url);
	const codeCandidates = buildCodeBasedImageCandidates(code);
	candidates.push(...codeCandidates);

	const fromProductHtml = await fetchProductPageImages(item.product_url);
	candidates.push(...fromProductHtml);

	const fromOg = await fetchProductOgImage(item.product_url);
	if (fromOg) candidates.push(fromOg);

	const uniqueCandidates = uniqueValues(candidates.map((value) => normalizeImageUrl(value)));
	const prioritizedCandidates = uniqueCandidates
		.filter(Boolean)
		.sort((a, b) => getImageCandidatePriority(a) - getImageCandidatePriority(b));
	const resolved = [];

	for (const candidate of prioritizedCandidates) {
		try {
			const downloaded = await downloadImageBuffer(candidate);
			const contentType = String(downloaded.contentType || '').toLowerCase();
			const isImageContentType = contentType.startsWith('image/');
			const hasValidSignature = hasImageMagicSignature(downloaded.buffer);
			const byteSize = downloaded.contentLength || downloaded.buffer.length;

			if (!isImageContentType || !hasValidSignature || byteSize < IMAGE_MIN_BYTES) {
				continue;
			}

			resolved.push({ source_url: candidate, buffer: downloaded.buffer });
			if (resolved.length >= MAX_IMAGES_PER_PRODUCT) break;
		} catch {
			// continue to next candidate
		}
	}

	return resolved;
};

const extractProductHandle = (productUrl) => {
	const value = productUrl.split('/').pop() || '';
	return value.replace(/\.html$/i, '');
};

const scrapeWithPlaywright = async () => {
	let playwright;

	try {
		playwright = require('playwright');
	} catch {
		throw new Error(
			'Playwright is required for this scraper. Install it with: npm install --save-dev playwright'
		);
	}

	const browser = await playwright.chromium.launch({ headless: true });

	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 2600 } });
		await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
		await page.waitForTimeout(3000);

		let stableChecks = 0;
		let lastCount = 0;

		while (stableChecks < 5) {
			const count = await page.evaluate(
				() => document.querySelectorAll('a[href*="/bgd/"][href$=".html"]').length
			);

			if (count >= PRODUCT_LIMIT * 2) break;

			await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
			await page.waitForTimeout(1800);

			if (count === lastCount) {
				stableChecks += 1;
			} else {
				stableChecks = 0;
				lastCount = count;
			}
		}

		const all = await page.evaluate((collectionKeyword) => {
			const textContentLocal = (element) =>
				(element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();

			const priceRegex = /Tk\s?[\d,]+(?:\.\d{1,2})?/i;

			const anchors = Array.from(document.querySelectorAll('a[href*="/bgd/"][href$=".html"]'));
			const results = [];

			for (const link of anchors) {
				const href = link.getAttribute('href') || '';
				const name = textContentLocal(link);

				if (collectionKeyword && !name.toLowerCase().includes(collectionKeyword) && !href.toLowerCase().includes(collectionKeyword)) {
					continue;
				}

				const card =
					link.closest('article') ||
					link.closest('li') ||
					link.closest('div[class*="product"]') ||
					link.parentElement;

				const img =
					card?.querySelector('img[src],img[data-src],img[srcset],img[data-srcset]') ||
					link.querySelector('img[src],img[data-src],img[srcset]');

				const imageCandidate =
					img?.getAttribute('src') ||
					img?.getAttribute('data-src') ||
					(img?.getAttribute('data-srcset') || '').split(',')[0]?.trim()?.split(' ')[0] ||
					(img?.getAttribute('srcset') || '').split(',')[0]?.trim()?.split(' ')[0] ||
					'';

				const cardText = textContentLocal(card);
				const priceMatch = cardText.match(priceRegex);

				if (!name || !href) continue;

				results.push({
					name,
					product_url: href,
					thumbnail_url: imageCandidate,
					price_text: priceMatch ? priceMatch[0] : '',
				});
			}

			return results;
		}, COLLECTION_KEYWORD);

		return all;
	} finally {
		await browser.close();
	}
};

const dedupeProducts = (products) => {
	const seen = new Set();
	const deduped = [];

	for (const item of products) {
		const productUrl = toAbsoluteUrl(item.product_url);
		const key = productUrl || `${item.name}-${item.price_text}`;

		if (!key || seen.has(key)) continue;
		seen.add(key);

		deduped.push({
			...item,
			product_url: productUrl,
			thumbnail_url: normalizeImageUrl(item.thumbnail_url),
			price_text: (item.price_text || '').trim(),
			handle: extractProductHandle(productUrl),
		});
	}

	return deduped;
};

const ensureCategory = async () => {
	const hierarchySegments = parseHierarchySegments(CATEGORY_HIERARCHY_RAW);
	const chain = hierarchySegments.length > 0
		? hierarchySegments
		: [PARENT_CATEGORY_NAME, CATEGORY_NAME].filter(Boolean);

	let parentCategoryId = null;
	let lastCategoryId = null;

	for (const segment of chain) {
		const existing = await pool.query(
			`SELECT category_id
			 FROM category
			 WHERE LOWER(name) = LOWER($1)
			   AND ((parent_category IS NULL AND $2::int IS NULL) OR parent_category = $2)
			 LIMIT 1`,
			[segment, parentCategoryId]
		);

		if (existing.rows.length > 0) {
			lastCategoryId = existing.rows[0].category_id;
			parentCategoryId = lastCategoryId;
			continue;
		}

		const inserted = await pool.query(
			`INSERT INTO category (name, description, parent_category)
			 VALUES ($1, $2, $3)
			 RETURNING category_id`,
			[segment, `Imported ${segment} collection`, parentCategoryId]
		);

		lastCategoryId = inserted.rows[0].category_id;
		parentCategoryId = lastCategoryId;
	}

	return lastCategoryId;
};

const upsertProductWithImage = async (item, categoryId) => {
	const sourceTag = `${SOURCE_MARKER}${item.product_url}]`;
	const userDescription = String(item.description || '').trim();
	const description = `${userDescription || `${item.name} imported from source.`} ${sourceTag}`;
	const numericPrice = parsePrice(item.price_text) || 0;

	let productId;
	const existing = await pool.query(
		`SELECT product_id FROM product WHERE description ILIKE $1 LIMIT 1`,
		[`%${sourceTag}%`]
	);

	if (existing.rows.length > 0) {
		productId = existing.rows[0].product_id;
		await pool.query(
			`UPDATE product
			 SET name = $1, description = $2, base_price = $3, stock_quantity = $4, category_id = $5, updated_at = NOW()
			 WHERE product_id = $6`,
			[item.name, description, numericPrice, DEFAULT_STOCK, categoryId, productId]
		);
	} else {
		const inserted = await pool.query(
			`INSERT INTO product (name, description, base_price, stock_quantity, category_id)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING product_id`,
			[item.name, description, numericPrice, DEFAULT_STOCK, categoryId]
		);
		productId = inserted.rows[0].product_id;
	}

	const sizes = Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : [DEFAULT_SIZE];
	let firstVariantId = null;

	for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex += 1) {
		const sizeLabel = String(sizes[sizeIndex] || DEFAULT_SIZE).trim() || DEFAULT_SIZE;
		const baseSku = String(item.sku || '').trim();
		const generatedSku = baseSku
			? sizes.length > 1
				? `${baseSku}-${slugify(sizeLabel).toUpperCase()}`
				: baseSku
			: `${slugify(item.name).toUpperCase()}-${slugify(sizeLabel).toUpperCase()}`;

		let variantResult;
		try {
			variantResult = await pool.query(
				`INSERT INTO product_variant (variant_name, sku, size, color, price, stock_quantity, product_id)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (product_id, size, color)
				 DO UPDATE SET
					variant_name = EXCLUDED.variant_name,
					sku = EXCLUDED.sku,
					price = EXCLUDED.price,
					stock_quantity = EXCLUDED.stock_quantity,
					updated_at = NOW()
				 RETURNING variant_id`,
				[item.name, generatedSku, sizeLabel, DEFAULT_COLOR, numericPrice, DEFAULT_STOCK, productId]
			);
		} catch {
			variantResult = await pool.query(
				`INSERT INTO product_variant (variant_name, size, color, price, stock_quantity, product_id)
				 VALUES ($1, $2, $3, $4, $5, $6)
				 ON CONFLICT (product_id, size, color)
				 DO UPDATE SET
					variant_name = EXCLUDED.variant_name,
					price = EXCLUDED.price,
					stock_quantity = EXCLUDED.stock_quantity,
					updated_at = NOW()
				 RETURNING variant_id`,
				[item.name, sizeLabel, DEFAULT_COLOR, numericPrice, DEFAULT_STOCK, productId]
			);
		}

		const variantId = variantResult.rows[0].variant_id;
		if (!firstVariantId) firstVariantId = variantId;

		const imageUrls = Array.isArray(item.images)
			? item.images.map((img) => img?.secure_url).filter(Boolean)
			: item.cloudinary?.secure_url
				? [item.cloudinary.secure_url]
				: [];

		if (imageUrls.length > 0) {
			await pool.query(`DELETE FROM product_image WHERE variant_id = $1`, [variantId]);

			for (let imageIndex = 0; imageIndex < imageUrls.length; imageIndex += 1) {
				await pool.query(
					`INSERT INTO product_image (image_url, is_primary, variant_id)
					 VALUES ($1, $2, $3)`,
					[imageUrls[imageIndex], imageIndex === 0, variantId]
				);
			}
		}
	}

	item.product_id = productId;
	item.variant_id = firstVariantId;
};

const processAndUpload = async (products) => {
	const selected = products.slice(0, PRODUCT_LIMIT);
	const processed = [];

	for (let index = 0; index < selected.length; index += 1) {
		const item = selected[index];
		const details = await fetchProductDetails(item.product_url);
		const mergedItem = {
			...item,
			description: details.description || item.description || '',
			sku: details.sku || item.sku || '',
			sizes: Array.isArray(details.sizes) ? details.sizes : Array.isArray(item.sizes) ? item.sizes : [],
			source_image_urls: uniqueValues([
				...(Array.isArray(details.source_image_urls) ? details.source_image_urls : []),
				...(Array.isArray(item.source_image_urls) ? item.source_image_urls : []),
			]),
		};
		const productSlug = item.handle || slugify(item.name);
		const basePublicId = `${CLOUDINARY_FOLDER_BASE}/${productSlug}`;
		const resolvedSourceImages = await resolveSourceImages(mergedItem);

		const outputItem = {
			id: `${COLLECTION_ID_PREFIX}-${String(index + 1).padStart(2, '0')}`,
			name: mergedItem.name,
			description: mergedItem.description,
			sku: mergedItem.sku,
			sizes: mergedItem.sizes,
			price_text: mergedItem.price_text,
			price: parsePrice(mergedItem.price_text),
			product_url: mergedItem.product_url,
			source_thumbnail_url: resolvedSourceImages[0]?.source_url || '',
			source_image_urls: resolvedSourceImages.map((entry) => entry.source_url),
			cloudinary: {
				folder: CLOUDINARY_FOLDER_BASE,
				public_id: `${basePublicId}/thumb`,
			},
			images: [],
		};

		try {
			if (!resolvedSourceImages.length) {
				throw new Error('Missing product image URLs');
			}

			for (let imageIndex = 0; imageIndex < resolvedSourceImages.length; imageIndex += 1) {
				const imageInfo = resolvedSourceImages[imageIndex];
				const publicId =
					imageIndex === 0
						? `${basePublicId}/thumb`
						: `${basePublicId}/${String(imageIndex + 1).padStart(2, '0')}`;

				const uploaded = await uploadBufferToCloudinary(imageInfo.buffer, publicId);
				outputItem.images.push({
					source_url: imageInfo.source_url,
					secure_url: uploaded.secure_url,
					public_id: uploaded.public_id,
					is_primary: imageIndex === 0,
				});
			}

			outputItem.cloudinary.secure_url = outputItem.images[0]?.secure_url || '';
			outputItem.thumbnail_url = outputItem.images[0]?.secure_url || '';
			outputItem.status = 'uploaded';
		} catch (error) {
			outputItem.status = 'upload_failed';
			outputItem.error = error.message;
			outputItem.thumbnail_url = resolvedSourceImages[0]?.source_url || '';
		}

		processed.push(outputItem);
		await sleep(150);
	}

	return processed;
};

const buildOutput = (results) => {
	return {
		generated_at: new Date().toISOString(),
		listing_url: LISTING_URL,
		cloudinary_folder_base: CLOUDINARY_FOLDER_BASE,
		product_count: results.length,
		results,
	};
};

const writeOutputs = async (output) => {
	await fs.mkdir(OUTPUT_DIR, { recursive: true });
	await fs.mkdir(path.dirname(OUTPUT_FRONTEND_DATA_PATH), { recursive: true });

	await fs.writeFile(OUTPUT_MAP_PATH, JSON.stringify(output, null, 2), 'utf8');
	await fs.writeFile(OUTPUT_FRONTEND_DATA_PATH, JSON.stringify(output.results, null, 2), 'utf8');
};

const run = async () => {
	deriveSettingsFromHierarchy();
	configureCloudinary();

	const scraped = await scrapeWithPlaywright();
	const cleaned = dedupeProducts(scraped);

	if (!cleaned.length) {
		throw new Error(`No ${CATEGORY_NAME} products were extracted from the listing page.`);
	}

	const uploaded = await processAndUpload(cleaned);
	const categoryId = await ensureCategory();

	for (const item of uploaded) {
		if (item.status !== 'uploaded' || !item.images?.length) continue;
		await upsertProductWithImage(item, categoryId);
	}

	const output = buildOutput(uploaded);
	await writeOutputs(output);

	const insertedCount = uploaded.filter((item) => item.product_id).length;
	const uploadCount = uploaded.filter((item) => item.status === 'uploaded').length;

	console.log(`Extracted ${cleaned.length} ${CATEGORY_NAME} entries.`);
	console.log(`Uploaded thumbnails: ${uploadCount}/${uploaded.length}`);
	console.log(`DB upserted products: ${insertedCount}`);
	console.log(`Category ID used: ${categoryId}`);
	console.log(`Saved map: ${OUTPUT_MAP_PATH}`);
	console.log(`Saved frontend data: ${OUTPUT_FRONTEND_DATA_PATH}`);
	await pool.end();
};

run().catch((error) => {
	console.error(error.message || error);
	pool.end().catch(() => {});
	process.exit(1);
});
