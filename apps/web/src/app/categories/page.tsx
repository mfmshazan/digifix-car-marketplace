'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Package, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { categoriesApi } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  _count?: {
    products: number;
    carParts: number;
  };
  totalPartsCount?: number;
}

// Icon mapping for categories
const categoryIcons: Record<string, string> = {
  'Engine Parts': '⚙️',
  'Brake System': '🛑',
  'Brakes': '🛑',
  'Filters': '🔧',
  'Electrical': '⚡',
  'Suspension': '🚗',
  'Cooling System': '❄️',
  'Exhaust System': '💨',
  'Transmission': '🔄',
  'Body Parts': '🚙',
  'Lighting': '💡',
  'Interior': '🪑',
  'Accessories': '✨',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Failed to load categories. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (name: string) => {
    return categoryIcons[name] || '📦';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Browse Categories</h1>
            <p className="text-white/80 text-lg mb-6">
              Find the exact parts you need organized by category
            </p>
            
            {/* Search */}
            <div className="max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadCategories}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No categories found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${encodeURIComponent(category.name)}`}
                  className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-primary-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">
                      {getCategoryIcon(category.name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-primary-600 font-medium">
                          {category.totalPartsCount || 
                            ((category._count?.products || 0) + (category._count?.carParts || 0))} parts
                        </span>
                        <ArrowRight className="w-4 h-4 text-primary-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white py-12 border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Can't Find What You're Looking For?
              </h2>
              <p className="text-gray-600 mb-6">
                Try searching by your car's number plate to find parts specifically compatible with your vehicle.
              </p>
              <Link href="/parts" className="btn-primary inline-flex items-center gap-2">
                Search by Number Plate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
