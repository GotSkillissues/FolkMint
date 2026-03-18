#!/usr/bin/env node

const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');

const prefixes = args
  .filter((arg) => !arg.startsWith('--'))
  .map((value) => String(value || '').trim())
  .filter(Boolean);

if (!prefixes.length) {
  console.error('Usage: node scripts/cloudinary-cleanup-prefixes.js [--delete] <prefix1> <prefix2> ...');
  process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing Cloudinary credentials in Backend/.env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const listResourcesByPrefix = async (prefix) => {
  const resources = [];
  let nextCursor;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 500,
      next_cursor: nextCursor,
    });

    if (Array.isArray(result.resources)) {
      resources.push(...result.resources);
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources;
};

const chunk = (arr, size) => {
  const out = [];
  for (let index = 0; index < arr.length; index += size) {
    out.push(arr.slice(index, index + size));
  }
  return out;
};

const run = async () => {
  let totalFound = 0;

  for (const prefix of prefixes) {
    if (prefix.toLowerCase().includes('jamdani')) {
      console.log(`SKIP prefix containing jamdani: ${prefix}`);
      continue;
    }

    const resources = await listResourcesByPrefix(prefix);
    totalFound += resources.length;
    console.log(`Prefix: ${prefix}`);
    console.log(`Found: ${resources.length}`);

    if (!resources.length) continue;

    const publicIds = resources.map((resource) => resource.public_id);

    if (!shouldDelete) {
      publicIds.slice(0, 10).forEach((id) => console.log(`  - ${id}`));
      if (publicIds.length > 10) console.log(`  ... and ${publicIds.length - 10} more`);
      continue;
    }

    const chunks = chunk(publicIds, 100);
    for (const ids of chunks) {
      await cloudinary.api.delete_resources(ids, { type: 'upload', resource_type: 'image' });
    }

    console.log(`Deleted: ${publicIds.length}`);
  }

  console.log(`Total matched across prefixes: ${totalFound}`);
  console.log(shouldDelete ? 'Delete mode complete.' : 'Dry-run complete.');
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
