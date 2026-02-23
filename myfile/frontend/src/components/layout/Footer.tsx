import React from 'react';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="bg-earth-900 text-earth-50 pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <h3 className="text-3xl font-serif font-bold text-white mb-6">FOLKMINT</h3>
                        <p className="text-earth-300 mb-8 font-sans italic leading-relaxed">
                            Preserving the heritage of Bangladesh. Every piece is a story of tradition, directly from the artisan's hands to yours.
                        </p>
                        <div className="flex space-x-5">
                            <a href="#" className="text-earth-400 hover:text-white transition-colors"><Facebook size={22} /></a>
                            <a href="#" className="text-earth-400 hover:text-white transition-colors"><Twitter size={22} /></a>
                            <a href="#" className="text-earth-400 hover:text-white transition-colors"><Instagram size={22} /></a>
                            <a href="#" className="text-earth-400 hover:text-white transition-colors"><Youtube size={22} /></a>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-bold text-earth-200 mb-6 uppercase text-xs tracking-[0.2em]">Curated Shop</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Textiles & Fabrics</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Terracotta Pottery</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Bamboo Craft</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">New Arrivals</a></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold text-earth-200 mb-6 uppercase text-xs tracking-[0.2em]">Our Community</h4>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Meet the Artisans</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Heritage Stories</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Sustainability</a></li>
                            <li><a href="#" className="text-earth-400 hover:text-white transition-colors">Help Center</a></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="font-bold text-earth-200 mb-6 uppercase text-xs tracking-[0.2em]">Join the Heritage</h4>
                        <p className="text-earth-400 mb-6 text-sm">Sign up for exclusive access to rare craft drops.</p>
                        <div className="flex group">
                            <input
                                type="email"
                                placeholder="Email address"
                                className="bg-earth-800/50 border border-earth-700 px-4 py-2.5 w-full focus:outline-none focus:border-bamboo-500 text-earth-100 placeholder:text-earth-600 transition-all"
                            />
                            <button className="bg-white text-earth-900 px-6 py-2.5 font-bold hover:bg-earth-100 transition-colors">
                                JOIN
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-earth-800 pt-10 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-earth-500 text-xs tracking-widest uppercase">
                    <p>&copy; {new Date().getFullYear()} FOLKMINT. ALL RIGHTS RESERVED.</p>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Shipping</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
