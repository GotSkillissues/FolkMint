# FolkMint Database Schema Guide

This guide explains the database used by FolkMint. Read it with `FolkMint.schema.sql` open beside you.

The schema is the best source for understanding how data is supposed to look across the project.

---

## 1. Design goals

The schema is designed to support:

- customer and admin users
- hierarchical product categories
- products with size-based variants
- product-level images
- cart and checkout
- order history
- payment records
- reviews, wishlist and notifications

A major design decision is this split:

- **product** = the sellable item definition
- **product_variant** = stock/size rows for that product
- **product_image** = images shared by the product

So image data is not tied to a specific variant in the database.

---

## 2. Main tables at a glance

### Identity and user profile
- `users`
- `address`
- `payment_method`

### Catalog
- `category`
- `category_closure`
- `product`
- `product_variant`
- `product_image`

### Shopping flow
- `cart`
- `orders`
- `order_item`
- `payment`

### Engagement
- `review`
- `wishlist`
- `notification`

---

## 3. Table-by-table explanation

### `users`
Stores all user accounts.

Important columns:
- `user_id`
- `username`
- `email`
- `password_hash`
- `first_name`
- `last_name`
- `role`

### `address`
Stores a user's addresses.

Important columns:
- `address_id`
- `user_id`
- `label`
- `address_line`
- `city`
- `postal_code`
- `country`
- `is_default`
- `is_deleted`

### `payment_method`
Stores saved payment methods for a user.

Important columns:
- `payment_method_id`
- `user_id`
- `method_type`
- `provider`
- `account_last4`
- `is_default`

### `category`
Stores the product category hierarchy.

Important columns:
- `category_id`
- `name`
- `slug`
- `parent_category`
- `description`
- `image_url`
- `is_active`
- `sort_order`
- `path`
- `depth`

### `category_closure`
Stores ancestor/descendant relationships for categories.

Important columns:
- `ancestor_id`
- `descendant_id`
- `depth`

### `product`
Stores the main product record.

Important columns:
- `product_id`
- `category_id`
- `name`
- `description`
- `price`
- `material`
- `brand`
- `is_active`
- `is_featured`
- `rating_avg`
- `rating_count`

Important note:
- the schema uses **`price`**
- older frontend helper code may still reference `base_price`
- when extending the system, the schema field name is the one to trust

### `product_variant`
Stores per-product variant rows.

Important columns:
- `variant_id`
- `product_id`
- `size`
- `stock_quantity`

Important note:
- variant rows in this schema do **not** define separate image sets
- they also do not define a color column in the current table design

### `product_image`
Stores product-level images.

Important columns:
- `image_id`
- `product_id`
- `image_url`
- `is_primary`
- `sort_order`

### `cart`
Stores the current server-side cart for a user.

Key idea:
- cart entries are variant-based

### `orders`
Stores an order header.

Important columns:
- `order_id`
- `user_id`
- `address_id`
- `payment_method_id`
- `status`
- `subtotal`
- `shipping_fee`
- `discount_amount`
- `total_amount`

### `order_item`
Stores line items inside an order.

Important columns:
- `order_item_id`
- `order_id`
- `variant_id`
- `product_name_snapshot`
- `unit_price`
- `quantity`
- `line_total`

### `payment`
Stores payment records tied to orders.

Important columns:
- `payment_id`
- `order_id`
- `status`
- `amount`
- `provider`
- `transaction_reference`

### `review`
Stores product reviews.

Important columns:
- `review_id`
- `user_id`
- `product_id`
- `rating`
- `comment`

### `wishlist`
Stores saved products by variant.

Important columns:
- `wishlist_id`
- `user_id`
- `variant_id`

### `notification`
Stores user notifications.

Important columns:
- `notification_id`
- `user_id`
- `title`
- `message`
- `type`
- `is_read`

---

## 4. Relationship summary

```text
users
 ├── address
 ├── payment_method
 ├── cart
 ├── orders
 ├── review
 ├── wishlist
 └── notification

category
 ├── product
 └── category_closure

product
 ├── product_variant
 ├── product_image
 └── review

orders
 ├── order_item
 └── payment
```

---

## 5. Common developer mistakes to avoid

### Mistake 1: assuming variant images
In the current schema, images belong to `product`, not `product_variant`.

### Mistake 2: assuming the schema uses `base_price`
The schema uses `product.price`.

### Mistake 3: forgetting cart/wishlist point to variants
Cart and wishlist operations should usually work with `variant_id`, not just `product_id`.

### Mistake 4: treating categories as a flat list
Categories support a real hierarchy and tree traversal.

---

## 6. Final summary

The database is structured around a commerce flow where:

- users own carts, orders, reviews and notifications
- categories organize products
- products own variants and images
- checkout converts cart data into orders and payments
- engagement features live beside the purchasing flow

If you remember one thing, remember this:

**product data is split across product, variant and image tables, and many application bugs come from mixing those responsibilities up.**
