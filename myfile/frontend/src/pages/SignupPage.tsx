import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export const SignupPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await signup(email, password, firstName, lastName, address);

        if (result.success) {
            navigate('/login');
        } else {
            setError(result.message || 'Email already exists or server error');
        }

        setIsLoading(false);
    };

    return (
        <Layout>
            <div className="min-h-[80vh] flex items-center justify-center bg-earth-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md border border-earth-200">
                    <div>
                        <div className="flex justify-center">
                            <UserPlus className="text-bamboo-600" size={48} />
                        </div>
                        <h2 className="mt-6 text-center text-3xl font-serif font-bold text-earth-900">
                            Create your account
                        </h2>
                        <p className="mt-2 text-center text-sm text-earth-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-bamboo-600 hover:text-bamboo-700">
                                Sign in
                            </Link>
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-bold text-earth-700 mb-1">
                                        First Name
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="appearance-none relative block w-full px-3 py-3 border border-earth-300 placeholder-earth-400 text-earth-900 rounded-md focus:outline-none focus:ring-bamboo-500 focus:border-bamboo-500 sm:text-sm"
                                        placeholder="First name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-bold text-earth-700 mb-1">
                                        Last Name
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="appearance-none relative block w-full px-3 py-3 border border-earth-300 placeholder-earth-400 text-earth-900 rounded-md focus:outline-none focus:ring-bamboo-500 focus:border-bamboo-500 sm:text-sm"
                                        placeholder="Last name"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-earth-700 mb-1">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-earth-300 placeholder-earth-400 text-earth-900 rounded-md focus:outline-none focus:ring-bamboo-500 focus:border-bamboo-500 sm:text-sm"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-bold text-earth-700 mb-1">
                                    Shipping Address
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-earth-300 placeholder-earth-400 text-earth-900 rounded-md focus:outline-none focus:ring-bamboo-500 focus:border-bamboo-500 sm:text-sm"
                                    placeholder="Enter your shipping address"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-bold text-earth-700 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-3 border border-earth-300 placeholder-earth-400 text-earth-900 rounded-md focus:outline-none focus:ring-bamboo-500 focus:border-bamboo-500 sm:text-sm"
                                    placeholder="Create a password"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-bamboo-600 hover:bg-bamboo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bamboo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Creating account...' : 'Create account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};
