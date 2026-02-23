export interface User {
    user_id: number;
    username: string;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
}

export interface Address {
    address_id: number;
    street: string | null;
    city: string | null;
    postal_code: string | null;
    country: string | null;
    user_id: number | null;
}

export interface Category {
    category_id: number;
    name: string | null;
    parent_category: number | null;
}

export interface Product {
    product_id: number;
    name: string | null;
    description: string | null;
    base_price: number | null;
    category_id: number | null;
    // Relations to be populated in frontend
    category?: Category;
    variants?: ProductVariant[];
}

export interface ProductVariant {
    variant_id: number;
    size: string | null;
    color: string | null;
    stock_quantity: number | null;
    price: number | null;
    product_id: number | null;
    // Relations
    images?: ProductImage[];
}

export interface ProductImage {
    image_id: number;
    image_url: string | null;
    variant_id: number | null;
}

export interface Cart {
    cart_id: number;
    user_id: number | null;
}

export interface CartItem {
    cart_item_id: number;
    quantity: number | null;
    cart_id: number | null;
    variant_id: number | null;
    // Relations
    variant?: ProductVariant;
}

export interface Order {
    order_id: number;
    order_date: string | null; // DATETIME
    total_amount: number | null;
    status: string | null;
    user_id: number | null;
    address_id: number | null;
    payment_id: number | null;
}

export interface OrderItem {
    order_item_id: number;
    quantity: number | null;
    price_at_purchase: number | null;
    order_id: number | null;
    variant_id: number | null;
}

export interface Review {
    review_id: number;
    rating: number | null;
    comment: string | null;
    user_id: number | null;
    product_id: number | null;
}
