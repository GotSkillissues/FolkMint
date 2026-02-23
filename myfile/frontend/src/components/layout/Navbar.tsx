import React from 'react';
import { ShoppingBag, Search, Menu, User, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
    const { itemCount } = useCart();
    const { user, isAuthenticated } = useAuth();

    return (
        <nav className="bg-white/70 backdrop-blur-xl border-b border-earth-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    {/* Logo */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-earth-900 rounded-lg flex items-center justify-center transform group-hover:rotate-45 transition-transform duration-300">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-earth-50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /> {/* Abstract Star/Flower */}
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-serif font-bold text-earth-900 tracking-widest leading-none uppercase">Folk</span>
                            <span className="text-[10px] font-sans font-bold text-earth-500 tracking-[0.4em] uppercase leading-none mt-1">Mint</span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-10 items-center">
                        <Link to="/" className="text-earth-700 hover:text-earth-900 font-medium transition-colors text-sm uppercase tracking-widest">Home</Link>
                        <Link to="/shop" className="text-earth-700 hover:text-earth-900 font-medium transition-colors text-sm uppercase tracking-widest border-b-2 border-transparent hover:border-earth-900">Shop</Link>
                        <Link to="/about" className="text-earth-700 hover:text-earth-900 font-medium transition-colors text-sm uppercase tracking-widest">About</Link>
                    </div>

                    {/* Icons */}
                    <div className="flex items-center space-x-6">
                        <button className="text-earth-700 hover:text-earth-900 transition-colors">
                            <Search className="h-5 w-5" />
                        </button>

                        {isAuthenticated ? (
                            <Link to="/profile" className="text-earth-700 hover:text-earth-900 transition-colors flex items-center gap-2 group">
                                <div className="p-1.5 border border-earth-200 rounded-full group-hover:border-earth-900 transition-colors">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="hidden lg:inline text-sm font-bold uppercase tracking-wider">{user?.first_name}</span>
                            </Link>
                        ) : (
                            <Link to="/login" className="text-earth-700 hover:text-earth-900 transition-colors flex items-center gap-2 group">
                                <LogIn className="h-5 w-5" />
                                <span className="hidden lg:inline text-sm font-bold uppercase tracking-wider">Login</span>
                            </Link>
                        )}

                        <Link to="/cart" className="text-earth-700 hover:text-earth-900 transition-colors relative">
                            <ShoppingBag className="h-5 w-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-earth-900 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                    {itemCount}
                                </span>
                            )}
                        </Link>

                        <button className="md:hidden text-earth-700 hover:text-earth-900 transition-colors">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
