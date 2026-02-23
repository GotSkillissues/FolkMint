import type { Category, Product, ProductVariant, ProductImage, Review, User } from "../types/schema";

export const categories: Category[] = [
    { category_id: 1, name: "Textiles & Fabrics", parent_category: null },
    { category_id: 2, name: "Jamdani", parent_category: 1 },
    { category_id: 3, name: "Nakshi Kantha", parent_category: 1 },
    { category_id: 4, name: "Dhakai Muslin", parent_category: 1 },
    { category_id: 5, name: "Silk & Cotton Weaves", parent_category: 1 },
    { category_id: 6, name: "Home Decor & Furnishing", parent_category: null },
    { category_id: 7, name: "Embroidered Cushions", parent_category: 6 },
    { category_id: 8, name: "Wall Hangings", parent_category: 6 },
    { category_id: 9, name: "Traditional Rugs", parent_category: 6 },
    { category_id: 10, name: "Pottery & Ceramics", parent_category: null },
    { category_id: 11, name: "Terracotta Ware", parent_category: 10 },
    { category_id: 12, name: "Blue Pottery", parent_category: 10 },
    { category_id: 13, name: "Hand-glazed Ceramics", parent_category: 10 },
    { category_id: 14, name: "Bamboo Craft", parent_category: null },
    { category_id: 15, name: "Bamboo Lamps", parent_category: 14 },
    { category_id: 16, name: "Bamboo Baskets", parent_category: 14 },
    { category_id: 17, name: "Bamboo Furniture", parent_category: 14 },
    { category_id: 18, name: "Metalwork & Brass", parent_category: null },
    { category_id: 19, name: "Brass Decorative Items", parent_category: 18 },
    { category_id: 20, name: "Bronze Sculptures", parent_category: 18 },
    { category_id: 21, name: "Traditional Jewelry", parent_category: null },
    { category_id: 22, name: "Beaded Jewelry", parent_category: 21 },
    { category_id: 23, name: "Metal Jewelry", parent_category: 21 },
    { category_id: 24, name: "Traditional Clothing", parent_category: null },
    { category_id: 25, name: "Sarees", parent_category: 24 },
    { category_id: 26, name: "Panjabis & Punjabis", parent_category: 24 },
    { category_id: 27, name: "Lehengas", parent_category: 24 },
    { category_id: 28, name: "Woodcraft & Carving", parent_category: null },
    { category_id: 29, name: "Wooden Sculptures", parent_category: 28 },
    { category_id: 30, name: "Wooden Furniture", parent_category: 28 },
    { category_id: 31, name: "Rickshaw Art", parent_category: null },
    { category_id: 32, name: "Rickshaw Paintings", parent_category: 31 },
    { category_id: 33, name: "Decorative Rickshaw Items", parent_category: 31 },
    { category_id: 34, name: "Leather Work", parent_category: null },
    { category_id: 35, name: "Leather Bags", parent_category: 34 },
    { category_id: 36, name: "Embossed Leather", parent_category: 34 },
    { category_id: 37, name: "Musical Instruments", parent_category: null },
    { category_id: 38, name: "Traditional Drums", parent_category: 37 },
    { category_id: 39, name: "String Instruments", parent_category: 37 },
    { category_id: 40, name: "Artisan Food & Spices", parent_category: null },
    { category_id: 41, name: "Traditional Sweets", parent_category: 40 },
    { category_id: 42, name: "Specialty Spices", parent_category: 40 },
];

// Mock users for reviews
export const users: User[] = [
    { user_id: 1, username: "Fatima Rahman", email: "fatima@example.com", password_hash: "", first_name: "Fatima", last_name: "Rahman", role: "customer" },
    { user_id: 2, username: "Karim Ahmed", email: "karim@example.com", password_hash: "", first_name: "Karim", last_name: "Ahmed", role: "customer" },
    { user_id: 3, username: "Nusrat Jahan", email: "nusrat@example.com", password_hash: "", first_name: "Nusrat", last_name: "Jahan", role: "customer" },
    { user_id: 4, username: "Rahim Khan", email: "rahim@example.com", password_hash: "", first_name: "Rahim", last_name: "Khan", role: "customer" },
    { user_id: 5, username: "Ayesha Begum", email: "ayesha@example.com", password_hash: "", first_name: "Ayesha", last_name: "Begum", role: "customer" },
];

// Mock reviews
export const reviews: (Review & { user?: User })[] = [
    // Reviews for Nakshi Kantha (product_id: 1)
    { review_id: 1, rating: 5, comment: "Absolutely beautiful! The embroidery work is stunning and the colors are vibrant. This kantha is a true work of art. Highly recommend!", user_id: 1, product_id: 1, user: users[0] },
    { review_id: 2, rating: 5, comment: "Exceeded my expectations. The craftsmanship is exceptional and it arrived well-packaged. Perfect addition to my bedroom!", user_id: 2, product_id: 1, user: users[1] },
    { review_id: 3, rating: 4, comment: "Very nice quality and authentic design. Took a bit longer to arrive but worth the wait. The stitching is intricate and beautiful.", user_id: 3, product_id: 1, user: users[2] },

    // Reviews for Bamboo Lamp (product_id: 2)
    { review_id: 4, rating: 5, comment: "Love this lamp! It creates such a warm ambiance in my living room. The bamboo work is excellent and very eco-friendly.", user_id: 4, product_id: 2, user: users[3] },
    { review_id: 5, rating: 4, comment: "Great quality bamboo craftsmanship. The light it casts is beautiful. Only wish it came in a larger size option.", user_id: 1, product_id: 2, user: users[0] },

    // Reviews for Jamdani Saree (product_id: 3)
    { review_id: 6, rating: 5, comment: "This Jamdani saree is absolutely gorgeous! The weaving is so delicate and the fabric feels luxurious. A true masterpiece!", user_id: 5, product_id: 3, user: users[4] },
    { review_id: 7, rating: 5, comment: "Authentic Dhakai Jamdani! I wore it to a wedding and received so many compliments. The quality is outstanding.", user_id: 3, product_id: 3, user: users[2] },
    { review_id: 8, rating: 4, comment: "Beautiful saree with intricate patterns. The gold accents are elegant. Slightly pricey but worth it for the quality.", user_id: 2, product_id: 3, user: users[1] },

    // Reviews for Terracotta Vase (product_id: 4)
    { review_id: 9, rating: 5, comment: "Perfect for my home decor! The traditional Bengali motifs are beautifully carved. Adds a rustic charm to my space.", user_id: 4, product_id: 4, user: users[3] },
    { review_id: 10, rating: 4, comment: "Nice terracotta work. The vase is sturdy and the design is authentic. Great for displaying dried flowers.", user_id: 5, product_id: 4, user: users[4] },
];

// Helper to create a full variant with /images/
const createVariant = (
    id: number,
    pid: number,
    size: string,
    color: string,
    price: number,
    stock: number,
    imgUrl: string
): ProductVariant & { images: ProductImage[] } => ({
    variant_id: id,
    product_id: pid,
    size,
    color,
    price,
    stock_quantity: stock,
    images: [
        { image_id: id * 10 + 1, variant_id: id, image_url: imgUrl }
    ]
});

// Map products with populated category relationships
const rawProducts: (Product & { variants: (ProductVariant & { images: ProductImage[] })[] })[] = [
    {
        product_id: 1,
        name: "Nakshi Kantha",
        description: "Traditional embroidered quilt art from rural Bangladesh. Hand-stitched with colorful patterns telling stories of village life.",
        base_price: 12000.00,
        category_id: 1,
        variants: [
            createVariant(101, 1, "Double (7x8ft)", "Red/Multicolor", 12000.00, 5, "/images/1_lRUm2IW.webp"), // Traditional hand-stitched quilt
            createVariant(102, 1, "Single (5x7ft)", "Blue/Multicolor", 8500.00, 8, "/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png") // Intricate textile pattern
        ]
    },
    {
        product_id: 2,
        name: "Handwoven Bamboo Lamp",
        description: "Eco-friendly bamboo lamp shade, crafted by artisans in Sylhet. Adds a warm, rustic glow to any room.",
        base_price: 4500.00,
        category_id: 4,
        variants: [
            createVariant(201, 2, "Medium", "Natural", 4500.00, 20, "/images/Gemini_Generated_Image_6ztb2y6ztb2y6ztb.png") // Artisan bamboo wicker
        ]
    },
    {
        product_id: 3,
        name: "Jamdani Saree",
        description: "Authentic Dhakai Jamdani saree, woven with fine cotton. A UNESCO Intangible Cultural Heritage of Humanity.",
        base_price: 25000.00,
        category_id: 1,
        variants: [
            createVariant(301, 3, "Free Size", "Off-White/Gold", 25000.00, 3, "/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp") // Luxurious Jamdani silk/cotton weaving
        ]
    },
    {
        product_id: 4,
        name: "Terracotta Vase",
        description: "Hand-molded clay vase with traditional Bengali motifs. Perfect for dried flowers or as a standalone piece.",
        base_price: 3000.00,
        category_id: 11,
        variants: [
            createVariant(401, 4, "12 inch", "Terracotta", 3000.00, 15, "/images/Gemini_Generated_Image_3kkhxj3kkhxj3kkh.png") // Traditional clay pottery with motifs
        ]
    },
    {
        product_id: 5,
        name: "Dhakai Muslin Cloth",
        description: "Finest quality authentic Dhakai Muslin - historically the finest woven fabric in the world.",
        base_price: 8000.00,
        category_id: 4,
        variants: [
            createVariant(501, 5, "1 Meter", "White", 8000.00, 10, "/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png"),
            createVariant(502, 5, "2 Meters", "Cream", 15000.00, 8, "/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp")
        ]
    },
    {
        product_id: 6,
        name: "Embroidered Wall Hanging",
        description: "Beautiful handcrafted embroidered wall hanging featuring traditional Bengali designs.",
        base_price: 5500.00,
        category_id: 8,
        variants: [
            createVariant(601, 6, "Medium (2x3ft)", "Multicolor", 5500.00, 12, "/images/Gemini_Generated_Image_4fymxd4fymxd4fym.png"),
            createVariant(602, 6, "Large (3x4ft)", "Multicolor", 8500.00, 7, "/images/Gemini_Generated_Image_vda6tsvda6tsvda6.png")
        ]
    },
    {
        product_id: 7,
        name: "Blue Pottery Bowl Set",
        description: "Handcrafted blue pottery bowls with traditional motifs, perfect for serving or decoration.",
        base_price: 2800.00,
        category_id: 12,
        variants: [
            createVariant(701, 7, "Set of 2 Bowls", "Blue", 2800.00, 20, "/images/Gemini_Generated_Image_4l77o54l77o54l77.png"),
            createVariant(702, 7, "Set of 4 Bowls", "Blue", 5200.00, 15, "/images/Gemini_Generated_Image_6b73oc6b73oc6b73.png")
        ]
    },
    {
        product_id: 8,
        name: "Bamboo Basket Collection",
        description: "Eco-friendly handwoven bamboo baskets in various sizes for storage and decor.",
        base_price: 3200.00,
        category_id: 16,
        variants: [
            createVariant(801, 8, "Small (8 inch)", "Natural", 3200.00, 25, "/images/Gemini_Generated_Image_6ztb2y6ztb2y6ztb.png"),
            createVariant(802, 8, "Medium (10 inch)", "Natural", 4500.00, 20, "/images/Gemini_Generated_Image_ty5znnty5znnty5z.png"),
            createVariant(803, 8, "Large (12 inch)", "Natural", 6000.00, 15, "/images/Gemini_Generated_Image_azlfniazlfniazlf.png")
        ]
    },
    {
        product_id: 9,
        name: "Brass Decorative Box",
        description: "Ornate brass box with intricate hand-engraved designs. A timeless decorative piece.",
        base_price: 4200.00,
        category_id: 19,
        variants: [
            createVariant(901, 9, "Small", "Antique Brass", 4200.00, 10, "/images/Gemini_Generated_Image_dn98iadn98iadn98.png"),
            createVariant(902, 9, "Medium", "Antique Brass", 6500.00, 8, "/images/Gemini_Generated_Image_8zhtgl8zhtgl8zht.png")
        ]
    },
    {
        product_id: 10,
        name: "Beaded Neck Piece",
        description: "Traditional beaded jewelry featuring natural stones and glass beads. Perfect for traditional occasions.",
        base_price: 2200.00,
        category_id: 22,
        variants: [
            createVariant(1001, 10, "One Size", "Red & Gold", 2200.00, 18, "/images/Gemini_Generated_Image_4pluo34pluo34plu.png"),
            createVariant(1002, 10, "One Size", "Green & Gold", 2200.00, 16, "/images/image-12.png")
        ]
    },
    {
        product_id: 11,
        name: "Traditional Cotton Saree",
        description: "Authentic handwoven cotton saree with traditional border design. Comfortable for everyday wear.",
        base_price: 6500.00,
        category_id: 25,
        variants: [
            createVariant(1101, 11, "Free Size", "Red with Gold Border", 6500.00, 12, "/images/1_lRUm2IW.webp"),
            createVariant(1102, 11, "Free Size", "Green with Silver Border", 6500.00, 10, "/images/3_RumOBFr.webp")
        ]
    },
    {
        product_id: 12,
        name: "Wooden Carved Sculpture",
        description: "Hand-carved wooden sculpture featuring intricate Bengali artistic design. A collector's piece.",
        base_price: 7800.00,
        category_id: 29,
        variants: [
            createVariant(1201, 12, "Medium (10 inch)", "Natural Wood", 7800.00, 8, "/images/Screenshot-2025-09-06-184123.png"),
            createVariant(1202, 12, "Large (15 inch)", "Dark Mahogany", 12500.00, 5, "/images/Screenshot-2025-09-06-184742.png")
        ]
    },
    {
        product_id: 13,
        name: "Traditional Leather Satchel",
        description: "Handmade leather satchel with embossed designs. Durable and stylish for everyday use.",
        base_price: 3800.00,
        category_id: 35,
        variants: [
            createVariant(1301, 13, "One Size", "Tan Leather", 3800.00, 14, "/images/Screenshot-2025-09-06-184154-200x200.png"),
            createVariant(1302, 13, "One Size", "Brown Leather", 3800.00, 12, "/images/Screenshot-2025-09-06-184206-200x200.png")
        ]
    },
    {
        product_id: 14,
        name: "Silk Panjabi Set",
        description: "Premium quality silk panjabi with traditional embroidered neckline. Perfect for special occasions.",
        base_price: 5200.00,
        category_id: 26,
        variants: [
            createVariant(1401, 14, "Medium", "White", 5200.00, 10, "/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp"),
            createVariant(1402, 14, "Medium", "Cream", 5200.00, 9, "/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png")
        ]
    },
    {
        product_id: 1,
        name: "Nakshi Kantha",
        description: "Traditional embroidered quilt art from rural Bangladesh. Hand-stitched with colorful patterns telling stories of village life.",
        base_price: 12000.00,
        category_id: 3,
        variants: [
            createVariant(101, 1, "Double (7x8ft)", "Red/Multicolor", 12000.00, 5, "/images/1_lRUm2IW.webp")
        ]
    },
    {
        product_id: 2,
        name: "Handwoven Bamboo Lamp",
        description: "Eco-friendly bamboo lamp shade, crafted by artisans in Sylhet. Adds a warm, rustic glow to any room.",
        base_price: 4500.00,
        category_id: 15,
        variants: [
            createVariant(201, 2, "Medium", "Natural", 4500.00, 20, "/images/Gemini_Generated_Image_6ztb2y6ztb2y6ztb.png")
        ]
    },
    {
        product_id: 3,
        name: "Jamdani Saree",
        description: "Authentic Dhakai Jamdani saree, woven with fine cotton. A UNESCO Intangible Cultural Heritage of Humanity.",
        base_price: 25000.00,
        category_id: 2,
        variants: [
            createVariant(301, 3, "Free Size", "Off-White/Gold", 25000.00, 3, "/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp")
        ]
    },
    {
        product_id: 4,
        name: "Terracotta Vase",
        description: "Hand-molded clay vase with traditional Bengali motifs. Perfect for dried flowers or as a standalone piece.",
        base_price: 3000.00,
        category_id: 11,
        variants: [
            createVariant(401, 4, "12 inch", "Terracotta", 3000.00, 15, "/images/Gemini_Generated_Image_3kkhxj3kkhxj3kkh.png")
        ]
    },
    {
        product_id: 5,
        name: "Dhakai Muslin Cloth",
        description: "Finest quality authentic Dhakai Muslin - historically the finest woven fabric in the world.",
        base_price: 8000.00,
        category_id: 4,
        variants: [
            createVariant(501, 5, "1 Meter", "White", 8000.00, 10, "/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png")
        ]
    },
    {
        product_id: 6,
        name: "Embroidered Wall Hanging",
        description: "Beautiful handcrafted embroidered wall hanging featuring traditional Bengali designs.",
        base_price: 5500.00,
        category_id: 8,
        variants: [
            createVariant(601, 6, "Medium (2x3ft)", "Multicolor", 5500.00, 12, "/images/Gemini_Generated_Image_4fymxd4fymxd4fym.png")
        ]
    },
    {
        product_id: 7,
        name: "Blue Pottery Bowl Set",
        description: "Handcrafted blue pottery bowls with traditional motifs, perfect for serving or decoration.",
        base_price: 2800.00,
        category_id: 12,
        variants: [
            createVariant(701, 7, "Set of 2 Bowls", "Blue", 2800.00, 20, "/images/Gemini_Generated_Image_4l77o54l77o54l77.png")
        ]
    },
    {
        product_id: 8,
        name: "Bamboo Basket Collection",
        description: "Eco-friendly handwoven bamboo baskets in various sizes for storage and decor.",
        base_price: 3200.00,
        category_id: 16,
        variants: [
            createVariant(801, 8, "Small (8 inch)", "Natural", 3200.00, 25, "/images/Gemini_Generated_Image_ty5znnty5znnty5z.png")
        ]
    },
    {
        product_id: 9,
        name: "Brass Decorative Box",
        description: "Ornate brass box with intricate hand-engraved designs. A timeless decorative piece.",
        base_price: 4200.00,
        category_id: 19,
        variants: [
            createVariant(901, 9, "Small", "Antique Brass", 4200.00, 10, "/images/Gemini_Generated_Image_dn98iadn98iadn98.png")
        ]
    },
    {
        product_id: 10,
        name: "Beaded Neck Piece",
        description: "Traditional beaded jewelry featuring natural stones and glass beads. Perfect for traditional occasions.",
        base_price: 2200.00,
        category_id: 22,
        variants: [
            createVariant(1001, 10, "One Size", "Red & Gold", 2200.00, 18, "/images/Gemini_Generated_Image_4pluo34pluo34plu.png")
        ]
    },
    {
        product_id: 11,
        name: "Traditional Cotton Saree",
        description: "Authentic handwoven cotton saree with traditional border design. Comfortable for everyday wear.",
        base_price: 6500.00,
        category_id: 25,
        variants: [
            createVariant(1101, 11, "Free Size", "Red with Gold Border", 6500.00, 12, "/images/3_RumOBFr.webp")
        ]
    },
    {
        product_id: 12,
        name: "Wooden Carved Sculpture",
        description: "Hand-carved wooden sculpture featuring intricate Bengali artistic design. A collector's piece.",
        base_price: 7800.00,
        category_id: 29,
        variants: [
            createVariant(1201, 12, "Medium (10 inch)", "Natural Wood", 7800.00, 8, "/images/Screenshot-2025-09-06-184123.png")
        ]
    },
    {
        product_id: 13,
        name: "Traditional Leather Satchel",
        description: "Handmade leather satchel with embossed designs. Durable and stylish for everyday use.",
        base_price: 3800.00,
        category_id: 35,
        variants: [
            createVariant(1301, 13, "One Size", "Tan Leather", 3800.00, 14, "/images/Screenshot-2025-09-06-184154-200x200.png")
        ]
    },
    {
        product_id: 14,
        name: "Silk Panjabi Set",
        description: "Premium quality silk panjabi with traditional embroidered neckline. Perfect for special occasions.",
        base_price: 5200.00,
        category_id: 26,
        variants: [
            createVariant(1401, 14, "Medium", "White", 5200.00, 10, "/images/Gemini_Generated_Image_vda6tsvda6tsvda6.png")
        ]
    },
    {
        product_id: 15,
        name: "Clay Dinnerware Set",
        description: "Artisan-crafted clay dinnerware set with traditional motifs. Food-safe and eco-friendly.",
        base_price: 4500.00,
        category_id: 13,
        variants: [
            createVariant(1501, 15, "Set of 6 Plates", "Red Clay", 4500.00, 15, "/images/Screenshot-2025-09-06-185417-200x200.png")
        ]
    },
    {
        product_id: 16,
        name: "Silk & Cotton Blend Fabric",
        description: "Premium silk and cotton blend fabric perfect for sewing traditional garments. Smooth and lustrous.",
        base_price: 1200.00,
        category_id: 5,
        variants: [
            createVariant(1601, 16, "1 Meter", "Gold", 1200.00, 20, "/images/image-12.png")
        ]
    },
    {
        product_id: 17,
        name: "Embroidered Cushion Cover",
        description: "Hand-embroidered cotton cushion cover with traditional floral patterns.",
        base_price: 1800.00,
        category_id: 7,
        variants: [
            createVariant(1701, 17, "16x16 inch", "Red", 1800.00, 25, "/images/Gemini_Generated_Image_6b73oc6b73oc6b73.png")
        ]
    },
    {
        product_id: 18,
        name: "Traditional Jute Rug",
        description: "Handwoven traditional jute rug with authentic Bengali border designs for your living space.",
        base_price: 6800.00,
        category_id: 9,
        variants: [
            createVariant(1801, 18, "4x6 feet", "Natural Jute", 6800.00, 10, "/images/Gemini_Generated_Image_azlfniazlfniazlf.png")
        ]
    },
    {
        product_id: 19,
        name: "Bamboo Wooden Chair Set",
        description: "Eco-friendly bamboo and wood furniture perfect for patio or living room.",
        base_price: 15000.00,
        category_id: 17,
        variants: [
            createVariant(1901, 19, "Set of 2 Chairs", "Natural", 15000.00, 6, "/images/Screenshot-2025-09-06-184742.png")
        ]
    },
    {
        product_id: 20,
        name: "Bronze Buddha Sculpture",
        description: "Handcrafted bronze sculpture inspired by traditional Buddhist art. A spiritual decorative piece.",
        base_price: 9500.00,
        category_id: 20,
        variants: [
            createVariant(2001, 20, "Medium (8 inch)", "Antique Bronze", 9500.00, 8, "/images/Gemini_Generated_Image_8zhtgl8zhtgl8zht.png")
        ]
    },
    {
        product_id: 21,
        name: "Brass Hand Bracelet",
        description: "Traditional brass bracelet with intricate metal work. Perfect statement jewelry.",
        base_price: 1500.00,
        category_id: 23,
        variants: [
            createVariant(2101, 21, "One Size", "Antique Brass", 1500.00, 30, "/images/istockphoto-1163477609-612x612.jpg")
        ]
    },
    {
        product_id: 22,
        name: "Bengal Silk Lehenga",
        description: "Elegant silk lehenga with embroidered blouse and matching dupatta. Traditional bridal wear.",
        base_price: 35000.00,
        category_id: 27,
        variants: [
            createVariant(2201, 22, "Free Size", "Red", 35000.00, 3, "/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png")
        ]
    },
    {
        product_id: 23,
        name: "Wooden Dining Table Set",
        description: "Handcrafted solid wooden dining table with traditional carved details.",
        base_price: 42000.00,
        category_id: 30,
        variants: [
            createVariant(2301, 23, "4 Seater", "Mahogany", 42000.00, 3, "/images/Screenshot-2025-09-06-184206-200x200.png")
        ]
    },
    {
        product_id: 24,
        name: "Rickshaw Art Painting",
        description: "Original hand-painted rickshaw art on canvas. Vibrant colors depicting Bengali village life.",
        base_price: 8500.00,
        category_id: 32,
        variants: [
            createVariant(2401, 24, "16x20 inch", "Canvas", 8500.00, 12, "/images/Screenshot-2025-09-06-190315-200x200.png")
        ]
    }
];

// Populate category relationships
export const products = rawProducts.map(product => ({
    ...product,
    category: categories.find(cat => cat.category_id === product.category_id)
}));

