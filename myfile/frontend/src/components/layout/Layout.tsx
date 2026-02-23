import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-earth-50 font-sans selection:bg-bamboo-200">
            {/* Subtle global pattern overlay */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-[-1] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M30 0l30 30-30 30-30-30z%22 fill=%22%238c634a%22/%3E%3C/svg%3E')] bg-repeat" />

            <Navbar />
            <main className="flex-grow animate-fade-in">
                {children}
            </main>
            <Footer />
        </div>
    );
};
