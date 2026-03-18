#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);

const hasFlag = (flag) => args.includes(flag);

const getArgValue = (key, fallback = '') => {
  const index = args.findIndex((arg) => arg === key || arg.startsWith(`${key}=`));
  if (index < 0) return fallback;

  const token = args[index];
  if (token.includes('=')) {
    const [, value] = token.split('=');
    return (value || '').trim() || fallback;
  }

  return String(args[index + 1] || '').trim() || fallback;
};

const sourcePrefixes = (getArgValue('--from', 'home,women/saree/jamdani') || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const targetPrefix = getArgValue('--to', 'Bangladesh/Women/Saree/Jamdani Saree').replace(/\/+$/, '');
const shouldExecute = hasFlag('--execute');
const verbose = hasFlag('--verbose');
const moveLimitRaw = Number(getArgValue('--limit', '0'));
const moveLimit = Number.isFinite(moveLimitRaw) && moveLimitRaw > 0 ? Math.floor(moveLimitRaw) : 0;

const OUTPUT_MAP_PATH = path.join(__dirname, 'output', 'jamdani-cloudinary-upload-map.json');
const FRONTEND_DATA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'Frontend',
  'vite-project',
  'src',
  'data',
  'jamdani-sarees.json'
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

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const deriveSuffix = (publicId, fromPrefix) => {
  const normalizedFrom = fromPrefix.replace(/^\/+|\/+$/g, '');

  if (publicId.startsWith(`${normalizedFrom}/`)) {
    return publicId.slice(normalizedFrom.length + 1);
  }

  const jamdaniAnchor = publicId.toLowerCase().indexOf('/jamdani/');
  if (jamdaniAnchor >= 0) {
    return publicId.slice(jamdaniAnchor + '/jamdani/'.length);
  }

  if (publicId.toLowerCase().startsWith('jamdani/')) {
    return publicId.slice('jamdani/'.length);
  }

  const parts = publicId.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2).join('/');
  }

  return parts[0] || publicId;
};

const collectCandidates = async () => {
  const candidates = [];
  const seen = new Set();

  for (const fromPrefix of sourcePrefixes) {
    const resources = await listByPrefix(fromPrefix);

    for (const resource of resources) {
      const publicId = String(resource.public_id || '');
      const lowerId = publicId.toLowerCase();

      if (!lowerId.includes('jamdani')) continue;
      if (lowerId.startsWith(targetPrefix.toLowerCase() + '/')) continue;
      if (seen.has(publicId)) continue;

      const suffix = deriveSuffix(publicId, fromPrefix);
      const toPublicId = `${targetPrefix}/${suffix}`.replace(/\/+/g, '/');

      seen.add(publicId);
      candidates.push({
        fromPrefix,
        fromPublicId: publicId,
        toPublicId,
        oldSecureUrl: String(resource.secure_url || ''),
      });
    }
  }

  return candidates;
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

const updateJamdaniJson = async (replacements) => {
  const files = [OUTPUT_MAP_PATH, FRONTEND_DATA_PATH];
  const mapByPublicId = new Map(replacements.map((item) => [item.fromPublicId, item]));
  const mapByOldUrl = new Map(replacements.filter((item) => item.oldSecureUrl).map((item) => [item.oldSecureUrl, item]));

  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!node || typeof node !== 'object') return;

    if (typeof node.public_id === 'string' && mapByPublicId.has(node.public_id)) {
      const change = mapByPublicId.get(node.public_id);
      node.public_id = change.toPublicId;
      if (typeof node.secure_url === 'string') {
        node.secure_url = change.newSecureUrl || node.secure_url;
      }
    }

    if (typeof node.secure_url === 'string' && mapByOldUrl.has(node.secure_url)) {
      const change = mapByOldUrl.get(node.secure_url);
      node.secure_url = change.newSecureUrl || node.secure_url;
    }

    if (typeof node.thumbnail_url === 'string' && mapByOldUrl.has(node.thumbnail_url)) {
      const change = mapByOldUrl.get(node.thumbnail_url);
      node.thumbnail_url = change.newSecureUrl || node.thumbnail_url;
    }

    Object.values(node).forEach(visit);
  };

  for (const filePath of files) {
    const data = await readJsonIfExists(filePath);
    if (!data) continue;

    visit(data);
    await writeJsonPretty(filePath, data);
    console.log(`Updated references in: ${path.relative(path.join(__dirname, '..'), filePath)}`);
  }
};

const run = async () => {
  console.log(`Source prefixes: ${sourcePrefixes.join(', ')}`);
  console.log(`Target prefix:  ${targetPrefix}`);

  const candidates = await collectCandidates();
  console.log(`Found ${candidates.length} Jamdani assets to move.`);

  if (!candidates.length) {
    console.log('No move needed.');
    return;
  }

  const queue = moveLimit > 0 ? candidates.slice(0, moveLimit) : candidates;

  if (moveLimit > 0) {
    console.log(`Batch limit: ${moveLimit} (processing ${queue.length} this run)`);
  }

  queue.slice(0, 10).forEach((item) => {
    console.log(` - ${item.fromPublicId} -> ${item.toPublicId}`);
  });
  if (queue.length > 10) {
    console.log(` ... and ${queue.length - 10} more in this run`);
  }

  if (!shouldExecute) {
    console.log('Dry-run complete. Re-run with --execute to perform the move.');
    return;
  }

  let moved = 0;
  let failed = 0;
  for (const candidate of queue) {
    try {
      const result = await cloudinary.uploader.rename(candidate.fromPublicId, candidate.toPublicId, {
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        type: 'upload',
      });

      candidate.newSecureUrl = String(result?.secure_url || '');
      moved += 1;
      if (verbose) {
        console.log(`Moved (${moved}/${queue.length}): ${candidate.fromPublicId}`);
      }
    } catch (error) {
      failed += 1;
      if (verbose) {
        console.error(`Failed: ${candidate.fromPublicId} -> ${candidate.toPublicId}`);
        console.error(String(error?.message || error));
      }
    }
  }

  await updateJamdaniJson(queue.filter((item) => item.newSecureUrl));
  console.log(`Done. Moved ${moved}/${queue.length} assets this run. Failed: ${failed}.`);
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
