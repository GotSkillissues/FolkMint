# Migration Skill (Reusable Product Import)

This skill is now generic for product collections from compatible ecommerce listing pages.

Pipeline:

1. Scrape listing URL and product URLs
2. Scrape product details (SKU, description, image candidates, size options)
3. Validate/download images
4. Upload images to Cloudinary
5. Upsert product + variants + images into DB
6. Generate output JSON map + frontend data file

Cloudinary folder structure follows category hierarchy, e.g.:

`FolkMint/Product/women/saree/jamdani-saree`

## Quick usage

```bash
npm run migrate:skill -- --url "https://www.aarong.com/bgd/women/saree?base_fabric=11655&product_list_order=low_to_high" --hierarchy "Women/Saree/Jamdani Saree" --prefix "jamdani"
```

## Options

- `--url` (required): listing URL to scrape
- `--hierarchy`: category path (e.g. `Women/Saree/Jamdani Saree`)
- `--category`: target subcategory name to create/update
- `--parent`: parent category name
- `--folder`: Cloudinary folder base (defaults to `FolkMint/Product/<hierarchy...>`)
- `--keyword`: filter keyword for product name/href matching (optional; empty means no keyword filter)
- `--prefix`: output product id prefix and output filename prefix
- `--output-map`: custom output map JSON filename in `Backend/scripts/output/`
- `--output-frontend`: custom frontend JSON filename in `Frontend/vite-project/src/data/`
- `--limit`: max product count (default `40`)
- `--max-images`: max images per product (default `3`)

## Data persisted

- `product`: name, description, base price, category
- `product_variant`: SKU (if found), size variants (if found), price, stock
- `product_image`: Cloudinary URLs (primary + secondary)

## Example (Muslin)

```bash
npm run migrate:skill -- --url "https://www.aarong.com/bgd/women/saree?base_fabric=11657" --hierarchy "Women/Saree/Muslin Saree" --prefix "muslin"
```
