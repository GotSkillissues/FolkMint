#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');
const { URL } = require('url');

const args = process.argv.slice(2);
const options = {};

for (let index = 0; index < args.length; index += 1) {
	const token = args[index];
	if (!token.startsWith('--')) continue;
	const key = token.slice(2);
	const next = args[index + 1];
	if (!next || next.startsWith('--')) {
		options[key] = 'true';
	} else {
		options[key] = next;
		index += 1;
	}
}

const listingUrl = options.url || options.listing;
if (!listingUrl) {
	console.error('Usage: node scripts/run-migration-skill.js --url <listing_url> [--hierarchy "Women/Saree/Jamdani Saree"] [--category "Name"] [--parent "Parent"] [--folder "FolkMint/Product/women/saree/jamdani-saree"] [--keyword "search"] [--prefix "id-prefix"] [--output-map "file.json"] [--output-frontend "file.json"] [--limit 40]');
	process.exit(1);
}

const toTitleCase = (value) =>
	String(value || '')
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

const slugSegment = (value) =>
	String(value || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');

const inferHierarchyFromUrl = (urlValue) => {
	try {
		const parsed = new URL(urlValue);
		const pathParts = parsed.pathname
			.split('/')
			.filter(Boolean)
			.filter((segment) => segment.toLowerCase() !== 'bgd')
			.filter((segment) => !segment.endsWith('.html'))
			.map((segment) => toTitleCase(segment));

		return pathParts.length > 0 ? pathParts : ['Uncategorized'];
	} catch {
		return ['Uncategorized'];
	}
};

const inferredHierarchySegments = inferHierarchyFromUrl(listingUrl);
const hierarchySegments = (options.hierarchy
	? String(options.hierarchy).split('/').map((segment) => segment.trim()).filter(Boolean)
	: inferredHierarchySegments);

const categoryName = options.category || hierarchySegments[hierarchySegments.length - 1] || 'Imported Collection';
const parentCategoryName = options.parent || hierarchySegments[hierarchySegments.length - 2] || 'Uncategorized';
const prefix = options.prefix || slugSegment(categoryName) || 'collection';
const keyword = options.keyword || '';
const cloudFolder = options.folder || `FolkMint/Product/${hierarchySegments.map((segment) => slugSegment(segment)).filter(Boolean).join('/')}`;
const categoryHierarchy = hierarchySegments.join('/');

const env = {
	...process.env,
	MIGRATE_LISTING_URL: listingUrl,
	MIGRATE_CATEGORY_HIERARCHY: categoryHierarchy,
	MIGRATE_CATEGORY_NAME: categoryName,
	MIGRATE_PARENT_CATEGORY_NAME: parentCategoryName,
	MIGRATE_CLOUDINARY_FOLDER: cloudFolder,
	MIGRATE_ROOT_CLOUDINARY_FOLDER: 'FolkMint/Product',
	MIGRATE_COLLECTION_KEYWORD: keyword,
	MIGRATE_COLLECTION_ID_PREFIX: prefix,
	MIGRATE_OUTPUT_MAP_FILENAME: options['output-map'] || `${prefix}-cloudinary-upload-map.json`,
	MIGRATE_OUTPUT_FRONTEND_FILENAME: options['output-frontend'] || `${prefix}.json`,
	MIGRATE_PRODUCT_LIMIT: options.limit || '40',
	MIGRATE_MAX_IMAGES: options['max-images'] || '3',
};

const migrateScriptPath = path.join(__dirname, 'migrate-panjabi-images.js');
const result = spawnSync('node', [migrateScriptPath], {
	cwd: path.join(__dirname, '..'),
	stdio: 'inherit',
	env,
});

if (result.error) {
	console.error(result.error.message || result.error);
	process.exit(1);
}

process.exit(result.status || 0);
