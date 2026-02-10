'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Package, ArrowRight, Loader2 } from 'lucide-react';
import NavbarModern from '@/components/layout/NavbarModern';
import FooterModern from '@/components/layout/FooterModern';
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

// Category images mapping  
const categoryImages: Record<string, string> = {
  'Light & Optics': 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=300&auto=format&fit=crop&q=80',
  'Lighting': 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=300&auto=format&fit=crop&q=80',
  'Braking System': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=300&auto=format&fit=crop&q=80',
  'Brakes': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=300&auto=format&fit=crop&q=80',
  'Brake System': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=300&auto=format&fit=crop&q=80',
  'Exhaust': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&auto=format&fit=crop&q=80',
  'Exhaust System': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&auto=format&fit=crop&q=80',
  'Cooling System': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=300&auto=format&fit=crop&q=80',
  'Car Wheels': 'https://images.unsplash.com/photo-1611067577475-07af7dd1ea6c?w=300&auto=format&fit=crop&q=80',
  'Wheels': 'https://images.unsplash.com/photo-1611067577475-07af7dd1ea6c?w=300&auto=format&fit=crop&q=80',
  'Exterior Parts': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300&auto=format&fit=crop&q=80',
  'Body Parts': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300&auto=format&fit=crop&q=80',
  'Steering Wheel': 'https://images.unsplash.com/photo-1449130044079-0e739c3d0cdb?w=300&auto=format&fit=crop&q=80',
  'Steering': 'https://images.unsplash.com/photo-1449130044079-0e739c3d0cdb?w=300&auto=format&fit=crop&q=80',
  'Engine Block': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=300&auto=format&fit=crop&q=80',
  'Engine Parts': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=300&auto=format&fit=crop&q=80',
  'Engine': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=300&auto=format&fit=crop&q=80',
  'Filters': 'https://images.unsplash.com/photo-1635784488648-c0b9e10d8d4e?w=300&auto=format&fit=crop&q=80',
  'Electrical': 'https://images.unsplash.com/photo-1620824209016-86a3ec94e9e0?w=300&auto=format&fit=crop&q=80',
  'Interior': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&auto=format&fit=crop&q=80',
  'Suspension': 'https://images.unsplash.com/photo-1596638787647-904d822d751e?w=300&auto=format&fit=crop&q=80',
  'Transmission': 'https://images.unsplash.com/photo-1599662875272-32144be42a56?w=300&auto=format&fit=crop&q=80',
  'Accessories': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
};

const defaultImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=300&auto=format&fit=crop&q=80';

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

  const getCategoryImage = (name: string) => {
    return categoryImages[name] || defaultImage;
  };

  const getCategoryCount = (category: Category) => {
    return category.totalPartsCount || 
           ((category._count?.products || 0) + (category._count?.carParts || 0));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarModern />
      
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#00002E] to-[#000050] text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Browse Categories</h1>
            <p className="text-white/80 text-lg mb-8">
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
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00002E]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[#00002E]" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadCategories}
                className="px-6 py-3 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-colors"
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
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  {/* Category Image */}
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={getCategoryImage(category.name)}
                      alt={category.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-xl font-bold text-white">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Category Info */}
                  <div className="p-4">
                    {category.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[#00002E] font-semibold">
                        {getCategoryCount(category)} products
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#00002E] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white py-12 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Can't Find What You're Looking For?
              </h2>
              <p className="text-gray-600 mb-6">
                Try searching by your car's number plate to find parts specifically compatible with your vehicle.
              </p>
              <Link 
                href="/parts" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00002E] hover:bg-[#000050] text-white font-semibold rounded-xl transition-colors"
              >
                Search by Number Plate
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <FooterModern />
    </div>
  );
}
