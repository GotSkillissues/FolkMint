import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { products as staticProducts, reviews as mockReviews } from '../data/mockData';
import { useCart } from '../context/CartContext';
import { Star, ShoppingBag, Truck, ShieldCheck, Heart, Share2, Package, Loader2 } from 'lucide-react';
import type { ProductVariant, Review, User } from '../types/schema';
import { ReviewList } from '../components/ui/ReviewList';

export const ProductDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState<any>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [productReviews, setProductReviews] = useState<(Review & { user?: User })[]>([]);

    useEffect(() => {
        const fetchProductData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                // Fetch product from backend
                const prodRes = await fetch(`/api/products?product_id=${id}`);
                const products = await prodRes.json();
                const foundProduct = products.find((p: any) => p.product_id === Number(id)) || staticProducts.find(p => p.product_id === Number(id));

                if (foundProduct) {
                    setProduct(foundProduct);
                    if (foundProduct.variants && foundProduct.variants.length > 0) {
                        setSelectedVariant(foundProduct.variants[0]);
                        // Set active image from backend or static source
                        const initialImg = foundProduct.main_image || (foundProduct.variants[0].images?.[0]?.image_url) || '';
                        setActiveImage(initialImg);
                    }

                    // Track view (if user is logged in)
                    const authUserStr = localStorage.getItem('folkmint_user');
                    const authUser = authUserStr ? JSON.parse(authUserStr) : null;
                    if (authUser) {
                        fetch(`/api/user/preference/view/${id}?user_id=${authUser.user_id}`, { method: 'POST' });
                    }
                }

                // Fetch reviews
                const reviewRes = await fetch(`/api/products/${id}/reviews`);
                const reviews = await reviewRes.json();
                setProductReviews(reviews.length > 0 ? reviews : mockReviews.filter(r => r.product_id === Number(id)));

            } catch (err) {
                console.error('Error fetching product data:', err);
                // Fallback to static
                const found = staticProducts.find(p => p.product_id === Number(id));
                if (found) {
                    setProduct(found);
                    if (found.variants?.[0]) {
                        setSelectedVariant(found.variants[0]);
                        setActiveImage(found.variants[0].images?.[0]?.image_url || '');
                    }
                    setProductReviews(mockReviews.filter(r => r.product_id === Number(id)));
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductData();
    }, [id]);

    // Update active image when variant changes
    useEffect(() => {
        if (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0 && selectedVariant.images[0].image_url) {
            setActiveImage(selectedVariant.images[0].image_url);
        }
    }, [selectedVariant]);

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-bamboo-600 mb-4" size={48} />
                    <p className="text-earth-500 font-serif italic text-lg">Unveiling heritage details...</p>
                </div>
            </Layout>
        );
    }

    if (!product) {
        return (
            <Layout>
                <div className="min-h-[50vh] flex flex-col items-center justify-center">
                    <h2 className="text-2xl font-bold text-earth-800 mb-4">Product Not Found</h2>
                    <button onClick={() => navigate('/shop')} className="text-bamboo-600 hover:underline">
                        Back to Shop
                    </button>
                </div>
            </Layout>
        );
    }

    const currentPrice = selectedVariant?.price || product.base_price;
    const isOutOfStock = selectedVariant?.stock_quantity === 0;

    // Group variants by unique attributes if needed, simpler to just list them for now if small number
    // For standard sizing/color, usually you derive unique Colors and Sizes. 
    // Given strict schema mapping, we'll let user pick the specific variant combination.

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="aspect-square bg-earth-100 rounded-lg overflow-hidden border border-earth-200">
                            <img
                                src={activeImage || '/images/1_lRUm2IW.webp'}
                                alt={product.name || 'Product Image'}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            {product.variants?.flatMap((v: any) => v.images || []).slice(0, 4).map((img: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img.image_url || '')}
                                    className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${activeImage === img.image_url ? 'border-bamboo-500' : 'border-transparent hover:border-earth-300'}`}
                                >
                                    <img src={img.image_url || ''} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div>
                        <div className="mb-2 text-earth-500 text-sm tracking-wide uppercase font-medium">
                            {product.category?.name || 'Handicraft'}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-earth-900 mb-4">
                            {product.name}
                        </h1>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex text-yellow-500 text-sm">
                                <Star className="fill-current w-4 h-4" />
                                <Star className="fill-current w-4 h-4" />
                                <Star className="fill-current w-4 h-4" />
                                <Star className="fill-current w-4 h-4" />
                                <Star className="fill-current w-4 h-4" />
                            </div>
                            <span className="text-earth-400 text-sm">({productReviews.length} Review{productReviews.length !== 1 ? 's' : ''})</span>
                        </div>

                        <div className="text-3xl font-bold text-earth-800 mb-6">
                            ৳{typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}
                        </div>

                        <p className="text-earth-600 leading-relaxed mb-8">
                            {product.description}
                        </p>

                        <div className="h-px bg-earth-200 my-8"></div>

                        {/* Variant Selection */}
                        {product.variants && product.variants.length > 0 && (
                            <div className="space-y-6 mb-8">
                                {/* Variant Selector - Simplified for now to pick exact variant object */}
                                <div>
                                    <label className="block text-sm font-bold text-earth-900 mb-2">Select Option:</label>
                                    <div className="flex flex-wrap gap-3">
                                        {product.variants.map((variant: any) => (
                                            <button
                                                key={variant.variant_id}
                                                onClick={() => setSelectedVariant(variant)}
                                                className={`px-4 py-2 border rounded-md text-sm transition-all ${selectedVariant?.variant_id === variant.variant_id
                                                    ? 'border-bamboo-600 bg-bamboo-50 text-bamboo-800 font-medium ring-1 ring-bamboo-600'
                                                    : 'border-earth-300 text-earth-700 hover:border-earth-400'
                                                    }`}
                                            >
                                                {variant.size} - {variant.color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <div className="flex items-center border border-earth-300 rounded-md w-max">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="px-4 py-3 text-earth-600 hover:bg-earth-50"
                                >-</button>
                                <span className="w-12 text-center font-medium text-earth-900">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="px-4 py-3 text-earth-600 hover:bg-earth-50"
                                >+</button>
                            </div>

                            <button
                                onClick={() => {
                                    if (product && selectedVariant) {
                                        addToCart(selectedVariant, product, quantity, activeImage);
                                    }
                                }}
                                disabled={isOutOfStock}
                                className={`flex - 1 flex items - center justify - center gap - 2 px - 8 py - 3 rounded - md font - bold text - lg transition - colors ${isOutOfStock
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-earth-800 text-white hover:bg-earth-900'
                                    } `}
                            >
                                <ShoppingBag size={20} />
                                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                            </button>

                            <button className="p-3 border border-earth-300 rounded-md text-earth-600 hover:bg-earth-50 hover:text-red-500 transition-colors">
                                <Heart size={20} />
                            </button>
                            <button className="p-3 border border-earth-300 rounded-md text-earth-600 hover:bg-earth-50 transition-colors">
                                <Share2 size={20} />
                            </button>
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-earth-600 bg-earth-50 p-6 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Truck className="text-bamboo-600" size={20} />
                                <span>Free shipping over ৳10000</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-bamboo-600" size={20} />
                                <span>Authenticity Guaranteed</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-bamboo-100 flex items-center justify-center text-bamboo-700 font-bold text-xs">♻</div>
                                <span>Eco-friendly packaging</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-bamboo-100 flex items-center justify-center text-bamboo-700 font-bold text-xs">৳</div>
                                <span>Fair Trade Certified</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-16 border-t border-earth-200 pt-16">
                    <h2 className="text-3xl font-serif font-bold text-earth-900 mb-8">Customer Reviews</h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Review List - Takes 2 columns */}
                        <div className="lg:col-span-2">
                            <ReviewList reviews={productReviews} />
                        </div>

                        {/* Info Box - Takes 1 column */}
                        <div>
                            <div className="bg-bamboo-50 p-8 rounded-lg border border-bamboo-200 sticky top-24">
                                <div className="mb-4">
                                    <Package className="mx-auto text-bamboo-600" size={48} />
                                </div>
                                <h3 className="text-xl font-bold text-earth-900 mb-3 text-center">Purchased This Product?</h3>
                                <p className="text-earth-600 mb-6 text-center">
                                    Share your experience! Reviews can be written from your order history.
                                </p>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full bg-bamboo-600 text-white px-6 py-3 rounded-md font-bold hover:bg-bamboo-700 transition-colors"
                                >
                                    Go to My Orders
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
