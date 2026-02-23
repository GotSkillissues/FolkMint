import React from 'react';
import { Link } from 'react-router-dom';
import type { Product, ProductVariant, ProductImage } from '../../types/schema';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
    product: Product & { variants?: (ProductVariant & { images?: ProductImage[] })[] };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    // Logic to determine main image and price
    const firstVariant = product.variants?.[0];
    const culturalFallback = "/images/1_lRUm2IW.webp"; // Beautiful local loom/textile texture
    const mainImage = firstVariant?.images?.[0]?.image_url || (product as any).main_image || culturalFallback;
    const price = firstVariant?.price || product.base_price;

    return (
        <div className="premium-card group">
            <Link to={`/product/${product.product_id}`} className="block relative aspect-[4/5] overflow-hidden bg-earth-100">
                <img
                    src={mainImage}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
                {/* Quick Add Overlay */}
                <div className="absolute inset-0 bg-earth-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-6">
                    <span className="bg-white/90 backdrop-blur-md text-earth-900 border border-white/20 px-6 py-2 rounded-full text-sm font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2 cursor-pointer">
                        <ShoppingCart size={16} /> View Details
                    </span>
                </div>
            </Link>

            <div className="p-5">
                <p className="text-xs uppercase tracking-widest text-earth-400 mb-2 font-medium">{product.category?.name || 'Handmade'}</p>
                <Link to={`/product/${product.product_id}`} className="block">
                    <h3 className="text-lg font-serif font-bold text-earth-900 mb-2 truncate group-hover:text-earth-600 transition-colors">
                        {product.name}
                    </h3>
                </Link>
                <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-bold text-earth-900">৳{typeof price === 'number' ? price.toLocaleString() : price}</span>
                    <div className="flex gap-1.5">
                        {/* Color swatches preview if multiple variants exist */}
                        {product.variants?.slice(0, 3).map((v, idx) => (
                            v.color && (
                                <span
                                    key={idx}
                                    className="w-3.5 h-3.5 rounded-full border border-earth-200 shadow-sm"
                                    title={v.color}
                                    style={{ backgroundColor: v.color.toLowerCase().split('/')[0] }} // simple color parser
                                />
                            )
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
