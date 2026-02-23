import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Users, Heart, Leaf } from 'lucide-react';

export const AboutPage: React.FC = () => {
    return (
        <Layout>
            <div className="bg-earth-100 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-earth-900 mb-6">Our Story</h1>
                    <p className="text-xl text-earth-600 max-w-2xl mx-auto leading-relaxed">
                        FolkMint is a bridge between the skilled rural artisans of Bangladesh and the global market, preserving centuries-old traditions through fair trade.
                    </p>
                </div>
            </div>

            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="relative h-[500px] rounded-lg overflow-hidden shadow-lg">
                            <img
                                src="https://images.unsplash.com/photo-1628146747120-1b7713374888?auto=format&fit=crop&q=80&w=800"
                                alt="Bangladeshi Artisan"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl font-serif font-bold text-earth-900 mb-6">Preserving Heritage</h2>
                            <p className="text-earth-600 mb-6 leading-relaxed">
                                Bangladesh has a rich history of craftsmanship, from the delicate weaves of Jamdani to the intricate needlework of Nakshi Kantha. However, in an era of mass production, these skills are at risk of fading away.
                            </p>
                            <p className="text-earth-600 mb-8 leading-relaxed">
                                We work directly with over 500 artisans across 12 districts, ensuring they receive fair wages and a sustainable platform to showcase their art. Every purchase you make helps keep these traditions alive.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                                <div className="p-4 bg-earth-50 rounded-lg">
                                    <div className="text-3xl font-bold text-bamboo-600 mb-1">500+</div>
                                    <div className="text-sm text-earth-600 font-bold uppercase">Artisans</div>
                                </div>
                                <div className="p-4 bg-earth-50 rounded-lg">
                                    <div className="text-3xl font-bold text-bamboo-600 mb-1">100%</div>
                                    <div className="text-sm text-earth-600 font-bold uppercase">Handmade</div>
                                </div>
                                <div className="p-4 bg-earth-50 rounded-lg">
                                    <div className="text-3xl font-bold text-bamboo-600 mb-1">12</div>
                                    <div className="text-sm text-earth-600 font-bold uppercase">Districts</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-earth-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-serif font-bold text-earth-900 text-center mb-16">Our Core Values</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <div className="w-16 h-16 bg-bamboo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-bamboo-600">
                                <Users size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-earth-900 mb-4">Community First</h3>
                            <p className="text-earth-600">Empowering rural communities, particularly women, by providing financial independence and skill development.</p>
                        </div>
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <div className="w-16 h-16 bg-bamboo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-bamboo-600">
                                <Leaf size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-earth-900 mb-4">Sustainability</h3>
                            <p className="text-earth-600">Using locally sourced, eco-friendly materials like jute, bamboo, and cotton to minimize environmental impact.</p>
                        </div>
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            <div className="w-16 h-16 bg-bamboo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-bamboo-600">
                                <Heart size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-earth-900 mb-4">Authenticity</h3>
                            <p className="text-earth-600">Guaranteed genuine traditional crafts. No factory-made imitations, just pure human artistry.</p>
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};
