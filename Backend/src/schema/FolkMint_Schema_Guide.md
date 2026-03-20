# FolkMint — Schema Implementation Guide

## Schema Overview

```
users → address, payment_method, cart, orders, review, wishlist, notification
category → category_closure (auto), product
product → product_variant (auto), product_image
product_variant → cart, wishlist, order_item
orders → order_item, payment
```

---

## Users

### What the schema does
- No username. Login is by email only.
- `role` is either `customer` or `admin`. Enforced by a CHECK constraint.
- No user preferences table. Recommendations are computed from activity signals (purchases, wishlist, cart, reviews).

### Backend rules
- On register, hash the password before inserting. Never store plain text.
- On login, query by email, compare hash, return JWT.
- Never expose `password_hash` in any API response.
- Role check should happen in middleware, not in individual controllers.

---

## Address

### What the schema does
- `is_deleted` is a soft-delete flag. Do not hard-delete addresses linked to orders — the orders table references `address_id` and deleting the row would break order history.
- `is_default` marks the address pre-selected at checkout.

### Backend rules
- When deleting an address, check if any order references it first.
  - If yes → set `is_deleted = true`, do not delete the row.
  - If no → hard delete is safe.
- When a new address is the first one for a user, automatically set `is_default = true`.
- When setting a new default, unset `is_default` on all other addresses for that user first.

### Frontend rules
- Never show addresses where `is_deleted = true`.
- At checkout, pre-select the address where `is_default = true`.

---

## Payment Method

### What the schema does
- Five types only: `cod`, `bkash`, `visa`, `mastercard`, `amex`. Enforced by CHECK constraint.
- `is_default` marks the method pre-selected at checkout.

### Backend rules
- When the first payment method is added, automatically set `is_default = true`.
- When setting a new default, unset all others first.
- COD needs no extra fields. bKash may need a phone number — add `account_number VARCHAR(20)` if needed later.

### Frontend rules
- Show human-readable labels: `cod` → "Cash on Delivery", `bkash` → "bKash" etc.
- Pre-select the default method at checkout.

---

## Category

### What the schema does
- Self-referencing tree via `parent_category`.
- `category_slug`, `depth`, and `full_path` are **auto-computed by a trigger** on every insert or update. Never set them manually.
- `category_closure` is also **fully managed by the trigger**. Never insert or delete from it manually.

### Backend rules
- When inserting a category, only provide `name`, `parent_category`, `description`, and `sort_order`. Everything else is computed.
- To get all products under a category including all descendants, query via the closure table:
```sql
SELECT p.* FROM product p
JOIN category_closure cc ON cc.descendant_category_id = p.category_id
WHERE cc.ancestor_category_id = $1
  AND p.is_active = true;
```
- For URL-based filtering use `category_slug`, not `category_id`:
```sql
SELECT category_id FROM category WHERE category_slug = $1;
-- then use that category_id with the closure query above
```

### Frontend rules
- Fetch the full tree with `GET /categories?tree=true` and build the dropdown from it.
- Admin product form shows a nested dropdown — admin selects by name, frontend sends `category_id`.
- Use `category_slug` in URLs: `/products?category=menswear` not `/products?category=2`.

---

## Product

### What the schema does
- `price` and `sku` live on the product. All sizes share the same price.
- `is_active` soft-deletes products. Inactive products must not appear in any public listing.
- A default variant (`size = NULL, stock_quantity = 0`) is **automatically created by a trigger** on every product insert. You never insert the first variant manually.

### Backend rules
- Never hard-delete a product that has been ordered. Set `is_active = false` instead.
- All public product queries must filter `WHERE is_active = true`.
- For unsized products (Saree, Wall Art): admin just updates the stock on the auto-created `NULL` variant.
- For sized products (Panjabi, Shirt): admin adds S/M/L/XL variants with stock counts, then deletes the default `NULL` variant.
- When admin tries to delete a variant, check it is not the last one:
```js
const count = await pool.query(
  'SELECT COUNT(*) FROM product_variant WHERE product_id = $1',
  [product_id]
);
if (parseInt(count.rows[0].count) <= 1) {
  return res.status(400).json({ error: 'Product must have at least one variant' });
}
```
- `image_url` in `product_image` stores the Cloudinary URL. Upload the image to Cloudinary first, then store the returned URL.

### Frontend rules
- If a product has one variant with `size = NULL`, hide the size selector entirely.
- If a product has sized variants, show size buttons. Disable buttons where `stock_quantity = 0`.

---

## Product Variant

### What the schema does
- `size` is nullable. `NULL` means the product has no sizes (Saree, Wall Art, Pottery).
- `stock_quantity` is tracked per variant — each size has its own stock count independently.
- Two partial unique indexes prevent duplicates:
  - Only one `NULL`-size variant per product.
  - Only one row per `(product_id, size)` for sized variants.

### Backend rules
- When placing an order, use a row-level lock before decrementing stock to prevent overselling during concurrent checkouts:
```sql
SELECT stock_quantity FROM product_variant
WHERE variant_id = $1 FOR UPDATE;
```
- When an order is cancelled, increment `stock_quantity` back for each variant.
- When stock is updated from 0 to a positive number, trigger restock notifications (see Wishlist section).

---

## Product Image

### What the schema does
- Images belong to the product, not to a specific size variant. All sizes share the same images.
- `image_url` stores the Cloudinary URL, not a local file path.
- `is_primary` marks the main image shown in product listings.

### Backend rules
- Only one image per product should have `is_primary = true`. Before inserting a primary image, unset any existing primary for that product.
- When fetching product listings, only fetch the primary image to keep responses light.
- When fetching a single product page, fetch all images.

---

## Cart

### What the schema does
- Merged cart and cart_item into one table. Each row is one variant in a user's cart.
- `UNIQUE (user_id, variant_id)` prevents duplicate entries.
- No `product_id` column — always join through `product_variant` to reach `product`.

### Backend rules
- On add to cart:
  1. Check `stock_quantity > 0` for the variant. Reject if stocked out.
  2. Upsert — if `(user_id, variant_id)` already exists, increment quantity. Otherwise insert.
- At checkout, sync the local cart to the server before placing the order.
- After order is placed, delete all cart rows for that user.
- Cart response query must join through variant to product:
```sql
SELECT
  c.cart_id, c.quantity,
  pv.variant_id, pv.size, pv.stock_quantity,
  p.product_id, p.name, p.price,
  (SELECT image_url FROM product_image
   WHERE product_id = p.product_id AND is_primary = true LIMIT 1) AS image_url
FROM cart c
JOIN product_variant pv ON pv.variant_id = c.variant_id
JOIN product p ON p.product_id = pv.product_id
WHERE c.user_id = $1;
```

### Frontend rules
- Guest cart lives in `localStorage`.
- On login, sync local cart to server via `POST /cart/sync`.
- Disable "Add to Cart" button when `stock_quantity = 0`.
- Never trust a stale local `stock_quantity`. Refetch before checkout.

---

## Orders & Order Item

### What the schema does
- `orders` is the order header — total, status, who placed it, which address.
- `order_item` holds each product line. One order can have many items.
- `unit_price` snapshots the price at time of purchase. If the product price changes later, old orders are unaffected.
- `variant_id` on `order_item` uses `ON DELETE SET NULL` — if a variant is deleted years later, the order item survives with `variant_id = NULL` but `product_id` still intact.
- `UNIQUE (order_id, product_id)` is used instead of `(order_id, variant_id)` because `variant_id` can be NULL and `NULL != NULL` in PostgreSQL — two NULL variant rows for the same order would not be caught by the constraint.

### Backend rules
- Order creation must be wrapped in a transaction:
  1. Lock each variant row with `FOR UPDATE`.
  2. Validate `stock_quantity` for every variant in the cart.
  3. Insert the `orders` row.
  4. Insert one `order_item` row per cart item with `unit_price` copied from `product.price`.
  5. Decrement `stock_quantity` for each variant.
  6. Clear the user's cart rows.
  7. Insert a `payment` row with `status = pending`.
  8. If any step fails, roll back everything.
- Status transitions follow this flow only:
```
pending → confirmed → processing → shipped → delivered
any status → cancelled
```
- When an order is cancelled, restore `stock_quantity` for each variant.

### Frontend rules
- Users can cancel only `pending` orders.
- Show order history joined with `order_item`, `product`, and `product_variant` for full detail.

---

## Payment

### What the schema does
- One payment row per order (`UNIQUE` on `order_id`).
- `payment_method_id` uses `ON DELETE SET NULL` — if a user deletes their saved payment method, payment history is preserved.
- Status flow: `pending` → `completed` or `failed`. Refund sets it to `refunded`.

### Backend rules
- For COD: insert payment with `status = pending` at order creation. Mark `completed` when admin marks order as delivered.
- For bKash/card: handle gateway callback and update status accordingly.
- Never delete a payment row.

---

## Review

### What the schema does
- One review per user per product enforced by `UNIQUE (user_id, product_id)`.
- No `verified_purchase` flag — every review in the table is by definition from a verified buyer because the backend enforces the purchase check before allowing insert.
- No approval workflow — `review_approved` notification type does not exist in this schema.

### Backend rules
- Before inserting a review, verify a delivered order exists for that user and product:
```sql
SELECT 1
FROM order_item oi
JOIN orders o ON o.order_id = oi.order_id
WHERE o.user_id = $1
  AND oi.product_id = $2
  AND o.status = 'delivered'
LIMIT 1;
```
- If no row returned, reject with 403.

### Frontend rules
- Only show the "Write a Review" button if the user has a delivered order containing that product.
- Verify this via `GET /products/:id/can-review` — do not rely on frontend logic alone.

---

## Wishlist

### What the schema does
- Stores `variant_id`, not `product_id`. The user must pick a size before wishlisting a sized product.
- For unsized products the single `NULL`-size variant is used automatically — no size selection needed.
- Purpose: restock notifications. When a wishlisted variant goes from `stock_quantity = 0` to available, notify the user.

### Backend rules
- Only allow adding to wishlist when `stock_quantity = 0`. If the item is in stock the user should just add to cart.
- When admin updates stock on a variant, check if it crossed zero:
```js
if (previousStock === 0 && newStock > 0) {
  const users = await pool.query(
    'SELECT user_id FROM wishlist WHERE variant_id = $1',
    [variant_id]
  );
  for (const user of users.rows) {
    await createNotification(
      user.user_id,
      'back_in_stock',
      'Back in stock',
      'A product on your wishlist is available again.',
      variant_id,
      'variant'
    );
  }
}
```
- Fire notifications non-blocking — wrap in `.catch(() => {})` so a notification failure never breaks the stock update.

### Frontend rules
- For sized products, require size selection before the wishlist button is active.
- Show "Notify me when available" instead of "Add to Wishlist" to set the right expectation.
- For unsized products the button works immediately — no size selection needed.

---

## Notification

### What the schema does
- `type` is constrained to: `order_placed`, `order_confirmed`, `order_shipped`, `order_delivered`, `order_cancelled`, `back_in_stock`, `system`.
- `review_approved` is not in the list — there is no review approval workflow in this schema.
- `related_id` and `related_type` link a notification to a specific entity (e.g. `related_id = 42, related_type = 'order'`).
- `is_read` tracks whether the user has seen it.

### Backend rules
- Always fire notifications non-blocking using `.catch(() => {})`.
- Return `unread_count` on every notification fetch so the frontend can show a badge.
- Mark all as read on `PATCH /notifications/read-all`.

### Frontend rules
- Show unread count badge on the notification bell icon.
- On opening the notification panel, mark all visible ones as read.

---

## General Backend Rules

- All money values (`price`, `total_amount`, `unit_price`, `amount`) are `DECIMAL(10,2)`. Never use JavaScript `float` for money calculations — use string-based decimal libraries or calculate in SQL.
- All timestamps are stored in UTC. Format for display on the frontend.
- Paginate every list endpoint. Default `limit = 20`, max `limit = 100`.
- Never expose internal IDs in error messages.
- All state-changing operations on orders (create, cancel, status update) must use database transactions.
- Use `FOR UPDATE` row-level locks on `product_variant` during any stock decrement to prevent overselling under concurrent load.

---

## General Frontend Rules

- Never trust `stock_quantity` from stale local state. Always refetch before showing cart or checkout.
- Never hardcode category IDs. Always resolve by slug from the API.
- Admin forms never ask for IDs — always use dropdowns populated from the API.
- Cart state for guest users lives in `localStorage`. Sync to server immediately on login.
