import React from 'react';
import { Layout } from '../components/layout/Layout';
import { ProductCard } from '../components/ui/ProductCard';
import { products } from '../data/mockData';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CategoryTile: React.FC<{ name: string; images: string[] }> = ({ name, images }) => {
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    React.useEffect(() => {
        if (images.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 5000); // Rotate every 5 seconds for elegance

        return () => clearInterval(interval);
    }, [images]);

    return (
        <div className="premium-card group relative h-80 overflow-hidden cursor-pointer">
            {images.map((img, idx) => (
                <img
                    key={idx}
                    src={img}
                    alt={name}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 transform group-hover:scale-110 ${idx === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0'
                        }`}
                />
            ))}
            <div className="absolute inset-0 bg-earth-900/40 group-hover:bg-earth-900/60 transition-colors flex items-center justify-center p-6 text-center z-10">
                <h3 className="text-2xl font-bold text-white font-serif">{name}</h3>
            </div>
        </div>
    );
};

const HeroCarousel: React.FC = () => {
    const heroImages = [
        "/images/Screenshot-2025-09-06-184742.png",
        "/images/Gemini_Generated_Image_4pluo34pluo34plu.png",
        "/images/Gemini_Generated_Image_8zhtgl8zhtgl8zht.png",
        "/images/3_RumOBFr.webp"
    ];

    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroImages.length);
        }, 6000); // Slightly slower for hero to let images breathe

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden">
            {heroImages.map((img, idx) => (
                <img
                    key={idx}
                    src={img}
                    alt="Bangladeshi Heritage"
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2000ms] ease-in-out transform scale-105 ${idx === currentIndex ? 'opacity-40 scale-100' : 'opacity-0'
                        }`}
                />
            ))}
        </div>
    );
};

export const HomePage: React.FC = () => {
    const categoryData = [
        {
            name: 'Textiles & Fabrics',
            images: [
                '/images/1_lRUm2IW.webp',
                '/images/SALOAR_KAMIJ_SET_BLUE_PRINT.webp',
                '/images/Gemini_Generated_Image_ia1n70ia1n70ia1n.png'
            ]
        },
        {
            name: 'Home Decor',
            images: [
                '/images/Gemini_Generated_Image_ty5znnty5znnty5z.png',
                '/images/Gemini_Generated_Image_6ztb2y6ztb2y6ztb.png',
                '/images/Gemini_Generated_Image_8zhtgl8zhtgl8zht.png'
            ]
        },
        {
            name: 'Clay & Pottery',
            images: [
                '/images/Gemini_Generated_Image_3kkhxj3kkhxj3kkh.png',
                '/images/Gemini_Generated_Image_vda6tsvda6tsvda6.png',
                '/images/Gemini_Generated_Image_6b73oc6b73oc6b73.png'
            ]
        }
    ];

    return (
        <Layout>
            {/* Hero Section */}
            <section className="relative bg-earth-900 text-earth-50 h-[600px] flex items-center overflow-hidden">
                <HeroCarousel />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                    <div className="max-w-2xl">
                        <span className="text-bamboo-300 font-medium tracking-widest uppercase mb-4 block">Authentic & Traditional</span>
                        <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
                            Crafts of <br />Bangladesh
                        </h1>
                        <p className="text-xl text-earth-100 mb-8 max-w-lg font-sans">
                            Discover the finest collection of Nakshi Kantha, Jamdani, and Bamboo handicrafts sourced directly from rural artisans.
                        </p>
                        <Link to="/shop" className="dope-button inline-flex items-center">
                            Shop Collection <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Categories */}
            <section className="py-16 bg-white border-t border-earth-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-10">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-serif font-bold text-earth-900">Featured Categories</h2>
                            <p className="text-earth-500 font-medium italic">Handpicked collections from across the delta</p>
                        </div>
                        <Link to="/shop" className="text-bamboo-700 hover:text-bamboo-900 font-bold border-b-2 border-bamboo-200 pb-1 hidden md:block transition-all">View All Categories &rarr;</Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {categoryData.map((cat, i) => (
                            <CategoryTile key={i} name={cat.name} images={cat.images} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Trending Products */}
            <section className="py-16 bg-earth-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-serif font-bold text-earth-900 text-center mb-12">Trending Now</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map(product => (
                            <ProductCard key={product.product_id} product={product} />
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <Link to="/shop" className="dope-button inline-block bg-white !text-earth-900 border border-earth-200 hover:bg-earth-50">
                            View All Products
                        </Link>
                    </div>
                </div>
            </section>

            {/* Artisans Banner */}
            <section className="py-20 bg-earth-800 text-earth-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">Supporting 500+ Rural Artisans</h2>
                    <p className="max-w-2xl mx-auto text-lg text-earth-200 mb-8">
                        Every purchase directly contributes to the livelihood of skilled craftsmen across Bangladesh, preserving our heritage for future generations.
                    </p>
                    <button className="text-white underline decoration-bamboo-400 decoration-2 underline-offset-4 hover:text-bamboo-400 transition-colors">
                        Read Our Story
                    </button>
                </div>
            </section>
        </Layout>
    );
};
