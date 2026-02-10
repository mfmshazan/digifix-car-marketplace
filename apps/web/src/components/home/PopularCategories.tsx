'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { categoriesApi } from '@/lib/api';
import { ArrowRight, Loader2 } from 'lucide-react';

// Category images mapping (using placeholder images for car parts categories)
const categoryImages: Record<string, string> = {
  'Light & Optics': 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=200&auto=format&fit=crop&q=80',
  'Lighting': 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=200&auto=format&fit=crop&q=80',
  'Braking System': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=200&auto=format&fit=crop&q=80',
  'Brakes': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=200&auto=format&fit=crop&q=80',
  'Brake System': 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=200&auto=format&fit=crop&q=80',
  'Exhaust': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&auto=format&fit=crop&q=80',
  'Exhaust System': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&auto=format&fit=crop&q=80',
  'Cooling System': 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&auto=format&fit=crop&q=80',
  'Car Wheels': 'https://images.unsplash.com/photo-1611067577475-07af7dd1ea6c?w=200&auto=format&fit=crop&q=80',
  'Wheels': 'https://images.unsplash.com/photo-1611067577475-07af7dd1ea6c?w=200&auto=format&fit=crop&q=80',
  'Exterior Parts': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&auto=format&fit=crop&q=80',
  'Body Parts': 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&auto=format&fit=crop&q=80',
  'Steering Wheel': 'https://images.unsplash.com/photo-1449130044079-0e739c3d0cdb?w=200&auto=format&fit=crop&q=80',
  'Steering': 'https://images.unsplash.com/photo-1449130044079-0e739c3d0cdb?w=200&auto=format&fit=crop&q=80',
  'Engine Block': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=200&auto=format&fit=crop&q=80',
  'Engine Parts': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=200&auto=format&fit=crop&q=80',
  'Engine': 'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=200&auto=format&fit=crop&q=80',
  'Filters': 'https://images.unsplash.com/photo-1635784488648-c0b9e10d8d4e?w=200&auto=format&fit=crop&q=80',
  'Electrical': 'https://images.unsplash.com/photo-1620824209016-86a3ec94e9e0?w=200&auto=format&fit=crop&q=80',
  'Interior': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&auto=format&fit=crop&q=80',
  'Suspension': 'https://images.unsplash.com/photo-1596638787647-904d822d751e?w=200&auto=format&fit=crop&q=80',
  'Transmission': 'https://images.unsplash.com/photo-1599662875272-32144be42a56?w=200&auto=format&fit=crop&q=80',
  'Accessories': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
};

const defaultImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&auto=format&fit=crop&q=80';

interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: {
    products: number;
    carParts: number;
  };
  totalPartsCount?: number;
}

export default function PopularCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await categoriesApi.getAll();
      if (response.success) {
        setCategories(response.data.slice(0, 8)); // Get first 8 categories
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryImage = (name: string) => {
    return categoryImages[name] || defaultImage;
  };

  const getCategoryCount = (category: Category) => {
    return category.totalPartsCount || 
           ((category._count?.products || 0) + (category._count?.carParts || 0));
  };

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-[#00002E]">
          Popular Categories
        </h2>
        <Link
          href="/categories"
          className="text-sm font-semibold text-[#00002E] hover:underline flex items-center gap-1"
        >
          View All Category
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-8">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${encodeURIComponent(category.name)}`}
              className="group flex flex-col items-center"
            >
              {/* Circular Image Container */}
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden border-4 border-gray-200 group-hover:border-[#00002E] transition-all duration-300 shadow-lg group-hover:shadow-2xl mb-4">
                <Image
                  src={getCategoryImage(category.name)}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#00002E]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              {/* Category Name */}
              <h3 className="text-sm md:text-base font-bold text-gray-900 text-center group-hover:text-[#00002E] transition-colors mb-1">
                {category.name}
              </h3>
              {/* Item Count */}
              <p className="text-xs text-gray-500 font-medium">
                {getCategoryCount(category)} items
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
