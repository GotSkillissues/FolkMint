import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { ProductCard } from '../components/ui/ProductCard';
import { products as staticProducts, categories as staticCategories } from '../data/mockData';
import { Filter, Loader2, Search } from 'lucide-react';

export const ShopPage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('Featured');
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Categories
                const catRes = await fetch('/api/categories');
                const cats = await catRes.json();
                setCategories(cats.length > 0 ? cats : staticCategories);

                // Fetch Products
                const prodRes = await fetch('/api/products');
                const prods = await prodRes.json();
                setAllProducts(prods.length > 0 ? prods : staticProducts);
            } catch (err) {
                console.error('Fetch error:', err);
                setCategories(staticCategories);
                setAllProducts(staticProducts);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Derived products state
    const filteredProducts = allProducts
        .filter(p => !selectedCategory || p.category_id === selectedCategory)
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())))
        .sort((a, b) => {
            if (sortBy === 'Price: Low to High') return a.base_price - b.base_price;
            if (sortBy === 'Price: High to Low') return b.base_price - a.base_price;
            return 0; // Default: Featured (natural order)
        });

    return (
        <Layout>
            <div className="bg-earth-100 py-12 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-serif font-bold text-earth-900 mb-4">Shop Collection</h1>
                    <p className="text-earth-600 max-w-2xl mx-auto font-sans">
                        Explore our curated selection of authentic Bangladeshi traditional crafts, textiles, and home decor.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="premium-card p-6 sticky top-24">
                            <div className="flex items-center gap-2 mb-4 text-earth-900 font-bold border-b border-earth-100 pb-2">
                                <Filter size={20} />
                                <h2>Filters</h2>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold text-earth-800 mb-3 text-sm uppercase tracking-wider">Search</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-earth-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search products..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-3 py-3 border border-earth-200 rounded-lg text-sm focus:ring-1 focus:ring-earth-900 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold text-earth-800 mb-3 text-sm uppercase tracking-wider">Categories</h3>
                                <ul className="space-y-2">
                                    <li>
                                        <button
                                            onClick={() => setSelectedCategory(null)}
                                            className={`block w-full text-left px-3 py-2 rounded-lg transition-all ${selectedCategory === null ? 'bg-earth-900 text-white font-bold' : 'text-earth-600 hover:bg-earth-50'}`}
                                        >
                                            All Products
                                        </button>
                                    </li>
                                    {categories.map(cat => (
                                        <li key={cat.category_id}>
                                            <button
                                                onClick={() => setSelectedCategory(cat.category_id)}
                                                className={`block w-full text-left px-3 py-2 rounded-lg transition-all ${selectedCategory === cat.category_id ? 'bg-earth-900 text-white font-bold' : 'text-earth-600 hover:bg-earth-50'}`}
                                            >
                                                {cat.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1">
                        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-earth-100 shadow-sm">
                            <p className="text-earth-600 font-medium">Showing <span className="text-earth-900 font-bold">{filteredProducts.length}</span> results</p>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="border border-earth-200 rounded-lg text-sm text-earth-700 focus:ring-earth-900 focus:border-earth-900 bg-transparent px-4 py-2 outline-none cursor-pointer"
                            >
                                <option>Featured</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                                <option>Newest Arrivals</option>
                            </select>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-earth-200">
                                <Loader2 className="animate-spin text-earth-400 mb-4" size={40} />
                                <p className="text-earth-500 font-medium font-serif italic">Discovering heritage pieces...</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredProducts.map(product => (
                                    <ProductCard key={product.product_id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-earth-200">
                                <p className="text-earth-500 font-medium font-serif italic text-lg mb-4">No treasures found in this category.</p>
                                <button
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setSearchTerm('');
                                    }}
                                    className="dope-button bg-white !text-earth-900 border border-earth-200"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};
