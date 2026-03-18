#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OLD_PREFIX = 'FolkMint/Product/women/saree/muslin-saree';
const NEW_PREFIX = 'Bangladesh/Women/Saree/Muslin Saree';
const NEW_PREFIX_ENCODED = 'Bangladesh/Women/Saree/Muslin%20Saree';
const RENAME_TIMEOUT_MS = Number(process.env.MUSLIN_RENAME_TIMEOUT_MS || 30000);

const OUTPUT_MAP_PATH = path.join(__dirname, 'output', 'muslin-cloudinary-upload-map.json');
const FRONTEND_DATA_PATH = path.join(
	__dirname,
	'..',
	'..',
	'Frontend',
	'vite-project',
	'src',
	'data',
	'muslin.json'
);

const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
for (const key of requiredEnv) {
	if (!process.env[key]) {
		console.error(`Missing ${key} in Backend/.env`);
		process.exit(1);
	}
}

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT || 5432),
	database: process.env.DB_NAME || 'folkmint',
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
});

const listByPrefix = async (prefix) => {
	const resources = [];
	let nextCursor;

	do {
		const response = await cloudinary.api.resources({
			type: 'upload',
			prefix,
			max_results: 500,
			resource_type: 'image',
			next_cursor: nextCursor,
		});

		if (Array.isArray(response.resources)) {
			resources.push(...response.resources);
		}

		nextCursor = response.next_cursor;
	} while (nextCursor);

	return resources;
};

const readJsonIfExists = async (filePath) => {
	try {
		const text = await fs.readFile(filePath, 'utf8');
		return JSON.parse(text);
	} catch {
		return null;
	}
};

const writeJsonPretty = async (filePath, data) => {
	await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

const replaceStringPaths = (value) => {
	if (typeof value !== 'string') return value;

	let next = value.split(OLD_PREFIX).join(NEW_PREFIX);
	if (next.startsWith('http://') || next.startsWith('https://')) {
		next = next.split(NEW_PREFIX).join(NEW_PREFIX_ENCODED);
	}

	return next;
};

const walkAndReplace = (node) => {
	if (Array.isArray(node)) return node.map(walkAndReplace);
	if (!node || typeof node !== 'object') return replaceStringPaths(node);

	const output = {};
	for (const [key, value] of Object.entries(node)) {
		output[key] = walkAndReplace(value);
	}

	return output;
};

const updateJsonFiles = async () => {
	for (const filePath of [OUTPUT_MAP_PATH, FRONTEND_DATA_PATH]) {
		const data = await readJsonIfExists(filePath);
		if (!data) continue;

		const updated = walkAndReplace(data);
		await writeJsonPretty(filePath, updated);
		console.log(`Updated JSON: ${path.relative(path.join(__dirname, '..', '..'), filePath)}`);
	}
};

const updateDatabase = async () => {
	const client = await pool.connect();

	try {
		const result = await client.query(
			`UPDATE product_image
			 SET image_url = REPLACE(image_url, $1, $2)
			 WHERE image_url LIKE $3
			 RETURNING image_id`,
			[OLD_PREFIX, NEW_PREFIX_ENCODED, `%${OLD_PREFIX}%`]
		);

		console.log(`Updated DB rows: ${result.rowCount}`);
	} finally {
		client.release();
	}
};

const renameWithTimeout = async (fromPublicId, toPublicId, timeoutMs = RENAME_TIMEOUT_MS) => {
	return Promise.race([
		cloudinary.uploader.rename(fromPublicId, toPublicId, {
			overwrite: true,
			invalidate: true,
			resource_type: 'image',
			type: 'upload',
		}),
		new Promise((_, reject) => {
			setTimeout(() => reject(new Error(`Rename timeout after ${timeoutMs}ms`)), timeoutMs);
		}),
	]);
};

const run = async () => {
	const resources = await listByPrefix(OLD_PREFIX);
	console.log(`Found assets to move: ${resources.length}`);

	let moved = 0;
	let failed = 0;

	for (const resource of resources) {
		const currentIndex = moved + failed + 1;
		const fromPublicId = String(resource.public_id || '');
		const suffix = fromPublicId.slice(OLD_PREFIX.length + 1);
		const toPublicId = `${NEW_PREFIX}/${suffix}`;
		console.log(`[${currentIndex}/${resources.length}] ${fromPublicId}`);

		try {
			await renameWithTimeout(fromPublicId, toPublicId);
			moved += 1;
		} catch (error) {
			failed += 1;
			console.error(`Failed move: ${fromPublicId} -> ${toPublicId}`);
			console.error(String(error?.message || error));
		}
	}

	console.log(`Moved: ${moved}, Failed: ${failed}`);

	await updateJsonFiles();
	await updateDatabase();
	await pool.end();

	console.log('Muslin asset move + sync complete.');
};

run().catch(async (error) => {
	console.error(String(error?.message || error));
	await pool.end().catch(() => {});
	process.exit(1);
});
