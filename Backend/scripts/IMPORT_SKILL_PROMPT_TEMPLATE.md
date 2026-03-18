# FolkMint Full Import Skill Prompt (Reusable)

Use this prompt when you want a full production-like category import from an ecommerce listing URL into FolkMint.

```text
I will provide you with:

1. a category listing URL from an ecommerce website
2. the target Folkmint leaf category in the heirarchy for that URL

Your task is to fully import that category into my Folkmint full-stack project and make it production-like and deployable in behavior.

Input:
- Source URL: <PASTE_URL_HERE>
- Target category hierarchy: <PASTE_CATEGORY_HERE>
  Example: Women/Saree/Muslin Saree

What you must do:

1. Scrape the listing page
- Open the given category/listing URL
- Collect product URLs from that listing
- Support pagination, lazy loading, or infinite scroll if present
- Limit scraping only to products belonging to that category

2. Scrape each product page
For every product found, extract:
- product name
- source product URL
- SKU or product code if available
- price
- discounted price if available
- description/details
- specifications
- material/fabric if available
- sizes if available
- colors if available
- stock status if available
- thumbnail image URL
- all product image URLs from the product page/gallery
- any relevant product attributes needed for display on the website

3. Process images
- Download all valid product images, starting from the thumbnail through all product detail/gallery images
- Validate that the images are real product images, not logos, icons, or banners
- Remove duplicates where possible
- Upload all valid images to Cloudinary
- Store them in a folder structure based on the given category hierarchy

Example folder structure:
FolkMint/Product/<category hierarchy in lowercase with slugs>

Example:
FolkMint/Product/women/saree/muslin-saree

4. Store data in database
- Insert or update product data in my project database
- Store product metadata in the proper category/subcategory/child-category structure
- Store Cloudinary image URLs and public IDs in the product images table
- Store size/color variants in the variants table if available
- Avoid duplicate product creation
- Use upsert logic where possible based on SKU or source product URL

5. Integrate with my backend
- Generate or update backend import/migration logic
- Ensure the imported products are accessible through my existing product APIs
- Ensure images are served from Cloudinary, not the source website
- Maintain database consistency for products, variants, and images

6. Integrate with my frontend
- Make sure the products appear correctly in the frontend category pages
- Make sure product cards show correct thumbnail, title, price, and category
- Make sure product detail pages show:
  - main image
  - image gallery
  - description
  - SKU
  - sizes if any
  - related metadata
- Add or preserve a “You may also like” section that shows products from the same parent category or sibling subcategories
- Make the imported products look consistent with the rest of the Folkmint website

7. Output required
Generate all required code and files for the full workflow, including:
- scraper/import script
- Cloudinary upload logic
- database upsert logic
- backend integration code
- frontend data integration if needed
- output JSON/CSV/map files if needed
- any config notes required to run it

8. Code requirements
- Make the solution reusable for future category links
- Keep selectors modular so they can be adapted per website
- Separate concerns into:
  - listing scraper
  - product scraper
  - image processor/uploader
  - database upsert service
  - frontend/backend integration layer
- Handle missing fields safely
- Log failures without stopping the full pipeline
- Prefer production-ready structure over quick hacks

9. Important rules
- Scrape only product-relevant data
- Do not store source image URLs as final display URLs
- Final display images must come from Cloudinary
- Store source URL for traceability
- Respect the given Folkmint category hierarchy
- Exclude the current product from recommendations
- If the site structure is dynamic, use browser automation when needed
- If category-specific normalization is needed, apply it

Expected result:
After running the workflow for the provided URL and category, the products should be fully imported into my Folkmint project, stored properly in the database, images hosted on Cloudinary, and visible in both backend and frontend as if they were native deployable products in the system.
```
