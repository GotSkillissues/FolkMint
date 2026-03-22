# Admin Product Creation Guide

This guide explains how an admin should think about adding a product in FolkMint, both conceptually and in terms of the current API.

A product in this project is not a single table row with everything inside it. It is usually created in stages.

---

## 1. Product creation model

A complete product usually involves three pieces:

1. **Product**
   - main identity and descriptive information
   - category
   - price
   - status flags

2. **Variants**
   - size and stock rows
   - created under the product

3. **Images**
   - uploaded externally
   - linked to the product as product images

So the normal admin flow is:

```text
Create product
   ↓
Add variant(s)
   ↓
Upload image file(s)
   ↓
Attach image URL(s) to the product
   ↓
Choose primary image
```

---

## 2. Step-by-step workflow

### Step 1: Create the base product
Endpoint:
- `POST /api/products`

This creates the main `product` row.

### Step 2: Add product variants
Endpoint:
- `POST /api/products/:id/variants`

A variant represents the stock-bearing option for the product.

In the current schema, variant data is mainly:
- `size`
- `stock_quantity`

### Step 3: Upload image files
Endpoints:
- `POST /api/upload/image`
- `POST /api/upload/images`

These routes upload physical files to Cloudinary and return hosted URLs or metadata.

### Step 4: Attach uploaded images to the product
Endpoint:
- `POST /api/products/:id/images`

This step writes a `product_image` row in PostgreSQL.

### Step 5: Set the primary image
Endpoint:
- `PATCH /api/products/images/:imageId/primary`

Use this after attaching multiple images so listing cards and product pages know which image to display first.

---

## 3. Common mistakes to avoid

- trying to create everything in one unstructured payload
- storing image assumptions on variants
- using outdated field names instead of the schema's `price`
- forgetting stock lives on variants

---

## 4. Validation checklist for admins

Before considering a product fully added, verify:

- the product row exists
- it belongs to the correct category
- it has at least one variant
- variant stock is correct
- at least one product image exists
- one image is marked primary
- `is_active` is set correctly for storefront visibility

---

## 5. Final summary

In FolkMint, adding a product is really adding a **small product bundle**:

- one product record
- one or more variant records
- one or more image records

Once that clicks, the admin catalog flow becomes much easier to understand and debug.
