#!/usr/bin/env node

const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary credentials are missing in Backend/.env');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER_PATHS = [
  'Bangladesh',
  'Bangladesh/Men',
  'Bangladesh/Men/Panjabi',
  'Bangladesh/Men/Kurta',
  'Bangladesh/Men/Fotua',
  'Bangladesh/Men/Shirt',
  'Bangladesh/Men/Pajama',

  'Bangladesh/Women',
  'Bangladesh/Women/Saree',
  'Bangladesh/Women/Saree/Jamdani Saree',
  'Bangladesh/Women/Saree/Cotton Saree',
  'Bangladesh/Women/Saree/Silk Saree',
  'Bangladesh/Women/Saree/Muslin Saree',
  'Bangladesh/Women/Shalwars',
  'Bangladesh/Women/Kurti',
  'Bangladesh/Women/Shawls',

  'Bangladesh/Home Decor - Showpieces',
  'Bangladesh/Home Decor - Showpieces/Jute Showpieces',
  'Bangladesh/Home Decor - Showpieces/Wall Hanging',
  'Bangladesh/Home Decor - Showpieces/Decorative Plates',
  'Bangladesh/Home Decor - Showpieces/Vases',
  'Bangladesh/Home Decor - Showpieces/Clay Crafts',
  'Bangladesh/Home Decor - Showpieces/Wooden Crafts',
  'Bangladesh/Home Decor - Showpieces/Terracotta',
  'Bangladesh/Home Decor - Showpieces/Lanterns - Decorative Lights',

  'Bangladesh/Handicrafts',
  'Bangladesh/Handicrafts/Nakshi Kantha',
  'Bangladesh/Handicrafts/Jute Products',
  'Bangladesh/Handicrafts/Bamboo Crafts',
  'Bangladesh/Handicrafts/Cane Crafts',
  'Bangladesh/Handicrafts/Handmade Baskets',
  'Bangladesh/Handicrafts/Mats',
  'Bangladesh/Handicrafts/Embroidered Crafts',

  'Bangladesh/Bags and Accessories',
  'Bangladesh/Bags and Accessories/Jute Bag',
  'Bangladesh/Bags and Accessories/Tote Bag',
  'Bangladesh/Bags and Accessories/Handbag',

  'Bangladesh/Gift Cards',
];

const ensureFolder = async (folderPath) => {
  try {
    await cloudinary.api.create_folder(folderPath);
    console.log(`Created: ${folderPath}`);
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    const alreadyExists = message.includes('already exists');

    if (alreadyExists) {
      console.log(`Exists:  ${folderPath}`);
      return;
    }

    throw error;
  }
};

const run = async () => {
  for (const folderPath of FOLDER_PATHS) {
    await ensureFolder(folderPath);
  }

  console.log(`Done. Ensured ${FOLDER_PATHS.length} folders.`);
};

run().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
