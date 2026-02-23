import os
import mysql.connector
from mysql.connector import pooling
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve local images
# Get the project root directory (one level up from backend)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_path = os.path.join(project_root, "gemini_img")

if not os.path.exists(images_path):
    print(f"Warning: Images directory not found at {images_path}")
    # Create an empty directory if missing to prevent crash, or handle gracefully
    os.makedirs(images_path, exist_ok=True)

app.mount("/images", StaticFiles(directory=images_path), name="images")

# Database configuration
db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "ECOMMERCE"),
}

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="folkmint_pool",
        pool_size=5,
        **db_config
    )
    print("Database connection pool initialized successfully")
except mysql.connector.Error as err:
    print(f"Error creating connection pool: {err}")
    # Log more details if possible
    import traceback
    traceback.print_exc()
    connection_pool = None

# Mock data for development
MOCK_USER = {
    "user_id": 1,
    "first_name": "Demo",
    "last_name": "User",
    "email": "demo@folkmint.com",
    "username": "demouser",
    "address": "123 Artisans Lane, Dhaka, Bangladesh",
    "password_hash": "password123"
}

# In-memory database for users (resets on server restart)
MOCK_USERS_DB = [MOCK_USER]

MOCK_ORDERS = [
    {
        "order_id": 1001,
        "order_date": "2024-05-20T10:30:00",
        "total_amount": 16500.00,
        "status": "Delivered",
        "items": [
            {
                "name": "Nakshi Kantha", 
                "quantity": 1, 
                "price_at_purchase": 12000.00, 
                "product_id": 1, 
                "size": "Double (7x8ft)", 
                "color": "Red/Multicolor",
                "image": "http://localhost:8000/images/1_lRUm2IW.webp"
            },
            {
                "name": "Handwoven Bamboo Lamp", 
                "quantity": 1, 
                "price_at_purchase": 4500.00, 
                "product_id": 2, 
                "size": "Medium", 
                "color": "Natural",
                "image": "http://localhost:8000/images/Gemini_Generated_Image_ty5znnty5znnty5z.png"
            }
        ]
    },
    {
        "order_id": 1002,
        "order_date": "2024-05-22T14:45:00",
        "total_amount": 3000.00,
        "status": "Processing",
        "items": [
            {
                "name": "Terracotta Pot", 
                "quantity": 1, 
                "price_at_purchase": 3000.00, 
                "product_id": 4, 
                "size": "12 inch", 
                "color": "Terracotta",
                "image": "http://localhost:8000/images/Gemini_Generated_Image_3kkhxj3kkhxj3kkh.png"
            }
        ]
    }
]

def get_db():
    if connection_pool is None:
        # In a real app we'd raise an error, but for this demo/test we'll yield None
        # and handle it in the endpoints if we want to support mock mode
        yield None
        return
    
    connection = connection_pool.get_connection()
    try:
        yield connection
    finally:
        connection.close()

# Pydantic models
class UserSignup(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str
    address: str

class UserLogin(BaseModel):
    email: str
    password: str

class AddressUpdate(BaseModel):
    address: str

# New Models for Full Integration
class Category(BaseModel):
    category_id: int
    name: str
    parent_category: int = None

class ProductVariant(BaseModel):
    variant_id: int
    product_id: int
    size: str = None
    color: str = None
    stock_quantity: int
    price: float

class Product(BaseModel):
    product_id: int
    name: str
    description: str = None
    base_price: float
    category_id: int
    variants: list[ProductVariant] = []

class ReviewCreate(BaseModel):
    rating: int
    comment: str
    product_id: int

class CartItemAdd(BaseModel):
    variant_id: int
    quantity: int

class PaymentMethodCreate(BaseModel):
    card_last4: str
    type: str
    expiry_date: str # YYYY-MM-DD

class CheckoutRequest(BaseModel):
    items: list[dict] # {variant_id, quantity, price}
    address_id: int = None
    payment_method: PaymentMethodCreate = None

@app.post("/api/auth/signup")
def signup(user_data: UserSignup, db=Depends(get_db)):
    if db is None:
        # Check if email exists in mock DB
        if any(u["email"] == user_data.email for u in MOCK_USERS_DB):
             raise HTTPException(status_code=400, detail="Email already registered")
        
        # Save to mock DB
        new_user = {
            "user_id": len(MOCK_USERS_DB) + 1,
            "first_name": user_data.firstName,
            "last_name": user_data.lastName,
            "email": user_data.email,
            "username": user_data.email.split("@")[0],
            "address": user_data.address,
            "password_hash": user_data.password  # In mock mode we store plain text for ease
        }
        MOCK_USERS_DB.append(new_user)
        return {"message": "User created successfully (Persistent Mock)", "user_id": new_user["user_id"]}

    cursor = db.cursor(dictionary=True)
    try:
        # Check if email exists
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Insert user
        username = user_data.email.split("@")[0]
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (username, user_data.email, user_data.password, user_data.firstName, user_data.lastName, "customer")
        )
        user_id = cursor.lastrowid

        # Insert address
        cursor.execute(
            "INSERT INTO address (street, city, postal_code, country, user_id) VALUES (%s, %s, %s, %s, %s)",
            (user_data.address, "Dhaka", "1000", "Bangladesh", user_id)
        )

        db.commit()
        return {"message": "User created successfully", "user_id": user_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        cursor.close()

# Category & Product Endpoints
@app.get("/api/categories")
def get_categories(db=Depends(get_db)):
    if db is None:
        return [
            {"category_id": 1, "name": "Textiles & Fabrics"},
            {"category_id": 2, "name": "Bamboo Craft"},
            {"category_id": 3, "name": "Pottery"},
            {"category_id": 4, "name": "Home Decor"}
        ]
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM category")
        return cursor.fetchall()
    finally:
        cursor.close()

@app.get("/api/products")
def get_products(category_id: int = None, db=Depends(get_db)):
    if db is None:
        # High quality cultural mock products
        return [
            {
                "product_id": 1,
                "name": "Nakshi Kantha",
                "description": "Traditional hand-embroidered quilt.",
                "base_price": 12000.0,
                "category_id": 1,
                "main_image": "http://localhost:8000/images/1_lRUm2IW.webp",
                "variants": [{"variant_id": 101, "price": 12000.0, "size": "Double", "color": "Red"}]
            },
            {
                "product_id": 2,
                "name": "Bamboo Lamp",
                "description": "Handwoven bamboo floor lamp.",
                "base_price": 4500.0,
                "category_id": 2,
                "main_image": "http://localhost:8000/images/Gemini_Generated_Image_ty5znnty5znnty5z.png",
                "variants": [{"variant_id": 201, "price": 4500.0, "size": "Medium", "color": "Natural"}]
            },
            {
                "product_id": 3,
                "name": "Jamdani Saree",
                "description": "Hand-loomed silk and cotton saree.",
                "base_price": 25000.0,
                "category_id": 1,
                "main_image": "http://localhost:8000/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp",
                "variants": [{"variant_id": 301, "price": 25000.0, "size": "Free", "color": "Gold"}]
            },
            {
                "product_id": 4,
                "name": "Terracotta Pot",
                "description": "Authentic clay pottery from Rajshahi.",
                "base_price": 3000.0,
                "category_id": 3,
                "main_image": "http://localhost:8000/images/Gemini_Generated_Image_3kkhxj3kkhxj3kkh.png",
                "variants": [{"variant_id": 401, "price": 3000.0, "size": "Large", "color": "Clay"}]
            }
        ]
    
    cursor = db.cursor(dictionary=True)
    try:
        query = "SELECT * FROM product"
        params = []
        if category_id:
            query += " WHERE category_id = %s"
            params.append(category_id)
        
        cursor.execute(query, tuple(params))
        products = cursor.fetchall()
        
        for p in products:
            cursor.execute("SELECT * FROM product_variant WHERE product_id = %s", (p["product_id"],))
            p["variants"] = cursor.fetchall()
            
            # Get main image
            cursor.execute("SELECT image_url FROM product_image WHERE variant_id = %s LIMIT 1", (p["variants"][0]["variant_id"],)) if p["variants"] else None
            img = cursor.fetchone()
            p["main_image"] = img["image_url"] if img else None
            
        return products
    finally:
        cursor.close()

@app.post("/api/auth/login")
def login(login_data: UserLogin, db=Depends(get_db)):
    if db is None:
        # Find user in mock DB
        user = next((u for u in MOCK_USERS_DB if u["email"] == login_data.email), None)
        
        if user and user["password_hash"] == login_data.password:
            return {
                "user_id": user["user_id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "username": f"{user['first_name']} {user['last_name']}"
            }
        raise HTTPException(status_code=401, detail="Invalid email or password (Mock Mode)")

    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT user_id, email, first_name, last_name, password_hash FROM users WHERE email = %s",
            (login_data.email,)
        )
        user = cursor.fetchone()

        if not user or user["password_hash"] != login_data.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "user_id": user["user_id"],
            "email": user["email"],
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "username": f"{user['first_name']} {user['last_name']}"
        }
    finally:
        cursor.close()

@app.get("/api/user/profile/{user_id}")
def get_profile(user_id: int, db=Depends(get_db)):
    print(f"DEBUG: get_profile requested for user_id: {user_id}")
    if db is None:
        # Find user in mock DB
        user = next((u for u in MOCK_USERS_DB if u["user_id"] == user_id), None)
        
        if not user:
             raise HTTPException(status_code=404, detail="User not found (Mock Mode)")
             
        return {
            "profile": {
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"],
                "address": user.get("address", "No address provided")
            },
            "orders": MOCK_ORDERS
        }
    cursor = db.cursor(dictionary=True)
    try:
        # Get user info
        cursor.execute(
            "SELECT u.first_name, u.last_name, u.email, a.street as address FROM users u LEFT JOIN address a ON u.user_id = a.user_id WHERE u.user_id = %s",
            (user_id,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get order history
        cursor.execute(
            "SELECT order_id, order_date, total_amount, status FROM orders WHERE user_id = %s ORDER BY order_date DESC",
            (user_id,)
        )
        orders = cursor.fetchall()

        # For each order, get items
        for order in orders:
            cursor.execute(
                "SELECT oi.quantity, oi.price_at_purchase, pv.size, pv.color, p.name, p.product_id FROM order_item oi JOIN product_variant pv ON oi.variant_id = pv.variant_id JOIN product p ON pv.product_id = p.product_id WHERE oi.order_id = %s",
                (order["order_id"],)
            )
            order["items"] = cursor.fetchall()

        return {
            "profile": user,
            "orders": orders
        }
    finally:
        cursor.close()

@app.put("/api/user/profile/{user_id}/address")
def update_address(user_id: int, address_data: AddressUpdate, db=Depends(get_db)):
    if db is None:
        # Find user in mock DB
        user = next((u for u in MOCK_USERS_DB if u["user_id"] == user_id), None)
        if not user:
            raise HTTPException(status_code=404, detail="User not found (Mock Mode)")
        
        user["address"] = address_data.address
        return {"message": "Address updated successfully (Mock Mode)"}

    cursor = db.cursor(dictionary=True)
    try:
        # First check if address exists for user
        cursor.execute("SELECT address_id FROM address WHERE user_id = %s", (user_id,))
        address = cursor.fetchone()
        
        if address:
            cursor.execute(
                "UPDATE address SET street = %s WHERE user_id = %s",
                (address_data.address, user_id)
            )
        else:
            cursor.execute(
                "INSERT INTO address (street, city, postal_code, country, user_id) VALUES (%s, %s, %s, %s, %s)",
                (address_data.address, "Dhaka", "1000", "Bangladesh", user_id)
            )
        
        db.commit()
        return {"message": "Address updated successfully"}
    finally:
        cursor.close()

# Review Endpoints
@app.get("/api/products/{product_id}/reviews")
def get_reviews(product_id: int, db=Depends(get_db)):
    if db is None:
        return []
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT r.*, u.username, u.first_name FROM review r JOIN users u ON r.user_id = u.user_id WHERE r.product_id = %s",
            (product_id,)
        )
        return cursor.fetchall()
    finally:
        cursor.close()

@app.post("/api/reviews")
def create_review(review: ReviewCreate, user_id: int, db=Depends(get_db)):
    if db is None:
        return {"message": "Review added successfully (Mock Mode)"}
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO review (rating, comment, user_id, product_id) VALUES (%s, %s, %s, %s)",
            (review.rating, review.comment, user_id, review.product_id)
        )
        db.commit()
        return {"message": "Review submitted successfully", "review_id": cursor.lastrowid}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        cursor.close()

# Cart Endpoints
@app.get("/api/cart/{user_id}")
def get_cart(user_id: int, db=Depends(get_db)):
    if db is None:
        return {"items": []}
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT cart_id FROM cart WHERE user_id = %s", (user_id,))
        cart = cursor.fetchone()
        if not cart: return {"items": []}
        
        cursor.execute(
            "SELECT ci.*, p.name, pv.price, pv.color, pv.size FROM cart_item ci JOIN product_variant pv ON ci.variant_id = pv.variant_id JOIN product p ON pv.product_id = p.product_id WHERE ci.cart_id = %s",
            (cart["cart_id"],)
        )
        return {"items": cursor.fetchall()}
    finally:
        cursor.close()

@app.post("/api/cart/add")
def add_to_cart(item: CartItemAdd, user_id: int, db=Depends(get_db)):
    if db is None:
        return {"message": "Item added to cart (Mock Mode)"}
    
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute("SELECT cart_id FROM cart WHERE user_id = %s", (user_id,))
        cart = cursor.fetchone()
        if not cart:
            cursor.execute("INSERT INTO cart (user_id) VALUES (%s)", (user_id,))
            cart_id = cursor.lastrowid
        else:
            cart_id = cart["cart_id"]
        
        cursor.execute("SELECT cart_item_id, quantity FROM cart_item WHERE cart_id = %s AND variant_id = %s", (cart_id, item.variant_id))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("UPDATE cart_item SET quantity = %s WHERE cart_item_id = %s", (existing["quantity"] + item.quantity, existing["cart_item_id"]))
        else:
            cursor.execute("INSERT INTO cart_item (quantity, cart_id, variant_id) VALUES (%s, %s, %s)", (item.quantity, cart_id, item.variant_id))
        
        db.commit()
        return {"message": "Item added to cart"}
    finally:
        cursor.close()

@app.put("/api/cart/item/{item_id}")
def update_cart_item(item_id: int, quantity: int, db=Depends(get_db)):
    if db is None: return {"status": "ok"}
    cursor = db.cursor()
    try:
        cursor.execute("UPDATE cart_item SET quantity = %s WHERE cart_item_id = %s", (quantity, item_id))
        db.commit()
        return {"message": "Quantity updated"}
    finally:
        cursor.close()

@app.delete("/api/cart/item/{item_id}")
def remove_from_cart(item_id: int, db=Depends(get_db)):
    if db is None: return {"status": "ok"}
    cursor = db.cursor()
    try:
        cursor.execute("DELETE FROM cart_item WHERE cart_item_id = %s", (item_id,))
        db.commit()
        return {"message": "Item removed from cart"}
    finally:
        cursor.close()

# Checkout Flow
@app.post("/api/checkout")
def checkout(request: CheckoutRequest, user_id: int, db=Depends(get_db)):
    if db is None:
        return {"message": "Checkout successful (Mock Mode)", "order_id": 9999}
    
    cursor = db.cursor(dictionary=True)
    try:
        # 1. Handle Payment Method
        pm = request.payment_method
        cursor.execute(
            "INSERT INTO payment_method (card_last4, type, expiry_date, user_id) VALUES (%s, %s, %s, %s)",
            (pm.card_last4, pm.type, pm.expiry_date, user_id)
        )
        method_id = cursor.lastrowid
        
        # 2. Create Payment
        total = sum(item["price"] * item["quantity"] for item in request.items)
        cursor.execute(
            "INSERT INTO payment (amount, payment_date, method_id) VALUES (%s, NOW(), %s)",
            (total, method_id)
        )
        payment_id = cursor.lastrowid
        
        # 3. Create Order
        cursor.execute(
            "INSERT INTO orders (order_date, total_amount, status, user_id, address_id, payment_id) VALUES (NOW(), %s, %s, %s, %s, %s)",
            (total, "Processing", user_id, request.address_id, payment_id)
        )
        order_id = cursor.lastrowid
        
        # 4. Create Order Items
        for item in request.items:
            cursor.execute(
                "INSERT INTO order_item (quantity, price_at_purchase, order_id, variant_id) VALUES (%s, %s, %s, %s)",
                (item["quantity"], item["price"], order_id, item["variant_id"])
            )
        
        db.commit()
        return {"message": "Order placed successfully", "order_id": order_id}
    except mysql.connector.Error as err:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {err}")
    finally:
        cursor.close()

# User Preference
@app.post("/api/user/preference/view/{product_id}")
def track_view(product_id: int, user_id: int, db=Depends(get_db)):
    if db is None: return {"status": "ok"}
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO user_preferences (user_id, view_count) VALUES (%s, 1) ON DUPLICATE KEY UPDATE view_count = view_count + 1",
            (user_id,)
        )
        db.commit()
        return {"status": "updated"}
    finally:
        cursor.close()

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
